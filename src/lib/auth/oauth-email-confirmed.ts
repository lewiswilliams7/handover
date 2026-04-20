import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Supabase should mark OAuth emails confirmed when "Skip email confirmation for OAuth users"
 * is enabled (Dashboard → Authentication → Providers → Google). If the user still has no
 * confirmation timestamp but has a non-email provider, fix it via the Admin API.
 */
export async function confirmAuthEmailIfOAuthUser(
  admin: SupabaseClient,
  user: User,
): Promise<void> {
  if (user.email_confirmed_at) return;
  const prov = user.app_metadata?.provider;
  const providers = user.app_metadata?.providers;
  const hasNonEmailProvider =
    (typeof prov === "string" && prov !== "email") ||
    (Array.isArray(providers) &&
      providers.some((p) => typeof p === "string" && p.length > 0 && p !== "email"));
  if (!hasNonEmailProvider) return;

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    email_confirm: true,
  });
  if (error) {
    console.error("[auth/callback] OAuth email_confirm:", error.message);
  }
}
