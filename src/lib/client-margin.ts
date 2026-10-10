/**
 * Client Margin
 *
 * Revenue per hour delivered, per client: current monthly recurring value
 * divided by the average monthly hours logged on that client's tickets over
 * the last three complete months. Compared with the portfolio median rather
 * than a cost rate, so nothing is assumed about salaries or overheads.
 *
 * Combined with Revenue at Risk, every measurable client lands in one of four
 * groups, which is what an owner actually acts on.
 */
import type { ClientMonthlyResult } from "@/lib/psa/client-monthly";
import { isRiskFinding } from "@/lib/revenue/revenue-signals";

/** Months of history averaged for hours. */
export const MARGIN_MONTHS = 3;
/** Below this share of the portfolio median, a client's margin counts as thin. */
export const THIN_MARGIN_RATIO = 0.75;
/** Clients need at least this many hours a month for a rate to mean anything. */
const MIN_HOURS_PER_MONTH = 1;
/** Clients need hours on at least this share of closed tickets to be measured. */
const MIN_CLIENT_HOURS_COVERAGE = 0.5;

export type MarginGroup = "save" | "fix" | "reprice" | "protect";

export type ClientMarginRow = {
  clientId: number;
  clientName: string;
  monthlyValue: number | null;
  hoursPerMonth: number;
  ticketsPerMonth: number;
  revenuePerHour: number | null;
  /** revenuePerHour divided by the portfolio median. */
  vsMedian: number | null;
  atRisk: boolean;
  group: MarginGroup | null;
  /** Why a client could not be measured, when group is null. */
  unmeasuredReason: string | null;
  /**
   * For thin-margin clients: the extra monthly value that would bring them up
   * to your typical revenue per hour, at the hours they take today.
   */
  repriceMonthlyGap: number | null;
};

export type ClientMargin = {
  months: string[];
  medianRevenuePerHour: number | null;
  /** Share of closed tickets across the portfolio with hours logged (0 to 1). */
  hoursCoverage: number;
  totalMonthlyValue: number;
  rows: ClientMarginRow[];
  /** True when contract values were available from the PSA. */
  valuesAvailable: boolean;
  /** Sum of repriceMonthlyGap across thin-margin clients, per year. */
  repriceAnnualTotal: number;
};

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

  let closedTotal = 0;
  let closedWithHoursTotal = 0;
  const base = monthly.clients.map((client) => {
    const window = client.months.filter((m) => monthSet.has(m.month));
    const hours = window.reduce((sum, m) => sum + m.hours, 0);
    const closed = window.reduce((sum, m) => sum + m.closed, 0);
    const closedWithHours = window.reduce((sum, m) => sum + m.closedWithHours, 0);
    closedTotal += closed;
    closedWithHoursTotal += closedWithHours;
    const monthCount = Math.max(1, months.length);
    const monthlyValue = clientValues?.[String(client.clientId)] ?? null;
    const hoursPerMonth = hours / monthCount;
    const coverage = closed > 0 ? closedWithHours / closed : 0;
    let unmeasuredReason: string | null = null;
    if (monthlyValue == null) unmeasuredReason = "No contract value in the PSA";
    else if (closed === 0) unmeasuredReason = "No tickets closed in the last three months";
    else if (coverage < MIN_CLIENT_HOURS_COVERAGE) unmeasuredReason = "Time is not logged on most tickets";
    else if (hoursPerMonth < MIN_HOURS_PER_MONTH) unmeasuredReason = "Less than an hour a month logged";
    const revenuePerHour = unmeasuredReason == null ? monthlyValue! / hoursPerMonth : null;
    const name = clientNames[String(client.clientId)]?.trim();
    return {
      clientId: client.clientId,
      clientName: name && !["unknown", "unassigned", "n/a"].includes(name.toLowerCase()) ? name : `Client #${client.clientId}`,
      monthlyValue,
      hoursPerMonth: Math.round(hoursPerMonth * 10) / 10,
      ticketsPerMonth: Math.round((closed / monthCount) * 10) / 10,
      revenuePerHour: revenuePerHour == null ? null : Math.round(revenuePerHour),
      atRisk: riskClients.has(client.clientId),
      unmeasuredReason,
    };
  });

  const medianRevenuePerHour = median(
    base.map((row) => row.revenuePerHour).filter((value): value is number => value != null),
  );

  const rows: ClientMarginRow[] = base
    .filter((row) => row.monthlyValue != null || row.ticketsPerMonth > 0)
    .map((row) => {
      const vsMedian =
        row.revenuePerHour != null && medianRevenuePerHour
          ? Math.round((row.revenuePerHour / medianRevenuePerHour) * 100) / 100
          : null;
      let group: MarginGroup | null = null;
      let repriceMonthlyGap: number | null = null;
      if (vsMedian != null) {
        const thin = vsMedian < THIN_MARGIN_RATIO;
        group = row.atRisk ? (thin ? "fix" : "save") : thin ? "reprice" : "protect";
        if (thin && medianRevenuePerHour && row.monthlyValue != null) {
          const gap = medianRevenuePerHour * row.hoursPerMonth - row.monthlyValue;
          repriceMonthlyGap = gap > 0 ? Math.round(gap / 10) * 10 : null;
        }
      }
      return { ...row, vsMedian, group, repriceMonthlyGap };
    })
    .sort(
      (a, b) =>
        (b.monthlyValue ?? -1) - (a.monthlyValue ?? -1) || a.clientName.localeCompare(b.clientName),
    );

  return {
    months,
    medianRevenuePerHour: medianRevenuePerHour == null ? null : Math.round(medianRevenuePerHour),
    hoursCoverage: closedTotal > 0 ? closedWithHoursTotal / closedTotal : 0,
    totalMonthlyValue: Math.round(
      rows.reduce((sum, row) => sum + (row.monthlyValue ?? 0), 0),
    ),
    rows,
    valuesAvailable: Boolean(clientValues && Object.keys(clientValues).length > 0),
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
    body: "Steady relationship, but they take far more time than they pay for. Bring the numbers to the renewal.",
  },
  protect: {
    title: "Protect and grow",
    body: "Healthy and profitable. Keep them happy and look for room to expand.",
  },
};
