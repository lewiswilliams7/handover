import type { Metadata } from "next";
import Link from "next/link";

import { BlogAuthorSection } from "@/components/blog-author-section";
import { BlogBackLink } from "@/components/blog-back-link";
import { BlogRelatedArticles } from "@/components/blog-related-articles";
import { ShareArticleActions } from "../share-article-actions";
import { getPostBySlug, getRelatedPosts, readMinutesFromWordCount } from "@/lib/blog-data";
import { getAllArticleWordCounts, getArticleWordCount } from "@/lib/blog-word-counts";

const SLUG = "halopsa-reporting-native-vs-dedicated-tools";
const post = getPostBySlug(SLUG)!;

export const metadata: Metadata = {
  title: "HaloPSA and ConnectWise Reporting: Native Tools vs Dedicated Reporting Software | Handover",
  description:
    "HaloPSA and ConnectWise have reporting built in - but is it enough for client-facing project delivery? We compare native PSA reporting against dedicated tools and explain when you need both.",
  keywords: [
    "HaloPSA reporting tools",
    "HaloPSA native reports",
    "MSP reporting software",
    "HaloPSA project reporting",
    "client-facing MSP reporting",
  ],
  alternates: {
    canonical: "https://gethandover.uk/blog/halopsa-reporting-native-vs-dedicated-tools",
  },
  openGraph: {
    title: "HaloPSA and ConnectWise Reporting: Native Tools vs Dedicated Reporting Software",
    description:
      "HaloPSA and ConnectWise have reporting built in - but is it enough for client-facing project delivery? We compare native PSA reporting against dedicated tools and explain when you need both.",
    type: "article",
    publishedTime: post.dateISO,
    authors: [post.author],
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Handover - MSP delivery tool" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HaloPSA and ConnectWise Reporting: Native Tools vs Dedicated Reporting Software",
    description:
      "HaloPSA and ConnectWise have reporting built in - but is it enough for client-facing project delivery? We compare native PSA reporting against dedicated tools and explain when you need both.",
    images: ["/og-image.png"],
  },
};

export default function HaloPsaReportingNativeVsDedicatedToolsPage() {
  const readMins = readMinutesFromWordCount(getArticleWordCount(SLUG));
  const related = getRelatedPosts(SLUG, 2);
  const wordMap = getAllArticleWordCounts();
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "HaloPSA Reporting: Native Tools vs Dedicated Reporting Software",
    description:
      "HaloPSA has reporting built in - but is it enough for client-facing project delivery? We compare native HaloPSA reporting against dedicated tools and explain when you need both.",
    author: { "@type": "Person", name: "Lewis Williams" },
    publisher: { "@type": "Organization", name: "Handover" },
    datePublished: post.dateISO,
    dateModified: post.dateISO,
    mainEntityOfPage: "https://gethandover.uk/blog/halopsa-reporting-native-vs-dedicated-tools",
    image: ["https://gethandover.uk/og-image.png"],
  };

  return (
    <div className="animate-in fade-in duration-300" style={{ background: "var(--bg-primary)", minHeight: "100vh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <div className="mx-auto w-full max-w-[1100px] px-6 py-12 md:px-8 md:py-20">
        <div className="mx-auto max-w-[720px] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <BlogBackLink className="mb-8" />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white">
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--text-muted)]">
              <span>{post.dateDisplay}</span>
              <span>{post.author}</span>
            </div>
          </div>
          <h1 className="mt-6 mb-2 text-[28px] font-bold leading-tight text-[var(--text-primary)] sm:text-[40px]">
            HaloPSA Reporting: Native Tools vs Dedicated Reporting Software
          </h1>
          <p className="text-sm text-[var(--text-muted)]" aria-label={`Estimated reading time: ${readMins} minutes`}>
            {readMins} min read
          </p>

          <article className="mt-0" style={{ borderTop: "1px solid var(--border)", marginTop: "1.5rem", paddingTop: "2rem" }}>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              HaloPSA reporting tools start with strong native visibility for operational and financial data: ticket volume, SLA
              performance, time logged, and service metrics. For service desk and leadership reporting, that is genuinely useful.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Where native HaloPSA reporting falls short for PM communication
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              HaloPSA is designed to surface data, not turn delivery detail into stakeholder-ready communication. A report can show
              three open actions. A client update needs context, ownership, impact, and clear next steps in plain language.
            </p>
            <ul className="mb-5 list-disc pl-6 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              <li>No automatic translation from engineer language to client language.</li>
              <li>No structured action/risk extraction into client-ready summaries.</li>
              <li>No native scheduled client delivery plus report-pack workflow.</li>
              <li>No automatic push-back of generated narrative into ticket history.</li>
            </ul>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              When native reporting is enough
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              If your audience is internal and primarily operational, native HaloPSA reporting may be enough. If PMs are spending
              significant time translating ticket data into client updates, that is the exact gap dedicated reporting tools fill.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Best-practice setup: native plus dedicated reporting tools
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The most effective setup is both: HaloPSA native reports for internal ops, dedicated software for client-facing project
              communication. These outputs serve different audiences and need different formatting.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Handover connects directly to HaloPSA, produces client-ready updates with action/risk extraction, and writes outputs back
              to ticket notes. Start with <Link href="/integrations">integrations</Link>, review capabilities on{" "}
              <Link href="/features">features</Link>, and check commercial fit on <Link href="/pricing">pricing</Link>.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              What to look for in HaloPSA reporting tools
            </h2>
            <ul className="mb-5 list-disc pl-6 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              <li>Direct API integration</li>
              <li>Client-ready language generation</li>
              <li>Action and risk extraction</li>
              <li>Push-back to ticket history</li>
              <li>Scheduled delivery and Excel export</li>
            </ul>

            <div className="mt-12 pt-8" style={{ borderTop: "1px solid var(--border)" }}>
              <ShareArticleActions />
            </div>
          </article>

          <BlogRelatedArticles posts={related} wordCountBySlug={wordMap} />
          <BlogAuthorSection />
          <div className="mt-10 border-t border-[var(--border)] pt-8">
            <BlogBackLink />
          </div>
        </div>
      </div>
    </div>
  );
}
