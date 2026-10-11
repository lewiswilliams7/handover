"use client";

import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { InfoTip } from "@/components/info-tip";
import { rateUnit, type MarginBasis } from "@/lib/client-margin";
import type { ClientStatus } from "@/lib/server/client-portfolio";

export type ClientListRow = {
  clientId: number;
  name: string;
  monthlyValue: number | null;
  status: ClientStatus;
  topSignal: string | null;
  renewalDays: number | null;
  rate: number | null;
  vsMedian: number | null;
  lastMonthResolved: number | null;
  /** Tickets raised per month, oldest first, last six complete months. */
  trend: number[];
};

type Filter = "all" | "at_risk" | "renewing";

const STATUS: Record<ClientStatus, { label: string; className: string }> = {
  at_risk: { label: "At risk", className: "border-cyan-300/40 bg-cyan-300/10 text-cyan-100" },
  healthy: { label: "Healthy", className: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200" },
  not_enough_data: { label: "Too new to judge", className: "border-white/15 bg-white/[0.04] text-[var(--text-secondary)]" },
};

function money(value: number): string {
  return `£${Math.round(value).toLocaleString("en-GB")}`;
}

export function ClientsListClient({
  clients,
  scannedAt,
  median,
  basis,
  hasScan,
}: {
  clients: ClientListRow[];
  scannedAt: string | null;
  median: number | null;
  basis: MarginBasis;
  hasScan: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter(
      (client) =>
        (!q || client.name.toLowerCase().includes(q)) &&
        (filter === "all" ||
          (filter === "at_risk" && client.status === "at_risk") ||
          (filter === "renewing" && client.renewalDays != null && client.renewalDays <= 90)),
    );
  }, [clients, query, filter]);
  const atRisk = clients.filter((client) => client.status === "at_risk").length;
  const renewing = clients.filter((client) => client.renewalDays != null && client.renewalDays <= 90).length;
  const totalValue = clients.reduce((sum, client) => sum + (client.monthlyValue ?? 0), 0);
  const atRiskValue = clients
    .filter((client) => client.status === "at_risk")
    .reduce((sum, client) => sum + (client.monthlyValue ?? 0), 0);
  const renewingValue = clients
    .filter((client) => client.renewalDays != null && client.renewalDays <= 90)
    .reduce((sum, client) => sum + (client.monthlyValue ?? 0), 0);
  const noValue = clients.filter((client) => client.monthlyValue == null).length;
  const unit = rateUnit(basis);

  return (
    <main className="min-h-screen px-4 pb-16 text-[var(--text-primary)] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Clients</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Every client, at a glance</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            What each client pays, whether anything has changed, when they renew and whether they pay for the work
            they create. Open a client for their tickets, people, history and the one thing to do next.
            {scannedAt
              ? ` Scan on ${new Date(scannedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.`
              : ""}
          </p>
        </header>

        {!hasScan ? (
          <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <h2 className="text-xl font-semibold">Run your first scan</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              Your clients appear here as soon as Handover has read your PSA.
            </p>
            <Link
              href="/attention"
              className="mt-6 inline-flex items-center rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[#07111f] transition-opacity hover:opacity-90"
            >
              Start the scan
            </Link>
          </section>
        ) : (
          <>
            <dl className="mt-8 grid gap-3 sm:grid-cols-3">
              <Summary
                label="Monthly recurring value"
                value={`${money(totalValue)}/mo`}
                note={
                  noValue > 0
                    ? `${clients.length - noValue} of ${clients.length} clients have a value`
                    : `${clients.length} clients`
                }
                href={noValue > 0 ? "/margin#values" : undefined}
                linkLabel={noValue > 0 ? "Add missing values" : undefined}
              />
              <Summary
                label="At risk"
                value={`${money(atRiskValue)}/mo`}
                note={`${atRisk} client${atRisk === 1 ? "" : "s"} with a warning sign`}
                tone={atRisk > 0 ? "risk" : undefined}
                onClick={atRisk > 0 ? () => setFilter("at_risk") : undefined}
              />
              <Summary
                label="Renewing in 90 days"
                value={`${money(renewingValue)}/mo`}
                note={`${renewing} client${renewing === 1 ? "" : "s"}`}
                tone={renewing > 0 ? "amber" : undefined}
                onClick={renewing > 0 ? () => setFilter("renewing") : undefined}
              />
            </dl>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["all", `All ${clients.length}`],
                    ["at_risk", `At risk ${atRisk}`],
                    ["renewing", `Renewing in 90 days ${renewing}`],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={`min-h-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      filter === value
                        ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-100"
                        : "border-white/10 text-[var(--text-secondary)] hover:border-white/25 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 focus-within:border-cyan-300/50">
                <Search className="size-4 text-[var(--text-muted)]" aria-hidden />
                <span className="sr-only">Find a client</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Find a client"
                  className="w-48 bg-transparent py-2 text-sm text-white outline-none placeholder:text-white/30"
                />
              </label>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/[0.03] text-left text-xs text-[var(--text-muted)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">Value</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell">
                      <span className="inline-flex items-center gap-1">
                        Tickets
                        <InfoTip label="tickets">
                          Tickets raised each month over the last six complete months. A sudden drop is often the first sign
                          a client is drifting away; a spike means something is going wrong for them.
                        </InfoTip>
                      </span>
                    </th>
                    <th className="hidden px-4 py-3 text-right font-medium md:table-cell">Renews</th>
                    <th className="hidden px-4 py-3 text-right font-medium lg:table-cell">
                      <span className="inline-flex items-center gap-1">
                        Per {unit}
                        <InfoTip label={`per ${unit}`} align="right">
                          Monthly value divided by the {basis === "hours" ? "hours your team logs" : "tickets raised"} for
                          this client{median ? `, against your typical ${money(median)}` : ""}. Low means they create
                          more work than they pay for.
                        </InfoTip>
                      </span>
                    </th>
                    <th className="w-10 px-2" aria-hidden />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {visible.map((client) => (
                    <tr key={client.clientId} className="group relative transition-colors hover:bg-white/[0.03]">
                      <td className="px-4 py-3">
                        <Link href={`/clients/${client.clientId}`} className="font-semibold text-white after:absolute after:inset-0">
                          {client.name}
                        </Link>
                        {client.topSignal ? (
                          <span className="block text-xs text-[var(--text-secondary)]">{client.topSignal}</span>
                        ) : null}
                      </td>
                      <td className="hidden px-4 py-3 text-right tabular-nums text-[var(--text-secondary)] sm:table-cell">
                        {client.monthlyValue != null ? `${money(client.monthlyValue)}/mo` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS[client.status].className}`}>
                          {STATUS[client.status].label}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <Spark values={client.trend} />
                      </td>
                      <td className="hidden px-4 py-3 text-right tabular-nums text-[var(--text-secondary)] md:table-cell">
                        {client.renewalDays != null ? (
                          <span className={client.renewalDays <= 90 ? "font-semibold text-amber-200" : ""}>
                            {client.renewalDays} days
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="hidden px-4 py-3 text-right tabular-nums lg:table-cell">
                        {client.rate != null ? (
                          <span className={client.vsMedian != null && client.vsMedian < 0.75 ? "text-amber-200" : "text-[var(--text-secondary)]"}>
                            {money(client.rate)}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-2 text-[var(--text-muted)] group-hover:text-white">
                        <ArrowRight className="size-4" aria-hidden />
                      </td>
                    </tr>
                  ))}
                  {visible.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
                        No clients match.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Summary({
  label,
  value,
  note,
  tone,
  href,
  linkLabel,
  onClick,
}: {
  label: string;
  value: string;
  note: string;
  tone?: "risk" | "amber";
  href?: string;
  linkLabel?: string;
  onClick?: () => void;
}) {
  const border =
    tone === "risk" ? "border-cyan-300/30 bg-cyan-300/[0.05]" : tone === "amber" ? "border-amber-300/25 bg-amber-300/[0.05]" : "border-white/10 bg-white/[0.035]";
  return (
    <div className={`relative rounded-xl border px-4 py-3 ${border} ${onClick ? "transition-colors hover:border-white/25" : ""}`}>
      <dt className="text-xs text-[var(--text-secondary)]">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums text-white">{value}</dd>
      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
        {note}
        {href && linkLabel ? (
          <>
            {" · "}
            <Link href={href} className="relative z-10 font-semibold text-cyan-200 hover:text-cyan-100">
              {linkLabel}
            </Link>
          </>
        ) : null}
      </p>
      {onClick ? (
        <button type="button" onClick={onClick} className="absolute inset-0 min-h-0 rounded-xl" aria-label={`Show ${label.toLowerCase()} clients`} />
      ) : null}
    </div>
  );
}

/** Six bars of tickets raised per month; the latest month is highlighted. */
function Spark({ values }: { values: number[] }) {
  if (values.length === 0 || values.every((value) => value === 0)) {
    return <span className="text-xs text-[var(--text-muted)]">None</span>;
  }
  const max = Math.max(1, ...values);
  const total = values.reduce((sum, value) => sum + value, 0);
  return (
    <span className="flex items-center gap-2" title={`${values.join(", ")} tickets a month`}>
      <span className="flex h-6 items-end gap-0.5" aria-hidden>
        {values.map((value, index) => (
          <span
            key={index}
            className={`w-1.5 rounded-sm ${index === values.length - 1 ? "bg-[var(--accent)]" : "bg-white/25"}`}
            style={{ height: `${Math.max(8, (value / max) * 100)}%` }}
          />
        ))}
      </span>
      <span className="text-xs tabular-nums text-[var(--text-secondary)]">{total}</span>
      <span className="sr-only">tickets in six months</span>
    </span>
  );
}
