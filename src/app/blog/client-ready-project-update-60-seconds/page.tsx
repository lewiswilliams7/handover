import type { Metadata } from "next";
import Link from "next/link";

import { BlogAuthorSection } from "@/components/blog-author-section";
import { BlogBackLink } from "@/components/blog-back-link";
import { BlogRelatedArticles } from "@/components/blog-related-articles";
import { ShareArticleActions } from "../share-article-actions";
import { getPostBySlug, getRelatedPosts, readMinutesFromWordCount } from "@/lib/blog-data";
import { getAllArticleWordCounts, getArticleWordCount } from "@/lib/blog-word-counts";

const SLUG = "client-ready-project-update-60-seconds";
const post = getPostBySlug(SLUG)!;

export const metadata: Metadata = {
  title: "How to Write a Client-Ready Project Update in Under 60 Seconds | Handover",
  description:
    "Most MSP PMs spend 20-30 minutes writing a single client update. Here's how to cut that to under 60 seconds without sacrificing quality.",
  keywords: [
    "client project update MSP",
    "MSP client update template",
    "HaloPSA project updates",
    "MSP reporting workflow",
    "client-ready status update",
  ],
  alternates: {
    canonical: "https://gethandover.uk/blog/client-ready-project-update-60-seconds",
  },
  openGraph: {
    title: "How to Write a Client-Ready Project Update in Under 60 Seconds",
    description:
      "Most MSP PMs spend 20-30 minutes writing a single client update. Here's how to cut that to under 60 seconds without sacrificing quality.",
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
    title: "How to Write a Client-Ready Project Update in Under 60 Seconds",
    description:
      "Most MSP PMs spend 20-30 minutes writing a single client update. Here's how to cut that to under 60 seconds without sacrificing quality.",
    images: ["https://gethandover.uk/opengraph-image"],
  },
};

export default function ClientReadyProjectUpdate60SecondsPage() {
  const readMins = readMinutesFromWordCount(getArticleWordCount(SLUG));
  const related = getRelatedPosts(SLUG, 2);
  const wordMap = getAllArticleWordCounts();
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "How to Write a Client-Ready Project Update in Under 60 Seconds",
    description:
      "Most MSP PMs spend 20-30 minutes writing a single client update. Here's how to cut that to under 60 seconds without sacrificing quality.",
    author: { "@type": "Person", name: "Lewis Williams" },
    publisher: { "@type": "Organization", name: "Handover" },
    datePublished: post.dateISO,
    dateModified: post.dateISO,
    mainEntityOfPage: "https://gethandover.uk/blog/client-ready-project-update-60-seconds",
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
            How to Write a Client-Ready Project Update in Under 60 Seconds
          </h1>
          <p className="text-sm text-[var(--text-muted)]" aria-label={`Estimated reading time: ${readMins} minutes`}>
            {readMins} min read
          </p>

          <article className="mt-0" style={{ borderTop: "1px solid var(--border)", marginTop: "1.5rem", paddingTop: "2rem" }}>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Most of the time in reporting is not spent thinking. It is spent translating engineer notes into client language. A
              repeatable client project update MSP workflow removes that translation step and gets a high-quality update out in under 60
              seconds.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Structure of a good client project update for MSP teams
            </h2>
            <ul className="mb-5 list-disc pl-6 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              <li>Summary: one paragraph, plain English, no unnecessary technical detail.</li>
              <li>Action log: outstanding actions with owner and priority.</li>
              <li>Risk log: open risks with impact and mitigation or explicit no-risk confirmation.</li>
              <li>Next steps: specific, owned, and dated.</li>
            </ul>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Step 1: Pull data, do not rewrite it
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Open relevant tickets, read latest notes, and identify what changed, what is outstanding, and what is at risk. Capture
              bullet points first, then generate the final narrative.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Step 2: Translate once, not repeatedly
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              If you are manual, use a phrase bank. If you are automated, use a workflow that turns ticket content into draft outputs
              automatically. Either way, stop starting from a blank page.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Step 3: Review for accuracy, not style rewrites
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              PM review should take 30 to 60 seconds when the generation step is right. If you are rewriting paragraphs, improve the
              source process instead of accepting repetitive rework.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Step 4: Push the update back to the ticket
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Keep the communication record inside your PSA. Handover automates this push-back flow while also handling generation and
              export. To get started with handover, begin in <Link href="/integrations">/integrations</Link>, compare options on{" "}
              <Link href="/pricing">/pricing</Link>, and review capabilities on <Link href="/features">/features</Link>.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              What 60 seconds looks like in practice
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Select client and tickets (10 seconds), generate (15-20 seconds), review (20-30 seconds), push and send (5-10 seconds).
              At ten projects, the whole weekly reporting cycle drops below ten minutes.
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
