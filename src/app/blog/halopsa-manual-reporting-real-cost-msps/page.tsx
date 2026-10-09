import type { Metadata } from "next";
import Link from "next/link";

import { BlogAuthorSection } from "@/components/blog-author-section";
import { BlogBackLink } from "@/components/blog-back-link";
import { BlogRelatedArticles } from "@/components/blog-related-articles";
import { ShareArticleActions } from "../share-article-actions";
import { getPostBySlug, getRelatedPosts, readMinutesFromWordCount } from "@/lib/blog-data";
import { getAllArticleWordCounts, getArticleWordCount } from "@/lib/blog-word-counts";

const SLUG = "halopsa-manual-reporting-real-cost-msps";

const post = getPostBySlug(SLUG)!;

export const metadata: Metadata = {
  title: "HaloPSA Manual Reporting: The Real Cost for MSPs | Handover",
  description:
    "MSP engineers spend 3-5 hours a week on manual client reporting. Here's what that actually costs, why HaloPSA's native reports don't solve it, and what teams are doing instead.",
  keywords: [
    "HaloPSA",
    "MSP reporting",
    "automation",
    "manual reporting",
    "MSP ROI",
    "HaloPSA reporting",
  ],
  alternates: {
    canonical: "https://gethandover.uk/blog/halopsa-manual-reporting-real-cost-msps",
  },
  openGraph: {
    title: "The Real Cost of Manual MSP Reporting (And What HaloPSA Users Do Instead)",
    description:
      "MSP engineers spend 3-5 hours a week on manual client reporting. Here's what that actually costs, why HaloPSA's native reports don't solve it, and what teams are doing instead.",
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
    title: "The Real Cost of Manual MSP Reporting (And What HaloPSA Users Do Instead)",
    description:
      "MSP engineers spend 3-5 hours a week on manual client reporting. Here's what that actually costs, why HaloPSA's native reports don't solve it, and what teams are doing instead.",
    images: ["https://gethandover.uk/opengraph-image"],
  },
};

export default function HalopsaManualReportingRealCostMspsPage() {
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
            The Real Cost of Manual MSP Reporting (And What HaloPSA Users Do Instead)
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
              Most MSP owners know their engineers spend time on reporting. Few have actually
              calculated what that time costs.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The number is usually uncomfortable.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              The baseline: how much time does manual reporting take?
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              A typical MSP running 10-15 clients with active service delivery will spend somewhere
              between 3 and 6 hours per week on client-facing reporting. That includes:
            </p>
            <ul className="mb-5 list-disc pl-6 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              <li>Weekly update emails to clients with active projects</li>
              <li>Friday afternoon ticket summaries for service desk accounts</li>
              <li>Monthly reports pulled together for review meetings</li>
              <li>QBR preparation every quarter for retained clients</li>
            </ul>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Spread across a delivery team, this work doesn&apos;t look dramatic - an hour here, 90
              minutes there. But it compounds. At 4 hours a week across a team of three, you&apos;re
              looking at 12 engineer-hours per week on reporting. Around 600 hours a year. At a loaded
              cost of £45-60 per hour, that&apos;s £27,000-£36,000 annually in engineering time going
              to report writing.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              That&apos;s before you account for the opportunity cost - those are hours not spent on
              billable work, project delivery, or client relationships.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Why HaloPSA&apos;s native reporting doesn&apos;t solve this
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              HaloPSA has a reporting module. It&apos;s genuinely useful for internal operational
              visibility - ticket volumes, SLA performance, engineer utilisation. If you need to
              understand how your team is performing, HaloPSA&apos;s reports give you that.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              What they don&apos;t give you is client-ready output.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The gap is structural. HaloPSA reports are designed for service desk managers, not for
              client communication. They present data in formats that make sense operationally  - 
              tables, counts, status codes - but require significant translation before they&apos;re
              appropriate to send to a client contact.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              A client doesn&apos;t want to see a ticket status report with 47 rows. They want to
              know: what did you fix this month, what&apos;s still outstanding, what are the risks,
              and what should they expect next. That narrative doesn&apos;t come out of HaloPSA
              natively.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              So engineers bridge the gap manually. They pull the HaloPSA data, extract the relevant
              information, and write the client communication themselves. Every week. For every
              client.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              The compounding problem: quality degrades under time pressure
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Manual reporting has a quality problem that goes beyond the time cost.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              When an engineer is writing a Friday afternoon client update at 4:30pm after a full
              week of service desk work, the quality of that communication reflects the
              circumstances. It&apos;s rushed, it&apos;s inconsistent in tone and structure, and it
              often omits context that the client would find valuable.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Over time, this creates a pattern where client reporting is seen internally as a
              low-value administrative task rather than a strategic touchpoint. The irony is that
              clients often judge MSP performance heavily on the quality of communication - a
              well-written monthly update can do more for retention than three months of good
              technical work that goes unreported.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              MSPs that systematise reporting - producing consistent, structured, professional client
              communication every time - tend to have better retention numbers. The product
              hasn&apos;t changed; the communication about the product has.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              What the time saving actually looks like
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              MSPs using automated reporting from HaloPSA data consistently describe the same
              experience: the process goes from 90 minutes per client per week to 15-20 minutes.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The 15-20 minutes is genuine work - reviewing the AI-generated output, adding
              relationship context, adjusting the tone for a specific client. That time is
              irreducible and valuable; it&apos;s where the engineer&apos;s knowledge of the client
              relationship adds something the automation can&apos;t.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The 70 minutes that disappears is the data gathering, the structuring, the first-draft
              writing, and the formatting. Work that follows a predictable pattern and doesn&apos;t
              require human judgement.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              At 10 clients, that&apos;s 700 minutes - nearly 12 hours - returned to the team every
              week.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              The HaloPSA integration specifically
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Tools that integrate natively with HaloPSA rather than requiring a data export have a
              significant advantage for this use case.
            </p>
            <p className="mb-3 text-[16px] font-medium text-[var(--text-primary)]">
              A native integration means:
            </p>
            <ul className="mb-5 list-disc pl-6 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              <li>
                Data is always current - you&apos;re not working from a CSV exported this morning
                that&apos;s already missing this afternoon&apos;s ticket closures
              </li>
              <li>
                Client and project context is preserved - the tool knows which work belongs to which
                client without manual mapping
              </li>
              <li>
                Push-back is possible - report notes can go back into the HaloPSA ticket, keeping the
                audit trail in one place
              </li>
              <li>
                Scheduling becomes viable - weekly reports can go out automatically without an
                engineer manually triggering each one
              </li>
            </ul>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The last two points matter more than they might initially appear. Push-back means the
              client communication and the service record stay in sync. Scheduling means the
              reporting burden doesn&apos;t depend on an engineer remembering to do it.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Calculating your own number
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              If you want to calculate what manual reporting costs your MSP specifically:
            </p>
            <ol className="mb-5 list-decimal pl-6 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              <li>
                Count the client-facing reports your team produces per week (updates, summaries, QBR
                prep)
              </li>
              <li>
                Estimate the average time each takes, honestly - include the data gathering, not just
                the writing
              </li>
              <li>Multiply by your loaded engineer cost per hour</li>
              <li>Multiply by 52</li>
            </ol>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Most MSPs who do this exercise find the number is larger than expected. The work is
              invisible because it&apos;s distributed across the team in small chunks, but it
              accumulates significantly.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The question then becomes whether that cost is worth bearing, or whether it&apos;s
              better deployed elsewhere.
            </p>

            <p className="mb-5 text-[16px] italic leading-[1.8] text-[var(--text-secondary)]">
              Handover connects natively to HaloPSA and generates client-ready reports in under 30
              seconds.{" "}
              <Link href="/auth?tab=signup" className="text-[var(--accent)] hover:underline">
                Start your free trial
              </Link>{" "}
              - no configuration required.
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
                  Connect HaloPSA and generate your first client report in 30 seconds - 14-day free
                  trial, cancel anytime.
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
