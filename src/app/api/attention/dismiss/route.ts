import { NextResponse } from "next/server";

import { syncScanFindingLedger } from "@/lib/psa/scan-finding-ledger";
import { requireScanDetailsEntitlement } from "@/lib/scan-entitlement";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DismissBody = {
  scanSessionId?: string;
  clientId?: number;
  findingType?: string;
  action?: "normal_for_client" | "add_to_qbr" | "handled";
  reason?: string;
  note?: string;
};

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

  const scanSessionId = new URL(request.url).searchParams.get("scanSessionId")?.trim() ?? "";
  if (!scanSessionId) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("scan_finding_dismissals")
    .select("client_id,finding_type,actioned")
    .eq("user_id", user.id)
    .eq("scan_session_id", scanSessionId);
  if (error) {
    return NextResponse.json({ ok: false, error: "dismissal_read_failed" }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    dismissed: (data ?? [])
      .filter((row) => row.actioned === true)
      .map((row) => `${row.client_id}:${row.finding_type}`),
  });
}

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const entitlementError = await requireScanDetailsEntitlement(user.id, supabase);
  if (entitlementError) return entitlementError;

  let body: DismissBody;
  try {
    body = (await request.json()) as DismissBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const scanSessionId = typeof body.scanSessionId === "string" ? body.scanSessionId.trim() : "";
  const findingType = typeof body.findingType === "string" ? body.findingType.trim() : "";
  const clientId = Number(body.clientId);
  const action = body.action ?? "normal_for_client";
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (
    !scanSessionId ||
    !findingType ||
    !Number.isSafeInteger(clientId) ||
    clientId <= 0 ||
    (action !== "normal_for_client" && action !== "add_to_qbr" && action !== "handled") ||
    note.length > 240 ||
    note.includes("\n") ||
    note.includes("\r")
  ) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { data: session, error: sessionError } = await admin
    .from("scan_sessions")
    .select("id,created_at,results_json")
    .eq("id", scanSessionId)
    .eq("claimed_by_user_id", user.id)
    .eq("status", "claimed")
    .maybeSingle();
  if (sessionError || !session) {
    return NextResponse.json({ ok: false, error: "scan_session_unavailable" }, { status: 404 });
  }

  const findings = session.results_json &&
    typeof session.results_json === "object" &&
    Array.isArray((session.results_json as { findings?: unknown }).findings)
    ? (session.results_json as { findings: unknown[] }).findings
    : [];
  const hasFinding = findings.some((finding) => {
    if (!finding || typeof finding !== "object") return false;
    const value = finding as { clientId?: unknown; type?: unknown };
    return value.clientId === clientId && value.type === findingType;
  });
  if (!hasFinding) {
    return NextResponse.json({ ok: false, error: "finding_not_found" }, { status: 404 });
  }

  try {
    await syncScanFindingLedger({
      userId: user.id,
      sessionId: scanSessionId,
      createdAt: session.created_at,
      results: session.results_json,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "ledger_save_failed" }, { status: 500 });
  }

  const reason =
    action === "normal_for_client"
      ? (typeof body.reason === "string" ? body.reason.trim() : "") || "normal_for_client"
      : action;
  const { error } = await admin.from("scan_finding_dismissals").upsert(
    {
      user_id: user.id,
      scan_session_id: scanSessionId,
      client_id: clientId,
      finding_type: findingType,
      reason,
      actioned: true,
      action_type: action,
      action_note: note || null,
      actioned_at: new Date().toISOString(),
    },
    { onConflict: "user_id,scan_session_id,client_id,finding_type" },
  );
  if (error) {
    console.error("[attention] could not record finding dismissal", {
      userId: user.id,
      scanSessionId,
      error: error.message,
    });
    return NextResponse.json({ ok: false, error: "dismissal_save_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, action });
}
