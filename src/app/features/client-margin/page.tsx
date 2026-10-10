import type { Metadata } from "next";
import Link from "next/link";
import { PoundSterling, ReceiptText, Tag } from "lucide-react";

import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { MarketingRelatedPages } from "@/components/marketing-related-pages";

const PAGE_URL = "https://gethandover.uk/features/client-margin";

export const metadata: Metadata = {
  title: "Client Margin for MSPs | Revenue Per Hour, Per Client | Handover",
  description:
    "See which clients pay for the time they take. Handover divides each client's contract value by the hours logged on their tickets and groups them with Revenue at Risk: save, fix, reprice or protect.",
  alternates: { canonical: PAGE_URL },
};

const GROUPS = [
  { title: "Save these first", body: "Profitable, but their service or relationship has changed. Losing one of these hurts most." },
  { title: "Fix or reprice", body: "Changing behaviour and thin margin. Fix the service problem, then look at the contract." },
  { title: "Reprice at renewal", body: "A steady relationship, but they take far more time than they pay for." },
  { title: "Protect and grow", body: "Healthy and profitable. Keep them happy and look for room to expand." },
] as const;

export default function ClientMarginFeaturePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Handover Client Margin",
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#38bdf8]">Client Margin</p>
          <h1 className="mt-3 text-3xl font-semibold text-white md:text-5xl">
            Which clients pay for the time they take?
          </h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-white/70">
            Every MSP has clients that quietly cost more to support than they pay. Client Margin shows
            revenue per hour for every client, straight from your PSA, and tells you which ones to save,
            fix, reprice or protect.
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

      <section className="px-6 pb-4 md:px-8" aria-labelledby="groups-heading">
        <div className="mx-auto max-w-[1000px]">
          <h2 id="groups-heading" className="text-2xl font-semibold text-[var(--text-primary)]">
            Four groups, four decisions
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[var(--text-secondary)]">
            Margin on one axis, Revenue at Risk on the other.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {GROUPS.map((group) => (
              <div key={group.title} className="rounded-2xl border border-[var(--border)] p-5">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{group.title}</h3>
                <p className="mt-2 text-[15px] leading-7 text-[var(--text-secondary)]">{group.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-12 md:px-8">
        <div className="mx-auto max-w-[900px] space-y-4 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">How it is worked out</h2>
          <p>
            Handover takes each client&apos;s current monthly contract or recurring invoice value and
            divides it by the average monthly hours your team logged on that client&apos;s tickets over
            the last three complete months. Each client is compared with your typical client, so you do
            not need to enter salaries or overheads.
          </p>
          <p>
            A client is only measured when it has a contract value and time is logged on most of its
            tickets. Anything that cannot be measured is listed with the reason, so you know exactly
            what to fix in your PSA.
          </p>
          <p>
            Margin sits next to{" "}
            <Link href="/features/revenue-at-risk" className="text-[var(--accent)] hover:underline">
              Revenue at Risk
            </Link>{" "}
            because the two answer different questions: one tells you who might leave, the other tells
            you who is worth keeping on today&apos;s terms.
          </p>
        </div>
      </section>

      <MarketingRelatedPages
        links={[
          { href: "/features/revenue-at-risk", title: "Revenue at Risk™", Icon: PoundSterling },
          { href: "/features/value-receipts", title: "Value Receipts™", Icon: ReceiptText },
          { href: "/pricing", title: "Pricing", Icon: Tag },
        ]}
      />
    </MarketingPageLayout>
  );
}
