"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ToastVariant = "success" | "error" | "achievement";

export type ToastInput = {
  message: string;
  subtitle?: string;
  variant?: ToastVariant;
  durationMs?: number;
  /** Optional action (e.g. “Try again”) - extends visibility when omitted durationMs. */
  action?: { label: string; onClick: () => void };
};

type ToastItem = ToastInput & { id: number; variant: ToastVariant };

const ToastContext = createContext<((t: ToastInput) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const pushToast = useCallback((input: ToastInput) => {
    const id = ++idRef.current;
    const variant = input.variant ?? "success";
    const durationMs =
      input.durationMs ??
      (variant === "achievement"
        ? 4000
        : input.action
          ? 12000
          : variant === "error"
            ? 4500
            : 3000);
    const item: ToastItem = { ...input, id, variant };
    setToasts((prev) => [...prev, item]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, durationMs);
  }, []);

  return (
    <ToastContext.Provider value={pushToast}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex max-h-[min(50vh,20rem)] w-[min(calc(100vw-2rem),22rem)] flex-col gap-2 overflow-y-auto"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              "pointer-events-auto animate-in fade-in duration-200",
              t.variant === "achievement"
                ? "slide-in-from-bottom-4"
                : "slide-in-from-right-4",
              "rounded-lg border px-4 py-3 text-sm shadow-lg",
              t.variant === "achievement"
                ? "border border-zinc-600/80 border-l-[4px] border-l-amber-400/95 bg-zinc-900 text-zinc-50 shadow-xl"
                : t.variant === "success"
                  ? "border-emerald-700/30 bg-emerald-600 text-white dark:border-emerald-500/40"
                  : "border-red-800/40 bg-red-600 text-white dark:border-red-500/40",
            ].join(" ")}
          >
            <p
              className={
                t.variant === "achievement"
                  ? "font-bold leading-snug tracking-tight"
                  : "font-medium leading-snug"
              }
            >
              {t.message}
            </p>
            {t.subtitle ? (
              <p
                className={
                  t.variant === "achievement"
                    ? "mt-1.5 text-[13px] leading-snug text-zinc-300"
                    : "mt-1 text-xs leading-snug opacity-95"
                }
              >
                {t.subtitle}
              </p>
            ) : null}
            {t.action ? (
              <button
                type="button"
                className="mt-2 rounded-md bg-white/20 px-3 py-1.5 text-xs font-semibold text-white underline-offset-2 hover:bg-white/30 hover:underline"
                onClick={() => {
                  t.action?.onClick();
                }}
              >
                {t.action.label}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): (t: ToastInput) => void {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
