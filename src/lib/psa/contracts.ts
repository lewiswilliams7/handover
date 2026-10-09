import { haloPsaFetch, HALO_TICKETS_HISTORICAL_MAX_PAGES, isHaloRateLimitedResponse } from "@/lib/halo";
import {
  normalizeConnectWiseSiteUrl,
  type ConnectWiseConnection,
} from "@/lib/psa/connectwise";

const HALO_CONTRACTS_PAGE_SIZE = 100;
const HALO_CONTRACTS_MAX_PAGES = HALO_TICKETS_HISTORICAL_MAX_PAGES;

const CW_AGREEMENTS_PAGE_SIZE = 100;
const CW_AGREEMENTS_MAX_PAGES = HALO_TICKETS_HISTORICAL_MAX_PAGES;

export type ContractValueSource =
  | "halo_period_charge"
  | "halo_billing_plans"
  | "cw_bill_amount"
  | "none";

export type NormalisedContractRecord = {
  clientId: number;
  monthlyValue: number | null;
  endDate: string | null;
  valueSource: ContractValueSource;
  hasValue: boolean;
};

export type ContractValueSummary = {
  total: number;
  withValue: number;
  withoutValue: number;
  byValueSource: Record<ContractValueSource, number>;
};

export type HaloContractsResult = {
  records: NormalisedContractRecord[];
  summary: ContractValueSummary;
};

export type RecurringInvoiceField =
  | "clientId"
  | "revenue"
  | "total"
  | "period"
  | "periodStartDate"
  | "periodEndDate"
  | "startDate"
  | "endDate";

export type CommercialFieldMappingReport = {
  field: string;
  histogram: Record<string, number>;
  totalRows: number;
  matchedRows: number;
  dominantSourceKey: string | null;
  dominantSourcePct: number;
};

export type RecurringInvoiceFieldMapping = Record<
  RecurringInvoiceField,
  CommercialFieldMappingReport
>;

export type CommercialFieldMappingContext = {
  recurringInvoices?: RecurringInvoiceFieldMapping;
  quotations?: Record<string, CommercialFieldMappingReport>;
  salesOrders?: Record<string, CommercialFieldMappingReport>;
};

export type NormalisedRecurringInvoiceRecord = {
  clientId: number;
  monthlyValue: number | null;
  revenue: number | null;
  total: number | null;
  period: string | number | null;
  periodStartDate: string | null;
  periodEndDate: string | null;
  startDate: string | null;
  endDate: string | null;
};

export type HaloRecurringInvoicesResult = {
  records: NormalisedRecurringInvoiceRecord[];
  fieldMapping: RecurringInvoiceFieldMapping;
};

export type CwAgreementsResult = {
  records: NormalisedContractRecord[];
  summary: ContractValueSummary;
};

function normalizeHaloBase(haloUrl: string): string {
  return haloUrl.trim().replace(/\/+$/, "");
}

function numOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function strOrNull(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function parseClientId(row: Record<string, unknown>): number | null {
  const candidates = [
    row.client_id,
    row.clientid,
    typeof row.client === "object" && row.client
      ? (row.client as Record<string, unknown>).id
      : null,
  ];
  for (const c of candidates) {
    const n = typeof c === "number" ? c : Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function parseCompanyId(row: Record<string, unknown>): number | null {
  const company = row.company;
  if (company && typeof company === "object") {
    const id = (company as Record<string, unknown>).id;
    const n = typeof id === "number" ? id : Number(id);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const raw = row.companyId ?? row.company_id;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (Number.isFinite(n) && n > 0) return n;
  return null;
}

/**
 * Halo's billingperiod is an enum, not a month count. Code 2 is verified as
 * Monthly. Other numeric codes must not be guessed when Halo omits its label.
 */
const HALO_BILLING_PERIOD_CODE_MONTHS: Readonly<Record<number, number>> = {
  2: 1,
};

/** Months per billing period for normalising to monthly MRR. */
function monthsPerBillingPeriod(
  billingPeriodCode: unknown,
  billingPeriodLabel: string | null,
): number | null {
  const label = (billingPeriodLabel ?? "").toLowerCase();
  if (label.includes("quarter")) return 3;
  if (/\b(6|six)[ -]?month/.test(label) || label.includes("semi-annual")) return 6;
  if (label.includes("annual") || label.includes("year")) return 12;
  if (label.includes("week")) return 12 / 52;
  if (label.includes("day")) return 12 / 365;
  if (label.includes("month")) return 1;

  const code = typeof billingPeriodCode === "number" ? billingPeriodCode : Number(billingPeriodCode);
  return Number.isFinite(code)
    ? (HALO_BILLING_PERIOD_CODE_MONTHS[code] ?? null)
    : null;
}

function toMonthlyAmount(amount: number, monthsPerPeriod: number | null): number | null {
  if (!Number.isFinite(amount) || amount < 0) return null;
  if (monthsPerPeriod == null || monthsPerPeriod <= 0) return null;
  return amount / monthsPerPeriod;
}

function sumBillingPlans(
  plans: unknown,
  monthsPerPeriod: number | null,
): number | null {
  if (!Array.isArray(plans) || plans.length === 0) return null;
  let sum = 0;
  let any = false;
  for (const raw of plans) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const amount =
      numOrNull(o.periodchargeamount) ??
      numOrNull(o.chargeamount) ??
      numOrNull(o.amount) ??
      numOrNull(o.value) ??
      numOrNull(o.price);
    if (amount == null || amount < 0) continue;
    const lineBillingPeriodPresent =
      o.billingperiod != null || o.billing_period_string != null;
    const lineMonths = lineBillingPeriodPresent
      ? monthsPerBillingPeriod(o.billingperiod, strOrNull(o.billing_period_string))
      : monthsPerPeriod;
    const monthly = toMonthlyAmount(amount, lineMonths);
    if (monthly != null) {
      sum += monthly;
      any = true;
    }
  }
  return any ? sum : null;
}

function buildContractSummary(records: NormalisedContractRecord[]): ContractValueSummary {
  const byValueSource: Record<ContractValueSource, number> = {
    halo_period_charge: 0,
    halo_billing_plans: 0,
    cw_bill_amount: 0,
    none: 0,
  };
  let withValue = 0;
  for (const r of records) {
    byValueSource[r.valueSource] += 1;
    if (r.hasValue) withValue += 1;
  }
  return {
    total: records.length,
    withValue,
    withoutValue: records.length - withValue,
    byValueSource,
  };
}

function unwrapHaloContracts(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  for (const k of [
    "contracts",
    "contract",
    "clientcontracts",
    "ClientContract",
    "invoices",
    "recurringinvoices",
    "recurringinvoice",
    "result",
    "data",
  ]) {
    if (Array.isArray(o[k])) return o[k] as unknown[];
  }
  return [];
}

const RECURRING_INVOICE_FIELD_ALIASES: Record<
  RecurringInvoiceField,
  readonly string[]
> = {
  clientId: ["client_id", "clientid", "client"],
  revenue: ["revenue"],
  total: ["total"],
  period: ["period"],
  periodStartDate: ["period_start_date"],
  periodEndDate: ["period_end_date"],
  startDate: ["startdate"],
  endDate: ["enddate"],
};

function rawValueForAlias(
  row: Record<string, unknown>,
  alias: string,
): unknown {
  if (alias !== "client") return row[alias];
  return row.client && typeof row.client === "object"
    ? (row.client as Record<string, unknown>).id
    : row.client;
}

function sourceKeyForRecurringField(
  row: Record<string, unknown>,
  field: RecurringInvoiceField,
): string | null {
  for (const alias of RECURRING_INVOICE_FIELD_ALIASES[field]) {
    const value = rawValueForAlias(row, alias);
    if (value == null || (typeof value === "string" && value.trim() === "")) continue;
    return alias;
  }
  return null;
}

function buildCommercialFieldMapping(
  rows: Record<string, unknown>[],
): RecurringInvoiceFieldMapping {
  const fields = Object.keys(RECURRING_INVOICE_FIELD_ALIASES) as RecurringInvoiceField[];
  return Object.fromEntries(
    fields.map((field) => {
      const histogram: Record<string, number> = {};
      for (const row of rows) {
        const source = sourceKeyForRecurringField(row, field) ?? "none";
        histogram[source] = (histogram[source] ?? 0) + 1;
      }
      const entries = Object.entries(histogram).sort(([, a], [, b]) => b - a);
      const [dominantSourceKey, dominantCount] = entries[0] ?? [null, 0];
      return [
        field,
        {
          field,
          histogram,
          totalRows: rows.length,
          matchedRows: rows.length - (histogram.none ?? 0),
          dominantSourceKey,
          dominantSourcePct: rows.length > 0 ? (100 * dominantCount) / rows.length : 0,
        },
      ];
    }),
  ) as RecurringInvoiceFieldMapping;
}

function validHaloDate(value: unknown): string | null {
  const text = strOrNull(value);
  if (!text || text.startsWith("1899") || text.startsWith("1900")) return null;
  return Number.isNaN(Date.parse(text)) ? null : text;
}

function monthsFromPeriodDates(
  periodStartDate: string | null,
  periodEndDate: string | null,
): number | null {
  if (!periodStartDate || !periodEndDate) return null;
  const durationDays =
    (Date.parse(periodEndDate) - Date.parse(periodStartDate)) / 86_400_000;
  if (!Number.isFinite(durationDays) || durationDays <= 0) return null;
  const months = Math.round(durationDays / (365.2425 / 12));
  return months > 0 ? months : null;
}

function normaliseHaloRecurringInvoiceRow(
  row: Record<string, unknown>,
): NormalisedRecurringInvoiceRecord | null {
  const clientId = parseClientId(row);
  if (clientId == null) return null;
  const periodStartDate = validHaloDate(row.period_start_date);
  const periodEndDate = validHaloDate(row.period_end_date);
  const startDate = validHaloDate(row.startdate);
  const endDate = validHaloDate(row.enddate);
  const revenue = numOrNull(row.revenue);
  const total = numOrNull(row.total);
  const months = monthsFromPeriodDates(
    periodStartDate ?? startDate,
    periodEndDate ?? endDate,
  );
  return {
    clientId,
    monthlyValue: revenue != null && months != null ? revenue / months : null,
    revenue,
    total,
    period:
      typeof row.period === "number" || typeof row.period === "string"
        ? row.period
        : null,
    periodStartDate,
    periodEndDate,
    startDate,
    endDate,
  };
}

export function normaliseHaloContractRow(
  row: Record<string, unknown>,
): NormalisedContractRecord | null {
  const clientId = parseClientId(row);
  if (clientId == null) return null;

  const endDate =
    strOrNull(row.end_date) ??
    strOrNull(row.enddate) ??
    strOrNull(row.EndDate);

  const months = monthsPerBillingPeriod(
    row.billingperiod,
    strOrNull(row.billing_period_string) ?? strOrNull(row.billingperiod_string),
  );

  const headerAmount = numOrNull(row.periodchargeamount);
  let monthlyValue: number | null = null;
  let valueSource: ContractValueSource = "none";

  if (headerAmount != null && headerAmount >= 0) {
    monthlyValue = toMonthlyAmount(headerAmount, months);
    if (monthlyValue != null) {
      valueSource = "halo_period_charge";
    }
  }

  if (monthlyValue == null) {
    const planSum = sumBillingPlans(row.billingplans ?? row.billing_plans, months);
    if (planSum != null && planSum > 0) {
      monthlyValue = planSum;
      valueSource = "halo_billing_plans";
    }
  }

  return {
    clientId,
    monthlyValue,
    endDate,
    valueSource,
    hasValue: monthlyValue != null,
  };
}

function cwMonthsFromCycle(name: string | null): number | null {
  const n = (name ?? "").toLowerCase();
  if (!n) return null;
  if (n.includes("month")) return 1;
  if (n.includes("quarter")) return 3;
  if (n.includes("annual") || n.includes("year")) return 12;
  if (n.includes("week")) return 12 / 52;
  return null;
}

function normaliseCwAgreementRow(row: Record<string, unknown>): NormalisedContractRecord | null {
  const clientId = parseCompanyId(row);
  if (clientId == null) return null;

  const endDate = strOrNull(row.endDate) ?? strOrNull(row.end_date);
  const noEnding = row.noEndingDateFlag === true;

  const cycle =
    row.billingCycle && typeof row.billingCycle === "object"
      ? strOrNull((row.billingCycle as Record<string, unknown>).name)
      : strOrNull(row.billingCycle);

  const billAmount = numOrNull(row.billAmount);
  const monthlyValue =
    billAmount != null && billAmount > 0
      ? toMonthlyAmount(billAmount, cwMonthsFromCycle(cycle))
      : null;

  return {
    clientId,
    monthlyValue,
    endDate: noEnding ? null : endDate,
    valueSource: monthlyValue != null ? "cw_bill_amount" : "none",
    hasValue: monthlyValue != null,
  };
}

export type GetHaloContractsOpts = {
  maxPages?: number;
  pageSize?: number;
  includeinactive?: boolean;
};

/**
 * Fetch client billing contracts from HaloPSA (`GET /api/ClientContract`).
 * Requires Halo API application permission for **ClientContract** (Finance/CRM module),
 * separate from ticket read permissions.
 */
export async function getHaloContracts(
  token: string,
  haloUrl: string,
  opts?: GetHaloContractsOpts,
): Promise<HaloContractsResult> {
  const base = normalizeHaloBase(haloUrl);
  const pageSize = opts?.pageSize ?? HALO_CONTRACTS_PAGE_SIZE;
  const maxPages = opts?.maxPages ?? HALO_CONTRACTS_MAX_PAGES;
  const includeinactive = opts?.includeinactive === true;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const allRaw: unknown[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= maxPages) {
    const url = new URL(`${base}/api/ClientContract`);
    url.searchParams.set("pageinate", "true");
    url.searchParams.set("page_size", String(pageSize));
    url.searchParams.set("page_no", String(page));
    url.searchParams.set("includeinactive", includeinactive ? "true" : "false");
    url.searchParams.set("includedetails", "true");

    const res = await haloPsaFetch(url.toString(), { headers, cache: "no-store" });
    if (isHaloRateLimitedResponse(res)) {
      throw new Error("HaloPSA rate limit exceeded while fetching ClientContract.");
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `Halo ClientContract fetch failed (${res.status}): ${body.slice(0, 400)}`,
      );
    }

    const json = (await res.json()) as unknown;
    const batch = unwrapHaloContracts(json);
    if (batch.length === 0) {
      hasMore = false;
    } else {
      allRaw.push(...batch);
      page += 1;
      if (batch.length < pageSize) hasMore = false;
    }
  }

  const records: NormalisedContractRecord[] = [];
  for (const raw of allRaw) {
    if (!raw || typeof raw !== "object") continue;
    const norm = normaliseHaloContractRow(raw as Record<string, unknown>);
    if (norm) records.push(norm);
  }

  return { records, summary: buildContractSummary(records) };
}

/**
 * Fetch recurring invoice schedules from HaloPSA.
 * Revenue is retained as the recurring amount; total is retained for provenance
 * because the API may include tax in total. Monthly value is derived only from
 * explicit period start/end dates, never from the numeric period code.
 */
export async function getHaloRecurringInvoices(
  token: string,
  haloUrl: string,
): Promise<HaloRecurringInvoicesResult> {
  const base = normalizeHaloBase(haloUrl);
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const allRaw: Record<string, unknown>[] = [];
  for (let page = 1; page <= HALO_CONTRACTS_MAX_PAGES; page += 1) {
    const url = new URL(`${base}/api/RecurringInvoice`);
    url.searchParams.set("pageinate", "true");
    url.searchParams.set("page_size", String(HALO_CONTRACTS_PAGE_SIZE));
    url.searchParams.set("page_no", String(page));
    const res = await haloPsaFetch(url.toString(), { headers, cache: "no-store" });
    if (isHaloRateLimitedResponse(res)) {
      throw new Error("HaloPSA rate limit exceeded while fetching RecurringInvoice.");
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `Halo RecurringInvoice fetch failed (${res.status}): ${body.slice(0, 400)}`,
      );
    }
    const batch = unwrapHaloContracts((await res.json()) as unknown).filter(
      (row): row is Record<string, unknown> => Boolean(row) && typeof row === "object",
    );
    if (batch.length === 0) break;
    allRaw.push(...batch);
    if (batch.length < HALO_CONTRACTS_PAGE_SIZE) break;
  }
  return {
    records: allRaw
      .map(normaliseHaloRecurringInvoiceRow)
      .filter((record): record is NormalisedRecurringInvoiceRecord => record != null),
    fieldMapping: buildCommercialFieldMapping(allRaw),
  };
}

function buildCwAuthHeader(conn: ConnectWiseConnection): string {
  const credentials = `${conn.companyId}+${conn.publicKey}:${conn.privateKey}`;
  return `Basic ${Buffer.from(credentials, "utf8").toString("base64")}`;
}

export type GetCwAgreementsOpts = {
  maxPages?: number;
  pageSize?: number;
};

/**
 * Fetch active finance agreements from ConnectWise Manage.
 * Requires API role with Finance > Agreements read.
 */
export async function getCwAgreements(
  connection: ConnectWiseConnection,
  opts?: GetCwAgreementsOpts,
): Promise<CwAgreementsResult> {
  const base = normalizeConnectWiseSiteUrl(connection.siteUrl);
  const pageSize = opts?.pageSize ?? CW_AGREEMENTS_PAGE_SIZE;
  const maxPages = opts?.maxPages ?? CW_AGREEMENTS_MAX_PAGES;
  const fields = encodeURIComponent(
    "id,company/id,billAmount,billingCycle/name,endDate,noEndingDateFlag",
  );
  const conditions = encodeURIComponent("cancelledFlag=false");
  const headers = {
    Authorization: buildCwAuthHeader(connection),
    clientId: connection.clientId,
    "Content-Type": "application/json",
  };

  const allRaw: unknown[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const url = `${base}/v4_6_release/apis/3.0/finance/agreements?conditions=${conditions}&page=${page}&pageSize=${pageSize}&fields=${fields}`;
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`ConnectWise agreements fetch failed (${res.status}): ${body.slice(0, 400)}`);
    }
    const parsed = (await res.json()) as unknown;
    const batch = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { items?: unknown })?.items)
        ? ((parsed as { items: unknown[] }).items as unknown[])
        : [];
    allRaw.push(...batch);
    if (batch.length < pageSize) break;
  }

  const records: NormalisedContractRecord[] = [];
  for (const raw of allRaw) {
    if (!raw || typeof raw !== "object") continue;
    const norm = normaliseCwAgreementRow(raw as Record<string, unknown>);
    if (norm) records.push(norm);
  }

  return { records, summary: buildContractSummary(records) };
}
