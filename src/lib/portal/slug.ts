export const PORTAL_SLUG_RE = /^[a-z0-9-]{3,30}$/;

export function sanitizePortalClientSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 30);
}

export function isValidPortalSlug(slug: string): boolean {
  return PORTAL_SLUG_RE.test(slug.trim().toLowerCase());
}
