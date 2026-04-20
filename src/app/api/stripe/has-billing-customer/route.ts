import { NextResponse } from "next/server";

import { getBillingStripeCustomerIdForUser } from "@/lib/stripe-billing-customer-id";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Whether the signed-in user can open the Stripe customer portal (has a Stripe customer). */
export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ hasStripeCustomer: false });
    }

    let admin: ReturnType<typeof createServiceRoleClient>;
    try {
      admin = createServiceRoleClient();
    } catch (e) {
      console.error("[has-billing-customer] service role:", e);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }

    const customerId = await getBillingStripeCustomerIdForUser(admin, user.id);
    return NextResponse.json({ hasStripeCustomer: Boolean(customerId) });
  } catch (e) {
    console.error("[has-billing-customer]", e);
    return NextResponse.json({ error: "Could not resolve billing customer." }, { status: 500 });
  }
}
