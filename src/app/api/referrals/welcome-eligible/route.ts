import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** True when the user has a referral code on profile and has not yet used the welcome coupon. */
export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ eligible: false });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("referred_by, welcome_coupon_used")
      .eq("id", user.id)
      .maybeSingle();

    const referredBy =
      typeof profile?.referred_by === "string" && profile.referred_by.trim().length > 0;
    const eligible = referredBy && profile?.welcome_coupon_used !== true;

    return NextResponse.json({ eligible });
  } catch (e) {
    console.error("[referrals/welcome-eligible]", e);
    return NextResponse.json({ eligible: false }, { status: 500 });
  }
}
