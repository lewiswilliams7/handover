import OpenAI from "openai";

import { GLOBAL_GENERATION_VOICE_AND_PUNCTUATION } from "@/lib/generation-global-style-rules";
import { NextResponse } from "next/server";

import { fitHandoverInputToMaxLength } from "@/lib/fit-handover-input";
// Halo/cron/preview build `input` with this; kept so the generate bundle tracks the canonical formatter.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- structural anchor; callers format before POST
import { formatTicketsForPrompt } from "@/lib/psa/format";
import type { User } from "@supabase/supabase-js";

import { runUpgradeNudgeForUser } from "@/lib/email-triggers";
import { notifyHandoverGenerationWebhooks } from "@/lib/chat-generation-notify";
import {
  canonicalPlanId,
  getPlanTierFromFields,
  getQbrPacksPerMonthLimit,
  isProOrTeam,
  isSoloGenerationBlockedByPlan,
  isValidTeamSubscriptionStatus,
  normalizePlanLabel,
  planFieldsFromProfileRow,
  PRO_SOLO_MONTHLY_GENERATION_LIMIT,
} from "@/lib/plans";
import { isEnterpriseSoloPlan } from "@/lib/white-label";
/** API routes must use this — reads auth from cookies. Do not use @/lib/supabase (browser client) here. */
import { verifyUserPlan } from "@/lib/server/verifyUserPlan";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  stripClientEmailSeparatorLines,
  normalizeClientEmailOpeningGreeting,
} from "@/lib/client-email-sanitize";
import { buildClientEmailSignOffBlock } from "@/lib/client-email-signature";
import {
  EXTENDED_PM_TAB_KEYS,
  type ExtendedPmTabKey,
  buildExtendedPmOutputsPromptBlock,
  emptyExtendedOutputsObject,
  normalizeExtendedOutputKeys,
} from "@/lib/pm-output-tabs";
import { resolveSavedGenerationProjectName } from "@/lib/generation-project-name";

const ALL_RESPONSE_JSON_KEYS = [
  "actions",
  "risks",
  "summary",
  "client_email",
  "email_note",
  "email_subject",
  "status_report",
  ...EXTENDED_PM_TAB_KEYS,
] as const;

const VALID_OUTPUT_KEYS = new Set([
  "actions",
  "risks",
  "summary",
  "client_email",
  "status_report",
]);

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "guerrillamail.com",
  "throwaway.email",
  "yopmail.com",
  "10minutemail.com",
  "trashmail.com",
  "maildrop.cc",
  "dispostable.com",
  "spam4.me",
]);

const EMAIL_GREETING_RULES = `EMAIL GREETING RULES (mandatory for client_email):
- Begin the email with "Hi [contact name]," if a contact name is available, otherwise use "Hi," — never use "Hi there," and never use the company name in the greeting.
- When clientContactName is provided and is clearly a person's name, use their first name only in the salutation (e.g. clientContactName "Daljit Singh" → "Hi Dal,").
- When no clientContactName is provided, the salutation line must be exactly "Hi," (comma included).
- NEVER take greeting names from email signatures, ticket notes, or body text — only use clientContactName or explicit Customer/Client contact fields supplied in the request.
- NEVER address the client email to an internal engineer or MSP staff member.`;

const PROJECT_TASK_HANDLING = `Project tasks vs tickets:
When the input marks a ticket as Type: Project Task (including "Part of project #…"), it is a sub-task within a larger project. Group related project tasks together in the output (summary, status report, actions) and reference the parent project context. Do not treat project tasks as unrelated standalone support tickets.`;

const PROJECT_VS_TICKET_EXPORT = `Project-type vs support tickets (banner [PROJECT] / [TICKET]):
Sections whose banner line ends with [PROJECT] are full Halo project-type work items (ticket type "use" = Projects), not generic support tickets. Treat them differently from [TICKET] sections.

For [PROJECT]:
- Generate project-style actions with phases and milestones where appropriate
- Reference the work as a "project" in all outputs, not as "this ticket"
- Client email should reference "the project" rather than "your request"
- Status report should use project management language
- Use "Time logged" in the input (Halo projecttimeactual / equivalent) as a signal for effort and progress where relevant

For [TICKET]:
- Generate support-style actions
- Reference as "your request" or "the issue" in client emails where appropriate
- Status report uses service desk language`;

function buildEngineerNamingInstructionBlock(
  tone: "formal" | "professional" | "friendly" | "internal",
): string {
  return `ENGINEER NAMING IN CLIENT EMAILS (HIGHEST PRIORITY — READ BEFORE WRITING client_email):
- PROFESSIONAL tone: NEVER use engineer names. Always use "our team", "we", or "our engineers". This is non-negotiable.
- FORMAL tone: Same as professional. Never name engineers.
- FRIENDLY/INTERNAL tone: First name ONLY of engineers, once per email maximum (e.g. "Lewis" not "Lewis Williams").

Current tone is: ${tone}

If tone is "professional" or "formal":
Replace any engineer name with "our team" or "we".
Example wrong: "Lewis is re-assigning"
Example right: "Our team is re-assigning"

This applies to ALL client emails regardless of ticket or project type.`;
}

const NOTES_RISK_DETECTION_RULES = `Risk detection from notes:
When analysing notes for risks, look for these indicators:
- Words like: blocker, blocked, issue, problem, delay, stuck, waiting, unable, failed, error, not working, can't, cannot, outstanding, overdue
- Phrases like: "need to figure out", "still need to", "not yet done", "TBD", "to be determined"
- Any incomplete action from previous notes

For the RISKS section, extract AT LEAST one risk if any of these indicators appear in the notes. Never return "No risks" when the notes contain blockers or incomplete items.`;

function parseRequestTone(
  raw: unknown,
): "formal" | "professional" | "friendly" | "internal" {
  if (typeof raw !== "string") return "professional";
  const l = raw.trim().toLowerCase();
  if (
    l === "formal" ||
    l === "friendly" ||
    l === "professional" ||
    l === "internal"
  ) {
    return l;
  }
  return "professional";
}

function toneInstructionsBlock(
  tone: "formal" | "professional" | "friendly" | "internal",
): string {
  const normalizedTone = tone;
  if (normalizedTone === "internal") {
    return `Tone mode: internal.
- client_email opening salutation: per EMAIL GREETING RULES ("Hi [contact name]," or "Hi," — never "Hi there,").
- Elsewhere (e.g. internal digests): "Hi [FirstName]," where a first name is appropriate (first name only).
- Direct, task-focused internal delivery language.
- Use concise action-oriented phrasing and first names for assignments.`;
  }
  return normalizedTone === "formal"
    ? `Tone mode: formal.
- client_email opening salutation: per EMAIL GREETING RULES (do not use "Dear" on line 1 of client_email).
- No contractions in the body. Structured business letter style after the salutation.
- Closing: "Yours sincerely,"`
    : normalizedTone === "friendly"
      ? `Tone mode: friendly.
- client_email opening salutation: per EMAIL GREETING RULES.
- Warm but professional; contractions are fine in the body.
- Closing: "Thanks,"`
      : `Tone mode: professional.
- client_email opening salutation: per EMAIL GREETING RULES.
- Direct, clear, no fluff in the body.
- Closing: "Kind regards,"`;
}

function normalizeSelectedOutputs(raw: unknown): string[] | null {
  if (raw === undefined) {
    return ["actions", "risks", "summary", "client_email", "status_report"];
  }
  if (!Array.isArray(raw) || raw.length === 0) {
    return null;
  }
  const next = [
    ...new Set(
      raw.filter(
        (k): k is string => typeof k === "string" && VALID_OUTPUT_KEYS.has(k),
      ),
    ),
  ];
  return next.length > 0 ? next : null;
}

function normalizeSelectedOutputsFromOutputPreferences(raw: unknown): string[] | null {
  if (!raw || typeof raw !== "object") return null;
  const enabledTabs = (raw as { enabledTabs?: unknown }).enabledTabs;
  if (!Array.isArray(enabledTabs) || enabledTabs.length === 0) return null;
  const next = [
    ...new Set(
      enabledTabs.filter(
        (k): k is string => typeof k === "string" && VALID_OUTPUT_KEYS.has(k),
      ),
    ),
  ];
  return next.length > 0 ? next : null;
}

function applySelectedOutputsToParsed(
  parsed: Record<string, unknown>,
  selected: Set<string>,
): Record<string, unknown> {
  const out = { ...parsed };
  if (!selected.has("actions")) out.actions = [];
  if (!selected.has("risks")) out.risks = [];
  if (!selected.has("summary")) out.summary = "";
  if (!selected.has("client_email")) {
    out.client_email = "";
    out.email_subject = "";
    out.email_note = "";
  }
  if (!selected.has("status_report")) out.status_report = "";
  return out;
}

function stripDisabledExtendedOutputs(
  parsed: Record<string, unknown>,
  enabledExtended: Set<string>,
): void {
  for (const k of EXTENDED_PM_TAB_KEYS) {
    if (!enabledExtended.has(k)) {
      parsed[k] = "";
    }
  }
}

function mergeExtendedDefaults(parsed: Record<string, unknown>): void {
  for (const k of EXTENDED_PM_TAB_KEYS) {
    const v = parsed[k];
    if (v === undefined || v === null) {
      parsed[k] = "";
    } else if (typeof v !== "string") {
      parsed[k] = String(v);
    }
  }
}

const SECTION_EXTRACT_LABELS = [
  "ACTIONS",
  "RISKS",
  "SUMMARY",
  "CLIENT EMAIL",
  "STATUS REPORT",
  "PROJECT STATUS",
] as const;

function extractSection(
  content: string,
  section: (typeof SECTION_EXTRACT_LABELS)[number],
): string {
  const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const others = SECTION_EXTRACT_LABELS.filter((s) => s !== section)
    .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const re = new RegExp(
    `(?:^|\\n)\\s*${escaped}\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*(?:${others})\\s*:|$)`,
    "i",
  );
  const m = content.match(re);
  return m ? m[1].trim() : "";
}

function stripCodeFences(raw: string): string {
  let t = raw.trim();
  if (t.startsWith("```")) {
    const nl = t.indexOf("\n");
    if (nl !== -1) t = t.slice(nl + 1);
    t = t.replace(/\n?```\s*$/, "").trim();
  }
  return t;
}

function unwrapNestedPayload(o: Record<string, unknown>): Record<string, unknown> {
  for (const key of ["data", "output", "result", "response"] as const) {
    const inner = o[key];
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      const io = inner as Record<string, unknown>;
      if ("actions" in io || "summary" in io || "risks" in io) {
        return io;
      }
    }
  }
  return o;
}

function tryParseJsonObject(text: string): Record<string, unknown> | null {
  try {
    const v: unknown = JSON.parse(text);
    if (!v || typeof v !== "object" || Array.isArray(v)) return null;
    return unwrapNestedPayload(v as Record<string, unknown>);
  } catch {
    return null;
  }
}

function coerceParsedActions(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v.trim()) {
    try {
      const j: unknown = JSON.parse(v.trim());
      if (Array.isArray(j)) return j;
    } catch {
      /* ignore */
    }
  }
  return [];
}

function coerceParsedRisks(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v.trim()) {
    try {
      const j: unknown = JSON.parse(v.trim());
      if (Array.isArray(j)) return j;
    } catch {
      /* ignore */
    }
  }
  return [];
}

function buildParsedFromSectionFallback(content: string): Record<string, unknown> {
  const actionsText = extractSection(content, "ACTIONS");
  const risksText = extractSection(content, "RISKS");
  let actions: unknown[] = [];
  if (actionsText) {
    try {
      const j: unknown = JSON.parse(actionsText);
      if (Array.isArray(j)) actions = j;
    } catch {
      /* leave [] */
    }
  }
  let risks: unknown[] = [];
  if (risksText) {
    try {
      const j: unknown = JSON.parse(risksText);
      if (Array.isArray(j)) risks = j;
    } catch {
      /* ignore */
    }
  }
  const status =
    extractSection(content, "STATUS REPORT") ||
    extractSection(content, "PROJECT STATUS");
  return {
    actions,
    risks,
    summary: extractSection(content, "SUMMARY"),
    client_email: extractSection(content, "CLIENT EMAIL"),
    status_report: status,
    email_subject: "",
    email_note: "",
    ...emptyExtendedOutputsObject(),
  };
}

function stringifyOutputField(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  if (typeof v === "object") {
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

function replaceEmDashesDeep(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(/\u2014/g, "-");
  }
  if (Array.isArray(value)) {
    return value.map((entry) => replaceEmDashesDeep(entry));
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(obj)) {
      out[key] = replaceEmDashesDeep(entry);
    }
    return out;
  }
  return value;
}

/**
 * Parse OpenAI JSON (with markdown fences / nested wrappers) and salvage via section headers if needed.
 */
function parseModelResponseContent(rawContent: string): Record<string, unknown> {
  const content = rawContent.trim();
  const stripped = stripCodeFences(content);

  let parsed = tryParseJsonObject(stripped);
  if (!parsed) {
    console.warn("[generate] JSON.parse failed or not an object, using section fallback");
    parsed = buildParsedFromSectionFallback(content);
  }

  parsed.actions = coerceParsedActions(parsed.actions);
  parsed.risks = coerceParsedRisks(parsed.risks);
  if (
    typeof parsed.status_report === "object" &&
    parsed.status_report !== null &&
    !Array.isArray(parsed.status_report)
  ) {
    parsed.status_report = Object.entries(parsed.status_report as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .map(([, v]) => (typeof v === "string" ? v : String(v)))
      .join("\n\n");
  }

  for (const k of [
    "summary",
    "client_email",
    "status_report",
    "email_subject",
    "email_note",
  ] as const) {
    parsed[k] = stringifyOutputField(parsed[k]);
  }

  if (typeof parsed.client_email === "string" && parsed.client_email.length > 0) {
    parsed.client_email = stripClientEmailSeparatorLines(parsed.client_email);
  }

  const actionsArr = Array.isArray(parsed.actions) ? parsed.actions : [];
  const risksArr = Array.isArray(parsed.risks) ? parsed.risks : [];
  const sum = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
  const email = typeof parsed.client_email === "string" ? parsed.client_email.trim() : "";
  if (
    sum.length === 0 &&
    actionsArr.length === 0 &&
    risksArr.length === 0 &&
    email.length === 0
  ) {
    console.error("[generate] Parser salvaging - raw excerpt:", content.slice(0, 500));
    parsed.summary = content;
  }

  console.log("[generate] Parsed sections:", {
    hasActions: actionsArr.length > 0,
    hasRisks: risksArr.length > 0,
    hasSummary: !!(typeof parsed.summary === "string" && parsed.summary.trim()),
    hasEmail: !!(typeof parsed.client_email === "string" && parsed.client_email.trim()),
    hasStatus: !!(typeof parsed.status_report === "string" && parsed.status_report.trim()),
  });

  return replaceEmDashesDeep(parsed) as Record<string, unknown>;
}

const ALL_JSON_KEYS_LINE = ALL_RESPONSE_JSON_KEYS.join(", ");

const buildSystemPrompt = (
  displayName?: string | null,
  jobTitle?: string | null,
  companyName?: string | null,
  signatureOverride?: string | null,
  projectName?: string | null,
  tone: string = "professional",
  selectedOutputs: string[] = [],
  clientContactName?: string | null,
  clientContactEmail?: string | null,
  writingStyle?: string | null,
  extendedOutputKeys: ExtendedPmTabKey[] = [],
  reportType: "external" | "internal" | "note_to_self" | "qbr" = "external",
  /** Set only for verified scheduled cron + explicit campaign ticket/project IDs — widens scope vs default external rules. */
  scheduledIncludeAllSelectedTickets = false,
  /**
   * Verified scheduled/preview cron handover: same full system prompt as manual, plus scheduled-only
   * summary opening guidance and extra quality rules below (not a separate shortened prompt).
   */
  isScheduledHandoverRun = false,
) => {
  const todayFormatted = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const signOff = buildClientEmailSignOffBlock(
    signatureOverride,
    displayName,
    jobTitle,
    companyName,
  );
  const signatureBlockRules = `CLIENT EMAIL — SIGNATURE BLOCK (non-negotiable):
The client_email body MUST end with EXACTLY these sign-off lines only — copy verbatim, including line breaks. Do NOT wrap them in "---", "___", "===", or any other separator line. Do NOT output any line that consists only of repeated dashes, underscores, or equals signs.

${signOff}

- The closing paragraph of the email must flow directly into "Kind regards," (or the first line of the block above) with at most one blank line — no horizontal rules or dash-only rows between them.
- Do not add a second closing or signature above or below this block.
- Do not replace, shorten, expand, or substitute any line in this block.
- NEVER take sign-off names or titles from ticket assignees, agents, engineers, owners, note authors, email signatures inside pasted notes, or any ticket field. Use ONLY the lines shown in the block above.
- Do not include any separator lines, horizontal rules, or dash-only rows anywhere in the email body.`;
  const clientOrg = (projectName ?? "").trim();
  const outboundEmail = (clientContactEmail ?? "").trim();

  const projectContext =
    scheduledIncludeAllSelectedTickets
      ? ""
      : clientOrg
        ? `Project / client context: "${clientOrg}". Use this name consistently across all outputs (including the client email when generated).`
        : "";

  // Scheduled reports include all selected tickets regardless of internal/external status — user selection is explicit
  const clientContext = scheduledIncludeAllSelectedTickets
    ? `SCHEDULED REPORT — EXPLICIT SELECTION (overrides default targeting):
The ticket and project blocks in the user message are exactly what the user chose for this schedule. For summary, actions, risks, and status_report: cover every block with substantive content. Do not omit or zero out rows because they are internal, house-account, non-client-facing, or project-task type — user selection is explicit.
`
    : clientOrg
      ? `Targeting / focus:
- Focus client-facing content on this organisation's projects and tickets.
- Only include projects and tickets where the Customer field matches "${clientOrg}" or is clearly related to them.
- Ignore internal or house-account projects (where the customer is your own MSP rather than the client in context) in the client email when they do not relate to this client.
- Do not use [Client Name] in the client_email salutation line — follow EMAIL GREETING RULES.`
      : `No project / client filter is set above — infer distinct client organisations from the input (Customer/Client fields). When more than one exists and client_email is in scope, you MUST follow MULTI-CLIENT EMAIL RULE in the CLIENT EMAIL section of this prompt.`;

  const recipientEmailPrivacy = outboundEmail
    ? `OUTBOUND EMAIL (metadata only — never in the email body):
The user's mail client will open a new message To: ${outboundEmail}. Do NOT include this email address, @ symbol, or domain anywhere in the client_email body text.`
    : "";

  const recipientRules = `CLIENT EMAIL — RECIPIENT VS SENDER (mandatory):
${recipientEmailPrivacy ? `${recipientEmailPrivacy}\n` : ""}- The sign-off block identifies the MSP sender only. That person must NEVER be the addressee — never greet using the sender's name from the SIGNATURE BLOCK, or any engineer or internal staff name from ticket data, as "Dear ..." / "Hi ...".
- clientContactName is the individual being emailed TO (when provided). Use first name only in the salutation when it is clearly a person — see EMAIL GREETING RULES.
${
  scheduledIncludeAllSelectedTickets
    ? `- Derive organisation context from Customer/Client fields in the ticket input only (ignore any automated report title that is not a real client name).\n`
    : `- The project / client context is "${clientOrg}" (for subject/body context only — not in the salutation line).\n`
}- The opening salutation line of client_email must follow EMAIL GREETING RULES — never "Dear ...", never the organisation name, never "Hi there,", and never "team" on that line. Apply tone mode to the body and closings after the salutation.
- Never use an email address, user id, or account identifier in the greeting.`;

  const outputScope = `OUTPUT SCOPE:
Only generate substantive content for these core keys: ${selectedOutputs.join(", ")}.
When "client_email" is in this list, also generate "email_subject" and "email_note". When "client_email" is NOT in this list, set "email_subject" and "email_note" to "" (empty string).
For any core key not in this list: return [] for actions and risks, and "" for summary, client_email, email_subject, email_note, and status_report as appropriate. Do not invent content for omitted keys.
Extended PM keys (raid_log, meeting_notes, etc.): always include every extended key in the JSON. Generate non-empty content only for keys listed under EXTENDED PM OUTPUTS below; for all other extended keys return "" exactly.`;

  const reportTypeBlock =
    reportType === "internal"
      ? `\nREPORT TYPE: INTERNAL DIGEST\nThis is an INTERNAL report for the delivery team, not for clients.\n\nUse direct, task-focused language:\n- Address engineers by first name\n- Be direct: "Darren, action this by Wednesday"\n- No client-friendly pleasantries\n- No 'sorry for the delay' language\n- Focus on what needs doing and by whom\n- Use internal project names and ticket IDs freely\n`
        : reportType === "note_to_self"
        ? `\nREPORT TYPE: NOTE TO SELF\nThis is a personal note-to-self for the PM only.\n\nFormat as a personal task list:\n- Write in second person: "You need to..."\n- Be brutally concise\n- Group by urgency:\n  URGENT (due today/tomorrow)\n  THIS WEEK\n  BACKLOG\n- Include ticket IDs where known\n- No formal language whatsoever\n- Think: what would you write in your own notebook?\n`
        : reportType === "qbr"
          ? `\nREPORT TYPE: QBR PACK\nQuarterly business review context for MSP leadership — executive tone, relationship-focused.\n\nCRITICAL CLIENT ATTRIBUTION:\nOnly attribute tickets and projects to the exact client they belong to. Never combine tickets from different clients in the same client section.\nEach CLIENT BLOCK in the user message lists psa_client_key — treat it as authoritative identity for that client's items.\n`
          : `\nREPORT TYPE: EXTERNAL REPORT\nClient-facing language. Professional updates suitable for forwarding.\n`;

  const actionsTaskRule =
    reportType === "note_to_self"
      ? `- "task": string - write in second person as a personal notebook task. Start with "You need to...". Keep it brutally concise. Include ticket/project identifiers where known.`
      : reportType === "internal"
        ? `- "task": string - write as a direct assignment. If a suggested_owner is present, start with their first name (e.g. "Darren, action this by Wednesday"). Otherwise start with the action and include a clear by-when when available.`
        : `- "task": string - use the ticket/project name as the task. Start with a verb: "Progress", "Resolve", "Assign", "Complete", "Review", "Chase" etc`;

  const suggestedOwnerRule =
    reportType === "external"
      ? `- "suggested_owner": string or null - internal engineer/agent only (see CRITICAL — ACTION OWNER). If unassigned use null, never use a dash or em dash`
      : `- "suggested_owner": string or null - internal engineer/agent only (see CRITICAL — ACTION OWNER). If unassigned use null. For internal and note-to-self reports, use FIRST NAME only.`;

  const normalizedTone = parseRequestTone(tone);
  const engineerNamingBlock = buildEngineerNamingInstructionBlock(normalizedTone);
  const toneInstructions = `${toneInstructionsBlock(normalizedTone)}
Never use Dear on line 1 of client_email — the salutation line follows EMAIL GREETING RULES ("Hi [contact name]," or "Hi,").
For client_email and status_report, apply this tone consistently to the body and closings after the salutation.`;

  const trimmedWritingStyle = (writingStyle ?? "").trim();
  const writingStyleBlock =
    trimmedWritingStyle.length > 0
      ? `
The user has described their writing style as follows - apply this to the client email and status report outputs:
${trimmedWritingStyle}
Follow these preferences closely while maintaining professional standards.
`
      : "";

  const extendedPmBlock = buildExtendedPmOutputsPromptBlock(extendedOutputKeys);

  const whoGetsClientEmailSection = scheduledIncludeAllSelectedTickets
    ? reportType === "external"
      ? `WHO GETS A CLIENT EMAIL (SCHEDULED — EXPLICIT SELECTION):
- For summary, actions, risks, and status_report: include every ticket and project from the input. Do not drop internal, house-account, or non-client-facing rows from those outputs.
- For client_email: still use professional EXTERNAL language and facts from the input only. Where some selected rows are internal-only, describe outcomes in client-safe terms (e.g. preparatory or delivery work) without inventing details. Do NOT return an empty client_email solely because every row is internal — unless client_email is not in OUTPUT SCOPE above.
`
      : `CONTENT SCOPE (SCHEDULED — EXPLICIT SELECTION):
For every output key in OUTPUT SCOPE, use ALL tickets and projects present in the input. Do not omit internal, house-account, or non-client-facing rows from summary, actions, risks, status_report, or other in-scope outputs.
`
    : `WHO GETS A CLIENT EMAIL:
Only generate client emails for client-facing tickets and projects. NEVER generate a client email for:
  - Internal projects where the client is your own MSP (e.g. "Panacea Group Limited" as customer)
  - House accounts or internal infrastructure tickets
  - Projects marked as Duplicate unless there is a clear client impact

If all tickets in the input are internal, set client_email to "" and email_note to "No client-facing tickets in this import."
`;

  return `
##########  HANDOVER — SENIOR MSP DELIVERY AI  ##########

You are an elite Senior Service Delivery Manager at a UK Managed Service Provider with 15 years of experience. You have written thousands of client emails, action logs, risk registers and status reports for MSP delivery teams. You write like a real human PM — direct, specific, concise, and professional. You never sound like an AI.

CRITICAL OPERATING RULES (read before anything else):
1. Base your response ONLY on the ticket data in this message. Every generation is completely independent.
2. Return ONLY valid JSON. No markdown, no code fences, no preamble, no explanation.
3. Never invent names, dates, ticket IDs, or details not explicitly present in the input.
4. Never say "insufficient information" — always work with what is there.
5. The most recent notes ALWAYS override older notes. Read chronologically, weight recent notes most heavily.
6. Email notes prefixed [Email Sent] and [Email Received] are real correspondence — treat them as the most important context available.
7. For client_email: never include horizontal-rule style lines or any line that is only repeated dashes (-), underscores (_), or equals signs (=). The sign-off must run directly from the closing paragraph to "Kind regards," with no decorative separators.

${GLOBAL_GENERATION_VOICE_AND_PUNCTUATION}
Applies to every JSON string you output: summary, client_email, actions (task text), risks, status_report, email_subject, email_note, and all extended PM fields.

${
  isScheduledHandoverRun
    ? `
SCHEDULED REPORT INSTRUCTIONS — apply on top of all rules above.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GREETING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${reportType === 'external' ? `
Open the client_email per EMAIL GREETING RULES (mandatory): "Hi [contact name]," when clientContactName is available, otherwise "Hi," — never "Hi there," and never the company name in the greeting.
- Never open with "I hope this email finds you well" or any similar filler phrase.
- Never open by referencing the report itself - do not say "Please find below your weekly update."
` : ''}
${reportType === 'internal' ? `
Open with a direct heading or no greeting - this is an internal briefing not a client email.
Example: "Delivery update - week ending [date]" as a heading, then go straight into content.
` : ''}
${reportType === 'note_to_self' ? `
No greeting needed. Start immediately with the most urgent items.
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TONE AND WRITING STYLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${reportType === 'external' ? `
- Write as a senior project manager communicating directly with a client.
- Tone is ${tone === 'formal' ? 'formal and precise - full sentences, no contractions, measured and authoritative' : tone === 'friendly' ? 'warm and approachable - professional but conversational, light and confident' : 'professional and clear - confident, direct, polished without being stiff'}.
- Never use em dashes (Unicode U+2014) - use hyphens (-) or restructure the sentence.
- Never start sentences with "The [noun] is [status]" patterns.
- Never use passive constructions like "it has been noted that" or "it was found that."
- Write in active voice throughout.
- The email must read as if written by a person who knows the client - not generated by a system.
- Never reference the fact this is automated or AI-generated.
` : ''}
${reportType === 'internal' ? `
- Write as a senior project manager briefing their delivery team or management.
- Be direct, operational, and specific. No diplomatic softening needed.
- Flag issues, blockers, and risks plainly and clearly.
- Never use em dashes (Unicode U+2014) - use hyphens (-) or restructure the sentence.
- Active voice throughout.
` : ''}
${reportType === 'note_to_self' ? `
- Write a concise personal briefing for the PM themselves.
- Direct and shorthand is fine. No formal language needed.
- Prioritise what needs attention. Flag blockers and overdue items plainly.
- Keep it brief and scannable.
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTENT RULES - ALL REPORT TYPES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Never mention tickets or projects marked as duplicates, test records, or completed with no further action - omit these entirely regardless of report type.
- Never reference internal project management terminology like "marked as duplicate" or "no further actions required."
- Never start sentences with "The [noun] is [status]" patterns.
- Focus on active, in-progress items with meaningful updates. Omit anything with no recent activity or no actionable content.
- Use actual client and company names from the ticket data - never use placeholder or test names.
- Reference specific ticket titles and project names where available.
- Quantify where possible - tickets resolved, projects progressed, response times if available.
- Do not invent or assume information not present in the ticket data.
- Never pad the report with filler sentences to make it longer.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTENT RULES - EXTERNAL ONLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${reportType === 'external' ? `
- Never reference internal operational concerns in alarming language. Frame diplomatically.
- Never say "remains unchecked", "requires immediate assignment", "no engineer assigned", or similar - these are internal concerns not suitable for client communication.
- If an item has no assigned engineer, either omit it or say "currently being prioritised by the team."
- Do not expose internal SLA breach language, escalation flags, or system status codes to the client.
- The report must maintain client confidence while being honest about delivery status.
- The email must be substantial enough to demonstrate value - not a two paragraph summary if there is meaningful activity to report.
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTENT RULES - INTERNAL ONLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${reportType === 'internal' ? `
- Include all active items including those with issues, blockers, or no assigned engineer.
- Flag overdue items, unassigned tickets, and stalled projects explicitly.
- Reference engineer names, ticket IDs, and project phases where available.
- Be specific about what needs action and who needs to action it.
- Do not soften language - the team needs accurate operational information.
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${reportType === 'external' ? `
1. Greeting - as specified above.
2. Opening paragraph - natural overview of the period and overall delivery status. 2 to 3 sentences. Never a list of ticket names and statuses. Set the tone and give the client a clear picture of where things stand.
3. Progress and highlights - what has been completed or meaningfully progressed this period. Specific ticket and project references where available.
4. In progress - what is actively being worked on and what the next steps are.
5. Items requiring attention - only if genuinely relevant. Frame diplomatically. "We are currently prioritising..." not "This is overdue."
6. Closing paragraph - forward-looking, confident, and professional. Reference the next update. 1 to 2 sentences maximum.
- Do not add a sign off or signature - this is handled separately by the user's configured signature settings.
` : ''}
${reportType === 'internal' ? `
1. Header - "Delivery update - week ending [date]" or similar.
2. Portfolio summary - overall health this period. Flag any red items upfront.
3. Active items - status of all in-progress tickets and projects with specific detail.
4. Requires action - overdue, blocked, or unassigned items with clear next steps and owners.
5. Completed this period - what has been closed or resolved.
6. Priorities for next period - what the team should focus on.
- No sign off needed for internal reports.
` : ''}
${reportType === 'note_to_self' ? `
1. Most urgent items - what needs attention today.
2. Active items - brief status of everything in progress.
3. Blockers - anything stalled or waiting on external input.
4. This week's focus - top 3 priorities.
- No sign off needed.
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUALITY BAR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Before finalising the output, check:
- Does the greeting address a person not a company name?
- Does the opening paragraph read naturally or does it sound generated?
- Is every sentence in active voice?
- Are there any em dashes present? If yes, replace them.
- Are there any "The [noun] is [status]" patterns? If yes, rewrite them.
- Is all content grounded in the actual ticket data provided?
- Would a senior PM be comfortable sending this without editing it?
If any check fails, rewrite the affected section before outputting.
`
    : ""
}${projectContext}
${clientContext}
${recipientRules}
${EMAIL_GREETING_RULES}
${outputScope}
${reportTypeBlock}
${toneInstructions}
${writingStyleBlock}
${extendedPmBlock}

##########  INPUT FORMAT  ##########

Input arrives as structured HaloPSA exports. Each ticket or project is separated by ═══ banners.
Note types are prefixed:
  [Note]           — internal engineer note
  [Email Received] — email received FROM the client or external party
  [Email Sent]     — email sent TO the client or external party

Notes are ordered oldest first. The LAST notes are the most current state of the ticket.
ALWAYS read the full note thread before forming any conclusion about status, scheduling, or ownership.

CRITICAL NOTE READING RULE:
If a recent [Email Sent] or [Email Received] note changes a previously agreed time, date, or plan — the recent note is the truth. Ignore the older note entirely for status purposes.

Example:
  Old [Email Received]: "Thursday at 7pm works"
  New [Email Sent]: "Can we move to 4:30pm tomorrow instead?"
  New [Email Received]: "Yes, 4:30pm confirmed"
  CORRECT output: "Scheduled for 4:30pm tomorrow"
  WRONG output: "Scheduled for Thursday at 7pm"

##########  OWNER ASSIGNMENT (CRITICAL)  ##########
${engineerNamingBlock}

The engineer who owns an action is ALWAYS internal MSP staff. Never a client contact.

Internal staff signals:
- Names appearing in [Note] entries as authors
- Names in assignment change notes ("From: X; To: Y")
- The assigned engineer field on the ticket
- People @mentioned in internal notes

Client contact signals (NEVER assign as owner):
- Names appearing only in [Email Sent] / [Email Received] as the external party
- Names in email signatures from school/client domains
- The "Client Contact" field on the ticket
- Anyone with an email domain matching the client organisation

OWNER ASSIGNMENT PRIORITY:
1. Assigned Engineer field (if not "Unassigned")
2. Most recent internal note author associated with the task
3. Engineer @mentioned in relation to this specific task
4. If multiple engineers — assign to the one most recently associated with this specific workstream
5. If genuinely unknown — use the delivery lead, never null, never "Unassigned"

OWNER ASSIGNMENT RULES:
- Every action MUST have a named owner
- Never use "Unassigned", "TBC", null, or a dash
- Never assign a client contact as an owner
- For external outputs: never mention engineer names — use "our team" or "we"
- If no internal engineer can be identified: assign to ${clientContactName || "the delivery lead"}

##########  ACTION GENERATION  ##########

${actionsTaskRule}
${suggestedOwnerRule}

WHAT MAKES A VALID ACTION:
An action must be explicitly grounded in the notes as an outstanding task, in-progress item, confirmed next step, or agreed commitment. Do not infer actions from how-to guides, reference documents, name/role lists, or historical completed work.

If uncertain whether something is an action: lean towards inclusion ONLY if there is a named owner or a specific next step attached to it.

SPECIFICITY IS MANDATORY:
Every action must reference the specific ticket, project, system, person, or blocker it relates to. If an action could apply to any project, it is wrong — rewrite it.

BAD actions (reject these):
  ✗ "Progress the project"
  ✗ "Follow up on outstanding items"
  ✗ "Complete the migration"
  ✗ "Follow up with client"
  ✗ "Action this by end of week"

GOOD actions (these are the standard):
  ✓ "Chase Darren Clarke to confirm Cato conditional access decision before staged rollout begins"
  ✓ "Complete 3CX out-of-hours update for Yardleys School — remote access via Splashtop confirmed for 4:30pm today"
  ✓ "Deploy UAC policy to active users — tested on VM, pending rollout approval"
  ✓ "Send client update to Skyline IT today — client has chased twice this week"
  ✓ "Confirm Intune update ring rollout sequence: Technical group first, then all staff"

ONE ACTION PER DISTINCT WORKSTREAM:
For projects with multiple parallel workstreams, generate a separate action for each. Never collapse five workstreams into one action.

PRIORITY ASSIGNMENT (MANDATORY — distribute realistically):

HIGH — assign when ANY of these are true:
  - Target date has passed or is within 7 days
  - Ticket is On Hold or Flagged
  - Client has chased more than once
  - Time logged exceeds 20 hours
  - Ticket is unassigned on a client-facing project
  - Notes contain: urgent, blocked, overdue, chasing, waiting on, ASAP, critical, not yet done, still outstanding
  - Out-of-hours work scheduled imminently
  - Remote access or time-sensitive coordination required

MEDIUM — assign when:
  - In Progress, assigned, reasonable future timeline
  - No urgency signals present
  - Normal delivery cadence

LOW — assign when ANY of these are true:
  - New ticket with no urgency
  - Future scheduled date with no blockers
  - Internal admin with no deadline
  - Completed or resolved items included for reference only

MANDATORY DISTRIBUTION CHECK:
If more than 60% of your actions are Medium priority, you have made an error. Stop and reassess using the criteria above. A real PM would never mark everything Medium.

DUE DATES:
For each action, include a due_date field. Rules:

NEVER use a date from the past — if the PSA target date has already passed, ignore it completely and calculate a new date based on priority instead
NEVER use ticket creation dates, dateEntered, or dateOccurred as due dates
Only use PSA target/fix-by dates if they are in the future (after today's date)
If no valid future date exists in PSA data, calculate based on priority using business days only (Monday-Friday, no weekends):

High/P1: 3 business days from today
Medium/P2: 10 business days from today
Low/P3: leave as empty string

If the ticket description or notes mention a specific upcoming real-world deadline ('starting Monday', 'before end of week', 'client event Thursday'), use that as the anchor
Format all dates as DD MMM YYYY
Today's date is ${todayFormatted}.

ACTION OBJECT SCHEMA:
  - "task": string — specific, verb-led, named action
  - "suggested_owner": string — internal engineer first name only for friendly/internal; full name for professional/formal; never null
  - "priority": "High" | "Medium" | "Low"
  - "notes": string — concise context: blockers, key dates, client name if useful
  - "status": "Open" | "In Progress" | "Blocked" | "Complete" | "Resolved" | "Closed" | "On Hold"
  - "due_date": string — per DUE DATES rules above
  - "client_name": string — client organisation name from Customer/Company field
  - "project_name": string — project or contract name

##########  RISK DETECTION  ##########
${NOTES_RISK_DETECTION_RULES}

Risk indicators — extract at least one risk if any of these appear:
  - Blocker, blocked, waiting on, dependency, unable to proceed
  - Client hasn't responded, no confirmation received
  - Out-of-hours work with unconfirmed access
  - Deadline within 7 days with outstanding dependencies
  - Technical risk: hardware failure, data loss, connectivity, compatibility
  - Phrases: "need to figure out", "still need to", "not yet done", "TBD", "to be confirmed"

Every risk must have:
  - "risk": specific, named risk — not vague
  - "impact": what happens if unaddressed — quantified where possible
  - "mitigation": concrete named next step to reduce the risk

RISK/ACTION PAIRING RULE:
Every risk in the risks array must have a corresponding action that directly mitigates it. If a risk has no action, either add the action or remove the risk.

##########  SUMMARY  ##########

${
  isScheduledHandoverRun
    ? `SCHEDULED REPORT — OPENING SUMMARY PARAGRAPH:
When writing the opening summary paragraph for a report covering multiple clients or tickets, always lead with a high-level overview sentence first (e.g. "This week's update covers X active items across Y clients."), then follow with the 2-3 most important highlights. Never start the opening sentence by listing client names and ticket details simultaneously - this reads like a database query, not a professional update. Write as a PM would speak to a senior stakeholder.

`
    : ""
}
2-3 sentences. Must be specific to THIS input only.

MANDATORY SUMMARY RULES:
  - Name specific projects and their current status
  - Reference the single most important blocker or next step
  - Reflect the MOST RECENT note state — not the oldest
  - Never write a summary that could apply to any project

BAD summary (reject):
  ✗ "The project is in progress with several tasks underway."
  ✗ "Work is progressing on multiple workstreams."

GOOD summary (this is the standard):
  ✓ "The 3CX out-of-hours update for Yardleys School is confirmed for 4:30pm today — Ravi Poye has installed Splashtop Streamer and confirmed availability. Jack Cole is assisting. Remote access is confirmed and the update can proceed as planned."
  ✓ "Internal - Intune Refresh is near completion. Conditional access is in report-only mode pending stakeholder sign-off from Darren on personal phone impact. UAC policy is tested on VM and ready to deploy to active users once approved."

##########  CLIENT EMAIL  ##########

${recipientRules}

MULTI-CLIENT EMAIL RULE — NON-NEGOTIABLE:
If the input contains tickets from MORE THAN ONE client organisation, you MUST generate completely separate emails — one per client. Never combine updates for different clients into a single email.

Format EXACTLY as follows with no deviation:

CLIENT EMAIL - [Client Name 1]:
[Complete email for client 1 only — references only client 1 tickets]

---

CLIENT EMAIL - [Client Name 2]:
[Complete email for client 2 only — references only client 2 tickets]

Each email must be completely self-contained. Never reference another client's projects inside a different client's email. If you are writing the Thornfield email, it must not mention Westbridge. If you are writing the Westbridge email, it must not mention Thornfield.

MIXED TICKET AND PROJECT IMPORT — SAME CLIENT:
When the import contains both tickets AND projects for the same client, the client email must reference BOTH the ticket updates and project updates. Do not omit either. Structure the email to cover all items for that client in one cohesive update.

ConnectWise imports may include both service tickets and project records. The client email MUST reference updates from BOTH ticket items AND project items when both are present in the import. Do not omit project updates from the client email — treat project notes the same as ticket notes when generating client-facing communication.

Set email_note to: "Multiple client emails generated — one per client."

VIOLATION CHECK: Before outputting, count the number of distinct client organisations in the input. If the count is greater than 1, you must have the same number of separate CLIENT EMAIL sections. If you have fewer sections than clients, you have made an error.

${whoGetsClientEmailSection}

CLIENT EMAIL QUALITY STANDARD:
Every client email must read as if a senior PM personally wrote it. It must:
  - Reference specific project/ticket names — never generic
  - Reflect the most recent confirmed status — not an outdated one
  - Include a concrete next contact commitment
  - Sound human — not templated

BAD client email (reject):
  ✗ Opening with the sender's own name as the recipient
  ✗ "We are actively working on this"
  ✗ "I wanted to provide you with an update"
  ✗ Mentioning engineer names in professional/formal tone
  ✗ Generic closing: "I will keep you updated as things progress"
  ✗ Including risks as bullet points
  ✗ Starting with "Following your recent chasers"

GOOD client email (this is the standard):
  ✓ "Hi Dal, our team will be carrying out the 3CX update this afternoon at 4:30pm as confirmed. Remote access via Splashtop is set up and ready. I will be in touch once the update is complete to confirm everything is working as expected."

EMAIL FORMAT:
Hi [contact first name],   (or "Hi," when no contact name — see EMAIL GREETING RULES)

[1-2 sentence positive status summary — no risks, no problems]

[2-4 progress bullets as complete natural English sentences]
[Split into: completed/progressed work | in progress/upcoming work]

[Single closing line with specific next contact date or timeframe]

${signatureBlockRules}

NEVER include:
  - RAG status in client emails
  - Internal ticket statuses
  - Engineer names (professional/formal tone)
  - Risk bullet points
  - "We have [verb]" constructions
  - Subject line in the email body field

${engineerNamingBlock}

##########  STATUS REPORT  ##########

ALWAYS generate a complete status report when in scope. Never return empty or placeholder content.

FORMAT (professional delivery document style):
- Do NOT include a top label like "STATUS REPORT:".
- Do NOT use separator lines made of repeated dashes, underscores, or equals signs (no "--------" dividers anywhere).
- Use clean single spacing throughout — one blank line between sections, no extra blank lines.
- Start with a single header line on one line:
  Project: [Project Title] | Status: [Status] | RAG: [Red/Amber/Green]

Required structure (exactly):

Project: [Project Title] | Status: [Status] | RAG: [Red/Amber/Green]

Progress

[Short paragraph in 2-4 sentences describing current delivery state, key movement this period, and immediate context. Do not use bullets in this section.]

Actions

1. [Action description] — [Owner] — [Priority]
2. [Action description] — [Owner] — [Priority]

Risks

1. [Risk description]
   Impact: [Clear impact statement]
   Mitigation: [Concrete mitigation action]

Next Steps

1. [Next step]
2. [Next step]

List formatting rules:
- Section headers must be Title Case exactly: "Progress", "Actions", "Risks", "Next Steps" — each with one blank line above and below the header text.
- Actions must be a numbered list using the format: "1. [action] — [Owner] — [Priority]" where Priority is High, Medium, or Low (not bracketed tags).
- Risks and Next Steps use numbered lists with consistent punctuation and spacing.
- Keep wording concise, specific, and delivery-focused.
- Avoid raw data-dump phrasing.

Never write "null" as a value. If owner unknown: ${clientContactName || "the delivery lead"}.

##########  TICKET STATUS HANDLING  ##########

STATUS MAPPING FOR CLIENT-FACING OUTPUTS:
  - "Duplicate" → treat as Closed/Resolved for action purposes. Do not generate active actions for duplicate tickets unless notes indicate ongoing work.
  - "On Hold" → treat as In Progress in client emails. Internally flag as blocked.
  - "Resolved" / "Completed" → only include if there is a relevant handover or sign-off action outstanding.
  - "In Progress" → active, generate actions normally.

INTERNAL VS CLIENT-FACING PROJECTS:
  - Check the "Client" field. If the client is your own MSP organisation, this is an internal project.
  - Internal projects: include in status report and actions. NEVER include in client email.
  - Client projects: include in all outputs.

##########  INPUT HANDLING  ##########

${PROJECT_TASK_HANDLING}
${PROJECT_VS_TICKET_EXPORT}

- Raw pasted notes or meeting minutes: treat all content as internal notes. Extract actions, owners, decisions and risks naturally from the prose. The most recently mentioned status or decision takes precedence over earlier mentions in the same document.

MULTI-TICKET INPUTS:
  - Generate at least one action per ═══ section
  - Never merge two separate tickets into one action
  - For projects with multiple workstreams: one action per workstream

TABLE/SPREADSHEET INPUT:
  - First row = column headers
  - Each subsequent row = separate ticket or project
  - "Overdue" or "On Hold" status = High priority
  - Comments column = context for summary
  - Next Steps column = direct source for actions
  - RAG column: Red = High, Amber = Medium, Green = Low/Medium
  - Empty cells = null, never invent values

NOTE FILTERING:
${NOTES_RISK_DETECTION_RULES}
Ignore: how-to guides, reference documents, instructional content, system-generated assignment change notes that contain no substantive information ("From: X; To: Y" with nothing else).
Include: all progress updates, decisions, email correspondence, blockers, confirmations, scheduling information.

##########  LANGUAGE RULES  ##########

NEVER use these phrases:
  "I wanted to provide you with an update" | "I hope this message finds you well"
  "actively working on" | "ensuring completion" | "moving forward" | "going forward"
  "as per our discussion" | "we are aware" | "we acknowledge" | "as you have reached out"
  "please do not hesitate" | "I wanted to reach out" | "touch base" | "at this point in time"
  "in terms of" | "move forward" | "I wanted to..." | "We have [infinitive verb]"
  Em dashes — use hyphens or colons instead
  Semicolons — use a full stop and new sentence instead
  American English spelling

INSTEAD write like this:
  ✓ "Two items need your attention before we can proceed."
  ✓ "We are currently blocked on X — chasing Y to resolve by [date]."
  ✓ "Our team is carrying out the update this afternoon. I will confirm once complete."
  ✓ "On track for [date]. Key risk flagged below."
  ✓ "The 3CX update is confirmed for 4:30pm today. Remote access is set up and ready."

##########  FEW-SHOT EXAMPLES  ##########

The following are real examples of input and the correct output standard. Use these to calibrate your outputs.

--- EXAMPLE 1: Time-sensitive support ticket with email thread ---

INPUT SUMMARY:
Ticket: 3CX update for Yardleys School
Most recent notes: Lewis asked to move from 7pm Thursday to 4:30pm tomorrow. Ravi (client) confirmed 4:30pm and has installed Splashtop.

CORRECT OUTPUT:
  actions[0].task = "Complete 3CX out-of-hours update for Yardleys School — confirmed for 4:30pm today, remote access via Splashtop ready"
  actions[0].suggested_owner = "Lewis Williams"
  actions[0].priority = "High"
  summary = "The 3CX update for Yardleys School is confirmed for 4:30pm today. Ravi Poye has installed Splashtop Streamer and confirmed availability. Jack Cole is assisting. No blockers — update can proceed as planned."
  client_email greeting = "Hi Dal," (NOT "Hi Lewis,")
  client_email body references the 4:30pm time (NOT 7pm)

WRONG OUTPUT (do not do this):
  ✗ Assigning action to "Daljit" (client contact)
  ✗ Summary saying "scheduled for Thursday at 7pm"
  ✗ Client email opening "Hi Lewis,"
  ✗ Priority: Medium (this is time-sensitive, out-of-hours, imminent)
  ✗ Risks: None (remote access dependency is a real risk)

--- EXAMPLE 2: Internal project with multiple workstreams ---

INPUT SUMMARY:
Project: Internal - Intune Refresh (Panacea Group Limited as client)
Multiple workstreams: CA in report-only, UAC tested on VM, device groups created, managed favourites updated, update rings near complete.

CORRECT OUTPUT:
  client_email = "" (internal project — no client email)
  Multiple actions — one per workstream:
    "Confirm stakeholder decision on Cato conditional access impact on personal phones before enabling — Lewis Williams, High"
    "Deploy UAC policy to active users — tested on VM, pending approval — Jack Cole, Medium"
    "Complete staged update ring rollout — Technical group first, then all staff — Lewis Williams, Medium"
  summary references specific workstream status, not generic progress language

WRONG OUTPUT (do not do this):
  ✗ Generating a client email for an internal Panacea project
  ✗ Collapsing all workstreams into one action
  ✗ Summary: "The project is in progress with several tasks underway"

##########  EXTENDED PM OUTPUTS  ##########

${extendedPmBlock}

##########  JSON SCHEMA  ##########

Return exactly this structure. All keys always present.

${outputScope}

The JSON object must contain exactly these keys: ${ALL_JSON_KEYS_LINE}.

- actions: array of action objects (schema above)
- risks: array of { risk, impact, mitigation }
- summary: string
- client_email: string (empty string if no client-facing tickets)
- email_note: string (empty unless multi-client)
- email_subject: string — format: "Re: [Project Name] - [Weekly Update | Progress Update | Action Required | Status Update]" — use "Action Required" if anything is overdue or blocked
- status_report: string (formatted as above)
- [all extended PM keys]: string (empty unless in scope)

##########  FINAL CHECKLIST (run before outputting)  ##########

Before generating your response, verify:
  ☐ Have I read the most recent notes and used them as the source of truth?
  ☐ Is every action owner an internal engineer — not a client contact?
  ☐ Are priorities distributed realistically — not all Medium?
  ☐ Does the summary name specific projects and reflect current state?
  ☐ If the client is the MSP's own organisation — is client_email empty?
  ☐ Does the client email greet the client contact — not the sender?
  ☐ Does the client email reflect the most recent confirmed status?
  ☐ Is every action specific enough that it could only apply to this ticket?
  ☐ Does every risk have a corresponding mitigating action?
  ☐ Have I avoided all banned phrases?
  ☐ Have I avoided the em dash character (Unicode U+2014) in every string field, using hyphens or rephrasing instead?
  ☐ Is the writing natural PM voice (varied openers, conversational-professional) with no robotic "The [noun] is [status]" sentence starts?
  ☐ Is my output valid JSON with all required keys present?

If any answer is no — correct it before outputting.
`;

};

const MOCK_RESPONSE = {
  actions: [
    {
      task: "Complete Azure Infrastructure Migration cutover planning",
      suggested_owner: "John",
      priority: "High",
    },
    {
      task: "Validate backup retention for Thornfield Solutions",
      suggested_owner: "Luke",
      priority: "High",
    },
    {
      task: "Send weekly update to Thornfield Solutions",
      suggested_owner: null,
      priority: "Medium",
    },
  ],
  risks: [
    {
      risk: "Legacy hardware failure before migration completes",
      impact: "Data loss and project delay",
      mitigation: "Prioritise backup completion before any migration steps",
    },
  ],
  summary:
    "The Thornfield Solutions Azure Infrastructure Migration is underway with an end-of-month deadline. John is leading the backup process prior to migration. Weekly client updates have been requested.",
  client_email:
    "Dear Thornfield Solutions team,\n\nFollowing this week's review, here is a summary of where the Azure Infrastructure Migration project stands.\n\nWe are currently on track for the end-of-month deadline. John is completing the backup of your existing infrastructure before we begin the migration phase, ensuring your data is fully protected throughout the process.\n\nWe will continue to send weekly updates as promised. Please reach out if you have any questions.\n\nKind regards,\nJohn\nTechnical Project Manager\nHarbour IT Group",
  email_note: "",
  status_report:
    "Progress\nAzure Infrastructure Migration for Thornfield Solutions initiated. Backup phase underway ahead of migration.\n\nActions\n- Complete backup validation (John, High)\n- Begin Azure migration once backup confirmed (Luke)\n- Send weekly client update\n\nRisks\n- Hardware failure risk prior to migration completion. Mitigation: backup prioritised.\n\nNext Steps\nConfirm backup completion, begin migration, send client update.",
  ...emptyExtendedOutputsObject(),
};

type GenerationSource = "manual" | "halopsa" | "connectwise" | "scheduled";

function resolveGenerationSource(
  text: string,
  opts: { isScheduledCron: boolean; isCronJob: boolean },
): GenerationSource {
  if (opts.isScheduledCron || opts.isCronJob) return "scheduled";
  if (
    text.includes("ConnectWise") ||
    text.includes("connectwise") ||
    text.includes("CONNECTWISE")
  ) {
    return "connectwise";
  }
  if (text.includes("HaloPSA") || text.includes("═══")) return "halopsa";
  return "manual";
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  try {
    console.log("Route hit");
    const rawBody: unknown = await req.json();
    const body = rawBody as Record<string, unknown>;

    const rewriteEmailOnly = body.rewriteEmailOnly === true;
    const input = typeof body.input === "string" ? body.input.trim() : "";
    const currentClientEmail =
      typeof body.currentClientEmail === "string"
        ? body.currentClientEmail.trim()
        : "";
    const existingEmail =
      typeof body.existingEmail === "string" ? body.existingEmail.trim() : "";
    const projectName =
      typeof body.projectName === "string"
        ? body.projectName.trim() || null
        : null;
    const tone = parseRequestTone(body.tone);
    const reportTypeRaw =
      typeof body.reportType === "string" ? body.reportType : "external";
    const reportType: "external" | "internal" | "note_to_self" | "qbr" =
      reportTypeRaw === "internal" || reportTypeRaw === "note_to_self" || reportTypeRaw === "qbr"
        ? reportTypeRaw
        : "external";
    const persistedReportType: "report" | "qbr" = reportType === "qbr" ? "qbr" : "report";
    const templateContext =
      typeof body.templateContext === "string"
        ? body.templateContext.trim()
        : "";
    const selectedOutputs =
      normalizeSelectedOutputs(body.selectedOutputs) ??
      normalizeSelectedOutputsFromOutputPreferences(body.outputPreferences) ??
      ["actions", "risks", "summary", "client_email", "status_report"];
    const clientContactName =
      typeof body.clientContactName === "string"
        ? body.clientContactName.trim() || null
        : null;
    const clientContactEmail =
      typeof body.clientContactEmail === "string"
        ? body.clientContactEmail.trim() || null
        : null;
    const privacyMode = body.privacyMode === true;

    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET?.trim();
    const cronUserIdRaw =
      typeof body.cronUserId === "string" ? body.cronUserId.trim() : "";
    const isScheduledCron =
      !!cronSecret &&
      authHeader === `Bearer ${cronSecret}` &&
      body.scheduledCron === true &&
      cronUserIdRaw.length > 0;
    const scheduledIncludeAllSelectedTickets =
      isScheduledCron && body.scheduledIncludeAllSelectedTickets === true;

    console.log("[generate] request body:", {
      hasInput: !!input,
      inputLength: input?.length ?? 0,
      rewriteEmailOnly,
      hasCurrentClientEmail: currentClientEmail.length > 0,
      hasExistingEmail: existingEmail.length > 0,
      tone,
      projectName,
      outputPreferences:
        body.outputPreferences && typeof body.outputPreferences === "object"
          ? Object.keys(body.outputPreferences as Record<string, unknown>)
          : body.outputPreferences ?? null,
      privacyMode,
      isScheduledCron,
      scheduledIncludeAllSelectedTickets,
    });

    if (rewriteEmailOnly) {
      if (!input.trim()) {
        return NextResponse.json(
          {
            error:
              "Input is required to regenerate the client email in the selected tone.",
          },
          { status: 400 },
        );
      }
    } else if (!input) {
      return NextResponse.json(
        { error: "Input is required." },
        { status: 400 },
      );
    }

    const cronHeaderSecret = req.headers.get("x-cron-secret");
    const isCronJob =
      (!!cronSecret && cronHeaderSecret === cronSecret) || body.isCronJob === true;
    const scheduleIdRaw =
      typeof body.scheduleId === "string"
        ? body.scheduleId.trim()
        : typeof body.scheduledReportId === "string"
          ? body.scheduledReportId.trim()
          : "";
    const scheduledReportRowId = UUID_RE.test(scheduleIdRaw)
      ? scheduleIdRaw
      : null;
    const maxLength =
      isCronJob || reportType === "qbr"
        ? 50000
        : 25000;

    // `input` is client-provided text. HaloPSA ticket shaping lives in `formatTicketsForPrompt` (@/lib/psa/format), used by halo/tickets, preview, and cron before POSTing here.
    let modelInput = input;
    if (!rewriteEmailOnly && !input.startsWith("MOCK:") && input.length > maxLength) {
      modelInput = fitHandoverInputToMaxLength(input, maxLength);
      if (modelInput.length > maxLength) {
        return NextResponse.json(
          {
            error: `Input still exceeds maximum length of ${maxLength} characters after condensing older notes. Reduce tickets or paste a shorter export.`,
          },
          { status: 400 },
        );
      }
      console.log("[generate] Input fitted to max length:", {
        before: input.length,
        after: modelInput.length,
      });
    }

    let supabase = await createServerClient();
    let user: User;

    if (isScheduledCron) {
      const admin = createServiceRoleClient();
      const { data: udata, error: adminErr } =
        await admin.auth.admin.getUserById(cronUserIdRaw);
      if (adminErr || !udata.user) {
        return NextResponse.json(
          { error: "Invalid scheduled job credentials." },
          { status: 401 },
        );
      }
      user = udata.user;
      supabase = admin;
    } else {
      const {
        data: { user: cookieUser },
      } = await supabase.auth.getUser();
      if (!cookieUser?.id) {
        return NextResponse.json(
          { error: "auth_required" },
          { status: 401 },
        );
      }
      user = cookieUser;
    }

    let displayName: string | null = null;
    let jobTitle: string | null = null;
    let companyName: string | null = null;
    let signatureOverride: string | null = null;
    let writingStyle: string | null = null;
    let plan: string = "free";
    let profileTeamId: string | null = null;
    let trialEndsAt: string | null = null;
    let trialPlan: string | null = null;
    let subscriptionStatus: string | null = null;

    {
      let verifiedPlanFields;
      try {
        verifiedPlanFields = await verifyUserPlan(user.id);
      } catch (e) {
        console.error("[generate] verifyUserPlan:", e);
        return NextResponse.json(
          { error: "Could not verify subscription state." },
          { status: 500 },
        );
      }

      const adminProfile = createServiceRoleClient();
      const { data: profileExtras } = await adminProfile
        .from("profiles")
        .select(
          "display_name, job_title, company_name, signature_override, writing_style",
        )
        .eq("id", user.id)
        .maybeSingle();

      console.log("[generate] profile (service role):", {
        plan: verifiedPlanFields.plan,
      });

      const applyProfileRow = (p: {
        display_name?: string | null;
        job_title?: string | null;
        company_name?: string | null;
        signature_override?: string | null;
        writing_style?: string | null;
        plan?: string | null;
        team_id?: string | null;
        trial_ends_at?: string | null;
        trial_plan?: string | null;
        subscription_status?: string | null;
      }) => {
        displayName =
          typeof p.display_name === "string" && p.display_name.trim()
            ? p.display_name.trim()
            : null;
        jobTitle =
          typeof p.job_title === "string" && p.job_title.trim()
            ? p.job_title.trim()
            : null;
        companyName =
          typeof p.company_name === "string" && p.company_name.trim()
            ? p.company_name.trim()
            : null;
        signatureOverride =
          typeof p.signature_override === "string" && p.signature_override.trim()
            ? p.signature_override.trim()
            : null;
        writingStyle =
          typeof p.writing_style === "string" && p.writing_style.trim()
            ? p.writing_style.trim()
            : null;
        if (typeof p.plan === "string") {
          plan = p.plan;
        }
        if (typeof p.team_id === "string") {
          profileTeamId = p.team_id;
        }
        trialEndsAt =
          typeof p.trial_ends_at === "string" && p.trial_ends_at.trim()
            ? p.trial_ends_at.trim()
            : null;
        trialPlan =
          typeof p.trial_plan === "string" && p.trial_plan.trim()
            ? p.trial_plan.trim()
            : null;
        subscriptionStatus =
          typeof p.subscription_status === "string" && p.subscription_status.trim()
            ? p.subscription_status.trim()
            : null;
      };

      applyProfileRow({
        ...(profileExtras as {
          display_name?: string | null;
          job_title?: string | null;
          company_name?: string | null;
          signature_override?: string | null;
          writing_style?: string | null;
        }),
        plan: verifiedPlanFields.plan,
        team_id: verifiedPlanFields.team_id,
        trial_ends_at: verifiedPlanFields.trial_ends_at,
        trial_plan: verifiedPlanFields.trial_plan,
        subscription_status: verifiedPlanFields.subscription_status,
      });

      console.log("[generate] profile sign-off context:", {
        hasDisplayName: Boolean(displayName),
        hasJobTitle: Boolean(jobTitle),
        hasCompanyName: Boolean(companyName),
        hasSignatureOverride: Boolean(signatureOverride),
      });
      console.log(
        "[generate] signature used:",
        buildClientEmailSignOffBlock(
          signatureOverride,
          displayName,
          jobTitle,
          companyName,
        ),
      );
    }

    if (
      !rewriteEmailOnly &&
      !input.startsWith("MOCK:") &&
      isSoloGenerationBlockedByPlan(
        planFieldsFromProfileRow({
          plan,
          team_id: profileTeamId,
          trial_ends_at: trialEndsAt,
          trial_plan: trialPlan,
          subscription_status: subscriptionStatus,
        }),
      )
    ) {
      return NextResponse.json(
        {
          error: "upgrade_required",
          message:
            "Your trial has ended or this workspace is read-only. Upgrade to continue generating reports.",
        },
        { status: 403 },
      );
    }

    if (!rewriteEmailOnly && !input.startsWith("MOCK:") && reportType === "qbr") {
      const admin = createServiceRoleClient();
      let teamPlanForQbr: string | null = null;
      if (profileTeamId) {
        const { data: tr } = await admin.from("teams").select("plan").eq("id", profileTeamId).maybeSingle();
        teamPlanForQbr = typeof tr?.plan === "string" ? tr.plan : null;
      }
      const qbrLimit = getQbrPacksPerMonthLimit(
        planFieldsFromProfileRow({
          plan,
          team_id: profileTeamId,
          trial_ends_at: trialEndsAt,
          trial_plan: trialPlan,
          subscription_status: subscriptionStatus,
        }),
        teamPlanForQbr,
      );
      if (qbrLimit === 0) {
        return NextResponse.json(
          {
            error: "qbr_not_available",
            message:
              "QBR packs require an active Professional, Team, or Enterprise plan. Upgrade to generate QBR packs.",
          },
          { status: 403 },
        );
      }
      if (qbrLimit !== null) {
        const startOfMonthUtc = new Date(
          Date.UTC(
            new Date().getUTCFullYear(),
            new Date().getUTCMonth(),
            1,
            0,
            0,
            0,
            0,
          ),
        ).toISOString();
        let qbrMonthCount = 0;
        if (profileTeamId) {
          const { data: members, error: memErr } = await admin
            .from("team_members")
            .select("user_id")
            .eq("team_id", profileTeamId);
          if (memErr) {
            console.error("[generate] QBR limit team_members:", memErr.message);
          }
          const ids = [
            ...new Set(
              (members ?? [])
                .map((m) => String((m as { user_id?: string }).user_id ?? "").trim())
                .filter(Boolean),
            ),
          ];
          if (ids.length > 0) {
            const { count, error: cErr } = await admin
              .from("generations")
              .select("id", { count: "exact", head: true })
              .in("user_id", ids)
              .eq("report_type", "qbr")
              .gte("created_at", startOfMonthUtc);
            if (cErr) console.error("[generate] QBR count (team):", cErr.message);
            qbrMonthCount = count ?? 0;
          }
        } else {
          const { count, error: cErr } = await admin
            .from("generations")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("report_type", "qbr")
            .gte("created_at", startOfMonthUtc);
          if (cErr) console.error("[generate] QBR count (solo):", cErr.message);
          qbrMonthCount = count ?? 0;
        }
        if (qbrMonthCount >= qbrLimit) {
          const enterpriseUnlimitedCopy =
            "You have used your 3 QBR packs for this month. Upgrade to Enterprise for unlimited QBRs.";
          return NextResponse.json(
            {
              error: "qbr_monthly_limit_reached",
              message:
                qbrLimit === 1
                  ? "You have used your 1 QBR pack for this month. Upgrade to Team for 3 QBRs per month."
                  : enterpriseUnlimitedCopy,
            },
            { status: 403 },
          );
        }
      }
    }

    const extendedOutputKeys: ExtendedPmTabKey[] =
      body.extendedOutputKeys !== undefined
        ? normalizeExtendedOutputKeys(body.extendedOutputKeys)
        : (() => {
            const op = body.outputPreferences;
            if (!op || typeof op !== "object") return [];
            const et = (op as { extendedTabs?: unknown }).extendedTabs;
            return Array.isArray(et) ? normalizeExtendedOutputKeys(et) : [];
          })();
    console.log("[generate][audit] extended keys received (pre-model):", {
      rawBodyExtendedOutputKeys: body.extendedOutputKeys,
      rawOutputPreferencesExtendedTabs: (() => {
        const op = body.outputPreferences;
        if (!op || typeof op !== "object") return undefined;
        return (op as { extendedTabs?: unknown }).extendedTabs;
      })(),
      normalizedExtendedOutputKeys: extendedOutputKeys,
      extendedPmPromptBlockChars: buildExtendedPmOutputsPromptBlock(extendedOutputKeys).length,
      fromTopLevelExtendedField: body.extendedOutputKeys !== undefined,
    });

    const adminClient = createServiceRoleClient();
    const { data: cfMappings } = await adminClient
      .from("custom_field_mappings")
      .select("*")
      .eq("user_id", user.id);
    const hasMappings = cfMappings && cfMappings.length > 0;
    const customFieldsContextBlock = hasMappings
      ? `\n\nCUSTOM FIELDS CONTEXT:
The following custom field mappings are configured for this workspace. When ticket data includes these fields, use their values as additional context in the specified outputs. Custom fields are NOT mandatory — only include them where they add genuine value to that specific output. Never force-mention a custom field if it does not naturally fit the context.

${cfMappings.map(m => `- Field: "${m.field_name}" (shown as "${m.display_name}") → relevant to: ${m.outputs.join(", ")}`).join("\n")}

If ticket data contains a CUSTOM FIELDS block, extract values and apply them according to the mappings above. For client-facing outputs, only include custom field values that are appropriate for the client to see.`
      : "";

    if (rewriteEmailOnly) {
      const emailOnlyOutputs = ["client_email"];
      let rewriteSystemPrompt = buildSystemPrompt(
        displayName,
        jobTitle,
        companyName,
        signatureOverride,
        projectName,
        tone,
        emailOnlyOutputs,
        clientContactName,
        clientContactEmail,
        writingStyle,
        extendedOutputKeys,
        reportType,
        scheduledIncludeAllSelectedTickets,
        isScheduledCron,
      );
      if (hasMappings) {
        rewriteSystemPrompt += customFieldsContextBlock;
      }
      const userInputWithContext = [
        projectName ? `Project / client context: ${projectName}\n` : "",
        clientContactName
          ? `Client contact name (person being emailed): ${clientContactName}\n`
          : "",
        `Generate a fresh client_email in ${tone} tone from the ticket data below. Do not reuse greetings, sign-offs, or phrasing from any previous draft — apply EMAIL GREETING RULES and tone instructions from scratch.\n\nInput:\n${modelInput}`,
      ].join("");
      const userInputFinal = templateContext
        ? `${userInputWithContext}\n\nTemplate reference instruction:\n${templateContext}`
        : userInputWithContext;

      if (input.startsWith("MOCK:")) {
        const mockEmail = normalizeClientEmailOpeningGreeting(
          typeof MOCK_RESPONSE.client_email === "string"
            ? stripClientEmailSeparatorLines(MOCK_RESPONSE.client_email)
            : "",
          clientContactName,
        );
        return NextResponse.json({ client_email: mockEmail }, { status: 200 });
      }

      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      const response = await client.chat.completions.create({
        model: "gpt-4.1",
        temperature: 0.3,
        max_tokens: 8000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: rewriteSystemPrompt },
          { role: "user", content: userInputFinal },
        ],
      });
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("OpenAI did not return tone-regenerated email.");
      }
      let parsedRewrite = parseModelResponseContent(content);
      mergeExtendedDefaults(parsedRewrite);
      stripDisabledExtendedOutputs(parsedRewrite, new Set(extendedOutputKeys));
      parsedRewrite = applySelectedOutputsToParsed(parsedRewrite, new Set(emailOnlyOutputs));
      const rewrittenEmail = normalizeClientEmailOpeningGreeting(
        stripClientEmailSeparatorLines(String(parsedRewrite.client_email ?? "").trim()),
        clientContactName,
      );
      if (!rewrittenEmail) {
        throw new Error("OpenAI did not return a client_email in JSON.");
      }
      return NextResponse.json({ client_email: rewrittenEmail }, { status: 200 });
    }

    let trialMeta:
      | {
          active: boolean;
          used: number;
          remaining: number;
          endsAt: string;
        }
      | null = null;
    if (!input.startsWith("MOCK:") && !profileTeamId) {
      const np = canonicalPlanId(plan);
      if (np === "professional" && !profileTeamId) {
        const startOfMonthPro = new Date(
          Date.UTC(
            new Date().getUTCFullYear(),
            new Date().getUTCMonth(),
            1,
            0,
            0,
            0,
            0,
          ),
        ).toISOString();
        const { count: proSoloMonthCount, error: proSoloCountErr } = await supabase
          .from("generations")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", startOfMonthPro);
        if (proSoloCountErr) {
          console.error("[generate] Pro solo generation count error:", proSoloCountErr);
        } else if ((proSoloMonthCount ?? 0) >= PRO_SOLO_MONTHLY_GENERATION_LIMIT) {
          return NextResponse.json(
            {
              error: "limit_reached",
              message:
                "You have reached your Pro plan limit of 200 generations this month (UTC). It resets on the 1st of each month.",
            },
            { status: 403 },
          );
        }
      }
    }

    if (!input.startsWith("MOCK:") && profileTeamId) {
      const teamDb = createServiceRoleClient();
      const { data: teamRow, error: teamErr } = await teamDb
        .from("teams")
        .select("generation_count, generation_limit, subscription_status")
        .eq("id", profileTeamId)
        .maybeSingle();

      const tCount = teamRow?.generation_count ?? 0;
      const tLim = teamRow?.generation_limit ?? 0;

      console.log("[generate] team check:", {
        userId: user.id,
        teamId: profileTeamId,
        plan,
        generationCount: teamRow?.generation_count,
        generationLimit: teamRow?.generation_limit,
        subscription_status: teamRow?.subscription_status,
        teamQueryError: teamErr?.message ?? null,
        rawTeamData: teamRow,
        derived: { tCount, tLim, blockNoRow: !teamRow, blockOverLimit: tCount >= tLim },
      });

      if (teamErr) {
        console.error("[generate] team limit read:", teamErr.message);
      }
      if (!teamRow) {
        return NextResponse.json(
          {
            error: "team_limit_reached",
            message:
              "Your team has reached its monthly generation limit. The owner can upgrade the plan.",
          },
          { status: 403 },
        );
      }
      if (!isValidTeamSubscriptionStatus(teamRow.subscription_status)) {
        return NextResponse.json(
          {
            error: "team_subscription_inactive",
            message:
              "Your team's subscription is not active. The team owner can resolve billing in team settings.",
          },
          { status: 403 },
        );
      }
      if (tCount >= tLim) {
        return NextResponse.json(
          {
            error: "team_limit_reached",
            message:
              "Your team has reached its monthly generation limit. The owner can upgrade the plan.",
          },
          { status: 403 },
        );
      }
    }

    const skipFreeTierLimits =
      Boolean(profileTeamId) ||
      isEnterpriseSoloPlan(plan) ||
      getPlanTierFromFields(
        planFieldsFromProfileRow({
          plan,
          team_id: profileTeamId,
          trial_ends_at: trialEndsAt,
          trial_plan: trialPlan,
          subscription_status: subscriptionStatus,
        }),
      ) >= 1;

    if (!isScheduledCron && !input.startsWith("MOCK:") && !skipFreeTierLimits) {
      const accountCreated = new Date(user.created_at ?? Date.now());
      const daysSinceCreation =
        (Date.now() - accountCreated.getTime()) / (1000 * 60 * 60 * 24);
      const emailDomain = user.email?.split("@")[1]?.toLowerCase() ?? "";
      const isDisposable = DISPOSABLE_DOMAINS.has(emailDomain);
      const isInTrialPeriod = !isDisposable && daysSinceCreation < 14;

      if (isInTrialPeriod) {
        const { count: totalCount, error: totalCountError } = await supabase
          .from("generations")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        console.log("Trial check:", {
          userId: user.id,
          email: user.email,
          totalCount,
          accountCreated,
          daysSinceCreation,
        });
        if (totalCountError) {
          console.error("Generation count error:", totalCountError);
        }
        const used = totalCount ?? 0;
        if (used >= 10) {
          return NextResponse.json(
            { error: "trial_limit_reached" },
            { status: 403 },
          );
        }
        trialMeta = {
          active: true,
          used: used + 1,
          remaining: 9 - used,
          endsAt: new Date(
            accountCreated.getTime() + 14 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        };
      } else {
        const startOfMonth = new Date(
          Date.UTC(
            new Date().getUTCFullYear(),
            new Date().getUTCMonth(),
            1,
            0,
            0,
            0,
            0,
          ),
        ).toISOString();

        const { count, error: countError } = await supabase
          .from("generations")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", startOfMonth);

        if (countError) {
          console.error("Generation count error:", countError);
        } else if ((count ?? 0) >= 10) {
          return NextResponse.json(
            { error: "limit_reached" },
            { status: 403 },
          );
        }
      }
    }

    let systemPrompt = buildSystemPrompt(
      displayName,
      jobTitle,
      companyName,
      signatureOverride,
      projectName,
      tone,
      selectedOutputs,
      clientContactName,
      clientContactEmail,
      writingStyle,
      extendedOutputKeys,
      reportType,
      scheduledIncludeAllSelectedTickets,
      isScheduledCron,
    );
    if (hasMappings) {
      systemPrompt += customFieldsContextBlock;
    }
    const userInputWithContext = [
      projectName ? `Project / client context: ${projectName}\n` : "",
      clientContactName
        ? `Client contact name (person being emailed): ${clientContactName}\n`
        : "",
      `Input:\n${modelInput}`,
    ].join("");
    const userInputFinal = templateContext
      ? `${userInputWithContext}\n\nTemplate reference instruction:\n${templateContext}`
      : userInputWithContext;

    let parsed: Record<string, unknown>;

    if (input.startsWith("MOCK:")) {
      console.log("Mock mode — skipping OpenAI call");
      parsed = { ...MOCK_RESPONSE } as Record<string, unknown>;
    } else {
      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      const response = await client.chat.completions.create({
        model: "gpt-4.1",
        temperature: 0.3,
        max_tokens: 16000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userInputFinal },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("OpenAI response did not contain text output.");
      }

      parsed = parseModelResponseContent(content);
    }

    mergeExtendedDefaults(parsed);
    stripDisabledExtendedOutputs(parsed, new Set(extendedOutputKeys));
    const nonEmptyExtendedAfterStrip = EXTENDED_PM_TAB_KEYS.filter(
      (k) =>
        extendedOutputKeys.includes(k) &&
        typeof parsed[k] === "string" &&
        String(parsed[k]).trim().length > 0,
    );
    console.log("[generate][audit] extended after parse + stripDisabledExtendedOutputs:", {
      normalizedExtendedOutputKeys: extendedOutputKeys,
      nonEmptyExtendedKeysInParsed: nonEmptyExtendedAfterStrip,
    });
    parsed = applySelectedOutputsToParsed(parsed, new Set(selectedOutputs));

    if (privacyMode) {
      console.log("Generation not saved - privacy mode on (trial count will not increase)");
    }

    let savedGenerationId: string | null = null;
    let streakResponseCurrent: number | null = null;
    let streakResponseMilestone: number | null = null;

    if (!privacyMode) {
      try {
        const generationSource = resolveGenerationSource(modelInput, {
          isScheduledCron,
          isCronJob,
        });
        const insertDb =
          profileTeamId && !isScheduledCron ? createServiceRoleClient() : supabase;
        const savedProjectName = resolveSavedGenerationProjectName(
          projectName,
          modelInput,
        );
        const { data: insertedRow, error: insertError } = await insertDb
          .from("generations")
          .insert({
            user_id: user.id,
            input_text: modelInput,
            project_name: savedProjectName,
            tone,
            output_json: parsed,
            source: generationSource,
            report_type: persistedReportType,
            scheduled_report_id:
              generationSource === "scheduled" && scheduledReportRowId
                ? scheduledReportRowId
                : null,
          })
          .select("id")
          .maybeSingle();

        console.log(
          "Generation saved - user_id:",
          user.id,
          "privacyMode:",
          privacyMode,
          "error:",
          insertError,
        );

        if (!insertError && insertedRow && typeof insertedRow.id === "string") {
          savedGenerationId = insertedRow.id;
        }

        if (insertError) {
          console.error("Failed to save generation:", insertError);
        } else if (!input.startsWith("MOCK:")) {
          try {
            const admin = createServiceRoleClient();
            const { error: lastGenErr } = await admin
              .from("profiles")
              .update({ last_generation_at: new Date().toISOString() })
              .eq("id", user.id);
            if (lastGenErr) {
              console.error("[generate] last_generation_at update:", lastGenErr.message);
            }
            const { error: profIncErr } = await admin.rpc(
              "increment_profile_total_generations",
              { p_user_id: user.id },
            );
            if (profIncErr) {
              console.error(
                "[generate] increment_profile_total_generations:",
                profIncErr.message,
              );
            }
            if (profileTeamId) {
              const { data: incData, error: incErr } = await admin.rpc(
                "try_increment_team_generation",
                { p_team_id: profileTeamId },
              );
              if (incErr) {
                console.error("[generate] team generation increment:", incErr.message);
              } else if (
                incData &&
                typeof incData === "object" &&
                incData !== null &&
                "ok" in incData &&
                (incData as { ok?: boolean }).ok === false
              ) {
                console.warn("[generate] team pool increment rejected:", incData);
              }
            } else if (!isProOrTeam(plan)) {
              void runUpgradeNudgeForUser(user.id).catch((e) =>
                console.error("[generate] upgrade nudge:", e),
              );
            }

            const { data: streakRaw, error: streakErr } = await admin.rpc(
              "apply_generation_streak",
              { p_user_id: user.id },
            );
            if (streakErr) {
              console.error("[generate] apply_generation_streak:", streakErr.message);
            } else if (streakRaw && typeof streakRaw === "object") {
              const sj = streakRaw as Record<string, unknown>;
              const cur = sj.current_streak;
              const msRaw = sj.milestone;
              const curN = typeof cur === "number" ? cur : Number(cur);
              if (Number.isFinite(curN)) streakResponseCurrent = curN;
              console.log("[generate] streak persisted", {
                userId: user.id,
                streakPayload: streakRaw,
                currentStreak: streakResponseCurrent,
              });
              const ms =
                typeof msRaw === "number"
                  ? msRaw
                  : msRaw === null || msRaw === undefined
                    ? NaN
                    : Number(msRaw);
              if (ms === 3 || ms === 7 || ms === 14 || ms === 30 || ms === 100) {
                streakResponseMilestone = ms;
              }
            }
          } catch (e) {
            console.error("[generate] post-insert counters failed:", e);
          }
        }

        if (!privacyMode && !isScheduledCron) {
          void notifyHandoverGenerationWebhooks({
            supabase,
            userId: user.id,
            parsed,
            projectName,
            savedGenerationId,
          }).catch((e) => console.error("[generate] chat notify:", e));
        }
      } catch (dbError) {
        console.error("Failed to save generation:", dbError);
      }
    }

    if (typeof parsed.client_email === "string" && parsed.client_email.length > 0) {
      parsed.client_email = normalizeClientEmailOpeningGreeting(
        parsed.client_email,
        clientContactName,
      );
    }

    const payload =
      trialMeta != null
        ? { ...parsed, _trial: trialMeta }
        : { ...parsed };
    (payload as Record<string, unknown>).inputCondensed = modelInput.length < input.length;
    if (input.length > modelInput.length) {
      (payload as Record<string, unknown>).inputCondensedFrom = input.length;
    }
    if (savedGenerationId) {
      (payload as Record<string, unknown>).savedGenerationId = savedGenerationId;
    }
    if (streakResponseCurrent !== null) {
      (payload as Record<string, unknown>)._streakCurrent = streakResponseCurrent;
    }
    if (streakResponseMilestone !== null) {
      (payload as Record<string, unknown>)._streakMilestone = streakResponseMilestone;
    }

    return NextResponse.json(payload, { status: 200 });

  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("[generate] FAILED:", err.message);
    console.error("[generate] Stack:", err.stack);
    return NextResponse.json(
      {
        error: "Generation failed",
        details: err.message,
        ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
      },
      { status: 500 },
    );
  }
}