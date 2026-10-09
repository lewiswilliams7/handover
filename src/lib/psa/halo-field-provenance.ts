/**
 * Halo ticket field alias resolution and scan-path mapping confidence.
 */

export type LogicalHaloTicketField =
  | "dateEntered"
  | "dateResponded"
  | "dateClosed"
  | "targetDate"
  | "priority"
  | "statusOpen"
  | "assignedOwner"
  | "requester"
  | "ticketType"
  | "slaDueDate";

export const HALO_TICKET_FIELD_ALIASES: Record<
  LogicalHaloTicketField,
  readonly string[]
> = {
  dateEntered: [
    "dateoccurred",
    "date_occurred",
    "datecreated",
    "date_created",
    "dateopened",
    "date_opened",
    "opendate",
    "created_at",
  ],
  dateResponded: [
    "dateresponded",
    "date_responded",
    "responsedate",
    "response_date",
    "first_responsedate",
  ],
  dateClosed: [
    "dateclosed",
    "date_closed",
    "date_fully_closed",
    "datecleared",
    "date_cleared",
  ],
  targetDate: ["targetdate", "target_date", "duedate", "due_date", "datedue"],
  priority: [
    "priority",
    "priority_id",
    "priorityid",
    "priority_name",
    "priorityname",
  ],
  statusOpen: [
    "status",
    "status_id",
    "statusid",
    "status_name",
    "statusname",
    "open",
    "is_open",
    "isopen",
    "closed",
    "is_closed",
    "isclosed",
    "hasbeenclosed",
  ],
  assignedOwner: [
    "agent",
    "agent_id",
    "agentid",
    "assignedto",
    "assigned_to",
    "assignee",
    "technician",
    "technician_id",
    "owner",
    "owner_id",
    "manager",
    "who",
    "who_agentid",
    "actionby_agent_id",
  ],
  requester: [
    "user",
    "user_id",
    "username",
    "requester",
    "requester_id",
    "user_name",
    "useremail",
    "clientcontact",
    "client_contact",
    "contact",
    "contact_id",
    "contactname",
    "contact_name",
    "openedby",
    "opened_by",
    "createdby",
  ],
  ticketType: [
    "tickettype",
    "tickettype_id",
    "ticket_type",
    "ticket_type_id",
    "category",
    "category_id",
    "category_1",
    "category1",
    "category_2",
    "category2",
    "requesttype",
    "request_type",
  ],
  slaDueDate: [
    "fixbydate",
    "fix_by_date",
    "respondbydate",
    "respond_by_date",
    "sla_due_date",
    "sladuedate",
  ],
};

export type FieldResolution = {
  value: string | null;
  sourceKey: string | null;
};

export type FieldMappingConfidence = "high" | "degraded" | "failed";

export type LogicalFieldMappingReport = {
  field: LogicalHaloTicketField;
  histogram: Record<string, number>;
  confidence: FieldMappingConfidence;
  confidenceReason: string | null;
  totalTickets: number;
  matchedTickets: number;
  impliedEventWithoutDate: number;
  dominantSourceKey: string | null;
  dominantSourcePct: number;
};

export type ScanFieldMappingContext = Record<
  LogicalHaloTicketField,
  LogicalFieldMappingReport
>;

const HIGH_DOMINANT_ALIAS_PCT = 90;
const DEGRADED_IMPLIED_WITHOUT_DATE_PCT = 10;

function readString(raw: Record<string, unknown>, key: string): string | null {
  const v = raw[key];
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

function readPresentValue(raw: Record<string, unknown>, key: string): string | null {
  const v = raw[key];
  if (v == null) return null;
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const nestedKey of ["name", "label", "value", "id", "userid", "agentid"]) {
      const nested = o[nestedKey];
      if (typeof nested === "string" && nested.trim()) return nested.trim();
      if (typeof nested === "number" || typeof nested === "boolean") return String(nested);
    }
  }
  return null;
}

function isHaloNullSentinelDate(iso: string): boolean {
  return iso.startsWith("1900") || iso.startsWith("1899");
}

/** Resolve first matching alias on a raw Halo ticket row. */
export function resolveField(
  raw: Record<string, unknown>,
  aliases: readonly string[],
  opts?: { skipSentinelDates?: boolean },
): FieldResolution {
  for (const key of aliases) {
    const v = readString(raw, key);
    if (!v) continue;
    if (opts?.skipSentinelDates && isHaloNullSentinelDate(v)) continue;
    return { value: v, sourceKey: key };
  }
  return { value: null, sourceKey: null };
}

/** Resolve aliases whose API values may be scalar or nested objects. */
export function resolvePresentField(
  raw: Record<string, unknown>,
  aliases: readonly string[],
): FieldResolution {
  let emptySourceKey: string | null = null;
  for (const key of aliases) {
    if (!(key in raw)) continue;
    const value = readPresentValue(raw, key);
    if (value) return { value, sourceKey: key };
    emptySourceKey ??= key;
  }
  return { value: null, sourceKey: emptySourceKey };
}

function normaliseStatusValue(value: string): "open" | "closed" | null {
  const normalised = value.trim().toLowerCase();
  if (["true", "open", "opened", "active", "new", "in progress", "in_progress"].includes(normalised)) {
    return "open";
  }
  if (["false", "closed", "resolved", "complete", "completed", "cancelled", "canceled"].includes(normalised)) {
    return "closed";
  }
  return null;
}

export function resolveStatusOpen(raw: Record<string, unknown>): FieldResolution {
  let emptySourceKey: string | null = null;
  for (const key of HALO_TICKET_FIELD_ALIASES.statusOpen) {
    if (!(key in raw)) continue;
    const value = readPresentValue(raw, key);
    if (!value) {
      emptySourceKey ??= key;
      continue;
    }
    const status =
      key === "hasbeenclosed"
        ? value.trim().toLowerCase() === "true"
          ? "closed"
          : value.trim().toLowerCase() === "false"
            ? "open"
            : null
        : normaliseStatusValue(value);
    if (status) return { value: status, sourceKey: key };
    emptySourceKey ??= key;
  }
  return { value: null, sourceKey: emptySourceKey };
}

export function resolveTargetDate(raw: Record<string, unknown>): FieldResolution {
  return resolveField(raw, HALO_TICKET_FIELD_ALIASES.targetDate, {
    skipSentinelDates: true,
  });
}

function histogramKey(sourceKey: string | null): string {
  return sourceKey ?? "none";
}

/** Halo signals that an event occurred even when no date alias matched. */
export function rawImpliesResponseOccurred(raw: Record<string, unknown>): boolean {
  if (resolveField(raw, HALO_TICKET_FIELD_ALIASES.dateResponded).value) return false;
  const state = String(
    raw.slaresponsestate ?? raw.sla_first_response_state ?? "",
  ).toUpperCase();
  if (state === "I" || state === "M") return true;
  if (typeof raw.slatimeelapsed === "number" && raw.slatimeelapsed > 0) return true;
  if (raw.hasbeenclosed === true) return true;
  if (raw.closure_agent_id != null) return true;
  return false;
}

export function rawImpliesCloseOccurred(raw: Record<string, unknown>): boolean {
  if (resolveField(raw, HALO_TICKET_FIELD_ALIASES.dateClosed).value) return false;
  if (raw.hasbeenclosed === true) return true;
  if (raw.closure_agent_id != null) return true;
  const state = String(raw.slastate ?? "").toUpperCase();
  if (state === "I") return true;
  return false;
}

function emptyHistogram(): Record<string, number> {
  return { none: 0 };
}

export class FieldProvenanceAccumulator {
  private readonly histograms: Record<
    LogicalHaloTicketField,
    Record<string, number>
  > = {
    dateEntered: emptyHistogram(),
    dateResponded: emptyHistogram(),
    dateClosed: emptyHistogram(),
    targetDate: emptyHistogram(),
    priority: emptyHistogram(),
    statusOpen: emptyHistogram(),
    assignedOwner: emptyHistogram(),
    requester: emptyHistogram(),
    ticketType: emptyHistogram(),
    slaDueDate: emptyHistogram(),
  };

  private readonly impliedWithoutDate: Record<LogicalHaloTicketField, number> = {
    dateEntered: 0,
    dateResponded: 0,
    dateClosed: 0,
    targetDate: 0,
    priority: 0,
    statusOpen: 0,
    assignedOwner: 0,
    requester: 0,
    ticketType: 0,
    slaDueDate: 0,
  };

  private totalTickets = 0;

  recordTicket(raw: Record<string, unknown>): void {
    this.totalTickets += 1;

    const open = resolveField(raw, HALO_TICKET_FIELD_ALIASES.dateEntered);
    this.recordResolution("dateEntered", open, false);

    const responded = resolveField(raw, HALO_TICKET_FIELD_ALIASES.dateResponded);
    this.recordResolution(
      "dateResponded",
      responded,
      rawImpliesResponseOccurred(raw),
    );

    const closed = resolveField(raw, HALO_TICKET_FIELD_ALIASES.dateClosed);
    this.recordResolution("dateClosed", closed, rawImpliesCloseOccurred(raw));

    const target = resolveTargetDate(raw);
    this.recordResolution("targetDate", target, false);

    this.recordResolution("priority", resolvePresentField(raw, HALO_TICKET_FIELD_ALIASES.priority), false);
    this.recordResolution("statusOpen", resolveStatusOpen(raw), false);
    this.recordResolution(
      "assignedOwner",
      resolvePresentField(raw, HALO_TICKET_FIELD_ALIASES.assignedOwner),
      false,
    );
    this.recordResolution("requester", resolvePresentField(raw, HALO_TICKET_FIELD_ALIASES.requester), false);
    this.recordResolution("ticketType", resolvePresentField(raw, HALO_TICKET_FIELD_ALIASES.ticketType), false);
    this.recordResolution("slaDueDate", resolveField(raw, HALO_TICKET_FIELD_ALIASES.slaDueDate), false);
  }

  private recordResolution(
    field: LogicalHaloTicketField,
    resolution: FieldResolution,
    impliedWithoutDate: boolean,
  ): void {
    const key = histogramKey(resolution.sourceKey);
    const h = this.histograms[field];
    h[key] = (h[key] ?? 0) + 1;
    if (!resolution.value && impliedWithoutDate) {
      this.impliedWithoutDate[field] += 1;
    }
  }

  buildReports(): ScanFieldMappingContext {
    return {
      dateEntered: this.buildReport("dateEntered"),
      dateResponded: this.buildReport("dateResponded"),
      dateClosed: this.buildReport("dateClosed"),
      targetDate: this.buildReport("targetDate"),
      priority: this.buildReport("priority"),
      statusOpen: this.buildReport("statusOpen"),
      assignedOwner: this.buildReport("assignedOwner"),
      requester: this.buildReport("requester"),
      ticketType: this.buildReport("ticketType"),
      slaDueDate: this.buildReport("slaDueDate"),
    };
  }

  private buildReport(field: LogicalHaloTicketField): LogicalFieldMappingReport {
    const histogram = { ...this.histograms[field] };
    const totalTickets = this.totalTickets;
    const matchedTickets = totalTickets - (histogram.none ?? 0);
    const impliedEventWithoutDate = this.impliedWithoutDate[field];

    let dominantSourceKey: string | null = null;
    let dominantCount = 0;
    for (const [key, count] of Object.entries(histogram)) {
      if (key === "none") continue;
      if (count > dominantCount) {
        dominantCount = count;
        dominantSourceKey = key;
      }
    }

    const dominantSourcePct =
      matchedTickets > 0
        ? Math.round((1000 * dominantCount) / matchedTickets) / 10
        : 0;

    let confidence: FieldMappingConfidence = "high";
    let confidenceReason: string | null = null;

    if (totalTickets > 0 && matchedTickets === 0) {
      confidence = "failed";
      confidenceReason = "no_alias_matched";
    } else if (
      totalTickets > 0 &&
      impliedEventWithoutDate > 0 &&
      (impliedEventWithoutDate / totalTickets) * 100 >= DEGRADED_IMPLIED_WITHOUT_DATE_PCT
    ) {
      confidence = "degraded";
      confidenceReason = "implied_event_without_date";
    } else if (
      matchedTickets > 0 &&
      dominantSourcePct < HIGH_DOMINANT_ALIAS_PCT &&
      Object.keys(histogram).filter((k) => k !== "none").length > 1
    ) {
      confidence = "degraded";
      confidenceReason = "no_dominant_alias";
    }

    return {
      field,
      histogram,
      confidence,
      confidenceReason,
      totalTickets,
      matchedTickets,
      impliedEventWithoutDate,
      dominantSourceKey,
      dominantSourcePct,
    };
  }
}

export function capturePerTicketFieldProvenance(
  raw: Record<string, unknown>,
): Partial<Record<LogicalHaloTicketField, string | null>> {
  return {
    dateEntered: resolveField(raw, HALO_TICKET_FIELD_ALIASES.dateEntered).sourceKey,
    dateResponded: resolveField(raw, HALO_TICKET_FIELD_ALIASES.dateResponded)
      .sourceKey,
    dateClosed: resolveField(raw, HALO_TICKET_FIELD_ALIASES.dateClosed).sourceKey,
    targetDate: resolveTargetDate(raw).sourceKey,
    priority: resolvePresentField(raw, HALO_TICKET_FIELD_ALIASES.priority).sourceKey,
    statusOpen: resolveStatusOpen(raw).sourceKey,
    assignedOwner: resolvePresentField(raw, HALO_TICKET_FIELD_ALIASES.assignedOwner).sourceKey,
    requester: resolvePresentField(raw, HALO_TICKET_FIELD_ALIASES.requester).sourceKey,
    ticketType: resolvePresentField(raw, HALO_TICKET_FIELD_ALIASES.ticketType).sourceKey,
    slaDueDate: resolveField(raw, HALO_TICKET_FIELD_ALIASES.slaDueDate).sourceKey,
  };
}
