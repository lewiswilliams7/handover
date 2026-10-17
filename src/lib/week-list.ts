/**
 * The This week list: one ranked list of what needs the owner, one row per
 * client, each with the money at stake, why it is there and one action.
 *
 * Rows come from warning signs, renewals, thin margins and receipt opens. When
 * a quiet week leaves fewer than three, the list is topped up with proactive
 * rows (a receipt due to a big client, a recurring issue worth fixing) so it is
 * never empty and never padded beyond five.
 *
 * Ranking, in plain terms: money at stake, times how sure we are, times how
 * soon it matters. Kinds of sign this MSP keeps marking as not useful sit lower
 * ("Handover learned"), and signs marked normal for a client are hidden for
 * that client for six months.
 *
 * Pure: everything stored (statuses, feedback, receipt opens) is passed in.
 */
import type { ClientMargin } from "@/lib/client-margin";
import { shortCategory } from "@/lib/psa/client-monthly";
import { getFindingCopy } from "@/lib/psa/scan-finding-copy";
import type { FindingStrength, ScanFinding } from "@/lib/psa/scan-findings";
import type { StoredScanResults } from "@/lib/psa/scan-session";
import type { RenewalRadar, RenewalRow } from "@/lib/renewal-radar";
import { isRiskFinding } from "@/lib/revenue/revenue-signals";
import { getSavePlay } from "@/lib/save-plays";

export type WeekRowKind = "risk" | "renewal" | "margin" | "receipt_quiet" | "receipt_due" | "recurring";
export type WeekRowStatus = "open" | "doing" | "done";

export type WeekRow = {
  key: string;
  kind: WeekRowKind;
  clientId: number | null;
  clientName: string;
  /** Money at stake a year: contract value, or for margin rows the yearly gap. */
  annualValue: number | null;
  /** What `annualValue` means, when it is not the contract value. */
  valueNote: string | null;
  /** One line: why this is on the list. */
  why: string;
  /** The evidence in a sentence, when there is one worth reading. */
  detail: string | null;
  action: { label: string; href: string };
  strength: FindingStrength | null;
  /** First seen in this scan. */
  isNew: boolean;
  /** Contract end, when it is inside 90 days. */
  renewsInDays: number | null;
  /** For risk rows: the warning sign the feedback buttons answer. */
  findingType: string | null;
  /** Other open warning signs on the same client. */
  otherSigns: string[];
  proactive: boolean;
  status: WeekRowStatus;
  owner: string | null;
  score: number;
};

export type ItemState = {
  status: "open" | "doing" | "done" | "snoozed";
  owner: string | null;
  snoozedUntil: string | null;
  doneAt: string | null;
};

export type FeedbackRow = {
  id: string;
  clientId: number;
  findingType: string;
  verdict: "worth_knowing" | "handled" | "normal_for_client" | "not_useful";
  reason: string | null;
  createdAt: string;
  expiresAt: string | null;
};

export type ReceiptSendStats = { sent: number; opened: number; lastSentAt: string | null; lastOpenedAt: string | null };

export type LearnedType = {
  findingType: string;
  label: string;
  negative: number;
  total: number;
};

export type WeekList = {
  rows: WeekRow[];
  done: WeekRow[];
  /** Kinds of sign moved down the list for this MSP, with the counts behind it. */
  learned: LearnedType[];
  /** Signs hidden because the MSP said they are normal for that client. */
  hiddenAsNormal: number;
};

/** Rows shown before "Show everything". The Monday Brief sends the first five. */
export const WEEK_LIST_TOP = 5;

const DONE_KEEP_MS = 7 * 86_400_000;
const LEARN_WINDOW_MS = 180 * 86_400_000;
/** At least this many "not useful" / "normal" answers before a kind of sign is moved down. */
const LEARN_MIN_NEGATIVE = 3;
const LEARN_MIN_SHARE = 0.6;
const LEARNED_WEIGHT = 0.5;

function money(value: number): string {
  return `£${Math.round(value).toLocaleString("en-GB")}`;
}

function nameFor(results: StoredScanResults, clientId: number): string {
  const name = results.clientNames?.[String(clientId)]?.trim();
  return name && !["unknown", "unassigned", "n/a"].includes(name.toLowerCase()) ? name : `Client #${clientId}`;
}

function rangeSentence(finding: ScanFinding): string | null {
  return normalRangeSentence(finding.normalRange ?? null);
}

/** "Normally 7 to 15 tickets a month." from a finding's stored range. */
export function normalRangeSentence(range: { low: number; high: number; unit: string } | null): string | null {
  if (!range) return null;
  const low = Math.round(range.low);
  const high = Math.round(range.high);
  if (range.unit === "tickets_per_month") {
    return low === high ? `Normally about ${low} tickets a month.` : `Normally ${low} to ${high} tickets a month.`;
  }
  if (range.unit === "hours") {
    const fmt = (h: number) => (h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : h < 48 ? `${Math.round(h * 10) / 10} hr` : `${Math.round(h / 24)} days`);
    return `Normally between ${fmt(range.low)} and ${fmt(range.high)} in a month.`;
  }
  return null;
}

/** The driver fact, trimmed of the internal "12-month baseline" phrasing. */
function evidence(finding: ScanFinding): string | null {
  const fact = finding.drivers[0]?.fact?.trim();
  const range = rangeSentence(finding);
  if (!fact) return range;
  const clean = fact.replace(/\s*\([^)]*prior months\)/, "").replace(/their 12-month baseline of/, "a usual");
  return range ? `${clean}. ${range}` : `${clean}.`;
}

/** Kinds of sign this MSP keeps answering "not useful" or "normal for this client". */
export function learnedTypes(feedback: FeedbackRow[], keep: Set<string>, nowMs: number): LearnedType[] {
  const byType = new Map<string, { negative: number; total: number }>();
  for (const row of feedback) {
    if (nowMs - Date.parse(row.createdAt) > LEARN_WINDOW_MS) continue;
    const entry = byType.get(row.findingType) ?? { negative: 0, total: 0 };
    entry.total += 1;
    if (row.verdict === "not_useful" || row.verdict === "normal_for_client") entry.negative += 1;
    byType.set(row.findingType, entry);
  }
  return [...byType.entries()]
    .filter(([type, entry]) => !keep.has(type) && entry.negative >= LEARN_MIN_NEGATIVE && entry.negative / entry.total >= LEARN_MIN_SHARE)
    .map(([findingType, entry]) => ({ findingType, label: getFindingCopy(findingType).label, ...entry }))
    .sort((a, b) => b.negative - a.negative);
}

function renewalAction(row: RenewalRow): { why: string; label: string; href: string } {
  const days = row.daysLeft;
  const ends = `Contract ends in ${days} day${days === 1 ? "" : "s"}`;
  if (row.move === "reprice" || row.move === "fix") {
    return days > 60
      ? { why: `${ends}, and they cost more to serve than they pay`, label: "Draft the price review", href: `/renewals?client=${row.clientId}#client-${row.clientId}` }
      : { why: `${ends} on a thin margin`, label: "Send the price-rise letter", href: `/renewals?client=${row.clientId}#client-${row.clientId}` };
  }
  if (days > 60) return { why: ends, label: "Send a Value Receipt before renewal talks", href: `/receipts?client=${row.clientId}` };
  if (days > 30) return { why: ends, label: "Propose renewal terms", href: `/renewals?client=${row.clientId}#client-${row.clientId}` };
  return { why: `${ends} and is not confirmed`, label: "Confirm the renewal", href: `/renewals?client=${row.clientId}#client-${row.clientId}` };
}

function proximity(days: number | null): number {
  if (days == null) return 1;
  if (days <= 30) return 1.4;
  if (days <= 60) return 1.2;
  return 1.05;
}

export function buildWeekList(input: {
  results: StoredScanResults;
  margin: ClientMargin | null;
  radar: RenewalRadar | null;
  /** Finding keys ("clientId:type") present in the previous scan. */
  previousKeys: Set<string> | null;
  states: Map<string, ItemState>;
  feedback: FeedbackRow[];
  keepTypes: Set<string>;
  receiptStats: Map<number, ReceiptSendStats>;
  /** Clients the MSP has recorded as lost: never on the list. */
  recordedLost?: Set<number>;
  nowMs?: number;
}): WeekList {
  const nowMs = input.nowMs ?? Date.now();
  const { results } = input;
  const departed = new Set([
    ...(results.churnReplay?.clients ?? []).map((client) => client.clientId),
    ...(input.recordedLost ?? []),
  ]);

  // Signs marked "normal for this client" that are still in force.
  const normal = new Set(
    input.feedback
      .filter((row) => row.verdict === "normal_for_client" && (!row.expiresAt || Date.parse(row.expiresAt) > nowMs))
      .map((row) => `${row.clientId}:${row.findingType}`),
  );
  const learned = learnedTypes(input.feedback, input.keepTypes, nowMs);
  const learnedSet = new Set(learned.map((entry) => entry.findingType));

  const knownValues = Object.values(results.clientValues ?? {})
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);
  const medianAnnual = knownValues.length > 0 ? knownValues[Math.floor(knownValues.length / 2)]! * 12 : 6000;

  const renewalByClient = new Map((input.radar?.rows ?? []).map((row) => [row.clientId, row]));
  const candidates: WeekRow[] = [];
  let hiddenAsNormal = 0;

  // 1. Warning signs, one row per client.
  const signsByClient = new Map<number, ScanFinding[]>();
  for (const finding of results.findings ?? []) {
    if (!isRiskFinding(finding.type) || departed.has(finding.clientId)) continue;
    if (normal.has(`${finding.clientId}:${finding.type}`)) {
      hiddenAsNormal += 1;
      continue;
    }
    const list = signsByClient.get(finding.clientId) ?? [];
    list.push(finding);
    signsByClient.set(finding.clientId, list);
  }
  for (const [clientId, signs] of signsByClient) {
    // Findings arrive ranked (strong first within value); keep that order.
    const primary = signs.find((sign) => sign.strength === "strong") ?? signs[0]!;
    const monthly = signs.reduce<number | null>(
      (max, sign) => (sign.monthlyValue != null && sign.monthlyValue > 0 ? Math.max(max ?? 0, sign.monthlyValue) : max),
      null,
    );
    const annual = monthly != null ? Math.round(monthly * 12) : null;
    const renewal = renewalByClient.get(clientId);
    const renewsInDays = renewal && renewal.daysLeft <= 90 ? renewal.daysLeft : null;
    const strength = primary.strength ?? null;
    const isNew = input.previousKeys ? !input.previousKeys.has(`${clientId}:${primary.type}`) : false;
    const play = getSavePlay(primary.type);
    const confidence = strength === "strong" ? 1.3 : strength === "worth_a_look" ? 0.8 : 1;
    const score =
      (annual ?? medianAnnual * 0.6) *
      confidence *
      proximity(renewsInDays) *
      (isNew ? 1.15 : 1) *
      (learnedSet.has(primary.type) ? LEARNED_WEIGHT : 1) *
      (1 + Math.min(2, signs.length - 1) * 0.1);
    candidates.push({
      key: `risk:${clientId}`,
      kind: "risk",
      clientId,
      clientName: nameFor(results, clientId),
      annualValue: annual,
      valueNote: null,
      why: getFindingCopy(primary.type).label,
      detail: evidence(primary),
      action: { label: play?.title ?? "Open the Save Play", href: `/attention?finding=${clientId}:${primary.type}` },
      strength,
      isNew,
      renewsInDays,
      findingType: primary.type,
      otherSigns: signs.filter((sign) => sign !== primary).map((sign) => getFindingCopy(sign.type).label),
      proactive: false,
      status: "open",
      owner: null,
      score,
    });
  }

  // 2. Renewals inside 90 days with no warning sign (those are already on the risk row).
  for (const row of input.radar?.rows ?? []) {
    if (row.daysLeft > 90 || signsByClient.has(row.clientId) || departed.has(row.clientId)) continue;
    const step = renewalAction(row);
    const thin = row.move === "reprice" || row.move === "fix";
    candidates.push({
      key: `renewal:${row.clientId}`,
      kind: "renewal",
      clientId: row.clientId,
      clientName: row.clientName,
      annualValue: row.annualValue,
      valueNote: null,
      why: step.why,
      detail:
        thin && row.repriceTarget != null && row.monthlyValue != null
          ? `At your typical rate they would pay ${money(row.repriceTarget)} a month, against ${money(row.monthlyValue)} now.`
          : null,
      action: { label: step.label, href: step.href },
      strength: null,
      isNew: false,
      renewsInDays: row.daysLeft,
      findingType: null,
      otherSigns: [],
      proactive: false,
      status: "open",
      owner: null,
      score: (row.annualValue ?? medianAnnual * 0.6) * 0.75 * proximity(row.daysLeft) * (thin ? 1.1 : 1),
    });
  }

  // 3. Thin margins that are not renewing soon: the yearly gap is the money at stake.
  const listed = new Set(candidates.map((row) => row.clientId));
  for (const row of input.margin?.rows ?? []) {
    if (row.group !== "reprice" || listed.has(row.clientId) || departed.has(row.clientId)) continue;
    const gap = row.repriceMonthlyGap != null ? Math.round(row.repriceMonthlyGap * 12) : null;
    if (gap == null || gap < 1000) continue;
    candidates.push({
      key: `margin:${row.clientId}`,
      kind: "margin",
      clientId: row.clientId,
      clientName: row.clientName,
      annualValue: gap,
      valueNote: "a year below your typical rate",
      why: `Costs more to serve than they pay: ${Math.round((row.vsMedian ?? 0) * 100)}% of your typical rate`,
      detail: null,
      action: { label: "See the numbers", href: `/margin#client-${row.clientId}` },
      strength: null,
      isNew: false,
      renewsInDays: null,
      findingType: null,
      otherSigns: [],
      proactive: false,
      status: "open",
      owner: null,
      score: gap * 1.2,
    });
  }

  // 4. Clients who have not opened their last three receipts.
  const listedNow = new Set(candidates.map((row) => row.clientId));
  for (const [clientId, stats] of input.receiptStats) {
    if (stats.sent < 3 || stats.opened > 0 || listedNow.has(clientId) || departed.has(clientId)) continue;
    const monthly = Number(results.clientValues?.[String(clientId)]) || null;
    const annual = monthly ? Math.round(monthly * 12) : null;
    candidates.push({
      key: `receipt_quiet:${clientId}`,
      kind: "receipt_quiet",
      clientId,
      clientName: nameFor(results, clientId),
      annualValue: annual,
      valueNote: null,
      why: `Has not opened the last ${stats.sent} Value Receipts`,
      detail: "Opens are approximate, since some inboxes block tracking. A short call says more than another email.",
      action: { label: "Call them instead", href: `/clients/${clientId}` },
      strength: null,
      isNew: false,
      renewsInDays: null,
      findingType: null,
      otherSigns: [],
      proactive: false,
      status: "open",
      owner: null,
      score: (annual ?? medianAnnual * 0.6) * 0.5,
    });
  }

  // Apply stored statuses: snoozed rows wait, done rows sit in "Done" for a week.
  const open: WeekRow[] = [];
  const done: WeekRow[] = [];
  for (const row of candidates) {
    const state = input.states.get(row.key);
    if (state?.status === "snoozed" && state.snoozedUntil && Date.parse(state.snoozedUntil) > nowMs) continue;
    if (state?.status === "done" && state.doneAt && nowMs - Date.parse(state.doneAt) < DONE_KEEP_MS) {
      done.push({ ...row, status: "done", owner: state.owner });
      continue;
    }
    open.push({ ...row, status: state?.status === "doing" ? "doing" : "open", owner: state?.owner ?? null });
  }
  open.sort((a, b) => b.score - a.score || a.clientName.localeCompare(b.clientName));

  // 5. Never an empty list: top up a quiet week with proactive rows.
  if (open.length < 3) {
    const used = new Set([...open, ...done].map((row) => row.clientId));
    const proactive: WeekRow[] = [];
    const monthly = results.clientMonthly;
    const lastMonth = monthly?.clients[0]?.months.map((m) => m.month).filter((m) => m < monthly.currentMonth).at(-1);
    if (monthly && lastMonth) {
      const valued = monthly.clients
        .filter((client) => !departed.has(client.clientId) && !used.has(client.clientId))
        .map((client) => ({ client, monthly: Number(results.clientValues?.[String(client.clientId)]) || 0 }))
        .filter(({ client }) => (client.months.find((m) => m.month === lastMonth)?.closed ?? 0) > 0)
        .sort((a, b) => b.monthly - a.monthly);
      for (const { client, monthly: value } of valued) {
        if (proactive.length >= 2) break;
        const stats = input.receiptStats.get(client.clientId);
        if (stats?.lastSentAt && nowMs - Date.parse(stats.lastSentAt) < 40 * 86_400_000) continue;
        const resolved = client.months.find((m) => m.month === lastMonth)?.closed ?? 0;
        proactive.push({
          key: `receipt_due:${client.clientId}`,
          kind: "receipt_due",
          clientId: client.clientId,
          clientName: nameFor(results, client.clientId),
          annualValue: value > 0 ? Math.round(value * 12) : null,
          valueNote: null,
          why: `${resolved} request${resolved === 1 ? "" : "s"} resolved last month, and they have not seen it`,
          detail: null,
          action: { label: "Send last month's Value Receipt", href: `/receipts?client=${client.clientId}` },
          strength: null,
          isNew: false,
          renewsInDays: null,
          findingType: null,
          otherSigns: [],
          proactive: true,
          status: "open",
          owner: null,
          score: value * 12 * 0.1,
        });
      }

      // The single most repeated request at one client over three months.
      const window = new Set(
        (monthly.clients[0]?.months ?? []).map((m) => m.month).filter((m) => m < monthly.currentMonth).slice(-3),
      );
      let best: { clientId: number; label: string; count: number; total: number } | null = null;
      for (const client of monthly.clients) {
        if (departed.has(client.clientId) || used.has(client.clientId)) continue;
        const counts = new Map<string, number>();
        let total = 0;
        for (const m of client.months) {
          if (!window.has(m.month)) continue;
          total += m.closed;
          for (const row of m.topCategories ?? []) {
            const label = shortCategory(row.category) ?? row.category;
            counts.set(label, (counts.get(label) ?? 0) + row.count);
          }
        }
        for (const [label, count] of counts) {
          if (count >= 8 && total > 0 && count / total >= 0.25 && (!best || count > best.count)) {
            best = { clientId: client.clientId, label, count, total };
          }
        }
      }
      if (best && !proactive.some((row) => row.clientId === best!.clientId)) {
        const value = Number(results.clientValues?.[String(best.clientId)]) || 0;
        proactive.push({
          key: `recurring:${best.clientId}`,
          kind: "recurring",
          clientId: best.clientId,
          clientName: nameFor(results, best.clientId),
          annualValue: value > 0 ? Math.round(value * 12) : null,
          valueNote: null,
          why: `${best.count} “${best.label}” requests in three months, ${Math.round((best.count / best.total) * 100)}% of their tickets`,
          detail: "Fixing it at the root is a project you can propose, and a line on their next receipt when the number drops.",
          action: { label: "Open the client", href: `/clients/${best.clientId}` },
          strength: null,
          isNew: false,
          renewsInDays: null,
          findingType: null,
          otherSigns: [],
          proactive: true,
          status: "open",
          owner: null,
          score: 1,
        });
      }
    }
    for (const row of proactive) {
      const state = input.states.get(row.key);
      if (state?.status === "snoozed" && state.snoozedUntil && Date.parse(state.snoozedUntil) > nowMs) continue;
      if (state?.status === "done" && state.doneAt && nowMs - Date.parse(state.doneAt) < DONE_KEEP_MS) {
        done.push({ ...row, status: "done", owner: state.owner });
        continue;
      }
      if (open.length >= WEEK_LIST_TOP) break;
      open.push({ ...row, status: state?.status === "doing" ? "doing" : "open", owner: state?.owner ?? null });
    }
  }

  return { rows: open, done, learned, hiddenAsNormal };
}
