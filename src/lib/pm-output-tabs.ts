/** Optional PM deliverable tabs (settings + generate + Excel). Core five are separate. */

export const EXTENDED_PM_TAB_KEYS = [
  "raid_log",
  "meeting_notes",
  "change_log",
  "stakeholder_update",
  "executive_summary_pm",
  "invoice_time_summary",
  "communication_log",
  "project_health_dashboard",
  "risk_register_detailed",
  "pestle_analysis",
  "issue_log",
  "decisions_log",
  "lessons_learned",
] as const;

export type ExtendedPmTabKey = (typeof EXTENDED_PM_TAB_KEYS)[number];

/** Generated for Excel export but not shown as tabs in the on-screen output panel. */
export const EXTENDED_PM_TAB_KEYS_EXCEL_ONLY_STRIP: ReadonlySet<ExtendedPmTabKey> = new Set(EXTENDED_PM_TAB_KEYS);

export const EXTENDED_PM_TAB_LABELS: Record<ExtendedPmTabKey, string> = {
  raid_log: "RAID log",
  meeting_notes: "Meeting notes",
  change_log: "Change log",
  stakeholder_update: "Stakeholder update",
  executive_summary_pm: "Executive summary",
  invoice_time_summary: "Invoice / time summary",
  communication_log: "Communication log",
  project_health_dashboard: "Project health",
  risk_register_detailed: "Risk register (detailed)",
  pestle_analysis: "PESTLE analysis",
  issue_log: "Issue log",
  decisions_log: "Decisions log",
  lessons_learned: "Lessons learned",
};

const EXTENDED_PM_TAB_SET = new Set<string>(EXTENDED_PM_TAB_KEYS);

export function isExtendedPmTabKey(k: string): k is ExtendedPmTabKey {
  return EXTENDED_PM_TAB_SET.has(k);
}

export function normalizeExtendedOutputKeys(raw: unknown): ExtendedPmTabKey[] {
  if (!Array.isArray(raw)) return [];
  const out: ExtendedPmTabKey[] = [];
  const seen = new Set<string>();
  for (const x of raw) {
    if (typeof x !== "string" || !isExtendedPmTabKey(x) || seen.has(x)) continue;
    seen.add(x);
    out.push(x);
  }
  return out;
}

/** Compact instructions appended to the system prompt for enabled extended keys only. */
export function buildExtendedPmOutputsPromptBlock(keys: ExtendedPmTabKey[]): string {
  if (keys.length === 0) return "";
  const lines: string[] = [
    "",
    "EXTENDED PM OUTPUTS (generate ONLY the following additional JSON keys as non-empty strings; for keys not listed here use empty string \"\"):",
    `Enabled extended keys: ${keys.join(", ")}.`,
    "Each enabled key must contain substantive, well-structured plain text (use headings and bullet lists where helpful). Extract from ticket/note data; do not invent facts.",
  ];
  for (const k of keys) {
    switch (k) {
      case "raid_log":
        lines.push(
          `- raid_log: RAID table (Risks, Assumptions, Issues, Dependencies). Columns: Type | ID (RAID-001…) | Description | Owner | Impact | Probability (risks) | Status | Action required | Due date | Client. Derive issues from blockers, dependencies from explicit deps, assumptions from stated assumptions, risks from risk language.`,
        );
        break;
      case "meeting_notes":
        lines.push(
          `- meeting_notes: Minutes template - Meeting (project), Date (today if unknown), Attendees (from notes), Agenda items from tickets, Decisions, Actions with owners, Next meeting TBC.`,
        );
        break;
      case "change_log":
        lines.push(
          `- change_log: Table CHG-001… with Date, Description, Requested by, Impact, Status (Proposed/Approved/Implemented), Owner, Notes - from change-related notes.`,
        );
        break;
      case "stakeholder_update":
        lines.push(
          `- stakeholder_update: Non-technical brief - Overall RAG, Key highlights, Items requiring attention, Upcoming milestones. Plain English, no jargon.`,
        );
        break;
      case "executive_summary_pm":
        lines.push(
          `- executive_summary_pm: When multiple tickets or projects are in the import, write one short board-level paragraph per ticket/project (label each with the ticket or project title). Never combine multiple tickets into one paragraph. Each paragraph covers: done, outstanding, decisions needed. No technical jargon.`,
        );
        break;
      case "invoice_time_summary":
        lines.push(
          `- invoice_time_summary: Table from time_logged / hours per ticket: Ticket, Client, Engineer, Hours, Date, Description. Total hours line at end.`,
        );
        break;
      case "communication_log":
        lines.push(
          `- communication_log: Chronological table: Date, From, To, Channel, Summary, Follow up Y/N - from client-facing note excerpts.`,
        );
        break;
      case "project_health_dashboard":
        lines.push(
          `- project_health_dashboard: Single-page summary - Overall RAG, Budget/timeline/scope/quality/resources signals, key metrics (open tickets, resolved, overdue if inferable).`,
        );
        break;
      case "risk_register_detailed":
        lines.push(
          `- risk_register_detailed: RSK-001… Category, Description, Likelihood 1-5, Impact 1-5, Score L×I, RAG from score (1-4 Green, 5-9 Amber, 10-25 Red), Owner, Mitigation, Contingency, Review date, Status.`,
        );
        break;
      case "pestle_analysis":
        lines.push(
          `- pestle_analysis: Political/Economic/Social/Technological/Legal/Environmental - factor, impact, likelihood, mitigation from ticket context where relevant.`,
        );
        break;
      case "issue_log":
        lines.push(
          `- issue_log: ISS-001… Date raised, Description, Raised by, Priority, Status, Owner, Resolution, Date resolved - current problems/blockers.`,
        );
        break;
      case "decisions_log":
        lines.push(
          `- decisions_log: DEC-001… Date, Decision, Decision maker, Rationale, Impact, Alternatives, Status - from decision language in notes.`,
        );
        break;
      case "lessons_learned":
        lines.push(
          `- lessons_learned: Category, What went well, Improve, Root cause, Recommendation, Owner, Status - inferred from patterns in input.`,
        );
        break;
      default:
        break;
    }
  }
  lines.push(
    "Return these keys at the top level of the JSON object alongside the standard keys. Use \"\" for any extended key that is not in the enabled list above.",
  );
  return lines.join("\n");
}

export function emptyExtendedOutputsObject(): Record<ExtendedPmTabKey, string> {
  return Object.fromEntries(EXTENDED_PM_TAB_KEYS.map((k) => [k, ""])) as Record<
    ExtendedPmTabKey,
    string
  >;
}
