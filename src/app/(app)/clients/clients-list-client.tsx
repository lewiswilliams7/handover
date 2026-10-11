"use client";

import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { InfoTip } from "@/components/info-tip";
import type { ClientStatus } from "@/lib/server/client-portfolio";

export type ClientListRow = {
  clientId: number;
  name: string;
  monthlyValue: number | null;
  status: ClientStatus;
  topSignal: string | null;
  renewalDays: number | null;
  revenuePerHour: number | null;
  vsMedian: number | null;
  lastMonthResolved: number | null;
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
  hasScan,
}: {
  clients: ClientListRow[];
  scannedAt: string | null;
  median: number | null;
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

  return (
    <main className="min-h-screen px-4 pb-16 text-[var(--text-primary)] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Clients</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Every client, at a glance</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            What each client pays, whether anything has changed, when they renew and whether they pay for the time
            they take. Open a client for the full picture and the one thing to do next.
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
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
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
                    <th className="hidden px-4 py-3 text-right font-medium md:table-cell">Renews</th>
                    <th className="hidden px-4 py-3 text-right font-medium lg:table-cell">
                      <span className="inline-flex items-center gap-1">
                        Per hour
                        <InfoTip label="per hour" align="right">
                          Monthly value divided by the hours your team logs for this client
                          {median ? `, against your typical ${money(median)}` : ""}. Low means they take more
                          time than they pay for.
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
                        {client.revenuePerHour != null ? (
                          <span className={client.vsMedian != null && client.vsMedian < 0.75 ? "text-amber-200" : "text-[var(--text-secondary)]"}>
                            {money(client.revenuePerHour)}
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
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
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
