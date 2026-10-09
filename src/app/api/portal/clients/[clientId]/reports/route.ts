import { NextResponse } from "next/server";

import {
  getPortalAccountForMspUser,
  requireEnterprisePlan,
  requireHandoverUserId,
} from "@/lib/server/portal-msp";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ clientId: string }> };

export async function POST(request: Request, ctx: Ctx) {
  try {
    const userId = await requireHandoverUserId();
    await requireEnterprisePlan(userId);
    const account = await getPortalAccountForMspUser(userId);
    if (!account?.id) {
      return NextResponse.json({ error: "Set up your portal account first." }, { status: 400 });
    }

    const { clientId } = await ctx.params;
    const admin = createServiceRoleClient();
    const { data: client, error: cErr } = await admin
      .from("portal_clients")
      .select("id")
      .eq("id", clientId)
      .eq("portal_account_id", account.id)
      .maybeSingle();
    if (cErr || !client?.id) {
      return NextResponse.json({ error: "Portal client not found." }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      content?: unknown;
    };
    const title = String(body.title ?? "").trim();
    if (!title) {
      return NextResponse.json({ error: "title is required." }, { status: 400 });
    }
    if (body.content == null || typeof body.content !== "object") {
      return NextResponse.json({ error: "content must be a JSON object." }, { status: 400 });
    }

    const { data: row, error: insErr } = await admin
      .from("portal_reports")
      .insert({
        portal_client_id: client.id,
        title,
        content: body.content as Record<string, unknown>,
        created_by: userId,
      })
      .select("id, title, created_at")
      .maybeSingle();

    if (insErr || !row) {
      console.error("[portal/clients/.../reports POST]", insErr?.message);
      return NextResponse.json({ error: "Could not save report." }, { status: 500 });
    }

    return NextResponse.json({ report: row });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg === "unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "growth_required" || msg === "enterprise_required") {
      return NextResponse.json({ error: "An active Handover plan is required." }, { status: 403 });
    }
    console.error("[portal/clients/.../reports POST]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
