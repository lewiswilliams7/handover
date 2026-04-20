import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

/** Stripe subscription shape varies by API version; period end is always present on active subs. */
function subscriptionPeriodEndUnix(sub: unknown): number | null {
  if (!sub || typeof sub !== "object") return null;
  const end = (sub as { current_period_end?: unknown }).current_period_end;
  return typeof end === "number" ? end : null;
}

/** GET  -  renewal date for the logged-in user's active Stripe subscription. */
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
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    const stripeCustomerId =
      typeof profile?.stripe_customer_id === "string" && profile.stripe_customer_id.trim()
        ? profile.stripe_customer_id.trim()
        : null;

    if (!stripeCustomerId || !process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ renewalDate: null, status: null });
    }

    const stripe = getStripe();
    const activeSubs = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: "active",
      limit: 1,
    });
    let sub = activeSubs.data[0];
    if (!sub) {
      const trialingSubs = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: "trialing",
        limit: 1,
      });
      sub = trialingSubs.data[0];
    }
    const endUnix = sub ? subscriptionPeriodEndUnix(sub) : null;
    const renewalDate =
      endUnix !== null
        ? new Date(endUnix * 1000).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : null;

    return NextResponse.json({
      renewalDate,
      status: sub?.status ?? null,
    });
  } catch (e) {
    console.error("[referrals/subscription-status]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
