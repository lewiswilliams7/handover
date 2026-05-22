import { decrypt } from "@/lib/encryption";
import { getCWAuthHeaders, getCWConnectionForUser } from "@/lib/cw-auth";
import {
  applyCwDeliveryHealthRagOverlay,
  buildHistoryIndex,
  haloTicketsToHealthRows,
  isHaloTicketActive,
  type DeliveryHealthRag,
} from "@/lib/delivery-health";
import { getHaloAgents, getHaloProjects, getHaloToken, getHaloTickets, type HaloTicket } from "@/lib/halo";
import { fetchPortalRecentTicketActivity } from "@/lib/server/portal-ticket-notes";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type PsaSource = "halopsa" | "connectwise" | string;

const CW_OPEN_ONLY = [
  'status/name!="Closed"',
  'status/name!="Closed (resolved)"',
  'status/name!="Resolved"',
  'status/name!="Completed"',
].join(" and ");

export type PortalPsaPayloadStats = {
  openTickets: number;
  highPriority?: number;
  mediumPriority?: number;
  lowPriority?: number;
  activeProjects: number;
  avgProjectProgress: number;
  rag: DeliveryHealthRag;
  resolvedThisMonth?: number;
};

function worstRagFromRows(rows: { rag: DeliveryHealthRag }[]): DeliveryHealthRag | null {
  if (rows.length === 0) return null;
  const rags = rows.map((r) => r.rag);
  if (rags.includes("red")) return "red";
  if (rags.includes("amber")) return "amber";
  if (rags.includes("green")) return "green";
  if (rags.includes("grey")) return "grey";
  return null;
}

function mapHaloTicketToPortalRow(t: HaloTicket) {
  const owner =
    (t.agent?.name && t.agent.name.trim()) ||
    (t.manager?.name && t.manager.name.trim()) ||
    "—";
  return {
    id: t.id,
    summary: t.summary ?? "",
    status: t.status?.name ?? "",
    priority: t.priority?.name ?? "",
    engineer: owner,
    lastUpdated: (t as unknown as { last_update?: string }).last_update ?? t.dateoccurred ?? null,
  };
}

function mapCwTicketRow(row: Record<string, unknown>) {
  const status = (row.status as { name?: string } | null)?.name ?? "";
  const priority = (row.priority as { name?: string } | null)?.name ?? "";
  const company = (row.company as { name?: string } | null)?.name ?? "";
  const owner =
    String((row.owner as { name?: string } | null)?.name ?? "").trim() ||
    (typeof row.assignedTo === "string"
      ? row.assignedTo
      : String((row.assignedTo as { name?: string } | null)?.name ?? "")) ||
    "—";
  return {
    id: Number(row.id ?? 0),
    summary: String(row.summary ?? ""),
    status,
    priority,
    clientName: company,
    engineer: owner,
    lastUpdated:
      (typeof row.lastUpdated === "string" && row.lastUpdated) ||
      (typeof row.dateEntered === "string" && row.dateEntered) ||
      null,
  };
}

function utcMonthStartMs(): number {
  const n = new Date();
  return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1);
}

function utcMonthEndMs(): number {
  const n = new Date();
  return Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + 1, 0, 23, 59, 59, 999);
}

function haloTicketClosedAtMs(t: HaloTicket): number {
  const raw = (t as unknown as { last_update?: string }).last_update ?? t.dateoccurred;
  if (typeof raw === "string" && raw.trim()) {
    const x = Date.parse(raw);
    if (Number.isFinite(x)) return x;
  }
  return 0;
}

function countPriorityBuckets(rows: { priority: string }[]): { high: number; medium: number; low: number } {
  let high = 0;
  let medium = 0;
  let low = 0;
  for (const r of rows) {
    const p = r.priority.trim().toLowerCase();
    if (p === "high" || p === "critical") high += 1;
    else if (p === "medium") medium += 1;
    else if (p === "low") low += 1;
  }
  return { high, medium, low };
}

function cwRawRowsToHaloTickets(rows: unknown[]): HaloTicket[] {
  return rows.map((r) => {
    const row = r as Record<string, unknown>;
    const company = (row.company as { id?: unknown; name?: unknown } | null) ?? null;
    const companyIdVal =
      company && (typeof company.id === "number" || typeof company.id === "string") ? company.id : null;
    const assignedToRaw = row.assignedTo;
    const assignedTo =
      typeof assignedToRaw === "string"
        ? assignedToRaw.trim()
        : assignedToRaw && typeof assignedToRaw === "object"
          ? String(
              (assignedToRaw as { name?: unknown }).name ??
                (assignedToRaw as { identifier?: unknown }).identifier ??
                "",
            ).trim()
          : "";
    const ownerName =
      String((row.owner as { name?: unknown } | null)?.name ?? "").trim() || assignedTo || "Unassigned";
    return {
      id: Number(row.id ?? 0),
      summary: String(row.summary ?? ""),
      details: null,
      status: { name: String((row.status as { name?: unknown } | null)?.name ?? "Open") },
      priority: {
        name: String((row.priority as { name?: unknown } | null)?.name ?? "Normal"),
      },
      client: { name: String((row.company as { name?: unknown } | null)?.name ?? "Unknown") },
      agent: { name: ownerName },
      dateoccurred: typeof row.dateEntered === "string" ? row.dateEntered : null,
      targetdate:
        (typeof row.requiredDate === "string" && row.requiredDate) ||
        (typeof row.targetDate === "string" && row.targetDate) ||
        null,
      timetaken: typeof row.actualHours === "number" ? row.actualHours : 0,
      notes: [],
      companyId: companyIdVal as number | string | null,
      site: { name: "" },
      manager: { name: "" },
      clientContact: { name: "" },
      tickettype: { name: "" },
    } as HaloTicket;
  });
}

async function safeGetHaloTickets(
  token: string,
  haloUrl: string,
  filters: Parameters<typeof getHaloTickets>[2],
): Promise<HaloTicket[]> {
  try {
    return await getHaloTickets(token, haloUrl, filters);
  } catch {
    return [];
  }
}

type PortalProjectRow = {
  id: number;
  name: string;
  status: string;
  percentComplete: number | null;
  engineer: string;
  targetDate: string | null;
};

function avgPercentComplete(projects: PortalProjectRow[]): number {
  const nums = projects
    .map((p) => p.percentComplete)
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  if (nums.length === 0) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

/** PSA client id from portal_clients.client_id (numeric Halo id or CW company id string). */
function parsePortalPsaClientId(clientIdStr: string): { haloNumericId: number | null; cwCompanyId: string } {
  const raw = String(clientIdStr ?? "").trim();
  if (!raw) return { haloNumericId: null, cwCompanyId: "" };
  const direct = Number.parseInt(raw, 10);
  if (Number.isFinite(direct) && direct > 0) {
    return { haloNumericId: direct, cwCompanyId: raw };
  }
  const digits = Number.parseInt(raw.replace(/\D/g, ""), 10);
  return {
    haloNumericId: Number.isFinite(digits) && digits > 0 ? digits : null,
    cwCompanyId: raw,
  };
}

function haloTicketBelongsToPortalClient(t: HaloTicket, haloClientId: number): boolean {
  if (typeof t.clientId === "number" && Number.isFinite(t.clientId)) {
    return t.clientId === haloClientId;
  }
  return false;
}

function haloProjectBelongsToPortalClient(
  p: { clientId?: number | null },
  haloClientId: number,
): boolean {
  if (typeof p.clientId === "number" && Number.isFinite(p.clientId)) {
    return p.clientId === haloClientId;
  }
  return false;
}

function cwRowBelongsToPortalCompany(row: Record<string, unknown>, companyId: string): boolean {
  const want = companyId.trim();
  if (!want) return false;
  const company = row.company as { id?: unknown } | null | undefined;
  if (!company || (typeof company.id !== "number" && typeof company.id !== "string")) {
    return false;
  }
  return String(company.id).trim() === want;
}

export async function fetchPortalPsaPayload(opts: {
  mspUserId: string;
  psaSource: PsaSource;
  clientId: string;
  visibilityTickets: boolean;
  visibilityProjects: boolean;
  visibilityRag: boolean;
  visibilityStats: boolean;
  visibilityPriorityBreakdown: boolean;
  visibilityResolvedCount: boolean;
  visibilityRecentActivity: boolean;
}): Promise<{
  tickets?: ReturnType<typeof mapHaloTicketToPortalRow>[];
  projects?: PortalProjectRow[];
  rag?: DeliveryHealthRag | null;
  lastUpdated: string;
  stats?: PortalPsaPayloadStats;
  recentActivity?: Array<{ date: string | null; author: string; summary: string }>;
}> {
  const lastUpdated = new Date().toISOString();
  const out: {
    tickets?: ReturnType<typeof mapHaloTicketToPortalRow>[];
    projects?: PortalProjectRow[];
    rag?: DeliveryHealthRag | null;
    lastUpdated: string;
    stats?: PortalPsaPayloadStats;
    recentActivity?: Array<{ date: string | null; author: string; summary: string }>;
  } = { lastUpdated };

  const needTicketsInternal =
    opts.visibilityTickets ||
    opts.visibilityRag ||
    opts.visibilityStats ||
    opts.visibilityResolvedCount ||
    opts.visibilityRecentActivity;
  const needProjectsInternal = opts.visibilityProjects || opts.visibilityStats;

  const admin = createServiceRoleClient();
  const { data: gens } = await admin
    .from("generations")
    .select("id, created_at, output_json, input_text")
    .eq("user_id", opts.mspUserId)
    .gte("created_at", new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString())
    .order("created_at", { ascending: false })
    .limit(200);
  const historyIndex = buildHistoryIndex(
    (gens ?? []).map((g) => ({
      created_at: g.created_at as string,
      output_json: g.output_json,
      input_text: typeof g.input_text === "string" ? g.input_text : null,
    })),
  );

  if (opts.psaSource === "halopsa") {
    const { data: conn, error: cErr } = await admin
      .from("halo_connections")
      .select("halo_url, tenant, client_id, client_secret_encrypted")
      .eq("user_id", opts.mspUserId)
      .maybeSingle();
    if (cErr || !conn) return out;

    let clientSecret: string;
    try {
      clientSecret = decrypt(conn.client_secret_encrypted);
    } catch {
      return out;
    }

    const token = await getHaloToken({
      haloUrl: conn.halo_url,
      tenant: conn.tenant,
      clientId: conn.client_id,
      clientSecret,
    });

    const { haloNumericId: numericClientId } = parsePortalPsaClientId(opts.clientId);
    if (numericClientId == null) return out;

    let agentsById = new Map<number, string>();
    try {
      const agents = await getHaloAgents(conn.halo_url, token);
      agentsById = new Map(agents.map((a) => [a.id, a.name]));
    } catch {
      agentsById = new Map();
    }

    let haloTicketsAll: HaloTicket[] = [];
    if (needTicketsInternal) {
      haloTicketsAll = await safeGetHaloTickets(token, conn.halo_url, {
        clientId: numericClientId,
        count: 800,
        includeDetails: false,
      });
    }

    const scopedHalo = haloTicketsAll.filter((t) => haloTicketBelongsToPortalClient(t, numericClientId));
    const openHalo = scopedHalo.filter((t) => !t.is_project && isHaloTicketActive(t.status?.name ?? "Open"));

    if (opts.visibilityTickets) {
      out.tickets = openHalo.map(mapHaloTicketToPortalRow);
    }

    let ragForInternal: DeliveryHealthRag | null = null;
    if ((opts.visibilityRag || opts.visibilityStats) && openHalo.length > 0) {
      const rows = haloTicketsToHealthRows(openHalo, historyIndex, conn.halo_url, agentsById);
      ragForInternal = worstRagFromRows(rows) ?? "grey";
    } else if (opts.visibilityRag || opts.visibilityStats) {
      ragForInternal = "grey";
    }
    if (opts.visibilityRag) {
      out.rag = ragForInternal;
    }

    let activeProjects: PortalProjectRow[] = [];
    if (needProjectsInternal) {
      let projects: Awaited<ReturnType<typeof getHaloProjects>> = [];
      try {
        projects = await getHaloProjects(conn.halo_url, token, {
          clientId: numericClientId,
          count: 2000,
        });
      } catch {
        projects = [];
      }
      const active = projects
        .filter((p) => haloProjectBelongsToPortalClient(p, numericClientId))
        .filter((p) => {
          const s = (p.status?.name ?? "").toLowerCase();
          return !/closed|completed|cancelled|canceled|resolved/.test(s);
        });
      activeProjects = active.map((p) => ({
        id: p.id,
        name: p.name ?? `Project ${p.id}`,
        status: p.status?.name ?? "",
        percentComplete:
          typeof p.completionpercent === "number" && Number.isFinite(p.completionpercent)
            ? Math.round(p.completionpercent)
            : null,
        engineer: p.projectmanager?.name?.trim() || "—",
        targetDate: p.targetdate ?? null,
      }));
      if (opts.visibilityProjects) {
        out.projects = activeProjects;
      }
    }

    let resolvedThisMonth: number | undefined;
    if (opts.visibilityResolvedCount) {
      const monthStart = utcMonthStartMs();
      const monthEnd = utcMonthEndMs();
      let closedPool: HaloTicket[] = scopedHalo.filter(
        (t) => !t.is_project && !isHaloTicketActive(t.status?.name ?? ""),
      );
      if (closedPool.length === 0) {
        const n = new Date();
        const from = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1)).toISOString().slice(0, 10);
        const extra = await safeGetHaloTickets(token, conn.halo_url, {
          clientId: numericClientId,
          count: 500,
          dateFrom: from,
          includeDetails: false,
        });
        closedPool = extra
          .filter((t) => haloTicketBelongsToPortalClient(t, numericClientId))
          .filter((t) => !t.is_project && !isHaloTicketActive(t.status?.name ?? ""));
      }
      resolvedThisMonth = closedPool.filter((t) => {
        const ts = haloTicketClosedAtMs(t);
        return ts >= monthStart && ts <= monthEnd;
      }).length;
    }

    let recentActivity: Array<{ date: string | null; author: string; summary: string }> | undefined;
    if (opts.visibilityRecentActivity && openHalo.length > 0) {
      const sorted = [...openHalo].sort((a, b) => haloTicketClosedAtMs(b) - haloTicketClosedAtMs(a));
      const ids = sorted.slice(0, 6).map((t) => t.id);
      recentActivity = await fetchPortalRecentTicketActivity({
        mspUserId: opts.mspUserId,
        psaSource: "halopsa",
        ticketIds: ids,
        maxTickets: 6,
        maxResults: 5,
      });
    }

    if (opts.visibilityStats) {
      const portalOpenRows = openHalo.map(mapHaloTicketToPortalRow);
      const pri = countPriorityBuckets(portalOpenRows);
      const stats: PortalPsaPayloadStats = {
        openTickets: portalOpenRows.length,
        activeProjects: activeProjects.length,
        avgProjectProgress: avgPercentComplete(activeProjects),
        rag: ragForInternal ?? "grey",
      };
      if (opts.visibilityPriorityBreakdown) {
        stats.highPriority = pri.high;
        stats.mediumPriority = pri.medium;
        stats.lowPriority = pri.low;
      }
      if (opts.visibilityResolvedCount && typeof resolvedThisMonth === "number") {
        stats.resolvedThisMonth = resolvedThisMonth;
      }
      out.stats = stats;
    }

    if (opts.visibilityRecentActivity && recentActivity && recentActivity.length > 0) {
      out.recentActivity = recentActivity;
    }

    return out;
  }

  if (opts.psaSource === "connectwise") {
    let cwConn: { siteUrl: string };
    let headers: HeadersInit;
    try {
      cwConn = await getCWConnectionForUser(opts.mspUserId);
      headers = await getCWAuthHeaders(opts.mspUserId);
    } catch {
      return out;
    }
    const { cwCompanyId: companyId } = parsePortalPsaClientId(opts.clientId);
    if (!companyId) return out;
    const openConditions = encodeURIComponent(`${CW_OPEN_ONLY} and company/id=${companyId}`);

    let cwRawOpen: unknown[] = [];
    if (needTicketsInternal) {
      const url = `${cwConn.siteUrl}/v4_6_release/apis/3.0/service/tickets?conditions=${openConditions}&pageSize=500`;
      const res = await fetch(url, { headers, cache: "no-store" });
      const raw = (await res.json().catch(() => [])) as unknown;
      cwRawOpen = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as { items?: unknown }).items)
          ? ((raw as { items: unknown[] }).items as unknown[])
          : [];
      cwRawOpen = cwRawOpen.filter((r) =>
        cwRowBelongsToPortalCompany(r as Record<string, unknown>, companyId),
      );
    }

    const shaped = cwRawOpen
      .map((r) => mapCwTicketRow(r as Record<string, unknown>))
      .filter((t) => t.id > 0);

    if (opts.visibilityTickets) {
      out.tickets = shaped.map((t) => ({
        id: t.id,
        summary: t.summary,
        status: t.status,
        priority: t.priority,
        engineer: t.engineer,
        lastUpdated: t.lastUpdated,
      }));
    }

    let ragForInternal: DeliveryHealthRag | null = null;
    if ((opts.visibilityRag || opts.visibilityStats) && shaped.length > 0) {
      const listTickets = cwRawRowsToHaloTickets(cwRawOpen);
      const healthRows = applyCwDeliveryHealthRagOverlay(
        haloTicketsToHealthRows(listTickets, historyIndex, cwConn.siteUrl).map((r) => ({
          ...r,
          source: "connectwise" as const,
        })),
      );
      ragForInternal = worstRagFromRows(healthRows) ?? "grey";
    } else if (opts.visibilityRag || opts.visibilityStats) {
      ragForInternal = "grey";
    }
    if (opts.visibilityRag) {
      out.rag = ragForInternal;
    }

    let activeProjects: PortalProjectRow[] = [];
    if (needProjectsInternal) {
      const pUrl = `${cwConn.siteUrl}/v4_6_release/apis/3.0/project/projects?conditions=${openConditions}&pageSize=500`;
      const pres = await fetch(pUrl, { headers, cache: "no-store" });
      const praw = (await pres.json().catch(() => [])) as unknown;
      const prows = (
        Array.isArray(praw)
          ? praw
          : Array.isArray((praw as { items?: unknown }).items)
            ? ((praw as { items: unknown[] }).items as unknown[])
            : []
      ).filter((p) => cwRowBelongsToPortalCompany(p as Record<string, unknown>, companyId));
      activeProjects = prows.map((p) => {
        const row = p as Record<string, unknown>;
        const status = (row.status as { name?: string } | null)?.name ?? "";
        const manager =
          String((row.manager as { name?: string } | null)?.name ?? "").trim() ||
          String((row.projectManager as { name?: string } | null)?.name ?? "").trim() ||
          "—";
        const pct = row.percentComplete;
        const pctNum = typeof pct === "number" && Number.isFinite(pct) ? Math.round(pct) : null;
        return {
          id: Number(row.id ?? 0),
          name: String(row.name ?? ""),
          status,
          percentComplete: pctNum,
          engineer: manager,
          targetDate:
            (typeof row.targetDate === "string" && row.targetDate) ||
            (typeof row.estimatedEndDate === "string" && row.estimatedEndDate) ||
            null,
        };
      });
      if (opts.visibilityProjects) {
        out.projects = activeProjects;
      }
    }

    let resolvedThisMonth: number | undefined;
    if (opts.visibilityResolvedCount) {
      const n = new Date();
      const y = n.getUTCFullYear();
      const m = n.getUTCMonth() + 1;
      const startBracket = `[${y}-${String(m).padStart(2, "0")}-01T00:00:00Z]`;
      const closedCond = encodeURIComponent(
        `company/id=${companyId} and closedFlag=true and dateResolved>=${startBracket}`,
      );
      const curl = `${cwConn.siteUrl}/v4_6_release/apis/3.0/service/tickets?conditions=${closedCond}&pageSize=500`;
      const cres = await fetch(curl, { headers, cache: "no-store" });
      const craw = (await cres.json().catch(() => [])) as unknown;
      const crows = (
        Array.isArray(craw)
          ? craw
          : Array.isArray((craw as { items?: unknown }).items)
            ? ((craw as { items: unknown[] }).items as unknown[])
            : []
      ).filter((r) => cwRowBelongsToPortalCompany(r as Record<string, unknown>, companyId));
      resolvedThisMonth = crows.length;
    }

    let recentActivity: Array<{ date: string | null; author: string; summary: string }> | undefined;
    if (opts.visibilityRecentActivity && shaped.length > 0) {
      const sorted = [...shaped].sort((a, b) => {
        const ta = a.lastUpdated ? Date.parse(a.lastUpdated) : 0;
        const tb = b.lastUpdated ? Date.parse(b.lastUpdated) : 0;
        return tb - ta;
      });
      const ids = sorted.slice(0, 6).map((t) => t.id);
      recentActivity = await fetchPortalRecentTicketActivity({
        mspUserId: opts.mspUserId,
        psaSource: "connectwise",
        ticketIds: ids,
        maxTickets: 6,
        maxResults: 5,
      });
    }

    if (opts.visibilityStats) {
      const pri = countPriorityBuckets(shaped);
      const stats: PortalPsaPayloadStats = {
        openTickets: shaped.length,
        activeProjects: activeProjects.length,
        avgProjectProgress: avgPercentComplete(activeProjects),
        rag: ragForInternal ?? "grey",
      };
      if (opts.visibilityPriorityBreakdown) {
        stats.highPriority = pri.high;
        stats.mediumPriority = pri.medium;
        stats.lowPriority = pri.low;
      }
      if (opts.visibilityResolvedCount && typeof resolvedThisMonth === "number") {
        stats.resolvedThisMonth = resolvedThisMonth;
      }
      out.stats = stats;
    }

    if (opts.visibilityRecentActivity && recentActivity && recentActivity.length > 0) {
      out.recentActivity = recentActivity;
    }

    return out;
  }

  return out;
}
