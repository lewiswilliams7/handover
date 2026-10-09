import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, LayoutTemplate, Sparkles } from "lucide-react";

import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingRelatedPages } from "@/components/marketing-related-pages";
import { MarketingPageLayout } from "@/components/marketing-page-layout";

export const metadata: Metadata = {
  title: "Handover for MSP Directors | The Client Retention Tool You Didn't Know Was Missing",
  description:
    "Handover gives MSP directors visibility across every client account, automates client reporting, and surfaces risks before they become churn. Built for MSPs running on HaloPSA and ConnectWise.",
  alternates: {
    canonical: "https://gethandover.uk/solutions/msp-directors",
  },
};

export default function SolutionsMspDirectorsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Handover for MSP Directors",
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
              Solutions · MSP Directors
            </p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight text-white md:text-5xl">
              Your team is doing great work. Your clients just do not know it yet.
            </h1>
            <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-white/75">
              Handover closes the perception gap between service delivery and client value by automating consistent,
              intelligent communication from your live PSA data.
            </p>
            <div className="mt-6">
              <Link
                href="/onboarding/connect"
                className="inline-flex items-center rounded-[var(--radius)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
              >
                See how Handover works for your MSP
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-10 md:px-8 md:py-14">
        <div className="mx-auto w-full max-w-[900px] space-y-10 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
          <p>
            Running an MSP means proving value to stakeholders who do not live in your PSA. The MSPs that retain
            clients are not always those doing the best technical work. They are the ones communicating it best.
          </p>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">The problem every MSP director recognises</h2>
            <p className="mt-3">
              Engineers are busy, service desks are closing tickets, and project teams are delivering. But clients do
              not see that daily reality. They see invoices and occasional escalations. That perception gap is a
              retention problem, and it is fixable.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">What Handover does for MSP directors</h2>
            <p className="mt-3">
              Handover connects to HaloPSA or ConnectWise Manage and generates professional client-facing reports from
              live ticket and project data. Reports are sent automatically every week, per client, with no manual
              drafting, formatting, or chasing.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Visibility across every client account</h2>
            <p className="mt-3">
              Delivery health gives you RAG visibility across accounts and projects so you can identify risk before the
              client escalates. Green means stable, amber means intervention needed, red means immediate action.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Consistent communication at scale</h2>
            <p className="mt-3">
              As your MSP grows, communication quality usually drops. Handover scales communication by sending branded,
              client-friendly weekly reports generated from live PSA data across your full client base.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">QBRs that take minutes, not days</h2>
            <p className="mt-3">
              Generate executive summaries, ticket trends, SLA performance, project status, risks, and next steps as a
              branded PowerPoint deck or PDF in under a minute. Better quality, lower prep time, stronger client
              conversations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">The business case is simple</h2>
            <p className="mt-3">
              If account managers spend 45 hours per quarter preparing QBRs, that is substantial senior cost spent on
              formatting. Handover replaces manual assembly with consistent, automated output that scales.
            </p>
          </section>

          <section className="rounded-[var(--radius-lg)] border border-white/[0.08] border-l-[3px] border-l-[#0EA5E9] bg-white/[0.04] backdrop-blur-sm p-6">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Works with the PSA you already use</h2>
            <p className="mt-3">
              Connect to HaloPSA or ConnectWise with no migration project and no consultancy overhead. If you use both
              PSAs, Handover supports both simultaneously.
            </p>
            <Link href="/onboarding/connect" className="marketing-page-bottom-cta mt-5 inline-flex items-center">
              See how Handover works for your MSP
            </Link>
          </section>
          <section className="rounded-[var(--radius-lg)] border border-white/[0.08] border-l-[3px] border-l-[#0EA5E9] bg-white/[0.04] backdrop-blur-sm p-6">
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">Features that power this</h3>
            <p className="mt-2 text-sm">
              <a href="/features/health-dashboard" className="text-[var(--accent)] hover:underline">Delivery Health Dashboard</a>
              {" · "}
              <a href="/features/scheduled-reports" className="text-[var(--accent)] hover:underline">Scheduled Reports</a>
              {" · "}
              <a href="/features/ai-insights" className="text-[var(--accent)] hover:underline">AI Insights</a>
            </p>
          </section>
        </div>
      </section>

      <MarketingRelatedPages
        links={[
          { href: "/solutions/account-managers", title: "Account managers", Icon: LayoutTemplate },
          { href: "/features/ai-insights", title: "AI-powered insights", Icon: Sparkles },
          { href: "/pricing", title: "Plans and pricing", Icon: BarChart3 },
        ]}
      />
    </MarketingPageLayout>
  );
}

