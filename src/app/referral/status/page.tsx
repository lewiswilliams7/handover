import { redirect } from "next/navigation";

import { createServerClient } from "@/lib/supabase/server";

import { ReferralStatusView } from "./referral-status-view";

export default async function ReferralStatusPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    redirect("/auth?tab=signin&returnTo=/referral/status");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("referred_by")
    .eq("id", user.id)
    .maybeSingle();

  const referredBy =
    typeof profile?.referred_by === "string" && profile.referred_by.trim().length > 0
      ? profile.referred_by.trim()
      : null;

  if (!referredBy) {
    redirect("/");
  }

  return <ReferralStatusView />;
}
