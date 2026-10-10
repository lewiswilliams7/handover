import type { Metadata } from "next";
import Link from "next/link";
import { PoundSterling, ReceiptText, Scale } from "lucide-react";

import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { MarketingRelatedPages } from "@/components/marketing-related-pages";

const PAGE_URL = "https://gethandover.uk/features/renewal-radar";

export const metadata: Metadata = {
  title: "Renewal Radar for MSPs | Plan Every Contract Renewal | Handover",
  description:
    "Every contract ending in the next 12 months, with each client's service signals and margin side by side. Handover tells you who to save, who to reprice and who to renew early, before the conversation starts.",
  alternates: { canonical: PAGE_URL },
};

const MOVES = [
  {
    title: "Save first",
    body: "Service or the relationship has changed. Fix it well before anyone talks about renewing.",
  },
  {
    title: "Reprice at renewal",
    body: "A steady client that takes far more time than they pay for, with the monthly price that would match your typical rate.",
  },
  {
    title: "Fix, then reprice",
    body: "Both at once: sort the service problem first, then bring the numbers to the table.",
  },
  {
    title: "Renew early, look to expand",
    body: "Healthy and profitable. Lock it in early and look for more you can do for them.",
  },
] as const;

export default function RenewalRadarFeaturePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Handover Renewal Radar",
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#38bdf8]">Renewal Radar</p>
          <h1 className="mt-3 text-3xl font-semibold text-white md:text-5xl">
            Renewals decided at the last minute are decided on price.
          </h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-white/70">
            Renewal Radar lines up every contract ending in the next year with what your PSA already
            says about that client: whether service has slipped, and whether they pay for the time they
            take. You see what to do months before the conversation, not the week of it.
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

      <section className="px-6 pb-4 md:px-8" aria-labelledby="moves-heading">
        <div className="mx-auto max-w-[1000px]">
          <h2 id="moves-heading" className="text-2xl font-semibold text-[var(--text-primary)]">
            One clear move for every renewal
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[var(--text-secondary)]">
            Each recommendation follows from signals you can see and check, never a black-box score.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {MOVES.map((move) => (
              <div key={move.title} className="rounded-2xl border border-[var(--border)] p-5">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{move.title}</h3>
                <p className="mt-2 text-[15px] leading-7 text-[var(--text-secondary)]">{move.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-12 md:px-8">
        <div className="mx-auto max-w-[900px] space-y-4 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">What you see at the top</h2>
          <p>
            The annual value renewing in the next 90 days, how much of it sits with clients showing
            warning signs, and how much more you would earn by bringing thin-margin renewals up to your
            typical rate. Three numbers an owner can act on this week.
          </p>
          <h2 className="pt-4 text-2xl font-semibold text-[var(--text-primary)]">Where the numbers come from</h2>
          <p>
            End dates and values come from the contracts in HaloPSA or ConnectWise Manage. Warning signs
            are the open signals on{" "}
            <Link href="/features/revenue-at-risk" className="text-[var(--accent)] hover:underline">
              Revenue at Risk
            </Link>
            , and margin comes from{" "}
            <Link href="/features/client-margin" className="text-[var(--accent)] hover:underline">
              Client Margin
            </Link>
            . Where margin cannot be measured, it is left out rather than guessed.
          </p>
          <p>
            Before each renewal, send the client&apos;s decision-maker a{" "}
            <Link href="/features/value-receipts" className="text-[var(--accent)] hover:underline">
              Value Receipt
            </Link>{" "}
            so they know exactly what they are renewing.
          </p>
        </div>
      </section>

      <MarketingRelatedPages
        links={[
          { href: "/features/revenue-at-risk", title: "Revenue at Risk™", Icon: PoundSterling },
          { href: "/features/client-margin", title: "Client Margin", Icon: Scale },
          { href: "/features/value-receipts", title: "Value Receipts™", Icon: ReceiptText },
        ]}
      />
    </MarketingPageLayout>
  );
}
