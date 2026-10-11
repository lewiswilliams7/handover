import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ClientsListClient } from "@/app/(app)/clients/clients-list-client";
import { loadClientPortfolio } from "@/lib/server/client-portfolio";
import { userCanViewScanDetails } from "@/lib/scan-entitlement";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Clients | Handover",
};

export default async function ClientsPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth?tab=signin&returnTo=%2Fclients");
  if (!(await userCanViewScanDetails(user.id, supabase))) redirect("/onboarding/results");

  const portfolio = await loadClientPortfolio(supabase, user.id);
  return (
    <ClientsListClient
      scannedAt={portfolio?.scannedAt ?? null}
      median={portfolio?.medianRate ?? null}
      basis={portfolio?.basis ?? "hours"}
      clients={(portfolio?.clients ?? []).map((client) => ({
        clientId: client.clientId,
        name: client.name,
        monthlyValue: client.monthlyValue,
        status: client.status,
        topSignal: client.signals.find((signal) => signal.kind === "risk")?.label ?? null,
        renewalDays: client.renewal?.daysLeft ?? null,
        rate: client.margin?.rate ?? null,
        vsMedian: client.margin?.vsMedian ?? null,
        lastMonthResolved: client.lastMonthResolved,
        trend: (portfolio?.currentMonth
          ? client.months.filter((m) => m.month < portfolio.currentMonth!)
          : client.months
        )
          .slice(-6)
          .map((m) => m.opened),
      }))}
      hasScan={Boolean(portfolio)}
    />
  );
}
