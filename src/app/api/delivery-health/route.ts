import { NextResponse } from "next/server";

import {
  buildConnectWiseTicketDeepLink,
  buildDeliveryHealthStats,
  buildHistoryIndex,
  computeSlaRiskFromTargetIso,
  emptyDeliveryHealthStats,
  enrichTicketsMissingAgentsForDashboard,
  haloTicketsToHealthRows,
  isHaloTicketActive,
  type DeliveryHealthApiResponse,
  type DeliveryHealthDriverDetail,
  type DeliveryHealthRiskDetail,
  type DeliveryHealthRow,
} from "@/lib/delivery-health";
import { decrypt } from "@/lib/encryption";
import {
  getHaloAgents,
  getHaloTickets,
  getHaloToken,
  getTicketDetails,
  type HaloTicket,
} from "@/lib/halo";
import { runAutoClosureSummaryCheck } from "@/lib/auto-closure-summary-runner";
import { getCWAuthHeaders, getCWConnectionForUser } from "@/lib/cw-auth";
import { getDeliveryHealthDashboardAccess } from "@/lib/utils/getPlan";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

const CACHE_TTL_MS = 5 * 60 * 1000;

/** Cap detail fetches per request so the route stays responsive for large tenants. */
const MAX_ACTIVE_WITH_DETAILS = 600;
const DETAIL_CONCURRENCY = 8;

type CacheEntry = {
  expiresAt: number;
  body: Record<string, unknown>;
};

type CwProjectRow = {
  id?: number;
  name?: string | null;
  status?: { name?: string | null } | null;
  company?: { id?: number | string | null; name?: string | null } | null;
  manager?: { name?: string | null } | null;
  targetDate?: string | null;
  estimatedEndDate?: string | null;
  closedDate?: string | null;
  description?: string | null;
  actualHours?: number | null;
};
type CwProjectTaskRow = {
  id?: number;
  status?: { name?: string | null } | null;
};
type CwTicketResource = { name?: unknown; identifier?: unknown } | null;

const responseCache = new Map<string, CacheEntry>();
const CW_OPEN_ONLY_CONDITIONS = [
  'status/name!="Closed"',
  'status/name!="Closed (resolved)"',
  'status/name!="Resolved"',
  'status/name!="Completed"',
].join(" and ");

function parseAiRiskDetails(
  generations: Array<{ id?: string | null; created_at?: string | null; output_json?: unknown }>,
): DeliveryHealthRiskDetail[] {
  const items: DeliveryHealthRiskDetail[] = [];
  for (const g of generations) {
    const root = (g.output_json ?? {}) as Record<string, unknown>;
    const risks = Array.isArray(root.risks) ? (root.risks as Array<Record<string, unknown>>) : [];
    for (const r of risks) {
      const riskText = String(r.risk ?? r.title ?? r.description ?? "").trim();
      if (!riskText) continue;
      const clientName = String(r.client_name ?? r.client ?? "Unknown client").trim() || "Unknown client";
      items.push({
        clientName,
        riskText,
        generatedAt: String(g.created_at ?? new Date().toISOString()),
        reportLink: g.id ? `/reports?generation=${g.id}` : null,
        source: "ai",
      });
    }
  }
  return items;
}

function buildProxyRiskDetails(rows: DeliveryHealthRow[]): DeliveryHealthRiskDetail[] {
  return rows
    .filter((r) => r.kind === "ticket" && (r.slaRisk === "overdue" || (r.daysToTarget ?? 1) < 0))
    .map((r) => ({
      clientName: r.clientName,
      riskText: `Potential risk - overdue ticket: ${r.name}`,
      generatedAt: new Date().toISOString(),
      reportLink: r.haloTicketUrl ?? null,
      source: "proxy_overdue_ticket" as const,
    }));
}

function buildDriverDetails(
  rows: DeliveryHealthRow[],
  predicate: (row: DeliveryHealthRow) => boolean,
): DeliveryHealthDriverDetail[] {
  return rows.filter(predicate).map((r) => ({
    clientName: r.clientName,
    itemName: r.name,
    ageDays: r.ticketAgeDays ?? null,
    link: r.haloTicketUrl ?? null,
    priorityName: r.priorityName ?? null,
    ownerName: r.owner ?? null,
    responseTimeHours: r.firstResponseHours ?? null,
  }));
}

function isResolvedStatusName(statusName: string | null | undefined): boolean {
  const s = (statusName ?? "").trim().toLowerCase();
  return /resolved|closed|completed|cancelled|canceled|done/.test(s);
}

function buildProjectTaskSummaryFromTickets(tickets: HaloTicket[]): Map<number, { total: number; completed: number }> {
  const summary = new Map<number, { total: number; completed: number }>();
  for (const ticket of tickets) {
    if (!ticket.is_project_task) continue;
    const projectId =
      typeof ticket.parent_project_id === "number" && Number.isFinite(ticket.parent_project_id)
        ? ticket.parent_project_id
        : null;
    if (projectId == null || projectId <= 0) continue;
    const existing = summary.get(projectId) ?? { total: 0, completed: 0 };
    existing.total += 1;
    if (isResolvedStatusName(ticket.status?.name ?? null)) {
      existing.completed += 1;
    }
    summary.set(projectId, existing);
  }
  return summary;
}

function attachProjectTaskSummary(
  rows: DeliveryHealthRow[],
  byProjectId: Map<number, { total: number; completed: number }>,
): DeliveryHealthRow[] {
  return rows.map((row) => {
    if (row.kind !== "project") {
      return row;
    }
    const summary = byProjectId.get(row.id);
    return {
      ...row,
      projectTaskTotal: summary?.total ?? null,
      projectTaskCompleted: summary?.completed ?? null,
    };
  });
}

async function fetchCwProjectTaskSummary(
  siteUrl: string,
  headers: HeadersInit,
  projectIds: number[],
): Promise<Map<number, { total: number; completed: number }>> {
  const out = new Map<number, { total: number; completed: number }>();
  const ids = [...new Set(projectIds.filter((id) => Number.isFinite(id) && id > 0))];
  const concurrency = 8;
  for (let i = 0; i < ids.length; i += concurrency) {
    const batch = ids.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map(async (projectId) => {
        const url = `${siteUrl}/v4_6_release/apis/3.0/project/tickets?conditions=${encodeURIComponent(`project/id=${projectId}`)}&pageSize=500`;
        const res = await fetch(url, { headers, cache: "no-store" });
        const raw = (await res.json().catch(() => [])) as unknown;
        const items = Array.isArray(raw)
          ? raw
          : Array.isArray((raw as { items?: unknown })?.items)
            ? ((raw as { items: unknown[] }).items as unknown[])
            : [];
        let total = 0;
        let completed = 0;
        for (const item of items as CwProjectTaskRow[]) {
          total += 1;
          if (isResolvedStatusName(item.status?.name ?? null)) completed += 1;
        }
        return { projectId, total, completed };
      }),
    );
    for (const item of results) {
      out.set(item.projectId, { total: item.total, completed: item.completed });
    }
  }
  return out;
}

function avgHoursPerDayFromProjects(rows: DeliveryHealthRow[]): number | null {
  const ratios: number[] = [];
  for (const row of rows) {
    if (row.kind !== "project") continue;
    const daysLeft = row.daysToTarget;
    if (daysLeft == null || daysLeft <= 0) continue;
    const raw = row as unknown as { completionpercent?: unknown };
    const pct = Number(raw.completionpercent);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) continue;
    const targetHours = row.targetHours;
    if (targetHours == null || !Number.isFinite(targetHours) || targetHours <= 0) continue;
    const remainingHours = targetHours * ((100 - pct) / 100);
    ratios.push(remainingHours / Math.max(1, daysLeft));
  }
  if (ratios.length === 0) return null;
  return Math.round((ratios.reduce((a, b) => a + b, 0) / ratios.length) * 10) / 10;
}

function normalizeCwPriorityName(raw: unknown): string {
  const value = String(raw ?? "").trim();
  if (!value) return "Normal";
  const withoutPrefix = value.replace(/^priority\s*\d+\s*[-:]\s*/i, "").trim();
  const lowered = `${withoutPrefix} ${value}`.toLowerCase();
  if (lowered.includes("critical") || lowered.includes("high") || /\bp1\b/.test(lowered)) {
    return "High";
  }
  if (lowered.includes("low") || /\bp4\b|\bp5\b/.test(lowered)) {
    return "Low";
  }
  return "Medium";
}

function applyCwRagDefaults(rows: ReturnType<typeof haloTicketsToHealthRows>) {
  return rows.map((row) => {
    const status = row.statusName.trim().toLowerCase();
    const isClosed =
      status.includes("closed") || status.includes("resolved") || status.includes("completed");
    if (isClosed) return { ...row, rag: "green" as const };

    const isOverdue = row.daysToTarget != null && row.daysToTarget < 0;
    if (isOverdue) return { ...row, rag: "red" as const };

    const ageDays = row.ticketAgeDays ?? 0;
    if (ageDays > 14) return { ...row, rag: "amber" as const };

    return { ...row, rag: "green" as const };
  });
}

function mapCwTicketToHaloShape(row: Record<string, unknown>): HaloTicket {
  const company = (row.company as { id?: unknown; name?: unknown } | null) ?? null;
  const companyId =
    company && (typeof company.id === "number" || typeof company.id === "string")
      ? company.id
      : null;
  const resources =
    (Array.isArray(row.resources) ? row.resources : []) as CwTicketResource[];
  const firstResource = resources.find(
    (resource) =>
      String(resource?.name ?? "").trim().length > 0 ||
      String(resource?.identifier ?? "").trim().length > 0,
  );
  const assignedToRaw = row.assignedTo;
  const assignedTo =
    typeof assignedToRaw === "string"
      ? assignedToRaw.trim()
      : assignedToRaw && typeof assignedToRaw === "object"
        ? String(
            (assignedToRaw as { name?: unknown; identifier?: unknown }).name ??
              (assignedToRaw as { identifier?: unknown }).identifier ??
              "",
          ).trim()
        : "";
  const ownerName =
    String((row.owner as { name?: unknown; identifier?: unknown } | null)?.name ?? "").trim() ||
    String((row.owner as { identifier?: unknown } | null)?.identifier ?? "").trim() ||
    assignedTo ||
    String(firstResource?.name ?? "").trim() ||
    String(firstResource?.identifier ?? "").trim() ||
    "Unassigned";
  return {
    id: Number(row.id ?? 0),
    summary: String(row.summary ?? "Untitled"),
    details: null,
    status: { name: String((row.status as { name?: unknown } | null)?.name ?? "Open") },
    priority: { name: normalizeCwPriorityName((row.priority as { name?: unknown } | null)?.name) },
    client: { name: String((row.company as { name?: unknown } | null)?.name ?? "Unknown") },
    agent: {
      name: ownerName,
    },
    dateoccurred: typeof row.dateEntered === "string" ? row.dateEntered : null,
    targetdate:
      (typeof row.requiredDate === "string" && row.requiredDate) ||
      (typeof row.targetDate === "string" && row.targetDate) ||
      (typeof row.closedDate === "string" && row.closedDate) ||
      null,
    timetaken:
      typeof row.actualHours === "number" && Number.isFinite(row.actualHours)
        ? row.actualHours
        : 0,
    notes: [],
    ...(typeof row.lastUpdated === "string" && row.lastUpdated
      ? { last_update: row.lastUpdated }
      : {}),
    companyId: companyId as number | string | null,
    site: { name: "" },
    manager: { name: "" },
    clientContact: { name: "" },
    tickettype: { name: "" },
  } as HaloTicket;
}

function mapCwProjectToHaloShape(row: CwProjectRow): HaloTicket {
  return {
    id: Number(row.id ?? 0),
    summary: String(row.name ?? "Untitled project"),
    details: row.description ?? null,
    status: { name: String(row.status?.name ?? "Open") },
    priority: null,
    client: { name: String(row.company?.name ?? "Unknown") },
    agent: row.manager?.name ? { name: row.manager.name } : null,
    dateoccurred: null,
    targetdate: row.targetDate ?? row.estimatedEndDate ?? row.closedDate ?? null,
    timetaken: typeof row.actualHours === "number" && Number.isFinite(row.actualHours) ? row.actualHours : 0,
    notes: [],
    is_project: true,
    companyId: row.company?.id ?? null,
    site: { name: "" },
    manager: { name: row.manager?.name ?? "" },
    clientContact: { name: "" },
    tickettype: { name: "" },
  } as HaloTicket;
}

async function attachTicketDetails(
  haloUrl: string,
  token: string,
  tickets: HaloTicket[],
  concurrency: number,
): Promise<HaloTicket[]> {
  const out: HaloTicket[] = [];
  for (let i = 0; i < tickets.length; i += concurrency) {
    const chunk = tickets.slice(i, i + concurrency);
    const detailed = await Promise.all(
      chunk.map((t) => getTicketDetails(haloUrl, token, t.id)),
    );
    out.push(...detailed);
  }
  return out;
}

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const bypassCache = url.searchParams.get("refresh") === "1";
    const forceSource = url.searchParams.get("source");
    const forceConnectWise = forceSource === "connectwise";

    const cacheKey = user.id;
    if (!bypassCache) {
      const hit = responseCache.get(cacheKey);
      if (hit && Date.now() < hit.expiresAt) {
        return NextResponse.json(hit.body);
      }
    }

    const access = await getDeliveryHealthDashboardAccess(supabase, user.id);
    const refreshedAt = new Date().toISOString();
    const sinceIso = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { data: gens, error: genErr } = await supabase
      .from("generations")
      .select("id, created_at, output_json, input_text")
      .eq("user_id", user.id)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(400);

    if (genErr) {
      console.error("[delivery-health] generations:", genErr.message);
    }

    const historyIndex = buildHistoryIndex(
      (gens ?? []).map((g) => ({
        created_at: g.created_at as string,
        output_json: g.output_json,
        input_text: typeof g.input_text === "string" ? g.input_text : null,
      })),
    );

    const { data: conn, error: connErr } = await supabase
      .from("halo_connections")
      .select("halo_url, tenant, client_id, client_secret_encrypted")
      .eq("user_id", user.id)
      .maybeSingle();

    if (forceConnectWise || connErr || !conn) {
      try {
        const cwConn = await getCWConnectionForUser(user.id);
        const cwHeaders = await getCWAuthHeaders(user.id);
        const conditions = encodeURIComponent(CW_OPEN_ONLY_CONDITIONS);
        const [ticketRes, projectRes] = await Promise.all([
          fetch(
            `${cwConn.siteUrl}/v4_6_release/apis/3.0/service/tickets?conditions=${conditions}&pageSize=500`,
            { headers: cwHeaders, cache: "no-store" },
          ),
          fetch(
            `${cwConn.siteUrl}/v4_6_release/apis/3.0/project/projects?conditions=${conditions}&pageSize=500`,
            { headers: cwHeaders, cache: "no-store" },
          ),
        ]);
        const ticketRaw = (await ticketRes.json().catch(() => [])) as unknown;
        const projectRaw = (await projectRes.json().catch(() => [])) as unknown;
        const ticketRows = Array.isArray(ticketRaw)
          ? ticketRaw
          : Array.isArray((ticketRaw as { items?: unknown })?.items)
            ? ((ticketRaw as { items: unknown[] }).items as unknown[])
            : [];
        const projectRows = Array.isArray(projectRaw)
          ? projectRaw
          : Array.isArray((projectRaw as { items?: unknown })?.items)
            ? ((projectRaw as { items: unknown[] }).items as unknown[])
            : [];
        const listTickets = [
          ...ticketRows.map((r) => mapCwTicketToHaloShape(r as Record<string, unknown>)),
          ...projectRows.map((r) => mapCwProjectToHaloShape(r as CwProjectRow)),
        ].filter((t) => Number(t.id) > 0);
        const cwTaskSummary = await fetchCwProjectTaskSummary(
          cwConn.siteUrl,
          cwHeaders,
          listTickets.filter((t) => t.is_project).map((t) => t.id),
        );

        const detailLimit = access === "full" ? Math.min(listTickets.length, 150) : 0;
        if (detailLimit > 0) {
          const slice = listTickets.slice(0, detailLimit);
          const withNotes = await Promise.all(
            slice.map(async (t) => {
              const notesRes = await fetch(
                `${cwConn.siteUrl}/v4_6_release/apis/3.0/service/tickets/${t.id}/notes?pageSize=100`,
                { headers: cwHeaders, cache: "no-store" },
              );
              const notesRaw = (await notesRes.json().catch(() => [])) as unknown;
              const noteRows = Array.isArray(notesRaw)
                ? notesRaw
                : Array.isArray((notesRaw as { items?: unknown })?.items)
                  ? ((notesRaw as { items: unknown[] }).items as unknown[])
                  : [];
              const notes = noteRows.map((n) => ({
                id: String((n as { id?: unknown }).id ?? ""),
                date: String((n as { dateCreated?: unknown }).dateCreated ?? ""),
                who: String((n as { createdBy?: unknown }).createdBy ?? "Unknown"),
                note: String((n as { text?: unknown }).text ?? ""),
              }));
              return { ...t, notes } as HaloTicket;
            }),
          );
          for (let i = 0; i < withNotes.length; i += 1) listTickets[i] = withNotes[i]!;
        }

        const rows = attachProjectTaskSummary(
          applyCwRagDefaults(haloTicketsToHealthRows(listTickets, historyIndex, cwConn.siteUrl)).map((row) => ({
            ...row,
            source: "connectwise" as const,
            haloTicketUrl: buildConnectWiseTicketDeepLink(
              cwConn.siteUrl,
              row.id,
              row.kind,
            ),
          })),
          cwTaskSummary,
        );
        const stats = buildDeliveryHealthStats(rows);
        const aiRisks = parseAiRiskDetails(
          (gens ?? []).map((g) => ({
            id: typeof g.id === "string" ? g.id : null,
            created_at: typeof g.created_at === "string" ? g.created_at : null,
            output_json: g.output_json,
          })),
        );
        const openRiskDetails = aiRisks.length > 0 ? aiRisks : buildProxyRiskDetails(rows);
        const projectAvg = avgHoursPerDayFromProjects(rows);
        stats.projects.avgHoursPerDayToTarget = projectAvg;
        stats.projects.totalOpenRisks = openRiskDetails.length;
        stats.tickets.totalOpenRisks = openRiskDetails.length;
        const overdueDetails = buildDriverDetails(rows, (r) => r.kind === "ticket" && (r.daysToTarget ?? 1) < 0);
        const slaRiskDetails = buildDriverDetails(rows, (r) => r.kind === "ticket" && r.slaRisk === "at_risk");
        const body: DeliveryHealthApiResponse = {
          access,
          refreshedAt,
          haloConnected: false,
          cwConnected: true,
          haloWebBaseUrl: cwConn.siteUrl,
          stats,
          rows,
          statDetails: {
            openRisks: openRiskDetails,
            overdueTickets: overdueDetails,
            slaAtRisk: slaRiskDetails,
          },
        };
        responseCache.set(cacheKey, {
          expiresAt: Date.now() + CACHE_TTL_MS,
          body: body as unknown as Record<string, unknown>,
        });
        return NextResponse.json(body);
      } catch {
        // fall through to existing "not connected" response
      }
      const empty = emptyDeliveryHealthStats();
      const body: DeliveryHealthApiResponse = {
        access,
        refreshedAt,
        haloConnected: false,
        cwConnected: false,
        connectHint:
          "Connect HaloPSA under Integrations to see live delivery health for your projects and tickets.",
        stats: empty,
        rows: [],
      };
      responseCache.set(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        body: body as unknown as Record<string, unknown>,
      });
      return NextResponse.json(body);
    }

    let clientSecret: string;
    try {
      clientSecret = decrypt(conn.client_secret_encrypted);
    } catch {
      const empty = emptyDeliveryHealthStats();
      const body: DeliveryHealthApiResponse = {
        access,
        refreshedAt,
        haloConnected: false,
        cwConnected: false,
        connectHint: "HaloPSA credentials could not be read. Please reconnect in Integrations.",
        stats: empty,
        rows: [],
      };
      responseCache.set(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        body: body as unknown as Record<string, unknown>,
      });
      return NextResponse.json(body);
    }

    let token: string;
    try {
      token = await getHaloToken({
        haloUrl: conn.halo_url,
        tenant: conn.tenant,
        clientId: conn.client_id,
        clientSecret,
      });
    } catch {
      const empty = emptyDeliveryHealthStats();
      const body: DeliveryHealthApiResponse = {
        access,
        refreshedAt,
        haloConnected: false,
        cwConnected: false,
        connectHint: "Could not authenticate with HaloPSA. Check your connection in Integrations.",
        stats: empty,
        rows: [],
      };
      responseCache.set(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        body: body as unknown as Record<string, unknown>,
      });
      return NextResponse.json(body);
    }

    let listTickets: HaloTicket[] = [];
    try {
      listTickets = await getHaloTickets(token, conn.halo_url, {
        count: 2500,
        includeDetails: false,
      });
    } catch (e) {
      console.error("[delivery-health] getHaloTickets:", e);
      const empty = emptyDeliveryHealthStats();
      const body: DeliveryHealthApiResponse = {
        access,
        refreshedAt,
        haloConnected: true,
        cwConnected: false,
        haloWebBaseUrl: conn.halo_url,
        stats: empty,
        rows: [],
        error:
          e instanceof Error
            ? e.message
            : "Could not load tickets from HaloPSA. Try again in a few minutes.",
      };
      responseCache.set(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        body: body as unknown as Record<string, unknown>,
      });
      return NextResponse.json(body);
    }

    if (bypassCache) {
      try {
        const admin = createServiceRoleClient();
        await runAutoClosureSummaryCheck({
          admin,
          userId: user.id,
          haloUrl: conn.halo_url,
          token,
          listTickets,
        });
      } catch (e) {
        console.error("[delivery-health] auto-closure:", e);
      }
    }

    const activeTickets = listTickets.filter((t) =>
      isHaloTicketActive(t.status?.name ?? "Open"),
    );
    const capped = activeTickets.slice(0, MAX_ACTIVE_WITH_DETAILS);

    let ticketsWithNotes: HaloTicket[] = capped;
    if (access === "full") {
      try {
        ticketsWithNotes = await attachTicketDetails(
          conn.halo_url,
          token,
          capped,
          DETAIL_CONCURRENCY,
        );
      } catch (e) {
        console.error("[delivery-health] getTicketDetails batch:", e);
        const empty = emptyDeliveryHealthStats();
        const body: DeliveryHealthApiResponse = {
          access,
          refreshedAt,
          haloConnected: true,
          cwConnected: false,
          haloWebBaseUrl: conn.halo_url,
          stats: empty,
          rows: [],
          error:
            e instanceof Error
              ? e.message
              : "Could not load ticket notes from HaloPSA. Try again in a few minutes.",
        };
        responseCache.set(cacheKey, {
          expiresAt: Date.now() + CACHE_TTL_MS,
          body: body as unknown as Record<string, unknown>,
        });
        return NextResponse.json(body);
      }
    } else {
      ticketsWithNotes = await enrichTicketsMissingAgentsForDashboard(
        conn.halo_url,
        token,
        capped,
        { maxFetches: MAX_ACTIVE_WITH_DETAILS, concurrency: DETAIL_CONCURRENCY },
      );
    }

    let agents: { id: number; name: string }[] = [];
    try {
      agents = await getHaloAgents(conn.halo_url, token);
    } catch {
      agents = [];
    }
    const agentsById = new Map<number, string>(agents.map((a) => [a.id, a.name]));

    let rows = haloTicketsToHealthRows(
      ticketsWithNotes,
      historyIndex,
      conn.halo_url,
      agentsById,
    );
    const haloTaskSummary = buildProjectTaskSummaryFromTickets(listTickets);
    rows = attachProjectTaskSummary(rows, haloTaskSummary);
    let cwConnected = false;
    try {
      const cwConn = await getCWConnectionForUser(user.id);
      const cwHeaders = await getCWAuthHeaders(user.id);
      const conditions = encodeURIComponent(CW_OPEN_ONLY_CONDITIONS);
      const [ticketRes, projectRes] = await Promise.all([
        fetch(
          `${cwConn.siteUrl}/v4_6_release/apis/3.0/service/tickets?conditions=${conditions}&pageSize=500`,
          { headers: cwHeaders, cache: "no-store" },
        ),
        fetch(
          `${cwConn.siteUrl}/v4_6_release/apis/3.0/project/projects?conditions=${conditions}&pageSize=500`,
          { headers: cwHeaders, cache: "no-store" },
        ),
      ]);
      const ticketRaw = (await ticketRes.json().catch(() => [])) as unknown;
      const projectRaw = (await projectRes.json().catch(() => [])) as unknown;
      const ticketRows = Array.isArray(ticketRaw)
        ? ticketRaw
        : Array.isArray((ticketRaw as { items?: unknown })?.items)
          ? ((ticketRaw as { items: unknown[] }).items as unknown[])
          : [];
      const projectRows = Array.isArray(projectRaw)
        ? projectRaw
        : Array.isArray((projectRaw as { items?: unknown })?.items)
          ? ((projectRaw as { items: unknown[] }).items as unknown[])
          : [];
      const cwTickets = [
        ...ticketRows.map((r) => mapCwTicketToHaloShape(r as Record<string, unknown>)),
        ...projectRows.map((r) => mapCwProjectToHaloShape(r as CwProjectRow)),
      ].filter((t) => Number(t.id) > 0);
      const cwTaskSummary = await fetchCwProjectTaskSummary(
        cwConn.siteUrl,
        cwHeaders,
        cwTickets.filter((t) => t.is_project).map((t) => t.id),
      );
      const cwRows = attachProjectTaskSummary(
        applyCwRagDefaults(haloTicketsToHealthRows(cwTickets, historyIndex, cwConn.siteUrl)).map((row) => ({
          ...row,
          source: "connectwise" as const,
          haloTicketUrl: buildConnectWiseTicketDeepLink(
            cwConn.siteUrl,
            row.id,
            row.kind,
          ),
        })),
        cwTaskSummary,
      );
      rows = [...rows, ...cwRows];
      cwConnected = true;
    } catch {
      cwConnected = false;
    }
    const stats = buildDeliveryHealthStats(rows);
    const aiRisks = parseAiRiskDetails(
      (gens ?? []).map((g) => ({
        id: typeof g.id === "string" ? g.id : null,
        created_at: typeof g.created_at === "string" ? g.created_at : null,
        output_json: g.output_json,
      })),
    );
    const openRiskDetails = aiRisks.length > 0 ? aiRisks : buildProxyRiskDetails(rows);
    const projectAvg = avgHoursPerDayFromProjects(rows);
    stats.projects.avgHoursPerDayToTarget = projectAvg;
    stats.projects.totalOpenRisks = openRiskDetails.length;
    stats.tickets.totalOpenRisks = openRiskDetails.length;
    const overdueDetails = buildDriverDetails(rows, (r) => r.kind === "ticket" && (r.daysToTarget ?? 1) < 0);
    const slaRiskDetails = buildDriverDetails(rows, (r) => r.kind === "ticket" && r.slaRisk === "at_risk");

    const body: DeliveryHealthApiResponse = {
      access,
      refreshedAt,
      haloConnected: true,
      cwConnected,
      haloWebBaseUrl: conn.halo_url,
      stats,
      rows,
      statDetails: {
        openRisks: openRiskDetails,
        overdueTickets: overdueDetails,
        slaAtRisk: slaRiskDetails,
      },
    };

    responseCache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      body: body as unknown as Record<string, unknown>,
    });

    return NextResponse.json(body);
  } catch (e) {
    console.error("[delivery-health]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 },
    );
  }
}
