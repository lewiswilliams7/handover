import type { SupabaseClient } from "@supabase/supabase-js";

import { isTeamPlan, teamSeatCapFromRow } from "@/lib/plans";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export type TeamAdminContext = {
  teamId: string;
  role: string;
};

/** First team (by SKU plan) where the user is owner or admin. */
export async function primaryTeamAdminContext(
  _supabase: SupabaseClient,
  userId: string,
): Promise<TeamAdminContext | null> {
  const admin = createServiceRoleClient();
  const { data: rows, error } = await admin
    .from("team_members")
    .select("team_id, role")
    .eq("user_id", userId)
    .in("role", ["owner", "admin"]);

  if (error) {
    console.error("[primaryTeamAdminContext] team_members error:", error);
    return null;
  }
  if (!rows?.length) {
    console.error("[primaryTeamAdminContext] no team_members rows for user:", userId);
    return null;
  }

  const teamIds = [...new Set(rows.map((r) => r.team_id))];
  const { data: teams } = await admin
    .from("teams")
    .select("id, plan")
    .in("id", teamIds);

  const skuTeamId = teams?.find((t) => isTeamPlan(t.plan ?? ""))?.id;
  if (!skuTeamId) return null;

  const row = rows.find((r) => r.team_id === skuTeamId);
  if (!row) return null;
  return { teamId: skuTeamId, role: row.role };
}

/** Any team membership — used for `/dashboard/team` access (owners, admins, and members). */
export async function primaryTeamMembershipForDashboard(
  _supabase: SupabaseClient,
  userId: string,
): Promise<{ teamId: string; role: string } | null> {
  const admin = createServiceRoleClient();
  const { data: rows, error } = await admin
    .from("team_members")
    .select("team_id, role")
    .eq("user_id", userId)
    .limit(1);
  if (error || !rows?.length) return null;
  const r = rows[0]!;
  const tid = r.team_id as string;
  const role = r.role as string;
  if (!tid || !role) return null;
  return { teamId: tid, role };
}

export async function countSeatsUsed(
  supabase: SupabaseClient,
  teamId: string,
): Promise<{ members: number; pendingInvites: number; cap: number; plan: string }> {
  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .select("plan, seat_limit, generation_limit")
    .eq("id", teamId)
    .maybeSingle();
  if (teamErr || !team) {
    return {
      members: 0,
      pendingInvites: 0,
      cap: 3,
      plan: "team",
    };
  }
  const plan = team.plan ?? "team";
  const cap = teamSeatCapFromRow(team);

  const { count: memCount } = await supabase
    .from("team_members")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId);

  const nowIso = new Date().toISOString();
  const { count: invCount } = await supabase
    .from("team_invites")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId)
    .eq("accepted", false)
    .gt("expires_at", nowIso);

  return {
    members: memCount ?? 0,
    pendingInvites: invCount ?? 0,
    cap,
    plan,
  };
}
