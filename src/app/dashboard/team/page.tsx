import { redirect } from "next/navigation";

import { ensureTeamWorkspaceForTeamTrialOwner } from "@/lib/ensure-team-trial-workspace";
import { primaryTeamMembershipForDashboard } from "@/lib/team-admin";
import { createServerClient } from "@/lib/supabase/server";

import { TeamDashboardClient } from "./team-dashboard-client";

export default async function TeamDashboardPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth?tab=signin&returnTo=%2Fdashboard%2Fteam");
  }

  await ensureTeamWorkspaceForTeamTrialOwner(user.id);

  const membership = await primaryTeamMembershipForDashboard(supabase, user.id);
  if (!membership) {
    redirect("/");
  }

  return (
    <div className="min-h-screen animate-in fade-in duration-300 bg-[var(--bg-secondary)]">
      <TeamDashboardClient />
    </div>
  );
}
