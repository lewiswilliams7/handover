import {
  getPlanTierFromFields,
  normalizePlanLabel,
  planFieldsFromProfileRow,
} from "@/lib/utils/getPlan";

export type WhiteLabelProfileFields = {
  plan?: string | null;
  team_id?: string | null;
  trial_ends_at?: string | null;
  trial_plan?: string | null;
  subscription_status?: string | null;
  white_label_mode?: boolean | null;
  brand_name?: string | null;
};

/** Enterprise solo SKU is stored on `profiles.plan` (team billing uses `plan: "team"`). */
export function isEnterpriseSoloPlan(plan: string | null | undefined): boolean {
  return normalizePlanLabel(plan ?? "") === "enterprise";
}

/**
 * White-label output substitutions apply on Growth+ (tier ≥ 2), checkbox on, and brand name set.
 * Used server-side so a tampered `white_label_mode` row is ignored for ineligible plans.
 */
export function partnerWhiteLabelActive(
  profile: WhiteLabelProfileFields | null | undefined,
): boolean {
  if (!profile) return false;
  const tier = getPlanTierFromFields(planFieldsFromProfileRow(profile));
  if (tier < 2) return false;
  if (profile.white_label_mode !== true) return false;
  const b = typeof profile.brand_name === "string" ? profile.brand_name.trim() : "";
  return b.length > 0;
}

export function partnerBrandName(profile: WhiteLabelProfileFields | null | undefined): string {
  const b = typeof profile?.brand_name === "string" ? profile.brand_name.trim() : "";
  return b;
}

/** Safe filename segment for report attachments when white label is active. */
export function partnerReportFileSlug(brandName: string): string {
  const s = brandName
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return s || "Report";
}
