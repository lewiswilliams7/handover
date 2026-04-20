"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Filter, Plug, Send, Zap } from "lucide-react";

import { CardMouseSpotlight } from "@/components/card-mouse-spotlight";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { ScrollRevealItem } from "@/components/scroll-reveal-item";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ZAPIER_ORANGE = "#FF4A00";

const cardTransition = "transition-all duration-200 ease-in-out";

const whatItDoes = [
  "Connect Handover to 6,000+ apps via Zapier",
  "Trigger report generation automatically when tickets are created or updated in any PSA",
  "Works with Autotask, Datto, Freshservice, Jira, and any other Zapier-connected tool",
  "Generated outputs pushed back to your PSA automatically",
  "Schedule reports or trigger them on demand",
] as const;

const howItWorksSteps = [
  {
    t: "Connect your PSA to Zapier as the trigger",
    i: Plug,
    d: "Choose your PSA or project tool in Zapier and fire the Zap whenever tickets are created or updated.",
  },
  {
    t: "Add Handover as the action",
    i: Zap,
    d: "Add Handover as a Zap step so each ticket update can kick off a new Handover generation run.",
  },
  {
    t: "Map your ticket fields to Handover",
    i: Filter,
    d: "Map subject, description, status, and client fields from your tool into Handover so reports match your workflow.",
  },
  {
    t: "Reports generate automatically every time a ticket is updated",
    i: Send,
    d: "Handover generates outputs on each qualifying update - schedule batch runs or trigger on demand from your Zap.",
  },
] as const;

const supportedTools = [
  "Autotask",
  "Datto",
  "Freshservice",
  "Jira Service Management",
  "Zendesk",
  "Monday.com",
] as const;

function ZapierLogo() {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className="relative z-[1] flex size-[56px] shrink-0 items-center justify-center rounded-[10px] text-lg font-bold tracking-tight text-white shadow-inner"
        style={{ backgroundColor: ZAPIER_ORANGE }}
        aria-hidden
      >
        Z
      </div>
    );
  }
  return (
    <img
      src="/zapier.png"
      alt="Zapier"
      className="relative z-[1] block rounded-[10px]"
      style={{ width: "56px", height: "56px", objectFit: "contain" }}
      onError={() => setFailed(true)}
    />
  );
}

export default function ZapierIntegrationPage() {
  return (
    <MarketingPageLayout>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes zp-hero-border-spin {
            to { transform: rotate(360deg); }
          }
          @keyframes zp-logo-ring-pulse {
            0%, 100% {
              box-shadow: 0 0 0 0 color-mix(in srgb, ${ZAPIER_ORANGE} 50%, transparent),
                0 0 20px color-mix(in srgb, ${ZAPIER_ORANGE} 25%, transparent);
            }
            50% {
              box-shadow: 0 0 0 10px color-mix(in srgb, ${ZAPIER_ORANGE} 0%, transparent),
                0 0 28px color-mix(in srgb, ${ZAPIER_ORANGE} 35%, transparent);
            }
          }
          @keyframes zp-dash-slide {
            to { background-position: 24px 0; }
          }
          .zp-hero-spin {
            animation: zp-hero-border-spin 10s linear infinite;
          }
          .zp-logo-ring {
            animation: zp-logo-ring-pulse 3s ease-in-out infinite;
          }
          .zp-steps-dash {
            background: repeating-linear-gradient(
              90deg,
              color-mix(in srgb, ${ZAPIER_ORANGE} 85%, transparent) 0px,
              color-mix(in srgb, ${ZAPIER_ORANGE} 85%, transparent) 10px,
              transparent 10px,
              transparent 20px
            );
            background-size: 24px 2px;
            animation: zp-dash-slide 0.8s linear infinite;
          }
          .zp-reads-grid-bg {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath fill='none' stroke='%2394a3b8' stroke-opacity='0.12' d='M0 .5H32M.5 0V32'/%3E%3C/svg%3E");
          }
          .dark .zp-reads-grid-bg {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath fill='none' stroke='%2364748b' stroke-opacity='0.2' d='M0 .5H32M.5 0V32'/%3E%3C/svg%3E");
          }
        `,
        }}
      />

      <section className="relative z-[1] overflow-hidden bg-[var(--bg-primary)] px-6 py-12 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto w-full max-w-[1100px]">
          <ScrollRevealItem index={0} className="block">
            <div className="relative rounded-[var(--radius-lg)] p-[1px]">
              <div
                className="zp-hero-spin pointer-events-none absolute -inset-[40%] opacity-70"
                style={{
                  background: `conic-gradient(from 180deg at 50% 50%, transparent 0deg, color-mix(in srgb, ${ZAPIER_ORANGE} 55%, transparent) 80deg, transparent 160deg, color-mix(in srgb, ${ZAPIER_ORANGE} 40%, transparent) 240deg, transparent 360deg)`,
                }}
                aria-hidden
              />
              <section
                className={cn(
                  "integration-card-glass animate-in fade-in slide-in-from-bottom-4 duration-300 relative overflow-hidden rounded-[calc(var(--radius-lg)-1px)] border border-[var(--border)]/60 bg-[var(--bg-primary)] p-8",
                  cardTransition,
                )}
              >
                <span
                  className="absolute right-4 top-4 z-[2] rounded-full px-3 py-1 text-[11px] font-semibold text-white shadow-md ring-1"
                  style={{
                    background: `color-mix(in srgb, ${ZAPIER_ORANGE} 92%, var(--bg-primary))`,
                    color: "#fff",
                    borderColor: `color-mix(in srgb, ${ZAPIER_ORANGE} 45%, var(--border))`,
                    boxShadow: `0 0 16px color-mix(in srgb, ${ZAPIER_ORANGE} 28%, transparent)`,
                  }}
                >
                  Coming Soon
                </span>
                <div
                  className="pointer-events-none absolute left-[12%] top-[20%] h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.12] blur-[80px]"
                  style={{ background: ZAPIER_ORANGE }}
                  aria-hidden
                />
                <Link
                  href="/integrations"
                  className="relative z-[1] text-sm text-[var(--text-secondary)] transition-colors duration-200 hover:text-[var(--text-primary)]"
                >
                  ← Integrations
                </Link>
                <div className="relative z-[1] mt-4 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-4">
                  <div className="relative shrink-0">
                    <div
                      className="zp-logo-ring relative rounded-[10px] p-0.5"
                      style={{ borderRadius: "12px" }}
                    >
                      <ZapierLogo />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 pr-2 pt-0 sm:pr-36">
                    <h1
                      className="text-3xl font-semibold sm:text-4xl"
                      style={{
                        background: `linear-gradient(135deg, var(--text-primary) 0%, ${ZAPIER_ORANGE} 100%)`,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      Handover + Zapier
                    </h1>
                    <p className="mt-2 max-w-3xl text-[var(--text-secondary)]">
                      Connect any PSA or project management tool to Handover and trigger automatic
                      report generation when tickets are updated.
                    </p>
                    <div className="mt-6">
                      <Link href="/contact?plan=zapier">
                        <Button
                          className="text-white hover:opacity-95"
                          style={{ backgroundColor: ZAPIER_ORANGE }}
                        >
                          Join waitlist
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </ScrollRevealItem>
        </div>
      </section>

      <section className="relative z-[1] border-t border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-12 md:px-8 md:py-20">
        <div className="mx-auto w-full max-w-[1100px]">
          <ScrollRevealItem index={1} className="block">
            <section
              className={cn(
                "integration-card-glass rounded-[var(--radius-lg)] border border-[var(--border)]/80 p-8",
                cardTransition,
              )}
            >
              <ScrollRevealItem index={0} className="block">
                <h2 className="text-2xl font-semibold">
                  What it <span className="text-gradient-brand">does</span>
                </h2>
              </ScrollRevealItem>
              <div className="relative z-[1] mt-6 grid gap-3 md:grid-cols-1">
                {whatItDoes.map((item, idx) => (
                  <ScrollRevealItem key={item} index={idx + 1} className="min-w-0">
                    <CardMouseSpotlight
                      className={cn(
                        "integration-card-glass group inline-flex w-full items-center gap-2 rounded-[var(--radius)] border border-[var(--border)]/60 px-3 py-2 text-sm text-[var(--text-secondary)]",
                        cardTransition,
                        "hover:border-[color-mix(in_srgb,var(--accent)_30%,var(--border))]",
                      )}
                    >
                      <Check
                        className="size-4 shrink-0 transition-all duration-200 ease-in-out group-hover:scale-110"
                        style={{ color: ZAPIER_ORANGE }}
                        aria-hidden
                      />{" "}
                      {item}
                    </CardMouseSpotlight>
                  </ScrollRevealItem>
                ))}
              </div>
            </section>
          </ScrollRevealItem>
        </div>
      </section>

      <section className="relative z-[1] border-t border-[var(--border)] bg-[var(--bg-primary)] px-6 py-12 md:px-8 md:py-20">
        <div className="mx-auto w-full max-w-[1100px]">
          <ScrollRevealItem index={2} className="block">
            <section
              className={cn(
                "integration-card-glass rounded-[var(--radius-lg)] border border-[var(--border)]/80 p-8",
                cardTransition,
              )}
            >
              <ScrollRevealItem index={0} className="block">
                <h2 className="text-2xl font-semibold">
                  How it <span className="text-gradient-brand">works</span>
                </h2>
              </ScrollRevealItem>
              <div className="relative mt-8 md:px-4">
                <div
                  className="pointer-events-none absolute top-5 left-[10%] right-[10%] hidden h-[2px] md:block zp-steps-dash opacity-60"
                  aria-hidden
                />
                <div className="grid gap-10 md:grid-cols-4 md:gap-4">
                  {howItWorksSteps.map((s, idx) => (
                    <ScrollRevealItem key={s.t} index={idx + 1} className="min-w-0">
                      <CardMouseSpotlight
                        className={cn(
                          "integration-card-glass group/step flex flex-col items-center rounded-[var(--radius-lg)] border border-[var(--border)]/70 p-4 text-center",
                          cardTransition,
                          "hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--accent)_35%,var(--border))] hover:shadow-[0_12px_40px_-12px_color-mix(in_srgb,var(--accent)_25%,transparent)]",
                        )}
                      >
                        <div className="relative z-[1] flex shrink-0 items-center justify-center">
                          <span
                            className="pointer-events-none absolute inline-flex size-14 rounded-full opacity-25 blur-lg"
                            style={{ background: ZAPIER_ORANGE }}
                            aria-hidden
                          />
                          <div
                            className="relative flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ring-4 ring-[var(--bg-primary)]"
                            style={{ backgroundColor: ZAPIER_ORANGE }}
                          >
                            {idx + 1}
                          </div>
                        </div>
                        <s.i
                          className="relative z-[1] mt-3 size-5 transition-transform duration-200 group-hover/step:scale-110"
                          style={{ color: ZAPIER_ORANGE }}
                        />
                        <p className="relative z-[1] mt-2 text-sm font-semibold text-[var(--text-primary)]">
                          {s.t}
                        </p>
                        <p className="relative z-[1] mt-1 text-sm text-[var(--text-secondary)]">
                          {s.d}
                        </p>
                      </CardMouseSpotlight>
                    </ScrollRevealItem>
                  ))}
                </div>
              </div>
            </section>
          </ScrollRevealItem>
        </div>
      </section>

      <section className="relative z-[1] border-t border-[var(--border)] zp-reads-grid-bg bg-[var(--bg-secondary)] px-6 py-12 md:px-8 md:py-20">
        <div className="mx-auto w-full max-w-[1100px]">
          <ScrollRevealItem index={3} className="block">
            <section
              className={cn(
                "integration-card-glass relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)]/80 p-8",
                cardTransition,
              )}
            >
              <ScrollRevealItem index={0} className="block">
                <h2 className="text-2xl font-semibold">Supported tools</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Works with any Zapier-connected tool
                </p>
              </ScrollRevealItem>
              <div className="relative z-[1] mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {supportedTools.map((name, idx) => (
                  <ScrollRevealItem key={name} index={idx + 1} className="min-w-0">
                    <CardMouseSpotlight
                      className={cn(
                        "integration-card-glass flex min-h-[88px] flex-col items-center justify-center rounded-[var(--radius-lg)] border border-[var(--border)]/70 p-4 text-center",
                        cardTransition,
                        "hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--accent)_28%,var(--border))] hover:shadow-md",
                      )}
                    >
                      <span
                        className="flex size-12 items-center justify-center rounded-[10px] text-sm font-bold text-white shadow-inner"
                        style={{
                          background: `linear-gradient(135deg, ${ZAPIER_ORANGE}, color-mix(in srgb, ${ZAPIER_ORANGE} 70%, #000))`,
                        }}
                        aria-hidden
                      >
                        {name
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 3)}
                      </span>
                      <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">{name}</p>
                    </CardMouseSpotlight>
                  </ScrollRevealItem>
                ))}
              </div>
            </section>
          </ScrollRevealItem>
        </div>
      </section>

      <section className="relative z-[1] border-t border-[var(--border)] bg-[var(--sidebar-bg)] px-6 py-12 text-center md:px-8 md:py-20">
        <div className="mx-auto w-full max-w-[1100px]">
          <ScrollRevealItem index={4} className="block">
            <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-8 text-center">
              <p className="text-lg font-medium text-[var(--text-primary)]">
                Join the waitlist to be notified when Zapier integration launches
              </p>
              <div className="mt-6 flex justify-center">
                <Link href="/contact?plan=zapier">
                  <Button
                    className="text-white hover:opacity-95"
                    style={{ backgroundColor: ZAPIER_ORANGE }}
                  >
                    Join waitlist
                  </Button>
                </Link>
              </div>
            </section>
          </ScrollRevealItem>
        </div>
      </section>

      <section className="relative z-[1] border-t border-[var(--border)] bg-[var(--bg-primary)] px-6 py-8 text-center md:px-8">
        <p className="text-[13px] text-[var(--text-muted)]">
          <Link
            href="/integrations"
            className="font-medium text-[var(--accent)] underline-offset-2 transition-colors hover:underline"
          >
            ← Back to all integrations
          </Link>
        </p>
      </section>
    </MarketingPageLayout>
  );
}
