import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { BlogAuthorSection } from "@/components/blog-author-section";
import { BlogBackLink } from "@/components/blog-back-link";
import { BlogRelatedArticles } from "@/components/blog-related-articles";
import { ShareArticleActions } from "@/app/blog/share-article-actions";
import { buildBlogArticleJsonLd } from "@/lib/blog-article-jsonld";
import { DYNAMIC_ARTICLE_SLUGS, getDynamicArticleHtml } from "@/lib/blog-dynamic-articles-html";
import { getPostBySlug, getRelatedPosts, readMinutesFromWordCount } from "@/lib/blog-data";
import { getAllArticleWordCounts, getArticleWordCount } from "@/lib/blog-word-counts";
import { cn } from "@/lib/utils";

const articleBodyClassName =
  "mt-0 [&_a]:text-[var(--accent)] [&_a]:underline [&_blockquote]:border-l-[3px] [&_blockquote]:border-l-[var(--accent)] [&_blockquote]:bg-[color-mix(in_srgb,var(--accent)_6%,transparent)] [&_blockquote]:pl-4 [&_blockquote]:shadow-[inset_4px_0_0_0_var(--accent)] [&_code]:rounded [&_code]:bg-[var(--bg-secondary)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm [&_code]:text-[var(--text-primary)] [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-[20px] [&_h2]:font-semibold [&_h2]:text-[var(--text-primary)] sm:[&_h2]:text-[24px] [&_h2.blog-h2-anchor]:scroll-mt-28 [&_li]:mb-2 [&_p]:mb-5 [&_p]:text-[16px] [&_p]:leading-[1.8] [&_p]:text-[var(--text-secondary)] [&_strong]:font-semibold [&_strong]:text-[var(--text-primary)] [&_ul]:mb-5 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-[16px] [&_ul]:leading-[1.8] [&_ul]:text-[var(--text-secondary)] [&_.blog-hr]:my-10 [&_.blog-hr]:border-0 [&_.blog-hr]:border-t [&_.blog-hr]:border-[var(--border)] [&_.blog-table-scroll]:-mx-4 [&_.blog-table-scroll]:my-6 [&_.blog-table-scroll]:overflow-x-auto [&_.blog-table-scroll]:px-4 sm:[&_.blog-table-scroll]:mx-0 sm:[&_.blog-table-scroll]:px-0 [&_.blog-table-scroll_table]:w-full [&_.blog-table-scroll_table]:min-w-[640px] [&_.blog-table-scroll_table]:border-collapse [&_.blog-table-scroll_table]:text-left [&_.blog-table-scroll_th]:border [&_.blog-table-scroll_th]:border-[var(--border)] [&_.blog-table-scroll_th]:bg-[var(--bg-secondary)] [&_.blog-table-scroll_th]:px-3 [&_.blog-table-scroll_th]:py-2.5 [&_.blog-table-scroll_th]:text-sm [&_.blog-table-scroll_th]:font-semibold [&_.blog-table-scroll_th]:text-[var(--text-primary)] [&_.blog-table-scroll_td]:border [&_.blog-table-scroll_td]:border-[var(--border)] [&_.blog-table-scroll_td]:px-3 [&_.blog-table-scroll_td]:py-2.5 [&_.blog-table-scroll_td]:text-sm [&_.blog-table-scroll_td]:text-[var(--text-secondary)]";

function blogArticleTitleAccent(title: string) {
  const parts = title.split(/\s-\s/);
  if (parts.length === 2) {
    return (
      <>
        {parts[0]} - <span className="text-gradient-brand">{parts[1]}</span>
      </>
    );
  }
  const words = title.trim().split(/\s+/);
  if (words.length < 2) {
    return <span className="text-gradient-brand">{title}</span>;
  }
  const last = words.pop()!;
  return (
    <>
      {words.join(" ")} <span className="text-gradient-brand">{last}</span>
    </>
  );
}

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return DYNAMIC_ARTICLE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  const html = getDynamicArticleHtml(slug);
  if (!post || !html) return {};

  const description = post.description;
  const wordCount = getArticleWordCount(slug);
  const readMins = post.readMinutesOverride ?? readMinutesFromWordCount(wordCount);

  if (slug === "pitchit-2026-handover-msp-accelerator") {
    const title =
      "Handover is joining PitchIT 2026 - here's why we applied | Handover Blog";
    const keywords = [
      "PitchIT 2026",
      "ConnectWise PitchIT",
      "MSP accelerator",
      "Handover MSP",
      "automated MSP reporting",
      "HaloPSA reporting",
    ];
    return {
      title,
      description:
        "Handover has been accepted into PitchIT 2026, ConnectWise's global accelerator for MSP software companies. Here's the problem we're solving and what we're building.",
      keywords,
      alternates: {
        canonical: `https://gethandover.uk/blog/${slug}`,
      },
      openGraph: {
        title,
        description,
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
        title,
        description,
        images: ["https://gethandover.uk/opengraph-image"],
      },
      other: {
        "article:author": post.author,
        "article:published_time": post.dateISO,
        "article:tag": post.tags.join(", "),
        "twitter:label1": "Reading time",
        "twitter:data1": `${readMins} min read`,
      },
    };
  }

  return {
    title: `${post.title} | Handover`,
    description,
    keywords: [...post.tags, "MSP", "Handover"],
    alternates: {
      canonical: `https://gethandover.uk/blog/${slug}`,
    },
    openGraph: {
      title: post.title,
      description,
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
      description,
      images: ["https://gethandover.uk/opengraph-image"],
    },
    other: {
      "article:author": post.author,
      "article:published_time": post.dateISO,
      "article:tag": post.tags.join(", "),
      "twitter:label1": "Reading time",
      "twitter:data1": `${readMins} min read`,
    },
  };
}

export default async function DynamicBlogArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const html = getDynamicArticleHtml(slug);
  const post = getPostBySlug(slug);
  if (!html || !post || post.kind !== "dynamic") {
    notFound();
  }

  const wordCount = getArticleWordCount(slug);
  const readMins = post.readMinutesOverride ?? readMinutesFromWordCount(wordCount);
  const related = getRelatedPosts(slug, 2);
  const wordMap = getAllArticleWordCounts();
  const toc = post.toc;
  const articleJsonLd = buildBlogArticleJsonLd({
    headline: post.title,
    description: post.description,
    datePublished: post.dateISO,
    url: `https://gethandover.uk/blog/${slug}`,
    keywords: post.tags,
  });

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
        <div
          className={cn(
            toc &&
              "lg:grid lg:grid-cols-[minmax(0,720px)_minmax(0,220px)] lg:items-start lg:gap-10 xl:gap-12",
          )}
        >
          <div
            className={cn(
              "relative w-full max-w-[720px] overflow-hidden rounded-[var(--radius-lg)] animate-in fade-in slide-in-from-bottom-4 duration-300",
              "mx-auto",
              toc && "lg:mx-0",
            )}
          >
            <div
              className="hero-grid-bg pointer-events-none absolute inset-0 opacity-[0.4]"
              aria-hidden
            />
            <div className="relative z-[1] px-1 pb-2 sm:px-2">
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
                {blogArticleTitleAccent(post.title)}
              </h1>
              <p
                className="text-sm text-[var(--text-muted)]"
                aria-label={`Estimated reading time: ${readMins} minutes`}
              >
                {readMins} min read
              </p>

              <article
                className={articleBodyClassName}
                style={{
                  borderTop: "1px solid var(--border)",
                  marginTop: "1.5rem",
                  paddingTop: "2rem",
                }}
                dangerouslySetInnerHTML={{ __html: html }}
              />

              {slug === "what-msps-told-us-about-client-reporting" ? (
                <div className="mt-12 rounded-xl border border-[rgba(56,189,248,0.2)] bg-[rgba(56,189,248,0.05)] p-6">
                  <h2 className="text-[24px] font-bold text-[var(--text-primary)]">
                    Run your free scan
                  </h2>
                  <p className="mt-2 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
                    Connect HaloPSA or ConnectWise with a read-only key.
                  </p>
                  <p className="mt-1 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
                    About a minute, no trial, no card.
                  </p>
                  <div className="mt-5">
                    <Link
                      href="/onboarding/connect"
                      className="inline-flex items-center rounded-[var(--radius)] bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
                    >
                      Run your free scan
                    </Link>
                  </div>
                </div>
              ) : null}

              <div className="mt-12">
                <ShareArticleActions />
              </div>

              <BlogRelatedArticles posts={related} wordCountBySlug={wordMap} />

              <BlogAuthorSection />

              <div className="mt-10 border-t border-[var(--border)] pt-8">
                <BlogBackLink />
              </div>
            </div>
          </div>

          {toc && toc.length > 0 ? (
            <aside className="relative z-[1] mt-10 hidden lg:mt-0 lg:block">
              <nav
                className="sticky top-24 border-l border-[var(--border)] pl-5"
                aria-label="On this page"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  On this page
                </p>
                <ul className="mt-3 space-y-2.5">
                  {toc.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="text-[13px] leading-snug text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}
