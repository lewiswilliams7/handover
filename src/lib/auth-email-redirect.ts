const DEFAULT_PRODUCTION_SITE = "https://gethandover.uk";

/**
 * Email confirmation link lifetime is controlled in the Supabase project, not in
 * this app: Dashboard → Authentication → Email → OTP expiry (set to 86400
 * seconds / 24 hours). Local CLI: `[auth.email] otp_expiry = 86400` in
 * `supabase/config.toml` when using `supabase start`.
 *
 * OAuth: Dashboard → Authentication → Providers → Google → enable "Skip email
 * confirmation for OAuth users" when that option exists, so Google-verified
 * accounts are not asked to confirm email again.
 */

/**
 * Site origin used in Supabase email links (signup confirmation, resend).
 * Prefer NEXT_PUBLIC_APP_URL so production emails use https://gethandover.uk/...
 * instead of a preview or Supabase URL. In the browser without that env, falls
 * back to the current origin (local dev).
 */
export function authEmailRedirectOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return DEFAULT_PRODUCTION_SITE;
}

export function authCallbackUrl(): string {
  return `${authEmailRedirectOrigin()}/auth/callback`;
}

/**
 * Email confirmation / OAuth redirect target: `/auth/callback?next=...` so the callback route
 * can send the user to an internal path (optionally with query e.g. `?trial=professional`).
 */
export function authCallbackUrlWithNext(nextInternalPath: string): string {
  const next = encodeURIComponent(nextInternalPath);
  return `${authCallbackUrl()}?next=${next}`;
}
