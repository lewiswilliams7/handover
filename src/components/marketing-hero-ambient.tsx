"use client";

import { cn } from "@/lib/utils";

type MarketingHeroAmbientProps = {
  className?: string;
};

/**
 * Drifting gradient orbs + dot grid (same as homepage hero).
 * Place inside a `relative overflow-hidden` section; content should use `relative z-10` (or z-[1]) above this layer.
 */
export function MarketingHeroAmbient({ className }: MarketingHeroAmbientProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-0 min-h-0 overflow-hidden",
        className,
      )}
      aria-hidden
    >
      <div className="home-hero-drift-layer">
        <div className="home-hero-drift-orb--a" />
        <div className="home-hero-drift-orb--b" />
      </div>
      <div className="home-hero-dot-overlay" />
    </div>
  );
}
