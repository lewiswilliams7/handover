"use client";

import { ArrowRight, LockKeyhole, RotateCcw } from "lucide-react";

import { EvidenceChips } from "@/components/evidence-chips";
import { HOUSEKEEPING_FINDING_TYPES } from "@/lib/revenue/revenue-signals";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { SignOutButton } from "@/app/onboarding/sign-out-button";
import { ChurnReplayPanel } from "@/components/churn-replay-panel";
import {
  findingCountSentence,
  getFindingCopy,
  insufficientDataReason,
} from "@/lib/psa/scan-finding-copy";
import { type ScanEvidenceRef } from "@/lib/psa/scan-evidence";
import { BOOK_DEMO_CALENDLY_URL } from "@/lib/book-demo";
import type { ChurnReplayPreview, ChurnReplayResult } from "@/lib/psa/churn-replay";
import type { ScanHighlights } from "@/lib/scan-highlights";

type AnonymousScanStatus = {
  status: string;
  scanOutcome: "findings" | "no_findings" | "metrics_suppressed" | "no_clients" | null;
  progress: { stage: string; completed: number; total: number | null };
  clientsAnalysed: number | null;
  clientsWithFindings: number | null;
  findingsCount: Record<string, number> | null;
  checksRun: number | null;
  ticketCount: number | null;
  responseTimestampCoveragePct: number | null;
  closeTimestampCoveragePct: number | null;
  clientsWithoutOwner: number | null;
  activeContractsWithoutActivity: number | null;
  clientsInsufficientData: number | null;
  expiringContractCount: number | null;
  expiringContractValue: number | null;
  exposureValue: number | null;
  revenueConcentrationPct: number | null;
  revenueConcentrationSuppressedReason: string | null;
  findingPreviews?: FindingPreviewView[];
  exposureAvailability:
    | "available_value"
    | "available_zero"
    | "available_no_value"
    | "unavailable"
    | "not_calculated"
    | null;
  errorCode: string | null;
  detailsEntitled?: boolean;
  findings?: ScanFindingView[];
  insufficientData?: InsufficientDataView[];
  clientNames?: Record<string, string>;
  psaType?: "halo" | "connectwise";
  instanceUrl?: string | null;
  churnReplay?: ChurnReplayResult | null;
  churnReplayPreview?: ChurnReplayPreview | null;
  highlights?: ScanHighlights | null;
};

type ClaimState = {
  transferred: boolean;
  errorCode: string | null;
  entitled: boolean;
  accountCreated: boolean;
  requiresVerification: boolean;
  emailVerificationSent: boolean;
};

type ScanFindingView = {
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
  magnitude: number;
  evidenceIds?: ScanEvidenceRef[];
};

type FindingPreviewView = {
  type: string;
  monthlyValue: number | null;
  drivers: Array<{
    value: number;
    baseline: number;
    unit: string;
  }>;
};

const SERVICE_DETAIL_TYPES = new Set([
  "response_drift",
  "resolution_time_trend",
  "backlog_growth",
  "after_hours_volume",
  "data_quality",
  "ageing_tickets",
]);

function splitFindingGroups(findings: ScanFindingView[]) {
  return {
    worthAttention: findings.filter(
      (finding) => !SERVICE_DETAIL_TYPES.has(finding.type) && !HOUSEKEEPING_FINDING_TYPES.has(finding.type),
    ),
    serviceDetail: findings.filter(
      (finding) => SERVICE_DETAIL_TYPES.has(finding.type) && !HOUSEKEEPING_FINDING_TYPES.has(finding.type),
    ),
    housekeeping: findings.filter((finding) => HOUSEKEEPING_FINDING_TYPES.has(finding.type)),
  };
}

type InsufficientDataView = {
  clientId: number;
  reason: string;
  ticketCount: number;
  monthsWithTickets: number;
};

type ScanResultsPayload = {
  scanOutcome?: AnonymousScanStatus["scanOutcome"];
  exposureAvailability?: AnonymousScanStatus["exposureAvailability"];
  portfolio?: {
    clientsAnalysed?: number;
    clientsWithFindings?: number;
    findingsByType?: Record<string, number>;
    checksRun?: number;
    ticketCount?: number;
    responseTimestampCoveragePct?: number | null;
    closeTimestampCoveragePct?: number | null;
    clientsWithoutOwner?: number | null;
    activeContractsWithoutActivity?: number | null;
    clientsInsufficientData?: number;
    expiringContractCount?: number;
    expiringContractValue?: number | null;
    exposureValue?: number | null;
    revenueConcentrationPct?: number | null;
    revenueConcentrationSuppressedReason?: string | null;
  };
  findingPreviews?: FindingPreviewView[];
  findings?: ScanFindingView[];
  insufficientData?: InsufficientDataView[];
  clientNames?: Record<string, string>;
  psaType?: "halo" | "connectwise";
  instanceUrl?: string | null;
  churnReplay?: ChurnReplayResult | null;
  churnReplayPreview?: ChurnReplayPreview | null;
  highlights?: ScanHighlights | null;
};

function statusFromResults(
  status: string,
  progress: AnonymousScanStatus["progress"],
  results: ScanResultsPayload,
  errorCode: string | null,
  detailsEntitled = false,
): AnonymousScanStatus {
  return {
    status,
    scanOutcome: results.scanOutcome ?? null,
    progress,
    clientsAnalysed: results.portfolio?.clientsAnalysed ?? null,
    clientsWithFindings: results.portfolio?.clientsWithFindings ?? null,
    findingsCount: results.portfolio?.findingsByType ?? null,
    checksRun: results.portfolio?.checksRun ?? null,
    ticketCount: results.portfolio?.ticketCount ?? null,
    responseTimestampCoveragePct: results.portfolio?.responseTimestampCoveragePct ?? null,
    closeTimestampCoveragePct: results.portfolio?.closeTimestampCoveragePct ?? null,
    clientsWithoutOwner: results.portfolio?.clientsWithoutOwner ?? null,
    activeContractsWithoutActivity: results.portfolio?.activeContractsWithoutActivity ?? null,
    clientsInsufficientData: results.portfolio?.clientsInsufficientData ?? null,
    expiringContractCount: results.portfolio?.expiringContractCount ?? null,
    expiringContractValue: results.portfolio?.expiringContractValue ?? null,
    exposureValue: results.portfolio?.exposureValue ?? null,
    revenueConcentrationPct: results.portfolio?.revenueConcentrationPct ?? null,
    revenueConcentrationSuppressedReason:
      results.portfolio?.revenueConcentrationSuppressedReason ?? null,
    findingPreviews: results.findingPreviews ?? [],
    exposureAvailability: results.exposureAvailability ?? null,
    errorCode,
    detailsEntitled,
    findings: results.findings,
    insufficientData: results.insufficientData,
    clientNames: results.clientNames,
    psaType: results.psaType,
    instanceUrl: results.instanceUrl,
    churnReplay: results.churnReplay,
    churnReplayPreview: results.churnReplayPreview,
    highlights: results.highlights,
  };
}

function exposureCopy(status: AnonymousScanStatus) {
  switch (status.exposureAvailability) {
    case "available_value":
      return status.exposureValue == null
        ? "Recurring value was available, but none was attributable to the flagged accounts."
        : `£${status.exposureValue.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} monthly value across flagged accounts`;
    case "available_zero":
      return "Contract data was available on your instance, but no positive monthly value was recorded.";
    case "available_no_value":
      return "Contract records were available, but no usable charge amounts were recorded.";
    case "unavailable":
      return "We could not read contract data on your instance. No exposure estimate is shown.";
    case "not_calculated":
      return "Recurring value was not calculated for this scan.";
    default:
      return "Recurring value is not available for this scan.";
  }
}

function outcomeCopy(outcome: AnonymousScanStatus["scanOutcome"]) {
  if (outcome === "no_clients") {
    return {
      title: "The connection worked, but there was nothing to analyse.",
      body: "No client-linked records were returned. This is different from a healthy scan with no findings. Check the application’s client-linked read permissions or try the walkthrough.",
    };
  }
  if (outcome === "metrics_suppressed") {
    return {
      title: "The connection worked, but the data was too incomplete.",
      body: "We found the PSA, but suppressed the metrics whose coverage or field mapping was not defensible. We will not turn missing timestamps into a zero.",
    };
  }
  return null;
}

function failureCopy(code: string | null) {
  switch (code) {
    case "upstream_forbidden":
      return {
        title: "The PSA blocked part of the scan.",
        body: "The credentials authenticated successfully, but a required read permission was refused during scanning. No incomplete metrics are being presented as a result.",
      };
    case "upstream_rate_limited":
      return {
        title: "The PSA rate-limited the scan.",
        body: "The credentials were accepted, but the PSA asked us to stop before the scan completed. Wait a few minutes and try again.",
      };
    case "session_expired":
      return {
        title: "This scan session expired.",
        body: "Temporary credentials are deleted after one hour for security. Start a new scan to continue.",
      };
    default:
      return {
        title: "The scan did not complete.",
        body: "The connection was validated, but the PSA did not return enough data for a reliable result. Start another scan or use the walkthrough.",
      };
  }
}

function scanInvitationCopy(scan: AnonymousScanStatus): string {
  const counts = scan.findingsCount ?? {};
  const primaryFinding = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort(([, left], [, right]) => right - left)[0];
  const accountCount = primaryFinding?.[1] ?? scan.clientsWithFindings ?? 0;
  const findingSentence = primaryFinding
    ? findingCountSentence(primaryFinding[0], primaryFinding[1])
    : `We found ${accountCount} account${accountCount === 1 ? "" : "s"} with a measured change in the scanned data.`;
  const invitation = `${findingSentence} Book fifteen minutes and I’ll walk you through which ones and what changed.`;
  switch (scan.exposureAvailability) {
    case "available_value":
      return scan.exposureValue != null && scan.exposureValue > 0
        ? `${findingSentence} This covers ${formatCurrency(scan.exposureValue)} of monthly recurring revenue. Book fifteen minutes and I’ll walk you through which ones and what changed.`
        : invitation;
    case "available_zero":
      return `${invitation} No positive monthly contract value was recorded.`;
    case "available_no_value":
      return `${invitation} Contract records were available, but no usable monthly value was recorded.`;
    case "unavailable":
      return `${invitation} Contract data was not available, so no value estimate is included.`;
    case "not_calculated":
      return `${invitation} Contract value was not calculated for this scan.`;
    default:
      return invitation;
  }
}

function quoteAtStakeHeadline(scan: AnonymousScanStatus): string | null {
  const source = scan.detailsEntitled ? scan.findings ?? [] : scan.findingPreviews ?? [];
  const quoteFindings = source.filter((finding) => finding.type === "quote_value_at_stake");
  const quotedValue = quoteFindings.reduce((sum, finding) => {
    const driver = finding.drivers.find((item) => item.unit === "quoted_value");
    return sum + (driver?.value ?? 0);
  }, 0);
  if (quotedValue <= 0) return null;

  const accounts = scan.detailsEntitled
    ? new Set((scan.findings ?? [])
        .filter((finding) => finding.type === "quote_value_at_stake")
        .map((finding) => finding.clientId)).size
    : quoteFindings.length;
  return `${formatCurrency(quotedValue)} of quotes have expired without approval across ${accounts} account${accounts === 1 ? "" : "s"}.`;
}

function expiringContractHeadline(scan: AnonymousScanStatus): string | null {
  if (
    scan.expiringContractValue == null ||
    scan.expiringContractValue <= 0 ||
    scan.expiringContractCount == null ||
    scan.expiringContractCount <= 0
  ) {
    return null;
  }
  return `${formatCurrency(scan.expiringContractValue * 12)} a year renews in the next 90 days.`;
}

type ResultsHeadline = {
  amount: string | null;
  text: string;
};

function resultsHeadline(
  scan: AnonymousScanStatus,
  totalFindingCount: number,
  hasFindings: boolean,
): ResultsHeadline {
  if (!hasFindings) return { amount: null, text: "Your delivery scan is complete." };
  const atRisk = scan.highlights?.atRisk;
  if (atRisk && atRisk.annualValue > 0) {
    return {
      amount: `${formatCurrency(atRisk.annualValue)} a year`,
      text: `sits with ${atRisk.clients} client${atRisk.clients === 1 ? "" : "s"} whose behaviour has changed against their own history${
        atRisk.clientsWithoutValue > 0
          ? `, plus ${atRisk.clientsWithoutValue} with no contract value in your PSA`
          : ""
      }.`,
    };
  }
  const quoteHeadline = quoteAtStakeHeadline(scan);
  if (quoteHeadline) {
    const [amount, ...text] = quoteHeadline.split(" ");
    return { amount: amount ?? null, text: text.join(" ") };
  }
  const expiringHeadline = expiringContractHeadline(scan);
  if (expiringHeadline) {
    const [amount, unit, ...text] = expiringHeadline.split(" ");
    return { amount: amount ? `${amount} ${unit ?? ""}`.trim() : null, text: text.join(" ") };
  }
  return {
    amount: null,
    text: `${totalFindingCount} finding${totalFindingCount === 1 ? "" : "s"} across ${scan.clientsWithFindings ?? 0} account${scan.clientsWithFindings === 1 ? "" : "s"} were identified.`,
  };
}

function recurringRevenueSupportCopy(scan: AnonymousScanStatus): string | null {
  if (scan.exposureAvailability === "available_value" && scan.exposureValue != null && scan.exposureValue > 0) {
    return `These accounts represent ${formatCurrency(scan.exposureValue)} of monthly recurring revenue.`;
  }
  switch (scan.exposureAvailability) {
    case "available_zero":
      return "No positive recurring invoice value was recorded for these accounts.";
    case "available_no_value":
      return "Recurring invoice records were available, but no usable monthly amount was found for these accounts.";
    case "unavailable":
      return "Monthly recurring revenue could not be read from the PSA.";
    case "not_calculated":
      return "Monthly recurring revenue was not calculated for this scan.";
    default:
      return "Monthly recurring revenue was not available for these accounts.";
  }
}

function formatCurrency(value: number): string {
  return `£${value.toLocaleString("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function monthlyValueLabel(value: number | null): string {
  return value != null && value > 0
    ? `${formatCurrency(value)}/mo`
    : "No contract value in the PSA";
}

function findingAccentClass(
  type: string,
  drivers: Array<{ value: number; unit: string }>,
): string {
  const urgentContract = type === "contract_expiring" &&
    drivers.some((driver) => driver.unit === "days_until_contract_end" && driver.value <= 30);
  return urgentContract ? "text-red-200" : "text-amber-200";
}

function formatPreviewNumber(value: number, unit: string): string {
  if (unit.includes("value")) return formatCurrency(value);
  if (unit.includes("pct")) return `${formatPercent(value)}%`;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** Each measured change as a plain sentence. Contract value is shown separately, so it is skipped. */
function previewDriverText(driver: FindingPreviewView["drivers"][number]): string | null {
  const n = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));
  const hrs = (value: number) =>
    value < 1 ? `${Math.max(1, Math.round(value * 60))} min` : value < 48 ? `${n(Math.round(value * 10) / 10)} hours` : `${n(Math.round((value / 24) * 10) / 10)} days`;
  switch (driver.unit) {
    case "monthly_contract_value":
      return null;
    case "quoted_value":
      return `${formatCurrency(driver.value)} of quotes left unapproved`;
    case "days_since_ticket_activity":
      return `No tickets for ${n(driver.value)} days, against a usual gap of ${n(driver.baseline)}`;
    case "days_until_contract_end":
      return `Contract ends in ${Math.max(1, Math.ceil(driver.value))} days`;
    case "tickets_per_month":
      return `${n(driver.value)} tickets a month, down from ${n(driver.baseline)}`;
    case "open_tickets_per_month":
      return `${n(driver.value)} open tickets, against a usual ${n(driver.baseline)}`;
    case "hours":
      return `First response now ${hrs(driver.value)}, was ${hrs(driver.baseline)}`;
    case "resolution_time_hours":
      return `Resolution now ${hrs(driver.value)}, was ${hrs(driver.baseline)}`;
    case "projects":
      return `${n(driver.value)} project${driver.value === 1 ? "" : "s"} past target date`;
    case "percent_without_close_timestamp":
      return `${formatPercent(driver.value)}% of tickets have no close date`;
    case "percent_without_response_timestamp":
      return `${formatPercent(driver.value)}% of tickets have no response time`;
    case "after_hours_ticket_percent":
      return `${formatPercent(driver.value)}% of tickets raised out of hours, was ${formatPercent(driver.baseline)}%`;
    case "dominant_requester_percent":
      return `${formatPercent(driver.value)}% of tickets come from one person`;
    case "quote_acceptance_pct":
      return `${formatPercent(driver.value)}% of quotes accepted recently, was ${formatPercent(driver.baseline)}%`;
    case "days_since_quote":
      return `No quote for ${n(driver.value)} days`;
    case "days_since_order":
      return `No order for ${n(driver.value)} days`;
    default: {
      const label = driver.unit.replace(/_pct$/, "").replace(/_per_month$/, " a month").replace(/_/g, " ");
      return `${formatPreviewNumber(driver.value, driver.unit)} ${label}, was ${formatPreviewNumber(driver.baseline, driver.unit)}`;
    }
  }
}

export function ScanResults() {
  const router = useRouter();
  const [scan, setScan] = useState<AnonymousScanStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimState, setClaimState] = useState<ClaimState | null>(null);
  const [claimPassword, setClaimPassword] = useState("");
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [newScanBusy, setNewScanBusy] = useState(false);
  const [newScanError, setNewScanError] = useState<string | null>(null);
  const [storedConnectionState, setStoredConnectionState] = useState<
    "checking" | "available" | "missing"
  >("checking");
  const [viewerEntitled, setViewerEntitled] = useState(false);
  const claimRequestRef = useRef<Promise<{
    ok?: boolean;
    connectionTransferred?: boolean;
    errorCode?: string | null;
    detailsEntitled?: boolean;
    accountCreated?: boolean;
    requiresEmailVerification?: boolean;
    emailVerificationSent?: boolean;
    results?: ScanResultsPayload | null;
  }> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // Claim is harmless for anonymous visitors and automatically transfers
        // the result when the authenticated user returns from account creation.
        // The promise ref is necessary because React StrictMode re-runs mount
        // effects in development; both effect instances share one POST.
        const claimRequest =
          claimRequestRef.current ??
          (claimRequestRef.current = fetch("/onboarding/scan/claim", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          }).then(
            async (response) =>
              (await response.json().catch(() => ({}))) as {
                ok?: boolean;
                connectionTransferred?: boolean;
                errorCode?: string | null;
                detailsEntitled?: boolean;
                accountCreated?: boolean;
                requiresEmailVerification?: boolean;
                emailVerificationSent?: boolean;
                results?: ScanResultsPayload | null;
              },
          ));
        const claim = await claimRequest;
        if (claim.ok) {
          setClaimState({
            transferred: claim.connectionTransferred === true,
            errorCode: claim.errorCode ?? null,
            entitled: claim.detailsEntitled === true,
            accountCreated: claim.accountCreated === true,
            requiresVerification: claim.requiresEmailVerification === true,
            emailVerificationSent: claim.emailVerificationSent === true,
          });
          if (claim.results) {
            setScan(
              statusFromResults(
                "claimed",
                {
                  stage: claim.results.scanOutcome === "no_clients" ? "no_clients" : "complete",
                  completed: 3,
                  total: 3,
                },
                claim.results,
                claim.errorCode ?? null,
                claim.detailsEntitled === true,
              ),
            );
          } else {
            setScan({
              status: "claimed",
              scanOutcome: null,
              progress: { stage: "claimed", completed: 0, total: null },
              clientsAnalysed: null,
              clientsWithFindings: null,
              findingsCount: null,
              checksRun: null,
              ticketCount: null,
              responseTimestampCoveragePct: null,
              closeTimestampCoveragePct: null,
              clientsWithoutOwner: null,
              activeContractsWithoutActivity: null,
              clientsInsufficientData: null,
              expiringContractCount: null,
              expiringContractValue: null,
              exposureValue: null,
              revenueConcentrationPct: null,
              revenueConcentrationSuppressedReason: null,
              findingPreviews: [],
              exposureAvailability: null,
              errorCode: claim.errorCode ?? null,
              detailsEntitled: claim.detailsEntitled === true,
            });
          }
          return;
        }
        const response = await fetch("/onboarding/scan/status", {
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = (await response.json()) as AnonymousScanStatus & {
          ok?: boolean;
          detailsEntitled?: boolean;
          results?: ScanResultsPayload | null;
        };
        const normalized = data.results
          ? statusFromResults(
              data.status,
              data.progress,
              data.results,
              null,
              data.detailsEntitled === true,
            )
          : data;
        if (!cancelled) setScan(normalized);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void fetch("/api/auth/scan-claim-redirect", {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          detailsEntitled?: boolean;
        };
        if (response.ok) setViewerEntitled(data.detailsEntitled === true);
      })
      .catch(() => {
        // Anonymous users and unavailable sessions simply get no skip link.
      });
  }, []);

  useEffect(() => {
    if (loading || scan) return;
    let cancelled = false;
    void fetch("/onboarding/scan/start-stored", {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          hasStoredConnection?: boolean;
        };
        if (!cancelled) {
          setStoredConnectionState(
            response.ok && data.hasStoredConnection ? "available" : "missing",
          );
        }
      })
      .catch(() => {
        if (!cancelled) setStoredConnectionState("missing");
      });
    return () => {
      cancelled = true;
    };
  }, [loading, scan]);

  const createAccountAndClaim = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (claimBusy || claimPassword.length < 8) return;
    setClaimBusy(true);
    setClaimError(null);
    try {
      const response = await fetch("/onboarding/scan/claim", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: claimPassword }),
      });
      const claim = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        connectionTransferred?: boolean;
        errorCode?: string | null;
        detailsEntitled?: boolean;
        accountCreated?: boolean;
        requiresEmailVerification?: boolean;
        emailVerificationSent?: boolean;
        results?: ScanResultsPayload | null;
      };
      if (!response.ok || !claim.ok) {
        setClaimError(claim.message ?? "We could not create the account and claim this scan.");
        return;
      }
      setClaimState({
        transferred: claim.connectionTransferred === true,
        errorCode: claim.errorCode ?? null,
        entitled: claim.detailsEntitled === true,
        accountCreated: claim.accountCreated === true,
        requiresVerification: claim.requiresEmailVerification === true,
        emailVerificationSent: claim.emailVerificationSent === true,
      });
      if (claim.results) {
        setScan(
          statusFromResults(
            "claimed",
            { stage: "claimed", completed: 3, total: 3 },
            claim.results,
            claim.errorCode ?? null,
            claim.detailsEntitled === true,
          ),
        );
      }
      setClaimPassword("");
    } catch {
      setClaimError("We could not reach Handover. Please try again.");
    } finally {
      setClaimBusy(false);
    }
  };

  const runNewScan = async () => {
    if (newScanBusy) return;
    setNewScanBusy(true);
    setNewScanError(null);
    try {
      const response = await fetch("/onboarding/scan/start-stored", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      if (!response.ok || !data.ok) {
        setNewScanError(
          data.message ?? data.error ?? "We could not start a new scan with your saved connection.",
        );
        return;
      }
      router.push("/onboarding/scan");
    } catch {
      setNewScanError("We could not reach Handover. Please try again.");
    } finally {
      setNewScanBusy(false);
    }
  };

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#07111f] text-white">
        <div className="size-8 animate-spin rounded-full border-2 border-white/15 border-t-cyan-300" />
      </main>
    );
  }

  if (!scan) {
    return (
      <main className="min-h-screen bg-[#07111f] px-4 py-12 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/[0.04] p-8">
          <h1 className="text-2xl font-semibold">Your saved results have expired.</h1>
          <p className="mt-3 text-sm leading-6 text-white/60">
            The result window has closed, but your saved PSA connection can be used to run a fresh scan.
          </p>
          {storedConnectionState === "available" ? (
            <button
              type="button"
              onClick={runNewScan}
              disabled={newScanBusy}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 disabled:cursor-wait disabled:opacity-60"
            >
              {newScanBusy ? "Starting scan…" : "Run a fresh scan with your saved connection"}
              <ArrowRight className="size-4" />
            </button>
          ) : storedConnectionState === "checking" ? (
            <p className="mt-6 text-sm text-white/50">Checking for a saved PSA connection…</p>
          ) : (
            <a
              href="/onboarding/connect?reason=results-expired"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950"
            >
              Connect your PSA <ArrowRight className="size-4" />
            </a>
          )}
          {newScanError ? (
            <p className="mt-3 text-sm leading-6 text-red-200" role="alert">{newScanError}</p>
          ) : null}
          <a href="/onboarding/connect" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200">
            Connect a different PSA <ArrowRight className="size-4" />
          </a>
          {viewerEntitled ? (
            <a href="/onboarding/exit" className="mt-4 block text-sm text-white/50 hover:text-white/80">
              Skip for now
            </a>
          ) : null}
        </div>
      </main>
    );
  }

  const outcome = outcomeCopy(scan.scanOutcome);
  const failure = scan.status === "failed" ? failureCopy(scan.errorCode) : null;
  const counts = scan.findingsCount ?? {};
  const allPreviews = scan.findingPreviews ?? [];
  // Housekeeping (missing timestamps, no owner) is a data gap, not a warning sign.
  const findingPreviews = allPreviews.filter((finding) => !HOUSEKEEPING_FINDING_TYPES.has(finding.type));
  const housekeepingPreviews = allPreviews.filter((finding) => HOUSEKEEPING_FINDING_TYPES.has(finding.type));
  const nonZeroFindingCounts = Object.entries(counts).filter(([, count]) => count > 0);
  const totalFindingCount = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const hasFindings =
    (scan.clientsWithFindings ?? (totalFindingCount > 0 ? 1 : 0)) > 0;
  const headline = resultsHeadline(scan, totalFindingCount, hasFindings);
  const recurringRevenueCopy = hasFindings ? recurringRevenueSupportCopy(scan) : null;
  const ticketCount = scan.ticketCount ?? 0;
  const missingResponsePct =
    scan.responseTimestampCoveragePct == null
      ? null
      : Math.max(0, 100 - scan.responseTimestampCoveragePct);
  const missingClosePct =
    scan.closeTimestampCoveragePct == null
      ? null
      : Math.max(0, 100 - scan.closeTimestampCoveragePct);
  const portfolioStats = [
    missingResponsePct != null && ticketCount > 0 && missingResponsePct >= 2
      ? `You can't measure first response on ${formatPercent(missingResponsePct)}% of your tickets, so service-level reporting is incomplete.`
      : null,
    missingClosePct != null && ticketCount > 0 && missingClosePct >= 2
      ? `You can't measure completion time on ${formatPercent(missingClosePct)}% of your tickets, so resolution reporting is incomplete.`
      : null,
    scan.clientsWithoutOwner != null && scan.clientsWithoutOwner > 0
      ? `${scan.clientsWithoutOwner} client${scan.clientsWithoutOwner === 1 ? "" : "s"} ${scan.clientsWithoutOwner === 1 ? "has" : "have"} tickets with no assigned owner.`
      : null,
    scan.activeContractsWithoutActivity != null && scan.activeContractsWithoutActivity > 0
      ? `${scan.activeContractsWithoutActivity} client${scan.activeContractsWithoutActivity === 1 ? "" : "s"} ${scan.activeContractsWithoutActivity === 1 ? "has" : "have"} an active contract but raised no tickets during the scan period.`
      : null,
    scan.clientsInsufficientData != null && scan.clientsInsufficientData > 0
      ? `${scan.clientsInsufficientData} client${scan.clientsInsufficientData === 1 ? "" : "s"} ${scan.clientsInsufficientData === 1 ? "had" : "had"} too little history for a reliable comparison and were left out of trend findings.`
      : null,
    ...housekeepingPreviews.map((finding) => {
      const detail = finding.drivers
        .map((driver) => previewDriverText(driver))
        .filter((text): text is string => Boolean(text))
        .join(", ");
      return `One client: ${detail || getFindingCopy(finding.type).label.toLowerCase()}.`;
    }),
  ].filter((value): value is string => value != null);

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-8 text-white sm:px-6 lg:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <Image src="/icon2.png" alt="" width={30} height={30} className="rounded-lg" />
            Handover
          </Link>
          <div className="flex items-center gap-4">
            {viewerEntitled || scan.detailsEntitled === true ? (
              <a
                href="/onboarding/exit"
                className="text-xs font-semibold text-white/50 hover:text-white/80"
              >
                Skip for now
              </a>
            ) : null}
            {scan.status === "claimed" ? (
              <button
                type="button"
                onClick={runNewScan}
                disabled={newScanBusy}
                className="text-xs font-semibold text-cyan-200 hover:text-cyan-100 disabled:cursor-wait disabled:opacity-60"
              >
                {newScanBusy ? "Starting scan…" : "Run a new scan"}
              </button>
            ) : null}
            <a href="/security" className="inline-flex items-center gap-2 text-xs text-white/45 hover:text-white/80">
              <LockKeyhole className="size-3.5" /> Security
            </a>
            <SignOutButton />
          </div>
        </header>
        {newScanError ? (
          <p className="mt-3 text-right text-xs leading-5 text-red-200" role="alert">
            {newScanError}
          </p>
        ) : null}

        <div className="mt-12">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
            {claimState ? "Your scan" : "Anonymous scan"}
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">
            {outcome || failure ? (
              "Here is what we could measure."
            ) : headline.amount ? (
              <>
                <span className="inline-block rounded-2xl bg-white/95 px-4 py-2 text-5xl font-extrabold tracking-tight text-[#07111f] sm:text-6xl">
                  {headline.amount}
                </span>
                <span className="mt-3 block text-2xl font-semibold leading-tight text-white sm:text-4xl">
                  {headline.text}
                </span>
              </>
            ) : (
              headline.text
            )}
          </h1>
          {scan.checksRun != null && scan.clientsAnalysed != null ? (
            <p className="mt-3 text-sm font-medium text-white/55">
              {scan.checksRun} checks across {scan.clientsAnalysed}{" "}
              {scan.clientsAnalysed === 1 ? "account" : "accounts"},{" "}
              {scan.clientsWithFindings ? `${scan.clientsWithFindings} flagged.` : "no accounts flagged."}
            </p>
          ) : null}
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60">
            {claimState?.entitled
              ? "This authenticated view includes the measured drivers behind each finding. Metrics that could not be supported by the source data are omitted."
              : "This preview contains portfolio totals only. Account names, finding drivers, and evidence remain private until you have the required plan."}
          </p>
          <p className="mt-4 text-sm text-white/55">
            Every customer gets a{" "}
            <Link
              href="/onboarding-programme"
              className="font-semibold text-cyan-200 underline decoration-cyan-200/30 underline-offset-4 hover:text-cyan-100"
            >
              30-day launch
            </Link>
            , run by me personally.
          </p>
        </div>

        {claimState !== null ? (
          <div className="mt-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] px-5 py-4 text-sm leading-6 text-cyan-50">
            {claimState.accountCreated
              ? (
                <>
                  <p className="font-semibold text-cyan-50">Account created. Your scan is saved.</p>
                  <p className="mt-1">
                    {claimState.emailVerificationSent
                      ? "We sent a verification email. Verify it before using the rest of Handover."
                      : "Verify your email before using the rest of Handover."}
                  </p>
                  <Link
                    href="/auth?tab=signin&returnTo=%2Fonboarding%2Fresults"
                    className="mt-3 inline-flex font-semibold text-cyan-200 underline-offset-2 hover:underline"
                  >
                    Sign in later
                  </Link>
                </>
              )
              : claimState.transferred
              ? claimState.errorCode === "upstream_forbidden"
                ? "Your validated PSA credentials were added to your account, but the scan encountered a read-permission refusal. Add the missing read permission before relying on this connection."
                : "Your read-only PSA connection and scan result are now attached to your account."
              : "Your scan result is attached to your account. An existing PSA connection was kept unchanged, so nothing was overwritten."}
          </div>
        ) : null}

        {!outcome && !failure && claimState === null && scan.status === "complete" ? (
          <PasswordClaimForm
            password={claimPassword}
            busy={claimBusy}
            error={claimError}
            onPasswordChange={setClaimPassword}
            onSubmit={createAccountAndClaim}
          />
        ) : null}

        {outcome || failure ? (
          <section className="mt-8 rounded-3xl border border-amber-200/20 bg-amber-200/[0.06] p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200/70">
              {failure ? "Scan stopped" : "Honest outcome"}
            </p>
            <h2 className="mt-3 text-2xl font-semibold">{(failure ?? outcome)!.title}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/60">{(failure ?? outcome)!.body}</p>
            <div className="mt-6 space-y-2 border-t border-white/10 pt-5 text-sm text-white/65">
              <p>
                Clients analysed:{" "}
                <span className="font-semibold text-white">
                  {scan.clientsAnalysed == null ? "Not available" : scan.clientsAnalysed}
                </span>
              </p>
              <p>
                Findings returned:{" "}
                <span className="font-semibold text-white">
                  {Object.values(counts).reduce((sum, count) => sum + count, 0)}
                </span>
              </p>
              <p>Exposure: <span className="text-white">{exposureCopy(scan)}</span></p>
            </div>
            <div className="mt-6 flex flex-wrap gap-5">
              <a href="/onboarding/connect" className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-200">
                {failure ? "Start another scan" : "Try the connection again"} <RotateCcw className="size-4" />
              </a>
              {!failure ? (
                <a href={BOOK_DEMO_CALENDLY_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white">
                  Book a walkthrough <ArrowRight className="size-4" />
                </a>
              ) : null}
            </div>
          </section>
        ) : (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-3">
              <Metric label="Clients analysed" value={scan.clientsAnalysed == null ? "Not available" : String(scan.clientsAnalysed)} />
              <Metric
                label="With warning signs"
                value={String(scan.highlights?.atRisk?.clients ?? scan.clientsWithFindings ?? 0)}
              />
              {scan.highlights?.atRisk && scan.highlights.atRisk.annualValue > 0 ? (
                <Metric label="Revenue at risk" value={`${formatCurrency(scan.highlights.atRisk.annualValue)} a year`} />
              ) : recurringRevenueCopy ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:col-span-1">
                  <p className="text-xs uppercase tracking-[0.12em] text-white/40">Account size</p>
                  <p className="mt-3 text-sm leading-6 text-white/70">{recurringRevenueCopy}</p>
                </div>
              ) : null}
            </section>
            {findingPreviews.length === 0 && !claimState?.entitled ? (
            <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs uppercase tracking-[0.12em] text-white/40">Findings by type</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {nonZeroFindingCounts.length > 0 ? nonZeroFindingCounts.map(([type, count]) => (
                    <span key={type} title={getFindingCopy(type).description} className="rounded-full border border-amber-300/25 bg-amber-300/[0.07] px-3 py-2 text-sm text-amber-100">
                      {findingCountSentence(type, count)}
                    </span>
                )) : <span className="text-sm text-white/55">No findings identified in the scanned period.</span>}
              </div>
            </section>
            ) : null}
            {portfolioStats.length > 0 ? (
              <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                <p className="text-xs uppercase tracking-[0.12em] text-white/40">
                  Gaps in your PSA data
                </p>
                <p className="mt-2 text-sm leading-6 text-white/55">
                  Not warning signs. Fixing these makes every number above more complete.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-white/65">
                  {portfolioStats.map((stat) => <li key={stat}>{stat}</li>)}
                </ul>
              </section>
            ) : null}
          </>
        )}

        {!failure && claimState?.entitled && hasFindings ? (
          <DetailedFindings scan={scan} />
        ) : !failure && hasFindings ? (
          <section className="mt-8 min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-8">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.14em] text-white/40">Warning signs, by client</p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
                The account names are withheld in this preview. The measured change and its numbers remain visible.
              </p>
              <div className="mt-5 min-w-0 space-y-3">
                {findingPreviews.length > 0 ? findingPreviews.map((finding, index) => {
                  const copy = getFindingCopy(finding.type);
                  return (
                    <div key={`${finding.type}-${index}`} className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-3">
                        <span className="max-w-full shrink-0 select-none truncate text-sm text-white/75 blur-sm" aria-hidden>
                          Client name withheld
                        </span>
                        <span className="hidden text-white/30 sm:inline" aria-hidden>—</span>
                        <span className={finding.monthlyValue != null && finding.monthlyValue > 0
                          ? "shrink-0 rounded-lg bg-white/95 px-2 py-1 text-sm font-bold text-[#07111f]"
                          : "shrink-0 text-xs font-medium text-white/40"}>
                          {monthlyValueLabel(finding.monthlyValue)}
                        </span>
                        <span className={`min-w-0 break-words text-sm font-medium ${findingAccentClass(finding.type, finding.drivers)}`}>
                          {copy.label}
                        </span>
                      </div>
                      <div className="mt-2 min-w-0 break-words text-sm leading-6 text-white/55">
                        {finding.drivers
                          .map((driver) => previewDriverText(driver))
                          .filter((text): text is string => Boolean(text))
                          .join(" · ")}
                      </div>
                    </div>
                  );
                }) : nonZeroFindingCounts.map(([type, count]) => (
                  <div key={type} className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <span className="max-w-full select-none text-sm text-white/75 blur-sm" aria-hidden>Client name withheld</span>
                    <span className="mx-2 text-white/30" aria-hidden>—</span>
                    <span className="break-words text-sm font-medium text-white">{findingCountSentence(type, count)}</span>
                  </div>
                ))}
              </div>
            </div>
            {claimState || scan.status === "claimed" ? (
              <div className="mt-6 border-t border-white/10 pt-6 text-center">
                <div className="mx-auto max-w-md">
                  <LockKeyhole className="mx-auto size-7 text-cyan-200" />
                  <h2 className="mt-3 text-xl font-semibold">Your scan is saved, but details are not included in this plan</h2>
                  <p className="mt-2 text-sm leading-6 text-white/60">{scanInvitationCopy(scan)}</p>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
                    <a
                      href={BOOK_DEMO_CALENDLY_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950"
                    >
                      Book a walkthrough <ArrowRight className="size-4" />
                    </a>
                    <Link
                      href="/pricing"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 underline-offset-2 hover:underline"
                    >
                      View pricing <ArrowRight className="size-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        ) : !outcome && !failure ? (
          <section className="mt-8 rounded-3xl border border-emerald-200/20 bg-emerald-200/[0.05] p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200/70">No findings</p>
            <h2 className="mt-3 text-2xl font-semibold">No measurable behaviour change was identified.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/60">
              The scan completed for the available data and did not flag an account in this period. There is nothing else hidden behind this screen for this scan.
            </p>
            <a href="/onboarding/connect" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200">
              Run another scan <RotateCcw className="size-4" />
            </a>
          </section>
        ) : null}

        {!outcome && !failure && scan.highlights ? (
          <ProductHighlights highlights={scan.highlights} entitled={claimState?.entitled === true || scan.detailsEntitled === true} />
        ) : null}

        {!outcome && !failure ? (
          <ScanChurnReplay scan={scan} entitled={claimState?.entitled === true} claimed={claimState !== null || scan.status === "claimed"} />
        ) : null}
      </div>
    </main>
  );
}

const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function money(value: number): string {
  return `£${Math.round(value).toLocaleString("en-GB")}`;
}

/**
 * One card per product, each with its headline from this scan. Paying viewers
 * get names and a link straight into the product; everyone else sees the
 * numbers and what they unlock.
 */
export function ProductHighlights({ highlights, entitled }: { highlights: ScanHighlights; entitled: boolean }) {
  const cards: Array<{ key: string; product: string; figure: string; body: string; href: string; cta: string }> = [];
  const r = highlights.renewals;
  if (r) {
    cards.push({
      key: "renewals",
      product: "Renewal Radar",
      figure: r.next90Count > 0 ? `${money(r.next90AnnualValue)} a year` : `${r.next12Count} renewal${r.next12Count === 1 ? "" : "s"}`,
      body:
        r.next90Count > 0
          ? `renews in the next 90 days across ${r.next90Count} client${r.next90Count === 1 ? "" : "s"}${
              r.next90AtRiskAnnualValue >= r.next90AnnualValue && r.next90AtRiskAnnualValue > 0
                ? ", all of it with clients showing warning signs"
                : r.next90AtRiskAnnualValue > 0
                  ? `, and ${money(r.next90AtRiskAnnualValue)} of it is with clients showing warning signs`
                  : ""
            }. Each one comes with what to do before the conversation.`
          : `in the next 12 months${r.nextDays != null ? `, the first in ${r.nextDays} days${r.nextClient ? ` (${r.nextClient})` : ""}` : ""}. Each one comes with what to do before the conversation.`,
      href: "/renewals",
      cta: "Open Renewal Radar",
    });
  }
  const m = highlights.margin;
  if (m) {
    cards.push({
      key: "margin",
      product: "Client Margin",
      figure: m.annualGap > 0 ? `${money(m.annualGap)} a year` : `${money(m.medianRate)} per ${m.unit}`,
      body:
        m.annualGap > 0
          ? `is the gap on ${m.thinCount} client${m.thinCount === 1 ? "" : "s"} who create far more work than they pay for, against your typical ${money(m.medianRate)} per ${m.unit}.${
              m.lowestClient && m.lowestRate != null ? ` Lowest: ${m.lowestClient} at ${money(m.lowestRate)}.` : ""
            }`
          : `is what your typical client pays per ${m.unit} of work, measured across ${m.measured} clients. Nobody is far below it.`,
      href: "/margin",
      cta: "Open Client Margin",
    });
  }
  const rc = highlights.receipts;
  if (rc) {
    const month = MONTHS_FULL[Number(rc.month.slice(5, 7)) - 1] ?? rc.month;
    cards.push({
      key: "receipts",
      product: "Value Receipts",
      figure: `${rc.clients} ready to send`,
      body: `one-page summaries for ${month}, built from ${rc.resolved.toLocaleString("en-GB")} resolved requests${
        rc.hours != null ? ` and ${rc.hours.toLocaleString("en-GB")} hours of work` : ""
      }. Your branding, sent from your address, so clients see what they pay for.`,
      href: "/receipts",
      cta: "Preview a receipt",
    });
  }
  const rec = highlights.recurring;
  if (rec) {
    cards.push({
      key: "recurring",
      product: "Recurring work",
      figure: `${rec.count} × ${rec.label.split(" › ").at(-1) ?? rec.label}`,
      body: `${rec.label.includes(" › ") ? `(${rec.label}) ` : ""}in ${rec.months} months, across ${rec.clients} client${rec.clients === 1 ? "" : "s"}. Repeated work is either a root cause to fix or a project to sell.`,
      href: "/clients",
      cta: "See it by client",
    });
  }
  if (cards.length === 0) return null;
  return (
    <section className="mt-8" aria-labelledby="also-found">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">Also in this scan</p>
      <h2 id="also-found" className="mt-2 text-2xl font-semibold">What else Handover found</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <article key={card.key} className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200/80">{card.product}</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-white">{card.figure}</p>
            <p className="mt-2 flex-1 text-sm leading-6 text-white/60">{card.body}</p>
            {entitled ? (
              <Link href={card.href} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-200 hover:text-cyan-100">
                {card.cta} <ArrowRight className="size-4" aria-hidden />
              </Link>
            ) : (
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs text-white/45">
                <LockKeyhole className="size-3.5" aria-hidden /> Client names and the full view are part of Handover
              </span>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

/** Churn Replay on the scan results: full for entitled viewers, redacted otherwise. */
function ScanChurnReplay({
  scan,
  entitled,
  claimed,
}: {
  scan: AnonymousScanStatus;
  entitled: boolean;
  claimed: boolean;
}) {
  const showFull = entitled && "churnReplay" in scan;
  const replay = showFull ? scan.churnReplay : scan.churnReplayPreview;
  // Anonymous previews from scans that predate Churn Replay carry neither field;
  // there is nothing useful to say to a first-time visitor in that case.
  if (replay === undefined && !claimed) return null;
  return (
    <ChurnReplayPanel
      className="mt-8"
      replay={replay}
      redacted={!showFull}
      redactionNote={
        claimed ? (
          <>
            Client names and the signals behind each warning are part of Handover.{" "}
            <Link
              href="/pricing"
              className="font-semibold text-cyan-200 underline decoration-cyan-200/30 underline-offset-4 hover:text-cyan-100"
            >
              See pricing
            </Link>
          </>
        ) : (
          "Set a password above to save this scan. Client names and the signals behind each warning stay private until then."
        )
      }
    />
  );
}

function DetailedFindings({ scan }: { scan: AnonymousScanStatus }) {
  const findings = scan.findings ?? [];
  const names = scan.clientNames ?? {};
  const insufficient = scan.insufficientData ?? [];
  const { worthAttention, serviceDetail, housekeeping } = splitFindingGroups(findings);

  return (
    <>
      <FindingGroup
        title="Worth your attention"
        description="Changes in how each client uses you, renewals coming up, and other signals with commercial context."
        findings={worthAttention}
        names={names}
        instanceUrl={scan.instanceUrl}
      />
      <FindingGroup
        title="Service detail"
        description="Operational measures that help explain what changed in the account’s service pattern."
        findings={serviceDetail}
        names={names}
        instanceUrl={scan.instanceUrl}
      />
      {housekeeping.length > 0 ? (
        <FindingGroup
          title="Housekeeping"
          description="Gaps in how your PSA is set up: no named owner, one contact raising everything, missing timestamps. They do not mean a client is unhappy and never count towards Revenue at Risk, but fixing them makes every other number more reliable."
          findings={housekeeping}
          names={names}
          instanceUrl={scan.instanceUrl}
        />
      ) : null}

      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.14em] text-white/40">Insufficient data</p>
        <h2 className="mt-2 text-xl font-semibold">Clients not ranked</h2>
        <p className="mt-2 text-sm leading-6 text-white/55">
          These clients did not have enough history for a reliable comparison. They were not silently treated as healthy.
        </p>
        <div className="mt-5 space-y-2">
          {insufficient.length > 0 ? insufficient.map((client) => (
            <div key={client.clientId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 px-4 py-3 text-sm">
              <span className="font-medium">{names[String(client.clientId)] ?? `Client #${client.clientId}`}</span>
              <span className="text-white/50">{insufficientDataReason(client.reason)}</span>
            </div>
          )) : <p className="text-sm text-white/50">No clients were excluded for insufficient history.</p>}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.025] p-6 text-center sm:p-8">
        <h2 className="text-xl font-semibold">Keep the conversation going</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/55">
          Handover monitors these signals continuously, so you can see what changes next.
        </p>
        <a
          href={BOOK_DEMO_CALENDLY_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950"
        >
          Book a walkthrough <ArrowRight className="size-4" />
        </a>
      </section>
    </>
  );
}

function FindingGroup({
  title,
  description,
  findings,
  names,
  instanceUrl,
}: {
  title: string;
  description: string;
  findings: ScanFindingView[];
  names: Record<string, string>;
  instanceUrl: string | null | undefined;
}) {
  return (
    <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-white/40">Ranked findings</p>
          <h2 className="mt-2 text-2xl font-semibold">{title}</h2>
        </div>
        <p className="text-xs text-white/40">Ranked by monthly value, then magnitude</p>
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">{description}</p>
      <div className="mt-6 space-y-4">
        {findings.length > 0 ? findings.map((finding) => (
          <article key={`${finding.clientId}-${finding.type}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className={`text-xs uppercase tracking-[0.12em] ${findingAccentClass(finding.type, finding.drivers)}`}>
                  {getFindingCopy(finding.type).label}
                </p>
                <h3 className="mt-1 text-lg font-semibold">{names[String(finding.clientId)] ?? `Client #${finding.clientId}`}</h3>
              </div>
              <div className="text-right text-sm text-white/60">
                <p className={finding.monthlyValue != null && finding.monthlyValue > 0 ? "rounded-lg bg-white/95 px-2 py-1 font-bold text-[#07111f]" : "text-white/45"}>
                  {monthlyValueLabel(finding.monthlyValue)}
                </p>
                <p className="text-white/45">
                  Confidence: {finding.confidence}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-white/75">{getFindingCopy(finding.type).description}</p>
            <ul className="mt-4 space-y-2">
              {finding.drivers.slice(0, 3).map((driver, index) => (
                <li key={`${finding.clientId}-${finding.type}-driver-${index}`} className="flex gap-3 text-sm leading-6 text-white/65">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-cyan-300" />
                  {driver.fact}
                </li>
              ))}
            </ul>
            <EvidenceLinks
              evidenceIds={finding.evidenceIds}
              instanceUrl={instanceUrl}
            />
          </article>
        )) : <p className="text-sm text-white/55">No findings in this group.</p>}
      </div>
    </section>
  );
}

function EvidenceLinks({
  evidenceIds,
  instanceUrl,
}: {
  evidenceIds: unknown;
  instanceUrl: string | null | undefined;
}) {
  return <EvidenceChips evidenceIds={evidenceIds} instanceUrl={instanceUrl} />;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-xs uppercase tracking-[0.12em] text-white/40">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function PasswordClaimForm({
  password,
  busy,
  error,
  onPasswordChange,
  onSubmit,
}: {
  password: string;
  busy: boolean;
  error: string | null;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="mt-8 rounded-3xl border border-cyan-300/20 bg-cyan-300/[0.06] p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200/75">Keep your scan</p>
      <h2 className="mt-3 text-2xl font-semibold">Set a password to claim these results</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">
        Your email is already captured. Set a password to create your account and attach this scan
        to it. We&apos;ll ask you to verify your email after the handoff.
      </p>
      <form onSubmit={onSubmit} className="mt-5 flex max-w-md flex-col gap-3 sm:flex-row">
        <input
          type="password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          required
          className="h-11 min-w-0 flex-1 rounded-xl border border-white/15 bg-[#07111f] px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-300/60"
        />
        <button
          type="submit"
          disabled={busy || password.length < 8}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-semibold text-slate-950 disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? "Creating account…" : "Claim results"} <ArrowRight className="size-4" />
        </button>
      </form>
      {error ? <p className="mt-3 text-sm text-red-200" role="alert">{error}</p> : null}
    </section>
  );
}

function formatMonthlyValue(value: number): string {
  return `£${value.toLocaleString("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} monthly value`;
}

function formatPercent(value: number): string {
  return value.toLocaleString("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}
