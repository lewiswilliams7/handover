import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { getPressRelease, PRESS_BOILERPLATE, PRESS_CONTACT, PRESS_RELEASES } from "@/lib/press-releases";

export function generateStaticParams() {
  return PRESS_RELEASES.map((release) => ({ slug: release.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const release = getPressRelease(slug);
  if (!release) return {};
  const url = `https://gethandover.uk/press/${release.slug}`;
  return {
    title: `${release.title} | Handover`,
    description: release.summary,
    alternates: { canonical: url },
    openGraph: {
      title: release.title,
      description: release.summary,
      type: "article",
      publishedTime: release.dateISO,
      url,
      siteName: "Handover",
      images: [{ url: "https://gethandover.uk/opengraph-image", width: 1200, height: 630 }],
    },
  };
}

export default async function PressReleasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const release = getPressRelease(slug);
  if (!release) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: release.title,
    description: release.summary,
    datePublished: release.dateISO,
    author: { "@type": "Organization", name: "Handover", url: "https://gethandover.uk" },
    publisher: { "@type": "Organization", name: "Handover", url: "https://gethandover.uk" },
    mainEntityOfPage: `https://gethandover.uk/press/${release.slug}`,
  };

  return (
    <MarketingPageLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="mx-auto max-w-[760px] px-6 pt-14 pb-24 md:px-8 md:pt-20">
        <Link href="/press" className="inline-flex items-center gap-1.5 text-sm text-white/55 hover:text-white">
          <ArrowLeft className="size-4" aria-hidden /> All press releases
        </Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-[#38bdf8]">Press release</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-white md:text-[2.6rem]">
          {release.title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-white/65">{release.subtitle}</p>
        <p className="mt-4 text-sm text-white/45">{release.dateDisplay}</p>

        <div className="mt-10 space-y-5 border-t border-white/10 pt-8 text-[16px] leading-[1.8] text-white/75">
          {release.body.map((block, index) => {
            if (block.kind === "h") {
              return (
                <h2 key={index} className="pt-4 text-xl font-semibold text-white">
                  {block.text}
                </h2>
              );
            }
            if (block.kind === "list") {
              return (
                <ul key={index} className="list-disc space-y-2 pl-5 marker:text-[#38bdf8]">
                  {block.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              );
            }
            if (block.kind === "quote") {
              return (
                <figure key={index} className="my-8 border-l-[3px] border-[#38bdf8] pl-5">
                  <blockquote className="text-[17px] leading-[1.75] text-white">&ldquo;{block.text}&rdquo;</blockquote>
                  <figcaption className="mt-3 text-sm text-white/55">{block.by}</figcaption>
                </figure>
              );
            }
            return (
              <p key={index}>
                {index === 0 ? <strong className="font-semibold text-white">{release.dateline}: </strong> : null}
                {block.text}
              </p>
            );
          })}
        </div>

        <section className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/55">About Handover</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-white/70">{PRESS_BOILERPLATE}</p>
          <h2 className="mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-white/55">Media contact</h2>
          <p className="mt-2 text-[15px] text-white/80">
            {PRESS_CONTACT.name}, {PRESS_CONTACT.role},{" "}
            <a href={`mailto:${PRESS_CONTACT.email}?subject=Press%20enquiry`} className="text-[#38bdf8] hover:underline">
              {PRESS_CONTACT.email}
            </a>
          </p>
        </section>

        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold">
          {release.relatedBlog ? (
            <Link href={release.relatedBlog.href} className="inline-flex items-center gap-1 text-[#38bdf8] hover:underline">
              {release.relatedBlog.label} <ArrowRight className="size-4" aria-hidden />
            </Link>
          ) : null}
          <Link href="/onboarding/connect" className="inline-flex items-center gap-1 text-white/70 hover:text-white">
            Run the free scan <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </article>
    </MarketingPageLayout>
  );
}
