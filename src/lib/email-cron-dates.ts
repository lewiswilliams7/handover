/** UTC calendar day YYYY-MM-DD for a Date. */
export function utcCalendarDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseIsoToUtcDay(iso: string | null | undefined): string | null {
  if (!iso || typeof iso !== "string") return null;
  const t = Date.parse(iso.trim());
  if (!Number.isFinite(t)) return null;
  return new Date(t).toISOString().slice(0, 10);
}

export function addUtcDaysMs(iso: string, days: number): number {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return NaN;
  return t + days * 86_400_000;
}

/** Whole UTC days elapsed since `createdAtIso` (signup), floored. */
export function wholeUtcDaysSince(createdAtIso: string, now: Date): number {
  const t = Date.parse(createdAtIso);
  if (!Number.isFinite(t)) return -1;
  return Math.floor((now.getTime() - t) / 86_400_000);
}
