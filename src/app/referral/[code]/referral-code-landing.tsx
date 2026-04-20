"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { CardMouseSpotlight } from "@/components/card-mouse-spotlight";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { ScrollRevealItem } from "@/components/scroll-reveal-item";
import { cn } from "@/lib/utils";

const cardTransition = "transition-all duration-200 ease-in-out";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

type ReferralCodeLandingProps = {
  code: string;
  valid: boolean;
  referrerFirstName: string | null;
};

export function ReferralCodeLanding({
  code,
  valid,
  referrerFirstName,
}: ReferralCodeLandingProps) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!valid || !code || trackedRef.current) return;
    trackedRef.current = true;
    try {
      document.cookie = `handover_ref=${encodeURIComponent(code)}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
    } catch {
      /* ignore */
    }
    void fetch("/api/referrals/track-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }).catch(() => {});
  }, [code, valid]);

  const firstName = referrerFirstName?.trim() || null;
  const heading =
    firstName && valid
      ? `${firstName} thinks you'll love Handover`
      : "You've been invited to Handover";

  const signupHref = valid
    ? `/auth?tab=signup&ref=${encodeURIComponent(code)}`
    : "/auth?tab=signup";
  const signinHref = valid
    ? `/auth?tab=signin&ref=${encodeURIComponent(code)}`
    : "/auth?tab=signin";

  const termsName = firstName && valid ? firstName : "Your referrer";

  const benefits = [
    {
      title: "First month of Pro free",
      body: "Try every Pro feature for 30 days. No charge until month 2.",
    },
    {
      title: "Full HaloPSA integration",
      body: "Pull live ticket data and generate reports in 30 seconds.",
    },
    {
      title: "Unlimited generations",
      body: "No limits on how many reports you generate during your trial.",
    },
  ] as const;

  return (
    <>
      <section className="relative z-[1] overflow-hidden bg-[var(--bg-primary)] px-6 py-14 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto w-full max-w-[720px] text-center">
          <ScrollRevealItem index={0} className="block">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]"
              style={{ letterSpacing: "0.14em" }}
            >
              YOU&apos;VE BEEN REFERRED
            </p>
            <h1
              className="mx-auto mt-4 max-w-[640px] text-[2rem] font-bold leading-[1.12] tracking-tight sm:text-[2.75rem] md:text-[3rem]"
              style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}
            >
              <span className="text-gradient-brand">{heading}</span>
            </h1>
            <p className="mx-auto mt-5 max-w-[540px] text-[16px] leading-relaxed text-[var(--text-secondary)]">
              Get your first month of Handover Pro completely free.
              <br />
              No commitment - cancel before month 2 and pay nothing.
              <br />
              {firstName && valid ? (
                <>{firstName} earns £105 when you stay.</>
              ) : (
                <>Your referrer earns £105 when you stay.</>
              )}
            </p>

            <div className="mx-auto mt-10 flex w-full max-w-sm flex-col items-stretch gap-3">
              <Link
                href={signupHref}
                className="inline-flex h-12 w-full items-center justify-center rounded-[var(--radius)] bg-[var(--accent)] text-[15px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
              >
                Claim your free month →
              </Link>
              <Link
                href={signinHref}
                className="text-center text-[14px] font-medium text-[var(--accent)] hover:underline"
              >
                Already have an account? Sign in →
              </Link>
            </div>

            <p className="mx-auto mt-8 max-w-[420px] text-[12px] leading-relaxed text-[var(--text-muted)]">
              Free month applied automatically at checkout. Card required - cancel before month 2 to
              pay nothing.
            </p>
          </ScrollRevealItem>
        </div>
      </section>

      <section className="relative z-[1] border-t border-[var(--border)]/60 bg-[var(--bg-primary)] px-6 py-14 md:px-8 md:py-20">
        <div className="mx-auto w-full max-w-[1100px]">
          <ScrollRevealItem index={1} className="block">
            <h2 className="text-center text-[14px] font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
              What you get
            </h2>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {benefits.map((b) => (
                <CardMouseSpotlight
                  key={b.title}
                  className={cn(
                    "integration-card-glass rounded-[var(--radius-lg)] border border-[var(--border)]/70 bg-[var(--bg-primary)]/90 p-6 backdrop-blur-md",
                    cardTransition,
                  )}
                >
                  <p className="text-[15px] font-semibold text-[var(--accent)]">
                    <span aria-hidden>✓ </span>
                    {b.title}
                  </p>
                  <p className="mt-3 text-[14px] leading-relaxed text-[var(--text-secondary)]">
                    {b.body}
                  </p>
                </CardMouseSpotlight>
              ))}
            </div>
          </ScrollRevealItem>
        </div>
      </section>

      <section className="relative z-[1] border-t border-[var(--border)]/60 px-6 pb-20 pt-10 md:px-8">
        <div className="mx-auto w-full max-w-[560px]">
          <ScrollRevealItem index={2} className="block">
            <h3 className="text-[14px] font-semibold text-[var(--text-secondary)]">
              How the referral works
            </h3>
            <ol className="mt-4 space-y-3 text-[13px] leading-relaxed text-[var(--text-muted)]">
              <li className="flex gap-2">
                <span className="mt-0.5 shrink-0 font-semibold text-[var(--text-secondary)]">1.</span>
                <span>
                  Sign up using this link - your free month is applied automatically at checkout
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 shrink-0 font-semibold text-[var(--text-secondary)]">2.</span>
                <span>
                  Use Handover Pro free for 30 days - full push-back, scheduling, and Excel packs; no
                  charge until month 2
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 shrink-0 font-semibold text-[var(--text-secondary)]">3.</span>
                <span>
                  If you love it, do nothing - you&apos;ll be charged £29 from month 2 onwards
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 shrink-0 font-semibold text-[var(--text-secondary)]">4.</span>
                <span>Cancel anytime before month 2 to pay nothing</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 shrink-0 font-semibold text-[var(--text-secondary)]">5.</span>
                <span>
                  When you pay for month 2, {termsName} earns £105 - that&apos;s 3 months free on
                  their account as a thank you
                </span>
              </li>
            </ol>
            <p className="mt-6 text-[12px] leading-relaxed text-[var(--text-muted)]">
              This offer is valid for 30 days from today.
              <br />
              One free month per email address.
              <br />
              New customers only.
            </p>
            <p className="mt-8 text-center">
              <Link
                href="/"
                className="text-[13px] font-medium text-[var(--accent)] hover:underline"
              >
                ← Back to Handover
              </Link>
            </p>
          </ScrollRevealItem>
        </div>
      </section>
    </>
  );
}
