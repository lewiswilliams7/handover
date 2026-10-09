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
    "##########  EXTENDED PM OUTPUTS  ##########",
    "Generate ONLY the keys listed below as",
    "non-empty strings. For all other extended",
    'keys return "" exactly.',
    "",
    `Enabled extended keys: ${keys.join(", ")}.`,
    "",
    "QUALITY BAR (applies to every key below):",
    "- Extract from ticket and note data only.",
    "  Never invent facts.",
    "- Use specific names, dates, ticket titles,",
    "  and owners from the input. Generic language",
    "  is never acceptable.",
    "- Owner fields: always use the ticket owner.",
    "  Never output TBC when an owner is present.",
    "- Dates: use actual dates from input.",
    "  Use TBC only when genuinely unknown.",
    "- Write as a senior PM who owns these",
    "  accounts — not a system processing data.",
    "",
  ];

  for (const k of keys) {
    switch (k) {
      case "meeting_notes":
        lines.push(
          `- meeting_notes: Professional meeting`,
          `  minutes structured as follows:`,
          `  Meeting title (use project/client name),`,
          `  Date (today's date if not in notes),`,
          `  Attendees (from note authors and ticket`,
          `  owners — first and last name),`,
          `  Agenda (one item per active ticket/`,
          `  project — specific not generic),`,
          `  Decisions (only if explicit in notes`,
          `  — never invent decisions),`,
          `  Actions (task | owner | due date —`,
          `  same quality bar as actions[] output:`,
          `  specific, defines done, has escalation`,
          `  path where relevant),`,
          `  Next meeting: TBC unless stated.`,
          ``,
          `  MEETING NOTES QUALITY RULES:`,
          `  Never write "Various items discussed."`,
          `  Never write generic agenda items like`,
          `  "Project update" — use the actual`,
          `  ticket title.`,
          `  Decisions must be specific: "Agreed to`,
          `  delay migration to 21 June pending`,
          `  partner sign-off" not "Decision made`,
          `  regarding migration."`,
          `  Actions must match the quality of the`,
          `  core actions[] array — start with a`,
          `  verb, define completion, name the owner.`,
          ``,
          `  CORRECT meeting action:`,
          `  "Chase [partner] for Osprey sign-off`,
          `  by Friday EOD — escalate to partner`,
          `  director if no response | Jamie Clarke`,
          `  | 08 Jun 2026"`,
          `  WRONG:`,
          `  "Follow up on Osprey | TBC | TBC"`,
        );
        break;

      case "raid_log":
        lines.push(
          `- raid_log: RAID table with columns:`,
          `  Type | ID (RAID-001…) | Description`,
          `  | Owner | Impact | Probability`,
          `  | Status | Action required | Due date`,
          `  | Client`,
          ``,
          `  RAID QUALITY RULES:`,
          `  Risks: derive from ticket risk language,`,
          `  blockers, dependencies, and overdue items.`,
          `  Owner is ALWAYS the ticket owner — never`,
          `  TBC when an assignee is present.`,
          `  Probability is ALWAYS a number 1-5 —`,
          `  never TBC. Infer from context:`,
          `  active escalation = 4, blocked on`,
          `  external = 4, scheduled with contingency`,
          `  = 2, theoretical = 1.`,
          `  Assumptions: state what is being assumed`,
          `  about client environment, access, or`,
          `  dependencies — not generic statements.`,
          `  Issues: current blockers and problems`,
          `  with specific impact described.`,
          `  Dependencies: explicit external`,
          `  dependencies with named party.`,
          ``,
          `  CORRECT risk row:`,
          `  Risk | RAID-001 | Fortigate migration`,
          `  may overrun Saturday window — no`,
          `  recovery path after cutover starts`,
          `  | Alex Thompson | Public services`,
          `  degraded until emergency window agreed`,
          `  | 4 | Open | Confirm abort criteria`,
          `  before Saturday | 14 Jun 2026`,
          `  | Bridgewater Council`,
          `  WRONG:`,
          `  Risk | RAID-001 | Migration risk`,
          `  | TBC | Impact TBC | TBC | Open`,
          `  | Monitor | TBC | TBC`,
        );
        break;

      case "change_log":
        lines.push(
          `- change_log: Change table with columns:`,
          `  ID (CHG-001…) | Date | Description`,
          `  | Requested by | Impact | Status`,
          `  (Proposed/Approved/Implemented)`,
          `  | Owner | Notes`,
          ``,
          `  CHANGE LOG QUALITY RULES:`,
          `  Only include actual changes — config`,
          `  updates, deployments, migrations,`,
          `  policy changes, infrastructure work.`,
          `  Do not include routine monitoring or`,
          `  chase actions as changes.`,
          `  Description must be specific:`,
          `  "SPF record updated to include new`,
          `  mail relay following DNS migration"`,
          `  not "Email configuration updated."`,
          `  Impact must describe the business`,
          `  outcome: "Restores outbound delivery`,
          `  for sales team" not "Configuration`,
          `  change applied."`,
          `  Status must reflect actual state from`,
          `  notes — Implemented if notes confirm`,
          `  completion, Approved if approved but`,
          `  not yet done, Proposed if raised only.`,
        );
        break;

      case "stakeholder_update":
        lines.push(
          `- stakeholder_update: Non-technical`,
          `  executive brief structured as:`,
          `  Overall RAG (Red/Amber/Green with`,
          `  one sentence justification),`,
          `  Key highlights (2-3 items — what`,
          `  went well or progressed this period),`,
          `  Items requiring attention (specific`,
          `  items needing stakeholder awareness`,
          `  or decision — not generic concerns),`,
          `  Upcoming milestones (named items`,
          `  with specific dates).`,
          ``,
          `  Write in plain English. No technical`,
          `  jargon. No ticket IDs. No engineer`,
          `  names in client-facing content.`,
          `  Each highlight and attention item`,
          `  must be specific to this portfolio —`,
          `  never generic.`,
          ``,
          `  CORRECT attention item:`,
          `  "Partner sign-off on Osprey SQL`,
          `  migration is outstanding — production`,
          `  deployment cannot proceed without it.`,
          `  Thursday window is at risk."`,
          `  WRONG:`,
          `  "Some items are awaiting client input."`,
        );
        break;

      case "executive_summary_pm":
        lines.push(
          `- executive_summary_pm: One short`,
          `  board-level paragraph per ticket or`,
          `  project. Label each with the ticket`,
          `  or project title as a heading.`,
          `  Never combine multiple tickets.`,
          ``,
          `  Each paragraph covers in order:`,
          `  1. What was done or progressed`,
          `  2. What is outstanding or blocked`,
          `  3. What decision or action is needed`,
          `     (if any)`,
          ``,
          `  EXECUTIVE SUMMARY QUALITY RULES:`,
          `  No technical jargon in any paragraph.`,
          `  Translate to business language:`,
          `  "Backup system recovered after 4-day`,
          `  failure — overnight monitoring in`,
          `  progress before closure" not "VSS`,
          `  writer restarted, backup job rerun."`,
          `  Each paragraph must be self-contained`,
          `  — a director should understand it`,
          `  without reading any other paragraph.`,
          `  If a decision is needed, state it`,
          `  explicitly: "IT manager approval`,
          `  required to proceed."`,
          `  Maximum 3 sentences per paragraph.`,
          ``,
          `  CORRECT paragraph:`,
          `  "Osprey SQL migration: Staging`,
          `  migration and performance testing are`,
          `  complete. Production deployment is`,
          `  ready but cannot proceed until partner`,
          `  sign-off is received — currently being`,
          `  chased with a Friday deadline."`,
          `  WRONG:`,
          `  "The Osprey upgrade is in progress`,
          `  with various activities underway."`,
        );
        break;

      case "invoice_time_summary":
        lines.push(
          `- invoice_time_summary: Time and`,
          `  billing summary table with columns:`,
          `  Ticket | Client | Engineer | Hours`,
          `  | Date | Description`,
          `  Total hours line at end.`,
          ``,
          `  Use actual time_logged values from`,
          `  input. Never estimate or invent hours.`,
          `  Description must describe the actual`,
          `  work: "SharePoint Phase 2 migration`,
          `  — permissions validation and data`,
          `  transfer" not "Project work."`,
          `  If time_logged is absent for a ticket`,
          `  omit that ticket from the table.`,
        );
        break;

      case "communication_log":
        lines.push(
          `- communication_log: Chronological`,
          `  table of client-facing communications:`,
          `  Date | From | To | Channel`,
          `  | Summary | Follow up Y/N`,
          ``,
          `  Only include actual communications`,
          `  from notes — emails sent, calls made,`,
          `  client responses received.`,
          `  Notes prefixed [Email Sent] and`,
          `  [Email Received] are primary sources.`,
          `  Summary must capture the substance:`,
          `  "Sent procurement options for YubiKey`,
          `  5 NFC hardware tokens, awaiting IT`,
          `  manager sign-off" not "Email sent."`,
          `  From/To should use full names and`,
          `  company where available.`,
        );
        break;

      case "project_health_dashboard":
        lines.push(
          `- project_health_dashboard: Portfolio`,
          `  health summary structured as:`,
          `  Overall RAG with justification,`,
          `  Budget signal (on track / at risk`,
          `  / unknown — infer from notes),`,
          `  Timeline signal (on track / slipping`,
          `  / blocked — infer from due dates`,
          `  and note recency),`,
          `  Scope signal (stable / changed —`,
          `  from any scope change language),`,
          `  Quality signal (no issues / concerns`,
          `  — from escalations or rework notes),`,
          `  Resource signal (sufficient / at risk`,
          `  — from workload language in notes),`,
          `  Key metrics: open tickets, resolved`,
          `  this period, overdue (if inferable).`,
          ``,
          `  All signals must be justified with`,
          `  a specific reason — never just a`,
          `  RAG colour with no explanation.`,
        );
        break;

      case "risk_register_detailed":
        lines.push(
          `- risk_register_detailed: Detailed`,
          `  risk table with columns:`,
          `  ID (RSK-001…) | Category | Description`,
          `  | Likelihood 1-5 | Impact 1-5`,
          `  | Score (L×I) | RAG (1-4 Green,`,
          `  5-9 Amber, 10-25 Red) | Owner`,
          `  | Mitigation | Contingency`,
          `  | Review date | Status`,
          ``,
          `  Same owner and probability rules`,
          `  as raid_log — never TBC when data`,
          `  is available to infer.`,
          `  Mitigation must be actionable —`,
          `  not "monitor the situation."`,
          `  Contingency must be specific —`,
          `  what happens if mitigation fails.`,
          `  Category must be one of: Technical,`,
          `  Security, Project, Operational,`,
          `  Compliance, Data Protection,`,
          `  Commercial, Resource.`,
        );
        break;

      case "pestle_analysis":
        lines.push(
          `- pestle_analysis: PESTLE analysis`,
          `  grounded in actual ticket context.`,
          `  Sections: Political, Economic, Social,`,
          `  Technological, Legal, Environmental.`,
          `  For each section: factor, impact on`,
          `  this client/project, likelihood,`,
          `  mitigation if relevant.`,
          ``,
          `  Only include sections with genuine`,
          `  content from the ticket data.`,
          `  Do not invent factors — if Economic`,
          `  has no relevant context write`,
          `  "No direct economic factors`,
          `  identified in this period."`,
          `  Technological factors should reference`,
          `  specific technologies from tickets.`,
          `  Legal factors should reference actual`,
          `  compliance work (GDPR, Cyber Essentials,`,
          `  DPA, safeguarding) from tickets.`,
        );
        break;

      case "issue_log":
        lines.push(
          `- issue_log: Current issues and`,
          `  blockers table with columns:`,
          `  ID (ISS-001…) | Date raised`,
          `  | Description | Raised by | Priority`,
          `  | Status | Owner | Resolution`,
          `  | Date resolved`,
          ``,
          `  Issues are current problems actively`,
          `  affecting delivery — not risks or`,
          `  future concerns.`,
          `  Description must be specific:`,
          `  "NAS backup failing for 4 days —`,
          `  VSS writer error on SQL instance"`,
          `  not "Backup issue."`,
          `  Resolution only populated when`,
          `  issue is closed — never TBC for`,
          `  open issues.`,
          `  Raised by should be the ticket owner`,
          `  or note author who flagged it.`,
        );
        break;

      case "decisions_log":
        lines.push(
          `- decisions_log: Decisions log with`,
          `  columns: ID (DEC-001…) | Date`,
          `  | Decision | Decision maker`,
          `  | Rationale | Impact | Alternatives`,
          `  | Status`,
          ``,
          `  Only include actual decisions from`,
          `  notes — not proposed actions or`,
          `  recommendations.`,
          `  Decision must be specific and`,
          `  unambiguous: "Agreed to extend`,
          `  NAS backup monitoring window to`,
          `  two consecutive successful overnight`,
          `  runs before closure" not "Decision`,
          `  made regarding backup."`,
          `  Rationale must reference the context:`,
          `  "Further bounce reports received from`,
          `  Hartigan & Co after SPF update."`,
          `  Alternatives must be genuine options`,
          `  that were available — never generic.`,
        );
        break;

      case "lessons_learned":
        lines.push(
          `- lessons_learned: Lessons learned`,
          `  structured as: Category | What went`,
          `  well | What to improve | Root cause`,
          `  | Recommendation | Owner | Status`,
          ``,
          `  Infer from patterns in ticket data:`,
          `  repeated issues = lesson about process,`,
          `  delayed approvals = lesson about`,
          `  stakeholder management,`,
          `  resolved incidents = lesson about`,
          `  detection and response.`,
          ``,
          `  What went well must be specific:`,
          `  "Manual backup restored within hours`,
          `  of VSS failure detection" not`,
          `  "Team responded well."`,
          `  Recommendation must be actionable:`,
          `  "Implement automated backup alerting`,
          `  to detect VSS failures before they`,
          `  reach 4 days without a successful run"`,
          `  not "Improve monitoring."`,
          `  Root cause must be honest — if it`,
          `  was a process gap, say so.`,
        );
        break;

      default:
        break;
    }
  }

  lines.push(
    "",
    "Return all enabled keys at the top",
    "level of the JSON object alongside",
    "standard keys. Use \"\" for any",
    "extended key not in the enabled list.",
  );

  return lines.join("\n");
}

export function emptyExtendedOutputsObject(): Record<ExtendedPmTabKey, string> {
  return Object.fromEntries(EXTENDED_PM_TAB_KEYS.map((k) => [k, ""])) as Record<
    ExtendedPmTabKey,
    string
  >;
}
