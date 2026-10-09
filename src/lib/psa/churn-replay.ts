/**
 * Churn Replay™
 *
 * Finds clients that have left in the scan window, rewinds each one to fixed
 * checkpoints before they left, and re-runs the same per-client checks the live
 * scan uses against the data exactly as it stood on that day. The result answers
 * one question an MSP owner cares about: "Would Handover have warned me?"
 *
 * Rules that keep the replay honest:
 * - Only data dated on or before the checkpoint is visible. Tickets closed or
 *   answered later are treated as still open or unanswered at the checkpoint.
 * - Each client is replayed against its own history only. Portfolio-relative
 *   checks are not used, so one lost client cannot be flagged by others' data.
 * - Renewal-date warnings are excluded. A contract ending is how the loss is
 *   detected, so counting "contract ends soon" as a catch would be circular.
 * - Projects are excluded, because project completion dates are not available
 *   to tell whether a project was overdue on the checkpoint date.
 * - Standing account structure (one contact raising everything, no owner) is
 *   excluded; only changes in behaviour count as a warning.
 * - Retained clients are replayed too, so the catch rate sits next to the
 *   false-alarm rate rather than on its own.
 */
import type {
  NormalisedContractRecord,
  NormalisedRecurringInvoiceRecord,
} from "@/lib/psa/contracts";
import type { NormalisedQuotation, NormalisedSalesOrder } from "@/lib/psa/commercial";
import type { ScanFieldMappingContext } from "@/lib/psa/halo-field-provenance";
import { aggregateByClientPeriod, type ScanTicketInput } from "@/lib/psa/scan-aggregate";
import {
  buildScanFindings,
  type FindingDriver,
  type FindingType,
} from "@/lib/psa/scan-findings";

const DAY_MS = 86_400_000;

/** Days before the loss date at which the replay re-runs the checks, earliest first. */
export const CHURN_REPLAY_CHECKPOINT_DAYS = [150, 120, 90, 60, 30] as const;

/**
 * Finding types that cannot count as a replay catch:
 * - contract_expiring: circular, the contract ending is how the loss is found.
 * - data_quality, project_overrun: not evaluable as of a past date.
 * - contact_concentration, unowned_account, high_value_unowned: standing
 *   account structure, not a change in behaviour. They would be true at any
 *   checkpoint, so counting them would flatter the catch rate.
 * - top_client_service_decline, contract_vs_usage: ranked against the rest of
 *   the portfolio, which the per-client replay deliberately does not see.
 */
const EXCLUDED_REPLAY_TYPES = new Set<FindingType>([
  "contract_expiring",
  "data_quality",
  "project_overrun",
  "contact_concentration",
  "unowned_account",
  "high_value_unowned",
  "top_client_service_decline",
  "contract_vs_usage",
]);

/** Most lost clients replayed per scan; the largest by value are kept first. */
const MAX_REPLAYED_CLIENTS = 25;

/** Most retained clients replayed as the control group (busiest first). */
const MAX_CONTROL_CLIENTS = 60;

export type ChurnLossSignal = "contract_ended" | "billing_ended" | "activity_stopped";

export type ChurnReplayOutcome = "flagged" | "missed" | "insufficient_history";

export type ChurnReplayFinding = {
  type: FindingType;
  drivers: FindingDriver[];
};

export type ChurnReplayClient = {
  clientId: number;
  clientName: string;
  lossSignal: ChurnLossSignal;
  /** ISO date (YYYY-MM-DD) the client is treated as having left. */
  lossDate: string;
  /** Monthly value of the work that ended, when the PSA records it. */
  monthlyValue: number | null;
  outcome: ChurnReplayOutcome;
  /** Days before the loss date of the earliest checkpoint where a check fired. */
  daysWarning: number | null;
  /** ISO date of that earliest flagged checkpoint. */
  firstFlaggedAt: string | null;
  /** What fired at the earliest flagged checkpoint, strongest first (max 3). */
  findings: ChurnReplayFinding[];
  /** Tickets this client raised in the scan window before the loss date. */
  ticketsBeforeLoss: number;
};

export type ChurnReplaySummary = {
  /** Lost clients found in the window, before the replay cap is applied. */
  detected: number;
  /** Lost clients replayed (the most valuable, up to 25). */
  lostClients: number;
  flagged: number;
  missed: number;
  insufficientHistory: number;
  /** Clients that could be replayed (flagged + missed). */
  replayable: number;
  /** Annualised value of all lost clients with a known value. */
  lostAnnualValue: number | null;
  /** Annualised value of lost clients the replay would have flagged. */
  flaggedAnnualValue: number | null;
  /** How many lost clients had a known value. */
  clientsWithValue: number;
  /** Median warning, in days, across flagged clients. */
  medianDaysWarning: number | null;
  /**
   * Control group: clients that are still with the MSP, replayed at the same
   * checkpoints counted back from today. `retainedFlagged / retainedChecked`
   * is the false-alarm rate to read next to the catch rate.
   */
  retainedChecked: number;
  retainedFlagged: number;
};

export type ChurnReplayResult = {
  version: 1;
  generatedAt: string;
  windowStart: string;
  windowEnd: string;
  checkpointDays: number[];
  clients: ChurnReplayClient[];
  summary: ChurnReplaySummary;
  /** Which data sources were available to detect a loss. */
  sources: {
    contracts: boolean;
    billing: boolean;
    activity: boolean;
  };
};

export type BuildChurnReplayInput = {
  tickets: ScanTicketInput[];
  /** Every contract the PSA returned, including ended and cancelled ones. */
  contracts?: NormalisedContractRecord[];
  recurringInvoices?: NormalisedRecurringInvoiceRecord[];
  quotations?: NormalisedQuotation[];
  salesOrders?: NormalisedSalesOrder[];
  fieldMapping?: ScanFieldMappingContext | null;
  clientNames?: Record<string, string>;
  /** Start of the scan's history window (ISO date). */
  windowStart: string;
  /** Defaults to now. */
  nowMs?: number;
};

type LostClientCandidate = {
  clientId: number;
  lossSignal: ChurnLossSignal;
  lossMs: number;
  monthlyValue: number | null;
};

function parseMs(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

function isoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function monthKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function groupBy<T>(rows: T[] | undefined, key: (row: T) => number): Map<number, T[]> {
  const out = new Map<number, T[]>();
  for (const row of rows ?? []) {
    const id = key(row);
    if (!Number.isSafeInteger(id) || id <= 0) continue;
    const list = out.get(id) ?? [];
    list.push(row);
    out.set(id, list);
  }
  return out;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
    : sorted[mid]!;
}

/** Sum of monthly values for records ending within a month of the loss date. */
function valueEndingNear(
  records: Array<{ endMs: number | null; monthlyValue: number | null }>,
  lossMs: number,
): number | null {
  let total = 0;
  let found = false;
  for (const record of records) {
    if (record.endMs == null || record.monthlyValue == null || record.monthlyValue <= 0) continue;
    if (Math.abs(lossMs - record.endMs) <= 31 * DAY_MS) {
      total += record.monthlyValue;
      found = true;
    }
  }
  return found ? Math.round(total * 100) / 100 : null;
}

/**
 * Identify clients that have left within the scan window.
 *
 * Commercial evidence (all contracts or all recurring billing ended) wins over
 * activity evidence. A client still raising tickets in the last 30 days is never
 * treated as lost, whatever its contracts say.
 */
export function detectLostClients(
  input: BuildChurnReplayInput,
  nowMs: number,
): LostClientCandidate[] {
  const windowStartMs = parseMs(input.windowStart) ?? nowMs - 365 * DAY_MS;
  // A loss needs enough history before it for at least the latest checkpoint.
  const earliestLossMs = windowStartMs + 180 * DAY_MS;
  const latestLossMs = nowMs - 7 * DAY_MS;

  const ticketsByClient = groupBy(input.tickets, (ticket) => ticket.clientId);
  const lastTicketMs = new Map<number, number>();
  for (const [clientId, tickets] of ticketsByClient) {
    let latest = -Infinity;
    for (const ticket of tickets) {
      const entered = parseMs(ticket.dateEntered);
      if (entered != null && entered > latest) latest = entered;
    }
    if (Number.isFinite(latest)) lastTicketMs.set(clientId, latest);
  }
  const stillActive = (clientId: number) =>
    (lastTicketMs.get(clientId) ?? -Infinity) > nowMs - 30 * DAY_MS;

  const contractsByClient = groupBy(input.contracts, (row) => row.clientId);
  const invoicesByClient = groupBy(input.recurringInvoices, (row) => row.clientId);

  const hasCurrentCommercial = (clientId: number) => {
    const contractCurrent = (contractsByClient.get(clientId) ?? []).some((row) => {
      const end = parseMs(row.endDate);
      return end == null || end > nowMs;
    });
    const billingCurrent = (invoicesByClient.get(clientId) ?? []).some((row) => {
      const end = parseMs(row.endDate);
      return end == null || end > nowMs;
    });
    return contractCurrent || billingCurrent;
  };

  const lost = new Map<number, LostClientCandidate>();

  const considerCommercial = (
    clientId: number,
    rows: Array<{ endMs: number | null; monthlyValue: number | null }>,
    signal: ChurnLossSignal,
  ) => {
    if (rows.length === 0 || lost.has(clientId)) return;
    if (rows.some((row) => row.endMs == null || row.endMs > nowMs)) return;
    if (hasCurrentCommercial(clientId) || stillActive(clientId)) return;
    const lossMs = Math.max(...rows.map((row) => row.endMs!));
    if (lossMs < earliestLossMs || lossMs > latestLossMs) return;
    lost.set(clientId, {
      clientId,
      lossSignal: signal,
      lossMs,
      monthlyValue: valueEndingNear(rows, lossMs),
    });
  };

  for (const [clientId, rows] of contractsByClient) {
    considerCommercial(
      clientId,
      rows.map((row) => ({ endMs: parseMs(row.endDate), monthlyValue: row.monthlyValue })),
      "contract_ended",
    );
  }
  for (const [clientId, rows] of invoicesByClient) {
    considerCommercial(
      clientId,
      rows.map((row) => ({ endMs: parseMs(row.endDate), monthlyValue: row.monthlyValue })),
      "billing_ended",
    );
  }

  // Activity evidence only applies where the PSA gives no commercial record for
  // the client: otherwise a quiet but contracted client would look lost.
  for (const [clientId, tickets] of ticketsByClient) {
    if (lost.has(clientId)) continue;
    if (contractsByClient.has(clientId) || invoicesByClient.has(clientId)) continue;
    const last = lastTicketMs.get(clientId);
    if (last == null || last > nowMs - 90 * DAY_MS) continue;
    if (last < earliestLossMs) continue;
    const enteredMs = tickets
      .map((ticket) => parseMs(ticket.dateEntered))
      .filter((ms): ms is number => ms != null);
    if (enteredMs.length < 20) continue;
    const months = new Set(enteredMs.map(monthKey));
    if (months.size < 5) continue;
    if (Math.min(...enteredMs) > last - 180 * DAY_MS) continue;
    lost.set(clientId, {
      clientId,
      lossSignal: "activity_stopped",
      lossMs: last,
      monthlyValue: null,
    });
  }

  return [...lost.values()];
}

/** The ticket as it would have looked on the checkpoint date, or null if raised later. */
function ticketAsOf(ticket: ScanTicketInput, cutoffMs: number): ScanTicketInput | null {
  const entered = parseMs(ticket.dateEntered);
  if (entered == null || entered > cutoffMs) return null;
  const responded = parseMs(ticket.dateResponded);
  const closed = parseMs(ticket.dateClosed);
  const closedByCutoff = closed != null && closed <= cutoffMs;
  const knownOpenState = ticket.statusOpen != null || closed != null;
  return {
    ...ticket,
    dateResponded: responded != null && responded <= cutoffMs ? ticket.dateResponded : null,
    dateClosed: closedByCutoff ? ticket.dateClosed : null,
    statusOpen: closedByCutoff ? false : knownOpenState ? true : null,
  };
}

function replayClientAt(
  clientId: number,
  cutoffMs: number,
  data: {
    tickets: ScanTicketInput[];
    contracts?: NormalisedContractRecord[];
    recurringInvoices?: NormalisedRecurringInvoiceRecord[];
    quotations?: NormalisedQuotation[];
    salesOrders?: NormalisedSalesOrder[];
  },
  input: BuildChurnReplayInput,
): { insufficient: boolean; findings: ChurnReplayFinding[] } {
  const tickets = data.tickets
    .map((ticket) => ticketAsOf(ticket, cutoffMs))
    .filter((ticket): ticket is ScanTicketInput => ticket != null);
  const monthsWithTickets = new Set(
    tickets
      .map((ticket) => parseMs(ticket.dateEntered))
      .filter((ms): ms is number => ms != null)
      .map(monthKey),
  );
  // Same floor the live scan applies: a baseline plus a recent period to compare.
  if (tickets.length < 5 || monthsWithTickets.size < 4) {
    return { insufficient: true, findings: [] };
  }

  const contracts = data.contracts?.filter((row) => {
    const end = parseMs(row.endDate);
    return end == null || end > cutoffMs;
  });
  const recurringInvoices = data.recurringInvoices?.filter((row) => {
    const start = parseMs(row.startDate);
    const end = parseMs(row.endDate);
    return (start == null || start <= cutoffMs) && (end == null || end > cutoffMs);
  });
  const quotations = data.quotations
    ?.filter((quote) => {
      const date = parseMs(quote.date);
      return date != null && date <= cutoffMs;
    })
    .map((quote) => {
      const approvedAt = parseMs(quote.approvalDateTime);
      return approvedAt != null && approvedAt > cutoffMs ? { ...quote, approved: false } : quote;
    });
  const salesOrders = data.salesOrders?.filter((order) => {
    const date = parseMs(order.date);
    return date != null && date <= cutoffMs;
  });

  const byClient = aggregateByClientPeriod(tickets, [], {
    fieldMapping: input.fieldMapping ?? undefined,
  });
  const result = buildScanFindings({
    byClient,
    tickets,
    projects: [],
    contracts,
    recurringInvoices,
    quotations,
    salesOrders,
    fieldMapping: input.fieldMapping ?? null,
    clientNames: input.clientNames,
    asOfMs: cutoffMs,
  });

  const findings = result.findings
    .filter((finding) => finding.clientId === clientId && !EXCLUDED_REPLAY_TYPES.has(finding.type))
    .map((finding) => ({ type: finding.type, drivers: finding.drivers.slice(0, 3) }));
  const insufficient =
    findings.length === 0 &&
    result.insufficientData.some((client) => client.clientId === clientId);
  return { insufficient, findings };
}

function summarise(
  clients: ChurnReplayClient[],
  control: { checked: number; flagged: number },
  detected: number,
): ChurnReplaySummary {
  const flagged = clients.filter((client) => client.outcome === "flagged");
  const missed = clients.filter((client) => client.outcome === "missed");
  const withValue = clients.filter((client) => client.monthlyValue != null);
  const annual = (rows: ChurnReplayClient[]) => {
    const valued = rows.filter((client) => client.monthlyValue != null);
    if (valued.length === 0) return null;
    return Math.round(valued.reduce((sum, client) => sum + client.monthlyValue! * 12, 0));
  };
  return {
    detected,
    lostClients: clients.length,
    flagged: flagged.length,
    missed: missed.length,
    insufficientHistory: clients.length - flagged.length - missed.length,
    replayable: flagged.length + missed.length,
    lostAnnualValue: annual(clients),
    flaggedAnnualValue: annual(flagged),
    clientsWithValue: withValue.length,
    medianDaysWarning: median(
      flagged
        .map((client) => client.daysWarning)
        .filter((days): days is number => days != null),
    ),
    retainedChecked: control.checked,
    retainedFlagged: control.flagged,
  };
}

type ClientReplayData = {
  tickets: ScanTicketInput[];
  contracts?: NormalisedContractRecord[];
  recurringInvoices?: NormalisedRecurringInvoiceRecord[];
  quotations?: NormalisedQuotation[];
  salesOrders?: NormalisedSalesOrder[];
};

/** Walk the checkpoints earliest first and stop at the first one that fires. */
function replayAcrossCheckpoints(
  clientId: number,
  anchorMs: number,
  data: ClientReplayData,
  input: BuildChurnReplayInput,
): {
  anyReplayable: boolean;
  flaggedAt: { days: number; cutoffMs: number; findings: ChurnReplayFinding[] } | null;
} {
  let anyReplayable = false;
  for (const days of CHURN_REPLAY_CHECKPOINT_DAYS) {
    const cutoffMs = anchorMs - days * DAY_MS;
    const run = replayClientAt(clientId, cutoffMs, data, input);
    if (!run.insufficient) anyReplayable = true;
    if (run.findings.length > 0) {
      return {
        anyReplayable: true,
        flaggedAt: { days, cutoffMs, findings: run.findings.slice(0, 3) },
      };
    }
  }
  return { anyReplayable, flaggedAt: null };
}

/**
 * Run Churn Replay over a scan's data. Pure and deterministic for a given
 * `nowMs`, so it can run inside the scan job and in tests.
 */
export function buildChurnReplay(input: BuildChurnReplayInput): ChurnReplayResult {
  const nowMs = input.nowMs ?? Date.now();
  const allLost = detectLostClients(input, nowMs);
  const candidates = [...allLost]
    .sort(
      (a, b) =>
        (b.monthlyValue ?? -1) - (a.monthlyValue ?? -1) || b.lossMs - a.lossMs,
    )
    .slice(0, MAX_REPLAYED_CLIENTS);

  const ticketsByClient = groupBy(input.tickets, (ticket) => ticket.clientId);
  const contractsByClient = groupBy(input.contracts, (row) => row.clientId);
  const invoicesByClient = groupBy(input.recurringInvoices, (row) => row.clientId);
  const quotesByClient = groupBy(input.quotations, (row) => row.clientId);
  const ordersByClient = groupBy(input.salesOrders, (row) => row.clientId);

  const dataFor = (clientId: number): ClientReplayData => ({
    tickets: ticketsByClient.get(clientId) ?? [],
    contracts: input.contracts ? (contractsByClient.get(clientId) ?? []) : undefined,
    recurringInvoices: input.recurringInvoices
      ? (invoicesByClient.get(clientId) ?? [])
      : undefined,
    quotations: input.quotations ? (quotesByClient.get(clientId) ?? []) : undefined,
    salesOrders: input.salesOrders ? (ordersByClient.get(clientId) ?? []) : undefined,
  });

  const clients: ChurnReplayClient[] = candidates.map((candidate) => {
    const { clientId, lossMs } = candidate;
    const data = dataFor(clientId);
    const tickets = data.tickets;
    const { anyReplayable, flaggedAt } = replayAcrossCheckpoints(clientId, lossMs, data, input);

    const ticketsBeforeLoss = tickets.filter((ticket) => {
      const entered = parseMs(ticket.dateEntered);
      return entered != null && entered <= lossMs;
    }).length;

    return {
      clientId,
      clientName: input.clientNames?.[String(clientId)] ?? `Client #${clientId}`,
      lossSignal: candidate.lossSignal,
      lossDate: isoDay(lossMs),
      monthlyValue: candidate.monthlyValue,
      outcome: flaggedAt ? "flagged" : anyReplayable ? "missed" : "insufficient_history",
      daysWarning: flaggedAt?.days ?? null,
      firstFlaggedAt: flaggedAt ? isoDay(flaggedAt.cutoffMs) : null,
      findings: flaggedAt?.findings ?? [],
      ticketsBeforeLoss,
    };
  });

  // Control group: clients still raising tickets in the last 30 days, replayed
  // at the same checkpoints counted back from today.
  const lostIds = new Set(allLost.map((client) => client.clientId));
  const controlIds = [...ticketsByClient.entries()]
    .filter(([clientId, tickets]) => {
      if (lostIds.has(clientId)) return false;
      return tickets.some((ticket) => {
        const entered = parseMs(ticket.dateEntered);
        return entered != null && entered > nowMs - 30 * DAY_MS;
      });
    })
    .sort((a, b) => b[1].length - a[1].length || a[0] - b[0])
    .slice(0, MAX_CONTROL_CLIENTS)
    .map(([clientId]) => clientId);
  let controlChecked = 0;
  let controlFlagged = 0;
  for (const clientId of controlIds) {
    const run = replayAcrossCheckpoints(clientId, nowMs, dataFor(clientId), input);
    if (!run.anyReplayable) continue;
    controlChecked += 1;
    if (run.flaggedAt) controlFlagged += 1;
  }

  const outcomeRank: Record<ChurnReplayOutcome, number> = {
    flagged: 0,
    missed: 1,
    insufficient_history: 2,
  };
  clients.sort(
    (a, b) =>
      outcomeRank[a.outcome] - outcomeRank[b.outcome] ||
      (b.monthlyValue ?? -1) - (a.monthlyValue ?? -1) ||
      b.lossDate.localeCompare(a.lossDate),
  );

  return {
    version: 1,
    generatedAt: new Date(nowMs).toISOString(),
    windowStart: input.windowStart,
    windowEnd: isoDay(nowMs),
    checkpointDays: [...CHURN_REPLAY_CHECKPOINT_DAYS],
    clients,
    summary: summarise(
      clients,
      { checked: controlChecked, flagged: controlFlagged },
      allLost.length,
    ),
    sources: {
      contracts: Boolean(input.contracts && input.contracts.length > 0),
      billing: Boolean(input.recurringInvoices && input.recurringInvoices.length > 0),
      activity: input.tickets.length > 0,
    },
  };
}

/** A lost client with nothing that identifies the client or the MSP's records. */
export type ChurnReplayPreviewClient = {
  lossSignal: ChurnLossSignal;
  /** Month only (YYYY-MM), so a lost client cannot be identified by date. */
  lossMonth: string;
  monthlyValue: number | null;
  outcome: ChurnReplayOutcome;
  daysWarning: number | null;
  findingTypes: FindingType[];
};

export type ChurnReplayPreview = Omit<ChurnReplayResult, "clients"> & {
  clients: ChurnReplayPreviewClient[];
};

/**
 * Strip names, ids, exact dates and driver text for viewers without access to
 * details. Returns undefined for scans that predate Churn Replay (so the UI can
 * ask for a refresh) and null when the replay failed.
 */
export function churnReplayPreview(
  result: ChurnReplayResult | null | undefined,
): ChurnReplayPreview | null | undefined {
  if (result === undefined) return undefined;
  if (!result || result.version !== 1 || !Array.isArray(result.clients)) return null;
  const { clients, ...rest } = result;
  return {
    ...rest,
    clients: clients.map((client) => ({
      lossSignal: client.lossSignal,
      lossMonth: client.lossDate.slice(0, 7),
      monthlyValue: client.monthlyValue,
      outcome: client.outcome,
      daysWarning: client.daysWarning,
      findingTypes: client.findings.map((finding) => finding.type),
    })),
  };
}
