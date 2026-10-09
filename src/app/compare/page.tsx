import type { Metadata } from "next";
import Link from "next/link";

import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { ScrollRevealItem } from "@/components/scroll-reveal-item";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Compare - Handover vs manual reporting & generic AI",
  description:
    "See how Handover stacks up against writing reports manually and using ChatGPT or Copilot: HaloPSA API, push-back, scheduling, Excel packs, and delivery health.",
  alternates: {
    canonical: "https://gethandover.uk/compare",
  },
};

const manualRows: [string, string, string][] = [
  ["Time per report", "20-30 minutes", "Under 60 seconds"],
  ["Consistency", "Varies by PM", "Consistent every time"],
  ["HaloPSA integration", "Manual copy-paste", "Live API connection"],
  ["Push-back to tickets", "Never happens", "One click"],
  ["Scheduled delivery", "Relies on PM remembering", "Fully automated"],
  ["Excel report pack", "Hours to build", "Generated automatically"],
  ["Risk flagging", "Easy to miss", "Surfaced automatically"],
  ["Audit trail", "Lives in sent emails", "Complete ticket history"],
  ["Cost per week (at £50/hr)", "£50-100", "£5.75 (Pro plan, annual)"],
];

const aiRows: [string, string, string][] = [
  ["HaloPSA connection", "Manual copy-paste required", "Native API integration"],
  ["Prompt engineering", "Required every time", "Built-in PM language"],
  ["Push-back to tickets", "Not possible", "One click"],
  ["Scheduled reports", "Not possible", "Fully automated"],
  ["Excel pack", "Not possible", "17-sheet pack generated"],
  ["Delivery dashboard", "Not possible", "Live RAG status"],
  ["Setup time", "20+ mins per report", "5 min one-time setup"],
  ["Consistent output", "Varies", "Standardised every time"],
];

export default function ComparePage() {
  return (
    <MarketingPageLayout>
      <section className="relative overflow-hidden bg-[var(--bg-primary)] px-6 py-12 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto max-w-[1100px] text-center">
          <ScrollRevealItem index={0} className="block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              Comparison
            </p>
            <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-[var(--text-primary)] md:text-5xl">
              Why MSP teams choose Handover over manual reporting and generic AI
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-[var(--text-secondary)]">
              Compare what you&apos;re doing now vs what&apos;s possible with Handover
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link href="/onboarding/connect">
                <Button
                  size="lg"
                  className="rounded-[var(--radius)] bg-[var(--accent)] px-8 text-white hover:bg-[var(--accent-hover)]"
                >
                  Run the free PSA scan
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="rounded-[var(--radius)] border-[var(--border)] px-8">
                  Compare plans & pricing
                </Button>
              </Link>
            </div>
          </ScrollRevealItem>
        </div>
      </section>

      <section
        className="border-t border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-14 md:px-8 md:py-20"
      >
        <div className="mx-auto max-w-[1100px]">
          <ScrollRevealItem index={0} className="block">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] md:text-3xl">
              Handover vs manual reporting
            </h2>
            <p className="mt-2 max-w-2xl text-[var(--text-secondary)]">
              Same outcomes - a fraction of the time, every week.
            </p>
          </ScrollRevealItem>
          <div className="mt-10 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] shadow-sm">
            <div className="grid grid-cols-3 gap-0 border-b border-[var(--border)] bg-[var(--bg-secondary)] text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)] md:text-sm">
              <div className="px-3 py-3 md:px-4">Topic</div>
              <div className="px-3 py-3 md:px-4">Manual reporting</div>
              <div className="px-3 py-3 text-[var(--accent)] md:px-4">Handover</div>
            </div>
            {manualRows.map(([topic, manual, handover], i) => (
              <div
                key={topic}
                className={`grid grid-cols-3 gap-0 text-[13px] md:text-sm ${i % 2 === 0 ? "bg-[var(--bg-primary)]" : "bg-[color-mix(in_srgb,var(--bg-secondary)_55%,var(--bg-primary))]"}`}
              >
                <div className="border-t border-[var(--border)] px-3 py-3 font-medium text-[var(--text-primary)] md:px-4">
                  {topic}
                </div>
                <div className="border-t border-[var(--border)] px-3 py-3 text-[var(--text-secondary)] md:px-4">
                  {manual}
                </div>
                <div className="border-t border-[var(--border)] px-3 py-3 font-medium text-[var(--text-primary)] md:px-4">
                  {handover}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border)] bg-[var(--bg-primary)] px-6 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-[1100px]">
          <ScrollRevealItem index={0} className="block">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] md:text-3xl">
              Handover vs generic AI (ChatGPT / Copilot)
            </h2>
            <p className="mt-2 max-w-2xl text-[var(--text-secondary)]">
              General models don&apos;t understand your PSA - or your delivery workflow.
            </p>
          </ScrollRevealItem>
          <div className="mt-10 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] shadow-sm">
            <div className="grid grid-cols-3 gap-0 border-b border-[var(--border)] bg-[var(--bg-primary)] text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)] md:text-sm">
              <div className="px-3 py-3 md:px-4">Topic</div>
              <div className="px-3 py-3 md:px-4">Generic AI</div>
              <div className="px-3 py-3 text-[var(--accent)] md:px-4">Handover</div>
            </div>
            {aiRows.map(([topic, generic, handover], i) => (
              <div
                key={topic}
                className={`grid grid-cols-3 gap-0 text-[13px] md:text-sm ${i % 2 === 0 ? "bg-[var(--bg-secondary)]" : "bg-[color-mix(in_srgb,var(--bg-primary)_40%,var(--bg-secondary))]"}`}
              >
                <div className="border-t border-[var(--border)] px-3 py-3 font-medium text-[var(--text-primary)] md:px-4">
                  {topic}
                </div>
                <div className="border-t border-[var(--border)] px-3 py-3 text-[var(--text-secondary)] md:px-4">
                  {generic}
                </div>
                <div className="border-t border-[var(--border)] px-3 py-3 font-medium text-[var(--text-primary)] md:px-4">
                  {handover}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-[900px] text-center">
          <ScrollRevealItem index={0} className="block">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] md:text-3xl">
              The real cost of manual reporting
            </h2>
            <div
              className="mx-auto mt-10 max-w-[640px] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-8 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.35)] md:p-10"
            >
              <p className="text-[15px] leading-relaxed text-[var(--text-secondary)] md:text-lg">
                <span className="font-semibold text-[var(--text-primary)]">10 projects</span> ×{" "}
                <span className="font-semibold text-[var(--text-primary)]">30 minutes</span> ×{" "}
                <span className="font-semibold text-[var(--text-primary)]">52 weeks</span>
                <span className="mx-1 text-[var(--text-muted)]">=</span>
                <span className="font-bold text-[var(--accent)]">260 hours / year</span>
              </p>
              <p className="mt-4 text-[15px] text-[var(--text-secondary)] md:text-lg">
                At <span className="font-semibold text-[var(--text-primary)]">£50/hour</span> that&apos;s{" "}
                <span className="font-bold text-red-600 dark:text-red-400">£13,000</span> in PM time.
              </p>
              <p className="mt-6 text-[15px] text-[var(--text-secondary)] md:text-lg">
                Handover Pro ≈ <span className="font-semibold text-[var(--accent)]">£300/year</span>
                <span className="mx-2 text-[var(--text-muted)]">→</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Saving ≈ £12,700</span>
              </p>
            </div>
          </ScrollRevealItem>
        </div>
      </section>

      <section className="border-t border-[var(--border)] bg-[var(--sidebar-bg)] px-6 py-16 text-center md:px-8 md:py-24">
        <div className="mx-auto max-w-[720px]">
          <ScrollRevealItem index={0} className="block">
            <h2 className="text-2xl font-bold text-white md:text-4xl">
              Stop paying £13,000 a year in PM time for something that takes 60 seconds.
            </h2>
            <Link href="/onboarding/connect" className="mt-10 inline-block">
              <Button
                size="lg"
                className="rounded-[var(--radius)] bg-[var(--accent)] px-8 text-white hover:bg-[var(--accent-hover)]"
              >
              Run the free PSA scan
              </Button>
            </Link>
            <p className="mt-4 text-sm text-[var(--sidebar-text)]">Run the free PSA scan before you buy.</p>
          </ScrollRevealItem>
        </div>
      </section>
    </MarketingPageLayout>
  );
}
