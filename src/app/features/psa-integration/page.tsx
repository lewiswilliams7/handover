import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Plug, RefreshCw } from "lucide-react";

import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingRelatedPages } from "@/components/marketing-related-pages";
import { MarketingPageLayout } from "@/components/marketing-page-layout";

export const metadata: Metadata = {
  title: "Native HaloPSA and ConnectWise Integration | Handover",
  description:
    "Handover connects natively to HaloPSA and ConnectWise Manage with no middleware, no configuration, and no setup required. Connect your PSA and generate your first report in minutes.",
  alternates: { canonical: "https://gethandover.uk/features/psa-integration" },
};

export default function PsaIntegrationFeaturePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Handover PSA Integration",
    applicationCategory: "BusinessApplication",
    description: metadata.description,
    url: "https://gethandover.uk/features/psa-integration",
  };
  return (
    <MarketingPageLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="marketing-page-hero relative overflow-hidden bg-transparent px-6 py-12 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto max-w-[1000px] rounded-[var(--radius-lg)] border border-[rgba(56,189,248,0.25)] bg-[rgba(15,23,42,0.68)] p-8">
          <h1 className="text-3xl font-semibold text-white md:text-5xl">Native PSA Integration. No Middleware. No Setup. No Compromise.</h1>
          <div className="mt-5"><Link href="/auth?tab=signup&returnTo=/welcome" className="inline-flex rounded-[var(--radius)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]">Connect your PSA today</Link></div>
        </div>
      </section>
      <section className="px-6 py-12 md:px-8">
        <div className="mx-auto max-w-[900px] space-y-8 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
          <p>Most tools that claim PSA integration provide a shallow connection. They pull a basic ticket list and call it done. The notes are missing. The project tasks are not there. The SLA data does not come through. You end up with a report that looks like it was generated from a fraction of your actual data.</p>
          <p>Handover connects directly to the HaloPSA and ConnectWise Manage APIs. Full ticket detail including notes, actions, agent assignments, priorities, and SLA data. Full project data including task completion rates, milestones, and associated tickets. Everything in your PSA, available in every report.</p>
          <h2 id="halopsa" className="text-2xl font-semibold text-[var(--text-primary)]">HaloPSA Integration</h2>
          <p>Handover connects to HaloPSA using your existing API credentials. The integration pulls tickets, projects, ticket notes, actions, agents, clients, SLA data, and ticket type information directly from the HaloPSA API.</p>
          <p>Handover is an approved HaloPSA partner and is listed on the HaloPSA marketplace. The integration is built on the same API used by HaloPSA&apos;s own internal tooling, which means it is stable, comprehensive, and maintained against HaloPSA API updates.</p>
          <p>Push notes back to HaloPSA tickets and projects via the Actions API. Your PSA stays current without any additional manual work from your team.</p>
          <h2 id="connectwise" className="text-2xl font-semibold text-[var(--text-primary)]">ConnectWise Manage Integration</h2>
          <p>Handover connects to ConnectWise Manage using your company credentials and API keys. The integration pulls service tickets, project tickets, project tasks, time entries, contacts, and company data from the ConnectWise REST API.</p>
          <p>The ConnectWise integration understands the difference between service board tickets and project ticket structures. It pulls from both correctly and presents them in the right context in every report.</p>
          <p>Push notes back to ConnectWise service tickets and project records automatically on report generation.</p>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Both PSAs. One Platform.</h2>
          <p>If your MSP uses both HaloPSA and ConnectWise, Handover supports both simultaneously. Reports can draw from either or both PSAs depending on which tickets and projects you include. Your client reporting does not need to reflect the complexity of your internal tooling.</p>
          <p>If you are migrating between PSAs, Handover continues working throughout the transition without interruption.</p>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">More Integrations Coming</h2>
          <p>Autotask and ServiceNow integrations are in development. If you are on a PSA not yet supported, the Zapier integration coming soon will allow Handover to connect with any PSA via webhook.</p>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] border-l-[3px] border-l-[#0EA5E9] p-5">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Who uses this</h3>
            <p className="mt-2 text-sm">Best fit for <a href="/solutions/halopsa" className="text-[var(--accent)] hover:underline">HaloPSA Users</a>, <a href="/solutions/connectwise" className="text-[var(--accent)] hover:underline">ConnectWise Users</a>, and <a href="/solutions/msp-directors" className="text-[var(--accent)] hover:underline">MSP Directors</a>.</p>
          </div>
        </div>
      </section>

      <MarketingRelatedPages
        links={[
          { href: "/features/psa-push", title: "Push notes to PSA", Icon: Plug },
          { href: "/features/automated-reports", title: "Automated client reports", Icon: RefreshCw },
          { href: "/pricing", title: "Plans and pricing", Icon: BarChart3 },
        ]}
      />
    </MarketingPageLayout>
  );
}

