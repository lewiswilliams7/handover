import type { Metadata } from "next";
import Link from "next/link";
import { Activity, BarChart3, Brain } from "lucide-react";

import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingRelatedPages } from "@/components/marketing-related-pages";
import { MarketingPageLayout } from "@/components/marketing-page-layout";

export const metadata: Metadata = {
  title: "Client Intelligence for MSPs | Account Health Monitoring | Handover",
  description:
    "Handover's Client Intelligence layer tracks account health, open risks, and communication patterns across every client, without you lifting a finger.",
  alternates: { canonical: "https://gethandover.uk/features/client-intelligence" },
};

export default function ClientIntelligenceFeaturePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Handover Client Intelligence",
    applicationCategory: "BusinessApplication",
    description: metadata.description,
    url: "https://gethandover.uk/features/client-intelligence",
  };
  return (
    <MarketingPageLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="marketing-page-hero relative overflow-hidden bg-transparent px-6 py-12 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto max-w-[1000px] rounded-[var(--radius-lg)] border border-[rgba(56,189,248,0.25)] bg-[rgba(15,23,42,0.68)] p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#38bdf8]">
            Client Intelligence™
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white md:text-5xl">
            Your entire client portfolio, watched automatically.
          </h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-[var(--text-secondary)]">
            Handover&apos;s Client Intelligence layer tracks account health, open risks, and communication
            patterns across every client, without you lifting a finger. When something needs attention, you
            hear about it before your client does.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/onboarding/connect"
              className="inline-flex rounded-[var(--radius)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
            >
                Run the free PSA scan
            </Link>
            <Link
              href="/#demo"
              className="inline-flex rounded-[var(--radius)] border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.06]"
            >
              See it in action
            </Link>
          </div>
        </div>
      </section>
      <section className="px-6 py-12 md:px-8">
        <div className="mx-auto max-w-[900px] space-y-8 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">What Client Intelligence Does</h2>
          <p>
            Most MSPs only discover account problems when a client escalates or threatens to leave. Client
            Intelligence gives you a live view of relationship health across your portfolio, calculated from
            the same PSA data and reports you already produce.
          </p>
          <p>
            <strong className="text-[var(--text-primary)]">Account Health Scoring</strong>
            <br />
            RAG status calculated from ticket volume, risk count, and report cadence. See which accounts are
            green, which need a check-in, and which require action today, without opening every client record
            manually.
          </p>
          <p>
            <strong className="text-[var(--text-primary)]">Risk Flagging</strong>
            <br />
            Open risks from your latest reports surfaced automatically, with alert routing to the right
            account. When a client&apos;s risk register grows or overdue items stack up, you see it on the
            overview before it becomes a board-level conversation.
          </p>
          <p>
            <strong className="text-[var(--text-primary)]">Portfolio Digest</strong>
            <br />
            Weekly AI summary of which accounts need attention, sent directly to you. Start the week knowing
            where to focus instead of discovering problems reactively from inbox escalations.
          </p>
          <p>
            <strong className="text-[var(--text-primary)]">Escalation Prevention</strong>
            <br />
            Catch communication gaps before they become churn conversations. Accounts with slipping report
            cadence, rising risk counts, or deteriorating health scores are flagged while there is still time
            to reset the relationship.
          </p>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] border-l-[3px] border-l-[#0EA5E9] p-5">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Who uses this</h3>
            <p className="mt-2 text-sm">
              Best fit for{" "}
              <Link href="/solutions/account-managers" className="text-[var(--accent)] hover:underline">
                Account Managers
              </Link>
              ,{" "}
              <Link href="/solutions/msp-directors" className="text-[var(--accent)] hover:underline">
                MSP Directors
              </Link>
              , and{" "}
              <Link href="/solutions/client-intelligence" className="text-[var(--accent)] hover:underline">
                teams running proactive account reviews
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      <MarketingRelatedPages
        links={[
          { href: "/features/health-dashboard", title: "Delivery health dashboard", Icon: Activity },
          { href: "/solutions/client-intelligence", title: "Client Intelligence for MSPs", Icon: Brain },
          { href: "/pricing", title: "Plans and pricing", Icon: BarChart3 },
        ]}
      />
    </MarketingPageLayout>
  );
}
