"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  Filter,
  Lock,
  Plug,
  Send,
  ShieldCheck,
  Zap,
} from "lucide-react";

import { CardMouseSpotlight } from "@/components/card-mouse-spotlight";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { ScrollRevealItem } from "@/components/scroll-reveal-item";
import { UpgradePlanCards } from "@/components/upgrade-plan-cards";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  STRIPE_PRO_ANNUAL_PRICE_ID,
  STRIPE_PRO_MONTHLY_PRICE_ID,
} from "@/lib/stripe-price-ids";
import { createClient } from "@/lib/supabase";
import { getUserPlan, hasProTierAccess } from "@/lib/utils/getPlan";
import { cn } from "@/lib/utils";

const cardTransition = "transition-all duration-200 ease-in-out";

const integrationHighlights = [
  [
    "Push to HaloPSA",
    "Generated outputs post directly back into your HaloPSA tickets and projects as notes. Your ticket history stays current automatically - no copy-pasting, no tab-switching.",
    "Shipped ✓",
  ],
  [
    "Scheduled weekly reports",
    "Set a day and time, choose your clients, and Handover runs automatically. Reports generate, deliver to your inbox, and push back into HaloPSA - without you touching anything.",
    "Shipped ✓",
  ],
  [
    "ConnectWise integration",
    "Native ConnectWise Manage integration - pull tickets, generate outputs, push notes back. Same workflow, broader PSA coverage.",
    "Shipped ✓",
  ],
] as const;

export default function HaloPsaIntegrationPage() {
  const [signedIn, setSignedIn] = useState(false);
  const [plan, setPlan] = useState<"free" | "pro" | null>(null);
  const [connected, setConnected] = useState(false);
  const [proUpgradeOpen, setProUpgradeOpen] = useState(false);
  const [checkoutLoadingPriceId, setCheckoutLoadingPriceId] = useState<string | null>(null);
  const [stripeMonthlyPayingPlan, setStripeMonthlyPayingPlan] = useState<
    "professional" | "team" | null
  >(null);
  const [portalNavigating, setPortalNavigating] = useState(false);

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSignedIn(false);
        setPlan(null);
        setConnected(false);
        return;
      }
      setSignedIn(true);
      const pf = await getUserPlan(supabase, user.id);
      setPlan(hasProTierAccess(pf) ? "pro" : "free");
      const res = await fetch("/api/halo/connect");
      const data = (await res.json()) as { connected?: boolean };
      setConnected(Boolean(data.connected));
    })();
  }, []);

  useEffect(() => {
    if (!signedIn) {
      setStripeMonthlyPayingPlan(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/stripe/subscription-billing", { credentials: "include" });
        if (!res.ok || cancelled) return;
        const body = (await res.json()) as {
          activeMonthlyPayingSubscription?: boolean;
          plan?: "professional" | "team" | null;
        };
        if (cancelled) return;
        setStripeMonthlyPayingPlan(
          body.activeMonthlyPayingSubscription && body.plan ? body.plan : null,
        );
      } catch {
        if (!cancelled) setStripeMonthlyPayingPlan(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const openBillingPortal = useCallback(async () => {
    if (portalNavigating) return;
    setPortalNavigating(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnPath: "/integrations/halopsa" }),
        credentials: "include",
      });
      const data = (await res.json()) as { url?: string };
      if (data.url) window.location.href = data.url;
    } finally {
      setPortalNavigating(false);
    }
  }, [portalNavigating]);

  const startCheckout = async (priceId: string) => {
    if (checkoutLoadingPriceId || !priceId) return;
    setCheckoutLoadingPriceId(priceId);
    try {
      const gateRes = await fetch("/api/stripe/has-billing-customer", { credentials: "include" });
      const gate = (await gateRes.json()) as { hasStripeCustomer?: boolean };
      if (gate.hasStripeCustomer) {
        setCheckoutLoadingPriceId(null);
        await openBillingPortal();
        return;
      }
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ priceId }),
      });
      const data = (await res.json()) as { url?: string };
      if (data.url) window.location.href = data.url;
    } finally {
      setCheckoutLoadingPriceId(null);
    }
  };

  return (
    <MarketingPageLayout>
      <Dialog open={proUpgradeOpen} onOpenChange={setProUpgradeOpen}>
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Move to Handover</DialogTitle>
            <DialogDescription>
              Unlock HaloPSA import, automation, and the complete Handover workspace. Choose monthly or annual billing.
            </DialogDescription>
          </DialogHeader>
          <UpgradePlanCards
            className="mt-2"
            onUpgrade={(id) => void startCheckout(id)}
            loadingPriceId={checkoutLoadingPriceId}
            monthlyPayingSubscription={stripeMonthlyPayingPlan}
            onSwitchToAnnualPortal={() => void openBillingPortal()}
            portalLoading={portalNavigating}
          />
        </DialogContent>
      </Dialog>

      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes halo-hero-border-spin {
            to { transform: rotate(360deg); }
          }
          @keyframes halo-logo-ring-pulse {
            0%, 100% {
              box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 50%, transparent),
                0 0 20px color-mix(in srgb, var(--accent) 25%, transparent);
            }
            50% {
              box-shadow: 0 0 0 10px color-mix(in srgb, var(--accent) 0%, transparent),
                0 0 28px color-mix(in srgb, var(--accent) 35%, transparent);
            }
          }
          @keyframes halo-dash-slide {
            to { background-position: 24px 0; }
          }
          @keyframes halo-shield-pulse {
            0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 40%, transparent); }
            50% { box-shadow: 0 0 0 6px color-mix(in srgb, var(--accent) 15%, transparent); }
          }
          @keyframes halo-amber-dot {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.65; transform: scale(1.15); }
          }
          .halo-hero-spin {
            animation: halo-hero-border-spin 10s linear infinite;
          }
          .halo-logo-ring {
            animation: halo-logo-ring-pulse 3s ease-in-out infinite;
          }
          .halo-steps-dash {
            background: repeating-linear-gradient(
              90deg,
              color-mix(in srgb, var(--accent) 85%, transparent) 0px,
              color-mix(in srgb, var(--accent) 85%, transparent) 10px,
              transparent 10px,
              transparent 20px
            );
            background-size: 24px 2px;
            animation: halo-dash-slide 0.8s linear infinite;
          }
          .halo-reads-grid-bg {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath fill='none' stroke='%2394a3b8' stroke-opacity='0.12' d='M0 .5H32M.5 0V32'/%3E%3C/svg%3E");
          }
          .dark .halo-reads-grid-bg {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath fill='none' stroke='%2364748b' stroke-opacity='0.2' d='M0 .5H32M.5 0V32'/%3E%3C/svg%3E");
          }
          .halo-secure-noise {
            background-color: var(--bg-secondary);
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
          }
          .halo-output-card-prose:hover .halo-check-ico {
            transform: scale(1.2);
            color: var(--accent);
            filter: brightness(1.15);
          }
          .halo-shield-card:hover .halo-shield-ico-wrap {
            animation: halo-shield-pulse 1.2s ease-in-out infinite;
          }
        `,
        }}
      />

      <section className="relative z-[1] overflow-hidden bg-transparent px-6 py-12 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto w-full max-w-[1100px]">
          <ScrollRevealItem index={0} className="block">
            <div className="relative rounded-[var(--radius-lg)] p-[1px]">
              <div
                className="halo-hero-spin pointer-events-none absolute -inset-[40%] opacity-70"
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
                <span className="absolute right-4 top-4 z-[2] rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white shadow-md ring-1 ring-emerald-400/40 dark:bg-emerald-500">
                  Now on HaloPSA Marketplace
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
                    <div
                      className="halo-logo-ring relative rounded-[10px] p-0.5"
                      style={{ borderRadius: "12px" }}
                    >
                      <img
                        src="/halopsa.png"
                        alt="HaloPSA"
                        className="relative z-[1] block rounded-[10px]"
                        style={{
                          width: "56px",
                          height: "56px",
                          objectFit: "contain",
                        }}
                      />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 pr-2 pt-0 sm:pr-28">
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
                      Native HaloPSA Integration
                    </h1>
                    <p className="mt-2 max-w-3xl text-[var(--text-secondary)]">
                      The only reporting tool that connects directly to HaloPSA, pulls your live
                      ticket data, and generates professional client outputs in seconds.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={cn(
                          "rounded-full border border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] bg-[color-mix(in_srgb,var(--bg-secondary)_92%,var(--accent)_8%)] px-3 py-1 text-xs font-semibold text-white shadow-[0_0_16px_color-mix(in_srgb,var(--accent)_22%,transparent)]",
                          cardTransition,
                        )}
                      >
                        Official API Integration
                      </span>
                      <span
                        className={cn(
                          "rounded-full border border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] bg-[color-mix(in_srgb,var(--bg-secondary)_92%,var(--accent)_8%)] px-3 py-1 text-xs font-semibold text-white shadow-[0_0_16px_color-mix(in_srgb,var(--accent)_22%,transparent)]",
                          cardTransition,
                        )}
                      >
                        Import + post notes
                      </span>
                    </div>
                    <p className="mt-3 max-w-3xl text-[13px] text-[var(--text-secondary)]">
                      <Link
                        href="/blog/best-halopsa-reporting-tools"
                        className="text-[var(--accent)] underline-offset-2 transition-colors hover:underline"
                      >
                        See how Handover compares to other HaloPSA reporting tools →
                      </Link>
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </ScrollRevealItem>
        </div>
      </section>

      <section className="relative z-[1] bg-transparent px-6 py-12 md:px-8 md:py-20">
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
                  className="pointer-events-none absolute top-5 left-[10%] right-[10%] hidden h-[2px] md:block halo-steps-dash opacity-60"
                  aria-hidden
                />
                <div className="grid gap-10 md:grid-cols-4 md:gap-4">
                  {[
                    {
                      t: "Connect once",
                      i: Plug,
                      d: "Enter your HaloPSA URL and API credentials. Takes 2 minutes. Your credentials are encrypted before storage.",
                    },
                    {
                      t: "Select your tickets",
                      i: Filter,
                      d: "Filter by client, date range and status. Choose exactly which tickets to include. Works with any HaloPSA instance.",
                    },
                    {
                      t: "Generate in 30 seconds",
                      i: Zap,
                      d: "Handover reads your ticket data, understands the context, and generates five professional outputs simultaneously.",
                    },
                    {
                      t: "Send or export",
                      i: Send,
                      d: "Copy the client email directly, export the action log to Excel, or open your mail client with one click.",
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

      <section className="relative z-[1] bg-transparent px-6 py-12 md:px-8 md:py-20">
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
                  ["read:tickets", "Pull ticket data for import", "Required"],
                  ["read:projects", "Pull project data for import", "Required"],
                  [
                    "edit:tickets",
                    "Required for pushing generated outputs back to tickets as notes",
                    "Required",
                  ],
                  [
                    "edit:projects",
                    "Required for pushing generated outputs back to projects as notes",
                    "Required",
                  ],
                  ["read:customers", "Fetch client list for filtering", "Required"],
                ].map(([perm, purpose, req], permIdx) => (
                  <ScrollRevealItem key={perm} index={permIdx + 1} className="block">
                    <div
                      className={cn(
                        "grid gap-2 rounded-[var(--radius)] border border-[var(--border)] border-l-[3px] border-l-transparent py-3 pl-3 pr-3 md:grid-cols-[180px_1fr_auto] md:items-center",
                        cardTransition,
                        "hover:border-[color-mix(in_srgb,var(--accent)_25%,var(--border))] hover:bg-[color-mix(in_srgb,var(--accent)_5%,transparent)] hover:border-l-[var(--accent)]",
                      )}
                    >
                      <span
                        className="inline-flex w-fit rounded px-2 py-0.5 font-mono text-[13px] transition-colors duration-200"
                        style={{ background: "var(--bg-secondary)" }}
                      >
                        {perm}
                      </span>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {purpose}
                        {perm === "read:projects"
                          ? " - Without this permission the Projects tab in Handover will return no results"
                          : ""}
                      </p>
                      <span className="w-fit rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                        {req}
                      </span>
                    </div>
                  </ScrollRevealItem>
                ))}
              </div>

              <ScrollRevealItem index={2} className="block">
                <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
                  Edit access is required to post generated Handover reports back into your HaloPSA
                  tickets and projects as notes. Handover does not modify, delete, or reassign any
                  existing ticket data.
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
                    How to add API permissions in HaloPSA
                  </h3>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[var(--text-secondary)]">
                    <li>Log into your HaloPSA instance</li>
                    <li>Go to Configuration → Integrations → Halo API</li>
                    <li>Click View Applications</li>
                    <li>Click on your Handover application</li>
                    <li>Go to the Permissions tab</li>
                    <li>
                      Tick the following permissions:
                      <ul className="mt-1 list-disc pl-5">
                        <li>read:tickets</li>
                        <li>read:projects</li>
                        <li>
                          edit:tickets - required for pushing generated outputs back to tickets as
                          notes
                        </li>
                        <li>
                          edit:projects - required for pushing generated outputs back to projects as
                          notes
                        </li>
                        <li>read:customers</li>
                      </ul>
                    </li>
                    <li>Click Save</li>
                  </ol>
                </div>
              </ScrollRevealItem>

              <ScrollRevealItem index={4} className="block">
                <div
                  className="mt-4 rounded-[var(--radius)] p-4"
                  style={{
                    background: "rgba(186,117,23,0.05)",
                    border: "1px solid rgba(186,117,23,0.2)",
                    borderLeft: "3px solid #BA7517",
                  }}
                >
                  <div className="inline-flex items-center gap-2 text-[#BA7517]">
                    <AlertTriangle className="size-4" />
                    <p className="text-sm font-semibold">Projects not showing?</p>
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    If the Projects tab shows no results, the most common cause is a missing
                    read:projects permission on your HaloPSA API application. Follow step 6 above
                    and make sure read:projects is ticked, then reconnect Handover.
                  </p>
                </div>
              </ScrollRevealItem>
            </section>
          </ScrollRevealItem>
        </div>
      </section>

      <section className="relative z-[1] bg-transparent px-6 py-12 md:px-8 md:py-20">
        <div className="mx-auto w-full max-w-[1100px]">
          <ScrollRevealItem index={3} className="block">
            <section
              className={cn(
                "integration-card-glass relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)]/80 p-8 halo-reads-grid-bg",
                cardTransition,
              )}
            >
              <ScrollRevealItem index={0} className="block">
                <h2 className="text-2xl font-semibold">Everything Handover reads from HaloPSA</h2>
              </ScrollRevealItem>
              <div className="relative z-[1] mt-6 grid gap-3 md:grid-cols-2">
                {[
                  "Ticket title and description",
                  "Ticket status (New, In Progress, On Hold, Completed)",
                  "Assigned agent",
                  "Customer / client name",
                  "Target date and SLA status",
                  "Flagged status",
                  "Time logged",
                  "Project name and status",
                  "Priority level",
                  "Ticket comments and notes",
                  "Email correspondence included",
                  "Date created",
                  "Child tickets",
                  "Custom fields (where available)",
                  "Multiple clients in one import",
                ].map((item, idx) => (
                  <ScrollRevealItem key={item} index={idx + 1} className="min-w-0">
                    <CardMouseSpotlight
                      className={cn(
                        "halo-output-card-prose integration-card-glass group inline-flex w-full items-center gap-2 rounded-[var(--radius)] border border-[var(--border)]/60 px-3 py-2 text-sm text-[var(--text-secondary)]",
                        cardTransition,
                        "hover:border-[color-mix(in_srgb,var(--accent)_30%,var(--border))]",
                      )}
                    >
                      <Check
                        className="halo-check-ico size-4 shrink-0 text-[var(--accent)] transition-all duration-200 ease-in-out"
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

      <section className="relative z-[1] bg-transparent px-6 py-12 md:px-8 md:py-20">
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
                  From your HaloPSA data to five outputs in 30 seconds
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
                    "Full structured report with RAG status, progress, actions and next steps. Push results back to HaloPSA as notes on Pro.",
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

      <section className="relative z-[1] halo-secure-noise px-6 py-12 md:px-8 md:py-20">
        <div className="mx-auto w-full max-w-[1100px]">
          <ScrollRevealItem index={5} className="block">
            <section
              className={cn(
                "integration-card-glass rounded-xl bg-white/[0.03] backdrop-blur-md border border-white/[0.07] p-8",
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
                    "Handover uses read scopes to import data and edit:tickets / edit:projects only to add notes with your generated reports. It does not modify, delete, or reassign existing ticket data.",
                  ],
                  [
                    "Encrypted credentials",
                    "Your HaloPSA API credentials are encrypted using AES-256 before being stored. Never stored in plain text.",
                  ],
                  [
                    "Data not retained",
                    "Your ticket data is processed to generate outputs and is not stored on our servers after generation.",
                  ],
                ].map(([title, body], idx) => (
                  <ScrollRevealItem key={title} index={idx + 1} className="min-w-0">
                    <CardMouseSpotlight
                      className={cn(
                        "halo-shield-card integration-card-glass h-full rounded-[var(--radius)] border border-[var(--border)]/70 p-4",
                        cardTransition,
                        "hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--accent)_25%,var(--border))]",
                      )}
                    >
                      <div className="halo-shield-ico-wrap inline-flex size-10 items-center justify-center rounded-full bg-[var(--accent)] text-white transition-all duration-200">
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

      <section className="relative z-[1] bg-transparent px-6 py-12 md:px-8 md:py-20">
        <div className="mx-auto w-full max-w-[1100px]">
          <ScrollRevealItem index={6} className="block">
            <section
              className={cn(
                "integration-card-glass rounded-[var(--radius-lg)] border border-[var(--border)]/80 p-8",
                cardTransition,
              )}
            >
              <ScrollRevealItem index={0} className="block">
                <h2 className="text-2xl font-semibold">Works with your HaloPSA setup</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Compatible with all HaloPSA instances and versions
                </p>
              </ScrollRevealItem>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {["HaloPSA Cloud", "HaloPSA On-Premise", "All subscription tiers"].map((label, idx) => (
                  <ScrollRevealItem key={label} index={idx + 1} className="min-w-0">
                    <div
                      className={cn(
                        "flex flex-col gap-2 rounded-xl bg-white/[0.03] backdrop-blur-md border border-white/[0.07] p-4",
                        cardTransition,
                        "hover:border-[color-mix(in_srgb,var(--accent)_28%,var(--border))] hover:shadow-md",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                          <Check className="size-4" strokeWidth={2.5} aria-hidden />
                        </span>
                        <span className="text-sm font-semibold text-[var(--text-primary)]">{label}</span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)]">Verified compatible</p>
                    </div>
                  </ScrollRevealItem>
                ))}
              </div>
            </section>
          </ScrollRevealItem>
        </div>
      </section>

      <section className="relative z-[1] bg-transparent px-6 py-12 md:px-8 md:py-20">
        <div className="mx-auto w-full max-w-[1100px]">
          <ScrollRevealItem index={7} className="block">
            <section
              className={cn(
                "integration-card-glass rounded-[var(--radius-lg)] border border-[var(--border)]/80 p-8",
                cardTransition,
              )}
            >
              <ScrollRevealItem index={0} className="block">
                <h2 className="text-2xl font-semibold">Integration highlights</h2>
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
                            ? "border-emerald-500/20 bg-emerald-500/[0.04] hover:border-emerald-500/35"
                            : "border-[var(--border)]/70 bg-[var(--bg-primary)]/60 hover:border-[color-mix(in_srgb,var(--accent)_22%,var(--border))]",
                          "hover:-translate-y-0.5 hover:shadow-lg",
                        )}
                      >
                        {shipped ? (
                          <span
                            className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md ring-2 ring-emerald-400/30 dark:bg-emerald-600"
                            aria-hidden
                          >
                            <Check className="size-4" strokeWidth={3} />
                          </span>
                        ) : (
                          <span
                            className="absolute right-3 top-3 flex size-2.5 rounded-full bg-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.25)]"
                            style={{ animation: "halo-amber-dot 1.8s ease-in-out infinite" }}
                            aria-hidden
                          />
                        )}
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            shipped
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/45 dark:text-emerald-200"
                              : "bg-[var(--bg-secondary)] text-[var(--text-secondary)]",
                          )}
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

      <section className="relative z-[1] bg-transparent px-6 py-12 text-center md:px-8 md:py-20">
        <div className="mx-auto w-full max-w-[1100px]">
          <ScrollRevealItem index={8} className="block">
            <section className="rounded-[var(--radius-lg)] border border-white/[0.07] bg-white/[0.03] p-8 text-center backdrop-blur-md">
              {!signedIn ? (
                <Link href="/onboarding/connect">
                  <Button className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]">
                    Run the free PSA scan
                  </Button>
                </Link>
              ) : plan === "free" ? (
                <Button
                  type="button"
                  className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                  disabled={
                    (!STRIPE_PRO_MONTHLY_PRICE_ID && !STRIPE_PRO_ANNUAL_PRICE_ID) ||
                    checkoutLoadingPriceId !== null
                  }
                  onClick={() => setProUpgradeOpen(true)}
                >
                  Move to Handover to unlock HaloPSA push-back, scheduled reports, and QBRs
                </Button>
              ) : (
                <Link href="/?openSettings=integrations">
                  <Button className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]">
                    {connected ? "Open HaloPSA settings →" : "Connect HaloPSA now →"}
                  </Button>
                </Link>
              )}
            </section>
          </ScrollRevealItem>
        </div>
      </section>

      <section className="relative z-[1] bg-transparent px-6 py-8 text-center md:px-8">
        <p className="text-[13px] text-[var(--text-muted)]">
          Looking for a HaloPSA reporting tool?{" "}
          <Link
            href="/halopsa-reporting"
            className="font-medium text-[var(--accent)] underline-offset-2 transition-colors hover:underline"
          >
            See how Handover works →
          </Link>
        </p>
      </section>
    </MarketingPageLayout>
  );
}
