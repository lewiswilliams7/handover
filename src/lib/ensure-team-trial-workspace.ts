import { teamGenerationLimitForSeats } from "@/lib/plans";
import { normalizePlanLabel } from "@/lib/utils/getPlan";
import { createServiceRoleClient } from "@/lib/supabase/admin";

const DEFAULT_SEATS = 5;

function trialSkuIsTeam(trialPlan: string | null | undefined): boolean {
  const t = normalizePlanLabel(typeof trialPlan === "string" ? trialPlan : "");
  return t === "team" || t === "team_trial";
}

/**
 * Solo Team trial users need a `teams` row + `team_members` before `/dashboard/team` and Team APIs work.
 * Covers explicit `team_trial` on `profiles.plan` and in-app Team trial on `free` + `trial_plan` + active `trial_ends_at`.
 * Also repairs missing `team_members` when `profiles.team_id` is set (e.g. partial failure).
 */
export async function ensureTeamWorkspaceForTeamTrialOwner(userId: string): Promise<boolean> {
  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch (e) {
    console.error("[ensureTeamTrialWorkspace] service role:", e);
    return false;
  }

  const { data: p, error } = await admin
    .from("profiles")
    .select("id, plan, team_id, trial_ends_at, trial_plan, company_name, brand_name")
    .eq("id", userId)
    .maybeSingle();

  if (error || !p) {
    console.error("[ensureTeamTrialWorkspace] profile:", error);
    return false;
  }

  const planNorm = normalizePlanLabel(p.plan ?? "");
  const trialEnd =
    typeof p.trial_ends_at === "string" && p.trial_ends_at.trim()
      ? p.trial_ends_at.trim()
      : null;
  const trialStillActive = Boolean(trialEnd && new Date(trialEnd) > new Date());

  const needsTeamTrialWorkspace =
    planNorm === "team_trial" ||
    (planNorm === "free" && trialStillActive && trialSkuIsTeam(p.trial_plan));

  const tid =
    typeof p.team_id === "string" && p.team_id.trim() ? p.team_id.trim() : null;

  if (tid) {
    await ensureOwnerMembershipRow(admin, userId, tid);
    return true;
  }

  if (!needsTeamTrialWorkspace) {
    return true;
  }

  const name =
    typeof p.company_name === "string" && p.company_name.trim()
      ? p.company_name.trim()
      : typeof p.brand_name === "string" && p.brand_name.trim()
        ? p.brand_name.trim()
        : "My Team";

  const genLimit = teamGenerationLimitForSeats(DEFAULT_SEATS);
  const trialEndIso = trialEnd;

  const { data: team, error: insErr } = await admin
    .from("teams")
    .insert({
      name,
      plan: "team_trial",
      owner_id: userId,
      generation_limit: genLimit,
      seat_limit: DEFAULT_SEATS,
      subscription_status: "trialing",
      trial_end: trialEndIso,
    })
    .select("id")
    .single();

  if (insErr || !team?.id) {
    console.error("[ensureTeamTrialWorkspace] teams insert:", insErr);
    return false;
  }

  const { error: memErr } = await admin.from("team_members").insert({
    team_id: team.id,
    user_id: userId,
    role: "owner",
    invited_by: userId,
    permissions: {},
  });

  if (memErr) {
    console.error("[ensureTeamTrialWorkspace] team_members:", memErr);
    await admin.from("teams").delete().eq("id", team.id);
    return false;
  }

  const { error: uErr } = await admin.from("profiles").update({ team_id: team.id }).eq("id", userId);

  if (uErr) {
    console.error("[ensureTeamTrialWorkspace] profiles update:", uErr);
    return false;
  }

  return true;
}

async function ensureOwnerMembershipRow(
  admin: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  teamId: string,
): Promise<void> {
  const { data: existing } = await admin
    .from("team_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return;

  const { data: teamRow } = await admin.from("teams").select("owner_id").eq("id", teamId).maybeSingle();

  const ownerId =
    typeof teamRow?.owner_id === "string" && teamRow.owner_id.trim()
      ? teamRow.owner_id.trim()
      : null;
  if (ownerId !== userId) {
    console.warn("[ensureTeamTrialWorkspace] missing membership but user is not team owner; skip repair", {
      userId,
      teamId,
    });
    return;
  }

  const { error } = await admin.from("team_members").insert({
    team_id: teamId,
    user_id: userId,
    role: "owner",
    invited_by: userId,
    permissions: {},
  });

  if (error) {
    console.error("[ensureTeamTrialWorkspace] membership repair:", error);
  }
}
