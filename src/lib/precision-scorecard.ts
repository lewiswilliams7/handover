/**
 * Precision scorecard: how well each kind of warning sign separates clients
 * who left from clients who stayed, across every MSP's latest Churn Replay,
 * plus what MSPs told us about each sign and the losses they recorded.
 *
 * Per sign:
 * - catch rate: share of replayable lost clients the sign fired for, ahead of the loss.
 * - false-alarm rate: share of checked retained clients it fired for.
 * - lift: catch rate divided by false-alarm rate. Above 1 means the sign is
 *   more common before a loss than in ordinary accounts; below 1 means noise.
 * - lead time: median days of warning when it fired for a lost client.
 */
import type { ChurnReplayResult } from "@/lib/psa/churn-replay";

export type SignScore = {
  type: string;
  lostFired: number;
  lostReplayable: number;
  retainedFired: number;
  retainedChecked: number;
  catchRate: number | null;
  falseAlarmRate: number | null;
  lift: number | null;
  medianLeadDays: number | null;
  useful: number;
  notUseful: number;
};

export type Scorecard = {
  msps: number;
  lostReplayable: number;
  lostFlagged: number;
  retainedChecked: number;
  retainedFlagged: number;
  signs: SignScore[];
  /** MSP-recorded losses, and how many had a warning raised in the 180 days before. */
  groundTruth: { recorded: number; warnedBefore: number };
};

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
}

export function buildScorecard(input: {
  replays: ChurnReplayResult[];
  feedback: Array<{ finding_type: string; verdict: string }>;
  outcomes: Array<{ user_id: string; client_id: number; occurred_on: string }>;
  /** Warnings raised: (user, client, raised_at) from the finding ledger. */
  raised: Array<{ user_id: string; client_id: number; raised_at: string }>;
}): Scorecard {
  const byType = new Map<string, { lostFired: number; leads: number[]; retainedFired: number }>();
  let lostReplayable = 0;
  let lostFlagged = 0;
  let retainedChecked = 0;
  let retainedFlagged = 0;
  for (const replay of input.replays) {
    lostReplayable += replay.summary.replayable;
    lostFlagged += replay.summary.flagged;
    retainedChecked += replay.summary.retainedChecked;
    retainedFlagged += replay.summary.retainedFlagged;
    for (const client of replay.clients) {
      if (client.outcome !== "flagged") continue;
      for (const type of new Set(client.findings.map((finding) => finding.type))) {
        const entry = byType.get(type) ?? { lostFired: 0, leads: [], retainedFired: 0 };
        entry.lostFired += 1;
        if (client.daysWarning != null) entry.leads.push(client.daysWarning);
        byType.set(type, entry);
      }
    }
    for (const [type, count] of Object.entries(replay.summary.retainedFlaggedByType ?? {})) {
      const entry = byType.get(type) ?? { lostFired: 0, leads: [], retainedFired: 0 };
      entry.retainedFired += count;
      byType.set(type, entry);
    }
  }

  const feedback = new Map<string, { useful: number; notUseful: number }>();
  for (const row of input.feedback) {
    const entry = feedback.get(row.finding_type) ?? { useful: 0, notUseful: 0 };
    if (row.verdict === "worth_knowing" || row.verdict === "handled") entry.useful += 1;
    else entry.notUseful += 1;
    feedback.set(row.finding_type, entry);
  }

  const types = new Set([...byType.keys(), ...feedback.keys()]);
  const signs: SignScore[] = [...types].map((type) => {
    const entry = byType.get(type) ?? { lostFired: 0, leads: [], retainedFired: 0 };
    const catchRate = lostReplayable > 0 ? entry.lostFired / lostReplayable : null;
    const falseAlarmRate = retainedChecked > 0 ? entry.retainedFired / retainedChecked : null;
    return {
      type,
      lostFired: entry.lostFired,
      lostReplayable,
      retainedFired: entry.retainedFired,
      retainedChecked,
      catchRate,
      falseAlarmRate,
      lift: catchRate != null && falseAlarmRate != null && falseAlarmRate > 0 ? catchRate / falseAlarmRate : null,
      medianLeadDays: median(entry.leads),
      useful: feedback.get(type)?.useful ?? 0,
      notUseful: feedback.get(type)?.notUseful ?? 0,
    };
  });
  signs.sort((a, b) => (b.lift ?? -1) - (a.lift ?? -1) || b.lostFired - a.lostFired);

  const raisedBy = new Map<string, number[]>();
  for (const row of input.raised) {
    const key = `${row.user_id}:${row.client_id}`;
    const list = raisedBy.get(key) ?? [];
    list.push(Date.parse(row.raised_at));
    raisedBy.set(key, list);
  }
  let warnedBefore = 0;
  for (const outcome of input.outcomes) {
    const lossMs = Date.parse(`${outcome.occurred_on}T00:00:00Z`);
    const raised = raisedBy.get(`${outcome.user_id}:${outcome.client_id}`) ?? [];
    if (raised.some((at) => at <= lossMs && lossMs - at <= 180 * 86_400_000)) warnedBefore += 1;
  }

  return {
    msps: input.replays.length,
    lostReplayable,
    lostFlagged,
    retainedChecked,
    retainedFlagged,
    signs,
    groundTruth: { recorded: input.outcomes.length, warnedBefore },
  };
}
