import Link from "next/link";

type BlogBackLinkProps = {
  className?: string;
};

export function BlogBackLink({ className = "" }: BlogBackLinkProps) {
  return (
    <Link
      href="/blog"
      className={`inline-flex rounded-[var(--radius)] text-sm font-medium text-[var(--accent)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${className}`}
    >
      ← Back to blog
    </Link>
  );
}
