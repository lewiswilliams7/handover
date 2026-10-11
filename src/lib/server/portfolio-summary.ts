/**
 * The owner's week in one object: what is at risk and how that moved, what to
 * do first, what renews soon, what was saved, and how far the PSA data can be
 * trusted. Shared by the This week screen and the Monday Brief email so both
 * always say the same thing.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { buildClientMargin } from "@/lib/client-margin";
import { applyManualValues, loadManualValues } from "@/lib/manual-client-values";
import { buildPsaReadiness, type PsaReadiness } from "@/lib/psa-readiness";
import { compareScanFindings } from "@/lib/psa/scan-comparison";
import { getFindingCopy } from "@/lib/psa/scan-finding-copy";
import {
  getClaimedScanForUser,
  getPreviousClaimedScanForUser,
  type StoredScanResults,
} from "@/lib/psa/scan-session";
import { buildRenewalRadar, RENEWAL_MOVE_COPY, type RenewalMove } from "@/lib/renewal-radar";
import {
  computeRevenueAtRisk,
  computeSavedRevenue,
  isRiskFinding,
} from "@/lib/revenue/revenue-signals";
import { getSavePlay } from "@/lib/save-plays";

export type WeekMove = {
  clientId: number;
  clientName: string;
  annualValue: number | null;
  reason: string;
  action: string;
  href: string;
  kind: "save" | "renewal";
};

export type WeekChange = { clientName: string; label: string };

export type TrendPoint = { at: string; revenueAtRisk: number };

export type PortfolioSummary = {
  scannedAt: string;
  clientsMonitored: number;
  revenueAtRisk: { annual: number; clients: number; clientsWithoutValue: number };
  /** Change in annual Revenue at Risk since the previous scan, when one exists. */
  revenueAtRiskChange: number | null;
  renewals90: { annual: number; atRiskAnnual: number; count: number };
  renewalsSoon: Array<{
    clientId: number;
    clientName: string;
    daysLeft: number;
    annualValue: number | null;
    move: RenewalMove;
    moveTitle: string;
  }>;
  savedRevenue: { annual: number; clients: number };
  marginGap: number;
  moves: WeekMove[];
  newFlags: WeekChange[];
  clearedFlags: WeekChange[];
  readiness: PsaReadiness;
  trend: TrendPoint[];
  manualValueCount: number;
};

function clientName(results: StoredScanResults, clientId: number): string {
  const name = results.clientNames?.[String(clientId)]?.trim();
  return name && !["unknown", "unassigned", "n/a"].includes(name.toLowerCase()) ? name : `Client #${clientId}`;
}

function riskAnnual(results: StoredScanResults): ReturnType<typeof computeRevenueAtRisk> {
  return computeRevenueAtRisk(
    (results.findings ?? []).map((finding) => ({
      clientId: finding.clientId,
      type: finding.type,
      monthlyValue: finding.monthlyValue,
    })),
  );
}

/**
 * Build the summary for one user. `admin` must be a service-role client: the
 * Monday Brief runs without a session. Returns null when there is no current
 * scan to summarise.
 */
export async function loadPortfolioSummary(
  admin: SupabaseClient,
  userId: string,
  opts: { recordSnapshot?: boolean } = {},
): Promise<PortfolioSummary | null> {
  const scan = await getClaimedScanForUser(userId);
  if (!scan?.results) return null;
  const manual = await loadManualValues(admin, userId);
  const results = applyManualValues(scan.results, manual);
  const previousScan = await getPreviousClaimedScanForUser(userId, scan.sessionId);
  const previous = previousScan?.results ? applyManualValues(previousScan.results, manual) : null;

  const risk = riskAnnual(results);
  const previousRisk = previous ? riskAnnual(previous) : null;

  const findingRefs = (results.findings ?? []).map((finding) => ({
    clientId: finding.clientId,
    type: finding.type,
  }));
  const margin = results.clientMonthly
    ? buildClientMargin({
        monthly: results.clientMonthly,
        clientValues: results.clientValues,
        findings: findingRefs,
        clientNames: results.clientNames ?? {},
      })
    : null;
  const radar = results.renewals
    ? buildRenewalRadar({
        renewals: results.renewals,
        findings: findingRefs,
        margin,
        clientNames: results.clientNames ?? {},
      })
    : null;

  // Saved Revenue, from the finding ledger (same rule as the History tab).
  const { data: ledger } = await admin
    .from("scan_finding_dismissals")
    .select("client_id,monthly_value,actioned,action_type,outcome_status")
    .eq("user_id", userId)
    .limit(5000);
  const lostClientIds = new Set((results.churnReplay?.clients ?? []).map((client) => client.clientId));
  const saved = computeSavedRevenue(
    (ledger ?? []).map((row) => ({
      client_id: Number(row.client_id),
      monthly_value: row.monthly_value == null ? null : Number(row.monthly_value),
      actioned: row.actioned === true,
      action_type: row.action_type ?? null,
      outcome_status: row.outcome_status ?? "pending",
    })),
    lostClientIds,
  );

  // Moves: the most valuable at-risk clients first, then renewals inside 30 days.
  const moves: WeekMove[] = [];
  for (const entry of risk.clients) {
    if (moves.length >= 3) break;
    const first = (results.findings ?? []).find(
      (finding) => finding.clientId === entry.clientId && isRiskFinding(finding.type),
    );
    if (!first) continue;
    const play = getSavePlay(first.type);
    moves.push({
      clientId: entry.clientId,
      clientName: clientName(results, entry.clientId),
      annualValue: entry.annualValue,
      reason: getFindingCopy(first.type).label,
      action: play?.title ?? "Open the Save Play",
      href: "/attention",
      kind: "save",
    });
  }
  for (const row of radar?.rows ?? []) {
    if (moves.length >= 3) break;
    if (row.daysLeft > 30 || moves.some((move) => move.clientId === row.clientId)) continue;
    moves.push({
      clientId: row.clientId,
      clientName: row.clientName,
      annualValue: row.annualValue,
      reason: `Contract ends in ${row.daysLeft} day${row.daysLeft === 1 ? "" : "s"}`,
      action: RENEWAL_MOVE_COPY[row.move].title,
      href: "/renewals",
      kind: "renewal",
    });
  }

  const comparison =
    previousScan?.results
      ? compareScanFindings(scan.results, previousScan.results, scan.createdAt, previousScan.createdAt)
      : null;
  const findingByKey = new Map((results.findings ?? []).map((finding) => [`${finding.clientId}:${finding.type}`, finding]));
  const newFlags: WeekChange[] = (comparison?.newFindingKeys ?? []).flatMap((key) => {
    const finding = findingByKey.get(key);
    return finding && isRiskFinding(finding.type)
      ? [{ clientName: clientName(results, finding.clientId), label: getFindingCopy(finding.type).label }]
      : [];
  });
  const clearedFlags: WeekChange[] = (comparison?.resolvedFindings ?? [])
    .filter((finding) => isRiskFinding(finding.type))
    .map((finding) => ({
      clientName:
        comparison?.resolvedClientNames[String(finding.clientId)] ?? clientName(results, finding.clientId),
      label: getFindingCopy(finding.type).label,
    }));

  const clientsMonitored = new Set([
    ...Object.keys(results.clientNames ?? {}),
    ...(results.findings ?? []).map((finding) => String(finding.clientId)),
  ]).size;

  // Snapshot for the trend line; tolerant of the table not existing yet.
  if (opts.recordSnapshot !== false) {
    await admin.from("portfolio_snapshots").upsert(
      {
        user_id: userId,
        scan_session_id: scan.sessionId,
        scanned_at: scan.createdAt,
        revenue_at_risk_annual: risk.annualValue,
        clients_at_risk: risk.clientsAtRisk,
        renewals_90_annual: radar?.next90AnnualValue ?? 0,
        saved_revenue_annual: saved.annualValue,
        clients_monitored: clientsMonitored,
      },
      { onConflict: "user_id,scan_session_id" },
    );
  }
  const { data: snapshots } = await admin
    .from("portfolio_snapshots")
    .select("scanned_at, revenue_at_risk_annual")
    .eq("user_id", userId)
    .order("scanned_at", { ascending: false })
    .limit(12);
  const trend = (snapshots ?? [])
    .map((row) => ({ at: String(row.scanned_at), revenueAtRisk: Number(row.revenue_at_risk_annual) || 0 }))
    .reverse();

  return {
    scannedAt: scan.createdAt,
    clientsMonitored,
    revenueAtRisk: {
      annual: risk.annualValue,
      clients: risk.clientsAtRisk,
      clientsWithoutValue: risk.clientsAtRisk - risk.clientsWithValue,
    },
    revenueAtRiskChange: previousRisk ? risk.annualValue - previousRisk.annualValue : null,
    renewals90: {
      annual: radar?.next90AnnualValue ?? 0,
      atRiskAnnual: radar?.next90AtRiskAnnualValue ?? 0,
      count: radar?.next90Count ?? 0,
    },
    renewalsSoon: (radar?.rows ?? [])
      .filter((row) => row.daysLeft <= 90)
      .slice(0, 5)
      .map((row) => ({
        clientId: row.clientId,
        clientName: row.clientName,
        daysLeft: row.daysLeft,
        annualValue: row.annualValue,
        move: row.move,
        moveTitle: RENEWAL_MOVE_COPY[row.move].title,
      })),
    savedRevenue: { annual: saved.annualValue, clients: saved.clients },
    marginGap: margin?.repriceAnnualTotal ?? 0,
    moves,
    newFlags,
    clearedFlags,
    readiness: buildPsaReadiness(results),
    trend,
    manualValueCount: results.manualValueClientIds?.length ?? 0,
  };
}
