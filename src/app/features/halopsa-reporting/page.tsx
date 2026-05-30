import type { Metadata } from "next";
import Link from "next/link";

import { FaqSection } from "@/components/faq-section";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { SeoPageCta } from "@/components/seo-page-cta";
import { Button } from "@/components/ui/button";
import { softwareApplicationJsonLd } from "@/lib/seo-page-jsonld";

const PATH = "/features/halopsa-reporting";
const CANONICAL = `https://gethandover.uk${PATH}`;
const TITLE = "HaloPSA Reporting Tool — Automate HaloPSA Client Reports";
const DESCRIPTION =
  "HaloPSA report generator for MSPs: automate HaloPSA reports, weekly client updates, and QBR packs from live ticket data. Native integration, listed on the HaloPSA marketplace.";

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
    q: "What is the best HaloPSA reporting tool for client updates?",
    a: "Handover connects natively to HaloPSA and generates narrative client reports, QBR packs, and scheduled weekly updates from your live tickets and projects — without middleware or complex configuration.",
  },
  {
    q: "How do I automate HaloPSA reports?",
    a: "Connect Handover with your HaloPSA API credentials, select tickets and projects per client, then generate or schedule reports. Handover pulls notes, SLA data, and project progress automatically.",
  },
  {
    q: "Is Handover listed on the HaloPSA marketplace?",
    a: "Yes. Handover is listed on the HaloPSA marketplace. UK MSPs can connect through the standard integration flow and start generating HaloPSA client reports within minutes.",
  },
  {
    q: "Can Handover push reports back into HaloPSA?",
    a: "Yes. Generated summaries can be pushed back into HaloPSA tickets and projects as notes, keeping your PSA history complete without copy-paste.",
  },
];

export default function HaloPsaReportingFeaturePage() {
  const jsonLd = softwareApplicationJsonLd({
    name: "Handover — HaloPSA Reporting",
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#38bdf8]">Features · HaloPSA</p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight text-white md:text-5xl">
              Automated client reporting for HaloPSA — built by an MSP PM
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
            HaloPSA holds the operational truth for your clients — tickets, projects, SLAs, and notes. But turning
            that data into consistent <strong className="text-[var(--text-primary)]">HaloPSA client reports</strong>{" "}
            every week still falls on your PMs. Handover is the HaloPSA reporting tool that closes that gap for{" "}
            <strong className="text-[var(--text-primary)]">UK MSPs</strong> and teams worldwide.
          </p>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              How Handover connects to HaloPSA
            </h2>
            <p className="mt-3">
              Handover uses the native HaloPSA API with your existing credentials. There is no middleware layer and no
              extra HaloPSA modules to install. Connect once, map clients to tickets and projects, and generate your
              first report.
            </p>
            <h3 className="mt-6 text-xl font-semibold text-[var(--text-primary)]">Native integration details</h3>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Full ticket detail: notes, actions, priorities, SLA timers, and status history</li>
              <li>Project data: tasks, completion rates, milestones, and linked tickets</li>
              <li>One-click push-back of generated summaries into HaloPSA as ticket notes</li>
              <li>Scheduled weekly reports per client account</li>
            </ul>
            <p className="mt-3">
              Learn more on our{" "}
              <Link href="/integrations/halopsa" className="text-[var(--accent)] hover:underline">
                HaloPSA integration page
              </Link>{" "}
              or the{" "}
              <Link href="/partners/halopsa" className="text-[var(--accent)] hover:underline">
                HaloPSA marketplace listing
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              What Handover generates from HaloPSA data
            </h2>
            <h3 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">Weekly client reports</h3>
            <p className="mt-2">
              Plain-English summaries of activity, open tickets, risks, actions required, and next steps — written for
              business stakeholders, not engineers.
            </p>
            <h3 className="mt-6 text-xl font-semibold text-[var(--text-primary)]">QBR packs & Excel exports</h3>
            <p className="mt-2">
              Branded quarterly business review packs and structured Excel report packs from the same HaloPSA dataset —
              in minutes instead of hours.
            </p>
            <h3 className="mt-6 text-xl font-semibold text-[var(--text-primary)]">Delivery health visibility</h3>
            <p className="mt-2">
              Internal RAG-style views across your HaloPSA portfolio so PMs spot overdue work before clients chase.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              Automate HaloPSA reports without changing how you work
            </h2>
            <p className="mt-3">
              Your team keeps logging tickets in HaloPSA as normal. Handover is the HaloPSA report generator that turns
              that activity into professional client communication — a true{" "}
              <strong className="text-[var(--text-primary)]">managed service provider</strong> reporting layer on top
              of your PSA.
            </p>
            <p className="mt-3">
              See{" "}
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

      <SeoPageCta headline="Connect HaloPSA and automate your first client report today" />
    </MarketingPageLayout>
  );
}
