import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, LayoutTemplate, Paintbrush } from "lucide-react";

import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingRelatedPages } from "@/components/marketing-related-pages";
import { MarketingPageLayout } from "@/components/marketing-page-layout";

export const metadata: Metadata = {
  title: "White Label MSP Reporting Tool | Custom Branding for Client Reports | Handover",
  description:
    "Handover's white label mode lets MSPs brand every client report, QBR pack, and export with their own logo, colours, and company identity. Your clients see your brand, not ours.",
  alternates: { canonical: "https://gethandover.uk/features/white-label" },
};

export default function WhiteLabelFeaturePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Handover White Label",
    applicationCategory: "BusinessApplication",
    description: metadata.description,
    url: "https://gethandover.uk/features/white-label",
  };
  return (
    <MarketingPageLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="marketing-page-hero relative overflow-hidden bg-[var(--bg-primary)] px-6 py-12 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto max-w-[1000px] rounded-[var(--radius-lg)] border border-[rgba(56,189,248,0.25)] bg-[rgba(15,23,42,0.68)] p-8">
          <h1 className="text-3xl font-semibold text-white md:text-5xl">Your Reports. Your Brand. Your Identity.</h1>
          <div className="mt-5"><Link href="/auth?tab=signup" className="inline-flex rounded-[var(--radius)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]">Start your free trial at gethandover.uk</Link></div>
        </div>
      </section>
      <section className="px-6 py-12 md:px-8">
        <div className="mx-auto max-w-[900px] space-y-8 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
          <p>When your clients receive a weekly report or a QBR pack, they should see your company. Your logo. Your colours. Your name. Not a third-party tool&apos;s branding hidden in the footer.</p>
          <p>Handover&apos;s white label mode removes all Handover branding from every client-facing output and replaces it with your company identity throughout.</p>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">What White Label Covers</h2>
          <p><strong className="text-[var(--text-primary)]">Logo</strong><br />Upload your company logo once and it appears on every report, every QBR pack, every PowerPoint deck, every PDF, and every Excel export your team produces.</p>
          <p><strong className="text-[var(--text-primary)]">Brand Colours</strong><br />Set your primary brand accent colour and Handover applies it to chart bars, section headers, progress indicators, divider lines, and button accents across every output.</p>
          <p><strong className="text-[var(--text-primary)]">Company Name</strong><br />Your company name appears in report headers, email footers, PowerPoint slide footers, and PDF document properties. Every touchpoint carries your identity.</p>
          <p><strong className="text-[var(--text-primary)]">Email Sender</strong><br />Scheduled reports go out from your domain rather than a generic Handover address, maintaining the appearance of a fully internal communication from your team.</p>
          <p><strong className="text-[var(--text-primary)]">No Handover Branding</strong><br />In white label mode, no Handover logos, watermarks, or references appear anywhere in client-facing outputs. Your clients have no visibility into the tools you use to produce their reports.</p>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Why White Label Matters For MSPs</h2>
          <p>Your client relationships are built on trust and perceived professionalism. Every touchpoint with a client is an opportunity to reinforce your brand and your identity as a professional service provider.</p>
          <p>A report that arrives branded as your company reinforces that identity. A report that arrives with third-party tool branding, even subtly, introduces a question in the client&apos;s mind about whether the MSP is producing this themselves or just running something through a tool.</p>
          <p>White label removes that question entirely. Your clients experience your service. Your brand. Your professionalism. Handover stays completely in the background.</p>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Available on Pro and Enterprise Plans</h2>
          <p>White label mode is available on Pro and Enterprise plans. Upload your logo and set your brand colour in the settings panel and every output from that point forward carries your identity.</p>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] border-l-[3px] border-l-[#0EA5E9] p-5">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Who uses this</h3>
            <p className="mt-2 text-sm">Best fit for <a href="/solutions/account-managers" className="text-[var(--accent)] hover:underline">Account Managers</a>, <a href="/solutions/msp-directors" className="text-[var(--accent)] hover:underline">MSP Directors</a>, and <a href="/solutions/project-managers" className="text-[var(--accent)] hover:underline">Project Managers</a>.</p>
          </div>
        </div>
      </section>

      <MarketingRelatedPages
        links={[
          { href: "/features/qbr-generator", title: "QBR pack generator", Icon: LayoutTemplate },
          { href: "/features/exports", title: "Excel and PowerPoint export", Icon: Paintbrush },
          { href: "/pricing", title: "Plans and pricing", Icon: BarChart3 },
        ]}
      />
    </MarketingPageLayout>
  );
}

