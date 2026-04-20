import type { LucideIcon } from "lucide-react";
import Link from "next/link";

export type MarketingRelatedPageLink = {
  href: string;
  title: string;
  Icon: LucideIcon;
};

export function MarketingRelatedPages({
  links,
  heading = "Related pages",
}: {
  links: MarketingRelatedPageLink[];
  heading?: string;
}) {
  if (links.length === 0) return null;

  return (
    <section
      className="border-t border-[var(--border)]/80 bg-[var(--bg-secondary)] px-6 py-10 md:px-8 md:py-12"
      aria-labelledby="marketing-related-pages-heading"
    >
      <div className="mx-auto max-w-[900px]">
        <h2
          id="marketing-related-pages-heading"
          className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0EA5E9]"
        >
          {heading}
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {links.map(({ href, title, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex min-h-[4.25rem] gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-4 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(15,28,63,0.08)]"
              >
                <Icon className="size-5 shrink-0 text-[#0EA5E9]" strokeWidth={2} aria-hidden />
                <span className="min-w-0 text-sm font-medium leading-snug text-[var(--text-primary)] group-hover:text-[#0EA5E9]">
                  {title}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
