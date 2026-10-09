import type { ScanEvidenceRef } from "@/lib/psa/scan-evidence";

export function buildHaloScanEvidenceDeepLink(
  instanceUrl: string | null | undefined,
  ref: ScanEvidenceRef,
): string | null {
  if (!instanceUrl || ref.source !== "halo") return null;

  let base: URL;
  try {
    base = new URL(instanceUrl);
  } catch {
    return null;
  }
  if (base.protocol !== "https:" && base.protocol !== "http:") return null;

  const path = ref.kind === "quote" ? "/order" : "/ticket";
  const query = ref.kind === "quote" ? "quoteid" : "id";
  return `${base.origin}${path}?${query}=${encodeURIComponent(String(ref.id))}`;
}
