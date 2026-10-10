import { NextResponse } from "next/server";

import { requireScanDetailsEntitlement } from "@/lib/scan-entitlement";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COLUMNS = "id, client_id, client_name, email_to, enabled, last_sent_month, last_sent_at, last_error";

/** Postgres "relation does not exist": the table's migration has not been applied. */
function tableMissing(error: { code?: string } | null): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

async function authorise() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }) } as const;
  }
  const entitlementError = await requireScanDetailsEntitlement(user.id, supabase);
  if (entitlementError) return { error: entitlementError } as const;
  return { supabase, user } as const;
}

export async function GET() {
  const auth = await authorise();
  if ("error" in auth) return auth.error;
  const { data, error } = await auth.supabase
    .from("value_receipt_schedules")
    .select(COLUMNS)
    .eq("user_id", auth.user.id)
    .order("client_name");
  if (tableMissing(error)) {
    return NextResponse.json({ ok: false, error: "schedules_unavailable" }, { status: 503 });
  }
  if (error) return NextResponse.json({ ok: false, error: "read_failed" }, { status: 500 });
  return NextResponse.json({ ok: true, schedules: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await authorise();
  if ("error" in auth) return auth.error;
  const body = (await request.json().catch(() => ({}))) as {
    clientId?: unknown;
    clientName?: unknown;
    emailTo?: unknown;
    enabled?: unknown;
  };
  const clientId = Number(body.clientId);
  const clientName = typeof body.clientName === "string" ? body.clientName.trim().slice(0, 200) : "";
  const emailTo = typeof body.emailTo === "string" ? body.emailTo.trim().toLowerCase() : "";
  const enabled = body.enabled !== false;
  if (!Number.isSafeInteger(clientId) || clientId <= 0 || !clientName || !EMAIL_PATTERN.test(emailTo)) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }
  const { data, error } = await auth.supabase
    .from("value_receipt_schedules")
    .upsert(
      {
        user_id: auth.user.id,
        client_id: clientId,
        client_name: clientName,
        email_to: emailTo,
        enabled,
        last_error: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,client_id" },
    )
    .select(COLUMNS)
    .single();
  if (tableMissing(error)) {
    return NextResponse.json({ ok: false, error: "schedules_unavailable" }, { status: 503 });
  }
  if (error) return NextResponse.json({ ok: false, error: "write_failed" }, { status: 500 });
  return NextResponse.json({ ok: true, schedule: data });
}

export async function DELETE(request: Request) {
  const auth = await authorise();
  if ("error" in auth) return auth.error;
  const clientId = Number(new URL(request.url).searchParams.get("clientId"));
  if (!Number.isSafeInteger(clientId) || clientId <= 0) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }
  const { error } = await auth.supabase
    .from("value_receipt_schedules")
    .delete()
    .eq("user_id", auth.user.id)
    .eq("client_id", clientId);
  if (tableMissing(error)) {
    return NextResponse.json({ ok: false, error: "schedules_unavailable" }, { status: 503 });
  }
  if (error) return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
