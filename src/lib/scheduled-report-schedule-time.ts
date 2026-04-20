import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/** User-facing schedule clock is always interpreted in Europe/London (GMT/BST). */
export const SCHEDULE_DISPLAY_TIMEZONE = "Europe/London";

function parseHhMm(raw: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const h = Math.min(23, Math.max(0, Number.parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, Number.parseInt(m[2], 10)));
  return { h, m: min };
}

/**
 * Convert a London wall-clock HH:mm (what the user chose) to UTC HH:mm for DB storage,
 * using `referenceUtc`'s calendar date in London to resolve BST vs GMT.
 */
export function londonWallScheduleTimeToUtcStored(
  londonHhmm: string,
  referenceUtc: Date = new Date(),
): string {
  const parsed = parseHhMm(londonHhmm);
  if (!parsed) return "07:00";
  const ymd = formatInTimeZone(
    referenceUtc,
    SCHEDULE_DISPLAY_TIMEZONE,
    "yyyy-MM-dd",
  );
  const wall = `${ymd}T${String(parsed.h).padStart(2, "0")}:${String(parsed.m).padStart(2, "0")}:00`;
  const utcInstant = fromZonedTime(wall, SCHEDULE_DISPLAY_TIMEZONE);
  return formatInTimeZone(utcInstant, "UTC", "HH:mm");
}

/**
 * Convert stored UTC HH:mm back to Europe/London HH:mm for API/UI display,
 * anchored to `referenceUtc`'s UTC calendar date.
 */
export function utcStoredScheduleTimeToLondonWall(
  utcHhmm: string,
  referenceUtc: Date = new Date(),
): string {
  const parsed = parseHhMm(utcHhmm);
  if (!parsed) return "07:00";
  const ymdUtc = formatInTimeZone(referenceUtc, "UTC", "yyyy-MM-dd");
  const utcWall = `${ymdUtc}T${String(parsed.h).padStart(2, "0")}:${String(parsed.m).padStart(2, "0")}:00`;
  const instant = fromZonedTime(utcWall, "UTC");
  return formatInTimeZone(instant, SCHEDULE_DISPLAY_TIMEZONE, "HH:mm");
}
