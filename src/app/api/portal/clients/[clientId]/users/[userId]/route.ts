import { NextResponse } from "next/server";

import { getPortalAccountForMspUser, requireEnterprisePlan, requireHandoverUserId } from "@/lib/server/portal-msp";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ clientId: string; userId: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const handoverUserId = await requireHandoverUserId();
    await requireEnterprisePlan(handoverUserId);
    const account = await getPortalAccountForMspUser(handoverUserId);
    if (!account?.id) return NextResponse.json({ error: "No portal account." }, { status: 400 });
    const { clientId, userId } = await ctx.params;

    const body = (await request.json().catch(() => ({}))) as {
      display_name?: string | null;
      enabled?: boolean;
    };
    const patch: Record<string, unknown> = {};
    if ("display_name" in body) {
      patch.display_name =
        typeof body.display_name === "string" && body.display_name.trim()
          ? body.display_name.trim()
          : null;
    }
    if ("enabled" in body) patch.enabled = Boolean(body.enabled);

    const admin = createServiceRoleClient();
    const { data: client } = await admin
      .from("portal_clients")
      .select("id")
      .eq("id", clientId)
      .eq("portal_account_id", account.id)
      .maybeSingle();
    if (!client) return NextResponse.json({ error: "Not found." }, { status: 404 });

    const { data: updated, error } = await admin
      .from("portal_client_users")
      .update(patch)
      .eq("id", userId)
      .eq("portal_client_id", clientId)
      .select("*")
      .maybeSingle();
    if (error) {
      console.error("[portal/clients/.../users PATCH]", error.message);
      return NextResponse.json(
        { error: "Could not update portal user. Please try again." },
        { status: 500 },
      );
    }
    if (!updated) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ user: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg === "unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "growth_required" || msg === "enterprise_required") {
      return NextResponse.json({ error: "An active Handover plan is required." }, { status: 403 });
    }
    console.error("[portal/.../users/[userId] PATCH]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const handoverUserId = await requireHandoverUserId();
    await requireEnterprisePlan(handoverUserId);
    const account = await getPortalAccountForMspUser(handoverUserId);
    if (!account?.id) return NextResponse.json({ error: "No portal account." }, { status: 400 });
    const { clientId, userId } = await ctx.params;

    const admin = createServiceRoleClient();
    const { data: client } = await admin
      .from("portal_clients")
      .select("id")
      .eq("id", clientId)
      .eq("portal_account_id", account.id)
      .maybeSingle();
    if (!client) return NextResponse.json({ error: "Not found." }, { status: 404 });

    await admin.from("portal_client_sessions").delete().eq("portal_client_user_id", userId);
    const { error } = await admin
      .from("portal_client_users")
      .delete()
      .eq("id", userId)
      .eq("portal_client_id", clientId);
    if (error) {
      console.error("[portal/clients/.../users DELETE]", error.message);
      return NextResponse.json(
        { error: "Could not delete portal user. Please try again." },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg === "unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "growth_required" || msg === "enterprise_required") {
      return NextResponse.json({ error: "An active Handover plan is required." }, { status: 403 });
    }
    console.error("[portal/.../users/[userId] DELETE]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
