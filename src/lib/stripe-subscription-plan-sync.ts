import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

import { mirrorOwnerBillingToWorkspaces } from "@/lib/server/workspace-billing";

import {
  isKnownEnterpriseStripePriceId,
  STRIPE_PRICE_IDS,
} from "@/lib/stripe-price-ids";
import {
  clampTeamSeatCount,
  getUserPlan,
  hasProTierAccess,
  teamGenerationLimitForSeats,
} from "@/lib/utils/getPlan";

const PAID_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
]);

export function stripeSubscriptionIsPaid(sub: Stripe.Subscription): boolean {
  return PAID_SUBSCRIPTION_STATUSES.has(sub.status);
}

function mapProfileSubscriptionStatus(sub: Stripe.Subscription): string {
  if (sub.status === "active") return "active";
  if (sub.status === "trialing") return "trialing";
  if (sub.status === "past_due") return "past_due";
  return "inactive";
}

function stripeTrialEndsAtIso(sub: Stripe.Subscription): string | null {
  if (typeof sub.trial_end !== "number") return null;
  return new Date(sub.trial_end * 1000).toISOString();
}

function priceIdsFromSubscription(sub: Stripe.Subscription): string[] {
  const out: string[] = [];
  for (const item of sub.items.data) {
    const p = item.price;
    if (typeof p === "string") out.push(p);
    else if (p && typeof p === "object" && "id" in p && typeof (p as { id: unknown }).id === "string") {
      out.push((p as { id: string }).id);
    }
  }
  return out;
}

function mapTeamSubscriptionStatus(sub: Stripe.Subscription): string {
  if (sub.status === "canceled" || sub.status === "unpaid" || sub.status === "incomplete_expired") {
    return "cancelled";
  }
  if (sub.status === "past_due") return "past_due";
  if (sub.status === "trialing") return "trialing";
  if (sub.status === "active") return "active";
  return "inactive";
}

async function customerHasOtherPaidSubscription(
  stripe: Stripe,
  customerId: string,
  exceptSubscriptionId: string,
): Promise<boolean> {
  const list = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 30,
  });
  for (const s of list.data) {
    if (s.id === exceptSubscriptionId) continue;
    if (stripeSubscriptionIsPaid(s)) return true;
  }
  return false;
}

/**
 * Applies a Stripe subscription to `profiles` / `teams` so `profiles.plan` matches billing.
 * Safe for `customer.subscription.created` and `customer.subscription.updated`.
 */
export async function syncProfilesPlanFromStripeSubscription(
  supabase: SupabaseClient,
  stripe: Stripe,
  subscription: Stripe.Subscription,
): Promise<void> {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null;
  if (!customerId) return;

  const metaPlan = subscription.metadata?.plan?.trim().toLowerCase() ?? "";
  const isTeamSub = metaPlan === "team";
  const enterpriseFromStripePrice = priceIdsFromSubscription(subscription).some((id) =>
    isKnownEnterpriseStripePriceId(id),
  );
  const isEnterpriseSub = metaPlan === "enterprise" || enterpriseFromStripePrice;
  const currentHandoverPriceIds = new Set(
    [
      STRIPE_PRICE_IDS.handover.monthly,
      STRIPE_PRICE_IDS.handover.annual,
      STRIPE_PRICE_IDS.starterProgramme.monthly,
      STRIPE_PRICE_IDS.starterProgramme.annual,
    ].filter(Boolean),
  );
  const isHandoverSub =
    metaPlan === "handover" ||
    metaPlan === "starter_programme" ||
    priceIdsFromSubscription(subscription).some((id) => currentHandoverPriceIds.has(id));

  if (isTeamSub) {
    const { data: team } = await supabase
      .from("teams")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();

    if (!team?.id) {
      return;
    }

    const qty = subscription.items?.data?.[0]?.quantity;
    const seats =
      typeof qty === "number"
        ? clampTeamSeatCount(qty)
        : clampTeamSeatCount(parseInt(subscription.metadata?.seats ?? "3", 10));
    const generationLimit = teamGenerationLimitForSeats(seats);
    const teamSubStatus = mapTeamSubscriptionStatus(subscription);

    await supabase
      .from("teams")
      .update({
        seat_limit: seats,
        generation_limit: generationLimit,
        subscription_status: teamSubStatus,
      })
      .eq("id", team.id);

    if (stripeSubscriptionIsPaid(subscription)) {
      const subStat = mapProfileSubscriptionStatus(subscription);
      const isTrialing = subscription.status === "trialing";
      await supabase
        .from("profiles")
        .update({
          plan: isTrialing ? "team_trial" : "team",
          subscription_status: subStat,
          stripe_customer_id: customerId,
          trial_ends_at: isTrialing ? stripeTrialEndsAtIso(subscription) : null,
          trial_plan: isTrialing ? "team" : null,
        })
        .eq("team_id", team.id);
      console.log("[stripe plan sync] team subscription → profiles.plan=team", {
        subscriptionId: subscription.id,
        teamId: team.id,
        status: subscription.status,
      });
    }
    return;
  }

  const userIdFromMeta =
    typeof subscription.metadata?.user_id === "string" &&
    subscription.metadata.user_id.trim()
      ? subscription.metadata.user_id.trim()
      : null;

  let profileId: string | null = userIdFromMeta;
  if (!profileId) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    profileId = typeof prof?.id === "string" ? prof.id : null;
  }

  if (!profileId) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, team_id")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile?.id) return;
  /**
   * Profiles on a workspace are skipped (their access comes from the workspace),
   * except the owner of a Handover workspace: they pay for it, so their own
   * subscription drives their profile and, via the mirror, every member.
   */
  const ownsHandoverWorkspace = profile.team_id
    ? await profileOwnsHandoverWorkspace(supabase, profileId, String(profile.team_id))
    : false;
  if (profile.team_id && !ownsHandoverWorkspace) {
    return;
  }

  const paid = stripeSubscriptionIsPaid(subscription);
  const isTrialing = subscription.status === "trialing";
  const planValue:
    | "professional_trial"
    | "professional"
    | "handover"
    | "enterprise"
    | "free" = !paid
    ? "free"
    : isTrialing
      ? "professional_trial"
      : isEnterpriseSub
        ? "enterprise"
        : isHandoverSub
          ? "handover"
          : "professional";

  if (paid) {
    await supabase
      .from("profiles")
      .update({
        plan: planValue,
        stripe_customer_id: customerId,
        subscription_status: mapProfileSubscriptionStatus(subscription),
        trial_ends_at: isTrialing ? stripeTrialEndsAtIso(subscription) : null,
        trial_plan: isTrialing ? "professional" : null,
      })
      .eq("id", profileId);
    await mirrorOwnerBillingOrThrow(supabase, profileId);
    console.log("[stripe plan sync] solo subscription → profiles.plan", {
      subscriptionId: subscription.id,
      profileId,
      plan: planValue,
      status: subscription.status,
      enterpriseFromMetadataOrPrice: isEnterpriseSub,
    });
    return;
  }

  const otherPaid = await customerHasOtherPaidSubscription(
    stripe,
    customerId,
    subscription.id,
  );
  if (otherPaid) {
    console.log("[stripe plan sync] skip profile downgrade (other paid subscription)", {
      subscriptionId: subscription.id,
      profileId,
    });
    return;
  }

  await supabase
    .from("profiles")
    .update({
      plan: "free",
      subscription_status: "inactive",
    })
    .eq("id", profileId);
  await mirrorOwnerBillingOrThrow(supabase, profileId);
  console.log("[stripe plan sync] solo subscription ended → profiles.plan=free", {
    subscriptionId: subscription.id,
    profileId,
    status: subscription.status,
  });
}

/**
 * If `profiles` shows no paid access but Stripe has an active subscription, sync the row.
 * Called from the authenticated reconcile API after sign-in / refresh.
 */
export async function reconcileUserPlanWithStripe(
  supabase: SupabaseClient,
  stripe: Stripe,
  userId: string,
): Promise<{
  updated: boolean;
  plan: string | null;
  team_id: string | null;
}> {
  const initial = await getUserPlan(supabase, userId);
  const { data: stripeRow, error } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();

  if (error || !stripeRow) {
    return { updated: false, plan: initial.plan, team_id: initial.team_id };
  }

  if (hasProTierAccess(initial)) {
    return {
      updated: false,
      plan: initial.plan,
      team_id: initial.team_id,
    };
  }

  const cust =
    typeof stripeRow.stripe_customer_id === "string"
      ? stripeRow.stripe_customer_id.trim()
      : "";
  if (!cust) {
    return {
      updated: false,
      plan: initial.plan,
      team_id: initial.team_id,
    };
  }

  const subs = await stripe.subscriptions.list({
    customer: cust,
    status: "all",
    limit: 30,
  });
  const paidSubs = subs.data.filter(stripeSubscriptionIsPaid);
  if (paidSubs.length === 0) {
    return {
      updated: false,
      plan: initial.plan,
      team_id: initial.team_id,
    };
  }

  paidSubs.sort((a, b) => b.created - a.created);
  await syncProfilesPlanFromStripeSubscription(supabase, stripe, paidSubs[0]);

  const refetched = await getUserPlan(supabase, userId);

  return {
    updated: true,
    plan: refetched.plan,
    team_id: refetched.team_id,
  };
}

async function profileOwnsHandoverWorkspace(
  supabase: SupabaseClient,
  profileId: string,
  teamId: string,
): Promise<boolean> {
  const { data: team } = await supabase
    .from("teams")
    .select("owner_id, plan")
    .eq("id", teamId)
    .maybeSingle();
  const plan = typeof team?.plan === "string" ? team.plan.trim().toLowerCase() : "";
  return team?.owner_id === profileId && (plan === "handover" || plan === "starter_programme");
}

/** Throws so the webhook returns 500 and Stripe retries the event. */
async function mirrorOwnerBillingOrThrow(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<void> {
  const error = await mirrorOwnerBillingToWorkspaces(supabase, [ownerId]);
  if (error) throw new Error(`[stripe plan sync] workspace mirror failed: ${error}`);
}
