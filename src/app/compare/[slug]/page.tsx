import type { Metadata } from "next";
import { ArrowRight, Check, Minus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductHero } from "@/components/marketing/product-hero";
import { AppFrame, ReceiptMock, ReplayMock, RiskMock, WeekListMock } from "@/components/marketing/product-mocks";
import { COMPARE_PAGES, getComparePage } from "@/lib/marketing/compare-pages";

export const dynamicParams = false;

export function generateStaticParams() {
  return COMPARE_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const page = getComparePage((await params).slug);
  if (!page) return {};
  const url = `https://gethandover.uk/compare/${page.slug}`;
  return { title: `${page.title} | Handover`, description: page.description, alternates: { canonical: url } };
}

const VISUALS = {
  risk: { Mock: RiskMock, path: "/attention", label: "Revenue at Risk in Handover" },
  week: { Mock: () => <WeekListMock />, path: "/week", label: "The This week list in Handover" },
  receipt: { Mock: ReceiptMock, path: "/receipts", label: "A Value Receipt in Handover" },
  replay: { Mock: ReplayMock, path: "/attention?tab=replay", label: "Churn Replay in Handover" },
} as const;

export default async function ComparePage({ params }: { params: Promise<{ slug: string }> }) {
  const page = getComparePage((await params).slug);
  if (!page) notFound();
  const visual = VISUALS[page.visual];
  const others = COMPARE_PAGES.filter((other) => other.slug !== page.slug);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqs.map((faq) => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } })),
  };

  return (
    <div className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ProductHero
        eyebrow="Compare"
        title={page.title}
        body={page.intro}
        visual={
          <AppFrame path={visual.path} label={visual.label}>
            <visual.Mock />
          </AppFrame>
        }
      />

      <section className="px-4 pb-16 sm:px-6 lg:px-8" aria-labelledby="table-heading">
        <div className="mx-auto max-w-5xl">
          <h2 id="table-heading" className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Side by side
          </h2>
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
            <div className="grid grid-cols-[1fr_1fr] border-b border-white/10 bg-white/[0.03] text-sm font-semibold sm:grid-cols-[0.8fr_1fr_1fr]">
              <span className="hidden px-4 py-3 text-white/50 sm:block" />
              <span className="px-4 py-3 capitalize text-white/70">{page.them}</span>
              <span className="px-4 py-3 text-cyan-200">Handover</span>
            </div>
            <dl>
              {page.rows.map((row) => (
                <div key={row.label} className="grid grid-cols-[1fr_1fr] border-b border-white/[0.06] last:border-0 sm:grid-cols-[0.8fr_1fr_1fr]">
                  <dt className="col-span-2 px-4 pt-3 text-[13px] font-medium text-white/50 sm:col-span-1 sm:py-3.5">{row.label}</dt>
                  <dd className="flex gap-2 px-4 py-3 text-sm leading-6 text-white/60 sm:py-3.5">
                    <Minus className="mt-1 size-3.5 shrink-0 text-white/30" aria-hidden />
                    {row.them}
                  </dd>
                  <dd className="flex gap-2 px-4 py-3 text-sm leading-6 text-white sm:py-3.5">
                    <Check className="mt-1 size-3.5 shrink-0 text-cyan-300" aria-hidden />
                    {row.handover}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="mt-10 grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h2 className="font-semibold text-white">Where {page.them} are the better fit</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-white/60">
                {page.theyWin.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2.5 size-1 shrink-0 rounded-full bg-white/40" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-semibold text-white">Questions</h2>
              <div className="mt-2 divide-y divide-white/10 border-y border-white/10">
                {page.faqs.map((faq) => (
                  <details key={faq.q} className="group py-3.5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-white [&::-webkit-details-marker]:hidden">
                      {faq.q}
                      <span className="text-xl leading-none text-white/40 transition-transform group-open:rotate-45" aria-hidden>
                        +
                      </span>
                    </summary>
                    <p className="mt-2 pr-6 text-sm leading-6 text-white/60">{faq.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-start justify-between gap-6 rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.05] p-6 sm:flex-row sm:items-center sm:p-8">
            <div>
              <p className="text-xl font-semibold text-white">See the difference on your own clients.</p>
              <p className="mt-1 text-sm text-white/60">Free, read-only scan. Results in about a minute.</p>
            </div>
            <Link href="/onboarding/connect" className="cta cta-primary">
              Run your free scan
              <ArrowRight className="cta-arrow size-4" aria-hidden />
            </Link>
          </div>

          {others.length > 0 ? (
            <nav className="mt-12" aria-label="Other comparisons">
              <p className="text-sm font-semibold text-white/70">Other comparisons</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {others.map((other) => (
                  <li key={other.slug}>
                    <Link
                      href={`/compare/${other.slug}`}
                      className="inline-flex rounded-full border border-white/12 px-3 py-1.5 text-[13px] text-white/75 transition-colors hover:border-cyan-300/50 hover:text-white"
                    >
                      {other.title}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/compare" className="inline-flex rounded-full px-3 py-1.5 text-[13px] text-cyan-300 hover:text-cyan-200">
                    All comparisons
                  </Link>
                </li>
              </ul>
            </nav>
          ) : null}
        </div>
      </section>
    </div>
  );
}
