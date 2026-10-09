import type { Metadata } from "next";
import Link from "next/link";

import { CompareTable } from "@/components/compare-table";
import { FaqSection } from "@/components/faq-section";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { SeoPageCta } from "@/components/seo-page-cta";
import { softwareApplicationJsonLd } from "@/lib/seo-page-jsonld";

const PATH = "/compare/handover-vs-n8n";
const CANONICAL = `https://gethandover.uk${PATH}`;
const TITLE = "Handover vs n8n for MSP Reporting - Purpose-Built vs DIY Automation";
const DESCRIPTION =
  "n8n can automate almost anything if you build it yourself. Handover is purpose-built for MSP client reporting - native PSA integrations, AI-generated reports, QBR packs, and automated client emails. No workflow building required.";

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
    feature: "Setup time",
    handover: "Connect PSA once - first report in under 2 minutes, no workflow building",
    competitor: "Requires significant workflow design, testing, and maintenance",
  },
  {
    feature: "PSA integration",
    handover: "Native HaloPSA and ConnectWise integration - built and maintained for you",
    competitor: "API nodes available but you build and maintain the integration yourself",
  },
  {
    feature: "Narrative report generation",
    handover: "AI generates professional prose reports trained on MSP delivery language",
    competitor: "No built-in AI report generation - you build this yourself with LLM nodes",
  },
  {
    feature: "QBR pack generation",
    handover: "Complete QBR with PowerPoint and Excel in under 60 seconds",
    competitor: "No QBR builder - you would need to build this from scratch",
  },
  {
    feature: "Push notes back to PSA",
    handover: "One-click push of generated notes back to HaloPSA or ConnectWise tickets",
    competitor: "Possible to build but requires custom workflow development",
  },
  {
    feature: "Output quality",
    handover: "Output quality guaranteed - trained specifically for MSP reporting",
    competitor: "Output quality depends entirely on how well you build your workflows",
  },
  {
    feature: "Week-over-week continuity",
    handover: "Built in - reports track progression automatically",
    competitor: "You would need to build state management into your workflows",
  },
  {
    feature: "Ongoing maintenance",
    handover: "Handover maintains integrations, updates AI models, ships new features",
    competitor: "You maintain your own workflows - PSA API changes break your flows",
  },
  {
    feature: "Pricing",
    handover: "£499/month - predictable, all-inclusive",
    competitor: "Self-hosted free or cloud from ~$20/month, but significant engineering time cost",
  },
  {
    feature: "Technical requirement",
    handover: "No technical knowledge required - connect and use",
    competitor: "Requires workflow automation expertise to build and maintain",
  },
];

const faqs = [
  {
    q: "Can n8n automate MSP client reporting?",
    a: "n8n can be used to automate MSP client reporting - but you have to build the entire workflow yourself. That means designing the PSA data fetch, the prompt engineering for AI generation, the output formatting, the email sending logic, the scheduling, and the error handling. It requires significant automation expertise and ongoing maintenance. Handover does all of this out of the box, purpose-built for MSP reporting with no workflow building required.",
  },
  {
    q: "What is the difference between Handover and n8n?",
    a: "n8n is a general-purpose workflow automation tool. You can build almost anything with it, but you are responsible for building, testing, and maintaining everything yourself. Handover is a purpose-built MSP client reporting platform. The PSA integrations, AI generation, QBR pack builder, scheduled reports, and push-back architecture are all built for you - maintained, updated, and improved continuously. The difference is DIY versus done-for-you.",
  },
  {
    q: "How long does it take to build MSP reporting in n8n vs Handover?",
    a: "Building a basic MSP reporting workflow in n8n - connecting to HaloPSA or ConnectWise, fetching tickets, prompting an LLM, formatting the output, and sending an email - would take an experienced automation engineer several days to build and test. Adding scheduling, push-back, QBR generation, and week-over-week continuity would take weeks. Handover is ready in under 2 minutes.",
  },
  {
    q: "Is n8n cheaper than Handover for MSP reporting?",
    a: "The software cost of n8n can be lower - especially self-hosted. But the total cost includes the engineering time to build and maintain the workflows. Handover costs £499/month or £4,990 annually and includes the complete workspace.",
  },
  {
    q: "What if I already use n8n for other automation - should I still consider Handover?",
    a: "Yes. Handover and n8n can coexist - use n8n for general workflow automation and Handover for MSP client reporting specifically. Handover's depth in MSP reporting (native PSA integrations, AI output quality, QBR pack generation, push-back) would take significant n8n development to replicate, and that development needs maintaining every time the PSA APIs change.",
  },
];

export default function HandoverVsN8nPage() {
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
            <span className="text-white/60">Handover vs n8n</span>
          </nav>

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(56,189,248,0.3)] bg-[rgba(56,189,248,0.08)] px-3 py-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#38bdf8]">
              Comparison
            </span>
          </div>

          <h1 className="mb-6 max-w-3xl text-[38px] font-semibold leading-[1.1] tracking-tight text-white md:text-[54px]">
            Handover vs n8n <span className="text-[#38bdf8]">for MSP reporting</span>
          </h1>

          <p className="mb-8 max-w-2xl text-[17px] leading-relaxed text-white/60">
            n8n can automate almost anything - if you build it. Handover is purpose-built for MSP
            client reporting. Native PSA integrations, AI-generated reports, QBR packs, and
            automated client emails. Ready in 2 minutes, not 2 weeks.
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
            <span className="font-semibold text-white">The honest verdict:</span> If you have the
            engineering time and expertise to build and maintain a custom n8n MSP reporting
            workflow, it can work. If you want professional MSP client reporting working today  - 
            with no workflow building, no maintenance, and output quality that reads like a senior
            PM wrote it - Handover is the right choice.
          </p>
        </div>
      </section>

      <section className="relative z-[1] px-6 py-12 md:px-8 md:py-20">
        <div className="mx-auto max-w-[1100px]">
          <h2 className="mb-8 text-[28px] font-semibold tracking-tight text-white md:text-[36px]">
            Purpose-built vs DIY - what you get
          </h2>
          <CompareTable rows={rows} competitorName="n8n" />
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

      <SeoPageCta headline="Stop building - start reporting with purpose-built MSP client reporting in 2 minutes" />
    </MarketingPageLayout>
  );
}
