import type { ScanComparison } from "@/lib/psa/scan-comparison";
import type { ScanFinding } from "@/lib/psa/scan-findings";
import type { StoredScanResults } from "@/lib/psa/scan-session";
import { createServiceRoleClient } from "@/lib/supabase/admin";

const OUTCOME_WINDOW_MS = 90 * 86_400_000;

export const SCAN_FINDING_ACTION_TYPES = [
  "normal_for_client",
  "add_to_qbr",
  "handled",
] as const;

export type ScanFindingActionType = (typeof SCAN_FINDING_ACTION_TYPES)[number];

export const SCAN_FINDING_OUTCOME_STATUSES = [
  "pending",
  "resolved",
  "still_open",
] as const;

export type ScanFindingOutcomeStatus = (typeof SCAN_FINDING_OUTCOME_STATUSES)[number];

export type ScanFindingLedgerRow = {
  id: string;
  user_id: string;
  scan_session_id: string | null;
  client_id: number;
  client_name: string | null;
  finding_type: string;
  raised_at: string;
  drivers_at_raise: ScanFinding["drivers"];
  monthly_value: number | null;
  actioned: boolean;
  action_type: ScanFindingActionType | null;
  reason: string | null;
  action_note: string | null;
  actioned_at: string | null;
  outcome_status: ScanFindingOutcomeStatus;
  outcome_due_at: string;
  outcome_at: string | null;
  outcome_scan_session_id: string | null;
};

export type SyncScanFindingLedgerInput = {
  userId: string;
  sessionId: string;
  createdAt: string;
  results: StoredScanResults | null;
  previousSessionId?: string | null;
  comparison?: ScanComparison | null;
};

function findingKey(clientId: number, findingType: string): string {
  return `${clientId}:${findingType}`;
}

function validFinding(finding: ScanFinding): boolean {
  return (
    Number.isSafeInteger(finding.clientId) &&
    finding.clientId > 0 &&
    typeof finding.type === "string" &&
    finding.type.length > 0
  );
}

function raisedAtFor(createdAt: string): string {
  return Number.isNaN(Date.parse(createdAt)) ? new Date().toISOString() : createdAt;
}

function outcomeDueAt(raisedAt: string): string {
  return new Date(Date.parse(raisedAt) + OUTCOME_WINDOW_MS).toISOString();
}

export async function syncScanFindingLedger(
  input: SyncScanFindingLedgerInput,
): Promise<void> {
  if (!input.results) return;

  const admin = createServiceRoleClient();
  const raisedAt = raisedAtFor(input.createdAt);
  const findings = input.results.findings.filter(validFinding);
  const rows = findings.map((finding) => ({
    user_id: input.userId,
    scan_session_id: input.sessionId,
    client_id: finding.clientId,
    client_name: input.results?.clientNames?.[String(finding.clientId)] ?? null,
    finding_type: finding.type,
    raised_at: raisedAt,
    drivers_at_raise: finding.drivers.slice(0, 3),
    monthly_value: finding.monthlyValue,
    outcome_due_at: outcomeDueAt(raisedAt),
  }));

  if (rows.length > 0) {
    const { error } = await admin
      .from("scan_finding_dismissals")
      .upsert(rows, {
        onConflict: "user_id,scan_session_id,client_id,finding_type",
        ignoreDuplicates: true,
      });
    if (error) {
      console.error("[attention] could not record scan finding ledger", {
        userId: input.userId,
        sessionId: input.sessionId,
        error: error.message,
      });
      throw new Error("scan_finding_ledger_write_failed");
    }
  }

  if (input.previousSessionId && input.comparison?.resolvedFindings.length) {
    await recordResolvedFindings({
      admin,
      userId: input.userId,
      previousSessionId: input.previousSessionId,
      currentSessionId: input.sessionId,
      currentCreatedAt: raisedAt,
      resolvedFindings: input.comparison.resolvedFindings,
    });
  }

  await recordDueStillOpenFindings({
    admin,
    userId: input.userId,
    currentSessionId: input.sessionId,
    currentCreatedAt: raisedAt,
    currentFindings: findings,
  });
}

async function recordResolvedFindings({
  admin,
  userId,
  previousSessionId,
  currentSessionId,
  currentCreatedAt,
  resolvedFindings,
}: {
  admin: ReturnType<typeof createServiceRoleClient>;
  userId: string;
  previousSessionId: string;
  currentSessionId: string;
  currentCreatedAt: string;
  resolvedFindings: ScanFinding[];
}): Promise<void> {
  const resolvedKeys = new Set(
    resolvedFindings
      .filter(validFinding)
      .map((finding) => findingKey(finding.clientId, finding.type)),
  );
  if (resolvedKeys.size === 0) return;

  const { data, error } = await admin
    .from("scan_finding_dismissals")
    .select("id,client_id,finding_type")
    .eq("user_id", userId)
    .eq("scan_session_id", previousSessionId)
    .eq("outcome_status", "pending");
  if (error) throw new Error("scan_finding_ledger_read_failed");

  const ids = (data ?? [])
    .filter((row) => resolvedKeys.has(findingKey(Number(row.client_id), String(row.finding_type))))
    .map((row) => row.id)
    .filter((id): id is string => typeof id === "string");
  if (ids.length === 0) return;

  const { error: updateError } = await admin
    .from("scan_finding_dismissals")
    .update({
      outcome_status: "resolved",
      outcome_at: currentCreatedAt,
      outcome_scan_session_id: currentSessionId,
    })
    .in("id", ids);
  if (updateError) throw new Error("scan_finding_ledger_write_failed");
}

async function recordDueStillOpenFindings({
  admin,
  userId,
  currentSessionId,
  currentCreatedAt,
  currentFindings,
}: {
  admin: ReturnType<typeof createServiceRoleClient>;
  userId: string;
  currentSessionId: string;
  currentCreatedAt: string;
  currentFindings: ScanFinding[];
}): Promise<void> {
  const currentKeys = new Set(
    currentFindings.map((finding) => findingKey(finding.clientId, finding.type)),
  );
  if (currentKeys.size === 0) return;

  const { data, error } = await admin
    .from("scan_finding_dismissals")
    .select("id,client_id,finding_type")
    .eq("user_id", userId)
    .eq("outcome_status", "pending")
    .lte("outcome_due_at", currentCreatedAt);
  if (error) throw new Error("scan_finding_ledger_read_failed");

  const ids = (data ?? [])
    .filter((row) => currentKeys.has(findingKey(Number(row.client_id), String(row.finding_type))))
    .map((row) => row.id)
    .filter((id): id is string => typeof id === "string");
  if (ids.length === 0) return;

  const { error: updateError } = await admin
    .from("scan_finding_dismissals")
    .update({
      outcome_status: "still_open",
      outcome_at: currentCreatedAt,
      outcome_scan_session_id: currentSessionId,
    })
    .in("id", ids);
  if (updateError) throw new Error("scan_finding_ledger_write_failed");
}
