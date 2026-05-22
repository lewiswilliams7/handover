import { NextResponse } from "next/server";

import { getPortalSessionFromCookies } from "@/lib/server/portal-customer-session";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ mspSlug: string; clientSlug: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const session = await getPortalSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { mspSlug, clientSlug } = await ctx.params;
    const m = mspSlug.trim().toLowerCase();
    const c = clientSlug.trim().toLowerCase();
    if (session.account.slug !== m || session.client.slug !== c) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (session.client.visibility_reports !== true) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createServiceRoleClient();
    const { data: rows, error } = await admin
      .from("portal_reports")
      .select("id, title, content, created_at")
      .eq("portal_client_id", session.client.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[portal/.../reports GET]", error.message);
      return NextResponse.json({ error: "Could not load reports." }, { status: 500 });
    }

    return NextResponse.json({ reports: rows ?? [] });
  } catch (e) {
    console.error("[portal/.../reports GET]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
