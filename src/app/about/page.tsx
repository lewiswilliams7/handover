"use client";

import Link from "next/link";
import { Lock, Scale, Users } from "lucide-react";

import { CardMouseSpotlight } from "@/components/card-mouse-spotlight";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { ScrollRevealItem } from "@/components/scroll-reveal-item";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const cardTransition = "transition-all duration-200 ease-in-out";

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

const FOUNDER_LINKEDIN_HREF = "https://www.linkedin.com/in/lewiswilliams7";

const values = [
  {
    icon: Users,
    title: "Built for practitioners",
    body: "Every feature is validated against real MSP delivery workflows. If it doesn't save time in a real team, it doesn't ship.",
  },
  {
    icon: Scale,
    title: "Honest and transparent",
    body: "No fake testimonials, no inflated claims. The product speaks for itself or it doesn't. We'd rather under-promise and over-deliver.",
  },
  {
    icon: Lock,
    title: "Privacy by default",
    body: "Your ticket data is processed to generate outputs and never stored. Your clients' information stays yours.",
  },
] as const;

export default function AboutPage() {
  return (
    <MarketingPageLayout>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes about-hero-border-spin {
            to { transform: rotate(360deg); }
          }
          .about-hero-spin {
            animation: about-hero-border-spin 12s linear infinite;
          }
          .about-reads-grid-bg {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath fill='none' stroke='%2394a3b8' stroke-opacity='0.14' d='M0 .5H32M.5 0V32'/%3E%3C/svg%3E");
          }
          .dark .about-reads-grid-bg {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath fill='none' stroke='%2364748b' stroke-opacity='0.22' d='M0 .5H32M.5 0V32'/%3E%3C/svg%3E");
          }
        `,
        }}
      />

      {/* Hero */}
      <section className="relative z-[1] overflow-hidden bg-[var(--bg-primary)] px-6 py-14 md:px-8 md:py-24">
        <MarketingHeroAmbient />
        <div className="about-reads-grid-bg pointer-events-none absolute inset-0 opacity-[0.55] dark:opacity-[0.45]" aria-hidden />
        <div className="relative z-[1] mx-auto w-full max-w-[1100px]">
          <ScrollRevealItem index={0} className="block">
            <div className="relative rounded-[var(--radius-lg)] p-[1px]">
              <div
                className="about-hero-spin pointer-events-none absolute -inset-[35%] opacity-60"
                style={{
                  background:
                    "conic-gradient(from 200deg at 50% 50%, transparent 0deg, color-mix(in srgb, var(--accent) 50%, transparent) 90deg, transparent 200deg, color-mix(in srgb, var(--accent) 35%, transparent) 300deg, transparent 360deg)",
                }}
                aria-hidden
              />
              <section
                className={cn(
                  "integration-card-glass relative overflow-hidden rounded-[calc(var(--radius-lg)-1px)] border border-[var(--border)]/70 bg-[var(--bg-primary)]/95 p-8 md:p-12",
                  "backdrop-blur-md",
                  cardTransition,
                )}
              >
                <div
                  className="pointer-events-none absolute left-1/2 top-[28%] h-[min(420px,50vw)] w-[min(420px,50vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent)] opacity-[0.11] blur-[90px]"
                  aria-hidden
                />
                <div className="relative z-[1] text-center">
                  <p
                    className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]"
                    style={{ letterSpacing: "0.14em" }}
                  >
                    OUR STORY
                  </p>
                  <h1
                    className="mx-auto mt-4 max-w-[920px] text-[2.1rem] font-bold leading-[1.12] tracking-tight sm:text-4xl md:text-5xl lg:text-[3.25rem]"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--text-primary) 0%, var(--accent) 52%, color-mix(in srgb, var(--accent) 55%, white) 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    Built by someone who lives the problem
                  </h1>
                  <p className="mx-auto mt-6 max-w-[720px] text-[17px] leading-relaxed text-[var(--text-secondary)]">
                    Handover was created by a Technical Project Manager working inside an MSP - because the
                    reporting problem is real, and no existing tool solved it properly.
                  </p>
                </div>
              </section>
            </div>
          </ScrollRevealItem>
        </div>
      </section>

      {/* Founder */}
      <section className="relative z-[1] border-t border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-16 md:px-8 md:py-24">
        <div className="mx-auto grid max-w-[1100px] gap-12 md:grid-cols-2 md:items-center md:gap-16">
          <ScrollRevealItem index={0} className="flex justify-center md:justify-start">
            <CardMouseSpotlight
              className={cn(
                "relative flex aspect-[4/5] w-full max-w-[400px] items-center justify-center overflow-hidden rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--accent)_28%,var(--border))]",
                "bg-[var(--sidebar-bg)] shadow-[0_0_60px_-12px_color-mix(in_srgb,var(--accent)_35%,transparent)]",
                cardTransition,
              )}
            >
              {/* Replace with actual photo: <img src="/lewis.jpg" alt="Lewis Williams" className="absolute inset-0 size-full object-cover" /> */}
              <div
                className="flex size-full flex-col items-center justify-center p-10"
                style={{
                  background:
                    "linear-gradient(145deg, color-mix(in srgb, var(--sidebar-bg) 88%, var(--accent)) 0%, var(--sidebar-bg) 45%, color-mix(in srgb, var(--sidebar-bg) 92%, var(--accent)) 100%)",
                }}
              >
                <span
                  className="text-[5.5rem] font-bold leading-none tracking-tight sm:text-[6.5rem]"
                  style={{
                    background: "linear-gradient(180deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 65%, white) 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    filter: "drop-shadow(0 0 28px color-mix(in srgb, var(--accent) 45%, transparent))",
                  }}
                >
                  LW
                </span>
                <span className="mt-4 text-center text-[12px] font-medium uppercase tracking-[0.1em] text-[rgba(255,255,255,0.35)]">
                </span>
              </div>
            </CardMouseSpotlight>
          </ScrollRevealItem>
          <ScrollRevealItem index={1} className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">FOUNDER</p>
            <h2
              className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl md:text-[2.75rem]"
              style={{
                background:
                  "linear-gradient(135deg, var(--text-primary) 0%, var(--accent) 60%, color-mix(in srgb, var(--accent) 50%, white) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Lewis Williams
            </h2>
            <p className="mt-2 text-lg font-medium text-[var(--text-secondary)]">
              Technical Project Manager &amp; Founder
            </p>
            <div className="mt-8 space-y-4 text-[15px] leading-[1.75] text-[var(--text-secondary)]">
              <p>
                I started Handover because I was spending every Friday afternoon doing the same thing - pulling
                ticket data from HaloPSA, writing client update emails, compiling action logs, updating risk
                registers.
              </p>
              <p>The same work, every week, for every client. Hours of it.</p>
              <p>
                I looked for a tool that understood MSP delivery workflows, integrated with HaloPSA, and produced
                outputs that actually sounded like a real PM wrote them. Nothing existed.
              </p>
              <p className="font-medium text-[var(--text-primary)]">So I built it.</p>
              <p>
                Handover is what I use every week at work. Every feature exists because it solved a real problem in
                a real MSP delivery team.
              </p>
              <p>
                I&apos;m 18. I work full time as a Technical Project Manager at Panacea Group in Birmingham. I built
                Handover in the evenings and weekends because the problem was worth solving.
              </p>
            </div>
            <a
              href={FOUNDER_LINKEDIN_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "mt-8 inline-flex items-center gap-2 rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--accent)_35%,var(--border))]",
                "bg-[color-mix(in_srgb,var(--accent)_8%,var(--bg-primary))] px-4 py-2.5 text-[14px] font-medium text-[var(--accent)]",
                "transition-colors duration-200 hover:border-[color-mix(in_srgb,var(--accent)_55%,var(--border))] hover:bg-[color-mix(in_srgb,var(--accent)_14%,var(--bg-primary))]",
              )}
            >
              <LinkedInIcon className="size-5 shrink-0" />
              Connect on LinkedIn
            </a>
          </ScrollRevealItem>
        </div>
      </section>

      {/* Mission */}
      <section className="relative z-[1] border-t border-[var(--border)] bg-[var(--bg-primary)] px-6 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-[720px] text-center">
          <ScrollRevealItem index={0} className="block">
            <p
              className="text-[clamp(1.35rem,4vw,2.5rem)] font-semibold leading-snug tracking-tight"
              style={{
                background:
                  "linear-gradient(135deg, var(--text-primary) 0%, var(--accent) 45%, color-mix(in srgb, var(--accent) 60%, white) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              &ldquo;Every MSP delivery team deserves to spend their time delivering - not writing about
              delivering.&rdquo;
            </p>
            <p className="mx-auto mt-8 max-w-[600px] text-[15px] leading-relaxed text-[var(--text-secondary)]">
              Handover exists to eliminate the administrative burden of MSP reporting. Not to replace project
              managers - to give them their Friday afternoons back.
            </p>
          </ScrollRevealItem>
        </div>
      </section>

      {/* Values */}
      <section className="relative z-[1] border-t border-[var(--border)] bg-[var(--bg-primary)] px-6 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-[1100px]">
          <ScrollRevealItem index={0} className="block text-center">
            <h2 className="text-3xl font-bold text-[var(--text-primary)] md:text-4xl">What we stand for</h2>
          </ScrollRevealItem>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {values.map((v, i) => (
              <ScrollRevealItem key={v.title} index={i + 1} className="block h-full">
                <CardMouseSpotlight
                  className={cn(
                    "integration-card-glass flex h-full flex-col rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--accent)_28%,var(--border))] p-6 backdrop-blur-md",
                    cardTransition,
                  )}
                >
                  <div
                    className="flex size-11 items-center justify-center rounded-[var(--radius)] text-[var(--accent)]"
                    style={{
                      background: "color-mix(in srgb, var(--accent) 14%, transparent)",
                      boxShadow: "0 0 24px color-mix(in srgb, var(--accent) 20%, transparent)",
                    }}
                  >
                    <v.icon className="size-5" strokeWidth={2} aria-hidden />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{v.title}</h3>
                  <p className="mt-2 flex-1 text-[14px] leading-relaxed text-[var(--text-secondary)]">{v.body}</p>
                </CardMouseSpotlight>
              </ScrollRevealItem>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="relative z-[1] border-t border-[var(--border)] bg-[var(--sidebar-bg)] px-6 py-16 text-center md:px-8 md:py-24"
      >
        <div className="mx-auto max-w-[640px]">
          <ScrollRevealItem index={0} className="block">
            <h2 className="text-3xl font-bold text-white md:text-4xl">Want to see it in action?</h2>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/auth?tab=signup&returnTo=/welcome" className="inline-flex sm:flex-1 sm:max-w-[260px]">
                <Button
                  size="lg"
                  className="w-full bg-[var(--accent)] px-8 font-semibold text-white hover:bg-[var(--accent-hover)]"
                >
                  Start free trial →
                </Button>
              </Link>
              <Link href="/integrations/halopsa" className="inline-flex sm:flex-1 sm:max-w-[320px]">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-[color-mix(in_srgb,var(--accent)_40%,rgba(255,255,255,0.2))] bg-transparent text-white hover:bg-white/10"
                >
                  View the HaloPSA integration →
                </Button>
              </Link>
            </div>
          </ScrollRevealItem>
        </div>
      </section>
    </MarketingPageLayout>
  );
}
