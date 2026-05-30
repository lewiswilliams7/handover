import { NextResponse } from "next/server";

import {
  getPortalSessionFromCookies,
  type PortalSessionContext,
} from "@/lib/server/portal-customer-session";
import { buildOwnerSyntheticSession } from "@/lib/server/portal-owner-bypass";
import { fetchPortalPsaPayload } from "@/lib/server/portal-psa-data";
import {
  fetchPortalProjectNotes,
  fetchPortalTicketNotes,
  portalProjectBelongsToClient,
  portalTicketBelongsToClient,
} from "@/lib/server/portal-ticket-notes";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ mspSlug: string; clientSlug: string }> };

export async function GET(req: Request, ctx: Ctx) {
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
          return await handlePortalDataRequest(syntheticSession, req);
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

    return await handlePortalDataRequest(session, req);
  } catch (e) {
    console.error("[portal/.../data]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

async function handlePortalDataRequest(session: PortalSessionContext, req: Request) {
  const visibilityStats = session.client.visibility_stats !== false;
  const visibilityPriorityBreakdown = session.client.visibility_priority_breakdown !== false;
  const visibilityResolvedCount = session.client.visibility_resolved_count === true;
  const visibilityRecentActivity = session.client.visibility_recent_activity !== false;

  const payload = await fetchPortalPsaPayload({
    mspUserId: session.account.user_id,
    psaSource: session.client.psa_source ?? "halopsa",
    clientId: session.client.client_id,
    visibilityTickets: session.client.visibility_tickets !== false,
    visibilityProjects: session.client.visibility_projects !== false,
    visibilityRag: session.client.visibility_rag !== false,
    visibilityStats,
    visibilityPriorityBreakdown,
    visibilityResolvedCount,
    visibilityRecentActivity,
  });

  const filtered: Record<string, unknown> = { lastUpdated: payload.lastUpdated };
  const admin = createServiceRoleClient();
  const { data: portalAccountData } = await admin
    .from("portal_accounts")
    .select("self_service_url")
    .eq("id", session.account.id)
    .maybeSingle();
  filtered.selfServiceUrl =
    typeof portalAccountData?.self_service_url === "string" ? portalAccountData.self_service_url : null;
  if (session.client.visibility_tickets !== false) {
    filtered.tickets = payload.tickets ?? [];
  }
  if (session.client.visibility_projects !== false) {
    filtered.projects = payload.projects ?? [];
  }
  if (session.client.visibility_rag !== false) {
    filtered.rag = payload.rag ?? "grey";
  }
  if (visibilityStats && payload.stats) {
    filtered.stats = payload.stats;
  }
  if (visibilityRecentActivity && payload.recentActivity && payload.recentActivity.length > 0) {
    filtered.recentActivity = payload.recentActivity;
  }

  const url = new URL(req.url);
  const ticketIdRaw = url.searchParams.get("ticketId");
  const projectIdRaw = url.searchParams.get("projectId");
  const ticketId = ticketIdRaw ? Number.parseInt(ticketIdRaw, 10) : NaN;
  const projectId = projectIdRaw ? Number.parseInt(projectIdRaw, 10) : NaN;
  if (
    Number.isFinite(ticketId) &&
    ticketId > 0 &&
    session.client.visibility_tickets !== false &&
    session.client.visibility_ticket_notes !== false
  ) {
    const psa = session.client.psa_source === "connectwise" ? "connectwise" : "halopsa";
    const allowed = await portalTicketBelongsToClient({
      mspUserId: session.account.user_id,
      psaSource: psa,
      ticketId,
      portalClientIdStr: session.client.client_id,
    });
    if (allowed) {
      const notes = await fetchPortalTicketNotes({
        mspUserId: session.account.user_id,
        psaSource: psa,
        ticketId,
      });
      filtered.ticketNotes = notes;
      filtered.ticketNotesTicketId = ticketId;
    }
  }
  if (
    Number.isFinite(projectId) &&
    projectId > 0 &&
    session.client.visibility_projects !== false &&
    session.client.visibility_ticket_notes !== false
  ) {
    const psa = session.client.psa_source === "connectwise" ? "connectwise" : "halopsa";
    const allowed = await portalProjectBelongsToClient({
      mspUserId: session.account.user_id,
      psaSource: psa,
      projectId,
      portalClientIdStr: session.client.client_id,
    });
    if (allowed) {
      const notes = await fetchPortalProjectNotes({
        mspUserId: session.account.user_id,
        psaSource: psa,
        projectId,
      });
      filtered.projectNotes = notes;
      filtered.projectNotesProjectId = projectId;
    }
  }

  return NextResponse.json(filtered);
}
