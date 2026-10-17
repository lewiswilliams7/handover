"use client";

import { ArrowRight, Check, ChevronDown, EyeOff, Loader2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { InfoTip } from "@/components/info-tip";
import {
  MARGIN_GROUP_COPY,
  rateUnit,
  THIN_MARGIN_RATIO,
  workLabel,
  workPerMonth,
  type ClientMargin,
  type ClientMarginRow,
  type MarginBasis,
  type MarginGroup,
} from "@/lib/client-margin";
import { monthLabel } from "@/lib/value-receipt";

type Props = {
  state: "no_scan" | "stale_scan" | "ready";
  margin: ClientMargin | null;
  manualValues?: Record<string, number>;
  internalClients?: Array<{ clientId: number; name: string }>;
  riskTypeByClient?: Record<string, string>;
  renewingClientIds?: number[];
  scannedAt: string | null;
};

const GROUP_ORDER: MarginGroup[] = ["save", "fix", "reprice", "protect"];

const GROUP_STYLE: Record<MarginGroup, { badge: string; bar: string; short: string }> = {
  save: { badge: "border-cyan-300/40 bg-cyan-300/10 text-cyan-100", bar: "bg-cyan-300", short: "Save first" },
  fix: { badge: "border-amber-300/40 bg-amber-300/10 text-amber-100", bar: "bg-amber-300", short: "Fix or reprice" },
  reprice: { badge: "border-amber-300/25 bg-amber-300/[0.06] text-amber-100", bar: "bg-amber-300/70", short: "Reprice" },
  protect: { badge: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200", bar: "bg-emerald-300/80", short: "Protect" },
};

function money(value: number | null): string {
  if (value == null) return "Not recorded";
  return `£${Math.round(value).toLocaleString("en-GB")}`;
}

export function MarginClient({
  state,
  margin,
  manualValues = {},
  internalClients = [],
  riskTypeByClient = {},
  renewingClientIds = [],
  scannedAt,
}: Props) {
  const [filter, setFilter] = useState<MarginGroup | "all">("all");
  const [showUnmeasured, setShowUnmeasured] = useState(false);

  const measured = useMemo(
    () =>
      (margin?.rows ?? [])
        .filter((row) => row.group != null)
        .sort((a, b) => (a.vsMedian ?? 0) - (b.vsMedian ?? 0)),
    [margin],
  );
  const unmeasured = (margin?.rows ?? []).filter(
    (row) => row.group == null && row.monthlyValue != null,
  );
  const visible = filter === "all" ? measured : measured.filter((row) => row.group === filter);
  const maxRate = Math.max(1, ...measured.map((row) => row.rate ?? 0));
  const renewing = new Set(renewingClientIds);
  const basis = margin?.basis ?? "hours";
  const unit = rateUnit(basis);
  const coveragePct = margin ? Math.round(margin.hoursCoverage * 100) : 0;
  const period =
    margin && margin.months.length > 0
      ? `${monthLabel(margin.months[0]!)} to ${monthLabel(margin.months.at(-1)!)}`
      : null;
  const thinnest = measured[0] && measured[0].vsMedian != null && measured[0].vsMedian < THIN_MARGIN_RATIO ? measured[0] : null;

  return (
    <main className="min-h-screen px-4 pb-16 text-[var(--text-primary)] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Client Margin</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Which clients pay for the work they create
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              What each client pays, divided by the {basis === "hours" ? "hours your team logs" : "tickets they raise"} for
              them, against your typical client. The ones at the top of the list cost you the most for what they pay.
              {period ? ` Based on ${period}.` : ""}
              {scannedAt
                ? ` Scan on ${new Date(scannedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.`
                : ""}
            </p>
          </div>
          {margin ? <BasisSwitch basis={basis} hoursAvailable={margin.hoursAvailable} /> : null}
        </header>

        {state !== "ready" || !margin ? (
          <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <h2 className="text-xl font-semibold">
              {state === "no_scan" ? "Run your first scan" : "Refresh your scan to see margin"}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              {state === "no_scan"
                ? "Client Margin is built from your PSA scan: what each client pays and the work their tickets create."
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
            <GapFiller margin={margin} manualValues={manualValues} internalClients={internalClients} />

            <dl className="mt-6 grid gap-3 sm:grid-cols-3">
              <Stat
                label={`Typical revenue per ${unit}`}
                tip={`The middle value across your measured clients: what each pays a month divided by their ${basis === "hours" ? "hours logged" : "tickets"} a month. Every client is compared with this, so you never need to enter salaries or overheads.`}
                value={margin.medianRate != null ? money(margin.medianRate) : "Not enough data"}
                note={`${measured.length} of ${measured.length + unmeasured.length} clients with a value measured`}
              />
              {margin.repriceAnnualTotal > 0 ? (
                <Stat
                  label="Margin gap"
                  tip={`What your thin-margin clients would pay at your typical revenue per ${unit} for the work they create, minus what they pay now. Bring it to their renewal; even part of it is real money.`}
                  value={money(margin.repriceAnnualTotal)}
                  suffix=" a year"
                  note="If thin-margin clients paid your typical rate"
                  tone="amber"
                />
              ) : (
                <Stat
                  label="Margin gap"
                  value="None"
                  note="No measured client is far below your typical rate"
                />
              )}
              <Stat
                label="Costs you most"
                value={thinnest ? thinnest.clientName : "Nobody stands out"}
                note={
                  thinnest
                    ? `${money(thinnest.rate)} per ${unit}, ${Math.round((thinnest.vsMedian ?? 0) * 100)}% of typical`
                    : "Every measured client is close to your typical rate"
                }
                href={thinnest ? `/clients/${thinnest.clientId}` : undefined}
              />
            </dl>

            {basis === "tickets" ? (
              <Notice>
                Measured per ticket, because time is logged on {coveragePct}% of tickets. A password reset counts the
                same as a server rebuild here, so treat it as a strong pointer rather than a precise figure. Once your
                team logs time on most tickets, this switches to hours by itself.
              </Notice>
            ) : coveragePct < 70 ? (
              <Notice>
                Time is logged on {coveragePct}% of closed tickets. Clients where it is missing on most tickets are left
                out rather than guessed.
              </Notice>
            ) : null}

            {measured.length > 0 ? (
              <section className="mt-8" aria-label="Margin by client">
                <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by group">
                  <Chip active={filter === "all"} onClick={() => setFilter("all")} label="All" count={measured.length} />
                  {GROUP_ORDER.map((group) => {
                    const count = measured.filter((row) => row.group === group).length;
                    return count > 0 ? (
                      <Chip
                        key={group}
                        active={filter === group}
                        onClick={() => setFilter(group)}
                        label={MARGIN_GROUP_COPY[group].title}
                        count={count}
                      />
                    ) : null;
                  })}
                </div>
                <p className="mt-3 min-h-6 text-sm leading-6 text-[var(--text-secondary)]">
                  {filter === "all"
                    ? `Lowest margin first. The line on each bar is your typical ${money(margin.medianRate)} per ${unit}.`
                    : MARGIN_GROUP_COPY[filter].body}
                </p>
                <ul className="mt-3 divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
                  {visible.map((row) => (
                    <MarginRow
                      key={row.clientId}
                      row={row}
                      basis={basis}
                      maxRate={maxRate}
                      median={margin.medianRate}
                      riskType={riskTypeByClient[String(row.clientId)] ?? null}
                      renewing={renewing.has(row.clientId)}
                    />
                  ))}
                </ul>
              </section>
            ) : (
              <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-lg font-semibold">Not enough to compare yet</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
                  Margin needs at least two clients with a monthly value and a few tickets each. Add values above for
                  clients your PSA has none for, and they appear here straight away.
                </p>
              </section>
            )}

            {unmeasured.length > 0 ? (
              <section className="mt-6">
                <button
                  type="button"
                  onClick={() => setShowUnmeasured((value) => !value)}
                  aria-expanded={showUnmeasured}
                  className="inline-flex min-h-0 items-center gap-1.5 text-sm font-semibold text-[var(--text-secondary)] hover:text-white"
                >
                  {unmeasured.length} client{unmeasured.length === 1 ? "" : "s"} with a value could not be measured
                  <ChevronDown
                    className={`size-4 transition-transform motion-reduce:transition-none ${showUnmeasured ? "rotate-180" : ""}`}
                    aria-hidden
                  />
                </button>
                {showUnmeasured ? (
                  <ul className="mt-3 divide-y divide-white/10 rounded-xl border border-white/10">
                    {unmeasured.map((row) => (
                      <li key={row.clientId} className="flex flex-wrap justify-between gap-3 px-4 py-2.5 text-sm">
                        <Link href={`/clients/${row.clientId}`} className="font-medium hover:text-[var(--accent)]">
                          {row.clientName}
                        </Link>
                        <span className="text-[var(--text-secondary)]">{row.unmeasuredReason}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ) : null}

            <p className="mt-10 max-w-3xl text-xs leading-5 text-[var(--text-muted)]">
              {`Revenue per ${unit} uses each client's current monthly value (contracts or recurring invoices from your PSA, or a value you typed in) and their average ${
                basis === "hours" ? "hours logged on tickets closed" : "tickets closed"
              } a month over the last three complete months. A client counts as thin margin below ${Math.round(
                THIN_MARGIN_RATIO * 100,
              )}% of your typical rate, and as at risk when it has an open signal on Revenue at Risk.`}
            </p>
          </>
        )}
      </div>
    </main>
  );
}

function BasisSwitch({ basis, hoursAvailable }: { basis: MarginBasis; hoursAvailable: boolean }) {
  if (!hoursAvailable) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-[var(--text-secondary)]">
        Measured per ticket
        <InfoTip label="measured per ticket" align="right">
          Your team does not log time on enough tickets to measure margin per hour, so each client is measured on the
          tickets they raise instead. It switches to hours by itself once time is logged on most tickets.
        </InfoTip>
      </span>
    );
  }
  return (
    <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5 text-xs font-semibold" role="group" aria-label="Measure margin by">
      {(["hours", "tickets"] as const).map((option) => (
        <Link
          key={option}
          href={option === "hours" ? "/margin" : "/margin?basis=tickets"}
          aria-current={basis === option ? "true" : undefined}
          className={`rounded-md px-3 py-1.5 transition-colors ${
            basis === option ? "bg-white/10 text-white" : "text-[var(--text-muted)] hover:text-white"
          }`}
        >
          Per {option === "hours" ? "hour" : "ticket"}
        </Link>
      ))}
    </div>
  );
}

function Stat({
  label,
  tip,
  value,
  suffix,
  note,
  tone,
  href,
}: {
  label: string;
  tip?: string;
  value: string;
  suffix?: string;
  note?: string;
  tone?: "amber";
  href?: string;
}) {
  const body = (
    <>
      <dt className={`flex items-center gap-1 text-xs ${tone === "amber" ? "text-amber-100/80" : "text-[var(--text-secondary)]"}`}>
        {label}
        {tip ? <InfoTip label={label.toLowerCase()}>{tip}</InfoTip> : null}
      </dt>
      <dd className="mt-1 truncate text-2xl font-semibold text-white">
        {value}
        {suffix ? <span className="text-base font-medium text-[var(--text-muted)]">{suffix}</span> : null}
      </dd>
      {note ? <p className="mt-1 text-xs leading-4 text-[var(--text-muted)]">{note}</p> : null}
    </>
  );
  const className = `relative rounded-xl border px-4 py-3 ${
    tone === "amber" ? "border-amber-300/30 bg-amber-300/[0.06]" : "border-white/10 bg-white/[0.035]"
  }`;
  if (!href) return <div className={className}>{body}</div>;
  return (
    <div className={`${className} transition-colors hover:border-white/20`}>
      {body}
      <Link href={href} className="absolute inset-0 rounded-xl" aria-label={`Open ${value}`} />
    </div>
  );
}

function Chip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex h-8 min-h-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors ${
        active
          ? "border-cyan-300/50 bg-cyan-300/10 text-cyan-100"
          : "border-white/10 text-[var(--text-secondary)] hover:border-white/25 hover:text-white"
      }`}
    >
      {label}
      <span className={active ? "text-cyan-200/80" : "text-[var(--text-muted)]"}>{count}</span>
    </button>
  );
}

function MarginRow({
  row,
  basis,
  maxRate,
  median,
  riskType,
  renewing,
}: {
  row: ClientMarginRow;
  basis: MarginBasis;
  maxRate: number;
  median: number | null;
  riskType: string | null;
  renewing: boolean;
}) {
  const group = row.group!;
  const style = GROUP_STYLE[group];
  const pct = Math.max(3, Math.min(100, ((row.rate ?? 0) / maxRate) * 100));
  const medianPct = median != null ? Math.min(100, (median / maxRate) * 100) : null;
  const thin = row.vsMedian != null && row.vsMedian < THIN_MARGIN_RATIO;
  const action =
    (group === "save" || group === "fix") && riskType
      ? { href: `/attention?finding=${row.clientId}:${encodeURIComponent(riskType)}`, label: "Open the Save Play" }
      : group === "reprice" && renewing
        ? { href: `/renewals?client=${row.clientId}#client-${row.clientId}`, label: "Plan the renewal" }
        : { href: `/clients/${row.clientId}`, label: "See the client" };
  return (
    <li
      id={`client-${row.clientId}`}
      className="grid scroll-mt-24 gap-3 px-4 py-4 target:bg-cyan-300/[0.06] sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_11rem] sm:items-center sm:gap-5 sm:px-5"
    >
      <div className="min-w-0">
        <Link href={`/clients/${row.clientId}`} className="block truncate font-semibold text-white hover:text-[var(--accent)]">
          {row.clientName}
        </Link>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
          {money(row.monthlyValue)}/mo · {workLabel(workPerMonth(row, basis), basis)}/mo
        </p>
      </div>
      <div>
        <div className="relative h-2.5 rounded-full bg-white/[0.06]" aria-hidden>
          <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${pct}%` }} />
          {medianPct != null ? (
            <div className="absolute -top-1 h-4.5 w-0.5 rounded bg-white/70" style={{ left: `calc(${medianPct}% - 1px)` }} />
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className={`rounded-full border px-2 py-0.5 font-semibold ${style.badge}`}>{style.short}</span>
          {row.repriceMonthlyGap ? (
            <span className="text-amber-200/90">+{money(row.repriceMonthlyGap)}/mo would match your typical rate</span>
          ) : null}
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-1">
        <p className="text-right tabular-nums">
          <span className="text-lg font-semibold text-white">{money(row.rate)}</span>
          <span className="text-xs text-[var(--text-muted)]"> per {rateUnit(basis)}</span>
          {row.vsMedian != null ? (
            <span className={`block text-xs ${thin ? "text-amber-200" : "text-[var(--text-muted)]"}`}>
              {Math.round(row.vsMedian * 100)}% of typical
            </span>
          ) : null}
        </p>
        <Link
          href={action.href}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline"
        >
          {action.label}
          <ArrowRight className="size-3" aria-hidden />
        </Link>
      </div>
    </li>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 rounded-xl border border-amber-300/25 bg-amber-300/[0.07] px-4 py-3 text-sm leading-6 text-amber-100">
      {children}
    </p>
  );
}

/**
 * Clients with tickets but no monthly value. Fill in what they pay and they
 * are measured everywhere straight away; mark your own company or a test
 * client as "not a client" and it disappears from every view.
 */
function GapFiller({
  margin,
  manualValues,
  internalClients,
}: {
  margin: ClientMargin;
  manualValues: Record<string, number>;
  internalClients: Array<{ clientId: number; name: string }>;
}) {
  const missing = margin.rows.filter((row) => row.monthlyValue == null);
  const typed = margin.rows.filter((row) => manualValues[String(row.clientId)] != null);
  const [open, setOpen] = useState(missing.length > 0);
  const [error, setError] = useState<string | null>(null);
  if (missing.length === 0 && typed.length === 0 && internalClients.length === 0) return null;

  return (
    <section id="values" className="mt-8 scroll-mt-24 rounded-2xl border border-white/10 bg-white/[0.03]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full min-h-0 items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span>
          <span className="block font-semibold text-white">
            {missing.length > 0
              ? `${missing.length} client${missing.length === 1 ? " has" : "s have"} no monthly value`
              : "Values you added"}
          </span>
          <span className="mt-0.5 block text-sm text-[var(--text-secondary)]">
            {missing.length > 0
              ? "Your PSA has no contract value for these. Add what each pays to measure them, or hide any that aren't paying clients."
              : `${typed.length} typed in${internalClients.length ? `, ${internalClients.length} hidden as not a client` : ""}. Values from your PSA always take priority.`}
          </span>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-[var(--text-muted)] transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="border-t border-white/[0.06] px-5 pb-4">
          {error ? (
            <p className="mt-3 rounded-lg border border-amber-300/25 bg-amber-300/[0.07] px-3 py-2 text-sm text-amber-100" role="alert">
              {error}
            </p>
          ) : null}
          <ul className="divide-y divide-white/[0.06]">
            {[...missing, ...typed.filter((row) => !missing.includes(row))].map((row) => (
              <ValueRow
                key={row.clientId}
                row={row}
                saved={manualValues[String(row.clientId)] ?? null}
                onError={setError}
              />
            ))}
          </ul>
          {internalClients.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3 text-xs text-[var(--text-muted)]">
              <EyeOff className="size-3.5" aria-hidden />
              Hidden as not a client:
              {internalClients.map((client) => (
                <UnhideButton key={client.clientId} clientId={client.clientId} name={client.name} onError={setError} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

async function postValue(body: Record<string, unknown>): Promise<string | null> {
  const response = await fetch("/api/client-values", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  const data = (await response?.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
  if (!response?.ok || !data?.ok) return data?.message ?? "Could not save. Try again.";
  return null;
}

function ValueRow({
  row,
  saved,
  onError,
}: {
  row: ClientMarginRow;
  saved: number | null;
  onError: (message: string | null) => void;
}) {
  const router = useRouter();
  const [value, setValue] = useState(saved != null ? String(saved) : "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "hiding">("idle");
  const dirty = value.trim() !== (saved != null ? String(saved) : "");

  async function save() {
    setState("saving");
    onError(null);
    const error = await postValue({
      clientId: row.clientId,
      clientName: row.clientName,
      monthlyValue: Number(value.replace(/[£,\s]/g, "")),
    });
    if (error) {
      setState("idle");
      onError(error);
      return;
    }
    setState("saved");
    router.refresh();
  }

  async function hide() {
    setState("hiding");
    onError(null);
    const error = await postValue({ clientId: row.clientId, clientName: row.clientName, internal: true });
    if (error) {
      setState("idle");
      onError(error);
      return;
    }
    router.refresh();
  }

  async function remove() {
    setState("saving");
    const response = await fetch(`/api/client-values?clientId=${row.clientId}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) {
      setState("idle");
      onError("Could not remove. Try again.");
      return;
    }
    setValue("");
    setState("idle");
    router.refresh();
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">{row.clientName}</p>
        <p className="text-xs text-[var(--text-muted)]">
          {row.ticketsPerMonth > 0 ? `${row.ticketsPerMonth} tickets a month` : "No tickets in the last three months"}
        </p>
      </div>
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (dirty && value.trim()) void save();
        }}
      >
        <label className="sr-only" htmlFor={`value-${row.clientId}`}>
          Monthly value for {row.clientName}
        </label>
        <div className="flex items-center rounded-lg border border-white/15 bg-white/[0.04] px-2.5 focus-within:border-cyan-300/60">
          <span className="text-sm text-[var(--text-muted)]">£</span>
          <input
            id={`value-${row.clientId}`}
            inputMode="decimal"
            placeholder="What they pay"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setState("idle");
            }}
            className="w-28 bg-transparent px-1.5 py-1.5 text-sm text-white outline-none placeholder:text-white/30"
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
          <button type="button" onClick={() => void remove()} className="min-h-0 text-xs font-medium text-[var(--text-muted)] hover:text-white">
            Remove
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void hide()}
            disabled={state === "hiding"}
            className="inline-flex h-8 min-h-0 items-center gap-1 rounded-lg border border-white/10 px-2.5 text-xs font-medium text-[var(--text-secondary)] hover:border-white/25 hover:text-white disabled:opacity-50"
            title="Your own company, a test client or anyone you don't bill. Hidden from every view; you can undo it."
          >
            {state === "hiding" ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <EyeOff className="size-3.5" aria-hidden />}
            Not a client
          </button>
        )}
      </form>
    </li>
  );
}

function UnhideButton({ clientId, name, onError }: { clientId: number; name: string; onError: (message: string | null) => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const response = await fetch(`/api/client-values?clientId=${clientId}`, { method: "DELETE" }).catch(() => null);
        setBusy(false);
        if (!response?.ok) {
          onError("Could not undo. Try again.");
          return;
        }
        router.refresh();
      }}
      className="inline-flex min-h-0 items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[var(--text-secondary)] hover:border-white/25 hover:text-white"
      title={`Show ${name} again`}
    >
      {name}
      <Undo2 className="size-3" aria-hidden />
    </button>
  );
}
