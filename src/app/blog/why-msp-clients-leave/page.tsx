import type { Metadata } from "next";
import Link from "next/link";

import { BlogAuthorSection } from "@/components/blog-author-section";
import { BlogBackLink } from "@/components/blog-back-link";
import { BlogRelatedArticles } from "@/components/blog-related-articles";
import { ShareArticleActions } from "../share-article-actions";
import { buildBlogArticleJsonLd } from "@/lib/blog-article-jsonld";
import { getPostBySlug, getRelatedPosts, readMinutesFromWordCount } from "@/lib/blog-data";
import { getAllArticleWordCounts, getArticleWordCount } from "@/lib/blog-word-counts";

const SLUG = "why-msp-clients-leave";
const CANONICAL = "https://gethandover.uk/blog/why-msp-clients-leave";

const post = getPostBySlug(SLUG)!;

const articleJsonLd = buildBlogArticleJsonLd({
  headline: "Why MSP Clients Leave — And How Communication Fixes It",
  description: post.description,
  datePublished: post.dateISO,
  url: CANONICAL,
  keywords: [
    "MSP retention",
    "MSP churn",
    "client communication",
    "MSP reporting",
    "JumpCloud SME IT Trends",
  ],
});

export const metadata: Metadata = {
  title: "Why MSP Clients Leave - And How Communication Fixes It | Handover",
  description:
    "Most MSPs assume client churn is about price or technical failures. The data tells a different story. Here's why consistent communication is your strongest retention tool.",
  keywords: [
    "MSP retention",
    "client communication",
    "MSP churn",
    "account management",
    "MSP reporting",
    "client retention",
  ],
  alternates: {
    canonical: CANONICAL,
  },
  openGraph: {
    title: "Why MSP Clients Leave - And How Communication Fixes It",
    description:
      "Most MSPs assume client churn is about price or technical failures. The data tells a different story. Here's why consistent communication is your strongest retention tool.",
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
    title: "Why MSP Clients Leave - And How Communication Fixes It",
    description:
      "Most MSPs assume client churn is about price or technical failures. The data tells a different story. Here's why consistent communication is your strongest retention tool.",
    images: ["https://gethandover.uk/opengraph-image"],
  },
};

export default function WhyMspClientsLeavePage() {
  const readMins = readMinutesFromWordCount(getArticleWordCount(SLUG));
  const related = getRelatedPosts(SLUG, 2);
  const wordMap = getAllArticleWordCounts();

  return (
    <div
      className="animate-in fade-in duration-300"
      style={{ background: "var(--bg-primary)", minHeight: "100vh" }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
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
            Why MSP Clients Leave (It&apos;s Rarely About the Technical Work)
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
              Ask most MSP owners why they lost a client and you&apos;ll hear one of three answers:
              price, a competitor, or something technical going wrong.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Rarely will they say: &quot;We stopped communicating well.&quot;
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              But that&apos;s usually what happened.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              What SMEs say about leaving their MSP
            </h2>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Independent research backs this up. In JumpCloud&apos;s Q3 2024{" "}
              <em>SME IT Trends</em> survey of 612 IT decision-makers at organisations with up to
              2,500 employees in the US and UK, poor account management and customer service ranked
              among the top reasons SMEs stop working with an MSP — alongside cost and outgrowing
              the service offering.
            </p>

            <div className="my-8 overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)]">
              <table className="w-full min-w-[520px] border-collapse text-left text-[14px]">
                <thead>
                  <tr className="bg-[var(--bg-secondary)]">
                    <th className="border-b border-[var(--border)] px-4 py-3 font-semibold text-[var(--text-primary)]">
                      Finding
                    </th>
                    <th className="border-b border-[var(--border)] px-4 py-3 font-semibold text-[var(--text-primary)]">
                      Stat
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[var(--text-secondary)]">
                  <tr>
                    <td className="border-b border-[var(--border)] px-4 py-3">
                      SMEs that stopped working with an MSP because of poor customer service or a
                      negative experience with their account or sales team
                    </td>
                    <td className="border-b border-[var(--border)] px-4 py-3 font-semibold text-[var(--text-primary)]">
                      23%
                    </td>
                  </tr>
                  <tr>
                    <td className="border-b border-[var(--border)] px-4 py-3">
                      SMEs that plan to increase their MSP investment over the next 12 months
                    </td>
                    <td className="border-b border-[var(--border)] px-4 py-3 font-semibold text-[var(--text-primary)]">
                      67%
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">
                      SMEs that rely on an MSP for at least some IT functions
                    </td>
                    <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                      76%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The 23% figure is not a rounding error. It is the fourth most common reason cited for
              ending an MSP relationship — after cost (28%), outgrowing the service (26%), and
              bringing IT in-house (24%). Communication and account management sit in the same tier
              as structural commercial decisions.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The opportunity sits in the other numbers. Three-quarters of SMEs already depend on an
              MSP for some IT work, and two-thirds plan to spend more with their provider in the
              next year. The market is growing. The MSPs that communicate clearly and consistently
              are best placed to capture that growth — and to avoid being in the 23% churn bucket.
            </p>

            <p className="mb-5 text-[13px] leading-relaxed text-[var(--text-muted)]">
              Source: JumpCloud,{" "}
              <a
                href="https://jumpcloud.com/resources/your-route-to-positive-client-interactions"
                className="text-[var(--accent)] underline-offset-4 hover:underline"
                rel="noopener noreferrer"
                target="_blank"
              >
                Your Route to Positive Client Interactions: An SME IT Trends Q3 2024 Special Report
              </a>
              ; methodology and full dataset in{" "}
              <a
                href="https://jumpcloud.com/wp-content/uploads/2024/07/SME-IT-Trends-Q3-2024-Detours-Ahead-How-IT-Navigates-an-Evolving-World.pdf"
                className="text-[var(--accent)] underline-offset-4 hover:underline"
                rel="noopener noreferrer"
                target="_blank"
              >
                Detours Ahead: How IT Navigates an Evolving World (PDF)
              </a>
              . Survey of 612 IT decision-makers (US and UK), organisations with 2,500 or fewer
              employees, conducted by Propeller Insights, 4–7 June 2024.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              The gap between delivery and perception
            </h2>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Here&apos;s a pattern that repeats itself across MSPs of every size.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The technical work is good. Tickets are getting closed. Projects are progressing. SLAs
              are being met. The engineers are doing exactly what they&apos;re supposed to do.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              And then the client leaves.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              When you dig into why, the answer is almost always a variation of the same thing: the
              client didn&apos;t feel informed. They didn&apos;t know what was happening on their account.
              They couldn&apos;t see the value they were paying for. Someone else came along and told a
              better story - and they listened.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The MSP didn&apos;t lose on technical merit. They lost on communication.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              What clients actually judge you on
            </h2>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Clients are not engineers. They don&apos;t evaluate your performance by looking at ticket
              close rates or SLA adherence data. They evaluate you the way anyone evaluates a service
              they&apos;re paying for: by how confident they feel.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Confidence comes from communication. Specifically:
            </p>

            <ul className="mb-5 list-disc space-y-2 pl-6 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              <li>Do I know what&apos;s happening on my account?</li>
              <li>Do I feel like my provider is on top of things?</li>
              <li>When something goes wrong, do I hear about it before it becomes a problem?</li>
              <li>Can I see that what I&apos;m paying for is actually being delivered?</li>
            </ul>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              None of these questions are technical. They&apos;re all about how informed the client
              feels. And how informed the client feels is entirely determined by how well you
              communicate.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              The retention gap between MSPs
            </h2>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              There&apos;s a meaningful difference between MSPs that retain clients for five or ten years
              and those that see regular churn at the twelve to eighteen month mark.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The technical quality is often comparable. The pricing is often similar. The difference,
              consistently, is communication.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              MSPs with strong retention have made client communication systematic. Their clients
              receive regular, structured updates. They know what&apos;s been done, what&apos;s outstanding,
              and what&apos;s coming. They feel like partners rather than customers.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              MSPs with churn problems often have excellent technical teams who are simply too busy
              delivering to document what they&apos;re doing. The work happens. The communication
              doesn&apos;t. And when renewal time comes around, the client has nothing to point to that
              justifies the contract.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Why reporting is harder than it looks
            </h2>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The challenge isn&apos;t that MSPs don&apos;t know communication matters. It&apos;s that producing
              consistent, professional client communication is genuinely difficult at scale.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Writing a good client update requires translating technical work into plain English,
              identifying what&apos;s important versus what&apos;s noise, structuring it in a way that&apos;s easy
              to read, and doing all of that across every client, every week, without it sounding
              templated.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Most MSPs solve this by having senior engineers or account managers write updates
              manually. That works when you have two or three clients. It breaks down at ten. At
              twenty it becomes unsustainable.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The result is that communication becomes inconsistent. Some clients get detailed weekly
              updates. Others get a monthly email when someone remembers. The quality varies by who
              wrote it and how much time they had.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Inconsistent communication is almost as damaging as no communication. Clients notice when
              the updates stop. They notice when the quality drops. They start to wonder whether
              anything is actually happening.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              What consistent communication looks like in practice
            </h2>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The MSPs that have solved this problem have one thing in common: they&apos;ve made client
              reporting systematic rather than dependent on individual effort.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              That means every client gets a structured update on a predictable cadence. The update
              follows a consistent format - what was completed, what&apos;s outstanding, what the risks
              are, what&apos;s coming next. It&apos;s professional enough to forward to a director. It&apos;s
              specific enough to reference actual work.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              When clients receive this kind of communication consistently, something changes in the
              relationship. They stop worrying about whether their MSP is on top of things because
              they can see, every week, that they are. They stop shopping around because the value is
              visible. They stop asking &quot;what are we actually paying for&quot; because the answer arrives in
              their inbox before they have to ask.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              That&apos;s what retention looks like. Not a locked-in contract. A client who doesn&apos;t want to
              leave because they feel genuinely well-served.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              The economics of getting this right
            </h2>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Client retention is the most important financial metric for an MSP. A client paying
              £3,000 a month who stays for five years is worth £180,000. The same client who churns at
              eighteen months is worth £54,000.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The difference between those two outcomes is rarely technical capability. It&apos;s almost
              always relationship quality - and relationship quality is built on communication.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Investing in systematic client reporting isn&apos;t an administrative overhead. It&apos;s
              retention spend. The MSPs that treat it that way, and build it into their operation
              properly, consistently outperform the ones that don&apos;t.
            </p>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Handover generates professional client reports from your HaloPSA or ConnectWise data in
              30 seconds.{" "}
              <Link
                href="/auth?tab=signup"
                className="font-medium text-[var(--accent)] underline-offset-4 hover:underline"
              >
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
                  Connect HaloPSA or ConnectWise and see how consistent client communication
                  strengthens retention - 14-day free trial, cancel anytime.
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
