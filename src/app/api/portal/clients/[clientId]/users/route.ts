import { randomBytes } from "crypto";

import { NextResponse } from "next/server";

import { sendPortalInviteEmail } from "@/lib/emails";
import { getPortalAccountForMspUser, requireEnterprisePlan, requireHandoverUserId } from "@/lib/server/portal-msp";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ clientId: string }> };

function generateInviteToken(): string {
  return `${randomBytes(24).toString("hex")}-${Date.now().toString(36)}`;
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const userId = await requireHandoverUserId();
    await requireEnterprisePlan(userId);
    const account = await getPortalAccountForMspUser(userId);
    if (!account?.id) return NextResponse.json({ error: "No portal account." }, { status: 400 });
    const { clientId } = await ctx.params;

    const admin = createServiceRoleClient();
    const { data: client } = await admin
      .from("portal_clients")
      .select("id")
      .eq("id", clientId)
      .eq("portal_account_id", account.id)
      .maybeSingle();
    if (!client) return NextResponse.json({ error: "Not found." }, { status: 404 });

    const { data: users, error } = await admin
      .from("portal_client_users")
      .select(
        "id, email, display_name, enabled, invite_sent_at, invite_accepted_at, invite_token_expires_at, last_login_at, created_at",
      )
      .eq("portal_client_id", clientId)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("[portal/clients/.../users GET]", error.message);
      return NextResponse.json(
        { error: "Could not load portal users. Please try again." },
        { status: 500 },
      );
    }
    return NextResponse.json({ users: users ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg === "unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "growth_required" || msg === "enterprise_required") {
      return NextResponse.json({ error: "An active Handover plan is required." }, { status: 403 });
    }
    console.error("[portal/clients/.../users GET]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request, ctx: Ctx) {
  try {
    const userId = await requireHandoverUserId();
    await requireEnterprisePlan(userId);
    const account = await getPortalAccountForMspUser(userId);
    if (!account?.id) return NextResponse.json({ error: "No portal account." }, { status: 400 });
    const { clientId } = await ctx.params;

    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      display_name?: string | null;
    };
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    const { data: client, error: cErr } = await admin
      .from("portal_clients")
      .select("id, client_name, slug, psa_source")
      .eq("id", clientId)
      .eq("portal_account_id", account.id)
      .maybeSingle();
    if (cErr || !client) return NextResponse.json({ error: "Not found." }, { status: 404 });

    const { data: existing } = await admin
      .from("portal_client_users")
      .select("id")
      .eq("portal_client_id", clientId)
      .eq("email", email)
      .maybeSingle();
    if (existing?.id) {
      return NextResponse.json({ error: "Email already added to this portal." }, { status: 409 });
    }

    const inviteToken = generateInviteToken();
    const expires = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    const displayName =
      typeof body.display_name === "string" && body.display_name.trim() ? body.display_name.trim() : null;

    const { data: user, error: insErr } = await admin
      .from("portal_client_users")
      .insert({
        portal_client_id: clientId,
        email,
        display_name: displayName,
        invite_token: inviteToken,
        invite_token_expires_at: expires,
        invite_sent_at: new Date().toISOString(),
        enabled: true,
      })
      .select("*")
      .single();

    if (insErr || !user) {
      console.error("[portal/clients/.../users POST]", insErr?.message);
      console.error("[portal/clients/.../users POST]", insErr?.message);
      return NextResponse.json(
        { error: "Could not add portal user. Please try again." },
        { status: 500 },
      );
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("company_name, display_name, brand_name, brand_logo_url, white_label_mode, plan")
      .eq("id", userId)
      .maybeSingle();

    await sendPortalInviteEmail({
      to: email,
      inviteeDisplayName: displayName,
      clientName: String(client.client_name ?? "Client"),
      mspSlug: account.slug,
      clientSlug: String(client.slug),
      inviteToken,
      mspProfile: profile,
    });

    return NextResponse.json({ user });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg === "unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "growth_required" || msg === "enterprise_required") {
      return NextResponse.json({ error: "An active Handover plan is required." }, { status: 403 });
    }
    console.error("[portal/clients/.../users POST]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
