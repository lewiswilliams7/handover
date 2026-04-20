const SIMPLE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMAIL_SCAN_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

/** First plausible person email in free text (skips obvious noreply addresses). */
export function extractFirstEmailFromText(text: string): string | null {
  const m = text.match(EMAIL_SCAN_RE);
  if (!m?.length) return null;
  for (const e of m) {
    const lower = e.toLowerCase();
    if (/^(noreply|no-reply|donotreply|mailer-daemon|postmaster)@/.test(lower)) continue;
    if (SIMPLE_EMAIL_RE.test(lower)) return e;
  }
  return SIMPLE_EMAIL_RE.test(m[0]!.toLowerCase()) ? m[0]! : null;
}

/** Split comma/semicolon-separated addresses, trim, de-dupe, keep valid-looking emails only. */
export function parseCommaSeparatedEmails(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,;]+/)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    if (!SIMPLE_EMAIL_RE.test(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

/** Resend accepts string or string[] for to/cc/bcc. */
export function resendRecipientList(emails: string[]): string | string[] | undefined {
  if (emails.length === 0) return undefined;
  if (emails.length === 1) return emails[0];
  return emails;
}
