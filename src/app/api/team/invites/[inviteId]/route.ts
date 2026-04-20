import { NextResponse } from "next/server";

import { requireTeamManagementPlanTier } from "@/lib/server/requireTeamManagementPlan";
import { primaryTeamAdminContext } from "@/lib/team-admin";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ inviteId: string }> },
) {
  try {
    const { inviteId } = await context.params;
    if (!inviteId) {
      return NextResponse.json({ error: "Missing invite id." }, { status: 400 });
    }

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const tierGate = await requireTeamManagementPlanTier(user.id);
    if (tierGate) return tierGate;

    const ctx = await primaryTeamAdminContext(supabase, user.id);
    if (!ctx) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createServiceRoleClient();
    const { data: inv, error: invErr } = await admin
      .from("team_invites")
      .select("id, team_id")
      .eq("id", inviteId)
      .maybeSingle();

    if (invErr || !inv || inv.team_id !== ctx.teamId) {
      return NextResponse.json({ error: "Invite not found." }, { status: 404 });
    }

    const { error: delErr } = await admin.from("team_invites").delete().eq("id", inviteId);
    if (delErr) {
      console.error("[team/invites DELETE]", delErr.message);
      return NextResponse.json({ error: "Could not revoke invite." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[team/invites DELETE]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
