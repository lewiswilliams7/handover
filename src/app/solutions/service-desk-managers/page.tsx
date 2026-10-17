import type { Metadata } from "next";
import Link from "next/link";
import { Activity, BarChart3, CalendarClock } from "lucide-react";

import { MarketingRelatedPages } from "@/components/marketing-related-pages";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { ProductHero } from "@/components/marketing/product-hero";
import { AppFrame, RiskMock } from "@/components/marketing/product-mocks";

export const metadata: Metadata = {
  title: "Handover for Service Desk Managers | Spot Service Slipping Before the Client Does",
  description:
    "Handover connects to HaloPSA and ConnectWise, flags clients whose response times, backlog or ticket patterns have changed, and turns live ticket data into client-ready reporting.",
  alternates: {
    canonical: "https://gethandover.uk/solutions/service-desk-managers",
  },
};

export default function SolutionsServiceDeskManagersPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Handover for Service Desk Managers",
    description: metadata.description,
    url: "https://gethandover.uk/solutions/service-desk-managers",
  };

  return (
    <MarketingPageLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ProductHero
        eyebrow="For service desk managers"
        title="Spot service slipping for a client before they do."
        body="Handover checks every client's response times, resolution times, backlog and ticket patterns against their own history, and tells you which ones have changed. Then it turns the same data into reporting your clients can read."
        primary={{ href: "/onboarding/connect", label: "Run your free scan" }}
        visual={<AppFrame path="/attention" label="Solutions · Service Desk Managers in Handover"><RiskMock /></AppFrame>}
      />

      <section className="px-6 py-10 md:px-8 md:py-14">
        <div className="mx-auto w-full max-w-[900px] space-y-10 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
          <p>
            Service desk managers see every open ticket, every SLA risk, and every recurring issue. Clients usually do
            not. That visibility gap erodes trust and increases chasing calls.
          </p>
          <p>Handover closes the gap with automated, client-friendly reporting built from your live ticket data.</p>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              What Handover does for service desk managers
            </h2>
            <p className="mt-3">
              Handover connects to HaloPSA or ConnectWise and generates readable account updates that explain what is
              open, what is resolved, what risks exist, and what action is being taken.
            </p>
            <p className="mt-3 font-medium text-[var(--text-primary)]">In 30 seconds. For any client. Any time.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              Give every client the communication they deserve
            </h2>
            <p className="mt-3">
              Automated weekly reports level communication quality across your full book of business, not just top
              accounts. Every client gets consistent updates regardless of account size.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">SLA performance that speaks for itself</h2>
            <p className="mt-3">
              Handover visualises SLA compliance and context so clients understand performance quickly and appreciate
              transparency when service quality is strong.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Spot patterns before they become problems</h2>
            <p className="mt-3">
              Delivery health RAG views expose accounts with rising volume, long-open tickets, and growing risk so your
              team can intervene before escalation.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Consistent reporting across your team</h2>
            <p className="mt-3">
              Shift patterns and staff changes introduce reporting variability. Handover standardises tone, structure,
              and cadence so clients experience dependable communication even under load.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Reduce inbound chasing calls</h2>
            <p className="mt-3">
              When clients already have a clear weekly view of open and in-progress work, they call less for updates.
              That creates more capacity for true resolution work and improves satisfaction.
            </p>
          </section>

          <section className="rounded-[var(--radius-lg)] border border-white/[0.08] border-l-[3px] border-l-[#0EA5E9] bg-white/[0.04] backdrop-blur-sm p-6">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Works with HaloPSA and ConnectWise Manage</h2>
            <p className="mt-3">
              Connect natively with no configuration project. Run one PSA or both in parallel and keep client reporting
              unified.
            </p>
            <Link href="/onboarding/connect" className="marketing-page-bottom-cta mt-5 inline-flex items-center">
              Run the free PSA scan
            </Link>
          </section>
          <section className="rounded-[var(--radius-lg)] border border-white/[0.08] border-l-[3px] border-l-[#0EA5E9] bg-white/[0.04] backdrop-blur-sm p-6">
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">Features that power this</h3>
            <p className="mt-2 text-sm">
              <a href="/features/revenue-at-risk" className="text-[var(--accent)] hover:underline">Revenue at Risk</a>
              {" · "}
              <a href="/features/save-plays" className="text-[var(--accent)] hover:underline">Save Plays</a>
              {" · "}
              <a href="/features/automated-reports" className="text-[var(--accent)] hover:underline">Automated Reports</a>
              {" · "}
              <a href="/features/health-dashboard" className="text-[var(--accent)] hover:underline">Delivery Health Dashboard</a>
              {" · "}
              <a href="/features/scheduled-reports" className="text-[var(--accent)] hover:underline">Scheduled Reports</a>
            </p>
          </section>
        </div>
      </section>

      <MarketingRelatedPages
        links={[
          { href: "/solutions/sla-reporting", title: "SLA and performance reporting", Icon: Activity },
          { href: "/features/scheduled-reports", title: "Scheduled reporting", Icon: CalendarClock },
          { href: "/pricing", title: "Plans and pricing", Icon: BarChart3 },
        ]}
      />
    </MarketingPageLayout>
  );
}

