import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  getPlanTierFromFields,
  planFieldsFromProfileRow,
  type UserPlanFields,
} from "@/lib/utils/getPlan";

/**
 * Authoritative billing/plan read for API routes. Uses the service role client only —
 * never trust plan data from the browser or user-scoped Supabase client.
 */
export async function verifyUserPlan(userId: string): Promise<UserPlanFields> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("profiles")
    .select("plan, team_id, trial_ends_at, trial_plan, subscription_status")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not verify user plan: ${error.message}`);
  }
  return planFieldsFromProfileRow(data);
}

export function getPlanTierServer(fields: UserPlanFields): 0 | 1 | 2 | 3 {
  return getPlanTierFromFields(fields);
}
