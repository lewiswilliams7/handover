/** Email body sections for scheduled weekly report (stored in scheduled_reports.email_content_prefs). */

export type EmailContentPrefs = {
  include_actions?: boolean;
  include_risks?: boolean;
  include_client_emails?: boolean;
  include_status?: boolean;
};

export type NormalizedEmailContentPrefs = {
  include_actions: boolean;
  include_risks: boolean;
  include_client_emails: boolean;
  include_status: boolean;
};

export const DEFAULT_EMAIL_CONTENT_PREFS: NormalizedEmailContentPrefs = {
  include_actions: true,
  include_risks: true,
  include_client_emails: false,
  include_status: false,
};

export function normalizeEmailContentPrefs(raw: unknown): NormalizedEmailContentPrefs {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_EMAIL_CONTENT_PREFS };
  }
  const o = raw as Record<string, unknown>;
  return {
    include_actions: o.include_actions !== false,
    include_risks: o.include_risks !== false,
    include_client_emails: o.include_client_emails === true,
    include_status: o.include_status === true,
  };
}

/** Optional extended Excel tab keys (core five are always written by export). */
export const SCHEDULE_EXCEL_OPTIONAL_TAB_KEYS = [
  "raid_log",
  "change_log",
  "meeting_notes",
  "stakeholder_update",
  "invoice_time_summary",
  "pestle_analysis",
  "risk_register_detailed",
  "issue_log",
  "decisions_log",
  "lessons_learned",
] as const;

export type ScheduleExcelOptionalTabKey = (typeof SCHEDULE_EXCEL_OPTIONAL_TAB_KEYS)[number];

export const SCHEDULE_EXCEL_OPTIONAL_LABELS: Record<ScheduleExcelOptionalTabKey, string> = {
  raid_log: "RAID Log",
  change_log: "Change Log",
  meeting_notes: "Meeting Notes",
  stakeholder_update: "Stakeholder Update",
  invoice_time_summary: "Invoice / Time Summary",
  pestle_analysis: "PESTLE Analysis",
  risk_register_detailed: "Detailed Risk Register",
  issue_log: "Issue Log",
  decisions_log: "Decisions Log",
  lessons_learned: "Lessons Learned",
};

export const SCHEDULE_EXCEL_CORE_KEYS = [
  "actions",
  "risks",
  "summary",
  "client_email",
  "status_report",
] as const;

/** Normalize persisted schedule `excel_tabs` into allowed keys (defaults to core + optional when empty). */
export function selectedExcelKeysFromRow(raw: unknown): string[] {
  const allowed = new Set<string>([
    ...SCHEDULE_EXCEL_CORE_KEYS,
    ...SCHEDULE_EXCEL_OPTIONAL_TAB_KEYS,
  ]);
  let list: unknown = raw;
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) list = [];
    else {
      try {
        list = JSON.parse(t) as unknown;
      } catch {
        list = [];
      }
    }
  }
  if (!Array.isArray(list) || list.length === 0 || list.length < 3) {
    return [...SCHEDULE_EXCEL_CORE_KEYS, ...SCHEDULE_EXCEL_OPTIONAL_TAB_KEYS];
  }
  const picked = list.filter((x): x is string => typeof x === "string" && allowed.has(x));
  return picked.length > 0
    ? picked
    : [...SCHEDULE_EXCEL_CORE_KEYS, ...SCHEDULE_EXCEL_OPTIONAL_TAB_KEYS];
}

/** Map export-picker ids to keys consumed by exportFullReport; drop unsupported aliases and dedupe. */
export function normalizeExcelExportEngineTabIds(tabIds: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of tabIds) {
    if (t === "rag_dashboard") continue;
    const mapped = t === "executive_summary" ? "summary" : t;
    if (seen.has(mapped)) continue;
    seen.add(mapped);
    out.push(mapped);
  }
  return out;
}
