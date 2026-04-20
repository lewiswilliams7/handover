import type { ReactNode } from "react";

const heroGlowStyle = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  height: "500px",
  background:
    "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(56,189,248,0.07) 0%, transparent 65%)",
  pointerEvents: "none" as const,
  zIndex: 0,
};

const pageGradientStyle = {
  minHeight: "100vh",
  background:
    "linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 60%, var(--bg-primary) 100%)",
};

/** Marketing pages: gradient page background + top accent glow. Content sits above the glow. */
export function MarketingPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative animate-in fade-in duration-300" style={pageGradientStyle}>
      <div aria-hidden style={heroGlowStyle} />
      <div className="relative z-[1] min-h-screen">{children}</div>
    </div>
  );
}

/** Blog article: flat reading surface + same hero glow for consistency. */
export function ArticleReadingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen animate-in fade-in duration-300 bg-[var(--bg-primary)]">
      <div aria-hidden style={heroGlowStyle} />
      <div className="relative z-[1] min-h-screen">{children}</div>
    </div>
  );
}
