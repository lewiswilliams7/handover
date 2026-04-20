import type { SupabaseClient, User } from "@supabase/supabase-js";

function isGoogleUser(user: User): boolean {
  return user.app_metadata?.provider === "google";
}

function isEmailPasswordUser(user: User): boolean {
  return user.app_metadata?.provider === "email";
}

function isSupabaseEmailVerified(user: User): boolean {
  return Boolean(user.email_confirmed_at);
}

async function hasVerifiedRowInTable(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("email_verifications")
    .select("id")
    .eq("user_id", userId)
    .not("verified_at", "is", null)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[email-verification-gate] email_verifications:", error.message);
    return false;
  }
  return Boolean(data?.id);
}

/**
 * When Supabase has already confirmed the email, ensure `email_verifications` has a matching row
 * so legacy users and table-only checks stay in sync.
 */
export async function backfillEmailVerificationFromSupabaseUser(
  supabase: SupabaseClient,
  user: User,
): Promise<void> {
  if (!isSupabaseEmailVerified(user) || !user.email_confirmed_at) return;

  const { data: existingVerified, error: evErr } = await supabase
    .from("email_verifications")
    .select("id")
    .eq("user_id", user.id)
    .not("verified_at", "is", null)
    .limit(1)
    .maybeSingle();

  if (evErr) {
    console.error("[email-verification-gate] backfill select verified:", evErr.message);
    return;
  }
  if (existingVerified?.id) return;

  const { data: pending, error: pendErr } = await supabase
    .from("email_verifications")
    .select("id")
    .eq("user_id", user.id)
    .is("verified_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pendErr) {
    console.error("[email-verification-gate] backfill select pending:", pendErr.message);
    return;
  }

  const verifiedAt = user.email_confirmed_at;
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const token = crypto.randomUUID();

  if (pending?.id) {
    const { error: upErr } = await supabase
      .from("email_verifications")
      .update({
        verified_at: verifiedAt,
        expires_at: expiresAt,
      })
      .eq("id", pending.id);
    if (upErr) console.error("[email-verification-gate] backfill update:", upErr.message);
    return;
  }

  const { error: insErr } = await supabase.from("email_verifications").insert({
    user_id: user.id,
    token,
    verified_at: verifiedAt,
    expires_at: expiresAt,
  });
  if (insErr) console.error("[email-verification-gate] backfill insert:", insErr.message);
}

/**
 * Returns true if the user should be redirected to /auth/verify-email when hitting app routes.
 * Google and Supabase-confirmed emails are always allowed; email/password users without Supabase
 * confirmation rely on `email_verifications`.
 */
export async function shouldRedirectToVerifyEmailPage(
  supabase: SupabaseClient,
  user: User,
): Promise<boolean> {
  if (isGoogleUser(user)) {
    return false;
  }

  if (isSupabaseEmailVerified(user)) {
    await backfillEmailVerificationFromSupabaseUser(supabase, user);
    return false;
  }

  if (!isEmailPasswordUser(user)) {
    return false;
  }

  return !(await hasVerifiedRowInTable(supabase, user.id));
}
