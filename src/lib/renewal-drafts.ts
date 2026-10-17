/**
 * Renewal autopilot: the three steps before a contract ends, each with an
 * email drafted for the client. Nothing here mentions margins, rates or
 * Handover; the price-rise letter talks about the service and the new price
 * only, because internal numbers never belong in a client's inbox.
 */
import type { RenewalRow } from "@/lib/renewal-radar";

export type RenewalStepKey = "prove" | "propose" | "confirm";

export type RenewalStep = {
  key: RenewalStepKey;
  /** Days before the end date this step starts. */
  from: number;
  title: string;
  body: string;
};

export const RENEWAL_STEPS: RenewalStep[] = [
  { key: "prove", from: 90, title: "Show the value", body: "Send their Value Receipt and book a short review before anyone talks price." },
  { key: "propose", from: 60, title: "Propose terms", body: "Put the renewal on the table early, on your terms." },
  { key: "confirm", from: 30, title: "Confirm", body: "Get a yes in writing before the end date." },
];

export function currentRenewalStep(daysLeft: number): RenewalStepKey {
  if (daysLeft > 60) return "prove";
  if (daysLeft > 30) return "propose";
  return "confirm";
}

function longDate(iso: string): string {
  return new Date(Date.parse(iso) + 12 * 3_600_000).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function money(value: number): string {
  return `£${Math.round(value).toLocaleString("en-GB")}`;
}

export function isPriceReview(row: Pick<RenewalRow, "move">): boolean {
  return row.move === "reprice" || row.move === "fix";
}

/** Largest rise suggested at one renewal; the rest of the gap is for the next one, or a tighter scope. */
export const MAX_SUGGESTED_RISE = 0.2;

/**
 * The proposed new monthly price for a thin-margin renewal: the typical-rate
 * target, capped at a 20% rise and rounded to a tidy figure. The owner edits
 * it before sending.
 */
export function suggestedNewPrice(row: Pick<RenewalRow, "monthlyValue" | "repriceTarget">): number | null {
  if (row.monthlyValue == null || row.repriceTarget == null || row.repriceTarget <= row.monthlyValue) return null;
  const target = Math.min(row.repriceTarget, row.monthlyValue * (1 + MAX_SUGGESTED_RISE));
  return Math.max(Math.round(row.monthlyValue) + 25, Math.round(target / 25) * 25);
}

export function renewalDraft(
  step: RenewalStepKey,
  row: Pick<RenewalRow, "clientName" | "endDate" | "move" | "monthlyValue" | "repriceTarget">,
  opts: { signOff: string; newMonthlyPrice?: number | null },
): { subject: string; body: string } {
  const ends = longDate(row.endDate);
  const signOff = opts.signOff.trim() || "Kind regards,";
  if (step === "prove") {
    return {
      subject: `Your IT support this year, ${row.clientName}`,
      body: `Hi,\n\nYour agreement with us comes up for renewal on ${ends}, and before then I would like to look back at the year with you.\n\nI have attached a short summary of the support we have provided: what we handled, how quickly, and what is still in progress. Could we find 30 minutes in the next couple of weeks to go through it, and hear what you would like more or less of next year?\n\n${signOff}`,
    };
  }
  if (step === "propose") {
    const price = opts.newMonthlyPrice ?? null;
    if (isPriceReview(row) && price != null && row.monthlyValue != null && price > row.monthlyValue) {
      return {
        subject: `Your renewal on ${ends}`,
        body: `Hi,\n\nThank you for another year working together. Your agreement renews on ${ends}, and I wanted to give you plenty of notice of the terms.\n\nThe support your team relies on has grown since the agreement was set, and to keep giving you the same standard of service we need to bring the price in line with it. From ${ends}, the monthly fee would be ${money(price)}, up from ${money(row.monthlyValue)}.\n\nIf you would rather keep the cost where it is, we can look at the scope together instead, so the agreement covers what matters most to you. Either way, I would value a quick call to talk it through. What does your diary look like next week?\n\n${signOff}`,
      };
    }
    return {
      subject: `Your renewal on ${ends}`,
      body: `Hi,\n\nYour agreement with us renews on ${ends}. I wanted to get ahead of it, so there are no surprises and nothing is rushed.\n\nOur plan is to renew on the same terms. If anything has changed on your side, such as new people, new sites or new systems, now is a good time to tell us so we can make sure the agreement still fits.\n\nAre you happy for us to go ahead, or would a short call be useful first?\n\n${signOff}`,
    };
  }
  return {
    subject: `Confirming your renewal on ${ends}`,
    body: `Hi,\n\nA quick note to confirm your agreement with us renews on ${ends}. Could you reply to confirm you are happy to go ahead? If you need anything in writing for your records, I can send it straight over.\n\nThank you for your continued trust in us.\n\n${signOff}`,
  };
}
