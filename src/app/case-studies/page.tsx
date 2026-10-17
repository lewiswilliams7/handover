import type { Metadata } from "next";
import Link from "next/link";

import { CardMouseSpotlight } from "@/components/card-mouse-spotlight";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { ScrollRevealItem } from "@/components/scroll-reveal-item";
import { CASE_STUDIES } from "@/lib/marketing/case-studies";

export const metadata: Metadata = {
  title: "Case studies | Handover",
  description: "What MSPs found when they pointed Handover at their PSA, and how delivery teams use it.",
  alternates: { canonical: "https://gethandover.uk/case-studies" },
};

export default function CaseStudiesIndexPage() {
  return (
    <MarketingPageLayout>
      <section className="relative z-[1] overflow-hidden bg-[var(--bg-primary)] px-6 py-16 md:px-8 md:py-24">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto w-full max-w-[900px] text-center">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]"
          >
            Case studies
          </p>
          <h1 className="mt-3 text-4xl font-bold text-[var(--text-primary)] md:text-5xl">
            What MSPs found in their own PSA
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-[var(--text-secondary)]">
            Short, factual stories from MSPs who ran Handover on their own data.
          </p>
        </div>
      </section>

      <section className="relative z-[1] border-t border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-12 md:px-8 md:py-20">
        <div className="mx-auto grid w-full max-w-[900px] gap-6">
          {CASE_STUDIES.map((study) => (
            <Link
              key={study.slug}
              href={`/case-studies/${study.slug}`}
              className="group grid items-center gap-6 rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.04] p-8 no-underline transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-300/50 sm:grid-cols-[auto_1fr]"
            >
              <span className="text-5xl font-semibold tracking-tight text-white">
                {study.headlineStat.value}
                <span className="mt-1 block text-xs font-normal tracking-normal text-white/50">{study.headlineStat.label}</span>
              </span>
              <span>
                <span className="block text-xl font-semibold text-white md:text-2xl">{study.title}</span>
                <span className="mt-2 block text-[14px] text-white/60">{study.who}</span>
                <span className="mt-4 inline-block text-[14px] font-medium text-cyan-300">Read the story</span>
              </span>
            </Link>
          ))}
          <ScrollRevealItem index={0} className="block">
            <Link href="/case-studies/msp-weekly-reporting" className="block no-underline">
              <CardMouseSpotlight
                className="integration-card-glass rounded-[var(--radius-lg)] border border-[var(--border)] p-8 transition-all duration-200 hover:border-[color-mix(in_srgb,var(--accent)_35%,var(--border))]"
              >
                <h2 className="text-xl font-semibold text-[var(--text-primary)] md:text-2xl">
                  From 4 hours to 10 minutes. Every week.
                </h2>
                <p className="mt-2 text-[14px] text-[var(--text-secondary)]">
                  UK MSP, 5 engineers, 12 clients
                </p>
                <span className="mt-4 inline-block text-[14px] font-medium text-[var(--accent)]">
                  Read case study →
                </span>
              </CardMouseSpotlight>
            </Link>
          </ScrollRevealItem>
        </div>
      </section>
    </MarketingPageLayout>
  );
}
