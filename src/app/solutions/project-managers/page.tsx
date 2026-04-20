import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowLeftRight,
  Ban,
  CalendarClock,
  MessageSquare,
  Plug,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingRelatedPages } from "@/components/marketing-related-pages";
import { MarketingPageLayout } from "@/components/marketing-page-layout";

export const metadata: Metadata = {
  title: "Handover for MSP Project Managers | Automated Project Reporting That Writes Itself",
  description:
    "Handover connects to HaloPSA and ConnectWise and generates client-ready project update reports from your live project data. Stop writing status updates. Start delivering projects.",
  alternates: {
    canonical: "https://gethandover.uk/solutions/project-managers",
  },
};

export default function SolutionsProjectManagersPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Handover for MSP Project Managers",
    description: metadata.description,
    url: "https://gethandover.uk/solutions/project-managers",
  };

  return (
    <MarketingPageLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="marketing-page-hero relative overflow-hidden bg-[var(--bg-primary)] px-6 py-12 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto w-full max-w-[1000px]">
          <div className="rounded-[var(--radius-lg)] border border-[rgba(56,189,248,0.25)] bg-[rgba(15,23,42,0.65)] px-6 py-8 shadow-[0_20px_60px_-22px_rgba(56,189,248,0.35)] md:px-10 md:py-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#38bdf8]">
              Solutions · Project Managers
            </p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight text-white md:text-5xl">
              The status update is not your job. Delivering the project is.
            </h1>
            <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-white/75">
              Handover automates client-facing project reporting from HaloPSA and ConnectWise so project managers can
              focus on delivery, not document formatting.
            </p>
            <div className="mt-6">
              <Link
                href="/auth?tab=signup"
                className="inline-flex items-center rounded-[var(--radius)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
              >
                Start your free trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-10 md:px-8 md:py-14">
        <div className="mx-auto w-full max-w-[900px] space-y-10 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
          <p>
            MSP project managers constantly split time between managing delivery and writing status updates. The second
            task should not consume your week when the underlying data is already in your PSA.
          </p>
          <p>
            Handover automates client-facing updates so you can spend your time managing scope, dependencies,
            milestones, and risk.
          </p>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">What project managers use Handover for</h2>
            <ul className="mt-3 list-none space-y-2.5">
              <li className="flex gap-2.5 text-[var(--text-secondary)]">
                <RefreshCw className="mt-1 size-4 shrink-0 text-[#0EA5E9]" strokeWidth={2} aria-hidden />
                <span>
                  <strong className="text-[var(--text-primary)]">Weekly Project Status Reports:</strong> generate
                  complete client-facing updates from live task and milestone data in 30 seconds.
                </span>
              </li>
              <li className="flex gap-2.5 text-[var(--text-secondary)]">
                <CalendarClock className="mt-1 size-4 shrink-0 text-[#0EA5E9]" strokeWidth={2} aria-hidden />
                <span>
                  <strong className="text-[var(--text-primary)]">Scheduled Automated Updates:</strong> weekly project
                  reports sent automatically with zero manual drafting.
                </span>
              </li>
              <li className="flex gap-2.5 text-[var(--text-secondary)]">
                <Activity className="mt-1 size-4 shrink-0 text-[#0EA5E9]" strokeWidth={2} aria-hidden />
                <span>
                  <strong className="text-[var(--text-primary)]">Project Health Dashboard:</strong> RAG visibility based
                  on completion rates, overdue work, and open risks.
                </span>
              </li>
              <li className="flex gap-2.5 text-[var(--text-secondary)]">
                <ArrowLeftRight className="mt-1 size-4 shrink-0 text-[#0EA5E9]" strokeWidth={2} aria-hidden />
                <span>
                  <strong className="text-[var(--text-primary)]">Push Notes Back to PSA:</strong> sync report summaries
                  into HaloPSA or ConnectWise project records.
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">The problem with manual project reporting</h2>
            <p className="mt-3">
              Manual updates are slow and inconsistent. Style, tone, quality, and timeliness vary by person and by
              week. Clients feel uncertainty when reporting quality changes.
            </p>
            <p className="mt-3">
              Handover standardises report quality across your entire PM team so every client receives consistent,
              professional communication in the same clear format.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Built for how MSP projects actually work</h2>
            <p className="mt-3">
              Generic project tools assume software engineering workflows. Handover is purpose-built for MSP delivery
              models and PSA project structures, so the generated updates align with real managed service operations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">What you stop doing</h2>
            <ul className="mt-3 list-none space-y-2 text-[var(--text-secondary)]">
              <li className="flex gap-2.5">
                <Ban className="mt-1 size-4 shrink-0 text-[#0EA5E9]" strokeWidth={2} aria-hidden />
                <span>Writing weekly status emails from scratch</span>
              </li>
              <li className="flex gap-2.5">
                <Ban className="mt-1 size-4 shrink-0 text-[#0EA5E9]" strokeWidth={2} aria-hidden />
                <span>Reformatting task data into client language</span>
              </li>
              <li className="flex gap-2.5">
                <Ban className="mt-1 size-4 shrink-0 text-[#0EA5E9]" strokeWidth={2} aria-hidden />
                <span>Chasing updates manually for reports</span>
              </li>
              <li className="flex gap-2.5">
                <Ban className="mt-1 size-4 shrink-0 text-[#0EA5E9]" strokeWidth={2} aria-hidden />
                <span>Catching up on late reporting outside business hours</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">What you start doing</h2>
            <ul className="mt-3 list-none space-y-2 text-[var(--text-secondary)]">
              <li className="flex gap-2.5">
                <MessageSquare className="mt-1 size-4 shrink-0 text-[#0EA5E9]" strokeWidth={2} aria-hidden />
                <span>Leading client calls with context already shared</span>
              </li>
              <li className="flex gap-2.5">
                <Plug className="mt-1 size-4 shrink-0 text-[#0EA5E9]" strokeWidth={2} aria-hidden />
                <span>Focusing on delivery work that needs your expertise</span>
              </li>
              <li className="flex gap-2.5">
                <TrendingUp className="mt-1 size-4 shrink-0 text-[#0EA5E9]" strokeWidth={2} aria-hidden />
                <span>Managing more projects with the same team capacity</span>
              </li>
              <li className="flex gap-2.5">
                <Sparkles className="mt-1 size-4 shrink-0 text-[#0EA5E9]" strokeWidth={2} aria-hidden />
                <span>Raising communication consistency across your MSP</span>
              </li>
            </ul>
          </section>

          <section className="rounded-[var(--radius-lg)] border border-[var(--border)] border-l-[3px] border-l-[#0EA5E9] bg-[var(--bg-primary)] p-6">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Works with your PSA out of the box</h2>
            <p className="mt-3">
              Connect HaloPSA or ConnectWise in minutes with no setup project. Select projects, generate your report,
              and send today.
            </p>
            <Link href="/auth?tab=signup" className="marketing-page-bottom-cta mt-5 inline-flex items-center">
              Start your free trial at gethandover.uk
            </Link>
          </section>
          <section className="rounded-[var(--radius-lg)] border border-[var(--border)] border-l-[3px] border-l-[#0EA5E9] bg-[var(--bg-primary)] p-6">
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">Features that power this</h3>
            <p className="mt-2 text-sm">
              <a href="/features/automated-reports" className="text-[var(--accent)] hover:underline">Automated Reports</a>
              {" · "}
              <a href="/features/psa-push" className="text-[var(--accent)] hover:underline">Push Notes to PSA</a>
              {" · "}
              <a href="/features/health-dashboard" className="text-[var(--accent)] hover:underline">Delivery Health Dashboard</a>
            </p>
          </section>
        </div>
      </section>

      <MarketingRelatedPages
        links={[
          { href: "/solutions/weekly-client-reporting", title: "Weekly client reporting", Icon: CalendarClock },
          { href: "/features/automated-reports", title: "Automated client reports", Icon: RefreshCw },
          { href: "/pricing", title: "Plans and pricing", Icon: TrendingUp },
        ]}
      />
    </MarketingPageLayout>
  );
}

