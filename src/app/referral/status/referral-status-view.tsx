"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, CheckCircle2, Clock, PartyPopper } from "lucide-react";

import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { cn } from "@/lib/utils";

type ReferralMyStatusJson = {
  referred: boolean;
  referrerFirstName: string | null;
  referrer_name: string | null;
  referralStatus: "pending" | "signed_up" | "converted" | "rewarded" | null;
  isPro: boolean;
  renewalDateIso: string | null;
  month2PaidAtIso: string | null;
};

type SubscriptionStatusJson = {
  renewalDate: string | null;
  status: string | null;
  error?: string;
};

type StepState = "done" | "current" | "todo";

function formatUkDate(iso: string | null | undefined): string {
  if (!iso) return " - ";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return " - ";
  }
}

function StepIndicator({ state }: { state: StepState }) {
  if (state === "done") {
    return (
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
        <Check className="size-3.5" strokeWidth={3} aria-hidden />
      </span>
    );
  }
  if (state === "current") {
    return (
      <span
        className="relative flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] animate-pulse shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_20%,transparent)]"
        aria-current="step"
      >
        <span className="size-2 rounded-full bg-white" aria-hidden />
      </span>
    );
  }
  return (
    <span
      className="box-border size-6 shrink-0 rounded-full border border-[var(--border)] bg-[var(--bg-primary)]"
      aria-hidden
    />
  );
}

function StepsTimeline({
  steps,
}: {
  steps: { state: StepState; label: React.ReactNode }[];
}) {
  return (
    <ol className="mx-auto mt-12 max-w-[440px] border-t border-[var(--border)]/70 pt-10">
      {steps.map((step, idx) => {
        const next = steps[idx + 1];
        const connectorDashed = next ? next.state !== "done" : false;
        return (
          <li key={idx} className="flex gap-3">
            <div className="flex w-6 shrink-0 flex-col items-center">
              <StepIndicator state={step.state} />
              {idx < steps.length - 1 ? (
                <span
                  aria-hidden
                  className={cn(
                    "mt-2 min-h-9 w-px shrink-0 border-l border-[var(--border)]",
                    connectorDashed ? "border-dashed" : "border-solid",
                  )}
                />
              ) : null}
            </div>
            <div
              className={cn(
                "min-w-0 flex-1 text-[14px] leading-snug",
                idx < steps.length - 1 ? "pb-8" : "pb-0",
                step.state === "done" && "text-[var(--text-primary)]",
                step.state === "current" && "font-medium text-[var(--accent)]",
                step.state === "todo" && "text-[var(--text-muted)]",
              )}
            >
              {step.label}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ReferralStatusView() {
  const [data, setData] = useState<ReferralMyStatusJson | null>(null);
  const [subscriptionRenewal, setSubscriptionRenewal] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [resMy, resSub] = await Promise.all([
          fetch("/api/referrals/my-status", { credentials: "same-origin" }),
          fetch("/api/referrals/subscription-status", { credentials: "same-origin" }),
        ]);
        if (cancelled) return;
        if (!resMy.ok) {
          setError(true);
          return;
        }
        const json = (await resMy.json()) as ReferralMyStatusJson;
        if (cancelled) return;
        setData(json);

        if (resSub.ok) {
          const subJson = (await resSub.json()) as SubscriptionStatusJson;
          if (!cancelled && subJson.renewalDate) {
            setSubscriptionRenewal(subJson.renewalDate);
          }
        }
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error || (data && !data.referred)) {
    return (
      <MarketingPageLayout>
        <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-20 text-center">
          <p className="text-[15px] text-[var(--text-secondary)]">Nothing to show here.</p>
          <Link href="/" className="mt-4 text-[14px] font-medium text-[var(--accent)] hover:underline">
            Back to Handover
          </Link>
        </div>
      </MarketingPageLayout>
    );
  }

  if (!data) {
    return (
      <MarketingPageLayout>
        <div className="flex min-h-[40vh] items-center justify-center text-[var(--text-muted)]">
          Loading…
        </div>
      </MarketingPageLayout>
    );
  }

  const n = (data.referrer_name ?? data.referrerFirstName)?.trim();
  const refName = n && n.length > 0 ? n : "Your referrer";

  const converted =
    data.referralStatus === "converted" || data.referralStatus === "rewarded";
  const pendingSub = !data.isPro;
  const activeTrial = data.isPro && !converted;

  const renewalLabel =
    subscriptionRenewal ?? formatUkDate(data.renewalDateIso) ?? " - ";
  const month2Label = formatUkDate(data.month2PaidAtIso ?? data.renewalDateIso);

  const pendingSteps = [
    { state: "done" as const, label: "Signed up via referral link" },
    { state: "current" as const, label: "Subscribe to Pro (activates free month)" },
    {
      state: "todo" as const,
      label: <>Month 2 payment (unlocks reward for {refName})</>,
    },
  ];

  const activeSteps = [
    { state: "done" as const, label: "Signed up via referral link" },
    { state: "done" as const, label: "Subscribed to Pro - free month active" },
    {
      state: "current" as const,
      label: <>Month 2 payment - completes on {renewalLabel}</>,
    },
  ];

  const completeSteps = [
    { state: "done" as const, label: "Signed up via referral link" },
    { state: "done" as const, label: "Subscribed to Pro - free month active" },
    {
      state: "done" as const,
      label: <>Month 2 payment - completed on {month2Label}</>,
    },
  ];

  return (
    <MarketingPageLayout>
      <section className="relative z-[1] overflow-hidden bg-[var(--bg-primary)] px-6 py-14 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto w-full max-w-[560px]">
          {pendingSub ? (
            <>
              <div className="flex justify-center">
                <Clock className="size-12 text-[var(--accent)]" strokeWidth={1.5} aria-hidden />
              </div>
              <h1 className="mt-6 text-center text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
                Your free month is ready
              </h1>
              <p className="mt-4 text-center text-[15px] leading-relaxed text-[var(--text-secondary)]">
                Complete your Pro subscription to activate your free first month. You won&apos;t be
                charged until month 2.
              </p>
              <div className="mt-8 flex justify-center">
                <Link
                  href="/pricing"
                  className="inline-flex h-11 items-center justify-center rounded-[var(--radius)] bg-[var(--accent)] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
                >
                  Activate Pro now →
                </Link>
              </div>
              <StepsTimeline steps={pendingSteps} />
            </>
          ) : null}

          {activeTrial ? (
            <>
              <div className="flex justify-center">
                <PartyPopper className="size-12 text-[var(--accent)]" strokeWidth={1.5} aria-hidden />
              </div>
              <h1 className="mt-6 text-center text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
                Your free month is active
              </h1>
              <p className="mt-4 text-center text-[15px] leading-relaxed text-[var(--text-secondary)]">
                Your first month is completely free. You&apos;ll be charged £29 on {renewalLabel}.
                Cancel anytime before then to pay nothing.
              </p>
              <StepsTimeline steps={activeSteps} />
              <p className="mx-auto mt-8 max-w-[440px] text-center text-[13px] leading-relaxed text-[var(--text-muted)]">
                When your month 2 payment completes, {refName} will earn £87 as a thank you.
              </p>
            </>
          ) : null}

          {converted ? (
            <>
              <div className="flex justify-center">
                <CheckCircle2 className="size-12 text-emerald-500" strokeWidth={1.5} aria-hidden />
              </div>
              <h1 className="mt-6 text-center text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
                You&apos;re all set
              </h1>
              <p className="mt-4 text-center text-[15px] leading-relaxed text-[var(--text-secondary)]">
                Your free month has been used and your Pro subscription is active. {refName} has
                earned their reward - thanks for helping them out.
              </p>
              <StepsTimeline steps={completeSteps} />
            </>
          ) : null}
        </div>
      </section>
    </MarketingPageLayout>
  );
}
