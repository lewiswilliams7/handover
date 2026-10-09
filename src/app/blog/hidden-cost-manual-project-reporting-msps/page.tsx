import type { Metadata } from "next";
import Link from "next/link";

import { BlogAuthorSection } from "@/components/blog-author-section";
import { BlogBackLink } from "@/components/blog-back-link";
import { BlogRelatedArticles } from "@/components/blog-related-articles";
import { ShareArticleActions } from "../share-article-actions";
import { getPostBySlug, getRelatedPosts, readMinutesFromWordCount } from "@/lib/blog-data";
import { getAllArticleWordCounts, getArticleWordCount } from "@/lib/blog-word-counts";

const SLUG = "hidden-cost-manual-project-reporting-msps";
const post = getPostBySlug(SLUG)!;

export const metadata: Metadata = {
  title: "The Hidden Cost of Manual Project Reporting for MSPs | Handover",
  description:
    "Manual project reporting costs MSPs more than they realise. This breakdown covers the direct time cost, indirect costs, and what replacing the process actually looks like.",
  keywords: [
    "MSP project reporting cost",
    "manual project reporting MSP",
    "MSP reporting productivity",
    "MSP PM workflow",
    "HaloPSA reporting",
  ],
  alternates: {
    canonical: "https://gethandover.uk/blog/hidden-cost-manual-project-reporting-msps",
  },
  openGraph: {
    title: "The Hidden Cost of Manual Project Reporting for MSPs",
    description:
      "Manual project reporting costs MSPs more than they realise. This breakdown covers the direct time cost, indirect costs, and what replacing the process actually looks like.",
    type: "article",
    publishedTime: post.dateISO,
    authors: [post.author],
    images: [
      {
        url: "https://gethandover.uk/opengraph-image",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Hidden Cost of Manual Project Reporting for MSPs",
    description:
      "Manual project reporting costs MSPs more than they realise. This breakdown covers the direct time cost, indirect costs, and what replacing the process actually looks like.",
    images: ["https://gethandover.uk/opengraph-image"],
  },
};

export default function HiddenCostManualProjectReportingMspsPage() {
  const readMins = readMinutesFromWordCount(getArticleWordCount(SLUG));
  const related = getRelatedPosts(SLUG, 2);
  const wordMap = getAllArticleWordCounts();
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "The Hidden Cost of Manual Project Reporting for MSPs",
    description:
      "Manual project reporting costs MSPs more than they realise. This breakdown covers the direct time cost, indirect costs, and what replacing the process actually looks like.",
    author: { "@type": "Person", name: "Lewis Williams" },
    publisher: { "@type": "Organization", name: "Handover" },
    datePublished: post.dateISO,
    dateModified: post.dateISO,
    mainEntityOfPage: "https://gethandover.uk/blog/hidden-cost-manual-project-reporting-msps",
    image: ["https://gethandover.uk/opengraph-image"],
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
            The Hidden Cost of Manual Project Reporting for MSPs
          </h1>
          <p className="text-sm text-[var(--text-muted)]" aria-label={`Estimated reading time: ${readMins} minutes`}>
            {readMins} min read
          </p>

          <article className="mt-0" style={{ borderTop: "1px solid var(--border)", marginTop: "1.5rem", paddingTop: "2rem" }}>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Most MSPs know their manual reporting process is inefficient, but few calculate true MSP project reporting cost. For a PM
              managing ten active projects, writing updates, reviewing notes, chasing missing context, and packaging outputs can consume
              45 to 60 minutes per project each week.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              That is 7 to 10 hours per week. At £40 to £50 per hour, the annual cost lands around £14,000 to £26,000 in PM time.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Direct MSP project reporting cost
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The time burden rarely appears as a clean line item. It is spread across the week in ten-minute blocks and absorbed into
              general PM time. But the cost is still real, recurring, and predictable.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Indirect costs MSPs rarely measure
            </h2>
            <ul className="mb-5 list-disc pl-6 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              <li>Inconsistent communication creates avoidable client escalations.</li>
              <li>Ticket history gaps make handovers and continuity harder.</li>
              <li>Engineer context gets diluted during manual translation.</li>
              <li>Risks noted on Tuesday are often not visible to clients until Friday.</li>
            </ul>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Replace formatting work, not the PM
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Replacing manual reporting does not remove project management. It removes repetitive admin: copy-pasting, reformatting,
              and context chasing. PMs then spend time on risk management, stakeholder communication, and delivery outcomes.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Handover automates the reformatting layer by pulling data from PSA tools, generating client-ready outputs, flagging
              actions and risks, and writing updates back into ticket history. Explore integrations on{" "}
              <Link href="/integrations">/integrations</Link>, compare plans on <Link href="/pricing">/pricing</Link>, and see full
              capabilities on <Link href="/features">/features</Link>.
            </p>

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
