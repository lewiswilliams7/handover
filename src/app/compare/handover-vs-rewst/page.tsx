import type { Metadata } from "next";
import Link from "next/link";

import { CompareTable } from "@/components/compare-table";
import { FaqSection } from "@/components/faq-section";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { SeoPageCta } from "@/components/seo-page-cta";
import { Button } from "@/components/ui/button";
import { softwareApplicationJsonLd } from "@/lib/seo-page-jsonld";

const PATH = "/compare/handover-vs-rewst";
const CANONICAL = `https://gethandover.uk${PATH}`;
const TITLE = "Rewst vs Handover — MSP Automation Reporting Compared";
const DESCRIPTION =
  "Rewst alternative for reporting? Handover is purpose-built MSP automation reporting for client updates — not general workflow automation. Compare Rewst vs Handover for UK MSPs.";

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

const rewstRows = [
  { feature: "Primary purpose", handover: "Client reporting & QBR packs", competitor: "Workflow & process automation" },
  { feature: "PSA-native reporting", handover: true, competitor: "Requires custom workflows" },
  { feature: "AI-written client narratives", handover: true, competitor: false },
  { feature: "Scheduled client reports", handover: true, competitor: "Build yourself" },
  { feature: "Time to first client report", handover: "Under 5 minutes", competitor: "Days (workflow design)" },
  { feature: "Push notes back to PSA", handover: true, competitor: "Possible via automation" },
  { feature: "Best for", handover: "PMs & service delivery leads", competitor: "Automation engineers" },
];

const faqs = [
  {
    q: "Is Handover a Rewst alternative?",
    a: "Handover is a Rewst alternative for reporting specifically — not for general MSP automation. If you need client-ready weekly reports from PSA data, Handover is faster than building and maintaining Rewst workflows for each client.",
  },
  {
    q: "Rewst vs Handover — can I use both?",
    a: "Yes. Many MSPs use Rewst for provisioning, onboarding, and internal automations while Handover handles client-facing reporting. They solve different problems.",
  },
  {
    q: "What is MSP automation reporting?",
    a: "MSP automation reporting means generating consistent client updates from live PSA tickets and projects on a schedule — without manual writing. Handover specialises in that outcome; Rewst specialises in automating arbitrary processes.",
  },
  {
    q: "Who is Handover built for?",
    a: "Service delivery managers and PMs at UK MSPs (and APAC teams on ConnectWise) who need reliable weekly client communication, not engineers maintaining complex workflow graphs.",
  },
];

export default function HandoverVsRewstPage() {
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
            Handover vs Rewst — purpose-built reporting vs workflow automation
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-[var(--text-secondary)]">
            Rewst automates processes. Handover automates client reports. Different tools for different jobs.
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
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Different tools, different outcomes</h2>
            <p className="mt-3">
              Rewst is a powerful automation platform for MSPs: connect systems, trigger workflows, and orchestrate
              repetitive operational tasks across your stack. It is built for automation engineers who design and
              maintain flows.
            </p>
            <p className="mt-3">
              Handover is purpose-built <strong className="text-[var(--text-primary)]">MSP automation reporting</strong>.
              A <strong className="text-[var(--text-primary)]">managed service provider</strong> connects HaloPSA or
              ConnectWise, and Handover turns live ticket and project data into client-ready narrative reports — on
              demand or on a schedule.
            </p>
            <p className="mt-3">
              You would not replace Rewst with Handover for onboarding a new user. You would not replace Handover with
              Rewst for weekly client reporting without building custom workflows per client.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Comparison table</h2>
            <div className="mt-6">
              <CompareTable rows={rewstRows} competitorName="Rewst" />
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">When to choose Handover</h2>
            <h3 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">Reporting is the bottleneck</h3>
            <p className="mt-2">
              If PMs still write weekly client emails by hand, Handover delivers MSP reporting automation out of the
              box — including AI summaries, risk flags, and PSA push-back.
            </p>
            <h3 className="mt-6 text-xl font-semibold text-[var(--text-primary)]">You want results in minutes</h3>
            <p className="mt-2">
              UK MSPs typically generate their first report the same day they sign up. Compare{" "}
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

      <SeoPageCta headline="Get MSP automation reporting without building workflows" />
    </MarketingPageLayout>
  );
}
