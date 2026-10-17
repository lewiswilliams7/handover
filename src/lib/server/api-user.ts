import { NextResponse } from "next/server";

import { requireScanDetailsEntitlement } from "@/lib/scan-entitlement";
import { createServerClient } from "@/lib/supabase/server";

/** The signed-in, entitled user for an app API route, or the response to return instead. */
export async function requireAppUser(): Promise<{ userId: string; error: null } | { userId: null; error: NextResponse }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { userId: null, error: NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }) };
  const entitlementError = await requireScanDetailsEntitlement(user.id, supabase);
  if (entitlementError) return { userId: null, error: entitlementError };
  return { userId: user.id, error: null };
}

export function storageUnavailable() {
  return NextResponse.json(
    { ok: false, error: "storage_unavailable", message: "This can't be saved yet. Try again shortly." },
    { status: 503 },
  );
}

export function badRequest() {
  return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
}

/** A single line of free text, trimmed, or null. */
export function line(value: unknown, max: number): string | null | undefined {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.length > max || /[\r\n]/.test(trimmed)) return undefined;
  return trimmed || null;
}
