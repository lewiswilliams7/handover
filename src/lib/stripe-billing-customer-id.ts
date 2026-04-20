import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolves the Stripe customer ID used for billing portal / subscriptions:
 * profile.stripe_customer_id, else teams.stripe_customer_id for the user's team_id.
 * Matches logic in POST /api/stripe/portal.
 */
export async function getBillingStripeCustomerIdForUser(
  admin: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("stripe_customer_id, team_id")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    console.error("[getBillingStripeCustomerIdForUser] profile:", profileError);
    return null;
  }

  let customerId =
    typeof profile?.stripe_customer_id === "string" ? profile.stripe_customer_id.trim() : "";

  if (!customerId && profile?.team_id && typeof profile.team_id === "string") {
    try {
      const { data: teamRow, error: teamErr } = await admin
        .from("teams")
        .select("stripe_customer_id")
        .eq("id", profile.team_id)
        .maybeSingle();
      if (teamErr) {
        console.error("[getBillingStripeCustomerIdForUser] team:", teamErr);
      } else {
        const tc =
          typeof teamRow?.stripe_customer_id === "string" ? teamRow.stripe_customer_id.trim() : "";
        if (tc) customerId = tc;
      }
    } catch (e) {
      console.error("[getBillingStripeCustomerIdForUser] team lookup:", e);
    }
  }

  return customerId || null;
}
