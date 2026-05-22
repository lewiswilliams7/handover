import { NextResponse } from "next/server";

import { getAppOrigin } from "@/lib/app-url";
import { STRIPE_PRICE_IDS } from "@/lib/stripe-price-ids";
import { getStripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Body = {
  plan?: string;
};

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id || !user.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let body: Body = {};
    try {
      if (request.headers.get("content-type")?.includes("application/json")) {
        body = (await request.json()) as Body;
      }
    } catch {
      body = {};
    }

    const requestedPlan =
      typeof body.plan === "string" ? body.plan.trim().toLowerCase() : "";
    const plan: "professional" | "team" | null =
      requestedPlan === "professional"
        ? "professional"
        : requestedPlan === "team"
          ? "team"
          : null;
    if (!plan) {
      return NextResponse.json(
        { error: "Invalid plan. Use professional or team." },
        { status: 400 },
      );
    }

    const admin = createServiceRoleClient();
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("plan, trial_ends_at, stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();
    if (profileErr) {
      console.error("[stripe/trial-checkout] profile read:", profileErr);
      return NextResponse.json({ error: "Could not read profile." }, { status: 500 });
    }

    const currentPlan =
      typeof profile?.plan === "string" ? profile.plan.trim().toLowerCase() : "";
    const hasActiveTrial =
      typeof profile?.trial_ends_at === "string" &&
      profile.trial_ends_at.trim().length > 0 &&
      new Date(profile.trial_ends_at).getTime() > Date.now();
    if (hasActiveTrial || (currentPlan && currentPlan !== "free")) {
      return NextResponse.json(
        { error: "This account is not eligible for trial checkout." },
        { status: 403 },
      );
    }

    const stripe = getStripe();
    const configuredProPrice =
      process.env.STRIPE_PRO_PRICE_ID?.trim() || STRIPE_PRICE_IDS.professional.monthly;
    const configuredTeamPrice =
      process.env.STRIPE_TEAM_PRICE_ID?.trim() || STRIPE_PRICE_IDS.team.monthly;
    const priceId = plan === "team" ? configuredTeamPrice : configuredProPrice;

    if (!priceId) {
      return NextResponse.json(
        { error: "Missing Stripe price configuration for trial checkout." },
        { status: 500 },
      );
    }

    const existingCustomerId =
      typeof profile?.stripe_customer_id === "string" && profile.stripe_customer_id.trim()
        ? profile.stripe_customer_id.trim()
        : null;

    let customerId = existingCustomerId;
    if (!customerId) {
      const candidates = await stripe.customers.list({
        email: user.email,
        limit: 10,
      });
      const matchedCustomer =
        candidates.data.find((c) => c.metadata?.supabase_user_id === user.id) ??
        candidates.data[0] ??
        null;

      if (matchedCustomer) {
        customerId = matchedCustomer.id;
        if (matchedCustomer.metadata?.supabase_user_id !== user.id) {
          await stripe.customers.update(matchedCustomer.id, {
            metadata: {
              ...(matchedCustomer.metadata ?? {}),
              supabase_user_id: user.id,
            },
          });
        }
      } else {
        const created = await stripe.customers.create({
          email: user.email,
          metadata: {
            supabase_user_id: user.id,
          },
        });
        customerId = created.id;
      }

      const { error: saveErr } = await admin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
      if (saveErr) {
        console.error("[stripe/trial-checkout] profile customer save:", saveErr);
        return NextResponse.json(
          { error: "Could not save Stripe customer." },
          { status: 500 },
        );
      }
    }

    const origin = getAppOrigin();
    const successUrl = `${origin}/welcome?stripe=success&plan=${plan}`;
    const cancelUrl = `${origin}/welcome`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      payment_method_collection: "always",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          plan,
          user_id: user.id,
        },
      },
      client_reference_id: user.id,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        plan,
        user_id: user.id,
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: "Could not create checkout session." }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[stripe/trial-checkout] error:", e);
    return NextResponse.json({ error: "Failed to start trial checkout." }, { status: 500 });
  }
}
