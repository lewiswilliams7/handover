import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPageShell({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] animate-in fade-in duration-300">
      <div className="h-2 w-full border-b border-[var(--border)] bg-[var(--bg-secondary)]" aria-hidden />
      <section className="px-6 py-12 md:px-8 md:py-20">
        <div className="mx-auto w-full max-w-[1100px] px-0">
          <div className="mx-auto w-full max-w-[680px]">
            <Link
              href="/"
              className="relative z-[1] mb-10 inline-flex items-center gap-2"
              style={{ textDecoration: "none" }}
            >
              <img
                src="/icon2.png"
                alt=""
                style={{
                  width: "28px",
                  height: "28px",
                  objectFit: "contain",
                  display: "block",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontWeight: 700,
                  fontSize: "15px",
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                }}
              >
                Handover
              </span>
            </Link>
            <article className="card-flat">
              <h1 className="text-[36px] font-bold text-[var(--text-primary)]">{title}</h1>
              <div className="mt-8 space-y-8 text-[15px] text-[var(--text-secondary)]" style={{ lineHeight: 1.8 }}>
                {children}
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
