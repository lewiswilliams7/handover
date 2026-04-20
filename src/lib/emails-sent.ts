/**
 * Canonical IDs for drip / sequence emails (stored in `profiles.emails_sent` jsonb array).
 * Append-only: never remove or rename IDs in use (breaks deduplication).
 */
export const EmailId = {
  /** Free/basic — immediate welcome (signup confirmation). */
  FREE_DRIP_WELCOME: "free_drip_welcome",
  /** Free/basic — day 2: PSA not connected, no trial. */
  FREE_DRIP_PSA_NUDGE: "free_drip_psa_nudge",
  /** Free/basic — day 5: still zero generations. */
  FREE_DRIP_SAVE_TIME: "free_drip_save_time",
  /** Free/basic — day 10: founder note, no trial. */
  FREE_DRIP_FOUNDER_NOTE: "free_drip_founder_note",
  /** Trial — day 1 (trial just started). @deprecated Prefer TRIAL_WELCOME for dedupe; kept for legacy rows. */
  TRIAL_SEQ_STARTED: "trial_seq_started",
  /** Trial welcome email sent once from POST /api/trial/start (canonical id). */
  TRIAL_WELCOME: "trial_welcome",
  /** Trial — halfway (7 days after start). */
  TRIAL_SEQ_HALFWAY: "trial_seq_halfway",
  /** Trial — 2 days before end. */
  TRIAL_SEQ_2_DAYS: "trial_seq_2_days",
  /** Trial — expiry day. */
  TRIAL_SEQ_EXPIRED_DAY: "trial_seq_expired_day",
  /** Trial — 3 days after expiry, not upgraded. */
  TRIAL_SEQ_POST_EXPIRY: "trial_seq_post_expiry",
} as const;

export type EmailIdValue = (typeof EmailId)[keyof typeof EmailId];

export function parseEmailsSent(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x === "string" && x.trim()) out.push(x.trim());
  }
  return out;
}

export function profileHasEmailSent(emailsSentRaw: unknown, id: string): boolean {
  return parseEmailsSent(emailsSentRaw).includes(id);
}

export function mergeEmailsSentAppend(
  emailsSentRaw: unknown,
  id: string,
): { next: string[]; changed: boolean } {
  const cur = parseEmailsSent(emailsSentRaw);
  if (cur.includes(id)) return { next: cur, changed: false };
  return { next: [...cur, id], changed: true };
}
