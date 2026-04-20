import { NextResponse } from "next/server";

import { normalizeReferralCode } from "@/lib/referral";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 40;
const ipBuckets = new Map<string, { count: number; resetAt: number }>();

function clientIp(request: Request): string {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}

function allowRate(ip: string): boolean {
  const now = Date.now();
  const b = ipBuckets.get(ip);
  if (!b || now > b.resetAt) {
    ipBuckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (b.count >= MAX_PER_WINDOW) return false;
  b.count += 1;
  return true;
}

/** Public: increment referral_codes.click_count (best-effort IP rate limit). */
export async function POST(request: Request) {
  try {
    if (!allowRate(clientIp(request))) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    }

    let body: { code?: string } = {};
    try {
      body = (await request.json()) as { code?: string };
    } catch {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const normalized = normalizeReferralCode(body.code ?? "");
    if (!normalized) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    const { data: row } = await admin
      .from("referral_codes")
      .select("click_count")
      .eq("code", normalized)
      .maybeSingle();

    if (!row) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    const next = (typeof row.click_count === "number" ? row.click_count : 0) + 1;
    const { error } = await admin
      .from("referral_codes")
      .update({ click_count: next })
      .eq("code", normalized);

    if (error) {
      console.error("[referrals/track-click] update:", error);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[referrals/track-click]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
