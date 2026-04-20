/**
 * Human-readable "time logged" for UI and prompts. Rounds to the nearest minute so
 * values like 1.45h never render as 1.4500000000000004h.
 */
export function formatLoggedHours(hours: number | null | undefined): string {
  if (hours == null || !Number.isFinite(hours) || hours <= 0) {
    return "0h";
  }
  const totalMinutes = Math.round(hours * 60);
  if (totalMinutes === 0) {
    return "0h";
  }
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (m === 0) {
    return `${h}h`;
  }
  if (h === 0) {
    return `${m}m`;
  }
  return `${h}h ${m}m`;
}

/** True when there is a positive amount of logged work after minute rounding. */
export function hasLoggedWork(hours: number | null | undefined): boolean {
  if (hours == null || !Number.isFinite(hours) || hours <= 0) return false;
  return Math.round(hours * 60) > 0;
}
