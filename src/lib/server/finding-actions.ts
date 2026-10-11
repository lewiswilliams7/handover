/**
 * Recording an action on a finding (handled, normal for this client, add to
 * QBR). Shared by the Revenue at Risk page and the one-click links in the
 * Monday Brief, so both write the ledger the same way and Saved Revenue
 * counts them the same way.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { syncScanFindingLedger } from "@/lib/psa/scan-finding-ledger";

export type FindingAction = "normal_for_client" | "add_to_qbr" | "handled";

export type RecordFindingActionResult =
  | { ok: true }
  | { ok: false; error: "scan_session_unavailable" | "finding_not_found" | "ledger_save_failed" | "dismissal_save_failed" };

export async function recordFindingAction(
  admin: SupabaseClient,
  input: {
    userId: string;
    scanSessionId: string;
    clientId: number;
    findingType: string;
    action: FindingAction;
    note?: string;
    reason?: string;
  },
): Promise<RecordFindingActionResult> {
  const { data: session, error: sessionError } = await admin
    .from("scan_sessions")
    .select("id,created_at,results_json")
    .eq("id", input.scanSessionId)
    .eq("claimed_by_user_id", input.userId)
    .eq("status", "claimed")
    .maybeSingle();
  if (sessionError || !session) return { ok: false, error: "scan_session_unavailable" };

  const findings =
    session.results_json &&
    typeof session.results_json === "object" &&
    Array.isArray((session.results_json as { findings?: unknown }).findings)
      ? (session.results_json as { findings: unknown[] }).findings
      : [];
  const hasFinding = findings.some((finding) => {
    if (!finding || typeof finding !== "object") return false;
    const value = finding as { clientId?: unknown; type?: unknown };
    return value.clientId === input.clientId && value.type === input.findingType;
  });
  if (!hasFinding) return { ok: false, error: "finding_not_found" };

  try {
    await syncScanFindingLedger({
      userId: input.userId,
      sessionId: input.scanSessionId,
      createdAt: session.created_at,
      results: session.results_json,
    });
  } catch {
    return { ok: false, error: "ledger_save_failed" };
  }

  const reason =
    input.action === "normal_for_client" ? input.reason?.trim() || "normal_for_client" : input.action;
  const { error } = await admin.from("scan_finding_dismissals").upsert(
    {
      user_id: input.userId,
      scan_session_id: input.scanSessionId,
      client_id: input.clientId,
      finding_type: input.findingType,
      reason,
      actioned: true,
      action_type: input.action,
      action_note: input.note?.trim() || null,
      actioned_at: new Date().toISOString(),
    },
    { onConflict: "user_id,scan_session_id,client_id,finding_type" },
  );
  if (error) {
    console.error("[finding-actions] could not record action", {
      userId: input.userId,
      scanSessionId: input.scanSessionId,
      error: error.message,
    });
    return { ok: false, error: "dismissal_save_failed" };
  }
  return { ok: true };
}
