import type { Metadata } from "next";

import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { BlogIndexClient } from "@/components/blog-index-client";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { getAllPostsSorted, readMinutesFromWordCount } from "@/lib/blog-data";
import { getArticleWordCount } from "@/lib/blog-word-counts";

export const metadata: Metadata = {
  alternates: {
    canonical: "https://gethandover.uk/blog",
  },
};

export default function BlogIndexPage() {
  const posts = getAllPostsSorted().map((p) => ({
    ...p,
    readMins:
      p.readMinutesOverride ?? readMinutesFromWordCount(getArticleWordCount(p.slug)),
  }));

  return (
    <MarketingPageLayout>
      <section className="relative z-[1] overflow-hidden bg-transparent px-6 py-12 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto w-full max-w-[1100px]">
          <div className="mx-auto max-w-[720px] animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h1 className="text-[40px] font-bold text-[var(--text-primary)]">The Handover Blog</h1>
            <p className="mt-3 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Insights for MSP delivery teams
            </p>
          </div>
        </div>
      </section>

      <section className="relative z-[1] bg-transparent px-6 py-12 md:px-8 md:py-20">
        <div className="mx-auto w-full max-w-[1100px]">
          <BlogIndexClient posts={posts} />
        </div>
      </section>
    </MarketingPageLayout>
  );
}
