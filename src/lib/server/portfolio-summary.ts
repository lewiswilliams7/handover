/**
 * The owner's week in one object: what is at risk and how that moved, what to
 * do first, what renews soon, what was saved, and how far the PSA data can be
 * trusted. Shared by the This week screen and the Monday Brief email so both
 * always say the same thing.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { buildBookHealth, type BookHealth } from "@/lib/book-health";
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
import {
  buildWeekList,
  WEEK_LIST_TOP,
  type FeedbackRow,
  type ItemState,
  type ReceiptSendStats,
  type WeekList,
} from "@/lib/week-list";

export type WeekChange = { clientName: string; label: string };

export type TrendPoint = { at: string; revenueAtRisk: number };

export type PortfolioSummary = {
  scanSessionId: string;
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
  newFlags: WeekChange[];
  clearedFlags: WeekChange[];
  readiness: PsaReadiness;
  trend: TrendPoint[];
  manualValueCount: number;
  /** The ranked This week list. The Monday Brief sends the first five rows. */
  list: WeekList;
  /** Saved Revenue still waiting on its outcome check (acted on, not yet cleared). */
  savedPending: number;
  /** False when list state and feedback cannot be stored yet. */
  listStored: boolean;
  /** Null unless at least three of its four measures can be worked out. */
  bookHealth: BookHealth | null;
};

/** Stored list state, feedback and receipt opens. Each read is tolerant of its table not existing yet. */
export async function loadWeekInputs(admin: SupabaseClient, userId: string) {
  const [states, feedback, keep, sends, lost] = await Promise.all([
    admin.from("week_item_states").select("item_key,status,owner_name,snoozed_until,done_at").eq("user_id", userId).limit(2000),
    admin
      .from("signal_feedback")
      .select("id,client_id,finding_type,verdict,reason,created_at,expires_at")
      .eq("user_id", userId)
      .is("undone_at", null)
      .order("created_at", { ascending: false })
      .limit(2000),
    admin.from("signal_type_settings").select("finding_type").eq("user_id", userId),
    admin
      .from("value_receipt_sends")
      .select("client_id,sent_at,opened_at")
      .eq("user_id", userId)
      .order("sent_at", { ascending: false })
      .limit(3000),
    admin.from("client_outcomes").select("client_id").eq("user_id", userId).eq("outcome", "lost").limit(2000),
  ]);
  const stateMap = new Map<string, ItemState>();
  for (const row of states.data ?? []) {
    stateMap.set(String(row.item_key), {
      status: row.status,
      owner: row.owner_name ?? null,
      snoozedUntil: row.snoozed_until ?? null,
      doneAt: row.done_at ?? null,
    });
  }
  const feedbackRows: FeedbackRow[] = (feedback.data ?? []).map((row) => ({
    id: String(row.id),
    clientId: Number(row.client_id),
    findingType: String(row.finding_type),
    verdict: row.verdict,
    reason: row.reason ?? null,
    createdAt: String(row.created_at),
    expiresAt: row.expires_at ?? null,
  }));
  // Opens: only the last three sends per client count, so an old open does not hide a quiet client.
  const receiptStats = new Map<number, ReceiptSendStats>();
  for (const row of sends.data ?? []) {
    const clientId = Number(row.client_id);
    const entry = receiptStats.get(clientId) ?? { sent: 0, opened: 0, lastSentAt: null, lastOpenedAt: null };
    if (!entry.lastSentAt) entry.lastSentAt = String(row.sent_at);
    if (row.opened_at && (!entry.lastOpenedAt || row.opened_at > entry.lastOpenedAt)) entry.lastOpenedAt = String(row.opened_at);
    if (entry.sent < 3) {
      entry.sent += 1;
      if (row.opened_at) entry.opened += 1;
    }
    receiptStats.set(clientId, entry);
  }
  return {
    states: stateMap,
    feedback: feedbackRows,
    keepTypes: new Set((keep.data ?? []).map((row) => String(row.finding_type))),
    receiptStats,
    recordedLost: new Set((lost.data ?? []).map((row) => Number(row.client_id))),
    /** False when the learning tables are not there yet, so the UI can hide feedback. */
    stored: !states.error && !feedback.error,
  };
}

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

  const weekInputs = await loadWeekInputs(admin, userId);
  const list = buildWeekList({
    results,
    margin,
    radar,
    previousKeys: previous
      ? new Set((previous.findings ?? []).map((finding) => `${finding.clientId}:${finding.type}`))
      : null,
    states: weekInputs.states,
    feedback: weekInputs.feedback,
    keepTypes: weekInputs.keepTypes,
    receiptStats: weekInputs.receiptStats,
    recordedLost: weekInputs.recordedLost,
  });
  const savedPending = (ledger ?? []).filter(
    (row) => row.actioned === true && (row.outcome_status ?? "pending") === "pending",
  ).length;

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
    scanSessionId: scan.sessionId,
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
    newFlags,
    clearedFlags,
    readiness: buildPsaReadiness(results),
    trend,
    manualValueCount: results.manualValueClientIds?.length ?? 0,
    list,
    savedPending,
    listStored: weekInputs.stored,
    bookHealth: buildBookHealth({
      clientValues: results.clientValues,
      exclude: new Set([...lostClientIds, ...weekInputs.recordedLost]),
      revenueAtRiskAnnual: risk.annualValue,
      radar,
      margin,
    }),
  };
}

export { WEEK_LIST_TOP };
