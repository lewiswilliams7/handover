import type { Metadata } from "next";
import Link from "next/link";
import { Activity, BarChart3, Sparkles } from "lucide-react";

import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingRelatedPages } from "@/components/marketing-related-pages";
import { MarketingPageLayout } from "@/components/marketing-page-layout";

export const metadata: Metadata = {
  title: "AI-Powered MSP Reporting and Insights | Handover",
  description:
    "Handover uses AI trained on MSP service delivery context to generate intelligent client reports, surface risks proactively, and translate PSA data into plain-English client communication automatically.",
  alternates: { canonical: "https://gethandover.uk/features/ai-insights" },
};

export default function AiInsightsFeaturePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Handover AI Insights",
    applicationCategory: "BusinessApplication",
    description: metadata.description,
    url: "https://gethandover.uk/features/ai-insights",
  };
  return (
    <MarketingPageLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="marketing-page-hero relative overflow-hidden bg-transparent px-6 py-12 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto max-w-[1000px] rounded-[var(--radius-lg)] border border-[rgba(56,189,248,0.25)] bg-[rgba(15,23,42,0.68)] p-8">
          <h1 className="text-3xl font-semibold text-white md:text-5xl">Not Just Reports. Intelligent Insights From Your PSA Data.</h1>
          <div className="mt-5"><Link href="/auth?tab=signup&returnTo=/welcome" className="inline-flex rounded-[var(--radius)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]">See AI-powered reporting in action</Link></div>
        </div>
      </section>
      <section className="px-6 py-12 md:px-8">
        <div className="mx-auto max-w-[900px] space-y-8 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
          <p>Pulling data from a PSA and formatting it into a document is not intelligence. It is automation. What makes Handover different is what happens between the data and the output.</p>
          <p>Handover&apos;s AI is trained specifically on MSP service delivery context. It does not just summarise what happened. It understands what matters, what is at risk, what the client needs to know, and how to communicate it in language that builds confidence rather than confusion.</p>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">What the AI Actually Does</h2>
          <p><strong className="text-[var(--text-primary)]">Translates Technical Data Into Business Language</strong><br />Your clients do not speak ticket. They do not know what P1 means. They do not understand SLA breach windows or ticket escalation paths. Handover&apos;s AI translates your PSA data into plain English that a non-technical business audience can read, understand, and act on.</p>
          <p><strong className="text-[var(--text-primary)]">Identifies Risks Proactively</strong><br />The AI analyses your ticket and project data to identify risks that might not be obvious from the raw numbers. A cluster of tickets from the same client in the same category. A project with high task completion but multiple open blockers. An account where response times are trending in the wrong direction. Handover surfaces these patterns and includes them in the report before your client has to ask.</p>
          <p><strong className="text-[var(--text-primary)]">Generates Contextual Recommendations</strong><br />Every report includes AI-generated next steps and recommendations that are specific to the client&apos;s current situation. Not generic advice. Specific, actionable guidance based on what the data actually shows.</p>
          <p><strong className="text-[var(--text-primary)]">Calibrates Tone For the Audience</strong><br />Set the communication tone for each client, professional, technical, executive, or conversational, and the AI adjusts its language accordingly. The same underlying data produces different outputs depending on who is reading it.</p>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Trained on MSP Context</h2>
          <p>Generic AI writing tools produce generic output. They do not understand the difference between a reactive ticket and a proactive maintenance task. They do not know that an open P1 ticket from three days ago is a red flag regardless of what the status field says. They do not know how to frame a delayed project milestone in a way that maintains client confidence rather than eroding it.</p>
          <p>Handover&apos;s AI is built with MSP service delivery context at its core. The outputs it produces read like they were written by an experienced service delivery manager who knows the client, knows the account history, and knows what matters to a business audience.</p>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Gets Better With Your Data</h2>
          <p>The more you use Handover, the more context the AI has about your clients, your communication style, and your service delivery patterns. Scheduled reports build a history that informs future outputs. Your brand voice becomes consistent across every client communication over time.</p>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] border-l-[3px] border-l-[#0EA5E9] p-5">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Who uses this</h3>
            <p className="mt-2 text-sm">Best fit for <a href="/solutions/msp-directors" className="text-[var(--accent)] hover:underline">MSP Directors</a>, <a href="/solutions/account-managers" className="text-[var(--accent)] hover:underline">Account Managers</a>, and <a href="/solutions/service-desk-managers" className="text-[var(--accent)] hover:underline">Service Desk Managers</a>.</p>
          </div>
        </div>
      </section>

      <MarketingRelatedPages
        links={[
          { href: "/features/health-dashboard", title: "Delivery health dashboard", Icon: Activity },
          { href: "/features/automated-reports", title: "Automated client reports", Icon: Sparkles },
          { href: "/solutions/msp-directors", title: "MSP directors", Icon: BarChart3 },
        ]}
      />
    </MarketingPageLayout>
  );
}

