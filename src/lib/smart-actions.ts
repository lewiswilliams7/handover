/** Smart Actions panel - eligibility and suggestion anchoring (client-side). */

export const SMART_ACTIONS_INSUFFICIENT_MSG =
  "Not enough specific context to generate suggestions for this report.";

export type SmartActionType = "email" | "push_to_halo" | "schedule" | "slack" | "manual";

export type SmartActionSuggestion = {
  action: string;
  description: string;
  type: SmartActionType;
};

const TYPE_LIKE_ACTION = /^(email|push_to_halo|push to halo|schedule|slack|manual)$/i;

/** Max 6 words for UI title - never show raw type tokens as the headline. */
export function truncateWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}…`;
}

export function smartActionDisplayTitle(s: Pick<SmartActionSuggestion, "action" | "description">): string {
  const a = (s.action ?? "").trim();
  const d = (s.description ?? "").trim();
  if (!a || TYPE_LIKE_ACTION.test(a)) {
    return truncateWords(d || a || "Suggested action", 6);
  }
  return truncateWords(a, 6);
}

type ActionRowLike = {
  task?: string | null;
  suggested_owner?: string | null;
  priority?: string | null;
  client_name?: string | null;
};

const GENERIC_EMAIL_PHRASES =
  /\b(no updates|nothing to report|nothing further|insufficient information|generic update|placeholder)\b/i;

function firstClientNameFromActions(actions: readonly ActionRowLike[]): string | null {
  for (const a of actions) {
    const c = (a.client_name ?? "").trim();
    if (c.length >= 2) return c;
  }
  return null;
}

function parseGreetingName(clientEmail: string): string | null {
  const m = clientEmail.match(/^(?:Hi|Dear)\s+([^,\n]+),/im);
  if (!m?.[1]) return null;
  const name = m[1].trim();
  if (name.length < 2) return null;
  if (/^(team|there|all|everyone)\b/i.test(name)) return null;
  return name;
}

/** Client / account label we can anchor suggestions on (null → do not show Smart Actions). */
export function getIdentifiableClientLabel(
  projectName: string,
  actions: readonly ActionRowLike[],
  clientEmail: string,
): string | null {
  const pn = projectName.trim();
  if (pn.length >= 2) return pn;
  const fromActions = firstClientNameFromActions(actions);
  if (fromActions) return fromActions;
  return parseGreetingName(clientEmail);
}

function resultIncludesClientEmailTab(result: {
  client_email?: string;
  _uiTabScope?: { core?: readonly string[] };
}): boolean {
  const scope = result._uiTabScope?.core;
  if (scope && scope.length > 0) {
    return scope.includes("client_email");
  }
  return Boolean((result.client_email ?? "").trim());
}

function substantiveActionCount(actions: readonly ActionRowLike[]): number {
  return actions.filter((a) => (a.task ?? "").trim().length >= 8).length;
}

/**
 * True when the Smart Actions entry button may appear (all product gates).
 * Still runs client-side specificity check on returned AI suggestions.
 */
export function shouldOfferSmartActions(
  result: {
    actions: readonly ActionRowLike[];
    client_email?: string;
    summary?: string;
    _uiTabScope?: { core?: readonly string[] };
  },
  projectName: string,
  opts?: { surface?: "dashboard" | "generation" },
): boolean {
  const subCount = substantiveActionCount(result.actions);
  if (opts?.surface === "generation") {
    return subCount >= 1 && resultIncludesClientEmailTab(result);
  }

  let ok = subCount >= 1;

  if (ok && !resultIncludesClientEmailTab(result)) {
    ok = false;
  }
  const email = (result.client_email ?? "").trim();
  if (ok && email.length < 120) {
    ok = false;
  }
  if (ok && GENERIC_EMAIL_PHRASES.test(email)) {
    ok = false;
  }
  const client = ok ? getIdentifiableClientLabel(projectName, result.actions, email) : null;
  if (ok && !client) {
    ok = false;
  }
  const blob =
    ok && client
      ? [email, (result.summary ?? "").slice(0, 4000), result.actions.map((a) => (a.task ?? "").trim()).join("\n")]
          .join("\n")
          .toLowerCase()
      : "";
  if (ok && client && !blob.includes(client.toLowerCase())) {
    ok = false;
  }
  const combined =
    ok && client
      ? `${email}\n${result.actions.map((a) => (a.task ?? "").trim()).join("\n")}\n${result.summary ?? ""}`.trim()
      : "";
  if (ok && combined.length < 220) {
    ok = false;
  }

  return ok;
}

export function buildSmartActionsReportContext(args: {
  projectName: string;
  result: {
    actions: readonly ActionRowLike[];
    risks: readonly { risk?: string | null }[];
    summary: string;
    client_email: string;
    email_subject?: string;
    status_report: string;
  };
  maxChars?: number;
}): string {
  const { projectName, result } = args;
  const maxChars = args.maxChars ?? 24_000;
  const actionLines = result.actions
    .map((a, i) => {
      const task = (a.task ?? "").trim() || " - ";
      const owner = (a.suggested_owner ?? "").trim() || " - ";
      const pri = (a.priority ?? "").trim() || " - ";
      return `${i + 1}. ${task} | Owner: ${owner} | Priority: ${pri}`;
    })
    .join("\n");
  const riskLines = result.risks
    .map((r, i) => `${i + 1}. ${(r.risk ?? "").trim() || " - "}`)
    .join("\n");
  const parts = [
    `Project / client label: ${projectName.trim() || "(not set)"}`,
    "",
    "=== CLIENT EMAIL ===",
    `Subject: ${(result.email_subject ?? "").trim() || " - "}`,
    result.client_email.trim() || "(empty)",
    "",
    "=== ACTIONS ===",
    actionLines || "(none)",
    "",
    "=== RISKS (excerpt) ===",
    (riskLines || "(none)").slice(0, 6000),
    "",
    "=== SUMMARY ===",
    (result.summary ?? "").trim().slice(0, 8000),
    "",
    "=== STATUS REPORT (excerpt) ===",
    (result.status_report ?? "").trim().slice(0, 8000),
  ];
  const full = parts.join("\n");
  if (full.length <= maxChars) return full;
  return `${full.slice(0, maxChars)}\n\n[…truncated for model context…]`;
}

const TICKET_REF = /\b[A-Z][A-Za-z0-9]+-\d+\b/g;

export function extractTicketRefsFromReport(text: string): string[] {
  const m = text.match(TICKET_REF);
  if (!m) return [];
  return [...new Set(m)];
}

export type SmartActionAnchors = {
  clientLabel: string;
  actionSnippets: string[];
  ticketRefs: string[];
};

export function buildSuggestionAnchors(
  projectName: string,
  result: {
    actions: readonly ActionRowLike[];
    client_email: string;
    summary: string;
    status_report: string;
  },
): SmartActionAnchors | null {
  const clientLabel = getIdentifiableClientLabel(projectName, result.actions, result.client_email);
  if (!clientLabel) return null;
  const actionSnippets = result.actions
    .map((a) => (a.task ?? "").trim())
    .filter((t) => t.length >= 10)
    .slice(0, 8)
    .map((t) => t.slice(0, 72));
  const blob = [
    result.client_email,
    result.summary,
    result.status_report,
    ...result.actions.map((a) => (a.task ?? "").trim()),
  ].join("\n");
  const ticketRefs = extractTicketRefsFromReport(blob).slice(0, 12);
  return { clientLabel, actionSnippets, ticketRefs };
}

/** True if this suggestion text is tied to real report anchors. */
export function suggestionMatchesAnchors(
  suggestion: Pick<SmartActionSuggestion, "action" | "description">,
  anchors: SmartActionAnchors,
): boolean {
  const text = `${suggestion.action} ${suggestion.description}`.toLowerCase();
  const c = anchors.clientLabel.trim().toLowerCase();
  if (c.length >= 2 && text.includes(c)) return true;
  for (const ref of anchors.ticketRefs) {
    if (ref && text.includes(ref.toLowerCase())) return true;
  }
  for (const snip of anchors.actionSnippets) {
    const piece = snip.trim().toLowerCase();
    if (piece.length < 10) continue;
    const head = piece.slice(0, 36);
    if (head.length >= 8 && text.includes(head)) return true;
  }
  return false;
}

export function parseSmartActionType(raw: unknown): SmartActionType {
  if (raw === "email" || raw === "push_to_halo" || raw === "schedule" || raw === "slack" || raw === "manual") {
    return raw;
  }
  return "manual";
}
