import type { Metadata } from "next";
import Link from "next/link";

import { BlogAuthorSection } from "@/components/blog-author-section";
import { BlogBackLink } from "@/components/blog-back-link";
import { BlogRelatedArticles } from "@/components/blog-related-articles";
import { ShareArticleActions } from "../share-article-actions";
import { getPostBySlug, getRelatedPosts, readMinutesFromWordCount } from "@/lib/blog-data";
import { getAllArticleWordCounts, getArticleWordCount } from "@/lib/blog-word-counts";

const SLUG = "automate-client-project-updates-halopsa";

const post = getPostBySlug(SLUG)!;

export const metadata: Metadata = {
  title: "How MSPs Can Automate Client Project Updates with HaloPSA or ConnectWise | Handover",
  description:
    "Learn how MSPs using HaloPSA or ConnectWise can automate client project updates, eliminate manual reformatting, and deliver consistent weekly reports without PM admin overhead.",
  keywords: [
    "automate client project updates HaloPSA",
    "HaloPSA automation",
    "MSP project updates",
    "HaloPSA client reporting",
    "MSP weekly reports",
  ],
  alternates: {
    canonical: "https://gethandover.uk/blog/automate-client-project-updates-halopsa",
  },
  openGraph: {
    title: "How MSPs Can Automate Client Project Updates with HaloPSA or ConnectWise",
    description:
      "Learn how MSPs using HaloPSA or ConnectWise can automate client project updates, eliminate manual reformatting, and deliver consistent weekly reports without PM admin overhead.",
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
    title: "How MSPs Can Automate Client Project Updates with HaloPSA or ConnectWise",
    description:
      "Learn how MSPs using HaloPSA or ConnectWise can automate client project updates, eliminate manual reformatting, and deliver consistent weekly reports without PM admin overhead.",
    images: ["https://gethandover.uk/opengraph-image"],
  },
};

export default function AutomateClientProjectUpdatesHaloPsaPage() {
  const readMins = readMinutesFromWordCount(getArticleWordCount(SLUG));
  const related = getRelatedPosts(SLUG, 2);
  const wordMap = getAllArticleWordCounts();
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "How MSPs Can Automate Client Project Updates with HaloPSA",
    description:
      "Learn how MSPs using HaloPSA can automate client project updates, eliminate manual reformatting, and deliver consistent weekly reports without PM admin overhead.",
    author: { "@type": "Person", name: "Lewis Williams" },
    publisher: { "@type": "Organization", name: "Handover" },
    datePublished: post.dateISO,
    dateModified: post.dateISO,
    mainEntityOfPage: "https://gethandover.uk/blog/automate-client-project-updates-halopsa",
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
            How MSPs Can Automate Client Project Updates with HaloPSA
          </h1>
          <p className="text-sm text-[var(--text-muted)]" aria-label={`Estimated reading time: ${readMins} minutes`}>
            {readMins} min read
          </p>

          <article className="mt-0" style={{ borderTop: "1px solid var(--border)", marginTop: "1.5rem", paddingTop: "2rem" }}>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              If you run delivery at an MSP using HaloPSA, you can automate client project updates HaloPSA workflows with data you
              already capture. Ticket statuses, time logged, engineer notes, and project progress are all there. The challenge is
              turning that raw data into a client-ready update without losing hours every week.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Most teams still copy-paste notes into an email, reformat manually, and spend 20 to 30 minutes per project each week
              on reporting admin. If you are looking to get handover in place quickly, start on our{" "}
              <Link href="/integrations">integrations page</Link>.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Why manual client updates do not scale
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The common workflow is simple: engineer updates the ticket, PM reads the notes, PM writes the client email. It works for
              three clients. It breaks at thirty. Engineers write for engineers, PMs spend Friday afternoons reformatting, clients get
              inconsistent updates, and the communication often never gets written back to HaloPSA.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              What automated client project updates with HaloPSA look like
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Engineers keep updating tickets as normal. An automation layer reads those notes, identifies open actions and risks,
              generates a client-ready summary in clear language, pushes that summary back to HaloPSA as a note, and sends the update
              on a fixed schedule.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              PMs stay in control of quality and tone, but they stop doing repetitive formatting. That is where most reporting time
              disappears.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">Setting up with HaloPSA</h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Pull the right fields first: ticket notes in chronological order, status, time logged, target date, and assigned
              engineer. With those fields you can generate a plain-English summary, a structured action log, a risk log, and a
              client-ready email.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Handover supports this natively. Connect HaloPSA once, configure your cadence, and weekly report packs land
              automatically. Compare plan options on <Link href="/pricing">pricing</Link> and explore the workflow on{" "}
              <Link href="/features">features</Link>.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Push every update back to HaloPSA
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Every generated update should be posted to the relevant ticket or project note. This closes the reporting loop so ticket
              history reflects exactly what the client saw.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Before and after for a mid-sized MSP
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Before automation: 3 to 4 hours every Friday and inconsistent output. After automation: reports generated Monday 7am, PM
              review and forward by 9am, roughly 15 to 20 minutes total. At £50 per hour, that is about £7,500 per year redirected into
              delivery work instead of admin.
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
