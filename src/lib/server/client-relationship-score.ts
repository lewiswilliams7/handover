import {
  parseCachedHealth,
  type HealthSignal,
} from "@/lib/server/client-health";

/** Same inputs as {@link import("./client-health").ClientHealthInput} — PSA-agnostic. */
export interface RelationshipScoreInput {
  daysSinceLastReport: number;
  openRiskCount: number;
  recurringIssueCount: number;
  generationCount: number;
  hasScheduled: boolean;
  cachedSummaryHealth: HealthSignal | null;
  cachedSummaryUpdatedAt: string | null;
  /** Reserved for future CSAT / satisfaction integration (0–100). Not used yet. */
  satisfactionScore?: number | null;
}

export type RelationshipScoreLabel =
  | "Excellent"
  | "Good"
  | "At Risk"
  | "Critical";

export type RelationshipScoreComponentKey =
  | "reportCadence"
  | "openRisks"
  | "recurringIssues"
  | "scheduleCadence";

export type RelationshipScoreComponent = {
  key: RelationshipScoreComponentKey;
  score: number;
  weight: number;
  weightedContribution: number;
  label: string;
  detail: string;
};

export type RelationshipScoreBreakdown = {
  components: RelationshipScoreComponent[];
  /** When a fresh AI summary health exists, advisory alignment (not in weighted total). */
  aiHealthSignal: {
    score: number;
    health: HealthSignal;
    fresh: boolean;
    detail: string;
  } | null;
  /** Future slot — populated when satisfaction data is integrated. */
  satisfaction: { score: number | null; included: boolean; detail: string };
  total: number;
  label: RelationshipScoreLabel;
};

const SUMMARY_TTL_DAYS = 14;

const WEIGHTS: Record<RelationshipScoreComponentKey, number> = {
  reportCadence: 0.35,
  openRisks: 0.3,
  recurringIssues: 0.2,
  scheduleCadence: 0.15,
};

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Report cadence (35%): no penalty under 7 days; steep drop after 21 days
 * (aligned with red RAG threshold in computeClientHealth).
 */
export function scoreReportCadence(daysSinceLastReport: number): number {
  const days = Math.max(0, daysSinceLastReport);
  if (days <= 7) return 100;
  if (days <= 14) return clampScore(100 - (days - 7) * 5);
  if (days <= 21) return clampScore(65 - (days - 14) * 7);
  if (days <= 45) return clampScore(Math.max(8, 16 - (days - 21) * 0.35));
  return 5;
}

/**
 * Open risks (30%): escalating penalty per open risk in the latest report.
 */
export function scoreOpenRisks(openRiskCount: number): number {
  const n = Math.max(0, openRiskCount);
  if (n === 0) return 100;
  if (n === 1) return 78;
  if (n === 2) return 55;
  if (n === 3) return 32;
  return clampScore(Math.max(0, 32 - (n - 3) * 14));
}

/**
 * Recurring issues (20%): patterns that repeat across reports hurt the score.
 */
export function scoreRecurringIssues(recurringIssueCount: number): number {
  const n = Math.max(0, recurringIssueCount);
  if (n === 0) return 100;
  if (n === 1) return 72;
  if (n === 2) return 48;
  if (n === 3) return 28;
  return clampScore(Math.max(0, 28 - (n - 3) * 12));
}

/**
 * Schedule cadence (15%): automated reporting is a proxy for consistent
 * client communication infrastructure; manual-only cadence scores lower.
 */
export function scoreScheduleCadence(
  hasScheduled: boolean,
  generationCount: number,
): number {
  if (hasScheduled) return 100;
  const gens = Math.max(0, generationCount);
  if (gens >= 10) return 55;
  if (gens >= 6) return 42;
  if (gens >= 3) return 28;
  if (gens >= 1) return 15;
  return 0;
}

function healthSignalToScore(health: HealthSignal): number {
  switch (health) {
    case "green":
      return 92;
    case "amber":
      return 58;
    case "red":
      return 28;
  }
}

export function relationshipScoreLabel(total: number): RelationshipScoreLabel {
  if (total >= 80) return "Excellent";
  if (total >= 60) return "Good";
  if (total >= 40) return "At Risk";
  return "Critical";
}

export function relationshipScoreLabelColour(total: number): string {
  if (total >= 80) return "green";
  if (total >= 60) return "amber";
  if (total >= 40) return "orange";
  return "red";
}

function cadenceDetail(days: number): string {
  if (days <= 7) return `Last report ${days === 0 ? "today" : `${days} day(s) ago`}, on cadence.`;
  if (days <= 21) return `Last report ${days} days ago. The reporting gap is widening.`;
  return `Last report ${days} days ago, well past a healthy weekly cadence.`;
}

export function getRelationshipScoreBreakdown(
  input: RelationshipScoreInput,
): RelationshipScoreBreakdown {
  const days = Math.max(0, input.daysSinceLastReport);
  const risks = Math.max(0, input.openRiskCount);
  const recurring = Math.max(0, input.recurringIssueCount);

  const reportCadenceScore = scoreReportCadence(days);
  const openRisksScore = scoreOpenRisks(risks);
  const recurringScore = scoreRecurringIssues(recurring);
  const scheduleScore = scoreScheduleCadence(
    input.hasScheduled,
    input.generationCount,
  );

  const components: RelationshipScoreComponent[] = [
    {
      key: "reportCadence",
      score: reportCadenceScore,
      weight: WEIGHTS.reportCadence,
      weightedContribution: reportCadenceScore * WEIGHTS.reportCadence,
      label: "Report cadence",
      detail: cadenceDetail(days),
    },
    {
      key: "openRisks",
      score: openRisksScore,
      weight: WEIGHTS.openRisks,
      weightedContribution: openRisksScore * WEIGHTS.openRisks,
      label: "Open risks",
      detail:
        risks === 0
          ? "No open risks in the latest report."
          : `${risks} open risk${risks === 1 ? "" : "s"} in the latest report.`,
    },
    {
      key: "recurringIssues",
      score: recurringScore,
      weight: WEIGHTS.recurringIssues,
      weightedContribution: recurringScore * WEIGHTS.recurringIssues,
      label: "Recurring issues",
      detail:
        recurring === 0
          ? "No recurring issues flagged across report history."
          : `${recurring} recurring issue pattern${recurring === 1 ? "" : "s"} detected.`,
    },
    {
      key: "scheduleCadence",
      score: scheduleScore,
      weight: WEIGHTS.scheduleCadence,
      weightedContribution: scheduleScore * WEIGHTS.scheduleCadence,
      label: "Reporting infrastructure",
      detail: input.hasScheduled
        ? "Automated scheduled reports are active for this client."
        : "No automated schedule. Relies on manual report generation.",
    },
  ];

  let total = components.reduce((sum, c) => sum + c.weightedContribution, 0);

  const parsedHealth = parseCachedHealth(input.cachedSummaryHealth);
  let aiHealthSignal: RelationshipScoreBreakdown["aiHealthSignal"] = null;
  if (parsedHealth && input.cachedSummaryUpdatedAt) {
    const ageMs = Date.now() - new Date(input.cachedSummaryUpdatedAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const fresh = ageDays < SUMMARY_TTL_DAYS;
    if (fresh) {
      const aiScore = healthSignalToScore(parsedHealth);
      aiHealthSignal = {
        score: aiScore,
        health: parsedHealth,
        fresh: true,
        detail: `Recent AI account health assessment: ${parsedHealth}.`,
      };
      total = total * 0.85 + aiScore * 0.15;
    }
  }

  // Future: when satisfactionScore is provided, blend e.g. 15% from satisfaction
  // and reduce other weights proportionally — slot reserved, not applied yet.
  const satisfaction = {
    score: input.satisfactionScore ?? null,
    included: false,
    detail: "Client satisfaction data not connected yet.",
  };

  const rounded = clampScore(total);

  return {
    components,
    aiHealthSignal,
    satisfaction,
    total: rounded,
    label: relationshipScoreLabel(rounded),
  };
}

export function computeRelationshipScore(input: RelationshipScoreInput): {
  score: number;
  label: RelationshipScoreLabel;
  breakdown: RelationshipScoreBreakdown;
} {
  const breakdown = getRelationshipScoreBreakdown(input);
  return {
    score: breakdown.total,
    label: breakdown.label,
    breakdown,
  };
}
