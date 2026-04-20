import type { Metadata } from "next";
import Link from "next/link";

import { CardMouseSpotlight } from "@/components/card-mouse-spotlight";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { ScrollRevealItem } from "@/components/scroll-reveal-item";

export const metadata: Metadata = {
  title: "Case studies | Handover",
  description: "How MSP delivery teams use Handover to cut reporting time and keep clients updated.",
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
            Real teams, real <span className="text-gradient-brand">time saved</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-[var(--text-secondary)]">
            Stories from MSP delivery teams who replaced manual reporting with Handover.
          </p>
        </div>
      </section>

      <section className="relative z-[1] border-t border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-12 md:px-8 md:py-20">
        <div className="mx-auto grid w-full max-w-[900px] gap-6">
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
