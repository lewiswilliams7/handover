"use client";

import { startTransition, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Brain,
  Calendar,
  FileSpreadsheet,
  LayoutDashboard,
  Link2,
  Loader2,
  Lock,
  Rocket,
  X,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { STRIPE_PRICE_IDS } from "@/lib/stripe-price-ids";
import { cn } from "@/lib/utils";

const enterAnim = "transition-all duration-200 ease-out";

type HardLimitModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkoutLoadingPriceId: string | null;
  onCheckout: (priceId: string) => void;
  onContinueFree: () => void;
  limitType?: "trial" | "pro_monthly" | "team_monthly";
  monthlyPayingPlan?: "professional" | "team" | null;
  onSwitchToAnnualPortal?: () => void;
  portalLoading?: boolean;
};

export function PremiumHardLimitModal({
  open,
  onOpenChange,
  checkoutLoadingPriceId,
  onCheckout,
  onContinueFree,
  limitType = "trial",
  monthlyPayingPlan = null,
  onSwitchToAnnualPortal,
  portalLoading = false,
}: HardLimitModalProps) {
  const [entered, setEntered] = useState(false);
  const [welcomeRewardEligible, setWelcomeRewardEligible] = useState(false);

  useEffect(() => {
    if (open) {
      const t = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(t);
    }
    startTransition(() => setEntered(false));
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/referrals/welcome-eligible", { credentials: "include" });
        const body = (await res.json()) as { eligible?: boolean };
        if (!cancelled) setWelcomeRewardEligible(body.eligible === true);
      } catch {
        if (!cancelled) setWelcomeRewardEligible(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const busy = checkoutLoadingPriceId !== null;
  const monthlyOk = Boolean(STRIPE_PRICE_IDS.handover.monthly);
  const annualOk = Boolean(STRIPE_PRICE_IDS.handover.annual);
  const showPortalSwitch =
    Boolean(monthlyPayingPlan) && typeof onSwitchToAnnualPortal === "function";

  return (
    <div
      className="fixed inset-0 z-[190] flex items-center justify-center p-4"
      style={{
        background: "rgba(2, 6, 23, 0.72)",
        backdropFilter: "blur(14px)",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="premium-hard-title"
    >
      <div
        className={cn(
          "relative w-full max-w-[640px] overflow-hidden rounded-[var(--radius-lg)] p-6 sm:p-9",
          enterAnim,
          entered ? "scale-100 opacity-100" : "scale-95 opacity-0",
        )}
        style={{
          background:
            "linear-gradient(165deg, #0f172a 0%, #0b1224 42%, #111827 100%)",
          border: "1px solid color-mix(in srgb, var(--accent) 42%, rgba(148,163,184,0.25))",
          boxShadow:
            "0 0 0 1px color-mix(in srgb, var(--accent) 18%, transparent), 0 32px 96px -32px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        <div
          className="pointer-events-none absolute -right-24 -top-24 size-[280px] rounded-full opacity-40"
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--accent) 35%, transparent) 0%, transparent 65%)",
          }}
          aria-hidden
        />
        <button
          type="button"
          className="relative z-[1] absolute right-3 top-3 rounded-[var(--radius)] p-2 text-slate-400 hover:bg-white/5 hover:text-white"
          aria-label="Close"
          onClick={() => onOpenChange(false)}
        >
          <X className="size-5" />
        </button>

        <div className="relative z-[1] flex flex-col items-center text-center">
          <div
            className="flex size-14 items-center justify-center rounded-2xl text-[var(--accent)]"
            style={{
              background: "color-mix(in srgb, var(--accent) 18%, transparent)",
              animation: "premium-pulse 2.4s ease-in-out infinite",
            }}
          >
            <Rocket className="size-7" aria-hidden />
          </div>
          <h2
            id="premium-hard-title"
            className="mt-4 max-w-lg text-2xl font-bold tracking-tight text-white sm:text-3xl"
            style={{
              background:
                "linear-gradient(135deg, #f8fafc 0%, var(--accent) 45%, #bae6fd 100%)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            You&apos;ve reached your current plan limit
          </h2>
          {limitType === "trial" ? (
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-slate-400">
              You&apos;ve reached the included generation limit. Move to Handover for unlimited production use.
            </p>
          ) : limitType === "pro_monthly" ? (
            <>
              <p className="mt-2 max-w-md text-[15px] leading-relaxed text-slate-400">
                You&apos;ve reached the included generation limit for this month. Handover includes unlimited
                production generations.
              </p>
              <a
                href="mailto:hello@gethandover.uk?subject=Generation%20top-up"
                className="mt-3 inline-flex items-center rounded-[var(--radius)] border border-white/20 px-3 py-1.5 text-[12px] font-semibold text-slate-200 transition-colors hover:bg-white/10"
              >
                Purchase top-up
              </a>
            </>
          ) : (
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-slate-400">
              You&apos;ve reached the included generation limit for this month. Handover includes unlimited
              production generations.
            </p>
          )}
        </div>

        <div className="relative z-[1] mt-8 grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: Zap,
              title: "200 generations / month",
              body: "Enough volume for busy delivery teams - scale up without hitting a hard wall.",
            },
            {
              icon: Link2,
              title: "HaloPSA push-back",
              body: "Post summaries, actions, and risks straight to the tickets you already track.",
            },
            {
              icon: Rocket,
              title: "Scheduled reports",
              body: "Automated weekly emails from live Halo data - set once, run every week.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-[var(--radius)] border border-white/10 bg-white/[0.04] p-4 text-left backdrop-blur-sm"
            >
              <Icon className="size-5 text-[var(--accent)]" aria-hidden />
              <p className="mt-2 text-[14px] font-semibold text-slate-100">{title}</p>
              <p className="mt-1 text-[12px] leading-snug text-slate-400">{body}</p>
            </div>
          ))}
        </div>

        <div className="relative z-[1] mt-8 space-y-3">
          <p className="text-center text-[13px] font-semibold uppercase tracking-wide text-slate-500">
            Choose billing
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[var(--radius)] border border-white/10 bg-white/[0.04] p-4 text-left">
              <p className="text-[13px] font-semibold text-slate-200">Monthly</p>
              <p className="mt-2 text-xl font-bold text-white">£499/mo</p>
              <p className="mt-1 text-[11px] text-slate-500">Billed monthly</p>
              <Button
                type="button"
                className="mt-4 h-10 w-full bg-white/10 text-[13px] font-semibold text-white hover:bg-white/15"
                disabled={!monthlyOk || busy}
                onClick={() => onCheckout(STRIPE_PRICE_IDS.handover.monthly)}
              >
                {checkoutLoadingPriceId === STRIPE_PRICE_IDS.handover.monthly ? (
                  <Loader2 className="mx-auto size-4 animate-spin" aria-hidden />
                ) : welcomeRewardEligible ? (
                  "Claim free month →"
                ) : (
                  "Buy Handover"
                )}
              </Button>
            </div>
            <div className="relative rounded-[var(--radius)] border-2 border-[var(--accent)]/70 bg-white/[0.06] p-4 pt-5 text-left">
              <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold text-slate-950">
                Best value
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[13px] font-semibold text-slate-200">Annual</p>
                <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300 ring-1 ring-emerald-500/35">
                  Two months free
                </span>
              </div>
              <p className="mt-2 text-xl font-bold text-white">£4,990/year</p>
              <p className="mt-1 text-[12px] text-slate-400">Two months free</p>
              <Button
                type="button"
                className="mt-4 h-10 w-full bg-[var(--accent)] text-[13px] font-bold text-slate-950 hover:bg-[var(--accent-hover)]"
                disabled={!annualOk || busy}
                onClick={() =>
                  STRIPE_PRICE_IDS.handover.annual &&
                  onCheckout(STRIPE_PRICE_IDS.handover.annual)
                }
              >
                {checkoutLoadingPriceId === STRIPE_PRICE_IDS.handover.annual ? (
                  <Loader2 className="mx-auto size-4 animate-spin" aria-hidden />
                ) : (
                  "Buy Handover annually"
                )}
              </Button>
            </div>
          </div>
          {showPortalSwitch ? (
            <div className="rounded-[var(--radius)] border border-emerald-500/30 bg-emerald-500/[0.07] p-4">
              <p className="text-[13px] font-semibold text-emerald-100">Switch to annual and save two months</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                You&apos;re on monthly billing. Use the Stripe customer portal to change your subscription to annual.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3 w-full border-emerald-400/40 text-emerald-100 hover:bg-emerald-500/10"
                disabled={portalLoading}
                onClick={() => onSwitchToAnnualPortal?.()}
              >
                {portalLoading ? (
                  <Loader2 className="mx-auto size-4 animate-spin" aria-hidden />
                ) : (
                  "Open billing portal →"
                )}
              </Button>
            </div>
          ) : null}
        </div>

        <p className="relative z-[1] mt-4 text-center text-[11px] text-slate-500">
          Cancel anytime from your billing portal.
        </p>
        <button
          type="button"
          className="relative z-[1] mt-3 w-full text-center text-[12px] text-slate-500 underline-offset-4 hover:text-slate-300 hover:underline"
          onClick={() => {
            onContinueFree();
            onOpenChange(false);
          }}
        >
          Not now
        </button>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes premium-pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.04); opacity: 0.92; }
          }
        `,
        }}
      />
    </div>
  );
}

const PRO_GATE_COPY: Record<
  string,
  { title: string; lead: string; bullets: string[]; icon: LucideIcon }
> = {
  "Push to HaloPSA": {
    title: "Push to HaloPSA",
    lead:
      "Post your generated summary, actions, and risks directly to HaloPSA ticket notes - so delivery history stays where your team already works.",
    bullets: [
      "One click from Handover into the tickets you imported",
      "Keeps audit trail and client context aligned in Halo",
      "Included with Handover",
    ],
    icon: Link2,
  },
  "Scheduled reports": {
    title: "Scheduled reports",
    lead:
      "Automate weekly client or internal reports: Handover pulls live HaloPSA data on your schedule and emails polished outputs without manual runs.",
    bullets: [
      "Pick day, time, clients, and which tabs to include",
      "Runs in the background - ideal for recurring QBR-style updates",
      "Included with Handover",
    ],
    icon: Calendar,
  },
  "Full report pack (Excel export)": {
    title: "Excel report pack",
    lead:
      "Download a single formatted workbook with action log, risk log, client email, status report, and more - ready to share or archive.",
    bullets: [
      "One file instead of juggling separate exports",
      "Branded layout for client-ready delivery",
      "Included with Handover",
    ],
    icon: FileSpreadsheet,
  },
  "Delivery health dashboard": {
    title: "Delivery health dashboard",
    lead:
      "See workload, risk, and momentum across clients in one place - built for SDMs who need the big picture without another spreadsheet project.",
    bullets: [
      "Roll-up views across tickets and projects you care about",
      "Spot stuck work before it becomes an escalation",
      "Included with Handover",
    ],
    icon: LayoutDashboard,
  },
  "Client Intelligence": {
    title: "Client Intelligence",
    lead:
      "Handover Client Intelligence remembers every report, risk, and delivery milestone - so account context survives staff changes and QBR prep takes minutes, not hours.",
    bullets: [
      "Account summaries and relationship health across your portfolio",
      "Recurring risks and talking points for QBRs and service reviews",
      "Included with Handover",
    ],
    icon: Brain,
  },
};

const GATE_CHECKOUT_PRICING = {
  starter: {
    monthlyPriceId: STRIPE_PRICE_IDS.handover.monthly,
    annualPriceId: STRIPE_PRICE_IDS.handover.annual,
    monthlyLabel: "£499/mo",
    annualEquivLabel: "£415.83/mo",
    annualBilledLabel: "Billed £4,990/year",
    annualSaveLabel: "Two months free",
    footer: "£499/mo or £4,990/year · Cancel anytime",
  },
  growth: {
    monthlyPriceId: STRIPE_PRICE_IDS.handover.monthly,
    annualPriceId: STRIPE_PRICE_IDS.handover.annual,
    monthlyLabel: "£499/mo",
    annualEquivLabel: "£415.83/mo",
    annualBilledLabel: "Billed £4,990/year",
    annualSaveLabel: "Two months free",
    footer: "£499/mo or £4,990/year · Cancel anytime",
  },
} as const;

type ProGateModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: string;
  checkoutLoadingPriceId: string | null;
  onCheckout: (priceId: string) => void;
  /** Checkout SKU shown in the modal — Growth features must pass `growth`. */
  upgradePlan?: "starter" | "growth";
  monthlyPayingPlan?: "professional" | "team" | null;
  onSwitchToAnnualPortal?: () => void;
  portalLoading?: boolean;
};

export function ProFeatureGateModal({
  open,
  onOpenChange,
  featureName,
  checkoutLoadingPriceId,
  onCheckout,
  upgradePlan = "starter",
  monthlyPayingPlan = null,
  onSwitchToAnnualPortal,
  portalLoading = false,
}: ProGateModalProps) {
  const [entered, setEntered] = useState(false);
  const pricing = GATE_CHECKOUT_PRICING[upgradePlan];
  const copy = PRO_GATE_COPY[featureName] ?? {
    title: featureName,
    lead: "This capability is included with Handover for MSP delivery teams who live in HaloPSA and ConnectWise.",
    bullets: [
      "Higher generation limits for production use",
      "Scheduled automation and Halo push-back",
      "Excel report pack and delivery insights",
    ],
    icon: Lock,
  };
  const Icon = copy.icon;

  useEffect(() => {
    if (open) {
      const t = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(t);
    }
    startTransition(() => setEntered(false));
    return undefined;
  }, [open]);

  if (!open) return null;

  const busy = checkoutLoadingPriceId !== null;
  const monthlyOk = Boolean(pricing.monthlyPriceId);
  const annualOk = Boolean(pricing.annualPriceId);
  const showPortalSwitch =
    Boolean(monthlyPayingPlan) &&
    typeof onSwitchToAnnualPortal === "function" &&
    ((upgradePlan === "growth" && monthlyPayingPlan === "team") ||
      (upgradePlan === "starter" && monthlyPayingPlan === "professional"));

  return (
    <div
      className="fixed inset-0 z-[195] flex items-center justify-center p-4"
      style={{
        background: "rgba(2, 6, 23, 0.7)",
        backdropFilter: "blur(12px)",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pro-gate-title"
    >
      <div
        className={cn(
          "relative w-full max-w-[460px] overflow-hidden rounded-[var(--radius-lg)] p-6 sm:p-7",
          enterAnim,
          entered ? "scale-100 opacity-100" : "scale-95 opacity-0",
        )}
        style={{
          background: "linear-gradient(165deg, #0f172a 0%, #0b1224 100%)",
          border: "1px solid color-mix(in srgb, var(--accent) 38%, rgba(148,163,184,0.2))",
          boxShadow: "0 28px 80px -28px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 size-[200px] rounded-full opacity-35"
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--accent) 40%, transparent) 0%, transparent 70%)",
          }}
          aria-hidden
        />
        <button
          type="button"
          className="absolute right-2.5 top-2.5 z-[1] rounded-[var(--radius)] p-2 text-slate-400 hover:bg-white/5 hover:text-white"
          aria-label="Close"
          onClick={() => onOpenChange(false)}
        >
          <X className="size-5" />
        </button>
        <div className="relative z-[1]">
          <div
            className="mx-auto flex size-12 items-center justify-center rounded-xl text-[var(--accent)]"
            style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)" }}
          >
            <Icon className="size-6" aria-hidden />
          </div>
          <h2 id="pro-gate-title" className="mt-4 text-center text-xl font-bold text-white">
            {copy.title}
          </h2>
          <p className="mt-3 text-center text-[14px] leading-relaxed text-slate-400">{copy.lead}</p>
          <ul className="mt-5 space-y-2.5 text-left text-[13px] leading-snug text-slate-300">
            {copy.bullets.map((b) => (
              <li key={b} className="flex gap-2">
                <span className="mt-0.5 shrink-0 font-semibold text-[var(--accent)]">✓</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative z-[1] mt-8 space-y-3">
          <p className="text-center text-[12px] font-semibold uppercase tracking-wide text-slate-500">
            Choose billing
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[var(--radius)] border border-white/10 bg-white/[0.04] p-3 text-left">
              <p className="text-[12px] font-semibold text-slate-200">Monthly</p>
              <p className="mt-1.5 text-lg font-bold text-white">{pricing.monthlyLabel}</p>
              <Button
                type="button"
                size="sm"
                className="mt-3 w-full bg-white/10 text-[12px] font-semibold text-white hover:bg-white/15"
                disabled={!monthlyOk || busy}
                onClick={() => onCheckout(pricing.monthlyPriceId)}
              >
                {checkoutLoadingPriceId === pricing.monthlyPriceId ? (
                  <Loader2 className="mx-auto size-4 animate-spin" aria-hidden />
                ) : (
                  "Upgrade - monthly"
                )}
              </Button>
            </div>
            <div className="relative rounded-[var(--radius)] border-2 border-[var(--accent)]/70 bg-white/[0.06] p-3 pt-4 text-left">
              <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold text-slate-950">
                Best value
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-[12px] font-semibold text-slate-200">Annual</p>
                <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                  {pricing.annualSaveLabel}
                </span>
              </div>
              <p className="mt-1.5 text-lg font-bold text-white">{pricing.annualEquivLabel}</p>
              <p className="text-[11px] text-slate-400">{pricing.annualBilledLabel}</p>
              <Button
                type="button"
                size="sm"
                className="mt-2 w-full bg-[var(--accent)] text-[12px] font-bold text-slate-950 hover:bg-[var(--accent-hover)]"
                disabled={!annualOk || busy}
                onClick={() => pricing.annualPriceId && onCheckout(pricing.annualPriceId)}
              >
                {checkoutLoadingPriceId === pricing.annualPriceId ? (
                  <Loader2 className="mx-auto size-4 animate-spin" aria-hidden />
                ) : (
                  "Upgrade - annual"
                )}
              </Button>
            </div>
          </div>
          {showPortalSwitch ? (
            <div className="rounded-[var(--radius)] border border-emerald-500/30 bg-emerald-500/[0.07] p-3">
              <p className="text-[12px] font-semibold text-emerald-100">Switch to annual and save 29%</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 w-full border-emerald-400/40 text-emerald-100 hover:bg-emerald-500/10"
                disabled={portalLoading}
                onClick={() => onSwitchToAnnualPortal?.()}
              >
                {portalLoading ? (
                  <Loader2 className="mx-auto size-4 animate-spin" aria-hidden />
                ) : (
                  "Open billing portal →"
                )}
              </Button>
            </div>
          ) : null}
        </div>
        <p className="relative z-[1] mt-3 text-center text-[11px] text-slate-500">
          {pricing.footer}
        </p>
      </div>
    </div>
  );
}
