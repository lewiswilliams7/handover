import type { Metadata } from "next";
import Link from "next/link";

import { BlogAuthorSection } from "@/components/blog-author-section";
import { BlogBackLink } from "@/components/blog-back-link";
import { BlogRelatedArticles } from "@/components/blog-related-articles";
import { ShareArticleActions } from "../share-article-actions";
import { getPostBySlug, getRelatedPosts, readMinutesFromWordCount } from "@/lib/blog-data";
import { getAllArticleWordCounts, getArticleWordCount } from "@/lib/blog-word-counts";

const SLUG = "handover-live-halopsa-marketplace";

const post = getPostBySlug(SLUG)!;

export const metadata: Metadata = {
  title: "Handover Is Live on HaloPSA Marketplace + ConnectWise | Handover",
  description:
    "Handover is now live on the HaloPSA marketplace with native ConnectWise support, helping MSP delivery teams automate client updates, handover notes, action logs, and scheduled reports from live ticket data.",
  keywords: [
    "HaloPSA marketplace",
    "HaloPSA integration",
    "MSP reporting automation",
    "Handover HaloPSA",
    "MSP delivery reporting",
  ],
  alternates: {
    canonical: "https://gethandover.uk/blog/handover-live-halopsa-marketplace",
  },
  openGraph: {
    title: "Handover Is Live on HaloPSA Marketplace + ConnectWise",
    description:
      "The AI reporting tool built for MSP delivery teams is officially integrated with HaloPSA and ConnectWise.",
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
    title: "Handover Is Live on HaloPSA Marketplace + ConnectWise",
    description:
      "Automate client updates, handover notes, action logs, and scheduled reports from HaloPSA or ConnectWise ticket data.",
    images: ["https://gethandover.uk/opengraph-image"],
  },
};

export default function HandoverLiveHaloPsaMarketplacePage() {
  const readMins = readMinutesFromWordCount(getArticleWordCount(SLUG));
  const related = getRelatedPosts(SLUG, 2);
  const wordMap = getAllArticleWordCounts();
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Handover Is Now Live on the HaloPSA Marketplace",
    description:
      "The AI reporting tool built for MSP delivery teams is officially integrated with HaloPSA.",
    author: { "@type": "Person", name: "Lewis Williams" },
    publisher: { "@type": "Organization", name: "Handover" },
    datePublished: post.dateISO,
    dateModified: post.dateISO,
    mainEntityOfPage: "https://gethandover.uk/blog/handover-live-halopsa-marketplace",
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
            Handover Is Now Live on the HaloPSA Marketplace
          </h1>
          <p className="text-sm text-[var(--text-muted)]" aria-label={`Estimated reading time: ${readMins} minutes`}>
            {readMins} min read
          </p>

          <article className="mt-0" style={{ borderTop: "1px solid var(--border)", marginTop: "1.5rem", paddingTop: "2rem" }}>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The AI reporting tool built for MSP delivery teams is officially integrated with HaloPSA, automating client updates,
              handover notes, action logs, and scheduled reports directly from your live ticket data.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              HaloPSA users can now automate their entire delivery reporting workflow
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              If your MSP runs on HaloPSA, your data is already there: every action, update, and project milestone. But someone still
              has to turn that into a readable client update every single week. Usually, that is your most expensive person.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Handover is now officially listed on the HaloPSA marketplace, so MSP delivery teams can connect their instance and start
              generating client-ready outputs in under 30 seconds. No copy-pasting. No reformatting. No chasing engineers at 4:55pm on a
              Friday.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              What the HaloPSA integration does
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Once connected, Handover pulls live ticket and project data directly from HaloPSA and generates five outputs instantly:
              client handover notes, status reports, action logs, risk logs, and client emails.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Each output can be exported to Excel, sent via email, or pushed back into HaloPSA as a ticket note, so your records stay
              centralised in the PSA your team already uses. You can see the end-to-end flow on the{" "}
              <Link href="/integrations/halopsa">HaloPSA integration page</Link>.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Scheduled reports: set it and forget it
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              One of Handover&apos;s most-used enterprise capabilities is scheduled reporting. Instead of manually creating weekly updates,
              teams can configure automated generation and delivery on a weekly, fortnightly, or monthly cadence.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Clients receive consistent, professional updates while your delivery team spends zero time producing them.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Built by someone working inside an MSP
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Handover was founded by a Technical Project Manager working inside a real MSP, frustrated by the same manual reporting
              problem most delivery teams face. The product is shaped around real MSP PM, service delivery, and operations workflows.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              How to get started
            </h2>
            <ol className="mb-5 list-decimal space-y-1 pl-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              <li>Visit <Link href="/">gethandover.uk</Link> and start your free trial</li>
              <li>Connect your HaloPSA instance using your API credentials</li>
              <li>Pull your first ticket data and generate your first output</li>
            </ol>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              No lengthy onboarding. No professional services engagement. Just connect and go.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Ready to stop writing updates manually?
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Handover is live on the HaloPSA marketplace now. Start your free trial or book a 15-minute demo to see it running on live
              ticket data. Handover integrates with HaloPSA today, with ConnectWise and Autotask coming soon.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Explore full product details on <Link href="/features">features</Link> and compare plans on{" "}
              <Link href="/pricing">pricing</Link>.
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
