import { NextResponse } from "next/server";

import { getPortalAccountForMspUser, requireEnterprisePlan, requireHandoverUserId } from "@/lib/server/portal-msp";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ clientId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const userId = await requireHandoverUserId();
    await requireEnterprisePlan(userId);
    const account = await getPortalAccountForMspUser(userId);
    if (!account?.id) return NextResponse.json({ error: "No portal account." }, { status: 400 });

    const { clientId } = await ctx.params;
    const admin = createServiceRoleClient();
    const { data: client, error } = await admin
      .from("portal_clients")
      .select("*")
      .eq("id", clientId)
      .eq("portal_account_id", account.id)
      .maybeSingle();
    if (error || !client) return NextResponse.json({ error: "Not found." }, { status: 404 });

    const { data: users, error: uErr } = await admin
      .from("portal_client_users")
      .select(
        "id, email, display_name, enabled, invite_sent_at, invite_accepted_at, invite_token_expires_at, last_login_at, created_at",
      )
      .eq("portal_client_id", clientId)
      .order("created_at", { ascending: true });
    if (uErr) {
      return NextResponse.json({ error: "Could not load users." }, { status: 500 });
    }

    return NextResponse.json({
      client,
      users: (users ?? []).map((u) => ({
        ...u,
        invite_pending: Boolean(u.invite_token_expires_at && !u.invite_accepted_at),
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg === "unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "growth_required" || msg === "enterprise_required") {
      return NextResponse.json({ error: "An active Handover plan is required." }, { status: 403 });
    }
    console.error("[portal/clients/[clientId] GET]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const userId = await requireHandoverUserId();
    await requireEnterprisePlan(userId);
    const account = await getPortalAccountForMspUser(userId);
    if (!account?.id) return NextResponse.json({ error: "No portal account." }, { status: 400 });

    const { clientId } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    const boolKeys = [
      "enabled",
      "visibility_tickets",
      "visibility_projects",
      "visibility_rag",
      "visibility_reports",
      "visibility_ticket_notes",
      "visibility_stats",
      "visibility_priority_breakdown",
      "visibility_resolved_count",
      "visibility_recent_activity",
      "notify_ticket_updates",
      "notify_project_updates",
    ] as const;
    for (const k of boolKeys) {
      if (k in body) patch[k] = Boolean(body[k]);
    }
    if ("logo_url" in body) {
      patch.logo_url =
        typeof body.logo_url === "string" && body.logo_url.trim() ? body.logo_url.trim() : null;
    }

    const admin = createServiceRoleClient();
    const { data: updated, error } = await admin
      .from("portal_clients")
      .update(patch)
      .eq("id", clientId)
      .eq("portal_account_id", account.id)
      .select("*")
      .maybeSingle();
    if (error) {
      console.error("[portal/clients PATCH]", error.message);
      return NextResponse.json(
        { error: "Could not update portal client. Please try again." },
        { status: 500 },
      );
    }
    if (!updated) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ client: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg === "unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "growth_required" || msg === "enterprise_required") {
      return NextResponse.json({ error: "An active Handover plan is required." }, { status: 403 });
    }
    console.error("[portal/clients/[clientId] PATCH]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const userId = await requireHandoverUserId();
    await requireEnterprisePlan(userId);
    const account = await getPortalAccountForMspUser(userId);
    if (!account?.id) return NextResponse.json({ error: "No portal account." }, { status: 400 });

    const { clientId } = await ctx.params;
    const admin = createServiceRoleClient();

    const { data: users } = await admin.from("portal_client_users").select("id").eq("portal_client_id", clientId);
    const userIds = (users ?? []).map((u) => u.id);
    if (userIds.length > 0) {
      await admin.from("portal_client_sessions").delete().in("portal_client_user_id", userIds);
      await admin.from("portal_client_users").delete().eq("portal_client_id", clientId);
    }
    const { error } = await admin
      .from("portal_clients")
      .delete()
      .eq("id", clientId)
      .eq("portal_account_id", account.id);
    if (error) {
      console.error("[portal/clients DELETE]", error.message);
      return NextResponse.json(
        { error: "Could not delete portal client. Please try again." },
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
    console.error("[portal/clients/[clientId] DELETE]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
