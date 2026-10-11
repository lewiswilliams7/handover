/**
 * Everything Handover knows about each client, in one place: value, warning
 * signs, margin, renewal, activity and contacts. Feeds the Clients list and
 * each client's own page.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { buildClientMargin, type ClientMarginRow, type MarginBasis } from "@/lib/client-margin";
import { applyManualValues, loadManualValues } from "@/lib/manual-client-values";
import type { ClientMonthStats, RecentTicket } from "@/lib/psa/client-monthly";
import { getFindingCopy } from "@/lib/psa/scan-finding-copy";
import { getClaimedScanForUser, type ClientContact, type StoredScanResults } from "@/lib/psa/scan-session";
import { buildRenewalRadar, RENEWAL_MOVE_COPY, type RenewalRow } from "@/lib/renewal-radar";
import { HOUSEKEEPING_FINDING_TYPES, isRiskFinding } from "@/lib/revenue/revenue-signals";

export type ClientStatus = "at_risk" | "healthy" | "not_enough_data";

export type ClientSignal = {
  type: string;
  label: string;
  fact: string | null;
  kind: "risk" | "housekeeping" | "other";
};

export type ClientSummary = {
  clientId: number;
  name: string;
  monthlyValue: number | null;
  valueFromManual: boolean;
  status: ClientStatus;
  signals: ClientSignal[];
  margin: ClientMarginRow | null;
  renewal: (RenewalRow & { moveTitle: string }) | null;
  lastMonthResolved: number | null;
  contacts: ClientContact[];
  months: ClientMonthStats[];
  /** Most recent tickets, newest first. */
  recent: RecentTicket[];
};

export type ClientPortfolio = {
  scanSessionId: string;
  scannedAt: string;
  currentMonth: string | null;
  medianRate: number | null;
  basis: MarginBasis;
  clients: ClientSummary[];
  psaType: StoredScanResults["psaType"];
  instanceUrl: string | null;
};

function cleanName(results: StoredScanResults, clientId: number): string {
  const name = results.clientNames?.[String(clientId)]?.trim();
  return name && !["unknown", "unassigned", "n/a"].includes(name.toLowerCase()) ? name : `Client #${clientId}`;
}

export async function loadClientPortfolio(
  supabase: SupabaseClient,
  userId: string,
): Promise<ClientPortfolio | null> {
  const scan = await getClaimedScanForUser(userId);
  if (!scan?.results) return null;
  const manual = await loadManualValues(supabase, userId);
  return buildClientPortfolio(applyManualValues(scan.results, manual), {
    sessionId: scan.sessionId,
    createdAt: scan.createdAt,
  });
}

/** Pure: the portfolio from scan results (with manual values already applied). */
export function buildClientPortfolio(
  results: StoredScanResults & { manualValueClientIds?: number[] },
  scan: { sessionId: string; createdAt: string },
): ClientPortfolio {
  const manualIds = new Set(results.manualValueClientIds ?? []);
  const findings = results.findings ?? [];
  const refs = findings.map((finding) => ({ clientId: finding.clientId, type: finding.type }));
  const margin = results.clientMonthly
    ? buildClientMargin({
        monthly: results.clientMonthly,
        clientValues: results.clientValues,
        findings: refs,
        clientNames: results.clientNames ?? {},
      })
    : null;
  const radar = results.renewals
    ? buildRenewalRadar({ renewals: results.renewals, findings: refs, margin, clientNames: results.clientNames ?? {} })
    : null;
  const insufficient = new Set(
    ((results.insufficientData ?? []) as Array<{ clientId?: unknown }>).map((row) => Number(row.clientId)),
  );
  const departed = new Set((results.churnReplay?.clients ?? []).map((client) => client.clientId));

  const ids = new Set<number>([
    ...Object.keys(results.clientNames ?? {}).map(Number),
    ...findings.map((finding) => finding.clientId),
    ...(results.clientMonthly?.clients ?? []).map((client) => client.clientId),
  ]);
  ids.delete(0);
  for (const id of departed) ids.delete(id);

  const marginById = new Map((margin?.rows ?? []).map((row) => [row.clientId, row]));
  const renewalById = new Map((radar?.rows ?? []).map((row) => [row.clientId, row]));
  const monthlyById = new Map((results.clientMonthly?.clients ?? []).map((client) => [client.clientId, client.months]));
  const recentById = new Map((results.clientMonthly?.clients ?? []).map((client) => [client.clientId, client.recent ?? []]));
  const currentMonth = results.clientMonthly?.currentMonth ?? null;

  const clients: ClientSummary[] = [...ids].map((clientId) => {
    const clientFindings = findings.filter((finding) => finding.clientId === clientId);
    const signals: ClientSignal[] = clientFindings.map((finding) => ({
      type: finding.type,
      label: getFindingCopy(finding.type).label,
      fact: finding.drivers[0]?.fact ?? null,
      kind: isRiskFinding(finding.type) ? "risk" : HOUSEKEEPING_FINDING_TYPES.has(finding.type) ? "housekeeping" : "other",
    }));
    const value = results.clientValues?.[String(clientId)];
    const months = monthlyById.get(clientId) ?? [];
    const lastComplete = currentMonth ? months.filter((m) => m.month < currentMonth).at(-1) : undefined;
    const renewal = renewalById.get(clientId);
    return {
      clientId,
      name: cleanName(results, clientId),
      monthlyValue: value != null && value > 0 ? value : null,
      valueFromManual: manualIds.has(clientId),
      status: signals.some((signal) => signal.kind === "risk")
        ? "at_risk"
        : insufficient.has(clientId)
          ? "not_enough_data"
          : "healthy",
      signals,
      margin: marginById.get(clientId) ?? null,
      renewal: renewal ? { ...renewal, moveTitle: RENEWAL_MOVE_COPY[renewal.move].title } : null,
      lastMonthResolved: lastComplete ? lastComplete.closed : null,
      contacts: results.clientContacts?.[String(clientId)] ?? [],
      months,
      recent: recentById.get(clientId) ?? [],
    };
  });
  clients.sort(
    (a, b) =>
      (a.status === "at_risk" ? 0 : 1) - (b.status === "at_risk" ? 0 : 1) ||
      (b.monthlyValue ?? -1) - (a.monthlyValue ?? -1) ||
      a.name.localeCompare(b.name),
  );

  return {
    scanSessionId: scan.sessionId,
    scannedAt: scan.createdAt,
    currentMonth,
    medianRate: margin?.medianRate ?? null,
    basis: margin?.basis ?? "hours",
    clients,
    psaType: results.psaType,
    instanceUrl: results.instanceUrl ?? null,
  };
}
