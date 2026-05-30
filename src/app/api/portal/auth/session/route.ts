import { NextResponse } from "next/server";

import { getPortalSessionFromCookies } from "@/lib/server/portal-customer-session";
import { buildOwnerSyntheticSession } from "@/lib/server/portal-owner-bypass";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user: mspUser },
    } = await supabase.auth.getUser();
    if (mspUser) {
      const referer = req.headers.get("referer") || "";
      const portalMatch = referer.match(/\/portal\/([^/]+)\/([^/?]+)/);
      const mspSlug = portalMatch?.[1]?.toLowerCase() || "";
      const clientSlug = portalMatch?.[2]?.toLowerCase() || "";

      if (mspSlug && clientSlug) {
        const { data: ownerAccount } = await supabase
          .from("portal_accounts")
          .select("id, slug, user_id, display_name")
          .eq("user_id", mspUser.id)
          .eq("slug", mspSlug)
          .single();

        if (ownerAccount) {
          const { data: portalClient } = await supabase
            .from("portal_clients")
            .select("*")
            .eq("portal_account_id", ownerAccount.id)
            .eq("slug", clientSlug)
            .single();

          if (portalClient) {
            const synthetic = buildOwnerSyntheticSession(
              mspUser,
              ownerAccount,
              portalClient as Record<string, unknown>,
            );
            const admin = createServiceRoleClient();
            const { data: profile } = await admin
              .from("profiles")
              .select(
                "company_name, display_name, brand_name, brand_colour, brand_logo_url, white_label_mode, plan",
              )
              .eq("id", synthetic.account.user_id)
              .maybeSingle();

            return NextResponse.json({
              session: {
                expires_at: synthetic.expiresAt,
              },
              user: {
                email: synthetic.user.email,
                display_name: "MSP Owner (Preview)",
              },
              client: {
                id: synthetic.client.id,
                client_name: synthetic.client.client_name,
                slug: synthetic.client.slug,
                visibility_tickets: synthetic.client.visibility_tickets,
                visibility_projects: synthetic.client.visibility_projects,
                visibility_rag: synthetic.client.visibility_rag,
                visibility_reports: synthetic.client.visibility_reports,
                visibility_ticket_notes: synthetic.client.visibility_ticket_notes,
                visibility_stats: synthetic.client.visibility_stats,
                visibility_priority_breakdown: synthetic.client.visibility_priority_breakdown,
                visibility_resolved_count: synthetic.client.visibility_resolved_count,
                visibility_recent_activity: synthetic.client.visibility_recent_activity,
                logo_url: synthetic.client.logo_url,
                psa_source: synthetic.client.psa_source,
              },
              account: {
                slug: synthetic.account.slug,
                display_name: synthetic.account.display_name,
              },
              msp_profile: profile ?? null,
              isOwnerPreview: true,
            });
          }
        }
      }
    }

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
