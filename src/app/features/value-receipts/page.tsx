import type { Metadata } from "next";
import Link from "next/link";
import { LifeBuoy, PoundSterling, Tag } from "lucide-react";

import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { MarketingRelatedPages } from "@/components/marketing-related-pages";

const PAGE_URL = "https://gethandover.uk/features/value-receipts";

export const metadata: Metadata = {
  title: "Value Receipts™ | Show Clients What You Did For Them | Handover",
  description:
    "A one-page monthly summary for each client's decision-maker, built from your HaloPSA or ConnectWise tickets: what you resolved, how quickly, and what is still in progress. Sent automatically each month.",
  alternates: { canonical: PAGE_URL },
};

const EXAMPLE_STATS = [
  { label: "Requests resolved", value: "38", note: "Including 4 urgent issues" },
  { label: "Time spent on your requests", value: "27.5 hours" },
  { label: "Typical first response", value: "48 min", note: "Faster than recent months, down from 1.6 hr" },
  { label: "Typical time to resolve", value: "6.5 hr", note: "In line with recent months" },
  { label: "People in your team we helped", value: "17" },
  { label: "Raised outside office hours", value: "5" },
] as const;

export default function ValueReceiptsFeaturePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Handover Value Receipts",
    applicationCategory: "BusinessApplication",
    description: metadata.description,
    url: PAGE_URL,
  };

  return (
    <MarketingPageLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="marketing-page-hero relative overflow-hidden bg-transparent px-6 py-12 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto max-w-[1000px] rounded-[var(--radius-lg)] border border-[rgba(56,189,248,0.25)] bg-[rgba(15,23,42,0.68)] p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#38bdf8]">Value Receipts™</p>
          <h1 className="mt-3 text-3xl font-semibold text-white md:text-5xl">
            When IT works, nobody notices. Show them anyway.
          </h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-white/70">
            Your clients pay every month for work they never see. A Value Receipt puts that work in
            front of the person who renews: what you resolved, how quickly, and what is still in
            progress, on one page, every month.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/onboarding/connect"
              className="inline-flex rounded-[var(--radius)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
            >
              Run your free scan
            </Link>
            <Link
              href="/demo"
              className="inline-flex rounded-[var(--radius)] border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.06]"
            >
              Book a walkthrough
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 pb-4 md:px-8" aria-labelledby="example-heading">
        <div className="mx-auto max-w-[1000px]">
          <h2 id="example-heading" className="text-2xl font-semibold text-[var(--text-primary)]">
            What your client receives
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[var(--text-secondary)]">
            An example with an invented client, in your branding.
          </p>
          <article className="mt-6 overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl shadow-black/30">
            <div className="h-1.5 bg-[#0f1c3f]" aria-hidden />
            <div className="p-6 sm:p-10">
              <div className="flex flex-wrap items-baseline justify-between gap-3 text-sm">
                <span className="font-semibold">Your MSP</span>
                <span className="text-slate-500">Service summary, September 2026</span>
              </div>
              <h3 className="mt-8 text-3xl font-semibold tracking-tight">Westfield Manufacturing</h3>
              <p className="mt-3 max-w-2xl text-lg leading-8 text-slate-700">
                We resolved 38 requests for Westfield Manufacturing in September 2026, including 4
                urgent issues.
              </p>
              <dl className="mt-8 grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-3">
                {EXAMPLE_STATS.map((stat) => (
                  <div key={stat.label} className="bg-white p-5">
                    <dt className="text-sm text-slate-500">{stat.label}</dt>
                    <dd className="mt-1 text-2xl font-semibold tabular-nums">{stat.value}</dd>
                    {"note" in stat ? <dd className="mt-1 text-xs leading-5 text-slate-500">{stat.note}</dd> : null}
                  </div>
                ))}
              </dl>
              <p className="mt-8 max-w-2xl text-[15px] leading-7 text-slate-700">
                2 requests were still in progress at the end of the month. We will keep you updated on
                each one.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="px-6 py-12 md:px-8">
        <div className="mx-auto max-w-[900px] space-y-4 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Every number comes from your PSA</h2>
          <p>
            Value Receipts are built from the tickets your team already logs in HaloPSA or ConnectWise
            Manage: requests resolved, urgent issues handled, response and resolution times, time
            spent, and what is still open. Nothing is estimated, and nothing is written by AI. Each
            month is compared with the three before it, so improvements show up and slips are not
            hidden.
          </p>
          <p>
            Time spent only appears when your team logs time on most tickets. Contract values, margins
            and internal targets never appear on a receipt.
          </p>

          <h2 className="pt-6 text-2xl font-semibold text-[var(--text-primary)]">Set it once for each client</h2>
          <p>
            Send a receipt by hand, copy it into your own email, or print it to PDF for a review
            meeting. Or turn on monthly sending: last month&apos;s receipt goes to the client&apos;s
            decision-maker early each month, under your company name, and replies come straight back to
            you.
          </p>

          <h2 className="pt-6 text-2xl font-semibold text-[var(--text-primary)]">Part of the loop</h2>
          <p>
            <Link href="/features/revenue-at-risk" className="text-[var(--accent)] hover:underline">
              Revenue at Risk
            </Link>{" "}
            tells you which clients are drifting.{" "}
            <Link href="/features/save-plays" className="text-[var(--accent)] hover:underline">
              Save Plays
            </Link>{" "}
            tell you what to do. Value Receipts make sure the people who renew can see what you deliver,
            every month, before price becomes the only thing they compare.
          </p>
        </div>
      </section>

      <MarketingRelatedPages
        links={[
          { href: "/features/revenue-at-risk", title: "Revenue at Risk™", Icon: PoundSterling },
          { href: "/features/save-plays", title: "Save Plays™", Icon: LifeBuoy },
          { href: "/pricing", title: "Pricing", Icon: Tag },
        ]}
      />
    </MarketingPageLayout>
  );
}
