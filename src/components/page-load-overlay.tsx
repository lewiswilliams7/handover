"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { useProfileBrandingNav } from "@/hooks/use-profile-branding-nav";
import { cn } from "@/lib/utils";

type Phase = "idle" | "show" | "leaving";

const FADE_MS = 280;
const HARD_MAX_MS = 1500;

export function PageLoadOverlay() {
  const pathname = usePathname();
  const { brandLogoUrl, whiteLabelMode, loaded } = useProfileBrandingNav();
  const [hydrated, setHydrated] = useState(false);
  const [phase, setPhase] = useState<Phase>("show");

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setPhase("show");
    let cancelled = false;
    const pending: number[] = [];

    const leave = () => {
      if (cancelled) return;
      setPhase("leaving");
      pending.push(
        window.setTimeout(() => {
          if (!cancelled) setPhase("idle");
        }, FADE_MS),
      );
    };

    const kick = () => {
      if (cancelled) return;
      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(() => leave(), { timeout: 450 });
      } else {
        leave();
      }
    };

    pending.push(
      window.setTimeout(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(kick);
        });
      }, 48),
    );

    const hardMax = window.setTimeout(leave, HARD_MAX_MS);

    return () => {
      cancelled = true;
      clearTimeout(hardMax);
      pending.forEach((id) => clearTimeout(id));
    };
  }, [pathname, hydrated]);

  if (!hydrated || phase === "idle") {
    return null;
  }

  const usePartnerLogo = loaded && whiteLabelMode && brandLogoUrl.length > 0;
  const logoSrc = usePartnerLogo ? brandLogoUrl : "/icon2.png";

  return (
    <div
      className={cn(
        "page-load-overlay",
        phase === "leaving" && "page-load-overlay--leaving",
      )}
      aria-hidden={phase === "leaving"}
    >
      <img
        src={logoSrc}
        alt=""
        className="page-load-overlay__logo"
        width={48}
        height={48}
      />
    </div>
  );
}
