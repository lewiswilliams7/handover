/**
 * Shared QBR section data validation — used for wizard step 3, generation, and exports.
 */

export type QbrSectionId =
  | "executiveSummary"
  | "ticketVolume"
  | "resolutionPerformance"
  | "ticketBreakdown"
  | "openVsClosed"
  | "projectStatus"
  | "slaPerformance"
  | "risksActions"
  | "nextSteps"
  | "recurringIssues"
  | "periodComparison"
  | "firstContactResolution";

export type QbrTicketLike = {
  id?: number;
  source?: "halopsa" | "connectwise";
  status?: { name?: string | null } | null;
  status_id?: number | null;
  priority?: { name?: string | null } | null;
  dateoccurred?: string | null;
  timetaken?: number | null;
  category?: string | null;
  ticket_type_name?: string | null;
  tickettype?: { name?: string | null } | null;
  category_1?: string | null;
  category_2?: string | null;
  cwType?: string | null;
  cwSubType?: string | null;
  notes?: Array<unknown> | null;
  actions?: Array<unknown> | null;
  agent?: { name?: string | null } | null;
  owner?: { name?: string | null } | null;
  targetdate?: string | null;
  slaTargetSet?: boolean;
};

export type QbrProjectLike = {
  id?: number;
  tasks?: Array<unknown> | null;
  completionpercent?: number | null;
};

export function haloStatusNameLooksResolved(raw: string | null | undefined): boolean {
  const v = String(raw ?? "").toLowerCase();
  if (!v.trim()) return false;
  if (v.includes("incomplete")) return false;
  return (
    v.includes("closed") ||
    v.includes("resolved") ||
    v.includes("complete") ||
    v.includes("done")
  );
}

function connectwiseStatusNameLooksResolved(raw: string | null | undefined): boolean {
  const v = String(raw ?? "").toLowerCase();
  if (!v.trim()) return false;
  if (v.includes("incomplete")) return false;
  return (
    v.includes("closed") ||
    v.includes("resolved") ||
    v.includes("completed") ||
    v.includes("done")
  );
}

export function ticketCountsAsResolved(
  t: QbrTicketLike,
  haloResolvedStatusIds: Set<number> | null,
): boolean {
  if (t.source === "halopsa") {
    const sid = typeof t.status_id === "number" && Number.isFinite(t.status_id) ? t.status_id : null;
    if (haloResolvedStatusIds && sid != null && haloResolvedStatusIds.has(sid)) return true;
    return haloStatusNameLooksResolved(t.status?.name ?? null);
  }
  if (t.source === "connectwise") {
    return connectwiseStatusNameLooksResolved(t.status?.name ?? null);
  }
  return (
    haloStatusNameLooksResolved(t.status?.name ?? null) ||
    connectwiseStatusNameLooksResolved(t.status?.name ?? null)
  );
}

function breakdownBucketName(t: QbrTicketLike & Record<string, unknown>): string {
  if (t.source === "connectwise") {
    const type = String(t.cwType ?? "").trim();
    const sub = String(t.cwSubType ?? "").trim();
    const cat = typeof t.category === "string" ? t.category.trim() : "";
    if (type && sub) return `${type} — ${sub}`;
    if (cat) return cat;
    if (type) return type;
    if (sub) return sub;
  }
  const typeName =
    String(t.ticket_type_name ?? "").trim() ||
    (t.tickettype && typeof t.tickettype === "object"
      ? String((t.tickettype as { name?: string }).name ?? "").trim()
      : "");
  const c1 = String(t.category_1 ?? "").trim();
  const c2 = String(t.category_2 ?? "").trim();
  if (c1 && c2) return `${c1} — ${c2}`;
  if (c1) return c1;
  if (c2) return c2;
  if (typeName) return typeName;
  const cat = typeof t.category === "string" ? t.category.trim() : "";
  if (cat) return cat;
  return "";
}

function isValidTargetDate(raw: string | null | undefined): boolean {
  const v = String(raw ?? "").trim();
  if (!v) return false;
  if (v.startsWith("1900") || v.startsWith("1899")) return false;
  return true;
}

export function ticketHasSlaTarget(t: QbrTicketLike & Record<string, unknown>): boolean {
  if (t.slaTargetSet === true) return true;
  const td =
    (t.targetdate as string | undefined) ??
    (t.target_date as string | undefined) ??
    (t.requiredDate as string | undefined) ??
    (t.required_date as string | undefined);
  return isValidTargetDate(td);
}

function hasAssignmentHistory(t: QbrTicketLike): boolean {
  if (t.source === "connectwise") {
    return !!(t.agent?.name?.trim() || t.owner?.name?.trim());
  }
  const n = Array.isArray(t.notes) ? t.notes.length : 0;
  const a = Array.isArray(t.actions) ? t.actions.length : 0;
  return n + a > 0;
}

export type TicketBreakdownPack = {
  ok: boolean;
  rows: Array<{ name: string; value: number }>;
  mode: "type_category" | "status";
  note: string | null;
};

/**
 * Category: ≥3 distinct buckets with ≥2 tickets each. Else status: ≥3 distinct statuses.
 */
export function computeTicketBreakdownPack(tickets: QbrTicketLike[]): TicketBreakdownPack {
  const map = new Map<string, number>();
  for (const t of tickets) {
    const key = breakdownBucketName(t as QbrTicketLike & Record<string, unknown>) || "Unknown";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const entries = [...map.entries()].filter(([name]) => name !== "Unknown" && name.trim().length > 0);
  const withMin2 = entries.filter(([, c]) => c >= 2);
  if (withMin2.length >= 3) {
    const rows = entries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, value]) => ({ name, value }));
    return { ok: true, rows, mode: "type_category", note: null };
  }

  const statusMap = new Map<string, number>();
  for (const t of tickets) {
    const s = String(t.status?.name ?? "Unknown").trim() || "Unknown";
    statusMap.set(s, (statusMap.get(s) ?? 0) + 1);
  }
  const statusDistinct = [...statusMap.keys()].filter((k) => k !== "Unknown").length;
  if (statusDistinct >= 3) {
    const rows = [...statusMap.entries()]
      .filter(([name]) => name !== "Unknown")
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, value]) => ({ name, value }));
    return {
      ok: true,
      rows,
      mode: "status",
      note: "Showing breakdown by status — category data did not meet the minimum diversity threshold.",
    };
  }

  return {
    ok: false,
    rows: [],
    mode: "status",
    note: null,
  };
}

export type QbrSectionFlag = { ok: boolean; tooltip: string };

export type QbrValidationSnapshot = {
  flags: Record<QbrSectionId, QbrSectionFlag>;
  stats: {
    ticketCount: number;
    projectCount: number;
    prevTicketCount: number;
    weeksWithTickets: number;
    slaTargetTicketCount: number;
    projectsWithTaskData: number;
  };
  breakdownPack: TicketBreakdownPack;
  hasAiScope: boolean;
};

export function buildQbrValidationSnapshot(
  tickets: QbrTicketLike[],
  prevTickets: QbrTicketLike[],
  projects: QbrProjectLike[],
  weeklyCounts: Array<{ week: string; count: number }>,
  haloResolvedStatusIds: Set<number> | null,
): QbrValidationSnapshot {
  const ticketCount = tickets.length;
  const projectCount = projects.length;
  const prevTicketCount = prevTickets.length;
  const weeksWithTickets = weeklyCounts.filter((w) => w.count > 0).length;
  const totalInWeeks = weeklyCounts.reduce((s, w) => s + w.count, 0);

  const slaTargetTicketCount = tickets.filter((t) =>
    ticketHasSlaTarget(t as QbrTicketLike & Record<string, unknown>),
  ).length;

  const projectsWithTaskData = projects.filter(
    (p) => Array.isArray(p.tasks) && p.tasks.length > 0,
  ).length;

  const resolvedList = tickets.filter((t) => ticketCountsAsResolved(t, haloResolvedStatusIds));
  const resolvedCount = resolvedList.length;

  const resolvedWithTimeData = resolvedList.filter((t) => {
    const h = Number(t.timetaken ?? 0);
    return Number.isFinite(h) && h > 0;
  }).length;

  const recurringMax = (() => {
    const m = new Map<string, number>();
    for (const t of tickets) {
      const key = breakdownBucketName(t as QbrTicketLike & Record<string, unknown>) || "Unknown";
      if (key === "Unknown") continue;
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return [...m.values()].reduce((a, b) => Math.max(a, b), 0);
  })();

  const breakdownPack = computeTicketBreakdownPack(tickets);

  const fcrResolvedWithHistory = resolvedList.filter((t) => hasAssignmentHistory(t)).length;

  const ticketVolumeOk = weeksWithTickets >= 2 && totalInWeeks >= 5;
  const resolutionOk = resolvedWithTimeData >= 3;
  const openVsOk = ticketCount >= 10;
  const projectOk = projectsWithTaskData >= 1;
  const slaOk = slaTargetTicketCount >= 5;
  const recurringOk = recurringMax >= 3;
  const periodOk = prevTicketCount >= 5;
  const fcrOk = resolvedCount >= 10 && fcrResolvedWithHistory >= 10;

  const hasAiScope = ticketCount >= 1 || projectCount >= 1;

  const flags: Record<QbrSectionId, QbrSectionFlag> = {
    /** Validated after AI generation from model output — not gated on raw PSA thresholds here. */
    executiveSummary: {
      ok: true,
      tooltip: "",
    },
    ticketVolume: {
      ok: ticketVolumeOk,
      tooltip: ticketVolumeOk
        ? ""
        : `Requires at least 2 weeks with ticket activity and 5 tickets total. Found ${weeksWithTickets} week(s) and ${ticketCount} ticket(s).`,
    },
    resolutionPerformance: {
      ok: resolutionOk,
      tooltip: resolutionOk
        ? ""
        : `Requires at least 3 resolved tickets with time logged. Found ${resolvedWithTimeData}.`,
    },
    ticketBreakdown: {
      ok: breakdownPack.ok,
      tooltip: breakdownPack.ok
        ? ""
        : "Requires at least 3 category buckets with 2+ tickets each, or 3+ distinct statuses. Not enough variety in this period.",
    },
    openVsClosed: {
      ok: openVsOk,
      tooltip: openVsOk ? "" : `Requires at least 10 tickets. Found ${ticketCount}.`,
    },
    projectStatus: {
      ok: projectOk,
      tooltip: projectOk
        ? ""
        : "Requires at least one project with task data. No qualifying projects found.",
    },
    slaPerformance: {
      ok: slaOk,
      tooltip: slaOk
        ? ""
        : `Requires SLA targets on at least 5 tickets (e.g. due/target dates). Found ${slaTargetTicketCount}.`,
    },
    /** Risks/actions are AI outputs — inclusion is decided after generation from returned content. */
    risksActions: {
      ok: true,
      tooltip: "",
    },
    nextSteps: {
      ok: true,
      tooltip: "",
    },
    recurringIssues: {
      ok: recurringOk,
      tooltip: recurringOk
        ? ""
        : `Requires at least one category with 3+ tickets. Highest repeat count is ${recurringMax}.`,
    },
    periodComparison: {
      ok: periodOk,
      tooltip: periodOk
        ? ""
        : `Requires at least 5 tickets in the previous period. Found ${prevTicketCount}.`,
    },
    firstContactResolution: {
      ok: fcrOk,
      tooltip: fcrOk
        ? ""
        : `Requires 10+ resolved tickets with assignment or ticket history. Resolved: ${resolvedCount}, with history: ${fcrResolvedWithHistory}.`,
    },
  };

  return {
    flags,
    stats: {
      ticketCount,
      projectCount,
      prevTicketCount,
      weeksWithTickets,
      slaTargetTicketCount,
      projectsWithTaskData,
    },
    breakdownPack,
    hasAiScope,
  };
}

export type QbrSectionsLike = Record<QbrSectionId, boolean>;

/** Section display labels for notices (must match wizard). */
/** Sections whose inclusion depends on PSA metrics / charts — validated before generation. */
export const QBR_DATA_DRIVEN_SECTION_IDS: readonly QbrSectionId[] = [
  "ticketVolume",
  "resolutionPerformance",
  "ticketBreakdown",
  "openVsClosed",
  "projectStatus",
  "slaPerformance",
  "recurringIssues",
  "periodComparison",
  "firstContactResolution",
] as const;

export const QBR_SECTION_LABELS: Record<QbrSectionId, string> = {
  executiveSummary: "Executive Summary",
  ticketVolume: "Ticket Volume",
  resolutionPerformance: "Resolution Performance",
  ticketBreakdown: "Ticket Breakdown",
  openVsClosed: "Open vs Closed",
  projectStatus: "Project Status",
  slaPerformance: "SLA Performance",
  risksActions: "Risks and Actions",
  nextSteps: "Next Steps and Recommendations",
  recurringIssues: "Recurring Issues",
  periodComparison: "Period Comparison",
  firstContactResolution: "First Contact Resolution",
};

/**
 * Applies only **data-driven** section gates (charts, metrics). AI sections (executive summary,
 * risks/actions, next steps) are left as the user toggled — they are validated after generation.
 */
export function applySectionValidationToToggles<T extends QbrSectionsLike>(
  userToggles: T,
  snapshot: QbrValidationSnapshot,
): { effective: T; autoExcludedLabels: string[] } {
  const autoExcludedLabels: string[] = [];
  const effective = { ...userToggles } as T;
  for (const key of QBR_DATA_DRIVEN_SECTION_IDS) {
    const wanted = Boolean(userToggles[key]);
    if (!wanted) continue;
    if (!snapshot.flags[key].ok) {
      (effective as Record<string, boolean>)[key] = false;
      autoExcludedLabels.push(QBR_SECTION_LABELS[key]);
    }
  }
  return { effective, autoExcludedLabels };
}

export function countSectionsAvailable(snapshot: QbrValidationSnapshot): number {
  let n = QBR_DATA_DRIVEN_SECTION_IDS.filter((k) => snapshot.flags[k].ok).length;
  n += 3; // executive summary, risks/actions, next steps — always selectable; gated after AI
  return n;
}
