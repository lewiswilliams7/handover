import type { Metadata } from "next";
import Link from "next/link";

import { BlogAuthorSection } from "@/components/blog-author-section";
import { BlogBackLink } from "@/components/blog-back-link";
import { BlogRelatedArticles } from "@/components/blog-related-articles";
import { ShareArticleActions } from "../share-article-actions";
import { getPostBySlug, getRelatedPosts, readMinutesFromWordCount } from "@/lib/blog-data";
import { getAllArticleWordCounts, getArticleWordCount } from "@/lib/blog-word-counts";

const SLUG = "halopsa-ticket-history-incomplete";

const post = getPostBySlug(SLUG)!;

export const metadata: Metadata = {
  title: "Why Your PSA Ticket History Is Incomplete (HaloPSA + ConnectWise) | Handover",
  description:
    "Most MSPs have a gap in their PSA ticket history (HaloPSA and ConnectWise) - client communications that never get logged back. Here's why it happens and how to fix it permanently.",
  keywords: [
    "HaloPSA ticket history",
    "HaloPSA ticket notes",
    "MSP client reporting",
    "HaloPSA reporting gaps",
    "MSP delivery process",
  ],
  alternates: {
    canonical: "https://gethandover.uk/blog/halopsa-ticket-history-incomplete",
  },
  openGraph: {
    title: "Why Your PSA Ticket History Is Incomplete (And How to Fix It)",
    description:
      "Most MSPs have a gap in their PSA ticket history (HaloPSA and ConnectWise) - client communications that never get logged back. Here's why it happens and how to fix it permanently.",
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
    title: "Why Your PSA Ticket History Is Incomplete (And How to Fix It)",
    description:
      "Most MSPs have a gap in their PSA ticket history (HaloPSA and ConnectWise) - client communications that never get logged back. Here's why it happens and how to fix it permanently.",
    images: ["https://gethandover.uk/opengraph-image"],
  },
};

export default function HaloPsaTicketHistoryIncompletePage() {
  const readMins = readMinutesFromWordCount(getArticleWordCount(SLUG));
  const related = getRelatedPosts(SLUG, 2);
  const wordMap = getAllArticleWordCounts();
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Why Your HaloPSA Ticket History Is Incomplete (And How to Fix It)",
    description:
      "Most MSPs have a gap in their HaloPSA ticket history - client communications that never get logged back. Here's why it happens and how to fix it permanently.",
    author: { "@type": "Person", name: "Lewis Williams" },
    publisher: { "@type": "Organization", name: "Handover" },
    datePublished: post.dateISO,
    dateModified: post.dateISO,
    mainEntityOfPage: "https://gethandover.uk/blog/halopsa-ticket-history-incomplete",
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
            Why Your HaloPSA Ticket History Is Incomplete (And How to Fix It)
          </h1>
          <p className="text-sm text-[var(--text-muted)]" aria-label={`Estimated reading time: ${readMins} minutes`}>
            {readMins} min read
          </p>

          <article className="mt-0" style={{ borderTop: "1px solid var(--border)", marginTop: "1.5rem", paddingTop: "2rem" }}>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              If you rely on <strong>HaloPSA ticket history</strong> to understand client communication, there is a high chance your
              record is incomplete. Engineers update technical notes, PMs send a polished client update, and that final message never
              gets written back to the ticket.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Over time, this creates two versions of the truth: what happened operationally in HaloPSA, and what the client was
              actually told by email or Teams. You can see how this compounds in weekly reporting workflows on our{" "}
              <Link href="/features">features page</Link>.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Why HaloPSA ticket history becomes incomplete
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The process usually breaks at handoff. Delivery teams collect ticket notes in HaloPSA, then reformat those notes into a
              client-ready summary outside the PSA. Once the client message is sent, the team moves on. No one wants to copy that final
              communication back into every ticket or project.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              That means your HaloPSA ticket history lacks the exact wording, commitments, and risk framing your client received. During
              escalations, renewals, or service reviews, that gap causes confusion.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              The hidden cost of missing client updates in HaloPSA
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Incomplete HaloPSA ticket history slows everyone down. New engineers lose context, account managers cannot quickly verify
              what was communicated, and project managers spend extra time reconstructing timelines from inboxes.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              It also increases risk. If a client disputes scope, dates, or ownership, you may not have a clean audit trail inside the
              system of record.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              How to fix HaloPSA ticket history permanently
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The fix is simple: every client-facing update should be pushed back to the matching HaloPSA ticket or project note as part
              of the same workflow. Do not leave this as a manual task.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              A reliable pattern is: pull ticket data, generate the client-ready summary, send the update, then post that exact update
              back into HaloPSA automatically. This keeps your communication history complete by default.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Best-practice workflow for MSP teams using HaloPSA
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Start by standardising your cadence (for example weekly project updates), then connect your tooling through the{" "}
              <Link href="/integrations">HaloPSA integration flow</Link>. Make sure the process captures actions, risks, due dates, and
              owners in a consistent format.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              If you are evaluating rollout across your team, compare access levels on{" "}
              <Link href="/pricing">pricing</Link> and align on one reporting standard before enabling automation.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Final takeaway
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Incomplete <strong>HaloPSA ticket history</strong> is not a data problem, it is a workflow problem. Once your process
              automatically writes client communications back to HaloPSA, your audit trail becomes complete, searchable, and trustworthy.
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
