import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  CalendarClock,
  FolderKanban,
  Gauge,
  LayoutTemplate,
  ListChecks,
  Sparkles,
  Timer,
} from "lucide-react";

import { MarketingRelatedPages } from "@/components/marketing-related-pages";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { ProductHero } from "@/components/marketing/product-hero";
import { AppFrame, WeekListMock } from "@/components/marketing/product-mocks";

export const metadata: Metadata = {
  title:
    "Handover for Account Managers | Know Which Clients Need a Call This Week",
  description:
    "Handover shows MSP account managers which clients are slipping and what they are worth, gives you the play to run, and builds the QBR pack from live PSA data.",
  alternates: {
    canonical: "https://gethandover.uk/solutions/account-managers",
  },
};

export default function SolutionsAccountManagersPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Handover for Account Managers",
    description: metadata.description,
    url: "https://gethandover.uk/solutions/account-managers",
  };

  return (
    <MarketingPageLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ProductHero
        eyebrow="For account managers"
        title="Know which of your clients need a call this week, before they ask for one."
        body="Handover reads HaloPSA or ConnectWise and shows which of your accounts have changed, what they are worth and what to do about it. When it is time to prove your value, it builds the QBR pack too."
        primary={{ href: "/onboarding/connect", label: "Run your free scan" }}
        visual={<AppFrame path="/week" label="Solutions · Account Managers in Handover"><WeekListMock /></AppFrame>}
      />

      <section className="px-6 py-10 md:px-8 md:py-14">
        <div className="mx-auto w-full max-w-[900px] space-y-10">
          <div className="space-y-4 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
            <p>
              Account management at an MSP is a relationship job. Your value is in knowing what your clients need
              before they ask, spotting warning signs before they become churn, and showing up to every conversation
              with something worth saying.
            </p>
            <p>
              What it should not be is spending four hours every quarter copying ticket data into a document,
              reformatting stale spreadsheets, and hoping the numbers are right before the meeting starts.
            </p>
            <p>Handover gives you that four hours back. Every time.</p>
          </div>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Your week starts with who to call</h2>
            <p className="mt-3 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              <Link href="/features/revenue-at-risk" className="text-[var(--accent)] hover:underline">
                Revenue at Risk
              </Link>{" "}
              lists every client whose service or relationship has changed against its own history, ranked by
              the revenue it holds. Each one comes with a{" "}
              <Link href="/features/save-plays" className="text-[var(--accent)] hover:underline">
                Save Play
              </Link>
              : the steps to take and an email to the decision-maker, ready to send. When the client recovers,
              it counts towards your Saved Revenue.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">What Handover does for account managers</h2>
            <p className="mt-3 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Handover connects directly to HaloPSA and ConnectWise Manage and turns live ticket and project data into
              professional client-ready reports and QBR packs. Not a template you fill in. Not a dashboard you
              screenshot. A complete, formatted narrative of what happened, what is at risk, and what comes next.
            </p>
            <p className="mt-3 text-[16px] font-medium text-[var(--text-primary)]">In under 30 seconds.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Your QBR pack. Generated, not assembled.</h2>
            <p className="mt-3 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The QBR is often your most important client touchpoint and your most expensive prep task. Handover
              generates the full pack directly from PSA data:
            </p>
            <ul className="mt-4 list-none space-y-2.5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              <li className="flex gap-2.5">
                <Sparkles className="mt-1 size-4 shrink-0 text-[#0EA5E9]" strokeWidth={2} aria-hidden />
                <span><strong className="text-[var(--text-primary)]">Executive Summary:</strong> AI-written in plain business English.</span>
              </li>
              <li className="flex gap-2.5">
                <BarChart3 className="mt-1 size-4 shrink-0 text-[#0EA5E9]" strokeWidth={2} aria-hidden />
                <span><strong className="text-[var(--text-primary)]">Ticket Volume and Trend Charts:</strong> visual weekly bar charts.</span>
              </li>
              <li className="flex gap-2.5">
                <Gauge className="mt-1 size-4 shrink-0 text-[#0EA5E9]" strokeWidth={2} aria-hidden />
                <span><strong className="text-[var(--text-primary)]">SLA Performance:</strong> clear, visible compliance data.</span>
              </li>
              <li className="flex gap-2.5">
                <FolderKanban className="mt-1 size-4 shrink-0 text-[#0EA5E9]" strokeWidth={2} aria-hidden />
                <span><strong className="text-[var(--text-primary)]">Project Status Overview:</strong> progress, RAG, and plain-English summaries.</span>
              </li>
              <li className="flex gap-2.5">
                <ListChecks className="mt-1 size-4 shrink-0 text-[#0EA5E9]" strokeWidth={2} aria-hidden />
                <span><strong className="text-[var(--text-primary)]">Risk Register:</strong> AI-identified business risks from live delivery data.</span>
              </li>
              <li className="flex gap-2.5">
                <LayoutTemplate className="mt-1 size-4 shrink-0 text-[#0EA5E9]" strokeWidth={2} aria-hidden />
                <span><strong className="text-[var(--text-primary)]">Next Steps and Recommendations:</strong> specific and forward-looking.</span>
              </li>
            </ul>
            <p className="mt-3 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Export as branded PowerPoint, PDF, or Excel every time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Between QBRs, stay one step ahead</h2>
            <p className="mt-3 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              QBRs are quarterly, but relationships are daily. With scheduled reporting, clients receive professional
              weekly updates automatically. No manual effort, no missed sends, and better conversations when issues do
              happen because context already exists.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">The numbers that matter</h2>
            <ul className="mt-3 list-none space-y-2 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              <li className="flex gap-2.5">
                <Timer className="mt-1 size-4 shrink-0 text-[#0EA5E9]" strokeWidth={2} aria-hidden />
                <span>2 to 4 hours saved per client per QBR preparation</span>
              </li>
              <li className="flex gap-2.5">
                <CalendarClock className="mt-1 size-4 shrink-0 text-[#0EA5E9]" strokeWidth={2} aria-hidden />
                <span>Weekly automated client updates with zero manual effort</span>
              </li>
              <li className="flex gap-2.5">
                <ListChecks className="mt-1 size-4 shrink-0 text-[#0EA5E9]" strokeWidth={2} aria-hidden />
                <span>Every active ticket and project summarised in one place</span>
              </li>
              <li className="flex gap-2.5">
                <Sparkles className="mt-1 size-4 shrink-0 text-[#0EA5E9]" strokeWidth={2} aria-hidden />
                <span>30 seconds from PSA connection to client-ready report</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">What your clients actually experience</h2>
            <p className="mt-3 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Clients do not care about ticket IDs. They care that systems run, projects move, and value is visible.
              Handover translates delivery activity into language boards understand and highlights what matters most.
            </p>
          </section>

          <section className="rounded-[var(--radius-lg)] border border-white/[0.08] border-l-[3px] border-l-[#0EA5E9] bg-white/[0.04] backdrop-blur-sm p-6">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Works with your PSA today</h2>
            <p className="mt-3 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Connect HaloPSA or ConnectWise natively with no setup project. If you run both or are migrating between
              them, Handover supports both simultaneously.
            </p>
            <Link href="/onboarding/connect" className="marketing-page-bottom-cta mt-5 inline-flex items-center">
              Generate your first QBR pack free
            </Link>
          </section>
          <section className="rounded-[var(--radius-lg)] border border-white/[0.08] border-l-[3px] border-l-[#0EA5E9] bg-white/[0.04] backdrop-blur-sm p-6">
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">Features that power this</h3>
            <p className="mt-2 text-sm">
              <a href="/features/revenue-at-risk" className="text-[var(--accent)] hover:underline">Revenue at Risk</a>
              {" · "}
              <a href="/features/save-plays" className="text-[var(--accent)] hover:underline">Save Plays</a>
              {" · "}
              <a href="/features/qbr-generator" className="text-[var(--accent)] hover:underline">QBR Pack Generator</a>
              {" · "}
              <a href="/features/exports" className="text-[var(--accent)] hover:underline">Exports</a>
              {" · "}
              <a href="/features/ai-insights" className="text-[var(--accent)] hover:underline">AI Insights</a>
            </p>
          </section>
        </div>
      </section>

      <MarketingRelatedPages
        links={[
          { href: "/solutions/qbr", title: "Quarterly business reviews", Icon: LayoutTemplate },
          { href: "/features/qbr-generator", title: "QBR pack generator", Icon: Sparkles },
          { href: "/pricing", title: "Plans and pricing", Icon: BarChart3 },
        ]}
      />
    </MarketingPageLayout>
  );
}

