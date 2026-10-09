"use client";

import { useEffect } from "react";
import { startHandoverTourDevPreview } from "@/lib/handover-tour-dev";

declare global {
  interface Window {
    __handoverTourDevPreview?: () => void;
  }
}

/** Temporary dev-only control to verify driver.js theming on the Generate page. */
export function HandoverTourDevTrigger() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    window.__handoverTourDevPreview = () => {
      void startHandoverTourDevPreview();
    };
    return () => {
      delete window.__handoverTourDevPreview;
    };
  }, []);

  if (process.env.NODE_ENV !== "development") return null;

  return (
    <button
      type="button"
      onClick={() => void startHandoverTourDevPreview()}
      className="fixed bottom-4 left-4 z-[10001] rounded-lg border border-white/[0.08] bg-[var(--surface-2)] px-3 py-1.5 text-[length:var(--t-label)] font-medium uppercase tracking-wide text-[var(--text-muted)] shadow-[var(--shadow-sm)] transition-colors hover:text-[var(--text-secondary)]"
      aria-label="Preview product tour theme (development only)"
    >
      Tour preview
    </button>
  );
}
