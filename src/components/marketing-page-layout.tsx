import type { ReactNode } from "react";

const heroGlowStyle = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  height: "500px",
  background: "transparent",
  pointerEvents: "none" as const,
  zIndex: 0,
};

const pageGradientStyle = {
  minHeight: "100vh",
  background: "transparent",
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
    <div className="relative min-h-screen animate-in fade-in duration-300 bg-transparent">
      <div aria-hidden style={heroGlowStyle} />
      <div className="relative z-[1] min-h-screen">{children}</div>
    </div>
  );
}
