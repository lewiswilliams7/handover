"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ProductTour } from "@/components/marketing/product-tour";
import { BOOK_DEMO_CALENDLY_URL } from "@/lib/book-demo";
import { PRICING_FAQS as FAQS } from "@/lib/marketing-faqs";
import { STRIPE_PRICE_IDS } from "@/lib/stripe-price-ids";
import { createClient } from "@/lib/supabase";

type BillingPeriod = "monthly" | "annual";

type Product = { name: string; body: string; href: string };

/** The whole product, grouped by the stage of the client lifecycle it serves. */
const STAGES: ReadonlyArray<{ verb: string; title: string; products: ReadonlyArray<Product> }> = [
  {
    verb: "Detect",
    title: "Know who moved",
    products: [
      { name: "Revenue at Risk™", body: "Every client that changed against its own history, ranked by the revenue it holds.", href: "/features/revenue-at-risk" },
      { name: "The Monday Brief", body: "Your week by email: what's at risk, what renews, the three moves to make.", href: "/features/monday-brief" },
      { name: "Churn Replay™", body: "The clients you lost, replayed. See when Handover would have warned you.", href: "/features/churn-replay" },
    ],
  },
  {
    verb: "Act",
    title: "Do the right thing first",
    products: [
      { name: "Save Plays™", body: "The steps and a ready-to-send email for every warning sign.", href: "/features/save-plays" },
      { name: "Client Margin", body: "Which clients create more work than they pay for, and what fair looks like.", href: "/features/client-margin" },
      { name: "Renewal Radar", body: "Every renewal this year, with the move to make before the conversation.", href: "/features/renewal-radar" },
    ],
  },
  {
    verb: "Prove",
    title: "Show and count the value",
    products: [
      { name: "Value Receipts™", body: "A branded monthly summary for each client's decision-maker, sent from you.", href: "/features/value-receipts" },
      { name: "Saved Revenue", body: "Recovered clients counted in pounds. The return on Handover, in your numbers.", href: "/features/revenue-at-risk#saved-revenue" },
      { name: "Client pages", body: "One page per client: tickets, people, margin, renewal and the next step.", href: "/features/client-intelligence" },
    ],
  },
];

const ALSO_INCLUDED: ReadonlyArray<{ label: string; href?: string }> = [
  { label: "HaloPSA and ConnectWise Manage", href: "/integrations" },
  { label: "Unlimited users" },
  { label: "Quarterly and service reviews", href: "/solutions/qbr" },
  { label: "PDF and Excel export", href: "/features/exports" },
  { label: "White-labelled client portal", href: "/features/white-label" },
  { label: "Notes pushed back to the PSA", href: "/features/psa-push" },
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
      // New buyers make an account first; checkout then opens by itself when
      // they come back here. Existing customers can switch to sign in.
      const returnTo = `/pricing?billing=${billingPeriod}&buy=1`;
      router.push(`/auth?tab=signup&returnTo=${encodeURIComponent(returnTo)}`);
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

  // Back from creating an account with ?buy=1: open checkout without another click.
  const autoBuyStarted = useRef(false);
  useEffect(() => {
    if (!authChecked || !signedIn || checkoutComplete || autoBuyStarted.current) return;
    if (searchParams.get("buy") !== "1") return;
    autoBuyStarted.current = true;
    void buyNow();
    // buyNow reads the latest state when it runs; this should fire once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, signedIn, checkoutComplete, searchParams]);

  return (
    <main className="marketing-aurora min-h-screen px-4 py-12 text-white sm:px-6 md:pb-20">
      <div className="mx-auto max-w-6xl">
        <section className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
            One plan, everything included
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
            Costs less than one lost client a year.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/60 sm:text-lg">
            One plan with every product and unlimited users. Run the free scan first, and buy once you have seen
            your own numbers.
          </p>
        </section>

        {checkoutComplete ? (
          <p className="mx-auto mt-8 max-w-2xl rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.08] px-4 py-3 text-center text-sm text-emerald-100">
            Payment received. Your Handover access is being updated.
          </p>
        ) : null}

        <section className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <div className="rounded-[2rem] border border-cyan-300/35 bg-[#0b1629]/85 p-6 shadow-2xl shadow-cyan-950/35 backdrop-blur-sm sm:p-9">
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">The whole product</p>
                <h2 className="mt-3 text-3xl font-semibold">Handover</h2>
                <p className="mt-2 text-sm text-white/55">Everything included. Unlimited users. No client counting.</p>
              </div>
              <div>
                <p className="font-bold tracking-tight text-white">
                  <span className="text-[clamp(2.5rem,5vw,3.75rem)] leading-none">
                    {billingPeriod === "annual" ? "£4,990" : "£499"}
                  </span>
                  <span className="ml-1 text-xl font-semibold text-white/70">
                    {billingPeriod === "annual" ? "/year" : "/month"}
                  </span>
                </p>
                <p className="mt-2 text-sm text-cyan-200">
                  {billingPeriod === "annual" ? "Two months free, £416 a month" : "Billed monthly, cancel any time"}
                </p>
              </div>
            </div>

            <div className="mt-7 flex rounded-xl border border-white/10 bg-black/10 p-1" role="group" aria-label="Billing period">
              {(["monthly", "annual"] as const).map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setBillingPeriod(period)}
                  aria-pressed={billingPeriod === period}
                  className={`relative min-h-0 flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                    billingPeriod === period ? "text-slate-950" : "text-white/55 hover:text-white"
                  }`}
                >
                  {billingPeriod === period ? (
                    <motion.span
                      layoutId="billing-pill"
                      className="absolute inset-0 rounded-lg bg-cyan-300"
                      transition={{ type: "spring", stiffness: 500, damping: 36 }}
                    />
                  ) : null}
                  <span className="relative">{period === "monthly" ? "Monthly" : "Annual, 2 months free"}</span>
                </button>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void buyNow()}
                disabled={!authChecked || checkoutBusy}
                className="cta cta-primary h-12 w-full disabled:cursor-wait disabled:opacity-60 sm:flex-1"
              >
                {checkoutBusy ? <Loader2 className="size-4 animate-spin" /> : null}
                Buy now
                {!checkoutBusy ? <ArrowRight className="cta-arrow size-4" /> : null}
              </button>
              <a
                href={BOOK_DEMO_CALENDLY_URL}
                target="_blank"
                rel="noreferrer"
                className="cta cta-secondary h-12 w-full sm:flex-1"
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
              <p className="mt-3 text-xs text-white/40">Online checkout is being configured. Book a walkthrough to get started.</p>
            ) : null}

            <ul className="mt-7 grid gap-2.5 border-t border-white/10 pt-6 text-sm text-white/70 sm:grid-cols-2">
              {[
                "Every product on this page",
                "Unlimited users",
                "A 30-day launch, run by me",
                "No minimum term",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <Check className="size-4 shrink-0 text-cyan-300" aria-hidden />
                  {item === "A 30-day launch, run by me" ? (
                    <Link href="/onboarding-programme" className="underline decoration-white/20 underline-offset-4 hover:text-white">
                      {item}
                    </Link>
                  ) : (
                    item
                  )}
                </li>
              ))}
            </ul>
          </div>

          <PaybackCard annual={billingPeriod === "annual"} />
        </section>

        <section className="mt-20" aria-labelledby="included">
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="included" className="text-3xl font-semibold tracking-tight sm:text-4xl">
              What £499 gets you
            </h2>
            <p className="mt-3 text-[15px] leading-7 text-white/60">
              Every screen below, for every client, refreshed from your PSA every week.
            </p>
          </div>
          <div className="mt-12">
            <ProductTour />
          </div>
          <div className="mt-12 flex flex-wrap justify-center gap-2">
            {STAGES.flatMap((stage) => stage.products).map((product) => (
              <Link
                key={product.name}
                href={product.href}
                title={product.body}
                className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 text-[13px] text-white/75 transition-colors hover:border-cyan-300/50 hover:text-white"
              >
                {product.name}
              </Link>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-white/50">
            <span className="font-semibold text-white/70">Also included:</span>
            {ALSO_INCLUDED.map((item) =>
              item.href ? (
                <Link key={item.label} href={item.href} className="hover:text-white">
                  {item.label}
                </Link>
              ) : (
                <span key={item.label}>{item.label}</span>
              ),
            )}
          </div>
        </section>

        <section className="mt-20 grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]" aria-labelledby="faq">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">Questions</p>
            <h2 id="faq" className="mt-3 text-3xl font-semibold tracking-tight">Before you buy</h2>
            <p className="mt-3 text-sm leading-6 text-white/55">
              Anything else, ask me directly at{" "}
              <a href="mailto:hello@gethandover.uk" className="text-cyan-200 hover:text-cyan-100">
                hello@gethandover.uk
              </a>
              .
            </p>
          </div>
          <div className="divide-y divide-white/10 border-y border-white/10">
            {FAQS.map((faq) => (
              <details key={faq.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-white [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <span className="text-xl leading-none text-white/40 transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-2 pr-8 text-sm leading-6 text-white/60">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-20 max-w-3xl rounded-3xl border border-white/10 bg-[#0b1629]/70 px-6 py-10 text-center sm:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200/70">Start with the evidence</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">See it on your own clients first</h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-white/65">
            Connect your PSA read-only. In about a minute you see your Revenue at Risk, your renewals, your margin gap
            and the clients you lost last year, replayed.
          </p>
          <Link
            href="/onboarding/connect"
            className="cta cta-primary mt-6 w-full sm:w-auto"
          >
            Run your free scan
            <ArrowRight className="cta-arrow size-4" aria-hidden />
          </Link>
          <p className="mt-3 text-xs text-white/45">No card, no trial.</p>
        </section>

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

const CLIENT_VALUES = [500, 1000, 1500, 2500, 4000] as const;

/**
 * The only maths that matters at this price: what one kept client is worth
 * against a year of Handover. The visitor picks a typical client size.
 */
function PaybackCard({ annual }: { annual: boolean }) {
  const [monthly, setMonthly] = useState<number>(1500);
  const yearlyCost = annual ? 4990 : 499 * 12;
  const kept = monthly * 12;
  const multiple = kept / yearlyCost;
  return (
    <div className="flex flex-col rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 sm:p-9">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">The maths</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight">Keep one client and it pays for itself</h2>
      <p className="mt-3 text-sm leading-6 text-white/60">What does a typical client pay you a month?</p>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Typical monthly client value">
        {CLIENT_VALUES.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setMonthly(value)}
            aria-pressed={monthly === value}
            className={`min-h-0 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
              monthly === value
                ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-100"
                : "border-white/10 text-white/60 hover:border-white/25 hover:text-white"
            }`}
          >
            £{value.toLocaleString("en-GB")}
          </button>
        ))}
      </div>
      <dl className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
          <dt className="text-xs text-white/50">One client kept</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums">£{kept.toLocaleString("en-GB")}</dd>
          <dd className="text-xs text-white/40">a year</dd>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
          <dt className="text-xs text-white/50">Handover</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums">£{yearlyCost.toLocaleString("en-GB")}</dd>
          <dd className="text-xs text-white/40">a year</dd>
        </div>
      </dl>
      <p className="mt-5 rounded-2xl border border-cyan-300/30 bg-cyan-300/[0.07] px-4 py-3 text-sm leading-6 text-cyan-50">
        {multiple >= 1 ? (
          <>
            Keeping one <span className="font-semibold">£{monthly.toLocaleString("en-GB")}</span> client covers Handover{" "}
            <span className="font-semibold">{multiple >= 1.95 ? `${Math.round(multiple * 10) / 10}×` : "for the year"}</span>
            {multiple >= 1.95 ? " over" : ""}.
          </>
        ) : (
          <>
            At <span className="font-semibold">£{monthly.toLocaleString("en-GB")}</span> a month, keeping one client covers{" "}
            {Math.round(multiple * 100)}% of the year. Smaller book?{" "}
            <Link href="/pricing/starter-programme" className="font-semibold underline underline-offset-4">
              See the Starter Programme
            </Link>
            .
          </>
        )}
      </p>
      <p className="mt-auto pt-5 text-xs leading-5 text-white/40">
        Before counting the time it saves, the renewals it helps you reprice or the clients it helps you expand.
      </p>
    </div>
  );
}
