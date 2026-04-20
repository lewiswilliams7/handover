import Link from "next/link";

import type { BlogPostMeta } from "@/lib/blog-data";
import { readMinutesFromWordCount } from "@/lib/blog-data";

type BlogRelatedArticlesProps = {
  posts: BlogPostMeta[];
  wordCountBySlug: Record<string, number>;
};

export function BlogRelatedArticles({ posts, wordCountBySlug }: BlogRelatedArticlesProps) {
  if (posts.length === 0) return null;

  return (
    <section className="mt-12 border-t border-[var(--border)] pt-10" aria-labelledby="related-heading">
      <h2
        id="related-heading"
        className="text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]"
      >
        Related articles
      </h2>
      <ul className="mt-6 flex flex-col gap-4">
        {posts.map((p) => {
          const wc = wordCountBySlug[p.slug] ?? 200;
          const mins = p.readMinutesOverride ?? readMinutesFromWordCount(wc);
          return (
            <li key={p.slug}>
              <Link
                href={p.routePath}
                className="block rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-5 transition-colors hover:bg-[var(--bg-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                <span className="text-xs text-[var(--text-muted)]">
                  {mins} min read · {p.dateDisplay}
                </span>
                <span className="mt-2 block text-[18px] font-semibold text-[var(--text-primary)]">
                  {p.title}
                </span>
                <span className="mt-2 block text-sm text-[var(--accent)]">Read article →</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
