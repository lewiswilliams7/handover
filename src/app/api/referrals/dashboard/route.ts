import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ReferralRow = {
  id: string;
  referred_email: string | null;
  status: string;
  created_at: string;
  referred_signed_up_at: string | null;
  referred_converted_at: string | null;
  reward_applied_at: string | null;
  stripe_coupon_applied: string | null;
};

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;
    console.log("[referrals/dashboard] userId:", userId);

    const serviceSupabase = createServiceRoleClient();

    const { data: allCodes } = await serviceSupabase
      .from("referral_codes")
      .select("user_id, code")
      .limit(10);
    console.log("[referrals/dashboard] all codes in table:", allCodes);

    const { data: codeData, error: codeError } = await serviceSupabase
      .from("referral_codes")
      .select("code, click_count, created_at")
      .eq("user_id", userId)
      .maybeSingle();

    console.log("[referrals/dashboard] code fetch:", { codeData, codeError, userId });

    const { data: referralsDataRaw, error: referralsError } = await serviceSupabase
      .from("referrals")
      .select(
        "id, referred_email, status, created_at, referred_signed_up_at, referred_converted_at, reward_applied_at, stripe_coupon_applied",
      )
      .eq("referrer_id", userId)
      .order("created_at", { ascending: false });

    if (referralsError) {
      console.error("[referrals/dashboard] referrals error:", referralsError);
      return NextResponse.json({ error: "Failed to load referrals" }, { status: 500 });
    }

    const referralsData = (referralsDataRaw ?? []) as ReferralRow[];

    return NextResponse.json({
      code: codeData?.code ?? null,
      clickCount: codeData?.click_count ?? 0,
      referrals: referralsData ?? [],
      stats: {
        clicked: codeData?.click_count ?? 0,
        signedUp: referralsData?.filter((r) => r.status !== "pending").length ?? 0,
        converted:
          referralsData?.filter((r) => r.status === "converted" || r.status === "rewarded")
            .length ?? 0,
        earned: (referralsData?.filter((r) => r.status === "rewarded").length ?? 0) * 105,
      },
    });
  } catch (e) {
    console.error("[referrals/dashboard]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
