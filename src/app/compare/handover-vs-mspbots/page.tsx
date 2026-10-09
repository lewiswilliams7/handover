import type { Metadata } from "next";
import Link from "next/link";

import { CompareTable } from "@/components/compare-table";
import { FaqSection } from "@/components/faq-section";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { SeoPageCta } from "@/components/seo-page-cta";
import { softwareApplicationJsonLd } from "@/lib/seo-page-jsonld";

const PATH = "/compare/handover-vs-mspbots";
const CANONICAL = `https://gethandover.uk${PATH}`;
const TITLE = "Handover vs MSPBots for MSP Reporting - Which Is Right for Your Team?";
const DESCRIPTION =
  "MSPBots automates MSP operations with bots and dashboards. Handover generates professional narrative client reports, QBR packs, and automated weekly updates from HaloPSA and ConnectWise. Here is the difference.";

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
    feature: "Primary focus",
    handover: "Client-facing narrative reports, QBR packs, and automated client communication",
    competitor: "Internal operational automation - bots, alerts, and dashboards",
  },
  {
    feature: "Narrative client reports",
    handover: "AI-generated prose client updates from live PSA data in 30 seconds",
    competitor: "Dashboard and bot outputs - not narrative prose reports",
  },
  {
    feature: "QBR pack generation",
    handover: "Complete QBR with executive summary, PowerPoint, and Excel in under 60 seconds",
    competitor: "No QBR pack builder",
  },
  {
    feature: "Automated weekly client emails",
    handover: "Scheduled reports sent to clients automatically - set up once",
    competitor: "Bot notifications - not designed for client email communication",
  },
  {
    feature: "Push notes back to PSA",
    handover: "Generated notes pushed directly back into HaloPSA or ConnectWise tickets",
    competitor: "Automation flows available but not report push-back",
  },
  {
    feature: "AI output quality",
    handover: "Trained on MSP delivery language - reads like a senior PM wrote it",
    competitor: "Bot and alert language - functional but not client-facing prose",
  },
  {
    feature: "HaloPSA integration",
    handover: "Native - HaloPSA marketplace listed",
    competitor: "Integrations available",
  },
  {
    feature: "ConnectWise integration",
    handover: "Native - ConnectWise marketplace listed",
    competitor: "Integrations available",
  },
  {
    feature: "Client portal",
    handover: "Branded client login to view reports (Enterprise)",
    competitor: "Dashboard sharing available",
  },
  {
    feature: "Pricing",
    handover: "£499/month - straightforward account-level pricing",
    competitor: "Per-user pricing - can scale significantly with team size",
  },
];

const faqs = [
  {
    q: "What is MSPBots?",
    a: "MSPBots is an MSP automation platform that uses AI and bots to automate internal workflows - ticket escalations, SLA alerts, technician utilisation tracking, and operational dashboards. It is primarily an internal operational tool focused on MSP efficiency and automation.",
  },
  {
    q: "What is the difference between Handover and MSPBots?",
    a: "MSPBots is designed to automate internal MSP operations - keeping your team efficient, flagging issues, and surfacing operational metrics. Handover is designed for client-facing communication - generating the professional narrative reports, QBR packs, and automated client emails that demonstrate value to clients and protect contract renewals. They solve different problems.",
  },
  {
    q: "Can MSPBots generate narrative client reports?",
    a: "MSPBots can surface data in dashboards and automate alerts, but it is not designed to generate the narrative prose client updates that Handover produces - the kind of professional written communication that an account manager would send to a client's IT director or MD.",
  },
  {
    q: "Which is better for MSP client communication - Handover or MSPBots?",
    a: "Handover is purpose-built for MSP client communication. Every feature is designed around the client-facing workflow - generating reports that read like a senior PM wrote them, scheduling automated weekly updates, producing QBR packs in under 60 seconds, and pushing notes back to PSA tickets. MSPBots is better suited to internal operational automation.",
  },
  {
    q: "Can I use both Handover and MSPBots?",
    a: "Yes. They serve different purposes and can complement each other. MSPBots handles internal workflow automation and operational alerting. Handover handles the client communication that comes out of that operational data - turning your PSA activity into professional client updates automatically.",
  },
  {
    q: "How much does Handover cost compared to MSPBots?",
    a: "Handover is £499/month or £4,990 annually. Pricing is account-level, with every feature included and no client counting.",
  },
];

export default function HandoverVsMspbotsPage() {
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
            <span className="text-white/60">Handover vs MSPBots</span>
          </nav>

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(56,189,248,0.3)] bg-[rgba(56,189,248,0.08)] px-3 py-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#38bdf8]">
              Comparison
            </span>
          </div>

          <h1 className="mb-6 max-w-3xl text-[38px] font-semibold leading-[1.1] tracking-tight text-white md:text-[54px]">
            Handover vs MSPBots <span className="text-[#38bdf8]">for MSP reporting</span>
          </h1>

          <p className="mb-8 max-w-2xl text-[17px] leading-relaxed text-white/60">
            MSPBots automates your internal operations. Handover automates your client
            communication. Both serve MSP teams - they just solve different problems. Here is an
            honest breakdown of what each tool does.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/onboarding/connect"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#38bdf8] to-[#0ea5e9] px-6 py-3 text-[14px] font-semibold text-[#06091a] transition-all hover:scale-[1.02]"
            >
              Try Handover free for 14 days →
            </Link>
          </div>
        </div>
      </section>

      <section className="relative z-[1] border-y border-white/[0.06] bg-white/[0.02] px-6 py-8 md:px-8">
        <div className="mx-auto max-w-[1100px]">
          <p className="text-[15px] leading-relaxed text-white/70 md:text-[17px]">
            <span className="font-semibold text-white">The honest verdict:</span> MSPBots and
            Handover are complementary tools. If your problem is internal operational efficiency,
            MSPBots is the right choice. If your problem is client communication - professional
            weekly updates, QBR packs, automated client emails - Handover is purpose-built for that
            workflow.
          </p>
        </div>
      </section>

      <section className="relative z-[1] px-6 py-12 md:px-8 md:py-20">
        <div className="mx-auto max-w-[1100px]">
          <h2 className="mb-8 text-[28px] font-semibold tracking-tight text-white md:text-[36px]">
            Feature comparison
          </h2>
          <CompareTable rows={rows} competitorName="MSPBots" />
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

      <SeoPageCta headline="Built specifically for MSP client communication" />
    </MarketingPageLayout>
  );
}
