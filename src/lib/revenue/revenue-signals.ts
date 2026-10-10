/**
 * Revenue at Risk™ and Saved Revenue.
 *
 * Both are annualised from the monthly contract or recurring billing value the
 * scan already reads from the PSA. A client is only ever counted once, at its
 * own monthly value, however many signals it carries.
 */

/** Finding types that describe upside (quotes, orders, usage) rather than risk. */
export const OPPORTUNITY_FINDING_TYPES: ReadonlySet<string> = new Set([
  "quote_acceptance_drop",
  "quote_value_at_stake",
  "quote_stalled",
  "order_gap",
  "order_value_drop",
  "contract_vs_usage",
]);

/**
 * Setup and data gaps: true for many clients who are perfectly happy, so they
 * never count towards Revenue at Risk (the same rule Churn Replay uses). They
 * are still shown, as housekeeping.
 */
export const HOUSEKEEPING_FINDING_TYPES: ReadonlySet<string> = new Set([
  "data_quality",
  "unowned_account",
  "high_value_unowned",
  "contact_concentration",
]);

/** Not a change in behaviour: renewals live in Renewal Radar, gaps in housekeeping. */
const NON_RISK_FINDING_TYPES: ReadonlySet<string> = new Set([
  ...HOUSEKEEPING_FINDING_TYPES,
  "contract_expiring",
]);

export type RiskFindingInput = {
  clientId: number;
  type: string;
  monthlyValue: number | null;
};

export type RevenueAtRiskClient = {
  clientId: number;
  monthlyValue: number | null;
  annualValue: number | null;
  findingTypes: string[];
};

export type RevenueAtRisk = {
  /** Sum of annual value across at-risk clients with a known value. */
  annualValue: number;
  clientsAtRisk: number;
  clientsWithValue: number;
  /** At-risk clients, highest value first; unknown values last. */
  clients: RevenueAtRiskClient[];
};

export function isRiskFinding(type: string): boolean {
  return !OPPORTUNITY_FINDING_TYPES.has(type) && !NON_RISK_FINDING_TYPES.has(type);
}

export function computeRevenueAtRisk(findings: RiskFindingInput[]): RevenueAtRisk {
  const byClient = new Map<number, { monthlyValue: number | null; types: Set<string> }>();
  for (const finding of findings) {
    if (!isRiskFinding(finding.type)) continue;
    const entry = byClient.get(finding.clientId) ?? { monthlyValue: null, types: new Set() };
    if (finding.monthlyValue != null && finding.monthlyValue > 0) {
      entry.monthlyValue = Math.max(entry.monthlyValue ?? 0, finding.monthlyValue);
    }
    entry.types.add(finding.type);
    byClient.set(finding.clientId, entry);
  }
  const clients = [...byClient.entries()]
    .map(([clientId, entry]) => ({
      clientId,
      monthlyValue: entry.monthlyValue,
      annualValue: entry.monthlyValue != null ? Math.round(entry.monthlyValue * 12) : null,
      findingTypes: [...entry.types],
    }))
    .sort((a, b) => (b.annualValue ?? -1) - (a.annualValue ?? -1) || a.clientId - b.clientId);
  const valued = clients.filter((client) => client.annualValue != null);
  return {
    annualValue: valued.reduce((sum, client) => sum + client.annualValue!, 0),
    clientsAtRisk: clients.length,
    clientsWithValue: valued.length,
    clients,
  };
}

export type SavedRevenueLedgerRow = {
  client_id: number;
  monthly_value: number | null;
  actioned: boolean;
  action_type: string | null;
  outcome_status: string;
};

export type SavedRevenue = {
  annualValue: number;
  clients: number;
};

/**
 * Saved Revenue: clients where someone acted on a flag, the signal later
 * cleared on a fresh scan, and the client has not since been found to have
 * left. Flags marked "normal for this client" are dismissals, not saves.
 */
export function computeSavedRevenue(
  rows: SavedRevenueLedgerRow[],
  lostClientIds: ReadonlySet<number> = new Set(),
): SavedRevenue {
  const saved = new Map<number, number>();
  for (const row of rows) {
    if (!row.actioned || row.action_type === "normal_for_client") continue;
    if (row.outcome_status !== "resolved") continue;
    if (lostClientIds.has(row.client_id)) continue;
    const monthly = row.monthly_value != null && row.monthly_value > 0 ? row.monthly_value : 0;
    saved.set(row.client_id, Math.max(saved.get(row.client_id) ?? 0, monthly));
  }
  return {
    annualValue: Math.round([...saved.values()].reduce((sum, value) => sum + value * 12, 0)),
    clients: saved.size,
  };
}
