import { NextResponse } from "next/server";

import {
  TEAM_MEMBER_INVITES_BLOCKED_MESSAGE,
  normalizePlanLabel,
  teamWorkspaceAllowsMemberInvites,
} from "@/lib/utils/getPlan";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Body = {
  token?: string;
};

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id || !user.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await request.json()) as Body;
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token) {
      return NextResponse.json({ error: "Token is required." }, { status: 400 });
    }

    const admin = createServiceRoleClient();

    const { data: inv, error: invErr } = await admin
      .from("team_invites")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (invErr || !inv) {
      return NextResponse.json({ error: "Invalid or unknown invite." }, { status: 400 });
    }
    if (inv.accepted === true) {
      return NextResponse.json({ error: "This invite has already been used." }, { status: 400 });
    }
    const exp = new Date(inv.expires_at as string);
    if (Number.isNaN(exp.getTime()) || exp < new Date()) {
      return NextResponse.json({ error: "This invite has expired." }, { status: 400 });
    }

    if (typeof inv.email === "string" && inv.email.trim()) {
      const want = inv.email.trim().toLowerCase();
      const got = user.email.trim().toLowerCase();
      if (want !== got) {
        return NextResponse.json(
          { error: "Sign in with the email address that received the invite." },
          { status: 403 },
        );
      }
    }

    const teamId = inv.team_id as string;

    const { data: teamRow, error: teamLoadErr } = await admin
      .from("teams")
      .select("id, plan, owner_id")
      .eq("id", teamId)
      .maybeSingle();

    if (teamLoadErr || !teamRow) {
      return NextResponse.json({ error: "Team not found." }, { status: 400 });
    }

    if (!teamWorkspaceAllowsMemberInvites(teamRow.plan ?? null)) {
      return NextResponse.json({ error: TEAM_MEMBER_INVITES_BLOCKED_MESSAGE }, { status: 403 });
    }

    const { data: existing } = await admin
      .from("team_members")
      .select("id")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "You are already a member of this team." }, { status: 400 });
    }

    const { data: prof } = await admin
      .from("profiles")
      .select("team_id")
      .eq("id", user.id)
      .maybeSingle();
    const existingTeam = prof?.team_id as string | null | undefined;
    if (existingTeam && existingTeam !== teamId) {
      return NextResponse.json(
        { error: "Your account is already linked to another team." },
        { status: 400 },
      );
    }

    const memberRole =
      inv.role === "admin" || inv.role === "member" ? inv.role : "member";

    const { error: memErr } = await admin.from("team_members").insert({
      team_id: teamId,
      user_id: user.id,
      role: memberRole,
      invited_by: inv.invited_by ?? null,
      permissions: {},
    });
    if (memErr) {
      console.error("[team/join] member insert:", memErr.message);
      return NextResponse.json({ error: "Could not join team." }, { status: 500 });
    }

    const ownerId =
      typeof teamRow.owner_id === "string" && teamRow.owner_id.trim()
        ? teamRow.owner_id.trim()
        : typeof inv.invited_by === "string" && inv.invited_by.trim()
          ? inv.invited_by.trim()
          : null;

    const { data: ownerProf } = ownerId
      ? await admin
          .from("profiles")
          .select("trial_ends_at, trial_plan, plan")
          .eq("id", ownerId)
          .maybeSingle()
      : { data: null };

    const ownerPlan = normalizePlanLabel(ownerProf?.plan ?? "");
    const teamTrialWorkspace = ownerPlan === "team_trial";
    const workspacePlan = normalizePlanLabel(teamRow.plan ?? "");
    // Members of a Handover workspace get the same plan as the workspace.
    const memberPlan = teamTrialWorkspace
      ? "team_trial"
      : workspacePlan === "handover" || workspacePlan === "starter_programme"
        ? workspacePlan
        : "team";

    const { error: profErr } = await admin
      .from("profiles")
      .update({
        plan: memberPlan,
        team_id: inv.team_id,
        trial_ends_at:
          typeof ownerProf?.trial_ends_at === "string" && ownerProf.trial_ends_at.trim()
            ? ownerProf.trial_ends_at.trim()
            : null,
        trial_plan: teamTrialWorkspace
          ? "team"
          : typeof ownerProf?.trial_plan === "string" && ownerProf.trial_plan.trim()
            ? ownerProf.trial_plan.trim()
            : null,
      })
      .eq("id", user.id);
    if (profErr) {
      console.error("[team/join] profile update failed after team_members insert:", {
        message: profErr.message,
        code: profErr.code,
        details: profErr.details,
        hint: profErr.hint,
        userId: user.id,
        teamId: inv.team_id,
      });
      await admin.from("team_members").delete().eq("team_id", teamId).eq("user_id", user.id);
      return NextResponse.json(
        {
          error: `Could not update profile with team membership: ${profErr.message}`,
        },
        { status: 500 },
      );
    }

    const { error: accErr } = await admin
      .from("team_invites")
      .update({ accepted: true })
      .eq("id", inv.id);
    if (accErr) {
      console.error("[team/join] invite update:", accErr.message);
    }

    const { data: team, error: teamErr } = await admin
      .from("teams")
      .select("id, name, plan, generation_count, generation_limit, created_at")
      .eq("id", teamId)
      .maybeSingle();

    if (teamErr || !team) {
      return NextResponse.json({ error: "Joined, but could not load team." }, { status: 500 });
    }

    return NextResponse.json({ team });
  } catch (e) {
    console.error("[team/join]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
