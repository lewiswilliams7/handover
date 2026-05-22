"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  companyName: string;
  onConfirm: (slug: string) => Promise<void>;
  onSkip: () => Promise<void>;
};

const SLUG_RE = /^[a-z0-9-]{3,30}$/;

function sanitizeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 30);
}

export function EnterprisePortalOnboarding({ open, companyName, onConfirm, onSkip }: Props) {
  const [slug, setSlug] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSlug("");
    setChecking(false);
    setAvailable(null);
    setSaving(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!SLUG_RE.test(slug)) {
      setChecking(false);
      setAvailable(null);
      return;
    }
    const timer = window.setTimeout(() => {
      void (async () => {
        setChecking(true);
        try {
          const res = await fetch(`/api/portal/check-slug?slug=${encodeURIComponent(slug)}`, {
            credentials: "same-origin",
          });
          const data = (await res.json()) as { available?: boolean };
          setAvailable(res.ok ? data.available === true : false);
        } catch {
          setAvailable(false);
        } finally {
          setChecking(false);
        }
      })();
    }, 500);
    return () => window.clearTimeout(timer);
  }, [slug, open]);

  const slugValid = useMemo(() => SLUG_RE.test(slug), [slug]);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="enterprise-portal-title"
    >
      <div className="w-full max-w-[560px] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[#0f1a2d] p-6 sm:p-8">
        <h2 id="enterprise-portal-title" className="text-xl font-bold text-[var(--text-primary)] sm:text-2xl">
          Choose your portal URL
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-secondary)]">
          Your Enterprise portal will live at a unique URL. You can skip this now and set it later in settings.
        </p>

        <div className="mt-6 space-y-2">
          <label className="text-[12px] font-medium text-[var(--text-secondary)]">Portal slug</label>
          <div className="flex items-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2">
            <span className="mr-2 shrink-0 text-[12px] text-[var(--text-muted)]">gethandover.uk/portal/</span>
            <input
              value={slug}
              onChange={(e) => setSlug(sanitizeSlug(e.target.value))}
              placeholder="your-msp"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text-primary)] outline-none"
            />
            {checking ? <Loader2 className="ml-2 size-4 animate-spin text-[#0EA5E9]" /> : null}
            {!checking && available === true ? <Check className="ml-2 size-4 text-green-400" /> : null}
            {!checking && available === false && slugValid ? <X className="ml-2 size-4 text-red-400" /> : null}
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            Lowercase letters, numbers, and hyphens only. 3-30 characters.
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            className="self-end text-[12px] text-[var(--text-muted)] underline-offset-4 hover:text-[var(--text-primary)] hover:underline sm:self-center"
            onClick={() => void onSkip()}
          >
            Skip for now
          </button>
          <Button
            type="button"
            className={cn("bg-[#0EA5E9] font-semibold text-white hover:bg-[#0284C7]")}
            disabled={!slugValid || available !== true || saving}
            onClick={() => {
              void (async () => {
                setSaving(true);
                try {
                  await onConfirm(slug);
                } finally {
                  setSaving(false);
                }
              })();
            }}
          >
            {saving ? "Saving..." : "Confirm portal URL"}
          </Button>
        </div>

        <p className="mt-3 text-[11px] text-[var(--text-muted)]">
          {companyName ? `Portal name will default to "${companyName}".` : "Portal display name will use your profile company name when available."}
        </p>
      </div>
    </div>
  );
}
