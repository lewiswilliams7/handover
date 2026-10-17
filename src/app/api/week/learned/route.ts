import { NextResponse } from "next/server";

import { badRequest, requireAppUser, storageUnavailable } from "@/lib/server/api-user";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Undo a "Handover learned" change: keep this kind of sign at full weight. */
export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (auth.error) return auth.error;
  const body = (await request.json().catch(() => null)) as { findingType?: unknown } | null;
  const findingType = typeof body?.findingType === "string" ? body.findingType : "";
  if (!/^[a-z_]{2,40}$/.test(findingType)) return badRequest();
  const { error } = await createServiceRoleClient()
    .from("signal_type_settings")
    .upsert(
      { user_id: auth.userId, finding_type: findingType, mode: "keep", updated_at: new Date().toISOString() },
      { onConflict: "user_id,finding_type" },
    );
  if (error) return storageUnavailable();
  return NextResponse.json({ ok: true });
}

/** Let Handover learn from this kind of sign again. */
export async function DELETE(request: Request) {
  const auth = await requireAppUser();
  if (auth.error) return auth.error;
  const findingType = new URL(request.url).searchParams.get("findingType") ?? "";
  if (!/^[a-z_]{2,40}$/.test(findingType)) return badRequest();
  const { error } = await createServiceRoleClient()
    .from("signal_type_settings")
    .delete()
    .eq("user_id", auth.userId)
    .eq("finding_type", findingType);
  if (error) return storageUnavailable();
  return NextResponse.json({ ok: true });
}
