import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import {
  LEGACY_STRIPE_PRICE_IDS,
  STRIPE_PRICE_IDS,
} from "@/lib/stripe-price-ids";

export const runtime = "nodejs";

function recognizedPaidPriceIds() {
  return {
    handover: new Set(
      [
        STRIPE_PRICE_IDS.handover.monthly,
        STRIPE_PRICE_IDS.handover.annual,
        ...LEGACY_STRIPE_PRICE_IDS.professional.monthly,
        ...LEGACY_STRIPE_PRICE_IDS.professional.annual,
      ].filter(Boolean),
    ),
  };
}

function priceIdFromItem(price: unknown): string | null {
  if (typeof price === "string") return price;
  if (price && typeof price === "object" && "id" in price) {
    const id = (price as { id?: unknown }).id;
    return typeof id === "string" ? id : null;
  }
  return null;
}

/** Active or trialing subscription on a current or legacy paid price. */
export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({
        activeMonthlyPayingSubscription: false,
        plan: null as "professional" | "team" | null,
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_customer_id, team_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[subscription-billing] profile:", profileError);
      return NextResponse.json(
        { error: "Could not load profile." },
        { status: 500 },
      );
    }

    let customerId =
      typeof profile?.stripe_customer_id === "string"
        ? profile.stripe_customer_id.trim()
        : "";

    if (!customerId && profile?.team_id && typeof profile.team_id === "string") {
      try {
        const admin = createServiceRoleClient();
        const { data: teamRow } = await admin
          .from("teams")
          .select("stripe_customer_id")
          .eq("id", profile.team_id)
          .maybeSingle();
        const tc =
          typeof teamRow?.stripe_customer_id === "string"
            ? teamRow.stripe_customer_id.trim()
            : "";
        if (tc) customerId = tc;
      } catch (e) {
        console.error("[subscription-billing] team customer:", e);
      }
    }

    if (!customerId) {
      return NextResponse.json({
        activeMonthlyPayingSubscription: false,
        plan: null as "professional" | "team" | null,
      });
    }

    const { handover } = recognizedPaidPriceIds();
    if (handover.size === 0) {
      return NextResponse.json({
        activeMonthlyPayingSubscription: false,
        plan: null as "professional" | "team" | null,
      });
    }

    const stripe = getStripe();
    const statuses = ["active", "trialing"] as const;

    for (const status of statuses) {
      const list = await stripe.subscriptions.list({
        customer: customerId,
        status,
        limit: 20,
      });
      for (const sub of list.data) {
        for (const item of sub.items.data) {
          const pid = priceIdFromItem(item.price);
          if (!pid) continue;
          if (handover.has(pid)) {
            return NextResponse.json({
              activeMonthlyPayingSubscription: true,
              plan: "professional" as const,
            });
          }
        }
      }
    }

    return NextResponse.json({
      activeMonthlyPayingSubscription: false,
      plan: null as "pro" | "team" | null,
    });
  } catch (e) {
    console.error("[subscription-billing]", e);
    return NextResponse.json(
      { error: "Could not load subscription billing." },
      { status: 500 },
    );
  }
}
