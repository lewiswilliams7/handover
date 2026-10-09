"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase";
import { getPrefersReducedMotion } from "@/lib/prefers-reduced-motion";
import { cn } from "@/lib/utils";

const EXIT_KEY = "exit_intent_shown";

function marketingPaths(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/features" ||
    pathname === "/pricing" ||
    pathname === "/integrations" ||
    pathname === "/roadmap" ||
    pathname === "/compare"
  );
}

export function MarketingConversionClient() {
  const pathname = usePathname() ?? "";
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [exitOpen, setExitOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setSignedIn(Boolean(user));
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void supabase.auth.getUser().then(({ data: { user } }) => {
        setSignedIn(Boolean(user));
      });
    });
    return () => subscription.unsubscribe();
  }, []);

  const onDocLeave = useCallback(
    (e: MouseEvent) => {
      if (signedIn !== false) return;
      if (!marketingPaths(pathname)) return;
      if (typeof window === "undefined" || sessionStorage.getItem(EXIT_KEY) === "1") return;
      if (e.clientY > 0) return;
      sessionStorage.setItem(EXIT_KEY, "1");
      setExitOpen(true);
    },
    [pathname, signedIn],
  );

  useEffect(() => {
    if (signedIn !== false) return;
    if (!marketingPaths(pathname)) return;
    document.addEventListener("mouseleave", onDocLeave);
    return () => document.removeEventListener("mouseleave", onDocLeave);
  }, [onDocLeave, pathname, signedIn]);

  const reduceMotion = typeof window !== "undefined" && getPrefersReducedMotion();

  return (
    <>
      {exitOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 px-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-intent-title"
        >
          <div
            className={cn(
              "relative w-full max-w-md rounded-[var(--radius-lg)] border p-6 shadow-2xl md:p-8",
              !reduceMotion && "exit-intent-modal-enter",
            )}
            style={{
              background:
                "linear-gradient(135deg, rgba(83,74,183,0.06) 0%, rgba(56,189,248,0.06) 100%)",
              border: "1.5px solid rgba(83, 74, 183, 0.28)",
              boxShadow: "0 24px 48px -12px rgba(15, 23, 42, 0.35)",
            }}
          >
            <h2
              id="exit-intent-title"
              className="text-xl font-bold text-[var(--text-primary)] md:text-2xl"
            >
              Before you go -
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
              Connect HaloPSA or ConnectWise and generate client updates, logs, and Excel packs in seconds -
              pushed back to tickets on Handover. Run the free PSA scan before you buy.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Link
                href="/onboarding/connect"
                className="inline-flex flex-1 items-center justify-center rounded-[var(--radius)] bg-[var(--accent)] px-4 py-3 text-center text-sm font-semibold text-white shadow-md transition-[transform,box-shadow] hover:bg-[var(--accent-hover)] hover:shadow-lg active:scale-[0.95]"
                onClick={() => setExitOpen(false)}
              >
                Run the free PSA scan →
              </Link>
              <button
                type="button"
                className="rounded-[var(--radius)] px-4 py-3 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                onClick={() => setExitOpen(false)}
              >
                No thanks
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
