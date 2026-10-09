"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  STRIPE_PRICE_IDS,
} from "@/lib/stripe-price-ids";
import { cn } from "@/lib/utils";

export type UpgradePlanCardsProps = {
  onUpgrade: (priceId: string) => void;
  loadingPriceId: string | null;
  className?: string;
  /** Stripe subscription uses monthly Starter or Growth price - offer portal to switch to annual */
  monthlyPayingSubscription?: "professional" | "team" | null;
  onSwitchToAnnualPortal?: () => void;
  portalLoading?: boolean;
};

export function UpgradePlanCards({
  onUpgrade,
  loadingPriceId,
  className,
  monthlyPayingSubscription = null,
  onSwitchToAnnualPortal,
  portalLoading = false,
}: UpgradePlanCardsProps) {
  const monthlyPriceId = STRIPE_PRICE_IDS.handover.monthly;
  const annualPriceId = STRIPE_PRICE_IDS.handover.annual;
  const monthlyOk = Boolean(monthlyPriceId);
  const annualOk = Boolean(annualPriceId);
  const busy = loadingPriceId !== null;
  const showPortalSwitch =
    Boolean(monthlyPayingSubscription) &&
    typeof onSwitchToAnnualPortal === "function";

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      <div className="flex flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
        <p className="text-sm font-semibold text-[var(--text-primary)]">Monthly</p>
        <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
          £499<span className="text-base font-normal text-[var(--text-secondary)]">/mo</span>
        </p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">Billed monthly</p>
        <Button
          type="button"
          className="mt-4 w-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
          disabled={!monthlyOk || busy}
          onClick={() => onUpgrade(monthlyPriceId)}
        >
          {loadingPriceId === monthlyPriceId ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            "Upgrade"
          )}
        </Button>
      </div>

      <div className="relative flex flex-col rounded-[var(--radius-lg)] border-2 border-[var(--accent)] bg-[var(--bg-primary)] p-4 pt-7 shadow-sm">
        <span className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-xs font-semibold text-white">
          Best value
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Annual</p>
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-200">
            Save 2 months
          </span>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
          £4,990<span className="text-base font-normal text-[var(--text-secondary)]">/year</span>
        </p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Two months free</p>
        <Button
          type="button"
          className="mt-4 w-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
          disabled={!annualOk || busy}
          onClick={() => onUpgrade(annualPriceId)}
        >
          {loadingPriceId === annualPriceId ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            "Upgrade"
          )}
        </Button>
      </div>

      {showPortalSwitch ? (
        <div className="rounded-[var(--radius-lg)] border border-emerald-500/35 bg-emerald-500/[0.08] p-4 sm:col-span-2">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Switch to annual and save 2 months
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
            You&apos;re on monthly billing. Open the Stripe customer portal to change your subscription to
            annual pricing.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 w-full border-emerald-600/40 font-semibold text-emerald-800 hover:bg-emerald-500/10 dark:text-emerald-200"
            disabled={portalLoading}
            onClick={() => onSwitchToAnnualPortal?.()}
          >
            {portalLoading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              "Open billing portal →"
            )}
          </Button>
        </div>
      ) : null}

      {(!monthlyOk || !annualOk) && (
        <p className="text-xs text-[var(--text-muted)] sm:col-span-2">
          Set the Handover Stripe price IDs in the server and browser environments.
        </p>
      )}
    </div>
  );
}
