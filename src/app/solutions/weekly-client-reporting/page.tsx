import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, CalendarClock, RefreshCw } from "lucide-react";

import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingRelatedPages } from "@/components/marketing-related-pages";
import { MarketingPageLayout } from "@/components/marketing-page-layout";

export const metadata: Metadata = {
  title: "Automated Weekly Client Reporting for MSPs | Handover",
  description:
    "Stop writing weekly client reports manually. Handover connects to HaloPSA and ConnectWise and sends professional automated client updates every week from your live PSA data.",
  alternates: {
    canonical: "https://gethandover.uk/solutions/weekly-client-reporting",
  },
};

export default function WeeklyClientReportingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Automated Weekly Client Reporting for MSPs | Handover",
    description: metadata.description,
    url: "https://gethandover.uk/solutions/weekly-client-reporting",
  };

  return (
    <MarketingPageLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="marketing-page-hero relative overflow-hidden bg-[var(--bg-primary)] px-6 py-12 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto w-full max-w-[1000px]">
          <div className="rounded-[var(--radius-lg)] border border-[rgba(56,189,248,0.28)] bg-[rgba(15,23,42,0.68)] px-6 py-8 shadow-[0_20px_60px_-22px_rgba(56,189,248,0.35)] md:px-10 md:py-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#38bdf8]">Solutions · Use Case</p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight text-white md:text-5xl">
              Weekly Client Reports That Write Themselves. Every Week. Without Fail.
            </h1>
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
            Every Friday, somewhere in every MSP, someone is writing a client report. Pulling data from the PSA.
            Copying ticket summaries into an email. Trying to make technical progress sound meaningful to a
            non-technical client. Sending it late because the week got busy.
          </p>
          <p>
            It happens every week. It takes hours. And it adds up to one of the biggest hidden costs in MSP service
            delivery.
          </p>
          <p>Handover eliminates it entirely.</p>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">The Real Cost of Manual Weekly Reporting</h2>
            <p className="mt-3">
              Most MSPs do not calculate the true cost of manual reporting because it is absorbed into general
              overhead. But run the numbers and it becomes clear quickly.
            </p>
            <p className="mt-3">
              If a service manager spends 90 minutes per client per week on reporting, and you have 20 clients, that
              is 30 hours per week. 120 hours per month. 1,440 hours per year. At even a modest internal cost per
              hour, that is a significant operational expense on a task that delivers no technical value whatsoever.
            </p>
            <p className="mt-3">
              It is also inconsistent. Reports written on a Friday afternoon after a busy week are not the same
              quality as reports written on a Monday morning with fresh eyes. Clients notice even when they cannot
              articulate why.
            </p>
            <p className="mt-3">Handover fixes both the cost and the consistency problem in one step.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">How Automated Weekly Reporting Works</h2>
            <p className="mt-3">
              Connect Handover to your PSA. Select the tickets and projects you want to report on for each client. Set
              your schedule. That is it.
            </p>
            <p className="mt-3">
              Every week, at the time you choose, Handover pulls your live ticket and project data, runs it through AI
              trained specifically on MSP service delivery context, and generates a professional client-facing report.
              It covers what happened this week, what is still open, what the risks are, and what is being done about
              it.
            </p>
            <p className="mt-3">
              The report goes directly to your client by email. Branded with your company identity. Written in plain
              English. Formatted professionally.
            </p>
            <p className="mt-3">You do not touch it. It just goes.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">What Every Weekly Report Includes</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                <strong className="text-[var(--text-primary)]">This Week&apos;s Summary</strong>
                <br />
                A plain-English overview of activity across the client&apos;s account. What was raised, what was
                resolved, what is ongoing. Written for a business audience, not a technical one.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Open Tickets and Status</strong>
                <br />
                Every open ticket summarised with current status and next action. Your client knows what is happening
                without needing to log into your PSA.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Project Progress</strong>
                <br />
                Active projects with current completion percentage, recent milestones, and upcoming tasks. Clients stay
                informed on project delivery without chasing for updates.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Actions Required</strong>
                <br />
                A clear list of anything the client needs to do or approve. No more actions getting missed because they
                were buried in a ticket note.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Risks and Flags</strong>
                <br />
                AI-identified risks from the current ticket and project data. Surfaced proactively so your client knows
                about potential issues before they become problems.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              Consistent. Professional. On Time. Every Week.
            </h2>
            <p className="mt-3">
              The impact of consistent weekly communication on client retention is significant and consistently
              underestimated by MSP leadership.
            </p>
            <p className="mt-3">
              Clients who receive regular, professional updates about their account are less likely to churn. Not
              because the technical work is better, but because they feel informed, looked after, and confident that
              their MSP is on top of things.
            </p>
            <p className="mt-3">
              Handover delivers that confidence automatically, to every client, every week, regardless of how busy your
              team is.
            </p>
          </section>

          <section className="rounded-[var(--radius-lg)] border border-[var(--border)] border-l-[3px] border-l-[#0EA5E9] bg-[var(--bg-primary)] p-6">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Works With HaloPSA and ConnectWise Manage</h2>
            <p className="mt-3">
              Connect your PSA in minutes. Select your clients. Set your schedule. Your first automated weekly report
              goes out this week.
            </p>
            <Link href="/auth?tab=signup" className="marketing-page-bottom-cta mt-5 inline-flex items-center">
              Start your free trial at gethandover.uk
            </Link>
          </section>
          <section className="rounded-[var(--radius-lg)] border border-[var(--border)] border-l-[3px] border-l-[#0EA5E9] bg-[var(--bg-primary)] p-6">
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">Features that power this</h3>
            <p className="mt-2 text-sm">
              <a href="/features/automated-reports" className="text-[var(--accent)] hover:underline">Automated Client Reports</a>
              {" · "}
              <a href="/features/scheduled-reports" className="text-[var(--accent)] hover:underline">Scheduled Reporting</a>
            </p>
          </section>
        </div>
      </section>

      <MarketingRelatedPages
        links={[
          { href: "/features/scheduled-reports", title: "Scheduled reporting", Icon: CalendarClock },
          { href: "/features/automated-reports", title: "Automated client reports", Icon: RefreshCw },
          { href: "/pricing", title: "Plans and pricing", Icon: BarChart3 },
        ]}
      />
    </MarketingPageLayout>
  );
}

