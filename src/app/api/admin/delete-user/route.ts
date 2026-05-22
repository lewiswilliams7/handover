import { NextResponse } from "next/server";

import { deleteUserAccountCascade } from "@/lib/server/delete-user-account";
import { isHandoverEnvAdmin } from "@/lib/server/handover-env-admin";
import { requireTeamManagementPlanTier } from "@/lib/server/requireTeamManagementPlan";
import { primaryTeamAdminContext } from "@/lib/team-admin";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Body = {
  userId?: unknown;
};

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let body: Body = {};
    try {
      body = (await request.json()) as Body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const targetId = typeof body.userId === "string" ? body.userId.trim() : "";
    if (!targetId || !UUID_RE.test(targetId)) {
      return NextResponse.json({ error: "Invalid userId." }, { status: 400 });
    }

    if (user.id === targetId) {
      return NextResponse.json({ error: "Cannot delete your own account." }, { status: 400 });
    }

    let admin: ReturnType<typeof createServiceRoleClient>;
    try {
      admin = createServiceRoleClient();
    } catch (e) {
      console.error("[admin/delete-user] service role:", e);
      return NextResponse.json({ error: "Server misconfiguration." }, { status: 500 });
    }

    const envAdmin = isHandoverEnvAdmin(user.id, user.email ?? null);

    if (!envAdmin) {
      const tierGate = await requireTeamManagementPlanTier(user.id);
      if (tierGate) return tierGate;

      const ctx = await primaryTeamAdminContext(supabase, user.id);
      if (!ctx) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { data: tm, error: tmErr } = await admin
        .from("team_members")
        .select("role")
        .eq("team_id", ctx.teamId)
        .eq("user_id", targetId)
        .maybeSingle();

      if (tmErr) {
        console.error("[admin/delete-user] team_members:", tmErr.message);
        return NextResponse.json({ error: "Could not verify membership." }, { status: 500 });
      }

      if (!tm) {
        return NextResponse.json({ error: "User is not a member of this team." }, { status: 404 });
      }

      if (tm.role === "owner") {
        return NextResponse.json({ error: "Cannot delete the team owner." }, { status: 400 });
      }

      if (ctx.role === "admin" && tm.role !== "member") {
        return NextResponse.json(
          { error: "Admins can only delete standard members." },
          { status: 403 },
        );
      }
    }

    const result = await deleteUserAccountCascade(admin, targetId);
    if (!result.ok) {
      console.error("[admin/delete-user]", result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[admin/delete-user]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
