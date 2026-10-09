import type { Metadata } from "next";
import Link from "next/link";

import { BlogAuthorSection } from "@/components/blog-author-section";
import { BlogBackLink } from "@/components/blog-back-link";
import { BlogRelatedArticles } from "@/components/blog-related-articles";
import { ShareArticleActions } from "../share-article-actions";
import { getPostBySlug, getRelatedPosts, readMinutesFromWordCount } from "@/lib/blog-data";
import { getAllArticleWordCounts, getArticleWordCount } from "@/lib/blog-word-counts";

const SLUG = "why-msp-engineers-dread-friday-reporting";
const post = getPostBySlug(SLUG)!;

export const metadata: Metadata = {
  title: "Why MSP Engineers Dread the Friday Report | Handover",
  description:
    "Why MSP reporting becomes a weekly drain, what it really costs, and what a better client-ready reporting workflow looks like.",
  keywords: [
    "MSP reporting",
    "Friday reporting",
    "MSP engineer productivity",
    "HaloPSA reporting",
    "ConnectWise reporting",
    "client-ready status reports",
  ],
  alternates: {
    canonical: "https://gethandover.uk/blog/why-msp-engineers-dread-friday-reporting",
  },
  openGraph: {
    title: "Why MSP Engineers Dread the Friday Report",
    description:
      "Why MSP reporting becomes a weekly drain, what it really costs, and what a better client-ready reporting workflow looks like.",
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
    title: "Why MSP Engineers Dread the Friday Report",
    description:
      "Why MSP reporting becomes a weekly drain, what it really costs, and what a better client-ready reporting workflow looks like.",
    images: ["https://gethandover.uk/opengraph-image"],
  },
};

export default function WhyMspEngineersDreadFridayReportingPage() {
  const readMins = readMinutesFromWordCount(getArticleWordCount(SLUG));
  const related = getRelatedPosts(SLUG, 2);
  const wordMap = getAllArticleWordCounts();

  return (
    <div className="animate-in fade-in duration-300" style={{ background: "var(--bg-primary)", minHeight: "100vh" }}>
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
            Why MSP Engineers Dread the Friday Report
          </h1>
          <p className="text-sm text-[var(--text-muted)]" aria-label={`Estimated reading time: ${readMins} minutes`}>
            {readMins} min read
          </p>

          <article
            className="mt-0"
            style={{
              borderTop: "1px solid var(--border)",
              marginTop: "1.5rem",
              paddingTop: "2rem",
            }}
          >
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Ask any MSP engineer what they least look forward to on a Friday and
              you&apos;ll hear the same answer surprisingly often. Not the last-minute
              ticket that comes in at 4pm. Not the client who calls right before close.
              It&apos;s the reporting.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Specifically, it&apos;s the part of the week where technically skilled people
              - people hired to solve problems, manage infrastructure, and keep things
              running - sit down and manually write summaries of work they&apos;ve already done.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              It shouldn&apos;t take long. It always takes longer than it should.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              The gap nobody talks about
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              PSA tools like HaloPSA and ConnectWise are built to track work. They do
              that well. Tickets get logged, time gets recorded, projects get updated.
              The data is all there.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The problem is that the data isn&apos;t in a format anyone would actually send
              to a client.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              A ticket history is not a status update. A list of closed tickets is not a
              client-ready action log. The raw output of a PSA tells the story of what your
              team did internally. It doesn&apos;t tell the story a client needs to hear.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Bridging that gap is the job that falls to engineers, account managers, and
              project leads every single week. And it&apos;s almost entirely manual.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              What it actually costs
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The time cost is obvious. An engineer spending an hour on reporting every
              Friday is spending 50 hours a year on formatting. Across a team of five,
              that&apos;s 250 hours - roughly six full working weeks - spent turning data that
              already exists into documents that should be generated automatically.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The less obvious cost is quality. When reporting is a manual chore, it gets
              done to a minimum standard. Updates become vague. Clients get less visibility
              into the work being done on their behalf. Account reviews become harder to
              prepare for. The relationship suffers in ways that are difficult to trace back
              to a Friday afternoon copy-paste job, but that&apos;s often where it starts.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Why it hasn&apos;t been solved
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The honest answer is that most MSPs have adapted around the problem rather
              than through it. Some have built templates. Some have designated the task to
              a specific person. Some have accepted that client communication is just going
              to be a bit inconsistent.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The tools haven&apos;t helped much either. Native reporting in PSA platforms tends
              to produce data exports, not client-ready documents. BI tools like PowerBI can
              surface the data in better ways, but they require significant setup, ongoing
              maintenance, and someone who knows how to use them. For most MSPs, that&apos;s not
              a realistic investment.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              What good looks like
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The goal isn&apos;t a perfect report. The goal is a professional, accurate update
              that a client can read in two minutes and walk away from feeling informed.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              That means plain language, not ticket IDs. It means a clear summary of what
              happened, what&apos;s outstanding, and what&apos;s coming next. It means something that
              reflects well on the MSP that sent it, not something that looks like it was
              produced in a hurry on a Friday afternoon - even when it was.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The data to produce that already exists in your PSA. The gap is the
              transformation layer between raw ticket data and a document a client would
              actually value.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Closing it
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              This is the problem Handover was built to solve. It connects to HaloPSA and
              ConnectWise, pulls your existing ticket and project data, and generates
              professional client outputs - status reports, action logs, risk logs, client
              emails - in around 30 seconds. The output goes straight back to the ticket as
              a note. Nothing leaves your workflow, and nothing has to be written from scratch.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Friday reporting doesn&apos;t have to be the thing your team dreads. It can just
              be the thing that gets done.
            </p>

            <div className="mt-12 pt-8" style={{ borderTop: "1px solid var(--border)" }}>
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
                <h3 className="text-[24px] font-bold text-[var(--text-primary)]">See it in action</h3>
                <p className="mt-2 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
                  Connect your PSA and generate your first client-ready report in under a minute.
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

