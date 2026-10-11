"use client";

import { Check, ChevronDown, Loader2 } from "lucide-react";

import { InfoTip } from "@/components/info-tip";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  MARGIN_GROUP_COPY,
  type ClientMargin,
  type ClientMarginRow,
  type MarginGroup,
} from "@/lib/client-margin";
import { monthLabel } from "@/lib/value-receipt";

type Props = {
  state: "no_scan" | "stale_scan" | "ready";
  margin: ClientMargin | null;
  manualValues?: Record<string, number>;
  scannedAt: string | null;
};

/** Grid order puts the urgent groups on the top row. */
const GROUP_ORDER: MarginGroup[] = ["save", "fix", "reprice", "protect"];

const GROUP_ACCENT: Record<MarginGroup, string> = {
  save: "border-cyan-300/40",
  fix: "border-amber-300/35",
  reprice: "border-amber-300/20",
  protect: "border-white/10",
};

function money(value: number | null): string {
  if (value == null) return "Not recorded";
  return `£${Math.round(value).toLocaleString("en-GB")}`;
}

export function MarginClient({ state, margin, manualValues = {}, scannedAt }: Props) {
  const [showUnmeasured, setShowUnmeasured] = useState(false);

  const measured = margin?.rows.filter((row) => row.group != null) ?? [];
  const unmeasured = margin?.rows.filter((row) => row.group == null) ?? [];
  const coveragePct = margin ? Math.round(margin.hoursCoverage * 100) : 0;
  const period =
    margin && margin.months.length > 0
      ? `${monthLabel(margin.months[0]!)} to ${monthLabel(margin.months.at(-1)!)}`
      : null;

  return (
    <main className="min-h-screen px-4 pb-16 text-[var(--text-primary)] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Client Margin
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Which clients pay for the time they take
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Monthly contract value divided by the hours your team logs for each client, compared with
            your typical client. Put next to Revenue at Risk, it tells you who to save, who to fix and
            who to reprice.
            {period ? ` Hours from ${period}.` : ""}
            {scannedAt
              ? ` Scan on ${new Date(scannedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.`
              : ""}
          </p>
        </header>

        {state !== "ready" || !margin ? (
          <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <h2 className="text-xl font-semibold">
              {state === "no_scan" ? "Run your first scan" : "Refresh your scan to see margin"}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              {state === "no_scan"
                ? "Client Margin is built from your PSA scan: contract values and the hours logged on each client's tickets."
                : "Your latest scan ran before Client Margin was added. A fresh scan takes about a minute."}
            </p>
            <Link
              href="/attention"
              className="mt-6 inline-flex items-center rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[#07111f] transition-opacity hover:opacity-90"
            >
              Go to Revenue at Risk
            </Link>
          </section>
        ) : (
          <>
            <dl className={`mt-8 grid gap-3 sm:grid-cols-2 ${margin.repriceAnnualTotal > 0 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
              <div className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3">
                <dt className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                  Typical revenue per hour
                  <InfoTip label="typical revenue per hour">
                    The middle value across your measured clients: monthly contract value divided by the
                    hours your team logs for them. Every client is compared with this, so you never need to
                    enter salaries or overheads.
                  </InfoTip>
                </dt>
                <dd className="mt-1 text-2xl font-semibold text-white">
                  {margin.medianRevenuePerHour != null ? `£${margin.medianRevenuePerHour}` : "Not enough data"}
                </dd>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3">
                <dt className="text-xs text-[var(--text-secondary)]">Clients measured</dt>
                <dd className="mt-1 text-2xl font-semibold text-white">
                  {measured.length}
                  <span className="text-base font-medium text-[var(--text-muted)]"> of {margin.rows.length}</span>
                </dd>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3">
                <dt className="text-xs text-[var(--text-secondary)]">Tickets with time logged</dt>
                <dd className="mt-1 text-2xl font-semibold text-white">{coveragePct}%</dd>
              </div>
              {margin.repriceAnnualTotal > 0 ? (
                <div className="rounded-xl border border-amber-300/30 bg-amber-300/[0.06] px-4 py-3">
                  <dt className="flex items-center gap-1 text-xs text-amber-100/80">
                    Margin gap
                    <InfoTip label="margin gap" align="right">
                      What your thin-margin clients would pay at your typical revenue per hour for the time they
                      take, minus what they pay now. Bring it to their renewal; even part of it is real money.
                    </InfoTip>
                  </dt>
                  <dd className="mt-1 text-2xl font-semibold text-white">
                    {money(margin.repriceAnnualTotal)}
                    <span className="text-base font-medium text-[var(--text-muted)]"> a year</span>
                  </dd>
                  <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
                    What thin-margin clients would pay at your typical rate for the hours they take, minus what they pay now
                  </p>
                </div>
              ) : null}
            </dl>

            {!margin.valuesAvailable ? (
              <Notice>
                Your PSA connection did not return contract or recurring invoice values, so revenue per
                hour cannot be worked out. Give the API user read access to contracts (HaloPSA:
                ClientContract and RecurringInvoice; ConnectWise: Finance, Agreements), then refresh, or{" "}
                <a href="#values" className="font-semibold underline underline-offset-2">type values in by hand</a>.
              </Notice>
            ) : coveragePct < 30 ? (
              <Notice>
                Time is logged on {coveragePct}% of closed tickets, so most clients cannot be measured
                yet. Margin gets more accurate as your team logs time against tickets.
              </Notice>
            ) : null}

            {measured.length > 0 ? (
              <div className="mt-8 grid gap-4 lg:grid-cols-2">
                {GROUP_ORDER.map((group) => (
                  <MarginGroupCard
                    key={group}
                    group={group}
                    rows={measured.filter((row) => row.group === group)}
                  />
                ))}
              </div>
            ) : null}

            {unmeasured.length > 0 ? (
              <section className="mt-8">
                <button
                  type="button"
                  onClick={() => setShowUnmeasured((value) => !value)}
                  aria-expanded={showUnmeasured}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--text-secondary)] hover:text-white"
                >
                  {unmeasured.length} client{unmeasured.length === 1 ? "" : "s"} could not be measured
                  <ChevronDown
                    className={`size-4 transition-transform motion-reduce:transition-none ${showUnmeasured ? "rotate-180" : ""}`}
                    aria-hidden
                  />
                </button>
                {showUnmeasured ? (
                  <ul className="mt-3 divide-y divide-white/10 rounded-xl border border-white/10">
                    {unmeasured.map((row) => (
                      <li key={row.clientId} className="flex flex-wrap justify-between gap-3 px-4 py-2.5 text-sm">
                        <span className="font-medium">{row.clientName}</span>
                        <span className="text-[var(--text-secondary)]">{row.unmeasuredReason}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ) : null}

            <ManualValuesEditor margin={margin} manualValues={manualValues} />

            <p className="mt-8 max-w-3xl text-xs leading-5 text-[var(--text-muted)]">
              Revenue per hour uses the current monthly value of each client&apos;s contracts or recurring
              invoices, and the average monthly hours logged on their tickets closed in the last three
              complete months. A client counts as thin margin below {Math.round(0.75 * 100)}% of your typical
              rate, and as at risk when it has an open signal on Revenue at Risk.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 rounded-xl border border-amber-300/25 bg-amber-300/[0.07] px-4 py-3 text-sm leading-6 text-amber-100">
      {children}
    </p>
  );
}

function MarginGroupCard({ group, rows }: { group: MarginGroup; rows: ClientMarginRow[] }) {
  const copy = MARGIN_GROUP_COPY[group];
  const value = rows.reduce((sum, row) => sum + (row.monthlyValue ?? 0), 0);
  return (
    <section className={`rounded-2xl border bg-white/[0.03] p-5 ${GROUP_ACCENT[group]}`} aria-labelledby={`margin-${group}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`margin-${group}`} className="text-lg font-semibold text-white">
          {copy.title}
        </h2>
        <span className="text-sm text-[var(--text-secondary)]">
          {rows.length} client{rows.length === 1 ? "" : "s"}
          {value > 0 ? `, ${money(value)}/mo` : ""}
        </span>
      </div>
      <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{copy.body}</p>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">No clients in this group.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--text-muted)]">
                <th className="pb-2 font-medium">Client</th>
                <th className="pb-2 text-right font-medium">Value</th>
                <th className="pb-2 text-right font-medium">Hours</th>
                <th className="pb-2 text-right font-medium">Per hour</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {rows.map((row) => (
                <tr key={row.clientId}>
                  <td className="max-w-[200px] truncate py-2 pr-3 font-medium text-white">{row.clientName}</td>
                  <td className="py-2 text-right tabular-nums text-[var(--text-secondary)]">{money(row.monthlyValue)}/mo</td>
                  <td className="py-2 text-right tabular-nums text-[var(--text-secondary)]">{row.hoursPerMonth}h/mo</td>
                  <td className="py-2 text-right tabular-nums">
                    <span className="font-semibold text-white">{money(row.revenuePerHour)}</span>
                    {row.vsMedian != null ? (
                      <span className={`ml-1.5 text-xs ${row.vsMedian < 0.75 ? "text-amber-200" : "text-[var(--text-muted)]"}`}>
                        {Math.round(row.vsMedian * 100)}%
                      </span>
                    ) : null}
                    {row.repriceMonthlyGap ? (
                      <span className="block text-[11px] font-normal text-amber-200/90">
                        +{money(row.repriceMonthlyGap)}/mo to match typical
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const NO_VALUE_REASON = "No contract value in the PSA";

/**
 * Lets the owner type a monthly value for clients the PSA holds none for.
 * Those values fill gaps everywhere (Revenue at Risk, Client Margin, Renewal
 * Radar) and never overwrite a value that comes from the PSA.
 */
function ManualValuesEditor({
  margin,
  manualValues,
}: {
  margin: ClientMargin;
  manualValues: Record<string, number>;
}) {
  const rows = margin.rows.filter(
    (row) => row.unmeasuredReason === NO_VALUE_REASON || manualValues[String(row.clientId)] != null,
  );
  const [unavailable, setUnavailable] = useState(false);
  if (rows.length === 0) return null;
  return (
    <section id="values" className="mt-10 scroll-mt-24 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-white">Clients without a value in your PSA</h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
        Type in what each one pays a month and they will appear in Revenue at Risk, Client Margin and
        Renewal Radar straight away. Values from your PSA always take priority.
      </p>
      {unavailable ? (
        <p className="mt-4 rounded-xl border border-amber-300/25 bg-amber-300/[0.07] px-4 py-3 text-sm text-amber-100">
          Manual values are not switched on for your workspace yet.
        </p>
      ) : null}
      <ul className="mt-4 divide-y divide-white/[0.06]">
        {rows.map((row) => (
          <ManualValueRow
            key={row.clientId}
            clientId={row.clientId}
            clientName={row.clientName}
            saved={manualValues[String(row.clientId)] ?? null}
            onUnavailable={() => setUnavailable(true)}
          />
        ))}
      </ul>
    </section>
  );
}

function ManualValueRow({
  clientId,
  clientName,
  saved,
  onUnavailable,
}: {
  clientId: number;
  clientName: string;
  saved: number | null;
  onUnavailable: () => void;
}) {
  const router = useRouter();
  const [value, setValue] = useState(saved != null ? String(saved) : "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const dirty = value.trim() !== (saved != null ? String(saved) : "");

  async function save() {
    setState("saving");
    setMessage(null);
    const response = await fetch("/api/client-values", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, clientName, monthlyValue: Number(value.replace(/[£,\s]/g, "")) }),
    }).catch(() => null);
    if (response?.status === 503) {
      setState("idle");
      onUnavailable();
      return;
    }
    const body = (await response?.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (!response?.ok || !body?.ok) {
      setState("error");
      setMessage(body?.message ?? "Could not save. Try again.");
      return;
    }
    setState("saved");
    router.refresh();
  }

  async function remove() {
    setState("saving");
    const response = await fetch(`/api/client-values?clientId=${clientId}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) {
      setState("error");
      setMessage("Could not remove. Try again.");
      return;
    }
    setValue("");
    setState("idle");
    router.refresh();
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <span className="min-w-0 truncate text-sm font-medium text-white">{clientName}</span>
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (dirty && value.trim()) void save();
        }}
      >
        <label className="sr-only" htmlFor={`value-${clientId}`}>
          Monthly value for {clientName}
        </label>
        <div className="flex items-center rounded-lg border border-white/15 bg-white/[0.04] px-2.5 focus-within:border-cyan-300/60">
          <span className="text-sm text-[var(--text-muted)]">£</span>
          <input
            id={`value-${clientId}`}
            inputMode="decimal"
            placeholder="0"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setState("idle");
            }}
            className="w-24 bg-transparent px-1.5 py-1.5 text-sm text-white outline-none placeholder:text-white/25"
          />
          <span className="text-xs text-[var(--text-muted)]">/mo</span>
        </div>
        <button
          type="submit"
          disabled={!dirty || !value.trim() || state === "saving"}
          className="inline-flex h-8 min-h-0 items-center gap-1 rounded-lg bg-[var(--accent)] px-3 text-xs font-semibold text-[#07111f] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {state === "saving" ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
          {state === "saved" && !dirty ? <Check className="size-3.5" aria-hidden /> : null}
          {state === "saved" && !dirty ? "Saved" : "Save"}
        </button>
        {saved != null ? (
          <button
            type="button"
            onClick={() => void remove()}
            className="min-h-0 text-xs font-medium text-[var(--text-muted)] hover:text-white"
          >
            Remove
          </button>
        ) : null}
      </form>
      {message ? (
        <p className="w-full text-right text-xs text-amber-200" role="alert">
          {message}
        </p>
      ) : null}
    </li>
  );
}
