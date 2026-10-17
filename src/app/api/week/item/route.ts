import { NextResponse } from "next/server";

import { badRequest, line, requireAppUser, storageUnavailable } from "@/lib/server/api-user";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = /^(risk|renewal|margin|receipt_quiet|receipt_due|recurring):\d{1,15}$/;
const STATUSES = new Set(["open", "doing", "done", "snoozed"]);

/** Set a This week row's status, owner or snooze. */
export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (auth.error) return auth.error;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const key = typeof body?.key === "string" ? body.key : "";
  if (!KEY.test(key)) return badRequest();
  const status = body?.status;
  const owner = line(body?.owner, 80);
  if ((status !== undefined && (typeof status !== "string" || !STATUSES.has(status))) || owner === undefined) {
    return badRequest();
  }
  const snoozeDays = Number(body?.snoozeDays ?? 7);
  const now = new Date();
  const row: Record<string, unknown> = {
    user_id: auth.userId,
    item_key: key,
    client_id: Number(key.split(":")[1]),
    updated_at: now.toISOString(),
  };
  if (typeof status === "string") {
    row.status = status;
    row.done_at = status === "done" ? now.toISOString() : null;
    row.snoozed_until =
      status === "snoozed" ? new Date(now.getTime() + Math.min(90, Math.max(1, snoozeDays)) * 86_400_000).toISOString() : null;
  }
  if (body && "owner" in body) row.owner_name = owner;

  const { error } = await createServiceRoleClient()
    .from("week_item_states")
    .upsert(row, { onConflict: "user_id,item_key" });
  if (error) {
    console.error("[week/item] save failed", error.message);
    return storageUnavailable();
  }
  return NextResponse.json({ ok: true });
}
