"use client";

import { useEffect, useRef } from "react";
import { ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { celebrateFirstGeneration } from "@/lib/first-gen-celebration";
import { cn } from "@/lib/utils";

const LS_FIRST_GEN_CELEBRATED = "handover_first_gen_celebrated";

type Props = {
  open: boolean;
  onClose: () => void;
  onViewReport: () => void;
  onScheduleReport: () => void;
  onPushToHalo: () => void;
  onExportExcel: () => void | Promise<void>;
};

export function FirstGenerationCelebrationModal({
  open,
  onClose,
  onViewReport,
  onScheduleReport,
  onPushToHalo,
  onExportExcel,
}: Props) {
  const firedConfetti = useRef(false);

  useEffect(() => {
    if (!open) {
      firedConfetti.current = false;
      return;
    }
    try {
      window.localStorage.setItem(LS_FIRST_GEN_CELEBRATED, "true");
    } catch {
      /* ignore */
    }
    if (!firedConfetti.current) {
      firedConfetti.current = true;
      void celebrateFirstGeneration();
    }
  }, [open]);

  if (!open) return null;

  const stepRow = (
    emoji: string,
    title: string,
    sub: string,
    onSelect: () => void,
  ) => (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-[var(--radius)] border border-transparent px-2 py-2 text-left transition-colors",
        "hover:border-[var(--border)] hover:bg-[var(--bg-secondary)]/80",
      )}
    >
      <span className="shrink-0 text-base leading-none" aria-hidden>
        {emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[var(--text-primary)]">{title}</p>
        <p className="text-[12px] text-[var(--text-muted)]">{sub}</p>
      </div>
      <span
        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--accent)]"
        aria-hidden
      >
        <ChevronRight className="size-4" />
      </span>
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-[rgba(0,0,0,0.7)] p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-gen-celebration-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Dismiss"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-[420px] rounded-[var(--radius-lg)] border border-[var(--accent)] bg-[var(--bg-primary)] p-8"
        style={{ boxShadow: "0 0 60px rgba(var(--accent-rgb), 0.15)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="mx-auto flex size-16 items-center justify-center text-[64px] leading-none motion-safe:animate-bounce"
          aria-hidden
        >
          🎉
        </div>
        <h2
          id="first-gen-celebration-title"
          className="mt-2 bg-gradient-to-r from-[var(--accent)] via-sky-300 to-violet-300 bg-clip-text text-center text-2xl font-extrabold text-transparent"
        >
          Your first report is ready
        </h2>
        <p className="mt-4 text-center text-[15px] leading-relaxed text-[var(--text-secondary)]">
          You just saved yourself around 30 minutes of manual work.
          <br />
          That&apos;s what Handover does - every single time.
        </p>
        <div className="my-6 h-px w-full bg-[var(--border)]" />
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Next steps
        </p>
        <div className="space-y-1 text-left text-[13px]">
          {stepRow("⚡", "Set up a scheduled report", "Automate this every week", onScheduleReport)}
          {stepRow("📤", "Push to HaloPSA", "Post outputs back to your tickets", onPushToHalo)}
          {stepRow("📊", "Export to Excel", "Download your action log", () => {
            void onExportExcel();
          })}
        </div>
        <Button
          type="button"
          className="mt-6 h-11 w-full bg-[var(--accent)] text-[15px] font-semibold text-white hover:bg-[var(--accent-hover)]"
          onClick={() => {
            onViewReport();
            onClose();
          }}
        >
          View my report →
        </Button>
        <button
          type="button"
          className="mt-4 w-full text-center text-[13px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          onClick={onClose}
        >
          I&apos;ll explore later
        </button>
      </div>
    </div>
  );
}
