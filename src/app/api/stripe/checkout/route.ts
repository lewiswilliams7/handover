import { NextResponse } from "next/server";

import { getAppOrigin } from "@/lib/app-url";
import { clampTeamSeatCount, TEAM_LIMITS } from "@/lib/plans";
import { ensureWelcomeReferralCoupon } from "@/lib/stripe-referral-coupons";
import { STRIPE_PRICE_IDS } from "@/lib/stripe-price-ids";
import { createServerClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";
import { normalizePlanLabel } from "@/lib/utils/getPlan";

/** Checkout `line_items` need a Price id. Accepts `price_…` or resolves the default one-time price from `prod_…`. */
async function resolveOnboardingCallStripePriceId(
  stripe: Stripe,
  raw: string,
): Promise<string | null> {
  const id = raw.trim();
  if (!id) return null;
  if (id.startsWith("price_")) return id;
  if (id.startsWith("prod_")) {
    const { data } = await stripe.prices.list({
      product: id,
      active: true,
      limit: 20,
    });
    const oneTime = data.find((p) => p.type === "one_time");
    return (oneTime ?? data[0])?.id ?? null;
  }
  return null;
}

export const runtime = "nodejs";

type CheckoutBody = {
  priceId?: string;
  seats?: string | number;
  /** Team checkout only: omit 14-day trial when true */
  skipTeamTrial?: boolean;
  /** Client hint: user is on an in-app trial (server profile is authoritative). */
  hasActiveTrial?: boolean;
  /** Add £99 one-time onboarding call line item (Professional / Team checkout only). */
  includeOnboardingCall?: boolean;
  /**
   * When true, never attach Stripe's 14-day subscription trial (immediate paid subscription).
   * Used for "Buy now" on pricing for users not on an in-app trial.
   */
  purchaseWithoutTrial?: boolean;
};

/** In-app Handover trial still running — Stripe subscription should charge immediately (no second trial). */
function hasActiveSoloAppTrialFromProfile(prof: {
  plan?: string | null;
  trial_ends_at?: string | null;
  trial_plan?: string | null;
} | null | undefined): boolean {
  if (!prof) return false;
  const end = prof.trial_ends_at;
  if (typeof end !== "string" || !end.trim()) return false;
  if (new Date(end).getTime() <= Date.now()) return false;
  const p = normalizePlanLabel(prof.plan ?? "");
  if (p === "professional_trial" || p === "team_trial") return true;
  if (p === "free" && typeof prof.trial_plan === "string" && prof.trial_plan.trim()) {
    return true;
  }
  return false;
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: _authError,
    } = await supabase.auth.getUser();

    let checkoutBody: CheckoutBody = {};
    try {
      const ct = request.headers.get("content-type");
      if (ct?.includes("application/json")) {
        checkoutBody = (await request.json()) as CheckoutBody;
      }
    } catch {
      // non-JSON or empty body  -  fall back to defaults
    }

    const monthlyPriceId =
      process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID ??
      process.env.STRIPE_PRO_MONTHLY_PRICE_ID ??
      process.env.STRIPE_PRO_PRICE_ID ??
      STRIPE_PRICE_IDS.professional.monthly;
    const annualPriceId =
      process.env.STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID ??
      process.env.STRIPE_PRO_ANNUAL_PRICE_ID ??
      STRIPE_PRICE_IDS.professional.annual;
    const teamMonthlyPriceId =
      process.env.STRIPE_TEAM_MONTHLY_PRICE_ID ??
      process.env.NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID ??
      STRIPE_PRICE_IDS.team.monthly;
    const teamAnnualPriceId =
      process.env.STRIPE_TEAM_ANNUAL_PRICE_ID ??
      process.env.NEXT_PUBLIC_STRIPE_TEAM_ANNUAL_PRICE_ID ??
      STRIPE_PRICE_IDS.team.annual;
    const onboardingCallConfig =
      process.env.STRIPE_ONBOARDING_CALL_PRICE_ID?.trim() ||
      process.env.NEXT_PUBLIC_STRIPE_ONBOARDING_CALL_PRICE_ID?.trim() ||
      "";

    const allowed = new Set(
      [monthlyPriceId, annualPriceId, teamMonthlyPriceId, teamAnnualPriceId].filter(
        (id): id is string => Boolean(id),
      ),
    );

    const bodyPriceId =
      typeof checkoutBody.priceId === "string" && checkoutBody.priceId.length > 0
        ? checkoutBody.priceId
        : undefined;

    const priceId = bodyPriceId ?? monthlyPriceId;

    if (!priceId || !allowed.has(priceId)) {
      return NextResponse.json(
        { error: "Invalid or missing price. Use a valid subscription price." },
        { status: 400 },
      );
    }

    const isTeamPrice =
      priceId === teamMonthlyPriceId || priceId === teamAnnualPriceId;
    if (isTeamPrice && !user?.id) {
      return NextResponse.json(
        { error: "Sign in to purchase a team plan." },
        { status: 401 },
      );
    }

    const seatsRaw = checkoutBody.seats;
    const parsedSeats =
      typeof seatsRaw === "number"
        ? seatsRaw
        : parseInt(String(seatsRaw ?? "1"), 10);
    const seats = clampTeamSeatCount(Number.isFinite(parsedSeats) ? parsedSeats : 1);
    const skipTeamTrial = checkoutBody.skipTeamTrial === true;
    const clientSaysActiveTrial = checkoutBody.hasActiveTrial === true;
    const includeOnboardingCall = checkoutBody.includeOnboardingCall === true;
    const purchaseWithoutTrial = checkoutBody.purchaseWithoutTrial === true;

    const teamAnnual = teamAnnualPriceId && priceId === teamAnnualPriceId;

    const stripe = getStripe();
    const origin = getAppOrigin();

    let companyName: string | null = null;
    let stripeCustomerId: string | null = null;
    let applyWelcomeCoupon = false;
    let welcomeCouponId: string | null = null;
    let profileForTrial: Parameters<typeof hasActiveSoloAppTrialFromProfile>[0] = null;

    if (user?.id) {
      const { data: prof } = await supabase
        .from("profiles")
        .select(
          "company_name, referred_by, welcome_coupon_used, stripe_customer_id, plan, trial_ends_at, trial_plan",
        )
        .eq("id", user.id)
        .maybeSingle();
      profileForTrial = prof;
      const rawCn = prof?.company_name;
      companyName = typeof rawCn === "string" && rawCn.trim() ? rawCn.trim() : null;
      const rawCust = prof?.stripe_customer_id;
      stripeCustomerId =
        typeof rawCust === "string" && rawCust.trim().length > 0 ? rawCust.trim() : null;

      const referredBy =
        typeof prof?.referred_by === "string" && prof.referred_by.trim().length > 0;
      const eligibleWelcome = referredBy && prof?.welcome_coupon_used !== true;
      if (eligibleWelcome) {
        welcomeCouponId = await ensureWelcomeReferralCoupon(stripe);
        applyWelcomeCoupon = Boolean(welcomeCouponId);
      }
    }

    const serverActiveTrial = hasActiveSoloAppTrialFromProfile(profileForTrial);
    if (clientSaysActiveTrial !== serverActiveTrial) {
      console.log("[stripe/checkout] hasActiveTrial hint vs profile", {
        client: clientSaysActiveTrial,
        server: serverActiveTrial,
        userId: user?.id ?? null,
      });
    }
    /** No second Stripe trial when already on Handover in-app trial (DB is source of truth). */
    const skipSubscriptionTrial = serverActiveTrial;
    /** Immediate purchase: no Stripe subscription trial period. */
    const noStripeSubscriptionTrial =
      skipSubscriptionTrial || purchaseWithoutTrial;

    const teamName = companyName ?? "My Team";
    const userId = user?.id ?? "";
    const billing =
      isTeamPrice && teamAnnual ? "annual" : isTeamPrice ? "monthly" : undefined;

    const customerOrEmail =
      stripeCustomerId !== null
        ? { customer: stripeCustomerId }
        : { customer_email: user?.email ?? undefined };

    const referralDiscount =
      applyWelcomeCoupon && welcomeCouponId
        ? {
            discounts: [{ coupon: welcomeCouponId }],
          }
        : { allow_promotion_codes: true };

    const trialDays = 14;
    const includeTeamStripeTrial =
      isTeamPrice && !skipTeamTrial && !noStripeSubscriptionTrial;
    const includeProfessionalStripeTrial =
      !isTeamPrice && !noStripeSubscriptionTrial;
    const anyStripeSubscriptionTrial =
      includeTeamStripeTrial || includeProfessionalStripeTrial;
    const paymentMethodCollection = (
      anyStripeSubscriptionTrial ? "if_required" : "always"
    ) as "if_required" | "always";

    let onboardingResolvedPriceId: string | null = null;
    if (includeOnboardingCall && onboardingCallConfig) {
      onboardingResolvedPriceId = await resolveOnboardingCallStripePriceId(
        stripe,
        onboardingCallConfig,
      );
      if (!onboardingResolvedPriceId) {
        console.error("[stripe/checkout] Could not resolve onboarding call Stripe price id", {
          config: onboardingCallConfig,
        });
        return NextResponse.json(
          { error: "Onboarding add-on is not available. Continue without it or contact support." },
          { status: 400 },
        );
      }
    }

    const onboardingExtra =
      includeOnboardingCall && onboardingResolvedPriceId
        ? [
            {
              price: onboardingResolvedPriceId,
              quantity: 1,
              adjustable_quantity: {
                enabled: true,
                minimum: 0,
                maximum: 1,
              },
            },
          ]
        : [];

    const session = await stripe.checkout.sessions.create(
      isTeamPrice
        ? {
            mode: "subscription",
            payment_method_collection: paymentMethodCollection,
            line_items: [
              {
                price: priceId,
                quantity: seats,
                adjustable_quantity: {
                  enabled: true,
                  minimum: 1,
                  maximum: TEAM_LIMITS.team.seats,
                },
              },
              ...onboardingExtra,
            ],
            success_url: applyWelcomeCoupon
              ? `${origin}/referral/status?success=true`
              : `${origin}/dashboard/team?success=true`,
            cancel_url: `${origin}/pricing`,
            ...customerOrEmail,
            client_reference_id: user?.id ?? undefined,
            billing_address_collection: "auto",
            custom_text: {
              submit: {
                message:
                  "For teams larger than 20, contact us for Enterprise pricing.",
              },
            },
            ...referralDiscount,
            metadata: {
              plan: "team",
              billing: billing ?? "monthly",
              team_name: teamName,
              user_id: userId,
              seats: String(seats),
              email: user?.email ?? "",
              referral_welcome: applyWelcomeCoupon ? "true" : "false",
            },
            subscription_data: {
              metadata: {
                plan: "team",
                user_id: userId,
                team_name: teamName,
                seats: String(seats),
                referral_welcome: applyWelcomeCoupon ? "true" : "false",
              },
              ...(includeTeamStripeTrial ? { trial_period_days: trialDays } : {}),
            },
          }
        : {
            mode: "subscription",
            payment_method_collection: paymentMethodCollection,
            line_items: [{ price: priceId, quantity: 1 }, ...onboardingExtra],
            success_url: applyWelcomeCoupon
              ? `${origin}/referral/status?success=true`
              : `${origin}/?success=true`,
            cancel_url: `${origin}/pricing`,
            ...customerOrEmail,
            client_reference_id: user?.id ?? undefined,
            billing_address_collection: "auto",
            ...referralDiscount,
            metadata: {
              plan: "professional",
              user_id: userId,
              email: user?.email ?? "",
              referral_welcome: applyWelcomeCoupon ? "true" : "false",
            },
            subscription_data: {
              ...(includeProfessionalStripeTrial
                ? { trial_period_days: trialDays }
                : {}),
              metadata: {
                plan: "professional",
                user_id: userId,
                email: user?.email ?? "",
                referral_welcome: applyWelcomeCoupon ? "true" : "false",
              },
            },
          },
    );

    if (!session.url) {
      return NextResponse.json(
        { error: "Could not create checkout session." },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("Stripe checkout error:", e);
    return NextResponse.json(
      { error: "Failed to start checkout." },
      { status: 500 },
    );
  }
}
