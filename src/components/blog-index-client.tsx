"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CardMouseSpotlight } from "@/components/card-mouse-spotlight";
import { ScrollRevealItem } from "@/components/scroll-reveal-item";
import type { BlogFilterId, BlogPostMeta } from "@/lib/blog-data";
import { BLOG_FILTER_OPTIONS, postMatchesFilter } from "@/lib/blog-data";

export type BlogIndexPost = BlogPostMeta & { readMins: number };

type BlogIndexClientProps = {
  posts: BlogIndexPost[];
};

export function BlogIndexClient({ posts }: BlogIndexClientProps) {
  const [filter, setFilter] = useState<BlogFilterId>("all");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      if (!postMatchesFilter(p, filter)) return false;
      if (!q) return true;
      const hay = `${p.title} ${p.description}`.toLowerCase();
      return hay.includes(q);
    });
  }, [posts, filter, query]);

  return (
    <>
      <div className="mx-auto max-w-[720px]">
        <label htmlFor="blog-search" className="sr-only">
          Search articles
        </label>
        <input
          id="blog-search"
          type="search"
          placeholder="Search articles…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          autoComplete="off"
        />
        <div
          className="mt-4 flex flex-wrap gap-2"
          role="group"
          aria-label="Filter by topic"
        >
          {BLOG_FILTER_OPTIONS.map(({ id, label }) => {
            const active = filter === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                aria-pressed={active}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                  active
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-[720px]">
        {visible.length === 0 ? (
          <p className="text-center text-[16px] text-[var(--text-secondary)]">
            No articles match your filters.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {visible.map((p, index) => (
              <ScrollRevealItem key={p.slug} index={index} className="block">
                <CardMouseSpotlight className="integration-card-glass rounded-[var(--radius-lg)] border border-[var(--border)]/80 p-6 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    {p.featured ? (
                      <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-800 ring-1 ring-amber-500/35 dark:text-amber-200 dark:ring-amber-400/30">
                        Featured
                      </span>
                    ) : null}
                    {p.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-[var(--accent)]/15 px-3 py-1 text-xs font-semibold text-[var(--accent)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
                    <span>{p.readMins} min read</span>
                    <span>{p.dateDisplay}</span>
                    <span>{p.author}</span>
                  </div>
                  <h2 className="mt-4 text-[22px] font-semibold leading-snug text-[var(--text-primary)] sm:text-[24px]">
                    <Link
                      href={p.routePath}
                      className="hover:text-[var(--accent)] focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                    >
                      {p.title}
                    </Link>
                  </h2>
                  <p className="mt-2 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
                    {p.description}
                  </p>
                  <div className="mt-6">
                    <Link
                      href={p.routePath}
                      className="inline-flex text-sm font-semibold text-[var(--accent)] underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                    >
                      Read article →
                    </Link>
                  </div>
                </CardMouseSpotlight>
              </ScrollRevealItem>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
