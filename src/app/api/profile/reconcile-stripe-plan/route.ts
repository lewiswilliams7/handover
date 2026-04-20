import { NextResponse } from "next/server";

import { reconcileUserPlanWithStripe } from "@/lib/stripe-subscription-plan-sync";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * Session fallback: if `profiles` shows no paid tier but Stripe has an active subscription,
 * sync `profiles.plan` (same logic as the Stripe webhook).
 */
export async function POST() {
  try {
    const supabaseAuth = await createServerClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createServiceRoleClient();
    const stripe = getStripe();
    const result = await reconcileUserPlanWithStripe(admin, stripe, user.id);

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    console.error("[reconcile-stripe-plan]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
