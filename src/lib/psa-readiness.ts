/**
 * PSA Readiness
 *
 * How much of Handover the customer's PSA data can support today, feature by
 * feature, with the exact change that would unlock the rest. Built only from
 * coverage figures the scan already measured; nothing here is estimated.
 */
import type { StoredScanResults } from "@/lib/psa/scan-session";

export type ReadinessLevel = "ready" | "partial" | "missing";

export type ReadinessItem = {
  key: "values" | "time" | "timings" | "renewals" | "owners";
  feature: string;
  level: ReadinessLevel;
  /** What the data supports today, in one sentence. */
  status: string;
  /** The change that would unlock it, when not ready. */
  fix: string | null;
  /** Where the fix can be made inside Handover, when there is one. */
  actionHref?: string;
  actionLabel?: string;
};

export type PsaReadiness = {
  items: ReadinessItem[];
  readyCount: number;
  /** Closed tickets in the last three complete months with no time recorded. */
  unloggedClosedTickets: number | null;
};

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((100 * part) / total) : 0;
}

export function buildPsaReadiness(results: StoredScanResults): PsaReadiness {
  const isCw = results.psaType === "connectwise";
  const items: ReadinessItem[] = [];
  const clientIds = new Set<number>([
    ...Object.keys(results.clientNames ?? {}).map(Number),
    ...(results.findings ?? []).map((finding) => finding.clientId),
  ]);
  clientIds.delete(0);
  const valued = Object.values(results.clientValues ?? {}).filter((value) => value > 0).length;
  const clientCount = Math.max(clientIds.size, valued);

  // 1. Revenue values
  const valuesReadable = results.exposureAvailability !== "unavailable";
  const valueShare = pct(valued, clientCount);
  items.push({
    key: "values",
    feature: "Revenue amounts",
    level: valued === 0 ? "missing" : valueShare >= 80 ? "ready" : "partial",
    status:
      valued === 0
        ? valuesReadable
          ? "Your contracts and recurring invoices carry no monthly value, so no pound amounts can be shown."
          : "Handover cannot read contracts or recurring invoices, so no pound amounts can be shown."
        : `${valued} of ${clientCount} clients have a monthly value (${valueShare}%).`,
    fix:
      valued > 0 && valueShare >= 80
        ? null
        : !valuesReadable
          ? isCw
            ? "In ConnectWise, give the Handover API member's security role Inquire access to Finance → Agreements, then refresh. Or type values in by hand."
            : "In HaloPSA, open Configuration → Integrations → HaloPSA API, edit the Handover application and allow read access to contracts and invoices, then refresh. Or type values in by hand."
          : "Add a monthly charge to each client's contract or recurring invoice in your PSA, or type the missing values in by hand.",
    actionHref: valueShare >= 80 ? undefined : "/margin#values",
    actionLabel: valueShare >= 80 ? undefined : "Add values by hand",
  });

  // 2. Time logged, from the last three complete months of closed tickets.
  let closed = 0;
  let withHours = 0;
  const monthly = results.clientMonthly;
  if (monthly) {
    const months = new Set(
      (monthly.clients[0]?.months ?? [])
        .map((month) => month.month)
        .filter((month) => month < monthly.currentMonth)
        .slice(-3),
    );
    for (const client of monthly.clients) {
      for (const month of client.months) {
        if (!months.has(month.month)) continue;
        closed += month.closed;
        withHours += month.closedWithHours;
      }
    }
  }
  const timeShare = pct(withHours, closed);
  items.push({
    key: "time",
    feature: "Client Margin",
    level: !monthly || closed === 0 ? "missing" : timeShare >= 70 ? "ready" : timeShare >= 30 ? "partial" : "missing",
    status: !monthly
      ? "Run a fresh scan to measure time logged."
      : closed === 0
        ? "No tickets were closed in the last three months."
        : `Time is recorded on ${timeShare}% of tickets closed in the last three months.`,
    fix:
      monthly && closed > 0 && timeShare < 70
        ? isCw
          ? "Require a time entry before a ticket can be closed on each service board, so every closed ticket carries its hours."
          : "In HaloPSA, make time entry mandatory on the action your team uses to close tickets (Configuration → Tickets → Actions), so every closed ticket carries its hours."
        : null,
  });

  // 3. Response and resolution timestamps.
  const response = results.portfolio.responseTimestampCoveragePct;
  const close = results.portfolio.closeTimestampCoveragePct;
  const worst = Math.min(response ?? 0, close ?? 0);
  items.push({
    key: "timings",
    feature: "Response and resolution times",
    level: response == null || close == null ? "missing" : worst >= 85 ? "ready" : worst >= 50 ? "partial" : "missing",
    status:
      response == null || close == null
        ? "Response or close dates were not returned by your PSA."
        : `First response recorded on ${Math.round(response)}% of tickets, close date on ${Math.round(close)}%.`,
    fix:
      response != null && close != null && worst >= 85
        ? null
        : "Close tickets inside the PSA (not by bulk import or status change scripts) so each one gets a real close date, and make sure the first reply to a client is logged as an action.",
  });

  // 4. Renewal dates.
  const renewals = results.renewals;
  items.push({
    key: "renewals",
    feature: "Renewal Radar",
    level: renewals == null ? "missing" : renewals.length > 0 || valuesReadable ? "ready" : "missing",
    status:
      renewals == null
        ? "Run a fresh scan to read contract end dates."
        : renewals.length > 0
          ? `${renewals.length} contract${renewals.length === 1 ? "" : "s"} end in the next 12 months.`
          : valuesReadable
            ? "No contract ends in the next 12 months."
            : "Contract end dates cannot be read.",
    fix:
      renewals != null && (renewals.length > 0 || valuesReadable)
        ? null
        : isCw
          ? "Give the API member Inquire access to Finance → Agreements, and set an end date on each agreement."
          : "Allow the Handover API application to read contracts, and set an end date on each client contract.",
  });

  // 5. Account owners.
  const unowned = results.portfolio.clientsWithoutOwner;
  items.push({
    key: "owners",
    feature: "Named account owners",
    level: unowned == null ? "partial" : unowned === 0 ? "ready" : "partial",
    status:
      unowned == null
        ? "Owner data was not returned by your PSA."
        : unowned === 0
          ? "Every client's tickets have an assigned owner."
          : `${unowned} client${unowned === 1 ? " has" : "s have"} tickets with no assigned owner.`,
    fix:
      unowned === 0
        ? null
        : "Assign tickets to a named agent and give each client an account manager, so every Save Play has someone to run it.",
  });

  return {
    items,
    readyCount: items.filter((item) => item.level === "ready").length,
    unloggedClosedTickets: monthly && closed > 0 ? closed - withHours : null,
  };
}
