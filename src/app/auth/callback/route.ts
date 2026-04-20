import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { EmailOtpType, SupabaseClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { shouldRedirectToVerifyEmailPage } from "@/lib/auth/email-verification-gate";
import { confirmAuthEmailIfOAuthUser } from "@/lib/auth/oauth-email-confirmed";
import { ensureProfileFromAuthUser } from "@/lib/auth/ensure-profile-from-auth-user";
import { runWelcomeEmailForUser } from "@/lib/email-triggers";
import { applyReferralAttribution } from "@/lib/referral-server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Email confirmation / magic-link style callbacks include `type` (and often `token_hash`, or PKCE `code` with `type`).
 * OAuth (e.g. Google) PKCE returns `code` without those email `type` values - treat as OAuth, not Supabase email confirm.
 *
 * **Confirm email** may be disabled in Supabase; custom verification uses Resend + `email_verifications`
 * (see `/auth/verify`). Users with `email_confirmed_at` set, or Google SSO (`provider === "google"`),
 * skip the verify-email gate; `email_verifications` is backfilled when Supabase has already confirmed.
 */

const EMAIL_CONFIRMATION_TYPES = new Set<string>([
  "signup",
  "email",
  "magiclink",
  "recovery",
  "invite",
  "email_change",
]);

function safeNextPath(raw: string | null): string {
  if (!raw || typeof raw !== "string") return "/";
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return "/";
  return t;
}

function parseEmailOtpType(url: URL): EmailOtpType {
  const raw = (url.searchParams.get("type") || "signup").toLowerCase();
  if (EMAIL_CONFIRMATION_TYPES.has(raw)) return raw as EmailOtpType;
  return "signup";
}

function callbackFailureRedirect(request: NextRequest, reason: string) {
  const u = new URL("/auth", request.nextUrl.origin);
  u.searchParams.set("tab", "signin");
  u.searchParams.set("auth_callback_error", "1");
  u.searchParams.set("reason", reason);
  return NextResponse.redirect(u);
}

function confirmationExpiredRedirect(request: NextRequest) {
  const u = new URL("/auth", request.nextUrl.origin);
  u.searchParams.set("tab", "signin");
  u.searchParams.set("confirmation_expired", "1");
  const hint = request.nextUrl.searchParams.get("email")?.trim();
  if (hint && hint.includes("@") && hint.length <= 254) {
    u.searchParams.set("expired_email", hint);
  }
  return NextResponse.redirect(u);
}

function redirectWithCopiedCookies(source: NextResponse, targetUrl: URL): NextResponse {
  const target = NextResponse.redirect(targetUrl);
  source.cookies.getAll().forEach((c) => {
    target.cookies.set(c.name, c.value);
  });
  return target;
}

function classifyExchangeError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("code verifier") || m.includes("code_verifier") || m.includes("pkce")) {
    return "pkce_verifier_missing";
  }
  if (m.includes("expired") || m.includes("invalid") || m.includes("flow state")) {
    return "link_expired_or_invalid";
  }
  return "exchange_failed";
}

async function postAuthSessionSideEffects(
  request: NextRequest,
  supabase: SupabaseClient,
  redirectResponse: NextResponse,
  opts: { oauthStyleCallback: boolean },
): Promise<NextResponse | null> {
  let {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return callbackFailureRedirect(request, "exchange_failed");
  }

  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch (e) {
    console.error("[auth/callback] service role:", e);
    return callbackFailureRedirect(request, "exchange_failed");
  }

  if (opts.oauthStyleCallback) {
    await confirmAuthEmailIfOAuthUser(admin, user);
    const { error: refErr } = await supabase.auth.refreshSession();
    if (refErr) {
      console.warn("[auth/callback] refreshSession after OAuth confirm:", refErr.message);
    }
    const refreshed = await supabase.auth.getUser();
    if (refreshed.data.user) {
      user = refreshed.data.user;
    }
  }

  if (await shouldRedirectToVerifyEmailPage(admin, user)) {
    const profileOk = await ensureProfileFromAuthUser(admin, user);
    if (!profileOk) {
      return callbackFailureRedirect(request, "exchange_failed");
    }
    const verifyUrl = new URL("/auth/verify-email", request.nextUrl.origin);
    return redirectWithCopiedCookies(redirectResponse, verifyUrl);
  }

  const profileOk = await ensureProfileFromAuthUser(admin, user);
  if (!profileOk) {
    return callbackFailureRedirect(request, "exchange_failed");
  }

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const refRaw = meta?.referral_code;
  if (typeof refRaw === "string" && refRaw.trim()) {
    try {
      await applyReferralAttribution(admin, user.id, user.email ?? null, refRaw.trim());
    } catch (e) {
      console.error("[auth/callback] referral attribution:", e);
    }
  }
  try {
    await runWelcomeEmailForUser(user.id);
  } catch (e) {
    console.error("[auth/callback] welcome email:", e);
  }

  return null;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const searchParams = url.searchParams;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const nextPath = safeNextPath(searchParams.get("next"));

  console.log("[auth/callback] Auth callback params:", {
    code: searchParams.get("code"),
    token_hash: searchParams.get("token_hash"),
    type: searchParams.get("type"),
    error: searchParams.get("error"),
    error_description: searchParams.get("error_description"),
  });

  /**
   * Post-login redirect: `next` is set by email links and OAuth (see auth form).
   * Never reject redirects based on `profiles.plan` — all trial and paid SKUs use the same session.
   */
  const successPath = nextPath || "/";
  const successUrl = new URL(successPath, request.nextUrl.origin);
  const redirectResponse = NextResponse.redirect(successUrl);

  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          redirectResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    if (tokenHash) {
      const otpType = parseEmailOtpType(url);
      const { data: vData, error: verifyErr } = await supabase.auth.verifyOtp({
        type: otpType,
        token_hash: tokenHash,
      });
      if (verifyErr || !vData?.session) {
        if (verifyErr) {
          console.error("[auth/callback] verifyOtp:", verifyErr.message);
          const reason = classifyExchangeError(verifyErr.message);
          if (reason === "link_expired_or_invalid") {
            return confirmationExpiredRedirect(request);
          }
          return callbackFailureRedirect(request, reason);
        }
        return callbackFailureRedirect(request, "exchange_failed");
      }

      const sideErr = await postAuthSessionSideEffects(request, supabase, redirectResponse, {
        oauthStyleCallback: false,
      });
      if (sideErr) return sideErr;
    } else if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error("[auth/callback] exchangeCodeForSession:", error.message);
        const reason = classifyExchangeError(error.message);
        if (reason === "link_expired_or_invalid") {
          return confirmationExpiredRedirect(request);
        }
        return callbackFailureRedirect(request, reason);
      }

      const sideErr = await postAuthSessionSideEffects(request, supabase, redirectResponse, {
        /** `code` without `token_hash` is OAuth (or generic PKCE); do not tie this to email `type`. */
        oauthStyleCallback: true,
      });
      if (sideErr) return sideErr;
    } else {
      const desc = (url.searchParams.get("error_description") || "").toLowerCase();
      if (desc.includes("expired")) {
        return confirmationExpiredRedirect(request);
      }
      return callbackFailureRedirect(request, "missing_code");
    }
  } catch (e) {
    console.error("[auth/callback] unexpected:", e);
    return callbackFailureRedirect(request, "exchange_failed");
  }

  return redirectResponse;
}
