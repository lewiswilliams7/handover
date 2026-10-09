import type { Metadata } from "next";
import Link from "next/link";

import { CompareTable } from "@/components/compare-table";
import { FaqSection } from "@/components/faq-section";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { SeoPageCta } from "@/components/seo-page-cta";
import { softwareApplicationJsonLd } from "@/lib/seo-page-jsonld";

const PATH = "/compare/handover-vs-chatgpt";
const CANONICAL = `https://gethandover.uk${PATH}`;
const TITLE = "Handover vs ChatGPT for MSP Reporting - Why Generic AI Isn't Enough";
const DESCRIPTION =
  "ChatGPT can write. Handover connects to your PSA, reads your live tickets, generates professional client reports in 30 seconds, and pushes notes back automatically. Here's the difference.";

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
    feature: "PSA integration",
    handover: "Native HaloPSA & ConnectWise - pulls live ticket data automatically",
    competitor: "None - you copy and paste data manually every time",
  },
  {
    feature: "Knows your tickets",
    handover: "Reads your actual open tickets, projects, notes, and owners",
    competitor: "Only knows what you paste in - no memory, no context",
  },
  {
    feature: "Push back to PSA",
    handover: "Pushes generated notes directly back into HaloPSA or ConnectWise tickets",
    competitor: "Cannot write back to any system",
  },
  {
    feature: "Scheduled reports",
    handover: "Automated weekly or monthly client updates - set up once, runs forever",
    competitor: "No scheduling - manual every time",
  },
  {
    feature: "QBR pack generation",
    handover: "Full QBR pack with PowerPoint and Excel export in under 60 seconds",
    competitor: "Can draft text but produces no structured export or formatted output",
  },
  {
    feature: "Output quality",
    handover: "Trained on MSP delivery language - specific, account-aware, never generic",
    competitor:
      "Generic AI output - sounds plausible but lacks account specifics without heavy prompting",
  },
  {
    feature: "Week-over-week continuity",
    handover: "Tracks what changed week to week - never sends identical reports",
    competitor: "No memory between sessions - every report starts from scratch",
  },
  {
    feature: "Client portal",
    handover: "Branded client login to view reports (Enterprise)",
    competitor: "None",
  },
  {
    feature: "Pricing",
    handover: "£499/month - all features included",
    competitor: "ChatGPT Plus £16/month but no MSP tooling, integrations, or automation",
  },
  {
    feature: "Setup time",
    handover: "Connect PSA once - first report in under 2 minutes",
    competitor: "Significant prompt engineering required every single use",
  },
];

const faqs = [
  {
    q: "Can I use ChatGPT for MSP client reporting?",
    a: "You can use ChatGPT to help draft client reports, but it requires you to manually copy ticket data from your PSA, write a detailed prompt every time, review and edit the output, and then paste it into your email client. Handover connects directly to HaloPSA or ConnectWise and handles the entire process automatically - including scheduling, push-back to tickets, QBR pack generation, and branded client emails. For a one-off draft, ChatGPT works. For consistent, professional MSP client communication at scale, it is not the right tool.",
  },
  {
    q: "What does Handover do that ChatGPT cannot?",
    a: "Handover reads your live PSA data directly - no copy-pasting. It knows your ticket owners, your client names, your open actions, and your project statuses. It generates reports that reference specific facts from your account: 'The 3CX update for Northwood Manufacturing is confirmed for Thursday - Ravi has installed Splashtop and no blockers remain.' ChatGPT cannot produce that level of specificity without you providing all of that context manually every single time. Handover also pushes generated notes back into your PSA, schedules automated reports, and generates complete QBR packs with PowerPoint and Excel exports.",
  },
  {
    q: "Is Handover just a wrapper around ChatGPT?",
    a: "No. Handover is a purpose-built MSP reporting platform. It uses AI for generation - powered by GPT-4 - but the AI is the smallest part of what Handover does. The value is in the native PSA integrations, the scheduled automation, the push-back architecture, the QBR pack builder, the delivery health dashboard, and the week-over-week continuity that means your clients receive reports that reflect actual progression rather than repeated status descriptions. Using ChatGPT for MSP reporting is like using a calculator for accounting - it helps with one step of a much larger workflow.",
  },
  {
    q: "How long does it take to set up Handover vs using ChatGPT?",
    a: "Handover takes under 2 minutes to generate your first report - connect your PSA, select your tickets, click generate. From that point, scheduled reports run automatically with no manual input. Using ChatGPT for MSP reporting requires a new prompt every session, manual data preparation each time, and significant editing to make outputs account-specific. For a single report, ChatGPT might take 20-30 minutes. Handover takes 30 seconds.",
  },
  {
    q: "What MSPs use Handover instead of ChatGPT?",
    a: "MSP delivery teams on HaloPSA and ConnectWise who need consistent, professional client communication at scale. Teams that have tried ChatGPT for reporting typically find the manual effort - copying ticket data, engineering prompts, editing outputs - takes nearly as long as writing the report manually. Handover removes that entire process.",
  },
  {
    q: "Does Handover work with HaloPSA?",
    a: "Yes. Handover has a native HaloPSA integration and is listed on the HaloPSA marketplace. It connects directly to your HaloPSA instance, pulls live ticket and project data, generates reports, and pushes notes back to tickets automatically. No middleware, no CSV exports, no manual data preparation.",
  },
  {
    q: "Does Handover work with ConnectWise?",
    a: "Yes. Handover has a native ConnectWise Manage integration and is listed on the ConnectWise marketplace. It works the same way as the HaloPSA integration - direct API connection, live data, automated reports, push-back to tickets.",
  },
];

export default function HandoverVsChatGptPage() {
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
            <span className="text-white/60">Handover vs ChatGPT</span>
          </nav>

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(56,189,248,0.3)] bg-[rgba(56,189,248,0.08)] px-3 py-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#38bdf8]">
              Comparison
            </span>
          </div>

          <h1 className="mb-6 max-w-3xl text-[38px] font-semibold leading-[1.1] tracking-tight text-white md:text-[54px]">
            Handover vs ChatGPT <span className="text-[#38bdf8]">for MSP reporting</span>
          </h1>

          <p className="mb-8 max-w-2xl text-[17px] leading-relaxed text-white/60">
            ChatGPT can write a sentence. It cannot connect to your PSA, read your live tickets,
            push notes back to HaloPSA, or send automated weekly reports to your clients. Here is
            an honest comparison of what each tool actually does for MSP delivery teams.
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

      <section className="relative z-[1] border-y border-white/[0.06] bg-white/[0.02] px-6 py-8 md:px-8">
        <div className="mx-auto max-w-[1100px]">
          <p className="text-[15px] leading-relaxed text-white/70 md:text-[17px]">
            <span className="font-semibold text-white">The honest verdict:</span> ChatGPT is a
            writing assistant. Handover is a client communication system built specifically for
            MSPs - with native PSA integrations, automated scheduling, push-back to tickets, and
            output quality trained on MSP delivery language. If you are using ChatGPT for client
            reporting today, you are spending 20-30 minutes doing manually what Handover does in 30
            seconds.
          </p>
        </div>
      </section>

      <section className="relative z-[1] px-6 py-12 md:px-8 md:py-20">
        <div className="mx-auto max-w-[1100px]">
          <h2 className="mb-8 text-[28px] font-semibold tracking-tight text-white md:text-[36px]">
            Feature comparison
          </h2>
          <CompareTable rows={rows} competitorName="ChatGPT" />
        </div>
      </section>

      <section className="relative z-[1] px-6 pb-12 md:px-8 md:pb-20">
        <div className="mx-auto max-w-[1100px]">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-8 md:p-12">
            <h2 className="mb-6 text-[26px] font-semibold tracking-tight text-white md:text-[32px]">
              Why MSP teams stop using ChatGPT for reporting
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {[
                {
                  title: "You copy-paste every time",
                  body: "ChatGPT has no connection to your PSA. Every report starts with manually exporting or copying ticket data. Handover connects directly to HaloPSA or ConnectWise and pulls your live data automatically.",
                },
                {
                  title: "The output is generic without heavy prompting",
                  body: "Without precise prompting, ChatGPT produces reports that sound plausible but contain no account-specific facts. MSP clients notice. Handover is trained specifically on MSP delivery language and references your actual ticket data - client names, engineer owners, specific technologies.",
                },
                {
                  title: "No memory between sessions",
                  body: "ChatGPT does not remember last week's report. Every generation is fresh with no context about what changed. Handover tracks progression week over week - your reports reflect actual movement, not repeated status descriptions.",
                },
                {
                  title: "You cannot automate it",
                  body: "ChatGPT cannot send a scheduled report to your client every Monday morning. Handover can. Set up a scheduled report once and it runs automatically - pulling live PSA data, generating the update, and sending it - without anyone touching it.",
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-4">
                  <div className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-500/10">
                    <span className="text-[10px] text-red-400">✕</span>
                  </div>
                  <div>
                    <h3 className="mb-1 text-[14px] font-semibold text-white">{item.title}</h3>
                    <p className="text-[13px] leading-relaxed text-white/55">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
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

      <SeoPageCta headline="Stop copy-pasting into ChatGPT - connect your PSA once and generate professional client reports in 30 seconds" />
    </MarketingPageLayout>
  );
}
