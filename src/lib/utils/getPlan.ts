/**
 * Single source of truth for billing / access tier checks.
 * All plan gating must use these helpers (import from here or from `@/lib/plans`, which re-exports this module).
 * Tier data is stored on `profiles` (and team rows) and kept in sync by the Stripe webhook + reconcile API.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { getMonthlyReportLimit } from "@/lib/plan-limits";

/** Canonical `profiles.plan` + `profiles.team_id` + trial + Stripe sync fields (same shape everywhere). */
export type UserPlanFields = {
  plan: string | null;
  team_id: string | null;
  trial_ends_at: string | null;
  trial_plan: string | null;
  /** Stripe subscription status on `profiles` (solo billing). Null/absent = legacy row before backfill — treated as live. */
  subscription_status: string | null;
};

/**
 * Parses plan fields from any profile row - keep in sync with {@link getUserPlan}.
 */
export function planFieldsFromProfileRow(
  row: {
    plan?: unknown;
    team_id?: unknown;
    trial_ends_at?: unknown;
    trial_plan?: unknown;
    subscription_status?: unknown;
  } | null | undefined,
): UserPlanFields {
  if (!row)
    return {
      plan: null,
      team_id: null,
      trial_ends_at: null,
      trial_plan: null,
      subscription_status: null,
    };
  const plan = typeof row.plan === "string" ? row.plan : null;
  const team_id =
    typeof row.team_id === "string" && row.team_id.trim() ? row.team_id.trim() : null;
  const trial_ends_at =
    typeof row.trial_ends_at === "string" && row.trial_ends_at.trim()
      ? row.trial_ends_at.trim()
      : null;
  const trial_plan =
    typeof row.trial_plan === "string" && row.trial_plan.trim() ? row.trial_plan.trim() : null;
  const subscription_status =
    typeof row.subscription_status === "string" && row.subscription_status.trim()
      ? row.subscription_status.trim()
      : null;
  return { plan, team_id, trial_ends_at, trial_plan, subscription_status };
}

/**
 * Single source of truth: read billing fields from Supabase.
 * Use this (or {@link planFieldsFromProfileRow} on an already-fetched row) for all plan gating.
 */
export async function getUserPlan(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserPlanFields> {
  const { data, error } = await supabase
    .from("profiles")
    .select("plan, team_id, trial_ends_at, trial_plan, subscription_status")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.warn("[getUserPlan]", userId, error.message);
    return {
      plan: null,
      team_id: null,
      trial_ends_at: null,
      trial_plan: null,
      subscription_status: null,
    };
  }
  return planFieldsFromProfileRow(data);
}

/** Normalize legacy `pro` to `professional` for identifier comparisons. */
export function canonicalPlanId(plan: string | null | undefined): string {
  if (plan === null || plan === undefined) return "";
  const p = String(plan).trim().toLowerCase();
  if (p === "pro") return "professional";
  return p;
}

/**
 * @deprecated Prefer {@link canonicalPlanId} for plan identifiers. Kept for display normalisation.
 * Does not map `basic` to `free` — basic is a legacy paid tier treated as expired for access.
 */
export function normalizePlanLabel(plan: string | null | undefined): string {
  if (plan === null || plan === undefined) return "";
  return String(plan).trim().toLowerCase();
}

export function isProOrTeam(plan: string): boolean {
  const p = canonicalPlanId(plan);
  return (
    p === "professional" ||
    p === "handover" ||
    p === "starter_programme" ||
    p === "team" ||
    p === "professional_trial" ||
    p === "team_trial"
  );
}

/** Pro, Team, or Enterprise - used for paid UI surfaces (dashboard, imports, etc.). */
export function isDeliveryHealthPlan(plan: string): boolean {
  const p = canonicalPlanId(plan);
  return (
    p === "professional" ||
    p === "handover" ||
    p === "starter_programme" ||
    p === "team" ||
    p === "enterprise" ||
    p === "professional_trial" ||
    p === "team_trial"
  );
}

/** Solo Stripe subscription states that keep paid `profiles.plan` features (mirrors team billing grace). */
export const SOLO_SUBSCRIPTION_LIVE_STATUSES = [
  "active",
  "trialing",
  "past_due",
] as const;

export function isSoloSubscriptionLive(status: string | null | undefined): boolean {
  if (status === null || status === undefined || !String(status).trim()) {
    return true;
  }
  const s = String(status).trim().toLowerCase();
  return (SOLO_SUBSCRIPTION_LIVE_STATUSES as readonly string[]).includes(s);
}

function normalizeTrialPlanSku(raw: string | null | undefined): "professional" | "team" | null {
  const t = normalizePlanLabel(raw ?? "");
  if (t === "team" || t === "team_trial") return "team";
  if (t === "professional" || t === "professional_trial" || t === "pro") return "professional";
  return null;
}

/**
 * Numeric tier for feature gating (0 = none/basic/expired trial / inactive sub; 1 = legacy Professional; 2 = legacy Team; 3 = Handover/Enterprise).
 * Uses full profile fields: paid SKUs require a live `subscription_status` (null status = legacy permissive).
 */
export function getPlanTierFromFields(fields: UserPlanFields): 0 | 1 | 2 | 3 {
  if (typeof fields.team_id === "string" && fields.team_id.trim().length > 0) {
    const wp = normalizePlanLabel(fields.plan ?? "");
    if (wp === "enterprise") return 3;
    /** Team workspace (any non-Enterprise seat) uses Team-tier product limits. */
    return 2;
  }

  const p = normalizePlanLabel(fields.plan ?? "");
  const canon = p === "pro" ? "professional" : p;
  const end = fields.trial_ends_at;
  const trialEndDate = end ? new Date(end) : null;
  const trialStillActive = trialEndDate !== null && trialEndDate.getTime() > Date.now();

  if (!canon || canon === "free") {
    const sku = normalizeTrialPlanSku(fields.trial_plan);
    if (trialStillActive && sku === "team") return 2;
    if (trialStillActive && sku === "professional") return 1;
    return 0;
  }

  if (canon === "basic") return 0;

  if (canon === "professional_trial" || canon === "team_trial") {
    if (!trialStillActive) return 0;
    return canon === "team_trial" ? 2 : 1;
  }

  if (
    canon === "enterprise" ||
    canon === "team" ||
    canon === "professional" ||
    canon === "handover" ||
    canon === "starter_programme"
  ) {
    if (!isSoloSubscriptionLive(fields.subscription_status)) return 0;
    if (canon === "handover" || canon === "starter_programme") return 3;
    if (canon === "enterprise") return 3;
    if (canon === "team") return 2;
    return 1;
  }

  return 0;
}

/**
 * Current billing model entitlement. Handover and the application-only
 * Starter Programme share one paid capability set; legacy paid plans and
 * active trials remain accepted while existing accounts are migrated.
 */
export function hasHandoverEntitlement(fields: UserPlanFields): boolean {
  if (fields.team_id?.trim()) return true;

  const canon = canonicalPlanId(fields.plan);
  if (canon === "handover" || canon === "starter_programme") {
    return isSoloSubscriptionLive(fields.subscription_status);
  }

  return getPlanTierFromFields(fields) >= 1;
}

/**
 * @deprecated Prefer {@link getPlanTierFromFields} with a full {@link UserPlanFields} row from Supabase.
 * Uses permissive subscription handling (no `subscription_status`).
 */
export function getPlanTier(
  planRaw: string | null | undefined,
  trialEndsAt?: string | null,
): 0 | 1 | 2 | 3 {
  return getPlanTierFromFields({
    plan: planRaw ?? null,
    team_id: null,
    trial_ends_at: trialEndsAt ?? null,
    trial_plan: null,
    subscription_status: null,
  });
}

export function isTrialExpired(user: {
  plan?: string | null;
  trial_ends_at?: string | null;
  trial_plan?: string | null;
}): boolean {
  const end = user.trial_ends_at;
  const past = !end || new Date(end) <= new Date();
  if (!past) return false;

  const p = normalizePlanLabel(user.plan ?? "");
  if (p === "professional_trial" || p === "team_trial") return true;

  const tp = normalizeTrialPlanSku(user.trial_plan);
  if (p === "free" && (tp === "professional" || tp === "team")) return true;

  return false;
}

/**
 * Solo users: block new report generation (upgrade) while still allowing read-only access to past reports.
 * Team members are never blocked here (team billing applies on the team row).
 */
export function isSoloGenerationBlockedByPlan(fields: UserPlanFields): boolean {
  if (typeof fields.team_id === "string" && fields.team_id.trim()) return false;
  const p = normalizePlanLabel(fields.plan ?? "");
  if (p === "basic") return true;
  if (isTrialExpired(fields)) return true;

  const canon = p === "pro" ? "professional" : p;
  if (
    canon === "professional" ||
    canon === "team" ||
    canon === "enterprise"
  ) {
    if (!isSoloSubscriptionLive(fields.subscription_status)) return true;
  }

  return false;
}

/**
 * Full access check using profile row shape (includes trial expiry).
 */
export function userPlanHasProAccess(fields: UserPlanFields): boolean {
  return hasProTierAccess(fields);
}

/**
 * Pro-tier access from full `profiles` billing fields (plan + team + trials + solo `subscription_status`).
 */
export function hasProTierAccess(fields: UserPlanFields): boolean {
  return hasHandoverEntitlement(fields);
}

/**
 * Maps DB `profiles` billing fields to the sidebar/UI tier (e.g. `refreshUsage` state).
 * Uses `pro` for the Professional SKU to limit churn in UI state; map from `professional` / trials.
 */
export function profilePlanToUiTier(fields: UserPlanFields): "free" | "pro" | "team" | "enterprise" {
  const raw = normalizePlanLabel(fields.plan ?? "");
  const p = raw === "pro" ? "professional" : raw;
  const hasTeamId =
    typeof fields.team_id === "string" && fields.team_id.trim().length > 0;

  if (hasTeamId) {
    if (p === "team" || p === "team_trial") return "team";
    if (p === "enterprise") return "enterprise";
    return "pro";
  }

  if (
    (p === "handover" || p === "starter_programme") &&
    getPlanTierFromFields(fields) > 0
  ) {
    return "pro";
  }

  const tier = getPlanTierFromFields(fields);
  if (tier === 3) return "enterprise";
  if (tier === 2) return "team";
  if (tier === 1) return "pro";
  return "free";
}

/**
 * Delivery health API: same rule as client `hasProAccess` - `profiles` fields only.
 */
export async function userHasDeliveryHealthAccess(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const fields = await getUserPlan(supabase, userId);
  return userPlanHasProAccess(fields);
}

/** API + UI: paid tiers get full delivery health; free/basic/expired solo gets limited dashboard mode. */
export type DeliveryHealthDashboardAccess = "basic" | "full";

export async function getDeliveryHealthDashboardAccess(
  supabase: SupabaseClient,
  userId: string,
): Promise<DeliveryHealthDashboardAccess> {
  const fields = await getUserPlan(supabase, userId);
  return userPlanHasProAccess(fields) ? "full" : "basic";
}

export function getPlanLabel(
  plan: string,
  teamId: string | null,
  opts?: { trial_ends_at?: string | null; trial_plan?: string | null },
): string {
  const p = canonicalPlanId(plan);
  const end = opts?.trial_ends_at;
  const trialActive = end && new Date(end) > new Date();
  const sku = normalizeTrialPlanSku(opts?.trial_plan ?? null);

  if (p === "enterprise") return "Enterprise";
  if (p === "handover" || p === "starter_programme") return "Handover";
  if (
    trialActive &&
    (p === "team_trial" || (p === "team" && sku === "team"))
  ) {
    return "Trial";
  }
  if (teamId) return "Growth";
  if (p === "free" && trialActive && (sku === "team" || sku === "professional")) return "Trial";
  if (p === "professional_trial") return "Trial";
  if (p === "team_trial") return "Trial";
  if (p === "team") return "Growth";
  if (p === "professional" || p === "pro") return "Starter";
  if (isProOrTeam(plan)) return "Starter";
  if (p === "basic") return "Limited";
  return "Free";
}

export function isTeamPlan(plan: string): boolean {
  const p = canonicalPlanId(plan);
  return p === "team" || p === "team_trial";
}

/** Shown when solo Professional SKUs attempt to invite colleagues. */
export const TEAM_MEMBER_INVITES_BLOCKED_MESSAGE =
  "Team members are included with an active Handover plan. Upgrade to add your team.";

/**
 * True when the user's profile is a Professional solo SKU (paid, legacy column trial, or in-app
 * Starter trial) — they must not invite additional users.
 * Team trial (`team_trial`, or free + active `trial_plan` team) is not blocked.
 */
export function profilePlanBlocksTeamMemberInvites(row: {
  plan?: string | null;
  trial_plan?: string | null;
  trial_ends_at?: string | null;
}): boolean {
  const p = normalizePlanLabel(row.plan ?? "");
  const canon = p === "pro" ? "professional" : p;

  if (canon === "professional" || canon === "professional_trial") {
    return true;
  }

  if (canon === "team_trial") {
    return false;
  }

  if (canon === "free") {
    const end = row.trial_ends_at;
    const trialStillActive = Boolean(end && new Date(end) > new Date());
    if (!trialStillActive) return false;
    const sku = normalizeTrialPlanSku(row.trial_plan);
    return sku === "professional";
  }

  return false;
}

/** Team workspace is on a multi-seat product (Team / Enterprise), not solo Professional. */
export function teamWorkspaceAllowsMemberInvites(teamPlanRaw: string | null | undefined): boolean {
  const p = normalizePlanLabel(teamPlanRaw ?? "");
  return p === "team" || p === "team_trial" || p === "enterprise";
}

/** Stripe-style team billing states that may use pooled generations and scheduled reports. */
export const VALID_TEAM_SUBSCRIPTION_STATUSES = [
  "active",
  "trialing",
  "past_due",
] as const;

export function isValidTeamSubscriptionStatus(
  status: string | null | undefined,
): boolean {
  if (status === null || status === undefined) return false;
  const s = String(status).trim().toLowerCase();
  return (VALID_TEAM_SUBSCRIPTION_STATUSES as readonly string[]).includes(s);
}

/** Max seats Stripe allows; generations scale per purchased seat. */
export const TEAM_LIMITS = {
  team: { seats: 20, generationsPerSeat: 300 },
} as const;

export {
  getMonthlyGenerationLimit,
  STARTER_MONTHLY_GENERATION_LIMIT as PRO_SOLO_MONTHLY_GENERATION_LIMIT,
} from "@/lib/plan-limits";

function getPlanTierLabel(fields: UserPlanFields): string {
  const tier = getPlanTierFromFields(fields);
  if (tier === 3) return "enterprise";
  if (tier === 2) return "team";
  if (tier === 1) return "professional";
  return normalizePlanLabel(fields.plan ?? "") || "free";
}

export function getQbrPacksPerMonthLimit(
  fields: UserPlanFields,
  /** `teams.plan` when `fields.team_id` is set; ignored for solo billing. */
  teamPlanFromRow: string | null,
): number | null {
  const plan = fields.team_id
    ? normalizePlanLabel(teamPlanFromRow ?? "team")
    : getPlanTierLabel(fields);

  return getMonthlyReportLimit(plan);
}

/**
 * QBR usage copy — prefers explicit `professional_trial` / `team_trial` (and free + `trial_plan`) so messaging
 * matches the trial SKU even when UI tier state is wrong.
 */
export function qbrPackUsageHintCopy(
  fields: UserPlanFields,
  /** `teams.plan` when `fields.team_id` is set; ignored for solo billing. */
  teamPlanFromRow: string | null,
): string | null {
  const solo =
    typeof fields.team_id !== "string" || !fields.team_id.trim().length;
  const pdb = normalizePlanLabel(fields.plan ?? "");
  if (solo && pdb === "professional_trial") {
    return "Starter trial includes 1 QBR pack per calendar month (UTC).";
  }
  if (solo && pdb === "team_trial") {
    return "Growth trial includes 3 QBR packs per month, pooled across your team (UTC).";
  }
  if (solo && pdb === "free") {
    const end = fields.trial_ends_at;
    const trialStillActive = Boolean(end && new Date(end).getTime() > Date.now());
    if (trialStillActive) {
      const sku = normalizeTrialPlanSku(fields.trial_plan);
      if (sku === "professional") {
        return "Starter trial includes 1 QBR pack per calendar month (UTC).";
      }
      if (sku === "team") {
        return "Growth trial includes 3 QBR packs per month, pooled across your team (UTC).";
      }
    }
  }

  const n = getQbrPacksPerMonthLimit(fields, teamPlanFromRow);
  if (n === null) {
    if (pdb === "handover" || pdb === "starter_programme") {
      return "Handover includes unlimited QBR packs.";
    }
    const tier = getPlanTierFromFields(fields);
    if (tier >= 3) return "Enterprise includes unlimited QBR packs.";
    if (tier >= 1) return "Unlimited QBR packs.";
    return null;
  }
  if (n === 0) return null;
  if (n === 1) return "Starter includes 1 QBR pack per calendar month (UTC).";
  return "Growth includes 3 QBR packs per month, pooled across your team (UTC).";
}

export function clampTeamSeatCount(raw: number): number {
  if (!Number.isFinite(raw)) return 1;
  return Math.min(TEAM_LIMITS.team.seats, Math.max(1, Math.floor(raw)));
}

export function teamGenerationLimitForSeats(seatCount: number): number {
  return clampTeamSeatCount(seatCount) * TEAM_LIMITS.team.generationsPerSeat;
}

/** Seat cap for a team row (invite limits). Prefers seat_limit; falls back from generation_limit. */
export function teamSeatCapFromRow(team: {
  seat_limit?: number | null;
  generation_limit?: number | null;
}): number {
  if (typeof team.seat_limit === "number" && team.seat_limit >= 1) {
    return Math.min(TEAM_LIMITS.team.seats, team.seat_limit);
  }
  if (typeof team.generation_limit === "number" && team.generation_limit > 0) {
    const derived = Math.round(team.generation_limit / TEAM_LIMITS.team.generationsPerSeat);
    return clampTeamSeatCount(derived);
  }
  return 3;
}

/** @deprecated Use teamSeatCapFromRow with team row */
export function seatCapForTeamPlan(_plan: string): number {
  return TEAM_LIMITS.team.seats;
}

/** Pro solo or any plan that unlocks Pro features (including team SKU). Reads only `profiles` / `teams`. */
export async function isProUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const fields = await getUserPlan(supabase, userId);
  if (userPlanHasProAccess(fields)) return true;
  if (fields.team_id) {
    const { data: team } = await supabase
      .from("teams")
      .select("plan")
      .eq("id", fields.team_id)
      .maybeSingle();
    return team ? isProOrTeam(team.plan ?? "") : false;
  }
  return false;
}

/** Used by scheduled-reports cron: user has Pro-level access (solo or via team). */
export async function userIdsWithScheduledAccess(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, plan, team_id, trial_ends_at, trial_plan, subscription_status")
    .in("id", userIds);
  const teamIds = [
    ...new Set(
      (profiles ?? [])
        .map((p) => p.team_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];
  const teamById = new Map<
    string,
    { plan: string; subscription_status: string | null }
  >();
  if (teamIds.length > 0) {
    const { data: teams } = await supabase
      .from("teams")
      .select("id, plan, subscription_status")
      .in("id", teamIds);
    for (const t of teams ?? []) {
      if (t.id) {
        teamById.set(t.id, {
          plan: t.plan ?? "",
          subscription_status:
            typeof t.subscription_status === "string"
              ? t.subscription_status
              : null,
        });
      }
    }
  }
  const out = new Set<string>();
  for (const p of profiles ?? []) {
    if (!p.id) continue;
    const pf = planFieldsFromProfileRow(p);
    if (hasProTierAccess(pf)) {
      out.add(p.id);
      continue;
    }
    if (p.team_id) {
      const team = teamById.get(p.team_id);
      const tp = team?.plan ?? "";
      if (
        team !== undefined &&
        isProOrTeam(tp) &&
        isValidTeamSubscriptionStatus(team.subscription_status)
      ) {
        out.add(p.id);
      }
    }
  }
  return out;
}
