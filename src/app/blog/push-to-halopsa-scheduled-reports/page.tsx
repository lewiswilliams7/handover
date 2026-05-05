import type { Metadata } from "next";
import Link from "next/link";

import { BlogAuthorSection } from "@/components/blog-author-section";
import { BlogBackLink } from "@/components/blog-back-link";
import { BlogRelatedArticles } from "@/components/blog-related-articles";
import { ShareArticleActions } from "../share-article-actions";
import { getPostBySlug, getRelatedPosts, readMinutesFromWordCount } from "@/lib/blog-data";
import { getAllArticleWordCounts, getArticleWordCount } from "@/lib/blog-word-counts";

const SLUG = "push-to-halopsa-scheduled-reports";

const post = getPostBySlug(SLUG)!;

export const metadata: Metadata = {
  title: "Your MSP reports now write and file themselves | Handover",
  description:
    "Push to HaloPSA or ConnectWise and scheduled weekly reports close the loop: pull from your PSA, generate, push back - automatically on Pro.",
  keywords: [
    "HaloPSA",
    "MSP reporting",
    "scheduled reports",
    "ticket notes",
    "Handover",
  ],
  alternates: {
    canonical: "https://gethandover.uk/blog/push-to-halopsa-scheduled-reports",
  },
  openGraph: {
    title: "Your MSP reports now write and file themselves",
    description:
      "Push to HaloPSA or ConnectWise and scheduled weekly reports close the loop: pull from your PSA, generate, push back - automatically on Pro.",
    type: "article",
    publishedTime: post.dateISO,
    authors: [post.author],
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Handover - MSP delivery tool",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Your MSP reports now write and file themselves",
    description:
      "Push to HaloPSA or ConnectWise and scheduled weekly reports close the loop: pull from your PSA, generate, push back - automatically on Pro.",
    images: ["/og-image.png"],
  },
};

export default function PushToHaloScheduledReportsPage() {
  const readMins = readMinutesFromWordCount(getArticleWordCount(SLUG));
  const related = getRelatedPosts(SLUG, 2);
  const wordMap = getAllArticleWordCounts();

  return (
    <div
      className="animate-in fade-in duration-300"
      style={{ background: "var(--bg-primary)", minHeight: "100vh" }}
    >
      <div className="mx-auto w-full max-w-[1100px] px-6 py-12 md:px-8 md:py-20">
        <div className="mx-auto max-w-[720px] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <BlogBackLink className="mb-8" />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white"
                >
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
            Your MSP reports now write and file themselves
          </h1>
          <p
            className="text-sm text-[var(--text-muted)]"
            aria-label={`Estimated reading time: ${readMins} minutes`}
          >
            {readMins} min read
          </p>

          <article
            className="mt-0 [&_blockquote]:border-l-[3px] [&_blockquote]:border-l-[var(--accent)] [&_blockquote]:pl-4"
            style={{
              borderTop: "1px solid var(--border)",
              marginTop: "1.5rem",
              paddingTop: "2rem",
            }}
          >
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Most reporting tools stop at the output. You generate the update, copy it, open HaloPSA, find the ticket,
              paste it in, save it. Every time.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              We have just shipped two features that close that loop entirely.
            </p>

            <h2 className="mt-10 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Push to HaloPSA
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              After generating your outputs in Handover, a single click posts the report directly back into the relevant
              HaloPSA ticket or project as a note. Your ticket history stays current. No copy-pasting. No tab-switching.
              No forgetting.
            </p>

            <h2 className="mt-10 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Scheduled weekly reports
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Set your schedule once - choose your clients, your day, your time. Handover pulls your live HaloPSA data,
              generates the outputs, delivers the report to your inbox, and pushes it back into HaloPSA automatically.
              Every week, without you doing anything.
            </p>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Together, these two features complete the full reporting loop: pull from HaloPSA, generate, push back. No
              other tool does this end to end for MSP delivery teams.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Both features are available now on the Pro plan.
            </p>

            <ShareArticleActions />

            <div
              style={{
                borderTop: "1px solid var(--border)",
                marginTop: "2rem",
                paddingTop: "2rem",
              }}
            >
              <div
                style={{
                  backgroundColor: "rgba(56,189,248,0.05)",
                  border: "1px solid rgba(56,189,248,0.2)",
                  borderRadius: "var(--radius-lg)",
                  padding: "2rem",
                }}
              >
                <h3 className="text-[24px] font-bold text-[var(--text-primary)]">Automate push-back & scheduling</h3>
                <p className="mt-2 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
                  Pro unlocks unlimited HaloPSA push-back, scheduled report runs, and full Excel packs.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href="/pricing"
                    className="inline-flex items-center rounded-[var(--radius)] bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
                  >
                    Compare plans & pricing
                  </Link>
                  <Link
                    href="/auth?tab=signup&returnTo=/welcome"
                    className="inline-flex items-center rounded-[var(--radius)] border border-[var(--border)] px-6 py-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                  >
                    Start free trial
                  </Link>
                </div>
              </div>
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
