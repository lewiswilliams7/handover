import type { SupabaseClient } from "@supabase/supabase-js";

function extractBrandLogoPath(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) {
    return v.replace(/^brand-logos\//, "");
  }
  const publicMarker = "/storage/v1/object/public/brand-logos/";
  const signedMarker = "/storage/v1/object/sign/brand-logos/";
  const marker = v.includes(publicMarker) ? publicMarker : v.includes(signedMarker) ? signedMarker : "";
  if (!marker) return null;
  const i = v.indexOf(marker);
  if (i < 0) return null;
  const withQuery = v.slice(i + marker.length);
  const path = withQuery.split("?")[0] ?? "";
  return path.trim() || null;
}

async function isUrlAccessible(url: string): Promise<boolean> {
  try {
    const head = await fetch(url, { method: "HEAD" });
    if (head.ok) return true;
  } catch {
    /* noop */
  }
  try {
    const get = await fetch(url, { method: "GET" });
    return get.ok;
  } catch {
    return false;
  }
}

export async function resolveBrandLogoUrlForExcel(
  supabase: SupabaseClient,
  rawUrl: string | null | undefined,
): Promise<string | null> {
  const source = typeof rawUrl === "string" ? rawUrl.trim() : "";
  if (!source) return null;

  if (await isUrlAccessible(source)) return source;

  const path = extractBrandLogoPath(source);
  if (!path) return null;

  const { data, error } = await supabase.storage.from("brand-logos").createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return null;
  if (!(await isUrlAccessible(data.signedUrl))) return null;
  return data.signedUrl;
}
