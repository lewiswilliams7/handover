import { NextResponse } from "next/server";

import { normalizeReferralCode } from "@/lib/referral";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** Increment link click count (referral landing / shared links). */
export async function POST(request: Request) {
  try {
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
      console.error("[referrals/track] update:", error);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[referrals/track]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
