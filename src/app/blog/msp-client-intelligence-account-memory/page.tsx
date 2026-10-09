import type { Metadata } from "next";
import Link from "next/link";

import { BlogAuthorSection } from "@/components/blog-author-section";
import { BlogBackLink } from "@/components/blog-back-link";
import { BlogRelatedArticles } from "@/components/blog-related-articles";
import { ShareArticleActions } from "../share-article-actions";
import { buildBlogArticleJsonLd } from "@/lib/blog-article-jsonld";
import { getPostBySlug, getRelatedPosts, readMinutesFromWordCount } from "@/lib/blog-data";
import { getAllArticleWordCounts, getArticleWordCount } from "@/lib/blog-word-counts";

const SLUG = "msp-client-intelligence-account-memory";
const CANONICAL = "https://gethandover.uk/blog/msp-client-intelligence-account-memory";

const post = getPostBySlug(SLUG)!;

const articleJsonLd = buildBlogArticleJsonLd({
  headline: post.title,
  description: post.description,
  datePublished: post.dateISO,
  url: CANONICAL,
  keywords: [
    "MSP account intelligence",
    "client account memory MSP",
    "MSP client intelligence",
    "MSP retention",
    "account management MSP",
  ],
});

export const metadata: Metadata = {
  title: "Client Intelligence for MSPs: Account Memory & Retention | Handover",
  description: post.description,
  keywords: [
    "MSP client intelligence",
    "MSP account memory",
    "MSP account intelligence",
    "client retention MSP",
    "MSP account management",
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

export default function MspClientIntelligencePage() {
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
            Client Intelligence for MSPs: What It Is and Why Account Memory Matters
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
              Every MSP has a memory problem that no PSA solves.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              When your best service delivery manager leaves, they take three years of client context
              with them — which stakeholder to call, what was promised in the last QBR, which risks
              have been building quietly, what the client said about budget in passing. That
              knowledge does not live in HaloPSA or ConnectWise. It lives in people&apos;s heads.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              <strong>Client Intelligence</strong> is the category of tooling that fixes this: an
              accumulated, searchable memory of each client account that builds automatically from
              delivery work — not from manual CRM notes nobody updates.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              What &quot;client intelligence&quot; means for an MSP
            </h2>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              In enterprise software, &quot;customer intelligence&quot; usually means sales analytics —
              pipeline, churn prediction, upsell signals. For MSPs, the more urgent problem is{" "}
              <em>delivery</em> intelligence: understanding the health of an account based on what
              is actually happening in tickets, projects, reports, and risks over time.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Client Intelligence for MSPs answers questions like:
            </p>

            <ul className="mb-5 list-disc space-y-2 pl-6 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              <li>Is this account getting healthier or deteriorating quarter on quarter?</li>
              <li>What issues keep recurring — and have we actually fixed the root cause?</li>
              <li>When did we last send a structured update, and what did it say?</li>
              <li>Which clients need attention before renewal, not after they give notice?</li>
              <li>If a new account manager inherits this client tomorrow, what do they need to know?</li>
            </ul>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              What Client Intelligence tracks
            </h2>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              A useful MSP client intelligence layer combines:
            </p>

            <ul className="mb-5 list-disc space-y-2 pl-6 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              <li>
                <strong>Report history</strong> — every generated summary, risk log, and client email
                for the account, searchable and comparable period on period.
              </li>
              <li>
                <strong>Recurring issues</strong> — ticket themes that appear repeatedly (same VPN
                fault, same printer, same licence renewal scramble) surfaced as patterns, not
                one-off closes.
              </li>
              <li>
                <strong>Risk accumulation</strong> — open risks and actions tracked across weeks,
                not reset every Friday when someone writes a fresh handover.
              </li>
              <li>
                <strong>Relationship health scoring</strong> — a directional signal (green, amber, red)
                based on ticket trends, SLA adherence, report cadence, and unresolved blockers.
              </li>
              <li>
                <strong>Attention alerts</strong> — proactive flags when an account deteriorates:
                rising volume, ageing blockers, missed reporting cadence, or escalating risks.
              </li>
            </ul>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              None of this requires a separate CRM if the intelligence layer is built on top of
              delivery outputs you already produce — provided those outputs are structured and
              retained.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              How it builds automatically (without extra admin)
            </h2>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The reason most &quot;account memory&quot; initiatives fail is they ask engineers to log context
              in a second system. Client Intelligence only works if it is a by-product of normal
              delivery.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Handover Client Intelligence™ accumulates memory every time you generate a report from
              PSA data — weekly updates, project status packs, QBRs. Each generation adds to the
              client&apos;s timeline: actions raised, risks identified, summaries sent, trends observed.
              No separate data entry. No wiki nobody reads.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Over a quarter, an account manager can open a client profile and see how relationship
              health has moved, which risks persisted, and what was committed in the last QBR —
              without reconstructing history from ticket notes.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Why this is a retention tool — for you and your clients
            </h2>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Client Intelligence protects MSP retention in two directions.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              <strong>For the MSP:</strong> you spot deteriorating accounts before the renewal
              conversation. Research from JumpCloud&apos;s 2024 SME IT Trends survey found 23% of SMEs
              left their MSP due to poor customer service or account management — often because
              nobody noticed the relationship fraying until the client had already decided. Attention
              alerts and health scoring exist to catch that drift early.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              <strong>For the client:</strong> they get continuity. When their day-to-day contact at
              your MSP changes, the new account manager arrives with context — not a blank slate and
              a request to &quot;catch up on tickets.&quot; That professionalism is itself a retention factor.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Read more on the communication–churn link in{" "}
              <Link
                href="/blog/why-msp-clients-leave"
                className="font-medium text-[var(--accent)] underline-offset-4 hover:underline"
              >
                why MSP clients leave
              </Link>
              .
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Client Intelligence vs a PSA dashboard
            </h2>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Your PSA shows current state: open tickets, project %, SLA this month. Client
              Intelligence shows <em>narrative memory</em>: what you told the client, what you
              committed to, what keeps coming back, and whether the account is trending the right
              way. Dashboards answer &quot;what is open now?&quot; Intelligence answers &quot;how has this
              relationship been going?&quot;
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              For a product walkthrough, see{" "}
              <Link
                href="/solutions/client-intelligence"
                className="font-medium text-[var(--accent)] underline-offset-4 hover:underline"
              >
                Handover Client Intelligence
              </Link>{" "}
              or the{" "}
              <Link
                href="/blog/introducing-handover-client-intelligence"
                className="font-medium text-[var(--accent)] underline-offset-4 hover:underline"
              >
                launch announcement
              </Link>
              .
            </p>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              <Link
                href="/auth?tab=signup"
                className="font-medium text-[var(--accent)] underline-offset-4 hover:underline"
              >
                Start your free trial
              </Link>{" "}
              — Client Intelligence builds from your first generated report.
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
                  Account memory that builds itself
                </h3>
                <p className="mt-2 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
                  Every report strengthens your client intelligence profile — 14-day free trial on
                  Growth and Team plans.
                </p>
                <div className="mt-5">
                  <Link
                    href="/auth?tab=signup&returnTo=/welcome"
                    className="inline-flex items-center rounded-[var(--radius)] bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
                  >
                    Try Client Intelligence →
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
