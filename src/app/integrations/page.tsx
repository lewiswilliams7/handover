import type { Metadata } from "next";
import Link from "next/link";

import { CardMouseSpotlight } from "@/components/card-mouse-spotlight";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { ScrollRevealItem } from "@/components/scroll-reveal-item";
import { Button } from "@/components/ui/button";

function BadgeAvailable() {
  return (
    <span
      className="rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
      style={{
        background: "rgba(56,189,248,0.1)",
        color: "#38bdf8",
        borderColor: "rgba(56,189,248,0.2)",
      }}
    >
      Available
    </span>
  );
}

export const metadata: Metadata = {
  title: "HaloPSA & ConnectWise Integrations - Handover | MSP Reporting Tool",
  description:
    "Connect your PSA — HaloPSA and ConnectWise supported natively. Generate reports, push back to tickets, and automate weekly updates.",
  alternates: {
    canonical: "https://gethandover.uk/integrations",
  },
};

function BadgeComingSoon({ pulse }: { pulse?: boolean }) {
  return (
    <span
      className={`rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--text-muted)] ${pulse ? "badge-coming-soon-pulse" : ""}`}
    >
      Coming Soon
    </span>
  );
}

export default function IntegrationsPage() {
  return (
    <div
      className="animate-in fade-in duration-300"
      style={{
        background:
          "linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 60%, var(--bg-primary) 100%)",
        minHeight: "100vh",
      }}
    >
      <section className="relative overflow-hidden bg-[var(--bg-primary)] px-6 py-10 md:px-8 md:py-14">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto w-full max-w-[1100px]">
        <div
          className="relative z-[1] mb-4 animate-in fade-in slide-in-from-bottom-4 duration-300 rounded-[var(--radius-lg)] px-8 py-10"
          style={{
            background:
              "linear-gradient(135deg, rgba(15,23,42,0.97) 0%, rgba(15,23,42,0.95) 100%)",
            padding: "2.5rem 2rem",
          }}
        >
          <p
            className="text-[11px] font-semibold uppercase text-[var(--accent)]"
            style={{ letterSpacing: "0.1em" }}
          >
            Integrations
          </p>
          <h1 className="mt-2 text-[28px] font-bold text-white md:text-[32px]">
            Connect your PSA - HaloPSA and ConnectWise supported natively
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-white/60">
            Pull live ticket and project data directly into Handover with native HaloPSA and ConnectWise support.
          </p>
        </div>
        </div>
      </section>

      <section
        className="relative z-[1] bg-[var(--bg-secondary)] px-6 pb-12 pt-8 md:px-8 md:pb-16 md:pt-10"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="mx-auto w-full max-w-[1100px]">
        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            PSA integrations
          </p>
        </div>
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          }}
        >
          <ScrollRevealItem disableAnimation index={0} className="min-w-0">
          <div className="pro-card-wrapper rounded-[var(--radius-lg)] shadow-[0_8px_32px_rgba(56,189,248,0.12)]">
            <CardMouseSpotlight className="pro-card-content integration-card-glass group relative flex min-h-0 flex-col rounded-[calc(var(--radius-lg)-2px)] border border-[var(--border)]/70 p-6 transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-[rgba(56,189,248,0.35)] hover:shadow-[0_4px_20px_rgba(56,189,248,0.08)]">
              <div className="mb-4 flex items-start justify-between gap-3">
                <img
                  src="/halopsa.png"
                  alt="HaloPSA"
                  className="shrink-0"
                  style={{
                    width: "48px",
                    height: "48px",
                    objectFit: "contain",
                    borderRadius: "8px",
                  }}
                />
                <BadgeAvailable />
              </div>
              <h2 className="mb-1 text-[16px] font-semibold text-[var(--text-primary)]">HaloPSA</h2>
              <p className="mb-5 min-h-[40px] text-[13px] leading-relaxed text-[var(--text-secondary)]">
                Pull tickets and projects directly from HaloPSA with one-click import, generation, and push-back.
              </p>
              <Link href="/integrations/halopsa" className="mt-auto">
                <Button className="h-11 w-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]">
                  Explore HaloPSA integration →
                </Button>
              </Link>
            </CardMouseSpotlight>
          </div>
          </ScrollRevealItem>

          <ScrollRevealItem disableAnimation index={1} className="min-w-0">
          <div className="pro-card-wrapper rounded-[var(--radius-lg)] shadow-[0_8px_32px_rgba(56,189,248,0.12)]">
            <CardMouseSpotlight className="pro-card-content integration-card-glass group relative flex min-h-0 flex-col rounded-[calc(var(--radius-lg)-2px)] border border-[var(--border)]/70 p-6 transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-[rgba(56,189,248,0.35)] hover:shadow-[0_4px_20px_rgba(56,189,248,0.08)]">
              <div className="mb-4 flex items-start justify-between gap-3">
                <img
                  src="/connectwise.jpeg"
                  alt="ConnectWise"
                  className="block shrink-0"
                  style={{
                    width: "48px",
                    height: "48px",
                    objectFit: "contain",
                    borderRadius: "8px",
                  }}
                />
                <BadgeAvailable />
              </div>
              <h2 className="mb-1 text-[16px] font-semibold text-[var(--text-primary)]">ConnectWise Manage</h2>
              <p className="mb-5 min-h-[40px] text-[13px] leading-relaxed text-[var(--text-secondary)]">
                Pull service tickets and projects from ConnectWise Manage. Generate outputs and push notes back
                automatically.
              </p>
              <Link href="/integrations/connectwise" className="mt-auto">
                <Button className="h-11 w-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]">
                  Explore ConnectWise integration →
                </Button>
              </Link>
            </CardMouseSpotlight>
          </div>
          </ScrollRevealItem>

          <ScrollRevealItem disableAnimation index={2} className="min-w-0">
          <CardMouseSpotlight className="integration-card-glass pointer-events-none relative flex flex-col rounded-[var(--radius-lg)] border border-[var(--border)]/70 p-6 opacity-[0.65]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div
                className="flex size-12 shrink-0 items-center justify-center rounded-[10px] text-[12px] font-bold text-white"
                style={{ background: "#FF4A00" }}
              >
                Zapier
              </div>
              <BadgeComingSoon />
            </div>
            <h2 className="mb-1 text-[16px] font-semibold text-[var(--text-primary)]">Zapier</h2>
            <p className="mb-5 min-h-[40px] text-[13px] leading-relaxed text-[var(--text-secondary)]">
              Connect any PSA or project management tool to Handover via Zapier. Trigger report generation automatically when tickets are updated.
            </p>
            <Link
              href="/integrations/zapier"
              className="pointer-events-auto mt-auto inline-flex h-11 w-full items-center justify-center text-[13px] font-medium text-[var(--accent)] underline-offset-4 hover:underline"
            >
              Learn more →
            </Link>
          </CardMouseSpotlight>
          </ScrollRevealItem>

          <ScrollRevealItem disableAnimation index={3} className="min-w-0">
          <CardMouseSpotlight className="integration-card-glass relative flex flex-col rounded-[var(--radius-lg)] border border-[var(--border)]/70 p-6 opacity-[0.65] transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:opacity-[0.78]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <img
                src="/autotask.svg"
                alt="Autotask PSA"
                className="block shrink-0 rounded-[10px] bg-white object-contain p-1"
                style={{
                  width: "48px",
                  height: "48px",
                  objectFit: "contain",
                }}
              />
              <BadgeComingSoon />
            </div>
            <h2 className="mb-1 text-[16px] font-semibold text-[var(--text-primary)]">Autotask PSA</h2>
            <p className="mb-5 min-h-[40px] text-[13px] leading-relaxed text-[var(--text-secondary)]">
              Pull tickets from Autotask directly into Handover.
            </p>
            <a
              href="mailto:hello@gethandover.uk?subject=Autotask%20waitlist"
              className="inline-flex h-11 w-full items-center justify-center rounded-[var(--radius)] border border-[var(--border)] px-4 text-[13px] font-medium text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"
            >
              Join waitlist →
            </a>
          </CardMouseSpotlight>
          </ScrollRevealItem>

          <ScrollRevealItem disableAnimation index={4} className="min-w-0">
          <CardMouseSpotlight className="integration-card-glass group relative flex flex-col rounded-[var(--radius-lg)] border border-[var(--border)]/70 p-6 transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-[rgba(56,189,248,0.35)] hover:shadow-[0_4px_20px_rgba(56,189,248,0.08)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <img
                src="/excel.png"
                alt="Excel"
                className="block shrink-0"
                style={{
                  width: "48px",
                  height: "48px",
                  objectFit: "contain",
                  borderRadius: "8px",
                }}
              />
              <BadgeAvailable />
            </div>
            <h2 className="mb-1 text-[16px] font-semibold text-[var(--text-primary)]">CSV / Excel import</h2>
            <p className="mb-5 min-h-[40px] text-[13px] leading-relaxed text-[var(--text-secondary)]">
              Export from any PSA as CSV and paste directly into Handover.
            </p>
            <Link href="/integrations/csv" className="mt-auto">
              <Button variant="outline" className="h-11 w-full border-[var(--border)]">
                View guide
              </Button>
            </Link>
          </CardMouseSpotlight>
          </ScrollRevealItem>

          <ScrollRevealItem disableAnimation index={5} className="min-w-0">
          <CardMouseSpotlight className="integration-card-glass relative flex flex-col rounded-[var(--radius-lg)] border border-[var(--border)]/70 p-6 opacity-[0.65] transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:opacity-[0.78]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <img
                src="/teams.png"
                alt="Microsoft Teams"
                className="block shrink-0"
                style={{
                  width: "48px",
                  height: "48px",
                  objectFit: "contain",
                  borderRadius: "8px",
                }}
              />
              <BadgeComingSoon />
            </div>
            <h2 className="mb-1 text-[16px] font-semibold text-[var(--text-primary)]">Microsoft Teams</h2>
            <p className="mb-5 min-h-[40px] text-[13px] leading-relaxed text-[var(--text-secondary)]">
              Run Handover directly inside Teams. Generate outputs without leaving your workflow.
            </p>
            <a
              href="mailto:hello@gethandover.uk?subject=Teams%20waitlist"
              className="inline-flex h-11 w-full items-center justify-center rounded-[var(--radius)] border border-[var(--border)] px-4 text-[13px] font-medium text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"
            >
              Join waitlist →
            </a>
          </CardMouseSpotlight>
          </ScrollRevealItem>

          <ScrollRevealItem disableAnimation index={6} className="min-w-0">
          <CardMouseSpotlight className="integration-card-glass relative flex flex-col rounded-[var(--radius-lg)] border border-[var(--border)]/70 p-6 opacity-[0.65] transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:opacity-[0.78]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <img
                src="/outlook.png"
                alt="Outlook"
                className="block shrink-0"
                style={{
                  width: "48px",
                  height: "48px",
                  objectFit: "contain",
                  borderRadius: "8px",
                }}
              />
              <BadgeComingSoon />
            </div>
            <h2 className="mb-1 text-[16px] font-semibold text-[var(--text-primary)]">Microsoft Outlook add-in</h2>
            <p className="mb-5 min-h-[40px] text-[13px] leading-relaxed text-[var(--text-secondary)]">
              Generate and insert client emails directly from your Outlook compose window.
            </p>
            <a
              href="mailto:hello@gethandover.uk?subject=Outlook%20waitlist"
              className="inline-flex h-11 w-full items-center justify-center rounded-[var(--radius)] border border-[var(--border)] px-4 text-[13px] font-medium text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"
            >
              Join waitlist →
            </a>
          </CardMouseSpotlight>
          </ScrollRevealItem>
        </div>
        </div>
      </section>

      <section
        className="relative z-[1] bg-[var(--bg-secondary)] px-6 py-10 md:px-8 md:py-14"
        style={{
          borderTop: "1px solid color-mix(in srgb, var(--accent) 18%, var(--border))",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="mx-auto w-full max-w-[1100px]">
          <div className="mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
              Notifications
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">Keep your team informed automatically</h2>
            <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-[var(--text-secondary)]">
              Connect your team&apos;s communication tools to receive automatic alerts when reports are generated.
            </p>
          </div>
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            }}
          >
            <ScrollRevealItem disableAnimation index={0} className="min-w-0">
              <div className="pro-card-wrapper rounded-[var(--radius-lg)] shadow-[0_8px_32px_rgba(56,189,248,0.12)]">
                <CardMouseSpotlight className="pro-card-content integration-card-glass group relative flex min-h-0 flex-col rounded-[calc(var(--radius-lg)-2px)] border border-[var(--border)]/70 p-6 transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-[rgba(56,189,248,0.35)] hover:shadow-[0_4px_20px_rgba(56,189,248,0.08)]">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <img
                      src="/slack.png"
                      alt="Slack"
                      className="shrink-0"
                      style={{
                        width: "48px",
                        height: "48px",
                        objectFit: "contain",
                        borderRadius: "8px",
                      }}
                    />
                    <BadgeAvailable />
                  </div>
                  <h2 className="mb-1 text-[16px] font-semibold text-[var(--text-primary)]">Slack</h2>
                  <p className="mb-5 min-h-[40px] text-[13px] leading-relaxed text-[var(--text-secondary)]">
                    Post automatic report summary alerts to your chosen Slack channel.
                  </p>
                  <Link href="/integrations/slack" className="mt-auto">
                    <Button variant="outline" className="h-11 w-full border-[var(--border)]">
                      Learn more
                    </Button>
                  </Link>
                </CardMouseSpotlight>
              </div>
            </ScrollRevealItem>

            <ScrollRevealItem disableAnimation index={1} className="min-w-0">
              <div className="pro-card-wrapper rounded-[var(--radius-lg)] shadow-[0_8px_32px_rgba(56,189,248,0.12)]">
                <CardMouseSpotlight className="pro-card-content integration-card-glass group relative flex min-h-0 flex-col rounded-[calc(var(--radius-lg)-2px)] border border-[var(--border)]/70 p-6 transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-[rgba(56,189,248,0.35)] hover:shadow-[0_4px_20px_rgba(56,189,248,0.08)]">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <img
                      src="/teams.png"
                      alt="Microsoft Teams"
                      className="shrink-0"
                      style={{
                        width: "48px",
                        height: "48px",
                        objectFit: "contain",
                        borderRadius: "8px",
                      }}
                    />
                    <BadgeAvailable />
                  </div>
                  <h2 className="mb-1 text-[16px] font-semibold text-[var(--text-primary)]">Microsoft Teams</h2>
                  <p className="mb-5 min-h-[40px] text-[13px] leading-relaxed text-[var(--text-secondary)]">
                    Send automatic report summary notifications to your chosen Teams channel.
                  </p>
                  <Link href="/integrations/teams" className="mt-auto">
                    <Button variant="outline" className="h-11 w-full border-[var(--border)]">
                      Learn more
                    </Button>
                  </Link>
                </CardMouseSpotlight>
              </div>
            </ScrollRevealItem>
          </div>
        </div>
      </section>
    </div>
  );
}
