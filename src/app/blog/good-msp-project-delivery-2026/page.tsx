import type { Metadata } from "next";
import Link from "next/link";

import { BlogAuthorSection } from "@/components/blog-author-section";
import { BlogBackLink } from "@/components/blog-back-link";
import { BlogRelatedArticles } from "@/components/blog-related-articles";
import { ShareArticleActions } from "../share-article-actions";
import { getPostBySlug, getRelatedPosts, readMinutesFromWordCount } from "@/lib/blog-data";
import { getAllArticleWordCounts, getArticleWordCount } from "@/lib/blog-word-counts";

const SLUG = "good-msp-project-delivery-2026";
const post = getPostBySlug(SLUG)!;

export const metadata: Metadata = {
  title: "What Good MSP Project Delivery Looks Like in 2026 | Handover",
  description:
    "The bar for MSP project delivery has risen. Here's what separates MSPs with strong client relationships from those still running projects the old way in 2026.",
  keywords: [
    "MSP project delivery 2026",
    "MSP project management best practices",
    "MSP client communication",
    "MSP delivery dashboard",
    "MSP risk management",
  ],
  alternates: {
    canonical: "https://gethandover.uk/blog/good-msp-project-delivery-2026",
  },
  openGraph: {
    title: "What Good MSP Project Delivery Looks Like in 2026",
    description:
      "The bar for MSP project delivery has risen. Here's what separates MSPs with strong client relationships from those still running projects the old way in 2026.",
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
    title: "What Good MSP Project Delivery Looks Like in 2026",
    description:
      "The bar for MSP project delivery has risen. Here's what separates MSPs with strong client relationships from those still running projects the old way in 2026.",
    images: ["https://gethandover.uk/opengraph-image"],
  },
};

export default function GoodMspProjectDelivery2026Page() {
  const readMins = readMinutesFromWordCount(getArticleWordCount(SLUG));
  const related = getRelatedPosts(SLUG, 2);
  const wordMap = getAllArticleWordCounts();
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "What Good MSP Project Delivery Looks Like in 2026",
    description:
      "The bar for MSP project delivery has risen. Here's what separates MSPs with strong client relationships from those still running projects the old way in 2026.",
    author: { "@type": "Person", name: "Lewis Williams" },
    publisher: { "@type": "Organization", name: "Handover" },
    datePublished: post.dateISO,
    dateModified: post.dateISO,
    mainEntityOfPage: "https://gethandover.uk/blog/good-msp-project-delivery-2026",
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
            What Good MSP Project Delivery Looks Like in 2026
          </h1>
          <p className="text-sm text-[var(--text-muted)]" aria-label={`Estimated reading time: ${readMins} minutes`}>
            {readMins} min read
          </p>

          <article className="mt-0" style={{ borderTop: "1px solid var(--border)", marginTop: "1.5rem", paddingTop: "2rem" }}>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The MSPs winning on MSP project delivery 2026 outcomes share the same operating habits. They communicate proactively,
              track risk explicitly, and run a repeatable reporting cadence that does not depend on one person remembering to do it at
              5pm Friday.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Proactive communication beats reactive updates
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              If updates only happen after client chase emails, the model is reactive. Strong MSP delivery teams set a fixed weekly
              rhythm: same day, same structure, same expectations every week.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Actions and risks are explicit, not implied
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Every client update should include a clear action log and risk view. Even when no risks exist, explicit confirmation is
              better than silence. Good delivery removes ambiguity before it becomes escalation.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Ticket history matches what clients were told
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Technical notes alone are not a complete communication record. Mature teams push client-facing summaries back to ticket
              history so any PM can reconstruct context quickly.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Reporting is systematic, not personality dependent
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              If reporting quality changes by account owner, the process is fragile. Strong teams enforce one standard structure,
              cadence, and quality threshold across all projects.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Delivery health is visible in seconds
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Senior delivery managers should see project RAG posture at a glance. Handover gives Starter and Growth users a live delivery
              dashboard view across active clients and tickets via <Link href="/features">/features</Link>.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              AI should handle admin while humans handle judgement
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Human value in project delivery is decision quality, stakeholder trust, and escalation judgement. Reformatting notes is
              admin. The best operating model combines automation for reporting admin with human oversight for decisions.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              To implement this workflow, start with <Link href="/integrations">/integrations</Link> and compare plan options on{" "}
              <Link href="/pricing">/pricing</Link>.
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
