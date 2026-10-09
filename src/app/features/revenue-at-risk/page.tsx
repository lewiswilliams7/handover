import type { Metadata } from "next";
import Link from "next/link";
import { Brain, Rewind, Tag } from "lucide-react";

import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { MarketingRelatedPages } from "@/components/marketing-related-pages";

const PAGE_URL = "https://gethandover.uk/features/revenue-at-risk";

export const metadata: Metadata = {
  title: "Revenue at Risk™ for MSPs | Handover",
  description:
    "Revenue at Risk puts a pound value on every client whose service or relationship has changed, straight from your HaloPSA or ConnectWise data. One number for the week, and a list of who to call.",
  alternates: { canonical: PAGE_URL },
};

const EXAMPLE_CLIENTS = [
  { name: "Westfield Manufacturing", value: "£46,800", reason: "First response slowed from 1h to 5h" },
  { name: "Carter & Lowe Solicitors", value: "£31,200", reason: "Ticket activity fell by two thirds" },
  { name: "Ashby Primary Trust", value: "£22,800", reason: "Open backlog doubled in three months" },
] as const;

const COUNTED = [
  "First response or resolution times drifting from the client's usual pattern",
  "Open backlog growing, or tickets staying open far longer than usual",
  "Ticket volume rising sharply, or a busy client going quiet",
  "More tickets arriving out of hours than before",
  "A contract due to end in the next 90 days",
  "Nobody assigned to the account's tickets",
] as const;

export default function RevenueAtRiskFeaturePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Handover Revenue at Risk",
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#38bdf8]">
            Revenue at Risk™
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white md:text-5xl">
            Every client that has changed, in pounds.
          </h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-white/70">
            Revenue at Risk is the annual recurring value of the clients whose service or relationship
            has changed against their own history. One number for the Monday meeting, and a ranked list
            of who to call first.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/onboarding/connect"
              className="inline-flex rounded-[var(--radius)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
            >
              See your Revenue at Risk free
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
            What you see each week
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[var(--text-secondary)]">
            An example with invented clients.
          </p>
          <div className="mt-6 rounded-[calc(var(--radius-lg)+4px)] bg-[#0b1629] p-6 text-white shadow-2xl shadow-black/30 sm:p-8">
            <p className="text-sm font-semibold text-white/60">Revenue at Risk</p>
            <p className="mt-3 text-4xl font-bold tracking-tight text-[#dbeafe] sm:text-5xl">
              £100,800 a year
            </p>
            <p className="mt-2 max-w-2xl text-base leading-7 text-white/65">
              Recurring revenue held by 3 clients whose service or relationship has changed.
            </p>
            <ul className="mt-6 divide-y divide-white/10 border-y border-white/10">
              {EXAMPLE_CLIENTS.map((client) => (
                <li key={client.name} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4">
                  <div className="min-w-0">
                    <p className="font-semibold">{client.name}</p>
                    <p className="mt-0.5 text-sm text-white/60">{client.reason}</p>
                  </div>
                  <p className="font-semibold text-[#dbeafe]">{client.value} a year</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="px-6 py-12 md:px-8">
        <div className="mx-auto max-w-[900px] space-y-4 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">What counts as at risk</h2>
          <p>
            A client is counted when at least one of these has changed against its own baseline, and the
            flag has not yet been dealt with or marked as normal for that client:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            {COUNTED.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>
            Quotes, orders and usage are shown separately as opportunities, not risk. Gaps in your PSA
            data are reported as coverage, not counted against a client.
          </p>

          <h2 className="pt-6 text-2xl font-semibold text-[var(--text-primary)]">How the value is worked out</h2>
          <p>
            Handover reads each client&apos;s monthly recurring value from your PSA: recurring invoices or
            contract values in HaloPSA, agreement values in ConnectWise Manage. It multiplies by 12 and
            counts each client once, however many signals it has. Clients with no value in the PSA are
            still listed, and the total tells you how many it could not price.
          </p>

          <h2 id="saved-revenue" className="scroll-mt-24 pt-6 text-2xl font-semibold text-[var(--text-primary)]">
            Saved Revenue
          </h2>
          <p>
            Revenue at Risk shows where to act. Saved Revenue shows what acting was worth. When someone
            acts on a flag, a later scan shows the signal has cleared, and the client is still with you,
            that client&apos;s annual value is added to your Saved Revenue. Flags you mark as normal for
            the client are never counted.
          </p>
          <p>
            Pair it with{" "}
            <Link href="/features/churn-replay" className="text-[var(--accent)] hover:underline">
              Churn Replay™
            </Link>{" "}
            to see how many of the clients you have already lost would have shown up here first.
          </p>
        </div>
      </section>

      <MarketingRelatedPages
        links={[
          { href: "/features/churn-replay", title: "Churn Replay™", Icon: Rewind },
          { href: "/features/client-intelligence", title: "Handover Client Intelligence™", Icon: Brain },
          { href: "/pricing", title: "Pricing", Icon: Tag },
        ]}
      />
    </MarketingPageLayout>
  );
}
