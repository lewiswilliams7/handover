import { NextResponse } from "next/server";

import { isMissingTableError } from "@/lib/manual-client-values";

/** The internal flag arrived in a later database update. */
function isMissingColumnError(error: { code?: string | null } | null | undefined): boolean {
  return error?.code === "42703" || error?.code === "PGRST204";
}
import { requireScanDetailsEntitlement } from "@/lib/scan-entitlement";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A fresh response each time: a Response body can only be sent once. */
function unavailable() {
  return NextResponse.json(
    {
      ok: false,
      error: "values_unavailable",
      message: "Saving is not available right now. Please try again in a little while.",
    },
    { status: 503 },
  );
}

async function authed() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }) } as const;
  const entitlement = await requireScanDetailsEntitlement(user.id, supabase);
  if (entitlement) return { error: entitlement } as const;
  return { supabase, user } as const;
}

export async function GET() {
  const auth = await authed();
  if ("error" in auth) return auth.error;
  const { data, error } = await auth.supabase
    .from("client_value_overrides")
    .select("client_id, client_name, monthly_value, is_internal, updated_at")
    .eq("user_id", auth.user.id)
    .order("client_name");
  if (isMissingTableError(error) || isMissingColumnError(error)) return unavailable();
  if (error) return NextResponse.json({ ok: false, error: "read_failed" }, { status: 500 });
  return NextResponse.json({
    ok: true,
    values: (data ?? []).map((row) => ({
      clientId: Number(row.client_id),
      clientName: row.client_name,
      monthlyValue: row.monthly_value == null ? null : Number(row.monthly_value),
      internal: row.is_internal === true,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await authed();
  if ("error" in auth) return auth.error;
  const body = (await request.json().catch(() => null)) as {
    clientId?: unknown;
    clientName?: unknown;
    monthlyValue?: unknown;
    internal?: unknown;
  } | null;
  const internal = body?.internal === true;
  const clientId = Number(body?.clientId);
  const monthlyValue = Number(body?.monthlyValue);
  const clientName = typeof body?.clientName === "string" ? body.clientName.trim().slice(0, 200) : "";
  if (!Number.isSafeInteger(clientId) || clientId <= 0) {
    return NextResponse.json({ ok: false, error: "invalid_client" }, { status: 400 });
  }
  if (!internal && (!Number.isFinite(monthlyValue) || monthlyValue <= 0 || monthlyValue >= 10_000_000)) {
    return NextResponse.json(
      { ok: false, error: "invalid_value", message: "Enter a monthly value above £0." },
      { status: 400 },
    );
  }
  const { error } = await auth.supabase.from("client_value_overrides").upsert(
    {
      user_id: auth.user.id,
      client_id: clientId,
      client_name: clientName,
      monthly_value: internal ? null : Math.round(monthlyValue * 100) / 100,
      ...(internal ? { is_internal: true } : { is_internal: false }),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,client_id" },
  );
  if (isMissingTableError(error) || isMissingColumnError(error)) return unavailable();
  if (error) return NextResponse.json({ ok: false, error: "save_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await authed();
  if ("error" in auth) return auth.error;
  const clientId = Number(new URL(request.url).searchParams.get("clientId"));
  if (!Number.isSafeInteger(clientId) || clientId <= 0) {
    return NextResponse.json({ ok: false, error: "invalid_client" }, { status: 400 });
  }
  const { error } = await auth.supabase
    .from("client_value_overrides")
    .delete()
    .eq("user_id", auth.user.id)
    .eq("client_id", clientId);
  if (isMissingTableError(error)) return unavailable();
  if (error) return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
