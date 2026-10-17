"use client";

import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  Mail,
  Minus,
} from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { WeekListView } from "@/app/(app)/week/week-list-view";
import { InfoTip } from "@/components/info-tip";
import type { ReadinessLevel } from "@/lib/psa-readiness";
import type { PortfolioSummary, TrendPoint } from "@/lib/server/portfolio-summary";

type Props = {
  summary: PortfolioSummary | null;
  firstName: string;
  /** null when the setting cannot be stored yet. */
  briefEnabled: boolean | null;
  team: string[];
  stored: boolean;
};

const COUNT_WORDS = ["No", "One", "Two", "Three", "Four", "Five"];

function money(value: number): string {
  return `£${Math.round(value).toLocaleString("en-GB")}`;
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function WeekClient({ summary, firstName, briefEnabled, team, stored }: Props) {
  if (!summary) {
    return (
      <main className="min-h-screen px-4 pb-16 text-[var(--text-primary)] sm:px-6 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <Eyebrow />
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {firstName ? `Welcome, ${firstName}.` : "Welcome."} Let&apos;s find what needs you.
          </h1>
          <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <h2 className="text-xl font-semibold">Run your first scan</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              Handover reads your PSA, read-only, and builds your week from it: the clients that changed,
              what they are worth, what renews soon and what to do first. It takes about a minute.
            </p>
            <Link
              href="/attention"
              className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[#07111f] transition-opacity hover:opacity-90"
            >
              Start the scan <ArrowRight className="size-4" aria-hidden />
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const s = summary;
  const urgent = s.list.rows.filter((row) => !row.proactive).length;
  const headline =
    urgent === 0
      ? "Nothing urgent this week. Here is what is worth doing."
      : urgent <= 5
        ? `${COUNT_WORDS[urgent]} thing${urgent === 1 ? " needs" : "s need"} you this week.`
        : `${urgent} things need you this week. Start at the top.`;

  return (
    <main className="min-h-screen px-4 pb-16 text-[var(--text-primary)] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow />
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {firstName ? `${firstName}, ` : ""}
              {firstName ? headline.charAt(0).toLowerCase() + headline.slice(1) : headline}
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {s.clientsMonitored} client{s.clientsMonitored === 1 ? "" : "s"} monitored · last scan{" "}
              {new Date(s.scannedAt).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
        </header>

        <HowItWorks />

        <WeekListView list={s.list} scanSessionId={s.scanSessionId} team={team} stored={stored} />

        <h2 className="mt-10 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Your book</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            label="Revenue at Risk"
            value={s.revenueAtRisk.annual > 0 ? money(s.revenueAtRisk.annual) : `${s.revenueAtRisk.clients}`}
            suffix={s.revenueAtRisk.annual > 0 ? " a year" : s.revenueAtRisk.clients === 1 ? " client" : " clients"}
            note={
              s.revenueAtRisk.clients === 0
                ? "No client has changed"
                : `${s.revenueAtRisk.clients} client${s.revenueAtRisk.clients === 1 ? "" : "s"} changed`
            }
            delta={s.revenueAtRiskChange}
            tone="risk"
            href="/attention"
            tip="The yearly contract value of clients whose service or relationship has changed against their own history: fewer tickets, a key contact gone quiet, slower responses. It is the money that could walk if nobody acts."
          >
            <Sparkline points={s.trend} />
          </Kpi>
          <Kpi
            label="Renewing in 90 days"
            value={s.renewals90.annual > 0 ? money(s.renewals90.annual) : `${s.renewals90.count}`}
            suffix={s.renewals90.annual > 0 ? " a year" : s.renewals90.count === 1 ? " client" : " clients"}
            note={
              s.renewals90.atRiskAnnual > 0
                ? `${money(s.renewals90.atRiskAnnual)} with warning signs`
                : s.renewals90.count > 0
                  ? "No warning signs"
                  : "Nothing renews soon"
            }
            href="/renewals"
            tip="Contracts ending in the next 90 days, and how much of that sits with clients showing warning signs. Renewals left to the last minute get decided on price, so start these early."
          />
          <Kpi
            label="Saved Revenue"
            value={money(s.savedRevenue.annual)}
            suffix=" a year"
            note={
              s.savedRevenue.clients > 0
                ? `${s.savedRevenue.clients} client${s.savedRevenue.clients === 1 ? "" : "s"} recovered after you acted`
                : s.savedPending > 0
                  ? `${s.savedPending} handled, waiting on the next scans`
                  : "Grows as flagged clients recover"
            }
            tone="good"
            href="/attention?tab=history"
            tip="Clients you acted on whose warning signs then cleared, and who are still with you, counted at their yearly value. It is the return on Handover, in your own numbers."
          />
          {s.marginGap > 0 ? (
            <Kpi
              label="Margin gap"
              value={money(s.marginGap)}
              suffix=" a year"
              note="Thin-margin clients at your typical rate"
              tone="amber"
              href="/margin"
              tip="What your thin-margin clients would pay at your typical revenue per hour, for the time they take, minus what they pay now. Not money in the bank: a number to bring to their renewal."
            />
          ) : (
            <Kpi
              label="PSA readiness"
              value={`${s.readiness.readyCount} of ${s.readiness.items.length}`}
              note="Features your data fully supports"
              href="#readiness"
              tip="How much of Handover your PSA data can fully support today. Each gap below comes with the one change that fixes it."
            />
          )}
        </dl>

        {s.bookHealth ? <BookHealthStrip health={s.bookHealth} /> : null}

        {s.newFlags.length > 0 || s.clearedFlags.length > 0 ? (
          <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6" aria-labelledby="changes">
            <h2 id="changes" className="text-lg font-semibold">Since your last scan</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {s.newFlags.length > 0 ? (
                <ChangeList title={`${s.newFlags.length} new`} icon="new" items={s.newFlags} />
              ) : null}
              {s.clearedFlags.length > 0 ? (
                <ChangeList title={`${s.clearedFlags.length} cleared`} icon="cleared" items={s.clearedFlags} />
              ) : null}
            </div>
          </section>
        ) : null}

        <Readiness summary={s} />

        <BriefToggle initial={briefEnabled} />
      </div>
    </main>
  );
}

function BookHealthStrip({ health }: { health: NonNullable<PortfolioSummary["bookHealth"]> }) {
  const [open, setOpen] = useState(false);
  const tone = health.score >= 70 ? "text-emerald-300" : health.score >= 45 ? "text-amber-200" : "text-rose-300";
  return (
    <section className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4" aria-labelledby="book-health">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex min-h-0 w-full flex-wrap items-center justify-between gap-3 text-left"
      >
        <span className="flex items-baseline gap-3">
          <span id="book-health" className="text-sm text-[var(--text-secondary)]">Book health</span>
          <span className={`text-2xl font-semibold tabular-nums ${tone}`}>{health.score}</span>
          <span className="text-sm text-[var(--text-muted)]">out of 100</span>
        </span>
        <span className="text-xs font-semibold text-cyan-200">{open ? "Hide how it's worked out" : "How it's worked out"}</span>
      </button>
      {open ? (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {health.parts.map((part) => (
            <li key={part.key} className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-sm">
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-white">{part.label}</span>
                <span className="tabular-nums text-[var(--text-secondary)]">{part.score}</span>
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-[var(--text-muted)]">{part.detail}</span>
            </li>
          ))}
          <li className="text-xs leading-5 text-[var(--text-muted)] sm:col-span-2">
            The average of the measures your data supports. Higher is healthier. It moves as clients recover, renew and
            get repriced, so it is worth watching week to week rather than on its own.
          </li>
        </ul>
      ) : null}
    </section>
  );
}

function Eyebrow() {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">This week</p>
  );
}

function Kpi({
  label,
  value,
  suffix,
  note,
  delta,
  tone,
  href,
  tip,
  children,
}: {
  label: string;
  value: string;
  suffix?: string;
  note?: string;
  delta?: number | null;
  tone?: "risk" | "good" | "amber";
  href: string;
  /** Plain-English explanation shown from the "?" next to the label. */
  tip?: string;
  children?: React.ReactNode;
}) {
  const ring =
    tone === "risk"
      ? "border-cyan-300/30 bg-cyan-300/[0.05]"
      : tone === "good"
        ? "border-emerald-300/25 bg-emerald-300/[0.04]"
        : tone === "amber"
          ? "border-amber-300/25 bg-amber-300/[0.05]"
          : "border-white/10 bg-white/[0.035]";
  return (
    <div className={`group relative rounded-2xl border px-4 py-4 transition-colors hover:border-white/25 ${ring}`}>
      {/* Stretched link: the whole card opens the detail, while the "?" stays clickable. */}
      <Link href={href} className="absolute inset-0 rounded-2xl" aria-label={`Open ${label}`} />
      <dt className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
        {label}
        {tip ? <InfoTip label={label}>{tip}</InfoTip> : null}
      </dt>
      <dd className="mt-1.5 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight text-white">
          {value}
          {suffix ? <span className="text-base font-medium text-[var(--text-muted)]">{suffix}</span> : null}
        </span>
        {delta != null ? <Delta value={delta} /> : null}
      </dd>
      {note ? <p className="mt-1 truncate text-xs text-[var(--text-muted)]">{note}</p> : null}
      {children}
    </div>
  );
}

/** Up is bad for risk: an increase shows amber, a fall shows green. */
function Delta({ value }: { value: number }) {
  if (Math.round(value) === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-[var(--text-muted)]">
        <Minus className="size-3" aria-hidden /> no change
      </span>
    );
  }
  const up = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? "text-amber-200" : "text-emerald-300"}`}>
      {up ? <ArrowUpRight className="size-3.5" aria-hidden /> : <ArrowDownRight className="size-3.5" aria-hidden />}
      {money(Math.abs(value))}
      <span className="sr-only">{up ? "more than last scan" : "less than last scan"}</span>
    </span>
  );
}

function Sparkline({ points }: { points: TrendPoint[] }) {
  if (points.length < 2) return null;
  const width = 120;
  const height = 28;
  const values = points.map((point) => point.revenueAtRisk);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(1, max - min);
  const step = width / (points.length - 1);
  const path = values
    .map((value, index) => `${index === 0 ? "M" : "L"}${(index * step).toFixed(1)},${(height - ((value - min) / span) * (height - 4) - 2).toFixed(1)}`)
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="pointer-events-none absolute bottom-3 right-3 h-7 w-28 text-cyan-300/70"
      role="img"
      aria-label={`Revenue at Risk over the last ${points.length} scans, from ${money(values[0]!)} on ${shortDate(points[0]!.at)} to ${money(values.at(-1)!)}`}
    >
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChangeList({
  title,
  icon,
  items,
}: {
  title: string;
  icon: "new" | "cleared";
  items: Array<{ clientName: string; label: string }>;
}) {
  return (
    <div>
      <h3 className={`text-xs font-semibold uppercase tracking-[0.12em] ${icon === "new" ? "text-amber-200" : "text-emerald-300"}`}>
        {title}
      </h3>
      <ul className="mt-2 space-y-1.5 text-sm">
        {items.slice(0, 5).map((item, index) => (
          <li key={`${item.clientName}-${item.label}-${index}`} className="flex gap-2">
            {icon === "new" ? (
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-200/80" aria-hidden />
            ) : (
              <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-300/80" aria-hidden />
            )}
            <span>
              <span className="font-medium text-white">{item.clientName}</span>
              <span className="text-[var(--text-secondary)]"> · {item.label}</span>
            </span>
          </li>
        ))}
        {items.length > 5 ? <li className="pl-6 text-xs text-[var(--text-muted)]">and {items.length - 5} more</li> : null}
      </ul>
    </div>
  );
}

const LEVEL_ICON: Record<ReadinessLevel, React.ReactNode> = {
  ready: <CircleCheck className="size-4 text-emerald-300" aria-label="Ready" />,
  partial: <CircleDashed className="size-4 text-amber-200" aria-label="Partly ready" />,
  missing: <CircleAlert className="size-4 text-rose-300" aria-label="Not ready" />,
};

function Readiness({ summary }: { summary: PortfolioSummary }) {
  const { readiness } = summary;
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section id="readiness" className="mt-4 scroll-mt-24 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6" aria-labelledby="readiness-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="readiness-title" className="text-lg font-semibold">PSA readiness</h2>
        <span className="text-sm text-[var(--text-secondary)]">
          {readiness.readyCount} of {readiness.items.length} fully supported
        </span>
      </div>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
        How much of Handover your PSA data can support today, and the one change that unlocks each part.
        {readiness.unloggedClosedTickets != null && readiness.unloggedClosedTickets > 0
          ? ` ${readiness.unloggedClosedTickets.toLocaleString("en-GB")} tickets closed in the last three months have no time recorded, which is also time you could not bill.`
          : ""}
      </p>
      <ul className="mt-4 divide-y divide-white/[0.06]">
        {readiness.items.map((item) => {
          const expandable = Boolean(item.fix);
          const isOpen = open === item.key;
          return (
            <li key={item.key} className="py-3">
              <button
                type="button"
                disabled={!expandable}
                onClick={() => setOpen(isOpen ? null : item.key)}
                aria-expanded={expandable ? isOpen : undefined}
                className="flex w-full items-start gap-3 text-left disabled:cursor-default"
              >
                <span className="mt-0.5">{LEVEL_ICON[item.level]}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-white">{item.feature}</span>
                  <span className="block text-sm text-[var(--text-secondary)]">{item.status}</span>
                </span>
                {expandable ? (
                  <span className="shrink-0 text-xs font-semibold text-cyan-200">{isOpen ? "Hide fix" : "How to fix"}</span>
                ) : null}
              </button>
              {expandable && isOpen ? (
                <div className="ml-7 mt-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]">
                  {item.fix}
                  {item.actionHref ? (
                    <Link href={item.actionHref} className="mt-2 block font-semibold text-cyan-200 hover:text-cyan-100">
                      {item.actionLabel} →
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function BriefToggle({ initial }: { initial: boolean | null }) {
  const [enabled, setEnabled] = useState(initial ?? true);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  if (initial === null) return null;

  async function toggle() {
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
    <section className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <Mail className="mt-0.5 size-5 text-[var(--accent)]" aria-hidden />
        <div>
          <h2 className="text-base font-semibold">The Monday Brief</h2>
          <p className="mt-0.5 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
            The top five rows of this list in your inbox every Monday morning, after the weekly scan, with
            what is at risk and what changed. Each row links straight to its action.
          </p>
        </div>
      </div>
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
          aria-checked={enabled}
          aria-label="Email me the Monday Brief"
          onClick={() => void toggle()}
          disabled={state === "saving"}
          className={`relative h-6 min-h-0 w-11 shrink-0 rounded-full p-0 transition-colors ${enabled ? "bg-[var(--accent)]" : "bg-white/15"}`}
        >
          <span
            className={`absolute left-0 top-0.5 size-5 rounded-full bg-white shadow transition-transform motion-reduce:transition-none ${enabled ? "translate-x-5" : "translate-x-0.5"}`}
          />
        </button>
      </div>
    </section>
  );
}

const HOW_IT_WORKS_KEY = "handover:how-it-works-dismissed";

const STEPS: Array<{ verb: string; body: string; href: string; link: string }> = [
  { verb: "Detect", body: "Every week Handover re-reads your PSA and checks each client against its own history.", href: "/attention", link: "Revenue at Risk" },
  { verb: "Rank", body: "Warning signs, renewals, thin margins and quiet clients land on this one list, most valuable first.", href: "/renewals", link: "Renewal Radar" },
  { verb: "Act", body: "Every row has one action, often an email already written. Tell Handover what you thought and the list learns.", href: "/attention", link: "Save Plays" },
  { verb: "Prove", body: "Value Receipts show clients what you did, and Saved Revenue counts the clients you kept.", href: "/receipts", link: "Value Receipts" },
];

/** First-visit orientation, dismissible and remembered in this browser. */
function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(HOW_IT_WORKS_KEY) === "1";
  } catch {
    return false;
  }
}

function HowItWorks() {
  // Hidden on the server and until the browser says otherwise, so the strip
  // never flashes for someone who already dismissed it.
  const storedDismissed = useSyncExternalStore(
    () => () => {},
    readDismissed,
    () => true,
  );
  const [dismissedNow, setHidden] = useState(false);
  if (storedDismissed || dismissedNow) return null;
  return (
    <section className="mt-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.04] p-5" aria-label="How Handover works">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-sm font-semibold text-cyan-100">How Handover works</h2>
        <button
          type="button"
          onClick={() => {
            setHidden(true);
            try {
              window.localStorage.setItem(HOW_IT_WORKS_KEY, "1");
            } catch {
              // Private windows can block storage; hiding for this visit is enough.
            }
          }}
          className="min-h-0 text-xs font-medium text-[var(--text-muted)] hover:text-white"
        >
          Got it, hide this
        </button>
      </div>
      <ol className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => (
          <li key={step.verb} className="text-sm leading-6">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
              {index + 1}. {step.verb}
            </span>
            <p className="mt-1 text-[var(--text-secondary)]">{step.body}</p>
            <Link href={step.href} className="text-xs font-semibold text-cyan-200 hover:text-cyan-100">
              {step.link} →
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
