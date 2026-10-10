/**
 * Per-client, per-month service summary built during the scan.
 *
 * Stored compactly on the scan results so Value Receipts™ and Client Margin can
 * be produced for any client and month without another PSA call. Every figure
 * is a count, median or sum of what the PSA recorded; nothing is estimated.
 *
 * Attribution rules (so numbers are explainable):
 * - opened: tickets entered in the month.
 * - closed: tickets closed in the month.
 * - hours: total hours logged on tickets closed in the month. PSAs store
 *   hours per ticket, not per day, so a long ticket's hours land in the month
 *   it closed.
 * - firstResponseHours: median for tickets entered in the month.
 * - resolutionHours: median entered-to-closed time for tickets closed in the month.
 */
import type { ScanTicketInput } from "@/lib/psa/scan-aggregate";

const HOUR_MS = 3_600_000;

/** Complete months kept per client, plus the current month to date. */
export const CLIENT_MONTHLY_MONTHS = 6;

export type ClientMonthStats = {
  /** YYYY-MM (UTC). */
  month: string;
  opened: number;
  closed: number;
  /** Closed tickets marked high, urgent, critical or P1/P2. */
  urgentClosed: number;
  /** Median hours to first response, tickets entered this month. */
  firstResponseHours: number | null;
  /** Median hours from entry to close, tickets closed this month. */
  resolutionHours: number | null;
  /** Tickets entered outside 08:00 to 18:00 on weekdays (UTC). */
  outOfHours: number;
  /** Distinct people who raised a ticket this month. */
  peopleHelped: number;
  /** Hours logged on tickets closed this month. */
  hours: number;
  /** Closed tickets this month that had any hours logged. */
  closedWithHours: number;
  /** Tickets still open at the end of the month. */
  openAtEnd: number;
  /**
   * Tickets raised this month that the PSA shows as closed but with no close
   * date. They cannot be placed in a month, so they are not counted as resolved.
   */
  closedUndated?: number;
  /** Most common ticket types closed this month, most frequent first. */
  topTypes: Array<{ type: string; count: number }>;
};

export type ClientMonthly = {
  clientId: number;
  /** Oldest month first. The last entry may be the current, partial month. */
  months: ClientMonthStats[];
};

export type ClientMonthlyResult = {
  version: 1;
  generatedAt: string;
  /** YYYY-MM of the current (partial) month at scan time. */
  currentMonth: string;
  clients: ClientMonthly[];
};

function parseMs(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

function monthKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthEndMs(key: string): number {
  const [y, m] = key.split("-").map(Number);
  return Date.UTC(y!, m!, 1) - 1;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
  return Math.round(value * 10) / 10;
}

/** At least 3 measured tickets, covering at least half of the month's tickets. */
function enoughSamples(measured: number, total: number): boolean {
  return measured >= 3 && total > 0 && measured / total >= 0.5;
}

function isUrgent(priority: string | null | undefined): boolean {
  const p = (priority ?? "").trim().toLowerCase();
  if (!p) return false;
  return (
    p.includes("high") ||
    p.includes("urgent") ||
    p.includes("critical") ||
    p.includes("emergency") ||
    /^p\s*[12]\b/.test(p) ||
    /^[12]\s*[-:]/.test(p) ||
    p === "1" ||
    p === "2"
  );
}

function isOutOfHours(ms: number): boolean {
  const d = new Date(ms);
  const day = d.getUTCDay();
  const hour = d.getUTCHours();
  return day === 0 || day === 6 || hour < 8 || hour >= 18;
}

/** The last `count` month keys ending with the month of `nowMs`, oldest first. */
export function recentMonthKeys(nowMs: number, count: number): string[] {
  const d = new Date(nowMs);
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const ms = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1);
    keys.push(monthKey(ms));
  }
  return keys;
}

export function buildClientMonthly(
  tickets: ScanTicketInput[],
  nowMs: number = Date.now(),
): ClientMonthlyResult {
  const keys = recentMonthKeys(nowMs, CLIENT_MONTHLY_MONTHS + 1);
  const keySet = new Set(keys);
  const firstMonthStart = Date.UTC(
    Number(keys[0]!.slice(0, 4)),
    Number(keys[0]!.slice(5, 7)) - 1,
    1,
  );

  type Bucket = {
    opened: number;
    closed: number;
    urgentClosed: number;
    responses: number[];
    resolutions: number[];
    outOfHours: number;
    people: Set<string>;
    hours: number;
    closedWithHours: number;
    closedUndated: number;
    types: Map<string, number>;
  };
  const byClient = new Map<number, Map<string, Bucket>>();
  const ticketsByClient = new Map<number, ScanTicketInput[]>();

  const bucket = (clientId: number, key: string): Bucket => {
    let months = byClient.get(clientId);
    if (!months) {
      months = new Map();
      byClient.set(clientId, months);
    }
    let b = months.get(key);
    if (!b) {
      b = {
        opened: 0,
        closed: 0,
        urgentClosed: 0,
        responses: [],
        resolutions: [],
        outOfHours: 0,
        people: new Set(),
        hours: 0,
        closedWithHours: 0,
        closedUndated: 0,
        types: new Map(),
      };
      months.set(key, b);
    }
    return b;
  };

  for (const ticket of tickets) {
    if (!Number.isSafeInteger(ticket.clientId) || ticket.clientId <= 0) continue;
    const entered = parseMs(ticket.dateEntered);
    const closed = parseMs(ticket.dateClosed);
    if (entered == null && closed == null) continue;
    // Closed before the window: irrelevant. Entered before the window and still
    // open: kept, because it counts towards "open at month end".
    if (closed != null && closed < firstMonthStart) continue;
    const list = ticketsByClient.get(ticket.clientId) ?? [];
    list.push(ticket);
    ticketsByClient.set(ticket.clientId, list);

    const requester = ticket.requester?.trim().toLowerCase() || null;

    if (entered != null) {
      const key = monthKey(entered);
      if (keySet.has(key)) {
        const b = bucket(ticket.clientId, key);
        b.opened += 1;
        if (isOutOfHours(entered)) b.outOfHours += 1;
        if (requester) b.people.add(requester);
        if (closed == null && ticket.statusOpen === false) b.closedUndated += 1;
        const responded = ticket.responseReliable === false ? null : parseMs(ticket.dateResponded);
        if (responded != null && responded >= entered) {
          b.responses.push((responded - entered) / HOUR_MS);
        }
      }
    }

    if (closed != null) {
      const key = monthKey(closed);
      if (keySet.has(key)) {
        const b = bucket(ticket.clientId, key);
        b.closed += 1;
        if (isUrgent(ticket.priority)) b.urgentClosed += 1;
        if (entered != null && closed >= entered && ticket.resolutionReliable !== false) {
          b.resolutions.push((closed - entered) / HOUR_MS);
        }
        const hours = ticket.hoursLogged;
        if (typeof hours === "number" && Number.isFinite(hours) && hours > 0) {
          b.hours += hours;
          b.closedWithHours += 1;
        }
        const type = ticket.ticketType?.trim();
        if (type) b.types.set(type, (b.types.get(type) ?? 0) + 1);
      }
    }
  }

  const clients: ClientMonthly[] = [];
  for (const [clientId, months] of byClient) {
    const clientTickets = ticketsByClient.get(clientId) ?? [];
    clients.push({
      clientId,
      months: keys.map((key) => {
        const b = months.get(key);
        const endMs = Math.min(monthEndMs(key), nowMs);
        const openAtEnd = clientTickets.filter((ticket) => {
          const entered = parseMs(ticket.dateEntered);
          if (entered == null || entered > endMs) return false;
          const closed = parseMs(ticket.dateClosed);
          if (closed != null) return closed > endMs;
          // No close date: only count it when the PSA positively says it is
          // still open. Closed-without-a-date tickets must not inflate this.
          return ticket.statusOpen === true;
        }).length;
        return {
          month: key,
          opened: b?.opened ?? 0,
          closed: b?.closed ?? 0,
          urgentClosed: b?.urgentClosed ?? 0,
          // Only report a typical time when enough of the month's tickets were measured.
          firstResponseHours: b && enoughSamples(b.responses.length, b.opened) ? median(b.responses) : null,
          resolutionHours: b && enoughSamples(b.resolutions.length, b.closed) ? median(b.resolutions) : null,
          outOfHours: b?.outOfHours ?? 0,
          peopleHelped: b?.people.size ?? 0,
          hours: b ? Math.round(b.hours * 10) / 10 : 0,
          closedWithHours: b?.closedWithHours ?? 0,
          openAtEnd,
          closedUndated: b?.closedUndated ?? 0,
          topTypes: b
            ? [...b.types.entries()]
                .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
                .slice(0, 3)
                .map(([type, count]) => ({ type, count }))
            : [],
        };
      }),
    });
  }
  clients.sort((a, b) => a.clientId - b.clientId);

  return {
    version: 1,
    generatedAt: new Date(nowMs).toISOString(),
    currentMonth: keys[keys.length - 1]!,
    clients,
  };
}
