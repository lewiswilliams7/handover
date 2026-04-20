import type Stripe from "stripe";

const META_WELCOME = "handover_referral_welcome";
const META_REWARD = "handover_referral_reward";

function couponIdsFromDiscounts(sub: Stripe.Subscription): string[] {
  const out: string[] = [];
  for (const d of sub.discounts ?? []) {
    if (typeof d === "string") continue;
    const src = d.source;
    if (!src) continue;
    const c = src.coupon;
    if (typeof c === "string") out.push(c);
    else if (c && typeof c === "object" && "id" in c) {
      out.push(c.id);
    }
  }
  return out;
}

export function subscriptionHasCoupon(
  sub: Stripe.Subscription,
  couponId: string,
): boolean {
  return couponIdsFromDiscounts(sub).includes(couponId);
}

/**
 * 100% off for one monthly billing period (repeating × 1 month).
 * Works for monthly subs; env override via STRIPE_REFERRAL_WELCOME_COUPON when valid.
 */
export async function ensureWelcomeReferralCoupon(stripe: Stripe): Promise<string | null> {
  const envId = process.env.STRIPE_REFERRAL_WELCOME_COUPON?.trim();
  if (envId) {
    try {
      const c = await stripe.coupons.retrieve(envId);
      if (c.valid !== false) return c.id;
    } catch {
      console.warn(
        "[stripe-referral-coupons] STRIPE_REFERRAL_WELCOME_COUPON missing or invalid; using auto coupon",
      );
    }
  }

  const listed = await stripe.coupons.list({ limit: 100 });
  const existing = listed.data.find(
    (c) => c.metadata?.[META_WELCOME] === "1" && c.valid !== false,
  );
  if (existing) return existing.id;

  const created = await stripe.coupons.create({
    name: "Referral welcome - 1 month free",
    percent_off: 100,
    duration: "repeating",
    duration_in_months: 1,
    metadata: { [META_WELCOME]: "1" },
  });
  return created.id;
}

/** Referrer reward: same structure; env STRIPE_REFERRAL_REWARD_COUPON when valid. */
export async function ensureReferrerRewardCoupon(stripe: Stripe): Promise<string | null> {
  const envId = process.env.STRIPE_REFERRAL_REWARD_COUPON?.trim();
  if (envId) {
    try {
      const c = await stripe.coupons.retrieve(envId);
      if (c.valid !== false) return c.id;
    } catch {
      console.warn(
        "[stripe-referral-coupons] STRIPE_REFERRAL_REWARD_COUPON missing or invalid; using auto coupon",
      );
    }
  }

  const listed = await stripe.coupons.list({ limit: 100 });
  const existing = listed.data.find(
    (c) => c.metadata?.[META_REWARD] === "1" && c.valid !== false,
  );
  if (existing) return existing.id;

  const created = await stripe.coupons.create({
    name: "Referral reward - 1 month free (referrer)",
    percent_off: 100,
    duration: "repeating",
    duration_in_months: 1,
    metadata: { [META_REWARD]: "1" },
  });
  return created.id;
}

/**
 * Confirms the subscription has the coupon discount, or applies it and re-checks.
 */
export async function verifyOrApplySubscriptionCoupon(
  stripe: Stripe,
  subscriptionId: string,
  couponId: string,
): Promise<boolean> {
  const expandDiscounts = ["discounts", "discounts.source.coupon"] as const;

  let sub = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: [...expandDiscounts],
  });
  if (subscriptionHasCoupon(sub, couponId)) return true;

  try {
    await stripe.subscriptions.update(subscriptionId, {
      discounts: [{ coupon: couponId }],
    });
  } catch (e) {
    console.error("[stripe-referral-coupons] apply coupon failed", e);
    return false;
  }

  sub = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: [...expandDiscounts],
  });
  return subscriptionHasCoupon(sub, couponId);
}
