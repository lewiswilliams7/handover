import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { churnReplayPreview, type ChurnReplayPreview } from "@/lib/psa/churn-replay";
import { createServerClient } from "@/lib/supabase/server";
import {
  scanFindingPreviewsForViewer,
  type ScanFindingPreview,
  type StoredScanResults,
} from "@/lib/psa/scan-session";
import {
  hasHandoverEntitlement,
  planFieldsFromProfileRow,
} from "@/lib/utils/getPlan";

export const ENTITLEMENT_REQUIRED_ERROR = "entitlement_required";

/**
 * Single scan-details entitlement decision.
 *
 * Change this one comparison when the dedicated scan-results entitlement is
 * introduced. Tier 1 currently includes an active Professional-level plan.
 */
export async function userCanViewScanDetails(
  userId: string,
  client?: SupabaseClient,
): Promise<boolean> {
  const supabase = client ?? (await createServerClient());
  const { data, error } = await supabase
    .from("profiles")
    .select("plan, team_id, trial_ends_at, trial_plan, subscription_status")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return false;
  return hasHandoverEntitlement(planFieldsFromProfileRow(data));
}

export async function requireScanDetailsEntitlement(
  userId: string,
  client?: SupabaseClient,
): Promise<NextResponse | null> {
  if (await userCanViewScanDetails(userId, client)) return null;
  return NextResponse.json(
    {
      error: ENTITLEMENT_REQUIRED_ERROR,
      message: "A Handover entitlement is required for this feature.",
    },
    { status: 403 },
  );
}

export function scanResultsForViewer(
  results: StoredScanResults | null,
  entitled: boolean,
): StoredScanResults | Pick<
  StoredScanResults,
  "portfolio" | "exposureAvailability" | "scanOutcome" | "suppressedMetricCount"
> & {
  findingPreviews: ScanFindingPreview[];
  churnReplayPreview?: ChurnReplayPreview | null;
} | null {
  if (!results || entitled) return results;
  return {
    portfolio: results.portfolio,
    exposureAvailability: results.exposureAvailability,
    scanOutcome: results.scanOutcome,
    suppressedMetricCount: results.suppressedMetricCount,
    findingPreviews: scanFindingPreviewsForViewer(results),
    churnReplayPreview: churnReplayPreview(results.churnReplay),
  };
}
