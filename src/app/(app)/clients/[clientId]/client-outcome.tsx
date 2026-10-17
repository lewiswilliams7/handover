"use client";

import { useState } from "react";

const REASONS = ["Price", "Service", "Acquired or merged", "Closed down", "Moved in-house", "Went to another MSP", "Other"];

type Outcome = { outcome: "lost" | "downsized"; reason: string | null; occurredOn: string } | null;

/**
 * Record that a client left or cut back. Quiet by design: it sits at the foot
 * of the page, and it is what Handover's warnings are measured against.
 */
export function ClientOutcome({
  clientId,
  clientName,
  monthlyValue,
  initial,
  stored,
}: {
  clientId: number;
  clientName: string;
  monthlyValue: number | null;
  initial: Outcome;
  stored: boolean;
}) {
  const [outcome, setOutcome] = useState<Outcome>(initial);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"lost" | "downsized">("lost");
  const [reason, setReason] = useState<string | null>(null);
  const [error, setError] = useState(false);
  if (!stored) return null;

  async function save() {
    setError(false);
    const occurredOn = new Date().toISOString().slice(0, 10);
    const response = await fetch("/api/clients/outcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, clientName, outcome: kind, reason, monthlyValue, occurredOn }),
    }).catch(() => null);
    if (!response?.ok) {
      setError(true);
      return;
    }
    setOutcome({ outcome: kind, reason, occurredOn });
    setOpen(false);
  }

  async function undo() {
    const response = await fetch(`/api/clients/outcome?clientId=${clientId}`, { method: "DELETE" }).catch(() => null);
    if (response?.ok) setOutcome(null);
  }

  if (outcome) {
    return (
      <p className="mt-6 text-xs text-[var(--text-muted)]">
        Recorded as {outcome.outcome === "lost" ? "lost" : "cut back"}
        {outcome.reason ? ` (${outcome.reason.toLowerCase()})` : ""} on{" "}
        {new Date(`${outcome.occurredOn}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.{" "}
        <button type="button" onClick={() => void undo()} className="min-h-0 font-semibold text-cyan-200 hover:text-cyan-100">
          Undo
        </button>
      </p>
    );
  }

  return (
    <div className="mt-6 text-xs text-[var(--text-muted)]">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="min-h-0 hover:text-white">
          Has {clientName} left or cut back? Record it
        </button>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-[var(--text-secondary)]">
          <p>
            Recording it measures Handover honestly: whether a warning came first, and how early. It does not change
            anything in your PSA.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(["lost", "downsized"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={kind === value}
                onClick={() => setKind(value)}
                className={`min-h-0 rounded-full border px-2.5 py-1 text-xs ${kind === value ? "border-cyan-300/50 bg-cyan-300/10 text-white" : "border-white/15 hover:text-white"}`}
              >
                {value === "lost" ? "They left" : "They cut back"}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-[var(--text-muted)]">Main reason, if you know it:</span>
            {REASONS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={reason === value}
                onClick={() => setReason(reason === value ? null : value)}
                className={`min-h-0 rounded-full border px-2.5 py-1 text-xs ${reason === value ? "border-cyan-300/50 bg-cyan-300/10 text-white" : "border-white/15 hover:text-white"}`}
              >
                {value}
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button type="button" onClick={() => void save()} className="min-h-0 rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[#07111f]">
              Save
            </button>
            <button type="button" onClick={() => setOpen(false)} className="min-h-0 text-xs hover:text-white">
              Cancel
            </button>
            {error ? <span className="text-xs text-amber-200">That could not be saved. Try again.</span> : null}
          </div>
        </div>
      )}
    </div>
  );
}
