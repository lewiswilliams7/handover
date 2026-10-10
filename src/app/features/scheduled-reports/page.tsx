import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, CalendarClock, RefreshCw } from "lucide-react";

import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingRelatedPages } from "@/components/marketing-related-pages";
import { MarketingPageLayout } from "@/components/marketing-page-layout";

export const metadata: Metadata = {
  title: "Scheduled Automated Reports for MSPs | Handover",
  description:
    "Set up automated scheduled reports that pull from HaloPSA or ConnectWise and send to clients on a weekly, fortnightly, or monthly schedule. Zero manual effort after setup.",
  alternates: { canonical: "https://gethandover.uk/features/scheduled-reports" },
};

export default function ScheduledReportsFeaturePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Handover Scheduled Reports",
    applicationCategory: "BusinessApplication",
    description: metadata.description,
    url: "https://gethandover.uk/features/scheduled-reports",
  };
  return (
    <MarketingPageLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="marketing-page-hero relative overflow-hidden bg-transparent px-6 py-12 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto max-w-[1000px] rounded-[var(--radius-lg)] border border-[rgba(56,189,248,0.25)] bg-[rgba(15,23,42,0.68)] p-8">
          <h1 className="text-3xl font-semibold text-white md:text-5xl">Set It Once. Your Clients Hear From You Every Week.</h1>
        <div className="mt-5"><Link href="/onboarding/connect" className="inline-flex rounded-[var(--radius)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]">Run the free PSA scan</Link></div>
        </div>
      </section>
      <section className="px-6 py-12 md:px-8">
        <div className="mx-auto max-w-[900px] space-y-8 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
          <p>Scheduled reporting is the difference between an MSP that communicates consistently and one that communicates when it remembers to.</p>
          <p>Handover&apos;s scheduled reports pull from your live PSA data, generate a professional client update, and send it to your client automatically on whatever cadence you choose. Weekly, fortnightly, monthly. You decide. After that, it just happens.</p>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">How Scheduled Reports Work</h2>
          <p>Set up a scheduled report for each client in the Handover wizard. Choose your PSA source, select which tickets and projects to include, set your delivery schedule, configure the output format, and save.</p>
          <p>From that point, Handover handles everything. At the scheduled time it pulls your live PSA data, generates the report using the same AI pipeline as manual reports, and sends it directly to your client by email. Branded with your company identity. Written in plain English. On time, every time.</p>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Full Configuration Control</h2>
          <p><strong className="text-[var(--text-primary)]">PSA Source Selection</strong><br />Choose HaloPSA, ConnectWise, or both for each scheduled report. Different clients can pull from different sources.</p>
          <p><strong className="text-[var(--text-primary)]">Ticket and Project Scope</strong><br />Select exactly which tickets and projects each scheduled report covers. Handover only reports on what you tell it to include.</p>
          <p><strong className="text-[var(--text-primary)]">Delivery Schedule</strong><br />Weekly, fortnightly, or monthly. Choose the day and time that works for each client relationship.</p>
          <p><strong className="text-[var(--text-primary)]">Output Format</strong><br />Choose which sections appear in each scheduled report. Include or exclude the Excel attachment. Configure the email tone and recipient details.</p>
          <p><strong className="text-[var(--text-primary)]">Recipient Management</strong><br />Send to the primary client contact, CC additional stakeholders, and BCC your internal account manager. Each scheduled report has its own recipient configuration.</p>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Scheduled QBR Packs</h2>
          <p>Scheduled reporting is not just for weekly updates. Configure a quarterly scheduled QBR pack and Handover generates and sends a complete QBR pack to your client automatically every quarter.</p>
          <p>No calendar reminder. No preparation scramble. The QBR goes out on schedule with the same quality as a manually prepared one.</p>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">What Consistent Scheduling Does For Client Retention</h2>
          <p>Clients who receive regular professional updates are significantly less likely to churn. Not because the technical work is better, but because they feel informed and confident that their MSP is across their account.</p>
          <p>Handover delivers that confidence automatically, to every client, every week, regardless of how busy your service desk is.</p>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] border-l-[3px] border-l-[#0EA5E9] p-5">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Who uses this</h3>
            <p className="mt-2 text-sm">Best fit for <Link href="/solutions/weekly-client-reporting" className="text-[var(--accent)] hover:underline">Weekly Client Reporting</Link>, <Link href="/solutions/account-managers" className="text-[var(--accent)] hover:underline">Account Managers</Link>, and <Link href="/solutions/service-desk-managers" className="text-[var(--accent)] hover:underline">Service Desk Managers</Link>.</p>
          </div>
        </div>
      </section>

      <MarketingRelatedPages
        links={[
          { href: "/solutions/weekly-client-reporting", title: "Weekly client reporting", Icon: CalendarClock },
          { href: "/features/automated-reports", title: "Automated client reports", Icon: RefreshCw },
          { href: "/pricing", title: "Plans and pricing", Icon: BarChart3 },
        ]}
      />
    </MarketingPageLayout>
  );
}

