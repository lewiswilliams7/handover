import { NextResponse } from "next/server";

import { normalizeTeamDashboardPermission } from "@/lib/team-dashboard-permission";
import {
  profilePlanBlocksTeamMemberInvites,
  teamSeatCapFromRow,
  teamWorkspaceAllowsMemberInvites,
} from "@/lib/plans";
import { getBillingStripeCustomerIdForUser } from "@/lib/stripe-billing-customer-id";
import { requireTeamManagementPlanTier } from "@/lib/server/requireTeamManagementPlan";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const PERM_KEYS = [
  "push_to_halo",
  "scheduled_reports",
  "excel_export",
  "view_history",
] as const;

function logSupabaseErr(prefix: string, err: { message?: string; code?: string; details?: string; hint?: string }) {
  console.error(prefix, {
    message: err.message,
    code: err.code,
    details: err.details,
    hint: err.hint,
  });
}

function monthBoundsUtc(reference = new Date()) {
  const y = reference.getUTCFullYear();
  const m = reference.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  const next = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0, 0));
  const lastStart = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const daysInMonth = Math.round((next.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return { start, next, lastStart, daysInMonth };
}

function utcDayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

async function assertTeamMemberContext(userId: string): Promise<
  | { ok: true; admin: ReturnType<typeof createServiceRoleClient>; teamId: string; role: string }
  | { ok: false; response: NextResponse }
> {
  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch (e) {
    console.error("[team/overview] createServiceRoleClient() threw", e);
    return { ok: false, response: NextResponse.json({ error: "Internal error" }, { status: 500 }) };
  }

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("team_id")
    .eq("id", userId)
    .maybeSingle();

  if (profileErr) {
    logSupabaseErr("[team/overview] profiles select failed", profileErr);
    return { ok: false, response: NextResponse.json({ error: "Could not load profile." }, { status: 500 }) };
  }

  const teamId =
    profile?.team_id && typeof profile.team_id === "string" ? profile.team_id : null;
  if (!teamId) {
    return { ok: false, response: NextResponse.json({ error: "No team found." }, { status: 404 }) };
  }

  const { data: membership, error: memRoleErr } = await admin
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle();

  if (memRoleErr) {
    logSupabaseErr("[team/overview] team_members role lookup failed", memRoleErr);
    return { ok: false, response: NextResponse.json({ error: "Could not verify membership." }, { status: 500 }) };
  }

  const role = membership?.role;
  if (!role) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true, admin, teamId, role };
}

async function assertTeamAdminContext(userId: string): Promise<
  | { ok: true; admin: ReturnType<typeof createServiceRoleClient>; teamId: string; role: string }
  | { ok: false; response: NextResponse }
> {
  const ctx = await assertTeamMemberContext(userId);
  if (!ctx.ok) return ctx;
  const { role } = ctx;
  if (role !== "owner" && role !== "admin") {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return ctx;
}

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      console.error("[team/overview] RETURN 401: not authenticated (no user from getUser)");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const tierGate = await requireTeamManagementPlanTier(user.id);
    if (tierGate) return tierGate;

    const ctx = await assertTeamMemberContext(user.id);
    if (!ctx.ok) return ctx.response;
    const { admin, teamId, role: viewerRole } = ctx;

    const billingStripeCustomerId = await getBillingStripeCustomerIdForUser(admin, user.id);
    const hasStripeCustomer = Boolean(billingStripeCustomerId);

    const { data: team, error: teamErr } = await admin
      .from("teams")
      .select(
        "id, name, plan, generation_count, generation_limit, seat_limit, stripe_customer_id, subscription_status, created_at, trial_end",
      )
      .eq("id", teamId)
      .maybeSingle();

    if (teamErr) {
      logSupabaseErr("[team/overview] RETURN 500: teams select failed", teamErr);
      return NextResponse.json({ error: "Could not load team." }, { status: 500 });
    }

    if (!team) {
      console.error("[team/overview] RETURN 404: teams row missing for teamId", { teamId, userId: user.id });
      return NextResponse.json({ error: "No team found." }, { status: 404 });
    }

    const { data: inviterProfile } = await admin
      .from("profiles")
      .select("plan, trial_plan, trial_ends_at")
      .eq("id", user.id)
      .maybeSingle();

    const memberInvitesAllowed =
      teamWorkspaceAllowsMemberInvites(team.plan) &&
      !profilePlanBlocksTeamMemberInvites(inviterProfile ?? {});

    const seatCap = teamSeatCapFromRow(team);
    const purchasedSeatLimit =
      typeof team.seat_limit === "number" && team.seat_limit >= 3 ? team.seat_limit : 3;

    const { data: members, error: memErr } = await admin
      .from("team_members")
      .select("id, user_id, role, permissions, dashboard_permission, joined_at, created_at")
      .eq("team_id", teamId)
      .order("joined_at", { ascending: true });

    if (memErr) {
      logSupabaseErr("[team/overview] RETURN 500: team_members list failed", memErr);
      return NextResponse.json({ error: "Could not load members." }, { status: 500 });
    }

    const memberRows = members ?? [];
    const memberUserIds = memberRows.map((m) => m.user_id as string);
    const emails = new Map<string, string>();

    for (const m of memberRows) {
      const uid = m.user_id as string;
      const { data: u, error: ue } = await admin.auth.admin.getUserById(uid);
      if (ue) {
        console.error("[team/overview] auth.admin.getUserById failed (continuing)", {
          memberUserId: uid,
          message: ue.message,
          status: ue.status,
        });
      }
      if (!ue && u.user?.email) {
        emails.set(uid, u.user.email);
      }
    }

    let profs: { id: string; first_name: string | null; last_name: string | null }[] = [];
    if (memberUserIds.length > 0) {
      const { data: profRows, error: profBatchErr } = await admin
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", memberUserIds);
      if (profBatchErr) {
        logSupabaseErr("[team/overview] RETURN 500: profiles batch for members failed", profBatchErr);
        return NextResponse.json({ error: "Could not load member profiles." }, { status: 500 });
      }
      profs = profRows ?? [];
    }

    const profileNames = new Map<string, string>();
    for (const p of profs) {
      const fn = typeof p.first_name === "string" ? p.first_name : "";
      const ln = typeof p.last_name === "string" ? p.last_name : "";
      const label = `${fn} ${ln}`.trim();
      if (label) profileNames.set(p.id as string, label);
    }

    const nowIso = new Date().toISOString();
    const { data: invites, error: invErr } = await admin
      .from("team_invites")
      .select("id, email, role, expires_at, created_at, accepted")
      .eq("team_id", teamId)
      .eq("accepted", false)
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false });

    if (invErr) {
      logSupabaseErr("[team/overview] RETURN 500: team_invites select failed", invErr);
      return NextResponse.json({ error: "Could not load invites." }, { status: 500 });
    }

    const pendingInvites = invites ?? [];

    let halo: { user_id: string; updated_at: string }[] = [];
    if (memberUserIds.length > 0) {
      const { data: haloRows, error: haloErr } = await admin
        .from("halo_connections")
        .select("user_id, updated_at")
        .in("user_id", memberUserIds);
      if (haloErr) {
        logSupabaseErr("[team/overview] RETURN 500: halo_connections select failed", haloErr);
        return NextResponse.json({ error: "Could not load Halo connections." }, { status: 500 });
      }
      halo = haloRows ?? [];
    }

    const usage = {
      generation_count: team.generation_count,
      generation_limit: team.generation_limit,
    };

    const { start: monthStart, next: monthNext, lastStart: lastMonthStart, daysInMonth } =
      monthBoundsUtc();

    const dailyCounts = new Map<string, number>();
    for (let d = 1; d <= daysInMonth; d++) {
      const key = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), d))
        .toISOString()
        .slice(0, 10);
      dailyCounts.set(key, 0);
    }

    let thisMonthTotal = 0;
    let lastMonthTotal = 0;
    const memberMonthTotals = new Map<string, number>();
    for (const uid of memberUserIds) memberMonthTotals.set(uid, 0);

    if (memberUserIds.length > 0) {
      const { data: gensThis, error: gErr } = await admin
        .from("generations")
        .select("user_id, created_at")
        .in("user_id", memberUserIds)
        .gte("created_at", monthStart.toISOString())
        .lt("created_at", monthNext.toISOString());

      if (gErr) {
        logSupabaseErr("[team/overview] RETURN 500: generations this month failed", gErr);
        return NextResponse.json({ error: "Could not load usage stats." }, { status: 500 });
      }

      for (const row of gensThis ?? []) {
        const uid = row.user_id as string;
        const day = utcDayKey(row.created_at as string);
        thisMonthTotal += 1;
        if (dailyCounts.has(day)) {
          dailyCounts.set(day, (dailyCounts.get(day) ?? 0) + 1);
        }
        memberMonthTotals.set(uid, (memberMonthTotals.get(uid) ?? 0) + 1);
      }

      const { count: lastCount, error: gLastErr } = await admin
        .from("generations")
        .select("id", { count: "exact", head: true })
        .in("user_id", memberUserIds)
        .gte("created_at", lastMonthStart.toISOString())
        .lt("created_at", monthStart.toISOString());

      if (gLastErr) {
        logSupabaseErr("[team/overview] RETURN 500: generations last month count failed", gLastErr);
        return NextResponse.json({ error: "Could not load usage stats." }, { status: 500 });
      }
      lastMonthTotal = lastCount ?? 0;
    }

    const dailyThisMonth = Array.from(dailyCounts.entries()).map(([date, count]) => ({
      date,
      day: Number(date.slice(8, 10)),
      count,
    }));

    const memberMonthCounts = memberUserIds
      .map((uid) => ({
        user_id: uid,
        display_name: profileNames.get(uid) || emails.get(uid) || uid,
        count: memberMonthTotals.get(uid) ?? 0,
      }))
      .sort((a, b) => b.count - a.count);

    const usageStats = {
      dailyThisMonth,
      memberMonthCounts,
      thisMonthTotal,
      lastMonthTotal,
    };

    const membersOut = memberRows.map((m) => {
      const uid = m.user_id as string;
      const perms = (m.permissions ?? {}) as Record<string, unknown>;
      const normalized: Record<string, boolean | null> = {};
      for (const k of PERM_KEYS) {
        const v = perms[k];
        normalized[k] = typeof v === "boolean" ? v : null;
      }
      const display_name = profileNames.get(uid) || emails.get(uid) || uid;
      const roleStr = typeof m.role === "string" ? m.role : "member";
      const dashboard_permission =
        roleStr === "owner" || roleStr === "admin"
          ? "full"
          : normalizeTeamDashboardPermission(
              (m as { dashboard_permission?: unknown }).dashboard_permission,
            );
      return {
        id: m.id,
        user_id: uid,
        role: m.role,
        joined_at: m.joined_at,
        email: emails.get(uid) ?? null,
        display_name,
        permissions: normalized,
        dashboard_permission,
      };
    });

    console.log("[team/overview] RETURN 200: success", {
      teamId,
      userId: user.id,
      memberCount: membersOut.length,
      inviteCount: pendingInvites.length,
    });
    return NextResponse.json({
      team,
      members: membersOut,
      invites: pendingInvites,
      usage,
      usageStats,
      seatCap,
      purchasedSeatLimit,
      viewerRole,
      permKeys: PERM_KEYS,
      pendingInvites,
      memberInvitesAllowed,
      hasStripeCustomer,
      haloConnections: halo.map((h) => ({
        user_id: h.user_id,
        updated_at: h.updated_at,
      })),
    });
  } catch (e) {
    console.error("[team/overview] RETURN 500: uncaught exception", e);
    if (e instanceof Error) {
      console.error("[team/overview] exception stack", e.stack);
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

type PatchBody = {
  name?: string;
};

export async function PATCH(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const patchTierGate = await requireTeamManagementPlanTier(user.id);
    if (patchTierGate) return patchTierGate;

    const body = (await request.json()) as PatchBody;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 200) {
      return NextResponse.json({ error: "Valid team name is required." }, { status: 400 });
    }

    const ctx = await assertTeamAdminContext(user.id);
    if (!ctx.ok) return ctx.response;
    const { admin, teamId } = ctx;

    const { error: upErr } = await admin.from("teams").update({ name }).eq("id", teamId);

    if (upErr) {
      logSupabaseErr("[team/overview] PATCH teams update failed", upErr);
      return NextResponse.json({ error: "Could not update team name." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, name });
  } catch (e) {
    console.error("[team/overview] PATCH", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
