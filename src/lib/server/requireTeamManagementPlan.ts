import { NextResponse } from "next/server";

import { getPlanTierServer, verifyUserPlan } from "@/lib/server/verifyUserPlan";

/** Team admin / management APIs: Team-tier workspace (numeric tier ≥ 2). */
export async function requireTeamManagementPlanTier(
  userId: string,
): Promise<NextResponse | null> {
  let pf;
  try {
    pf = await verifyUserPlan(userId);
  } catch (e) {
    console.error("[requireTeamManagementPlanTier] verifyUserPlan:", e);
    return NextResponse.json({ error: "Could not verify subscription." }, { status: 500 });
  }
  if (getPlanTierServer(pf) < 2) {
    return NextResponse.json(
      {
        error: "team_plan_required",
        message: "This action requires a Growth plan or higher.",
      },
      { status: 403 },
    );
  }
  return null;
}
