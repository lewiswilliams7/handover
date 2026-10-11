import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { WeekClient } from "@/app/(app)/week/week-client";
import { loadPortfolioSummary } from "@/lib/server/portfolio-summary";
import { userCanViewScanDetails } from "@/lib/scan-entitlement";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "This week | Handover",
};

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

  const [summary, profile, brief] = await Promise.all([
    loadPortfolioSummary(createServiceRoleClient(), user.id).catch(() => null),
    supabase.from("profiles").select("first_name").eq("id", user.id).maybeSingle(),
    supabase.from("monday_brief_settings").select("enabled").eq("user_id", user.id).maybeSingle(),
  ]);

  return (
    <WeekClient
      summary={summary}
      firstName={typeof profile.data?.first_name === "string" ? profile.data.first_name.trim() : ""}
      briefEnabled={brief.error ? null : (brief.data?.enabled ?? true)}
    />
  );
}
