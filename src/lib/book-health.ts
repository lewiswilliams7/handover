/**
 * Book health: one number for how exposed the client book is, from four
 * measures that each mean something on their own. A measure is left out when
 * the data cannot support it, and the score is only shown when at least three
 * can be measured. Every part is shown with its raw figure, so the score can
 * always be argued with.
 */
import type { ClientMargin } from "@/lib/client-margin";
import { THIN_MARGIN_RATIO } from "@/lib/client-margin";
import type { RenewalRadar } from "@/lib/renewal-radar";

export type BookHealthPart = {
  key: "concentration" | "at_risk" | "renewals" | "margin";
  label: string;
  /** 0 to 100, higher is healthier. */
  score: number;
  /** The figure behind it, in plain English. */
  detail: string;
};

export type BookHealth = { score: number; parts: BookHealthPart[] };

const MIN_VALUED_CLIENTS = 5;

/** Linear from 100 at `good` to 0 at `bad` (share in percent). */
function band(sharePct: number, good: number, bad: number): number {
  if (sharePct <= good) return 100;
  if (sharePct >= bad) return 0;
  return Math.round(((bad - sharePct) / (bad - good)) * 100);
}

export function buildBookHealth(input: {
  clientValues: Record<string, number> | null | undefined;
  /** Client ids to leave out (lost or internal). */
  exclude?: Set<number>;
  revenueAtRiskAnnual: number;
  radar: RenewalRadar | null;
  margin: ClientMargin | null;
}): BookHealth | null {
  const values = Object.entries(input.clientValues ?? {})
    .map(([id, value]) => ({ id: Number(id), monthly: Number(value) }))
    .filter((row) => Number.isFinite(row.monthly) && row.monthly > 0 && !input.exclude?.has(row.id))
    .sort((a, b) => b.monthly - a.monthly);
  if (values.length < MIN_VALUED_CLIENTS) return null;
  const totalMonthly = values.reduce((sum, row) => sum + row.monthly, 0);
  const parts: BookHealthPart[] = [];

  const top3 = values.slice(0, 3).reduce((sum, row) => sum + row.monthly, 0);
  const top3Pct = Math.round((top3 / totalMonthly) * 100);
  parts.push({
    key: "concentration",
    label: "Spread of revenue",
    score: band(top3Pct, 30, 70),
    detail: `Your three biggest clients are ${top3Pct}% of recurring revenue.`,
  });

  const atRiskPct = Math.round((input.revenueAtRiskAnnual / (totalMonthly * 12)) * 100);
  parts.push({
    key: "at_risk",
    label: "Revenue at Risk",
    score: band(atRiskPct, 0, 30),
    detail: `${atRiskPct}% of recurring revenue sits with clients showing warning signs.`,
  });

  if (input.radar && input.radar.next90AnnualValue > 0) {
    const renewPct = Math.round((input.radar.next90AtRiskAnnualValue / input.radar.next90AnnualValue) * 100);
    parts.push({
      key: "renewals",
      label: "Renewals at risk",
      score: band(renewPct, 0, 50),
      detail: `${renewPct}% of what renews in the next 90 days is with clients showing warning signs.`,
    });
  }

  const measured = (input.margin?.rows ?? []).filter(
    (row) => row.vsMedian != null && row.monthlyValue != null && row.monthlyValue > 0 && !input.exclude?.has(row.clientId),
  );
  if (measured.length >= MIN_VALUED_CLIENTS) {
    const measuredMonthly = measured.reduce((sum, row) => sum + row.monthlyValue!, 0);
    const thinMonthly = measured
      .filter((row) => row.vsMedian! < THIN_MARGIN_RATIO)
      .reduce((sum, row) => sum + row.monthlyValue!, 0);
    const thinPct = Math.round((thinMonthly / measuredMonthly) * 100);
    parts.push({
      key: "margin",
      label: "Thin margins",
      score: band(thinPct, 10, 50),
      detail: `${thinPct}% of measured revenue comes from clients well below your typical rate.`,
    });
  }

  if (parts.length < 3) return null;
  return { score: Math.round(parts.reduce((sum, part) => sum + part.score, 0) / parts.length), parts };
}
