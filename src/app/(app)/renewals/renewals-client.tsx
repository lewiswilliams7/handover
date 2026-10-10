"use client";

import { ArrowRight, CalendarClock } from "lucide-react";
import Link from "next/link";

import { RENEWAL_MOVE_COPY, type RenewalMove, type RenewalRadar, type RenewalRow } from "@/lib/renewal-radar";

type Props = {
  state: "no_scan" | "stale_scan" | "ready";
  radar: RenewalRadar | null;
  contractsReadable: boolean;
  scannedAt: string | null;
};

const BANDS: Array<{ title: string; max: number }> = [
  { title: "Next 30 days", max: 30 },
  { title: "31 to 90 days", max: 90 },
  { title: "91 to 180 days", max: 180 },
  { title: "Later this year", max: 366 },
];

const MOVE_STYLE: Record<RenewalMove, string> = {
  fix: "border-rose-300/40 bg-rose-300/10 text-rose-100",
  save: "border-cyan-300/45 bg-cyan-300/10 text-cyan-100",
  reprice: "border-amber-300/40 bg-amber-300/10 text-amber-100",
  expand: "border-emerald-300/40 bg-emerald-300/10 text-emerald-100",
  renew: "border-white/15 bg-white/[0.05] text-[var(--text-secondary)]",
};

function money(value: number): string {
  return `£${Math.round(value).toLocaleString("en-GB")}`;
}

function day(iso: string): string {
  return new Date(Date.parse(iso) + 12 * 3_600_000).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function RenewalsClient({ state, radar, contractsReadable, scannedAt }: Props) {
  return (
    <main className="min-h-screen px-4 pb-16 text-[var(--text-primary)] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Renewal Radar
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Every renewal, and what to do before it
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Each contract ending in the next 12 months, with that client&apos;s service signals and
            margin side by side, so the renewal conversation starts early and on your terms.
            {scannedAt
              ? ` Scan on ${new Date(scannedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.`
              : ""}
          </p>
        </header>

        {state !== "ready" || !radar ? (
          <EmptyCard
            title={state === "no_scan" ? "Run your first scan" : "Refresh your scan to see renewals"}
            body={
              state === "no_scan"
                ? "Renewal Radar reads contract end dates from your PSA, then lines them up against each client's signals and margin."
                : "Your latest scan ran before Renewal Radar was added. A fresh scan takes about a minute."
            }
          />
        ) : radar.rows.length === 0 ? (
          <EmptyCard
            title={contractsReadable ? "No contracts end in the next 12 months" : "Contract end dates are not readable yet"}
            body={
              contractsReadable
                ? "Nothing to plan for right now. Renewals appear here as soon as a contract comes within a year of its end date."
                : "Give your PSA API user read access to contracts (HaloPSA: ClientContract; ConnectWise: Finance, Agreements), then refresh."
            }
          />
        ) : (
          <>
            <dl className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Renewing in the next 90 days"
                value={radar.next90AnnualValue > 0 ? `${money(radar.next90AnnualValue)}` : `${radar.next90Count}`}
                suffix={radar.next90AnnualValue > 0 ? " a year" : radar.next90Count === 1 ? " client" : " clients"}
                note={radar.next90AnnualValue > 0 ? `${radar.next90Count} client${radar.next90Count === 1 ? "" : "s"}` : undefined}
              />
              <Stat
                label="Of that, with warning signs"
                value={money(radar.next90AtRiskAnnualValue)}
                suffix=" a year"
                tone={radar.next90AtRiskAnnualValue > 0 ? "warn" : undefined}
              />
              {radar.repriceAnnualUplift > 0 ? (
                <Stat
                  label="Margin gap on renewals"
                  value={money(radar.repriceAnnualUplift)}
                  suffix=" a year"
                  note="On thin-margin renewals, at your typical rate"
                  tone="amber"
                />
              ) : null}
              <Stat
                label="Next renewal"
                value={`${radar.rows[0]!.daysLeft} days`}
                note={radar.rows[0]!.clientName}
              />
            </dl>

            {BANDS.map((band, index) => {
              const min = index === 0 ? -1 : BANDS[index - 1]!.max;
              const rows = radar.rows.filter((row) => row.daysLeft > min && row.daysLeft <= band.max);
              if (rows.length === 0) return null;
              return (
                <section key={band.title} className="mt-10" aria-labelledby={`band-${index}`}>
                  <h2 id={`band-${index}`} className="flex items-center gap-2 text-lg font-semibold">
                    <CalendarClock className="size-4 text-[var(--accent)]" aria-hidden />
                    {band.title}
                    <span className="text-sm font-normal text-[var(--text-muted)]">
                      {rows.length} client{rows.length === 1 ? "" : "s"}
                    </span>
                  </h2>
                  <div className="mt-4 grid gap-3">
                    {rows.map((row) => (
                      <RenewalCard key={row.clientId} row={row} median={radar.medianRevenuePerHour} />
                    ))}
                  </div>
                </section>
              );
            })}

            <p className="mt-10 max-w-3xl text-xs leading-5 text-[var(--text-muted)]">
              Warning signs are the open signals on Revenue at Risk. Margin comes from Client Margin:
              monthly contract value against hours logged over the last three complete months. A
              recommendation only uses what is shown on this page; where margin cannot be measured,
              it is left out rather than guessed.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

function EmptyCard({ title, body }: { title: string; body: string }) {
  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">{body}</p>
      <Link
        href="/attention"
        className="mt-6 inline-flex items-center rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[#07111f] transition-opacity hover:opacity-90"
      >
        Go to Revenue at Risk
      </Link>
    </section>
  );
}

function Stat({
  label,
  value,
  suffix,
  note,
  tone,
}: {
  label: string;
  value: string;
  suffix?: string;
  note?: string;
  tone?: "warn" | "amber";
}) {
  const border =
    tone === "warn"
      ? "border-cyan-300/35 bg-cyan-300/[0.06]"
      : tone === "amber"
        ? "border-amber-300/30 bg-amber-300/[0.06]"
        : "border-white/10 bg-white/[0.035]";
  return (
    <div className={`rounded-xl border px-4 py-3 ${border}`}>
      <dt className="text-xs text-[var(--text-secondary)]">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold text-white">
        {value}
        {suffix ? <span className="text-base font-medium text-[var(--text-muted)]">{suffix}</span> : null}
      </dd>
      {note ? <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{note}</p> : null}
    </div>
  );
}

function RenewalCard({ row, median }: { row: RenewalRow; median: number | null }) {
  const copy = RENEWAL_MOVE_COPY[row.move];
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-white/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-white">{row.clientName}</h3>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
            Ends {day(row.endDate)}
            <span className="text-[var(--text-muted)]"> · in {row.daysLeft} day{row.daysLeft === 1 ? "" : "s"}</span>
            {row.contractsEnding > 1 ? <span className="text-[var(--text-muted)]"> · {row.contractsEnding} contracts</span> : null}
          </p>
        </div>
        <div className="text-right">
          {row.annualValue != null ? (
            <p className="text-lg font-semibold text-white">
              {money(row.annualValue)}
              <span className="text-sm font-medium text-[var(--text-muted)]"> a year</span>
            </p>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">No value in the PSA</p>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div>
          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${MOVE_STYLE[row.move]}`}>
            {copy.title}
          </span>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{copy.body}</p>
          {row.repriceTarget != null && row.monthlyValue != null && median && row.hoursPerMonth ? (
            <p className="mt-2 text-sm leading-6 text-amber-100">
              {money(row.monthlyValue)} a month buys {Math.round((row.monthlyValue / median) * 10) / 10} hours
              at your typical rate. They take {Math.round(row.hoursPerMonth)}. Matching your typical rate
              would mean {money(row.repriceTarget)} a month, so even a partial rise, or a tighter scope, is
              worth putting on the table.
            </p>
          ) : null}
        </div>
        <dl className="grid gap-2 text-sm">
          <div>
            <dt className="text-xs text-[var(--text-muted)]">Warning signs</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {row.riskSignals.length > 0 ? (
                row.riskSignals.map((signal) => (
                  <span key={signal} className="rounded-md border border-cyan-300/25 bg-cyan-300/[0.06] px-2 py-0.5 text-xs text-cyan-100">
                    {signal}
                  </span>
                ))
              ) : (
                <span className="text-[var(--text-secondary)]">None open</span>
              )}
            </dd>
          </div>
          {row.revenuePerHour == null && row.marginUnmeasuredReason ? (
            <div>
              <dt className="text-xs text-[var(--text-muted)]">Margin</dt>
              <dd className="mt-1 text-[var(--text-secondary)]">
                Not measured: {row.marginUnmeasuredReason.charAt(0).toLowerCase() + row.marginUnmeasuredReason.slice(1)}
              </dd>
            </div>
          ) : null}
          {row.revenuePerHour != null ? (
            <div>
              <dt className="text-xs text-[var(--text-muted)]">Margin</dt>
              <dd className="mt-1 text-[var(--text-secondary)]">
                <span className="font-semibold text-white">{money(row.revenuePerHour)}</span> per hour
                {row.vsMedian != null && median != null ? (
                  <span className={row.vsMedian < 0.75 ? "text-amber-200" : "text-[var(--text-muted)]"}>
                    {" "}
                    · {Math.round(row.vsMedian * 100)}% of your typical {money(median)}
                  </span>
                ) : null}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/[0.06] pt-3 text-sm">
        {row.riskSignals.length > 0 ? (
          <Link href="/attention" className="inline-flex items-center gap-1 font-semibold text-cyan-200 hover:text-cyan-100">
            Open the Save Play <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        ) : null}
        <Link href="/receipts" className="inline-flex items-center gap-1 font-semibold text-cyan-200 hover:text-cyan-100">
          Send a Value Receipt <ArrowRight className="size-3.5" aria-hidden />
        </Link>
        {row.marginGroup ? (
          <Link href="/margin" className="inline-flex items-center gap-1 text-[var(--text-secondary)] hover:text-white">
            See margin detail
          </Link>
        ) : null}
      </div>
    </article>
  );
}
