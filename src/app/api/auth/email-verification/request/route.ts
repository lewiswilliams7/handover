import { NextResponse } from "next/server";

import {
  hasVerifiedEmailInTable,
  insertPendingVerificationAndSendEmail,
} from "@/lib/auth/custom-email-verification";
import { createServiceRoleClient } from "@/lib/supabase/admin";

/**
 * Request a new verification email by address (unauthenticated).
 * Same response shape on success/failure to limit email enumeration.
 */
export async function POST(request: Request) {
  const generic = NextResponse.json({ ok: true });

  try {
    const body = (await request.json()) as { email?: string };
    const emailInput = typeof body.email === "string" ? body.email.trim() : "";
    const emailLower = emailInput.toLowerCase();
    if (!emailInput || !emailInput.includes("@") || emailInput.length > 254) {
      return generic;
    }

    let admin: ReturnType<typeof createServiceRoleClient>;
    try {
      admin = createServiceRoleClient();
    } catch {
      return generic;
    }

    const { data: byExact } = await admin
      .from("profiles")
      .select("id")
      .eq("email", emailInput)
      .maybeSingle();
    let profileId: string | null = byExact?.id ?? null;
    if (!profileId) {
      const { data: byLower } = await admin
        .from("profiles")
        .select("id")
        .eq("email", emailLower)
        .maybeSingle();
      profileId = byLower?.id ?? null;
    }
    if (!profileId) {
      return generic;
    }

    const { data: authData, error: authErr } = await admin.auth.admin.getUserById(profileId);
    if (authErr || !authData.user?.email) {
      return generic;
    }

    const provider =
      typeof authData.user.app_metadata?.provider === "string"
        ? authData.user.app_metadata.provider
        : "";
    if (provider !== "email") {
      return generic;
    }

    if (authData.user.email_confirmed_at || (await hasVerifiedEmailInTable(admin, profileId))) {
      return generic;
    }

    const result = await insertPendingVerificationAndSendEmail(
      admin,
      profileId,
      authData.user.email.trim(),
    );
    if (!result.ok) {
      console.warn("[email-verification/request] send failed:", result.error);
    }
    return generic;
  } catch (e) {
    console.error("[api/auth/email-verification/request]", e);
    return generic;
  }
}
