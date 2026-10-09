"use client";

import Link from "next/link";
import { Check, ChevronDown, Filter, Plug, Send, Zap } from "lucide-react";

import { CardMouseSpotlight } from "@/components/card-mouse-spotlight";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { ScrollRevealItem } from "@/components/scroll-reveal-item";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const cardTransition = "transition-all duration-200 ease-in-out";

const howItWorksSteps = [
  {
    title: "Connect your HaloPSA instance",
    description: "2 minutes, credentials encrypted",
    Icon: Plug,
  },
  {
    title: "Select tickets and projects",
    description: "Filter by client, date, status",
    Icon: Filter,
  },
  {
    title: "Generate five outputs",
    description: "Client email, action log, risk log, summary, status report",
    Icon: Zap,
  },
  {
    title: "Push back to HaloPSA",
    description: "Outputs post directly back as ticket notes",
    Icon: Send,
  },
] as const;

const outputCards: readonly [string, string][] = [
  [
    "Client Email",
    "Professional update addressed to your client contact. Your signature, your tone.",
  ],
  [
    "Action List",
    "Every open action with owner, priority and status. Export to CSV instantly.",
  ],
  [
    "Risk Log",
    "Risks identified from ticket data with impact and mitigation. Export to Excel.",
  ],
  ["Internal Summary", "Two paragraph internal update for your team or manager."],
  [
    "Status Report",
    "Full structured report with RAG status, progress, actions and next steps. Push results back to HaloPSA as notes on Pro.",
  ],
] as const;

const featureLines = [
  "Native HaloPSA API integration - no manual data export required",
  "Push outputs back to HaloPSA as ticket notes automatically",
  "Scheduled weekly reports - runs automatically every Monday",
  "Supports HaloPSA tickets and projects",
  "Email correspondence included in AI context",
  "Excel export - action log, risk log, status report",
  "Custom writing style and tone per user",
  "Multi-client reports - all clients in one generation",
  "Handover includes the complete HaloPSA workspace",
  "Works with HaloPSA Cloud and On-Premise",
] as const;

const faqItems: { q: string; a: string }[] = [
  {
    q: "Does Handover work with HaloPSA On-Premise?",
    a: "Yes. Handover works with both HaloPSA Cloud and On-Premise instances. You will need your HaloPSA instance URL, Client ID, and Client Secret to connect.",
  },
  {
    q: "What HaloPSA API permissions does Handover need?",
    a: "Handover requires read:tickets, read:projects, read:customers, edit:tickets and edit:projects. Edit permissions are required only for pushing generated outputs back to HaloPSA as ticket notes.",
  },
  {
    q: "Does Handover store my HaloPSA ticket data?",
    a: "No. Your ticket data is processed to generate outputs and is never stored on Handover's servers. Credentials are encrypted using AES-256.",
  },
  {
    q: "Can Handover generate reports for multiple HaloPSA clients at once?",
    a: "Yes. You can select tickets from multiple clients in a single import and Handover will generate separate client emails for each organisation automatically.",
  },
  {
    q: "How long does it take to connect HaloPSA to Handover?",
    a: "Under two minutes. You will need your HaloPSA URL, Client ID and Client Secret. Full setup instructions are available at gethandover.uk/integrations/halopsa.",
  },
  {
    q: "Does Handover push outputs back to HaloPSA?",
    a: "Yes. After generating outputs, you can post them directly back to the relevant HaloPSA ticket or project as a note with one click. Scheduled reports also push back automatically.",
  },
  {
    q: "What is the difference between Handover and writing reports manually in HaloPSA?",
    a: "Manual HaloPSA reporting typically takes 2-4 hours per week per PM. Handover reduces this to under 10 minutes by pulling the data automatically, generating professional outputs in 30 seconds, and pushing them back to HaloPSA without any manual copying.",
  },
];

export default function HalopsaReportingPage() {
  return (
    <MarketingPageLayout>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes hr-hero-border-spin {
            to { transform: rotate(360deg); }
          }
          .hr-hero-spin {
            animation: hr-hero-border-spin 12s linear infinite;
          }
          @keyframes hr-dash-slide {
            to { background-position: 24px 0; }
          }
          .hr-steps-dash {
            background: repeating-linear-gradient(
              90deg,
              color-mix(in srgb, var(--accent) 85%, transparent) 0px,
              color-mix(in srgb, var(--accent) 85%, transparent) 10px,
              transparent 10px,
              transparent 20px
            );
            background-size: 24px 2px;
            animation: hr-dash-slide 0.8s linear infinite;
          }
          .hr-reads-grid-bg {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath fill='none' stroke='%2394a3b8' stroke-opacity='0.12' d='M0 .5H32M.5 0V32'/%3E%3C/svg%3E");
          }
          .dark .hr-reads-grid-bg {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath fill='none' stroke='%2364748b' stroke-opacity='0.2' d='M0 .5H32M.5 0V32'/%3E%3C/svg%3E");
          }
          details.hr-faq summary::-webkit-details-marker { display: none; }
          details.hr-faq[open] .hr-faq-chevron { transform: rotate(180deg); }
        `,
        }}
      />

      {/* Hero */}
      <section className="relative z-[1] overflow-hidden bg-[var(--bg-primary)] px-6 py-12 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="hr-reads-grid-bg pointer-events-none absolute inset-0 opacity-[0.5] dark:opacity-[0.4]" aria-hidden />
        <div className="relative z-[1] mx-auto w-full max-w-[1100px]">
          <ScrollRevealItem index={0} className="block">
            <div className="relative rounded-[var(--radius-lg)] p-[1px]">
              <div
                className="hr-hero-spin pointer-events-none absolute -inset-[35%] opacity-60"
                style={{
                  background:
                    "conic-gradient(from 200deg at 50% 50%, transparent 0deg, color-mix(in srgb, var(--accent) 50%, transparent) 90deg, transparent 200deg, color-mix(in srgb, var(--accent) 35%, transparent) 300deg, transparent 360deg)",
                }}
                aria-hidden
              />
              <section
                className={cn(
                  "integration-card-glass relative overflow-hidden rounded-[calc(var(--radius-lg)-1px)] border border-[var(--border)]/70 bg-[var(--bg-primary)]/95 p-8 backdrop-blur-md md:p-12",
                  cardTransition,
                )}
              >
                <div
                  className="pointer-events-none absolute left-1/2 top-[32%] h-[min(380px,48vw)] w-[min(380px,48vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent)] opacity-[0.1] blur-[88px]"
                  aria-hidden
                />
                <div className="relative z-[1]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                    HaloPSA reporting
                  </p>
                  <h1 className="mt-4 max-w-[920px] text-3xl font-bold leading-[1.12] tracking-tight sm:text-4xl md:text-5xl lg:text-[3.1rem]">
                    <span
                      style={{
                        background:
                          "linear-gradient(135deg, var(--text-primary) 0%, var(--accent) 52%, color-mix(in srgb, var(--accent) 55%, white) 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      The HaloPSA Reporting Tool Built for MSP Delivery Teams
                    </span>
                  </h1>
                  <p className="mt-6 max-w-[760px] text-[17px] leading-relaxed text-[var(--text-secondary)]">
                    Handover connects directly to HaloPSA, pulls your live ticket and project data, and generates
                    professional client updates, action logs, risk registers, and Excel report packs in seconds - then
                    pushes notes back to your tickets automatically. Run the free PSA scan before you buy.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link href="/onboarding/connect">
                      <Button
                        size="lg"
                        className="rounded-[var(--radius)] bg-[var(--accent)] px-6 font-semibold text-white hover:bg-[var(--accent-hover)]"
                      >
                        Run the free PSA scan
                      </Button>
                    </Link>
                    <Link href="/integrations/halopsa">
                      <Button
                        size="lg"
                        variant="outline"
                        className="rounded-[var(--radius)] border-[var(--border)] bg-transparent px-6 text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                      >
                        See the HaloPSA integration →
                      </Button>
                    </Link>
                  </div>
                </div>
              </section>
            </div>
          </ScrollRevealItem>
        </div>
      </section>

      {/* Section 1 - Problem */}
      <section className="relative z-[1] border-t border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-[720px]">
          <ScrollRevealItem index={0} className="block">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] md:text-3xl">
              Why HaloPSA reporting takes so long
            </h2>
            <div className="mt-8 space-y-5 text-[15px] leading-[1.75] text-[var(--text-secondary)]">
              <p>
                HaloPSA is an excellent PSA platform for managing tickets, projects and client
                relationships. But turning that data into client-ready reports is still a manual process
                for most MSP delivery teams.
              </p>
              <p>
                A typical Friday afternoon for an MSP Service Delivery Manager looks like this: open
                HaloPSA, find the relevant tickets for each client, copy the key updates into a document,
                write a client email summarising the week, compile an action log, update the risk register,
                produce a status report for the account manager.
              </p>
              <p>
                Repeat for every client. That is two to four hours of work that adds no value to the client
                - it just documents work that has already been done.
              </p>
              <p className="font-medium text-[var(--text-primary)]">Handover eliminates that process entirely.</p>
            </div>
          </ScrollRevealItem>
        </div>
      </section>

      {/* Section 2 - How it works */}
      <section className="relative z-[1] border-t border-[var(--border)] bg-[var(--bg-primary)] px-6 py-14 md:px-8 md:py-20">
        <div className="mx-auto w-full max-w-[1100px]">
          <ScrollRevealItem index={0} className="block">
            <section
              className={cn(
                "integration-card-glass rounded-[var(--radius-lg)] border border-[var(--border)]/80 p-8",
                cardTransition,
              )}
            >
              <h2 className="text-2xl font-bold text-[var(--text-primary)] md:text-3xl">
                How Handover connects to HaloPSA
              </h2>
              <div className="relative mt-8 md:px-4">
                <div
                  className="pointer-events-none absolute top-5 left-[10%] right-[10%] hidden h-[2px] md:block hr-steps-dash opacity-60"
                  aria-hidden
                />
                <div className="grid gap-10 md:grid-cols-4 md:gap-4">
                  {howItWorksSteps.map((s, idx) => (
                    <ScrollRevealItem key={s.title} index={idx + 1} className="min-w-0">
                      <CardMouseSpotlight
                        className={cn(
                          "integration-card-glass group/step flex flex-col items-center rounded-[var(--radius-lg)] border border-[var(--border)]/70 p-4 text-center",
                          cardTransition,
                          "hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--accent)_35%,var(--border))] hover:shadow-[0_12px_40px_-12px_color-mix(in_srgb,var(--accent)_25%,transparent)]",
                        )}
                      >
                        <div className="relative z-[1] flex shrink-0 items-center justify-center">
                          <span
                            className="pointer-events-none absolute inline-flex size-14 rounded-full bg-[var(--accent)] opacity-25 blur-lg"
                            aria-hidden
                          />
                          <div className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white ring-4 ring-[var(--bg-primary)]">
                            {idx + 1}
                          </div>
                        </div>
                        <s.Icon className="relative z-[1] mt-3 size-5 text-[var(--accent)] transition-transform duration-200 group-hover/step:scale-110" />
                        <p className="relative z-[1] mt-2 text-sm font-semibold text-[var(--text-primary)]">
                          {s.title}
                        </p>
                        <p className="relative z-[1] mt-1 text-sm text-[var(--text-secondary)]">{s.description}</p>
                      </CardMouseSpotlight>
                    </ScrollRevealItem>
                  ))}
                </div>
              </div>
            </section>
          </ScrollRevealItem>
        </div>
      </section>

      {/* Section 3 - Outputs */}
      <section className="relative z-[1] border-t border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-14 md:px-8 md:py-20">
        <div className="mx-auto w-full max-w-[1100px]">
          <ScrollRevealItem index={0} className="block">
            <section
              className={cn(
                "integration-card-glass rounded-[var(--radius-lg)] border border-[var(--border)]/80 p-8",
                cardTransition,
              )}
            >
              <h2 className="text-2xl font-bold text-[var(--text-primary)] md:text-3xl">
                Five professional outputs from your HaloPSA data
              </h2>
              <div className="mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:grid md:snap-none md:grid-cols-5 md:overflow-visible md:pb-0">
                {outputCards.map(([title, body], idx) => (
                  <ScrollRevealItem key={title} index={idx + 1} className="min-w-0 shrink-0 snap-start md:shrink">
                    <CardMouseSpotlight
                      className={cn(
                        "integration-card-glass relative h-full min-w-[min(280px,85vw)] rounded-[var(--radius)] border border-[var(--border)]/70 p-4 md:min-w-0",
                        cardTransition,
                        "hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] hover:shadow-[0_0_20px_color-mix(in_srgb,var(--accent)_20%,transparent)]",
                      )}
                    >
                      <span className="absolute right-3 top-3 flex items-center gap-1">
                        {title === "Status Report" ? (
                          <span className="rounded bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            Pro
                          </span>
                        ) : null}
                        <span className="flex size-6 items-center justify-center rounded-md bg-[var(--accent)] text-[11px] font-bold text-white shadow-sm">
                          {idx + 1}
                        </span>
                      </span>
                      <p className="pr-16 text-sm font-semibold text-[var(--text-primary)]">{title}</p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">{body}</p>
                    </CardMouseSpotlight>
                  </ScrollRevealItem>
                ))}
              </div>
            </section>
          </ScrollRevealItem>
        </div>
      </section>

      {/* Section 4 - Features */}
      <section className="relative z-[1] border-t border-[var(--border)] bg-[var(--bg-primary)] px-6 py-14 md:px-8 md:py-20">
        <div className="mx-auto w-full max-w-[900px]">
          <ScrollRevealItem index={0} className="block text-center">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] md:text-3xl">
              Everything you need for HaloPSA reporting
            </h2>
          </ScrollRevealItem>
          <ul className="mt-10 grid list-none gap-3 p-0 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-3">
            {featureLines.map((line, idx) => (
              <li key={line}>
                <ScrollRevealItem index={idx + 1} className="flex gap-2.5">
                  <Check
                    className="mt-0.5 size-4 shrink-0 text-[var(--accent)]"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                  <span className="text-[15px] leading-snug text-[var(--text-secondary)]">{line}</span>
                </ScrollRevealItem>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Section 5 - Social proof */}
      <section className="relative z-[1] border-t border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-[720px] text-center">
          <ScrollRevealItem index={0} className="block">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] md:text-3xl">
              Trusted by MSP delivery teams
            </h2>
            <p className="mx-auto mt-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[13px] leading-snug text-[var(--text-secondary)]">
              <span>
                <span className="font-semibold text-[var(--text-primary)]">40+</span> MSP teams
              </span>
              <span className="text-[var(--text-muted)]" aria-hidden>
                ·
              </span>
              <span>
                <span className="font-semibold text-[var(--text-primary)]">96%</span> average time saved
              </span>
              <span className="text-[var(--text-muted)]" aria-hidden>
                ·
              </span>
              <span>
                <span className="font-semibold text-[var(--text-primary)]">4 hours → 10 minutes</span> per week
              </span>
            </p>
            <blockquote className="mx-auto mt-10 max-w-[560px] border-l-2 border-[var(--accent)] pl-5 text-left">
              <p className="text-[15px] italic leading-relaxed text-[var(--text-secondary)]">
                &ldquo;From 4 hours to 10 minutes. Every week.&rdquo;
              </p>
              <footer className="mt-3 text-[13px] text-[var(--text-muted)]">
                {" - Service Delivery Manager, UK MSP"}
              </footer>
            </blockquote>
            <Link
              href="/case-studies/msp-weekly-reporting"
              className="mt-6 inline-block text-sm font-medium text-[var(--accent)] underline-offset-4 hover:underline"
            >
              Read the full case study →
            </Link>
          </ScrollRevealItem>
        </div>
      </section>

      {/* Section 6 - FAQ */}
      <section className="relative z-[1] border-t border-[var(--border)] bg-[var(--bg-primary)] px-6 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-[720px]">
          <ScrollRevealItem index={0} className="block text-center">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] md:text-3xl">
              HaloPSA reporting tool - frequently asked questions
            </h2>
          </ScrollRevealItem>
          <div className="mt-10 space-y-0 border-t border-[var(--border)]">
            {faqItems.map((item) => (
              <details key={item.q} className="hr-faq group border-b border-[var(--border)] py-4">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-left">
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">{item.q}</h3>
                  <ChevronDown
                    className="hr-faq-chevron mt-0.5 size-5 shrink-0 text-[var(--text-muted)] transition-transform duration-200"
                    aria-hidden
                  />
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-[var(--text-secondary)]">{item.a}</p>
              </details>
            ))}
          </div>
          <p className="mx-auto mt-10 max-w-[560px] text-center text-[14px] text-[var(--text-muted)]">
            Want a full comparison of HaloPSA reporting tools?{" "}
            <Link
              href="/blog/best-halopsa-reporting-tools"
              className="font-medium text-[var(--accent)] underline-offset-2 hover:underline"
            >
              Read our comparison guide →
            </Link>
          </p>
        </div>
      </section>

      {/* Section 7 - CTA */}
      <section className="relative z-[1] border-t border-[var(--border)] bg-[var(--sidebar-bg)] px-6 py-16 text-center md:px-8 md:py-24">
        <div className="mx-auto max-w-[640px]">
          <ScrollRevealItem index={0} className="block">
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              Start generating HaloPSA reports in minutes
            </h2>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/onboarding/connect" className="inline-flex sm:flex-1 sm:max-w-[260px]">
                <Button
                  size="lg"
                  className="w-full bg-[var(--accent)] px-8 font-semibold text-white hover:bg-[var(--accent-hover)]"
                >
                  Run the free PSA scan →
                </Button>
              </Link>
              <Link href="/integrations/halopsa" className="inline-flex sm:flex-1 sm:max-w-[340px]">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-[color-mix(in_srgb,var(--accent)_40%,rgba(255,255,255,0.2))] bg-transparent text-white hover:bg-white/10"
                >
                  See the full HaloPSA integration →
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-sm text-[var(--text-muted)]">
              Run the free PSA scan before you buy.
            </p>
          </ScrollRevealItem>
        </div>
      </section>
    </MarketingPageLayout>
  );
}
