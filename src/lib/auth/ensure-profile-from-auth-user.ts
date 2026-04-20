import type { SupabaseClient, User } from "@supabase/supabase-js";

import { ensureReferralCodeForUser } from "@/lib/referral-server";

/**
 * Ensures a `profiles` row exists (OAuth callback, auth/callback, etc.).
 * A DB trigger on `auth.users` also inserts a minimal profile; this function
 * inserts when missing or enriches `display_name` / `email` when the row was
 * created empty by the trigger.
 */
export async function ensureProfileFromAuthUser(
  admin: SupabaseClient,
  user: User,
): Promise<boolean> {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const fullName =
    (typeof meta?.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta?.name === "string" && meta.name.trim()) ||
    "";
  const email = user.email?.trim() || null;
  const display_name =
    fullName ||
    (email ? email.split("@")[0] : null) ||
    null;

  const { data: existing, error: selErr } = await admin
    .from("profiles")
    .select("id, display_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (selErr) {
    console.error("[ensureProfileFromAuthUser] select:", selErr);
    return false;
  }

  if (existing) {
    const existingDisplay =
      typeof existing.display_name === "string" ? existing.display_name.trim() : "";
    const needsDisplay = !existingDisplay && Boolean(display_name?.trim());
    const needsEmail = Boolean(email) && existing.email !== email;
    if (needsDisplay || needsEmail) {
      const { error: upErr } = await admin
        .from("profiles")
        .update({
          ...(needsDisplay && display_name ? { display_name } : {}),
          ...(needsEmail ? { email } : {}),
        })
        .eq("id", user.id);
      if (upErr) {
        console.error("[ensureProfileFromAuthUser] update:", upErr);
        return false;
      }
    }
    await ensureReferralCodeForUser(admin, user.id);
    return true;
  }

  const createdAt =
    typeof user.created_at === "string" && user.created_at.trim()
      ? user.created_at.trim()
      : undefined;

  const { error: insErr } = await admin.from("profiles").insert({
    id: user.id,
    email,
    display_name,
    plan: "free",
    ...(createdAt ? { created_at: createdAt } : {}),
  });

  if (insErr) {
    if (insErr.code === "23505") {
      await ensureReferralCodeForUser(admin, user.id);
      return true;
    }
    console.error("[ensureProfileFromAuthUser] insert:", insErr);
    return false;
  }

  await ensureReferralCodeForUser(admin, user.id);
  return true;
}
