import type { Metadata } from "next";
import Link from "next/link";

import { BlogAuthorSection } from "@/components/blog-author-section";
import { BlogBackLink } from "@/components/blog-back-link";
import { BlogRelatedArticles } from "@/components/blog-related-articles";
import { ShareArticleActions } from "../share-article-actions";
import { getPostBySlug, getRelatedPosts, readMinutesFromWordCount } from "@/lib/blog-data";
import { getAllArticleWordCounts, getArticleWordCount } from "@/lib/blog-word-counts";

const SLUG = "msp-weekly-reporting";

const post = getPostBySlug(SLUG)!;

export const metadata: Metadata = {
  title:
    "How MSPs Can Cut Weekly Reporting Time from 5 Hours to 20 Minutes | Handover",
  description:
    "Most MSP project managers spend 4-5 hours every week writing the same reports. Here is how to cut that to under 20 minutes without sacrificing quality.",
  keywords: [
    "MSP reporting",
    "MSP weekly report",
    "MSP client update",
    "HaloPSA reporting",
    "IT project manager tools",
    "MSP status report",
  ],
  alternates: {
    canonical: "https://gethandover.uk/blog/msp-weekly-reporting",
  },
  openGraph: {
    title: "How MSPs Can Cut Weekly Reporting Time from 5 Hours to 20 Minutes",
    description:
      "Most MSP project managers spend 4-5 hours every week writing the same reports. Here is how to cut that to under 20 minutes without sacrificing quality.",
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
    title: "How MSPs Can Cut Weekly Reporting Time from 5 Hours to 20 Minutes",
    description:
      "Most MSP project managers spend 4-5 hours every week writing the same reports. Here is how to cut that to under 20 minutes without sacrificing quality.",
    images: ["https://gethandover.uk/opengraph-image"],
  },
};

export default function MspWeeklyReportingPage() {
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
            How MSPs Can Cut Weekly Reporting Time from 5 Hours to 20 Minutes
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
              If you manage projects at an MSP, Friday afternoon probably looks
              the same every week. A list of client updates to write, a risk log
              that needs updating, action items to chase, and a status report due
              by end of play. Most service delivery managers spend between 3 and 5
              hours on this every single week. That is roughly 200 hours a year -
              five full working weeks - spent reformatting the same information into
              different documents.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              The real cost of manual reporting
            </h2>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The problem is not just the time. It is the context switching.
              Moving from delivery work into writing mode, finding last week&apos;s
              notes, remembering what happened with each client - all of this carries
              a cognitive cost that the clock does not capture.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              For a team of three PMs each spending 90 minutes on reporting twice a
              week, that is 9 hours of billable time absorbed by administration. At
              £75 per hour that is £675 per week leaving value on the table.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The other cost is inconsistency. When reporting is manual, the quality
              varies with how much time you have. A rushed Friday client email is
              not the same as a carefully written one. Clients notice even if they
              do not say anything.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              What a good weekly client update actually contains
            </h2>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Most MSP client updates contain the same five elements regardless of
              what happened that week. Getting clear on the structure makes them
              faster to write and easier for clients to read.
            </p>

            <ol className="grid gap-4">
              <li className="rounded-[var(--radius)] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-5">
                <span className="font-bold text-[var(--text-primary)]">
                  1. Current status
                </span>
                <span className="text-[var(--text-secondary)]">
                  {" "}
                  - One sentence on where the project stands. On track, at risk, or
                  blocked. Clients want this first, not buried in paragraph three.
                </span>
              </li>
              <li className="rounded-[var(--radius)] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-5">
                <span className="font-bold text-[var(--text-primary)]">
                  2. Progress this week
                </span>
                <span className="text-[var(--text-secondary)]">
                  {" "}
                  - What actually happened. Specific, not vague. &quot;Phase 1
                  migration complete&quot; is useful. &quot;Good progress made&quot; is not.
                </span>
              </li>
              <li className="rounded-[var(--radius)] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-5">
                <span className="font-bold text-[var(--text-primary)]">
                  3. Actions and owners
                </span>
                <span className="text-[var(--text-secondary)]">
                  {" "}
                  - Who is doing what and by when. This is the part clients refer
                  back to. If it is not specific it is not useful.
                </span>
              </li>
              <li className="rounded-[var(--radius)] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-5">
                <span className="font-bold text-[var(--text-primary)]">
                  4. Risks and blockers
                </span>
                <span className="text-[var(--text-secondary)]">
                  {" "}
                  - Anything that could delay the project or needs client input.
                  Surfacing risks early builds trust. Hiding them and hoping they
                  resolve does not.
                </span>
              </li>
              <li className="rounded-[var(--radius)] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-5">
                <span className="font-bold text-[var(--text-primary)]">
                  5. Next steps
                </span>
                <span className="text-[var(--text-secondary)]">
                  {" "}
                  - What happens before the next update. Gives the client something
                  to hold you to and shows the project is moving.
                </span>
              </li>
            </ol>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              How to structure an action log that people actually use
            </h2>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Most action logs fail for the same reason: they live in a spreadsheet
              that only the PM looks at. The format matters less than the discipline
              of updating it and sharing it. A simple four-column table - task,
              owner, priority, status - is enough for most MSP projects.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The biggest mistake is conflating actions with tasks. A task is
              something on your internal board. An action is something with an
              owner and a deadline that you are communicating to a stakeholder.
              They are not the same thing and mixing them creates noise.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Keep it to genuine actions from the current period. An action log
              with 40 items from the last six months is not an action log - it is a
              backlog. Archive anything older than the previous sprint and keep the
              live document focused on what is happening now.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Writing client emails that do not sound like they were written by AI
            </h2>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The giveaway phrases are consistent. &quot;I hope this message finds you
              well.&quot; &quot;I wanted to reach out.&quot; &quot;Please do not hesitate.&quot;
              &quot;Moving forward.&quot; These phrases have been so overused that they have
              become invisible - and clients have started to notice when emails read
              like they came from a template.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The fix is specificity. Reference the actual project. Mention the
              specific blocker. Name the engineer who is working on it. A client
              email that contains three specific details from this week&apos;s work
              takes the same amount of time to write as a generic one and does
              significantly more to maintain the relationship.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The opening line is the most important. &quot;Following this week&apos;s
              review, here is where the Azure migration stands.&quot; does more work than
              two paragraphs of pleasantries. Get to the point. Your clients are as
              busy as you are.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Cutting the time without cutting the quality
            </h2>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The fastest legitimate shortcut is having a template that is genuinely
              good. Not a generic one from Google - one that reflects how your team
              writes and what your clients expect. Once you have that, weekly
              reporting becomes a matter of filling in the specific details rather
              than constructing something from scratch.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Tools that connect directly to your PSA can take this further. If
              your ticket data can be pulled automatically and structured into a
              client update, the PM&apos;s job becomes editing and approving rather than
              writing from scratch. Handover (gethandover.uk) does this for
              HaloPSA - pulling tickets directly and generating a client email,
              action log, risk log and status report in one step. The output still
              needs a human review before it goes to a client, but the heavy lifting
              is done.
            </p>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The five-hour reporting week is not inevitable. It is the result of
              doing something manually that can be systematised. The MSPs that get
              this right free up their PMs to do the work that actually builds
              client relationships - the conversations, the problem solving, the
              proactive communication that no template can replace.
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
                  Connect HaloPSA and ship your next weekly update in minutes - 14-day free trial - cancel anytime.
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
