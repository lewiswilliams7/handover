import { NextResponse } from "next/server";

import { requireTeamManagementPlanTier } from "@/lib/server/requireTeamManagementPlan";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Owner only: delete the team (cascades members/invites; profiles.team_id null via FK). */
export async function DELETE() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const tierGate = await requireTeamManagementPlanTier(user.id);
    if (tierGate) return tierGate;

    const admin = createServiceRoleClient();

    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("team_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr) {
      console.error("[team/delete] profile:", profileErr.message);
      return NextResponse.json({ error: "Could not load profile." }, { status: 500 });
    }

    const teamId =
      profile?.team_id && typeof profile.team_id === "string" ? profile.team_id : null;
    if (!teamId) {
      return NextResponse.json({ error: "No team found." }, { status: 404 });
    }

    const { data: membership, error: memErr } = await admin
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memErr || !membership) {
      return NextResponse.json({ error: "Membership not found." }, { status: 404 });
    }

    if (membership.role !== "owner") {
      return NextResponse.json({ error: "Only the team owner can delete the team." }, { status: 403 });
    }

    const { error: profUpErr } = await admin
      .from("profiles")
      .update({ plan: "free", team_id: null })
      .eq("team_id", teamId);

    if (profUpErr) {
      console.error("[team/delete] profiles bulk update:", profUpErr.message);
      return NextResponse.json({ error: "Could not clear team members' profiles." }, { status: 500 });
    }

    const { error: delErr } = await admin.from("teams").delete().eq("id", teamId);

    if (delErr) {
      console.error("[team/delete] teams delete:", delErr.message);
      return NextResponse.json({ error: "Could not delete team." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[team/delete]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
