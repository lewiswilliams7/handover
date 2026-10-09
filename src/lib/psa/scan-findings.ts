import type {
  NormalisedContractRecord,
  NormalisedRecurringInvoiceRecord,
} from "@/lib/psa/contracts";
import type {
  NormalisedQuotation,
  NormalisedSalesOrder,
} from "@/lib/psa/commercial";
import type { FieldMappingConfidence, ScanFieldMappingContext } from "@/lib/psa/halo-field-provenance";
import { daysToTargetDate } from "@/lib/psa/scan-aggregate";
import type {
  ClientPeriodAggregate,
  ScanProjectInput,
  ScanTicketInput,
} from "@/lib/psa/scan-aggregate";
import {
  capScanEvidence,
  type ScanEvidenceRef,
  type ScanEvidenceSource,
} from "@/lib/psa/scan-evidence";

export type FindingType =
  | "volume_shift"
  | "response_drift"
  | "project_overrun"
  | "contact_gap"
  | "data_quality"
  | "backlog_growth"
  | "ageing_tickets"
  | "unowned_account"
  | "contact_concentration"
  | "resolution_time_trend"
  | "after_hours_volume"
  | "contact_gap_absolute"
  | "contract_expiring"
  | "contract_vs_usage"
  | "top_client_service_decline"
  | "high_value_unowned"
  | "quote_acceptance_drop"
  | "quote_value_at_stake"
  | "quote_stalled"
  | "order_gap"
  | "order_value_drop";

export type FindingDriver = {
  /** Human-readable fact with explicit baseline comparison. */
  fact: string;
  value: number;
  baseline: number;
  unit: string;
};

export type ScanFinding = {
  clientId: number;
  type: FindingType;
  drivers: FindingDriver[];
  monthlyValue: number | null;
  confidence: FieldMappingConfidence;
  /** Used for ranking when monthlyValue is equal or unknown. */
  magnitude: number;
  /** Latest observed ticket activity used as a recency tie-breaker. */
  recencyAt?: string | null;
  /** Up to ten source records that support this finding. */
  evidenceIds?: ScanEvidenceRef[];
};

export type InsufficientDataClient = {
  clientId: number;
  reason: string;
  ticketCount: number;
  monthsWithTickets: number;
};

export type ScanFindingsPortfolioSummary = {
  clientsAnalysed: number;
  clientsWithFindings: number;
  findingsByType: Record<FindingType, number>;
  checksRun: number;
  ticketCount: number;
  responseTimestampCoveragePct: number | null;
  closeTimestampCoveragePct: number | null;
  clientsWithoutOwner: number | null;
  activeContractsWithoutActivity: number | null;
  clientsInsufficientData: number;
  expiringContractCount: number;
  expiringContractValue: number | null;
  /** Sum of monthly contract value for clients with at least one finding. */
  exposureValue: number | null;
  /** Share of flagged clients that had a usable contract monthlyValue (0–100). */
  exposureCoverage: number | null;
  /** Share of usable portfolio monthly value held by clients with findings (0–100). */
  revenueConcentrationPct: number | null;
  /** Why revenue concentration was withheld, when findings are too widespread. */
  revenueConcentrationSuppressedReason: string | null;
};

export type ScanFindingsResult = {
  findings: ScanFinding[];
  insufficientData: InsufficientDataClient[];
  portfolio: ScanFindingsPortfolioSummary;
};

export type BuildScanFindingsInput = {
  byClient: Record<number, ClientPeriodAggregate>;
  /** Ticket rows used to compute temporal baselines (same window as aggregates). */
  tickets: ScanTicketInput[];
  /** Parent project rows used to compute project overrun findings. */
  projects?: ScanProjectInput[];
  contracts?: NormalisedContractRecord[];
  recurringInvoices?: NormalisedRecurringInvoiceRecord[];
  quotations?: NormalisedQuotation[];
  salesOrders?: NormalisedSalesOrder[];
  fieldMapping?: ScanFieldMappingContext | null;
  clientNames?: Record<string, string>;
  evidenceSource?: ScanEvidenceSource;
  opts?: BuildScanFindingsOpts;
  /**
   * Point in time the checks are evaluated at. Defaults to now. Churn Replay
   * passes a past date so the same checks run against history as it stood then.
   */
  asOfMs?: number;
};

export type BuildScanFindingsOpts = {
  recentMonths?: number;
  minBaselineMonths?: number;
  minTicketsForBaseline?: number;
  volumeShiftRatio?: number;
  responseDriftRatio?: number;
  contactGapRatio?: number;
  dataQualityGapPct?: number;
  resolutionTimeRatio?: number;
  afterHoursMinimumPct?: number;
  afterHoursMinimumDeltaPct?: number;
  backlogGrowthRatio?: number;
  ageingMultiplier?: number;
  ageingMinimumTickets?: number;
  ageingMinimumShare?: number;
  contactConcentrationPct?: number;
  absoluteContactGapDays?: number;
  contractExpiringDays?: number;
  contractUsageRatio?: number;
  minPortfolioUsageClients?: number;
  quoteAcceptanceDropDeltaPct?: number;
  quoteAcceptanceDropRatio?: number;
  quoteStalledMultiplier?: number;
  quoteStalledMinimumDays?: number;
  orderGapMultiplier?: number;
  orderValueDropRatio?: number;
};

const DEFAULT_OPTS: Required<BuildScanFindingsOpts> = {
  recentMonths: 3,
  minBaselineMonths: 3,
  minTicketsForBaseline: 5,
  volumeShiftRatio: 1.5,
  responseDriftRatio: 1.35,
  contactGapRatio: 0.25,
  dataQualityGapPct: 20,
  resolutionTimeRatio: 1.35,
  afterHoursMinimumPct: 50,
  afterHoursMinimumDeltaPct: 40,
  backlogGrowthRatio: 1.5,
  ageingMultiplier: 2,
  ageingMinimumTickets: 5,
  ageingMinimumShare: 0.2,
  contactConcentrationPct: 80,
  absoluteContactGapDays: 60,
  contractExpiringDays: 90,
  contractUsageRatio: 2,
  minPortfolioUsageClients: 5,
  quoteAcceptanceDropDeltaPct: 20,
  quoteAcceptanceDropRatio: 0.7,
  quoteStalledMultiplier: 1.5,
  quoteStalledMinimumDays: 7,
  orderGapMultiplier: 1.5,
  orderValueDropRatio: 0.7,
};

/**
 * Finding types are not comparable by their raw magnitude: a project count,
 * percentage gap, and number of days have different units. These tiers make
 * the ordering explicit when monetary exposure is unavailable.
 */
const FINDING_SEVERITY: Record<FindingType, number> = {
  high_value_unowned: 100,
  contract_expiring: 95,
  quote_value_at_stake: 90,
  order_value_drop: 88,
  unowned_account: 85,
  contact_concentration: 80,
  contract_vs_usage: 78,
  quote_stalled: 76,
  order_gap: 74,
  top_client_service_decline: 72,
  project_overrun: 70,
  backlog_growth: 65,
  ageing_tickets: 64,
  response_drift: 63,
  resolution_time_trend: 62,
  data_quality: 60,
  after_hours_volume: 58,
  volume_shift: 56,
  quote_acceptance_drop: 54,
  contact_gap_absolute: 52,
  contact_gap: 48,
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function roundPct(n: number): number {
  return Math.round(n * 10) / 10;
}

function formatMonthlyValue(value: number): string {
  return `£${value.toLocaleString("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  if (n % 10 === 1) return `${n}st`;
  if (n % 10 === 2) return `${n}nd`;
  if (n % 10 === 3) return `${n}rd`;
  return `${n}th`;
}

function clientNameFor(input: BuildScanFindingsInput, clientId: number): string {
  return input.clientNames?.[String(clientId)] ?? `Client #${clientId}`;
}

function latestTicketActivityByClient(
  tickets: ScanTicketInput[],
): Map<number, string> {
  const latest = new Map<number, { time: number; value: string }>();
  for (const ticket of tickets) {
    if (!Number.isFinite(ticket.clientId) || ticket.clientId <= 0) continue;
    const candidates = [
      ticket.dateEntered,
      ticket.dateResponded,
      ticket.dateClosed,
      ticket.targetDate,
      ticket.slaDueDate,
    ].filter((value): value is string => Boolean(value?.trim()));
    for (const value of candidates) {
      const time = Date.parse(value);
      if (Number.isNaN(time)) continue;
      const current = latest.get(ticket.clientId);
      if (!current || time > current.time) {
        latest.set(ticket.clientId, { time, value });
      }
    }
  }
  return new Map([...latest].map(([clientId, activity]) => [clientId, activity.value]));
}

function normalisedBreach(finding: ScanFinding): number {
  const driver = finding.drivers[0];
  if (!driver) return 0;
  if (driver.baseline !== 0) {
    return Math.abs(driver.value - driver.baseline) / Math.abs(driver.baseline);
  }
  return Math.abs(finding.magnitude);
}

function monthKeysSorted(months: Record<string, number>): string[] {
  return Object.keys(months).sort();
}

function totalTickets(months: Record<string, number>): number {
  return Object.values(months).reduce((s, n) => s + n, 0);
}

function splitRecentBaselineMonths(
  sortedKeys: string[],
  recentCount: number,
): { recent: string[]; baseline: string[] } {
  if (sortedKeys.length <= recentCount) {
    return { recent: sortedKeys, baseline: [] };
  }
  return {
    recent: sortedKeys.slice(-recentCount),
    baseline: sortedKeys.slice(0, -recentCount),
  };
}

function sumMonths(months: Record<string, number>, keys: string[]): number {
  return keys.reduce((s, k) => s + (months[k] ?? 0), 0);
}

function avgPerMonth(total: number, monthCount: number): number {
  if (monthCount <= 0) return 0;
  return total / monthCount;
}

function responseHours(createdIso: string | null, respondedIso: string | null): number | null {
  if (!createdIso || !respondedIso) return null;
  const created = Date.parse(createdIso);
  const responded = Date.parse(respondedIso);
  if (Number.isNaN(created) || Number.isNaN(responded) || responded < created) return null;
  const hours = (responded - created) / 3_600_000;
  if (!Number.isFinite(hours) || hours < 0) return null;
  return hours;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return round1((sorted[mid - 1]! + sorted[mid]!) / 2);
  }
  return sorted[mid]!;
}

function monthKeyFromIso(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function mappingConfidence(
  fieldMapping: ScanFieldMappingContext | null | undefined,
  field: keyof ScanFieldMappingContext,
): FieldMappingConfidence {
  const report = fieldMapping?.[field];
  if (!report || report.totalTickets <= 0) return "high";
  return report.confidence;
}

function mappingFailed(
  fieldMapping: ScanFieldMappingContext | null | undefined,
  field: keyof ScanFieldMappingContext,
): boolean {
  return mappingConfidence(fieldMapping, field) === "failed";
}

function buildContractValueByClient(
  contracts: NormalisedContractRecord[] | undefined,
): Map<number, number> {
  const map = new Map<number, number>();
  if (!contracts) return map;
  for (const c of contracts) {
    if (!c.hasValue || c.monthlyValue == null || c.monthlyValue < 0) continue;
    map.set(c.clientId, (map.get(c.clientId) ?? 0) + c.monthlyValue);
  }
  return map;
}

function buildRecurringValueByClient(
  invoices: NormalisedRecurringInvoiceRecord[] | undefined,
): Map<number, number> {
  const map = new Map<number, number>();
  for (const invoice of invoices ?? []) {
    if (invoice.monthlyValue == null || invoice.monthlyValue < 0) continue;
    map.set(invoice.clientId, (map.get(invoice.clientId) ?? 0) + invoice.monthlyValue);
  }
  return map;
}
function buildContractRecordsByClient(
  contracts: NormalisedContractRecord[] | undefined,
): Map<number, NormalisedContractRecord[]> {
  const map = new Map<number, NormalisedContractRecord[]>();
  for (const contract of contracts ?? []) {
    const records = map.get(contract.clientId) ?? [];
    records.push(contract);
    map.set(contract.clientId, records);
  }
  return map;
}

function daysSince(iso: string | null, nowMs: number): number | null {
  if (!iso) return null;
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, (nowMs - timestamp) / 86_400_000);
}

function daysUntil(iso: string | null, nowMs: number): number | null {
  if (!iso) return null;
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) return null;
  return (timestamp - nowMs) / 86_400_000;
}

function ticketsForClient(tickets: ScanTicketInput[], clientId: number): ScanTicketInput[] {
  return tickets.filter((t) => t.clientId === clientId);
}

function responseMediansForMonths(
  clientTickets: ScanTicketInput[],
  monthKeys: string[],
): number | null {
  const keySet = new Set(monthKeys);
  const hours: number[] = [];
  for (const t of clientTickets) {
    const mk = monthKeyFromIso(t.dateEntered);
    if (!mk || !keySet.has(mk)) continue;
    const h = responseHours(t.dateEntered, t.dateResponded);
    if (h != null) hours.push(h);
  }
  return median(hours);
}

function durationHours(startIso: string | null, endIso: string | null): number | null {
  if (!startIso || !endIso) return null;
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return (end - start) / 3_600_000;
}

function ticketsInMonths(
  tickets: ScanTicketInput[],
  monthKeys: string[],
): ScanTicketInput[] {
  const keySet = new Set(monthKeys);
  return tickets.filter((ticket) => {
    const month = monthKeyFromIso(ticket.dateEntered);
    return month != null && keySet.has(month);
  });
}

function medianResolutionForMonths(
  tickets: ScanTicketInput[],
  monthKeys: string[],
): number | null {
  return median(
    ticketsInMonths(tickets, monthKeys)
      .map((ticket) => durationHours(ticket.dateEntered, ticket.dateClosed))
      .filter((duration): duration is number => duration != null),
  );
}

function isAfterHours(iso: string | null): boolean | null {
  if (!iso) return null;
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) return null;
  const date = new Date(timestamp);
  const day = date.getUTCDay();
  const hour = date.getUTCHours();
  return day === 0 || day === 6 || hour < 8 || hour >= 18;
}

function rate(
  tickets: ScanTicketInput[],
  predicate: (ticket: ScanTicketInput) => boolean | null,
): number | null {
  const measured = tickets
    .map((ticket) => predicate(ticket))
    .filter((value): value is boolean => value != null);
  if (measured.length === 0) return null;
  return (100 * measured.filter(Boolean).length) / measured.length;
}

function measuredCoverage(
  tickets: ScanTicketInput[],
  predicate: (ticket: ScanTicketInput) => boolean,
): number {
  if (tickets.length === 0) return 0;
  return (100 * tickets.filter(predicate).length) / tickets.length;
}

function hasAssignedOwner(owner: string | null | undefined): boolean {
  const value = owner?.trim() ?? "";
  return value.length > 0 && value !== "0";
}

function addFinding(
  findings: ScanFinding[],
  finding: ScanFinding,
): void {
  findings.push({ ...finding, drivers: finding.drivers.slice(0, 3) });
}

function hasSufficientHistory(
  agg: ClientPeriodAggregate,
  opts: Required<BuildScanFindingsOpts>,
): { ok: boolean; reason: string | null } {
  const keys = monthKeysSorted(agg.ticketsByMonth);
  const tickets = totalTickets(agg.ticketsByMonth);
  const { baseline } = splitRecentBaselineMonths(keys, opts.recentMonths);

  if (tickets < opts.minTicketsForBaseline) {
    return {
      ok: false,
      reason: `fewer than ${opts.minTicketsForBaseline} tickets in window`,
    };
  }
  if (baseline.length < opts.minBaselineMonths) {
    return {
      ok: false,
      reason: `fewer than ${opts.minBaselineMonths} baseline months`,
    };
  }
  return { ok: true, reason: null };
}

function pushDriver(
  drivers: FindingDriver[],
  fact: string,
  value: number,
  baseline: number,
  unit: string,
): void {
  if (drivers.length >= 3) return;
  drivers.push({ fact, value: round1(value), baseline: round1(baseline), unit });
}

function validTimestamp(value: string | null): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function medianNumber(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!;
}

function groupedByClient<T extends { clientId: number }>(
  rows: T[] | undefined,
): Map<number, T[]> {
  const grouped = new Map<number, T[]>();
  for (const row of rows ?? []) {
    const clientRows = grouped.get(row.clientId) ?? [];
    clientRows.push(row);
    grouped.set(row.clientId, clientRows);
  }
  return grouped;
}

function ticketEvidence(
  source: ScanEvidenceSource | undefined,
  tickets: ScanTicketInput[],
  clientId: number,
  predicate?: (ticket: ScanTicketInput) => boolean,
  oldestFirst = false,
): ScanEvidenceRef[] {
  if (!source) return [];
  return tickets
    .filter((ticket) => ticket.clientId === clientId && (predicate?.(ticket) ?? true))
    .sort((left, right) => {
      const leftTime = validTimestamp(left.dateEntered) ?? 0;
      const rightTime = validTimestamp(right.dateEntered) ?? 0;
      return oldestFirst ? leftTime - rightTime : rightTime - leftTime;
    })
    .flatMap((ticket) =>
      ticket.ticketId != null
        ? [{ source, kind: "ticket" as const, id: ticket.ticketId }]
        : [],
    );
}

function quotationEvidence(
  source: ScanEvidenceSource | undefined,
  quotations: NormalisedQuotation[] | undefined,
  clientId: number,
  predicate?: (quote: NormalisedQuotation) => boolean,
): ScanEvidenceRef[] {
  if (!source) return [];
  return (quotations ?? [])
    .filter((quote) => quote.clientId === clientId && (predicate?.(quote) ?? true))
    .sort((left, right) => {
      const leftTime = validTimestamp(left.date) ?? 0;
      const rightTime = validTimestamp(right.date) ?? 0;
      return rightTime - leftTime;
    })
    .flatMap((quote) =>
      quote.id != null
        ? [{ source, kind: "quote" as const, id: quote.id }]
        : [],
    );
}

function salesOrderQuotationEvidence(
  source: ScanEvidenceSource | undefined,
  salesOrders: NormalisedSalesOrder[] | undefined,
  clientId: number,
): ScanEvidenceRef[] {
  if (!source) return [];
  return (salesOrders ?? [])
    .filter((order) => order.clientId === clientId)
    .sort((left, right) => {
      const leftTime = validTimestamp(left.date) ?? 0;
      const rightTime = validTimestamp(right.date) ?? 0;
      return rightTime - leftTime;
    })
    .flatMap((order) =>
      order.quotationId != null
        ? [{ source, kind: "quote" as const, id: order.quotationId }]
        : [],
    );
}

function projectEvidence(
  source: ScanEvidenceSource | undefined,
  input: BuildScanFindingsInput,
  clientId: number,
): ScanEvidenceRef[] {
  if (!source) return [];
  const aggregateIds = input.byClient[clientId]?.overrunProjectIds ?? [];
  const projectIds =
    aggregateIds.length > 0
      ? aggregateIds
      : (input.projects ?? [])
          .filter(
            (project) =>
              project.clientId === clientId &&
              project.projectId != null &&
              (daysToTargetDate(project.targetDate) ?? 0) < 0,
          )
          .map((project) => project.projectId!);
  return projectIds.map((id) => ({ source, kind: "project" as const, id }));
}

function evidenceForFinding(
  finding: ScanFinding,
  input: BuildScanFindingsInput,
  nowMs: number,
): ScanEvidenceRef[] {
  switch (finding.type) {
    case "project_overrun":
      return projectEvidence(input.evidenceSource, input, finding.clientId);
    case "quote_acceptance_drop":
      return quotationEvidence(input.evidenceSource, input.quotations, finding.clientId);
    case "quote_value_at_stake":
      return quotationEvidence(
        input.evidenceSource,
        input.quotations,
        finding.clientId,
        (quote) => {
          const expiry = validTimestamp(quote.expiryDate);
          return expiry != null && expiry < nowMs && !quote.approved;
        },
      );
    case "quote_stalled":
      return quotationEvidence(
        input.evidenceSource,
        input.quotations,
        finding.clientId,
        (quote) => !quote.approved,
      );
    case "order_gap":
    case "order_value_drop":
      return salesOrderQuotationEvidence(
        input.evidenceSource,
        input.salesOrders,
        finding.clientId,
      );
    case "ageing_tickets":
      return ticketEvidence(
        input.evidenceSource,
        input.tickets,
        finding.clientId,
        (ticket) => ticket.statusOpen === true,
        true,
      );
    case "unowned_account":
    case "high_value_unowned":
      return ticketEvidence(
        input.evidenceSource,
        input.tickets,
        finding.clientId,
        (ticket) => !hasAssignedOwner(ticket.owner),
      );
    default:
      return ticketEvidence(input.evidenceSource, input.tickets, finding.clientId);
  }
}

function addCommercialFindings(
  input: BuildScanFindingsInput,
  findings: ScanFinding[],
  monthlyValueByClient: Map<number, number>,
  opts: Required<BuildScanFindingsOpts>,
  nowMs: number,
): void {
  const quotesByClient = groupedByClient(input.quotations);
  for (const [clientId, clientQuotes] of quotesByClient) {
    const datedQuotes = clientQuotes
      .map((quote) => ({ quote, timestamp: validTimestamp(quote.date) }))
      .filter((entry): entry is { quote: NormalisedQuotation; timestamp: number } =>
        entry.timestamp != null,
      )
      .sort((left, right) => left.timestamp - right.timestamp);
    if (datedQuotes.length === 0) continue;

    const latestQuoteTimestamp = datedQuotes[datedQuotes.length - 1]!.timestamp;
    const recentCutoff =
      latestQuoteTimestamp - opts.recentMonths * (365.2425 / 12) * 86_400_000;
    const recentQuotes = datedQuotes.filter((entry) => entry.timestamp > recentCutoff);
    const baselineQuotes = datedQuotes.filter((entry) => entry.timestamp <= recentCutoff);
    const acceptedRate = (rows: typeof datedQuotes): number | null => {
      if (rows.length === 0) return null;
      return (100 * rows.filter(({ quote }) => quote.approved).length) / rows.length;
    };
    const recentAcceptance = acceptedRate(recentQuotes);
    const baselineAcceptance = acceptedRate(baselineQuotes);
    if (
      recentAcceptance != null &&
      baselineAcceptance != null &&
      baselineQuotes.length >= 3 &&
      recentQuotes.length >= 2 &&
      recentAcceptance <= baselineAcceptance - opts.quoteAcceptanceDropDeltaPct &&
      recentAcceptance < baselineAcceptance * opts.quoteAcceptanceDropRatio
    ) {
      addFinding(findings, {
        clientId,
        type: "quote_acceptance_drop",
        drivers: [{
          fact: `${clientNameFor(input, clientId)} accepted ${roundPct(recentAcceptance)}% of its ${recentQuotes.length} recent quotes versus ${roundPct(baselineAcceptance)}% across ${baselineQuotes.length} earlier quotes.`,
          value: recentAcceptance,
          baseline: baselineAcceptance,
          unit: "quote_acceptance_pct",
        }],
        monthlyValue: monthlyValueByClient.get(clientId) ?? null,
        confidence: "high",
        magnitude: (baselineAcceptance - recentAcceptance) / 100,
      });
    }

    const overdueUnapproved = clientQuotes.filter((quote) => {
      const expiry = validTimestamp(quote.expiryDate);
      return expiry != null && expiry < nowMs && !quote.approved;
    });
    if (
      overdueUnapproved.length > 0 &&
      overdueUnapproved.every((quote) => quote.revenue != null) &&
      overdueUnapproved.reduce((sum, quote) => sum + (quote.revenue ?? 0), 0) > 0
    ) {
      const valueAtStake = overdueUnapproved.reduce(
        (sum, quote) => sum + (quote.revenue ?? 0),
        0,
      );
      addFinding(findings, {
        clientId,
        type: "quote_value_at_stake",
        drivers: [{
          fact: `${overdueUnapproved.length} unapproved quotes are past their expiry date, with a combined quoted value of ${formatMonthlyValue(valueAtStake)}.`,
          value: valueAtStake,
          baseline: 0,
          unit: "quoted_value",
        }],
        monthlyValue: monthlyValueByClient.get(clientId) ?? null,
        confidence: "high",
        magnitude: valueAtStake,
      });
    }

    const decisionDays = datedQuotes
      .filter(({ quote }) => quote.approved && quote.approvalDateTime != null)
      .map(({ quote, timestamp }) => {
        const approvedAt = validTimestamp(quote.approvalDateTime);
        return approvedAt != null ? (approvedAt - timestamp) / 86_400_000 : null;
      })
      .filter((days): days is number => days != null && days >= 0);
    const usualDecisionDays = medianNumber(decisionDays);
    if (usualDecisionDays != null && decisionDays.length >= 2) {
      const threshold = Math.max(
        opts.quoteStalledMinimumDays,
        usualDecisionDays * opts.quoteStalledMultiplier,
      );
      const stalled = datedQuotes.filter(({ quote, timestamp }) => {
        if (quote.approved) return false;
        const ageDays = (nowMs - timestamp) / 86_400_000;
        return ageDays >= threshold;
      });
      if (stalled.length > 0) {
        const oldestDays = Math.max(
          ...stalled.map(({ timestamp }) => (nowMs - timestamp) / 86_400_000),
        );
        addFinding(findings, {
          clientId,
          type: "quote_stalled",
          drivers: [{
            fact: `${stalled.length} sent, unapproved quote${stalled.length === 1 ? "" : "s"} have been open for up to ${round1(oldestDays)} days versus a usual decision window of ${round1(usualDecisionDays)} days.`,
            value: oldestDays,
            baseline: threshold,
            unit: "days_since_quote",
          }],
          monthlyValue: monthlyValueByClient.get(clientId) ?? null,
          confidence: "high",
          magnitude: oldestDays / threshold,
        });
      }
    }
  }

  const ordersByClient = groupedByClient(input.salesOrders);
  for (const [clientId, clientOrders] of ordersByClient) {
    const datedOrders = clientOrders
      .map((order) => ({ order, timestamp: validTimestamp(order.date) }))
      .filter((entry): entry is { order: NormalisedSalesOrder; timestamp: number } =>
        entry.timestamp != null,
      )
      .sort((left, right) => left.timestamp - right.timestamp);
    if (datedOrders.length === 0) continue;
    const intervals = datedOrders.slice(1).map(
      (entry, index) => (entry.timestamp - datedOrders[index]!.timestamp) / 86_400_000,
    ).filter((days) => days > 0);
    const usualInterval = medianNumber(intervals);
    if (usualInterval != null && intervals.length >= 2) {
      const latestAgeDays =
        (nowMs - datedOrders[datedOrders.length - 1]!.timestamp) / 86_400_000;
      const threshold = usualInterval * opts.orderGapMultiplier;
      if (latestAgeDays > threshold) {
        addFinding(findings, {
          clientId,
          type: "order_gap",
          drivers: [{
            fact: `${clientNameFor(input, clientId)} has gone ${round1(latestAgeDays)} days since its last order versus a typical purchasing interval of ${round1(usualInterval)} days.`,
            value: latestAgeDays,
            baseline: usualInterval,
            unit: "days_since_order",
          }],
          monthlyValue: monthlyValueByClient.get(clientId) ?? null,
          confidence: "high",
          magnitude: latestAgeDays / threshold,
        });
      }
    }

    const twelveMonthsAgo = nowMs - 365.2425 * 86_400_000;
    const recentStart = nowMs - opts.recentMonths * (365.2425 / 12) * 86_400_000;
    const inWindow = datedOrders.filter(({ timestamp }) => timestamp >= twelveMonthsAgo);
    const recentOrders = inWindow.filter(({ timestamp }) => timestamp >= recentStart);
    const baselineOrders = inWindow.filter(({ timestamp }) => timestamp < recentStart);
    const knownValues = inWindow.every(({ order }) => order.revenue != null);
    if (knownValues && recentOrders.length > 0 && baselineOrders.length >= 2) {
      const recentMonthlyValue =
        recentOrders.reduce((sum, { order }) => sum + (order.revenue ?? 0), 0) /
        opts.recentMonths;
      const baselineMonthlyValue =
        baselineOrders.reduce((sum, { order }) => sum + (order.revenue ?? 0), 0) /
        (12 - opts.recentMonths);
      if (
        baselineMonthlyValue > 0 &&
        recentMonthlyValue < baselineMonthlyValue * opts.orderValueDropRatio
      ) {
        addFinding(findings, {
          clientId,
          type: "order_value_drop",
          drivers: [{
            fact: `${clientNameFor(input, clientId)} generated ${formatMonthlyValue(recentMonthlyValue)} per month from recent orders versus ${formatMonthlyValue(baselineMonthlyValue)} per month across the earlier part of its 12-month order history.`,
            value: recentMonthlyValue,
            baseline: baselineMonthlyValue,
            unit: "order_revenue_per_month",
          }],
          monthlyValue: monthlyValueByClient.get(clientId) ?? null,
          confidence: "high",
          magnitude: 1 - recentMonthlyValue / baselineMonthlyValue,
        });
      }
    }
  }
}

/**
 * Build ranked scan findings from per-client aggregates and optional contracts.
 */
export function buildScanFindings(input: BuildScanFindingsInput): ScanFindingsResult {
  const opts = { ...DEFAULT_OPTS, ...input.opts };
  const contractByClient = input.recurringInvoices
    ? buildRecurringValueByClient(input.recurringInvoices)
    : buildContractValueByClient(input.contracts);
  const contractsByClient = buildContractRecordsByClient(input.contracts);
  const findings: ScanFinding[] = [];
  const insufficientData: InsufficientDataClient[] = [];
  const nowMs = input.asOfMs ?? Date.now();
  const activeContractClientIds = new Set(contractsByClient.keys());
  const clientIds = new Set<number>([
    ...Object.keys(input.byClient).map(Number),
    ...input.tickets.map((t) => t.clientId),
    ...activeContractClientIds,
    ...(input.quotations ?? []).map((quote) => quote.clientId),
    ...(input.salesOrders ?? []).map((order) => order.clientId),
  ]);

  const dateEnteredFailed = mappingFailed(input.fieldMapping, "dateEntered");
  const dateRespondedFailed = mappingFailed(input.fieldMapping, "dateResponded");
  const dateClosedFailed = mappingFailed(input.fieldMapping, "dateClosed");
  const statusOpenCoveragePct = measuredCoverage(
    input.tickets,
    (ticket) => ticket.statusOpen != null,
  );
  const statusOpenAvailable =
    !mappingFailed(input.fieldMapping, "statusOpen") && statusOpenCoveragePct >= 70;
  const activeContractsWithoutActivity = !dateEnteredFailed
    ? (input.contracts ?? []).filter(
        (contract) => ticketsForClient(input.tickets, contract.clientId).length === 0,
      ).length
    : null;
  const expiringContracts = (input.contracts ?? []).filter((contract) => {
    const days = daysUntil(contract.endDate, nowMs);
    return days != null && days >= 0 && days <= opts.contractExpiringDays;
  });
  const expiringContractValue =
    expiringContracts.length > 0 &&
    expiringContracts.every((contract) => contractByClient.has(contract.clientId))
      ? round1(
          [...new Set(expiringContracts.map((contract) => contract.clientId))].reduce(
            (sum, clientId) => sum + (contractByClient.get(clientId) ?? 0),
            0,
          ),
        )
      : null;

  const portfolioUsageRatios = [...clientIds]
    .map((clientId) => {
      const aggregate = input.byClient[clientId];
      const monthlyValue = contractByClient.get(clientId);
      if (!aggregate || monthlyValue == null || monthlyValue <= 0) return null;
      const months = monthKeysSorted(aggregate.ticketsByMonth);
      const history = hasSufficientHistory(aggregate, opts);
      if (!history.ok || months.length === 0) return null;
      return avgPerMonth(totalTickets(aggregate.ticketsByMonth), months.length) / monthlyValue;
    })
    .filter((value): value is number => value != null && Number.isFinite(value) && value > 0);
  const portfolioUsageRatio =
    portfolioUsageRatios.length >= opts.minPortfolioUsageClients
      ? median(portfolioUsageRatios)
      : null;

  for (const clientId of clientIds) {
    if (!Number.isFinite(clientId) || clientId <= 0) continue;
    const agg = input.byClient[clientId];
    const clientTickets = ticketsForClient(input.tickets, clientId);
    const monthlyValue = contractByClient.get(clientId) ?? null;
    const clientContracts = contractsByClient.get(clientId) ?? [];

    if (!dateEnteredFailed && clientContracts.length > 0) {
      const activityDates = clientTickets
        .map((ticket) => ticket.dateEntered)
        .filter((date): date is string => date != null && !Number.isNaN(Date.parse(date)));
      const hasUnparseableActivityDate = clientTickets.some(
        (ticket) => ticket.dateEntered == null || Number.isNaN(Date.parse(ticket.dateEntered)),
      );
      const latestActivity = activityDates
        .map((date) => Date.parse(date))
        .reduce((latest, timestamp) => Math.max(latest, timestamp), 0);
      // At least one dated ticket in the scan window is required. An active
      // contract with no in-window history is not evidence that activity
      // stopped; it is an empty data slice and must not become a gap finding.
      const age =
        latestActivity > 0
          ? daysSince(new Date(latestActivity).toISOString(), nowMs)
          : null;
      if (!hasUnparseableActivityDate && age != null && age >= opts.absoluteContactGapDays) {
        const drivers: FindingDriver[] = [];
        pushDriver(
          drivers,
          `No ticket activity for at least ${round1(age)} days against an active contract and a ${opts.absoluteContactGapDays}-day activity threshold`,
          age,
          opts.absoluteContactGapDays,
          "days_since_ticket_activity",
        );
        addFinding(findings, {
          clientId,
          type: "contact_gap_absolute",
          drivers,
          monthlyValue,
          confidence: mappingConfidence(input.fieldMapping, "dateEntered"),
          magnitude: age / opts.absoluteContactGapDays,
        });
      }

      const expiringContracts = clientContracts
        .map((contract) => ({ contract, days: daysUntil(contract.endDate, nowMs) }))
        .filter(
          (entry): entry is { contract: NormalisedContractRecord; days: number } =>
            entry.days != null && entry.days >= 0 && entry.days <= opts.contractExpiringDays,
        );
      if (expiringContracts.length > 0) {
        const expiringClientIds = [
          ...new Set(expiringContracts.map((entry) => entry.contract.clientId)),
        ];
        const expiringValue = expiringClientIds.reduce(
          (sum, clientId) => sum + (contractByClient.get(clientId) ?? 0),
          0,
        );
        const allValuesKnown = expiringContracts.every(
          ({ contract }) => contractByClient.has(contract.clientId),
        );
        const nearestDays = Math.min(...expiringContracts.map((entry) => entry.days));
        const drivers: FindingDriver[] = [];
        pushDriver(
          drivers,
          `${expiringContracts.length} active contract${expiringContracts.length === 1 ? "" : "s"} end within ${opts.contractExpiringDays} days; nearest end date is in ${round1(nearestDays)} days`,
          nearestDays,
          opts.contractExpiringDays,
          "days_until_contract_end",
        );
        if (allValuesKnown && expiringValue > 0) {
          pushDriver(
            drivers,
            `${formatMonthlyValue(expiringValue)} combined monthly recurring value across those expiring contracts`,
            expiringValue,
            0,
            "monthly_contract_value",
          );
        }
        addFinding(findings, {
          clientId,
          type: "contract_expiring",
          drivers,
          monthlyValue: allValuesKnown && expiringValue > 0 ? expiringValue : null,
          confidence: "high",
          magnitude: (opts.contractExpiringDays - nearestDays) / opts.contractExpiringDays,
        });
      }
    }

    if (!agg) {
      if (clientContracts.length > 0) {
        insufficientData.push({
          clientId,
          reason: "no_ticket_activity_in_scan_period",
          ticketCount: 0,
          monthsWithTickets: 0,
        });
      }
      continue;
    }

    const ticketCount = totalTickets(agg.ticketsByMonth);
    const monthsWithTickets = monthKeysSorted(agg.ticketsByMonth).length;
    const history = hasSufficientHistory(agg, opts);

    if (!history.ok) {
      insufficientData.push({
        clientId,
        reason: history.reason ?? "insufficient_history",
        ticketCount,
        monthsWithTickets,
      });
      continue;
    }

    const sortedMonths = monthKeysSorted(agg.ticketsByMonth);
    const { recent, baseline } = splitRecentBaselineMonths(sortedMonths, opts.recentMonths);
    const recentTotal = sumMonths(agg.ticketsByMonth, recent);
    const baselineTotal = sumMonths(agg.ticketsByMonth, baseline);
    const recentPerMonth = avgPerMonth(recentTotal, recent.length);
    const baselinePerMonth = avgPerMonth(baselineTotal, baseline.length);

    if (
      !dateEnteredFailed &&
      portfolioUsageRatio != null &&
      monthlyValue != null &&
      monthlyValue > 0 &&
      sortedMonths.length >= opts.minBaselineMonths
    ) {
      const observedPerMonth = avgPerMonth(ticketCount, sortedMonths.length);
      const expectedPerMonth = portfolioUsageRatio * monthlyValue;
      if (
        expectedPerMonth > 0 &&
        (observedPerMonth >= expectedPerMonth * opts.contractUsageRatio ||
          observedPerMonth <= expectedPerMonth / opts.contractUsageRatio)
      ) {
        const drivers: FindingDriver[] = [];
        pushDriver(
          drivers,
          `${round1(observedPerMonth)} tickets per month against an expected ${round1(expectedPerMonth)} based on the portfolio median of ${round1(portfolioUsageRatio)} tickets per month per £1 of monthly contract value`,
          observedPerMonth,
          expectedPerMonth,
          "tickets_per_month",
        );
        addFinding(findings, {
          clientId,
          type: "contract_vs_usage",
          drivers,
          monthlyValue,
          confidence: mappingConfidence(input.fieldMapping, "dateEntered"),
          magnitude: Math.abs(observedPerMonth - expectedPerMonth) / expectedPerMonth,
        });
      }
    }

    if (statusOpenAvailable && !dateEnteredFailed) {
      const recentTickets = ticketsInMonths(clientTickets, recent);
      const baselineTickets = ticketsInMonths(clientTickets, baseline);
      const recentOpenCount = ticketsInMonths(clientTickets, recent).filter(
        (ticket) => ticket.statusOpen === true,
      ).length;
      const baselineOpenCount = ticketsInMonths(clientTickets, baseline).filter(
        (ticket) => ticket.statusOpen === true,
      ).length;
      const recentOpenPerMonth = avgPerMonth(recentOpenCount, recent.length);
      const baselineOpenPerMonth = avgPerMonth(baselineOpenCount, baseline.length);
      if (
        baselineOpenPerMonth > 0 &&
        recentOpenPerMonth >= baselineOpenPerMonth * opts.backlogGrowthRatio &&
        measuredCoverage(recentTickets, (ticket) => ticket.statusOpen != null) >= 70 &&
        measuredCoverage(baselineTickets, (ticket) => ticket.statusOpen != null) >= 70
      ) {
        const drivers: FindingDriver[] = [];
        pushDriver(
          drivers,
          `${round1(recentOpenPerMonth)} currently open tickets entered per month in the last ${recent.length} months against ${round1(baselineOpenPerMonth)} per month across the ${baseline.length}-month baseline`,
          recentOpenPerMonth,
          baselineOpenPerMonth,
          "open_tickets_per_month",
        );
        addFinding(findings, {
          clientId,
          type: "backlog_growth",
          drivers,
          monthlyValue,
          confidence: mappingConfidence(input.fieldMapping, "statusOpen"),
          magnitude: (recentOpenPerMonth - baselineOpenPerMonth) / baselineOpenPerMonth,
        });
      }
    }

    if (statusOpenAvailable && !dateClosedFailed) {
      const baselineResolution = medianResolutionForMonths(clientTickets, baseline);
      const now = nowMs;
      const recentTickets = ticketsInMonths(clientTickets, recent);
      const baselineTickets = ticketsInMonths(clientTickets, baseline);
      const ageing = clientTickets.filter((ticket) => {
        if (ticket.statusOpen !== true || !ticket.dateEntered) return false;
        const entered = Date.parse(ticket.dateEntered);
        return !Number.isNaN(entered) && now - entered > (baselineResolution ?? 0) * 3_600_000 * opts.ageingMultiplier;
      });
      if (
        baselineResolution != null &&
        measuredCoverage(recentTickets, (ticket) => ticket.statusOpen != null) >= 70 &&
        measuredCoverage(baselineTickets, (ticket) => ticket.statusOpen != null) >= 70 &&
        measuredCoverage(ticketsInMonths(clientTickets, baseline), (ticket) => ticket.dateClosed != null) >= 70 &&
        ageing.length >
          Math.max(
            opts.ageingMinimumTickets,
            Math.ceil(clientTickets.length * opts.ageingMinimumShare),
          )
      ) {
        const drivers: FindingDriver[] = [];
        pushDriver(
          drivers,
          `${ageing.length} open ticket${ageing.length === 1 ? "" : "s"} older than ${round1(baselineResolution * opts.ageingMultiplier)}h against a ${round1(baselineResolution)}h median close time across the ${baseline.length}-month baseline`,
          ageing.length,
          baselineResolution,
          "ageing_tickets",
        );
        addFinding(findings, {
          clientId,
          type: "ageing_tickets",
          drivers,
          monthlyValue,
          confidence: mappingConfidence(input.fieldMapping, "statusOpen"),
          magnitude: ageing.length,
        });
      }
    }

    if (!mappingFailed(input.fieldMapping, "assignedOwner") && clientTickets.length > 0) {
      const unowned = clientTickets.filter((ticket) => !hasAssignedOwner(ticket.owner)).length;
      if (unowned === clientTickets.length) {
        const drivers: FindingDriver[] = [];
        pushDriver(
          drivers,
          `0 of ${clientTickets.length} tickets have an assigned owner in the scan window against full owner coverage`,
          0,
          clientTickets.length,
          "tickets_with_owner",
        );
        addFinding(findings, {
          clientId,
          type: "unowned_account",
          drivers,
          monthlyValue,
          confidence: mappingConfidence(input.fieldMapping, "assignedOwner"),
          magnitude: 1,
        });
      }
    }

    if (!mappingFailed(input.fieldMapping, "requester")) {
      const identifiedRequesters = clientTickets.filter((ticket) => ticket.requester?.trim());
      const byRequester = new Map<string, number>();
      for (const ticket of identifiedRequesters) {
        const requester = ticket.requester!.trim().toLowerCase();
        byRequester.set(requester, (byRequester.get(requester) ?? 0) + 1);
      }
      const largestGroup = Math.max(0, ...byRequester.values());
      const requesterCoverage = clientTickets.length > 0
        ? (100 * identifiedRequesters.length) / clientTickets.length
        : 0;
      const concentration = identifiedRequesters.length > 0
        ? (100 * largestGroup) / identifiedRequesters.length
        : 0;
      if (
        identifiedRequesters.length >= opts.minTicketsForBaseline &&
        requesterCoverage >= 70 &&
        concentration >= opts.contactConcentrationPct
      ) {
        const drivers: FindingDriver[] = [];
        pushDriver(
          drivers,
          `${roundPct(concentration)}% of identified tickets came from one contact against an even-distribution baseline`,
          concentration,
          100 / identifiedRequesters.length,
          "dominant_requester_percent",
        );
        addFinding(findings, {
          clientId,
          type: "contact_concentration",
          drivers,
          monthlyValue,
          confidence: mappingConfidence(input.fieldMapping, "requester"),
          magnitude: concentration / 100,
        });
      }
    }

    if (!dateEnteredFailed && !dateClosedFailed) {
      const recentMedian = medianResolutionForMonths(clientTickets, recent);
      const baselineMedian = medianResolutionForMonths(clientTickets, baseline);
      if (
        recentMedian != null &&
        baselineMedian != null &&
        baselineMedian > 0 &&
        measuredCoverage(ticketsInMonths(clientTickets, recent), (ticket) => ticket.dateClosed != null) >= 70 &&
        measuredCoverage(ticketsInMonths(clientTickets, baseline), (ticket) => ticket.dateClosed != null) >= 70 &&
        recentMedian >= baselineMedian * opts.resolutionTimeRatio
      ) {
        const drivers: FindingDriver[] = [];
        pushDriver(
          drivers,
          `${round1(recentMedian)}h median resolution time in the last ${recent.length} months against ${round1(baselineMedian)}h across the ${baseline.length}-month baseline`,
          recentMedian,
          baselineMedian,
          "resolution_time_hours",
        );
        addFinding(findings, {
          clientId,
          type: "resolution_time_trend",
          drivers,
          monthlyValue,
          confidence: mappingConfidence(input.fieldMapping, "dateClosed"),
          magnitude: (recentMedian - baselineMedian) / baselineMedian,
        });
      }
    }

    if (!dateEnteredFailed) {
      const recentAfterHours = rate(ticketsInMonths(clientTickets, recent), (ticket) => isAfterHours(ticket.dateEntered));
      const baselineAfterHours = rate(ticketsInMonths(clientTickets, baseline), (ticket) => isAfterHours(ticket.dateEntered));
      if (
        recentAfterHours != null &&
        baselineAfterHours != null &&
        baselineAfterHours > 0 &&
        recentAfterHours >= opts.afterHoursMinimumPct &&
        recentAfterHours - baselineAfterHours >= opts.afterHoursMinimumDeltaPct
      ) {
        const drivers: FindingDriver[] = [];
        pushDriver(
          drivers,
          `${roundPct(recentAfterHours)}% of tickets arrived outside 08:00–18:00 UTC on weekdays in the last ${recent.length} months against ${roundPct(baselineAfterHours)}% across the ${baseline.length}-month baseline`,
          recentAfterHours,
          baselineAfterHours,
          "after_hours_ticket_percent",
        );
        addFinding(findings, {
          clientId,
          type: "after_hours_volume",
          drivers,
          monthlyValue,
          confidence: mappingConfidence(input.fieldMapping, "dateEntered"),
          magnitude: (recentAfterHours - baselineAfterHours) / baselineAfterHours,
        });
      }
    }

    if (!dateEnteredFailed && baselinePerMonth > 0) {
      const volumeRatio = recentPerMonth / baselinePerMonth;

      if (volumeRatio >= opts.volumeShiftRatio || volumeRatio <= 1 / opts.volumeShiftRatio) {
        const drivers: FindingDriver[] = [];
        pushDriver(
          drivers,
          `${round1(recentTotal)} tickets in the last ${recent.length} month${recent.length === 1 ? "" : "s"} against their 12-month baseline of ${round1(baselinePerMonth)} per month (${round1(baselineTotal)} over ${baseline.length} prior months)`,
          recentPerMonth,
          baselinePerMonth,
          "tickets_per_month",
        );
        findings.push({
          clientId,
          type: "volume_shift",
          drivers,
          monthlyValue,
          confidence: mappingConfidence(input.fieldMapping, "dateEntered"),
          magnitude: Math.abs(recentPerMonth - baselinePerMonth) / baselinePerMonth,
        });
      }

      if (
        recentPerMonth <= baselinePerMonth * opts.contactGapRatio &&
        baselinePerMonth >= 2
      ) {
        const drivers: FindingDriver[] = [];
        pushDriver(
          drivers,
          `${round1(recentPerMonth)} tickets per month in the last ${recent.length} month${recent.length === 1 ? "" : "s"} against their 12-month baseline of ${round1(baselinePerMonth)} per month`,
          recentPerMonth,
          baselinePerMonth,
          "tickets_per_month",
        );
        findings.push({
          clientId,
          type: "contact_gap",
          drivers,
          monthlyValue,
          confidence: mappingConfidence(input.fieldMapping, "dateEntered"),
          magnitude: baselinePerMonth - recentPerMonth,
        });
      }
    }

    if (
      !dateRespondedFailed &&
      !agg.medianResponseSuppressed &&
      !agg.responseCoverageSuppressed &&
      agg.medianResponseHours != null
    ) {
      const recentMedian = responseMediansForMonths(clientTickets, recent);
      const baselineMedian = responseMediansForMonths(clientTickets, baseline);

      if (
        recentMedian != null &&
        baselineMedian != null &&
        baselineMedian > 0 &&
        (recentMedian >= baselineMedian * opts.responseDriftRatio ||
          recentMedian <= baselineMedian / opts.responseDriftRatio)
      ) {
        const drivers: FindingDriver[] = [];
        pushDriver(
          drivers,
          `${recentMedian}h median response in the last ${recent.length} month${recent.length === 1 ? "" : "s"} against their 12-month baseline of ${baselineMedian}h`,
          recentMedian,
          baselineMedian,
          "hours",
        );
        findings.push({
          clientId,
          type: "response_drift",
          drivers,
          monthlyValue,
          confidence: mappingConfidence(input.fieldMapping, "dateResponded"),
          magnitude: Math.abs(recentMedian - baselineMedian) / baselineMedian,
        });
      }
    }

    if (agg.projectOverrunCount > 0 && !mappingFailed(input.fieldMapping, "targetDate")) {
      const drivers: FindingDriver[] = [];
      pushDriver(
        drivers,
        `${agg.projectOverrunCount} project${agg.projectOverrunCount === 1 ? "" : "s"} past target date in the scan window`,
        agg.projectOverrunCount,
        0,
        "projects",
      );
      findings.push({
        clientId,
        type: "project_overrun",
        drivers,
        monthlyValue,
        confidence: mappingConfidence(input.fieldMapping, "targetDate"),
        magnitude: agg.projectOverrunCount,
      });
    }

    if (!dateClosedFailed && !agg.closeCoverageSuppressed && agg.closeCoveragePct != null) {
      const gapPct = roundPct(100 - agg.closeCoveragePct);
      if (gapPct >= opts.dataQualityGapPct) {
        const withClose = Math.round((ticketCount * agg.closeCoveragePct) / 100);
        const withoutClose = ticketCount - withClose;
        const drivers: FindingDriver[] = [];
        pushDriver(
          drivers,
          `${gapPct}% of tickets (${withoutClose} of ${ticketCount}) close without a resolution timestamp against full close coverage baseline of 100%`,
          gapPct,
          0,
          "percent_without_close_timestamp",
        );
        findings.push({
          clientId,
          type: "data_quality",
          drivers,
          monthlyValue,
          confidence: mappingConfidence(input.fieldMapping, "dateClosed"),
          magnitude: gapPct,
        });
      }
    }

    if (
      !dateRespondedFailed &&
      !agg.responseCoverageSuppressed &&
      agg.responseCoveragePct != null
    ) {
      const gapPct = roundPct(100 - agg.responseCoveragePct);
      if (gapPct >= opts.dataQualityGapPct) {
        const withResponse = Math.round((ticketCount * agg.responseCoveragePct) / 100);
        const withoutResponse = ticketCount - withResponse;
        const drivers: FindingDriver[] = [];
        pushDriver(
          drivers,
          `${gapPct}% of tickets (${withoutResponse} of ${ticketCount}) lack a response timestamp against full response coverage baseline of 100%`,
          gapPct,
          0,
          "percent_without_response_timestamp",
        );
        const existing = findings.find(
          (f) => f.clientId === clientId && f.type === "data_quality",
        );
        if (existing) {
          pushDriver(
            existing.drivers,
            drivers[0]!.fact,
            drivers[0]!.value,
            drivers[0]!.baseline,
            drivers[0]!.unit,
          );
        } else {
          findings.push({
            clientId,
            type: "data_quality",
            drivers,
            monthlyValue,
            confidence: mappingConfidence(input.fieldMapping, "dateResponded"),
            magnitude: gapPct,
          });
        }
      }
    }
  }

  addCommercialFindings(input, findings, contractByClient, opts, nowMs);

  const rankedValueClients = [...contractByClient.entries()]
    .filter(([, monthlyValue]) => monthlyValue > 0)
    .sort(([leftId, left], [rightId, right]) => right - left || leftId - rightId);
  const valueRankByClient = new Map(
    rankedValueClients.map(([clientId], index) => [clientId, index + 1]),
  );
  const topQuartileCount = Math.max(1, Math.ceil(rankedValueClients.length * 0.25));
  const topQuartileByValue = new Set(
    rankedValueClients.slice(0, topQuartileCount).map(([clientId]) => clientId),
  );

  for (const clientId of topQuartileByValue) {
    const serviceFindings = findings.filter(
      (finding) =>
        finding.clientId === clientId &&
        (finding.type === "resolution_time_trend" ||
          (finding.type === "response_drift" &&
            finding.drivers[0] != null &&
            finding.drivers[0].value > finding.drivers[0].baseline)),
    );
    if (serviceFindings.length === 0) continue;
    const monthlyValue = contractByClient.get(clientId)!;
    const rank = valueRankByClient.get(clientId)!;
    const name = clientNameFor(input, clientId);
    const drivers = serviceFindings.flatMap((finding) => {
      const source = finding.drivers[0];
      if (!source) return [];
      const measure = finding.type === "response_drift" ? "first response" : "resolution time";
      return [{
        ...source,
        fact: `${name}, your ${ordinal(rank)} largest account at ${formatMonthlyValue(monthlyValue)} a month, has seen median ${measure} move from ${source.baseline}h to ${source.value}h against its own baseline.`,
      }];
    });
    if (drivers.length > 0) {
      findings.push({
        clientId,
        type: "top_client_service_decline",
        drivers,
        monthlyValue,
        confidence: serviceFindings.every((finding) => finding.confidence === "high")
          ? "high"
          : "degraded",
        magnitude: Math.max(...serviceFindings.map((finding) => finding.magnitude)),
      });
    }
  }

  for (const clientId of topQuartileByValue) {
    const unownedFinding = findings.find(
      (finding) => finding.clientId === clientId && finding.type === "unowned_account",
    );
    if (!unownedFinding) continue;
    const monthlyValue = contractByClient.get(clientId)!;
    const rank = valueRankByClient.get(clientId)!;
    const source = unownedFinding.drivers[0];
    if (!source) continue;
    findings.push({
      clientId,
      type: "high_value_unowned",
      drivers: [{
        ...source,
        fact: `${clientNameFor(input, clientId)}, your ${ordinal(rank)} largest account at ${formatMonthlyValue(monthlyValue)} a month, has ${source.value} of ${source.baseline} tickets with an assigned owner.`,
      }],
      monthlyValue,
      confidence: unownedFinding.confidence,
      magnitude: unownedFinding.magnitude,
    });
  }

  const clientsWithContactGap = new Set(
    findings
      .filter((finding) => finding.type === "contact_gap")
      .map((finding) => finding.clientId),
  );
  const dedupedFindings = findings.filter((finding) => {
    if (finding.type !== "volume_shift" || !clientsWithContactGap.has(finding.clientId)) {
      return true;
    }
    const driver = finding.drivers[0];
    return !(
      driver?.unit === "tickets_per_month" &&
      driver.value < driver.baseline
    );
  });

  const evidenceByFindingKey = new Map<string, ScanEvidenceRef[]>();
  const findingsWithEvidence = dedupedFindings.map((finding) => {
    const inheritedEvidence =
      finding.type === "top_client_service_decline"
        ? (["resolution_time_trend", "response_drift"] as const).flatMap((type) =>
            evidenceByFindingKey.get(`${finding.clientId}:${type}`) ?? [],
          )
        : [];
    const evidenceIds = capScanEvidence(
      inheritedEvidence.length > 0
        ? inheritedEvidence
        : evidenceForFinding(finding, input, nowMs),
    );
    const withEvidence = {
      ...finding,
      drivers: finding.drivers.slice(0, 3),
      evidenceIds,
    };
    evidenceByFindingKey.set(`${finding.clientId}:${finding.type}`, evidenceIds);
    return withEvidence;
  });

  const latestActivityByClient = latestTicketActivityByClient(input.tickets);
  const rankedFindings = findingsWithEvidence.map((finding) => ({
    ...finding,
    recencyAt: finding.recencyAt ?? latestActivityByClient.get(finding.clientId) ?? null,
  }));

  rankedFindings.sort((a, b) => {
    const aHasValue = a.monthlyValue != null && a.monthlyValue > 0;
    const bHasValue = b.monthlyValue != null && b.monthlyValue > 0;
    if (aHasValue !== bHasValue) return aHasValue ? -1 : 1;
    if (aHasValue && bHasValue && a.monthlyValue !== b.monthlyValue) {
      return (b.monthlyValue ?? 0) - (a.monthlyValue ?? 0);
    }

    const severityDifference =
      FINDING_SEVERITY[b.type] - FINDING_SEVERITY[a.type];
    if (severityDifference !== 0) return severityDifference;

    const aRecency = a.recencyAt ? Date.parse(a.recencyAt) : 0;
    const bRecency = b.recencyAt ? Date.parse(b.recencyAt) : 0;
    if (bRecency !== aRecency) return bRecency - aRecency;

    const breachDifference = normalisedBreach(b) - normalisedBreach(a);
    if (breachDifference !== 0) return breachDifference;

    const confidenceRank = { high: 2, degraded: 1, failed: 0 } as const;
    if (confidenceRank[b.confidence] !== confidenceRank[a.confidence]) {
      return confidenceRank[b.confidence] - confidenceRank[a.confidence];
    }
    if (a.clientId !== b.clientId) return a.clientId - b.clientId;
    return a.type.localeCompare(b.type);
  });

  const findingsByType: Record<FindingType, number> = {
    volume_shift: 0,
    response_drift: 0,
    project_overrun: 0,
    contact_gap: 0,
    data_quality: 0,
    backlog_growth: 0,
    ageing_tickets: 0,
    unowned_account: 0,
    contact_concentration: 0,
    resolution_time_trend: 0,
    after_hours_volume: 0,
    contact_gap_absolute: 0,
    contract_expiring: 0,
    contract_vs_usage: 0,
    top_client_service_decline: 0,
    high_value_unowned: 0,
    quote_acceptance_drop: 0,
    quote_value_at_stake: 0,
    quote_stalled: 0,
    order_gap: 0,
    order_value_drop: 0,
  };
  const clientsWithFindingsSet = new Set<number>();
  for (const f of dedupedFindings) {
    findingsByType[f.type] += 1;
    clientsWithFindingsSet.add(f.clientId);
  }

  const flaggedClientIds = [...clientsWithFindingsSet];
  const responseTimestampCoveragePct =
    !dateRespondedFailed && input.tickets.length > 0
      ? roundPct(
          (100 * input.tickets.filter((ticket) => ticket.dateResponded != null).length) /
            input.tickets.length,
        )
      : null;
  const closeTimestampCoveragePct =
    !dateClosedFailed && input.tickets.length > 0
      ? roundPct(
          (100 * input.tickets.filter((ticket) => ticket.dateClosed != null).length) /
            input.tickets.length,
        )
      : null;
  const clientsWithTickets = new Map<number, ScanTicketInput[]>();
  for (const ticket of input.tickets) {
    const tickets = clientsWithTickets.get(ticket.clientId) ?? [];
    tickets.push(ticket);
    clientsWithTickets.set(ticket.clientId, tickets);
  }
  const clientsWithoutOwner =
    !mappingFailed(input.fieldMapping, "assignedOwner") &&
    input.tickets.length > 0 &&
    [...clientsWithTickets.values()].every((tickets) =>
      tickets.every((ticket) => ticket.owner != null),
    )
      ? [...clientsWithTickets.values()].filter((tickets) =>
          tickets.every((ticket) => !hasAssignedOwner(ticket.owner)),
        ).length
      : null;
  const checksRun = [
    !dateEnteredFailed,
    !dateRespondedFailed,
    !mappingFailed(input.fieldMapping, "targetDate"),
    !dateEnteredFailed,
    !dateClosedFailed,
    !dateRespondedFailed,
    statusOpenAvailable,
    statusOpenAvailable && !dateClosedFailed,
    !mappingFailed(input.fieldMapping, "assignedOwner"),
    !mappingFailed(input.fieldMapping, "requester"),
    !dateEnteredFailed && !dateClosedFailed,
    !dateEnteredFailed,
    !dateEnteredFailed,
    !mappingFailed(input.fieldMapping, "assignedOwner"),
    !dateEnteredFailed,
    ...(input.quotations != null ? [true, true, true] : []),
    ...(input.salesOrders != null ? [true, true] : []),
  ].filter(Boolean).length;
  let exposureValue: number | null = null;
  let exposureCoverage: number | null = null;
  const totalPortfolioMonthlyValue = [...contractByClient.values()].reduce(
    (sum, value) => sum + value,
    0,
  );
  const flaggedPortfolioMonthlyValue = flaggedClientIds.reduce(
    (sum, clientId) => sum + (contractByClient.get(clientId) ?? 0),
    0,
  );
  const flaggedClientSharePct =
    clientIds.size > 0 ? roundPct((100 * flaggedClientIds.length) / clientIds.size) : 0;
  const revenueConcentrationSuppressedReason =
    flaggedClientSharePct > 80
      ? `Suppressed because ${flaggedClientSharePct}% of analysed clients carry findings; concentration is not discriminating at this threshold.`
      : null;
  const revenueConcentrationPct =
    totalPortfolioMonthlyValue > 0 && revenueConcentrationSuppressedReason == null
      ? roundPct((100 * flaggedPortfolioMonthlyValue) / totalPortfolioMonthlyValue)
      : null;

  if (flaggedClientIds.length > 0) {
    let withValue = 0;
    let sum = 0;
    let anyContractValue = false;
    for (const cid of flaggedClientIds) {
      const mv = contractByClient.get(cid);
      if (mv != null && mv >= 0) {
        withValue += 1;
        sum += mv;
        anyContractValue = true;
      }
    }
    if (anyContractValue) {
      exposureValue = round1(sum);
      exposureCoverage = roundPct((100 * withValue) / flaggedClientIds.length);
    }
  }

  return {
    findings: rankedFindings,
    insufficientData,
    portfolio: {
      clientsAnalysed: clientIds.size,
      clientsWithFindings: clientsWithFindingsSet.size,
      findingsByType,
      checksRun,
      ticketCount: input.tickets.length,
      responseTimestampCoveragePct,
      closeTimestampCoveragePct,
      clientsWithoutOwner,
      activeContractsWithoutActivity,
      clientsInsufficientData: insufficientData.length,
      expiringContractCount: expiringContracts.length,
      expiringContractValue,
      exposureValue,
      exposureCoverage,
      revenueConcentrationPct,
      revenueConcentrationSuppressedReason,
    },
  };
}
