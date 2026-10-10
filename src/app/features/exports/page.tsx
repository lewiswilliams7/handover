import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, FileDown, Presentation } from "lucide-react";

import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingRelatedPages } from "@/components/marketing-related-pages";
import { MarketingPageLayout } from "@/components/marketing-page-layout";

export const metadata: Metadata = {
  title: "Excel and PowerPoint Export for MSP Reports | Handover",
  description:
    "Export your Handover reports and QBR packs as branded PowerPoint presentations, PDF documents, or formatted Excel workbooks. Professional outputs ready to present or send.",
  alternates: { canonical: "https://gethandover.uk/features/exports" },
};

export default function ExportsFeaturePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Handover Exports",
    applicationCategory: "BusinessApplication",
    description: metadata.description,
    url: "https://gethandover.uk/features/exports",
  };
  return (
    <MarketingPageLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="marketing-page-hero relative overflow-hidden bg-transparent px-6 py-12 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto max-w-[1000px] rounded-[var(--radius-lg)] border border-[rgba(56,189,248,0.25)] bg-[rgba(15,23,42,0.68)] p-8">
          <h1 className="text-3xl font-semibold text-white md:text-5xl">Professional Export Formats for Every Situation.</h1>
        <div className="mt-5"><Link href="/onboarding/connect" className="inline-flex rounded-[var(--radius)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]">Run the free PSA scan</Link></div>
        </div>
      </section>
      <section className="px-6 py-12 md:px-8">
        <div className="mx-auto max-w-[900px] space-y-8 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
          <p>A great report is only as good as how it gets delivered. Some clients want an email. Some want a document to share with their board. Some want a spreadsheet they can dig into. Some want a presentation to review in a meeting.</p>
          <p>Handover exports every report and QBR pack in the format that works for each situation.</p>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">PowerPoint Export</h2>
          <p>The PowerPoint export turns your QBR pack into a fully branded, presentation-ready deck. Each section becomes a professionally designed slide with your company logo, brand colours, visual charts, and clear data presentation.</p>
          <p>Open it. Add a title slide if you want. Present it. There is nothing to reformat, no charts to rebuild, no data to copy in. The deck is ready the moment you export it.</p>
          <p>Built for account managers who present QBRs in client meetings and want to walk in with something that looks like it took a design team a day to produce. It takes Handover under a minute.</p>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">PDF Export</h2>
          <p>Clean, professional PDF documents ready to send by email, share via link, or leave with a client after a meeting.</p>
          <p>The PDF export preserves all charts, formatting, and branding from the in-app report view. Every page looks polished. Every section is clearly structured. It reads like a document produced by a professional services firm, not an automated tool.</p>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Excel Export</h2>
          <p>Formatted Excel workbooks with data tables, chart data, and supporting information organised across clearly labelled worksheets.</p>
          <p>Built for clients who want to interrogate the numbers, finance directors who want to feed data into their own reporting, and MSP operations teams who want a record of reported data they can work with directly.</p>
          <p>Headers in Title Case. Rows auto-fitted to content. Brand accent colours applied to section headers. Data organised logically across worksheets that correspond to each report section.</p>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Custom Branding on Every Export</h2>
          <p>Every export format uses your company branding. Your logo. Your brand colours. Your company name in the headers and footers. The output looks like it came from your MSP, not from a third-party tool.</p>
          <p>White label mode removes all Handover branding entirely for MSPs who want their clients to experience a fully branded service.</p>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] border-l-[3px] border-l-[#0EA5E9] p-5">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Who uses this</h3>
            <p className="mt-2 text-sm">Best fit for <Link href="/solutions/qbr" className="text-[var(--accent)] hover:underline">Quarterly Business Reviews</Link>, <Link href="/solutions/account-managers" className="text-[var(--accent)] hover:underline">Account Managers</Link>, and <Link href="/solutions/msp-directors" className="text-[var(--accent)] hover:underline">MSP Directors</Link>.</p>
          </div>
        </div>
      </section>

      <MarketingRelatedPages
        links={[
          { href: "/features/qbr-generator", title: "QBR pack generator", Icon: Presentation },
          { href: "/features/white-label", title: "White label and branding", Icon: FileDown },
          { href: "/pricing", title: "Plans and pricing", Icon: BarChart3 },
        ]}
      />
    </MarketingPageLayout>
  );
}

