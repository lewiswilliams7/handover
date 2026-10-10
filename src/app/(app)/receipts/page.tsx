import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ReceiptsClient } from "@/app/(app)/receipts/receipts-client";
import { getClaimedScanForUser } from "@/lib/psa/scan-session";
import { userCanViewScanDetails } from "@/lib/scan-entitlement";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Value Receipts | Handover",
};

export default async function ReceiptsPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth?tab=signin&returnTo=%2Freceipts");
  }
  if (!(await userCanViewScanDetails(user.id, supabase))) {
    redirect("/onboarding/results");
  }

  const scan = await getClaimedScanForUser(user.id);
  const results = scan?.results ?? null;

  return (
    <ReceiptsClient
      monthly={results?.clientMonthly ?? (results ? null : undefined)}
      clientNames={results?.clientNames ?? {}}
      scannedAt={scan?.createdAt ?? null}
    />
  );
}
