import { randomUUID } from "crypto";

import { sendCustomEmailVerificationEmail } from "@/lib/emails";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Public verification links: production uses NEXT_PUBLIC_APP_URL (e.g. https://gethandover.uk). */
export function verificationLinkBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "https://gethandover.uk";
}

export async function hasVerifiedEmailInTable(
  admin: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from("email_verifications")
    .select("id")
    .eq("user_id", userId)
    .not("verified_at", "is", null)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[email-verification] hasVerifiedEmailInTable:", error);
    return false;
  }
  return Boolean(data?.id);
}

/**
 * Inserts a new pending token (24h) and sends Resend email.
 * Service role client required for insert (RLS has no INSERT for anon).
 */
export async function insertPendingVerificationAndSendEmail(
  admin: SupabaseClient,
  userId: string,
  email: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { error: insErr } = await admin.from("email_verifications").insert({
    user_id: userId,
    token,
    expires_at: expiresAt,
  });

  if (insErr) {
    console.error("[email-verification] insert:", insErr);
    return { ok: false, error: "Could not create verification." };
  }

  const base = verificationLinkBaseUrl();
  const verifyUrl = `${base}/auth/verify?token=${encodeURIComponent(token)}`;

  try {
    await sendCustomEmailVerificationEmail(email, verifyUrl);
  } catch (e) {
    console.error("[email-verification] send:", e);
    return { ok: false, error: "Could not send verification email." };
  }

  return { ok: true };
}
