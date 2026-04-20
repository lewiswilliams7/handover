"use client";

import Link from "next/link";
import { Check, Filter, Lock, Plug, Send, ShieldCheck, Zap } from "lucide-react";

import { CardMouseSpotlight } from "@/components/card-mouse-spotlight";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { ScrollRevealItem } from "@/components/scroll-reveal-item";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const cardTransition = "transition-all duration-200 ease-in-out";

const integrationHighlights = [
  [
    "ConnectWise import",
    "Pull service tickets and projects directly from ConnectWise Manage into Handover.",
    "Shipped ✓",
  ],
  [
    "Push back to ConnectWise",
    "Post generated outputs back to ConnectWise tickets as notes automatically.",
    "Shipped ✓",
  ],
  [
    "Scheduled reports for ConnectWise",
    "Automated weekly report generation and delivery for ConnectWise users.",
    "Shipped ✓",
  ],
];

export default function ConnectWiseIntegrationPage() {
  return (
    <MarketingPageLayout>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes cw-hero-border-spin {
            to { transform: rotate(360deg); }
          }
          @keyframes cw-logo-ring-pulse {
            0%, 100% {
              box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 50%, transparent),
                0 0 20px color-mix(in srgb, var(--accent) 25%, transparent);
            }
            50% {
              box-shadow: 0 0 0 10px color-mix(in srgb, var(--accent) 0%, transparent),
                0 0 28px color-mix(in srgb, var(--accent) 35%, transparent);
            }
          }
          @keyframes cw-dash-slide {
            to { background-position: 24px 0; }
          }
          @keyframes cw-shield-pulse {
            0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 40%, transparent); }
            50% { box-shadow: 0 0 0 6px color-mix(in srgb, var(--accent) 15%, transparent); }
          }
          @keyframes cw-amber-dot {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.65; transform: scale(1.15); }
          }
          .cw-hero-spin {
            animation: cw-hero-border-spin 10s linear infinite;
          }
          .cw-logo-ring {
            animation: cw-logo-ring-pulse 3s ease-in-out infinite;
          }
          .cw-steps-dash {
            background: repeating-linear-gradient(
              90deg,
              color-mix(in srgb, var(--accent) 85%, transparent) 0px,
              color-mix(in srgb, var(--accent) 85%, transparent) 10px,
              transparent 10px,
              transparent 20px
            );
            background-size: 24px 2px;
            animation: cw-dash-slide 0.8s linear infinite;
          }
          .cw-reads-grid-bg {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath fill='none' stroke='%2394a3b8' stroke-opacity='0.12' d='M0 .5H32M.5 0V32'/%3E%3C/svg%3E");
          }
          .dark .cw-reads-grid-bg {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath fill='none' stroke='%2364748b' stroke-opacity='0.2' d='M0 .5H32M.5 0V32'/%3E%3C/svg%3E");
          }
          .cw-secure-noise {
            background-color: var(--bg-secondary);
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
          }
          .cw-output-card-prose:hover .cw-check-ico {
            transform: scale(1.2);
            color: var(--accent);
            filter: brightness(1.15);
          }
          .cw-shield-card:hover .cw-shield-ico-wrap {
            animation: cw-shield-pulse 1.2s ease-in-out infinite;
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
                className="cw-hero-spin pointer-events-none absolute -inset-[40%] opacity-70"
                style={{
                  background:
                    "conic-gradient(from 180deg at 50% 50%, transparent 0deg, color-mix(in srgb, var(--accent) 55%, transparent) 80deg, transparent 160deg, color-mix(in srgb, var(--accent) 40%, transparent) 240deg, transparent 360deg)",
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
                  className="absolute right-4 top-4 z-[2] rounded-full border px-2.5 py-0.5 text-[11px] font-medium shadow-sm"
                  style={{
                    background: "rgba(56,189,248,0.1)",
                    color: "#38bdf8",
                    borderColor: "rgba(56,189,248,0.2)",
                  }}
                >
                  Available
                </span>
                <div
                  className="pointer-events-none absolute left-[12%] top-[20%] h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent)] opacity-[0.08] blur-[80px]"
                  aria-hidden
                />
                <Link
                  href="/integrations"
                  className="relative z-[1] text-sm text-[var(--text-secondary)] transition-colors duration-200 hover:text-[var(--text-primary)]"
                >
                  ← Integrations
                </Link>
                <div className="relative z-[1] mt-4 flex items-start gap-4">
                  <div className="relative shrink-0">
                    <div className="cw-logo-ring relative rounded-[12px] p-0.5" style={{ borderRadius: "12px" }}>
                      <img
                        src="/connectwise.jpeg"
                        alt="ConnectWise"
                        className="relative z-[1] block rounded-[10px]"
                        style={{
                          width: "56px",
                          height: "56px",
                          objectFit: "contain",
                        }}
                      />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 pr-2 pt-0 sm:pr-36">
                    <h1
                      className="text-3xl font-semibold sm:text-4xl"
                      style={{
                        background:
                          "linear-gradient(135deg, var(--text-primary) 0%, var(--accent) 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      Native ConnectWise Manage Integration
                    </h1>
                    <p className="mt-2 max-w-3xl text-[var(--text-secondary)]">
                      Connect Handover to ConnectWise Manage, pull your live service tickets and
                      projects, and generate professional client outputs in seconds.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-semibold shadow-sm",
                          cardTransition,
                        )}
                        style={{
                          borderColor: "color-mix(in srgb, var(--success) 45%, var(--border))",
                          background:
                            "color-mix(in srgb, var(--bg-secondary) 88%, var(--success) 12%)",
                          color: "var(--success)",
                          boxShadow:
                            "0 0 16px color-mix(in srgb, var(--success) 22%, transparent)",
                        }}
                      >
                        Official API Integration
                      </span>
                      <span
                        className={cn(
                          "rounded-full border border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] bg-[color-mix(in_srgb,var(--bg-secondary)_92%,var(--accent)_8%)] px-3 py-1 text-xs font-semibold text-white shadow-[0_0_16px_color-mix(in_srgb,var(--accent)_22%,transparent)]",
                          cardTransition,
                        )}
                      >
                        Pro feature
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </ScrollRevealItem>
        </div>
      </section>

      <section className="relative z-[1] bg-[var(--bg-primary)] px-6 pb-10 pt-0 md:px-8">
        <div className="mx-auto w-full max-w-[1100px]">
          <div
            className={cn(
              "flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--success)_35%,var(--border))] bg-[color-mix(in_srgb,var(--success)_8%,var(--bg-secondary))] p-5 sm:flex-row sm:items-center sm:justify-between",
              cardTransition,
            )}
          >
            <div className="flex min-w-0 items-start gap-3">
              <Check className="mt-0.5 size-5 shrink-0 text-[var(--success)]" strokeWidth={2.5} aria-hidden />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--success)]">
                  Available now
                </p>
                <p className="mt-1 text-[14px] leading-relaxed text-[var(--text-secondary)]">
                  ConnectWise Manage is supported in Handover today. Create a free account, open Integrations in the app,
                  and connect your instance in minutes.
                </p>
              </div>
            </div>
            <Link
              href="/auth"
              className={cn(
                "inline-flex h-11 w-full items-center justify-center rounded-[var(--radius)] bg-[var(--accent)] text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--accent-hover)] sm:w-auto sm:min-w-[200px]",
              )}
            >
              Get started →
            </Link>
          </div>
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
                  How it <span className="text-gradient-brand">works</span>
                </h2>
              </ScrollRevealItem>
              <div className="relative mt-8 md:px-4">
                <div
                  className="pointer-events-none absolute top-5 left-[10%] right-[10%] hidden h-[2px] md:block cw-steps-dash opacity-60"
                  aria-hidden
                />
                <div className="grid gap-10 md:grid-cols-4 md:gap-4">
                  {[
                    {
                      t: "Connect once",
                      i: Plug,
                      d: "Enter your ConnectWise site URL, company ID, API keys, and developer Client ID. Credentials are encrypted before storage.",
                    },
                    {
                      t: "Select your work",
                      i: Filter,
                      d: "Filter service tickets and projects by company and date. Choose exactly which client data to include in your handover.",
                    },
                    {
                      t: "Generate in seconds",
                      i: Zap,
                      d: "Handover reads ticket summaries, notes, and context from ConnectWise, then produces five professional outputs at once.",
                    },
                    {
                      t: "Send or export",
                      i: Send,
                      d: "Copy the client email, export actions and risks to Excel, or push summaries back to ConnectWise as ticket notes when available.",
                    },
                  ].map((s, idx) => (
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
                            className="pointer-events-none absolute inline-flex size-14 rounded-full bg-[var(--accent)] opacity-25 blur-lg"
                            aria-hidden
                          />
                          <div className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white ring-4 ring-[var(--bg-primary)]">
                            {idx + 1}
                          </div>
                        </div>
                        <s.i className="relative z-[1] mt-3 size-5 text-[var(--accent)] transition-transform duration-200 group-hover/step:scale-110" />
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
                <h2 className="flex items-center gap-2 text-2xl font-semibold">
                  <Lock className="size-6 shrink-0 text-[var(--accent)]" aria-hidden />
                  Required API permissions
                </h2>
              </ScrollRevealItem>
              <div className="mt-4 space-y-3">
                {[
                  ["read:serviceTickets", "Pull service ticket data", "Required"],
                  ["read:projectTickets", "Pull project ticket data", "Required"],
                  [
                    "write:serviceTicketNotes",
                    "Push generated outputs back to tickets",
                    "Required",
                  ],
                  [
                    "write:projectTicketNotes",
                    "Push generated outputs back to project tickets",
                    "Required",
                  ],
                  ["read:companies", "Fetch client list for filtering", "Required"],
                ].map(([perm, purpose, req], permIdx) => (
                  <ScrollRevealItem key={perm} index={permIdx + 1} className="block">
                    <div
                      className={cn(
                        "grid gap-2 rounded-[var(--radius)] border border-[var(--border)] border-l-[3px] border-l-transparent py-3 pl-3 pr-3 md:grid-cols-[minmax(0,220px)_1fr_auto] md:items-center",
                        cardTransition,
                        "hover:border-[color-mix(in_srgb,var(--accent)_25%,var(--border))] hover:bg-[color-mix(in_srgb,var(--accent)_5%,transparent)] hover:border-l-[var(--accent)]",
                      )}
                    >
                      <span
                        className="inline-flex w-fit max-w-full break-all rounded px-2 py-0.5 font-mono text-[12px] transition-colors duration-200 sm:text-[13px]"
                        style={{ background: "var(--bg-secondary)" }}
                      >
                        {perm}
                      </span>
                      <p className="text-sm text-[var(--text-secondary)]">{purpose}</p>
                      <span
                        className="w-fit rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                          background: "color-mix(in srgb, var(--success) 14%, var(--bg-secondary))",
                          color: "var(--success)",
                          border: "1px solid color-mix(in srgb, var(--success) 28%, var(--border))",
                        }}
                      >
                        {req}
                      </span>
                    </div>
                  </ScrollRevealItem>
                ))}
              </div>

              <ScrollRevealItem index={2} className="block">
                <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
                  Note-level write access is required to post generated Handover content back into
                  ConnectWise. Handover does not modify, delete, or reassign existing ticket records
                  beyond adding notes you choose to push.
                </p>
              </ScrollRevealItem>

              <ScrollRevealItem index={3} className="block">
                <div
                  className="mt-4 rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--accent)_22%,var(--border))] p-5"
                  style={{
                    background:
                      "linear-gradient(135deg, color-mix(in srgb, var(--accent) 8%, transparent), color-mix(in srgb, var(--accent) 2%, transparent))",
                  }}
                >
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    How to add permissions in ConnectWise Manage
                  </h3>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[var(--text-secondary)]">
                    <li>Log into ConnectWise Manage as an administrator.</li>
                    <li>Go to System → Members → API Members.</li>
                    <li>Create or edit an API member for Handover.</li>
                    <li>
                      Under API keys, generate a public/private key pair and assign the security
                      role that includes the permissions above.
                    </li>
                    <li>
                      Register a free integrator Client ID at developer.connectwise.com and include
                      it in API requests (Handover sends it automatically once saved).
                    </li>
                  </ol>
                </div>
              </ScrollRevealItem>
            </section>
          </ScrollRevealItem>
        </div>
      </section>

      <section className="relative z-[1] border-t border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-12 md:px-8 md:py-20">
        <div className="mx-auto w-full max-w-[1100px]">
          <ScrollRevealItem index={3} className="block">
            <section
              className={cn(
                "integration-card-glass relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)]/80 p-8 cw-reads-grid-bg",
                cardTransition,
              )}
            >
              <ScrollRevealItem index={0} className="block">
                <h2 className="text-2xl font-semibold">
                  Everything Handover reads from ConnectWise
                </h2>
              </ScrollRevealItem>
              <div className="relative z-[1] mt-6 grid gap-3 md:grid-cols-2">
                {[
                  "Service ticket summary and description",
                  "Ticket status and priority",
                  "Assigned member/owner",
                  "Company/client name",
                  "Contact name",
                  "Required date and SLA status",
                  "Actual hours logged",
                  "Ticket notes and internal analysis",
                  "Project name and status",
                  "Multiple clients in one import",
                  "Email correspondence on tickets",
                ].map((item, idx) => (
                  <ScrollRevealItem key={item} index={idx + 1} className="min-w-0">
                    <CardMouseSpotlight
                      className={cn(
                        "cw-output-card-prose integration-card-glass group inline-flex w-full items-center gap-2 rounded-[var(--radius)] border border-[var(--border)]/60 px-3 py-2 text-sm text-[var(--text-secondary)]",
                        cardTransition,
                        "hover:border-[color-mix(in_srgb,var(--accent)_30%,var(--border))]",
                      )}
                    >
                      <Check
                        className="cw-check-ico size-4 shrink-0 text-[var(--accent)] transition-all duration-200 ease-in-out"
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
          <ScrollRevealItem index={4} className="block">
            <section
              className={cn(
                "integration-card-glass rounded-[var(--radius-lg)] border border-[var(--border)]/80 p-8",
                cardTransition,
              )}
            >
              <ScrollRevealItem index={0} className="block">
                <h2 className="text-2xl font-semibold">
                  From your ConnectWise data to five outputs in 30 seconds
                </h2>
              </ScrollRevealItem>
              <div className="mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:grid md:snap-none md:grid-cols-5 md:overflow-visible md:pb-0">
                {[
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
                  [
                    "Internal Summary",
                    "Two paragraph internal update for your team or manager.",
                  ],
                  [
                    "Status Report",
                    "Full structured report with RAG status, progress, actions and next steps. Push results back to ConnectWise as notes on Pro.",
                  ],
                ].map(([title, body], idx) => (
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

      <section className="relative z-[1] border-t border-[var(--border)] cw-secure-noise px-6 py-12 md:px-8 md:py-20">
        <div className="mx-auto w-full max-w-[1100px]">
          <ScrollRevealItem index={5} className="block">
            <section
              className={cn(
                "integration-card-glass rounded-[var(--radius-lg)] border border-[var(--border)]/80 bg-[var(--bg-primary)]/80 p-8 backdrop-blur-sm",
                cardTransition,
              )}
            >
              <ScrollRevealItem index={0} className="block">
                <h2 className="text-2xl font-semibold">Secure by design</h2>
              </ScrollRevealItem>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[
                  [
                    "Controlled write access",
                    "Handover uses read scopes to import data and note-write scopes only to add your generated content. It does not change ownership, status, or core ticket fields unless you explicitly use future push features.",
                  ],
                  [
                    "Encrypted credentials",
                    "Your ConnectWise API keys are encrypted using AES-256 before being stored. Never stored in plain text.",
                  ],
                  [
                    "Data not retained",
                    "Your ticket data is processed to generate outputs and is not stored on our servers after generation.",
                  ],
                ].map(([title, body], idx) => (
                  <ScrollRevealItem key={title} index={idx + 1} className="min-w-0">
                    <CardMouseSpotlight
                      className={cn(
                        "cw-shield-card integration-card-glass h-full rounded-[var(--radius)] border border-[var(--border)]/70 p-4",
                        cardTransition,
                        "hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--accent)_25%,var(--border))]",
                      )}
                    >
                      <div className="cw-shield-ico-wrap inline-flex size-10 items-center justify-center rounded-full bg-[var(--accent)] text-white transition-all duration-200">
                        <ShieldCheck className="size-5" aria-hidden />
                      </div>
                      <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{title}</p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">{body}</p>
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
          <ScrollRevealItem index={6} className="block">
            <section
              className={cn(
                "integration-card-glass rounded-[var(--radius-lg)] border border-[var(--border)]/80 p-8",
                cardTransition,
              )}
            >
              <ScrollRevealItem index={0} className="block">
                <h2 className="text-2xl font-semibold">Works with your ConnectWise setup</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Compatible with standard ConnectWise Manage deployments
                </p>
              </ScrollRevealItem>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {["ConnectWise Cloud", "ConnectWise On-Premise", "All subscription tiers"].map(
                  (label, idx) => (
                    <ScrollRevealItem key={label} index={idx + 1} className="min-w-0">
                      <div
                        className={cn(
                          "flex flex-col gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] p-4",
                          cardTransition,
                          "hover:border-[color-mix(in_srgb,var(--accent)_28%,var(--border))] hover:shadow-md",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="flex size-8 shrink-0 items-center justify-center rounded-full"
                            style={{
                              background:
                                "color-mix(in srgb, var(--success) 18%, var(--bg-primary))",
                              color: "var(--success)",
                            }}
                          >
                            <Check className="size-4" strokeWidth={2.5} aria-hidden />
                          </span>
                          <span className="text-sm font-semibold text-[var(--text-primary)]">
                            {label}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)]">Verified compatible</p>
                      </div>
                    </ScrollRevealItem>
                  ),
                )}
              </div>
            </section>
          </ScrollRevealItem>
        </div>
      </section>

      <section className="relative z-[1] border-t border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-12 md:px-8 md:py-20">
        <div className="mx-auto w-full max-w-[1100px]">
          <ScrollRevealItem index={7} className="block">
            <section
              className={cn(
                "integration-card-glass rounded-[var(--radius-lg)] border border-[var(--border)]/80 p-8",
                cardTransition,
              )}
            >
              <ScrollRevealItem index={0} className="block">
                <h2 className="text-2xl font-semibold">What&apos;s next</h2>
              </ScrollRevealItem>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {integrationHighlights.map(([title, body, badge], idx) => {
                  const shipped = badge === "Shipped ✓";
                  return (
                    <ScrollRevealItem key={title} index={idx + 1} className="min-w-0">
                      <CardMouseSpotlight
                        className={cn(
                          "relative h-full overflow-hidden rounded-[var(--radius)] border p-4",
                          cardTransition,
                          shipped
                            ? "border-[color-mix(in_srgb,var(--success)_22%,var(--border))] bg-[color-mix(in_srgb,var(--success)_4%,var(--bg-primary))] hover:border-[color-mix(in_srgb,var(--success)_35%,var(--border))]"
                            : "border-[var(--border)]/70 bg-[var(--bg-primary)]/60 hover:border-[color-mix(in_srgb,var(--accent)_22%,var(--border))]",
                          "hover:-translate-y-0.5 hover:shadow-lg",
                        )}
                      >
                        {shipped ? (
                          <span
                            className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full text-white shadow-md ring-2 ring-[color-mix(in_srgb,var(--success)_35%,transparent)]"
                            style={{
                              background: "var(--success)",
                            }}
                            aria-hidden
                          >
                            <Check className="size-4" strokeWidth={3} />
                          </span>
                        ) : (
                          <span
                            className="absolute right-3 top-3 flex size-2.5 rounded-full bg-[var(--warning)]"
                            style={{
                              boxShadow:
                                "0 0 0 3px color-mix(in srgb, var(--warning) 28%, transparent)",
                              animation: "cw-amber-dot 1.8s ease-in-out infinite",
                            }}
                            aria-hidden
                          />
                        )}
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            shipped
                              ? ""
                              : "bg-[var(--bg-secondary)] text-[var(--text-secondary)]",
                          )}
                          style={
                            shipped
                              ? {
                                  background:
                                    "color-mix(in srgb, var(--success) 14%, var(--bg-secondary))",
                                  color: "var(--success)",
                                }
                              : undefined
                          }
                        >
                          {badge}
                        </span>
                        <p className="mt-2 pr-10 text-sm font-semibold text-[var(--text-primary)]">
                          {title}
                        </p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">{body}</p>
                      </CardMouseSpotlight>
                    </ScrollRevealItem>
                  );
                })}
              </div>
            </section>
          </ScrollRevealItem>
        </div>
      </section>

      <section className="relative z-[1] border-t border-[var(--border)] bg-[var(--sidebar-bg)] px-6 py-12 text-center md:px-8 md:py-20">
        <div className="mx-auto w-full max-w-[1100px]">
          <ScrollRevealItem index={8} className="block">
            <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-8 text-center">
              <Link
                href="/auth"
                className="inline-flex h-11 items-center justify-center rounded-[var(--radius)] bg-[var(--accent)] px-6 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--accent-hover)]"
              >
                Get started free →
              </Link>
            </section>
          </ScrollRevealItem>
        </div>
      </section>
    </MarketingPageLayout>
  );
}
