import { NextResponse } from "next/server";

import { normalizeReferralCode } from "@/lib/referral";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** Public: validate code and return referrer first name (for landing page). */
export async function GET(request: Request) {
  try {
    const code = new URL(request.url).searchParams.get("code");
    const normalized = normalizeReferralCode(code ?? "");
    if (!normalized) {
      return NextResponse.json({ valid: false, firstName: null });
    }

    const admin = createServiceRoleClient();
    const { data: row } = await admin
      .from("referral_codes")
      .select("user_id")
      .eq("code", normalized)
      .maybeSingle();

    if (!row?.user_id) {
      return NextResponse.json({ valid: false, firstName: null });
    }

    const { data: prof } = await admin
      .from("profiles")
      .select("first_name")
      .eq("id", row.user_id)
      .maybeSingle();

    const firstName =
      typeof prof?.first_name === "string" && prof.first_name.trim()
        ? prof.first_name.trim()
        : null;

    return NextResponse.json({ valid: true, firstName });
  } catch (e) {
    console.error("[referrals/lookup]", e);
    return NextResponse.json({ valid: false, firstName: null }, { status: 500 });
  }
}
