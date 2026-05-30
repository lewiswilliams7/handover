import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4 border-b border-white/[0.06] pb-5">
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mono-label mb-1.5 text-[var(--accent)]">{eyebrow}</div>
        ) : null}
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-white/96">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-[14px] leading-relaxed text-white/65">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="mt-1 flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
