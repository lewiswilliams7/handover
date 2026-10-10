/**
 * Renewal Radar
 *
 * Every live contract ending in the next 12 months, with what Handover already
 * knows about that client: whether service or the relationship has changed
 * (Revenue at Risk), whether they pay for the time they take (Client Margin),
 * and therefore what to do before the renewal conversation.
 *
 * Nothing is predicted. Each recommendation follows from signals shown
 * elsewhere in the product, and says which ones.
 */
import type { ClientMargin, MarginGroup } from "@/lib/client-margin";
import { getFindingCopy } from "@/lib/psa/scan-finding-copy";
import { isRiskFinding } from "@/lib/revenue/revenue-signals";

export type RenewalMove = "fix" | "save" | "reprice" | "expand" | "renew";

export type RenewalRow = {
  clientId: number;
  clientName: string;
  /** Earliest end date across the client's live contracts. */
  endDate: string;
  daysLeft: number;
  /** Combined monthly value of the contracts ending, when recorded. */
  monthlyValue: number | null;
  annualValue: number | null;
  contractsEnding: number;
  /** Labels of open Revenue at Risk signals for this client. */
  riskSignals: string[];
  marginGroup: MarginGroup | null;
  revenuePerHour: number | null;
  /** Share of your typical revenue per hour, e.g. 0.6. */
  vsMedian: number | null;
  /** Monthly value that would match your typical rate, for thin-margin clients. */
  repriceTarget: number | null;
  /** Average hours a month logged for this client, when measured. */
  hoursPerMonth: number | null;
  /** Why margin is missing, when it could not be measured. */
  marginUnmeasuredReason: string | null;
  move: RenewalMove;
};

export type RenewalRadar = {
  rows: RenewalRow[];
  /** Annual value of contracts ending in the next 90 days. */
  next90AnnualValue: number;
  /** Of that, held by clients with an open risk signal. */
  next90AtRiskAnnualValue: number;
  next90Count: number;
  /** Annual margin gap on thin-margin renewals: typical-rate price minus today's price. */
  repriceAnnualUplift: number;
  medianRevenuePerHour: number | null;
};

export const RENEWAL_MOVE_COPY: Record<RenewalMove, { title: string; body: string }> = {
  fix: {
    title: "Fix, then reprice",
    body: "Service has slipped and the contract is thin. Sort the service problem first, then bring the numbers to the renewal.",
  },
  save: {
    title: "Save first",
    body: "Something has changed with this client. Run the Save Play and fix it well before anyone talks about renewing.",
  },
  reprice: {
    title: "Reprice at renewal",
    body: "A steady client that takes far more time than they pay for. The renewal is your chance to put that right.",
  },
  expand: {
    title: "Renew early, look to expand",
    body: "Healthy and profitable. Lock the renewal in early and look for more you can do for them.",
  },
  renew: {
    title: "Renew as normal",
    body: "No warning signs. Send a Value Receipt beforehand so the decision-maker sees what they are renewing.",
  },
};

const DAY_MS = 86_400_000;

export function buildRenewalRadar(input: {
  renewals: Array<{ clientId: number; endDate: string; monthlyValue: number | null }>;
  findings: Array<{ clientId: number; type: string }>;
  margin: ClientMargin | null;
  clientNames: Record<string, string>;
  nowMs?: number;
}): RenewalRadar {
  const nowMs = input.nowMs ?? Date.now();
  const marginByClient = new Map((input.margin?.rows ?? []).map((row) => [row.clientId, row]));
  const risksByClient = new Map<number, Set<string>>();
  for (const finding of input.findings) {
    if (!isRiskFinding(finding.type)) continue;
    const set = risksByClient.get(finding.clientId) ?? new Set<string>();
    set.add(getFindingCopy(finding.type).label);
    risksByClient.set(finding.clientId, set);
  }

  // One row per client: the soonest end date, the combined value ending.
  const byClient = new Map<number, { endMs: number; value: number | null; count: number }>();
  for (const renewal of input.renewals) {
    const endMs = Date.parse(renewal.endDate);
    if (!Number.isFinite(endMs) || endMs <= nowMs) continue;
    const entry = byClient.get(renewal.clientId);
    const value =
      renewal.monthlyValue != null
        ? (entry?.value ?? 0) + renewal.monthlyValue
        : (entry?.value ?? null);
    byClient.set(renewal.clientId, {
      endMs: Math.min(entry?.endMs ?? endMs, endMs),
      value,
      count: (entry?.count ?? 0) + 1,
    });
  }

  const rows: RenewalRow[] = [...byClient.entries()].map(([clientId, entry]) => {
    const margin = marginByClient.get(clientId);
    const riskSignals = [...(risksByClient.get(clientId) ?? [])];
    const atRisk = riskSignals.length > 0;
    const group = margin?.group ?? null;
    const thin = group === "reprice" || group === "fix";
    const strong = margin?.vsMedian != null && margin.vsMedian >= 1.25;
    const move: RenewalMove = atRisk
      ? thin
        ? "fix"
        : "save"
      : thin
        ? "reprice"
        : strong
          ? "expand"
          : "renew";
    const name = input.clientNames[String(clientId)]?.trim();
    return {
      clientId,
      clientName: name || `Client #${clientId}`,
      endDate: new Date(entry.endMs).toISOString(),
      daysLeft: Math.max(0, Math.ceil((entry.endMs - nowMs) / DAY_MS)),
      monthlyValue: entry.value,
      annualValue: entry.value != null ? Math.round(entry.value * 12) : null,
      contractsEnding: entry.count,
      riskSignals,
      marginGroup: group,
      revenuePerHour: margin?.revenuePerHour ?? null,
      vsMedian: margin?.vsMedian ?? null,
      repriceTarget:
        thin && margin?.repriceMonthlyGap && margin.monthlyValue != null
          ? Math.round((margin.monthlyValue + margin.repriceMonthlyGap) / 10) * 10
          : null,
      hoursPerMonth: margin?.group ? margin.hoursPerMonth : null,
      marginUnmeasuredReason: margin?.group
        ? null
        : (margin?.unmeasuredReason ?? "No tickets closed in the last three months"),
      move,
    };
  });
  rows.sort((a, b) => a.daysLeft - b.daysLeft || (b.annualValue ?? 0) - (a.annualValue ?? 0));

  const next90 = rows.filter((row) => row.daysLeft <= 90);
  return {
    rows,
    next90AnnualValue: next90.reduce((sum, row) => sum + (row.annualValue ?? 0), 0),
    next90AtRiskAnnualValue: next90
      .filter((row) => row.riskSignals.length > 0)
      .reduce((sum, row) => sum + (row.annualValue ?? 0), 0),
    next90Count: next90.length,
    repriceAnnualUplift: rows.reduce((sum, row) => {
      const margin = marginByClient.get(row.clientId);
      return sum + (row.repriceTarget != null && margin?.repriceMonthlyGap ? margin.repriceMonthlyGap * 12 : 0);
    }, 0),
    medianRevenuePerHour: input.margin?.medianRevenuePerHour ?? null,
  };
}
