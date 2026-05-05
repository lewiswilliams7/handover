import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Plug, Presentation } from "lucide-react";

import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingRelatedPages } from "@/components/marketing-related-pages";
import { MarketingPageLayout } from "@/components/marketing-page-layout";

export const metadata: Metadata = {
  title: "ConnectWise Manage Client Reporting Tool | Automated Reports From ConnectWise | Handover",
  description:
    "Handover connects natively to ConnectWise Manage and generates automated client reports, QBR packs, and scheduled updates from your live ticket and project data. Works out of the box.",
  alternates: {
    canonical: "https://gethandover.uk/solutions/connectwise",
  },
};

export default function ConnectWiseSolutionPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "ConnectWise Manage Client Reporting Tool | Automated Reports From ConnectWise | Handover",
    description: metadata.description,
    url: "https://gethandover.uk/solutions/connectwise",
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
              Native ConnectWise Integration
            </div>
            <h1 className="mt-3 text-3xl font-semibold leading-tight text-white md:text-5xl">
              ConnectWise Gives You the Data. Handover Turns It Into Client Communication.
            </h1>
            <div className="mt-6">
              <Link
                href="/auth?tab=signup&returnTo=/welcome"
                className="inline-flex items-center rounded-[var(--radius)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
              >
                Connect ConnectWise and generate your first report free
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-10 md:px-8 md:py-14">
        <div className="mx-auto w-full max-w-[900px] space-y-10 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
          <p>
            ConnectWise Manage is the PSA of choice for some of the most operationally mature MSPs in the world. The
            service board is powerful. The project management module is comprehensive. The reporting engine gives you
            visibility into almost everything happening in your business.
          </p>
          <p>Almost everything except what your clients actually need to see.</p>
          <p>
            ConnectWise Manage is built for MSP operations. Not for client communication. That gap is where Handover
            lives.
          </p>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Native ConnectWise Manage Integration</h2>
            <p className="mt-3">
              Handover connects directly to the ConnectWise Manage REST API using your company credentials and API
              keys. The connection takes under five minutes to set up. There is no middleware, no third-party
              connector, and no additional configuration required within ConnectWise.
            </p>
            <p className="mt-3">
              Once connected, Handover pulls your live service tickets, project data, task completion rates, time
              entries, and SLA information. Everything it needs to generate accurate, complete, intelligent client
              reports.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">What ConnectWise Users Use Handover For</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                <strong className="text-[var(--text-primary)]">Automated Weekly Service Reports</strong>
                <br />
                Connect your ConnectWise Manage instance, select the service tickets and projects for each client, set
                a weekly schedule, and Handover sends a professional client update automatically. No manual writing. No
                formatting. No missed weeks. See{" "}
                <Link href="/solutions/weekly-client-reporting" className="text-[var(--accent)] underline-offset-2 hover:underline">
                  Weekly Client Reporting
                </Link>
                .
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">QBR Pack Generation</strong>
                <br />
                Generate a complete, presentation-ready QBR pack from your ConnectWise data in under a minute. Visual
                charts, executive summary, SLA performance, project status, and AI-generated recommendations. Exported
                as a branded PowerPoint deck ready to present. See{" "}
                <Link href="/solutions/qbr" className="text-[var(--accent)] underline-offset-2 hover:underline">
                  QBR
                </Link>
                .
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Project Delivery Updates</strong>
                <br />
                Handover pulls your ConnectWise project tasks and generates clear project status reports that clients
                can understand without needing access to your ConnectWise instance.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Push Notes Back to ConnectWise</strong>
                <br />
                Reports generated by Handover can be pushed back as notes to the relevant service tickets and project
                records in ConnectWise Manage automatically. Your PSA stays current without any additional manual work.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Delivery Health Dashboard</strong>
                <br />
                RAG status across all your active ConnectWise tickets and projects. See which clients need attention
                before they call you.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Built For ConnectWise Data Structures</h2>
            <p className="mt-3">
              ConnectWise Manage has its own data model. Service tickets live on the service board. Projects use a
              separate project ticket structure. Time entries, configurations, and contacts each have their own API
              endpoints.
            </p>
            <p className="mt-3">
              Handover understands all of it. The integration pulls the right data from the right places and generates
              reports that accurately reflect the full picture of your ConnectWise service delivery. Not just the
              surface-level ticket summary, but the notes, the time spent, the tasks completed, and the risks
              identified.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              For MSPs Running Both ConnectWise and HaloPSA
            </h2>
            <p className="mt-3">
              Some MSPs run both ConnectWise Manage and HaloPSA simultaneously, whether across different service teams,
              different subsidiaries, or during a migration between platforms.
            </p>
            <p className="mt-3">
              Handover supports both PSAs in a single platform. Your client reports can draw from ConnectWise data,
              HaloPSA data, or both together. Your reporting does not have to reflect the complexity of your internal
              tooling. It just shows the client what matters.
            </p>
          </section>

          <section className="rounded-[var(--radius-lg)] border border-white/[0.08] border-l-[3px] border-l-[#0EA5E9] bg-white/[0.04] backdrop-blur-sm p-6">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              The First Purpose-Built, Out-of-the-Box Reporting Tool for ConnectWise MSPs
            </h2>
            <p className="mt-3">
              Connect ConnectWise Manage and generate your first client report today. Nothing to configure. Nothing to
              install. Nothing to learn.
            </p>
            <Link href="/auth?tab=signup&returnTo=/welcome" className="marketing-page-bottom-cta mt-5 inline-flex items-center">
              Connect ConnectWise and generate your first report free
            </Link>
          </section>
          <section className="rounded-[var(--radius-lg)] border border-white/[0.08] border-l-[3px] border-l-[#0EA5E9] bg-white/[0.04] backdrop-blur-sm p-6">
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">Features that power this</h3>
            <p className="mt-2 text-sm">
              <a href="/features/psa-integration" className="text-[var(--accent)] hover:underline">PSA Integration</a>
              {" · "}
              <a href="/features/psa-push" className="text-[var(--accent)] hover:underline">Push Notes to PSA</a>
            </p>
          </section>
        </div>
      </section>

      <MarketingRelatedPages
        links={[
          { href: "/solutions/halopsa", title: "HaloPSA integration", Icon: Plug },
          { href: "/features/psa-integration", title: "PSA integration overview", Icon: Presentation },
          { href: "/pricing", title: "Plans and pricing", Icon: BarChart3 },
        ]}
      />
    </MarketingPageLayout>
  );
}

