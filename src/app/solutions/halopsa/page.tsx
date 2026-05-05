import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Plug, RefreshCw } from "lucide-react";

import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingRelatedPages } from "@/components/marketing-related-pages";
import { MarketingPageLayout } from "@/components/marketing-page-layout";

export const metadata: Metadata = {
  title: "HaloPSA Client Reporting Tool | Automated Reports From HaloPSA | Handover",
  description:
    "Handover connects natively to HaloPSA and generates automated client reports, QBR packs, and scheduled updates from your live ticket and project data. No configuration. Works out of the box.",
  alternates: {
    canonical: "https://gethandover.uk/solutions/halopsa",
  },
};

export default function HaloPsaSolutionPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "HaloPSA Client Reporting Tool | Automated Reports From HaloPSA | Handover",
    description: metadata.description,
    url: "https://gethandover.uk/solutions/halopsa",
  };

  return (
    <MarketingPageLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="marketing-page-hero relative overflow-hidden bg-transparent px-6 py-12 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto w-full max-w-[1000px]">
          <div className="rounded-[var(--radius-lg)] border border-[rgba(56,189,248,0.28)] bg-[rgba(15,23,42,0.68)] px-6 py-8 shadow-[0_20px_60px_-22px_rgba(56,189,248,0.35)] md:px-10 md:py-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#38bdf8]">Solutions · By PSA</p>
            <div className="mt-2 inline-flex items-center rounded-full border border-[rgba(34,197,94,0.4)] bg-[rgba(34,197,94,0.12)] px-3 py-1 text-[11px] font-semibold text-[#86efac]">
              Native HaloPSA Integration
            </div>
            <h1 className="mt-3 text-3xl font-semibold leading-tight text-white md:text-5xl">
              The Reporting Layer HaloPSA Was Always Missing.
            </h1>
            <div className="mt-6">
              <Link
                href="/auth?tab=signup&returnTo=/welcome"
                className="inline-flex items-center rounded-[var(--radius)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
              >
                Connect HaloPSA and generate your first report free
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-10 md:px-8 md:py-14">
        <div className="mx-auto w-full max-w-[900px] space-y-10 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
          <p>
            HaloPSA is one of the most powerful PSA platforms available to MSPs. The ticket management is flexible. The
            project module is capable. The automation engine is genuinely impressive.
          </p>
          <p>
            But when it comes to client-facing reporting, HaloPSA gives you data. It does not give you communication.
          </p>
          <p>
            Handover is the reporting layer that sits on top of HaloPSA and turns your live data into professional
            client communication automatically.
          </p>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              Native HaloPSA Integration. No Middleware. No Configuration.
            </h2>
            <p className="mt-3">
              Handover connects directly to the HaloPSA API using your existing credentials. There is no middleware
              layer, no third-party connector, and no additional configuration required in HaloPSA.
            </p>
            <p className="mt-3">Connect once. Select your tickets and projects. Generate your first report.</p>
            <p className="mt-3">
              The integration pulls full ticket detail including notes, actions, agent assignments, priorities, SLA
              data, and status history. For projects it pulls task completion rates, project health, milestones, and
              associated tickets. Everything you need to produce a complete, accurate, and intelligent client report.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">What HaloPSA Users Use Handover For</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                <strong className="text-[var(--text-primary)]">Automated Weekly Client Reports</strong>
                <br />
                Select your HaloPSA tickets and projects for each client, set a weekly schedule, and Handover sends a
                professional client update automatically every week. Your team does not write it. It just goes. See{" "}
                <Link href="/solutions/weekly-client-reporting" className="text-[var(--accent)] underline-offset-2 hover:underline">
                  Weekly Client Reporting
                </Link>
                .
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">QBR Pack Generation</strong>
                <br />
                Generate a complete branded QBR pack from your HaloPSA data in under a minute. Executive summary, SLA
                charts, project status, risk register, and recommendations. Exported as PowerPoint, PDF, or Excel. See{" "}
                <Link href="/solutions/qbr" className="text-[var(--accent)] underline-offset-2 hover:underline">
                  QBR
                </Link>
                .
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Push Notes Back to HaloPSA</strong>
                <br />
                When Handover generates a report, it can automatically push a summary note back to the relevant tickets
                and projects in HaloPSA via the Actions API. Your PSA stays updated without any additional manual
                entries.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Delivery Health Dashboard</strong>
                <br />
                See a RAG status view across all your active HaloPSA tickets and projects. Know which clients need
                attention before anyone escalates.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Scheduled Reports With Full Control</strong>
                <br />
                Configure exactly what each scheduled report includes. Which tickets, which projects, which output
                sections, what branding, who receives it. Set it once and Handover handles the rest.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Listed on the HaloPSA Marketplace</h2>
            <p className="mt-3">
              Handover is an approved HaloPSA partner and is listed on the HaloPSA marketplace. You can find us
              directly through your HaloPSA account, or connect via gethandover.uk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Built For How HaloPSA Actually Works</h2>
            <p className="mt-3">
              Most reporting tools that claim PSA integration provide a shallow connection. They pull basic ticket data
              and call it done.
            </p>
            <p className="mt-3">
              Handover was built from the ground up with HaloPSA as the primary integration target. We understand the
              HaloPSA data model, ticket type structures, project task hierarchies, and Actions API. The reports
              Handover generates reflect the full richness of your HaloPSA data, not just the surface-level fields.
            </p>
          </section>

          <section className="rounded-[var(--radius-lg)] border border-white/[0.08] border-l-[3px] border-l-[#0EA5E9] bg-white/[0.04] backdrop-blur-sm p-6">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              The First Purpose-Built, Out-of-the-Box Reporting Tool for HaloPSA MSPs
            </h2>
            <p className="mt-3">
              Connect your HaloPSA instance and generate your first client report today. Nothing to configure. Nothing
              to install. Nothing to learn.
            </p>
            <Link href="/auth?tab=signup&returnTo=/welcome" className="marketing-page-bottom-cta mt-5 inline-flex items-center">
              Connect HaloPSA and generate your first report free
            </Link>
          </section>
          <section className="rounded-[var(--radius-lg)] border border-white/[0.08] border-l-[3px] border-l-[#0EA5E9] bg-white/[0.04] backdrop-blur-sm p-6">
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">Features that power this</h3>
            <p className="mt-2 text-sm">
              <a href="/features/psa-integration" className="text-[var(--accent)] hover:underline">PSA Integration</a>
              {" · "}
              <a href="/features/automated-reports" className="text-[var(--accent)] hover:underline">Automated Reports</a>
            </p>
          </section>
        </div>
      </section>

      <MarketingRelatedPages
        links={[
          { href: "/solutions/connectwise", title: "ConnectWise integration", Icon: Plug },
          { href: "/features/automated-reports", title: "Automated client reports", Icon: RefreshCw },
          { href: "/pricing", title: "Plans and pricing", Icon: BarChart3 },
        ]}
      />
    </MarketingPageLayout>
  );
}

