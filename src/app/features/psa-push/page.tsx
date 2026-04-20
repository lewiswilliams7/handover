import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftRight, BarChart3, Plug } from "lucide-react";

import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingRelatedPages } from "@/components/marketing-related-pages";
import { MarketingPageLayout } from "@/components/marketing-page-layout";

export const metadata: Metadata = {
  title: "Push Report Notes Back to HaloPSA and ConnectWise | Handover",
  description:
    "Handover can automatically push generated report summaries back to the relevant tickets and projects in HaloPSA and ConnectWise. Keep your PSA updated without any additional manual entries.",
  alternates: { canonical: "https://gethandover.uk/features/psa-push" },
};

export default function PsaPushFeaturePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Handover PSA Push",
    applicationCategory: "BusinessApplication",
    description: metadata.description,
    url: "https://gethandover.uk/features/psa-push",
  };
  return (
    <MarketingPageLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="marketing-page-hero relative overflow-hidden bg-[var(--bg-primary)] px-6 py-12 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto max-w-[1000px] rounded-[var(--radius-lg)] border border-[rgba(56,189,248,0.25)] bg-[rgba(15,23,42,0.68)] p-8">
          <h1 className="text-3xl font-semibold text-white md:text-5xl">Reports That Update Your PSA Automatically.</h1>
          <div className="mt-5"><Link href="/auth?tab=signup" className="inline-flex rounded-[var(--radius)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]">Start your free trial at gethandover.uk</Link></div>
        </div>
      </section>
      <section className="px-6 py-12 md:px-8">
        <div className="mx-auto max-w-[900px] space-y-8 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
          <p>Generating a client report is one thing. Making sure that report is reflected in your PSA is another. Without it, your PSA becomes out of sync with your client communication. Notes go in the email but not in the ticket. Context gets lost. The next engineer who picks up the ticket has no idea what was communicated to the client last week.</p>
          <p>Handover closes that loop automatically.</p>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">How PSA Push Works</h2>
          <p>When Handover generates a report, whether manual or scheduled, it can automatically push a summary note back to the relevant tickets and projects in your PSA.</p>
          <p>For HaloPSA it uses the Actions API to create a new action note on each included ticket and project. For ConnectWise it posts a new note to each included service ticket and project record.</p>
          <p>The note contains a summary of what was reported, when it was sent, and what actions were identified. Your PSA stays current. Your team has full context. Nothing falls through the gap between client communication and internal records.</p>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Configurable Per Report</h2>
          <p>PSA push is configurable for each report and scheduled report. Choose which outputs get pushed back, client email summary, actions list, risks, or the full report content. Choose whether push happens automatically on generation or requires manual confirmation. Set it per client based on how much detail you want in each PSA record.</p>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Why It Matters For Service Continuity</h2>
          <p>Service continuity depends on context. When an engineer picks up a ticket they should be able to see the full history of client communication, not just the technical notes. When an account manager prepares for a client call they should be able to see what was reported last week without asking someone else.</p>
          <p>Handover&apos;s PSA push ensures that your client communication history lives where your team actually works, inside the PSA, alongside the operational data that drives service delivery.</p>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] border-l-[3px] border-l-[#0EA5E9] p-5">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Who uses this</h3>
            <p className="mt-2 text-sm">Best fit for <a href="/solutions/project-managers" className="text-[var(--accent)] hover:underline">Project Managers</a>, <a href="/solutions/account-managers" className="text-[var(--accent)] hover:underline">Account Managers</a>, and <a href="/solutions/connectwise" className="text-[var(--accent)] hover:underline">ConnectWise Users</a>.</p>
          </div>
        </div>
      </section>

      <MarketingRelatedPages
        links={[
          { href: "/features/psa-integration", title: "PSA integration", Icon: Plug },
          { href: "/features/automated-reports", title: "Automated client reports", Icon: ArrowLeftRight },
          { href: "/pricing", title: "Plans and pricing", Icon: BarChart3 },
        ]}
      />
    </MarketingPageLayout>
  );
}

