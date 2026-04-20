"use client";

import { useCallback, useState } from "react";
import { useToast } from "@/components/toasts";

export function ShareArticleActions() {
  const toast = useToast();
  const [isCopying, setIsCopying] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      setIsCopying(true);
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      toast({ message: "Link copied", durationMs: 2000 });
    } catch (e) {
      console.error("[share] copy failed:", e);
      toast({ message: "Could not copy link", variant: "error", durationMs: 3000 });
    } finally {
      setIsCopying(false);
    }
  }, [toast]);

  const handleShareLinkedIn = useCallback(() => {
    const url = window.location.href;
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      url,
    )}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  }, []);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-[var(--text-secondary)]">Share this article</div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleShareLinkedIn}
          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
        >
          Share on LinkedIn
        </button>
        <button
          type="button"
          onClick={() => void handleCopy()}
          disabled={isCopying}
          className="rounded-[var(--radius)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
        >
          {isCopying ? "Copying…" : "Copy link"}
        </button>
      </div>
    </div>
  );
}

