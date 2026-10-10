/**
 * Handover workspaces are paid for by one person: the owner. Members are
 * unlimited and never billed, so their access has to follow the owner's
 * subscription. Stripe only tells us about the owner (by customer id), so
 * after every owner billing change we copy the result onto the workspace row
 * and every member profile. Plan gating then reads `subscription_status` on
 * each member's own profile (see `hasHandoverEntitlement`).
 *
 * Members keep their `team_id` and `plan` when the subscription ends, so if
 * the owner renews, the whole team regains access without new invites.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { canonicalPlanId, isSoloSubscriptionLive } from "@/lib/utils/getPlan";

const HANDOVER_WORKSPACE_PLANS = ["handover", "starter_programme"] as const;

type OwnerRow = {
  id: string;
  plan: string | null;
  subscription_status: string | null;
};

/** The status every member should carry, given the owner's profile. */
export function memberStatusForOwner(owner: Pick<OwnerRow, "plan" | "subscription_status">): string {
  const plan = canonicalPlanId(owner.plan);
  const paidPlan = (HANDOVER_WORKSPACE_PLANS as readonly string[]).includes(plan);
  if (!paidPlan || !isSoloSubscriptionLive(owner.subscription_status)) return "inactive";
  return owner.subscription_status?.trim() || "active";
}

/**
 * Copy each owner's billing state onto the Handover workspaces they own.
 * Returns an error message when a write failed, so the webhook can ask Stripe
 * to retry.
 */
export async function mirrorOwnerBillingToWorkspaces(
  admin: SupabaseClient,
  ownerIds: string[],
): Promise<string | null> {
  const ids = [...new Set(ownerIds.filter(Boolean))];
  if (ids.length === 0) return null;

  const { data: owners, error: ownerError } = await admin
    .from("profiles")
    .select("id, plan, subscription_status")
    .in("id", ids);
  if (ownerError) return `owner read: ${ownerError.message}`;

  for (const owner of (owners ?? []) as OwnerRow[]) {
    const { data: teams, error: teamError } = await admin
      .from("teams")
      .select("id")
      .eq("owner_id", owner.id)
      .in("plan", [...HANDOVER_WORKSPACE_PLANS]);
    if (teamError) return `team read: ${teamError.message}`;
    if (!teams || teams.length === 0) continue;

    const status = memberStatusForOwner(owner);
    const ownerPlan = canonicalPlanId(owner.plan);
    const memberUpdate: Record<string, string> = { subscription_status: status };
    // If the owner moved between Handover plans, members follow.
    if ((HANDOVER_WORKSPACE_PLANS as readonly string[]).includes(ownerPlan)) {
      memberUpdate.plan = ownerPlan;
    }

    for (const team of teams) {
      const teamId = String(team.id);
      const { error: teamUpdateError } = await admin
        .from("teams")
        .update({ subscription_status: status })
        .eq("id", teamId);
      if (teamUpdateError) return `team update: ${teamUpdateError.message}`;

      const { error: memberError } = await admin
        .from("profiles")
        .update(memberUpdate)
        .eq("team_id", teamId)
        .neq("id", owner.id)
        .in("plan", [...HANDOVER_WORKSPACE_PLANS]);
      if (memberError) return `member update: ${memberError.message}`;
    }
  }
  return null;
}

/** Mirror for whoever owns this Stripe customer. */
export async function mirrorWorkspaceBillingForCustomer(
  admin: SupabaseClient,
  customerId: string,
): Promise<string | null> {
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId);
  if (error) return `customer read: ${error.message}`;
  return mirrorOwnerBillingToWorkspaces(
    admin,
    (data ?? []).map((row) => String(row.id)),
  );
}
