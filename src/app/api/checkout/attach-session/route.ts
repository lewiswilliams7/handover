import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { reconcileUserPlanWithStripe } from "@/lib/stripe-subscription-plan-sync";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * After checkout, link the verified Stripe customer to the signed-in user.
 * Plan fields are synced from Stripe via the same reconciliation path as the webhook (service role only).
 */
export async function POST(request: Request) {
  try {
    const supabaseAuth = await createServerClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user?.email?.trim()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { session_id?: string };
    try {
      body = (await request.json()) as { session_id?: string };
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const sessionId = typeof body.session_id === "string" ? body.session_id.trim() : "";
    if (!sessionId) {
      return NextResponse.json({ error: "session_id required" }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    if (session.payment_status !== "paid" && session.status !== "complete") {
      return NextResponse.json({ error: "Checkout session is not paid." }, { status: 400 });
    }

    const sessionEmail = (
      session.customer_details?.email ??
      session.customer_email ??
      ""
    )
      .trim()
      .toLowerCase();
    const userEmail = user.email.trim().toLowerCase();
    if (!sessionEmail || sessionEmail !== userEmail) {
      return NextResponse.json(
        { error: "Checkout email does not match this account." },
        { status: 403 },
      );
    }

    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer &&
            typeof session.customer === "object" &&
            "id" in session.customer
          ? (session.customer as Stripe.Customer).id
          : null;

    if (!customerId) {
      return NextResponse.json({ error: "No Stripe customer on checkout session." }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    const { error: upErr } = await admin
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);

    if (upErr) {
      console.error("[checkout/attach-session] profiles update:", upErr);
      console.error("[checkout/attach-session]", upErr.message);
      return NextResponse.json(
        { error: "Could not attach checkout session. Please try again." },
        { status: 500 },
      );
    }

    const result = await reconcileUserPlanWithStripe(admin, stripe, user.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    console.error("[checkout/attach-session]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
