import type { Metadata } from "next";
import Link from "next/link";

import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { SeoPageCta } from "@/components/seo-page-cta";
import { ScrollRevealItem } from "@/components/scroll-reveal-item";

const PATH = "/msp-reporting-software";
const CANONICAL = `https://gethandover.uk${PATH}`;
const TITLE = "MSP Reporting Software - The Complete Guide for 2026";
const DESCRIPTION =
  "The best MSP reporting software connects to HaloPSA or ConnectWise, generates professional client reports automatically, and produces QBR packs in under 60 seconds. Here is what to look for and how the tools compare.";

export const metadata: Metadata = {
  title: `${TITLE} | Handover`,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: CANONICAL,
    siteName: "Handover",
    type: "website",
  },
};

const tools = [
  {
    name: "Handover",
    category: "Purpose-built MSP client reporting",
    aiReports: true,
    qbr: true,
    scheduling: true,
    pushBack: true,
    pricing: "£499/month or £4,990/year",
  },
  {
    name: "BrightGauge",
    category: "MSP dashboards and reporting",
    aiReports: false,
    qbr: false,
    scheduling: true,
    pushBack: false,
    pricing: "Higher per-seat pricing",
  },
  {
    name: "MSPBots",
    category: "MSP operational automation",
    aiReports: false,
    qbr: false,
    scheduling: false,
    pushBack: false,
    pricing: "Per-user pricing",
  },
  {
    name: "ChatGPT / Copilot",
    category: "Generic AI writing",
    aiReports: true,
    qbr: false,
    scheduling: false,
    pushBack: false,
    pricing: "From free",
  },
  {
    name: "Manual reporting",
    category: "No tool",
    aiReports: false,
    qbr: false,
    scheduling: false,
    pushBack: false,
    pricing: "3-5 hours per week in staff time",
  },
];

const faqs = [
  {
    q: "What is MSP reporting software?",
    a: "MSP reporting software automates the creation of client-facing reports for Managed Service Providers. It connects to a PSA (Professional Services Automation) system like HaloPSA or ConnectWise, reads live ticket and project data, and generates professional client updates - weekly status reports, quarterly business reviews, action logs, and risk registers - without manual effort. The best MSP reporting tools generate these outputs in under 60 seconds and deliver them automatically to clients on a schedule.",
  },
  {
    q: "What is the best MSP reporting software in 2026?",
    a: "The best MSP reporting software depends on your primary need. For automated narrative client communication - weekly updates, QBR packs, and client emails - Handover is purpose-built for this workflow with native HaloPSA and ConnectWise integrations. For dashboard-based KPI reporting, BrightGauge is the established choice. For internal operational automation, MSPBots is widely used. Most MSPs that need professional client communication choose Handover for its AI-generated output quality and PSA-native integration.",
  },
  {
    q: "What features should MSP reporting software have?",
    a: "The most important features in MSP reporting software are: native PSA integration (HaloPSA or ConnectWise) with no middleware, AI-generated narrative reports that read like a senior PM wrote them, automated scheduling so reports go out without manual effort, QBR pack generation with PowerPoint export, and push-back to PSA tickets so your system of record stays complete. Handover includes all of these on every paid plan.",
  },
  {
    q: "How much does MSP reporting software cost?",
    a: "MSP reporting software ranges from free DIY automation tools (with significant engineering overhead) to £200+ per month for enterprise platforms. Handover is £499/month or £4,990 annually, with every feature included. At an MSP engineer loaded cost of £35/hour, the time savings from automated reporting can pay back the subscription cost quickly.",
  },
  {
    q: "Does MSP reporting software integrate with HaloPSA?",
    a: "Handover has a native HaloPSA integration and is listed on the official HaloPSA marketplace. It connects directly to your HaloPSA instance via API, reads live ticket and project data, generates reports, and pushes notes back to tickets. No middleware, no CSV exports, no manual data preparation.",
  },
  {
    q: "Does MSP reporting software integrate with ConnectWise?",
    a: "Handover has a native ConnectWise Manage integration and is listed on the ConnectWise marketplace. It works the same as the HaloPSA integration - direct API connection, live data, automated reports, and push-back to ConnectWise tickets.",
  },
  {
    q: "Can MSP reporting software generate QBR packs?",
    a: "Handover generates complete QBR packs from live PSA data in under 60 seconds - executive summary, risk register, PowerPoint presentation, and 17-sheet Excel data pack. Most MSP reporting tools do not include a QBR pack builder. Preparing a QBR manually typically takes 3-5 hours; Handover does it in under a minute.",
  },
  {
    q: "What is the difference between MSP reporting software and PSA reporting?",
    a: "PSA reporting (built into HaloPSA, ConnectWise, and similar tools) provides internal operational data - ticket queues, SLA dashboards, time summaries. MSP reporting software like Handover takes that operational data and transforms it into client-facing communication - narrative updates, QBR packs, and professional emails written for a non-technical audience. PSA reporting is for your team. MSP reporting software is for your clients.",
  },
];

const schemaJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Handover",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: DESCRIPTION,
      url: CANONICAL,
      offers: {
        "@type": "Offer",
        price: "29",
        priceCurrency: "GBP",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: "29",
          priceCurrency: "GBP",
          unitText: "MONTH",
        },
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: { "@type": "Answer", text: faq.a },
      })),
    },
  ],
};

export default function MspReportingSoftwarePage() {
  return (
    <MarketingPageLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaJsonLd) }}
      />

      <section className="marketing-page-hero relative overflow-hidden bg-transparent px-6 py-12 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto max-w-[1100px]">
          <nav className="mb-6 flex items-center gap-2 text-[12px] text-white/40">
            <Link href="/" className="transition-colors hover:text-white/70">
              Handover
            </Link>
            <span>/</span>
            <span className="text-white/60">MSP Reporting Software</span>
          </nav>

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(56,189,248,0.3)] bg-[rgba(56,189,248,0.08)] px-3 py-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#38bdf8]">
              Category Guide · 2026
            </span>
          </div>

          <h1 className="mb-6 max-w-3xl text-[38px] font-semibold leading-[1.1] tracking-tight text-white md:text-[54px]">
            MSP reporting software - <span className="text-[#38bdf8]">the complete guide</span>
          </h1>

          <p className="mb-8 max-w-2xl text-[17px] leading-relaxed text-white/60">
            MSP teams spend 3-5 hours a week on client reporting. The right reporting software
            eliminates that entirely - connecting to your PSA, generating professional client
            updates, and sending them automatically. Here is what to look for and how the tools
            compare in 2026.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/onboarding/connect"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#38bdf8] to-[#0ea5e9] px-6 py-3 text-[14px] font-semibold text-[#06091a] transition-all hover:scale-[1.02]"
            >
              Try Handover free for 14 days →
            </Link>
            <a
              href="/demo/Example_QBR_Q2-2026.pptx"
              download
              className="inline-flex items-center justify-center rounded-xl border border-white/[0.15] bg-white/[0.05] px-6 py-3 text-[14px] font-medium text-white transition-all hover:bg-white/[0.08]"
            >
              Download sample QBR pack ↓
            </a>
          </div>
        </div>
      </section>

      <section className="relative z-[1] px-6 py-12 md:px-8 md:py-20">
        <div className="mx-auto max-w-[1100px]">
          <ScrollRevealItem index={0} className="block">
            <h2 className="mb-6 text-[28px] font-semibold tracking-tight text-white md:text-[36px]">
              What MSP reporting software should do
            </h2>
          </ScrollRevealItem>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Connect to your PSA natively",
                body: "The best tools connect directly to HaloPSA or ConnectWise via API - no CSV exports, no middleware, no copy-pasting. They read your live ticket and project data automatically.",
              },
              {
                title: "Generate narrative reports",
                body: "Data tables and dashboards are not client communication. Good MSP reporting software produces narrative prose - the kind of professional update a senior account manager would write.",
              },
              {
                title: "Automate the delivery",
                body: "If someone has to click a button to send a weekly report, it will not happen consistently. Automated scheduling means your clients hear from you every week without anyone touching it.",
              },
              {
                title: "Produce QBR packs",
                body: "A quarterly business review prepared manually takes 3-5 hours. Good reporting software generates a complete QBR pack - executive summary, PowerPoint, Excel - in under 60 seconds.",
              },
              {
                title: "Push back to your PSA",
                body: "Generated report notes should flow back into your PSA tickets automatically. This keeps your system of record complete and eliminates manual note-taking.",
              },
              {
                title: "Scale without adding headcount",
                body: "Five clients or fifty - the best reporting software produces the same quality output across your entire portfolio without additional resource.",
              },
            ].map((item, i) => (
              <ScrollRevealItem key={item.title} index={i} className="block">
                <div className="h-full rounded-xl border border-white/[0.07] bg-white/[0.03] p-5">
                  <h3 className="mb-2 text-[14px] font-semibold text-white">{item.title}</h3>
                  <p className="text-[13px] leading-relaxed text-white/55">{item.body}</p>
                </div>
              </ScrollRevealItem>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-[1] px-6 pb-12 md:px-8 md:pb-20">
        <div className="mx-auto max-w-[1100px]">
          <ScrollRevealItem index={0} className="block">
            <h2 className="mb-8 text-[28px] font-semibold tracking-tight text-white md:text-[36px]">
              MSP reporting tools compared
            </h2>
          </ScrollRevealItem>
          <div className="overflow-x-auto rounded-2xl border border-white/[0.07]">
            <table className="w-full min-w-[700px] text-[13px]">
              <thead>
                <tr className="border-b border-white/[0.07] bg-white/[0.04]">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/50">
                    Tool
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/50">
                    AI Reports
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/50">
                    QBR Packs
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/50">
                    Scheduling
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/50">
                    PSA Push-back
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/50">
                    Pricing
                  </th>
                </tr>
              </thead>
              <tbody>
                {tools.map((tool, i) => (
                  <tr
                    key={tool.name}
                    className={`border-b border-white/[0.05] ${i === 0 ? "bg-[rgba(56,189,248,0.04)]" : ""}`}
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white">{tool.name}</div>
                      <div className="mt-0.5 text-[11px] text-white/40">{tool.category}</div>
                    </td>
                    <td className="px-5 py-4">
                      {tool.aiReports ? (
                        <span className="text-[#38bdf8]">✓</span>
                      ) : (
                        <span className="text-white/20"> - </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {tool.qbr ? (
                        <span className="text-[#38bdf8]">✓</span>
                      ) : (
                        <span className="text-white/20"> - </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {tool.scheduling ? (
                        <span className="text-[#38bdf8]">✓</span>
                      ) : (
                        <span className="text-white/20"> - </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {tool.pushBack ? (
                        <span className="text-[#38bdf8]">✓</span>
                      ) : (
                        <span className="text-white/20"> - </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-white/60">{tool.pricing}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="relative z-[1] px-6 pb-12 md:px-8 md:pb-20">
        <div className="mx-auto max-w-[1100px]">
          <h2 className="mb-6 text-[24px] font-semibold tracking-tight text-white">
            Detailed comparisons
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "Handover vs ChatGPT", href: "/compare/handover-vs-chatgpt" },
              { label: "Handover vs BrightGauge", href: "/compare/handover-vs-brightgauge" },
              { label: "Handover vs MSPBots", href: "/compare/handover-vs-mspbots" },
              { label: "Handover vs n8n", href: "/compare/handover-vs-n8n" },
              { label: "Handover vs Rewst", href: "/compare/handover-vs-rewst" },
              { label: "Handover vs manual reporting", href: "/compare/handover-vs-manual-reporting" },
              {
                label: "Handover vs ConnectWise reports",
                href: "/compare/handover-vs-connectwise-reports",
              },
              { label: "Handover vs HaloPSA reports", href: "/compare/handover-vs-halopsa-reports" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-[13px] font-medium text-white/70 transition-all hover:border-[#38bdf8]/20 hover:bg-white/[0.05] hover:text-white"
              >
                {link.label}
                <span className="text-white/30">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-[1] px-6 pb-12 md:px-8 md:pb-20">
        <div className="mx-auto max-w-[800px]">
          <h2 className="mb-8 text-[26px] font-semibold tracking-tight text-white md:text-[32px]">
            Frequently asked questions
          </h2>
          <div className="space-y-0 divide-y divide-white/[0.06] rounded-2xl border border-white/[0.07] bg-white/[0.02]">
            {faqs.map((faq) => (
              <details key={faq.q} className="group px-6 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <span className="text-[15px] font-medium text-white">{faq.q}</span>
                  <span className="flex-shrink-0 text-white/30 transition-transform duration-200 group-open:rotate-45">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path
                        d="M8 3v10M3 8h10"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </summary>
                <p className="mt-3 text-[14px] leading-relaxed text-white/55">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <SeoPageCta headline="The MSP reporting software built for HaloPSA and ConnectWise" />
    </MarketingPageLayout>
  );
}
