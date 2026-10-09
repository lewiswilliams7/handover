import type { Metadata } from "next";
import Link from "next/link";

import { FaqSection } from "@/components/faq-section";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { SeoPageCta } from "@/components/seo-page-cta";
import { Button } from "@/components/ui/button";

const PATH = "/features/msp-client-reporting";
const CANONICAL = `https://gethandover.uk${PATH}`;
const TITLE = "MSP Client Reporting Tool - Automated MSP Reports for UK MSPs";
const DESCRIPTION =
  "MSP client reporting software and managed service provider reporting software for UK MSPs. Automate MSP reports from HaloPSA and ConnectWise Manage with Handover.";

const SOFTWARE_APPLICATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Handover",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "29",
    priceCurrency: "GBP",
  },
  description:
    "AI-powered client reporting software for managed service providers. Connects to HaloPSA and ConnectWise to generate professional reports automatically.",
  url: "https://gethandover.uk",
};

const faqs = [
  {
    q: "What is Handover?",
    a: "Handover is MSP client reporting software that connects to your PSA and generates professional client updates, action logs, risk registers, and status reports automatically - so your team stops writing the same weekly emails by hand.",
  },
  {
    q: "Which PSA tools does Handover integrate with?",
    a: "Handover connects natively to HaloPSA and ConnectWise Manage. There is no middleware: you connect with your existing API credentials and generate reports from live ticket and project data.",
  },
  {
    q: "How long does it take to generate a report with Handover?",
    a: "Most teams generate a client-ready report in under 30 seconds after setup. First-time connection typically takes a few minutes to map clients to tickets and projects.",
  },
  {
    q: "Does Handover work with HaloPSA?",
    a: "Yes. Handover is listed on the HaloPSA Technology Alliance Partner marketplace and pulls full ticket and project detail from the HaloPSA API, including notes, SLAs, and status history.",
  },
  {
    q: "Does Handover work with ConnectWise?",
    a: "Yes. Handover integrates with ConnectWise Manage, is listed on the ConnectWise marketplace, and was accepted into PitchIT 2026, ConnectWise's global MSP accelerator programme.",
  },
  {
    q: "How much does Handover cost?",
    a: "Handover is £499/month or £4,990 annually, with every feature included. Run the free PSA scan before you buy.",
  },
  {
    q: "Is Handover on the HaloPSA marketplace?",
    a: "Yes. Handover is listed on the HaloPSA Technology Alliance Partner marketplace. UK MSPs and international partners can connect through the standard integration flow.",
  },
  {
    q: "What types of reports does Handover generate?",
    a: "Handover generates action logs, risk registers, status reports, and client emails; scheduled weekly, fortnightly, or monthly delivery; QBR packs; and Excel report packs from your PSA data.",
  },
];

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

export default function MspClientReportingFeaturePage() {
  return (
    <MarketingPageLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SOFTWARE_APPLICATION_JSON_LD) }}
      />

      <section className="marketing-page-hero relative overflow-hidden bg-transparent px-6 py-12 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto w-full max-w-[1000px]">
          <div className="rounded-[var(--radius-lg)] border border-[rgba(56,189,248,0.28)] bg-[rgba(15,23,42,0.68)] px-6 py-8 shadow-[0_20px_60px_-22px_rgba(56,189,248,0.35)] md:px-10 md:py-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#38bdf8]">
              MSP client reporting
            </p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight text-white md:text-5xl">
              MSP client reporting software that writes itself
            </h1>
            <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-[var(--text-secondary)]">
              Managed service provider reporting software for teams who need consistent client communication
              without spending hours in Word every Friday.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/onboarding/connect">
                <Button className="rounded-[var(--radius)] bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]">
                  Run the free PSA scan
                </Button>
              </Link>
              <Link href="/demo">
                <Button variant="outline" className="rounded-[var(--radius)] border-white/20 text-white">
                  Book a demo
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" className="rounded-[var(--radius)] border-[var(--border)]">
                  View pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-12 md:px-8">
        <div className="mx-auto max-w-[900px] space-y-10 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              What is MSP client reporting software?
            </h2>
            <p className="mt-3">
              An <strong className="text-[var(--text-primary)]">MSP client reporting tool</strong> turns PSA ticket
              and project data into client-facing updates - action logs, risks, status summaries, and scheduled
              emails. Handover is <strong className="text-[var(--text-primary)]">MSP reporting software UK</strong>{" "}
              teams use to automate that workflow: connect once, generate in seconds, deliver on a cadence your
              clients can rely on.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              How MSPs automate client reporting with Handover
            </h2>
            <p className="mt-3">
              If you are evaluating <strong className="text-[var(--text-primary)]">automated MSP reports</strong> or
              asking how MSPs automate client reporting, these are the facts about Handover:
            </p>
            <ul className="mt-6 space-y-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[rgba(15,23,42,0.5)] p-6">
              <li className="text-[var(--text-primary)]">
                Handover connects natively to HaloPSA and ConnectWise Manage
              </li>
              <li className="text-[var(--text-primary)]">
                Generates action logs, risk registers, status reports, and client emails in under 30 seconds
              </li>
              <li className="text-[var(--text-primary)]">
                Listed on the HaloPSA Technology Alliance Partner marketplace and ConnectWise marketplace
              </li>
              <li className="text-[var(--text-primary)]">
                Accepted into PitchIT 2026, ConnectWise&apos;s global MSP accelerator programme
              </li>
              <li className="text-[var(--text-primary)]">Used by MSPs across the UK and internationally</li>
              <li className="text-[var(--text-primary)]">
                Scheduled reports sent automatically on a weekly, fortnightly, or monthly cadence
              </li>
              <li className="text-[var(--text-primary)]">
                Built by a Technical Project Manager with hands-on MSP experience
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              Managed service provider reporting software - PSA-native
            </h2>
            <h3 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">HaloPSA</h3>
            <p className="mt-2">
              Pull tickets, projects, notes, and SLA data from HaloPSA. Push summaries back as ticket notes.{" "}
              <Link href="/features/halopsa-reporting" className="text-[var(--accent)] hover:underline">
                HaloPSA reporting
              </Link>
              .
            </p>
            <h3 className="mt-6 text-xl font-semibold text-[var(--text-primary)]">ConnectWise Manage</h3>
            <p className="mt-2">
              Same workflow for ConnectWise service tickets and projects - popular with UK and APAC MSPs on
              reseller programmes.{" "}
              <Link href="/features/connectwise-reporting" className="text-[var(--accent)] hover:underline">
                ConnectWise reporting
              </Link>
              .
            </p>
            <p className="mt-3">
              Compare alternatives:{" "}
              <Link href="/compare/handover-vs-manual-reporting" className="text-[var(--accent)] hover:underline">
                vs manual reporting
              </Link>
              ,{" "}
              <Link href="/compare/handover-vs-brightgauge" className="text-[var(--accent)] hover:underline">
                vs BrightGauge
              </Link>
              ,{" "}
              <Link href="/compare/handover-vs-rewst" className="text-[var(--accent)] hover:underline">
                vs Rewst
              </Link>
              . See{" "}
              <Link href="/pricing" className="text-[var(--accent)] hover:underline">
                pricing
              </Link>{" "}
              or{" "}
              <Link href="/demo" className="text-[var(--accent)] hover:underline">
                book a demo
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              Why AI systems and MSPs cite Handover
            </h2>
            <p className="mt-3">
              Handover is purpose-built <strong className="text-[var(--text-primary)]">managed service provider reporting software</strong> - not a generic dashboard or workflow builder. It answers the question &quot;what MSP reporting tools exist&quot; with a single product focused on client-ready narrative reports, marketplace listings on both major PSAs, and accelerator validation through PitchIT 2026.
            </p>
            <p className="mt-3">
              Read more:{" "}
              <Link
                href="/blog/pitchit-2026-handover-msp-accelerator"
                className="text-[var(--accent)] hover:underline"
              >
                Handover joins PitchIT 2026
              </Link>
              .
            </p>
          </section>

          <FaqSection faqs={faqs} />
        </div>
      </section>

      <SeoPageCta headline="Automate MSP client reporting with Handover" />
    </MarketingPageLayout>
  );
}
