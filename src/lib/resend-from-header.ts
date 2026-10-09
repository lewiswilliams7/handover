import { partnerBrandName, partnerWhiteLabelActive } from "@/lib/white-label";

/** Extract bare email from env e.g. `Name <a@b>` or `a@b`. */
export function getNoreplyMailbox(): string {
  const raw = process.env.RESEND_FROM_EMAIL?.trim();
  if (raw) {
    const angle = raw.match(/<([^>]+)>/);
    if (angle?.[1]) return angle[1].trim();
    if (/^[^\s<>]+@[^\s<>]+$/.test(raw)) return raw;
  }
  return "hello@gethandover.uk";
}

export type ProfileNameFields = {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  brand_name?: string | null;
  plan?: string | null;
  team_id?: string | null;
  trial_ends_at?: string | null;
  trial_plan?: string | null;
  subscription_status?: string | null;
  white_label_mode?: boolean | null;
} | null;

function sanitizeDisplayPart(name: string): string {
  return name
    .replace(/[\r\n<>"]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

/** Prefer display_name; else first + last; empty → null */
export function resolveFullNameFromProfile(profile: ProfileNameFields): string | null {
  if (!profile) return null;
  const dn =
    typeof profile.display_name === "string" && profile.display_name.trim()
      ? profile.display_name.trim()
      : "";
  if (dn) return dn;
  const fn = typeof profile.first_name === "string" ? profile.first_name.trim() : "";
  const ln = typeof profile.last_name === "string" ? profile.last_name.trim() : "";
  const combined = [fn, ln].filter(Boolean).join(" ").trim();
  return combined.length > 0 ? combined : null;
}

export function resolveCompanyFromProfile(profile: ProfileNameFields): string | null {
  if (!profile) return null;
  const c = typeof profile.company_name === "string" ? profile.company_name.trim() : "";
  return c.length > 0 ? c : null;
}

/**
 * Resend `from` display name from profile: "{Full Name} - {Company} via Handover",
 * or "{Full Name} via Handover", or "Handover Reports" - always uses configured noreply mailbox.
 */
export function buildHandoverResendFromHeader(profile: ProfileNameFields): string {
  const addr = getNoreplyMailbox();
  const brandName =
    profile && typeof profile.brand_name === "string" && profile.brand_name.trim()
      ? sanitizeDisplayPart(profile.brand_name.trim())
      : null;
  const fullName = resolveFullNameFromProfile(profile);
  const company = resolveCompanyFromProfile(profile);

  let label: string;
  if (brandName) {
    label = `${brandName} via Handover`;
  } else if (fullName && company) {
    label = `${sanitizeDisplayPart(fullName)} - ${sanitizeDisplayPart(company)} via Handover`;
  } else if (fullName) {
    label = `${sanitizeDisplayPart(fullName)} via Handover`;
  } else {
    label = "Lewis at Handover";
  }

  return `${label} <${addr}>`;
}

/**
 * Scheduled / one-click client emails: when partner white label is active, sender is "{Brand} Reports".
 * Otherwise {@link buildHandoverResendFromHeader}.
 */
export function buildReportEmailResendFromHeader(profile: ProfileNameFields): string {
  if (partnerWhiteLabelActive(profile)) {
    const addr = getNoreplyMailbox();
    const brand = sanitizeDisplayPart(partnerBrandName(profile));
    return `${brand} Reports <${addr}>`;
  }
  return buildHandoverResendFromHeader(profile);
}
