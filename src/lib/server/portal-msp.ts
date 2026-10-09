import { getPlanTierServer, verifyUserPlan } from "@/lib/server/verifyUserPlan";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export type PortalAccountRow = {
  id: string;
  user_id: string;
  slug: string;
  display_name: string | null;
  enabled: boolean | null;
  allowed_domain: string | null;
};

export async function requireHandoverUserId(): Promise<string> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    throw new Error("unauthorized");
  }
  return user.id;
}

/** Client portal MSP APIs require Growth tier or above (tier >= 2). */
export async function requireEnterprisePlan(userId: string): Promise<void> {
  const fields = await verifyUserPlan(userId);
  if (getPlanTierServer(fields) < 2) {
    throw new Error("growth_required");
  }
}

export async function getPortalAccountForMspUser(
  userId: string,
): Promise<PortalAccountRow | null> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("portal_accounts")
    .select("id, user_id, slug, display_name, enabled, allowed_domain")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as PortalAccountRow | null) ?? null;
}

export async function requirePortalAccountForMspUser(userId: string): Promise<PortalAccountRow> {
  const row = await getPortalAccountForMspUser(userId);
  if (!row?.id) throw new Error("no_portal_account");
  return row;
}
