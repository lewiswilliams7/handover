/** Lines that are only decorative separators (dashes, underscores, equals). */
const SEPARATOR_ONLY_LINE = /^[-_=]{2,}\s*$/;

/**
 * Remove stray "---" / "___" style lines from client email bodies (AI often echoes
 * prompt delimiters). Collapses excessive blank lines after removal.
 */
export function stripClientEmailSeparatorLines(body: string): string {
  if (!body) return body;
  const lines = body.split(/\r?\n/);
  const kept = lines.filter((line) => !SEPARATOR_ONLY_LINE.test(line.trim()));
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
}

function firstNameFromContactName(name: string | null | undefined): string {
  const t = (name ?? "").trim();
  if (!t) return "";
  return t.split(/\s+/)[0] ?? t;
}

function preferredOpeningLine(clientContactName?: string | null): string {
  const first = firstNameFromContactName(clientContactName);
  return first ? `Hi ${first},` : "Hi,";
}

/**
 * Normalize the opening salutation on line 1 only — never use "Hi there," or company names.
 */
export function normalizeClientEmailOpeningGreeting(
  clientEmail: string,
  clientContactName?: string | null,
): string {
  const trimmed = clientEmail.trim();
  if (!trimmed) return clientEmail;

  const nl = clientEmail.indexOf("\n");
  const firstRaw = nl === -1 ? clientEmail : clientEmail.slice(0, nl);
  const rest = nl === -1 ? "" : clientEmail.slice(nl);

  const firstTrim = firstRaw.trimEnd();
  const preferred = preferredOpeningLine(clientContactName);
  const m = firstTrim.match(/^(Hi|Dear)\s+([^,]+),?\s*$/i);
  if (!m) return clientEmail;

  const namePart = m[2].trim();
  const lower = namePart.toLowerCase();
  const core = lower.replace(/\s+team\s*$/i, "").trim();
  const companyRe = /\b(limited|ltd|llc|group|inc|plc)\b/i;
  const isBareGeneric = ["team", "all", "there", ""].includes(lower);

  if (isBareGeneric || lower === "there" || companyRe.test(namePart) || companyRe.test(core)) {
    return `${preferred}${rest}`;
  }
  return clientEmail;
}
