import type { Metadata } from "next";
import Link from "next/link";

import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { Nav as MarketingNav } from "@/components/nav";
import { ScrollRevealItem } from "@/components/scroll-reveal-item";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Handover Client Intelligence™ - AI Account Memory for MSPs | Handover",
  description:
    "Handover Client Intelligence™ remembers every report, every risk, and every client relationship - automatically. Stop losing institutional knowledge when engineers leave. Built for HaloPSA and ConnectWise MSPs.",
  alternates: {
    canonical: "https://gethandover.uk/solutions/client-intelligence",
  },
  openGraph: {
    title: "Handover Client Intelligence™ - AI Account Memory for MSPs",
    description:
      "Every report, every risk, every client relationship remembered automatically. The MSP platform that knows your clients better than a new hire briefed for 6 months.",
    url: "https://gethandover.uk/solutions/client-intelligence",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Handover Client Intelligence™",
    description: "AI account memory for MSPs. Every client relationship remembered automatically.",
  },
};

export default function ClientIntelligencePage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Handover Client Intelligence",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "AI-powered client account memory system for MSPs. Automatically accumulates relationship history, generates account summaries, detects recurring issues, and surfaces what needs attention across your entire client portfolio.",
      offers: {
        "@type": "Offer",
        price: "99",
        priceCurrency: "GBP",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: "99",
          priceCurrency: "GBP",
          billingDuration: "P1M",
        },
      },
      featureList: [
        "Automatic client account history accumulation",
        "AI-generated account intelligence summaries",
        "Relationship health scoring (RAG status)",
        "Recurring issue detection across report history",
        "What needs attention - portfolio-wide AI query",
        "QBR generation from accumulated history",
        "Report comparison - what changed since last report",
        "Proactive client alerts",
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is Handover Client Intelligence?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Handover Client Intelligence is an AI-powered account memory system built for MSPs. Every report Handover generates is stored and analysed, building a continuously updated picture of each client relationship. It surfaces recurring issues, generates account summaries, scores relationship health, and tells you what needs attention across your entire portfolio - without you having to ask.",
          },
        },
        {
          "@type": "Question",
          name: "How is Handover Client Intelligence different from BrightGauge?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "BrightGauge shows dashboards and KPI charts from live PSA data. It tells you what happened. Handover Client Intelligence tells you what it means - which clients need attention, what risks are recurring, how relationships are trending, and what to do next. It also accumulates history over time, so it becomes more valuable the longer you use it.",
          },
        },
        {
          "@type": "Question",
          name: "What happens when an account manager leaves an MSP?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Without Handover Client Intelligence, the institutional knowledge leaves with them - client preferences, relationship history, open commitments, recurring issues. With Handover, every report, every risk, and every delivery milestone is stored and searchable. A new account manager can be briefed on any client in 60 seconds.",
          },
        },
        {
          "@type": "Question",
          name: "Does Client Intelligence work with HaloPSA and ConnectWise?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Handover Client Intelligence works with both HaloPSA and ConnectWise. It builds account memory from every report Handover generates using your PSA data. No additional configuration required.",
          },
        },
        {
          "@type": "Question",
          name: "What plan includes Client Intelligence?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Handover Client Intelligence is included with the Handover workspace at £499/month or £4,990 annually. It requires at least 2 reports per client to generate meaningful account summaries.",
          },
        },
      ],
    },
  ];

  return (
    <>
      <MarketingNav />
      <div className="marketing-aurora min-h-screen">
        {jsonLd.map((schema, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}

        <section className="marketing-page-hero relative overflow-hidden bg-transparent px-6 py-12 md:px-8 md:py-20">
          <MarketingHeroAmbient />
          <div className="relative z-[1] mx-auto w-full max-w-[1000px]">
            <ScrollRevealItem index={0} disableAnimation className="block">
              <div className="rounded-[var(--radius-lg)] border border-[rgba(56,189,248,0.28)] bg-[rgba(15,23,42,0.68)] px-6 py-8 shadow-[0_20px_60px_-22px_rgba(56,189,248,0.35)] md:px-10 md:py-10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#38bdf8]">
                  Handover Client Intelligence™
                </p>
                <h1 className="mt-2 text-3xl font-semibold leading-tight text-white md:text-5xl">
                  Your MSP Has a Memory Problem. Here&apos;s the Fix.
                </h1>
                <p className="mt-4 max-w-[620px] text-[15px] leading-relaxed text-white/60">
                  Every time an engineer or account manager leaves, they take years of client knowledge with them.
                  Handover Client Intelligence™ remembers every client relationship - every report, every risk, every
                  commitment - so your MSP never loses that context again.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/onboarding/connect"
                    className="rounded-lg bg-[#38bdf8] px-5 py-2.5 text-[13px] font-semibold text-[#06091a] transition-all hover:scale-[1.02]"
                  >
                    Run the free PSA scan →
                  </Link>
                  <Link
                    href="/pricing"
                    className="rounded-lg border border-white/[0.15] px-5 py-2.5 text-[13px] font-medium text-white/70 transition-all hover:border-white/30 hover:text-white"
                  >
                    View pricing
                  </Link>
                </div>
              </div>
            </ScrollRevealItem>
          </div>
        </section>

        <section className="px-6 py-16 md:px-8">
          <div className="mx-auto max-w-[1000px]">
            <ScrollRevealItem index={1}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#38bdf8]">The problem</p>
              <h2 className="mb-12 text-2xl font-semibold text-white md:text-3xl">What MSPs lose every single week</h2>
            </ScrollRevealItem>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  title: "The account manager who just left",
                  body: "They knew which stakeholder to call, what was promised in the last QBR, and which risks were quietly building. That knowledge walked out the door with them.",
                },
                {
                  title: "The client meeting you weren't ready for",
                  body: "45 minutes of scrambling through PSA notes, old emails, and spreadsheets to remember what happened last quarter. A professional briefing should take 60 seconds.",
                },
                {
                  title: "The risk that became an incident",
                  body: "It was flagged three reports ago. Then twice more. But nobody connected the pattern - because that history was buried in separate ticket notes nobody reads.",
                },
              ].map((item, i) => (
                <ScrollRevealItem key={i} index={i + 2}>
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6">
                    <h3 className="mb-3 text-[14px] font-semibold text-white">{item.title}</h3>
                    <p className="text-[13px] leading-relaxed text-white/50">{item.body}</p>
                  </div>
                </ScrollRevealItem>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-16 md:px-8">
          <div className="mx-auto max-w-[1000px]">
            <ScrollRevealItem index={5}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#38bdf8]">How it works</p>
              <h2 className="mb-4 text-2xl font-semibold text-white md:text-3xl">
                Handover Client Intelligence™ builds automatically
              </h2>
              <p className="mb-12 max-w-[580px] text-[14px] leading-relaxed text-white/50">
                Every report Handover generates adds to a growing picture of each client relationship. No manual data
                entry. No configuration. It compounds in the background while you work.
              </p>
            </ScrollRevealItem>
            <div className="grid gap-6 md:grid-cols-2">
              {[
                {
                  number: "01",
                  title: "Account history - automatic",
                  body: "Every report, every QBR, every risk logged is stored against the client. View the full history of any relationship in a single view - going back to day one.",
                },
                {
                  number: "02",
                  title: "Account intelligence summaries",
                  body: "Click any client and Handover generates an AI account briefing - relationship health RAG, account narrative, recurring issues, key achievements, open risks, and QBR talking points. Ready in under 30 seconds.",
                },
                {
                  number: "03",
                  title: "What needs my attention?",
                  body: "One click surfaces everything that needs action across your entire portfolio - overdue reports, escalating risks, deteriorating relationships. Prioritised by severity. Specific and actionable.",
                },
                {
                  number: "04",
                  title: "What changed since last report?",
                  body: "After every generation, Handover compares the new report to the previous one and shows exactly what was resolved, what is new, and what is still ongoing - in three columns, instantly.",
                },
                {
                  number: "05",
                  title: "QBR generation from history",
                  body: "Generate a complete QBR pack from accumulated account history - not just this week's tickets. Executive summary, relationship health, strategic priorities, and talking points informed by months of real delivery data.",
                },
                {
                  number: "06",
                  title: "Proactive portfolio alerts",
                  body: "Weekly digest emails surface what needs attention before your clients feel it. No logging in required - Handover tells you what to act on, when it matters.",
                },
              ].map((item, i) => (
                <ScrollRevealItem key={i} index={i + 6}>
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6">
                    <p className="mb-3 text-[11px] font-bold text-[#38bdf8]">{item.number}</p>
                    <h3 className="mb-2 text-[14px] font-semibold text-white">{item.title}</h3>
                    <p className="text-[13px] leading-relaxed text-white/50">{item.body}</p>
                  </div>
                </ScrollRevealItem>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-12 md:px-8">
          <div className="mx-auto max-w-[900px]">
            <ScrollRevealItem index={11}>
              <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-[#38bdf8]">
                See it in action
              </p>
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] shadow-[0_0_60px_-10px_rgba(56,189,248,0.2)]">
                <video
                  controls
                  playsInline
                  preload="metadata"
                  poster="/demo/handover-demo-thumb.jpg"
                  className="block w-full rounded-2xl"
                  style={{
                    aspectRatio: "16/9",
                    backgroundColor: "#06091a",
                  }}
                >
                  <source
                    src="/demo/handover-demo.mp4"
                    type="video/mp4"
                  />
                </video>
              </div>
              <p className="mt-3 text-center text-[11px] text-white/25">
                Client Intelligence section starts at 1:00
              </p>
            </ScrollRevealItem>
          </div>
        </section>

        <section className="px-6 py-16 md:px-8">
          <div className="mx-auto max-w-[1000px]">
            <ScrollRevealItem index={12}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#38bdf8]">
                How it compares
              </p>
              <h2 className="mb-10 text-2xl font-semibold text-white md:text-3xl">
                The only MSP platform with genuine account memory
              </h2>
            </ScrollRevealItem>
            <ScrollRevealItem index={13}>
              <div className="overflow-hidden rounded-xl border border-white/[0.08]">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-white/[0.08] bg-white/[0.03]">
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-white/40">
                        Capability
                      </th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-[#38bdf8]">
                        Handover CI™
                      </th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-white/40">
                        BrightGauge
                      </th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-white/40">
                        PSA native
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Accumulates client history automatically", "✓", "No", "No"],
                      ["AI account summaries from history", "✓", "No", "No"],
                      ["Relationship health scoring", "✓", "No", "No"],
                      ["Recurring issue detection", "✓", "No", "No"],
                      ["What changed since last report", "✓", "No", "No"],
                      ["Portfolio attention queue", "✓", "No", "No"],
                      ["QBR from accumulated history", "✓", "No", "No"],
                      ["Live KPI dashboards", "Planned", "✓", "Partial"],
                      ["PSA integration", "✓", "✓", "Native"],
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-white/[0.06] last:border-0">
                        <td className="px-5 py-3 text-white/60">{row[0]}</td>
                        {row.slice(1).map((cell, j) => (
                          <td key={j} className="px-5 py-3 text-center font-medium">
                            <span
                              className={
                                cell === "✓"
                                  ? j === 0
                                    ? "text-[#38bdf8]"
                                    : "text-white/30"
                                  : cell === "No"
                                    ? "text-white/15"
                                    : "text-white/40"
                              }
                            >
                              {cell}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollRevealItem>
          </div>
        </section>

        <section className="px-6 py-12 md:px-8">
          <div className="mx-auto max-w-[1000px]">
            <ScrollRevealItem index={14}>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 md:p-8">
                <div className="grid items-center gap-6 md:grid-cols-2 md:gap-10">
                  <div>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#38bdf8]">
                      Why retention matters
                    </p>
                    <h3 className="mb-4 text-[20px] font-semibold leading-snug text-white">
                      1 in 4 SMEs left their MSP because of poor account management
                    </h3>
                    <p className="mb-4 text-[13px] leading-relaxed text-white/50">
                      According to JumpCloud&apos;s 2024 SME IT Trends Report, 23% of SMEs stopped working with their
                      MSP due to poor customer service or a negative experience with their account team.
                    </p>
                    <p className="text-[13px] leading-relaxed text-white/50">
                      Handover Client Intelligence surfaces deteriorating relationships before they become a churn risk -
                      relationship health scoring, recurring issue detection, and proactive attention alerts mean you act
                      before your client feels neglected.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {[
                      {
                        pct: "23%",
                        text: "left due to poor account management",
                        color: "red",
                      },
                      {
                        pct: "26%",
                        text: "left because they outgrew the service",
                        color: "amber",
                      },
                      {
                        pct: "67%",
                        text: "plan to increase MSP investment next year",
                        color: "green",
                      },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex items-center gap-4 rounded-xl border p-4",
                          item.color === "red"
                            ? "border-red-500/20 bg-red-500/[0.04]"
                            : item.color === "amber"
                              ? "border-amber-500/20 bg-amber-500/[0.04]"
                              : "border-green-500/20 bg-green-500/[0.04]",
                        )}
                      >
                        <p
                          className={cn(
                            "w-16 flex-shrink-0 text-[28px] font-bold leading-none",
                            item.color === "red"
                              ? "text-red-400"
                              : item.color === "amber"
                                ? "text-amber-400"
                                : "text-green-400",
                          )}
                        >
                          {item.pct}
                        </p>
                        <p className="text-[12px] leading-relaxed text-white/60">{item.text}</p>
                      </div>
                    ))}
                    <p className="pt-1 text-right text-[10px] text-white/25">
                      Source: JumpCloud SME IT Trends Report 2024
                    </p>
                  </div>
                </div>
              </div>
            </ScrollRevealItem>
          </div>
        </section>

        <section className="px-6 py-16 md:px-8">
          <div className="mx-auto max-w-[700px]">
            <ScrollRevealItem index={14}>
              <h2 className="mb-10 text-2xl font-semibold text-white md:text-3xl">Frequently asked questions</h2>
            </ScrollRevealItem>
            <div className="space-y-6">
              {[
                {
                  q: "What is Handover Client Intelligence™?",
                  a: "Handover Client Intelligence™ is an AI account memory system built into Handover. Every report you generate is stored and analysed, building a continuously updated picture of each client relationship. It surfaces recurring issues, generates account summaries, scores relationship health, and tells you what needs attention - without you having to ask.",
                },
                {
                  q: "How is this different from a CRM?",
                  a: "A CRM stores what you manually enter. Handover Client Intelligence™ builds automatically from your PSA data and generated reports - no manual input. It also analyses patterns and surfaces insights rather than just storing records.",
                },
                {
                  q: "How long until Client Intelligence becomes useful?",
                  a: "Account summaries are available after 2 reports per client. Pattern detection and trend analysis become meaningful after 4-6 reports. The longer you use Handover, the deeper the intelligence becomes.",
                },
                {
                  q: "Is Client Intelligence available on all plans?",
                  a: "Handover Client Intelligence™ is included with the Handover workspace at £499/month or £4,990 annually.",
                },
                {
                  q: "What PSAs does it work with?",
                  a: "Handover Client Intelligence™ works with HaloPSA and ConnectWise Manage. HaloITSM support is coming soon.",
                },
              ].map((item, i) => (
                <ScrollRevealItem key={i} index={i + 15}>
                  <div className="border-b border-white/[0.08] pb-6">
                    <h3 className="mb-3 text-[14px] font-semibold text-white">{item.q}</h3>
                    <p className="text-[13px] leading-relaxed text-white/50">{item.a}</p>
                  </div>
                </ScrollRevealItem>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-[700px] text-center">
            <ScrollRevealItem index={20}>
              <h2 className="mb-4 text-2xl font-semibold text-white md:text-3xl">Start building account memory today</h2>
              <p className="mb-8 text-[14px] leading-relaxed text-white/50">
                Every week you wait is a week of client history you&apos;re not capturing. Handover Client Intelligence™
                is included with Handover. Run the free PSA scan before you buy.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href="/onboarding/connect"
                  className="rounded-lg bg-[#38bdf8] px-6 py-3 text-[14px] font-semibold text-[#06091a] transition-all hover:scale-[1.02]"
                >
                  Run the free PSA scan →
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-lg border border-white/[0.15] px-6 py-3 text-[14px] font-medium text-white/70 transition-all hover:border-white/30 hover:text-white"
                >
                  View Growth plan
                </Link>
              </div>
            </ScrollRevealItem>
          </div>
        </section>

        <MarketingFooter />
      </div>
    </>
  );
}
