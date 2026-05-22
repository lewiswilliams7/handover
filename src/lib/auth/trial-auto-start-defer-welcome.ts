import type { SupabaseClient, User } from "@supabase/supabase-js";

/** Brand-new free accounts must pick a plan on `/welcome`; skip query/storage trial autostart. */
const NEW_FREE_USER_TRIAL_AUTOSTART_BLOCK_MS = 120_000;

/**
 * When true: do not POST `/api/trial/start`; send the user to `/welcome` instead.
 * Uses auth `created_at` when present (fresh session), plus profile row for plan / trial / created_at.
 */
export async function shouldDeferTrialAutoStartForWelcomeChoice(
  supabase: SupabaseClient,
  user: Pick<User, "id" | "created_at">,
): Promise<boolean> {
  const authCreatedMs =
    typeof user.created_at === "string" && user.created_at.trim()
      ? new Date(user.created_at.trim()).getTime()
      : NaN;

  const isRecentAuthSignup = (): boolean => {
    if (!Number.isFinite(authCreatedMs)) return false;
    const ageMs = Date.now() - authCreatedMs;
    return ageMs >= 0 && ageMs <= NEW_FREE_USER_TRIAL_AUTOSTART_BLOCK_MS;
  };

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, trial_ends_at, created_at")
    .eq("id", user.id)
    .maybeSingle();

  // Race right after signup: profile trigger may not have committed yet — treat as welcome flow.
  if (!profile) {
    return isRecentAuthSignup();
  }

  const plan =
    typeof profile.plan === "string" ? profile.plan.trim().toLowerCase() : "";
  if (plan !== "free") return false;

  const trialEnds =
    typeof profile.trial_ends_at === "string"
      ? profile.trial_ends_at.trim()
      : "";
  if (trialEnds) return false;

  const profileCreatedMs =
    profile.created_at != null
      ? new Date(String(profile.created_at)).getTime()
      : NaN;

  const candidates = [authCreatedMs, profileCreatedMs].filter((t) =>
    Number.isFinite(t),
  );
  if (candidates.length === 0) return false;

  const earliestSignupMs = Math.min(...candidates);
  const ageMs = Date.now() - earliestSignupMs;
  return ageMs >= 0 && ageMs <= NEW_FREE_USER_TRIAL_AUTOSTART_BLOCK_MS;
}
