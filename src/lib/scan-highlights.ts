/**
 * The headline of each Handover product, worked out from one scan, for the
 * scan results page. Every figure comes from the same calculations the app
 * uses (Renewal Radar, Client Margin, Value Receipts), so what a prospect sees
 * here is exactly what they get after signing up.
 *
 * Client names are only included when `withNames` is true (paying viewers);
 * anonymous previews get the numbers alone.
 */
import { buildClientMargin, rateUnit } from "@/lib/client-margin";
import { shortCategory } from "@/lib/psa/client-monthly";
import type { StoredScanResults } from "@/lib/psa/scan-session";
import { buildRenewalRadar } from "@/lib/renewal-radar";
import { isRiskFinding } from "@/lib/revenue/revenue-signals";

export type ScanHighlights = {
  /** Revenue held by clients with a real warning sign (housekeeping excluded), each client counted once. */
  atRisk: { annualValue: number; clients: number; clientsWithoutValue: number } | null;
  renewals: {
    next90Count: number;
    next90AnnualValue: number;
    next90AtRiskAnnualValue: number;
    next12Count: number;
    nextDays: number | null;
    nextClient: string | null;
  } | null;
  margin: {
    unit: "hour" | "ticket";
    medianRate: number;
    measured: number;
    thinCount: number;
    annualGap: number;
    lowestRate: number | null;
    lowestVsMedian: number | null;
    lowestClient: string | null;
  } | null;
  receipts: {
    month: string;
    clients: number;
    resolved: number;
    hours: number | null;
  } | null;
  recurring: {
    label: string;
    count: number;
    clients: number;
    months: number;
  } | null;
};

function name(results: StoredScanResults, clientId: number, withNames: boolean): string | null {
  if (!withNames) return null;
  const value = results.clientNames?.[String(clientId)]?.trim();
  return value || `Client #${clientId}`;
}

export function buildScanHighlights(
  results: StoredScanResults | null | undefined,
  withNames: boolean,
): ScanHighlights | null {
  if (!results) return null;
  const refs = (results.findings ?? []).map((finding) => ({ clientId: finding.clientId, type: finding.type }));
  const departed = new Set((results.churnReplay?.clients ?? []).map((client) => client.clientId));
  const monthly = results.clientMonthly
    ? { ...results.clientMonthly, clients: results.clientMonthly.clients.filter((client) => !departed.has(client.clientId)) }
    : null;

  const margin = monthly
    ? buildClientMargin({
        monthly,
        clientValues: results.clientValues,
        findings: refs,
        clientNames: results.clientNames ?? {},
      })
    : null;
  const measured = (margin?.rows ?? []).filter((row) => row.rate != null);
  const lowest = [...measured].sort((a, b) => (a.vsMedian ?? 0) - (b.vsMedian ?? 0))[0];
  const marginOut =
    margin && margin.medianRate != null && measured.length >= 3
      ? {
          unit: rateUnit(margin.basis),
          medianRate: margin.medianRate,
          measured: measured.length,
          thinCount: margin.rows.filter((row) => row.group === "reprice" || row.group === "fix").length,
          annualGap: margin.repriceAnnualTotal,
          lowestRate: lowest?.rate ?? null,
          lowestVsMedian: lowest?.vsMedian ?? null,
          lowestClient: lowest ? name(results, lowest.clientId, withNames) : null,
        }
      : null;

  const radar = results.renewals
    ? buildRenewalRadar({
        renewals: results.renewals.filter((renewal) => !departed.has(renewal.clientId)),
        findings: refs,
        margin,
        clientNames: results.clientNames ?? {},
      })
    : null;
  const renewalsOut =
    radar && radar.rows.length > 0
      ? {
          next90Count: radar.next90Count,
          next90AnnualValue: radar.next90AnnualValue,
          next90AtRiskAnnualValue: radar.next90AtRiskAnnualValue,
          next12Count: radar.rows.length,
          nextDays: radar.rows[0]?.daysLeft ?? null,
          nextClient: radar.rows[0] ? name(results, radar.rows[0].clientId, withNames) : null,
        }
      : null;

  // Last complete month: how many clients could get a receipt today.
  let receiptsOut: ScanHighlights["receipts"] = null;
  let recurringOut: ScanHighlights["recurring"] = null;
  if (monthly) {
    const lastMonth = monthly.clients[0]?.months.map((m) => m.month).filter((m) => m < monthly.currentMonth).at(-1);
    if (lastMonth) {
      let clients = 0;
      let resolved = 0;
      let hours = 0;
      let closedWithHours = 0;
      for (const client of monthly.clients) {
        const m = client.months.find((month) => month.month === lastMonth);
        if (!m || m.closed === 0) continue;
        clients += 1;
        resolved += m.closed;
        hours += m.hours;
        closedWithHours += m.closedWithHours;
      }
      if (clients > 0) {
        receiptsOut = {
          month: lastMonth,
          clients,
          resolved,
          hours: resolved > 0 && closedWithHours / resolved >= 0.5 ? Math.round(hours) : null,
        };
      }
    }

    // The most repeated kind of request across the portfolio over three months.
    const window = new Set(
      (monthly.clients[0]?.months ?? []).map((m) => m.month).filter((m) => m < monthly.currentMonth).slice(-3),
    );
    const counts = new Map<string, { count: number; clients: Set<number> }>();
    for (const client of monthly.clients) {
      for (const m of client.months) {
        if (!window.has(m.month)) continue;
        for (const row of m.topCategories ?? []) {
          const label = shortCategory(row.category) ?? row.category;
          const entry = counts.get(label) ?? { count: 0, clients: new Set<number>() };
          entry.count += row.count;
          entry.clients.add(client.clientId);
          counts.set(label, entry);
        }
      }
    }
    const top = [...counts.entries()].sort((a, b) => b[1].count - a[1].count)[0];
    if (top && top[1].count >= 10) {
      recurringOut = { label: top[0], count: top[1].count, clients: top[1].clients.size, months: window.size };
    }
  }

  const riskValue = new Map<number, number | null>();
  for (const finding of results.findings ?? []) {
    if (!isRiskFinding(finding.type) || departed.has(finding.clientId)) continue;
    const value = finding.monthlyValue != null && finding.monthlyValue > 0 ? finding.monthlyValue : null;
    riskValue.set(finding.clientId, Math.max(riskValue.get(finding.clientId) ?? 0, value ?? 0) || null);
  }
  const atRiskOut =
    riskValue.size > 0
      ? {
          annualValue: Math.round([...riskValue.values()].reduce<number>((sum, value) => sum + (value ?? 0), 0) * 12),
          clients: riskValue.size,
          clientsWithoutValue: [...riskValue.values()].filter((value) => value == null).length,
        }
      : null;

  if (!atRiskOut && !renewalsOut && !marginOut && !receiptsOut && !recurringOut) return null;
  return { atRisk: atRiskOut, renewals: renewalsOut, margin: marginOut, receipts: receiptsOut, recurring: recurringOut };
}
