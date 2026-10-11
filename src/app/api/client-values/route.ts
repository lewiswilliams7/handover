import { NextResponse } from "next/server";

import { isMissingTableError } from "@/lib/manual-client-values";
import { requireScanDetailsEntitlement } from "@/lib/scan-entitlement";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A fresh response each time: a Response body can only be sent once. */
function unavailable() {
  return NextResponse.json(
    { ok: false, error: "values_unavailable", message: "Manual values are not switched on for your workspace yet." },
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
    .select("client_id, client_name, monthly_value, updated_at")
    .eq("user_id", auth.user.id)
    .order("client_name");
  if (isMissingTableError(error)) return unavailable();
  if (error) return NextResponse.json({ ok: false, error: "read_failed" }, { status: 500 });
  return NextResponse.json({
    ok: true,
    values: (data ?? []).map((row) => ({
      clientId: Number(row.client_id),
      clientName: row.client_name,
      monthlyValue: Number(row.monthly_value),
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
  } | null;
  const clientId = Number(body?.clientId);
  const monthlyValue = Number(body?.monthlyValue);
  const clientName = typeof body?.clientName === "string" ? body.clientName.trim().slice(0, 200) : "";
  if (!Number.isSafeInteger(clientId) || clientId <= 0) {
    return NextResponse.json({ ok: false, error: "invalid_client" }, { status: 400 });
  }
  if (!Number.isFinite(monthlyValue) || monthlyValue <= 0 || monthlyValue >= 10_000_000) {
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
      monthly_value: Math.round(monthlyValue * 100) / 100,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,client_id" },
  );
  if (isMissingTableError(error)) return unavailable();
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
