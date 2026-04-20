import type { SupabaseClient } from "@supabase/supabase-js";

import { generateReferralCode, normalizeReferralCode } from "@/lib/referral";

type AdminClient = SupabaseClient;

/**
 * Ensure the user has a referral_codes row (and mirror `profiles.referral_code`).
 * Retries on unique violation.
 */
export async function ensureReferralCodeForUser(
  admin: AdminClient,
  userId: string,
): Promise<string | null> {
  const { data: existing } = await admin
    .from("referral_codes")
    .select("code")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.code && typeof existing.code === "string") {
    await admin.from("profiles").update({ referral_code: existing.code }).eq("id", userId);
    return existing.code;
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("first_name")
    .eq("id", userId)
    .maybeSingle();

  const firstName =
    typeof profile?.first_name === "string" ? profile.first_name : null;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = generateReferralCode(firstName, userId);
    const { error } = await admin.from("referral_codes").insert({
      user_id: userId,
      code,
    });
    if (!error) {
      await admin.from("profiles").update({ referral_code: code }).eq("id", userId);
      return code;
    }
    const msg = (error as { code?: string }).code;
    if (msg === "23505") continue;
    console.error("[referral] insert referral_codes:", error);
    return null;
  }
  return null;
}

/** @deprecated Alias - use {@link ensureReferralCodeForUser}. */
export const ensureReferralCodeForPayingUser = ensureReferralCodeForUser;

export type ApplyReferralResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "already" | "not_found" | "self" };

export async function applyReferralAttribution(
  admin: AdminClient,
  referredUserId: string,
  referredEmail: string | null,
  rawCode: string,
): Promise<ApplyReferralResult> {
  const code = normalizeReferralCode(rawCode);
  if (!code) return { ok: false, reason: "invalid" };

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("referred_by")
    .eq("id", referredUserId)
    .maybeSingle();

  const existingRef =
    typeof existingProfile?.referred_by === "string"
      ? existingProfile.referred_by.trim()
      : "";
  if (existingRef.length > 0) return { ok: false, reason: "already" };

  const { data: refRow } = await admin
    .from("referral_codes")
    .select("user_id")
    .eq("code", code)
    .maybeSingle();

  const referrerId =
    refRow && typeof refRow.user_id === "string" ? refRow.user_id : null;
  if (!referrerId) return { ok: false, reason: "not_found" };
  if (referrerId === referredUserId) return { ok: false, reason: "self" };

  const { error: upErr } = await admin
    .from("profiles")
    .update({ referred_by: code })
    .eq("id", referredUserId);

  if (upErr) {
    console.error("[referral] profiles referred_by update:", upErr);
    return { ok: false, reason: "invalid" };
  }

  const { data: dup } = await admin
    .from("referrals")
    .select("id")
    .eq("referred_id", referredUserId)
    .maybeSingle();

  if (!dup) {
    const { error: insErr } = await admin.from("referrals").insert({
      referrer_id: referrerId,
      referred_id: referredUserId,
      referral_code: code,
      status: "signed_up",
      referred_email: referredEmail,
      referred_signed_up_at: new Date().toISOString(),
    });
    if (insErr) {
      console.error("[referral] referrals insert:", insErr);
    }
  }

  return { ok: true };
}
