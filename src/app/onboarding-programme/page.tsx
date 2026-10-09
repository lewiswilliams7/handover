import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

import { BOOK_DEMO_CALENDLY_URL } from "@/lib/book-demo";

export const metadata: Metadata = {
  title: "30-day onboarding programme | Handover",
  description:
    "Every Handover customer gets a 30-day launch: connect the PSA, review the first scan, and turn findings into client conversations.",
  alternates: {
    canonical: "https://gethandover.uk/onboarding-programme",
  },
};

const WEEKS = [
  {
    label: "Week 1",
    title: "Connect and identify what matters",
    body: "Your PSA is connected, we review the first scan together, and identify the accounts that matter most.",
  },
  {
    label: "Week 2",
    title: "Confirm the baseline",
    body: "We confirm the baselines and dismiss false positives so Handover learns what normal looks like for your book.",
  },
  {
    label: "Week 3",
    title: "Start the conversations",
    body: "Your first client conversations are driven by findings rather than guesswork.",
  },
  {
    label: "Week 4",
    title: "Review what changed",
    body: "We review what was flagged, what was actioned, and what changed across the month.",
  },
] as const;

export default function OnboardingProgrammePage() {
  return (
    <main className="marketing-aurora min-h-screen px-4 py-12 text-white sm:px-6 md:pb-20">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-white"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to pricing
        </Link>

        <div className="mt-12 grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start lg:gap-16">
          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              30-day onboarding programme
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              Most software gives you a login. Handover gives you a launch.
            </h1>
            <p className="mt-5 text-base leading-7 text-white/65">
              The first month is not a handoff to a dashboard. It is a focused launch that turns
              your PSA data into a working rhythm for the team.
            </p>

            <div className="mt-8 border-y border-white/10 py-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200/70">
                The outcome
              </p>
              <p className="mt-3 flex gap-3 text-base leading-7 text-white/80">
                <Check className="mt-1 size-5 shrink-0 text-cyan-300" aria-hidden />
                A documented record of what Handover surfaced and what the team did about it.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              What the first 30 days looks like
            </h2>
            <div className="mt-6 space-y-5">
              {WEEKS.map((week) => (
                <article
                  key={week.label}
                  className="border-t border-white/10 pt-5 first:border-t-0 first:pt-0"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
                    {week.label}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-white">{week.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/60">{week.body}</p>
                </article>
              ))}
            </div>

            <div className="mt-8 border-t border-white/10 pt-6">
              <p className="text-sm leading-6 text-white/55">
                Want to see how the launch would work for your team?
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href={BOOK_DEMO_CALENDLY_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                >
                  Book a walkthrough
                  <ArrowRight className="size-4" aria-hidden />
                </a>
                <Link
                  href="/onboarding/connect"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.05]"
                >
                  Start with the free scan
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
