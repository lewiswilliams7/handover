import { NextResponse } from "next/server";

import { getPortalSessionFromCookies } from "@/lib/server/portal-customer-session";
import { fetchPortalPsaPayload } from "@/lib/server/portal-psa-data";
import { fetchPortalTicketNotes, portalTicketBelongsToClient } from "@/lib/server/portal-ticket-notes";

type Ctx = { params: Promise<{ mspSlug: string; clientSlug: string }> };

export async function GET(req: Request, ctx: Ctx) {
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
    const ticketId = ticketIdRaw ? Number.parseInt(ticketIdRaw, 10) : NaN;
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

    return NextResponse.json(filtered);
  } catch (e) {
    console.error("[portal/.../data]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
