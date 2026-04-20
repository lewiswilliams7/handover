/**
 * Canonical list of `profiles.plan` values that represent an authenticated user for dashboard access.
 * Middleware must **not** redirect based on plan — only missing session. This list is for product
 * code (feature gating, read-only Basic/Free, upgrade prompts).
 */
export const AUTHENTICATED_DASHBOARD_PLAN_IDS = [
  "professional",
  "professional_trial",
  "team",
  "team_trial",
  "enterprise",
  "basic",
  "free",
  "pro", // legacy alias; prefer canonicalPlanId in comparisons
] as const;
