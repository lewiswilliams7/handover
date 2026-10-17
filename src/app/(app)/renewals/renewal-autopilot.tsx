"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";

import { EmailDraftBox } from "@/components/email-draft-box";
import { useEmailSignOff } from "@/components/use-email-sign-off";
import type { ClientContact } from "@/lib/psa/scan-session";
import {
  currentRenewalStep,
  isPriceReview,
  RENEWAL_STEPS,
  renewalDraft,
  suggestedNewPrice,
  type RenewalStepKey,
} from "@/lib/renewal-drafts";
import type { RenewalRow } from "@/lib/renewal-radar";

/**
 * The three steps before a renewal, with the current one open and its email
 * drafted. On a thin-margin renewal the middle step is the price-rise letter,
 * with the proposed price editable and no internal numbers in the text.
 */
export function RenewalAutopilot({
  row,
  contacts,
  defaultOpen,
}: {
  row: RenewalRow;
  contacts: ClientContact[] | null;
  defaultOpen: boolean;
}) {
  const signOff = useEmailSignOff();
  const current = currentRenewalStep(row.daysLeft);
  const [open, setOpen] = useState(defaultOpen);
  const [step, setStep] = useState<RenewalStepKey>(current);
  const priceReview = isPriceReview(row);
  const suggested = suggestedNewPrice(row);
  const [price, setPrice] = useState<string>(suggested != null ? String(suggested) : "");
  const [sentSteps, setSentSteps] = useState<RenewalStepKey[]>([]);
  const priceNumber = Number(price.replace(/[£,\s]/g, ""));
  const validPrice = Number.isFinite(priceNumber) && priceNumber > 0 ? Math.round(priceNumber) : null;
  const draft = renewalDraft(step, row, { signOff, newMonthlyPrice: validPrice });
  const currentIndex = RENEWAL_STEPS.findIndex((item) => item.key === current);

  return (
    <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left hover:bg-white/[0.02]"
      >
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-cyan-200">Renewal plan</span>
          <span className="mt-0.5 block text-sm text-white">
            Now: {RENEWAL_STEPS[currentIndex]!.title.toLowerCase()}
            {current === "propose" && priceReview ? ", with a price review" : ""}
          </span>
        </span>
        <ChevronDown className={`size-4 shrink-0 text-cyan-200 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open ? (
        <div className="border-t border-white/[0.06] px-4 pb-4 pt-3">
          <ol className="grid gap-2 sm:grid-cols-3" aria-label="Renewal steps">
            {RENEWAL_STEPS.map((item, index) => {
              const past = index < currentIndex;
              const active = item.key === step;
              const sent = sentSteps.includes(item.key);
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => setStep(item.key)}
                    aria-pressed={active}
                    className={`h-full w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                      active ? "border-cyan-300/50 bg-cyan-300/[0.07]" : "border-white/10 hover:border-white/25"
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                      {sent ? <Check className="size-3 text-emerald-300" aria-hidden /> : null}
                      {item.from} days out{index === currentIndex ? " · now" : past ? " · passed" : ""}
                    </span>
                    <span className="mt-0.5 block text-sm font-semibold text-white">
                      {item.key === "propose" && priceReview ? "Price review" : item.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-[var(--text-secondary)]">
                      {item.key === "propose" && priceReview
                        ? "Give notice of the new price, with a smaller scope as the alternative."
                        : item.body}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          {step === "propose" && priceReview ? (
            <label className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
              New monthly fee
              <span className="inline-flex items-center rounded-md border border-white/10 bg-black/20 px-2 focus-within:border-cyan-300/50">
                <span className="text-[var(--text-muted)]">£</span>
                <input
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  inputMode="numeric"
                  className="w-24 bg-transparent px-1 py-1.5 text-sm text-white outline-none"
                  aria-label="New monthly fee"
                />
              </span>
              {row.monthlyValue != null ? (
                <span className="text-xs leading-5 text-[var(--text-muted)]">
                  Today £{Math.round(row.monthlyValue).toLocaleString("en-GB")}
                  {row.repriceTarget != null
                    ? `; your typical rate would be £${Math.round(row.repriceTarget).toLocaleString("en-GB")}. The suggestion caps the rise at 20%, so the rest can follow next time or through a tighter scope`
                    : ""}
                  . Only the old and new fee appear in the letter.
                </span>
              ) : null}
            </label>
          ) : null}

          <div className="mt-4">
            <EmailDraftBox
              key={`${step}-${validPrice ?? "x"}-${signOff.length}`}
              clientName={row.clientName}
              subject={draft.subject}
              body={draft.body}
              contacts={contacts}
              onSent={() => setSentSteps((list) => [...new Set([...list, step])])}
            />
          </div>
          {step === "prove" ? (
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Attach their Value Receipt: open it from Receipts and download the PDF, or send it from there first.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
