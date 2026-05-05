import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import { getUserPlan, normalizePlanLabel } from "@/lib/utils/getPlan";

function activeTeamTrialFromFreeProfile(fields: {
  plan?: string | null;
  trial_ends_at?: string | null;
  trial_plan?: string | null;
}): boolean {
  if (normalizePlanLabel(fields.plan ?? "") !== "free") return false;
  const end = fields.trial_ends_at;
  if (typeof end !== "string" || !end.trim()) return false;
  if (new Date(end).getTime() <= Date.now()) return false;
  const tp = normalizePlanLabel(fields.trial_plan ?? "");
  return tp === "team" || tp === "team_trial";
}

export const runtime = "nodejs";

/**
 * Sidebar Team link: solo `team_trial`, or any user in a Team / Enterprise workspace (member, admin, or owner).
 */
export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ showTeamSidebarLink: false });
    }

    const admin = createServiceRoleClient();
    const fields = await getUserPlan(admin, user.id);
    const plan = fields.plan ?? "";
    const p = normalizePlanLabel(plan);

    if (p === "team_trial") {
      return NextResponse.json({ showTeamSidebarLink: true });
    }

    if (activeTeamTrialFromFreeProfile(fields)) {
      return NextResponse.json({ showTeamSidebarLink: true });
    }

    if (p !== "team" && p !== "enterprise") {
      return NextResponse.json({ showTeamSidebarLink: false });
    }

    // Enterprise plan owners always get the team link
    // regardless of team_members row
    if (p === "enterprise") {
      return NextResponse.json({ showTeamSidebarLink: true });
    }

    const { data: rows } = await admin
      .from("team_members")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    return NextResponse.json({ showTeamSidebarLink: Boolean(rows?.length) });
  } catch (e) {
    console.error("[api/user/team-sidebar]", e);
    return NextResponse.json({ showTeamSidebarLink: false });
  }
}
