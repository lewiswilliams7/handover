import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { WeekClient } from "@/app/(app)/week/week-client";
import { loadPortfolioSummary } from "@/lib/server/portfolio-summary";
import { loadTeamNames } from "@/lib/server/team-names";
import { userCanViewScanDetails } from "@/lib/scan-entitlement";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "This week | Handover",
};

/** "lewis" → "Lewis"; leaves "McDonald" and "de Vries" alone. */
function capitalise(name: string): string {
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : name;
}

export default async function WeekPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth?tab=signin&returnTo=%2Fweek");
  }
  if (!(await userCanViewScanDetails(user.id, supabase))) {
    redirect("/onboarding/results");
  }

  const admin = createServiceRoleClient();
  const [summary, profile, brief, team] = await Promise.all([
    loadPortfolioSummary(admin, user.id).catch(() => null),
    supabase.from("profiles").select("first_name").eq("id", user.id).maybeSingle(),
    supabase.from("monday_brief_settings").select("enabled").eq("user_id", user.id).maybeSingle(),
    loadTeamNames(admin, user.id).catch(() => [] as string[]),
  ]);

  return (
    <WeekClient
      summary={summary}
      firstName={capitalise(typeof profile.data?.first_name === "string" ? profile.data.first_name.trim() : "")}
      briefEnabled={brief.error ? null : (brief.data?.enabled ?? true)}
      team={team}
      stored={summary?.listStored ?? false}
    />
  );
}
