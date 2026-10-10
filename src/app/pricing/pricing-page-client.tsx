"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, ArrowRight, Loader2 } from "lucide-react";

import { BOOK_DEMO_CALENDLY_URL } from "@/lib/book-demo";
import { STRIPE_PRICE_IDS } from "@/lib/stripe-price-ids";
import { createClient } from "@/lib/supabase";

type BillingPeriod = "monthly" | "annual";

type FeatureItem = { label: string; href?: string };

const FEATURE_GROUPS: ReadonlyArray<{ title: string; items: ReadonlyArray<FeatureItem> }> = [
  {
    title: "Revenue protection",
    items: [
      { label: "Revenue at Risk™ across your whole client base", href: "/features/revenue-at-risk" },
      { label: "Churn Replay™ on the clients you have already lost", href: "/features/churn-replay" },
      { label: "Save Plays™ with a ready-to-send email for every flag", href: "/features/save-plays" },
      { label: "Saved Revenue tracking", href: "/features/revenue-at-risk#saved-revenue" },
      { label: "Client Margin: revenue per hour for every client", href: "/features/client-margin" },
      { label: "Handover Client Intelligence™ signals and weekly digest", href: "/features/client-intelligence" },
    ],
  },
  {
    title: "Proof for your clients",
    items: [
      { label: "Value Receipts™ sent to each client every month", href: "/features/value-receipts" },
      { label: "Service reviews and QBR packs", href: "/features/qbr-generator" },
      { label: "Scheduled reports with an approval step", href: "/features/scheduled-reports" },
      { label: "PowerPoint, PDF and Excel export", href: "/features/exports" },
      { label: "White-labelled client portal", href: "/features/white-label" },
      { label: "Notes pushed back to the PSA", href: "/features/psa-push" },
    ],
  },
  {
    title: "Platform",
    items: [
      { label: "HaloPSA and ConnectWise Manage", href: "/integrations" },
      { label: "Unlimited users" },
    ],
  },
];

export function PricingPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(() =>
    searchParams.get("billing") === "annual" ? "annual" : "monthly",
  );
  const [signedIn, setSignedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!mounted) return;
      setSignedIn(Boolean(user));
      setAuthChecked(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSignedIn(Boolean(session?.user));
      setAuthChecked(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const checkoutPriceId =
    billingPeriod === "annual"
      ? STRIPE_PRICE_IDS.handover.annual
      : STRIPE_PRICE_IDS.handover.monthly;
  const hasCheckoutPrice = Boolean(checkoutPriceId);
  const checkoutComplete = searchParams.get("checkout") === "success";

  const buyNow = async () => {
    if (checkoutBusy) return;
    setCheckoutError(null);

    if (!signedIn) {
      const returnTo = `/pricing?billing=${billingPeriod}`;
      router.push(`/auth?tab=signin&returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    if (!checkoutPriceId) {
      setCheckoutError("Checkout is not configured yet. Please book a walkthrough.");
      return;
    }

    setCheckoutBusy(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: checkoutPriceId }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!response.ok || !data.url) {
        setCheckoutError(data.error ?? "We could not start checkout.");
        return;
      }
      window.location.assign(data.url);
    } catch {
      setCheckoutError("We could not reach checkout. Please try again.");
    } finally {
      setCheckoutBusy(false);
    }
  };

  return (
    <main className="marketing-aurora min-h-screen px-4 py-12 text-white sm:px-6 md:pb-20">
      <div className="mx-auto max-w-5xl">
        <section className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
            One plan, everything included
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
            Costs less than one lost client a year.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/60 sm:text-lg">
            Handover shows which clients are slipping and what they are worth, proves the value you
            deliver to the people who renew, and counts the revenue you keep.
          </p>
        </section>

        {checkoutComplete ? (
          <p className="mx-auto mt-8 max-w-2xl rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.08] px-4 py-3 text-center text-sm text-emerald-100">
            Payment received. Your Handover access is being updated.
          </p>
        ) : null}

        <section className="mx-auto mt-12 max-w-5xl">
          <div className="rounded-[2rem] border border-cyan-300/35 bg-[#0b1629]/85 p-6 shadow-2xl shadow-cyan-950/35 backdrop-blur-sm sm:p-10">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
                The whole product
              </p>
              <h2 className="mt-3 text-3xl font-semibold">Handover</h2>
              <p className="mt-2 text-sm text-white/55">Everything included. No client counting.</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="font-bold tracking-tight text-white">
                <span className="text-[clamp(2.5rem,5vw,3.75rem)] leading-none">
                  {billingPeriod === "annual" ? "£4,990" : "£499"}
                </span>
                <span className="ml-1 text-xl font-semibold text-white/70">
                  {billingPeriod === "annual" ? "/year" : "/month"}
                </span>
              </p>
              <p className="mt-2 text-sm text-cyan-200">
                {billingPeriod === "annual" ? "Two months free" : "Billed monthly"}
              </p>
            </div>
          </div>

          <div className="mt-8 flex rounded-xl border border-white/10 bg-black/10 p-1">
            {(["monthly", "annual"] as const).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setBillingPeriod(period)}
                className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                  billingPeriod === period
                    ? "bg-cyan-300 text-slate-950"
                    : "text-white/55 hover:text-white"
                }`}
              >
                {period === "monthly" ? "Monthly · £499" : "Annual · £4,990"}
              </button>
            ))}
          </div>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void buyNow()}
              disabled={!authChecked || checkoutBusy}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60"
            >
              {checkoutBusy ? <Loader2 className="size-4 animate-spin" /> : null}
              Buy now
              {!checkoutBusy ? <ArrowRight className="size-4" /> : null}
            </button>
            <a
              href={BOOK_DEMO_CALENDLY_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 flex-1 items-center justify-center rounded-xl border border-white/15 px-5 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.05]"
            >
              Book a walkthrough
            </a>
          </div>
          {checkoutError ? (
            <p className="mt-3 text-sm text-amber-200" role="alert">
              {checkoutError}
            </p>
          ) : null}
          {!hasCheckoutPrice ? (
            <p className="mt-3 text-xs text-white/40">
              Online checkout is being configured. Book a walkthrough to get started.
            </p>
          ) : null}
          </div>
        </section>
        <p className="mx-auto mt-5 max-w-2xl text-center text-sm text-white/60">
          Every customer gets a{" "}
          <Link
            href="/onboarding-programme"
            className="font-semibold text-cyan-200 underline decoration-cyan-200/30 underline-offset-4 hover:text-cyan-100"
          >
            30-day launch
          </Link>
          , run by me personally.
        </p>

        <div className="mx-auto mt-12 max-w-3xl">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
            Everything included
          </p>
          <div className="mt-3">
            {FEATURE_GROUPS.map((group) => (
              <section
                key={group.title}
                className="border-t border-white/10 py-6 first:border-t-0 first:pt-0"
              >
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200/65">
                  {group.title}
                </h3>
                <ul className="mt-3 space-y-2.5">
                  {group.items.map((feature) => (
                    <li key={feature.label} className="flex items-start gap-3 text-sm leading-6 text-white/70">
                      <Check className="mt-1 size-4 shrink-0 text-cyan-300" aria-hidden />
                      {feature.href ? (
                        <Link
                          href={feature.href}
                          className="underline decoration-white/15 underline-offset-4 transition-colors hover:text-white hover:decoration-cyan-300/60"
                        >
                          {feature.label}
                        </Link>
                      ) : (
                        <span>{feature.label}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200/70">
            Start with the evidence
          </p>
          <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-white/65">
            Connect your PSA read-only. See your Revenue at Risk and replay the clients you lost in the
            last 12 months before you pay anything.
          </p>
          <Link
            href="/onboarding/connect"
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-cyan-300 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-950/25 transition hover:bg-cyan-200 sm:w-auto"
          >
            Run your free scan
            <ArrowRight className="ml-2 size-4" aria-hidden />
          </Link>
          <p className="mt-3 text-xs text-white/45">No card, no trial.</p>
        </div>

        <p className="mx-auto mt-7 max-w-3xl text-center text-xs text-white/40">
          Smaller MSP?{" "}
          <Link
            href="/pricing/starter-programme"
            className="font-semibold text-white/65 underline decoration-white/20 underline-offset-4 hover:text-white"
          >
            Starter Programme
          </Link>
          <span className="mx-2 text-white/20">·</span>
          Larger portfolio?{" "}
          <Link
            href="/pricing/enterprise"
            className="font-semibold text-white/65 underline decoration-white/20 underline-offset-4 hover:text-white"
          >
            Enterprise
          </Link>
        </p>

        <section className="mx-auto mt-6 max-w-5xl">
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <a
              href="https://usehalo.com/integration/handover-integration/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 transition-opacity hover:opacity-80"
            >
              <img src="/halopsa.png" alt="HaloPSA" width={20} height={20} className="h-5 w-auto object-contain opacity-60" />
              <span className="text-[11px] font-medium uppercase tracking-wide text-white/40">
                HaloPSA Marketplace
              </span>
            </a>
            <span className="hidden text-white/15 sm:block">·</span>
            <a
              href="https://marketplace.connectwise.com/handover"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 transition-opacity hover:opacity-80"
            >
              <img
                src="/connectwise.jpeg"
                alt="ConnectWise"
                width={20}
                height={20}
                className="h-5 w-auto rounded-sm object-contain opacity-60"
                style={{ background: "white", padding: "2px" }}
              />
              <span className="text-[11px] font-medium uppercase tracking-wide text-white/40">
                ConnectWise Marketplace
              </span>
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
