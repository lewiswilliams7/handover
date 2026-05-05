"use client";

import Link from "next/link";

import { CardMouseSpotlight } from "@/components/card-mouse-spotlight";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { ScrollRevealItem } from "@/components/scroll-reveal-item";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const cardT = "transition-all duration-200 ease-in-out";

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <CardMouseSpotlight
      className={cn(
        "integration-card-glass rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--accent)_28%,var(--border))] p-6 text-center",
        cardT,
      )}
    >
      <p
        className="text-3xl font-bold md:text-4xl"
        style={{
          background: "linear-gradient(135deg, var(--text-primary) 0%, var(--accent) 100%)",
          WebkitBackgroundClip: "text",
          color: "transparent",
        }}
      >
        {value}
      </p>
      <p className="mt-2 text-[13px] text-[var(--text-secondary)]">{label}</p>
    </CardMouseSpotlight>
  );
}

export default function MspWeeklyReportingCaseStudyPage() {
  return (
    <MarketingPageLayout>
      <section className="relative z-[1] overflow-hidden bg-[var(--bg-primary)] px-6 py-14 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto w-full max-w-[1100px]">
          <ScrollRevealItem index={0} className="block">
            <Link
              href="/case-studies"
              className="text-sm text-[var(--text-secondary)] underline-offset-4 hover:text-[var(--text-primary)] hover:underline"
            >
              ← Case studies
            </Link>
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              Case study
            </p>
            <h1
              className="mt-2 max-w-4xl text-4xl font-bold leading-tight md:text-5xl"
              style={{
                background:
                  "linear-gradient(135deg, var(--text-primary) 0%, var(--accent) 55%, color-mix(in srgb, var(--accent) 40%, white) 100%)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              From 4 hours to 10 minutes. Every week.
            </h1>
            <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-[var(--text-secondary)]">
              How a UK MSP delivery team eliminated their weekly reporting burden with Handover.
            </p>
          </ScrollRevealItem>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            <ScrollRevealItem index={1} className="block">
              <StatCard value="4 hrs → 10 mins" label="Weekly reporting time" />
            </ScrollRevealItem>
            <ScrollRevealItem index={2} className="block">
              <StatCard value="96%" label="Time saved per week" />
            </ScrollRevealItem>
            <ScrollRevealItem index={3} className="block">
              <StatCard value="5" label="Engineers now using Handover" />
            </ScrollRevealItem>
          </div>
        </div>
      </section>

      <section className="relative z-[1] border-t border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-[800px]">
          <ScrollRevealItem index={0} className="block">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">The problem</h2>
            <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-[var(--text-secondary)]">
              <p>
                A UK-based MSP with five engineers and twelve active clients was spending the equivalent of half a
                working day every week on delivery reporting.
              </p>
              <p>
                Every Friday afternoon, the Service Delivery Manager would manually pull data from HaloPSA, write
                individual client update emails, compile action logs, update the risk register, and produce status
                reports for key accounts.
              </p>
              <p>
                The process was entirely manual, inconsistent between engineers, and frequently delayed - meaning
                clients sometimes went without updates for days at a time.
              </p>
            </div>
            <blockquote
              className="mt-8 border-l-4 border-[var(--accent)] pl-5 text-[15px] italic leading-relaxed text-[var(--text-primary)]"
              style={{
                background: "color-mix(in srgb, var(--accent) 6%, transparent)",
                padding: "1rem 1rem 1rem 1.25rem",
                borderRadius: "var(--radius)",
              }}
            >
              &ldquo;We knew the reporting needed to happen, but it was always the thing that got pushed to the end of
              the week. By Friday afternoon, everyone just wanted to go home.&rdquo;
              <footer className="mt-2 text-[13px] not-italic text-[var(--text-muted)]">
                {" - Service Delivery Manager"}
              </footer>
            </blockquote>
            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {[
                "4+ hours per week lost to manual reporting",
                "Inconsistent output quality between engineers",
                "Client updates frequently delayed or missed",
                "No standardised format for action logs or risk registers",
                "HaloPSA data had to be manually copied into reports",
              ].map((t) => (
                <CardMouseSpotlight
                  key={t}
                  className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] p-4 text-[14px] text-[var(--text-secondary)]"
                >
                  <span className="text-[var(--danger)]">✗</span> {t}
                </CardMouseSpotlight>
              ))}
            </div>
          </ScrollRevealItem>
        </div>
      </section>

      <section className="relative z-[1] border-t border-[var(--border)] bg-[var(--bg-primary)] px-6 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-[1100px]">
          <ScrollRevealItem index={0} className="block">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              How Handover changed the workflow
            </h2>
          </ScrollRevealItem>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                phase: "Phase 1: Connect",
                body: "The team connected Handover to their HaloPSA instance in under two minutes. From that point, all ticket and project data was available to pull directly - no manual copying required.",
              },
              {
                phase: "Phase 2: Generate",
                body: "Engineers select the tickets they want to report on, hit generate, and receive five professional outputs in under 30 seconds. Client emails, action logs, risk logs, internal summaries and status reports - all formatted consistently, all ready to send.",
              },
              {
                phase: "Phase 3: Push back",
                body: "Generated reports post directly back into HaloPSA as ticket notes. The team's HaloPSA history stays current automatically, and scheduled weekly reports mean the process now runs without anyone having to trigger it manually.",
              },
            ].map((c, i) => (
              <ScrollRevealItem key={c.phase} index={i + 1} className="block">
                <CardMouseSpotlight
                  className={cn(
                    "integration-card-glass h-full rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--accent)_25%,var(--border))] p-6",
                    cardT,
                  )}
                >
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--accent)]">{c.phase}</p>
                  <p className="mt-3 text-[14px] leading-relaxed text-[var(--text-secondary)]">{c.body}</p>
                </CardMouseSpotlight>
              </ScrollRevealItem>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-[1] border-t border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-[900px]">
          <ScrollRevealItem index={0} className="block">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">The results</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                "96% reduction in weekly reporting time (4 hours → 10 minutes)",
                "12 client update emails generated per week automatically",
                "0 missed client updates since implementing Handover",
                "5 engineers onboarded in under 30 minutes",
                "£1,300+ saved per month in engineer time",
              ].map((line) => (
                <div
                  key={line}
                  className="relative overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] p-4 text-[14px] leading-snug text-[var(--text-secondary)]"
                  style={{ boxShadow: "0 0 32px -8px color-mix(in srgb, var(--accent) 25%, transparent)" }}
                >
                  {line}
                </div>
              ))}
            </div>
            <blockquote className="mt-12 border-l-4 border-[var(--accent)] py-2 pl-6 text-center text-xl font-medium leading-snug text-[var(--text-primary)] md:text-2xl">
              &ldquo;Handover has become the first thing I open on a Monday morning. The reports are ready before
              I&apos;ve finished my coffee.&rdquo;
              <footer className="mt-4 text-base font-normal text-[var(--text-muted)]">
                {" - Service Delivery Manager, UK MSP"}
              </footer>
            </blockquote>
            <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-[var(--text-secondary)]">
              <p>
                The team now runs weekly scheduled reports every Monday at 7am. By the time engineers arrive at their
                desks, client update emails are drafted, action logs are current, and HaloPSA tickets have been updated
                automatically.
              </p>
              <p>What previously consumed a Friday afternoon now happens overnight, without anyone touching it.</p>
            </div>
          </ScrollRevealItem>
        </div>
      </section>

      <section
        className="relative z-[1] border-t border-[var(--border)] bg-[var(--sidebar-bg)] px-6 py-16 text-center md:px-8 md:py-24"
      >
        <div className="mx-auto max-w-2xl">
          <ScrollRevealItem index={0} className="block">
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              Ready to see what Handover can do for your team?
            </h2>
            <p className="mt-4 text-[var(--sidebar-text)]">
              Join MSP delivery teams worldwide who have already made the switch.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/auth?tab=signup&returnTo=/welcome">
                <Button
                  size="lg"
                  className="w-full bg-[var(--accent)] px-8 text-white hover:bg-[var(--accent-hover)] sm:w-auto"
                >
                  Start free trial →
                </Button>
              </Link>
              <Link href="/pricing">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-[var(--border)] text-white hover:bg-white/10 sm:w-auto"
                >
                  Compare plans & pricing →
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-sm text-[var(--sidebar-text)]">
              No card required. 14-day free trial.
            </p>
          </ScrollRevealItem>
        </div>
      </section>
    </MarketingPageLayout>
  );
}
