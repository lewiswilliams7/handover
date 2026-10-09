export type HealthSignal = "red" | "amber" | "green";

export function parseCachedHealth(
  value: string | null | undefined,
): HealthSignal | null {
  if (value === "red" || value === "amber" || value === "green") {
    return value;
  }
  return null;
}

export interface ClientHealthInput {
  daysSinceLastReport: number;
  openRiskCount: number;
  recurringIssueCount: number;
  generationCount: number;
  hasScheduled: boolean;
  cachedSummaryHealth: HealthSignal | null;
  cachedSummaryUpdatedAt: string | null;
}

const SUMMARY_TTL_DAYS = 14;

export function computeClientHealth(input: ClientHealthInput): HealthSignal {
  const {
    daysSinceLastReport,
    openRiskCount,
    recurringIssueCount,
    generationCount,
    hasScheduled,
    cachedSummaryHealth,
    cachedSummaryUpdatedAt,
  } = input;

  // 1. Use cached AI summary if recent enough
  if (cachedSummaryHealth && cachedSummaryUpdatedAt) {
    const ageMs = Date.now() - new Date(cachedSummaryUpdatedAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays < SUMMARY_TTL_DAYS) {
      return cachedSummaryHealth;
    }
  }

  // 2. Deterministic fallback — single set of rules, used everywhere
  if (openRiskCount >= 3) return "red";
  if (daysSinceLastReport > 21) return "red";
  if (recurringIssueCount >= 3) return "red";

  if (openRiskCount >= 1) return "amber";
  if (daysSinceLastReport > 14) return "amber";
  if (recurringIssueCount >= 1) return "amber";
  if (generationCount < 3) return "amber";
  if (!hasScheduled) return "amber";

  return "green";
}

export const HEALTH_JUSTIFICATIONS: Record<HealthSignal, string> = {
  red: "Account has significant open risks or recurring issues requiring urgent attention.",
  amber: "Some open items or patterns that need monitoring.",
  green: "Delivery is consistent and issues are being resolved week to week.",
};
