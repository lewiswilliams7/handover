import type { Metadata } from "next";
import Link from "next/link";
import { Activity, BarChart3, Gauge } from "lucide-react";

import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingRelatedPages } from "@/components/marketing-related-pages";
import { MarketingPageLayout } from "@/components/marketing-page-layout";

export const metadata: Metadata = {
  title: "MSP SLA Reporting for Clients | Automated SLA Performance Reports | Handover",
  description:
    "Generate clear, visual SLA performance reports from your HaloPSA or ConnectWise data. Show clients exactly how you are performing against your commitments, automatically.",
  alternates: {
    canonical: "https://gethandover.uk/solutions/sla-reporting",
  },
};

export default function SlaReportingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "MSP SLA Reporting for Clients | Automated SLA Performance Reports | Handover",
    description: metadata.description,
    url: "https://gethandover.uk/solutions/sla-reporting",
  };

  return (
    <MarketingPageLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="marketing-page-hero relative overflow-hidden bg-transparent px-6 py-12 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto w-full max-w-[1000px]">
          <div className="rounded-[var(--radius-lg)] border border-[rgba(56,189,248,0.28)] bg-[rgba(15,23,42,0.68)] px-6 py-8 shadow-[0_20px_60px_-22px_rgba(56,189,248,0.35)] md:px-10 md:py-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#38bdf8]">Solutions · Use Case</p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight text-white md:text-5xl">
              Your SLA Performance Is Strong. Stop Keeping It a Secret.
            </h1>
            <div className="mt-6">
              <Link
                href="/onboarding/connect"
                className="inline-flex items-center rounded-[var(--radius)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
              >
                Run the free PSA scan
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-10 md:px-8 md:py-14">
        <div className="mx-auto w-full max-w-[900px] space-y-10 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
          <p>
            SLA compliance is one of the most tangible ways an MSP can demonstrate value. You committed to responding
            within four hours. You did it 97% of the time. That is a number worth sharing.
          </p>
          <p>
            Most MSPs do not share it. Not because they are hiding it, but because extracting it from the PSA,
            formatting it into something a client can understand, and getting it in front of the right person requires
            time and effort that nobody prioritises.
          </p>
          <p>Handover makes SLA reporting automatic, visual, and client-ready.</p>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">SLA Reports That Clients Actually Understand</h2>
            <p className="mt-3">
              Raw SLA data from a PSA is meaningless to most clients. Percentages without context, numbers without
              benchmarks, tables without narrative.
            </p>
            <p className="mt-3">
              Handover transforms that data into clear visual reports that tell the story of your performance in
              language a business audience understands. Your SLA compliance rate as a visual gauge. Your trend over
              time as a line chart. Your performance by priority level as a comparison chart. All in a single branded
              document that your client receives automatically.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">What Handover SLA Reports Include</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                <strong className="text-[var(--text-primary)]">Overall Compliance Rate</strong>
                <br />
                Your headline SLA performance percentage for the period, presented clearly and in context.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Performance by Priority</strong>
                <br />
                How you performed against each SLA tier. P1 response times, P2 resolution rates, P3 closure times.
                Clients see exactly how each priority level is being handled.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Trend Over Time</strong>
                <br />
                Performance across the last four to twelve weeks as a visual trend line. Clients see improvement. They
                see consistency. They see you getting better.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Volume Context</strong>
                <br />
                SLA performance alongside ticket volume. When clients see that you maintained strong SLA compliance
                during a period of unusually high ticket volume, the number means something.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Exceptions and Explanation</strong>
                <br />
                Where SLA was missed, Handover provides AI-generated context from the ticket data. Not excuses, but
                honest explanations that demonstrate awareness and accountability.
              </li>
            </ul>
          </section>

          <section className="rounded-[var(--radius-lg)] border border-white/[0.08] border-l-[3px] border-l-[#0EA5E9] bg-white/[0.04] backdrop-blur-sm p-6">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Turn SLA Performance Into a Retention Tool</h2>
            <p className="mt-3">
              Most MSPs treat SLA compliance as an internal metric. A number to hit to avoid penalties. A checkbox in
              the service agreement.
            </p>
            <p className="mt-3">
              The MSPs that use SLA performance as a proactive communication tool experience meaningfully different
              client relationships. Clients who receive regular, visual SLA reports feel informed and confident. They
              have evidence that their MSP is delivering on its commitments. When renewal conversations come around,
              the data is already there.
            </p>
            <p className="mt-3">
              Handover makes that communication automatic. Your SLA report goes out every week alongside the rest of
              the client update. No extra effort. Just consistent evidence that you are doing what you said you would
              do.
            </p>
            <Link href="/onboarding/connect" className="marketing-page-bottom-cta mt-5 inline-flex items-center">
              Run the free PSA scan
            </Link>
          </section>
          <section className="rounded-[var(--radius-lg)] border border-white/[0.08] border-l-[3px] border-l-[#0EA5E9] bg-white/[0.04] backdrop-blur-sm p-6">
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">Features that power this</h3>
            <p className="mt-2 text-sm">
              <a href="/features/ai-insights" className="text-[var(--accent)] hover:underline">AI Insights</a>
              {" · "}
              <a href="/features/health-dashboard" className="text-[var(--accent)] hover:underline">Delivery Health Dashboard</a>
            </p>
          </section>
        </div>
      </section>

      <MarketingRelatedPages
        links={[
          { href: "/features/health-dashboard", title: "Delivery health dashboard", Icon: Activity },
          { href: "/solutions/service-desk-managers", title: "Service desk managers", Icon: Gauge },
          { href: "/pricing", title: "Plans and pricing", Icon: BarChart3 },
        ]}
      />
    </MarketingPageLayout>
  );
}

