"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";

import { HistoryChatsPanel } from "@/components/history-chats-panel";
import { cn } from "@/lib/utils";

type ModalProps = React.ComponentProps<typeof HistoryChatsPanel>;

export type ChatsModalProps = ModalProps & {
  open: boolean;
  onClose: () => void;
};

export function ChatsModal({ open, onClose, ...panelProps }: ChatsModalProps) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) {
      const t = window.setTimeout(() => setSearch(""), 0);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chats-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-[rgba(0,0,0,0.6)] backdrop-blur-sm"
        aria-label="Close chats"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 flex h-full w-[360px] max-w-[100vw] flex-col border-r border-[var(--accent)]/35 bg-[var(--bg-secondary)] shadow-2xl",
          "animate-in slide-in-from-left duration-200",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
          <h2
            id="chats-modal-title"
            className="text-[15px] font-semibold text-[var(--text-primary)]"
          >
            Chats
          </h2>
          <button
            type="button"
            className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius)] text-[var(--text-muted)] transition-colors hover:bg-[var(--border)]/40 hover:text-[var(--text-primary)]"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="shrink-0 border-b border-[var(--border)] px-3 py-2.5">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-muted)]"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search generations..."
              className="h-9 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] py-2 pl-8 pr-3 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-0"
              aria-label="Search generations"
            />
          </div>
        </div>
        <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-4 pt-2 md:overscroll-auto">
          <HistoryChatsPanel
            {...panelProps}
            searchQuery={search.trim().toLowerCase()}
            onAfterSelectGeneration={onClose}
          />
        </div>
      </div>
    </div>
  );
}
