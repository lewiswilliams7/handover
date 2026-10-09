import { NextResponse } from "next/server";

import { getAppOrigin } from "@/lib/app-url";
import { ensureWelcomeReferralCoupon } from "@/lib/stripe-referral-coupons";
import { STRIPE_PRICE_IDS } from "@/lib/stripe-price-ids";
import { createServerClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

type CheckoutBody = {
  priceId?: string;
};

function configuredHandoverPriceIds(): string[] {
  return [
    STRIPE_PRICE_IDS.handover.monthly,
    STRIPE_PRICE_IDS.handover.annual,
  ].filter((id): id is string => Boolean(id));
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id || !user.email) {
      return NextResponse.json(
        { error: "Sign in before purchasing Handover." },
        { status: 401 },
      );
    }

    let body: CheckoutBody = {};
    try {
      if (request.headers.get("content-type")?.includes("application/json")) {
        body = (await request.json()) as CheckoutBody;
      }
    } catch {
      body = {};
    }

    const allowedPriceIds = configuredHandoverPriceIds();
    const priceId =
      typeof body.priceId === "string" && body.priceId.trim()
        ? body.priceId.trim()
        : STRIPE_PRICE_IDS.handover.monthly;

    if (!priceId || !allowedPriceIds.includes(priceId)) {
      return NextResponse.json(
        { error: "Handover pricing is not configured." },
        { status: 400 },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("company_name, referred_by, welcome_coupon_used, stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      console.error("[stripe/checkout] profile read:", profileError);
      return NextResponse.json({ error: "Could not load billing profile." }, { status: 500 });
    }

    const stripe = getStripe();
    let customerId =
      typeof profile?.stripe_customer_id === "string" && profile.stripe_customer_id.trim()
        ? profile.stripe_customer_id.trim()
        : null;

    if (!customerId) {
      const candidates = await stripe.customers.list({ email: user.email, limit: 10 });
      const matched =
        candidates.data.find((customer) => customer.metadata?.supabase_user_id === user.id) ??
        candidates.data[0] ??
        null;

      if (matched) {
        customerId = matched.id;
        if (matched.metadata?.supabase_user_id !== user.id) {
          await stripe.customers.update(matched.id, {
            metadata: {
              ...(matched.metadata ?? {}),
              supabase_user_id: user.id,
            },
          });
        }
      } else {
        const created = await stripe.customers.create({
          email: user.email,
          metadata: { supabase_user_id: user.id },
        });
        customerId = created.id;
      }

      const { error: saveError } = await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
      if (saveError) {
        console.error("[stripe/checkout] customer save:", saveError);
        return NextResponse.json({ error: "Could not save billing customer." }, { status: 500 });
      }
    }

    const referredBy =
      typeof profile?.referred_by === "string" && profile.referred_by.trim().length > 0;
    const welcomeCoupon =
      referredBy && profile?.welcome_coupon_used !== true
        ? await ensureWelcomeReferralCoupon(stripe)
        : null;
    const referralDiscount = welcomeCoupon
      ? { discounts: [{ coupon: welcomeCoupon }] }
      : { allow_promotion_codes: true };

    const origin = getAppOrigin();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      metadata: {
        plan: "handover",
        user_id: user.id,
      },
      subscription_data: {
        metadata: {
          plan: "handover",
          user_id: user.id,
        },
      },
      success_url: `${origin}/?billing=success`,
      cancel_url: `${origin}/pricing`,
      ...referralDiscount,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Could not create checkout session." }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[stripe/checkout]", error);
    return NextResponse.json({ error: "Could not start checkout." }, { status: 500 });
  }
}
