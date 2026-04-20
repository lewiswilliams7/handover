import { NextResponse } from "next/server";

import { getUserPlan, normalizePlanLabel } from "@/lib/utils/getPlan";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (authError) {
      console.warn("[trial-status] authError:", authError.message);
    }

    const planFields = await getUserPlan(supabase, user.id);
    const p = normalizePlanLabel(planFields.plan ?? "");
    const tp = normalizePlanLabel(planFields.trial_plan ?? "");
    const legacyTrialColumn = p === "professional_trial" || p === "team_trial";
    const appTrialOnFree =
      p === "free" &&
      (tp === "professional" ||
        tp === "team" ||
        tp === "professional_trial" ||
        tp === "team_trial");
    const onProfileTrial =
      Boolean(planFields.trial_ends_at) && (legacyTrialColumn || appTrialOnFree);
    const trialEndIso =
      onProfileTrial && planFields.trial_ends_at ? planFields.trial_ends_at : null;

    const { count, error: countError } = await supabase
      .from("generations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countError) {
      console.warn("[trial-status] countError:", countError.message);
    }

    const accountCreated = new Date(user.created_at ?? Date.now());
    const now = new Date();
    const daysSinceCreation =
      (now.getTime() - accountCreated.getTime()) / (1000 * 60 * 60 * 24);

    const legacyTrialEnd = new Date(
      accountCreated.getTime() + 14 * 24 * 60 * 60 * 1000,
    );

    const endsAt = trialEndIso ?? legacyTrialEnd.toISOString();
    const endDate = new Date(endsAt);
    const active =
      onProfileTrial && trialEndIso
        ? endDate.getTime() > now.getTime()
        : !onProfileTrial && daysSinceCreation < 14;

    const used = count ?? 0;

    const startOfMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    ).toISOString();

    const { count: monthlyCount, error: monthlyError } = await supabase
      .from("generations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", startOfMonth);

    if (monthlyError) {
      console.warn("[trial-status] monthly count error:", monthlyError.message);
    }

    return NextResponse.json({
      active,
      used,
      remaining: Math.max(0, 10 - used),
      endsAt,
      isPostTrial: !active,
      monthlyUsed: monthlyCount ?? 0,
      monthlyRemaining: Math.max(0, 10 - (monthlyCount ?? 0)),
      planTrial: onProfileTrial,
    });
  } catch (err) {
    console.error("[trial-status] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
