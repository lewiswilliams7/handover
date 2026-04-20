/** Public object URL for `brand-logos/{userId}/logo.png` (no leading slash in path segment). */
export function buildBrandLogoPublicUrl(
  supabaseUrl: string | null | undefined,
  userId: string,
): string {
  const base = (supabaseUrl ?? "").trim().replace(/\/$/, "");
  if (!base || !userId.trim()) return "";
  return `${base}/storage/v1/object/public/brand-logos/${userId}/logo.png`;
}
