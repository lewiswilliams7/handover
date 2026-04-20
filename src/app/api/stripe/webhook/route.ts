import { NextResponse } from "next/server";
import type Stripe from "stripe";

import {
  syncProfilesPlanFromStripeSubscription,
} from "@/lib/stripe-subscription-plan-sync";
import { clampTeamSeatCount, teamGenerationLimitForSeats } from "@/lib/utils/getPlan";
import { sendReferralRewardEmail } from "@/lib/emails";
import { buildHandoverResendFromHeader } from "@/lib/resend-from-header";
import { ensureReferralCodeForPayingUser } from "@/lib/referral-server";
import {
  ensureReferrerRewardCoupon,
  ensureWelcomeReferralCoupon,
  verifyOrApplySubscriptionCoupon,
} from "@/lib/stripe-referral-coupons";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET");
    return NextResponse.json(
      { error: "Webhook not configured." },
      { status: 500 },
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const stripe = getStripe();

  const confirmWelcomeCouponAndEnsureReferralCode = async (
    userId: string,
    usedWelcomeCoupon: boolean,
    subscriptionId: string | null,
  ) => {
    if (usedWelcomeCoupon) {
      const couponId = await ensureWelcomeReferralCoupon(stripe);
      if (couponId && subscriptionId) {
        const ok = await verifyOrApplySubscriptionCoupon(
          stripe,
          subscriptionId,
          couponId,
        );
        if (ok) {
          await supabase
            .from("profiles")
            .update({ welcome_coupon_used: true })
            .eq("id", userId);
        } else {
          console.error(
            "[webhook] welcome: subscription does not have referral coupon after apply",
            userId,
            subscriptionId,
          );
        }
      } else {
        console.error(
          "[webhook] welcome: missing coupon or subscription id",
          userId,
          { couponId: Boolean(couponId), subscriptionId },
        );
      }
    }
    await ensureReferralCodeForPayingUser(supabase, userId);
  };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription") {
          const userId =
            session.metadata?.user_id ?? session.client_reference_id ?? null;
          const customerId =
            typeof session.customer === "string"
              ? session.customer
              : session.customer && typeof session.customer !== "string"
                ? session.customer.id
                : null;

          if (!userId || !customerId) {
            break;
          }
          const usedWelcomeCoupon = session.metadata?.referral_welcome === "true";
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription && typeof session.subscription !== "string"
                ? session.subscription.id
                : null;

          if (session.metadata?.plan === "team") {
            const teamName =
              typeof session.metadata.team_name === "string" &&
              session.metadata.team_name.trim()
                ? session.metadata.team_name.trim()
                : "My Team";

            let seats = clampTeamSeatCount(
              parseInt(session.metadata?.seats ?? "3", 10),
            );
            if (subscriptionId) {
              try {
                const sub = await stripe.subscriptions.retrieve(subscriptionId);
                const qty = sub.items?.data?.[0]?.quantity;
                if (typeof qty === "number") {
                  seats = clampTeamSeatCount(qty);
                }
              } catch (e) {
                console.error(
                  "[webhook] checkout team: could not load subscription for seat count",
                  e,
                );
              }
            }
            const generationLimit = teamGenerationLimitForSeats(seats);

            const { data: existingProf } = await supabase
              .from("profiles")
              .select("team_id")
              .eq("id", userId)
              .maybeSingle();

            if (existingProf?.team_id) {
              console.log(
                "[webhook] checkout team: profile already has team_id, skipping team create",
                userId,
              );
              await confirmWelcomeCouponAndEnsureReferralCode(
                userId,
                usedWelcomeCoupon,
                subscriptionId,
              );
              break;
            }

            const { data: team, error: teamInsErr } = await supabase
              .from("teams")
              .insert({
                name: teamName,
                plan: "team",
                stripe_customer_id: customerId,
                subscription_status: "active",
                owner_id: userId,
                generation_limit: generationLimit,
                seat_limit: seats,
              })
              .select()
              .single();

            if (teamInsErr || !team?.id) {
              console.error("teams insert (checkout team):", teamInsErr);
              return NextResponse.json(
                { error: "Database update failed" },
                { status: 500 },
              );
            }

            const { error: memErr } = await supabase.from("team_members").insert({
              team_id: team.id,
              user_id: userId,
              role: "owner",
              invited_by: userId,
              permissions: {},
            });

            if (memErr) {
              console.error("team_members insert (checkout team):", memErr);
              await supabase.from("teams").delete().eq("id", team.id);
              return NextResponse.json(
                { error: "Database update failed" },
                { status: 500 },
              );
            }

            const { error: profErr } = await supabase
              .from("profiles")
              .update({
                plan: "team",
                team_id: team.id,
                stripe_customer_id: customerId,
                subscription_status: "active",
                trial_ends_at: null,
                trial_plan: null,
              })
              .eq("id", userId);

            if (profErr) {
              console.error("profiles update (checkout team):", profErr);
              return NextResponse.json(
                { error: "Database update failed" },
                { status: 500 },
              );
            }
            await confirmWelcomeCouponAndEnsureReferralCode(
              userId,
              usedWelcomeCoupon,
              subscriptionId,
            );
          } else {
            /** Solo Professional checkout: end in-app trial columns; plan + Stripe sync follow subscription events. */
            const { error } = await supabase
              .from("profiles")
              .update({
                plan: "professional",
                stripe_customer_id: customerId,
                trial_ends_at: null,
                trial_plan: null,
              })
              .eq("id", userId);

            if (error) {
              console.error("profiles update (checkout):", error);
              return NextResponse.json(
                { error: "Database update failed" },
                { status: 500 },
              );
            }
            await confirmWelcomeCouponAndEnsureReferralCode(
              userId,
              usedWelcomeCoupon,
              subscriptionId,
            );
          }
        }
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.billing_reason !== "subscription_cycle") {
          break;
        }
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer && typeof invoice.customer !== "string"
              ? invoice.customer.id
              : null;
        if (!customerId) break;

        const { data: payProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        const referredUserId =
          payProfile && typeof payProfile.id === "string" ? payProfile.id : null;
        if (!referredUserId) break;

        const { data: referral } = await supabase
          .from("referrals")
          .select("id, referrer_id, status")
          .eq("referred_id", referredUserId)
          .eq("status", "signed_up")
          .maybeSingle();

        if (!referral?.id || !referral.referrer_id) break;

        const rewardCouponId = await ensureReferrerRewardCoupon(stripe);
        if (!rewardCouponId) {
          console.warn("[webhook] referral reward: could not ensure reward coupon");
          break;
        }

        const referrerId = referral.referrer_id as string;
        const convertedAt = new Date().toISOString();

        const { data: referrerProfile } = await supabase
          .from("profiles")
          .select("stripe_customer_id")
          .eq("id", referrerId)
          .maybeSingle();

        const refCust =
          typeof referrerProfile?.stripe_customer_id === "string"
            ? referrerProfile.stripe_customer_id
            : null;

        if (!refCust) {
          console.warn(
            "[webhook] referral reward: referrer has no stripe_customer_id",
            referrerId,
          );
          await supabase
            .from("referrals")
            .update({
              status: "converted",
              referred_converted_at: convertedAt,
            })
            .eq("id", referral.id);
          break;
        }

        try {
          const subs = await stripe.subscriptions.list({
            customer: refCust,
            status: "active",
            limit: 5,
          });
          const sub = subs.data[0];
          if (!sub?.id) {
            console.warn(
              "[webhook] referral reward: no active subscription for referrer",
              referrerId,
            );
            await supabase
              .from("referrals")
              .update({
                status: "converted",
                referred_converted_at: convertedAt,
              })
              .eq("id", referral.id);
            break;
          }

          const applied = await verifyOrApplySubscriptionCoupon(
            stripe,
            sub.id,
            rewardCouponId,
          );
          if (!applied) {
            console.error(
              "[webhook] referral reward: coupon not on subscription after apply",
              referral.id,
              sub.id,
            );
            break;
          }

          await supabase
            .from("referrals")
            .update({
              status: "rewarded",
              referred_converted_at: convertedAt,
              reward_applied_at: convertedAt,
              stripe_coupon_applied: rewardCouponId,
            })
            .eq("id", referral.id);

          const { data: adminUser, error: adminUserErr } =
            await supabase.auth.admin.getUserById(referrerId);
          if (adminUserErr) {
            console.error("[webhook] referral reward: getUserById", adminUserErr);
          } else {
            const email = adminUser.user?.email?.trim();
            if (email) {
              try {
                const { data: refProfile } = await supabase
                  .from("profiles")
                  .select("display_name, first_name, last_name, company_name, brand_name")
                  .eq("id", referrerId)
                  .maybeSingle();
                await sendReferralRewardEmail(email, {
                  from: buildHandoverResendFromHeader(refProfile),
                });
              } catch (mailErr) {
                console.error("[webhook] referral reward email:", mailErr);
              }
            }
          }
        } catch (stripeErr) {
          console.error("[webhook] referral reward Stripe:", stripeErr);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        try {
          await syncProfilesPlanFromStripeSubscription(
            supabase,
            stripe,
            subscription,
          );
          if (event.type === "customer.subscription.updated") {
            console.log("[webhook] customer.subscription.updated plan sync OK", {
              subscriptionId: subscription.id,
              status: subscription.status,
              metadataPlan: subscription.metadata?.plan ?? null,
            });
          }
        } catch (syncErr) {
          console.error(
            "[webhook] subscription plan sync failed:",
            subscription.id,
            syncErr,
          );
          return NextResponse.json(
            { error: "Database update failed" },
            { status: 500 },
          );
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer && typeof subscription.customer !== "string"
              ? subscription.customer.id
              : null;

        if (!customerId) {
          break;
        }

        if (subscription.metadata?.plan === "team") {
          const { data: team } = await supabase
            .from("teams")
            .select("id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();

          if (team?.id) {
            const { error: teamUpdErr } = await supabase
              .from("teams")
              .update({ subscription_status: "cancelled" })
              .eq("id", team.id);

            if (teamUpdErr) {
              console.error("teams update (subscription deleted team):", teamUpdErr);
              return NextResponse.json(
                { error: "Database update failed" },
                { status: 500 },
              );
            }

            const { data: members, error: memQErr } = await supabase
              .from("team_members")
              .select("user_id")
              .eq("team_id", team.id);

            if (memQErr) {
              console.error("team_members select (subscription deleted):", memQErr);
              return NextResponse.json(
                { error: "Database update failed" },
                { status: 500 },
              );
            }

            for (const m of members ?? []) {
              const uid = m.user_id as string;
              const { error: pErr } = await supabase
                .from("profiles")
                .update({ plan: "free", team_id: null })
                .eq("id", uid);
              if (pErr) {
                console.error("profiles update (team cancel member):", pErr);
                return NextResponse.json(
                  { error: "Database update failed" },
                  { status: 500 },
                );
              }
            }
          }
        } else {
          const { error } = await supabase
            .from("profiles")
            .update({ plan: "free" })
            .eq("stripe_customer_id", customerId);

          if (error) {
            console.error("profiles update (subscription deleted):", error);
            return NextResponse.json(
              { error: "Database update failed" },
              { status: 500 },
            );
          }
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("Webhook handler error:", e);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
