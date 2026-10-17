"use client";

import { ArrowRight, Check, ChevronDown, Clock, Sparkles, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { WeekList, WeekRow } from "@/lib/week-list";
import { WEEK_LIST_TOP } from "@/lib/week-list";

type Props = {
  list: WeekList;
  scanSessionId: string;
  /** Names that can own a row. Hidden when the workspace is one person. */
  team: string[];
  /** False when list state cannot be stored yet: rows still show, controls do not. */
  stored: boolean;
};

function money(value: number): string {
  return `£${Math.round(value).toLocaleString("en-GB")}`;
}

async function post(url: string, body: unknown, method = "POST"): Promise<{ ok: boolean; id?: string }> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: method === "DELETE" ? undefined : JSON.stringify(body),
  }).catch(() => null);
  if (!response?.ok) return { ok: false };
  return (await response.json().catch(() => ({ ok: true }))) as { ok: boolean; id?: string };
}

export function WeekListView({ list, scanSessionId, team, stored }: Props) {
  const [showAll, setShowAll] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const rows = showAll ? list.rows : list.rows.slice(0, WEEK_LIST_TOP);
  const hidden = list.rows.length - rows.length;

  return (
    <section className="mt-6" aria-labelledby="week-list">
      <h2 id="week-list" className="sr-only">
        This week
      </h2>
      {list.rows.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm leading-6 text-[var(--text-secondary)]">
          Everything on your list is done. New rows appear after the next weekly scan.
        </div>
      ) : (
        <ol className="space-y-2.5">
          {rows.map((row, index) => (
            <Row key={row.key} row={row} rank={index + 1} scanSessionId={scanSessionId} team={team} stored={stored} />
          ))}
        </ol>
      )}

      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-3 min-h-0 text-sm font-semibold text-cyan-200 hover:text-cyan-100"
        >
          Show {hidden} more
        </button>
      ) : null}

      {list.learned.length > 0 ? <Learned learned={list.learned} stored={stored} /> : null}

      {list.hiddenAsNormal > 0 ? (
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          {list.hiddenAsNormal} warning sign{list.hiddenAsNormal === 1 ? " is" : "s are"} hidden because you marked{" "}
          {list.hiddenAsNormal === 1 ? "it" : "them"} normal for that client. Each comes back after six months.
        </p>
      ) : null}

      {list.done.length > 0 ? (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setShowDone((value) => !value)}
            aria-expanded={showDone}
            className="inline-flex min-h-0 items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)] hover:text-white"
          >
            Done this week ({list.done.length})
            <ChevronDown className={`size-3.5 transition-transform ${showDone ? "rotate-180" : ""}`} aria-hidden />
          </button>
          {showDone ? (
            <ul className="mt-2 space-y-1.5">
              {list.done.map((row) => (
                <DoneRow key={row.key} row={row} stored={stored} />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function Tag({ tone, children }: { tone: "strong" | "soft" | "new" | "time"; children: React.ReactNode }) {
  const cls =
    tone === "strong"
      ? "border-amber-300/40 bg-amber-300/10 text-amber-100"
      : tone === "new"
        ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
        : tone === "time"
          ? "border-white/15 bg-white/[0.04] text-[var(--text-secondary)]"
          : "border-white/15 text-[var(--text-muted)]";
  return <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}>{children}</span>;
}

const STRENGTH_TIP = {
  strong: "Well outside anything this client has done in an ordinary month.",
  worth_a_look: "Outside this client's usual range, but not by much, or measured on a short history.",
};

function Row({
  row,
  rank,
  scanSessionId,
  team,
  stored,
}: {
  row: WeekRow;
  rank: number;
  scanSessionId: string;
  team: string[];
  stored: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [status, setStatus] = useState(row.status);
  const [owner, setOwner] = useState(row.owner);
  const [message, setMessage] = useState<{ text: string; undo?: () => Promise<void> } | null>(null);
  const [gone, setGone] = useState(false);
  const refresh = () => startTransition(() => router.refresh());

  async function setItem(next: { status?: string; owner?: string | null }) {
    const result = await post("/api/week/item", { key: row.key, ...next });
    if (!result.ok) setMessage({ text: "That could not be saved. Try again." });
    return result.ok;
  }

  async function markDone() {
    setStatus("done");
    if (await setItem({ status: "done" })) {
      setGone(true);
      setMessage({
        text: "Moved to Done.",
        undo: async () => {
          await setItem({ status: "open" });
          setGone(false);
          setStatus("open");
          setMessage(null);
          refresh();
        },
      });
    } else setStatus(row.status);
  }

  async function snooze() {
    if (await setItem({ status: "snoozed" })) {
      setGone(true);
      setMessage({
        text: "Snoozed for a week.",
        undo: async () => {
          await setItem({ status: "open" });
          setGone(false);
          setMessage(null);
          refresh();
        },
      });
    }
  }

  if (gone && message) {
    return (
      <li className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] px-4 py-3 text-sm text-[var(--text-secondary)]">
        <span>
          <span className="font-medium text-white">{row.clientName}</span> · {message.text}
        </span>
        {message.undo ? (
          <button type="button" onClick={() => void message.undo?.()} className="inline-flex min-h-0 items-center gap-1 text-xs font-semibold text-cyan-200 hover:text-cyan-100">
            <Undo2 className="size-3.5" aria-hidden /> Undo
          </button>
        ) : null}
      </li>
    );
  }

  return (
    <li className={`rounded-xl border bg-white/[0.025] transition-colors ${status === "doing" ? "border-cyan-300/30" : "border-white/[0.08]"}`}>
      <div className="flex items-start gap-3 p-4 sm:gap-4">
        {stored ? (
          <button
            type="button"
            onClick={() => void markDone()}
            aria-label={`Mark ${row.clientName} done`}
            title="Mark done"
            className="group mt-0.5 flex size-7 min-h-0 shrink-0 items-center justify-center rounded-full border border-white/20 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-emerald-300/60 hover:bg-emerald-300/10 hover:text-emerald-200"
          >
            <span className="group-hover:hidden">{rank}</span>
            <Check className="hidden size-3.5 group-hover:block" aria-hidden />
          </button>
        ) : (
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15 text-xs font-semibold text-cyan-100">
            {rank}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {row.clientId != null ? (
                <Link href={`/clients/${row.clientId}`} className="font-semibold text-white hover:underline">
                  {row.clientName}
                </Link>
              ) : (
                <span className="font-semibold text-white">{row.clientName}</span>
              )}
              {row.strength === "strong" ? (
                <span title={STRENGTH_TIP.strong}>
                  <Tag tone="strong">Strong sign</Tag>
                </span>
              ) : row.strength === "worth_a_look" ? (
                <span title={STRENGTH_TIP.worth_a_look}>
                  <Tag tone="soft">Worth a look</Tag>
                </span>
              ) : null}
              {row.isNew ? <Tag tone="new">New this week</Tag> : null}
              {row.renewsInDays != null && row.kind === "risk" ? (
                <Tag tone="time">Renews in {row.renewsInDays} days</Tag>
              ) : null}
              {status === "doing" ? <Tag tone="new">In progress</Tag> : null}
            </span>
            <span className="text-sm text-[var(--text-secondary)]">
              {row.annualValue != null && row.annualValue > 0 ? (
                <>
                  <span className="font-semibold text-white">{money(row.annualValue)}</span>{" "}
                  {row.valueNote ?? "a year"}
                </>
              ) : row.kind === "risk" || row.kind === "renewal" ? (
                <Link href="/margin#values" className="text-xs text-[var(--text-muted)] underline decoration-white/20 underline-offset-2 hover:text-white">
                  Add their contract value
                </Link>
              ) : null}
            </span>
          </div>

          <p className="mt-1 text-sm text-white/90">
            {row.why}
            {row.otherSigns.length > 0 ? (
              <span className="text-[var(--text-muted)]" title={row.otherSigns.join(", ")}>
                {" "}
                · and {row.otherSigns.length} more sign{row.otherSigns.length === 1 ? "" : "s"}
              </span>
            ) : null}
          </p>
          {row.detail ? <p className="mt-1 text-[13px] leading-5 text-[var(--text-muted)]">{row.detail}</p> : null}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link
              href={row.action.href}
              className="group inline-flex items-center gap-1 text-sm font-semibold text-cyan-200 hover:text-cyan-100"
            >
              {row.action.label}
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
            </Link>
            {stored ? (
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
                {team.length > 1 ? (
                  <label className="inline-flex items-center gap-1">
                    <span className="sr-only">Owner</span>
                    <select
                      value={owner ?? ""}
                      onChange={(event) => {
                        const value = event.target.value || null;
                        setOwner(value);
                        void setItem({ owner: value });
                      }}
                      className="min-h-0 rounded-md border border-white/10 bg-transparent px-1.5 py-0.5 text-xs text-[var(--text-secondary)] hover:border-white/25"
                    >
                      <option value="">Unassigned</option>
                      {team.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {status !== "doing" ? (
                  <button
                    type="button"
                    onClick={async () => {
                      setStatus("doing");
                      if (!(await setItem({ status: "doing" }))) setStatus(row.status);
                    }}
                    className="min-h-0 hover:text-white"
                  >
                    I&apos;m on it
                  </button>
                ) : null}
                <button type="button" onClick={() => void snooze()} className="inline-flex min-h-0 items-center gap-1 hover:text-white">
                  <Clock className="size-3" aria-hidden /> Snooze a week
                </button>
              </span>
            ) : null}
          </div>

          {row.kind === "risk" && row.findingType && stored ? (
            <Feedback row={row} scanSessionId={scanSessionId} onGone={(text, undo) => {
              setGone(true);
              setMessage({ text, undo: async () => { await undo(); setGone(false); setMessage(null); refresh(); } });
            }} />
          ) : null}
          {message && !gone ? <p className="mt-2 text-xs text-amber-200">{message.text}</p> : null}
        </div>
      </div>
    </li>
  );
}

const NORMAL_REASONS = ["Seasonal", "We know why", "Always like this"];

function Feedback({
  row,
  scanSessionId,
  onGone,
}: {
  row: WeekRow;
  scanSessionId: string;
  onGone: (text: string, undo: () => Promise<void>) => void;
}) {
  const [open, setOpen] = useState<null | "handled" | "normal">(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [kept, setKept] = useState(false);
  const [error, setError] = useState(false);

  async function send(verdict: string, extra: { reason?: string; note?: string } = {}) {
    setSaving(true);
    setError(false);
    const result = await post("/api/week/feedback", {
      scanSessionId,
      clientId: row.clientId,
      clientName: row.clientName,
      findingType: row.findingType,
      verdict,
      ...extra,
    });
    setSaving(false);
    if (!result.ok || !result.id) {
      setError(true);
      return;
    }
    const id = result.id;
    const undo = async () => {
      await post(`/api/week/feedback?id=${id}`, null, "DELETE");
    };
    if (verdict === "worth_knowing") {
      setKept(true);
      return;
    }
    const until = new Date(Date.now() + 182 * 86_400_000).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    onGone(
      verdict === "handled"
        ? "Marked handled. Handover checks on the next scans whether it cleared, and counts it in Saved Revenue if it did."
        : verdict === "normal_for_client"
          ? `Hidden for this client until ${until}.`
          : "Noted. Signs like this you mark not useful will sit lower in your list.",
      undo,
    );
  }

  if (kept) {
    return <p className="mt-3 text-xs text-emerald-300">Thanks. Signs like this will keep their place in your list.</p>;
  }

  return (
    <div className="mt-3 border-t border-white/[0.06] pt-2.5">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-xs">
        <span className="mr-1 text-[var(--text-muted)]">Was this right?</span>
        <FeedbackButton disabled={saving} onClick={() => void send("worth_knowing")}>Worth knowing</FeedbackButton>
        <FeedbackButton disabled={saving} active={open === "handled"} onClick={() => setOpen(open === "handled" ? null : "handled")}>Handled</FeedbackButton>
        <FeedbackButton disabled={saving} active={open === "normal"} onClick={() => setOpen(open === "normal" ? null : "normal")}>Normal for this client</FeedbackButton>
        <FeedbackButton disabled={saving} onClick={() => void send("not_useful")}>Not useful</FeedbackButton>
      </div>
      {open === "handled" ? (
        <form
          className="mt-2 flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void send("handled", { note });
          }}
        >
          <input
            value={note}
            onChange={(event) => setNote(event.target.value.slice(0, 240))}
            placeholder="What did you do? e.g. called Sarah, moved them to the priority queue"
            className="min-w-0 flex-1 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-white placeholder:text-[var(--text-muted)] focus:border-cyan-300/50 focus:outline-none"
            autoFocus
          />
          <button type="submit" disabled={saving} className="min-h-0 rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[#07111f] disabled:opacity-60">
            Save
          </button>
        </form>
      ) : null}
      {open === "normal" ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[var(--text-muted)]">Why?</span>
          {NORMAL_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              disabled={saving}
              onClick={() => void send("normal_for_client", { reason })}
              className="min-h-0 rounded-full border border-white/15 px-2.5 py-1 text-[var(--text-secondary)] hover:border-cyan-300/50 hover:text-white disabled:opacity-60"
            >
              {reason}
            </button>
          ))}
          <span className="text-[var(--text-muted)]">Hidden for this client for six months.</span>
        </div>
      ) : null}
      {error ? <p className="mt-1 text-xs text-amber-200">That could not be saved. Try again.</p> : null}
    </div>
  );
}

function FeedbackButton({
  children,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-0 rounded-full px-2 py-0.5 transition-colors disabled:opacity-60 ${
        active ? "bg-white/10 text-white" : "text-[var(--text-secondary)] hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function DoneRow({ row, stored }: { row: WeekRow; stored: boolean }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg px-1 py-1 text-sm text-[var(--text-secondary)]">
      <span className="flex min-w-0 items-center gap-2">
        <Check className="size-3.5 shrink-0 text-emerald-300" aria-hidden />
        <span className="truncate">
          <span className="text-white/80">{row.clientName}</span> · {row.why}
          {row.owner ? <span className="text-[var(--text-muted)]"> · {row.owner}</span> : null}
        </span>
      </span>
      {stored ? (
        <button
          type="button"
          onClick={async () => {
            await post("/api/week/item", { key: row.key, status: "open" });
            startTransition(() => router.refresh());
          }}
          className="min-h-0 shrink-0 text-xs text-[var(--text-muted)] hover:text-white"
        >
          Reopen
        </button>
      ) : null}
    </li>
  );
}

function Learned({ learned, stored }: { learned: WeekList["learned"]; stored: boolean }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [undone, setUndone] = useState<string[]>([]);
  const visible = learned.filter((entry) => !undone.includes(entry.findingType));
  if (visible.length === 0) return null;
  return (
    <div className="mt-4 space-y-2">
      {visible.map((entry) => (
        <div
          key={entry.findingType}
          className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-sm"
        >
          <p className="flex min-w-0 gap-2 text-[var(--text-secondary)]">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-cyan-300" aria-hidden />
            <span>
              <span className="font-medium text-white">Handover learned:</span> you marked {entry.negative} of the last{" "}
              {entry.total} &ldquo;{entry.label.toLowerCase()}&rdquo; signs as not useful or normal, so they now sit lower in
              your list.
            </span>
          </p>
          {stored ? (
            <button
              type="button"
              onClick={async () => {
                setUndone((list) => [...list, entry.findingType]);
                await post("/api/week/learned", { findingType: entry.findingType });
                startTransition(() => router.refresh());
              }}
              className="inline-flex min-h-0 shrink-0 items-center gap-1 text-xs font-semibold text-cyan-200 hover:text-cyan-100"
            >
              <Undo2 className="size-3.5" aria-hidden /> Undo
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
