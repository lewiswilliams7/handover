import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { AppFrame, WeekListMock } from "@/components/marketing/product-mocks";
import { CASE_STUDIES, getCaseStudy } from "@/lib/marketing/case-studies";

export const dynamicParams = false;

export function generateStaticParams() {
  return CASE_STUDIES.map((study) => ({ slug: study.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const study = getCaseStudy((await params).slug);
  if (!study) return {};
  return {
    title: `${study.title} | Handover`,
    description: study.description,
    alternates: { canonical: `https://gethandover.uk/case-studies/${study.slug}` },
  };
}

export default async function CaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const study = getCaseStudy((await params).slug);
  if (!study) notFound();
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden px-4 pb-12 pt-28 sm:px-6 md:pt-32 lg:px-8">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto max-w-5xl">
          <Link href="/case-studies" className="text-sm text-white/50 hover:text-white">
            Case studies
          </Link>
          <div className="mt-6 grid items-end gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div>
              <p className="text-sm text-cyan-300">{study.who}</p>
              <h1 className="mt-3 text-[2.3rem] font-semibold leading-[1.06] tracking-[-0.03em] text-white sm:text-5xl">
                {study.title}
              </h1>
            </div>
            <div className="rounded-2xl border border-cyan-300/30 bg-cyan-300/[0.06] p-6">
              <p className="text-6xl font-semibold tracking-tight text-white">{study.headlineStat.value}</p>
              <p className="mt-1 text-sm text-white/65">{study.headlineStat.label}</p>
            </div>
          </div>
          <dl className="mt-8 grid gap-3 sm:grid-cols-3">
            {study.facts.map((fact) => (
              <div key={fact.label} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <dt className="text-xs text-white/50">{fact.label}</dt>
                <dd className="mt-0.5 font-semibold text-white">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <article className="space-y-10">
            {study.sections.map((section) => (
              <div key={section.heading}>
                <h2 className="text-xl font-semibold text-white">{section.heading}</h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="mt-3 text-[16px] leading-8 text-white/70">
                    {paragraph}
                  </p>
                ))}
              </div>
            ))}
            <p className="border-l-2 border-cyan-300 pl-4 text-lg font-medium leading-8 text-white">{study.takeaway}</p>
          </article>
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <AppFrame path="/week" label="What a first scan turns into: the This week list">
              <WeekListMock compact />
            </AppFrame>
            <p className="mt-3 text-xs text-white/40">An example list with invented clients.</p>
          </aside>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.05] p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <p className="text-xl font-semibold text-white">How many warning signs are in your PSA?</p>
            <p className="mt-1 text-sm text-white/60">Free, read-only scan. No card, nothing to cancel.</p>
          </div>
          <Link href="/onboarding/connect" className="cta cta-primary">
            Run your free scan
            <ArrowRight className="cta-arrow size-4" aria-hidden />
          </Link>
        </div>
      </section>
    </div>
  );
}
