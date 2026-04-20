import type { ExecutiveLogoExt } from "@/lib/xlsx-patch-executive-logo";

const MAX_BYTES = 2 * 1024 * 1024;

function extFromMagic(buf: Uint8Array): ExecutiveLogoExt | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "jpeg";
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return "png";
  }
  return null;
}

/**
 * Fetches logo bytes for Excel OOXML embedding (Executive Summary drawing).
 * Uses no-store so CDN/browser caches do not serve a stale logo.
 */
export async function fetchBrandLogoBytesForExcel(
  url: string,
): Promise<{ bytes: Uint8Array; ext: ExecutiveLogoExt } | null> {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const res = await fetch(trimmed, { cache: "no-store" });
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_BYTES) return null;
    const ct = (res.headers.get("content-type") ?? "").toLowerCase();
    const magic = extFromMagic(buf);
    if (magic) {
      return { bytes: buf, ext: magic };
    }
    if (ct.includes("jpeg") || ct.includes("jpg")) {
      return { bytes: buf, ext: "jpeg" };
    }
    if (ct.includes("png")) {
      return { bytes: buf, ext: "png" };
    }
    return null;
  } catch {
    return null;
  }
}
