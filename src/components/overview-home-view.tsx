"use client";

import { useEffect, useMemo, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

export type OverviewMonthlyStats = {
  this_month: number;
  last_month: number;
};

export type OverviewProject = {
  id: string;
  project_name: string | null;
  title?: string | null;
  input_text: string;
  output_json: Record<string, unknown> | null;
  created_at: string;
};

export type OverviewCampaign = {
  id?: string;
  name?: string | null;
  next_run_at: string | null;
  enabled?: boolean;
};

export type OverviewDashStats = {
  total: number;
  thisMonth: number;
  monthName: string;
  lastAgo: string;
  lastTitle: string;
};

type Props = {
  userFirstName: string | null;
  dashStats: OverviewDashStats | null;
  projects: OverviewProject[];
  campaigns: OverviewCampaign[];
  monthlyStats?: OverviewMonthlyStats | null;
  monthlyStatsLoading?: boolean;
  loading?: boolean;
  formatRelativeTime: (iso: string) => string;
  onSelectProject: (project: OverviewProject) => void;
  onGoToGenerate: () => void;
  onGoToDelivery: () => void;
};

export function normaliseClientName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+(ltd|limited|llc|inc|plc|group|co|corp)\.?$/i, "")
    .trim();
}

type ActivityPeriod = "30d" | "3m" | "6m" | "12m";

const ACTIVITY_PERIOD_OPTIONS: { id: ActivityPeriod; label: string }[] = [
  { id: "30d", label: "30 days" },
  { id: "3m", label: "3 months" },
  { id: "6m", label: "6 months" },
  { id: "12m", label: "12 months" },
];

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function formatWeekOfLabel(d: Date): string {
  return `Week of ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

function formatMonthYearLabel(d: Date): string {
  return `${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function pickDisplayClientName(names: string[]): string {
  if (names.length === 0) return "";
  const counts = new Map<string, number>();
  for (const n of names) {
    counts.set(n, (counts.get(n) ?? 0) + 1);
  }
  let best = names[0];
  let bestCount = -1;
  for (const n of names) {
    const c = counts.get(n) ?? 0;
    if (c > bestCount || (c === bestCount && n.length < best.length)) {
      best = n;
      bestCount = c;
    }
  }
  return best;
}

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function cleanGenerationTitle(title: string): string {
  if (!title) return "Untitled report";
  if (title.startsWith("QBR CONTEXT:") || title.startsWith("QBR:")) return "QBR Report";
  const cleaned = title
    .replace(/[═=─\-]{3,}.*/g, "")
    .replace(/HaloPSA Export.*$/i, "HaloPSA Import")
    .replace(/ConnectWise Export.*$/i, "ConnectWise Import")
    .trim();
  if (!cleaned || cleaned.length < 3) return "Untitled report";
  if (cleaned.length > 45) return `${cleaned.substring(0, 42)}...`;
  return cleaned;
}

function looksLikeGenerationTitle(value: string): boolean {
  const t = value.trim();
  if (!t) return true;
  if (t.startsWith("QBR CONTEXT:") || t.startsWith("QBR:")) return true;
  if (t.length > 60) return true;
  if (/Source:\s*(?:HaloPSA|ConnectWise)/i.test(t)) return true;
  if (t.includes("═══ TICKET") || t.includes("═══ PROJECT")) return true;
  return false;
}

function clientNameFromActions(output: Record<string, unknown> | null): string | null {
  const actions = output?.actions;
  if (!Array.isArray(actions)) return null;
  for (const row of actions) {
    if (!row || typeof row !== "object") continue;
    const raw = (row as { client_name?: string }).client_name;
    if (typeof raw !== "string") continue;
    const name = raw.trim();
    if (!name) continue;
    const lower = name.toLowerCase();
    if (lower === "null" || lower === "unassigned") continue;
    return name;
  }
  return null;
}

/** MSP client name for grouping — not generation titles or prompts. */
export function mspClientNameFromProject(p: OverviewProject): string | null {
  const fromActions = clientNameFromActions(p.output_json);
  if (fromActions) return fromActions;

  const fromInput = p.input_text.match(/^Client:\s*(.+)$/m)?.[1]?.trim();
  if (fromInput) return fromInput;

  for (const candidate of [p.project_name, p.title]) {
    const raw = candidate?.trim();
    if (!raw || looksLikeGenerationTitle(raw)) continue;
    const beforeDash = raw.split(/\s*[-–—]\s+/)[0]?.trim();
    const name = beforeDash && !looksLikeGenerationTitle(beforeDash) ? beforeDash : raw;
    if (name && !looksLikeGenerationTitle(name)) return name;
  }

  return null;
}

function clientLabelFromProject(p: OverviewProject): string | null {
  return mspClientNameFromProject(p);
}

function rawGenerationTitle(p: OverviewProject): string {
  return (
    p.project_name?.trim() ||
    p.title?.trim() ||
    (p.input_text || "").trim().slice(0, 80) ||
    ""
  );
}

function displayTitleForProject(p: OverviewProject): string {
  return cleanGenerationTitle(rawGenerationTitle(p));
}

function outputTypePills(o: Record<string, unknown> | null): string[] {
  if (!o) return [];
  const pills: string[] = [];
  if (Array.isArray(o.actions) && o.actions.length > 0) pills.push("Actions");
  if (Array.isArray(o.risks) && o.risks.length > 0) pills.push("Risks");
  if (typeof o.summary === "string" && o.summary.trim()) pills.push("Status");
  if (typeof o.client_email === "string" && o.client_email.trim()) pills.push("Email");
  return pills;
}

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning,";
  if (h < 17) return "Good afternoon,";
  return "Good evening,";
}

function formatTodayDate(): string {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const statCardBase =
  "rounded-[var(--radius-lg)] border border-[var(--border)] border-t-2 border-t-[var(--accent)] bg-[var(--bg-secondary)] p-5";

function StatCardSkeleton() {
  return (
    <div className={cn(statCardBase, "animate-pulse")}>
      <div className="h-3 w-24 rounded bg-white/5" />
      <div className="mt-4 h-10 w-16 rounded bg-white/5" />
      <div className="mt-2 h-3 w-20 rounded bg-white/5" />
    </div>
  );
}

function WeekCardSkeleton() {
  return (
    <div className={cn(statCardBase, "animate-pulse")}>
      <div className="h-3 w-32 rounded bg-white/5" />
      <div className="mt-4 h-9 w-10 rounded bg-white/5" />
      <div className="mt-3 space-y-1.5">
        <div className="h-3 w-full rounded bg-white/5" />
        <div className="h-3 w-[80%] rounded bg-white/5" />
      </div>
    </div>
  );
}

export function OverviewHomeView({
  userFirstName,
  dashStats,
  projects,
  campaigns,
  monthlyStats = null,
  monthlyStatsLoading = false,
  loading = false,
  formatRelativeTime,
  onSelectProject,
  onGoToGenerate,
  onGoToDelivery,
}: Props) {
  const weekMetrics = useMemo(() => {
    const now = new Date();
    const activeSchedules = campaigns.filter((c) => c.enabled !== false);
    const fourteenDaysAgo = now.getTime() - 14 * 24 * 60 * 60 * 1000;
    const byClient = new Map<string, { lastMs: number; displayNames: string[] }>();
    for (const p of projects) {
      const clientName = mspClientNameFromProject(p);
      if (!clientName) continue;
      const key = normaliseClientName(clientName);
      if (!key) continue;
      const t = new Date(p.created_at).getTime();
      const prev = byClient.get(key);
      if (prev === undefined) {
        byClient.set(key, { lastMs: t, displayNames: [clientName] });
      } else {
        prev.lastMs = Math.max(prev.lastMs, t);
        if (!prev.displayNames.includes(clientName)) {
          prev.displayNames.push(clientName);
        }
      }
    }
    const staleClients: string[] = [];
    for (const { lastMs, displayNames } of byClient.values()) {
      if (lastMs < fourteenDaysAgo) {
        staleClients.push(pickDisplayClientName(displayNames));
      }
    }
    const uniqueStale = [...new Set(staleClients)].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
    const monthStart = new Date(
      Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1, 0, 0, 0, 0),
    ).getTime();
    const activeClientsThisMonth = new Set<string>();
    for (const p of projects) {
      if (new Date(p.created_at).getTime() < monthStart) continue;
      const clientName = mspClientNameFromProject(p);
      if (clientName) activeClientsThisMonth.add(normaliseClientName(clientName));
    }
    return {
      activeScheduleCount: activeSchedules.length,
      activeScheduleNames: activeSchedules
        .map((c) => c.name?.trim() || "Weekly Report")
        .slice(0, 5),
      staleCount: uniqueStale.length,
      staleNames: uniqueStale.slice(0, 3),
      activeClientsThisMonth: activeClientsThisMonth.size,
    };
  }, [campaigns, projects]);

  const recentProjects = useMemo(
    () =>
      [...projects]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .slice(0, 5),
    [projects],
  );

  const monthMom = useMemo(() => {
    if (!monthlyStats) return null;
    const { this_month: thisMonth, last_month: lastMonth } = monthlyStats;
    if (lastMonth > 0) {
      const pct = Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
      if (pct > 0) return { direction: "up" as const, pct };
      if (pct < 0) return { direction: "down" as const, pct: Math.abs(pct) };
      return null;
    }
    if (thisMonth > 0) return { direction: "new" as const };
    return null;
  }, [monthlyStats]);

  const [activityDates, setActivityDates] = useState<string[]>([]);
  const [activityPeriod, setActivityPeriod] = useState<ActivityPeriod>("30d");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/stats/activity", { credentials: "same-origin" });
        if (!res.ok) {
          if (!cancelled) setActivityDates([]);
          return;
        }
        const data = (await res.json()) as { dates?: unknown };
        if (!cancelled) {
          setActivityDates(
            Array.isArray(data.dates)
              ? data.dates.filter((d): d is string => typeof d === "string")
              : [],
          );
        }
      } catch {
        if (!cancelled) setActivityDates([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activityChartData = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const parsedDates = activityDates
      .map((iso) => ({ iso, t: Date.parse(iso) }))
      .filter((d) => Number.isFinite(d.t));

    if (activityPeriod === "30d") {
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (29 - i));
        return localDateKey(d);
      });
      return last30Days.map((date) => ({
        date,
        label: date.slice(5),
        count: parsedDates.filter((d) => localDateKey(new Date(d.t)) === date).length,
      }));
    }

    const periodDays =
      activityPeriod === "3m" ? 90 : activityPeriod === "6m" ? 180 : 365;
    const start = new Date(now);
    start.setDate(start.getDate() - periodDays + 1);

    if (activityPeriod === "12m") {
      const buckets: { date: string; label: string; count: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        buckets.push({
          date: key,
          label: formatMonthYearLabel(d),
          count: 0,
        });
      }
      for (const { t } of parsedDates) {
        const created = new Date(t);
        if (created < start) continue;
        const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;
        const bucket = buckets.find((b) => b.date === key);
        if (bucket) bucket.count += 1;
      }
      return buckets;
    }

    const numWeeks = Math.ceil(periodDays / 7);
    const buckets = Array.from({ length: numWeeks }, (_, i) => {
      const weekStart = new Date(start);
      weekStart.setDate(weekStart.getDate() + i * 7);
      return {
        date: weekStart.toISOString(),
        label: formatWeekOfLabel(weekStart),
        count: 0,
      };
    });
    for (const { t } of parsedDates) {
      const created = new Date(t);
      if (created < start) continue;
      const daysDiff = Math.floor(
        (created.getTime() - start.getTime()) / 86_400_000,
      );
      const weekIdx = Math.min(Math.floor(daysDiff / 7), numWeeks - 1);
      buckets[weekIdx]!.count += 1;
    }
    return buckets;
  }, [activityDates, activityPeriod]);

  const activityChartTitle =
    activityPeriod === "30d"
      ? "Activity — last 30 days"
      : activityPeriod === "3m"
        ? "Activity — last 3 months"
        : activityPeriod === "6m"
          ? "Activity — last 6 months"
          : "Activity — last 12 months";

  return (
    <div className="w-full bg-transparent px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="border-b border-white/5 pb-8 mb-8">
          <h1 className="text-[36px] font-bold tracking-tight text-white">
            {timeGreeting()}{" "}
            {userFirstName ? (
              <span className="bg-gradient-to-r from-white to-[var(--accent)] bg-clip-text text-transparent">
                {userFirstName}
              </span>
            ) : (
              <span className="text-[var(--text-secondary)]">there</span>
            )}
          </h1>
          <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
            {formatTodayDate()}
          </p>
        </header>

        {loading ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
            <div className="mt-4 h-32 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] animate-pulse" />
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <WeekCardSkeleton />
              <WeekCardSkeleton />
              <WeekCardSkeleton />
            </div>
            <div className="mt-8">
              <div className="mb-3 h-3 w-28 rounded bg-white/5 animate-pulse" />
              <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)]">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-3 border-l-2 border-transparent px-4 py-4",
                      i < 4 && "border-b border-[var(--border)]",
                    )}
                  >
                    <div className="h-4 min-w-0 flex-1 rounded bg-white/5 animate-pulse" />
                    <div className="h-5 w-20 rounded-full bg-white/5 animate-pulse" />
                    <div className="h-3 w-16 rounded bg-white/5 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {dashStats ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div
                  className={cn(
                    statCardBase,
                    "shadow-[0_0_30px_rgba(14,165,233,0.08)]",
                  )}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
                    Total generations
                  </p>
                  <p className="mt-2 text-[40px] font-bold leading-none text-white">
                    {dashStats.total}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                    Since launch
                  </p>
                </div>
                <div className={statCardBase}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
                    This month
                  </p>
                  {monthlyStatsLoading ? (
                    <div className="mt-2 h-10 w-16 animate-pulse rounded bg-white/5" />
                  ) : (
                    <p className="mt-2 text-[40px] font-bold leading-none text-white">
                      {monthlyStats?.this_month ?? 0}
                    </p>
                  )}
                  {monthlyStatsLoading ? (
                    <div className="mt-1 h-3 w-36 animate-pulse rounded bg-white/5" />
                  ) : monthMom?.direction === "up" ? (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-green-400">
                      <TrendingUp className="size-3 shrink-0" aria-hidden />
                      {monthMom.pct}% vs last month
                    </p>
                  ) : monthMom?.direction === "down" ? (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-red-400">
                      <TrendingDown className="size-3 shrink-0" aria-hidden />
                      {monthMom.pct}% vs last month
                    </p>
                  ) : monthMom?.direction === "new" ? (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-green-400">
                      <TrendingUp className="size-3 shrink-0" aria-hidden />
                      New activity this month
                    </p>
                  ) : null}
                </div>
                <div className={statCardBase}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
                    Last generated
                  </p>
                  <p className="mt-2 text-[40px] font-bold leading-none text-white">
                    {dashStats.lastAgo}
                  </p>
                  <p
                    className="mt-1 truncate text-[11px] text-[var(--text-muted)]"
                    title={dashStats.lastTitle}
                  >
                    {cleanGenerationTitle(dashStats.lastTitle)}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
                  {activityChartTitle}
                </p>
                <div
                  className="inline-flex flex-wrap items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--bg-primary)] p-0.5"
                  role="group"
                  aria-label="Activity time period"
                >
                  {ACTIVITY_PERIOD_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setActivityPeriod(opt.id)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors",
                        activityPeriod === opt.id
                          ? "border-[var(--accent)]/30 bg-[var(--accent)]/20 text-white"
                          : "border-transparent text-[var(--text-secondary)] hover:text-white",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-3 h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={activityChartData}
                    margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                      minTickGap={28}
                    />
                    <YAxis hide domain={[0, "auto"]} />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.04)" }}
                      contentStyle={{
                        background: "var(--bg-primary)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius)",
                        fontSize: 11,
                      }}
                      labelStyle={{ color: "var(--text-secondary)" }}
                      formatter={(value) => [
                        typeof value === "number" ? value : String(value ?? 0),
                        "Reports",
                      ]}
                    />
                    <Bar
                      name="Reports"
                      dataKey="count"
                      fill="var(--accent)"
                      fillOpacity={0.8}
                      radius={[3, 3, 0, 0]}
                      maxBarSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div
                className={cn(
                  "rounded-[var(--radius-lg)] border p-5",
                  weekMetrics.activeScheduleCount > 0
                    ? "border-green-500/20 bg-green-500/5"
                    : "border-[var(--border)] bg-[var(--bg-secondary)]",
                )}
              >
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
                  ACTIVE SCHEDULES
                </p>
                <p className="mt-2 text-[32px] font-bold text-white">
                  {weekMetrics.activeScheduleCount}
                </p>
                {weekMetrics.activeScheduleCount === 0 ? (
                  <p className="mt-2 text-[12px] text-[var(--text-secondary)]">
                    No active schedules — create one to automate your reporting.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-0.5 text-[12px] text-[var(--text-secondary)]">
                    {weekMetrics.activeScheduleNames.map((name, i) => (
                      <li key={i} className="truncate">
                        {name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div
                className={cn(
                  "rounded-[var(--radius-lg)] border p-5",
                  weekMetrics.staleCount > 0
                    ? "border-amber-500/20 bg-amber-500/5"
                    : "border-[var(--border)] bg-[var(--bg-secondary)]",
                )}
              >
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
                  Clients without a recent report
                </p>
                <p className="mt-2 text-[32px] font-bold text-white">
                  {weekMetrics.staleCount}
                </p>
                {weekMetrics.staleCount === 0 ? (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
                    <span
                      className="size-1.5 shrink-0 rounded-full bg-[var(--success)]"
                      aria-hidden
                    />
                    All clients up to date
                  </p>
                ) : (
                  <ul className="mt-2 space-y-0.5 text-[12px] text-[var(--text-secondary)]">
                    {weekMetrics.staleNames.map((name, i) => (
                      <li key={i} className="truncate">
                        {name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-[var(--radius-lg)] border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
                  Active clients this month
                </p>
                <p className="mt-2 text-[32px] font-bold text-white">
                  {weekMetrics.activeClientsThisMonth}
                </p>
                <p className="mt-2 text-[12px] text-[var(--text-secondary)]">
                  Unique clients with a generation
                </p>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
                Recent activity
              </h2>
              {recentProjects.length === 0 ? (
                <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-8 text-center">
                  <p className="text-[14px] text-[var(--text-secondary)]">
                    No reports generated yet — generate your first report to get
                    started.
                  </p>
                  <button
                    type="button"
                    onClick={onGoToGenerate}
                    className="mt-4 text-[13px] font-medium text-[var(--accent)] transition-colors hover:text-white"
                  >
                    Generate now →
                  </button>
                </div>
              ) : (
                <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)]">
                  {recentProjects.map((p, idx) => {
                    const title = displayTitleForProject(p);
                    const client = clientLabelFromProject(p);
                    const clientSecondary =
                      client &&
                      client.toLowerCase() !== title.toLowerCase()
                        ? client
                        : null;
                    const pills = outputTypePills(
                      p.output_json as Record<string, unknown> | null,
                    );
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onSelectProject(p)}
                        className={cn(
                          "flex w-full items-center gap-3 border-l-2 border-transparent px-4 py-4 text-left transition-colors duration-150 hover:border-[var(--accent)] hover:bg-white/[0.02]",
                          idx < recentProjects.length - 1 &&
                            "border-b border-[var(--border)]",
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-medium text-white">
                            {title}
                          </p>
                          {clientSecondary ? (
                            <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">
                              {clientSecondary}
                            </p>
                          ) : null}
                          {pills.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {pills.map((pill) => (
                                <span
                                  key={pill}
                                  className="rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-2 py-0.5 text-[11px] text-[var(--accent)]"
                                >
                                  {pill}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <span className="shrink-0 text-[11px] text-[var(--text-secondary)]">
                          {formatRelativeTime(p.created_at)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onGoToGenerate}
                className="rounded-[var(--radius)] border border-[var(--border)] px-5 py-2.5 text-[13px] text-white transition-colors hover:bg-white/5"
              >
                New Generation →
              </button>
              <button
                type="button"
                onClick={onGoToDelivery}
                className="rounded-[var(--radius)] border border-[var(--border)] px-5 py-2.5 text-[13px] text-white transition-colors hover:bg-white/5"
              >
                View Delivery Health →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
