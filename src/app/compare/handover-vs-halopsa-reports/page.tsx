import type { Metadata } from "next";
import Link from "next/link";

import { CompareTable } from "@/components/compare-table";
import { FaqSection } from "@/components/faq-section";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { SeoPageCta } from "@/components/seo-page-cta";
import { softwareApplicationJsonLd } from "@/lib/seo-page-jsonld";

const PATH = "/compare/handover-vs-halopsa-reports";
const CANONICAL = `https://gethandover.uk${PATH}`;
const TITLE = "Handover vs HaloPSA Native Reporting - Beyond Built-In PSA Reports";
const DESCRIPTION =
  "HaloPSA has powerful built-in reporting. It cannot generate narrative client updates, automate weekly client emails, or produce QBR packs. Here is what HaloPSA MSPs use Handover for.";

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

const rows = [
  {
    feature: "Narrative client reports",
    handover: "AI-generated prose client updates from live HaloPSA ticket data in 30 seconds",
    competitor: "Ticket lists, SLA reports, and data exports - not narrative prose",
  },
  {
    feature: "Automated weekly client emails",
    handover: "Scheduled reports sent to clients automatically - set up once, runs forever",
    competitor: "No automated client email sending",
  },
  {
    feature: "QBR pack generation",
    handover: "Complete QBR with executive summary, PowerPoint, and Excel from live HaloPSA data",
    competitor: "No QBR pack builder",
  },
  {
    feature: "Push notes back to tickets",
    handover: "Generated notes pushed directly back into HaloPSA tickets via the API",
    competitor: "HaloPSA is the source - no push-back needed",
  },
  {
    feature: "AI output quality",
    handover: "Trained on MSP delivery language - reads like a senior PM wrote it",
    competitor: "No AI narrative generation",
  },
  {
    feature: "Custom field mapping",
    handover: "Maps HaloPSA custom fields into every report automatically",
    competitor: "Custom fields available but not auto-mapped to report outputs",
  },
  {
    feature: "Week-over-week continuity",
    handover: "Tracks what changed - reports show progression not repeated status",
    competitor: "No report continuity",
  },
  {
    feature: "Delivery health dashboard",
    handover: "RAG status per client, overdue ticket alerting, portfolio health view",
    competitor: "Reporting available but not delivery-health focused",
  },
  {
    feature: "Client portal",
    handover: "Branded client login to view reports (Enterprise)",
    competitor: "Client portal available via HaloPSA",
  },
  {
    feature: "HaloPSA Marketplace",
    handover: "Listed on HaloPSA marketplace - one-click install",
    competitor: "Native - already in your instance",
  },
];

const faqs = [
  {
    q: "Does HaloPSA have built-in reporting?",
    a: "Yes. HaloPSA has extensive built-in reporting - ticket reports, SLA dashboards, time and billing summaries, custom report builders, and a client portal. These are designed for operational data visibility. They do not generate narrative client-facing communication - the kind of professional weekly update or quarterly business review that demonstrates value to a client and protects contract renewals.",
  },
  {
    q: "Why do HaloPSA MSPs use Handover?",
    a: "HaloPSA MSPs use Handover to automate the client communication that HaloPSA's native reporting does not produce. Handover reads live HaloPSA ticket and project data and generates professional narrative reports - weekly client updates, QBR packs, action logs, risk registers, and client emails - automatically. It also pushes the generated notes back into HaloPSA tickets, keeping the PSA history complete.",
  },
  {
    q: "Is Handover listed on the HaloPSA marketplace?",
    a: "Yes. Handover is listed on the official HaloPSA marketplace and has a native API integration with HaloPSA. The integration was built directly with the HaloPSA team and supports live ticket data, project data, custom field mapping, and push-back of generated notes to tickets.",
  },
  {
    q: "Can Handover read HaloPSA custom fields?",
    a: "Yes. Handover supports custom field mapping for HaloPSA. You map your HaloPSA custom fields to Handover once, and every report generated automatically incorporates those fields into the output. This means reports reference your account-specific data - not just standard ticket fields.",
  },
  {
    q: "What is the difference between HaloPSA reporting and Handover?",
    a: "HaloPSA reporting gives you operational data in structured formats - tables, charts, exports. Handover gives you client communication in professional prose - weekly updates, QBR packs, action logs, and client emails written from the perspective of a senior service delivery manager who knows the account. They solve different problems and most HaloPSA MSPs use both.",
  },
  {
    q: "How long does it take to set up Handover with HaloPSA?",
    a: "Under 2 minutes. Connect your HaloPSA instance via API key, select the clients and tickets you want to include, and click generate. Your first report is ready in 30 seconds. Scheduled automation can be set up in another 5 minutes.",
  },
  {
    q: "What HaloPSA MSPs save by using Handover?",
    a: "Typically 3-5 hours per week. HaloPSA delivery teams spend significant time copying ticket data into client emails, formatting weekly updates, and building QBR presentations. Handover automates the entire process - reading live HaloPSA data and generating professional outputs in under 60 seconds.",
  },
];

export default function HandoverVsHalopsaPage() {
  const jsonLd = softwareApplicationJsonLd({
    name: "Handover",
    description: DESCRIPTION,
    url: CANONICAL,
  });

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  return (
    <MarketingPageLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <section className="marketing-page-hero relative overflow-hidden bg-transparent px-6 py-12 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto max-w-[1100px]">
          <nav className="mb-6 flex items-center gap-2 text-[12px] text-white/40">
            <Link href="/" className="transition-colors hover:text-white/70">
              Handover
            </Link>
            <span>/</span>
            <Link href="/compare" className="transition-colors hover:text-white/70">
              Compare
            </Link>
            <span>/</span>
            <span className="text-white/60">Handover vs HaloPSA Reports</span>
          </nav>

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(56,189,248,0.3)] bg-[rgba(56,189,248,0.08)] px-3 py-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#38bdf8]">
              Comparison
            </span>
          </div>

          <h1 className="mb-6 max-w-3xl text-[38px] font-semibold leading-[1.1] tracking-tight text-white md:text-[54px]">
            HaloPSA reporting <span className="text-[#38bdf8]">vs Handover</span>
          </h1>

          <p className="mb-8 max-w-2xl text-[17px] leading-relaxed text-white/60">
            HaloPSA has excellent built-in reporting for operational data. What it does not do is
            generate narrative client communication, automate weekly client emails, or produce QBR
            packs. Handover connects directly to HaloPSA and handles all of that - in 30 seconds.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/onboarding/connect"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#38bdf8] to-[#0ea5e9] px-6 py-3 text-[14px] font-semibold text-[#06091a] transition-all hover:scale-[1.02]"
            >
              Try Handover free for 14 days →
            </Link>
            <Link
              href="/integrations/halopsa"
              className="inline-flex items-center justify-center rounded-xl border border-white/[0.15] bg-white/[0.05] px-6 py-3 text-[14px] font-medium text-white transition-all hover:bg-white/[0.08]"
            >
              HaloPSA integration details →
            </Link>
          </div>
        </div>
      </section>

      <section className="relative z-[1] border-y border-white/[0.06] bg-white/[0.02] px-6 py-8 md:px-8">
        <div className="mx-auto max-w-[1100px]">
          <p className="text-[15px] leading-relaxed text-white/70 md:text-[17px]">
            <span className="font-semibold text-white">The honest verdict:</span> HaloPSA native
            reporting and Handover are not competitors. HaloPSA handles your operational data.
            Handover handles your client communication. The two work together - Handover reads from
            HaloPSA and pushes back into it.
          </p>
        </div>
      </section>

      <section className="relative z-[1] px-6 py-12 md:px-8 md:py-20">
        <div className="mx-auto max-w-[1100px]">
          <h2 className="mb-8 text-[28px] font-semibold tracking-tight text-white md:text-[36px]">
            What HaloPSA does vs what Handover adds
          </h2>
          <CompareTable rows={rows} competitorName="HaloPSA Native" />
        </div>
      </section>

      <section className="relative z-[1] px-6 pb-12 md:px-8 md:pb-20">
        <div className="mx-auto max-w-[800px]">
          <h2 className="mb-8 text-[26px] font-semibold tracking-tight text-white md:text-[32px]">
            Frequently asked questions
          </h2>
          <FaqSection faqs={faqs} />
        </div>
      </section>

      <SeoPageCta headline="HaloPSA handles your data - Handover handles your client communication" />
    </MarketingPageLayout>
  );
}
