"use client";

import { CalendarClock, Check, Copy, Loader2, Mail, Printer, Search, Send } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAppShell } from "@/components/app-shell";
import type { ClientMonthlyResult } from "@/lib/psa/client-monthly";
import {
  buildValueReceipt,
  monthLabel,
  receiptMonths,
  valueReceiptText,
  type ValueReceipt,
} from "@/lib/value-receipt";

type Props = {
  /** undefined: no scan yet. null: the latest scan predates Value Receipts. */
  monthly: ClientMonthlyResult | null | undefined;
  clientNames: Record<string, string>;
  scannedAt: string | null;
};

type Schedule = {
  client_id: number;
  client_name: string;
  email_to: string;
  enabled: boolean;
  last_sent_month: string | null;
  last_error: string | null;
};

type SchedulesState =
  | { status: "loading" }
  | { status: "ready"; schedules: Schedule[] }
  | { status: "unavailable" };

type SendState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; to: string }
  | { kind: "error"; message: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEX_PATTERN = /^#[0-9a-f]{6}$/i;

function clientLabel(names: Record<string, string>, clientId: number): string {
  const name = names[String(clientId)]?.trim();
  return name && !["unknown", "unassigned", "n/a"].includes(name.toLowerCase())
    ? name
    : `Client #${clientId}`;
}

export function ReceiptsClient({ monthly, clientNames, scannedAt }: Props) {
  const { userFirstName, branding, profileForm } = useAppShell();
  const mspName = profileForm.profileCompanyName.trim() || branding.brandName.trim();
  const accent = HEX_PATTERN.test(branding.brandColour.trim()) ? branding.brandColour.trim() : "#0f1c3f";

  const lastCompleteMonth = useMemo(() => {
    if (!monthly) return null;
    const keys = monthly.clients[0]?.months.map((m) => m.month) ?? [];
    return keys.filter((key) => key < monthly.currentMonth).at(-1) ?? null;
  }, [monthly]);

  const clients = useMemo(() => {
    if (!monthly) return [];
    return monthly.clients
      .map((client) => {
        const last = client.months.find((m) => m.month === lastCompleteMonth);
        return {
          client,
          name: clientLabel(clientNames, client.clientId),
          resolvedLastMonth: last?.closed ?? 0,
        };
      })
      .filter((row) => row.client.months.some((m) => m.opened + m.closed > 0))
      .sort((a, b) => b.resolvedLastMonth - a.resolvedLastMonth || a.name.localeCompare(b.name));
  }, [monthly, clientNames, lastCompleteMonth]);

  const [schedules, setSchedules] = useState<SchedulesState>({ status: "loading" });
  const fetchSchedules = useCallback(async (): Promise<SchedulesState> => {
    try {
      const response = await fetch("/api/value-receipts/schedules", { credentials: "include", cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; schedules?: Schedule[] };
      return response.ok && data.ok
        ? { status: "ready", schedules: data.schedules ?? [] }
        : { status: "unavailable" };
    } catch {
      return { status: "unavailable" };
    }
  }, []);
  const loadSchedules = useCallback(async () => {
    setSchedules(await fetchSchedules());
  }, [fetchSchedules]);
  useEffect(() => {
    if (!monthly) return;
    let cancelled = false;
    void fetchSchedules().then((next) => {
      if (!cancelled) setSchedules(next);
    });
    return () => {
      cancelled = true;
    };
  }, [monthly, fetchSchedules]);

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const visibleClients = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? clients.filter((row) => row.name.toLowerCase().includes(q)) : clients;
  }, [clients, query]);

  const selected = clients.find((row) => row.client.clientId === selectedId) ?? clients[0] ?? null;
  const months = selected && monthly ? receiptMonths(selected.client, monthly.currentMonth) : [];
  const month = selectedMonth && months.includes(selectedMonth) ? selectedMonth : (months[0] ?? null);
  const receipt =
    selected && month
      ? buildValueReceipt({ client: selected.client, clientName: selected.name, month })
      : null;

  return (
    <main className="min-h-screen px-4 pb-16 text-[var(--text-primary)] sm:px-6 lg:px-10">
      <style>{`@media print {
        body * { visibility: hidden !important; }
        .receipt-print-root, .receipt-print-root * { visibility: visible !important; }
        .receipt-print-root { position: absolute; inset: 0 auto auto 0; width: 100%; box-shadow: none !important; border: 0 !important; }
        @page { margin: 16mm; }
      }`}</style>
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Value Receipts
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Show each client what you did for them
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            A one-page monthly summary for the person who renews, built from your PSA. Every number
            comes from tickets your team logged.
            {scannedAt ? ` Data from your scan on ${new Date(scannedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.` : ""}
          </p>
        </header>

        {monthly === undefined ? (
          <EmptyCard
            title="Run your first scan"
            body="Value Receipts are built from your PSA scan. Run one from Revenue at Risk and your receipts will be ready here."
            href="/attention"
            action="Go to Revenue at Risk"
          />
        ) : monthly === null ? (
          <EmptyCard
            title="Refresh your scan to create receipts"
            body="Your latest scan ran before Value Receipts were added. A fresh scan takes about a minute."
            href="/attention"
            action="Refresh on Revenue at Risk"
          />
        ) : clients.length === 0 || !lastCompleteMonth ? (
          <EmptyCard
            title="No client activity to summarise yet"
            body="Receipts need at least one complete month of tickets for a client. Check back after month end, or refresh your scan."
            href="/attention"
            action="Go to Revenue at Risk"
          />
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-[calc(var(--app-content-top-desktop)+8px)] lg:self-start">
              <label className="relative block">
                <span className="sr-only">Find a client</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" aria-hidden />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Find a client"
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-300/50"
                />
              </label>
              <p className="mt-3 px-1 text-xs text-[var(--text-muted)]">
                Sorted by requests resolved in {monthLabel(lastCompleteMonth)}
              </p>
              <ul className="mt-2 max-h-[60vh] space-y-1 overflow-y-auto pr-1" role="listbox" aria-label="Clients">
                {visibleClients.map((row) => {
                  const active = row.client.clientId === selected?.client.clientId;
                  return (
                    <li key={row.client.clientId}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => {
                          setSelectedId(row.client.clientId);
                          setSelectedMonth(null);
                        }}
                        className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                          active
                            ? "bg-cyan-300/15 font-semibold text-cyan-50"
                            : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate">{row.name}</span>
                          {schedules.status === "ready" &&
                          schedules.schedules.some((sch) => sch.client_id === row.client.clientId && sch.enabled) ? (
                            <CalendarClock className="size-3.5 shrink-0 text-cyan-300/80" aria-label="Sent monthly" />
                          ) : null}
                        </span>
                        <span className="shrink-0 tabular-nums text-xs text-[var(--text-muted)]">
                          {row.resolvedLastMonth}
                        </span>
                      </button>
                    </li>
                  );
                })}
                {visibleClients.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-[var(--text-muted)]">No clients match.</li>
                ) : null}
              </ul>
            </aside>

            <section className="min-w-0" aria-label="Value Receipt">
              {selected && receipt ? (
                <>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <span>Month</span>
                      <select
                        value={month ?? ""}
                        onChange={(event) => setSelectedMonth(event.target.value)}
                        className="rounded-md border border-white/10 bg-[var(--bg-secondary)] px-2.5 py-1.5 text-sm text-white outline-none focus:border-cyan-300/50"
                      >
                        {months.map((key) => (
                          <option key={key} value={key}>
                            {monthLabel(key)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <ReceiptActions
                      receipt={receipt}
                      mspName={mspName}
                      senderName={userFirstName?.trim() ?? ""}
                    />
                  </div>
                  {!receipt.sendable ? (
                    <p className="mb-4 rounded-xl border border-amber-300/25 bg-amber-300/[0.07] px-4 py-3 text-sm text-amber-100">
                      {receipt.unsendableReason}
                    </p>
                  ) : null}
                  {receipt.dataWarnings.map((warning) => (
                    <p
                      key={warning}
                      className="mb-4 rounded-xl border border-amber-300/25 bg-amber-300/[0.07] px-4 py-3 text-sm text-amber-100"
                    >
                      <span className="font-semibold">Only you can see this. </span>
                      {warning}
                    </p>
                  ))}
                  <AutoSendControl
                    key={selected.client.clientId}
                    clientId={selected.client.clientId}
                    clientName={selected.name}
                    state={schedules}
                    onChanged={loadSchedules}
                  />
                  <ReceiptPaper receipt={receipt} mspName={mspName} accent={accent} />
                </>
              ) : (
                <EmptyCard
                  title="Nothing to show for this client"
                  body="There is no complete month of activity for this client yet."
                />
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function EmptyCard({
  title,
  body,
  href,
  action,
}: {
  title: string;
  body: string;
  href?: string;
  action?: string;
}) {
  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">{body}</p>
      {href && action ? (
        <Link
          href={href}
          className="mt-6 inline-flex items-center rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[#07111f] transition-opacity hover:opacity-90"
        >
          {action}
        </Link>
      ) : null}
    </section>
  );
}

function ReceiptPaper({
  receipt,
  mspName,
  accent,
}: {
  receipt: ValueReceipt;
  mspName: string;
  accent: string;
}) {
  return (
    <article className="receipt-print-root overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl shadow-black/30">
      <div className="h-1.5" style={{ background: accent }} aria-hidden />
      <div className="p-6 sm:p-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3 text-sm">
          <span className="font-semibold text-slate-900">{mspName || "Your IT partner"}</span>
          <span className="text-slate-500">Service summary, {receipt.periodLabel}</span>
        </div>
        <h2 className="mt-8 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          {receipt.clientName}
        </h2>
        <p className="mt-3 max-w-2xl text-lg leading-8 text-slate-700">{receipt.headline}</p>

        <dl className="mt-8 grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-3">
          {receipt.stats.map((stat) => (
            <div key={stat.key} className="bg-white p-5">
              <dt className="text-sm text-slate-500">{stat.label}</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{stat.value}</dd>
              {stat.note ? <dd className="mt-1 text-xs leading-5 text-slate-500">{stat.note}</dd> : null}
            </div>
          ))}
        </dl>

        {receipt.summary.length > 0 ? (
          <div className="mt-8 max-w-2xl space-y-2 text-[15px] leading-7 text-slate-700">
            {receipt.summary.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ) : null}

        {receipt.workTypes.length > 0 ? (
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-slate-900">Where the work went</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {receipt.workTypes.map((type) => (
                <li
                  key={type.type}
                  className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-700"
                >
                  {type.type} <span className="tabular-nums text-slate-500">{type.count}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="mt-10 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500">
          Prepared by {mspName || "your IT partner"} from the service records for {receipt.clientName}.
          Questions about anything here? Reply to the email this came with.
        </p>
      </div>
    </article>
  );
}

function ReceiptActions({
  receipt,
  mspName,
  senderName,
}: {
  receipt: ValueReceipt;
  mspName: string;
  senderName: string;
}) {
  const [to, setTo] = useState("");
  const [composing, setComposing] = useState(false);
  const [sendState, setSendState] = useState<SendState>({ kind: "idle" });
  const [copied, setCopied] = useState(false);
  const text = valueReceiptText(receipt, { mspName, senderName });
  const toValid = EMAIL_PATTERN.test(to.trim());

  const send = async () => {
    if (!toValid || sendState.kind === "sending") return;
    setSendState({ kind: "sending" });
    try {
      const response = await fetch("/api/action-email/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to.trim(), subject: text.subject, body: text.body, clientName: receipt.clientName }),
      });
      if (!response.ok) {
        setSendState({
          kind: "error",
          message: response.status === 400 ? "Check the email address and try again." : "The receipt was not sent. Try again, or copy it into your own email.",
        });
        return;
      }
      setSendState({ kind: "sent", to: to.trim() });
    } catch {
      setSendState({ kind: "error", message: "Handover could not be reached. Copy the receipt into your own email instead." });
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${text.subject}\n\n${text.body}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm">
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-white"
        >
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? "Copied" : "Copy text"}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-white"
        >
          <Printer className="size-4" aria-hidden /> Print or save PDF
        </button>
        <button
          type="button"
          onClick={() => setComposing((value) => !value)}
          disabled={!receipt.sendable}
          aria-expanded={composing}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 font-semibold text-[#07111f] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Mail className="size-4" aria-hidden /> Send to client
        </button>
      </div>
      {composing ? (
        <div className="w-full max-w-md rounded-xl border border-white/10 bg-white/[0.04] p-3">
          <label className="block text-xs font-semibold text-[var(--text-secondary)]" htmlFor="receipt-to">
            Send to {receipt.clientName}&apos;s decision-maker
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="receipt-to"
              type="email"
              inputMode="email"
              autoComplete="off"
              value={to}
              onChange={(event) => {
                setTo(event.target.value);
                if (sendState.kind !== "sending") setSendState({ kind: "idle" });
              }}
              placeholder="name@client.com"
              className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-300/50"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={!toValid || sendState.kind === "sending" || sendState.kind === "sent"}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sendState.kind === "sending" ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : sendState.kind === "sent" ? (
                <Check className="size-4" aria-hidden />
              ) : (
                <Send className="size-4" aria-hidden />
              )}
              {sendState.kind === "sent" ? "Sent" : "Send"}
            </button>
          </div>
          <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]" role="status" aria-live="polite">
            {sendState.kind === "sent"
              ? `Sent to ${sendState.to}. Replies come straight to you.`
              : sendState.kind === "error"
                ? sendState.message
                : `Subject: ${text.subject}. Sent under your company name; replies come to you.`}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function AutoSendControl({
  clientId,
  clientName,
  state,
  onChanged,
}: {
  clientId: number;
  clientName: string;
  state: SchedulesState;
  onChanged: () => Promise<void>;
}) {
  const existing =
    state.status === "ready" ? state.schedules.find((schedule) => schedule.client_id === clientId) ?? null : null;
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(existing?.email_to ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (state.status === "loading") {
    return <div className="mb-4 h-12 animate-pulse rounded-xl bg-white/[0.04]" aria-hidden />;
  }
  if (state.status === "unavailable") {
    return (
      <p className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-[var(--text-muted)]">
        Monthly automatic sending is not switched on for your workspace yet. You can still send each receipt by hand.
      </p>
    );
  }

  const save = async (enabled: boolean, emailTo: string) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/value-receipts/schedules", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, clientName, emailTo, enabled }),
      });
      if (!response.ok) {
        setError(response.status === 400 ? "Check the email address and try again." : "That could not be saved. Try again.");
        return;
      }
      setEditing(false);
      await onChanged();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/value-receipts/schedules?clientId=${clientId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        setError("That could not be saved. Try again.");
        return;
      }
      setEmail("");
      await onChanged();
    } finally {
      setBusy(false);
    }
  };

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  return (
    <section className="mb-4 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.04] px-4 py-3" aria-label="Monthly sending">
      {existing && existing.enabled && !editing ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="flex items-start gap-2 text-[var(--text-secondary)]">
            <CalendarClock className="mt-0.5 size-4 shrink-0 text-cyan-300" aria-hidden />
            <span>
              Sent to <span className="font-semibold text-white">{existing.email_to}</span> automatically early each
              month.
              {existing.last_sent_month ? ` Last sent for ${monthLabel(existing.last_sent_month)}.` : " The first one goes out next month."}
              {existing.last_error ? <span className="block text-amber-200">{existing.last_error}</span> : null}
            </span>
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                setEmail(existing.email_to);
                setEditing(true);
              }}
              className="font-semibold text-cyan-200 hover:text-cyan-100"
            >
              Change
            </button>
            <button
              type="button"
              onClick={() => void remove()}
              disabled={busy}
              className="text-[var(--text-secondary)] hover:text-white disabled:opacity-50"
            >
              Stop sending
            </button>
          </div>
        </div>
      ) : editing ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="sr-only" htmlFor={`auto-send-${clientId}`}>
            Email for monthly receipts
          </label>
          <input
            id={`auto-send-${clientId}`}
            type="email"
            inputMode="email"
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={`Who at ${clientName} should get this each month?`}
            className="min-w-[240px] flex-1 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-300/50"
          />
          <button
            type="button"
            onClick={() => void save(true, email.trim())}
            disabled={!emailValid || busy}
            className="inline-flex items-center gap-1.5 rounded-md bg-cyan-300 px-3 py-2 font-semibold text-slate-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
            Send monthly
          </button>
          <button type="button" onClick={() => setEditing(false)} className="px-2 text-[var(--text-secondary)] hover:text-white">
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="flex items-center gap-2 text-[var(--text-secondary)]">
            <CalendarClock className="size-4 shrink-0 text-cyan-300" aria-hidden />
            Send {clientName} their receipt automatically at the start of each month.
          </p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="font-semibold text-cyan-200 hover:text-cyan-100"
          >
            Set up monthly sending
          </button>
        </div>
      )}
      {error ? (
        <p className="mt-2 text-xs text-amber-200" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
