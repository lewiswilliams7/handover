"use client";

import { ArrowRight, Check, Loader2, Mail, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

/** Configuration → Clients: where the client list gets corrected. */
export function ClientsConfigSection() {
  return (
    <div className="space-y-4">
      <ConfigCard
        title="Monthly values and internal clients"
        body="If your PSA has no contract value for a client, add what they pay so they count towards Revenue at Risk, Client Margin and Renewal Radar. Mark your own company, test clients or anyone you don't bill as not a client, and they drop out of every page."
        href="/margin#values"
        cta="Open the client list"
      />
      <ConfigCard
        title="Every client, one page each"
        body="Tickets, people, margin, renewal and the next step for each client."
        href="/clients"
        cta="Go to Clients"
      />
    </div>
  );
}

/** Configuration → Emails: what Handover sends, and to whom. */
export function EmailsConfigSection() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [state, setState] = useState<"loading" | "idle" | "saving" | "saved" | "error" | "unavailable">("loading");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/monday-brief", { cache: "no-store" })
      .then(async (response) => {
        if (cancelled) return;
        if (response.status === 503) {
          setState("unavailable");
          return;
        }
        const body = (await response.json().catch(() => null)) as { ok?: boolean; enabled?: boolean } | null;
        if (!response.ok || !body?.ok) {
          setState("error");
          return;
        }
        setEnabled(body.enabled !== false);
        setState("idle");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle() {
    if (enabled === null) return;
    const next = !enabled;
    setEnabled(next);
    setState("saving");
    const response = await fetch("/api/monday-brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    }).catch(() => null);
    if (!response?.ok) {
      setEnabled(!next);
      setState("error");
      return;
    }
    setState("saved");
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 size-5 shrink-0 text-[var(--accent)]" aria-hidden />
            <div>
              <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">The Monday Brief</h3>
              <p className="mt-1 max-w-lg text-[13px] leading-6 text-[var(--text-secondary)]">
                Your week by email every Monday morning: what is at risk, what changed, what renews soon and the three
                moves to make. Instant alerts for your biggest clients come with it.
              </p>
            </div>
          </div>
          {state === "loading" ? (
            <Loader2 className="size-4 animate-spin text-[var(--text-muted)]" aria-hidden />
          ) : state === "unavailable" ? (
            <span className="text-xs text-[var(--text-muted)]">Not available yet</span>
          ) : (
            <div className="flex items-center gap-3">
              {state === "saved" ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
                  <Check className="size-3.5" aria-hidden /> Saved
                </span>
              ) : state === "error" ? (
                <span className="text-xs text-amber-200">Could not save</span>
              ) : null}
              <button
                type="button"
                role="switch"
                aria-checked={enabled === true}
                aria-label="Send me the Monday Brief"
                disabled={enabled === null || state === "saving"}
                onClick={() => void toggle()}
                className={`relative inline-flex h-6 min-h-0 w-11 shrink-0 items-center rounded-full transition-colors ${
                  enabled ? "bg-[var(--accent)]" : "bg-white/15"
                } disabled:opacity-60`}
              >
                <span
                  className={`absolute left-0 inline-block size-5 rounded-full bg-white shadow transition-transform ${
                    enabled ? "translate-x-[22px]" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          )}
        </div>
      </section>
      <ConfigCard
        icon={<ReceiptText className="mt-0.5 size-5 shrink-0 text-[var(--accent)]" aria-hidden />}
        title="Value Receipts"
        body="Set a receipt to go to a client's decision-maker automatically each month, from your sender name, with your logo and colour."
        href="/receipts"
        cta="Set up receipts"
      />
    </div>
  );
}

function ConfigCard({
  title,
  body,
  href,
  cta,
  icon,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
  icon?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
      <div className="flex items-start gap-3">
        {icon}
        <div>
          <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">{title}</h3>
          <p className="mt-1 max-w-lg text-[13px] leading-6 text-[var(--text-secondary)]">{body}</p>
          <Link
            href={href}
            className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--accent)] hover:underline"
          >
            {cta} <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
