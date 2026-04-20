import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Non-owners only: remove self from team and clear profile team link. */
export async function POST() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = createServiceRoleClient();

    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("team_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr) {
      console.error("[team/leave] profile:", profileErr.message);
      return NextResponse.json({ error: "Could not load profile." }, { status: 500 });
    }

    const teamId =
      profile?.team_id && typeof profile.team_id === "string" ? profile.team_id : null;
    if (!teamId) {
      return NextResponse.json({ error: "You are not on a team." }, { status: 400 });
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

    if (membership.role === "owner") {
      return NextResponse.json(
        { error: "Team owners cannot leave. Transfer ownership or delete the team." },
        { status: 400 },
      );
    }

    const { error: delErr } = await admin
      .from("team_members")
      .delete()
      .eq("team_id", teamId)
      .eq("user_id", user.id);

    if (delErr) {
      console.error("[team/leave] delete member:", delErr.message);
      return NextResponse.json({ error: "Could not leave team." }, { status: 500 });
    }

    const { error: upErr } = await admin
      .from("profiles")
      .update({ team_id: null, plan: "free" })
      .eq("id", user.id);

    if (upErr) {
      console.error("[team/leave] profile update:", upErr.message);
      return NextResponse.json({ error: "Could not update profile." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[team/leave]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
