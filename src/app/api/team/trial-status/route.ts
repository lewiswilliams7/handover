import { NextResponse } from "next/server";

import { clampTeamSeatCount } from "@/lib/plans";
import { requireTeamManagementPlanTier } from "@/lib/server/requireTeamManagementPlan";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("team_id")
      .eq("id", user.id)
      .maybeSingle();

    console.log("[trial-status] profile:", profile, "profErr:", profErr?.message ?? null);

    if (profErr) {
      console.error("[trial-status] profile query failed:", profErr.message);
      return NextResponse.json({ error: "Could not load profile" }, { status: 500 });
    }

    const teamId =
      profile?.team_id && typeof profile.team_id === "string"
        ? profile.team_id
        : null;

    if (!teamId) {
      return NextResponse.json({ onTrial: false });
    }

    const tierGate = await requireTeamManagementPlanTier(user.id);
    if (tierGate) return tierGate;

    const admin = createServiceRoleClient();
    const { data: team, error: teamErr } = await admin
      .from("teams")
      .select(
        "subscription_status, trial_ends_at, trial_end, created_at, seat_limit",
      )
      .eq("id", teamId)
      .maybeSingle();

    console.log("[trial-status] team:", team, "teamErr:", teamErr?.message ?? null);

    if (teamErr) {
      console.error("[trial-status] team query failed:", teamErr.message);
      return NextResponse.json({ error: "Could not load team" }, { status: 500 });
    }

    if (!team) {
      return NextResponse.json({ onTrial: false });
    }

    const st = String(team.subscription_status ?? "").trim().toLowerCase();
    if (st === "cancelled") {
      return NextResponse.json({ onTrial: false });
    }

    /** Paid subscription — never show team trial banner even if `trial_ends_at` is still set. */
    if (st === "active") {
      return NextResponse.json({ onTrial: false });
    }

    const trialEndsAt = team.trial_ends_at
      ? new Date(team.trial_ends_at as string)
      : typeof team.trial_end === "string" && team.trial_end.trim()
        ? new Date(team.trial_end)
        : typeof team.created_at === "string" && team.created_at
          ? new Date(new Date(team.created_at).getTime() + 14 * MS_PER_DAY)
          : null;

    if (!trialEndsAt || Number.isNaN(trialEndsAt.getTime())) {
      console.warn("[trial-status] could not resolve trial end date for team", teamId);
      return NextResponse.json({ onTrial: false });
    }

    const trialEndStillFuture = trialEndsAt.getTime() > Date.now();

    // trialing, or non-active Stripe state with a future resolved trial end
    const isOnTrial = st === "trialing" || trialEndStillFuture;

    if (!isOnTrial) {
      return NextResponse.json({ onTrial: false });
    }

    const daysRemaining = Math.max(
      0,
      Math.ceil((trialEndsAt.getTime() - Date.now()) / MS_PER_DAY),
    );

    const seatRaw =
      typeof team.seat_limit === "number" && team.seat_limit >= 3
        ? team.seat_limit
        : 3;
    const seatCount = clampTeamSeatCount(seatRaw);

    return NextResponse.json({
      onTrial: true,
      daysRemaining,
      trialEndsAt: trialEndsAt.toISOString(),
      seatCount,
    });
  } catch (e) {
    console.error("[trial-status] unhandled:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
