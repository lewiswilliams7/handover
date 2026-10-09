import type { Metadata } from "next";
import Link from "next/link";

import { CompareTable } from "@/components/compare-table";
import { FaqSection } from "@/components/faq-section";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { SeoPageCta } from "@/components/seo-page-cta";
import { Button } from "@/components/ui/button";
import { softwareApplicationJsonLd } from "@/lib/seo-page-jsonld";

const PATH = "/compare/handover-vs-manual-reporting";
const CANONICAL = `https://gethandover.uk${PATH}`;
const TITLE = "Automate MSP Client Reporting - Handover vs Manual Reports";
const DESCRIPTION =
  "Replace manual MSP reports with MSP reporting automation. See how Handover helps UK MSPs cut report time from hours to under 60 seconds with PSA-native scheduling.";

export const metadata: Metadata = {
  title: `${TITLE} | Handover`,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: CANONICAL,
    siteName: "Handover",
    type: "website",
  },
};

const manualCompareRows = [
  { feature: "Time per report", handover: "Under 60 seconds", competitor: "30 to 120 minutes" },
  { feature: "Consistency", handover: "Standardised every week", competitor: "Varies by PM and workload" },
  { feature: "PSA integration", handover: "Native HaloPSA & ConnectWise", competitor: "Manual copy-paste" },
  { feature: "Scheduling", handover: true, competitor: false },
  {
    feature: "Cost (typical team)",
    handover: "£499/mo or £4,990/year",
    competitor: "£50 to 100+ per report in PM time",
  },
];

const faqs = [
  {
    q: "How long does it take to automate MSP client reporting with Handover?",
    a: "Most teams connect their PSA and generate a client-ready report in under five minutes on first setup. Each report after that takes under 60 seconds to generate, review, and send.",
  },
  {
    q: "Can Handover replace manual MSP reports entirely?",
    a: "Yes. Handover pulls live ticket and project data from your PSA, writes the client update in plain English, and can deliver on a schedule. Many UK MSPs stop writing weekly reports by hand within the first week.",
  },
  {
    q: "Do I need to change how my team works in the PSA?",
    a: "No. Handover reads your existing HaloPSA or ConnectWise data. Your engineers keep logging tickets as normal; Handover turns that activity into consistent client communication.",
  },
  {
    q: "What does MSP reporting automation cost compared to manual reporting?",
    a: "Manual reporting often costs thousands per year in PM time. Handover is £499/month or £4,990 annually, with every feature included. Run the free PSA scan before you buy.",
  },
];

export default function HandoverVsManualReportingPage() {
  const jsonLd = softwareApplicationJsonLd({
    name: "Handover - MSP Reporting Automation",
    description: DESCRIPTION,
    url: CANONICAL,
  });

  return (
    <MarketingPageLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="marketing-page-hero relative overflow-hidden bg-transparent px-6 py-12 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto max-w-[1000px] text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Comparison</p>
          <h1 className="mt-4 text-3xl font-bold leading-tight text-[var(--text-primary)] md:text-5xl">
            Why MSPs are replacing manual client reporting with Handover
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-[var(--text-secondary)]">
            Automate MSP client reporting and end the weekly copy-paste cycle. Built for{" "}
            <strong className="text-[var(--text-primary)]">UK MSPs</strong> running HaloPSA or ConnectWise.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/onboarding/connect">
              <Button
                size="lg"
                className="rounded-[var(--radius)] bg-[var(--accent)] px-8 text-white hover:bg-[var(--accent-hover)]"
              >
                Run the free PSA scan
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline" className="rounded-[var(--radius)] border-[var(--border)] px-8">
                Book a demo
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="rounded-[var(--radius)] border-[var(--border)] px-8">
                View pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-12 md:px-8">
        <div className="mx-auto max-w-[900px] space-y-10 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              The problem: hours spent on manual reports
            </h2>
            <p className="mt-3">
              Every week, a <strong className="text-[var(--text-primary)]">managed service provider</strong> (MSP)
              project or service manager pulls data from the PSA, summarises tickets, formats a document, and emails
              each client. For a mid-size portfolio that is often 10 to 20 hours of skilled PM time every single week.
            </p>
            <p className="mt-3">
              Reports slip when the desk is busy. Tone and detail vary by author. Clients cannot tell whether silence
              means “everything is fine” or “we forgot to send the update.” That inconsistency erodes trust even when
              delivery is solid.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              The solution: MSP reporting automation with Handover
            </h2>
            <p className="mt-3">
              Handover is purpose-built MSP reporting automation: connect HaloPSA or ConnectWise Manage, select the
              tickets and projects per client, and generate a professional client report in under a minute. Schedule
              weekly delivery, push summaries back into tickets, and keep every client on the same cadence without
              rewriting the same email.
            </p>
            <p className="mt-3">
              If you are evaluating tools, compare{" "}
              <Link href="/pricing" className="text-[var(--accent)] hover:underline">
                plans and pricing
              </Link>{" "}
              or{" "}
              <Link href="/demo" className="text-[var(--accent)] hover:underline">
                book a demo
              </Link>{" "}
              with the founder (an MSP PM who built Handover for this exact workflow).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Manual reporting vs Handover</h2>
            <p className="mt-3 mb-6">
              Replace manual MSP reports with a repeatable, PSA-connected workflow:
            </p>
            <CompareTable rows={manualCompareRows} competitorName="Manual reporting" />
          </section>

          <FaqSection faqs={faqs} />
        </div>
      </section>

      <SeoPageCta headline="Stop spending hours on reports that Handover writes in 60 seconds" />
    </MarketingPageLayout>
  );
}
