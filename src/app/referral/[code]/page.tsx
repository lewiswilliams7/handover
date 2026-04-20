import type { Metadata } from "next";

import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { normalizeReferralCode } from "@/lib/referral";
import { createServiceRoleClient } from "@/lib/supabase/admin";

import { ReferralCodeLanding } from "./referral-code-landing";

type PageProps = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code: raw } = await params;
  const normalized = normalizeReferralCode(decodeURIComponent(raw ?? ""));
  return {
    title: normalized ? "You've been invited - Handover" : "Referral - Handover",
    description:
      "Get your first month of Handover Pro free when you join through a referral link.",
  };
}

export default async function ReferralByCodePage({ params }: PageProps) {
  const { code: raw } = await params;
  const code = normalizeReferralCode(decodeURIComponent(raw ?? ""));

  let valid = false;
  let referrerFirstName: string | null = null;

  if (code) {
    const admin = createServiceRoleClient();
    const { data: row } = await admin
      .from("referral_codes")
      .select("user_id")
      .eq("code", code)
      .maybeSingle();

    if (row?.user_id) {
      valid = true;
      const { data: prof } = await admin
        .from("profiles")
        .select("first_name")
        .eq("id", row.user_id)
        .maybeSingle();
      referrerFirstName =
        typeof prof?.first_name === "string" && prof.first_name.trim()
          ? prof.first_name.trim()
          : null;
    }
  }

  return (
    <MarketingPageLayout>
      <ReferralCodeLanding
        code={code}
        valid={valid}
        referrerFirstName={referrerFirstName}
      />
    </MarketingPageLayout>
  );
}
