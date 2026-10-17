import { NextResponse } from "next/server";

import { badRequest, line, requireAppUser, storageUnavailable } from "@/lib/server/api-user";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OUTCOMES = new Set(["lost", "downsized"]);

/**
 * Record that a client left or cut back. This is the ground truth Handover is
 * measured against: whether a warning came first, and how early.
 */
export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (auth.error) return auth.error;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const clientId = Number(body?.clientId);
  const outcome = typeof body?.outcome === "string" ? body.outcome : "";
  const reason = line(body?.reason, 60);
  const note = line(body?.note, 240);
  const clientName = line(body?.clientName, 200);
  const occurredOn = typeof body?.occurredOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.occurredOn) ? body.occurredOn : null;
  const monthlyValue = body?.monthlyValue == null ? null : Number(body.monthlyValue);
  if (
    !Number.isSafeInteger(clientId) ||
    clientId <= 0 ||
    !OUTCOMES.has(outcome) ||
    reason === undefined ||
    note === undefined ||
    clientName === undefined ||
    (monthlyValue != null && (!Number.isFinite(monthlyValue) || monthlyValue < 0))
  ) {
    return badRequest();
  }
  const { error } = await createServiceRoleClient()
    .from("client_outcomes")
    .upsert(
      {
        user_id: auth.userId,
        client_id: clientId,
        client_name: clientName ?? "",
        outcome,
        reason,
        note,
        monthly_value: monthlyValue,
        ...(occurredOn ? { occurred_on: occurredOn } : {}),
      },
      { onConflict: "user_id,client_id" },
    );
  if (error) return storageUnavailable();
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await requireAppUser();
  if (auth.error) return auth.error;
  const clientId = Number(new URL(request.url).searchParams.get("clientId"));
  if (!Number.isSafeInteger(clientId) || clientId <= 0) return badRequest();
  const { error } = await createServiceRoleClient()
    .from("client_outcomes")
    .delete()
    .eq("user_id", auth.userId)
    .eq("client_id", clientId);
  if (error) return storageUnavailable();
  return NextResponse.json({ ok: true });
}
