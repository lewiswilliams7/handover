import { NextResponse } from "next/server";

import { normalizeTeamDashboardPermission } from "@/lib/team-dashboard-permission";
import { requireTeamManagementPlanTier } from "@/lib/server/requireTeamManagementPlan";
import { primaryTeamAdminContext } from "@/lib/team-admin";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const PERM_KEYS = new Set([
  "push_to_halo",
  "scheduled_reports",
  "excel_export",
  "view_history",
]);

type Body = {
  permissions?: Record<string, unknown>;
  role?: unknown;
  dashboard_permission?: unknown;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ memberId: string }> },
) {
  try {
    const { memberId } = await context.params;
    if (!memberId) {
      return NextResponse.json({ error: "Missing member id." }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as Body;
    const hasPerms =
      body.permissions !== undefined &&
      typeof body.permissions === "object" &&
      body.permissions !== null &&
      !Array.isArray(body.permissions);
    const hasRole = body.role !== undefined;
    const hasDashPerm = body.dashboard_permission !== undefined;

    if (!hasPerms && !hasRole && !hasDashPerm) {
      return NextResponse.json(
        { error: "Provide permissions, dashboard_permission, and/or role." },
        { status: 400 },
      );
    }

    if (hasRole && body.role !== "admin" && body.role !== "member") {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const patchTierGate = await requireTeamManagementPlanTier(user.id);
    if (patchTierGate) return patchTierGate;

    const ctx = await primaryTeamAdminContext(supabase, user.id);
    if (!ctx) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createServiceRoleClient();
    const { data: row, error: fetchErr } = await admin
      .from("team_members")
      .select("id, team_id, user_id, role, permissions, dashboard_permission")
      .eq("id", memberId)
      .maybeSingle();

    if (fetchErr || !row || row.team_id !== ctx.teamId) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    if (row.role === "owner") {
      return NextResponse.json(
        { error: "The team owner cannot be edited here." },
        { status: 400 },
      );
    }

    let workingRole = row.role as string;

    if (hasRole) {
      if (ctx.role !== "owner") {
        return NextResponse.json(
          { error: "Only the team owner can change member roles." },
          { status: 403 },
        );
      }

      const { error: roleErr } = await admin
        .from("team_members")
        .update({ role: body.role as string })
        .eq("id", memberId)
        .eq("team_id", ctx.teamId);

      if (roleErr) {
        console.error("[team/members PATCH] role:", roleErr.message);
        return NextResponse.json({ error: "Role update failed." }, { status: 500 });
      }
      workingRole = body.role as string;
    }

    let nextPermissions = (row.permissions ?? {}) as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    let nextDashboardPermission: string | undefined;

    if (hasPerms) {
      if (workingRole !== "member") {
        return NextResponse.json(
          { error: "Only member roles can have permissions edited here." },
          { status: 400 },
        );
      }

      nextPermissions = { ...((row.permissions ?? {}) as Record<string, unknown>) };
      for (const [k, v] of Object.entries(body.permissions!)) {
        if (!PERM_KEYS.has(k)) continue;
        if (v === null) {
          delete nextPermissions[k];
        } else if (typeof v === "boolean") {
          nextPermissions[k] = v;
        }
      }
      updates.permissions = nextPermissions;
    }

    if (hasDashPerm) {
      if (workingRole !== "member") {
        return NextResponse.json(
          { error: "Only member roles can have permissions edited here." },
          { status: 400 },
        );
      }
      const v = normalizeTeamDashboardPermission(body.dashboard_permission);
      nextDashboardPermission = v;
      updates.dashboard_permission = v;
    }

    if (Object.keys(updates).length > 0) {
      const { error: upErr } = await admin
        .from("team_members")
        .update(updates)
        .eq("id", memberId)
        .eq("team_id", ctx.teamId);

      if (upErr) {
        console.error("[team/members PATCH] update:", upErr.message);
        return NextResponse.json({ error: "Update failed." }, { status: 500 });
      }
    }

    return NextResponse.json({
      ok: true,
      ...(hasPerms ? { permissions: nextPermissions } : {}),
      ...(hasDashPerm && nextDashboardPermission
        ? { dashboard_permission: nextDashboardPermission }
        : {}),
      ...(hasRole ? { role: workingRole } : {}),
    });
  } catch (e) {
    console.error("[team/members PATCH]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ memberId: string }> },
) {
  try {
    const { memberId } = await context.params;
    if (!memberId) {
      return NextResponse.json({ error: "Missing member id." }, { status: 400 });
    }

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const deleteTierGate = await requireTeamManagementPlanTier(user.id);
    if (deleteTierGate) return deleteTierGate;

    const ctx = await primaryTeamAdminContext(supabase, user.id);
    if (!ctx) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createServiceRoleClient();
    const { data: row, error: fetchErr } = await admin
      .from("team_members")
      .select("id, team_id, user_id, role")
      .eq("id", memberId)
      .maybeSingle();

    if (fetchErr || !row || row.team_id !== ctx.teamId) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    if (row.role === "owner") {
      return NextResponse.json({ error: "Cannot remove the team owner." }, { status: 400 });
    }

    if (ctx.role === "admin" && row.role !== "member") {
      return NextResponse.json(
        { error: "Admins can only remove standard members." },
        { status: 403 },
      );
    }

    const { error: delErr } = await admin
      .from("team_members")
      .delete()
      .eq("id", memberId)
      .eq("team_id", ctx.teamId);

    if (delErr) {
      console.error("[team/members DELETE]", delErr.message);
      return NextResponse.json({ error: "Could not remove member." }, { status: 500 });
    }

    const { error: upErr } = await admin
      .from("profiles")
      .update({ team_id: null, plan: "free" })
      .eq("id", row.user_id)
      .eq("team_id", ctx.teamId);

    if (upErr) {
      console.error("[team/members DELETE] profile:", upErr.message);
      return NextResponse.json({ error: "Member removed but profile update failed." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[team/members DELETE]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
