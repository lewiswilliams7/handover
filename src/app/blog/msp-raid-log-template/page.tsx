import type { Metadata } from "next";
import Link from "next/link";

import { BlogAuthorSection } from "@/components/blog-author-section";
import { BlogBackLink } from "@/components/blog-back-link";
import { BlogRelatedArticles } from "@/components/blog-related-articles";
import { ShareArticleActions } from "../share-article-actions";
import { buildBlogArticleJsonLd } from "@/lib/blog-article-jsonld";
import { getPostBySlug, getRelatedPosts, readMinutesFromWordCount } from "@/lib/blog-data";
import { getAllArticleWordCounts, getArticleWordCount } from "@/lib/blog-word-counts";

const SLUG = "msp-raid-log-template";
const CANONICAL = "https://gethandover.uk/blog/msp-raid-log-template";

const post = getPostBySlug(SLUG)!;

const articleJsonLd = buildBlogArticleJsonLd({
  headline: post.title,
  description: post.description,
  datePublished: post.dateISO,
  url: CANONICAL,
  keywords: [
    "MSP RAID log template",
    "RAID log MSP",
    "project governance MSP",
    "risk register MSP",
    "MSP project delivery",
  ],
});

export const metadata: Metadata = {
  title: "What Is a RAID Log? MSP RAID Log Template & Guide | Handover",
  description: post.description,
  keywords: [
    "MSP RAID log template",
    "RAID log",
    "MSP project governance",
    "risk register",
    "MSP delivery",
    "project management MSP",
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

export default function MspRaidLogTemplatePage() {
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
            What Is a RAID Log — and Why Should MSPs Produce One for Every Client?
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
              Most MSP project managers know they should maintain a RAID log. Almost none do —
              consistently, at least. The work gets done in the PSA. The governance artefact that
              proves you were on top of risks and dependencies does not.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              That gap matters more than most MSPs realise. A RAID log is not bureaucracy for its
              own sake. It is the document that shows a client — and their board — that you are
              managing delivery professionally, not just closing tickets.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              What a RAID log is (plain English)
            </h2>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              RAID stands for <strong>Risks</strong>, <strong>Assumptions</strong>,{" "}
              <strong>Issues</strong>, and <strong>Dependencies</strong>. It is a single register
              that captures everything that could affect a project or account — before it becomes a
              surprise in a QBR or a reason to churn.
            </p>

            <ul className="mb-5 list-disc space-y-2 pl-6 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              <li>
                <strong>Risks</strong> — things that might go wrong (migration overrun, licence
                expiry, partner sign-off delay).
              </li>
              <li>
                <strong>Assumptions</strong> — what you are assuming to be true (client will
                provide admin access by Friday, maintenance window approved).
              </li>
              <li>
                <strong>Issues</strong> — things that have already gone wrong or are blocking
                progress right now.
              </li>
              <li>
                <strong>Dependencies</strong> — work waiting on someone outside your team (vendor,
                client procurement, third-party integrator).
              </li>
            </ul>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Enterprise project managers have used RAID logs for decades. MSPs often skip them
              because the ticket queue feels like enough. It is not. Tickets record activity. A RAID
              log records judgement — what matters, who owns it, and what happens if it slips.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Why most MSPs do not produce RAID logs
            </h2>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The reason is almost always time, not ignorance.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Building a RAID log from scratch means reading ticket notes, identifying what is a
              risk versus an issue versus a dependency, assigning owners, scoring impact and
              probability, and formatting it in a way a client director would actually read. For a
              single project that can take 45–90 minutes. Multiply that across ten active client
              accounts and it never happens.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              So RAID logs become something you promise in the SOW and produce once, at go-live.
              Then they rot in SharePoint while the real delivery context lives in HaloPSA or
              ConnectWise notes that nobody outside the engineering team reads.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Why MSPs should produce them anyway
            </h2>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Three practical reasons:
            </p>

            <ul className="mb-5 list-disc space-y-2 pl-6 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              <li>
                <strong>Proof of governance.</strong> When something goes wrong, a dated RAID log
                shows you identified the risk early, assigned an owner, and tracked mitigation. That
                protects you in disputes and renewals.
              </li>
              <li>
                <strong>Client confidence.</strong> Directors do not read ticket histories. They
                read structured registers. A RAID log in a monthly pack signals that you run projects
                like a partner, not a break-fix shop.
              </li>
              <li>
                <strong>Continuity when people leave.</strong> When an engineer or account manager
                moves on, the RAID log preserves what was at risk and what was agreed — not just
                what was closed.
              </li>
            </ul>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              MSP RAID log template: column structure
            </h2>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              A practical MSP RAID log uses these columns:
            </p>

            <div className="my-8 overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)]">
              <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
                <thead>
                  <tr className="bg-[var(--bg-secondary)]">
                    {[
                      "Type",
                      "ID",
                      "Description",
                      "Owner",
                      "Impact",
                      "Probability",
                      "Status",
                      "Action required",
                      "Due date",
                      "Client",
                    ].map((h) => (
                      <th
                        key={h}
                        className="border-b border-[var(--border)] px-3 py-2.5 font-semibold text-[var(--text-primary)]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-[var(--text-secondary)]">
                  <tr>
                    <td className="border-b border-[var(--border)] px-3 py-2.5">Risk</td>
                    <td className="border-b border-[var(--border)] px-3 py-2.5">RAID-001</td>
                    <td className="border-b border-[var(--border)] px-3 py-2.5">
                      MFA rollout blocked for 3 remote users without smartphones — 8 accounts remain
                      without MFA
                    </td>
                    <td className="border-b border-[var(--border)] px-3 py-2.5">Jamie Clarke</td>
                    <td className="border-b border-[var(--border)] px-3 py-2.5">
                      Credential compromise if rollout stalls
                    </td>
                    <td className="border-b border-[var(--border)] px-3 py-2.5">4</td>
                    <td className="border-b border-[var(--border)] px-3 py-2.5">Open</td>
                    <td className="border-b border-[var(--border)] px-3 py-2.5">
                      Chase procurement for hardware tokens (YubiKey 5 NFC)
                    </td>
                    <td className="border-b border-[var(--border)] px-3 py-2.5">05 Jun 2026</td>
                    <td className="border-b border-[var(--border)] px-3 py-2.5">
                      Northwood Manufacturing
                    </td>
                  </tr>
                  <tr>
                    <td className="border-b border-[var(--border)] px-3 py-2.5">Risk</td>
                    <td className="border-b border-[var(--border)] px-3 py-2.5">RAID-002</td>
                    <td className="border-b border-[var(--border)] px-3 py-2.5">
                      Fortigate 200F migration may overrun Saturday window — no recovery path after
                      cutover starts
                    </td>
                    <td className="border-b border-[var(--border)] px-3 py-2.5">Alex Thompson</td>
                    <td className="border-b border-[var(--border)] px-3 py-2.5">
                      Public services degraded until emergency window agreed
                    </td>
                    <td className="border-b border-[var(--border)] px-3 py-2.5">4</td>
                    <td className="border-b border-[var(--border)] px-3 py-2.5">Open</td>
                    <td className="border-b border-[var(--border)] px-3 py-2.5">
                      Confirm abort criteria before Saturday cutover
                    </td>
                    <td className="border-b border-[var(--border)] px-3 py-2.5">14 Jun 2026</td>
                    <td className="border-b border-[var(--border)] px-3 py-2.5">
                      Bridgewater Council
                    </td>
                  </tr>
                  <tr>
                    <td className="border-b border-[var(--border)] px-3 py-2.5">Issue</td>
                    <td className="border-b border-[var(--border)] px-3 py-2.5">RAID-003</td>
                    <td className="border-b border-[var(--border)] px-3 py-2.5">
                      Osprey case management upgrade blocked on partner sign-off after successful
                      staging migration
                    </td>
                    <td className="border-b border-[var(--border)] px-3 py-2.5">Jamie Clarke</td>
                    <td className="border-b border-[var(--border)] px-3 py-2.5">
                      Missed upgrade window; disruption to legal operations
                    </td>
                    <td className="border-b border-[var(--border)] px-3 py-2.5">4</td>
                    <td className="border-b border-[var(--border)] px-3 py-2.5">Open</td>
                    <td className="border-b border-[var(--border)] px-3 py-2.5">
                      Escalate to partner director if no response by Friday
                    </td>
                    <td className="border-b border-[var(--border)] px-3 py-2.5">14 Jun 2026</td>
                    <td className="border-b border-[var(--border)] px-3 py-2.5">Acme Legal LLP</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2.5">Dependency</td>
                    <td className="px-3 py-2.5">RAID-004</td>
                    <td className="px-3 py-2.5">
                      Hardware token procurement approval required from client IT manager before MFA
                      rollout can complete
                    </td>
                    <td className="px-3 py-2.5">Jamie Clarke</td>
                    <td className="px-3 py-2.5">MFA enforcement delayed for remote workers</td>
                    <td className="px-3 py-2.5">3</td>
                    <td className="px-3 py-2.5">Open</td>
                    <td className="px-3 py-2.5">Send procurement options; chase sign-off</td>
                    <td className="px-3 py-2.5">05 Jun 2026</td>
                    <td className="px-3 py-2.5">Northwood Manufacturing</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mb-5 text-[13px] leading-relaxed text-[var(--text-muted)]">
              Example rows derived from PSA ticket and project notes (Northwood Manufacturing, Bridgewater
              Council, Acme Legal LLP). Probability scored 1–5 where 4 = active escalation or external
              blocker.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              How Handover generates RAID logs automatically
            </h2>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Handover reads ticket and project notes from HaloPSA or ConnectWise and produces a
              structured RAID log alongside your actions, risks, summary, and client email. Enable
              the RAID log tab in Settings → Output tabs, run a generation, and the register is
              built from the same source data your engineers already update.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Each row gets a RAID ID, named owner (from the ticket assignee — not &quot;TBC&quot;),
              impact description, probability score, status, and due date. Export the full delivery
              pack to Excel in one click, RAID log included, alongside change logs, stakeholder
              updates, and the rest of your PM outputs.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The point is not to replace project management judgement. It is to remove the 90-minute
              formatting exercise that stops RAID logs from existing at all.
            </p>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              <Link
                href="/auth?tab=signup"
                className="font-medium text-[var(--accent)] underline-offset-4 hover:underline"
              >
                Start your free trial
              </Link>{" "}
              and enable RAID log in your output tabs — no separate template to maintain.
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
                  RAID logs from live PSA data
                </h3>
                <p className="mt-2 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
                  Connect HaloPSA or ConnectWise and generate a client-ready RAID log in under a
                  minute — 14-day free trial.
                </p>
                <div className="mt-5">
                  <Link
                    href="/auth?tab=signup&returnTo=/welcome"
                    className="inline-flex items-center rounded-[var(--radius)] bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
                  >
                    Try Handover free →
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
