/**
 * Plan feature limits enforced in API routes and mirrored exactly on the pricing page.
 *
 * IMPORTANT: These values must match the pricing page copy exactly.
 * If you change one, change both.
 */

/**
 * Starter: max monthly generations for new signups. Grandfathered users
 * may have generation_limit_override on their profile row.
 */
export const STARTER_MONTHLY_GENERATION_LIMIT = 50;

/**
 * Growth: max monthly generations.
 */
export const GROWTH_MONTHLY_GENERATION_LIMIT = 300;

/**
 * Enterprise: no generation limit.
 */
export const ENTERPRISE_MONTHLY_GENERATION_LIMIT = null;

/**
 * Free tier: max monthly generations.
 */
export const FREE_MONTHLY_GENERATION_LIMIT = 10;

/**
 * Starter: max monthly reports (QBR packs + service reviews combined).
 */
export const STARTER_MONTHLY_REPORT_LIMIT = 10;

/**
 * Growth: no report limit.
 */
export const GROWTH_MONTHLY_REPORT_LIMIT = null;

/**
 * Enterprise: no report limit.
 */
export const ENTERPRISE_MONTHLY_REPORT_LIMIT = null;

/**
 * Starter: max enabled scheduled report campaigns.
 */
export const STARTER_MAX_SCHEDULED_REPORTS = 10;

/**
 * Growth: max enabled scheduled report campaigns.
 */
export const GROWTH_MAX_SCHEDULED_REPORTS = 25;

/**
 * Enterprise: no scheduled limit.
 */
export const ENTERPRISE_MAX_SCHEDULED_REPORTS = null;

/**
 * Helper: get generation limit for a given plan, respecting grandfathered overrides.
 */
export function getMonthlyGenerationLimit(
  plan: string | null,
  overrideFromProfile: number | null,
): number | null {
  if (overrideFromProfile !== null) {
    return overrideFromProfile;
  }

  switch (plan) {
    case "professional":
    case "starter":
    case "professional_trial":
      return STARTER_MONTHLY_GENERATION_LIMIT;
    case "handover":
    case "starter_programme":
      return ENTERPRISE_MONTHLY_GENERATION_LIMIT;
    case "team":
    case "growth":
    case "team_trial":
      return GROWTH_MONTHLY_GENERATION_LIMIT;
    case "enterprise":
      return ENTERPRISE_MONTHLY_GENERATION_LIMIT;
    default:
      return FREE_MONTHLY_GENERATION_LIMIT;
  }
}

/**
 * Helper: get monthly report limit (QBR + service review combined) for a given plan.
 */
export function getMonthlyReportLimit(plan: string | null): number | null {
  switch (plan) {
    case "professional":
    case "starter":
    case "professional_trial":
      return STARTER_MONTHLY_REPORT_LIMIT;
    case "handover":
    case "starter_programme":
      return GROWTH_MONTHLY_REPORT_LIMIT;
    case "team":
    case "growth":
    case "team_trial":
      return GROWTH_MONTHLY_REPORT_LIMIT;
    case "enterprise":
      return ENTERPRISE_MONTHLY_REPORT_LIMIT;
    default:
      return 0;
  }
}

/**
 * Helper: get scheduled report limit for a given plan.
 */
export function getScheduledReportLimit(plan: string | null): number | null {
  switch (plan) {
    case "professional":
    case "starter":
    case "professional_trial":
      return STARTER_MAX_SCHEDULED_REPORTS;
    case "handover":
    case "starter_programme":
      return ENTERPRISE_MAX_SCHEDULED_REPORTS;
    case "team":
    case "growth":
    case "team_trial":
      return GROWTH_MAX_SCHEDULED_REPORTS;
    case "enterprise":
      return ENTERPRISE_MAX_SCHEDULED_REPORTS;
    default:
      return 0;
  }
}
