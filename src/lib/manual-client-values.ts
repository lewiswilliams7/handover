/**
 * What the MSP tells Handover about clients that the PSA cannot:
 *
 * - Monthly values for clients whose PSA holds no contract or recurring
 *   invoice value. They only ever fill gaps: a value from the PSA is never
 *   overwritten, so the PSA stays the source of truth wherever it has one.
 * - Clients that are not really clients (the MSP's own company, a test or
 *   demo client). They are left out of every client view.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { StoredScanResults } from "@/lib/psa/scan-session";

export type ManualValues = {
  /** Client id to monthly value. */
  values: Record<string, number>;
  /** Client ids marked as internal. */
  internal: string[];
};

export const EMPTY_MANUAL_VALUES: ManualValues = { values: {}, internal: [] };

/** Postgres "relation does not exist" / PostgREST "table not in schema cache". */
export function isMissingTableError(error: { code?: string | null } | null | undefined): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

/** Postgres "column does not exist" / PostgREST "column not in schema cache". */
function isMissingColumnError(error: { code?: string | null } | null | undefined): boolean {
  return error?.code === "42703" || error?.code === "PGRST204";
}

export async function loadManualValues(client: SupabaseClient, userId: string): Promise<ManualValues> {
  let rows: Array<{ client_id: unknown; monthly_value: unknown; is_internal?: unknown }> = [];
  const full = await client
    .from("client_value_overrides")
    .select("client_id, monthly_value, is_internal")
    .eq("user_id", userId);
  if (isMissingColumnError(full.error)) {
    // Table created before the internal flag existed.
    const legacy = await client
      .from("client_value_overrides")
      .select("client_id, monthly_value")
      .eq("user_id", userId);
    if (legacy.error) return EMPTY_MANUAL_VALUES;
    rows = legacy.data ?? [];
  } else if (full.error) {
    return EMPTY_MANUAL_VALUES;
  } else {
    rows = full.data ?? [];
  }
  const out: ManualValues = { values: {}, internal: [] };
  for (const row of rows) {
    const id = String(row.client_id);
    if (row.is_internal === true) {
      out.internal.push(id);
      continue;
    }
    const value = Number(row.monthly_value);
    if (Number.isFinite(value) && value > 0) out.values[id] = value;
  }
  return out;
}

function withoutKeys<T>(record: Record<string, T> | null | undefined, drop: Set<string>): Record<string, T> | null | undefined {
  if (!record) return record;
  return Object.fromEntries(Object.entries(record).filter(([key]) => !drop.has(key)));
}

/**
 * Scan results with internal clients removed, and manual values filled in
 * wherever the PSA had none: client values (Client Margin, Renewal Radar),
 * finding values (Revenue at Risk) and renewal rows. Marks the results so
 * pages can say which values were typed in.
 */
export function applyManualValues(
  results: StoredScanResults,
  manual: ManualValues,
): StoredScanResults & { manualValueClientIds?: number[]; internalClientIds?: number[] } {
  let out: StoredScanResults & { manualValueClientIds?: number[]; internalClientIds?: number[] } = results;

  if (manual.internal.length > 0) {
    const drop = new Set(manual.internal);
    const keep = (clientId: number) => !drop.has(String(clientId));
    out = {
      ...out,
      clientNames: withoutKeys(out.clientNames, drop) ?? out.clientNames,
      clientValues: withoutKeys(out.clientValues, drop),
      clientContacts: withoutKeys(out.clientContacts, drop),
      findings: (out.findings ?? []).filter((finding) => keep(finding.clientId)),
      renewals: out.renewals?.filter((renewal) => keep(renewal.clientId)),
      clientMonthly: out.clientMonthly
        ? { ...out.clientMonthly, clients: out.clientMonthly.clients.filter((client) => keep(client.clientId)) }
        : out.clientMonthly,
      insufficientData: Array.isArray(out.insufficientData)
        ? (out.insufficientData as Array<{ clientId?: unknown }>).filter((row) => keep(Number(row.clientId)))
        : out.insufficientData,
      internalClientIds: manual.internal.map(Number),
    } as typeof out;
  }

  const ids = Object.keys(manual.values);
  if (ids.length === 0) return out;
  const psaValues = out.clientValues ?? {};
  const filled: Record<string, number> = { ...psaValues };
  const used: number[] = [];
  for (const id of ids) {
    if (psaValues[id] == null || psaValues[id]! <= 0) {
      filled[id] = manual.values[id]!;
      used.push(Number(id));
    }
  }
  if (used.length === 0) return out;
  const usedSet = new Set(used);
  return {
    ...out,
    clientValues: filled,
    findings: (out.findings ?? []).map((finding) =>
      (finding.monthlyValue == null || finding.monthlyValue <= 0) && usedSet.has(finding.clientId)
        ? { ...finding, monthlyValue: manual.values[String(finding.clientId)]! }
        : finding,
    ),
    renewals: out.renewals?.map((renewal) =>
      renewal.monthlyValue == null && usedSet.has(renewal.clientId)
        ? { ...renewal, monthlyValue: manual.values[String(renewal.clientId)]! }
        : renewal,
    ),
    manualValueClientIds: used,
  };
}
