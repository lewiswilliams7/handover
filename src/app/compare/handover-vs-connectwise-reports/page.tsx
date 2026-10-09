import type { Metadata } from "next";
import Link from "next/link";

import { CompareTable } from "@/components/compare-table";
import { FaqSection } from "@/components/faq-section";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { SeoPageCta } from "@/components/seo-page-cta";
import { softwareApplicationJsonLd } from "@/lib/seo-page-jsonld";

const PATH = "/compare/handover-vs-connectwise-reports";
const CANONICAL = `https://gethandover.uk${PATH}`;
const TITLE = "Handover vs ConnectWise Native Reporting - What ConnectWise Can't Do";
const DESCRIPTION =
  "ConnectWise has built-in reporting. But it cannot generate narrative client updates, automate weekly emails, produce QBR packs, or push notes back to tickets. Here is what MSPs use Handover for alongside ConnectWise.";

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
    handover: "AI-generated prose reports written for client consumption in 30 seconds",
    competitor: "Ticket lists and dashboard data - not narrative prose",
  },
  {
    feature: "Automated weekly client emails",
    handover: "Scheduled reports sent automatically to clients - no manual work",
    competitor: "No automated client email sending",
  },
  {
    feature: "QBR pack generation",
    handover:
      "Complete QBR pack with executive summary, PowerPoint, and Excel in under 60 seconds",
    competitor: "No QBR pack builder",
  },
  {
    feature: "Push notes back to tickets",
    handover: "Generated report notes pushed directly back into ConnectWise tickets",
    competitor: "Data flows out only - no push-back",
  },
  {
    feature: "AI output quality",
    handover: "Trained on MSP delivery language - specific, professional, never generic",
    competitor: "No AI generation",
  },
  {
    feature: "Week-over-week continuity",
    handover: "Tracks progression across reports - clients see movement not repeated status",
    competitor: "No report continuity",
  },
  {
    feature: "Client portal",
    handover: "Branded client login to view reports (Enterprise)",
    competitor: "Client portal available via ConnectWise",
  },
  {
    feature: "HaloPSA support",
    handover: "Native HaloPSA integration alongside ConnectWise",
    competitor: "ConnectWise only",
  },
  {
    feature: "Pricing",
    handover: "£499/month or £4,990/year",
    competitor: "Included in ConnectWise licensing",
  },
  {
    feature: "Setup time",
    handover: "Connect once - first report in under 2 minutes",
    competitor: "Built in but requires report configuration",
  },
];

const faqs = [
  {
    q: "Does ConnectWise have built-in reporting?",
    a: "Yes. ConnectWise Manage includes native reporting tools - ticket lists, time reports, SLA dashboards, and custom report builders. These are useful for internal operational visibility. They are not designed to generate narrative, client-facing communication - the kind of professional update that builds client confidence and protects contract renewals.",
  },
  {
    q: "Why do ConnectWise MSPs use Handover?",
    a: "ConnectWise MSPs use Handover to automate the client communication that ConnectWise's native reporting does not produce - weekly narrative updates, QBR packs, action logs written for a client audience, and scheduled automated emails. Handover sits on top of ConnectWise, reads the live ticket and project data, and handles all client-facing communication automatically.",
  },
  {
    q: "Is Handover better than ConnectWise reporting?",
    a: "They serve different purposes. ConnectWise native reporting is for operational data visibility - ticket queues, SLA metrics, engineer utilisation. Handover is for client communication - the professional narrative updates, quarterly business reviews, and automated client emails that make an MSP look organised and trustworthy to their clients. Most teams use both.",
  },
  {
    q: "Does Handover integrate with ConnectWise Manage?",
    a: "Yes. Handover has a native ConnectWise Manage integration and is listed on the ConnectWise marketplace. It connects directly to your ConnectWise instance via API - no middleware, no CSV exports. It pulls your live ticket and project data and generates reports automatically.",
  },
  {
    q: "Can Handover push report notes back to ConnectWise tickets?",
    a: "Yes. This is one of Handover's most distinctive features. After generating a report, Handover can push the generated notes directly back into the relevant ConnectWise tickets. Your PSA history stays complete without anyone manually updating it.",
  },
  {
    q: "What does a ConnectWise MSP save by using Handover?",
    a: "Typically 3-5 hours per week on client reporting. The average MSP delivery manager spends 2-4 hours writing weekly client updates and 4-6 hours preparing each QBR pack. Handover reduces both to under 60 seconds and costs £499/month or £4,990 annually.",
  },
];

export default function HandoverVsConnectwisePage() {
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
            <span className="text-white/60">Handover vs ConnectWise Reports</span>
          </nav>

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(56,189,248,0.3)] bg-[rgba(56,189,248,0.08)] px-3 py-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#38bdf8]">
              Comparison
            </span>
          </div>

          <h1 className="mb-6 max-w-3xl text-[38px] font-semibold leading-[1.1] tracking-tight text-white md:text-[54px]">
            ConnectWise reporting <span className="text-[#38bdf8]">vs Handover</span>
          </h1>

          <p className="mb-8 max-w-2xl text-[17px] leading-relaxed text-white/60">
            ConnectWise has built-in reporting - ticket lists, SLA dashboards, time summaries. What
            it cannot do is write a professional client update, generate a QBR pack, or send
            automated weekly emails to your clients. That is what Handover is for.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/onboarding/connect"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#38bdf8] to-[#0ea5e9] px-6 py-3 text-[14px] font-semibold text-[#06091a] transition-all hover:scale-[1.02]"
            >
              Try Handover free for 14 days →
            </Link>
            <Link
              href="/integrations/connectwise"
              className="inline-flex items-center justify-center rounded-xl border border-white/[0.15] bg-white/[0.05] px-6 py-3 text-[14px] font-medium text-white transition-all hover:bg-white/[0.08]"
            >
              ConnectWise integration details →
            </Link>
          </div>
        </div>
      </section>

      <section className="relative z-[1] border-y border-white/[0.06] bg-white/[0.02] px-6 py-8 md:px-8">
        <div className="mx-auto max-w-[1100px]">
          <p className="text-[15px] leading-relaxed text-white/70 md:text-[17px]">
            <span className="font-semibold text-white">The honest verdict:</span> ConnectWise native
            reporting and Handover are not competitors - they serve different purposes. ConnectWise
            is for internal operational data. Handover is for client-facing communication. Most MSPs
            on ConnectWise use both.
          </p>
        </div>
      </section>

      <section className="relative z-[1] px-6 py-12 md:px-8 md:py-20">
        <div className="mx-auto max-w-[1100px]">
          <h2 className="mb-8 text-[28px] font-semibold tracking-tight text-white md:text-[36px]">
            What ConnectWise does vs what Handover adds
          </h2>
          <CompareTable rows={rows} competitorName="ConnectWise Native" />
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

      <SeoPageCta headline="ConnectWise handles your operations - Handover handles your client communication" />
    </MarketingPageLayout>
  );
}
