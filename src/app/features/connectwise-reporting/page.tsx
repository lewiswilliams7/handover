import type { Metadata } from "next";
import Link from "next/link";

import { FaqSection } from "@/components/faq-section";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { SeoPageCta } from "@/components/seo-page-cta";
import { Button } from "@/components/ui/button";
import { softwareApplicationJsonLd } from "@/lib/seo-page-jsonld";

const PATH = "/features/connectwise-reporting";
const CANONICAL = `https://gethandover.uk${PATH}`;
const TITLE = "ConnectWise Reporting Tool — Automate ConnectWise Client Reports";
const DESCRIPTION =
  "ConnectWise Manage reporting for MSPs: automate ConnectWise reports, weekly client updates, and QBR packs. Native integration, marketplace listing, accepted into PitchIT 2026.";

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

const faqs = [
  {
    q: "What is the best ConnectWise reporting tool for client communication?",
    a: "Handover connects to ConnectWise Manage and generates narrative client reports from live service tickets and projects — designed for weekly client updates, not just internal dashboards.",
  },
  {
    q: "How do I automate ConnectWise reports?",
    a: "Connect Handover to ConnectWise Manage, select tickets and projects per client, then generate or schedule reports. Handover handles summarisation, formatting, and optional push-back to ticket notes.",
  },
  {
    q: "Is Handover on the ConnectWise marketplace?",
    a: "Yes. Handover is listed on the ConnectWise marketplace. APAC MSPs and UK partners on ConnectWise reseller programmes can connect through the standard integration flow.",
  },
  {
    q: "What is PitchIT 2026?",
    a: "PitchIT is ConnectWise’s startup programme. Handover was accepted into PitchIT 2026, reflecting our focus on ConnectWise Manage reporting and service delivery outcomes for MSPs.",
  },
];

export default function ConnectWiseReportingFeaturePage() {
  const jsonLd = softwareApplicationJsonLd({
    name: "Handover — ConnectWise Reporting",
    description: DESCRIPTION,
    url: CANONICAL,
  });

  return (
    <MarketingPageLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="marketing-page-hero relative overflow-hidden bg-transparent px-6 py-12 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto w-full max-w-[1000px]">
          <div className="rounded-[var(--radius-lg)] border border-[rgba(56,189,248,0.28)] bg-[rgba(15,23,42,0.68)] px-6 py-8 shadow-[0_20px_60px_-22px_rgba(56,189,248,0.35)] md:px-10 md:py-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#38bdf8]">
              Features · ConnectWise
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-[rgba(34,197,94,0.4)] bg-[rgba(34,197,94,0.12)] px-3 py-1 text-[11px] font-semibold text-[#86efac]">
                ConnectWise Manage integration
              </span>
              <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/80">
                PitchIT 2026
              </span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold leading-tight text-white md:text-5xl">
              Automated client reporting for ConnectWise Manage
            </h1>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/auth?tab=signup&returnTo=/welcome">
                <Button className="rounded-[var(--radius)] bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]">
                  Start free trial
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
          <p>
            ConnectWise Manage is the operational backbone for thousands of MSPs — especially{" "}
            <strong className="text-[var(--text-primary)]">APAC MSPs</strong> and global partners on ConnectWise
            reseller programmes. Yet <strong className="text-[var(--text-primary)]">ConnectWise client reports</strong>{" "}
            are still often written by hand each week. Handover is the ConnectWise reporting tool that automates that
            work for any <strong className="text-[var(--text-primary)]">managed service provider</strong> running
            Manage.
          </p>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              How Handover connects to ConnectWise Manage
            </h2>
            <p className="mt-3">
              Handover integrates natively with ConnectWise Manage via the API. Pull service tickets and projects, generate
              client-ready narratives, and optionally push summaries back as notes — the same workflow UK MSPs use with
              HaloPSA.
            </p>
            <h3 className="mt-6 text-xl font-semibold text-[var(--text-primary)]">Native integration details</h3>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Service tickets with status, priority, time entries, and discussion notes</li>
              <li>Project tickets and delivery milestones where configured</li>
              <li>Scheduled weekly reporting per client company</li>
              <li>Delivery health dashboard across your ConnectWise portfolio</li>
            </ul>
            <p className="mt-3">
              Handover was <strong className="text-[var(--text-primary)]">accepted into PitchIT 2026</strong> and is
              listed on the{" "}
              <Link href="/partners/connectwise" className="text-[var(--accent)] hover:underline">
                ConnectWise marketplace
              </Link>
              . See the{" "}
              <Link href="/integrations/connectwise" className="text-[var(--accent)] hover:underline">
                ConnectWise integration page
              </Link>{" "}
              for setup details.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              What Handover generates from ConnectWise data
            </h2>
            <h3 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">Weekly client reports</h3>
            <p className="mt-2">
              Automate ConnectWise reports as plain-English weekly updates: activity summary, open items, risks, and next
              steps — without exporting to Word or rewriting ticket notes.
            </p>
            <h3 className="mt-6 text-xl font-semibold text-[var(--text-primary)]">QBR packs & exports</h3>
            <p className="mt-2">
              Quarterly review packs and Excel report packs built from the same ConnectWise Manage dataset your team
              already maintains.
            </p>
            <h3 className="mt-6 text-xl font-semibold text-[var(--text-primary)]">ConnectWise Manage reporting for PMs</h3>
            <p className="mt-2">
              One ConnectWise report generator for the whole portfolio — consistent format whether you serve ten clients
              or two hundred.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              Built for MSPs who live in ConnectWise every day
            </h2>
            <p className="mt-3">
              Engineers keep working in Manage. Handover turns that work into client communication your account managers
              can send with confidence. Compare{" "}
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

          <FaqSection faqs={faqs} />
        </div>
      </section>

      <SeoPageCta headline="Automate ConnectWise client reports — start your free trial" />
    </MarketingPageLayout>
  );
}
