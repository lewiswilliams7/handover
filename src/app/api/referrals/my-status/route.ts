import { NextResponse } from "next/server";

import { normalizeReferralCode } from "@/lib/referral";
import { getUserPlan, userPlanHasProAccess } from "@/lib/utils/getPlan";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export type ReferralMyStatusJson = {
  referred: boolean;
  referrerFirstName: string | null;
  /** Same as referrerFirstName; resolved via referral_codes → profiles. */
  referrer_name: string | null;
  referralStatus: "pending" | "signed_up" | "converted" | "rewarded" | null;
  isPro: boolean;
  renewalDateIso: string | null;
  month2PaidAtIso: string | null;
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

    const admin = createServiceRoleClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_customer_id, referred_by")
      .eq("id", user.id)
      .maybeSingle();

    const planFields = await getUserPlan(admin, user.id);

    const referredBy =
      typeof profile?.referred_by === "string" && profile.referred_by.trim().length > 0
        ? profile.referred_by.trim()
        : null;

    if (!referredBy) {
      const body: ReferralMyStatusJson = {
        referred: false,
        referrerFirstName: null,
        referrer_name: null,
        referralStatus: null,
        isPro: false,
        renewalDateIso: null,
        month2PaidAtIso: null,
      };
      return NextResponse.json(body);
    }

    const { data: referral } = await admin
      .from("referrals")
      .select("referrer_id, status, referred_converted_at")
      .eq("referred_id", user.id)
      .maybeSingle();

    const referrerIdFromRow =
      referral && typeof referral.referrer_id === "string" ? referral.referrer_id : null;

    let referrerFirstName: string | null = null;
    const codeKey = normalizeReferralCode(referredBy);
    if (codeKey) {
      const { data: codeRow } = await admin
        .from("referral_codes")
        .select("user_id")
        .eq("code", codeKey)
        .maybeSingle();
      const referrerUserId =
        codeRow && typeof codeRow.user_id === "string" ? codeRow.user_id : null;
      if (referrerUserId) {
        const { data: refProf } = await admin
          .from("profiles")
          .select("first_name")
          .eq("id", referrerUserId)
          .maybeSingle();
        referrerFirstName =
          typeof refProf?.first_name === "string" && refProf.first_name.trim()
            ? refProf.first_name.trim()
            : null;
      }
    }
    if (!referrerFirstName && referrerIdFromRow) {
      const { data: refProf } = await admin
        .from("profiles")
        .select("first_name")
        .eq("id", referrerIdFromRow)
        .maybeSingle();
      referrerFirstName =
        typeof refProf?.first_name === "string" && refProf.first_name.trim()
          ? refProf.first_name.trim()
          : null;
    }

    const isPro = userPlanHasProAccess(planFields);

    let referralStatus: ReferralMyStatusJson["referralStatus"] = null;
    if (referredBy) {
      if (referral && typeof referral.status === "string") {
        const s = referral.status.trim().toLowerCase();
        if (
          s === "pending" ||
          s === "signed_up" ||
          s === "converted" ||
          s === "rewarded"
        ) {
          referralStatus = s;
        } else {
          referralStatus = "signed_up";
        }
      } else {
        referralStatus = "signed_up";
      }
    }

    const renewalDateIso: string | null = null;

    const convertedAtRaw = referral
      ? (referral as { referred_converted_at?: string | null }).referred_converted_at
      : null;
    const month2PaidAtIso =
      typeof convertedAtRaw === "string" && convertedAtRaw.trim()
        ? convertedAtRaw.trim()
        : null;

    const showMonth2Date =
      referralStatus === "converted" || referralStatus === "rewarded";

    const body: ReferralMyStatusJson = {
      referred: true,
      referrerFirstName,
      referrer_name: referrerFirstName,
      referralStatus,
      isPro,
      renewalDateIso,
      month2PaidAtIso: showMonth2Date ? month2PaidAtIso : null,
    };

    return NextResponse.json(body);
  } catch (e) {
    console.error("[referrals/my-status]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
