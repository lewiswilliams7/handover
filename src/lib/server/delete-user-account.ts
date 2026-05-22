import type { SupabaseClient } from "@supabase/supabase-js";

function isMissingTableError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("schema cache") || m.includes("does not exist") || m.includes("not find");
}

async function delByUserId(
  admin: SupabaseClient,
  table: string,
  userId: string,
): Promise<{ error: string | null }> {
  const { error } = await admin.from(table).delete().eq("user_id", userId);
  if (error) return { error: `${table}: ${error.message}` };
  return { error: null };
}

/** Best-effort when a table is missing in some environments. */
async function delByUserIdOptional(
  admin: SupabaseClient,
  table: string,
  userId: string,
): Promise<{ error: string | null }> {
  const { error } = await admin.from(table).delete().eq("user_id", userId);
  if (error && isMissingTableError(error.message)) return { error: null };
  if (error) return { error: `${table}: ${error.message}` };
  return { error: null };
}

/**
 * Ordered cleanup of public tables + auth user removal. Matches production FK constraints;
 * optional tables skip quietly when not present.
 */
export async function deleteUserAccountCascade(
  admin: SupabaseClient,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const steps: Array<() => Promise<{ error: string | null }>> = [
    () => delByUserId(admin, "welcome_emails_sent", userId),
    () => delByUserId(admin, "zapier_webhook_logs", userId),
    () => delByUserId(admin, "drip_emails_sent", userId),
    () => delByUserId(admin, "email_verifications", userId),
    () => delByUserId(admin, "halo_push_history", userId),
    () => delByUserId(admin, "scheduled_report_history", userId),
    () => delByUserId(admin, "scheduled_reports", userId),
    () => delByUserId(admin, "generations", userId),
    () => delByUserId(admin, "collections", userId),
    () => delByUserIdOptional(admin, "templates", userId),
    () => delByUserId(admin, "custom_field_mappings", userId),
    () => delByUserIdOptional(admin, "halo_closure_processed", userId),
    () => delByUserId(admin, "halo_connections", userId),
    () => delByUserId(admin, "cw_connections", userId),
    () => delByUserId(admin, "referral_codes", userId),
    async () => {
      const { error: e1 } = await admin.from("referrals").delete().eq("referrer_id", userId);
      if (e1) return { error: `referrals(referrer): ${e1.message}` };
      const { error: e2 } = await admin.from("referrals").delete().eq("referred_id", userId);
      if (e2) return { error: `referrals(referred): ${e2.message}` };
      return { error: null };
    },
    async () => {
      const { error } = await admin.from("team_invites").delete().eq("invited_by", userId);
      if (error) return { error: `team_invites: ${error.message}` };
      return { error: null };
    },
    async () => {
      const { error } = await admin.from("team_members").update({ invited_by: null }).eq("invited_by", userId);
      if (error) return { error: `team_members(invited_by): ${error.message}` };
      return { error: null };
    },
    () => delByUserId(admin, "team_members", userId),
    async () => {
      const { error } = await admin.from("teams").delete().eq("owner_id", userId);
      if (error) return { error: `teams: ${error.message}` };
      return { error: null };
    },
    async () => {
      const { data: accounts, error: selErr } = await admin
        .from("portal_accounts")
        .select("id")
        .eq("user_id", userId);
      if (selErr) return { error: `portal_accounts(select): ${selErr.message}` };
      const ids = (accounts ?? [])
        .map((r: { id?: string }) => r.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0);
      if (ids.length > 0) {
        const { error: pcErr } = await admin.from("portal_clients").delete().in("portal_account_id", ids);
        if (pcErr && !isMissingTableError(pcErr.message)) {
          return { error: `portal_clients: ${pcErr.message}` };
        }
      }
      const { error: paErr } = await admin.from("portal_accounts").delete().eq("user_id", userId);
      if (paErr) return { error: `portal_accounts: ${paErr.message}` };
      return { error: null };
    },
    () => delByUserIdOptional(admin, "free_tier_monthly_usage", userId),
    async () => {
      const { error } = await admin.from("halopsa_waitlist").delete().eq("user_id", userId);
      if (error && !isMissingTableError(error.message)) {
        return { error: `halopsa_waitlist: ${error.message}` };
      }
      return { error: null };
    },
    () => delByUserIdOptional(admin, "cw_waitlist", userId),
    async () => {
      const { error } = await admin.from("profiles").delete().eq("id", userId);
      if (error) return { error: `profiles: ${error.message}` };
      return { error: null };
    },
  ];

  for (const step of steps) {
    const { error } = await step();
    if (error) return { ok: false, error };
  }

  const { error: authErr } = await admin.auth.admin.deleteUser(userId);
  if (authErr) return { ok: false, error: `auth.users: ${authErr.message}` };

  return { ok: true };
}
