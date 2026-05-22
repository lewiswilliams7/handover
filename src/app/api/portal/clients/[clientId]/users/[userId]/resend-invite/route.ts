import { randomBytes } from "crypto";

import { NextResponse } from "next/server";

import { sendPortalInviteEmail } from "@/lib/emails";
import { getPortalAccountForMspUser, requireEnterprisePlan, requireHandoverUserId } from "@/lib/server/portal-msp";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ clientId: string; userId: string }> };

function generateInviteToken(): string {
  return `${randomBytes(24).toString("hex")}-${Date.now().toString(36)}`;
}

export async function POST(_req: Request, ctx: Ctx) {
  try {
    const handoverUserId = await requireHandoverUserId();
    await requireEnterprisePlan(handoverUserId);
    const account = await getPortalAccountForMspUser(handoverUserId);
    if (!account?.id) return NextResponse.json({ error: "No portal account." }, { status: 400 });
    const { clientId, userId } = await ctx.params;

    const admin = createServiceRoleClient();
    const { data: client, error: cErr } = await admin
      .from("portal_clients")
      .select("id, client_name, slug")
      .eq("id", clientId)
      .eq("portal_account_id", account.id)
      .maybeSingle();
    if (cErr || !client) return NextResponse.json({ error: "Not found." }, { status: 404 });

    const inviteToken = generateInviteToken();
    const expires = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    const { data: user, error: uErr } = await admin
      .from("portal_client_users")
      .update({
        invite_token: inviteToken,
        invite_token_expires_at: expires,
        invite_sent_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .eq("portal_client_id", clientId)
      .select("*")
      .maybeSingle();
    if (uErr || !user) return NextResponse.json({ error: "User not found." }, { status: 404 });

    const { data: profile } = await admin
      .from("profiles")
      .select("company_name, display_name, brand_name, brand_logo_url, white_label_mode, plan")
      .eq("id", handoverUserId)
      .maybeSingle();

    await sendPortalInviteEmail({
      to: String(user.email),
      inviteeDisplayName: typeof user.display_name === "string" ? user.display_name : null,
      clientName: String(client.client_name ?? "Client"),
      mspSlug: account.slug,
      clientSlug: String(client.slug),
      inviteToken,
      mspProfile: profile,
    });

    return NextResponse.json({ ok: true, user });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg === "unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "enterprise_required") {
      return NextResponse.json({ error: "Enterprise plan required." }, { status: 403 });
    }
    console.error("[portal/resend-invite]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
