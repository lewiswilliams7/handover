import { formatLoggedHours } from "@/lib/format-logged-hours";
import { TICKET_SECTION_RULE } from "@/lib/psa/format";
import { getTicketDetails, mapHaloNoteToNormalised, type HaloTicket } from "@/lib/halo";
import { stripHtmlToPlainText } from "@/lib/utils";

export type DeliveryHealthRag = "red" | "amber" | "green" | "grey";

/** SLA badge / banner: breached target vs due within 7 calendar days. */
export type DeliveryHealthSlaRisk = "overdue" | "at_risk";

export type DeliveryHealthNote = {
  at: string;
  author: string;
  body: string;
};

export type DeliveryHealthActionItem = {
  task: string;
  owner: string;
  dueDate: string | null;
};

export type DeliveryHealthRiskItem = {
  risk: string;
  impact: string;
};

export type DeliveryHealthRow = {
  id: number;
  kind: "project" | "ticket";
  source: "halopsa" | "connectwise";
  name: string;
  clientName: string;
  owner: string | null;
  statusName: string;
  priorityName: string | null;
  rag: DeliveryHealthRag;
  openActions: number;
  openRisks: number;
  /** Negative = overdue by that many days */
  daysToTarget: number | null;
  lastGeneratedAt: string | null;
  ticketAgeDays: number | null;
  lastNoteAt: string | null;
  lastNotePreview: string | null;
  targetDateIso: string | null;
  /** Budget / target hours when Halo exposes them (optional). */
  targetHours: number | null;
  timeLogged: number;
  description: string | null;
  notes: DeliveryHealthNote[];
  latestOpenActions: DeliveryHealthActionItem[];
  latestOpenRisks: DeliveryHealthRiskItem[];
  haloTicketUrl: string;
  /** SLA badge: overdue (past target) or at risk (target within 7 days, not past). */
  slaRisk: DeliveryHealthSlaRisk | null;
  createdAtIso?: string | null;
  firstResponseHours?: number | null;
  projectTaskTotal?: number | null;
  projectTaskCompleted?: number | null;
};

export type DeliveryHealthRiskDetail = {
  clientName: string;
  riskText: string;
  generatedAt: string;
  reportLink: string | null;
  source: "ai" | "proxy_overdue_ticket";
};

export type DeliveryHealthDriverDetail = {
  clientName: string;
  itemName: string;
  ageDays: number | null;
  link: string | null;
  priorityName?: string | null;
  ownerName?: string | null;
  responseTimeHours?: number | null;
};

export type DeliveryHealthStatStrip = {
  activeCount: number;
  totalOpenActions: number;
  totalOpenRisks: number;
  overdueTargets: number;
  avgHoursPerDayToTarget: number | null;
};

export type DeliveryHealthStats = {
  projects: DeliveryHealthStatStrip;
  tickets: DeliveryHealthStatStrip;
};

export type DeliveryHealthApiResponse = {
  access: "basic" | "full";
  refreshedAt: string;
  haloConnected: boolean;
  cwConnected?: boolean;
  connectHint?: string;
  haloWebBaseUrl?: string;
  /** HaloPSA returned 429; rows may be partial (e.g. ConnectWise only) or from cache. */
  rateLimited?: boolean;
  stats: DeliveryHealthStats;
  rows: DeliveryHealthRow[];
  error?: string;
  statDetails?: {
    openRisks: DeliveryHealthRiskDetail[];
    overdueTickets: DeliveryHealthDriverDetail[];
    slaAtRisk: DeliveryHealthDriverDetail[];
  };
};

const CLOSED = new Set(
  [
    "resolved",
    "closed",
    "completed",
    "cancelled",
    "canceled",
    "duplicate",
    "merged",
  ].map((s) => s.toLowerCase()),
);

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function ticketKey(title: string, client: string): string {
  return `${norm(title)}|${norm(client)}`;
}

export function isHaloTicketActive(statusName: string): boolean {
  return !CLOSED.has(statusName.trim().toLowerCase());
}

function actionIsOpen(status: string | null | undefined): boolean {
  if (!status || !status.trim()) return true;
  const s = status.trim().toLowerCase();
  if (CLOSED.has(s)) return false;
  if (s === "complete" || s === "done") return false;
  return true;
}

function parseIsoDay(iso: string): Date {
  const d = new Date(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function startOfTodayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

function actionIsOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate || !dueDate.trim()) return false;
  const d = parseIsoDay(dueDate.slice(0, 10));
  return d.getTime() < startOfTodayUtc().getTime();
}

function rowFromUnknownAction(row: unknown): {
  status: string | null;
  due_date: string | null;
  client_name: string | null;
  project_name: string | null;
  task: string | null;
  suggested_owner: string | null;
} {
  if (!row || typeof row !== "object") {
    return {
      status: null,
      due_date: null,
      client_name: null,
      project_name: null,
      task: null,
      suggested_owner: null,
    };
  }
  const o = row as Record<string, unknown>;
  const taskRaw =
    o.task ?? o.action ?? o.title ?? o.name ?? o.Task ?? o.summary ?? o.description;
  const ownerRaw =
    o.suggested_owner ?? o.owner ?? o.Owner ?? o.assignee ?? o.assigned_to ?? o.technician;
  let suggested_owner: string | null = null;
  if (ownerRaw === null || ownerRaw === undefined) suggested_owner = null;
  else if (typeof ownerRaw === "string") suggested_owner = ownerRaw;
  else suggested_owner = String(ownerRaw);
  return {
    status: typeof o.status === "string" ? o.status : null,
    due_date: typeof o.due_date === "string" ? o.due_date : null,
    client_name: typeof o.client_name === "string" ? o.client_name : null,
    project_name: typeof o.project_name === "string" ? o.project_name : null,
    task: typeof taskRaw === "string" ? taskRaw : taskRaw != null ? String(taskRaw) : null,
    suggested_owner,
  };
}

function rowFromUnknownRisk(row: unknown): {
  status: string | undefined;
  client_name: string | undefined;
  project_name: string | undefined;
  risk: string | null;
  impact: string | null;
} {
  if (!row || typeof row !== "object") {
    return {
      status: undefined,
      client_name: undefined,
      project_name: undefined,
      risk: null,
      impact: null,
    };
  }
  const o = row as Record<string, unknown>;
  const riskRaw = o.risk ?? o.title ?? o.name ?? o.description;
  const impactRaw = o.impact ?? o.severity;
  return {
    status: typeof o.status === "string" ? o.status : undefined,
    client_name: typeof o.client_name === "string" ? o.client_name : undefined,
    project_name: typeof o.project_name === "string" ? o.project_name : undefined,
    risk: typeof riskRaw === "string" ? riskRaw : riskRaw != null ? String(riskRaw) : null,
    impact: typeof impactRaw === "string" ? impactRaw : impactRaw != null ? String(impactRaw) : null,
  };
}

function coerceActions(raw: unknown): ReturnType<typeof rowFromUnknownAction>[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(rowFromUnknownAction);
}

function coerceRisks(raw: unknown): ReturnType<typeof rowFromUnknownRisk>[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(rowFromUnknownRisk);
}

/** Extract Title + Client pairs from Halo-formatted Handover input (generation history). */
export function extractTicketRefsFromInput(input: string): { title: string; client: string }[] {
  if (!input.includes(TICKET_SECTION_RULE)) return [];
  const chunks = input.split(TICKET_SECTION_RULE);
  const out: { title: string; client: string }[] = [];
  for (const chunk of chunks) {
    let title = "";
    let client = "";
    for (const line of chunk.split(/\r?\n/)) {
      const t = line.match(/^\s*Title:\s*(.+)\s*$/i);
      if (t) title = t[1].trim();
      const c = line.match(/^\s*Client:\s*(.+)\s*$/i);
      if (c) client = c[1].trim();
    }
    if (title) out.push({ title, client: client || "Unknown" });
  }
  return out;
}

export type GenerationHistoryRow = {
  created_at: string;
  output_json: unknown;
  input_text: string | null;
};

export type DeliveryHistoryBucket = {
  lastGeneratedAt: string;
  openActions: number;
  overdueActions: number;
  openRisks: number;
  latestOpenActions: DeliveryHealthActionItem[];
  latestOpenRisks: DeliveryHealthRiskItem[];
};

/**
 * For each ticket key (title|client), keep the newest generation's action/risk counts
 * and open item lists that appear to reference that ticket.
 */
export function buildHistoryIndex(generations: GenerationHistoryRow[]): Map<string, DeliveryHistoryBucket> {
  const map = new Map<string, DeliveryHistoryBucket>();

  const sorted = [...generations].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  for (const gen of sorted) {
    const created = gen.created_at;
    const oj = gen.output_json;
    if (!oj || typeof oj !== "object") continue;
    const root = oj as Record<string, unknown>;
    const actions = coerceActions(root.actions);
    const risks = coerceRisks(root.risks);

    const refs = extractTicketRefsFromInput(gen.input_text ?? "");
    const refList =
      refs.length > 0
        ? refs
        : (() => {
            const pn = typeof root.project_name === "string" ? root.project_name.trim() : "";
            return pn ? [{ title: pn, client: "Unknown" }] : [];
          })();

    for (const ref of refList) {
      const key = ticketKey(ref.title, ref.client || "Unknown");
      if (map.has(key)) continue;

      const tNorm = norm(ref.title);
      const cNorm = norm(ref.client || "");

      const actionsForKey = actions.filter((a) => {
        const pn = (a.project_name ?? "").trim().toLowerCase();
        const cn = (a.client_name ?? "").trim().toLowerCase();
        if (tNorm && pn && (pn.includes(tNorm) || tNorm.includes(pn))) return true;
        if (cNorm && cn && (cn === cNorm || cn.includes(cNorm) || cNorm.includes(cn)))
          return true;
        if (tNorm && !pn && !cn && gen.input_text?.toLowerCase().includes(tNorm)) return true;
        return false;
      });

      const risksForKey = risks.filter((r) => {
        const pn = (r.project_name ?? "").trim().toLowerCase();
        const cn = (r.client_name ?? "").trim().toLowerCase();
        if (tNorm && pn && (pn.includes(tNorm) || tNorm.includes(pn))) return true;
        if (cNorm && cn && (cn === cNorm || cn.includes(cNorm) || cNorm.includes(cn)))
          return true;
        return false;
      });

      let openActions = 0;
      let overdueActions = 0;
      const latestOpenActions: DeliveryHealthActionItem[] = [];
      for (const a of actionsForKey) {
        if (!actionIsOpen(a.status)) continue;
        openActions += 1;
        if (actionIsOverdue(a.due_date)) overdueActions += 1;
        latestOpenActions.push({
          task: (a.task ?? "Action").trim() || "Action",
          owner: (a.suggested_owner ?? " - ").trim() || " - ",
          dueDate: a.due_date,
        });
      }

      let openRisks = 0;
      const latestOpenRisks: DeliveryHealthRiskItem[] = [];
      for (const r of risksForKey) {
        if (r.status && CLOSED.has(r.status.trim().toLowerCase())) continue;
        openRisks += 1;
        latestOpenRisks.push({
          risk: (r.risk ?? "Risk").trim() || "Risk",
          impact: (r.impact ?? " - ").trim() || " - ",
        });
      }

      map.set(key, {
        lastGeneratedAt: created,
        openActions,
        overdueActions,
        openRisks,
        latestOpenActions,
        latestOpenRisks,
      });
    }
  }

  return map;
}

export function lookupHistoryForTicket(
  index: Map<string, DeliveryHistoryBucket>,
  title: string,
  clientName: string,
): DeliveryHistoryBucket | undefined {
  const direct = index.get(ticketKey(title, clientName));
  if (direct) return direct;
  const t = norm(title);
  const c = norm(clientName);
  for (const [k, v] of index) {
    const [kt, kc] = k.split("|");
    if (norm(kt) === t && (!c || norm(kc) === c || kc.includes(c) || c.includes(kc))) {
      return v;
    }
  }
  return undefined;
}

export function computeRag(input: {
  insufficientData: boolean;
  targetPassed: boolean;
  targetWithin7Days: boolean;
  openRisks: number;
  overdueActions: number;
  /** Days since last real Halo note; null = no note on record */
  daysSinceLastRealNote: number | null;
  /** Used when there is no note: treat "no note in N days" as ticket age */
  ticketAgeDays: number | null;
}): DeliveryHealthRag {
  if (input.insufficientData) return "grey";

  const {
    targetPassed,
    targetWithin7Days,
    openRisks,
    overdueActions,
    daysSinceLastRealNote,
    ticketAgeDays,
  } = input;

  const stalenessForNoteRules =
    daysSinceLastRealNote != null ? daysSinceLastRealNote : ticketAgeDays;

  const stale30 = stalenessForNoteRules != null && stalenessForNoteRules >= 30;
  const stale14 = stalenessForNoteRules != null && stalenessForNoteRules >= 14;

  if (targetPassed || openRisks >= 2 || overdueActions >= 3 || stale30) return "red";
  if (targetWithin7Days || openRisks === 1 || (overdueActions >= 1 && overdueActions <= 2) || stale14)
    return "amber";

  const noteWithin14 =
    daysSinceLastRealNote != null && daysSinceLastRealNote <= 14;
  if (openRisks === 0 && overdueActions === 0 && noteWithin14) return "green";

  return "grey";
}

/** Raises RAG when SLA requires it; does not otherwise change computeRag rules. */
function applySlaRiskToRag(
  rag: DeliveryHealthRag,
  slaRisk: DeliveryHealthSlaRisk | null,
): DeliveryHealthRag {
  if (slaRisk === "overdue") return "red";
  if (slaRisk === "at_risk") {
    if (rag === "red") return "red";
    return "amber";
  }
  return rag;
}

/**
 * ConnectWise list payloads rarely satisfy Halo's `hasSignalForGrey` (notes/history/actions),
 * so `computeRag` sees `insufficientData` and returns grey for most young tickets. Re-run RAG
 * when we still have age, a target, logged time, or a last note so CW rows stay meaningful.
 */
/** ConnectWise list rows: age and last activity from `_info` when notes are absent. */
export function patchConnectWiseHealthRowsFromTickets(
  rows: DeliveryHealthRow[],
  tickets: HaloTicket[],
): DeliveryHealthRow[] {
  const ticketById = new Map(
    tickets.filter((t) => !t.is_project).map((t) => [t.id, t] as const),
  );
  return rows.map((row) => {
    if (row.source !== "connectwise" || row.kind !== "ticket") return row;
    const ticket = ticketById.get(row.id);
    if (!ticket) return row;

    const createdIso = ticket.dateoccurred ?? null;
    const ticketAgeDays =
      row.ticketAgeDays ??
      (createdIso ? daysSinceIsoDate(createdIso) : null);

    const tRaw = ticket as unknown as Record<string, unknown>;
    const lastUpdated =
      (typeof tRaw.last_update === "string" && tRaw.last_update.trim()) ||
      null;
    const lastNoteAt = row.lastNoteAt ?? lastUpdated ?? null;

    if (ticketAgeDays === row.ticketAgeDays && lastNoteAt === row.lastNoteAt) {
      return row;
    }
    return { ...row, ticketAgeDays, lastNoteAt };
  });
}

export function applyCwDeliveryHealthRagOverlay(rows: DeliveryHealthRow[]): DeliveryHealthRow[] {
  return rows.map((r, idx) => {
    if (idx < 2) {
      console.log("[overlay] row input:", {
        rag: r.rag,
        ticketAgeDays: r.ticketAgeDays,
        lastNoteAt: r.lastNoteAt,
      });
    }
    if (r.rag !== "grey") return r;
    const hasAge = r.ticketAgeDays != null && r.ticketAgeDays >= 0;
    const hasSlaAnchor = r.targetDateIso != null;
    const hasTime = (r.timeLogged ?? 0) > 0;
    const hasNoteSignal = Boolean(r.lastNoteAt);
    if (!hasAge && !hasSlaAnchor && !hasTime && !hasNoteSignal) return r;

    const daysSinceLastRealNote = r.lastNoteAt ? daysSinceIsoDate(r.lastNoteAt) : null;
    const targetPassed = r.daysToTarget != null && r.daysToTarget < 0;
    const targetWithin7Days = r.daysToTarget != null && r.daysToTarget >= 0 && r.daysToTarget <= 7;

    const baseRag = computeRag({
      insufficientData: false,
      targetPassed,
      targetWithin7Days,
      openRisks: r.openRisks,
      overdueActions: 0,
      daysSinceLastRealNote,
      ticketAgeDays: r.ticketAgeDays,
    });
    const rag = applySlaRiskToRag(baseRag, r.slaRisk);
    return { ...r, rag };
  });
}

export function daysToTargetDate(targetIso: string | null | undefined): number | null {
  if (!targetIso) return null;
  const raw = targetIso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const t = new Date(targetIso).getTime();
    if (Number.isNaN(t)) return null;
    const tgt = parseIsoDay(new Date(t).toISOString().slice(0, 10));
    const today = startOfTodayUtc();
    return Math.round((tgt.getTime() - today.getTime()) / 86400000);
  }
  const tgt = parseIsoDay(raw);
  const today = startOfTodayUtc();
  return Math.round((tgt.getTime() - today.getTime()) / 86400000);
}

/**
 * SLA badge level from target date (calendar days, UTC midnight boundary):
 * past target → overdue; today through +7 days → at risk; otherwise no badge.
 */
export function computeSlaRiskFromTargetIso(
  targetIso: string | null | undefined,
): DeliveryHealthSlaRisk | null {
  const days = daysToTargetDate(targetIso);
  if (days == null) return null;
  if (days < 0) return "overdue";
  if (days <= 7) return "at_risk";
  return null;
}

function haloFallbackOpenActions(t: HaloTicket): number {
  const n = t.actions?.length ?? 0;
  const notes = t.notes?.length ?? 0;
  return n > 0 ? n : notes > 0 ? Math.min(notes, 5) : 0;
}

function daysSinceIsoDate(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const raw = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return null;
    const d = parseIsoDay(new Date(t).toISOString().slice(0, 10));
    const today = startOfTodayUtc();
    return Math.max(0, Math.round((today.getTime() - d.getTime()) / 86400000));
  }
  const d = parseIsoDay(raw);
  const today = startOfTodayUtc();
  return Math.max(0, Math.round((today.getTime() - d.getTime()) / 86400000));
}

const NOTE_PREVIEW_NOISE_RE =
  /\b(CAUTION:|This message was sent from outside|sent from outside the company|privileged|confidentiality notice|intended recipient|virus[- ]free|Disclaimer:|This email and any files transmitted|Safe sender|external sender|Authenticity)\b/i;

function sanitizeLastNotePlainForDashboard(plain: string): string {
  const lines = plain
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !NOTE_PREVIEW_NOISE_RE.test(l));
  return lines.join(" ").replace(/\s+/g, " ").trim();
}

/** Last note time + preview: skip email/disclaimer noise; 60-char cap; fall back to prior note. */
function latestNoteMeta(
  notes: DeliveryHealthNote[],
): { at: string | null; preview: string | null } {
  if (notes.length === 0) return { at: null, preview: null };
  const sorted = [...notes].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
  for (const n of sorted) {
    const plain = stripHtmlToPlainText(n.body);
    const cleaned = sanitizeLastNotePlainForDashboard(plain);
    if (cleaned.length > 0) {
      const preview = cleaned.length > 60 ? `${cleaned.slice(0, 60)}…` : cleaned;
      const ms = new Date(n.at).getTime();
      const latestAt = Number.isNaN(ms) ? null : new Date(ms).toISOString();
      return { at: latestAt, preview };
    }
  }
  return { at: null, preview: null };
}

function firstResponseHoursFromNotes(
  createdIso: string | null | undefined,
  notes: DeliveryHealthNote[],
): number | null {
  if (!createdIso) return null;
  const created = new Date(createdIso).getTime();
  if (Number.isNaN(created)) return null;
  const first = notes
    .map((n) => new Date(n.at).getTime())
    .filter((n) => Number.isFinite(n) && n >= created)
    .sort((a, b) => a - b)[0];
  if (first == null) return null;
  const hours = (first - created) / 3600000;
  if (!Number.isFinite(hours) || hours < 0) return null;
  const rounded = Math.round(hours * 10) / 10;
  const minHours = 1 / 60;
  return rounded > 0 && rounded < minHours ? minHours : rounded;
}

function fallbackResponseHours(
  createdIso: string | null | undefined,
  fallbackIso: string | null | undefined,
): number | null {
  if (!createdIso || !fallbackIso) return null;
  const created = new Date(createdIso).getTime();
  const fallback = new Date(fallbackIso).getTime();
  if (!Number.isFinite(created) || !Number.isFinite(fallback)) return null;
  if (fallback < created) return null;
  const raw = (fallback - created) / 3600000;
  if (!Number.isFinite(raw) || raw <= 0) return null;
  const rounded = Math.round(raw * 10) / 10;
  const minHours = 1 / 60;
  return rounded > 0 && rounded < minHours ? minHours : rounded;
}

function extractTargetHours(t: HaloTicket): number | null {
  const raw = t as unknown as Record<string, unknown>;
  const candidates = [
    raw.estimatedhours,
    raw.estimated_hours,
    raw.budgethours,
    raw.budget_hours,
    raw.targethours,
    raw.target_hours,
  ];
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c) && c > 0) return c;
    if (typeof c === "string") {
      const n = Number.parseFloat(c);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return null;
}

export function haloNotesChronological(t: HaloTicket): DeliveryHealthNote[] {
  const mapped = (t.notes ?? []).map((n) => {
    const normNote = mapHaloNoteToNormalised(n);
    return {
      at: normNote.date ?? "",
      author: normNote.author,
      body: normNote.content,
    };
  });
  return mapped.sort((a, b) => {
    const ta = new Date(a.at).getTime();
    const tb = new Date(b.at).getTime();
    const aOk = !Number.isNaN(ta);
    const bOk = !Number.isNaN(tb);
    if (aOk && bOk && ta !== tb) return ta - tb;
    return 0;
  });
}

/**
 * Owner column: person only - agent → technician → assigned-to → agent id lookups.
 * Never use team name or client contact as the owner.
 */
export function resolveDashboardOwnerFromHaloTicket(t: HaloTicket): string | null {
  const s = resolveDashboardOwnerFromHaloTicketWithAgents(t);
  return s === "Unassigned" ? null : s;
}

function ownerName(v: string | null | undefined): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** String or nested `{ name }` from Halo list/detail payloads. */
function flexPersonName(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "object" && v !== null) {
    const o = v as Record<string, unknown>;
    const n = o.name ?? o.Name;
    if (typeof n === "string" && n.trim()) return n.trim();
  }
  return null;
}

export function resolveDashboardOwnerFromHaloTicketWithAgents(
  t: HaloTicket,
  agentsById?: Map<number, string>,
): string {
  const raw = t as unknown as Record<string, unknown>;
  const technician = flexPersonName(raw.technician);
  const assignedto = flexPersonName(raw.assignedto ?? raw.assigned_to);
  const whoRaw = raw.who_agentid ?? raw.who_agent_id;
  const whoAgentId =
    typeof whoRaw === "number" && Number.isFinite(whoRaw)
      ? whoRaw
      : typeof whoRaw === "string"
        ? Number.parseInt(whoRaw, 10)
        : NaN;

  const agent = ownerName(t.agent?.name);
  const manager = ownerName(t.manager?.name);

  if (t.is_project) {
    if (manager) return manager;
    if (agent) return agent;
    if (technician) return technician;
    if (assignedto) return assignedto;
    if (Number.isFinite(whoAgentId) && whoAgentId > 0 && agentsById?.has(whoAgentId)) {
      const n = ownerName(agentsById.get(whoAgentId));
      if (n) return n;
    }
    return "Unassigned";
  }

  if (agent) return agent;
  const whoPerson = flexPersonName(raw.who);
  if (whoPerson) return whoPerson;
  if (technician) return technician;
  if (assignedto) return assignedto;
  const actionById =
    typeof t.actionby_agent_id === "number" && Number.isFinite(t.actionby_agent_id)
      ? t.actionby_agent_id
      : 0;
  if (actionById > 0 && agentsById?.has(actionById)) {
    const n = ownerName(agentsById.get(actionById));
    if (n) return n;
  }
  if (Number.isFinite(whoAgentId) && whoAgentId > 0 && agentsById?.has(whoAgentId)) {
    const n = ownerName(agentsById.get(whoAgentId));
    if (n) return n;
  }
  return "Unassigned";
}

/**
 * When list responses omit assignee objects, fetch `/api/Tickets/{id}` (via
 * `getTicketDetails`) for rows that would still show as Unassigned and merge
 * agent/manager and raw assignee fields onto the list ticket.
 */
export async function enrichTicketsMissingAgentsForDashboard(
  haloUrl: string,
  token: string,
  tickets: HaloTicket[],
  opts?: { maxFetches?: number; concurrency?: number },
): Promise<HaloTicket[]> {
  const maxFetches = opts?.maxFetches ?? 400;
  const concurrency = opts?.concurrency ?? 8;
  const noAgents = new Map<number, string>();
  const needIds = [
    ...new Set(
      tickets
        .filter(
          (t) => resolveDashboardOwnerFromHaloTicketWithAgents(t, noAgents) === "Unassigned",
        )
        .map((t) => t.id),
    ),
  ].slice(0, maxFetches);
  if (needIds.length === 0) return tickets;

  const detailById = new Map<number, HaloTicket>();
  for (let i = 0; i < needIds.length; i += concurrency) {
    const chunk = needIds.slice(i, i + concurrency);
    const detailed = await Promise.all(chunk.map((id) => getTicketDetails(haloUrl, token, id)));
    for (const d of detailed) detailById.set(d.id, d);
  }

  return tickets.map((t) => {
    const d = detailById.get(t.id);
    if (!d) return t;
    const rawD = d as unknown as Record<string, unknown>;
    console.log("[delivery-health] detail enrich raw agent:", t.id, rawD.agent ?? null);
    const rawT = t as unknown as Record<string, unknown>;
    const merged: HaloTicket = {
      ...t,
      agent: t.agent?.name ? t.agent : (d.agent ?? t.agent),
      manager: t.manager?.name ? t.manager : (d.manager ?? t.manager),
      actionby_agent_id: t.actionby_agent_id ?? d.actionby_agent_id ?? null,
    };
    if (rawT.assignedto == null && rawT.assigned_to == null) {
      const a = rawD.assignedto ?? rawD.assigned_to;
      if (a != null) (merged as unknown as Record<string, unknown>).assignedto = a;
    }
    if (rawT.technician == null && rawD.technician != null) {
      (merged as unknown as Record<string, unknown>).technician = rawD.technician;
    }
    const whoT = rawT.who_agentid ?? rawT.who_agent_id;
    if (whoT == null && (rawD.who_agentid ?? rawD.who_agent_id) != null) {
      merged.who_agentid = (rawD.who_agentid ?? rawD.who_agent_id) as number | string | null;
    }
    return merged;
  });
}

export function buildHaloTicketDeepLink(
  haloBaseUrl: string,
  ticketId: number,
  _kind: "ticket" | "project",
): string {
  const base = haloBaseUrl.trim().replace(/\/+$/, "");
  return `${base}/ticket?id=${ticketId}`;
}

export function buildConnectWiseTicketDeepLink(
  siteUrl: string,
  ticketId: number,
  kind: "ticket" | "project" = "ticket",
): string {
  const base = siteUrl.trim().replace(/\/+$/, "");
  if (!base) return "#";
  if (/staging\.connectwisedev\.com/i.test(base)) {
    return base;
  }
  if (kind === "project") {
    return `${base}/v4_6_release/ConnectWise.aspx?locale=en_US&type=Project&recid=${ticketId}`;
  }
  return `${base}/v4_6_release/ConnectWise.aspx?locale=en_US&type=ServiceTicket&recid=${ticketId}`;
}

/**
 * Build Handover input text for a single Halo ticket/project (parity with Halo import modal).
 */
/** Client-side: build the same Handover input shape from an API row (no extra Halo fetch). */
export function formatDeliveryHealthRowForGeneration(row: DeliveryHealthRow): string {
  const isProject = row.kind === "project";
  const noteLines =
    row.notes.length > 0
      ? row.notes
          .filter((n) => n.body.trim().length > 0)
          .map((n) => `  - [${n.at || "Unknown"}] ${n.author}: ${n.body}`)
          .join("\n")
      : "  - None";

  const lines = isProject
    ? [
        TICKET_SECTION_RULE,
        "TICKET 1 of 1 [PROJECT]",
        TICKET_SECTION_RULE,
        "Type: Project",
        `Source: ${row.source === "connectwise" ? "ConnectWise" : "HaloPSA"}`,
        `Title: ${row.name}`,
        `Status: ${row.statusName}`,
        `Client: ${row.clientName}`,
        `Assigned Engineer: ${row.owner ?? "Unassigned"}`,
        `Target date: ${row.targetDateIso ?? "Not set"}`,
        `Time logged: ${formatLoggedHours(row.timeLogged)}`,
        `Description: ${row.description ?? "None"}`,
        "Notes:",
        noteLines,
      ]
    : [
        TICKET_SECTION_RULE,
        "TICKET 1 of 1",
        TICKET_SECTION_RULE,
        `Source: ${row.source === "connectwise" ? "ConnectWise" : "HaloPSA"}`,
        `Title: ${row.name}`,
        `Status: ${row.statusName}`,
        `Client: ${row.clientName}`,
        `Owner: ${row.owner ?? "Unassigned"}`,
        `Priority: ${row.priorityName ?? "None"}`,
        `Target date: ${row.targetDateIso ?? "Not set"}`,
        `Time logged: ${formatLoggedHours(row.timeLogged)}`,
        `Description: ${row.description ?? "None"}`,
        "Notes:",
        noteLines,
      ];

  const header = isProject
    ? "HaloPSA Project Export - 1 project\n\n"
    : "HaloPSA Ticket Export - 1 ticket\n\n";
  return `${header}${lines.join("\n")}`;
}

/** Refresh list-row fields from a live Halo ticket (e.g. detail panel → Generate). */
export function mergeDeliveryRowWithFreshHaloTicket(
  row: DeliveryHealthRow,
  t: HaloTicket,
): DeliveryHealthRow {
  const notes = haloNotesChronological(t);
  const { at: lastNoteAt, preview: lastNotePreview } = latestNoteMeta(notes);
  const targetIso = t.targetdate ?? row.targetDateIso;
  const slaRisk = computeSlaRiskFromTargetIso(targetIso);
  return {
    ...row,
    name: t.summary?.trim() || row.name,
    clientName: t.client?.name ?? row.clientName,
    owner: resolveDashboardOwnerFromHaloTicketWithAgents(t),
    statusName: t.status?.name ?? row.statusName,
    priorityName: t.priority?.name ?? row.priorityName,
    targetDateIso: targetIso,
    timeLogged: t.timetaken != null ? Number(t.timetaken) : row.timeLogged,
    description: t.details ?? row.description,
    notes,
    lastNoteAt,
    lastNotePreview,
    targetHours: extractTargetHours(t) ?? row.targetHours,
    slaRisk,
    rag: applySlaRiskToRag(row.rag, slaRisk),
  };
}

export function haloTicketsToHealthRows(
  tickets: HaloTicket[],
  historyIndex: Map<string, DeliveryHistoryBucket>,
  haloBaseUrl: string,
  agentsById?: Map<number, string>,
  sourceOverride?: "halopsa" | "connectwise",
  includeClosed = false,
): DeliveryHealthRow[] {
  const rows: DeliveryHealthRow[] = [];

  for (const t of tickets) {
    const statusName = t.status?.name ?? "Open";
    if (!includeClosed && !isHaloTicketActive(statusName)) continue;

    const name = t.summary?.trim() || `Ticket ${t.id}`;
    const clientName = t.client?.name ?? "Unknown";
    const owner = resolveDashboardOwnerFromHaloTicketWithAgents(t, agentsById);
    const targetIso = t.targetdate ?? null;
    const createdIso = t.dateoccurred ?? null;
    const days = daysToTargetDate(targetIso);
    const ageDays = daysSinceIsoDate(createdIso);
    const notes = haloNotesChronological(t);
    const { at: lastNoteAt, preview: lastNotePreview } = latestNoteMeta(notes);
    const targetPassed = days != null && days < 0;
    const targetWithin7Days = days != null && days >= 0 && days <= 7;

    const tRaw = t as unknown as Record<string, unknown>;
    const fallbackResponseIso =
      (typeof tRaw.lastupdated === "string" && tRaw.lastupdated) ||
      (typeof tRaw.lastUpdated === "string" && tRaw.lastUpdated) ||
      (typeof tRaw.last_update === "string" && tRaw.last_update) ||
      (typeof tRaw.dateLastUpdated === "string" && tRaw.dateLastUpdated) ||
      (typeof tRaw.date_last_updated === "string" && tRaw.date_last_updated) ||
      null;
    const firstResponseHours =
      firstResponseHoursFromNotes(createdIso, notes) ??
      fallbackResponseHours(createdIso, fallbackResponseIso);

    const hist = lookupHistoryForTicket(historyIndex, name, clientName);
    const openActions = hist !== undefined ? hist.openActions : haloFallbackOpenActions(t);
    const overdueActions = hist !== undefined ? hist.overdueActions : 0;
    const openRisks = hist !== undefined ? hist.openRisks : 0;
    const lastGeneratedAt = hist?.lastGeneratedAt ?? null;
    const latestOpenActions = hist?.latestOpenActions ?? [];
    const latestOpenRisks = hist?.latestOpenRisks ?? [];

    const daysSinceLastRealNote = lastNoteAt ? daysSinceIsoDate(lastNoteAt) : null;

    const hasTarget = Boolean(targetIso);
    const hasNote = Boolean(lastNoteAt);
    const hasHist = hist !== undefined;
    const hasSignalForGrey =
      hasTarget ||
      hasNote ||
      hasHist ||
      openRisks > 0 ||
      overdueActions > 0 ||
      openActions > 0 ||
      (ageDays != null && ageDays >= 14);

    const insufficientData = !hasSignalForGrey;

    const baseRag = computeRag({
      insufficientData,
      targetPassed,
      targetWithin7Days,
      openRisks,
      overdueActions,
      daysSinceLastRealNote,
      ticketAgeDays: ageDays,
    });
    const slaRisk = computeSlaRiskFromTargetIso(targetIso);
    const rag = applySlaRiskToRag(baseRag, slaRisk);

    rows.push({
      id: t.id,
      kind: t.is_project ? "project" : "ticket",
      source: "halopsa",
      name,
      clientName,
      owner,
      statusName,
      priorityName: t.priority?.name ?? null,
      rag,
      openActions,
      openRisks,
      daysToTarget: days,
      lastGeneratedAt,
      ticketAgeDays: ageDays,
      lastNoteAt,
      lastNotePreview,
      targetDateIso: targetIso,
      targetHours: extractTargetHours(t),
      timeLogged:
        t.timetaken != null
          ? sourceOverride === "connectwise"
            ? Number(t.timetaken)
            : Number(t.timetaken) / 60
          : 0,
      description: t.details ?? null,
      notes,
      latestOpenActions,
      latestOpenRisks,
      haloTicketUrl: buildHaloTicketDeepLink(
        haloBaseUrl,
        t.id,
        t.is_project ? "project" : "ticket",
      ),
      slaRisk,
      createdAtIso: createdIso,
      firstResponseHours,
      projectTaskTotal: null,
      projectTaskCompleted: null,
    });
  }

  return rows;
}

export function aggregateStatStrip(rows: DeliveryHealthRow[]): DeliveryHealthStatStrip {
  let totalOpenActions = 0;
  let totalOpenRisks = 0;
  let overdueTargets = 0;
  const intensities: number[] = [];

  for (const r of rows) {
    totalOpenActions += r.openActions;
    totalOpenRisks += r.openRisks;
    if (r.daysToTarget != null && r.daysToTarget < 0) overdueTargets += 1;

    if (r.targetDateIso && r.daysToTarget != null && r.daysToTarget >= 0) {
      const daysLeft = Math.max(1, r.daysToTarget);
      const h = r.timeLogged;
      if (Number.isFinite(h) && h >= 0) intensities.push(h / daysLeft);
    }
  }

  const avgHoursPerDayToTarget =
    intensities.length > 0
      ? Math.round((intensities.reduce((a, b) => a + b, 0) / intensities.length) * 10) / 10
      : null;

  return {
    activeCount: rows.length,
    totalOpenActions,
    totalOpenRisks,
    overdueTargets,
    avgHoursPerDayToTarget,
  };
}

export function buildDeliveryHealthStats(allRows: DeliveryHealthRow[]): DeliveryHealthStats {
  const projects = allRows.filter((r) => r.kind === "project");
  const tickets = allRows.filter((r) => r.kind === "ticket");
  return {
    projects: aggregateStatStrip(projects),
    tickets: aggregateStatStrip(tickets),
  };
}

export const DEMO_DELIVERY_HEALTH: {
  stats: DeliveryHealthStats;
  rows: DeliveryHealthRow[];
} = (() => {
  const nearSlaTargetIso = new Date(Date.now() + 18 * 3600000).toISOString();
  const demoOverdueTargetIso = new Date(Date.now() - 86400000 * 14).toISOString();

  const ORG_DEMO_PORTFOLIO: Array<{ clientName: string; rag: DeliveryHealthRag }> = [
    { clientName: "Thornfield Academy", rag: "red" },
    { clientName: "Yardleys School", rag: "red" },
    { clientName: "Acme Legal LLP", rag: "red" },
    { clientName: "Northwood Manufacturing", rag: "red" },
    { clientName: "Pennine Logistics", rag: "red" },
    { clientName: "Bridgewater Council", rag: "amber" },
    { clientName: "Ashfield Energy Ltd", rag: "amber" },
    { clientName: "Hartley and Sons", rag: "amber" },
    { clientName: "Solent Academies Trust", rag: "amber" },
    { clientName: "Harbour IT Group", rag: "green" },
    { clientName: "Riverside Trust", rag: "green" },
    { clientName: "Kestrel Dental Group", rag: "green" },
    { clientName: "Marlowe Financial", rag: "green" },
    { clientName: "Foxton Property Ltd", rag: "green" },
    { clientName: "Cedar Medical Practice", rag: "green" },
    { clientName: "Oakmere Construction", rag: "grey" },
    { clientName: "Summit Retail Co", rag: "grey" },
    { clientName: "Lakeside Veterinary", rag: "grey" },
    { clientName: "Vale Engineering", rag: "grey" },
    { clientName: "Brighton Arts Trust", rag: "grey" },
    { clientName: "Coastal Hotels Group", rag: "grey" },
    { clientName: "Wren Accounting", rag: "grey" },
    { clientName: "Hawthorn Estates", rag: "grey" },
  ];

  function demoOrgRow(id: number, clientName: string, rag: DeliveryHealthRag): DeliveryHealthRow {
    const isGreen = rag === "green";
    const isGrey = rag === "grey";
    const targetDateIso =
      rag === "red" ? demoOverdueTargetIso : rag === "amber" ? nearSlaTargetIso : null;
    return {
      id,
      kind: isGreen ? "project" : "ticket",
      source: "halopsa",
      name: isGreen
        ? "On-track rollout"
        : rag === "red"
          ? "Overdue critical work"
          : rag === "amber"
            ? "Active support work"
            : "Routine request",
      clientName,
      owner: isGrey ? null : "Alex Taylor",
      statusName: isGreen ? "In progress" : "Open",
      priorityName: rag === "red" ? "High" : rag === "amber" ? "Normal" : isGreen ? "Low" : null,
      rag,
      openActions: isGrey ? 0 : rag === "red" ? 5 : rag === "amber" ? 3 : 2,
      openRisks: rag === "red" ? 2 : rag === "amber" ? 1 : 0,
      daysToTarget:
        rag === "red" ? daysToTargetDate(demoOverdueTargetIso) : rag === "amber" ? 4 : isGreen ? 21 : null,
      lastGeneratedAt: isGrey ? null : new Date(Date.now() - 86400000).toISOString(),
      ticketAgeDays: isGrey ? 1 : rag === "red" ? 95 : 30,
      lastNoteAt: isGrey ? null : new Date(Date.now() - 86400000 * 2).toISOString(),
      lastNotePreview: isGrey ? null : "Latest update on this item…",
      targetDateIso,
      targetHours: isGreen ? 120 : null,
      timeLogged: isGreen ? 88 : 0,
      description: null,
      notes: [],
      latestOpenActions: [],
      latestOpenRisks: [],
      haloTicketUrl: `https://example.halopsa.com/ticket?id=${id}`,
      slaRisk: rag === "red" || rag === "amber" ? computeSlaRiskFromTargetIso(targetDateIso) : null,
    };
  }

  const rows: DeliveryHealthRow[] = ORG_DEMO_PORTFOLIO.map((c, i) =>
    demoOrgRow(1000 + i, c.clientName, c.rag),
  );

  return {
    stats: buildDeliveryHealthStats(rows),
    rows,
  };
})();

/** Stats for empty / error responses (both strips zeroed). */
export function emptyDeliveryHealthStats(): DeliveryHealthStats {
  return buildDeliveryHealthStats([]);
}
