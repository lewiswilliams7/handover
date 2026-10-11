/**
 * Client Margin
 *
 * What each client pays compared with the work they create, against your
 * typical client. Two ways of measuring work, both counted, never estimated:
 *
 * - hours: average monthly hours logged on the client's tickets over the last
 *   three complete months. Used when your team logs time on enough tickets for
 *   at least three clients to be measured.
 * - tickets: average tickets a month over the same months. Used when time is
 *   not logged well enough. Less precise (a password reset counts the same as
 *   a server rebuild), but it needs nothing your PSA does not already hold.
 *
 * Compared with the portfolio median rather than a cost rate, so nothing is
 * assumed about salaries or overheads. Combined with Revenue at Risk, every
 * measurable client lands in one of four groups.
 */
import type { ClientMonthlyResult } from "@/lib/psa/client-monthly";
import { isRiskFinding } from "@/lib/revenue/revenue-signals";

/** Months of history averaged. */
export const MARGIN_MONTHS = 3;
/** Below this share of the portfolio median, a client's margin counts as thin. */
export const THIN_MARGIN_RATIO = 0.75;
/** Clients need at least this many hours a month for an hourly rate to mean anything. */
const MIN_HOURS_PER_MONTH = 1;
/** Clients need hours on at least this share of closed tickets to be measured on hours. */
const MIN_CLIENT_HOURS_COVERAGE = 0.5;
/** Tickets needed across the three months for a per-ticket rate. */
const MIN_TICKETS_IN_WINDOW = 3;
/** Clients that must be measurable on hours before hours are used. */
const MIN_HOURS_CLIENTS = 3;

export type MarginGroup = "save" | "fix" | "reprice" | "protect";
export type MarginBasis = "hours" | "tickets";

export type ClientMarginRow = {
  clientId: number;
  clientName: string;
  monthlyValue: number | null;
  hoursPerMonth: number;
  ticketsPerMonth: number;
  /** Monthly value divided by monthly hours or tickets, depending on the basis. */
  rate: number | null;
  /** rate divided by the portfolio median. */
  vsMedian: number | null;
  atRisk: boolean;
  group: MarginGroup | null;
  /** Why a client could not be measured, when group is null. */
  unmeasuredReason: string | null;
  /**
   * For thin-margin clients: the extra monthly value that would bring them up
   * to your typical rate, at the work they create today.
   */
  repriceMonthlyGap: number | null;
};

export type ClientMargin = {
  basis: MarginBasis;
  /** True when enough clients could be measured on hours. */
  hoursAvailable: boolean;
  months: string[];
  medianRate: number | null;
  /** Share of closed tickets across the portfolio with hours logged (0 to 1). */
  hoursCoverage: number;
  totalMonthlyValue: number;
  rows: ClientMarginRow[];
  /** True when any client has a monthly value. */
  valuesAvailable: boolean;
  /** Sum of repriceMonthlyGap across thin-margin clients, per year. */
  repriceAnnualTotal: number;
};

export function rateUnit(basis: MarginBasis): "hour" | "ticket" {
  return basis === "hours" ? "hour" : "ticket";
}

/** Monthly hours or tickets for a row, matching the basis. */
export function workPerMonth(row: Pick<ClientMarginRow, "hoursPerMonth" | "ticketsPerMonth">, basis: MarginBasis): number {
  return basis === "hours" ? row.hoursPerMonth : row.ticketsPerMonth;
}

export function workLabel(value: number, basis: MarginBasis): string {
  const rounded = Math.round(value * 10) / 10;
  if (basis === "hours") return `${rounded} hour${rounded === 1 ? "" : "s"}`;
  return `${rounded} ticket${rounded === 1 ? "" : "s"}`;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

export function buildClientMargin(input: {
  monthly: ClientMonthlyResult;
  clientValues: Record<string, number> | null | undefined;
  findings: Array<{ clientId: number; type: string }>;
  clientNames: Record<string, string>;
  /** Force a basis. Ignored when hours are not available. */
  basis?: MarginBasis;
}): ClientMargin {
  const { monthly, clientValues, findings, clientNames } = input;
  const months =
    monthly.clients[0]?.months
      .map((m) => m.month)
      .filter((m) => m < monthly.currentMonth)
      .slice(-MARGIN_MONTHS) ?? [];
  const monthSet = new Set(months);
  const riskClients = new Set(
    findings.filter((finding) => isRiskFinding(finding.type)).map((finding) => finding.clientId),
  );
  const monthCount = Math.max(1, months.length);

  let closedTotal = 0;
  let closedWithHoursTotal = 0;
  const base = monthly.clients.map((client) => {
      const window = client.months.filter((m) => monthSet.has(m.month));
      const hours = window.reduce((sum, m) => sum + m.hours, 0);
      const closed = window.reduce((sum, m) => sum + m.closed, 0);
      const closedWithHours = window.reduce((sum, m) => sum + m.closedWithHours, 0);
      closedTotal += closed;
      closedWithHoursTotal += closedWithHours;
      const value = clientValues?.[String(client.clientId)];
      const monthlyValue = value != null && value > 0 ? value : null;
      const hoursPerMonth = hours / monthCount;
      const coverage = closed > 0 ? closedWithHours / closed : 0;
      let hoursReason: string | null = null;
      if (monthlyValue == null) hoursReason = "No monthly value recorded";
      else if (closed === 0) hoursReason = "No tickets closed in the last three months";
      else if (coverage < MIN_CLIENT_HOURS_COVERAGE) hoursReason = "Time is not logged on most of their tickets";
      else if (hoursPerMonth < MIN_HOURS_PER_MONTH) hoursReason = "Less than an hour a month logged";
      let ticketReason: string | null = null;
      if (monthlyValue == null) ticketReason = "No monthly value recorded";
      else if (closed === 0) ticketReason = "No tickets closed in the last three months";
      else if (closed < MIN_TICKETS_IN_WINDOW) ticketReason = `Only ${closed} ticket${closed === 1 ? "" : "s"} in three months, too few to compare`;
      const name = clientNames[String(client.clientId)]?.trim();
      return {
        clientId: client.clientId,
        clientName: name && !["unknown", "unassigned", "n/a"].includes(name.toLowerCase()) ? name : `Client #${client.clientId}`,
        monthlyValue,
        hoursPerMonth: Math.round(hoursPerMonth * 10) / 10,
        ticketsPerMonth: Math.round((closed / monthCount) * 10) / 10,
        rawHoursPerMonth: hoursPerMonth,
        rawTicketsPerMonth: closed / monthCount,
        hoursReason,
        ticketReason,
        atRisk: riskClients.has(client.clientId),
      };
    });

  const hoursMeasurable = base.filter((row) => row.hoursReason == null).length;
  const hoursAvailable = hoursMeasurable >= MIN_HOURS_CLIENTS;
  const basis: MarginBasis = hoursAvailable && input.basis !== "tickets" ? "hours" : "tickets";

  const withRate = base.map((row) => {
    const reason = basis === "hours" ? row.hoursReason : row.ticketReason;
    const work = basis === "hours" ? row.rawHoursPerMonth : row.rawTicketsPerMonth;
    const rate = reason == null && row.monthlyValue != null && work > 0 ? row.monthlyValue / work : null;
    return { ...row, unmeasuredReason: reason, rate: rate == null ? null : Math.round(rate) };
  });

  const medianRate = median(withRate.map((row) => row.rate).filter((value): value is number => value != null));

  const rows: ClientMarginRow[] = withRate
    .filter((row) => row.monthlyValue != null || row.ticketsPerMonth > 0)
    .map((row) => {
      const vsMedian =
        row.rate != null && medianRate ? Math.round((row.rate / medianRate) * 100) / 100 : null;
      let group: MarginGroup | null = null;
      let repriceMonthlyGap: number | null = null;
      if (vsMedian != null) {
        const thin = vsMedian < THIN_MARGIN_RATIO;
        group = row.atRisk ? (thin ? "fix" : "save") : thin ? "reprice" : "protect";
        if (thin && medianRate && row.monthlyValue != null) {
          const work = basis === "hours" ? row.rawHoursPerMonth : row.rawTicketsPerMonth;
          const gap = medianRate * work - row.monthlyValue;
          repriceMonthlyGap = gap > 0 ? Math.round(gap / 10) * 10 : null;
        }
      }
      return {
        clientId: row.clientId,
        clientName: row.clientName,
        monthlyValue: row.monthlyValue,
        hoursPerMonth: row.hoursPerMonth,
        ticketsPerMonth: row.ticketsPerMonth,
        rate: row.rate,
        vsMedian,
        atRisk: row.atRisk,
        group,
        unmeasuredReason: row.unmeasuredReason,
        repriceMonthlyGap,
      };
    })
    .sort(
      (a, b) =>
        (b.monthlyValue ?? -1) - (a.monthlyValue ?? -1) || a.clientName.localeCompare(b.clientName),
    );

  return {
    basis,
    hoursAvailable,
    months,
    medianRate: medianRate == null ? null : Math.round(medianRate),
    hoursCoverage: closedTotal > 0 ? closedWithHoursTotal / closedTotal : 0,
    totalMonthlyValue: Math.round(rows.reduce((sum, row) => sum + (row.monthlyValue ?? 0), 0)),
    rows,
    valuesAvailable: rows.some((row) => row.monthlyValue != null),
    repriceAnnualTotal: rows.reduce((sum, row) => sum + (row.repriceMonthlyGap ?? 0), 0) * 12,
  };
}

export const MARGIN_GROUP_COPY: Record<MarginGroup, { title: string; body: string }> = {
  save: {
    title: "Save these first",
    body: "Profitable clients whose service or relationship has changed. Losing one of these hurts most.",
  },
  fix: {
    title: "Fix or reprice",
    body: "Changing behaviour and thin margin. Fix the service problem, then look at the contract.",
  },
  reprice: {
    title: "Reprice at renewal",
    body: "Steady relationship, but they create far more work than they pay for. Bring the numbers to the renewal.",
  },
  protect: {
    title: "Protect and grow",
    body: "Healthy and profitable. Keep them happy and look for room to expand.",
  },
};
