import { NextResponse } from "next/server";

import { badRequest, line, requireAppUser, storageUnavailable } from "@/lib/server/api-user";
import { recordFindingAction } from "@/lib/server/finding-actions";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VERDICTS = new Set(["worth_knowing", "handled", "normal_for_client", "not_useful"]);
/** "Normal for this client" lasts six months, then the sign can come back. */
const NORMAL_FOR_MS = 182 * 86_400_000;

/**
 * Record what the MSP thought of a warning sign. "Handled" and "Normal for this
 * client" also write the finding ledger, so Saved Revenue and the Revenue at
 * Risk page stay in step with the list.
 */
export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (auth.error) return auth.error;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const clientId = Number(body?.clientId);
  const findingType = typeof body?.findingType === "string" ? body.findingType : "";
  const verdict = typeof body?.verdict === "string" ? body.verdict : "";
  const scanSessionId = typeof body?.scanSessionId === "string" ? body.scanSessionId : "";
  const reason = line(body?.reason, 60);
  const note = line(body?.note, 240);
  const clientName = line(body?.clientName, 200);
  if (
    !Number.isSafeInteger(clientId) ||
    clientId <= 0 ||
    !/^[a-z_]{2,40}$/.test(findingType) ||
    !VERDICTS.has(verdict) ||
    !/^[0-9a-f-]{36}$/i.test(scanSessionId) ||
    reason === undefined ||
    note === undefined ||
    clientName === undefined
  ) {
    return badRequest();
  }

  const admin = createServiceRoleClient();
  const now = new Date();
  const { data, error } = await admin
    .from("signal_feedback")
    .insert({
      user_id: auth.userId,
      client_id: clientId,
      client_name: clientName ?? "",
      finding_type: findingType,
      scan_session_id: scanSessionId,
      verdict,
      reason,
      note,
      expires_at: verdict === "normal_for_client" ? new Date(now.getTime() + NORMAL_FOR_MS).toISOString() : null,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[week/feedback] save failed", error?.message);
    return storageUnavailable();
  }

  if (verdict === "handled" || verdict === "normal_for_client") {
    await recordFindingAction(admin, {
      userId: auth.userId,
      scanSessionId,
      clientId,
      findingType,
      action: verdict,
      note: note ?? undefined,
      reason: reason ?? undefined,
    });
  }
  // Handled: the row moves to Done. Not useful: out of the list until next week's scan.
  if (verdict === "handled" || verdict === "not_useful") {
    await admin.from("week_item_states").upsert(
      {
        user_id: auth.userId,
        item_key: `risk:${clientId}`,
        client_id: clientId,
        status: verdict === "handled" ? "done" : "snoozed",
        done_at: verdict === "handled" ? now.toISOString() : null,
        snoozed_until: verdict === "not_useful" ? new Date(now.getTime() + 7 * 86_400_000).toISOString() : null,
        updated_at: now.toISOString(),
      },
      { onConflict: "user_id,item_key" },
    );
  }
  return NextResponse.json({ ok: true, id: data.id });
}

/** Undo one answer: the sign comes back and stops counting towards what Handover learned. */
export async function DELETE(request: Request) {
  const auth = await requireAppUser();
  if (auth.error) return auth.error;
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return badRequest();
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("signal_feedback")
    .update({ undone_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", auth.userId)
    .select("client_id,finding_type,verdict,scan_session_id")
    .maybeSingle();
  if (error) return storageUnavailable();
  if (!data) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  await admin
    .from("week_item_states")
    .delete()
    .eq("user_id", auth.userId)
    .eq("item_key", `risk:${data.client_id}`);
  if (data.verdict === "handled" || data.verdict === "normal_for_client") {
    await admin
      .from("scan_finding_dismissals")
      .update({ actioned: false, action_type: null, action_note: null, actioned_at: null })
      .eq("user_id", auth.userId)
      .eq("scan_session_id", data.scan_session_id)
      .eq("client_id", data.client_id)
      .eq("finding_type", data.finding_type);
  }
  return NextResponse.json({ ok: true });
}
