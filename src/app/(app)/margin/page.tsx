import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MarginClient } from "@/app/(app)/margin/margin-client";
import { buildClientMargin, type MarginBasis } from "@/lib/client-margin";
import { getClaimedScanForUser } from "@/lib/psa/scan-session";
import { applyManualValues, loadManualValues } from "@/lib/manual-client-values";
import { isRiskFinding } from "@/lib/revenue/revenue-signals";
import { userCanViewScanDetails } from "@/lib/scan-entitlement";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Client Margin | Handover",
};

export default async function MarginPage({
  searchParams,
}: {
  searchParams: Promise<{ basis?: string }>;
}) {
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

  const { basis: basisParam } = await searchParams;
  const requestedBasis: MarginBasis | undefined =
    basisParam === "tickets" || basisParam === "hours" ? basisParam : undefined;

  const scan = await getClaimedScanForUser(user.id);
  // Values typed in by hand fill any client the PSA holds no value for, and
  // clients marked internal drop out entirely.
  const manual = await loadManualValues(supabase, user.id);
  const results = scan?.results ? applyManualValues(scan.results, manual) : null;
  const findings = results?.findings ?? [];
  const margin = results?.clientMonthly
    ? buildClientMargin({
        monthly: results.clientMonthly,
        clientValues: results.clientValues,
        findings: findings.map((finding) => ({ clientId: finding.clientId, type: finding.type })),
        clientNames: results.clientNames ?? {},
        basis: requestedBasis,
      })
    : null;

  // The first open risk signal per client, so "save" and "fix" rows open its Save Play.
  const riskTypeByClient: Record<string, string> = {};
  for (const finding of findings) {
    if (isRiskFinding(finding.type) && !riskTypeByClient[String(finding.clientId)]) {
      riskTypeByClient[String(finding.clientId)] = finding.type;
    }
  }
  const renewingClientIds = (results?.renewals ?? []).map((renewal) => renewal.clientId);
  const internalClients = manual.internal.map((id) => ({
    clientId: Number(id),
    name: scan?.results?.clientNames?.[id]?.trim() || `Client #${id}`,
  }));

  return (
    <MarginClient
      state={!results ? "no_scan" : !results.clientMonthly ? "stale_scan" : "ready"}
      margin={margin}
      manualValues={manual.values}
      internalClients={internalClients}
      riskTypeByClient={riskTypeByClient}
      renewingClientIds={renewingClientIds}
      scannedAt={scan?.createdAt ?? null}
    />
  );
}
