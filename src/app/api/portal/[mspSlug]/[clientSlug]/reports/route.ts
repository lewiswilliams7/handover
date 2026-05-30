import { NextResponse } from "next/server";

import {
  getPortalSessionFromCookies,
  type PortalSessionContext,
} from "@/lib/server/portal-customer-session";
import { buildOwnerSyntheticSession } from "@/lib/server/portal-owner-bypass";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ mspSlug: string; clientSlug: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { mspSlug, clientSlug } = await ctx.params;
    const m = mspSlug.trim().toLowerCase();
    const c = clientSlug.trim().toLowerCase();

    // MSP owner bypass - allow the portal account owner to preview their own portal.
    const supabase = await createServerClient();
    const {
      data: { user: mspUser },
    } = await supabase.auth.getUser();
    if (mspUser) {
      const { data: ownerAccount } = await supabase
        .from("portal_accounts")
        .select("id, slug, user_id")
        .eq("user_id", mspUser.id)
        .eq("slug", m)
        .single();
      if (ownerAccount) {
        const { data: portalClient } = await supabase
          .from("portal_clients")
          .select("*")
          .eq("portal_account_id", ownerAccount.id)
          .eq("slug", c)
          .single();
        if (portalClient) {
          const syntheticSession = buildOwnerSyntheticSession(
            mspUser,
            ownerAccount,
            portalClient as Record<string, unknown>,
          );
          return await handlePortalReportsRequest(syntheticSession);
        }
      }
    }

    const session = await getPortalSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.account.slug !== m || session.client.slug !== c) {
      console.log("[portal/data] 403 debug:", {
        mspSlug,
        clientSlug,
        sessionAccountSlug: session?.account?.slug,
        sessionClientSlug: session?.client?.slug,
        sessionExists: !!session,
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return await handlePortalReportsRequest(session);
  } catch (e) {
    console.error("[portal/.../reports GET]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

async function handlePortalReportsRequest(session: PortalSessionContext) {
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
}
