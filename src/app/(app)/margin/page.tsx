import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MarginClient } from "@/app/(app)/margin/margin-client";
import { buildClientMargin } from "@/lib/client-margin";
import { getClaimedScanForUser } from "@/lib/psa/scan-session";
import { userCanViewScanDetails } from "@/lib/scan-entitlement";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Client Margin | Handover",
};

export default async function MarginPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth?tab=signin&returnTo=%2Fmargin");
  }
  if (!(await userCanViewScanDetails(user.id, supabase))) {
    redirect("/onboarding/results");
  }

  const scan = await getClaimedScanForUser(user.id);
  const results = scan?.results ?? null;
  const margin =
    results?.clientMonthly
      ? buildClientMargin({
          monthly: results.clientMonthly,
          clientValues: results.clientValues,
          findings: (results.findings ?? []).map((finding) => ({
            clientId: finding.clientId,
            type: finding.type,
          })),
          clientNames: results.clientNames ?? {},
        })
      : null;

  return (
    <MarginClient
      state={!results ? "no_scan" : !results.clientMonthly ? "stale_scan" : "ready"}
      margin={margin}
      scannedAt={scan?.createdAt ?? null}
    />
  );
}
