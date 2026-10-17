"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Mail, Plug, ScanSearch } from "lucide-react";
import Link from "next/link";

import { HandoverLoopDiagram } from "@/components/marketing/handover-loop-diagram";
import { HomePricingFaq } from "@/components/marketing/home-pricing-faq";
import { AppFrame, ReplayMock, WeekListMock } from "@/components/marketing/product-mocks";
import { ProductTour } from "@/components/marketing/product-tour";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Quotes that still describe the product as it is: about quality and fit, not report-writing time. */
const QUOTES = [
  {
    text: "Strong initial implementation with real niche focus. The HaloPSA integration is the right approach and the output quality is genuinely impressive for an early stage product.",
    who: "Blake H.",
    org: "IBM",
    logo: "/ibm.png",
  },
  {
    text: "Really good product. The MSP space has needed something like this for a long time and Handover has nailed the positioning.",
    who: "Delivery Lead",
    org: "Computacenter",
    logo: "/computacenter.png",
  },
];

function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** The signed-out homepage. */
export function HomeLanding() {
  return (
    <div className="overflow-x-clip">
      {/* Hero: the claim, and the product doing its job beside it. */}
      <section className="relative px-4 pb-16 pt-28 sm:px-6 md:pt-32 lg:px-8 lg:pb-24">
        <div className="home-hero-drift-layer" aria-hidden>
          <div className="home-hero-drift-orb--a" />
          <div className="home-hero-drift-orb--b" />
        </div>
        <div className="home-hero-dot-overlay" aria-hidden />
        <div className="relative z-10 mx-auto grid max-w-[1400px] items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] lg:gap-16 xl:gap-20">
          <div>
            <Reveal>
              <Link
                href="/blog/handover-client-retention-platform"
                className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-3 text-[12.5px] text-white/70 transition-colors hover:border-white/25 hover:text-white"
              >
                <span className="rounded-full bg-cyan-300/15 px-2 py-0.5 text-[11px] font-semibold text-cyan-200">New</span>
                Handover is now built for client retention
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </Reveal>
            <Reveal delay={0.06}>
              <h1 className="mt-6 text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.035em] text-white sm:text-6xl lg:text-[4.1rem] 2xl:text-[4.6rem]">
                Find the clients you&apos;re about to lose. While you can still keep them.
              </h1>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-6 max-w-xl text-[17px] leading-8 text-white/70 sm:text-lg">
                Handover reads HaloPSA or ConnectWise every week, puts a pound value on every client that has changed,
                and tells you exactly what to do about it.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/onboarding/connect" className="cta cta-primary">
                  Run your free scan
                  <ArrowRight className="cta-arrow size-4" aria-hidden />
                </Link>
                <Link href="/demo" className="cta cta-secondary">
                  Book a walkthrough
                </Link>
              </div>
              <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-white/50">
                {["Free", "Read-only", "Results in about a minute"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <Check className="size-3.5 text-cyan-300" aria-hidden />
                    {item}
                  </span>
                ))}
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.2} className="relative">
            <div aria-hidden className="pointer-events-none absolute -inset-12 bg-[radial-gradient(closest-side,rgba(56,189,248,0.22),transparent)]" />
            <AppFrame
              path="/week"
              label="Handover's This week list: four clients ranked by what they are worth, each with the reason and one action. The top one is marked handled."
              className="relative"
            >
              <WeekListMock />
            </AppFrame>
            <div
              aria-hidden
              className="absolute -right-3 -top-8 hidden w-52 rounded-xl border border-white/[0.12] bg-[#0d1830]/95 p-3.5 shadow-2xl backdrop-blur sm:block lg:-right-8"
            >
              <p className="text-[10.5px] text-white/50">Revenue at Risk</p>
              <p className="mt-0.5 text-xl font-semibold tracking-tight text-white">
                £100,800<span className="text-xs font-medium text-white/40"> a year</span>
              </p>
              <p className="mt-0.5 text-[10.5px] text-emerald-300">£18,000 down since last week</p>
            </div>
          </Reveal>
        </div>

        <div className="relative z-10 mx-auto mt-16 flex max-w-[1400px] flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[12px] text-white/45">
          <a
            href="https://www.g2.com/products/handover"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 transition-colors hover:text-white/80"
          >
            <span className="text-yellow-400">★★★★★</span> 5.0 on G2
          </a>
          <a
            href="https://usehalo.com/integration/handover-integration/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 transition-colors hover:text-white/80"
          >
            <img src="/halopsa.png" alt="" width={18} height={18} className="h-[18px] w-auto opacity-70" />
            On the HaloPSA Marketplace
          </a>
          <a
            href="https://marketplace.connectwise.com/handover"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 transition-colors hover:text-white/80"
          >
            <img src="/connectwise.jpeg" alt="" width={18} height={18} className="h-[18px] w-auto rounded-sm bg-white p-px opacity-80" />
            On the ConnectWise Marketplace
          </a>
        </div>
      </section>

      {/* The problem, said once and plainly. */}
      <section className="px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <p className="text-[1.65rem] font-semibold leading-[1.3] tracking-[-0.02em] text-white/35 sm:text-4xl sm:leading-[1.25]">
            Clients rarely leave loudly.{" "}
            <span className="text-white">
              Response times slip. Tickets dry up. The person who raised everything goes quiet. A renewal arrives with
              nobody ready for it.
            </span>{" "}
            The signs are already in your PSA. Nobody has time to watch fifty clients every week.{" "}
            <span className="text-cyan-300">Handover does.</span>
          </p>
        </div>
      </section>

      {/* The product, screen by screen. */}
      <section className="px-4 py-12 sm:px-6 md:py-20 lg:px-8" aria-labelledby="tour-heading">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <h2 id="tour-heading" className="text-3xl font-semibold tracking-[-0.025em] text-white sm:text-[2.6rem] sm:leading-[1.1]">
              Everything that needs you, in one place.
            </h2>
            <p className="mt-4 text-[16px] leading-7 text-white/60">
              Six screens, one job: keep the clients you have, and make sure they know what you do for them.
            </p>
          </div>
          <div className="mt-12">
            <ProductTour />
          </div>
        </div>
      </section>

      {/* Proof on their own history. */}
      <section className="px-4 py-16 sm:px-6 md:py-24 lg:px-8" aria-labelledby="replay-heading">
        <div className="mx-auto grid max-w-6xl items-center gap-10 rounded-[2rem] border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-6 sm:p-10 lg:grid-cols-2 lg:gap-14 lg:p-14">
          <div>
            <h2 id="replay-heading" className="text-3xl font-semibold tracking-[-0.025em] text-white sm:text-[2.4rem] sm:leading-[1.1]">
              Don&apos;t take our word for it. Ask the clients you lost.
            </h2>
            <p className="mt-4 text-[16px] leading-7 text-white/65">
              Your first scan rewinds your PSA to before each client left last year and runs the same checks. You see
              which ones Handover would have flagged, and how many weeks you would have had. It also checks clients
              who stayed, so you see the false alarms too.
            </p>
            <Link href="/onboarding/connect" className="cta cta-primary mt-8">
              Replay your last year
              <ArrowRight className="cta-arrow size-4" aria-hidden />
            </Link>
          </div>
          <AppFrame path="/attention?tab=replay" label="Churn Replay: a client that left in May was flagged 94 days earlier">
            <ReplayMock />
          </AppFrame>
        </div>
      </section>

      {/* The loop. */}
      <section className="px-4 py-12 sm:px-6 md:py-20 lg:px-8" aria-labelledby="loop-heading">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 id="loop-heading" className="text-3xl font-semibold tracking-[-0.025em] text-white sm:text-[2.6rem] sm:leading-[1.1]">
              One loop, every week.
            </h2>
            <p className="mt-4 text-[16px] leading-7 text-white/60">
              Spot who is drifting, act, prove your value to the people who renew, and count what you keep.
            </p>
          </div>
          <HandoverLoopDiagram />
        </div>
      </section>

      {/* Proof: a real scan result first, then what people in the industry said. */}
      <section className="px-4 py-12 sm:px-6 md:py-20 lg:px-8" aria-labelledby="proof-heading">
        <div className="mx-auto max-w-6xl">
          <h2 id="proof-heading" className="text-3xl font-semibold tracking-[-0.025em] text-white sm:text-[2.6rem] sm:leading-[1.1]">
            What MSPs found, and what they said
          </h2>
          <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <Link
              href="/case-studies/five-months-on-halopsa"
              className="group flex flex-col justify-between rounded-2xl border border-cyan-300/30 bg-cyan-300/[0.06] p-7 transition-colors hover:border-cyan-300/60"
            >
              <div>
                <p className="text-6xl font-semibold tracking-tight text-white">~45</p>
                <p className="mt-2 text-[15px] leading-7 text-white/75">
                  warning signs on the first scan, for an MSP only five months into HaloPSA. You do not need years of
                  history to start.
                </p>
              </div>
              <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-cyan-300">
                Read the story
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
            {QUOTES.map((quote) => (
              <figure key={quote.who} className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-7">
                <blockquote className="text-[16px] leading-7 text-white/85">&ldquo;{quote.text}&rdquo;</blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <img src={quote.logo} alt="" className="h-6 w-auto rounded bg-white px-1 py-0.5 object-contain" />
                  <span className="text-sm">
                    <span className="block font-medium text-white">{quote.who}</span>
                    <span className="block text-white/50">{quote.org}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Getting started: a real sequence, so it is numbered. */}
      <section className="px-4 py-12 sm:px-6 md:py-20 lg:px-8" aria-labelledby="start-heading">
        <div className="mx-auto max-w-6xl">
          <h2 id="start-heading" className="text-3xl font-semibold tracking-[-0.025em] text-white sm:text-[2.6rem] sm:leading-[1.1]">
            Live before your coffee goes cold.
          </h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                Icon: Plug,
                time: "2 minutes",
                title: "Connect your PSA",
                body: "A read-only API key from HaloPSA or ConnectWise. Nothing to install, nothing changes in your PSA.",
              },
              {
                Icon: ScanSearch,
                time: "About a minute",
                title: "Handover reads your history",
                body: "Every client against its own normal, every contract, every renewal, and a replay of the clients you lost.",
              },
              {
                Icon: Mail,
                time: "Every Monday",
                title: "Your list arrives",
                body: "The top five things to do this week, in your inbox, with the emails already written.",
              },
            ].map((step, index) => (
              <li key={step.title} className="relative rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6">
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/[0.08] text-sm font-semibold text-cyan-200">
                    {index + 1}
                  </span>
                  <span className="text-xs text-white/45">{step.time}</span>
                </div>
                <step.Icon className="mt-6 size-5 text-cyan-300" aria-hidden />
                <h3 className="mt-3 text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-white/60">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <HomePricingFaq />

      {/* Last word. */}
      <section className="px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-cyan-300/25 bg-[radial-gradient(120%_120%_at_50%_0%,rgba(56,189,248,0.22),rgba(11,22,41,0.9)_60%)] px-6 py-14 text-center sm:px-12 sm:py-20">
          <h2 className="mx-auto max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-white sm:text-5xl sm:leading-[1.05]">
            See which clients are slipping. On your own data, in a minute.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-7 text-white/65">
            Revenue at Risk, your renewals, your margin gap and a replay of last year&apos;s losses. Free, with no card
            and nothing to cancel.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/onboarding/connect" className="cta cta-primary">
              Run your free scan
              <ArrowRight className="cta-arrow size-4" aria-hidden />
            </Link>
            <Link href="/pricing" className="cta cta-secondary">
              See pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
