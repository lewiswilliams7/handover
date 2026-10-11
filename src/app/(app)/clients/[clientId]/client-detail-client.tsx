"use client";

import { ArrowLeft, ArrowRight, CalendarClock, CircleAlert, CircleCheck, Mail, ReceiptText, Wrench } from "lucide-react";
import Link from "next/link";

import { InfoTip } from "@/components/info-tip";
import { getFindingCopy } from "@/lib/psa/scan-finding-copy";
import type { ClientSummary } from "@/lib/server/client-portfolio";
import { formatDuration } from "@/lib/value-receipt";

type HistoryRow = {
  findingType: string;
  raisedAt: string;
  actioned: boolean;
  actionType: string | null;
  actionedAt: string | null;
  outcome: string;
  note: string | null;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

export function ClientDetailClient({
  client,
  median,
  currentMonth,
  scannedAt,
  history,
}: {
  client: ClientSummary;
  median: number | null;
  currentMonth: string | null;
  scannedAt: string;
  history: HistoryRow[];
}) {
  const risks = client.signals.filter((signal) => signal.kind === "risk");
  const housekeeping = client.signals.filter((signal) => signal.kind !== "risk");
  const complete = currentMonth ? client.months.filter((m) => m.month < currentMonth) : client.months;
  const chart = complete.slice(-6);
  const max = Math.max(1, ...chart.map((m) => Math.max(m.opened, m.closed)));
  const lastMonth = complete.at(-1);

  // The one thing to do next, in priority order.
  const next = risks[0]
    ? {
        title: getFindingCopy(risks[0].type).label,
        body: "Something has changed with this client. Open the Save Play: the steps and an email, ready to send.",
        href: `/attention?finding=${client.clientId}:${risks[0].type}`,
        cta: "Open the Save Play",
        icon: <CircleAlert className="size-5 text-cyan-200" aria-hidden />,
      }
    : client.renewal && client.renewal.daysLeft <= 90
      ? {
          title: `Renews in ${client.renewal.daysLeft} days`,
          body: `${client.renewal.moveTitle}. Send a Value Receipt first, so the decision-maker sees what they are renewing.`,
          href: `/receipts?client=${client.clientId}`,
          cta: "Send a Value Receipt",
          icon: <CalendarClock className="size-5 text-amber-200" aria-hidden />,
        }
      : {
          title: "Nothing needs you",
          body: "No warning signs and no renewal soon. A good moment to show them what you do.",
          href: `/receipts?client=${client.clientId}`,
          cta: "Send a Value Receipt",
          icon: <CircleCheck className="size-5 text-emerald-300" aria-hidden />,
        };

  return (
    <main className="min-h-screen px-4 pb-16 text-[var(--text-primary)] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/clients" className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-white">
          <ArrowLeft className="size-4" aria-hidden /> All clients
        </Link>

        <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{client.name}</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {client.monthlyValue != null ? (
                <>
                  {money(client.monthlyValue)} a month · {money(client.monthlyValue * 12)} a year
                  {client.valueFromManual ? <span className="text-[var(--text-muted)]"> (typed in by hand)</span> : null}
                </>
              ) : (
                <>
                  No value in your PSA ·{" "}
                  <Link href="/margin#values" className="font-semibold text-cyan-200 hover:text-cyan-100">
                    add one
                  </Link>
                </>
              )}
              {client.renewal ? <> · renews {day(client.renewal.endDate)}</> : null}
            </p>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-sm font-medium ${
              client.status === "at_risk"
                ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
                : client.status === "healthy"
                  ? "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200"
                  : "border-white/15 text-[var(--text-secondary)]"
            }`}
          >
            {client.status === "at_risk" ? "At risk" : client.status === "healthy" ? "Healthy" : "Too new to judge"}
          </span>
        </header>

        <Link
          href={next.href}
          className="group mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition-colors hover:border-cyan-300/30"
        >
          <span className="flex items-start gap-3">
            {next.icon}
            <span>
              <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Next step</span>
              <span className="mt-0.5 block font-semibold text-white">{next.title}</span>
              <span className="mt-0.5 block text-sm text-[var(--text-secondary)]">{next.body}</span>
            </span>
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-200 group-hover:text-cyan-100">
            {next.cta} <ArrowRight className="size-4" aria-hidden />
          </span>
        </Link>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 lg:col-span-2" aria-labelledby="activity">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="activity" className="text-lg font-semibold">Activity</h2>
              <span className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                <span className="inline-flex items-center gap-1"><span className="size-2 rounded-sm bg-white/25" />Raised</span>
                <span className="inline-flex items-center gap-1"><span className="size-2 rounded-sm bg-[var(--accent)]" />Resolved</span>
              </span>
            </div>
            {chart.length >= 2 ? (
              <div className="mt-5 flex h-40 items-end gap-3" role="img" aria-label={`Tickets raised and resolved over the last ${chart.length} months`}>
                {chart.map((m) => (
                  <div key={m.month} className="flex h-full flex-1 flex-col items-center justify-end">
                    <div className="flex h-full w-full items-end justify-center gap-1">
                      <div className="w-1/2 max-w-5 rounded-t bg-white/20" style={{ height: `${Math.max(3, (m.opened / max) * 100)}%` }} title={`${m.opened} raised`} />
                      <div className="w-1/2 max-w-5 rounded-t bg-[var(--accent)]" style={{ height: `${Math.max(3, (m.closed / max) * 100)}%` }} title={`${m.closed} resolved`} />
                    </div>
                    <span className="mt-1.5 text-[11px] text-[var(--text-muted)]">{MONTHS[Number(m.month.slice(5, 7)) - 1]}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--text-secondary)]">Not enough recent tickets to chart yet.</p>
            )}
            {lastMonth ? (
              <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-4 text-sm sm:grid-cols-4">
                <Stat label="Resolved last month" value={String(lastMonth.closed)} />
                {lastMonth.firstResponseHours != null ? <Stat label="Typical first response" value={formatDuration(lastMonth.firstResponseHours)} /> : null}
                {lastMonth.resolutionHours != null ? <Stat label="Typical time to resolve" value={formatDuration(lastMonth.resolutionHours)} /> : null}
                <Stat label="Open at month end" value={String(lastMonth.openAtEnd)} />
              </dl>
            ) : null}
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5" aria-labelledby="margin">
            <h2 id="margin" className="flex items-center gap-1 text-lg font-semibold">
              Margin
              <InfoTip label="margin">
                Monthly value divided by the hours your team logged for this client over the last three months,
                compared with your typical client.
              </InfoTip>
            </h2>
            {client.margin?.revenuePerHour != null ? (
              <>
                <p className="mt-3 text-3xl font-semibold tracking-tight">
                  {money(client.margin.revenuePerHour)}
                  <span className="text-base font-medium text-[var(--text-muted)]"> per hour</span>
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {client.margin.hoursPerMonth} hours a month
                  {client.margin.vsMedian != null && median ? (
                    <span className={client.margin.vsMedian < 0.75 ? "text-amber-200" : ""}>
                      {" "}
                      · {Math.round(client.margin.vsMedian * 100)}% of your typical {money(median)}
                    </span>
                  ) : null}
                </p>
                {client.margin.repriceMonthlyGap ? (
                  <p className="mt-3 rounded-xl border border-amber-300/25 bg-amber-300/[0.06] p-3 text-sm text-amber-100">
                    Takes far more time than it pays for: {money(client.margin.repriceMonthlyGap)} a month short of your typical rate.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                Not measured{client.margin?.unmeasuredReason ? `: ${client.margin.unmeasuredReason.charAt(0).toLowerCase()}${client.margin.unmeasuredReason.slice(1)}` : ""}.
              </p>
            )}
          </section>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 lg:col-span-2" aria-labelledby="signals">
            <h2 id="signals" className="text-lg font-semibold">What Handover sees</h2>
            {client.signals.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--text-secondary)]">Nothing has changed against this client&apos;s own history.</p>
            ) : (
              <ul className="mt-3 divide-y divide-white/[0.06]">
                {[...risks, ...housekeeping].map((signal) => (
                  <li key={signal.type} className="py-3">
                    <Link href={`/attention?finding=${client.clientId}:${signal.type}`} className="group flex items-start gap-3">
                      {signal.kind === "risk" ? (
                        <CircleAlert className="mt-0.5 size-4 shrink-0 text-cyan-200" aria-hidden />
                      ) : (
                        <Wrench className="mt-0.5 size-4 shrink-0 text-[var(--text-muted)]" aria-hidden />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-white group-hover:text-cyan-100">{signal.label}</span>
                        {signal.fact ? <span className="block text-sm text-[var(--text-secondary)]">{signal.fact}</span> : null}
                      </span>
                      <ArrowRight className="mt-0.5 size-4 text-[var(--text-muted)] group-hover:text-white" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5" aria-labelledby="people">
            <h2 id="people" className="text-lg font-semibold">People</h2>
            {client.contacts.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm">
                {client.contacts.map((contact) => (
                  <li key={contact.email} className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-white">{contact.name ?? contact.email}</span>
                      <span className="block truncate text-xs text-[var(--text-muted)]">
                        {contact.tickets} ticket{contact.tickets === 1 ? "" : "s"} in six months
                      </span>
                    </span>
                    <a href={`mailto:${contact.email}`} className="shrink-0 text-[var(--text-secondary)] hover:text-white" aria-label={`Email ${contact.name ?? contact.email}`}>
                      <Mail className="size-4" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[var(--text-secondary)]">Contacts appear after the next scan.</p>
            )}
            <Link
              href={`/receipts?client=${client.clientId}`}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-200 hover:text-cyan-100"
            >
              <ReceiptText className="size-4" aria-hidden /> Value Receipt
            </Link>
          </section>
        </div>

        {history.length > 0 ? (
          <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5" aria-labelledby="history">
            <h2 id="history" className="text-lg font-semibold">History</h2>
            <ul className="mt-3 divide-y divide-white/[0.06] text-sm">
              {history.map((row, index) => (
                <li key={`${row.findingType}-${row.raisedAt}-${index}`} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
                  <span>
                    <span className="font-medium text-white">{getFindingCopy(row.findingType).label}</span>
                    <span className="text-[var(--text-muted)]"> · raised {day(row.raisedAt)}</span>
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    {row.outcome === "resolved"
                      ? "Cleared"
                      : row.actioned
                        ? row.actionType === "normal_for_client"
                          ? "Marked normal"
                          : `Handled${row.actionedAt ? ` ${day(row.actionedAt)}` : ""}`
                        : "No action yet"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="mt-6 text-xs text-[var(--text-muted)]">
          From your scan on {new Date(scannedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.
        </p>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[var(--text-muted)]">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold text-white">{value}</dd>
    </div>
  );
}
