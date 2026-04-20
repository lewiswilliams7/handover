import { NextResponse } from "next/server";

import { getAppOrigin } from "@/lib/app-url";
import { getBillingStripeCustomerIdForUser } from "@/lib/stripe-billing-customer-id";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

function safeReturnPathFromBody(raw: string): string {
  try {
    const j = JSON.parse(raw) as { returnPath?: unknown };
    if (typeof j.returnPath !== "string") return "/";
    const t = j.returnPath.trim();
    if (!t.startsWith("/") || t.startsWith("//")) return "/";
    if (t.includes("\n") || t.includes("\r")) return "/";
    if (!/^\/[\w\-/]*$/.test(t)) return "/";
    return t;
  } catch {
    return "/";
  }
}

export async function POST(request: Request) {
  try {
    let returnPath = "/";
    const text = await request.text();
    if (text.trim()) {
      returnPath = safeReturnPathFromBody(text);
    }

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let admin: ReturnType<typeof createServiceRoleClient>;
    try {
      admin = createServiceRoleClient();
    } catch (e) {
      console.error("[portal] service role:", e);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }

    const customerId = await getBillingStripeCustomerIdForUser(admin, user.id);

    if (!customerId) {
      return NextResponse.json(
        { error: "No billing account found" },
        { status: 404 },
      );
    }

    const stripe = getStripe();
    const origin = getAppOrigin();

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnPath === "/" ? `${origin}/` : `${origin}${returnPath}`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Could not create portal session." },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Portal error";
    console.error("[portal] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
