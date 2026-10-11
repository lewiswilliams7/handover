/**
 * Monthly values the MSP types in for clients whose PSA holds no contract or
 * recurring invoice value. They only ever fill gaps: a value from the PSA is
 * never overwritten, so the PSA stays the source of truth wherever it has one.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { StoredScanResults } from "@/lib/psa/scan-session";

export type ManualValues = Record<string, number>;

/** Postgres "relation does not exist" / PostgREST "table not in schema cache". */
export function isMissingTableError(error: { code?: string | null } | null | undefined): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

export async function loadManualValues(client: SupabaseClient, userId: string): Promise<ManualValues> {
  const { data, error } = await client
    .from("client_value_overrides")
    .select("client_id, monthly_value")
    .eq("user_id", userId);
  if (error) return {};
  const out: ManualValues = {};
  for (const row of data ?? []) {
    const value = Number(row.monthly_value);
    if (Number.isFinite(value) && value > 0) out[String(row.client_id)] = value;
  }
  return out;
}

/**
 * Scan results with manual values filled in wherever the PSA had none: client
 * values (Client Margin, Renewal Radar), finding values (Revenue at Risk) and
 * renewal rows. Marks the results so pages can say which values were typed in.
 */
export function applyManualValues(
  results: StoredScanResults,
  manual: ManualValues,
): StoredScanResults & { manualValueClientIds?: number[] } {
  const ids = Object.keys(manual);
  if (ids.length === 0) return results;
  const psaValues = results.clientValues ?? {};
  const filled: Record<string, number> = { ...psaValues };
  const used: number[] = [];
  for (const id of ids) {
    if (psaValues[id] == null || psaValues[id]! <= 0) {
      filled[id] = manual[id]!;
      used.push(Number(id));
    }
  }
  if (used.length === 0) return results;
  const usedSet = new Set(used);
  return {
    ...results,
    clientValues: filled,
    findings: (results.findings ?? []).map((finding) =>
      (finding.monthlyValue == null || finding.monthlyValue <= 0) && usedSet.has(finding.clientId)
        ? { ...finding, monthlyValue: manual[String(finding.clientId)]! }
        : finding,
    ),
    renewals: results.renewals?.map((renewal) =>
      renewal.monthlyValue == null && usedSet.has(renewal.clientId)
        ? { ...renewal, monthlyValue: manual[String(renewal.clientId)]! }
        : renewal,
    ),
    manualValueClientIds: used,
  };
}
