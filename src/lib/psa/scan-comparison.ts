import type { ScanFinding } from "@/lib/psa/scan-findings";

export const SCAN_COMPARISON_MAX_AGE_DAYS = 60;
const DAY_MS = 86_400_000;

export type ScanFindingChangeStatus = "new" | "ongoing";

export type ScanComparison = {
  previousScanCreatedAt: string;
  baselineAgeDays: number;
  newFindingKeys: string[];
  ongoingFindingKeys: string[];
  resolvedFindings: ScanFinding[];
  resolvedClientNames: Record<string, string>;
  resolvedClientCount: number;
};

type ComparableScanResults = {
  findings?: readonly ScanFinding[] | null;
  clientNames?: Record<string, string> | null;
};

export function scanFindingComparisonKey(clientId: number, type: string): string {
  return `${clientId}:${type}`;
}

function findingsByKey(findings: readonly ScanFinding[] | null | undefined): Map<string, ScanFinding> {
  const indexed = new Map<string, ScanFinding>();
  for (const finding of findings ?? []) {
    if (
      !Number.isSafeInteger(finding.clientId) ||
      finding.clientId <= 0 ||
      typeof finding.type !== "string" ||
      finding.type.length === 0
    ) {
      continue;
    }
    indexed.set(scanFindingComparisonKey(finding.clientId, finding.type), finding);
  }
  return indexed;
}

export function compareScanFindings(
  current: ComparableScanResults,
  previous: ComparableScanResults,
  currentCreatedAt: string,
  previousCreatedAt: string,
): ScanComparison | null {
  const currentTime = Date.parse(currentCreatedAt);
  const previousTime = Date.parse(previousCreatedAt);
  if (Number.isNaN(currentTime) || Number.isNaN(previousTime) || currentTime < previousTime) {
    return null;
  }

  const ageMs = currentTime - previousTime;
  if (ageMs > SCAN_COMPARISON_MAX_AGE_DAYS * DAY_MS) return null;

  const currentByKey = findingsByKey(current.findings);
  const previousByKey = findingsByKey(previous.findings);
  const newFindingKeys: string[] = [];
  const ongoingFindingKeys: string[] = [];

  for (const key of currentByKey.keys()) {
    if (previousByKey.has(key)) ongoingFindingKeys.push(key);
    else newFindingKeys.push(key);
  }

  const resolvedFindings: ScanFinding[] = [];
  const resolvedClientNames: Record<string, string> = {};
  const resolvedClientIds = new Set<number>();
  for (const [key, finding] of previousByKey) {
    if (currentByKey.has(key)) continue;
    resolvedFindings.push(finding);
    resolvedClientIds.add(finding.clientId);
    const name = previous.clientNames?.[String(finding.clientId)]?.trim();
    if (name) resolvedClientNames[String(finding.clientId)] = name;
  }

  return {
    previousScanCreatedAt: previousCreatedAt,
    baselineAgeDays: Math.floor(ageMs / DAY_MS),
    newFindingKeys,
    ongoingFindingKeys,
    resolvedFindings,
    resolvedClientNames,
    resolvedClientCount: resolvedClientIds.size,
  };
}
