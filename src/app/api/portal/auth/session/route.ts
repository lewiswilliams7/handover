import { NextResponse } from "next/server";

import { getPortalSessionFromCookies } from "@/lib/server/portal-customer-session";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const ctx = await getPortalSessionFromCookies();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createServiceRoleClient();
    const { data: profile } = await admin
      .from("profiles")
      .select(
        "company_name, display_name, brand_name, brand_colour, brand_logo_url, white_label_mode, plan",
      )
      .eq("id", ctx.account.user_id)
      .maybeSingle();

    return NextResponse.json({
      session: {
        expires_at: ctx.expiresAt,
      },
      user: {
        email: ctx.user.email,
        display_name: ctx.user.display_name,
      },
      client: {
        id: ctx.client.id,
        client_name: ctx.client.client_name,
        slug: ctx.client.slug,
        visibility_tickets: ctx.client.visibility_tickets,
        visibility_projects: ctx.client.visibility_projects,
        visibility_rag: ctx.client.visibility_rag,
        visibility_reports: ctx.client.visibility_reports,
        visibility_ticket_notes: ctx.client.visibility_ticket_notes,
        visibility_stats: ctx.client.visibility_stats,
        visibility_priority_breakdown: ctx.client.visibility_priority_breakdown,
        visibility_resolved_count: ctx.client.visibility_resolved_count,
        visibility_recent_activity: ctx.client.visibility_recent_activity,
        logo_url: ctx.client.logo_url,
        psa_source: ctx.client.psa_source,
      },
      account: {
        slug: ctx.account.slug,
        display_name: ctx.account.display_name,
      },
      msp_profile: profile ?? null,
    });
  } catch (e) {
    console.error("[portal/auth/session]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
