import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, CalendarClock, Sparkles } from "lucide-react";

import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingRelatedPages } from "@/components/marketing-related-pages";
import { MarketingPageLayout } from "@/components/marketing-page-layout";

export const metadata: Metadata = {
  title: "Automated Client Reports for MSPs | Handover",
  description:
    "Handover generates professional client reports from your HaloPSA or ConnectWise data automatically. No manual writing. No formatting. Just consistent, professional client communication every week.",
  alternates: { canonical: "https://gethandover.uk/features/automated-reports" },
};

export default function AutomatedReportsFeaturePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Handover Automated Client Reports",
    applicationCategory: "BusinessApplication",
    description: metadata.description,
    url: "https://gethandover.uk/features/automated-reports",
  };
  return (
    <MarketingPageLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="relative overflow-hidden bg-transparent px-6 py-12 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto max-w-[1000px] rounded-[var(--radius-lg)] border border-[rgba(56,189,248,0.25)] bg-[rgba(15,23,42,0.68)] p-8">
          <h1 className="text-3xl font-semibold text-white md:text-5xl">Client Reports That Write Themselves.</h1>
          <div className="mt-5">
            <Link href="/onboarding/connect" className="inline-flex rounded-[var(--radius)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]">Run the free PSA scan</Link>
          </div>
        </div>
      </section>
      <section className="px-6 py-12 md:px-8">
        <div className="mx-auto max-w-[900px] space-y-8 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
          <p>Every week, MSP service managers sit down and write client reports. They pull data from the PSA. They summarise ticket progress. They try to translate technical activity into language a business audience understands. They format it, review it, and send it.</p>
          <p>It takes between 30 minutes and two hours per client. It happens every week. And every minute of it is time that could be spent on actual service delivery.</p>
          <p>Handover does it automatically. Connected to your PSA, generating professional client reports from your live data, sending them to your clients on schedule. Without you touching a thing.</p>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">How It Works</h2>
          <p>Connect Handover to HaloPSA or ConnectWise Manage. Select the tickets and projects you want to include for each client. Handover pulls the live data, runs it through AI trained specifically on MSP service delivery context, and generates a complete client-facing report.</p>
          <p>The report covers what happened this week, what is still open, what the risks are, what actions are required, and what the outlook is. Written in plain English. Formatted professionally. Ready to send.</p>
          <p>From connection to client-ready report: 30 seconds.</p>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">What Every Report Includes</h2>
          <p><strong className="text-[var(--text-primary)]">Activity Summary</strong><br />A plain-English overview of everything that happened on the client account this week. Tickets raised, tickets resolved, notable events. Written for a business audience not a technical one.</p>
          <p><strong className="text-[var(--text-primary)]">Open Tickets and Status</strong><br />Every open ticket summarised with current status, priority, and next action. Your client knows what is happening without needing PSA access.</p>
          <p><strong className="text-[var(--text-primary)]">Project Progress</strong><br />Active projects with current completion percentage, recent milestones, and upcoming tasks. Clients stay informed on delivery without chasing for updates.</p>
          <p><strong className="text-[var(--text-primary)]">Actions Required</strong><br />A clear list of anything the client needs to do or approve. No actions get missed because they were buried in a ticket note.</p>
          <p><strong className="text-[var(--text-primary)]">Risks and Flags</strong><br />AI-identified risks from current ticket and project data. Surfaced proactively so clients know about potential issues before they become problems.</p>
          <p><strong className="text-[var(--text-primary)]">Next Steps</strong><br />Forward-looking and specific. What is happening next week, what decisions need to be made, what your team is focused on.</p>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">The Consistency Advantage</h2>
          <p>Manual reporting is inconsistent by nature. Reports written on a busy Friday afternoon are not the same quality as reports written on a quiet Monday morning. Different people write them differently. Some go out on time, some get forgotten.</p>
          <p>Clients notice inconsistency even when they cannot articulate it. It creates uncertainty about whether the MSP is really on top of things.</p>
          <p>Handover standardises every report your team produces. Same professional format. Same clear language. Same on-time delivery. Every client. Every week. Regardless of how busy the service desk is.</p>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Works Out of the Box</h2>
          <p>Connect your PSA and generate your first report today. Nothing to configure. Nothing to install. Nothing to learn.</p>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] border-l-[3px] border-l-[#0EA5E9] p-5">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Who uses this</h3>
            <p className="mt-2 text-sm">Best fit for <Link href="/solutions/service-desk-managers" className="text-[var(--accent)] hover:underline">Service Desk Managers</Link>, <Link href="/solutions/account-managers" className="text-[var(--accent)] hover:underline">Account Managers</Link>, and <Link href="/solutions/msp-directors" className="text-[var(--accent)] hover:underline">MSP Directors</Link>.</p>
          </div>
        </div>
      </section>

      <MarketingRelatedPages
        links={[
          { href: "/features/scheduled-reports", title: "Scheduled reporting", Icon: CalendarClock },
          { href: "/features/ai-insights", title: "AI-powered insights", Icon: Sparkles },
          { href: "/pricing", title: "Plans and pricing", Icon: BarChart3 },
        ]}
      />
    </MarketingPageLayout>
  );
}

