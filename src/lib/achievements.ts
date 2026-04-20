/**
 * Profile achievement ids (stored in `profiles.achievements_shown`) and copy for unlock toasts.
 * Post-demo: expand into full achievements UI.
 */

export const ACHIEVEMENT_IDS = [
  "first_generation",
  "total_generations_10",
  "total_generations_50",
  "streak_3",
  "streak_7",
  "streak_14",
  "streak_30",
  "streak_100",
  "first_halo_pushback",
  "first_scheduled_report_sent",
] as const;

export type AchievementId = (typeof ACHIEVEMENT_IDS)[number];

const VALID = new Set<string>(ACHIEVEMENT_IDS);

export const ACHIEVEMENT_COPY: Record<
  AchievementId,
  { subtitle: string }
> = {
  first_generation: { subtitle: "⚡ First Report - Welcome to Handover!" },
  total_generations_10: { subtitle: "⚡ Getting Started — milestone reached" },
  total_generations_50: { subtitle: "⚡ Power User - 50 reports generated" },
  streak_3: { subtitle: "🔥 On a Roll - 3 day streak!" },
  streak_7: { subtitle: "🔥 Week Warrior - 7 day streak!" },
  streak_14: { subtitle: "🔥 Fortnight - 14 day streak!" },
  streak_30: { subtitle: "🔥 Monthly Master - 30 day streak!" },
  streak_100: { subtitle: "🔥 Century Club - 100 day streak!" },
  first_halo_pushback: { subtitle: "🔄 Connected - first report pushed to HaloPSA" },
  first_scheduled_report_sent: { subtitle: "📅 Automated - first scheduled report delivered" },
};

export function isAchievementId(id: string): id is AchievementId {
  return VALID.has(id);
}

export function streakMilestoneToAchievementId(
  milestone: number,
): AchievementId | null {
  if (milestone === 3) return "streak_3";
  if (milestone === 7) return "streak_7";
  if (milestone === 14) return "streak_14";
  if (milestone === 30) return "streak_30";
  if (milestone === 100) return "streak_100";
  return null;
}

/** Flame colour for sidebar streak pill (hex). */
export function streakFlameColor(days: number): string {
  if (days >= 100) return "#C9A84C";
  if (days >= 30) return "#2563EB";
  if (days >= 14) return "#7C3AED";
  if (days >= 7) return "#EF4444";
  return "#F97316";
}

export const STREAK_FLAME_CELEBRATION_MILESTONES = new Set([7, 14, 30, 100]);
