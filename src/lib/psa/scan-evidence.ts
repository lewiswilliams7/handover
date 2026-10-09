export type ScanEvidenceSource = "halo" | "connectwise";

export type ScanEvidenceKind = "ticket" | "quote" | "project";

export type ScanEvidenceRef = {
  source: ScanEvidenceSource;
  kind: ScanEvidenceKind;
  id: number;
};

export function capScanEvidence(
  refs: readonly ScanEvidenceRef[] | null | undefined,
  limit = 10,
): ScanEvidenceRef[] {
  const capped: ScanEvidenceRef[] = [];
  const seen = new Set<string>();

  for (const ref of refs ?? []) {
    if (
      !Number.isSafeInteger(ref.id) ||
      ref.id <= 0 ||
      (ref.source !== "halo" && ref.source !== "connectwise") ||
      (ref.kind !== "ticket" && ref.kind !== "quote" && ref.kind !== "project")
    ) {
      continue;
    }
    const key = `${ref.source}:${ref.kind}:${ref.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    capped.push(ref);
    if (capped.length >= limit) break;
  }

  return capped;
}

export function parseScanEvidence(value: unknown): ScanEvidenceRef[] {
  if (!Array.isArray(value)) return [];
  return capScanEvidence(
    value.flatMap((candidate) => {
      if (!candidate || typeof candidate !== "object") return [];
      const ref = candidate as Record<string, unknown>;
      const source = ref.source;
      const kind = ref.kind;
      const id = typeof ref.id === "number" ? ref.id : Number(ref.id);
      if (
        (source !== "halo" && source !== "connectwise") ||
        (kind !== "ticket" && kind !== "quote" && kind !== "project") ||
        !Number.isSafeInteger(id)
      ) {
        return [];
      }
      return [{ source, kind, id } as ScanEvidenceRef];
    }),
  );
}
