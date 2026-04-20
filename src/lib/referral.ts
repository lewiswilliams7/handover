/** Client-safe referral helpers (no server-only imports). */

const SUFFIX_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomSuffix(length: number): string {
  let s = "";
  for (let i = 0; i < length; i += 1) {
    s += SUFFIX_CHARS[Math.floor(Math.random() * SUFFIX_CHARS.length)]!;
  }
  return s;
}

/**
 * Generate a referral code: FIRSTNAME-XXXX (e.g. LEWIS-X7K2).
 * Prefix from first name (letters only, max 6); fallback USER.
 */
export function generateReferralCode(
  firstName?: string | null,
  _userId?: string,
): string {
  const raw = (firstName ?? "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6);
  const prefix = raw.length > 0 ? raw : "USER";
  const suffix = randomSuffix(4);
  return `${prefix}-${suffix}`;
}

export function normalizeReferralCode(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return "";
  return raw.trim().toUpperCase();
}

export function getReferralLink(code: string): string {
  const base =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
      : "https://gethandover.uk";
  return `${base}/referral/${encodeURIComponent(code)}`;
}

export function getReferralLandingLink(code: string): string {
  return getReferralLink(code);
}

/** Signup URL with `ref` for cookie-based attribution (auth form). */
export function getSignupReferralUrl(code: string): string {
  const base =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
      : "https://gethandover.uk";
  const c = encodeURIComponent(code.trim());
  return `${base}/auth?tab=signup&ref=${c}`;
}
