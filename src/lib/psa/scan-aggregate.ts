import {
  computeSlaRiskFromTargetIso,
  daysToTargetDate,
  isHaloTicketActive,
} from "@/lib/delivery-health";
import { filterHaloProjectsByActivePeriod } from "@/lib/halo";
import type {
  FieldMappingConfidence,
  LogicalFieldMappingReport,
  ScanFieldMappingContext,
} from "@/lib/psa/halo-field-provenance";

export type ScanTicketInput = {
  ticketId: number | null;
  clientId: number;
  dateEntered: string | null;
  dateResponded: string | null;
  dateClosed: string | null;
  targetDate?: string | null;
  priority?: string | null;
  statusOpen?: boolean | null;
  owner?: string | null;
  requester?: string | null;
  ticketType?: string | null;
  slaDueDate?: string | null;
  /** Total hours logged against the ticket, when the PSA records it. */
  hoursLogged?: number | null;
};

export type ScanProjectInput = {
  projectId: number | null;
  clientId: number;
  targetDate: string | null;
};

export type AggregateByClientPeriodOpts = {
  /** Minimum response coverage (0–100) required to emit medianResponseHours. Default 70. */
  responseCoverageThreshold?: number;
  fieldMapping?: ScanFieldMappingContext;
};

export type ClientPeriodAggregate = {
  ticketsByMonth: Record<string, number>;
  responseCoveragePct: number | null;
  responseCoverageSuppressed: boolean;
  responseCoverageSuppressReason: string | null;
  closeCoveragePct: number | null;
  closeCoverageSuppressed: boolean;
  closeCoverageSuppressReason: string | null;
  medianResponseHours: number | null;
  medianResponseSuppressed: boolean;
  medianResponseSuppressReason: string | null;
  projectOverrunCount: number;
  overrunProjectIds: number[];
};

export type PortfolioScanResult = {
  responseCoveragePct: number | null;
  responseCoverageSuppressed: boolean;
  responseCoverageSuppressReason: string | null;
  closeCoveragePct: number | null;
  closeCoverageSuppressed: boolean;
  closeCoverageSuppressReason: string | null;
  clientResponseCoverageSpread: { min: number; max: number };
  clientCloseCoverageSpread: { min: number; max: number };
  suppressedResponseMetricClients: number;
  fieldMapping: ScanFieldMappingContext | null;
};

function monthKeyUtc(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const d = new Date(t);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

function responseHours(createdIso: string | null, respondedIso: string | null): number | null {
  if (!createdIso || !respondedIso) return null;
  const created = Date.parse(createdIso);
  const responded = Date.parse(respondedIso);
  if (Number.isNaN(created) || Number.isNaN(responded) || responded < created) return null;
  const hours = (responded - created) / 3_600_000;
  if (!Number.isFinite(hours) || hours < 0) return null;
  return Math.round(hours * 10) / 10;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round(((sorted[mid - 1]! + sorted[mid]!) / 2) * 10) / 10;
  }
  return sorted[mid]!;
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((1000 * numerator) / denominator) / 10;
}

function isProjectOverrun(targetDate: string | null): boolean {
  const days = daysToTargetDate(targetDate);
  return days != null && days < 0;
}

function metricGateFromMapping(
  report: LogicalFieldMappingReport | undefined,
): {
  suppressed: boolean;
  suppressReason: string | null;
  confidence: FieldMappingConfidence | null;
} {
  if (!report || report.totalTickets <= 0) {
    return { suppressed: false, suppressReason: null, confidence: null };
  }
  if (report.confidence === "failed") {
    return {
      suppressed: true,
      suppressReason: `field_mapping_failed:${report.field}`,
      confidence: "failed",
    };
  }
  if (report.confidence === "degraded") {
    return {
      suppressed: false,
      suppressReason: `field_mapping_degraded:${report.confidenceReason ?? report.field}`,
      confidence: "degraded",
    };
  }
  return { suppressed: false, suppressReason: null, confidence: "high" };
}

/**
 * Aggregate scan metrics keyed by numeric client id — no names or free text.
 */
export function aggregateByClientPeriod(
  tickets: ScanTicketInput[],
  projects: ScanProjectInput[],
  opts?: AggregateByClientPeriodOpts,
): Record<number, ClientPeriodAggregate> {
  const threshold = opts?.responseCoverageThreshold ?? 70;
  const responseGate = metricGateFromMapping(opts?.fieldMapping?.dateResponded);
  const closeGate = metricGateFromMapping(opts?.fieldMapping?.dateClosed);

  type ClientAggregateBucket = {
    months: Map<string, number>;
    ticketCount: number;
    withResponse: number;
    withClose: number;
    responseHours: number[];
    projectOverrun: number;
    overrunProjectIds: number[];
  };
  const byClient = new Map<number, ClientAggregateBucket>();

  const ensure = (clientId: number) => {
    let bucket = byClient.get(clientId);
    if (!bucket) {
      bucket = {
        months: new Map(),
        ticketCount: 0,
        withResponse: 0,
        withClose: 0,
        responseHours: [],
        projectOverrun: 0,
      overrunProjectIds: [],
      };
      byClient.set(clientId, bucket);
    }
    return bucket;
  };

  for (const t of tickets) {
    if (!Number.isFinite(t.clientId) || t.clientId <= 0) continue;
    const b = ensure(t.clientId);
    b.ticketCount += 1;

    const mk = monthKeyUtc(t.dateEntered);
    if (mk) {
      b.months.set(mk, (b.months.get(mk) ?? 0) + 1);
    }

    if (t.dateResponded?.trim()) {
      b.withResponse += 1;
      const hrs = responseHours(t.dateEntered, t.dateResponded);
      if (hrs != null) b.responseHours.push(hrs);
    }

    if (t.dateClosed?.trim()) {
      b.withClose += 1;
    }
  }

  for (const p of projects) {
    if (!Number.isFinite(p.clientId) || p.clientId <= 0) continue;
    const b = ensure(p.clientId);
    if (isProjectOverrun(p.targetDate)) {
      b.projectOverrun += 1;
      if (p.projectId != null && Number.isSafeInteger(p.projectId) && p.projectId > 0) {
        b.overrunProjectIds.push(p.projectId);
      }
    }
  }

  const out: Record<number, ClientPeriodAggregate> = {};

  for (const [clientId, b] of byClient) {
    const rawResponseCoveragePct = pct(b.withResponse, b.ticketCount);
    const rawCloseCoveragePct = pct(b.withClose, b.ticketCount);

    const responseCoveragePct = responseGate.suppressed ? null : rawResponseCoveragePct;
    const closeCoveragePct = closeGate.suppressed ? null : rawCloseCoveragePct;

    const belowThreshold =
      !responseGate.suppressed && rawResponseCoveragePct < threshold;
    const mappingDegradedMedian =
      responseGate.confidence === "degraded" && !responseGate.suppressed;

    const medianResponseHours =
      responseGate.suppressed ||
      belowThreshold ||
      mappingDegradedMedian ||
      b.responseHours.length === 0
        ? null
        : median(b.responseHours);

    let medianResponseSuppressReason: string | null = null;
    if (responseGate.suppressed) {
      medianResponseSuppressReason = responseGate.suppressReason;
    } else if (mappingDegradedMedian) {
      medianResponseSuppressReason = responseGate.suppressReason;
    } else if (belowThreshold) {
      medianResponseSuppressReason = `response_coverage_below_${threshold}`;
    }

    const ticketsByMonth: Record<string, number> = {};
    for (const [k, v] of b.months) {
      ticketsByMonth[k] = v;
    }

    out[clientId] = {
      ticketsByMonth,
      responseCoveragePct,
      responseCoverageSuppressed: responseGate.suppressed,
      responseCoverageSuppressReason: responseGate.suppressed
        ? responseGate.suppressReason
        : responseGate.suppressReason,
      closeCoveragePct,
      closeCoverageSuppressed: closeGate.suppressed,
      closeCoverageSuppressReason: closeGate.suppressReason,
      medianResponseHours,
      medianResponseSuppressed:
        responseGate.suppressed || belowThreshold || mappingDegradedMedian,
      medianResponseSuppressReason,
      projectOverrunCount: b.projectOverrun,
      overrunProjectIds: b.overrunProjectIds,
    };
  }

  return out;
}

/** Portfolio-wide coverage from per-client aggregates (ticket-weighted). */
export function portfolioCoverageFromAggregates(
  byClient: Record<number, ClientPeriodAggregate>,
  ticketCountsByClient: Record<number, number>,
  fieldMapping?: ScanFieldMappingContext | null,
): PortfolioScanResult {
  const responseGate = metricGateFromMapping(fieldMapping?.dateResponded);
  const closeGate = metricGateFromMapping(fieldMapping?.dateClosed);

  let totalTickets = 0;
  let withResponse = 0;
  let withClose = 0;
  const responsePcts: number[] = [];
  const closePcts: number[] = [];
  let suppressedResponseMetricClients = 0;

  for (const [cidStr, agg] of Object.entries(byClient)) {
    const cid = Number(cidStr);
    const n = ticketCountsByClient[cid] ?? 0;
    if (n <= 0) continue;
    totalTickets += n;
    if (agg.responseCoveragePct != null) {
      withResponse += Math.round((n * agg.responseCoveragePct) / 100);
      responsePcts.push(agg.responseCoveragePct);
    }
    if (agg.closeCoveragePct != null) {
      withClose += Math.round((n * agg.closeCoveragePct) / 100);
      closePcts.push(agg.closeCoveragePct);
    }
    if (agg.medianResponseSuppressed) suppressedResponseMetricClients += 1;
  }

  const spread = (vals: number[]) =>
    vals.length === 0
      ? { min: 0, max: 0 }
      : { min: Math.min(...vals), max: Math.max(...vals) };

  return {
    responseCoveragePct: responseGate.suppressed
      ? null
      : pct(withResponse, totalTickets),
    responseCoverageSuppressed: responseGate.suppressed,
    responseCoverageSuppressReason: responseGate.suppressReason,
    closeCoveragePct: closeGate.suppressed ? null : pct(withClose, totalTickets),
    closeCoverageSuppressed: closeGate.suppressed,
    closeCoverageSuppressReason: closeGate.suppressReason,
    clientResponseCoverageSpread: spread(responsePcts),
    clientCloseCoverageSpread: spread(closePcts),
    suppressedResponseMetricClients,
    fieldMapping: fieldMapping ?? null,
  };
}

export {
  isHaloTicketActive,
  daysToTargetDate,
  computeSlaRiskFromTargetIso,
  filterHaloProjectsByActivePeriod,
};

export type {
  FieldMappingConfidence,
  LogicalFieldMappingReport,
  ScanFieldMappingContext,
} from "@/lib/psa/halo-field-provenance";
