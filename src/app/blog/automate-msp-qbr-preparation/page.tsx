import type { Metadata } from "next";
import Link from "next/link";

import { BlogAuthorSection } from "@/components/blog-author-section";
import { BlogBackLink } from "@/components/blog-back-link";
import { BlogRelatedArticles } from "@/components/blog-related-articles";
import { ShareArticleActions } from "../share-article-actions";
import { getPostBySlug, getRelatedPosts, readMinutesFromWordCount } from "@/lib/blog-data";
import { getAllArticleWordCounts, getArticleWordCount } from "@/lib/blog-word-counts";

const SLUG = "automate-msp-qbr-preparation";

const post = getPostBySlug(SLUG)!;

export const metadata: Metadata = {
  title: "How MSPs Can Automate QBR Preparation | Handover",
  description:
    "QBR preparation takes MSP account managers 3-5 hours per client. Here's how to automate the data gathering, structuring, and first-draft writing — without losing the quality clients expect.",
  keywords: [
    "QBR",
    "MSP reporting",
    "automation",
    "account management",
    "HaloPSA",
    "ConnectWise",
  ],
  alternates: {
    canonical: "https://gethandover.uk/blog/automate-msp-qbr-preparation",
  },
  openGraph: {
    title: "How MSPs Can Automate QBR Preparation (Without Losing Quality)",
    description:
      "QBR preparation takes MSP account managers 3-5 hours per client. Here's how to automate the data gathering, structuring, and first-draft writing — without losing the quality clients expect.",
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
    title: "How MSPs Can Automate QBR Preparation (Without Losing Quality)",
    description:
      "QBR preparation takes MSP account managers 3-5 hours per client. Here's how to automate the data gathering, structuring, and first-draft writing — without losing the quality clients expect.",
    images: ["/og-image.png"],
  },
};

export default function AutomateMspQbrPreparationPage() {
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
            How MSPs Can Automate QBR Preparation (Without Losing Quality)
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
              The quarterly business review is one of the most valuable things an MSP does for
              client retention. It&apos;s also one of the most expensive to produce.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Most account managers and service delivery managers spend between three and five
              hours preparing each QBR — pulling data from the PSA, building slides, writing the
              executive summary, finding the right ticket references, and making it all look
              professional enough to present to a director.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Multiply that by ten clients and you&apos;re looking at 40-50 hours of senior staff
              time per quarter just on QBR preparation. Time that isn&apos;t being spent on the
              relationship, the upsell conversation, or the actual review meeting.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The good news is that most of that time is automatable. Here&apos;s how.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              What actually takes the time in a QBR
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Before automating anything, it&apos;s worth being clear about where the time goes. A
              typical QBR preparation process looks like this:
            </p>
            <p className="mb-3 text-[16px] font-semibold leading-[1.8] text-[var(--text-primary)]">
              Data gathering (1-2 hours)
            </p>
            <ul className="mb-5 list-disc pl-6 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              <li>Pulling closed tickets for the period from the PSA</li>
              <li>Identifying open projects and their current status</li>
              <li>Finding SLA performance data</li>
              <li>Locating the right ticket references to cite as evidence</li>
            </ul>
            <p className="mb-3 text-[16px] font-semibold leading-[1.8] text-[var(--text-primary)]">
              Structuring and writing (1-2 hours)
            </p>
            <ul className="mb-5 list-disc pl-6 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              <li>
                Organising data into a narrative — what happened, what&apos;s outstanding,
                what&apos;s coming
              </li>
              <li>Writing the executive summary in plain English</li>
              <li>Identifying key risks and recommendations</li>
              <li>Formatting everything for a client audience</li>
            </ul>
            <p className="mb-3 text-[16px] font-semibold leading-[1.8] text-[var(--text-primary)]">
              Design and delivery prep (30-60 minutes)
            </p>
            <ul className="mb-5 list-disc pl-6 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              <li>Building or updating the slide deck</li>
              <li>Adding client branding where required</li>
              <li>Preparing the talking points</li>
              <li>Sending or uploading ahead of the meeting</li>
            </ul>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The first two stages — data gathering and writing — are where automation has the
              highest impact. The last stage is harder to automate entirely, but can be
              significantly accelerated.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              The data problem: PSAs don&apos;t produce client-ready reports
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The core challenge is that PSA data isn&apos;t structured for client communication.
              It&apos;s structured for operational management.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              A HaloPSA or ConnectWise ticket contains everything you need to write a client
              update — the work done, the time spent, the outcome, the engineer responsible. But it
              presents that information in a format designed for service desk workflows, not for a
              quarterly business review slide deck.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Bridging that gap manually is what takes the time. You&apos;re essentially
              translating from operational language to client language, across potentially hundreds
              of tickets.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              What can be automated — and what can&apos;t
            </h2>
            <p className="mb-3 text-[16px] font-semibold leading-[1.8] text-[var(--text-primary)]">
              Can be automated:
            </p>
            <ul className="mb-5 list-disc pl-6 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              <li>Pulling all relevant tickets and projects for the period from your PSA</li>
              <li>Identifying which work is complete, in progress, or blocked</li>
              <li>Calculating SLA performance, time logged, and ticket volumes</li>
              <li>
                Drafting the narrative — what happened, what the risks are, what you recommend
              </li>
              <li>Producing a structured slide deck in your brand colours</li>
              <li>Writing the client email that goes alongside the deck</li>
            </ul>
            <p className="mb-3 text-[16px] font-semibold leading-[1.8] text-[var(--text-primary)]">
              Shouldn&apos;t be automated (but can be accelerated):
            </p>
            <ul className="mb-5 list-disc pl-6 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              <li>
                The relationship context — knowing what the client cares about, what they&apos;ve
                complained about, what&apos;s politically sensitive
              </li>
              <li>
                The upsell conversation — identifying the right moment to raise a project or
                upgrade
              </li>
              <li>
                The meeting itself — the QBR&apos;s value is in the conversation, not the
                document
              </li>
            </ul>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The distinction matters. Automation should handle the data work so that the account
              manager can focus entirely on the relationship work. It shouldn&apos;t try to replace
              the judgement that comes from knowing the client.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              How modern MSPs are automating QBR preparation
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The most effective approach we&apos;ve seen MSPs take combines three elements:
            </p>
            <p className="mb-3 text-[16px] font-semibold leading-[1.8] text-[var(--text-primary)]">
              1. PSA integration for data
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Rather than manually pulling tickets, connect your reporting tool directly to your
              PSA. A native HaloPSA or ConnectWise integration means the data is always current and
              complete — you&apos;re not working from an export that&apos;s three days old or missing
              the tickets that were closed this morning.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              This alone removes 60-90 minutes from the process.
            </p>
            <p className="mb-3 text-[16px] font-semibold leading-[1.8] text-[var(--text-primary)]">
              2. AI for first-draft writing
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The executive summary, the risk register, the recommendations — these follow
              predictable structures that AI handles well when given good PSA data as input.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The key word is &quot;first draft.&quot; AI-generated QBR content isn&apos;t ready to
              send without review. But it&apos;s significantly faster to review and refine a
              well-structured draft than to write from a blank page. Account managers who&apos;ve
              adopted this approach typically describe it as cutting the writing phase from 90
              minutes to 20.
            </p>
            <p className="mb-3 text-[16px] font-semibold leading-[1.8] text-[var(--text-primary)]">
              3. Automated slide generation
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              A QBR slide deck follows a template. The data changes every quarter; the structure
              doesn&apos;t. Tools that can generate a populated, branded PowerPoint from PSA data
              and AI-written content eliminate the design phase almost entirely.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The output needs to be editable — you&apos;ll want to adjust the narrative, add a
              client-specific comment, or swap out a chart. But starting from a generated deck rather
              than an empty template saves significant time.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              What a good automated QBR looks like
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              A QBR produced with this approach should include:
            </p>
            <ul className="mb-5 list-disc pl-6 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              <li>
                <strong className="text-[var(--text-primary)]">Executive summary</strong> — 2-3
                paragraphs covering the period&apos;s key themes, written in plain English,
                referencing specific work where it matters
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Key completions</strong> — what was
                resolved, with named projects and ticket references
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Open items</strong> — what&apos;s
                still in progress, with expected completion dates
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Risks and recommendations</strong> —
                surfaced from the ticket data, with specific actions and owners
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">SLA performance</strong> —
                presented cleanly, with context when performance was affected by client-side factors
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Next quarter priorities</strong> —
                the 3-5 things that matter most in the coming period
              </li>
            </ul>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Done well, a client reading this document should feel that someone who knows their
              account deeply has written it — not that it&apos;s been generated from a database.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              That&apos;s the standard to hold automated QBR output to. If it reads generic, it
              needs more specific data or better prompting. If it reads accurate and specific,
              it&apos;s ready for review.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              The time saving in practice
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              MSPs using automated QBR preparation consistently report bringing the process from 3-5
              hours per client to 20-40 minutes. The remaining time is genuine account manager work
              — reviewing the draft, adding relationship context, preparing for the conversation.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              At ten clients per quarter, that&apos;s 25-40 hours returned per account manager.
              Hours that can go into more client meetings, more proactive outreach, or simply better
              preparation for the QBRs you&apos;re already running.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The quality of the review itself typically improves too. When the account manager
              isn&apos;t exhausted from three hours of data wrangling, they show up to the meeting
              with more energy for the conversation.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Getting started
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              If you&apos;re on HaloPSA or ConnectWise Manage, you can connect Handover and generate
              a QBR pack from your live PSA data in under two minutes. The output includes a
              PowerPoint deck, an Excel data pack, and a client email — all populated from your
              actual ticket and project history.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The first one you generate will take longer than subsequent ones, because you&apos;ll
              want to review it carefully and calibrate the output to your style. By the third or
              fourth, the process is largely automated and the review is quick.
            </p>

            <p className="mb-5 text-[16px] italic leading-[1.8] text-[var(--text-secondary)]">
              Handover generates QBR packs from HaloPSA and ConnectWise data in under a minute.{" "}
              <Link href="/auth?tab=signup" className="text-[var(--accent)] hover:underline">
                Start your free trial
              </Link>{" "}
              — no configuration required.
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
                  Connect HaloPSA or ConnectWise and generate your first QBR pack in minutes — 14-day
                  free trial, cancel anytime.
                </p>
                <div className="mt-5">
                  <Link
                    href="/auth?tab=signup&returnTo=/welcome"
                    className="inline-flex items-center rounded-[var(--radius)] bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
                  >
                    Start generating QBR packs →
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
