"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STRIPE_TEAM_MONTHLY_PRICE_ID } from "@/lib/stripe-price-ids";

type TrialStatusOk = {
  onTrial: boolean;
  daysRemaining?: number;
  trialEndsAt?: string;
  seatCount?: number;
};

function formatTrialDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

type Urgency = "calm" | "amber" | "red" | "expired";

function urgencyFromDays(daysRemaining: number): Urgency {
  if (daysRemaining <= 0) return "expired";
  if (daysRemaining <= 3) return "red";
  if (daysRemaining <= 7) return "amber";
  return "calm";
}

const URGENCY_RGB: Record<Urgency, string> = {
  calm: "56, 189, 248",
  amber: "245, 158, 11",
  red: "244, 63, 94",
  expired: "244, 63, 94",
};

export function TrialBanner({ className, plan }: { className?: string; plan?: string }) {
  const [data, setData] = useState<TrialStatusOk | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/team/trial-status", { credentials: "same-origin" });
      const j = (await res.json()) as TrialStatusOk & { error?: string };
      if (!res.ok) {
        setData({ onTrial: false });
        return;
      }
      setData(j);
    } catch {
      setData({ onTrial: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startTeamCheckout = async (seats: number) => {
    const priceId = STRIPE_TEAM_MONTHLY_PRICE_ID;
    if (!priceId || checkoutLoading) return;
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          priceId,
          seats,
          skipTeamTrial: true,
          hasActiveTrial: true,
        }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        console.error(json.error ?? "Checkout failed");
        return;
      }
      window.location.href = json.url;
    } catch (e) {
      console.error(e);
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading || !data?.onTrial || data.daysRemaining === undefined || !data.trialEndsAt) {
    return null;
  }
  if (dismissed) return null;

  const daysRemaining = data.daysRemaining;
  const seatCount = typeof data.seatCount === "number" ? data.seatCount : 3;
  const urgency = urgencyFromDays(daysRemaining);
  const isPro = plan === "pro" || plan === "professional";
  const rgb = URGENCY_RGB[urgency];
  const dateStr = formatTrialDate(data.trialEndsAt);
  const dotPulseClass =
    urgency === "calm"
      ? "trial-banner-dot-pulse"
      : "trial-banner-dot-pulse-amber";

  const trialLengthDays = 14;
  const trialConsumedPct =
    urgency === "expired"
      ? 100
      : Math.min(
          100,
          Math.max(
            0,
            Math.round(
              ((trialLengthDays - Math.min(trialLengthDays, Math.max(0, daysRemaining))) /
                trialLengthDays) *
                100,
            ),
          ),
        );

  let headline: ReactNode;
  let subtext: string;
  if (urgency === "expired") {
    headline = "Your trial has ended. Upgrade to restore your team's access.";
    subtext =
      "Upgrade now to keep your team's access and scheduled reports running.";
  } else if (urgency === "calm") {
    headline = (
      <>
        <span className="font-semibold tabular-nums">
          {daysRemaining} day{daysRemaining === 1 ? "" : "s"} left
        </span>
        {" on your trial"}
      </>
    );
    subtext = `Trial ends ${dateStr}. Upgrade to keep your access and scheduled reports running.`;
  } else {
    headline = `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left on your trial`;
    if (urgency === "amber") {
      subtext = "Your trial ends soon - upgrade to avoid losing access.";
    } else {
      subtext = `Your trial expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}. Upgrade now to avoid interruption to your team.`;
    }
  }

  const ctaLabel =
    urgency === "expired"
      ? "Restore access now →"
      : isPro
        ? "Upgrade to Starter →"
        : "Upgrade to Growth →";

  return (
    <div
      className={cn("relative w-full mb-2 backdrop-blur-md", className)}
      style={
        {
          "--trial-banner-rgb": rgb,
          borderRadius: "var(--radius-lg)",
          padding: "16px 20px",
          border: "1px solid rgba(var(--trial-banner-rgb), 0.3)",
          background: `linear-gradient(135deg, rgba(var(--trial-banner-rgb), 0.12), rgba(var(--trial-banner-rgb), 0.04))`,
        } as CSSProperties
      }
      role="status"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="flex min-w-0 gap-3">
            <span
              className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", dotPulseClass)}
              style={{ backgroundColor: `rgb(var(--trial-banner-rgb))` }}
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-[15px] font-bold leading-snug text-[var(--text-primary)]">
                {headline}
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-muted)]">
                {subtext}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            onClick={() => setDismissed(true)}
            className="ml-auto p-1 text-white/60 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            <X className="size-3.5" />
          </button>
          <Button
            type="button"
            disabled={!STRIPE_TEAM_MONTHLY_PRICE_ID || checkoutLoading}
            className={cn(
              "h-10 rounded-[var(--radius)] px-4 text-[13px] font-semibold text-white shadow-sm",
              urgency === "calm" && "bg-[var(--accent)] hover:bg-[var(--accent-hover)]",
              urgency === "amber" && "bg-[#f59e0b] hover:bg-[#d97706]",
              (urgency === "red" || urgency === "expired") &&
                "trial-banner-cta-shake bg-[rgb(var(--trial-banner-rgb))] hover:opacity-90",
            )}
            onClick={() => void startTeamCheckout(seatCount)}
          >
            {checkoutLoading ? "Loading…" : ctaLabel}
          </Button>
          <Link
            href="/pricing?tab=team"
            className="text-center text-[13px] font-medium text-[var(--text-muted)] underline-offset-4 transition-colors hover:text-[var(--text-primary)] hover:underline sm:px-2"
          >
            See what&apos;s included →
          </Link>
          </div>
        </div>
        {urgency !== "expired" ? (
          <div
            className="h-0.5 w-full overflow-hidden rounded-full bg-[var(--border)]/50"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={trialConsumedPct}
            aria-label="Trial time used"
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-500 ease-out",
                urgency === "calm" && "bg-[var(--accent)]",
                urgency === "amber" && "bg-amber-500",
                urgency === "red" && "bg-red-500",
              )}
              style={{ width: `${trialConsumedPct}%` }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
