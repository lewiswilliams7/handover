import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { buildScorecard } from "@/lib/precision-scorecard";
import type { ChurnReplayResult } from "@/lib/psa/churn-replay";
import { getFindingCopy } from "@/lib/psa/scan-finding-copy";
import { isHandoverEnvAdmin } from "@/lib/server/handover-env-admin";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Precision | Handover", robots: { index: false } };

function pct(value: number | null): string {
  return value == null ? "–" : `${Math.round(value * 100)}%`;
}

/** Internal: per-sign precision across every MSP's latest Churn Replay. */
export default async function PrecisionPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isHandoverEnvAdmin(user.id, user.email)) notFound();

  const admin = createServiceRoleClient();
  const [sessions, feedback, outcomes, raised] = await Promise.all([
    admin
      .from("scan_sessions")
      .select("claimed_by_user_id,created_at,churn:results_json->churnReplay")
      .eq("status", "claimed")
      .order("created_at", { ascending: false })
      .limit(1000),
    admin.from("signal_feedback").select("finding_type,verdict").is("undone_at", null).limit(20000),
    admin.from("client_outcomes").select("user_id,client_id,occurred_on").eq("outcome", "lost").limit(5000),
    admin.from("scan_finding_dismissals").select("user_id,client_id,raised_at").not("raised_at", "is", null).limit(50000),
  ]);

  const seen = new Set<string>();
  const replays: ChurnReplayResult[] = [];
  for (const row of (sessions.data ?? []) as Array<{ claimed_by_user_id: string | null; churn: unknown }>) {
    if (!row.claimed_by_user_id || seen.has(row.claimed_by_user_id)) continue;
    const churn = row.churn as ChurnReplayResult | null;
    if (!churn || typeof churn !== "object" || !Array.isArray(churn.clients) || !churn.summary) continue;
    seen.add(row.claimed_by_user_id);
    replays.push(churn);
  }
  const card = buildScorecard({
    replays,
    feedback: (feedback.data ?? []) as Array<{ finding_type: string; verdict: string }>,
    outcomes: ((outcomes.data ?? []) as Array<{ user_id: string; client_id: number; occurred_on: string }>).map((row) => ({
      ...row,
      client_id: Number(row.client_id),
    })),
    raised: ((raised.data ?? []) as Array<{ user_id: string; client_id: number; raised_at: string }>).map((row) => ({
      ...row,
      client_id: Number(row.client_id),
    })),
  });

  return (
    <main className="min-h-screen bg-[#0b1220] px-4 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">Internal</p>
        <h1 className="mt-2 text-3xl font-semibold">Signal precision</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">
          Latest Churn Replay from {card.msps} MSP{card.msps === 1 ? "" : "s"}. Overall: flagged {card.lostFlagged} of{" "}
          {card.lostReplayable} lost clients ({pct(card.lostReplayable ? card.lostFlagged / card.lostReplayable : null)}), and{" "}
          {card.retainedFlagged} of {card.retainedChecked} retained clients (
          {pct(card.retainedChecked ? card.retainedFlagged / card.retainedChecked : null)} false alarms). Lift above 1 means the
          sign is more common before a loss than in an ordinary account.
        </p>
        <p className="mt-2 text-sm text-white/65">
          Recorded losses: {card.groundTruth.recorded}, of which {card.groundTruth.warnedBefore} had a warning in the 180 days
          before.
        </p>
        <div className="mt-6 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-white/[0.04] text-left text-xs text-white/55">
              <tr>
                <th className="px-3 py-2 font-medium">Sign</th>
                <th className="px-3 py-2 font-medium">Catch rate</th>
                <th className="px-3 py-2 font-medium">False alarms</th>
                <th className="px-3 py-2 font-medium">Lift</th>
                <th className="px-3 py-2 font-medium">Median lead</th>
                <th className="px-3 py-2 font-medium">MSPs said useful</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {card.signs.map((sign) => (
                <tr key={sign.type}>
                  <td className="px-3 py-2">
                    {getFindingCopy(sign.type).label}
                    <span className="block text-xs text-white/40">{sign.type}</span>
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {pct(sign.catchRate)} <span className="text-white/40">({sign.lostFired})</span>
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {pct(sign.falseAlarmRate)} <span className="text-white/40">({sign.retainedFired})</span>
                  </td>
                  <td className={`px-3 py-2 tabular-nums ${sign.lift != null && sign.lift < 1 ? "text-amber-300" : ""}`}>
                    {sign.lift == null ? "–" : sign.lift.toFixed(1)}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{sign.medianLeadDays == null ? "–" : `${sign.medianLeadDays} days`}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {sign.useful + sign.notUseful === 0 ? "–" : `${sign.useful} of ${sign.useful + sign.notUseful}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
