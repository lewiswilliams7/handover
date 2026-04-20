import { fitHandoverInputToMaxLength } from "@/lib/fit-handover-input";
import {
  formatProjectsForHandover,
  formatTicketsForHandover,
  getHaloProjects,
  getHaloTickets,
  getTicketDetails,
  type HaloProject,
  type HaloTicket,
} from "@/lib/halo";

/** Aligned with `/api/generate` cron `maxLength` so compaction matches manual post path. */
export const SCHEDULE_REPORT_INPUT_MAX_CHARS = 50000;

export function coalesceCronIntIds(raw: unknown): number[] {
  if (raw == null || raw === "") return [];

  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return [];
    if (t.startsWith("{") && t.endsWith("}")) {
      const inner = t.slice(1, -1).trim();
      if (!inner) return [];
      const parts = inner.split(",").map((s) => {
        const u = s.trim();
        if (
          (u.startsWith('"') && u.endsWith('"')) ||
          (u.startsWith("'") && u.endsWith("'"))
        ) {
          return u.slice(1, -1).trim();
        }
        return u;
      });
      return coalesceCronIntIds(parts);
    }
    try {
      const j = JSON.parse(t) as unknown;
      return coalesceCronIntIds(j);
    } catch {
      const n = Number(t);
      return Number.isFinite(n) ? [Math.trunc(n)] : [];
    }
  }

  if (!Array.isArray(raw)) return [];

  const out: number[] = [];
  for (const x of raw) {
    if (typeof x === "bigint") {
      const n = Number(x);
      if (Number.isFinite(n)) out.push(Math.trunc(n));
    } else if (typeof x === "number" && Number.isFinite(x)) {
      out.push(Math.trunc(x));
    } else if (typeof x === "string" && x.trim()) {
      const n = Number(x.trim());
      if (Number.isFinite(n)) out.push(Math.trunc(n));
    }
  }
  return [...new Set(out)];
}

export function haloProjectFromProjectTypeTicket(t: HaloTicket): HaloProject {
  return {
    id: Number(t.id),
    name: t.summary ?? `Ticket ${t.id}`,
    status: { name: t.status?.name ?? "Unknown" },
    clientId: t.clientId ?? null,
    client: t.client ?? null,
    description: t.details ?? null,
    projectmanager: (t.agent as HaloProject["projectmanager"]) ?? null,
    startdate: t.dateoccurred ?? null,
    targetdate: t.targetdate ?? null,
    completionpercent: undefined,
    tasks: null,
    notes: t.notes ?? [],
  };
}

export type ScheduledReportHaloFetchParams = {
  haloUrl: string;
  token: string;
  isScheduledReport?: boolean;
  includeTickets: boolean;
  includeProjects: boolean;
  clientIds: number[];
  selectedTicketIds: number[];
  selectedProjectIds: number[];
  ticketClientIds: number[];
  projectClientIds: number[];
  ticketAllClients: boolean;
  projectAllClients: boolean;
  dateFrom: string;
  dateTo: string;
};

/**
 * Loads tickets/projects for a scheduled report the same way as `/api/cron/generate-for-schedule`
 * (explicit IDs via ticket detail API; otherwise list + client filters).
 */
export async function fetchTicketsAndProjectsForScheduledReport(
  p: ScheduledReportHaloFetchParams,
): Promise<{ tickets: HaloTicket[]; projects: HaloProject[] }> {
  let tickets: HaloTicket[] = [];
  let projects: HaloProject[] = [];

  const hasExplicitTicketSelection = p.selectedTicketIds.length > 0;
  const hasExplicitProjectSelection = p.selectedProjectIds.length > 0;

  if (p.includeTickets) {
    if (hasExplicitTicketSelection) {
      const detailList = await Promise.all(
        p.selectedTicketIds.map((id) =>
          getTicketDetails(p.haloUrl, p.token, id).catch(() => null),
        ),
      );
      // Explicit ticket IDs are authoritative (same as projects): Halo may mark rows as project-type.
      tickets = detailList.filter((t): t is HaloTicket => t != null);
    } else {
      if (p.clientIds.length === 0) {
        tickets = await getHaloTickets(p.token, p.haloUrl, {
          dateFrom: p.dateFrom,
          dateTo: p.dateTo,
          count: 500,
          includeDetails: true,
        });
      } else if (p.clientIds.length === 1) {
        tickets = await getHaloTickets(p.token, p.haloUrl, {
          clientId: p.clientIds[0],
          dateFrom: p.dateFrom,
          dateTo: p.dateTo,
          count: 500,
          includeDetails: true,
        });
      } else {
        const all = await getHaloTickets(p.token, p.haloUrl, {
          dateFrom: p.dateFrom,
          dateTo: p.dateTo,
          count: 600,
          includeDetails: true,
        });
        const idSet = new Set(p.clientIds);
        tickets = all.filter((t) => t.clientId != null && idSet.has(Number(t.clientId)));
      }
      tickets = tickets.filter((t) => t.is_project !== true);
      if (!p.ticketAllClients && p.ticketClientIds.length > 0) {
        const clientSet = new Set(p.ticketClientIds);
        tickets = tickets.filter((t) => {
          const tAny = t as unknown as Record<string, unknown>;
          const cid = Number(tAny.client_id ?? tAny.clientId);
          return Number.isFinite(cid) && clientSet.has(cid);
        });
      }
    }
  }

  if (p.includeProjects) {
    if (hasExplicitProjectSelection) {
      const detailList = await Promise.all(
        p.selectedProjectIds.map((id) =>
          getTicketDetails(p.haloUrl, p.token, id).catch(() => null),
        ),
      );
      // Explicit project IDs are authoritative: Halo detail payloads may not set is_project === true.
      projects = detailList
        .filter((t): t is HaloTicket => t != null)
        .map((t) => haloProjectFromProjectTypeTicket(t));
    } else {
      const pFilters =
        p.clientIds.length > 0
          ? { clientIds: p.clientIds, dateFrom: p.dateFrom, dateTo: p.dateTo, count: 500 }
          : { dateFrom: p.dateFrom, dateTo: p.dateTo, count: 500 };
      projects = (await getHaloProjects(p.haloUrl, p.token, pFilters)) as HaloProject[];
      if (!p.projectAllClients && p.projectClientIds.length > 0) {
        const clientSet = new Set(p.projectClientIds);
        projects = projects.filter((proj) => {
          const pAny = proj as unknown as Record<string, unknown>;
          const cid = Number(pAny.client_id ?? pAny.clientId);
          return Number.isFinite(cid) && clientSet.has(cid);
        });
      }
    }
  }

  if (!p.includeTickets) tickets = [];
  if (!p.includeProjects) projects = [];

  // Scheduled reports include all user-selected items regardless of internal/external status
  const includeByInternalStatus = <T extends { isInternal?: boolean | null }>(
    items: T[],
  ): T[] =>
    p.isScheduledReport === true
      ? items
      : items.filter((item) => item.isInternal !== true);

  const filteredTickets = includeByInternalStatus(
    tickets as Array<HaloTicket & { isInternal?: boolean | null }>,
  ) as HaloTicket[];
  const filteredProjects = includeByInternalStatus(
    projects as Array<HaloProject & { isInternal?: boolean | null }>,
  ) as HaloProject[];

  return { tickets: filteredTickets, projects: filteredProjects };
}

export function buildScheduledReportFormattedInput(
  tickets: HaloTicket[],
  projects: HaloProject[],
  maxChars: number = SCHEDULE_REPORT_INPUT_MAX_CHARS,
): string {
  const ticketFields = {
    summary: true,
    description: true,
    actions: true,
    notes: true,
    assignee: true,
  } as const;
  const formattedInputParts: string[] = [];
  if (tickets.length > 0) {
    formattedInputParts.push(
      formatTicketsForHandover(
        tickets,
        tickets.map(() => ({ ...ticketFields })),
      ),
    );
  }
  if (projects.length > 0) {
    formattedInputParts.push(
      formatProjectsForHandover(
        projects,
        projects.map(() => ({
          name: true,
          description: true,
          tasks: true,
          notes: true,
        })),
      ),
    );
  }
  let combined = formattedInputParts.join("\n\n");
  if (combined.length > maxChars) {
    combined = fitHandoverInputToMaxLength(combined, maxChars);
  }
  return combined;
}
