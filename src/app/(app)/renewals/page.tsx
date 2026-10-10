import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RenewalsClient } from "@/app/(app)/renewals/renewals-client";
import { buildClientMargin } from "@/lib/client-margin";
import { getClaimedScanForUser } from "@/lib/psa/scan-session";
import { buildRenewalRadar } from "@/lib/renewal-radar";
import { userCanViewScanDetails } from "@/lib/scan-entitlement";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Renewal Radar | Handover",
};

export default async function RenewalsPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth?tab=signin&returnTo=%2Frenewals");
  }
  if (!(await userCanViewScanDetails(user.id, supabase))) {
    redirect("/onboarding/results");
  }

  const scan = await getClaimedScanForUser(user.id);
  const results = scan?.results ?? null;
  const findings = (results?.findings ?? []).map((finding) => ({
    clientId: finding.clientId,
    type: finding.type,
  }));
  const margin = results?.clientMonthly
    ? buildClientMargin({
        monthly: results.clientMonthly,
        clientValues: results.clientValues,
        findings,
        clientNames: results.clientNames ?? {},
      })
    : null;
  const radar =
    results?.renewals != null
      ? buildRenewalRadar({
          renewals: results.renewals,
          findings,
          margin,
          clientNames: results.clientNames ?? {},
        })
      : null;

  return (
    <RenewalsClient
      state={!results ? "no_scan" : results.renewals == null ? "stale_scan" : "ready"}
      radar={radar}
      contractsReadable={results ? results.exposureAvailability !== "unavailable" || (results.renewals?.length ?? 0) > 0 : false}
      scannedAt={scan?.createdAt ?? null}
    />
  );
}
