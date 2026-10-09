import {
  EXTENDED_PM_TAB_KEYS,
  emptyExtendedOutputsObject,
  type ExtendedPmTabKey,
} from "./pm-output-tabs";

type ExtendedStrings = Record<ExtendedPmTabKey, string>;

/** Row in action log exports (CSV + Excel). */
export type ActionExportRow = {
  task: string | null;
  suggested_owner: string | null;
  priority: string | null;
  notes?: string | null;
  status?: string | null;
  due_date?: string | null;
  client_name?: string | null;
  project_name?: string | null;
  kind?: string | null;
  /** Optional per-row ticket title when model supplies it (multi-ticket UI / export). */
  source_ticket?: string | null;
};

export type RiskExportRow = {
  risk: string | null;
  impact: string | null;
  mitigation: string | null;
  status?: string | null;
  owner?: string | null;
  priority?: string | null;
  rag?: string | null;
  project_name?: string | null;
  client_name?: string | null;
  review_date?: string | null;
  source_ticket?: string | null;
};


/** Outputs shape for the full Excel export (Pro). */
export type FullReportOutputs = {
  actions: ActionExportRow[];
  risks: RiskExportRow[];
  summary: string;
  client_email: string;
  email_subject: string;
  status_report: string;
} & ExtendedStrings;

export type FullReportExportConfig = {
  selectedTabs: string[];
  actionColumns: string[];
  riskColumns: string[];
  /** Fallback when row-level client_name is empty */
  clientName?: string | null;
  /** Project / focus name field (column G) */
  projectName?: string | null;
  /** When true, skip browser download and return an XLSX buffer (Node/server only). */
  returnBuffer?: boolean;
  /** Optional custom branding for headers/footer text. */
  brandName?: string | null;
  brandColor?: string | null;
  brandSecondaryColor?: string | null;
  brandLogoUrl?: string | null;
  /** Enterprise white label: footer omits Handover / gethandover.uk (see {@link applyExcelBranding}). */
  whiteLabelMode?: boolean;
  /** Last column on Action Log sheet (truncated labels); only when caller detects multi-ticket input. */
  actionSourceColumn?: string[] | null;
  /** Last column on Risk Log sheet when multi-ticket. */
  riskSourceColumn?: string[] | null;
  /** Pre-generated meeting brief from delivery health — pre-fills Meeting Notes sheet when set. */
  meetingPrepContent?: string | null;
  meetingPrepTicketTitle?: string | null;
};

const ACTION_COLUMN_KEYS = [
  "task",
  "owner",
  "priority",
  "status",
  "due_date",
  "notes",
  "project_name",
  "client_name",
  "date_generated",
] as const;

const RISK_COLUMN_KEYS = [
  "risk",
  "impact",
  "mitigation",
  "status",
  "owner",
  "priority",
  "rag",
  "project_name",
  "client_name",
  "date_generated",
  "review_date",
] as const;

export const ACTION_HEADERS: Record<string, string> = {
  task: "Task",
  owner: "Owner",
  priority: "Priority",
  status: "Status",
  due_date: "Due date",
  notes: "Notes",
  project_name: "Project name",
  client_name: "Client name",
  date_generated: "Date generated",
};

export const RISK_HEADERS: Record<string, string> = {
  risk: "Risk",
  impact: "Impact",
  mitigation: "Mitigation",
  status: "Status",
  owner: "Owner",
  priority: "Priority",
  rag: "RAG",
  project_name: "Project name",
  client_name: "Client name",
  date_generated: "Date generated",
  review_date: "Review date",
};
export function safeText(value: string | null | undefined): string {
  if (value == null) return "";
  return String(value);
}

export function fileBaseName(projectName: string | null | undefined): string {
  const trimmed = (projectName ?? "").trim();
  const base = trimmed || "handover";
  return base.replace(/[/\\?*[\]:]/g, "-").slice(0, 120) || "handover";
}

export function fileDateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export function csvEscapeCell(value: string): string {
  if (value.includes('"') || value.includes(",") || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsvRow(cells: string[]): string {
  return cells.map(csvEscapeCell).join(",");
}
export function filterActionColumns(columns: string[]): string[] {
  const set = new Set<string>(ACTION_COLUMN_KEYS);
  return columns.filter((col) => set.has(col));
}

export function filterRiskColumns(columns: string[]): string[] {
  const set = new Set<string>(RISK_COLUMN_KEYS);
  return columns.filter((col) => set.has(col));
}

export type ExportMeta = {
  clientName?: string | null;
  projectName?: string | null;
  generatedDate?: string;
};

export function inferRagFromRiskText(r: RiskExportRow): string {
  if (r.rag && safeText(r.rag).trim()) return safeText(r.rag).trim();
  const blob = `${safeText(r.risk)} ${safeText(r.impact)} ${safeText(r.mitigation)}`.toLowerCase();
  if (/\bred\b/.test(blob)) return "Red";
  if (/\bamber\b/.test(blob)) return "Amber";
  if (/\bgreen\b/.test(blob)) return "Green";
  return "";
}

export function inferRiskStatus(r: RiskExportRow): string {
  if (r.status && safeText(r.status).trim()) return safeText(r.status).trim();
  const blob = `${safeText(r.risk)} ${safeText(r.impact)}`.toLowerCase();
  if (/\bresolved\b|\bclosed\b|\bcomplete\b/.test(blob)) return "Complete";
  if (/\bblocked\b/.test(blob)) return "Blocked";
  if (/\bin progress\b/.test(blob)) return "In Progress";
  if (/\bon hold\b/.test(blob)) return "On Hold";
  return "Open";
}

export function actionCellValue(
  key: string,
  a: ActionExportRow,
  projectName: string,
  meta: ExportMeta | undefined,
  genDate: string,
): string {
  const pn = safeText(meta?.projectName) || safeText(projectName);
  switch (key) {
    case "task":
      return safeText(a.task);
    case "owner":
      return safeText(a.suggested_owner);
    case "priority":
      return safeText(a.priority);
    case "status":
      return safeText(a.status) || "Open";
    case "due_date":
      return safeText(a.due_date);
    case "notes":
      return safeText(a.notes);
    case "project_name":
      return safeText(a.project_name) || pn;
    case "client_name":
      return safeText(a.client_name) || safeText(meta?.clientName);
    case "ticket_project":
      return safeText(a.kind) === "project" ? "Project" : "Ticket";
    case "date_generated":
      return genDate;
    default:
      return "";
  }
}

export function riskCellValue(
  key: string,
  r: RiskExportRow,
  projectName: string,
  meta: ExportMeta | undefined,
  genDate: string,
): string {
  const pn = safeText(meta?.projectName) || safeText(projectName);
  switch (key) {
    case "risk":
      return safeText(r.risk) || safeText((r as { title?: string }).title) || "";
    case "impact":
      return safeText(r.impact);
    case "mitigation":
      return safeText(r.mitigation);
    case "status":
      return inferRiskStatus(r);
    case "owner":
      return safeText(r.owner) || safeText((r as { suggested_owner?: string }).suggested_owner) || "";
    case "priority":
      return safeText(r.priority) || safeText((r as { impact_level?: string }).impact_level) || "Medium";
    case "rag":
      return safeText(r.rag) || safeText(r.priority) || inferRagFromRiskText(r);
    case "project_name":
      return safeText(r.project_name) || safeText(r.source_ticket) || pn;
    case "client_name":
      return safeText(r.client_name) || safeText(meta?.clientName) || "";
    case "date_generated":
      return genDate;
    case "review_date":
      return safeText(r.review_date);
    default:
      return "";
  }
}
export function splitStatusReportDisplayBlocks(
  text: string,
): Array<{ title: string; client: string | null; content: string }> {
  const trimmed = safeText(text).trim();
  if (!trimmed) return [];

  const blocks = trimmed.split(/\n\s*---\s*\n/).map((b) => b.trim()).filter(Boolean);
  const mapBlock = (block: string) => {
    const firstLine = (block.split("\n")[0] ?? "").replace(/\*\*/g, "").trim();
    const titleMatch = firstLine.match(/^(.*?)\s*[—–]\s*(.*)$/);
    return {
      title: titleMatch?.[1]?.trim() || firstLine || "Status report",
      client: titleMatch?.[2]?.trim() || null,
      content: block,
    };
  };

  if (blocks.length <= 1) {
    return [mapBlock(blocks[0] ?? trimmed)];
  }
  return blocks.map(mapBlock);
}

export function extractStatusReportSectionForTicket(
  fullText: string,
  ticketTitleHint: string,
): string {
  const hint = ticketTitleHint.trim().toLowerCase();
  if (!hint) return fullText;
  const blocks = splitStatusReportDisplayBlocks(fullText);
  if (blocks.length <= 1) return fullText;
  const match =
    blocks.find((b) => b.title.toLowerCase() === hint) ||
    blocks.find((b) => b.title.toLowerCase().includes(hint)) ||
    blocks.find((b) => hint.includes(b.title.toLowerCase()));
  return match?.content ?? fullText;
}
function pickStrField(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  return String(v);
}

function rowFromUnknownAction(row: unknown): ActionExportRow {
  if (!row || typeof row !== "object") {
    const t = row == null ? "" : String(row);
    return { task: t.trim() ? t : null, suggested_owner: null, priority: null };
  }
  const o = row as Record<string, unknown>;
  const taskRaw =
    o.task ?? o.action ?? o.title ?? o.name ?? o.Task ?? o.summary ?? o.description;
  const ownerRaw =
    o.suggested_owner ??
    o.owner ??
    o.Owner ??
    o.assignee ??
    o.assigned_to ??
    o.technician;
  let suggested_owner: string | null = null;
  if (ownerRaw === null || ownerRaw === undefined) suggested_owner = null;
  else if (typeof ownerRaw === "string") suggested_owner = ownerRaw;
  else suggested_owner = String(ownerRaw);
  const srcRaw = o.source_ticket ?? o.ticket_title ?? o.ticketTitle ?? o.source_ticket_title ?? o.source;
  const source_ticket =
    typeof srcRaw === "string" && srcRaw.trim()
      ? srcRaw.trim()
      : srcRaw != null && String(srcRaw).trim()
        ? String(srcRaw).trim()
        : null;
  return {
    task: typeof taskRaw === "string" ? taskRaw : taskRaw != null ? String(taskRaw) : null,
    suggested_owner,
    priority: typeof o.priority === "string" ? o.priority : null,
    notes: typeof o.notes === "string" ? o.notes : null,
    status: typeof o.status === "string" ? o.status : null,
    due_date: typeof o.due_date === "string" ? o.due_date : null,
    client_name: typeof o.client_name === "string" ? o.client_name : null,
    project_name: typeof o.project_name === "string" ? o.project_name : null,
    kind: typeof o.kind === "string" ? o.kind : null,
    source_ticket,
  };
}

function rowFromUnknownRisk(row: unknown): RiskExportRow {
  if (!row || typeof row !== "object") {
    const t = row == null ? "" : String(row);
    return { risk: t.trim() ? t : null, impact: null, mitigation: null };
  }
  const o = row as Record<string, unknown>;
  const riskRaw = o.risk ?? o.title ?? o.name ?? o.description;
  const impactRaw = o.impact ?? o.severity;
  const mitRaw = o.mitigation ?? o.response ?? o.plan;
  const srcRaw = o.source_ticket ?? o.ticket_title ?? o.ticketTitle ?? o.source_ticket_title ?? o.source;
  const source_ticket =
    typeof srcRaw === "string" && srcRaw.trim()
      ? srcRaw.trim()
      : srcRaw != null && String(srcRaw).trim()
        ? String(srcRaw).trim()
        : undefined;
  return {
    risk: typeof riskRaw === "string" ? riskRaw : riskRaw != null ? String(riskRaw) : null,
    impact: typeof impactRaw === "string" ? impactRaw : impactRaw != null ? String(impactRaw) : null,
    mitigation: typeof mitRaw === "string" ? mitRaw : mitRaw != null ? String(mitRaw) : null,
    status: typeof o.status === "string" ? o.status : undefined,
    owner: typeof o.owner === "string" ? o.owner : undefined,
    priority: typeof o.priority === "string" ? o.priority : undefined,
    rag: typeof o.rag === "string" ? o.rag : undefined,
    project_name: typeof o.project_name === "string" ? o.project_name : undefined,
    client_name: typeof o.client_name === "string" ? o.client_name : undefined,
    review_date: typeof o.review_date === "string" ? o.review_date : undefined,
    source_ticket,
  };
}

/** Parse actions from a string (JSON array, JSON object with actions, or line-based fallback). */
export function parseActionsFromText(text: string): ActionExportRow[] {
  const t = text.trim();
  if (!t) return [];
  try {
    const p: unknown = JSON.parse(t);
    if (Array.isArray(p)) return p.map(rowFromUnknownAction);
    if (p && typeof p === "object") {
      const inner = (p as Record<string, unknown>).actions;
      if (Array.isArray(inner)) return inner.map(rowFromUnknownAction);
    }
  } catch {
    /* use line fallback */
  }
  const lines = t
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*•\d.)]+\s*/, "").trim())
    .filter(Boolean);
  if (lines.length > 0) {
    return lines.map((line) => ({
      task: line,
      suggested_owner: null,
      priority: null,
    }));
  }
  return [{ task: t, suggested_owner: null, priority: null }];
}

function coerceActionsInput(raw: unknown): ActionExportRow[] {
  if (typeof raw === "string") return parseActionsFromText(raw);
  if (!Array.isArray(raw)) return [];
  return raw.map(rowFromUnknownAction);
}

function coerceRisksInput(raw: unknown): RiskExportRow[] {
  if (typeof raw === "string" && raw.trim()) {
    try {
      const p: unknown = JSON.parse(raw.trim());
      if (Array.isArray(p)) return p.map(rowFromUnknownRisk);
    } catch {
      return [];
    }
    return [];
  }
  if (!Array.isArray(raw)) return [];
  return raw.map(rowFromUnknownRisk);
}

/**
 * Normalizes alternate API / history key names so Excel export always receives arrays and strings.
 */
export function normalizeFullReportInputs(
  outputs: FullReportOutputs | Record<string, unknown>,
): FullReportOutputs {
  const o =
    outputs && typeof outputs === "object"
      ? (outputs as Record<string, unknown>)
      : {};

  const ext = emptyExtendedOutputsObject();
  for (const k of EXTENDED_PM_TAB_KEYS) {
    ext[k] = typeof o[k] === "string" ? o[k] : "";
  }

  const actions = coerceActionsInput(
    o.actions ?? o.action_log ?? o.actionLog ?? o.actionList,
  );
  const risks = coerceRisksInput(o.risks ?? o.risk_log ?? o.riskLog ?? o.riskList);

  return {
    actions,
    risks,
    summary: pickStrField(o.summary ?? o.Summary),
    client_email: pickStrField(o.client_email ?? o.clientEmail),
    email_subject: pickStrField(o.email_subject ?? o.emailSubject),
    status_report: pickStrField(
      o.status_report ?? o.statusReport ?? o.project_status ?? o.projectStatus,
    ),
    ...ext,
  };
}
/** Filenames as written by the export helpers - for UI feedback after download. */
export function getActionLogExportFilename(projectName: string): string {
  return `${fileBaseName(projectName)}-action-log-${fileDateStamp()}.csv`;
}

export function getRiskLogExportFilename(projectName: string): string {
  return `${fileBaseName(projectName)}-risk-log-${fileDateStamp()}.csv`;
}

export function getStatusReportExportFilename(projectName: string): string {
  return `${fileBaseName(projectName)}-status-report-${fileDateStamp()}.txt`;
}

export function getClientEmailExportFilename(projectName: string): string {
  return `${fileBaseName(projectName)}-client-email-${fileDateStamp()}.txt`;
}

export function getFullReportExportFilename(projectName: string): string {
  return `${fileBaseName(projectName)}-full-report-${fileDateStamp()}.xlsx`;
}
