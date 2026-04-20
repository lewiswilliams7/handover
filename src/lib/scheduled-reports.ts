/** Helpers for scheduled weekly Halo → Handover reports (UTC clock). */

const DOW: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function getDateRangeStartIso(
  dateRange: string,
  now: Date = new Date(),
): string {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const day = now.getUTCDate();
  const d = new Date(Date.UTC(y, m, day));
  switch (dateRange) {
    case "today":
      break;
    case "last_30_days":
      d.setUTCDate(d.getUTCDate() - 30);
      break;
    case "last_14_days":
      d.setUTCDate(d.getUTCDate() - 14);
      break;
    case "this_week": {
      const dow = now.getUTCDay();
      const diff = dow === 0 ? 6 : dow - 1;
      d.setUTCDate(d.getUTCDate() - diff);
      break;
    }
    case "last_7_days":
    default:
      d.setUTCDate(d.getUTCDate() - 7);
      break;
  }
  return d.toISOString().slice(0, 10);
}

/** End date (inclusive) for Halo ticket filters - today UTC. */
export function getDateRangeEndIso(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

/**
 * Next run instant in UTC: upcoming occurrence of scheduleDay at scheduleTime (HH:mm).
 */
export function computeNextRunUtc(
  scheduleDay: string,
  scheduleTime: string,
  fromUtc: Date = new Date(),
): Date {
  const targetDow = DOW[scheduleDay.trim().toLowerCase()];
  const dow = targetDow !== undefined ? targetDow : 1;
  const parts = scheduleTime.split(":");
  const hh = Number.parseInt(parts[0] ?? "7", 10);
  const mm = Number.parseInt(parts[1] ?? "0", 10);
  const hours = Number.isFinite(hh) ? hh : 7;
  const minutes = Number.isFinite(mm) ? mm : 0;

  const candidate = new Date(fromUtc);
  candidate.setUTCHours(hours, minutes, 0, 0);

  let addDays = (dow - candidate.getUTCDay() + 7) % 7;
  candidate.setUTCDate(candidate.getUTCDate() + addDays);

  if (candidate.getTime() <= fromUtc.getTime()) {
    candidate.setUTCDate(candidate.getUTCDate() + 7);
  }

  return candidate;
}

/**
 * After a successful run, schedule the next run one week later at the user's
 * chosen clock time (UTC), anchored to lastRunAt (typically the time we just ran).
 */
export function computeNextRunFromLastRunUtc(
  scheduleTime: string,
  lastRunAt: Date,
): Date {
  const parts = scheduleTime.split(":");
  const hh = Number.parseInt(parts[0] ?? "7", 10);
  const mm = Number.parseInt(parts[1] ?? "0", 10);
  const hours = Number.isFinite(hh) ? hh : 7;
  const minutes = Number.isFinite(mm) ? mm : 0;

  const next = new Date(lastRunAt);
  next.setUTCDate(next.getUTCDate() + 7);
  next.setUTCHours(hours, minutes, 0, 0);
  return next;
}
