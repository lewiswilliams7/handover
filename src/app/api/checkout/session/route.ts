import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("id")?.trim();

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session id." }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session || session.payment_status !== "paid") {
      return NextResponse.json({ error: "Session not found or not paid." }, { status: 400 });
    }

    const email =
      session.customer_details?.email ??
      session.customer_email ??
      null;
    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id ?? null;

    let accountExists = false;
    if (email) {
      try {
        const admin = createServiceRoleClient();
        const { data, error } = await admin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });
        if (!error) {
          accountExists = data.users.some((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
        }
      } catch (e) {
        console.error("[checkout/session] account lookup failed:", e);
      }
    }

    return NextResponse.json({
      email,
      customer_id: customerId,
      status: session.payment_status,
      account_exists: accountExists,
    });
  } catch (e) {
    console.error("[checkout/session] failed:", e);
    return NextResponse.json({ error: "Could not load checkout session." }, { status: 400 });
  }
}
