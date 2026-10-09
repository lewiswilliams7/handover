import {
  HALO_TICKETS_HISTORICAL_MAX_PAGES,
  haloPsaFetch,
  isHaloRateLimitedResponse,
} from "@/lib/halo";
import type { CommercialFieldMappingReport } from "@/lib/psa/contracts";

const PAGE_SIZE = 100;

export type NormalisedQuotation = {
  id: number | null;
  clientId: number;
  date: string | null;
  expiryDate: string | null;
  revenue: number | null;
  cost: number | null;
  profit: number | null;
  status: string | number | null;
  approvalState: number | null;
  approvalName: string | null;
  approvalDateTime: string | null;
  approved: boolean;
};

export type NormalisedSalesOrder = {
  clientId: number;
  date: string | null;
  revenue: number | null;
  cost: number | null;
  profit: number | null;
  quotationId: number | null;
};

export type CommercialEntityFieldMapping = Record<
  string,
  CommercialFieldMappingReport
>;

export type HaloCommercialResult = {
  quotations: NormalisedQuotation[];
  salesOrders: NormalisedSalesOrder[];
  fieldMapping: {
    quotations: CommercialEntityFieldMapping;
    salesOrders: CommercialEntityFieldMapping;
  };
};

const QUOTATION_ALIASES: Record<string, readonly string[]> = {
  clientId: ["client_id", "clientid", "client"],
  date: ["date"],
  expiryDate: ["expiry_date", "expirydate"],
  revenue: ["revenue"],
  cost: ["cost"],
  profit: ["profit"],
  status: ["status"],
  approvalState: ["approvalstate", "approval_state"],
  approvalName: ["approvalname", "approval_name"],
  approvalDateTime: ["approvaldatetime", "approval_datetime"],
};

const SALES_ORDER_ALIASES: Record<string, readonly string[]> = {
  clientId: ["client_id", "clientid", "client"],
  date: ["date"],
  revenue: ["revenue"],
  cost: ["cost"],
  profit: ["profit"],
  quotationId: ["quotation_id", "quotationid"],
};

function valueForAlias(row: Record<string, unknown>, alias: string): unknown {
  if (alias !== "client") return row[alias];
  return row.client && typeof row.client === "object"
    ? (row.client as Record<string, unknown>).id
    : row.client;
}

function isMissing(value: unknown, date = false): boolean {
  if (value == null || (typeof value === "string" && value.trim() === "")) return true;
  if (date && /^(1899|1900)-/.test(String(value))) return true;
  return false;
}

function sourceKey(
  row: Record<string, unknown>,
  aliases: readonly string[],
  date = false,
): string | null {
  return aliases.find((alias) => !isMissing(valueForAlias(row, alias), date)) ?? null;
}

function buildMapping(
  rows: Record<string, unknown>[],
  aliases: Record<string, readonly string[]>,
  dateFields: ReadonlySet<string>,
): CommercialEntityFieldMapping {
  return Object.fromEntries(
    Object.entries(aliases).map(([field, fieldAliases]) => {
      const histogram: Record<string, number> = {};
      for (const row of rows) {
        const key = sourceKey(row, fieldAliases, dateFields.has(field)) ?? "none";
        histogram[key] = (histogram[key] ?? 0) + 1;
      }
      const entries = Object.entries(histogram).sort(([, left], [, right]) => right - left);
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
  );
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function dateOrNull(value: unknown): string | null {
  const text = stringOrNull(value);
  return text && !isMissing(text, true) && !Number.isNaN(Date.parse(text)) ? text : null;
}

function clientIdOrNull(row: Record<string, unknown>): number | null {
  const value = valueForAlias(row, "client_id") ?? valueForAlias(row, "clientid") ??
    valueForAlias(row, "client");
  const parsed = numberOrNull(value);
  return parsed != null && parsed > 0 ? parsed : null;
}

function normaliseQuotation(row: Record<string, unknown>): NormalisedQuotation | null {
  const clientId = clientIdOrNull(row);
  if (clientId == null) return null;
  const approvalState = numberOrNull(row.approvalstate ?? row.approval_state);
  const approvalName = stringOrNull(row.approvalname ?? row.approval_name);
  const approvalDateTime = dateOrNull(row.approvaldatetime ?? row.approval_datetime);
  return {
    id: numberOrNull(row.id),
    clientId,
    date: dateOrNull(row.date),
    expiryDate: dateOrNull(row.expiry_date ?? row.expirydate),
    revenue: numberOrNull(row.revenue),
    cost: numberOrNull(row.cost),
    profit: numberOrNull(row.profit),
    status:
      typeof row.status === "number" || typeof row.status === "string"
        ? row.status
        : null,
    approvalState,
    approvalName,
    approvalDateTime,
    approved: approvalState === 2 && approvalName != null && approvalDateTime != null,
  };
}

function normaliseSalesOrder(row: Record<string, unknown>): NormalisedSalesOrder | null {
  const clientId = clientIdOrNull(row);
  if (clientId == null) return null;
  return {
    clientId,
    date: dateOrNull(row.date),
    revenue: numberOrNull(row.revenue),
    cost: numberOrNull(row.cost),
    profit: numberOrNull(row.profit),
    quotationId: numberOrNull(row.quotation_id ?? row.quotationid),
  };
}

function unwrapRows(data: unknown, keys: readonly string[]): unknown[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  const object = data as Record<string, unknown>;
  for (const key of keys) {
    if (Array.isArray(object[key])) return object[key] as unknown[];
  }
  return [];
}

async function fetchRows(
  token: string,
  haloUrl: string,
  endpoint: string,
  wrapperKeys: readonly string[],
): Promise<Record<string, unknown>[]> {
  const base = haloUrl.trim().replace(/\/+$/, "");
  const rows: Record<string, unknown>[] = [];
  for (let page = 1; page <= HALO_TICKETS_HISTORICAL_MAX_PAGES; page += 1) {
    const url = new URL(`${base}/api/${endpoint}`);
    url.searchParams.set("pageinate", "true");
    url.searchParams.set("page_size", String(PAGE_SIZE));
    url.searchParams.set("page_no", String(page));
    const response = await haloPsaFetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (isHaloRateLimitedResponse(response)) {
      throw new Error(`HaloPSA rate limit exceeded while fetching ${endpoint}.`);
    }
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Halo ${endpoint} fetch failed (${response.status}): ${body.slice(0, 400)}`);
    }
    const batch = unwrapRows(await response.json(), wrapperKeys).filter(
      (row): row is Record<string, unknown> => Boolean(row) && typeof row === "object",
    );
    if (batch.length === 0) break;
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return rows;
}

export async function getHaloCommercialData(
  token: string,
  haloUrl: string,
): Promise<HaloCommercialResult> {
  const [quotationRows, salesOrderRows] = await Promise.all([
    fetchRows(token, haloUrl, "Quotation", ["quotes", "quotations", "quotation", "result", "data"]),
    fetchRows(token, haloUrl, "SalesOrder", ["salesorders", "sales_orders", "orders", "result", "data"]),
  ]);
  return {
    quotations: quotationRows
      .map(normaliseQuotation)
      .filter((row): row is NormalisedQuotation => row != null),
    salesOrders: salesOrderRows
      .map(normaliseSalesOrder)
      .filter((row): row is NormalisedSalesOrder => row != null),
    fieldMapping: {
      quotations: buildMapping(
        quotationRows,
        QUOTATION_ALIASES,
        new Set(["date", "expiryDate", "approvalDateTime"]),
      ),
      salesOrders: buildMapping(salesOrderRows, SALES_ORDER_ALIASES, new Set(["date"])),
    },
  };
}
