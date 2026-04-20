export function BlogAuthorSection() {
  return (
    <aside
      className="mt-12 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] p-6"
      aria-labelledby="blog-author-heading"
    >
      <h2
        id="blog-author-heading"
        className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]"
      >
        About the author
      </h2>
      <p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">Lewis Williams</p>
      <p className="text-sm text-[var(--text-secondary)]">Founder of Handover</p>
      <p className="mt-3 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
        TPM at an MSP by day, building Handover to fix the problem he lives every week.
      </p>
    </aside>
  );
}
