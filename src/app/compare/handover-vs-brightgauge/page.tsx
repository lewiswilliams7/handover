import type { Metadata } from "next";
import Link from "next/link";

import { CompareTable } from "@/components/compare-table";
import { FaqSection } from "@/components/faq-section";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { SeoPageCta } from "@/components/seo-page-cta";
import { Button } from "@/components/ui/button";
import { softwareApplicationJsonLd } from "@/lib/seo-page-jsonld";

const PATH = "/compare/handover-vs-brightgauge";
const CANONICAL = `https://gethandover.uk${PATH}`;
const TITLE = "BrightGauge Alternative — Handover vs BrightGauge for MSP Reporting";
const DESCRIPTION =
  "BrightGauge vs Handover for MSP client reporting: pricing, PSA integration, AI outputs, scheduling, and client portal. A focused BrightGauge alternative for UK and APAC MSPs.";

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

const brightGaugeRows = [
  { feature: "Pricing", handover: "From £29/mo (Professional)", competitor: "Typically higher per-seat dashboards" },
  { feature: "PSA integration", handover: "Native HaloPSA & ConnectWise", competitor: "Broad integrations; dashboard-first" },
  {
    feature: "Report generation",
    handover: "Narrative client reports from live tickets",
    competitor: "Dashboards & gauges; less narrative focus",
  },
  { feature: "Scheduling", handover: true, competitor: true },
  { feature: "AI-powered outputs", handover: true, competitor: "Limited narrative AI" },
  { feature: "Client portal", handover: "Client portal (Enterprise beta)", competitor: true },
  { feature: "Setup time", handover: "Minutes — connect PSA & generate", competitor: "Days–weeks of dashboard design" },
];

const faqs = [
  {
    q: "Is Handover a BrightGauge alternative?",
    a: "Handover is an MSP reporting tool alternative to BrightGauge if your primary need is automated client-facing narrative reports from PSA data — not building internal KPI dashboards. Many teams use Handover specifically to replace weekly manual client emails.",
  },
  {
    q: "BrightGauge vs Handover — which is better for client emails?",
    a: "BrightGauge excels at visual dashboards for internal and client views. Handover is optimised for written client updates, QBR packs, and scheduled report delivery from HaloPSA or ConnectWise ticket data.",
  },
  {
    q: "Do UK MSPs use Handover instead of BrightGauge?",
    a: "Yes. UK MSPs are our primary market. Teams that only need consistent weekly client communication often choose Handover for speed and lower operational overhead than maintaining gauge libraries.",
  },
  {
    q: "Can I try Handover before switching?",
    a: "Start a 14-day free trial or book a demo. Connect your PSA and generate a real report from your data before you commit.",
  },
];

export default function HandoverVsBrightGaugePage() {
  const jsonLd = softwareApplicationJsonLd({
    name: "Handover",
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
            Handover vs BrightGauge — MSP reporting compared
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-[var(--text-secondary)]">
            Evaluating a BrightGauge alternative? See how a purpose-built MSP reporting tool stacks up for client
            communication.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/auth?tab=signup&returnTo=/welcome">
              <Button
                size="lg"
                className="rounded-[var(--radius)] bg-[var(--accent)] px-8 text-white hover:bg-[var(--accent-hover)]"
              >
                Start free trial
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
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">What each tool does</h2>
            <h3 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">BrightGauge</h3>
            <p className="mt-2">
              BrightGauge is a dashboard and KPI platform for MSPs. It connects to many data sources and helps teams
              build visual gauges for NOC walls, internal reviews, and client-facing dashboards.
            </p>
            <h3 className="mt-6 text-xl font-semibold text-[var(--text-primary)]">Handover</h3>
            <p className="mt-2">
              Handover is a <strong className="text-[var(--text-primary)]">managed service provider</strong> reporting
              tool focused on narrative client reports: weekly updates, QBR packs, and scheduled delivery from HaloPSA
              or ConnectWise — without designing dozens of gauges first.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Handover vs BrightGauge at a glance</h2>
            <div className="mt-6">
              <CompareTable rows={brightGaugeRows} competitorName="BrightGauge" />
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Who each tool is best for</h2>
            <h3 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">Choose BrightGauge if…</h3>
            <p className="mt-2">
              You need rich visual dashboards, custom KPI libraries, and NOC-style displays across many integrations —
              and you have time to design and maintain gauge sets per client.
            </p>
            <h3 className="mt-6 text-xl font-semibold text-[var(--text-primary)]">Choose Handover if…</h3>
            <p className="mt-2">
              Your bottleneck is weekly client reporting: PMs spending hours writing updates, inconsistent tone, or
              missed sends. Handover automates written reports from PSA ticket data for UK MSPs and{" "}
              <strong className="text-[var(--text-primary)]">APAC MSPs</strong> on ConnectWise reseller programmes.
            </p>
            <p className="mt-3">
              See{" "}
              <Link href="/pricing" className="text-[var(--accent)] hover:underline">
                pricing
              </Link>{" "}
              or{" "}
              <Link href="/demo" className="text-[var(--accent)] hover:underline">
                book a demo
              </Link>
              .
            </p>
          </section>

          <FaqSection faqs={faqs} />
        </div>
      </section>

      <SeoPageCta headline="Try the BrightGauge alternative built for client report automation" />
    </MarketingPageLayout>
  );
}
