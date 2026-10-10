import type { Metadata } from "next";
import Link from "next/link";
import { Activity, BarChart3, Gauge } from "lucide-react";

import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingRelatedPages } from "@/components/marketing-related-pages";
import { MarketingPageLayout } from "@/components/marketing-page-layout";

export const metadata: Metadata = {
  title: "MSP Delivery Health Dashboard | Live RAG Status Across All Clients | Handover",
  description:
    "Handover's delivery health dashboard gives MSP service managers a live RAG status view across every client account, ticket, and project. Know which accounts need attention before anyone escalates.",
  alternates: { canonical: "https://gethandover.uk/features/health-dashboard" },
};

export default function HealthDashboardFeaturePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Handover Delivery Health Dashboard",
    applicationCategory: "BusinessApplication",
    description: metadata.description,
    url: "https://gethandover.uk/features/health-dashboard",
  };
  return (
    <MarketingPageLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="marketing-page-hero relative overflow-hidden bg-transparent px-6 py-12 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto max-w-[1000px] rounded-[var(--radius-lg)] border border-[rgba(56,189,248,0.25)] bg-[rgba(15,23,42,0.68)] p-8">
          <h1 className="text-3xl font-semibold text-white md:text-5xl">Know Which Clients Need Attention Before They Call You.</h1>
          <div className="mt-5"><Link href="/onboarding/connect" className="inline-flex rounded-[var(--radius)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]">Run the free PSA scan</Link></div>
        </div>
      </section>
      <section className="px-6 py-12 md:px-8">
        <div className="mx-auto max-w-[900px] space-y-8 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
          <p>Every MSP service manager has had the call. The client who has been quietly unhappy for two weeks finally picks up the phone. The ticket that has been sitting open too long becomes an escalation. The project that was drifting amber quietly turned red while nobody was looking.</p>
          <p>Handover&apos;s delivery health dashboard shows you the RAG status of every client account, ticket, and project in real time. You see the problems before your clients do. You act before anything escalates.</p>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">What the Health Dashboard Shows</h2>
          <p><strong className="text-[var(--text-primary)]">Account-Level RAG Status</strong><br />Every client account in your connected PSA gets a calculated health score based on open ticket age, overdue items, SLA risk, and project progress. Green means healthy. Amber means attention needed. Red means act today.</p>
          <p><strong className="text-[var(--text-primary)]">Ticket Health View</strong><br />Open tickets flagged by age, priority, and SLA proximity. Tickets approaching breach are highlighted before they breach. Unassigned tickets are surfaced immediately.</p>
          <p><strong className="text-[var(--text-primary)]">Project Health View</strong><br />Every active project with completion percentage, task status, and RAG indicator. Projects that are behind schedule are flagged automatically. Blocked tasks are visible at a glance.</p>
          <p><strong className="text-[var(--text-primary)]">Cross-Client Overview</strong><br />See the health of your entire client base on a single screen. Not buried in PSA reports. Not requiring a manual audit. A live, at-a-glance view of where things stand across every account you manage.</p>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">From Dashboard to Action in One Click</h2>
          <p>When the health dashboard surfaces a problem, Handover makes it easy to act. Expand any flagged account or project to see the full detail. Generate a report for that client directly from the dashboard. Push a note back to the PSA. Or open the relevant item directly in HaloPSA or ConnectWise with a single click.</p>
          <p>The health dashboard is not just visibility. It is the starting point for proactive service delivery.</p>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Built on Live PSA Data</h2>
          <p>The health dashboard pulls from your connected HaloPSA or ConnectWise instance in real time. No manual data entry. No scheduled syncs. No stale snapshots. The status you see reflects what is actually happening in your PSA right now.</p>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] border-l-[3px] border-l-[#0EA5E9] p-5">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Who uses this</h3>
            <p className="mt-2 text-sm">Best fit for <Link href="/solutions/service-desk-managers" className="text-[var(--accent)] hover:underline">Service Desk Managers</Link> and <Link href="/solutions/msp-directors" className="text-[var(--accent)] hover:underline">MSP Directors</Link>.</p>
          </div>
        </div>
      </section>

      <MarketingRelatedPages
        links={[
          { href: "/solutions/sla-reporting", title: "SLA and performance reporting", Icon: Gauge },
          { href: "/features/ai-insights", title: "AI-powered insights", Icon: Activity },
          { href: "/pricing", title: "Plans and pricing", Icon: BarChart3 },
        ]}
      />
    </MarketingPageLayout>
  );
}

