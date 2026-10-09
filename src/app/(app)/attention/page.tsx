import { redirect } from "next/navigation";

import { AttentionClient } from "@/app/(app)/attention/attention-client";
import { compareScanFindings } from "@/lib/psa/scan-comparison";
import { getClaimedScanForUser } from "@/lib/psa/scan-session";
import { getPreviousClaimedScanForUser } from "@/lib/psa/scan-session";
import { syncScanFindingLedger } from "@/lib/psa/scan-finding-ledger";
import { userCanViewScanDetails } from "@/lib/scan-entitlement";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AttentionPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?tab=signin&returnTo=%2Fattention");
  }

  if (!(await userCanViewScanDetails(user.id, supabase))) {
    redirect("/onboarding/results");
  }

  const claimedScan = await getClaimedScanForUser(user.id);
  const previousScan = claimedScan
    ? await getPreviousClaimedScanForUser(user.id, claimedScan.sessionId)
    : null;
  const comparison =
    claimedScan?.results && previousScan?.results
      ? compareScanFindings(
          claimedScan.results,
          previousScan.results,
          claimedScan.createdAt,
          previousScan.createdAt,
        )
      : null;
  if (claimedScan?.results) {
    if (previousScan?.results) {
      await syncScanFindingLedger({
        userId: user.id,
        sessionId: previousScan.sessionId,
        createdAt: previousScan.createdAt,
        results: previousScan.results,
      });
    }
    await syncScanFindingLedger({
      userId: user.id,
      sessionId: claimedScan.sessionId,
      createdAt: claimedScan.createdAt,
      results: claimedScan.results,
      previousSessionId: previousScan?.sessionId,
      comparison,
    });
  }
  return (
    <AttentionClient
      initialResults={claimedScan?.results ?? null}
      initialSessionId={claimedScan?.sessionId ?? null}
      initialSyncedAt={claimedScan?.createdAt ?? null}
      initialComparison={comparison}
    />
  );
}
