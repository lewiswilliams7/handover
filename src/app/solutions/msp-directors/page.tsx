import type { Metadata } from "next";
import Link from "next/link";
import { LifeBuoy, PoundSterling, Rewind } from "lucide-react";

import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingRelatedPages } from "@/components/marketing-related-pages";
import { MarketingPageLayout } from "@/components/marketing-page-layout";

export const metadata: Metadata = {
  title: "Handover for MSP Owners and Directors | Protect Recurring Revenue",
  description:
    "See which clients are slipping and what they are worth, prove it on the clients you have already lost, and count the revenue you keep. Built for MSPs on HaloPSA and ConnectWise.",
  alternates: {
    canonical: "https://gethandover.uk/solutions/msp-directors",
  },
};

const LOOP = [
  {
    title: "Revenue at Risk™",
    href: "/features/revenue-at-risk",
    body: "Every client whose service or relationship has changed against its own history, ranked by the annual revenue it holds. One number for the Monday meeting.",
  },
  {
    title: "Churn Replay™",
    href: "/features/churn-replay",
    body: "Handover rewinds your PSA to before each client you lost and shows whether it would have warned you, and how early. Proof on your own data before you pay.",
  },
  {
    title: "Save Plays™",
    href: "/features/save-plays",
    body: "Every flag comes with the steps to take and an email to the client's decision-maker. Your account managers know exactly what to do.",
  },
  {
    title: "Saved Revenue",
    href: "/features/revenue-at-risk#saved-revenue",
    body: "When a flagged client recovers after someone acts, its annual value is counted. The return on Handover, in your numbers.",
  },
] as const;

export default function SolutionsMspDirectorsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Handover for MSP Owners and Directors",
    description: metadata.description,
    url: "https://gethandover.uk/solutions/msp-directors",
  };

  return (
    <MarketingPageLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="marketing-page-hero relative overflow-hidden bg-transparent px-6 py-12 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto w-full max-w-[1000px]">
          <div className="rounded-[var(--radius-lg)] border border-[rgba(56,189,248,0.25)] bg-[rgba(15,23,42,0.65)] px-6 py-8 shadow-[0_20px_60px_-22px_rgba(56,189,248,0.35)] md:px-10 md:py-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#38bdf8]">
              For MSP owners and directors
            </p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight text-white md:text-5xl">
              Your recurring revenue is only as safe as the clients you are not watching.
            </h1>
            <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-white/75">
              Once you have more clients than you can personally keep an eye on, the ones that leave are rarely
              the ones shouting. Handover reads your PSA and shows you which clients are slipping, what they are
              worth, and what to do about it.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/onboarding/connect"
                className="inline-flex items-center rounded-[var(--radius)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
              >
                Run your free scan
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center rounded-[var(--radius)] border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.06]"
              >
                Book a walkthrough
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-10 md:px-8 md:py-14">
        <div className="mx-auto w-full max-w-[900px] space-y-10 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Why good MSPs still lose clients</h2>
            <p className="mt-3">
              Your clients pay every month for work they never see. When IT works, nothing happens, so the value
              you deliver fades from view while the invoice stays the same. At renewal they weigh a visible cost
              against invisible value, and price wins.
            </p>
            <p className="mt-3">
              The warning signs are usually in your PSA months before: responses slowing, a backlog building, a
              busy client going quiet. But nobody has time to watch every account, so the signs are found after
              the client has already decided.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">How Handover works for you</h2>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2">
              {LOOP.map((item) => (
                <li key={item.title} className="rounded-[var(--radius-lg)] border border-[var(--border)] p-5">
                  <Link href={item.href} className="font-semibold text-[var(--text-primary)] hover:text-[var(--accent)]">
                    {item.title}
                  </Link>
                  <p className="mt-2 text-[15px] leading-7">{item.body}</p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Then prove your value to the people who renew</h2>
            <p className="mt-3">
              Service reviews, QBR packs and a white-labelled client portal put the work your team does in front
              of the decision-maker, built from the same PSA data and sent on a schedule. See{" "}
              <Link href="/solutions/qbr-and-reporting" className="text-[var(--accent)] hover:underline">
                service reviews and QBRs
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">The business case</h2>
            <p className="mt-3">
              Handover is £499 a month, or £4,990 a year, with everything included. If it helps you keep one
              client you would otherwise have lost, it has paid for itself several times over. The free scan
              shows your Revenue at Risk and replays the clients you lost in the last 12 months before you spend
              anything.
            </p>
          </section>

          <section className="rounded-[var(--radius-lg)] border border-white/[0.08] border-l-[3px] border-l-[#0EA5E9] bg-white/[0.04] p-6 backdrop-blur-sm">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Works with the PSA you already use</h2>
            <p className="mt-3">
              Read-only connections to HaloPSA and ConnectWise Manage. No migration, no consultants, nothing to
              install.
            </p>
            <Link href="/onboarding/connect" className="marketing-page-bottom-cta mt-5 inline-flex items-center">
              Run your free scan
            </Link>
          </section>
        </div>
      </section>

      <MarketingRelatedPages
        links={[
          { href: "/features/revenue-at-risk", title: "Revenue at Risk™", Icon: PoundSterling },
          { href: "/features/churn-replay", title: "Churn Replay™", Icon: Rewind },
          { href: "/features/save-plays", title: "Save Plays™", Icon: LifeBuoy },
        ]}
      />
    </MarketingPageLayout>
  );
}
