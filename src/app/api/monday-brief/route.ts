import { NextResponse } from "next/server";

import { isMissingTableError } from "@/lib/manual-client-values";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Turn the Monday Brief email on or off for the signed-in user. */
export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { enabled?: unknown } | null;
  if (typeof body?.enabled !== "boolean") {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }
  const { error } = await supabase
    .from("monday_brief_settings")
    .upsert(
      { user_id: user.id, enabled: body.enabled, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  if (isMissingTableError(error)) {
    return NextResponse.json({ ok: false, error: "brief_unavailable" }, { status: 503 });
  }
  if (error) return NextResponse.json({ ok: false, error: "save_failed" }, { status: 500 });
  return NextResponse.json({ ok: true, enabled: body.enabled });
}
