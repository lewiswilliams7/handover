import { NextResponse } from "next/server";

import { requireScanDetailsEntitlement } from "@/lib/scan-entitlement";
import type {
  ScanFindingLedgerRow,
  ScanFindingOutcomeStatus,
} from "@/lib/psa/scan-finding-ledger";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HistoryStatus = "all" | "actioned" | "open" | "resolved";

function isHistoryStatus(value: string | null): value is HistoryStatus {
  return value === "all" || value === "actioned" || value === "open" || value === "resolved";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function toLedgerRow(value: unknown): ScanFindingLedgerRow | null {
  if (!isRecord(value)) return null;
  const actionType =
    value.action_type === "normal_for_client" ||
    value.action_type === "add_to_qbr" ||
    value.action_type === "handled"
      ? value.action_type
      : null;
  const outcomeStatus: ScanFindingOutcomeStatus =
    value.outcome_status === "resolved" || value.outcome_status === "still_open"
      ? value.outcome_status
      : "pending";
  const clientId = Number(value.client_id);
  if (
    typeof value.id !== "string" ||
    typeof value.user_id !== "string" ||
    !Number.isSafeInteger(clientId) ||
    clientId <= 0 ||
    typeof value.finding_type !== "string" ||
    typeof value.raised_at !== "string" ||
    typeof value.outcome_due_at !== "string"
  ) {
    return null;
  }
  return {
    id: value.id,
    user_id: value.user_id,
    scan_session_id: typeof value.scan_session_id === "string" ? value.scan_session_id : null,
    client_id: clientId,
    client_name: typeof value.client_name === "string" ? value.client_name : null,
    finding_type: value.finding_type,
    raised_at: value.raised_at,
    drivers_at_raise: Array.isArray(value.drivers_at_raise)
      ? (value.drivers_at_raise as ScanFindingLedgerRow["drivers_at_raise"])
      : [],
    monthly_value: (() => {
      if (value.monthly_value == null) return null;
      const monthlyValue = Number(value.monthly_value);
      return Number.isFinite(monthlyValue) ? monthlyValue : null;
    })(),
    actioned: value.actioned === true,
    action_type: actionType,
    reason: typeof value.reason === "string" ? value.reason : null,
    action_note: typeof value.action_note === "string" ? value.action_note : null,
    actioned_at: typeof value.actioned_at === "string" ? value.actioned_at : null,
    outcome_status: outcomeStatus,
    outcome_due_at: value.outcome_due_at,
    outcome_at: typeof value.outcome_at === "string" ? value.outcome_at : null,
    outcome_scan_session_id:
      typeof value.outcome_scan_session_id === "string" ? value.outcome_scan_session_id : null,
  };
}

function latestRows(rows: ScanFindingLedgerRow[]): ScanFindingLedgerRow[] {
  const latest = new Map<string, ScanFindingLedgerRow>();
  for (const row of rows) {
    const key = `${row.client_id}:${row.finding_type}`;
    if (!latest.has(key)) latest.set(key, row);
  }
  return [...latest.values()];
}

function matchesHistoryStatus(row: ScanFindingLedgerRow, status: HistoryStatus): boolean {
  if (status === "all") return true;
  if (status === "actioned") return row.actioned;
  if (status === "resolved") return row.outcome_status === "resolved";
  return !row.actioned && row.outcome_status !== "resolved";
}

export async function GET(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const entitlementError = await requireScanDetailsEntitlement(user.id, supabase);
  if (entitlementError) return entitlementError;

  const params = new URL(request.url).searchParams;
  const rawClientId = params.get("clientId");
  const clientId = rawClientId ? Number(rawClientId) : null;
  if (
    clientId !== null &&
    (!Number.isSafeInteger(clientId) || clientId <= 0)
  ) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }
  const rawStatus = params.get("status");
  const status = isHistoryStatus(rawStatus) ? rawStatus : "all";
  const requestedLimit = Number(params.get("limit") ?? 500);
  const limit = Number.isSafeInteger(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 500)
    : 500;

  const admin = createServiceRoleClient();
  let query = admin
    .from("scan_finding_dismissals")
    .select(
      "id,user_id,scan_session_id,client_id,client_name,finding_type,raised_at,drivers_at_raise,monthly_value,actioned,action_type,reason,action_note,actioned_at,outcome_status,outcome_due_at,outcome_at,outcome_scan_session_id",
    )
    .eq("user_id", user.id)
    .order("raised_at", { ascending: false })
    .limit(limit);
  if (clientId !== null) query = query.eq("client_id", clientId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: "history_read_failed" }, { status: 500 });
  }

  const rows = (data ?? []).flatMap((value) => {
    const row = toLedgerRow(value);
    return row ? [row] : [];
  });
  const visibleRows = rows.filter((row) => matchesHistoryStatus(row, status));
  const latest = latestRows(rows);
  return NextResponse.json({
    ok: true,
    rows: visibleRows,
    summary: {
      flagsRaised: rows.length,
      actioned: rows.filter((row) => row.actioned).length,
      stillOpen: latest.filter(
        (row) => !row.actioned && row.outcome_status !== "resolved",
      ).length,
      resolved: rows.filter((row) => row.outcome_status === "resolved").length,
    },
  });
}
