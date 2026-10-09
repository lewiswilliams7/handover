"use client";

import {
  Check,
  ChevronDown,
  CircleHelp,
  CheckCircle2,
  Clock3,
  Eye,
  History,
  Info,
  ListPlus,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { buildHaloScanEvidenceDeepLink } from "@/lib/psa/scan-deep-links";
import type { ScanComparison } from "@/lib/psa/scan-comparison";
import type {
  ScanFindingActionType,
  ScanFindingLedgerRow,
} from "@/lib/psa/scan-finding-ledger";
import { parseScanEvidence, type ScanEvidenceRef } from "@/lib/psa/scan-evidence";
import { getFindingCopy, insufficientDataReason } from "@/lib/psa/scan-finding-copy";
import type { StoredScanResults } from "@/lib/psa/scan-session";

type Props = {
  initialResults: StoredScanResults | null;
  initialSessionId: string | null;
  initialSyncedAt: string | null;
  initialComparison: ScanComparison | null;
};

type FindingChangeStatus = "new" | "ongoing" | "resolved";

type Finding = {
  clientId: number;
  type: string;
  drivers: Array<{
    fact: string;
    value: number;
    baseline: number;
    unit: string;
  }>;
  monthlyValue: number | null;
  confidence: "high" | "degraded" | "failed";
  evidenceIds: ScanEvidenceRef[];
  changeStatus?: FindingChangeStatus;
};

type InsufficientClient = {
  clientId: number;
  reason: string;
};

type RefreshState = {
  active: boolean;
  stage: string;
  completed: number;
  total: number;
};

type Filter = "all" | "needs_attention" | "opportunities";
type HistoryStatus = "all" | "actioned" | "open" | "resolved";

type HistorySummary = {
  flagsRaised: number;
  actioned: number;
  stillOpen: number;
  resolved: number;
};

const SERVICE_DETAIL_TYPES = new Set([
  "response_drift",
  "resolution_time_trend",
  "backlog_growth",
  "after_hours_volume",
  "data_quality",
  "ageing_tickets",
]);

const OPPORTUNITY_TYPES = new Set([
  "quote_acceptance_drop",
  "quote_value_at_stake",
  "quote_stalled",
  "order_gap",
  "order_value_drop",
  "contract_vs_usage",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function normaliseFinding(value: unknown): Finding | null {
  if (!isRecord(value)) return null;
  const clientId = Number(value.clientId);
  if (!Number.isSafeInteger(clientId) || clientId <= 0 || typeof value.type !== "string") {
    return null;
  }
  const drivers = Array.isArray(value.drivers)
    ? value.drivers.flatMap((driver) => {
        if (!isRecord(driver)) return [];
        const fact = typeof driver.fact === "string" ? driver.fact : "";
        const valueNumber = Number(driver.value);
        const baseline = Number(driver.baseline);
        const unit = typeof driver.unit === "string" ? driver.unit : "";
        if (!fact || !Number.isFinite(valueNumber) || !Number.isFinite(baseline) || !unit) {
          return [];
        }
        return [{ fact, value: valueNumber, baseline, unit }];
      })
    : [];
  const monthlyValue =
    typeof value.monthlyValue === "number" && Number.isFinite(value.monthlyValue)
      ? value.monthlyValue
      : null;
  const confidence =
    value.confidence === "degraded" || value.confidence === "failed"
      ? value.confidence
      : "high";
  return {
    clientId,
    type: value.type,
    drivers: drivers.slice(0, 3),
    monthlyValue,
    confidence,
    evidenceIds: parseScanEvidence(value.evidenceIds),
  };
}

function normaliseInsufficient(value: unknown): InsufficientClient | null {
  if (!isRecord(value)) return null;
  const clientId = Number(value.clientId);
  return Number.isSafeInteger(clientId) && clientId > 0 && typeof value.reason === "string"
    ? { clientId, reason: value.reason }
    : null;
}

function normaliseResults(value: unknown): StoredScanResults | null {
  if (!isRecord(value) || !isRecord(value.portfolio)) return null;
  return value as unknown as StoredScanResults;
}

function formatCurrency(value: number): string {
  return `£${value.toLocaleString("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function formatDate(value: string | null): string {
  if (!value || Number.isNaN(Date.parse(value))) return "Not available";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function relativeDate(value: string | null): string {
  if (!value || Number.isNaN(Date.parse(value))) return "Not available";
  const days = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 86_400_000));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function findingGroups(findings: Finding[], filter: Filter) {
  const filtered =
    filter === "all"
      ? findings
      : findings.filter((finding) =>
          filter === "opportunities"
            ? OPPORTUNITY_TYPES.has(finding.type)
            : !OPPORTUNITY_TYPES.has(finding.type),
        );
  return {
    worthAttention: filtered.filter((finding) => !SERVICE_DETAIL_TYPES.has(finding.type)),
    serviceDetail: filtered.filter((finding) => SERVICE_DETAIL_TYPES.has(finding.type)),
  };
}

function largestAtStake(
  results: StoredScanResults,
  findings: Finding[],
): { value: number; text: string } | null {
  const quoteValue = findings
    .filter((finding) => finding.type === "quote_value_at_stake")
    .reduce(
      (sum, finding) =>
        sum +
        finding.drivers
          .filter((driver) => driver.unit === "quoted_value")
          .reduce((driverSum, driver) => driverSum + driver.value, 0),
      0,
    );
  const expiringValue =
    results.portfolio.expiringContractValue != null &&
    results.portfolio.expiringContractValue > 0
      ? results.portfolio.expiringContractValue
      : 0;
  const recurringValue =
    results.exposureAvailability === "available_value" &&
    results.portfolio.exposureValue != null &&
    results.portfolio.exposureValue > 0
      ? results.portfolio.exposureValue
      : 0;
  const largest = Math.max(quoteValue, expiringValue, recurringValue);
  if (largest <= 0) return null;
  if (largest === quoteValue) {
    return {
      value: largest,
      text: "of quotes have expired without approval",
    };
  }
  if (largest === expiringValue) {
    return {
      value: largest,
      text: "of monthly recurring revenue is in contracts ending within 90 days",
    };
  }
  return {
    value: largest,
    text: "of monthly recurring revenue sits in accounts where something changed",
  };
}

function clientIdsFromResults(results: StoredScanResults): number[] {
  const ids = new Set<number>();
  Object.keys(results.byClient ?? {}).forEach((id) => {
    const numericId = Number(id);
    if (Number.isSafeInteger(numericId) && numericId > 0) ids.add(numericId);
  });
  Object.keys(results.clientNames ?? {}).forEach((id) => {
    const numericId = Number(id);
    if (Number.isSafeInteger(numericId) && numericId > 0) ids.add(numericId);
  });
  return [...ids];
}

function nameFor(
  results: StoredScanResults,
  clientId: number,
  fallbackNames?: Record<string, string>,
): string {
  const name = results.clientNames?.[String(clientId)]?.trim();
  if (name && !["unknown", "unassigned", "n/a"].includes(name.toLowerCase())) return name;
  const fallback = fallbackNames?.[String(clientId)]?.trim();
  return fallback && !["unknown", "unassigned", "n/a"].includes(fallback.toLowerCase())
    ? fallback
    : `Client #${clientId}`;
}

function findingKey(finding: Finding): string {
  return `${finding.clientId}:${finding.type}`;
}

export function AttentionClient({
  initialResults,
  initialSessionId,
  initialSyncedAt,
  initialComparison,
}: Props) {
  const [results, setResults] = useState<StoredScanResults | null>(initialResults);
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [syncedAt, setSyncedAt] = useState(initialSyncedAt);
  const [comparison, setComparison] = useState<ScanComparison | null>(initialComparison);
  const [filter, setFilter] = useState<Filter>("all");
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const [dismissedFindings, setDismissedFindings] = useState<Set<string>>(new Set());
  const [dismissalError, setDismissalError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"attention" | "history">("attention");
  const [historyStatus, setHistoryStatus] = useState<HistoryStatus>("all");
  const [historyClientId, setHistoryClientId] = useState("all");
  const [historyRows, setHistoryRows] = useState<ScanFindingLedgerRow[]>([]);
  const [historySummary, setHistorySummary] = useState<HistorySummary | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [refreshState, setRefreshState] = useState<RefreshState>({
    active: false,
    stage: "Ready",
    completed: 0,
    total: 3,
  });
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const refreshCancelledRef = useRef(false);

  const allFindings = useMemo(
    () =>
      results?.findings?.flatMap((finding) => {
        const normalised = normaliseFinding(finding);
        return normalised ? [normalised] : [];
      }) ?? [],
    [results],
  );
  const findingsWithStatus = useMemo(
    () =>
      allFindings.map((finding) => ({
        ...finding,
        changeStatus: comparison
          ? comparison.newFindingKeys.includes(findingKey(finding))
            ? ("new" as const)
            : ("ongoing" as const)
          : undefined,
      })),
    [allFindings, comparison],
  );
  const supportedFindings = useMemo(
    () =>
      findingsWithStatus.filter(
        (finding) =>
          finding.type !== "project_overrun" ||
          results?.projectOverrunReliable === true,
      ),
    [findingsWithStatus, results],
  );
  const findings = useMemo(
    () => supportedFindings.filter((finding) => !dismissedFindings.has(findingKey(finding))),
    [supportedFindings, dismissedFindings],
  );
  const insufficient = useMemo(
    () =>
      results?.insufficientData?.flatMap((client) => {
        const normalised = normaliseInsufficient(client);
        return normalised ? [normalised] : [];
      }) ?? [],
    [results],
  );
  const groups = useMemo(() => findingGroups(findings, filter), [findings, filter]);
  const resolvedFindings = useMemo(
    () =>
      comparison?.resolvedFindings
        .flatMap((finding) => {
          const normalised = normaliseFinding(finding);
          return normalised ? [{ ...normalised, changeStatus: "resolved" as const }] : [];
        })
        .filter(
          (finding) =>
            finding.type !== "project_overrun" ||
            results?.projectOverrunReliable === true,
        ) ?? [],
    [comparison, results],
  );
  const resolvedClientCount = useMemo(
    () => new Set(resolvedFindings.map((finding) => finding.clientId)).size,
    [resolvedFindings],
  );
  const stale = useMemo(
    () => Boolean(syncedAt && !Number.isNaN(Date.parse(syncedAt)) && Date.now() - Date.parse(syncedAt) > 86_400_000),
    [syncedAt],
  );

  const refresh = useCallback(async () => {
    if (refreshState.active) return;
    refreshCancelledRef.current = false;
    setRefreshError(null);
    setRefreshState({ active: true, stage: "Starting scan", completed: 0, total: 3 });
    try {
      const startResponse = await fetch("/onboarding/scan/start-stored", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const start = (await startResponse.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      if (!startResponse.ok || !start.ok) {
        if (start.error === "stored_connection_unavailable") {
          setRefreshError("Your PSA connection is no longer valid");
          setRefreshState((current) => ({ ...current, active: false }));
          return;
        }
        throw new Error(start.message ?? start.error ?? "We could not start a new scan with your saved PSA connection.");
      }

      for (let attempt = 0; attempt < 180; attempt += 1) {
        if (refreshCancelledRef.current) return;
        await new Promise((resolve) => window.setTimeout(resolve, 2_000));
        const statusResponse = await fetch("/onboarding/scan/status", {
          credentials: "include",
          cache: "no-store",
        });
        const status = (await statusResponse.json().catch(() => ({}))) as {
          status?: string;
          errorCode?: string | null;
          progress?: { stage?: string; completed?: number; total?: number | null };
        };
        if (!statusResponse.ok) {
          throw new Error("We could not read the refreshed scan status.");
        }
        const progress = status.progress;
        setRefreshState({
          active: true,
          stage: progress?.stage ?? "Analysing",
          completed: progress?.completed ?? 0,
          total: progress?.total ?? 3,
        });
        if (status.status === "failed") {
          throw new Error(
            status.errorCode === "upstream_forbidden"
              ? "The PSA refused a required read during the refresh. Check the saved connection permissions."
              : "The refreshed scan could not finish.",
          );
        }
        if (status.status === "complete" || status.status === "claimed") {
          const claimResponse = await fetch("/onboarding/scan/claim", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          });
          const claim = (await claimResponse.json().catch(() => ({}))) as {
            ok?: boolean;
            error?: string;
            sessionId?: string;
            createdAt?: string;
            results?: unknown;
            comparison?: ScanComparison | null;
          };
          const refreshedResults = normaliseResults(claim.results);
          if (!claimResponse.ok || !claim.ok || !refreshedResults) {
            throw new Error("The scan completed, but its results could not be loaded.");
          }
          setResults(refreshedResults);
          setSessionId(claim.sessionId ?? null);
          setSyncedAt(claim.createdAt ?? new Date().toISOString());
          setComparison(claim.comparison ?? null);
          setRefreshState({ active: false, stage: "Complete", completed: 3, total: 3 });
          return;
        }
      }
      throw new Error("The scan is taking longer than expected. Open the scan screen to continue monitoring it.");
    } catch (error) {
      if (!refreshCancelledRef.current) {
        setRefreshError(error instanceof Error ? error.message : "The scan could not be refreshed.");
        setRefreshState((current) => ({ ...current, active: false }));
      }
    }
  }, [refreshState.active]);

  useEffect(
    () => () => {
      refreshCancelledRef.current = true;
    },
    [],
  );

  useEffect(() => {
    if (!sessionId) {
      setDismissedFindings(new Set());
      return;
    }
    let cancelled = false;
    void fetch(`/api/attention/dismiss?scanSessionId=${encodeURIComponent(sessionId)}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          dismissed?: unknown;
        };
        if (cancelled || !response.ok || !Array.isArray(data.dismissed)) return;
        setDismissedFindings(
          new Set(data.dismissed.filter((key): key is string => typeof key === "string")),
        );
      })
      .catch(() => {
        // A dismissal read failure does not prevent the findings page from loading.
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const actionFinding = useCallback(
    async (finding: Finding, action: ScanFindingActionType, note?: string) => {
      if (!sessionId) {
        setDismissalError("This result no longer has a claimable scan session.");
        return;
      }
      setDismissalError(null);
      const response = await fetch("/api/attention/dismiss", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scanSessionId: sessionId,
          clientId: finding.clientId,
          findingType: finding.type,
          action,
          note: note ?? "",
        }),
      });
      if (!response.ok) {
        setDismissalError("We could not save that action. Try again.");
        return;
      }
      setDismissedFindings((current) => new Set(current).add(findingKey(finding)));
    },
    [sessionId],
  );

  const atStake = results ? largestAtStake(results, allFindings) : null;
  const clientsWithFindings = new Set(supportedFindings.map((finding) => finding.clientId)).size;
  const allClientIds = useMemo(
    () => (results ? clientIdsFromResults(results) : []),
    [results],
  );
  const findingClientIds = new Set(supportedFindings.map((finding) => finding.clientId));
  const insufficientClientIds = new Set(insufficient.map((client) => client.clientId));
  const unchangedClientIds = allClientIds.filter(
    (clientId) => !findingClientIds.has(clientId) && !insufficientClientIds.has(clientId),
  );
  const historyClientOptions = useMemo(
    () =>
      [...new Set([...allClientIds, ...historyRows.map((row) => row.client_id)])].sort(
        (left, right) => left - right,
      ),
    [allClientIds, historyRows],
  );
  const lastSyncedLabel = syncedAt ? `${relativeDate(syncedAt)} · ${formatDate(syncedAt)}` : "No completed scan";

  useEffect(() => {
    if (activeTab !== "history") return;
    let cancelled = false;
    const query = new URLSearchParams({
      status: historyStatus,
      limit: "500",
    });
    if (historyClientId !== "all") query.set("clientId", historyClientId);
    setHistoryLoading(true);
    setHistoryError(null);
    void fetch(`/api/attention/history?${query.toString()}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          rows?: unknown;
          summary?: unknown;
        };
        if (!response.ok || !Array.isArray(data.rows)) {
          throw new Error("history_read_failed");
        }
        if (cancelled) return;
        setHistoryRows(data.rows as ScanFindingLedgerRow[]);
        setHistorySummary(
          data.summary && typeof data.summary === "object"
            ? (data.summary as HistorySummary)
            : null,
        );
      })
      .catch(() => {
        if (!cancelled) {
          setHistoryRows([]);
          setHistorySummary(null);
          setHistoryError("We could not load finding history. Try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, historyClientId, historyStatus]);

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] px-4 pb-16 pt-0 text-[var(--text-primary)] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Attention
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {comparison
                ? "What changed since your last scan"
                : results
                ? clientsWithFindings > 0
                  ? `${clientsWithFindings} account${clientsWithFindings === 1 ? "" : "s"} need a look`
                  : "No accounts need a look"
                : "Your attention report"}
            </h1>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-[var(--text-secondary)]">
              <span>Week of {formatDate(syncedAt)}</span>
              <span>Last synced {lastSyncedLabel}</span>
              <span>{results?.portfolio.clientsAnalysed ?? 0} clients monitored</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={refreshState.active}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[#07111f] transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw className={refreshState.active ? "size-4 animate-spin" : "size-4"} />
            {refreshState.active ? "Refreshing…" : "Refresh"}
          </button>
        </header>

        <div className="mt-6 flex gap-1 border-b border-white/10" role="tablist" aria-label="Attention views">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "attention"}
            onClick={() => setActiveTab("attention")}
            className={`inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === "attention"
                ? "border-cyan-300 text-cyan-100"
                : "border-transparent text-[var(--text-secondary)] hover:text-white"
            }`}
          >
            <CircleHelp className="size-4" /> Attention
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "history"}
            onClick={() => setActiveTab("history")}
            className={`inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === "history"
                ? "border-cyan-300 text-cyan-100"
                : "border-transparent text-[var(--text-secondary)] hover:text-white"
            }`}
          >
            <History className="size-4" /> History
          </button>
        </div>

        {activeTab === "history" ? (
          <HistoryPanel
            rows={historyRows}
            summary={historySummary}
            loading={historyLoading}
            error={historyError}
            status={historyStatus}
            clientId={historyClientId}
            clientOptions={historyClientOptions}
            results={results}
            onStatusChange={setHistoryStatus}
            onClientChange={setHistoryClientId}
          />
        ) : (
          <>
        {stale && !refreshState.active ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/30 bg-amber-300/[0.08] px-4 py-3 text-sm text-amber-100">
            <span className="inline-flex items-center gap-2">
              <Clock3 className="size-4" />
              This scan is more than 24 hours old. Refresh it to see the current picture.
            </span>
            <button type="button" onClick={() => void refresh()} className="font-semibold underline underline-offset-4">
              Refresh now
            </button>
          </div>
        ) : null}

        {refreshState.active ? (
          <section className="mt-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-5" aria-live="polite">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-semibold text-cyan-100">Refreshing your PSA scan</span>
              <span className="text-cyan-100/65">
                {Math.min(refreshState.completed, refreshState.total)} of {refreshState.total}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-cyan-300 transition-all"
                style={{ width: `${Math.max(8, (refreshState.completed / refreshState.total) * 100)}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              {refreshState.stage === "tickets"
                ? "Reading historical tickets…"
                : refreshState.stage === "contracts"
                  ? "Reading contracts and agreements…"
                  : "Analysing delivery patterns…"}
              {" "}This usually takes 20–60 seconds.
            </p>
          </section>
        ) : null}

        {refreshError ? (
          <div className="mt-6 rounded-xl border border-red-300/25 bg-red-300/[0.08] px-4 py-3 text-sm text-red-100" role="alert">
            {refreshError === "Your PSA connection is no longer valid" ? (
              <>
                {refreshError}.{" "}
                <Link
                  href="/?openSettings=integrations"
                  className="font-semibold underline underline-offset-4"
                >
                  Reconnect in Configuration
                </Link>
                .
              </>
            ) : (
              refreshError
            )}
          </div>
        ) : null}

        {!results && !refreshState.active ? (
          <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-8">
            <h2 className="text-xl font-semibold">No completed scan is saved yet.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              Run a scan with your stored PSA connection to populate Attention. The scan will not run automatically when this page loads.
            </p>
          </section>
        ) : null}

        {results ? (
          <>
            {comparison ? (
              <ChangeSummary
                comparison={comparison}
                resolvedClientCount={resolvedClientCount}
                newFindingCount={findingsWithStatus.filter((finding) => finding.changeStatus === "new").length}
                ongoingFindingCount={findingsWithStatus.filter((finding) => finding.changeStatus === "ongoing").length}
              />
            ) : null}
            {comparison && resolvedFindings.length > 0 ? (
              <ResolvedFindingGroup
                findings={resolvedFindings}
                results={results}
                resolvedClientNames={comparison.resolvedClientNames}
              />
            ) : null}
            {atStake ? (
              <section className="mt-8 rounded-2xl border border-[var(--border)] bg-white/[0.04] p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Largest at stake
                </p>
                <p className="mt-3 text-4xl font-bold tracking-tight text-[#dbeafe] sm:text-5xl">
                  {formatCurrency(atStake.value)}
                </p>
                <p className="mt-2 text-base text-[var(--text-secondary)]">{atStake.text}</p>
              </section>
            ) : null}

            <p className="mt-6 text-sm font-medium text-[var(--text-secondary)]">
              {results.portfolio.checksRun} checks across {results.portfolio.clientsAnalysed} accounts,{" "}
              {clientsWithFindings > 0 ? `${clientsWithFindings} flagged.` : "no accounts flagged."}
            </p>
            {results.exposureAvailability === "unavailable" ? (
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                No recurring invoice data was available on this instance, so no monetary values are shown.
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter findings">
              {([
                ["all", "All"],
                ["needs_attention", "Needs attention"],
                ["opportunities", "Opportunities"],
              ] as const).map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setFilter(value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    filter === value
                      ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-100"
                      : "border-white/10 text-[var(--text-secondary)] hover:border-white/25 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {dismissalError ? <p className="mt-3 text-sm text-amber-200" role="status">{dismissalError}</p> : null}

            <FindingGroup
              title={comparison ? "Still needs attention" : "Worth your attention"}
              findings={groups.worthAttention}
              results={results}
              expandedFinding={expandedFinding}
              onExpand={setExpandedFinding}
              onAction={actionFinding}
            />
            <FindingGroup
              title="Service detail"
              findings={groups.serviceDetail}
              results={results}
              expandedFinding={expandedFinding}
              onExpand={setExpandedFinding}
              onAction={actionFinding}
            />

            <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-6">
              <h2 className="text-xl font-semibold">Clients with nothing changed</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                These clients were included in the scan and no finding fired for them in this period.
              </p>
              <ClientList ids={unchangedClientIds} results={results} empty="No clients were available to list." />
            </section>

            <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.025] p-6">
              <h2 className="text-xl font-semibold">Clients with insufficient data</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                These clients were not treated as healthy. There was not enough history to make a reliable comparison.
              </p>
              {insufficient.length > 0 ? (
                <ul className="mt-4 divide-y divide-white/10">
                  {insufficient.map((client) => (
                    <li key={client.clientId} className="flex flex-wrap justify-between gap-3 py-3 text-sm">
                      <span className="font-medium">{nameFor(results, client.clientId)}</span>
                      <span className="text-[var(--text-secondary)]">{insufficientDataReason(client.reason)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-[var(--text-secondary)]">No clients were excluded for insufficient data.</p>
              )}
            </section>

            <CoverageSummary results={results} />
          </>
        ) : null}
          </>
        )}
      </div>
    </main>
  );
}

function HistoryPanel({
  rows,
  summary,
  loading,
  error,
  status,
  clientId,
  clientOptions,
  results,
  onStatusChange,
  onClientChange,
}: {
  rows: ScanFindingLedgerRow[];
  summary: HistorySummary | null;
  loading: boolean;
  error: string | null;
  status: HistoryStatus;
  clientId: string;
  clientOptions: number[];
  results: StoredScanResults | null;
  onStatusChange: (status: HistoryStatus) => void;
  onClientChange: (clientId: string) => void;
}) {
  const rowsByClient = new Map<number, ScanFindingLedgerRow[]>();
  for (const row of rows) {
    const group = rowsByClient.get(row.client_id) ?? [];
    group.push(row);
    rowsByClient.set(row.client_id, group);
  }

  return (
    <section className="mt-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
          Finding history
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          What has happened across your client base
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
          Every finding is kept with the evidence available when it was raised. Actions and
          later scan outcomes stay attached to that original record.
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <HistoryMetric label="Flags raised" value={summary?.flagsRaised ?? 0} />
        <HistoryMetric label="Actioned" value={summary?.actioned ?? 0} />
        <HistoryMetric label="Still open" value={summary?.stillOpen ?? 0} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2" role="group" aria-label="History filters">
        {([
          ["all", "All flags"],
          ["actioned", "Actioned"],
          ["open", "Still open"],
          ["resolved", "Resolved"],
        ] as const).map(([value, label]) => (
          <button
            type="button"
            key={value}
            onClick={() => onStatusChange(value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              status === value
                ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-100"
                : "border-white/10 text-[var(--text-secondary)] hover:border-white/25 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span>Client</span>
          <select
            value={clientId}
            onChange={(event) => onClientChange(event.target.value)}
            className="rounded-md border border-white/10 bg-[var(--bg-secondary)] px-2.5 py-1.5 text-sm text-white outline-none focus:border-cyan-300/50"
          >
            <option value="all">All clients</option>
            {clientOptions.map((optionId) => (
              <option key={optionId} value={optionId}>
                {historyClientName(optionId, results, rows)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <p className="mt-6 rounded-xl border border-red-300/25 bg-red-300/[0.08] px-4 py-3 text-sm text-red-100" role="alert">
          {error}
        </p>
      ) : loading ? (
        <p className="mt-8 text-sm text-[var(--text-secondary)]">Loading finding history…</p>
      ) : rows.length === 0 ? (
        <p className="mt-8 rounded-xl border border-white/10 bg-white/[0.025] px-4 py-5 text-sm text-[var(--text-secondary)]">
          No finding history matches these filters.
        </p>
      ) : (
        <div className="mt-8 space-y-8">
          {[...rowsByClient.entries()].map(([groupClientId, clientRows]) => (
            <section key={groupClientId}>
              <h3 className="text-lg font-semibold">
                {historyClientName(groupClientId, results, clientRows)}
              </h3>
              <div className="mt-3 grid gap-3">
                {clientRows.map((row) => (
                  <HistoryRow key={row.id} row={row} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

function HistoryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3">
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">{label}</p>
    </div>
  );
}

function historyClientName(
  clientId: number,
  results: StoredScanResults | null,
  rows: ScanFindingLedgerRow[],
): string {
  const current = results?.clientNames?.[String(clientId)]?.trim();
  if (current && !["unknown", "unassigned", "n/a"].includes(current.toLowerCase())) {
    return current;
  }
  const historical = rows.find((row) => row.client_id === clientId)?.client_name?.trim();
  return historical || `Client #${clientId}`;
}

function HistoryRow({ row }: { row: ScanFindingLedgerRow }) {
  const copy = getFindingCopy(row.finding_type);
  const drivers = row.drivers_at_raise.flatMap((driver) =>
    isRecord(driver) && typeof driver.fact === "string" ? [driver.fact] : [],
  );
  const actionLabel =
    row.action_type === "normal_for_client"
      ? "Normal for this client"
      : row.action_type === "add_to_qbr"
        ? "Added to QBR"
        : row.action_type === "handled"
          ? "Marked as handled"
          : "No action recorded";
  const outcomeLabel =
    row.outcome_status === "resolved"
      ? "No longer fires"
      : row.outcome_status === "still_open"
        ? "Still open at 90 days"
        : "Outcome pending";

  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-200">
            {copy.label}
          </p>
          <p className="mt-1 text-sm font-semibold text-white">
            Raised {formatDate(row.raised_at)}
          </p>
        </div>
        {row.monthly_value != null && row.monthly_value > 0 ? (
          <p className="text-sm font-bold text-[#dbeafe]">{formatCurrency(row.monthly_value)}/mo</p>
        ) : null}
      </div>
      {drivers.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm leading-6 text-[var(--text-secondary)]">
          {drivers.map((driver, index) => <li key={`${driver}-${index}`}>{driver}</li>)}
        </ul>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs">
        <span className={row.actioned ? "text-cyan-200" : "text-[var(--text-muted)]"}>
          {actionLabel}
        </span>
        <span className={row.outcome_status === "resolved" ? "text-emerald-200" : "text-[var(--text-secondary)]"}>
          {outcomeLabel}
          {row.outcome_at ? ` · ${formatDate(row.outcome_at)}` : ""}
        </span>
      </div>
      {row.action_note ? (
        <p className="mt-3 border-l-2 border-cyan-300/40 pl-3 text-sm italic text-[var(--text-secondary)]">
          {row.action_note}
        </p>
      ) : null}
    </article>
  );
}

function ChangeSummary({
  comparison,
  resolvedClientCount,
  newFindingCount,
  ongoingFindingCount,
}: {
  comparison: ScanComparison;
  resolvedClientCount: number;
  newFindingCount: number;
  ongoingFindingCount: number;
}) {
  return (
    <section className="mt-8 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200/75">
        Scan comparison
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight">What changed since your last scan</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        Compared with the scan from {formatDate(comparison.previousScanCreatedAt)}. Findings are
        matched by account and finding type.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <ChangeMetric label="New findings" value={newFindingCount} />
        <ChangeMetric label="Ongoing findings" value={ongoingFindingCount} />
        <ChangeMetric label="Accounts improved" value={resolvedClientCount} />
      </div>
      {newFindingCount === 0 && resolvedClientCount === 0 ? (
        <p className="mt-5 text-sm text-[var(--text-secondary)]">
          No finding status changed since the previous scan.
        </p>
      ) : null}
    </section>
  );
}

function ChangeMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">{label}</p>
    </div>
  );
}

function ResolvedFindingGroup({
  findings,
  results,
  resolvedClientNames,
}: {
  findings: Finding[];
  results: StoredScanResults;
  resolvedClientNames: Record<string, string>;
}) {
  const resolvedClientCount = new Set(findings.map((finding) => finding.clientId)).size;
  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-2xl font-semibold">
          {resolvedClientCount} account{resolvedClientCount === 1 ? "" : "s"} improved since your last scan
        </h2>
        <span className="text-xs text-[var(--text-muted)]">{findings.length} finding{findings.length === 1 ? "" : "s"}</span>
      </div>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
        These findings no longer fire for the account. This describes the current scan result and
        does not claim that Handover caused the change.
      </p>
      <div className="mt-4 grid gap-4">
        {findings.map((finding) => (
          <ResolvedFindingCard
            key={findingKey(finding)}
            finding={finding}
            results={results}
            resolvedClientNames={resolvedClientNames}
          />
        ))}
      </div>
    </section>
  );
}

function ResolvedFindingCard({
  finding,
  results,
  resolvedClientNames,
}: {
  finding: Finding;
  results: StoredScanResults;
  resolvedClientNames: Record<string, string>;
}) {
  const copy = getFindingCopy(finding.type);
  return (
    <article className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.04] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-200">
        No longer fires
      </p>
      <h3 className="mt-1 text-lg font-semibold">
        {nameFor(results, finding.clientId, resolvedClientNames)}
      </h3>
      <p className="mt-2 text-sm font-semibold text-emerald-100/85">{copy.label}</p>
      {finding.drivers.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
          {finding.drivers.map((driver, index) => (
            <li key={`${driver.unit}-${index}`}>{driver.fact}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function FindingGroup({
  title,
  findings,
  results,
  expandedFinding,
  onExpand,
  onAction,
}: {
  title: string;
  findings: Finding[];
  results: StoredScanResults;
  expandedFinding: string | null;
  onExpand: (key: string | null) => void;
  onAction: (
    finding: Finding,
    action: ScanFindingActionType,
    note?: string,
  ) => Promise<void>;
}) {
  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <span className="text-xs text-[var(--text-muted)]">{findings.length} shown</span>
      </div>
      {findings.length === 0 ? (
        <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-[var(--text-secondary)]">
          No findings in this group.
        </p>
      ) : (
        <div className="mt-4 grid gap-4">
          {findings.map((finding) => (
            <FindingCard
              key={findingKey(finding)}
              finding={finding}
              results={results}
              expanded={expandedFinding === findingKey(finding)}
              onExpand={() =>
                onExpand(expandedFinding === findingKey(finding) ? null : findingKey(finding))
              }
              onAction={onAction}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function FindingCard({
  finding,
  results,
  expanded,
  onExpand,
  onAction,
}: {
  finding: Finding;
  results: StoredScanResults;
  expanded: boolean;
  onExpand: () => void;
  onAction: (
    finding: Finding,
    action: ScanFindingActionType,
    note?: string,
  ) => Promise<void>;
}) {
  const [handling, setHandling] = useState(false);
  const [handlingNote, setHandlingNote] = useState("");
  const copy = getFindingCopy(finding.type);
  const isUrgent =
    finding.type === "contract_expiring" &&
    finding.drivers.some(
      (driver) => driver.unit === "days_until_contract_end" && driver.value <= 30,
    );
  const missingData = [
    results.portfolio.responseTimestampCoveragePct != null &&
    results.portfolio.responseTimestampCoveragePct < 100
      ? "some first-response timestamps were missing"
      : null,
    results.portfolio.closeTimestampCoveragePct != null &&
    results.portfolio.closeTimestampCoveragePct < 100
      ? "some completion timestamps were missing"
      : null,
    finding.confidence !== "high" ? "the source coverage was below high confidence" : null,
  ].filter((value): value is string => value !== null);

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {finding.changeStatus ? (
            <p
              className={`text-xs font-semibold uppercase tracking-[0.12em] ${
                finding.changeStatus === "new" ? "text-cyan-200" : "text-[var(--text-muted)]"
              }`}
            >
              {finding.changeStatus === "new" ? "New since last scan" : "Ongoing"}
            </p>
          ) : null}
          <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${isUrgent ? "text-red-200" : "text-amber-200"}`}>
            {copy.label}
          </p>
          <h3 className="mt-1 truncate text-lg font-semibold">{nameFor(results, finding.clientId)}</h3>
        </div>
        <div className="shrink-0 text-right">
          {finding.monthlyValue != null && finding.monthlyValue > 0 ? (
            <p className="text-lg font-bold text-[#dbeafe]">
              {formatCurrency(finding.monthlyValue)}/mo
            </p>
          ) : null}
          {finding.confidence !== "high" ? (
            <p className="mt-1 text-xs text-[var(--text-muted)]">Confidence: {finding.confidence}</p>
          ) : null}
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">{copy.description}</p>
      <ul className="mt-4 space-y-2">
        {finding.drivers.slice(0, 3).map((driver, index) => (
          <li key={`${driver.unit}-${index}`} className="flex gap-3 text-sm leading-6 text-[var(--text-primary)]">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-cyan-300" />
            <span>{driver.fact}</span>
          </li>
        ))}
      </ul>
      <EvidenceLinks finding={finding} results={results} />
      {expanded ? (
        <div className="mt-4 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.05] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-100/70">
            Why am I seeing this?
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
            {finding.drivers.map((driver, index) => (
              <li key={`${driver.unit}-expanded-${index}`}>{driver.fact}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
            {missingData.length > 0
              ? `Could not be measured reliably: ${missingData.join("; ")}.`
              : "No additional coverage limitation was recorded for this finding."}
          </p>
        </div>
      ) : null}
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/10 pt-4 text-xs">
        <button type="button" disabled title="Account detail is not available yet" className="inline-flex items-center gap-1.5 text-[var(--text-muted)] disabled:cursor-not-allowed">
          <Eye className="size-3.5" /> View account
        </button>
        <button
          type="button"
          onClick={() => void onAction(finding, "add_to_qbr")}
          className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-white"
        >
          <ListPlus className="size-3.5" /> Add to QBR
        </button>
        <button type="button" onClick={onExpand} className="inline-flex items-center gap-1.5 font-semibold text-cyan-200 hover:text-cyan-100">
          <CircleHelp className="size-3.5" /> {expanded ? "Hide why" : "Why am I seeing this?"}
          <ChevronDown className={`size-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
        <button
          type="button"
          onClick={() => void onAction(finding, "normal_for_client")}
          className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-white"
        >
          <Check className="size-3.5" /> Normal for this client
        </button>
        {handling ? (
          <div className="basis-full rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <label className="sr-only" htmlFor={`handled-note-${findingKey(finding)}`}>
              Optional note for marking this finding as handled
            </label>
            <input
              id={`handled-note-${findingKey(finding)}`}
              value={handlingNote}
              onChange={(event) => setHandlingNote(event.target.value)}
              maxLength={240}
              placeholder="Optional note"
              className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-300/50"
            />
            <div className="mt-2 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setHandling(false);
                  void onAction(finding, "handled", handlingNote);
                }}
                className="inline-flex items-center gap-1.5 font-semibold text-cyan-200 hover:text-cyan-100"
              >
                <CheckCircle2 className="size-3.5" /> Save as handled
              </button>
              <button
                type="button"
                onClick={() => {
                  setHandling(false);
                  setHandlingNote("");
                }}
                className="text-[var(--text-secondary)] hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setHandling(true)}
            className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-white"
          >
            <CheckCircle2 className="size-3.5" /> Mark as handled
          </button>
        )}
      </div>
    </article>
  );
}

function EvidenceLinks({
  finding,
  results,
}: {
  finding: Finding;
  results: StoredScanResults;
}) {
  const links = finding.evidenceIds.flatMap((ref) => {
    const href = buildHaloScanEvidenceDeepLink(results.instanceUrl, ref);
    return href ? [{ href, kind: ref.kind }] : [];
  });
  if (links.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs">
      {links.map((link, index) => (
        <a
          key={`${link.href}-${index}`}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-cyan-200 hover:text-cyan-100"
        >
          View in HaloPSA <span className="font-normal text-cyan-200/60">({link.kind})</span>
        </a>
      ))}
    </div>
  );
}

function ClientList({
  ids,
  results,
  empty,
}: {
  ids: number[];
  results: StoredScanResults;
  empty: string;
}) {
  return ids.length > 0 ? (
    <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {ids.map((clientId) => (
        <li key={clientId} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-[var(--text-secondary)]">
          {nameFor(results, clientId)}
        </li>
      ))}
    </ul>
  ) : (
    <p className="mt-4 text-sm text-[var(--text-secondary)]">{empty}</p>
  );
}

function CoverageSummary({ results }: { results: StoredScanResults }) {
  const portfolio = results.portfolio;
  const items = [
    portfolio.responseTimestampCoveragePct != null && portfolio.ticketCount > 0
      ? `First-response timestamps were recorded on ${portfolio.responseTimestampCoveragePct.toLocaleString("en-GB", { maximumFractionDigits: 1 })}% of ${portfolio.ticketCount} tickets.`
      : null,
    portfolio.closeTimestampCoveragePct != null && portfolio.ticketCount > 0
      ? `Completion timestamps were recorded on ${portfolio.closeTimestampCoveragePct.toLocaleString("en-GB", { maximumFractionDigits: 1 })}% of ${portfolio.ticketCount} tickets.`
      : null,
    portfolio.clientsWithoutOwner != null && portfolio.clientsWithoutOwner > 0
      ? `${portfolio.clientsWithoutOwner} client${portfolio.clientsWithoutOwner === 1 ? "" : "s"} have tickets with no assigned owner.`
      : null,
    portfolio.activeContractsWithoutActivity != null && portfolio.activeContractsWithoutActivity > 0
      ? `${portfolio.activeContractsWithoutActivity} active contract${portfolio.activeContractsWithoutActivity === 1 ? "" : "s"} had no ticket activity in the scan period.`
      : null,
  ].filter((item): item is string => item !== null);

  if (items.length === 0) return null;
  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="flex items-center gap-2">
        <Info className="size-4 text-[var(--text-muted)]" />
        <h2 className="text-lg font-semibold">What your PSA data cannot currently tell you</h2>
      </div>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}
