/** Query param used with `/auth` and post-login redirects to auto-start an app trial. */
export type TrialPlanQuery = "professional" | "team";

/** Persists chosen trial through OAuth / magic-link redirects (read after session exists). */
export const PENDING_TRIAL_STORAGE_KEY = "pending_trial";

export function parseTrialQueryParam(
  raw: string | null | undefined,
): TrialPlanQuery | undefined {
  const t = raw?.trim().toLowerCase();
  if (t === "professional" || t === "team") return t;
  return undefined;
}

/**
 * Appends `?trial=` or `&trial=` to an internal path without duplicating an existing `trial` key.
 */
export function appendTrialQueryToPath(
  internalPath: string,
  trial?: TrialPlanQuery,
): string {
  const base = internalPath.trim() || "/";
  if (!trial) return base;
  try {
    const pathOnly = base.startsWith("/") ? base : `/${base}`;
    const u = new URL(pathOnly, "https://example.com");
    if (u.searchParams.has("trial")) return base;
    u.searchParams.set("trial", trial);
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return base.includes("?") ? `${base}&trial=${trial}` : `${base}?trial=${trial}`;
  }
}
