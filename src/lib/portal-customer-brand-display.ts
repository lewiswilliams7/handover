/** Normalise profile `brand_colour` for inline CSS (accepts with or without `#`). */
export function mspBrandAccentColour(brandColour: string | null | undefined): string {
  const t = (brandColour ?? "").trim();
  if (/^#[0-9A-Fa-f]{6}$/i.test(t)) return `#${t.slice(1).toLowerCase()}`;
  if (/^[0-9A-Fa-f]{6}$/i.test(t)) return `#${t.toLowerCase()}`;
  return "var(--accent)";
}

export function mspBrandLogoUrl(brandLogoUrl: string | null | undefined): string | null {
  const t = (brandLogoUrl ?? "").trim();
  return t.length > 0 ? t : null;
}
