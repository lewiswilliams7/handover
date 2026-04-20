"use client";

import confetti from "canvas-confetti";
import { Check, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

const LS_ALL_DONE_DISMISS = "handover_checklist_all_done_dismiss";
const LS_MANUAL_DISMISS_PREFIX = "handover_checklist_manual_dismiss";

export function gettingStartedManualDismissStorageKey(scope: string) {
  const safe = scope.trim() || "default";
  return `${LS_MANUAL_DISMISS_PREFIX}:${safe}`;
}

/** Clears persisted dismiss flags so the checklist can show again after the user explicitly reopens it. */
export function clearGettingStartedChecklistStorage(scope: string) {
  try {
    window.localStorage.removeItem(gettingStartedManualDismissStorageKey(scope));
    window.localStorage.removeItem(LS_ALL_DONE_DISMISS);
  } catch {
    /* ignore */
  }
}

export type ChecklistStepDef = {
  id: string;
  label: string;
  description: string;
  cta: string;
  onCta: () => void;
  done: boolean;
};

type Props = {
  steps: ChecklistStepDef[];
  /** Used to scope manual-dismiss storage (e.g. signed-in email). */
  storageScope: string;
};

export function GettingStartedChecklistWidget({ steps, storageScope }: Props) {
  const [hydrated, setHydrated] = useState(false);
  const [manuallyDismissed, setManuallyDismissed] = useState(false);
  const [celebrationDismissed, setCelebrationDismissed] = useState(false);
  const [open, setOpen] = useState(false);
  const [panelExiting, setPanelExiting] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const prevAllDoneRef = useRef<boolean | null>(null);
  const prevDoneByIdRef = useRef<Record<string, boolean>>({});
  const [morphStepId, setMorphStepId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const manualKey = gettingStartedManualDismissStorageKey(storageScope);
      setManuallyDismissed(window.localStorage.getItem(manualKey) === "true");
      setCelebrationDismissed(window.localStorage.getItem(LS_ALL_DONE_DISMISS) === "true");
    } catch {
      setManuallyDismissed(false);
      setCelebrationDismissed(false);
    } finally {
      setHydrated(true);
    }
  }, [storageScope]);

  const doneCount = steps.filter((s) => s.done).length;
  const total = steps.length;
  const allDone = total > 0 && doneCount === total;

  useEffect(() => {
    const prev = prevAllDoneRef.current;
    prevAllDoneRef.current = allDone;
    if (prev === null) return undefined;
    if (allDone && !prev) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.85, x: 0.9 },
        colors: ["#34d399", "#38bdf8", "#a78bfa"],
      });
    }
    return undefined;
  }, [allDone]);

  useEffect(() => {
    let t: number | undefined;
    for (const s of steps) {
      const was = prevDoneByIdRef.current[s.id];
      if (was === false && s.done) {
        setMorphStepId(s.id);
        t = window.setTimeout(() => setMorphStepId(null), 500) as unknown as number;
        break;
      }
    }
    for (const s of steps) {
      prevDoneByIdRef.current[s.id] = s.done;
    }
    return () => {
      if (t) window.clearTimeout(t);
    };
  }, [steps]);

  const beginClosePanel = useCallback(() => {
    setPanelExiting(true);
    window.setTimeout(() => {
      setOpen(false);
      setPanelExiting(false);
    }, 150);
  }, []);

  const dismissWidgetPermanently = useCallback(() => {
    try {
      window.localStorage.setItem(gettingStartedManualDismissStorageKey(storageScope), "true");
    } catch {
      /* ignore */
    }
    setManuallyDismissed(true);
    setOpen(false);
    setPanelExiting(false);
  }, [storageScope]);

  useEffect(() => {
    if (!open || panelExiting) return;
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      beginClosePanel();
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open, panelExiting, beginClosePanel]);

  const dismissAfterAllComplete = useCallback(() => {
    try {
      window.localStorage.setItem(LS_ALL_DONE_DISMISS, "true");
    } catch {
      /* ignore */
    }
    setCelebrationDismissed(true);
    setOpen(false);
    setPanelExiting(false);
  }, []);

  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const pillStyle = useMemo(() => {
    if (allDone) {
      return {
        background: "linear-gradient(135deg, #059669, #10b981)",
        color: "#fff",
        boxShadow:
          "0 4px 24px rgba(16,185,129,0.4), 0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
      } as const;
    }
    return {
      background: "linear-gradient(135deg, #1e40af, #0ea5e9)",
      color: "#fff",
      border: "none",
      boxShadow:
        "0 4px 24px rgba(14, 165, 233, 0.4), 0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
    } as const;
  }, [allDone]);

  if (!hydrated) return null;
  if (manuallyDismissed) return null;
  if (allDone && celebrationDismissed) return null;

  return createPortal(
    <div
      ref={rootRef}
      className="pointer-events-none flex flex-col items-end gap-3"
      style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999 }}
    >
      {(open || panelExiting) && (
        <div
          className={cn(
            "pointer-events-auto w-[320px] overflow-hidden rounded-[20px]",
            panelExiting ? "gs-popover-exit" : "gs-popover-enter",
          )}
          style={{
            background: "#0f1623",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow:
              "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), 0 0 60px rgba(14,165,233,0.08)",
          }}
          role="dialog"
          aria-label="Getting started checklist"
        >
          {allDone ? (
            <div className="flex flex-col items-center px-5 py-8 text-center">
              <span
                className="mb-4 flex size-10 items-center justify-center rounded-full text-white"
                style={{
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  boxShadow: "0 0 20px rgba(16,185,129,0.45)",
                }}
                aria-hidden
              >
                <Check className="size-6" strokeWidth={3} />
              </span>
              <h2 className="text-base font-bold text-white">You&apos;re all set!</h2>
              <p className="mt-2 text-xs leading-relaxed text-[rgba(255,255,255,0.45)]">
                You&apos;ve completed all the getting started steps. Welcome to Handover.
              </p>
              <button
                type="button"
                onClick={dismissAfterAllComplete}
                className="mt-5 text-sm font-semibold text-[#38bdf8] hover:underline"
              >
                Dismiss →
              </button>
            </div>
          ) : (
            <>
              <div
                className="border-b border-[rgba(255,255,255,0.06)] px-5 pt-5 pb-4"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(14,165,233,0.15), rgba(30,64,175,0.1))",
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold tracking-[0.15em] text-[#38bdf8]">
                      HANDOVER
                    </p>
                    <h2 className="mt-1 text-base font-bold text-white">Getting started</h2>
                    <p className="mt-1 text-xs text-[rgba(255,255,255,0.4)]">
                      Complete these steps to get the most out of Handover
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg p-1 text-[rgba(255,255,255,0.45)] transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="Dismiss checklist"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={dismissWidgetPermanently}
                  >
                    <X className="size-5" aria-hidden />
                  </button>
                </div>
                <div
                  className="mt-3.5 h-[3px] overflow-hidden rounded-full"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <div
                    className="gs-checklist-progress-fill h-full rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-[rgba(255,255,255,0.4)]">
                  {doneCount} of {total} complete
                </p>
              </div>

              <ul className="max-h-[min(340px,calc(100vh-220px))] overflow-y-auto">
                {steps.map((s) => (
                  <li
                    key={s.id}
                    className={cn(
                      "flex cursor-default items-start gap-3 border-b border-[rgba(255,255,255,0.04)] px-5 py-3.5 transition-[background] duration-150 ease-out",
                      !s.done && "hover:bg-[rgba(255,255,255,0.02)]",
                    )}
                  >
                    <div className="shrink-0 pt-0.5">
                      {s.done ? (
                        <span
                          className={cn(
                            "flex size-5 items-center justify-center rounded-full text-white",
                            morphStepId === s.id && "gs-step-icon-morph",
                          )}
                          style={{
                            background: "linear-gradient(135deg, #10b981, #059669)",
                            boxShadow: "0 0 12px rgba(16,185,129,0.4)",
                          }}
                          aria-hidden
                        >
                          <Check className="size-3" strokeWidth={3} />
                        </span>
                      ) : (
                        <span
                          className="block size-5 shrink-0 rounded-full border-[1.5px] border-[rgba(255,255,255,0.15)] bg-transparent"
                          aria-hidden
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-[13px] font-medium transition-[color,opacity] duration-300",
                          s.done
                            ? "text-[rgba(255,255,255,0.35)] line-through"
                            : "text-[rgba(255,255,255,0.85)]",
                        )}
                      >
                        {s.label}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[rgba(255,255,255,0.3)]">
                        {s.description}
                      </p>
                    </div>
                    {!s.done ? (
                      <button
                        type="button"
                        onClick={() => {
                          s.onCta();
                          beginClosePanel();
                        }}
                        className="ml-auto shrink-0 rounded-full border border-[rgba(56,189,248,0.2)] bg-[rgba(56,189,248,0.1)] px-2 py-0.5 text-[11px] font-semibold text-[#38bdf8] transition-all duration-150 ease-out hover:border-[rgba(56,189,248,0.4)] hover:bg-[rgba(56,189,248,0.2)]"
                      >
                        {s.cta}
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>

              <div
                className="flex items-center justify-between border-t border-[rgba(255,255,255,0.04)] px-5 py-3"
                style={{ background: "rgba(0,0,0,0.2)" }}
              >
                <div className="min-w-0 text-[12px] text-[rgba(255,255,255,0.3)]">
                  Need help?{" "}
                  <Link
                    href="/integrations/halopsa"
                    className="font-medium text-[#38bdf8] hover:underline"
                  >
                    View docs →
                  </Link>
                </div>
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={dismissWidgetPermanently}
                  className="shrink-0 text-[12px] text-[rgba(255,255,255,0.2)] transition-colors hover:text-[rgba(255,255,255,0.45)]"
                >
                  Hide
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          if (open && !panelExiting) beginClosePanel();
          else if (!open && !panelExiting) setOpen(true);
        }}
        className={cn(
          "gs-checklist-pill pointer-events-auto flex items-center gap-2 rounded-[999px] font-semibold text-white",
          allDone && "gs-checklist-pill--done",
        )}
        style={{
          ...pillStyle,
          padding: "12px 20px",
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          backdropFilter: "none",
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {allDone ? (
          <>
            <Sparkles className="size-4 shrink-0" aria-hidden />
            <span>You&apos;re all set</span>
          </>
        ) : (
          <>
            <span>Getting started</span>
            <span
              className="inline-flex items-center rounded-full border border-[rgba(255,255,255,0.3)] px-2 py-0.5 text-[11px] font-bold tabular-nums text-white"
              style={{ background: "rgba(255,255,255,0.2)" }}
            >
              {doneCount}/{total}
            </span>
          </>
        )}
      </button>
    </div>,
    document.body,
  );
}
