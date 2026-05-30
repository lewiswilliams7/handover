import type { Metadata } from "next";
import Link from "next/link";

import { BlogAuthorSection } from "@/components/blog-author-section";
import { BlogBackLink } from "@/components/blog-back-link";
import { BlogRelatedArticles } from "@/components/blog-related-articles";
import { ShareArticleActions } from "../share-article-actions";
import { getPostBySlug, getRelatedPosts, readMinutesFromWordCount } from "@/lib/blog-data";
import { getAllArticleWordCounts, getArticleWordCount } from "@/lib/blog-word-counts";

const SLUG = "handover-vs-rewst-vs-n8n-msp-reporting";

const post = getPostBySlug(SLUG)!;

export const metadata: Metadata = {
  title:
    "Handover vs Rewst vs n8n: Which Tool Actually Solves MSP Reporting? | Handover",
  description: post.description,
  keywords: [
    "handover vs rewst",
    "rewst alternative",
    "n8n msp reporting",
    "msp reporting automation",
    "halopsa reporting tool",
    "connectwise reporting",
    "msp client reports",
  ],
  alternates: {
    canonical: "https://gethandover.uk/blog/handover-vs-rewst-vs-n8n-msp-reporting",
  },
  openGraph: {
    title: "Handover vs Rewst vs n8n: Which Tool Actually Solves MSP Reporting?",
    description: post.description,
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
    title: "Handover vs Rewst vs n8n: Which Tool Actually Solves MSP Reporting?",
    description: post.description,
    images: ["/og-image.png"],
  },
};

export default function HandoverVsRewstVsN8nMspReportingPage() {
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
            Handover vs Rewst vs n8n: Which Tool Actually Solves MSP Reporting?
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
              If you work in an MSP and you&apos;ve looked at automating client reporting,
              you&apos;ve probably come across Rewst and n8n. Both are genuinely powerful tools.
              Both have enthusiastic communities. And both will absolutely let you build a
              reporting workflow — if you have the time, the technical skill, and the patience
              to maintain it.
            </p>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              This post isn&apos;t about which platform is better in general. It&apos;s about a
              specific question: if your goal is to turn PSA data into professional client
              outputs with as little friction as possible, which tool actually gets you there?
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              What Rewst and n8n are built for
            </h2>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Rewst is a workflow automation platform built specifically for MSPs. It connects to
              your PSA, RMM, and other tools, and lets you build automated processes across them.
              It&apos;s genuinely impressive for things like automated onboarding, alert routing,
              and ticket triage.
            </p>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              n8n is a general-purpose workflow automation tool — similar to Zapier or Make but
              self-hostable and developer-friendly. It can connect to almost anything via API and
              is highly flexible for building custom integrations.
            </p>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Neither of them is built for reporting. That&apos;s not a criticism — it&apos;s just
              not what they do. They&apos;re plumbing tools. They move data between systems. If you
              want to use them to generate a professional client status report, you&apos;re building
              that capability from scratch on top of a general automation layer.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              What that actually looks like in practice
            </h2>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              To generate a client-ready status report using Rewst or n8n, you&apos;d typically need
              to:
            </p>

            <ul className="mb-5 list-disc pl-6 text-[16px] leading-[1.8] text-[var(--text-secondary)] [&_li]:mb-2">
              <li>
                Build a workflow that pulls the right tickets and projects from your PSA, filtered
                by client, date range, and status.
              </li>
              <li>
                Write logic to format that data into something meaningful — not just a data dump,
                but a structured update a client would actually understand.
              </li>
              <li>
                Connect an AI model to handle the language generation, prompt it correctly, and
                handle edge cases.
              </li>
              <li>
                Build an output layer that formats the result into a document, email, or PDF.
              </li>
              <li>
                Wire up delivery — email, ticket note, Slack, whatever your workflow requires.
              </li>
              <li>
                Then maintain all of it when your PSA updates its API, when the AI model changes
                behaviour, or when a client&apos;s reporting needs change.
              </li>
            </ul>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              For an experienced Rewst or n8n developer, this is achievable. It&apos;s also a
              meaningful project — not an afternoon&apos;s work. And once it&apos;s built, it needs
              ongoing maintenance. The workflow doesn&apos;t know when something breaks. It just
              silently produces wrong output until someone notices.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              What Handover does instead
            </h2>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Handover is purpose-built for this one job. It connects to HaloPSA and ConnectWise,
              pulls your ticket and project data, and generates professional client outputs in around
              30 seconds. Status reports, action logs, risk logs, client emails, RAID logs — all
              formatted and ready to send or push straight back to the ticket as a note.
            </p>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              There&apos;s no workflow to build. No prompts to write. No maintenance when the API
              changes. You connect your PSA, import your tickets, and generate. That&apos;s it.
            </p>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              It also handles things that a generic automation workflow typically doesn&apos;t —
              like detecting when multiple clients are in the same notes and generating separate
              emails for each, or applying your custom fields as additional context for the AI, or
              scheduling reports to go out automatically on a cadence you define.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              The honest comparison
            </h2>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Rewst and n8n are better than Handover if you need to automate complex multi-system
              processes that happen to include reporting as one step. If you&apos;re building an
              automated onboarding flow that touches your PSA, RMM, identity provider, and billing
              system, Rewst is probably the right tool.
            </p>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Handover is better than Rewst and n8n if your goal is specifically to produce
              professional client-facing outputs from PSA data, without building and maintaining a
              custom workflow to do it. It&apos;s a finished product for a specific problem, not a
              platform for building solutions.
            </p>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Most MSPs don&apos;t need to choose between them — they&apos;re solving different
              problems. The question is whether your reporting problem is better solved by building
              something on a general platform, or by using a tool that already does it.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Pricing
            </h2>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Rewst pricing is based on the number of automations and typically runs into hundreds
              of pounds per month for a mid-size MSP. n8n has a free self-hosted tier but cloud
              hosting and commercial use adds cost and complexity.
            </p>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Handover starts at £29 per month for solo use and £79 per month for teams.
              There&apos;s a 14-day free trial.
            </p>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              If you&apos;re spending engineer time building and maintaining a reporting workflow on
              Rewst or n8n, the economics of switching to a purpose-built tool tend to be
              straightforward.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Try it
            </h2>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Handover is free to trial at{" "}
              <a
                href="https://gethandover.uk"
                className="font-semibold text-[var(--accent)] underline hover:no-underline"
              >
                gethandover.uk
              </a>
              . It connects to HaloPSA and ConnectWise and is listed on the HaloPSA marketplace.
            </p>

            <div
              className="mt-12 pt-8"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <ShareArticleActions />
            </div>

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
                <h3 className="text-[24px] font-bold text-[var(--text-primary)]">
                  Start free trial
                </h3>
                <p className="mt-2 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
                  Connect HaloPSA or ConnectWise and ship your next client report in minutes.
                </p>
                <div className="mt-5">
                  <Link
                    href="/auth?tab=signup&returnTo=/welcome"
                    className="inline-flex items-center rounded-[var(--radius)] bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
                  >
                    Start generating reports →
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
