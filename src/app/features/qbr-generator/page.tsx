import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, FileDown, LayoutTemplate } from "lucide-react";

import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingRelatedPages } from "@/components/marketing-related-pages";
import { MarketingPageLayout } from "@/components/marketing-page-layout";

export const metadata: Metadata = {
  title: "QBR Pack Generator for MSPs | Generate Quarterly Business Reviews From Your PSA | Handover",
  description:
    "Generate complete branded QBR packs from HaloPSA or ConnectWise data in under a minute. Executive summary, visual charts, SLA performance, project status, and AI recommendations. Export as PowerPoint, PDF, or Excel.",
  alternates: { canonical: "https://gethandover.uk/features/qbr-generator" },
};

export default function QbrGeneratorFeaturePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Handover QBR Pack Generator",
    applicationCategory: "BusinessApplication",
    description: metadata.description,
    url: "https://gethandover.uk/features/qbr-generator",
  };
  return (
    <MarketingPageLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="marketing-page-hero relative overflow-hidden bg-transparent px-6 py-12 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto max-w-[1000px] rounded-[var(--radius-lg)] border border-[rgba(56,189,248,0.25)] bg-[rgba(15,23,42,0.68)] p-8">
          <h1 className="text-3xl font-semibold text-white md:text-5xl">A Complete QBR Pack. From Your PSA. In Under a Minute.</h1>
        <div className="mt-5"><Link href="/onboarding/connect" className="inline-flex rounded-[var(--radius)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]">Run the free PSA scan</Link></div>
        </div>
      </section>
      <section className="px-6 py-12 md:px-8">
        <div className="mx-auto max-w-[900px] space-y-8 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
          <p>Quarterly Business Reviews take two to four hours per client to prepare manually. Senior time pulled from other work. The same data reformatted into a different presentation every quarter. Quality that varies depending on who prepared it and how much time they had.</p>
          <p>Handover generates a complete, branded, presentation-ready QBR pack from your live PSA data in under 60 seconds.</p>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">What the QBR Pack Contains</h2>
          <p><strong className="text-[var(--text-primary)]">Executive Summary</strong><br />AI-generated in plain business English. Summarises the quarter, highlights achievements, acknowledges challenges honestly, and frames the conversation ahead. Board-level language, not service desk language.</p>
          <p><strong className="text-[var(--text-primary)]">Ticket Volume Charts</strong><br />Visual bar charts showing ticket volume week by week across the quarter. Your client sees the workload trend. They understand the value your team delivered.</p>
          <p><strong className="text-[var(--text-primary)]">SLA Performance</strong><br />Visual SLA compliance data presented as a percentage, a trend over time, and broken down by priority level. Clear, honest, and professional.</p>
          <p><strong className="text-[var(--text-primary)]">Project Status Overview</strong><br />Every active project with a visual progress bar, RAG status indicator, and plain-English summary. Clients understand project health at a glance.</p>
          <p><strong className="text-[var(--text-primary)]">Risk Register</strong><br />AI-identified risks from your live ticket and project data, formatted for a business audience. A clear picture of what needs attention and why it matters.</p>
          <p><strong className="text-[var(--text-primary)]">Recommendations and Next Steps</strong><br />Forward-looking and specific. What should happen next quarter, what decisions need to be made, what your MSP recommends. Makes you look proactive and strategically invested in the client outcome.</p>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Export Formats Built For How QBRs Actually Happen</h2>
          <p><strong className="text-[var(--text-primary)]">PowerPoint</strong><br />A fully branded, presentation-ready deck. Each section becomes a professionally designed slide with your logo, brand colours, and charts. Open it. Present it. Nothing to reformat.</p>
          <p><strong className="text-[var(--text-primary)]">PDF</strong><br />A polished document ready to send before the meeting or leave with the client afterwards.</p>
          <p><strong className="text-[var(--text-primary)]">Excel</strong><br />Full data workbook with charts and supporting tables for clients who want to dig into the numbers.</p>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Configurable For Every Client</h2>
          <p>The QBR wizard lets you choose exactly what each pack contains. Select your PSA source, set your date range, toggle sections on or off, and set your branding. Every QBR pack is tailored to the client without any additional manual work.</p>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">The Maths Are Simple</h2>
          <p>15 clients. 3 hours of QBR preparation per client per quarter. That is 45 hours of senior time every quarter on formatting. Handover reduces that to under 15 minutes total.</p>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] border-l-[3px] border-l-[#0EA5E9] p-5">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Who uses this</h3>
            <p className="mt-2 text-sm">Best fit for <a href="/solutions/account-managers" className="text-[var(--accent)] hover:underline">Account Managers</a>, <a href="/solutions/msp-directors" className="text-[var(--accent)] hover:underline">MSP Directors</a>, and <a href="/solutions/project-managers" className="text-[var(--accent)] hover:underline">Project Managers</a>.</p>
          </div>
        </div>
      </section>

      <MarketingRelatedPages
        links={[
          { href: "/solutions/qbr", title: "Quarterly business reviews", Icon: LayoutTemplate },
          { href: "/features/exports", title: "Excel and PowerPoint export", Icon: FileDown },
          { href: "/pricing", title: "Plans and pricing", Icon: BarChart3 },
        ]}
      />
    </MarketingPageLayout>
  );
}

