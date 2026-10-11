import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ClientDetailClient } from "@/app/(app)/clients/[clientId]/client-detail-client";
import { loadClientPortfolio } from "@/lib/server/client-portfolio";
import { userCanViewScanDetails } from "@/lib/scan-entitlement";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Client | Handover",
};

export default async function ClientPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId: raw } = await params;
  const clientId = Number(raw);
  if (!Number.isSafeInteger(clientId) || clientId <= 0) notFound();

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?tab=signin&returnTo=${encodeURIComponent(`/clients/${clientId}`)}`);
  if (!(await userCanViewScanDetails(user.id, supabase))) redirect("/onboarding/results");

  const portfolio = await loadClientPortfolio(supabase, user.id);
  const client = portfolio?.clients.find((row) => row.clientId === clientId);
  if (!portfolio || !client) notFound();

  const { data: history } = await supabase
    .from("scan_finding_dismissals")
    .select("finding_type, raised_at, actioned, action_type, actioned_at, outcome_status, action_note")
    .eq("user_id", user.id)
    .eq("client_id", clientId)
    .order("raised_at", { ascending: false })
    .limit(12);

  return (
    <ClientDetailClient
      client={client}
      median={portfolio.medianRevenuePerHour}
      currentMonth={portfolio.currentMonth}
      scannedAt={portfolio.scannedAt}
      history={(history ?? []).map((row) => ({
        findingType: String(row.finding_type),
        raisedAt: String(row.raised_at),
        actioned: row.actioned === true,
        actionType: typeof row.action_type === "string" ? row.action_type : null,
        actionedAt: typeof row.actioned_at === "string" ? row.actioned_at : null,
        outcome: typeof row.outcome_status === "string" ? row.outcome_status : "pending",
        note: typeof row.action_note === "string" ? row.action_note : null,
      }))}
    />
  );
}
