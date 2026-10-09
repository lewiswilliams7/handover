import type { Metadata } from "next";
import Link from "next/link";

import { BlogAuthorSection } from "@/components/blog-author-section";
import { BlogBackLink } from "@/components/blog-back-link";
import { BlogRelatedArticles } from "@/components/blog-related-articles";
import { ShareArticleActions } from "../share-article-actions";
import { buildBlogArticleJsonLd } from "@/lib/blog-article-jsonld";
import { getPostBySlug, getRelatedPosts, readMinutesFromWordCount } from "@/lib/blog-data";
import { getAllArticleWordCounts, getArticleWordCount } from "@/lib/blog-word-counts";

const SLUG = "msp-qbr-automation-what-gets-generated";
const CANONICAL = "https://gethandover.uk/blog/msp-qbr-automation-what-gets-generated";

const post = getPostBySlug(SLUG)!;

const articleJsonLd = buildBlogArticleJsonLd({
  headline: post.title,
  description: post.description,
  datePublished: post.dateISO,
  url: CANONICAL,
  keywords: [
    "automate MSP QBR",
    "MSP quarterly business review template",
    "MSP QBR automation",
    "QBR pack MSP",
    "HaloPSA QBR",
    "ConnectWise QBR",
  ],
});

export const metadata: Metadata = {
  title: "MSP QBR Automation: What Gets Generated & How Long It Takes | Handover",
  description: post.description,
  keywords: [
    "automate MSP QBR",
    "MSP QBR template",
    "quarterly business review MSP",
    "QBR automation",
    "MSP reporting",
  ],
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: post.title,
    description: post.description,
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
    title: post.title,
    description: post.description,
    images: ["https://gethandover.uk/opengraph-image"],
  },
};

const QBR_SECTIONS = [
  {
    title: "Executive summary",
    body: "Quarter-level narrative written for the client director — what was delivered, what slipped, and what the relationship health looks like. Pulled from ticket volume trends, project status, and open risks.",
  },
  {
    title: "Ticket volume trend",
    body: "Weekly ticket counts across the reporting period as a bar chart — shows whether demand is rising, falling, or stable. Useful for capacity conversations and scope discussions.",
  },
  {
    title: "Resolution performance by priority",
    body: "Average hours to resolve P1, P2, and P3 tickets with ticket counts per band. Answers the question directors actually ask: are critical issues being handled fast enough?",
  },
  {
    title: "Ticket breakdown",
    body: "Distribution by category or status (configurable) — e.g. incidents vs requests, or open vs resolved mix. Includes a note when PSA data is incomplete.",
  },
  {
    title: "Open vs closed",
    body: "Raised, resolved, and still-open counts with resolved percentage. A single slide that shows whether the account is getting healthier or busier.",
  },
  {
    title: "Project status (RAG)",
    body: "Each active project with completion percentage, Red/Amber/Green rating, owner, and next action. The slide account managers spend the most time building manually.",
  },
  {
    title: "SLA performance",
    body: "Compliance percentage for the period when SLA data is available from the PSA.",
  },
  {
    title: "Recurring issues",
    body: "Top repeat ticket themes with counts and percentage of volume — surfaces systemic problems (same printer, same VPN issue) that one-off ticket stats hide.",
  },
  {
    title: "Period comparison",
    body: "Current vs previous quarter on volume, resolution rate, and average resolution hours, with a trend line narrative.",
  },
  {
    title: "First contact resolution",
    body: "FCR percentage with evaluated ticket count and benchmark note.",
  },
  {
    title: "Risks, actions, and next-quarter commitments",
    body: "Structured risks and actions from the period, plus numbered quarter priorities — action, risk addressed, owner, and target date. The centrepiece slide for renewal conversations.",
  },
];

export default function MspQbrAutomationPage() {
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
            MSP QBR Automation: What Gets Generated and How Long It Takes
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
              Quarterly Business Reviews are the highest-stakes meeting in an MSP account
              relationship — and the most expensive to prepare. Most account managers spend three to
              five hours per client pulling PSA exports, building slides, and writing an executive
              summary from scratch.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Generic &quot;MSP QBR template&quot; content online tells you what sections to include.
              It does not tell you what an automated QBR actually contains, how the data is sourced,
              or how long the whole process takes when your PSA is connected. This article does.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Manual QBR prep: where the time goes
            </h2>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              A typical manual QBR for one client breaks down roughly like this:
            </p>

            <ul className="mb-5 list-disc space-y-2 pl-6 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              <li>45–60 min — exporting and filtering tickets and projects from HaloPSA or ConnectWise</li>
              <li>60–90 min — building charts in Excel or PowerPoint (volume trend, resolution times)</li>
              <li>45–60 min — writing executive summary and quarter commitments</li>
              <li>30–45 min — formatting slides, branding, and proofreading</li>
            </ul>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Total: <strong>3–5 hours per client per quarter</strong>. Ten active QBR accounts means
              30–50 hours of senior time every quarter — before the meeting itself.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              What a Handover QBR pack contains
            </h2>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Handover&apos;s QBR Pack Builder pulls live ticket and project data from your PSA for a
              chosen date range and client, then generates every section below. You choose which
              slides to include; sections without sufficient data are flagged rather than filled with
              placeholders.
            </p>

            <div className="my-8 space-y-4">
              {QBR_SECTIONS.map((s, i) => (
                <div
                  key={s.title}
                  className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)]/40 p-4"
                >
                  <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                    {i + 1}. {s.title}
                  </p>
                  <p className="mt-1 text-[14px] leading-relaxed text-[var(--text-secondary)]">
                    {s.body}
                  </p>
                </div>
              ))}
            </div>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Example: next-quarter commitments slide
            </h2>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The commitments slide is what directors remember. Here is representative output from a
              multi-client portfolio QBR — numbered priorities with owner and target:
            </p>

            <div className="my-6 space-y-3 rounded-[var(--radius-lg)] border border-[var(--border)] p-4">
              {[
                {
                  num: "01",
                  action:
                    "Complete Office 365 SPF/DKIM remediation for Northwood Manufacturing sales team (Ticket #1001)",
                  target: "11 Jun 2026",
                },
                {
                  num: "02",
                  action:
                    "Finalise MFA rollout for remaining 8 accounts at Northwood Manufacturing (Ticket #1002)",
                  target: "28 Jun 2026",
                },
                {
                  num: "03",
                  action:
                    "Execute Fortigate 200F firewall migration for Bridgewater Council during agreed Saturday window",
                  target: "12 Jul 2026",
                },
              ].map((row) => (
                <div key={row.num} className="flex gap-3 border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
                  <span className="text-[24px] font-bold leading-none text-[var(--accent)] opacity-60">
                    {row.num}
                  </span>
                  <div>
                    <p className="text-[14px] font-medium text-[var(--text-primary)]">{row.action}</p>
                    <p className="mt-1 text-[12px] text-[var(--text-muted)]">Target: {row.target}</p>
                  </div>
                </div>
              ))}
            </div>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              PowerPoint and Excel export
            </h2>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The QBR exports as a branded <strong>PowerPoint (.pptx)</strong> deck with your logo and
              colour, plus an <strong>Excel workbook</strong> with the underlying ticket metrics.
              Slides use your MSP branding — not a generic template. A sample deck structure includes
              title slide, executive summary, ticket metrics charts, resolution-by-priority bars,
              project RAG table, SLA slide, recurring issues, period comparison, and commitments.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              You can preview the pack in-app before export, edit the executive summary, toggle
              sections on or off, and download when ready. The PPTX is what you send ahead of the
              meeting or present live — not a PDF screenshot of a dashboard.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              How long automated QBR generation takes
            </h2>

            <div className="my-8 overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)]">
              <table className="w-full min-w-[480px] border-collapse text-left text-[14px]">
                <thead>
                  <tr className="bg-[var(--bg-secondary)]">
                    <th className="border-b border-[var(--border)] px-4 py-3 font-semibold text-[var(--text-primary)]">
                      Step
                    </th>
                    <th className="border-b border-[var(--border)] px-4 py-3 font-semibold text-[var(--text-primary)]">
                      Manual
                    </th>
                    <th className="border-b border-[var(--border)] px-4 py-3 font-semibold text-[var(--text-primary)]">
                      Handover
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[var(--text-secondary)]">
                  <tr>
                    <td className="border-b border-[var(--border)] px-4 py-3">Data gathering</td>
                    <td className="border-b border-[var(--border)] px-4 py-3">45–60 min</td>
                    <td className="border-b border-[var(--border)] px-4 py-3">Automatic (PSA sync)</td>
                  </tr>
                  <tr>
                    <td className="border-b border-[var(--border)] px-4 py-3">Charts and metrics</td>
                    <td className="border-b border-[var(--border)] px-4 py-3">60–90 min</td>
                    <td className="border-b border-[var(--border)] px-4 py-3">~2 min generate</td>
                  </tr>
                  <tr>
                    <td className="border-b border-[var(--border)] px-4 py-3">Executive summary + commitments</td>
                    <td className="border-b border-[var(--border)] px-4 py-3">45–60 min</td>
                    <td className="border-b border-[var(--border)] px-4 py-3">Included in generate</td>
                  </tr>
                  <tr>
                    <td className="border-b border-[var(--border)] px-4 py-3">Slide formatting + export</td>
                    <td className="border-b border-[var(--border)] px-4 py-3">30–45 min</td>
                    <td className="border-b border-[var(--border)] px-4 py-3">One-click PPTX</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">Total (typical)</td>
                    <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">3–5 hours</td>
                    <td className="px-4 py-3 font-semibold text-[var(--accent)]">15–30 min review</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Automation does not remove the account manager from the QBR — it removes the data
              wrangling. You still review the executive summary, adjust commitments, and add
              relationship context the PSA cannot see. The difference is starting from a complete
              first draft instead of a blank PowerPoint.
            </p>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              For a deeper look at QBR strategy, see our guide on{" "}
              <Link
                href="/blog/automate-msp-qbr-preparation"
                className="font-medium text-[var(--accent)] underline-offset-4 hover:underline"
              >
                how MSPs automate QBR preparation without losing quality
              </Link>
              . To try the pack builder:{" "}
              <Link
                href="/auth?tab=signup"
                className="font-medium text-[var(--accent)] underline-offset-4 hover:underline"
              >
                start a free trial
              </Link>
              , connect your PSA, and open QBR Pack from the main navigation.
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
                <h3 className="text-[24px] font-bold text-[var(--text-primary)]">
                  Generate your next QBR in minutes
                </h3>
                <p className="mt-2 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
                  Connect HaloPSA or ConnectWise, pick a client and date range, export a branded
                  PPTX — 14-day free trial.
                </p>
                <div className="mt-5">
                  <Link
                    href="/auth?tab=signup&returnTo=/welcome"
                    className="inline-flex items-center rounded-[var(--radius)] bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
                  >
                    Try QBR Pack Builder →
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
