"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { X } from "lucide-react";

import { useToast } from "@/components/toasts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildSuggestionAnchors,
  SMART_ACTIONS_INSUFFICIENT_MSG,
  smartActionDisplayTitle,
  suggestionMatchesAnchors,
  type SmartActionAnchors,
  type SmartActionSuggestion,
} from "@/lib/smart-actions";

const MIN_LOAD_MS = 1200;

type Props = {
  open: boolean;
  onClose: () => void;
  focusRing: string;
  reportContext: string;
  resultSnapshot: {
    actions: { task?: string | null; client_name?: string | null }[];
    client_email: string;
    summary: string;
    status_report: string;
  };
  projectName: string;
  onDoEmail: (suggestion: SmartActionSuggestion) => void | Promise<void>;
  onDoPushHalo: () => void;
  onDoSchedule: () => void;
  onDoSlack: () => Promise<void>;
};

type Row = SmartActionSuggestion & { id: string };

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function SmartActionsPanel({
  open,
  onClose,
  focusRing,
  reportContext,
  resultSnapshot,
  projectName,
  onDoEmail,
  onDoPushHalo,
  onDoSchedule,
  onDoSlack,
}: Props) {
  const toast = useToast();
  const titleId = useId();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [contextError, setContextError] = useState<string | null>(null);
  const [slackSending, setSlackSending] = useState(false);
  const [manualDone, setManualDone] = useState<Set<string>>(() => new Set());

  const anchors: SmartActionAnchors | null = useMemo(
    () => buildSuggestionAnchors(projectName, resultSnapshot),
    [projectName, resultSnapshot],
  );

  const resetLocal = useCallback(() => {
    setLoading(false);
    setRows([]);
    setContextError(null);
    setSlackSending(false);
    setManualDone(new Set());
  }, []);

  useEffect(() => {
    if (!open) {
      resetLocal();
      return;
    }
    if (!anchors) {
      setContextError(SMART_ACTIONS_INSUFFICIENT_MSG);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setContextError(null);
    setRows([]);

    void (async () => {
      const minWait = delay(MIN_LOAD_MS);
      try {
        const res = await fetch("/api/generation/smart-actions-suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ reportContext }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          suggestions?: SmartActionSuggestion[];
          error?: string;
        };
        await minWait;
        if (cancelled) return;
        if (!res.ok) {
          setContextError(
            typeof data.error === "string" && data.error.trim()
              ? data.error
              : "Could not load suggestions.",
          );
          return;
        }
        const raw = Array.isArray(data.suggestions) ? data.suggestions : [];
        const withIds: Row[] = raw.map((s) => ({
          ...s,
          id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `${s.action}-${Math.random().toString(36).slice(2)}`,
        }));
        const anchored = withIds.filter((s) => suggestionMatchesAnchors(s, anchors));
        if (anchored.length === 0) {
          setContextError(SMART_ACTIONS_INSUFFICIENT_MSG);
          return;
        }
        setRows(anchored);
      } catch {
        await minWait;
        if (!cancelled) {
          setContextError("Could not load suggestions.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, reportContext, anchors, resetLocal]);

  useEffect(() => {
    if (!open || loading) return;
    if (contextError !== SMART_ACTIONS_INSUFFICIENT_MSG) return;
    const t = window.setTimeout(() => onClose(), 2200);
    return () => window.clearTimeout(t);
  }, [open, loading, contextError, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const dismissRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const runSlack = async () => {
    setSlackSending(true);
    try {
      await onDoSlack();
      toast({ message: "Slack notification sent", durationMs: 2800 });
    } catch (e) {
      toast({
        message: e instanceof Error ? e.message : "Slack notification failed",
        variant: "error",
        durationMs: 5000,
      });
    } finally {
      setSlackSending(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[96] flex justify-end bg-black/35"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "flex h-full w-full max-w-md animate-in slide-in-from-right-4 duration-200 flex-col border-l border-[var(--border)] bg-[var(--bg-primary)] shadow-xl",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3">
          <h2 id={titleId} className="min-w-0 flex-1 text-[15px] font-semibold text-[var(--text-primary)]">
            Suggested next steps
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-[var(--radius)] text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]",
              focusRing,
            )}
            aria-label="Close"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-3 py-6">
              <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--border)]" />
              <div className="h-24 animate-pulse rounded-lg bg-[var(--border)]/50" />
              <div className="h-24 animate-pulse rounded-lg bg-[var(--border)]/50" />
            </div>
          ) : null}

          {!loading && contextError ? (
            <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">{contextError}</p>
          ) : null}

          {!loading && !contextError && rows.length === 0 ? (
            <p className="text-[13px] text-[var(--text-muted)]">No suggestions to show.</p>
          ) : null}

          {!loading && !contextError ? (
            <ul className="space-y-3">
              {rows.map((row) => {
                const headline = smartActionDisplayTitle(row);
                return (
                  <li
                    key={row.id}
                    className="relative flex gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] p-3 pr-3 shadow-sm"
                  >
                    <div className="min-w-0 flex-1 pr-1">
                      <p className="text-[13px] font-bold leading-snug text-[var(--text-primary)]">
                        {headline}
                      </p>
                      <p className="mt-1 text-[12px] leading-snug text-[var(--text-muted)]">
                        {row.description}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end justify-center gap-2 sm:flex-row sm:items-center">
                      {row.type === "manual" ? (
                        <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                          <input
                            type="checkbox"
                            className={cn("size-4 rounded border-[var(--border)]", focusRing)}
                            checked={manualDone.has(row.id)}
                            onChange={(e) => {
                              setManualDone((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(row.id);
                                else next.delete(row.id);
                                return next;
                              });
                            }}
                          />
                          Done
                        </label>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          className={cn(
                            "whitespace-nowrap bg-[var(--accent)] px-3 text-white hover:bg-[var(--accent-hover)]",
                            focusRing,
                          )}
                          disabled={slackSending && row.type === "slack"}
                          onClick={() => {
                            if (row.type === "email") {
                              onClose();
                              void onDoEmail(row);
                            } else if (row.type === "push_to_halo") {
                              onClose();
                              onDoPushHalo();
                            } else if (row.type === "schedule") {
                              onClose();
                              onDoSchedule();
                            } else if (row.type === "slack") {
                              void runSlack();
                            }
                          }}
                        >
                          {row.type === "slack" && slackSending ? "Sending…" : "Do it →"}
                        </Button>
                      )}
                      <button
                        type="button"
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-[var(--radius)] text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]",
                          focusRing,
                        )}
                        aria-label="Dismiss suggestion"
                        onClick={() => dismissRow(row.id)}
                      >
                        <X className="size-4" aria-hidden />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
