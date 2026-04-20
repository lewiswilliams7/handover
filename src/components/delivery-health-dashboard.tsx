"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUpDown,
  ArrowUp,
  CalendarClock,
  ClipboardList,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Loader2,
  RefreshCw,
  Search,
  Ticket,
  Timer,
  User,
  Eye,
} from "lucide-react";

import type {
  DeliveryHealthApiResponse,
  DeliveryHealthRag,
  DeliveryHealthRow,
  DeliveryHealthSlaRisk,
} from "@/lib/delivery-health";
import { formatDeliveryHealthRowForGeneration } from "@/lib/delivery-health";
import { DeliveryHealthDetailPanel } from "@/components/delivery-health-detail-panel";
import { usePSAConnections } from "@/hooks/use-psa-connections";
import {
  ellipsizeOwnerAtWord,
  isUnassignedOwnerCell,
  ownerCellLabel,
} from "@/lib/owner-cell-format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const VIEW_STORAGE_KEY = "delivery-health-view";

type ViewMode = "all" | "projects" | "tickets";

type StatusPortfolioFilter =
  | "all"
  | "in_progress"
  | "on_hold"
  | "new"
  | "resolved"
  | "closed"
  | `status:${string}`;
type PriorityPortfolioFilter = "all" | "high" | "medium" | "low";
type SlaPortfolioFilter = "all" | "overdue" | "at_risk" | "on_track";

function statusTokensForFilter(statusName: string): string {
  return statusName.trim().toLowerCase().replace(/\s+/g, " ");
}

function rowMatchesStatusPortfolioFilter(
  statusName: string,
  f: StatusPortfolioFilter,
): boolean {
  if (f === "all") return true;
  const t = statusTokensForFilter(statusName);

  const isResolved =
    /^(resolved|closed|completed|cancelled|canceled|duplicate|merged)\b/.test(t) ||
    /\bresolved\b/.test(t) ||
    /\bclosed\b/.test(t);

  const isHold =
    t.includes("on hold") ||
    t.includes("hold") ||
    t.includes("awaiting") ||
    t.includes("waiting for") ||
    t.includes("waiting on") ||
    t === "pending";

  const isNew =
    t === "new" ||
    t === "open" ||
    t.includes("triage") ||
    t.includes("not started") ||
    t === "logged";

  if (f === "resolved") return isResolved;
  if (f === "closed") return isResolved;
  if (f === "on_hold") return isHold && !isResolved;
  if (f === "new") return isNew && !isResolved && !isHold;
  if (f.startsWith("status:")) {
    const custom = f.slice("status:".length).trim().toLowerCase();
    return custom.length > 0 && t === custom;
  }
  if (f === "in_progress") {
    return !isResolved && !isHold && !isNew && t.length > 0;
  }
  return true;
}

function rowMatchesPriorityPortfolioFilter(
  priorityName: string | null | undefined,
  f: PriorityPortfolioFilter,
): boolean {
  if (f === "all") return true;
  const p = (priorityName ?? "").trim().toLowerCase();
  if (f === "high") {
    return (
      p.includes("high") ||
      p.includes("critical") ||
      p.includes("urgent") ||
      p === "p1" ||
      p === "1"
    );
  }
  if (f === "medium") {
    return (
      p.includes("medium") ||
      p.includes("normal") ||
      p.includes("standard") ||
      p === "p2" ||
      p === "p3" ||
      p === "2" ||
      p === "3"
    );
  }
  if (f === "low") {
    return p.includes("low") || p === "p4" || p === "p5" || p === "4" || p === "5";
  }
  return true;
}

function rowMatchesSlaPortfolioFilter(
  sla: DeliveryHealthSlaRisk | null | undefined,
  f: SlaPortfolioFilter,
): boolean {
  if (f === "all") return true;
  if (f === "overdue") return sla === "overdue";
  if (f === "at_risk") return sla === "at_risk";
  if (f === "on_track") return sla == null;
  return true;
}

type SortKey =
  | "clientName"
  | "rag"
  | "openTickets"
  | "overdueTickets"
  | "avgResponseTimeHours"
  | "ticketsThisWeek"
  | "activeProjects"
  | "projectHealth"
  | "lastReportSent"
  | "nextScheduledReport";

type Props = {
  focusRing: string;
  /** read: table only - no row detail or generate-from-dashboard (team permission). */
  dashboardAccess?: "full" | "read";
  onOpenIntegrations?: () => void;
  onOpenHaloImport?: () => void;
  onStartGenerationFromDelivery?: (payload: {
    text: string;
    clientName: string | null;
  }) => void;
};

function formatShortDate(iso: string | null): string {
  if (!iso) return " - ";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return " - ";
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return " - ";
  }
}

function formatRelativeRefreshed(iso: string): string {
  try {
    const d = new Date(iso).getTime();
    const s = Math.floor((Date.now() - d) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return formatShortDate(iso);
  } catch {
    return " - ";
  }
}

/** Relative time from an ISO date; for "last note" column. */
function formatRelativeFromIso(iso: string | null): string {
  if (!iso) return "No notes";
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return "No notes";
  const days = Math.floor((Date.now() - ms) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function daysSinceLastNote(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.floor((Date.now() - ms) / 86400000);
}

const RAG_GLOW: Record<DeliveryHealthRag, string> = {
  red: "0 0 20px rgba(248,113,113,0.35), 0 0 4px rgba(248,113,113,0.25)",
  amber: "0 0 18px rgba(251,191,36,0.32), 0 0 4px rgba(251,191,36,0.2)",
  green: "0 0 18px rgba(52,211,153,0.3), 0 0 4px rgba(52,211,153,0.2)",
  grey: "0 0 12px rgba(148,163,184,0.2)",
};

function SlaRiskBadge({ level }: { level: DeliveryHealthSlaRisk }) {
  if (level === "overdue") {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-red-600/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ring-1 ring-red-300/60">
        SLA OVERDUE
      </span>
    );
  }
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ring-1 ring-amber-300/55"
      style={{ backgroundColor: "#F59E0B" }}
    >
      SLA AT RISK
    </span>
  );
}

function RagLabelPlain({ rag }: { rag: DeliveryHealthRag }) {
  const label =
    rag === "red"
      ? "Red"
      : rag === "amber"
        ? "Amber"
        : rag === "green"
          ? "Green"
          : "No data";
  return (
    <span className="text-[12px] font-medium text-[var(--text-secondary)]">{label}</span>
  );
}

function SourcePill({ source }: { source: "halopsa" | "connectwise" }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
      {source === "connectwise" ? "ConnectWise" : "HaloPSA"}
    </span>
  );
}

function RagBadge({ rag, slaRisk }: { rag: DeliveryHealthRag; slaRisk?: DeliveryHealthSlaRisk | null }) {
  const label =
    rag === "red"
      ? "Red"
      : rag === "amber"
        ? "Amber"
        : rag === "green"
          ? "Green"
          : "No data";
  return (
    <span className="inline-flex shrink-0 flex-wrap items-center gap-1">
      <span
        className={cn(
          "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide transition-shadow duration-200",
          rag === "red" && "bg-red-500/25 text-red-200 ring-2 ring-red-400/50",
          rag === "amber" && "bg-amber-500/20 text-amber-200 ring-2 ring-amber-400/45",
          rag === "green" && "bg-emerald-500/20 text-emerald-200 ring-2 ring-emerald-400/45",
          rag === "grey" && "bg-slate-500/20 text-slate-300 ring-2 ring-slate-500/35",
        )}
        style={{ boxShadow: RAG_GLOW[rag] }}
      >
        {label}
      </span>
      {slaRisk ? <SlaRiskBadge level={slaRisk} /> : null}
    </span>
  );
}

function formatResponseTime(hours: number | null): string {
  if (hours == null || !Number.isFinite(hours) || hours < 0) return "0m";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  if (hours < 24) return `${Math.round(hours * 10) / 10}h`;
  return `${Math.round((hours / 24) * 10) / 10}d`;
}

function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-4",
        className,
      )}
    >
      <div className="h-3 w-24 animate-pulse rounded bg-[var(--border)]/80" />
      <div className="mt-3 h-8 w-16 animate-pulse rounded bg-[var(--border)]/60" />
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <tr className="border-b border-[var(--border)]/50">
      {Array.from({ length: 11 }).map((_, j) => (
        <td key={j} className="px-3 py-3">
          <div
            className="h-4 animate-pulse rounded bg-[var(--border)]/45"
            style={{ animationDelay: `${j * 50}ms` }}
          />
        </td>
      ))}
    </tr>
  );
}

export function DeliveryHealthDashboard({
  focusRing,
  dashboardAccess = "full",
  onOpenIntegrations,
  onOpenHaloImport,
  onStartGenerationFromDelivery,
}: Props) {
  const psaConnections = usePSAConnections();
  const cwEnabled = psaConnections.connectwise;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<DeliveryHealthApiResponse | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("clientName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [hydratedView, setHydratedView] = useState(false);
  const [detailRow, setDetailRow] = useState<DeliveryHealthRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const detailCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [clientFilter, setClientFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [ragFilter, setRagFilter] = useState<"all" | DeliveryHealthRag | "sla_at_risk">("all");
  const [statusPortfolioFilter, setStatusPortfolioFilter] =
    useState<StatusPortfolioFilter>("all");
  const [priorityPortfolioFilter, setPriorityPortfolioFilter] =
    useState<PriorityPortfolioFilter>("all");
  const [slaPortfolioFilter, setSlaPortfolioFilter] = useState<SlaPortfolioFilter>("all");

  useEffect(() => {
    if (data?.access !== "full" && ragFilter === "sla_at_risk") {
      setRagFilter("all");
    }
  }, [data?.access, ragFilter]);

  useEffect(() => {
    try {
      const v = localStorage.getItem(VIEW_STORAGE_KEY);
      if (v === "projects" || v === "tickets" || v === "all") setViewMode(v);
    } catch {
      /* ignore */
    }
    setHydratedView(true);
  }, []);

  useEffect(() => {
    if (!hydratedView) return;
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
    } catch {
      /* ignore */
    }
  }, [viewMode, hydratedView]);

  useEffect(() => {
    return () => {
      if (detailCloseTimerRef.current) clearTimeout(detailCloseTimerRef.current);
    };
  }, []);

  const swrKey = useMemo(() => {
    const params = new URLSearchParams();
    if (cwEnabled && psaConnections.primary === "connectwise") {
      params.set("source", "connectwise");
    }
    return `/api/delivery-health${params.toString() ? `?${params.toString()}` : ""}`;
  }, [cwEnabled, psaConnections.primary]);

  const {
    data: swrData,
    error: swrErr,
    isLoading: swrLoading,
    mutate: mutateHealth,
  } = useSWR<DeliveryHealthApiResponse>(
    swrKey,
    async (url: string) => {
      const res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
      const json = (await res.json()) as DeliveryHealthApiResponse & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not load dashboard.");
      return json;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 3 * 60 * 1000,
      keepPreviousData: true,
    },
  );

  useEffect(() => {
    setLoading(swrLoading);
    if (swrErr) {
      setFetchError(swrErr instanceof Error ? swrErr.message : "Could not load dashboard.");
      return;
    }
    if (swrData) {
      setData(swrData);
      setFetchError(null);
    }
    setRefreshing(false);
  }, [swrData, swrErr, swrLoading]);

  const scopedRows = useMemo(() => {
    if (!data?.rows) return [];
    if (viewMode === "all") return data.rows;
    return data.rows.filter((r) => (viewMode === "projects" ? r.kind === "project" : r.kind === "ticket"));
  }, [data, viewMode]);

  const filteredRows = useMemo(() => {
    const c = clientFilter.trim().toLowerCase();
    const o = ownerFilter.trim().toLowerCase();
    return scopedRows.filter((r) => {
      if (c && !r.clientName.toLowerCase().includes(c)) return false;
      if (o && !(r.owner ?? "").toLowerCase().includes(o)) return false;
      if (ragFilter === "sla_at_risk") {
        if (r.slaRisk !== "at_risk" && r.slaRisk !== "overdue") return false;
      } else if (ragFilter !== "all" && r.rag !== ragFilter) return false;
      if (!rowMatchesStatusPortfolioFilter(r.statusName, statusPortfolioFilter)) return false;
      if (!rowMatchesPriorityPortfolioFilter(r.priorityName, priorityPortfolioFilter))
        return false;
      if (!rowMatchesSlaPortfolioFilter(r.slaRisk, slaPortfolioFilter)) return false;
      return true;
    });
  }, [
    scopedRows,
    clientFilter,
    ownerFilter,
    ragFilter,
    statusPortfolioFilter,
    priorityPortfolioFilter,
    slaPortfolioFilter,
  ]);

  const dynamicStatusOptions = useMemo(() => {
    const base = new Set(["new", "in progress", "on hold", "resolved", "closed"]);
    const statuses = new Set<string>();
    for (const row of scopedRows) {
      const s = statusTokensForFilter(row.statusName);
      if (s && !base.has(s)) statuses.add(s);
    }
    return [...statuses].sort((a, b) => a.localeCompare(b));
  }, [scopedRows]);

  const statStrip = useMemo(() => {
    if (!data) return null;
    if (viewMode === "projects") return data.stats.projects;
    if (viewMode === "tickets") return data.stats.tickets;
    return {
      activeCount: data.stats.projects.activeCount + data.stats.tickets.activeCount,
      totalOpenActions: data.stats.projects.totalOpenActions + data.stats.tickets.totalOpenActions,
      totalOpenRisks: data.stats.projects.totalOpenRisks + data.stats.tickets.totalOpenRisks,
      overdueTargets: data.stats.projects.overdueTargets + data.stats.tickets.overdueTargets,
      avgHoursPerDayToTarget: data.stats.projects.avgHoursPerDayToTarget ?? data.stats.tickets.avgHoursPerDayToTarget ?? null,
    };
  }, [data, viewMode]);

  const nowMs = (() => {
    if (!data?.refreshedAt) return 0;
    const t = new Date(data.refreshedAt).getTime();
    return Number.isFinite(t) ? t : 0;
  })();

  const sortedRows = useMemo(() => {
    const rows = [...filteredRows];
    const dir = sortDir === "asc" ? 1 : -1;
    const ragOrder: Record<DeliveryHealthRag, number> = {
      red: 0,
      amber: 1,
      green: 2,
      grey: 3,
    };
    rows.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "clientName":
          cmp = a.clientName.localeCompare(b.clientName, undefined, {
            sensitivity: "base",
          });
          break;
        case "rag":
          cmp = ragOrder[a.rag] - ragOrder[b.rag];
          break;
        case "openTickets":
          cmp = (a as unknown as { openTickets?: number }).openTickets ?? 0 - ((b as unknown as { openTickets?: number }).openTickets ?? 0);
          break;
        case "overdueTickets":
          cmp = ((a as unknown as { overdueTickets?: number }).overdueTickets ?? 0) - ((b as unknown as { overdueTickets?: number }).overdueTickets ?? 0);
          break;
        case "avgResponseTimeHours":
          cmp = ((a as unknown as { avgResponseTimeHours?: number | null }).avgResponseTimeHours ?? -1) - ((b as unknown as { avgResponseTimeHours?: number | null }).avgResponseTimeHours ?? -1);
          break;
        case "ticketsThisWeek":
          cmp = ((a as unknown as { ticketsThisWeek?: number }).ticketsThisWeek ?? 0) - ((b as unknown as { ticketsThisWeek?: number }).ticketsThisWeek ?? 0);
          break;
        case "activeProjects":
          cmp = ((a as unknown as { activeProjects?: number }).activeProjects ?? 0) - ((b as unknown as { activeProjects?: number }).activeProjects ?? 0);
          break;
        case "lastReportSent": {
          const at = (a as unknown as { lastReportSent?: string | null }).lastReportSent ? new Date((a as unknown as { lastReportSent?: string | null }).lastReportSent as string).getTime() : 0;
          const bt = (b as unknown as { lastReportSent?: string | null }).lastReportSent ? new Date((b as unknown as { lastReportSent?: string | null }).lastReportSent as string).getTime() : 0;
          cmp = at - bt;
          break;
        }
        default:
          cmp = 0;
      }
      return cmp * dir;
    });
    return rows;
  }, [filteredRows, sortKey, sortDir]);

  const clientRows = useMemo(() => {
    const rows = filteredRows;
    const byClient = new Map<string, DeliveryHealthRow[]>();
    for (const row of rows) {
      const k = row.clientName || "Unknown";
      byClient.set(k, [...(byClient.get(k) ?? []), row]);
    }
    const now = nowMs;
    const sevenDaysMs = 7 * 24 * 3600 * 1000;
    const thirtyDaysMs = 30 * 24 * 3600 * 1000;
    const ragOrder: Record<DeliveryHealthRag, number> = { red: 3, amber: 2, green: 1, grey: 0 };
    return [...byClient.entries()].map(([clientName, list]) => {
      const tickets = list.filter((r) => r.kind === "ticket");
      const projects = list.filter((r) => r.kind === "project");
      const openTickets = tickets.length;
      const overdueTickets = tickets.filter((t) => (t.daysToTarget ?? 1) < 0 || t.slaRisk === "overdue").length;
      const ticketsThisWeek = tickets.filter((t) => {
        const created = t.createdAtIso ? new Date(t.createdAtIso).getTime() : NaN;
        return Number.isFinite(created) && now - created <= sevenDaysMs;
      }).length;
      const responseRows = tickets.filter((t) => {
        const created = t.createdAtIso ? new Date(t.createdAtIso).getTime() : NaN;
        return Number.isFinite(created) && now - created <= thirtyDaysMs;
      });
      const responseValues = responseRows
        .map((t) => {
          if (t.firstResponseHours != null && Number.isFinite(t.firstResponseHours)) {
            return t.firstResponseHours;
          }
          const created = t.createdAtIso ? new Date(t.createdAtIso).getTime() : NaN;
          if (!Number.isFinite(created)) return null;
          const fallback = Math.max(0, (now - created) / 3600000);
          return Number.isFinite(fallback) ? Math.round(fallback * 10) / 10 : null;
        })
        .filter((n): n is number => n != null);
      for (const t of responseRows.slice(0, 3)) {
        const createdIso = t.createdAtIso ?? null;
        const createdMs = createdIso ? new Date(createdIso).getTime() : NaN;
        const firstHours =
          t.firstResponseHours != null && Number.isFinite(t.firstResponseHours)
            ? t.firstResponseHours
            : null;
        const responseIso =
          firstHours != null && Number.isFinite(createdMs)
            ? new Date(createdMs + firstHours * 3600000).toISOString()
            : null;
        // Temporary debug output requested by user for verification.
        console.log("[delivery-health][response-time-debug]", {
          clientName,
          ticketId: t.id,
          createdAt: createdIso,
          firstResponseAt: responseIso,
          firstResponseHours: firstHours,
        });
      }
      const avgResponseTimeHours = responseValues.length > 0
        ? Math.round((responseValues.reduce((sum, n) => sum + n, 0) / responseValues.length) * 10) / 10
        : 0;
      const activeProjects = projects.length;
      const worstRag = list.reduce<DeliveryHealthRag>((acc, r) => (ragOrder[r.rag] > ragOrder[acc] ? r.rag : acc), "grey");
      const projectRag = projects.reduce<DeliveryHealthRag>(
        (acc, r) => (ragOrder[r.rag] > ragOrder[acc] ? r.rag : acc),
        "grey",
      );
      const ragScore = projectRag === "green" ? 100 : projectRag === "amber" ? 50 : 0;
      const slaKnownTickets = tickets.filter((t) => t.slaRisk != null);
      const slaCompliant = slaKnownTickets.filter((t) => t.slaRisk == null).length;
      const slaScore =
        slaKnownTickets.length > 0
          ? Math.max(0, Math.min(100, Math.round((slaCompliant / slaKnownTickets.length) * 100)))
          : 75;
      const overdueRatioScore =
        openTickets > 0 ? Math.max(0, Math.min(100, Math.round(((openTickets - overdueTickets) / openTickets) * 100))) : 100;
      const projectHealthPercent =
        projects.length > 0 || viewMode === "all"
          ? Math.max(
              0,
              Math.min(
                100,
                Math.round(ragScore * 0.4 + slaScore * 0.3 + overdueRatioScore * 0.3),
              ),
            )
          : null;
      const slaAtRiskCount = tickets.filter((t) => t.slaRisk === "at_risk" || t.slaRisk === "overdue").length;
      const lastReportSent = list
        .map((r) => r.lastGeneratedAt)
        .filter((x): x is string => Boolean(x))
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
      const representative =
        [...list].sort((a, b) => (ragOrder[b.rag] - ragOrder[a.rag]) || ((b.ticketAgeDays ?? 0) - (a.ticketAgeDays ?? 0)))[0] ?? null;
      return {
        clientName,
        rows: list,
        representative,
        openTickets,
        overdueTickets,
        avgResponseTimeHours,
        ticketsThisWeek,
        activeProjects,
        overallRag: worstRag,
        projectHealthPercent,
        slaAtRiskCount,
        lastReportSent,
        nextScheduledReport: null as string | null,
      };
    });
  }, [filteredRows, nowMs, viewMode]);

  const accessMode = data?.access;
  const fullMode = accessMode === "full";
  const liveAccess = accessMode === "full" || accessMode === "basic";
  const rowDetailInteractive = fullMode && dashboardAccess !== "read";

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      sortDir === "asc" ? (
        <ArrowUp className="size-3.5 opacity-70" aria-hidden />
      ) : (
        <ArrowDown className="size-3.5 opacity-70" aria-hidden />
      )
    ) : (
      <ArrowUpDown className="size-3.5 opacity-50" aria-hidden />
    );

  const headerCell = (key: SortKey, label: string, className?: string) => (
    <th
      scope="col"
      className={cn(
        "sticky top-0 z-10 bg-[var(--bg-secondary)] px-3 py-2.5 text-left shadow-[0_1px_0_var(--border)]",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => toggleSort(key)}
        className={cn(
          "inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]",
          focusRing,
        )}
      >
        {label}
        <SortIcon k={key} />
      </button>
    </th>
  );

  const sortedClientRows = useMemo(() => {
    const rows = [...clientRows];
    const dir = sortDir === "asc" ? 1 : -1;
    const ragOrder: Record<DeliveryHealthRag, number> = {
      red: 0,
      amber: 1,
      green: 2,
      grey: 3,
    };
    rows.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "clientName":
          cmp = a.clientName.localeCompare(b.clientName, undefined, { sensitivity: "base" });
          break;
        case "rag":
          cmp = ragOrder[a.overallRag] - ragOrder[b.overallRag];
          break;
        case "openTickets":
          cmp = a.openTickets - b.openTickets;
          break;
        case "overdueTickets":
          cmp = a.overdueTickets - b.overdueTickets;
          break;
        case "avgResponseTimeHours":
          cmp = (a.avgResponseTimeHours ?? 0) - (b.avgResponseTimeHours ?? 0);
          break;
        case "ticketsThisWeek":
          cmp = a.ticketsThisWeek - b.ticketsThisWeek;
          break;
        case "activeProjects":
          cmp = a.activeProjects - b.activeProjects;
          break;
        case "projectHealth":
          cmp = (a.projectHealthPercent ?? -1) - (b.projectHealthPercent ?? -1);
          break;
        case "lastReportSent": {
          const at = a.lastReportSent ? new Date(a.lastReportSent).getTime() : 0;
          const bt = b.lastReportSent ? new Date(b.lastReportSent).getTime() : 0;
          cmp = at - bt;
          break;
        }
        case "nextScheduledReport": {
          const at = a.nextScheduledReport ? new Date(a.nextScheduledReport).getTime() : 0;
          const bt = b.nextScheduledReport ? new Date(b.nextScheduledReport).getTime() : 0;
          cmp = at - bt;
          break;
        }
        default:
          cmp = 0;
      }
      return cmp * dir;
    });
    return rows;
  }, [clientRows, sortKey, sortDir]);

  const openRowDetail = useCallback(
    (row: DeliveryHealthRow) => {
      if (detailCloseTimerRef.current) {
        clearTimeout(detailCloseTimerRef.current);
        detailCloseTimerRef.current = null;
      }
      setDetailRow(row);
      requestAnimationFrame(() => setDetailOpen(true));
    },
    [],
  );

  const closeRowDetail = useCallback(() => {
    setDetailOpen(false);
    detailCloseTimerRef.current = setTimeout(() => {
      setDetailRow(null);
      detailCloseTimerRef.current = null;
    }, 200);
  }, []);

  const targetCell = (row: DeliveryHealthRow) => {
    if (row.daysToTarget == null) return <span className="text-[var(--text-muted)]"> - </span>;
    if (!fullMode) {
      if (row.daysToTarget < 0) {
        return (
          <span className="text-[var(--text-secondary)]">
            {Math.abs(row.daysToTarget)}d overdue
          </span>
        );
      }
      return <span className="text-[var(--text-secondary)]">{row.daysToTarget}d left</span>;
    }
    if (row.daysToTarget < 0) {
      return (
        <span className="font-medium text-red-400">
          {Math.abs(row.daysToTarget)}d overdue
        </span>
      );
    }
    return <span className="text-[var(--text-secondary)]">{row.daysToTarget}d left</span>;
  };

  const ageCellClass = (row: DeliveryHealthRow) =>
    cn(
      "tabular-nums",
      !fullMode || row.ticketAgeDays == null
        ? "text-[var(--text-secondary)]"
        : row.ticketAgeDays >= 90
          ? "font-medium text-red-400"
          : row.ticketAgeDays >= 30
            ? "font-medium text-amber-300"
            : "text-[var(--text-secondary)]",
    );

  const noteCellClass = (row: DeliveryHealthRow) => {
    const d = daysSinceLastNote(row.lastNoteAt);
    if (!fullMode) {
      return cn(
        d == null ? "text-[var(--text-muted)]" : "text-[var(--text-secondary)]",
      );
    }
    return cn(
      d == null
        ? "text-[var(--text-muted)]"
        : d >= 30
          ? "font-medium text-red-400"
          : d >= 14
            ? "font-medium text-amber-300"
            : "text-[var(--text-secondary)]",
    );
  };

  return (
    <div className="min-h-full bg-[var(--bg-secondary)] animate-in fade-in duration-300">
      <div className="w-full max-w-none px-6 py-6">
        <div
          className="relative mb-6 flex flex-col gap-4 rounded-[var(--radius-lg)] sm:flex-row sm:items-center sm:justify-between"
          style={{
            background:
              "linear-gradient(135deg, rgba(15,23,42,0.97) 0%, rgba(15,23,42,0.95) 100%)",
            padding: "1.5rem 1.75rem",
            backgroundImage:
              "radial-gradient(circle, rgba(56,189,248,0.06) 1px, transparent 1px), radial-gradient(ellipse 70% 50% at 50% 0%, rgba(56,189,248,0.08) 0%, transparent 60%)",
            backgroundSize: "28px 28px, auto",
          }}
        >
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-[var(--radius)] bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--accent)]">
              <LayoutDashboard className="size-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)]">
                Delivery health
              </p>
              <h1 className="mt-0.5 text-[22px] font-bold text-white sm:text-[26px]">
                Dashboard
              </h1>
              <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-white/60">
                Live PSA projects and tickets with actions and risks from your generation history.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            <p className="text-[12px] text-white/45">
              Last refreshed:{" "}
              <span className="text-white/75">
                {data ? formatRelativeRefreshed(data.refreshedAt) : " - "}
              </span>
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || refreshing}
              className={cn(
                "border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white",
                focusRing,
              )}
              onClick={async () => {
                setRefreshing(true);
                await mutateHealth();
              }}
            >
              {refreshing ? (
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="mr-2 size-4" aria-hidden />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {fetchError ? (
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-6 text-sm text-[var(--text-secondary)]">
            {fetchError}
          </div>
        ) : null}

        {liveAccess && data?.haloConnected && data.error ? (
          <div
            className="mb-4 rounded-[var(--radius-lg)] border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-[13px] text-amber-100"
            role="alert"
          >
            <p className="font-medium text-amber-50">HaloPSA notice</p>
            <p className="mt-1 text-amber-100/90">{data.error}</p>
          </div>
        ) : null}

        <div className="relative">
          <div className="space-y-6 transition-[filter,opacity] duration-200">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              {loading ? (
                <>
                  {(["0ms", "75ms", "150ms", "225ms", "300ms"] as const).map((delay) => (
                    <div
                      key={delay}
                      className={cn(
                        "animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500",
                        delay === "300ms" && "col-span-2 lg:col-span-1",
                      )}
                      style={{ animationDelay: delay }}
                    >
                      <StatCardSkeleton />
                    </div>
                  ))}
                </>
              ) : statStrip ? (
                <>
                  {(
                    [
                      {
                        label:
                          viewMode === "projects"
                            ? "Active projects"
                            : viewMode === "tickets"
                              ? "Active tickets"
                              : "Active items",
                        value: String(statStrip.activeCount),
                        delay: "0ms",
                        icon: viewMode === "projects" ? FolderKanban : Ticket,
                        gradient: "from-sky-500/15 to-transparent",
                      },
                      {
                        label: "SLA At Risk",
                        value: String(data?.statDetails?.slaAtRisk.length ?? 0),
                        delay: "75ms",
                        icon: AlertTriangle,
                        gradient: "from-violet-500/12 to-transparent",
                      },
                      {
                        label: "Open risks",
                        value: String(statStrip.totalOpenRisks),
                        delay: "150ms",
                        icon: AlertTriangle,
                        gradient: "from-amber-500/12 to-transparent",
                      },
                      {
                        label: "Overdue (target)",
                        value: String(statStrip.overdueTargets),
                        delay: "225ms",
                        icon: CalendarClock,
                        gradient: "from-red-500/10 to-transparent",
                      },
                      {
                        label: "Avg hrs / day to target",
                        value:
                          statStrip.avgHoursPerDayToTarget != null
                            ? String(statStrip.avgHoursPerDayToTarget)
                            : "N/A",
                        sub: "Hours logged per day until deadline",
                        delay: "300ms",
                        icon: Timer,
                        gradient: "from-emerald-500/12 to-transparent",
                      },
                    ] as const
                  ).map((card) => {
                    const Icon = card.icon;
                    return (
                      <div
                        key={card.label}
                        className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both relative rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-4 duration-500"
                        style={{ animationDelay: card.delay }}
                      >
                        <div
                          className={cn(
                            "pointer-events-none absolute inset-0 opacity-90 bg-gradient-to-br",
                            card.gradient,
                          )}
                        />
                        <div className="relative flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                              {card.label}
                            </p>
                            <p className="mt-1.5 text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                              {card.value}
                            </p>
                            {"sub" in card && card.sub ? (
                              <p className="mt-1 text-[10px] leading-snug text-[var(--text-muted)]">
                                {card.sub}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--bg-secondary)] text-[var(--accent)] ring-1 ring-[var(--border)]">
                            <Icon className="size-4" aria-hidden />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : null}
            </div>

            <div
              className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] shadow-[0_4px_24px_rgba(0,0,0,0.12)]"
              style={{ transition: "box-shadow 0.25s ease" }}
            >
              <div className="flex flex-col gap-3 border-b border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-[13px] font-semibold text-[var(--text-primary)]">
                    Portfolio
                  </h2>
                  <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                    {viewMode === "projects"
                      ? "Project-type records from your connected PSA(s)."
                      : viewMode === "tickets"
                        ? "Tickets excluding project-type records."
                        : "All tickets and projects from your connected PSA(s)."}
                  </p>
                  {liveAccess && data?.haloConnected && !fullMode ? (
                    <p className="mt-2 max-w-xl text-[11px] leading-snug text-[var(--text-muted)]">
                      Free tier: table view only (no row detail, no SLA heat-map colours).{" "}
                      <Link
                        href="/pricing"
                        className="font-medium text-[var(--accent)] underline-offset-4 hover:underline"
                      >
                        Upgrade for the full dashboard
                      </Link>
                      .
                    </p>
                  ) : null}
                </div>
                <div
                  className="inline-flex rounded-full border border-[var(--border)] bg-[var(--bg-primary)] p-0.5"
                  role="tablist"
                  aria-label="All, tickets or projects"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === "all"}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all duration-200 ease-out",
                      viewMode === "all"
                        ? "bg-[var(--accent)] text-white shadow-sm"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                      focusRing,
                    )}
                    onClick={() => setViewMode("all")}
                  >
                    All ({data?.rows.length ?? 0})
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === "tickets"}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all duration-200 ease-out",
                      viewMode === "tickets"
                        ? "bg-[var(--accent)] text-white shadow-sm"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                      focusRing,
                    )}
                    onClick={() => setViewMode("tickets")}
                  >
                    Tickets ({(data?.rows ?? []).filter((r) => r.kind === "ticket").length})
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === "projects"}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all duration-200 ease-out",
                      viewMode === "projects"
                        ? "bg-[var(--accent)] text-white shadow-sm"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                      focusRing,
                    )}
                    onClick={() => setViewMode("projects")}
                  >
                    Projects ({(data?.rows ?? []).filter((r) => r.kind === "project").length})
                  </button>
                </div>
              </div>

              {!loading && liveAccess ? (
                <div className="border-b border-[var(--border)]/80 bg-[var(--bg-secondary)]/80 px-4 py-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                    <div className="relative min-w-[200px] flex-1">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
                      <input
                        type="search"
                        placeholder="Filter by client"
                        value={clientFilter}
                        onChange={(e) => setClientFilter(e.target.value)}
                        className={cn(
                          "h-9 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] py-1 pl-9 pr-3 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                          focusRing,
                        )}
                      />
                    </div>
                    <div className="relative min-w-[160px] flex-1">
                      <User className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
                      <input
                        type="search"
                        placeholder="Filter by owner"
                        value={ownerFilter}
                        onChange={(e) => setOwnerFilter(e.target.value)}
                        className={cn(
                          "h-9 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] py-1 pl-9 pr-3 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                          focusRing,
                        )}
                      />
                    </div>
                    <div className="min-w-[140px]">
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                        RAG
                      </label>
                      <select
                        value={ragFilter}
                        onChange={(e) =>
                          setRagFilter(e.target.value as "all" | DeliveryHealthRag | "sla_at_risk")
                        }
                        className={cn(
                          "h-9 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-2 text-[13px] text-[var(--text-primary)]",
                          focusRing,
                        )}
                      >
                        <option value="all">All</option>
                        <option value="red">Red</option>
                        <option value="amber">Amber</option>
                        <option value="green">Green</option>
                        <option value="grey">No data</option>
                        {fullMode ? (
                          <option value="sla_at_risk">SLA at risk or overdue</option>
                        ) : null}
                      </select>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col gap-3 border-t border-[var(--border)]/60 pt-3 lg:flex-row lg:items-end">
                    <div className="min-w-[140px] flex-1">
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                        Status
                      </label>
                      <select
                        value={statusPortfolioFilter}
                        onChange={(e) =>
                          setStatusPortfolioFilter(e.target.value as StatusPortfolioFilter)
                        }
                        className={cn(
                          "h-9 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-2 text-[13px] text-[var(--text-primary)]",
                          focusRing,
                        )}
                      >
                        <option value="all">All</option>
                        <option value="in_progress">In Progress</option>
                        <option value="on_hold">On Hold</option>
                        <option value="new">New</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                        {dynamicStatusOptions.map((status) => (
                          <option key={status} value={`status:${status}`}>
                            {status
                              .split(" ")
                              .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                              .join(" ")}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="min-w-[140px] flex-1">
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                        Priority
                      </label>
                      <select
                        value={priorityPortfolioFilter}
                        onChange={(e) =>
                          setPriorityPortfolioFilter(e.target.value as PriorityPortfolioFilter)
                        }
                        className={cn(
                          "h-9 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-2 text-[13px] text-[var(--text-primary)]",
                          focusRing,
                        )}
                      >
                        <option value="all">All</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    <div className="min-w-[160px] flex-1">
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                        SLA
                      </label>
                      <select
                        value={slaPortfolioFilter}
                        onChange={(e) =>
                          setSlaPortfolioFilter(e.target.value as SlaPortfolioFilter)
                        }
                        className={cn(
                          "h-9 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-2 text-[13px] text-[var(--text-primary)]",
                          focusRing,
                        )}
                      >
                        <option value="all">All</option>
                        <option value="overdue">SLA Overdue</option>
                        <option value="at_risk">SLA At Risk</option>
                        <option value="on_track">On Track</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : null}

              {loading ? (
                <div className="w-full overflow-x-auto md:overflow-visible">
                  <table className="w-full table-fixed border-collapse text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                        {Array.from({ length: 11 }).map((_, i) => (
                          <th key={i} className="px-3 py-2.5">
                            <div className="h-3 w-16 animate-pulse rounded bg-[var(--border)]/60" />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 10 }).map((_, i) => (
                        <TableRowSkeleton key={i} />
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : liveAccess && data && !data.haloConnected && !data.cwConnected ? (
                <div className="flex flex-col items-center px-6 py-14 text-center">
                  <div className="flex size-20 items-center justify-center rounded-full bg-[var(--bg-secondary)] ring-1 ring-[var(--border)]">
                    <Inbox className="size-9 text-[var(--text-muted)]" aria-hidden />
                  </div>
                  <p className="mt-6 max-w-md text-[15px] font-semibold text-[var(--text-primary)]">
                    Connect a PSA
                  </p>
                  <p className="mt-2 max-w-md text-[13px] leading-relaxed text-[var(--text-muted)]">
                    {data.connectHint ??
                      "Connect HaloPSA or ConnectWise to load live projects and tickets."}
                  </p>
                  <Button
                    type="button"
                    className={cn("mt-6 bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]", focusRing)}
                    onClick={() => onOpenIntegrations?.()}
                  >
                    Open Integrations
                  </Button>
                </div>
              ) : sortedRows.length === 0 && liveAccess ? (
                <div className="flex flex-col items-center px-6 py-14 text-center">
                  <div
                    className="relative flex size-24 items-center justify-center rounded-2xl bg-[var(--bg-secondary)] ring-1 ring-[var(--border)]"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at 30% 20%, rgba(56,189,248,0.12), transparent 55%)",
                    }}
                  >
                    <ClipboardList className="size-10 text-[var(--accent)] opacity-90" aria-hidden />
                  </div>
                  <p className="mt-6 text-[15px] font-semibold text-[var(--text-primary)]">
                    Nothing to show yet
                  </p>
                  <p className="mt-2 max-w-md text-[13px] leading-relaxed text-[var(--text-muted)]">
                    {data?.error ??
                      (viewMode === "projects"
                        ? "No active projects matched your PSA data, or filters hid every row."
                        : "No active tickets matched your PSA data, or filters hid every row.")}
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className={focusRing}
                      onClick={() => onOpenIntegrations?.()}
                    >
                      Connect PSA
                    </Button>
                    <Button
                      type="button"
                      className={cn("bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]", focusRing)}
                      onClick={() => onOpenHaloImport?.()}
                    >
                      Import tickets
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Desktop table: full width account-style layout */}
                  <div className="hidden w-full md:block md:max-h-[min(70vh,720px)] md:overflow-auto">
                    <table className="w-full table-fixed border-collapse text-left text-[13px]">
                      <colgroup>
                        <col style={{ width: "22%", minWidth: "240px" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "8%" }} />
                        <col style={{ width: "8%" }} />
                        <col style={{ width: "9%" }} />
                        <col style={{ width: "9%" }} />
                        <col style={{ width: "8%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "80px" }} />
                      </colgroup>
                      <thead>
                        <tr className="border-b border-[var(--border)]">
                          {headerCell("clientName", "Client/Account")}
                          {headerCell("rag", "Overall RAG")}
                          {headerCell("openTickets", "Open Tickets")}
                          {headerCell("overdueTickets", "Overdue Tickets")}
                          {headerCell("avgResponseTimeHours", "Avg Response Time")}
                          {headerCell("ticketsThisWeek", "Tickets This Week")}
                          {headerCell("activeProjects", "Active Projects")}
                          {headerCell("projectHealth", "Health")}
                          {headerCell("lastReportSent", "Last Report Sent")}
                          {headerCell("nextScheduledReport", "Next Scheduled Report")}
                          <th className="sticky top-0 z-10 bg-[var(--bg-secondary)] px-3 py-2.5 text-center shadow-[0_1px_0_var(--border)] text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedClientRows.map((row) => {
                          return (
                            <tr
                              key={row.clientName}
                              className={cn(
                                "border-b border-[var(--border)]/80 transition-colors duration-200 ease-out",
                                "hover:bg-[var(--bg-secondary)]/70",
                              )}
                            >
                              <td className="min-w-0 px-3 py-2.5 align-top">
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-[var(--text-primary)]">{row.clientName}</p>
                                  <div className="mt-1 flex items-center gap-2">
                                    <p
                                      className="truncate text-xs text-[var(--text-muted)]"
                                      title={row.representative?.name ?? " - "}
                                    >
                                      {row.representative?.name ?? " - "}
                                    </p>
                                    <span
                                      className={cn(
                                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                                        (row.representative?.kind ?? "ticket") === "ticket"
                                          ? "bg-blue-500/15 text-blue-300"
                                          : "bg-violet-500/15 text-violet-300",
                                      )}
                                    >
                                      {(row.representative?.kind ?? "ticket") === "ticket" ? "Ticket" : "Project"}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 align-top">
                                <div className="inline-flex items-center gap-1">
                                  <RagBadge rag={row.overallRag} slaRisk={null} />
                                  {row.slaAtRiskCount > 0 ? (
                                    <span title={`${row.slaAtRiskCount} SLA at risk`} className="inline-flex size-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">!</span>
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 align-top tabular-nums text-[var(--text-primary)]">
                                {row.openTickets}
                              </td>
                              <td
                                className={cn(
                                  "px-3 py-2.5 align-top tabular-nums",
                                  row.overdueTickets > 3 ? "font-semibold text-red-400" : row.overdueTickets > 0 ? "font-semibold text-amber-300" : "text-[var(--text-secondary)]",
                                )}
                              >
                                {row.overdueTickets}
                              </td>
                              <td className={cn("px-3 py-2.5 align-top tabular-nums", (row.avgResponseTimeHours ?? 0) > 24 ? "font-semibold text-red-400" : "text-[var(--text-primary)]")}>
                                {formatResponseTime(row.avgResponseTimeHours)}
                              </td>
                              <td className="px-3 py-2.5 align-top tabular-nums text-[var(--text-primary)]">
                                {row.ticketsThisWeek}
                              </td>
                              <td className="px-3 py-2.5 align-top tabular-nums text-[var(--text-primary)]">
                                {row.activeProjects}
                              </td>
                              <td className="px-3 py-2.5 align-top">
                                {row.projectHealthPercent == null || (viewMode === "tickets" && row.activeProjects === 0) ? (
                                  <span className="text-[12px] text-[var(--text-muted)]">—</span>
                                ) : (
                                  <div className="min-w-0">
                                    <p className="text-[12px] font-semibold tabular-nums text-[var(--text-primary)]">
                                      {row.projectHealthPercent}%
                                    </p>
                                    <div className="mt-1 h-1.5 w-full rounded-full bg-[var(--bg-secondary)]">
                                      <div
                                        className={cn(
                                          "h-1.5 rounded-full",
                                          row.projectHealthPercent >= 75
                                            ? "bg-emerald-500"
                                            : row.projectHealthPercent >= 50
                                              ? "bg-amber-500"
                                              : "bg-red-500",
                                        )}
                                        style={{ width: `${row.projectHealthPercent}%` }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2.5 align-top text-[12px] text-[var(--text-secondary)]">
                                <span className={cn(row.lastReportSent && nowMs - new Date(row.lastReportSent).getTime() > 14 * 24 * 3600 * 1000 ? "text-slate-400" : "")}>
                                  {formatShortDate(row.lastReportSent)}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 align-top text-[12px] text-[var(--text-secondary)]">
                                <span className="text-slate-400">Not scheduled</span>
                              </td>
                              <td className="px-3 py-2.5 align-top">
                                <div className="flex items-center justify-center">
                                  <button
                                    type="button"
                                    title="View"
                                    className={cn(
                                      "inline-flex items-center gap-1 rounded border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]",
                                      focusRing,
                                    )}
                                    onClick={() => {
                                      const first = row.representative ?? row.rows[0];
                                      if (!first) return;
                                      openRowDetail(first);
                                    }}
                                  >
                                    <Eye className="size-3.5" aria-hidden />
                                    View
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards (stacked per account row) */}
                  <div className="space-y-3 p-4 md:hidden">
                    {sortedRows.map((row) =>
                      rowDetailInteractive ? (
                        <button
                          key={`m-${row.source === "connectwise" ? "cw" : "halo"}-${row.kind}-${row.id}`}
                          type="button"
                          onClick={() => openRowDetail(row)}
                          className={cn(
                            "flex w-full items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] p-3 text-left transition-colors hover:bg-[var(--bg-primary)]/35",
                            focusRing,
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-[var(--text-primary)]">{row.name}</p>
                            <p
                              className="text-[11px] text-[var(--text-muted)]"
                              title={`${row.clientName} · ${ownerCellLabel(row.owner)}`}
                            >
                              {row.clientName} ·{" "}
                              <span
                                className={
                                  isUnassignedOwnerCell(row.owner) ? "italic text-[var(--text-muted)]" : ""
                                }
                              >
                                {isUnassignedOwnerCell(row.owner)
                                  ? "Unassigned"
                                  : ellipsizeOwnerAtWord(ownerCellLabel(row.owner), 32)}
                              </span>
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <SourcePill source={row.source} />
                              <RagBadge rag={row.rag} slaRisk={row.slaRisk} />
                              <span className="text-[11px] text-[var(--text-muted)]">
                                {row.statusName}
                              </span>
                              <span className="text-[12px] text-[var(--text-secondary)]">
                                {row.openActions} actions · {row.openRisks} risks
                              </span>
                            </div>
                          </div>
                          <span className="shrink-0 text-[12px] font-medium text-[var(--accent)]">
                            View →
                          </span>
                        </button>
                      ) : fullMode ? (
                        <div
                          key={`m-${row.source === "connectwise" ? "cw" : "halo"}-${row.kind}-${row.id}`}
                          className="flex w-full items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] p-3 text-left"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-[var(--text-primary)]">{row.name}</p>
                            <p
                              className="text-[11px] text-[var(--text-muted)]"
                              title={`${row.clientName} · ${ownerCellLabel(row.owner)}`}
                            >
                              {row.clientName} ·{" "}
                              <span
                                className={
                                  isUnassignedOwnerCell(row.owner) ? "italic text-[var(--text-muted)]" : ""
                                }
                              >
                                {isUnassignedOwnerCell(row.owner)
                                  ? "Unassigned"
                                  : ellipsizeOwnerAtWord(ownerCellLabel(row.owner), 32)}
                              </span>
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <SourcePill source={row.source} />
                              <RagBadge rag={row.rag} slaRisk={row.slaRisk} />
                              <span className="text-[11px] text-[var(--text-muted)]">
                                {row.statusName}
                              </span>
                              <span className="text-[12px] text-[var(--text-secondary)]">
                                {row.openActions} actions · {row.openRisks} risks
                              </span>
                            </div>
                          </div>
                          <span className="shrink-0 text-[12px] font-medium text-[var(--text-muted)] opacity-50">
                            View →
                          </span>
                        </div>
                      ) : (
                        <div
                          key={`m-${row.source === "connectwise" ? "cw" : "halo"}-${row.kind}-${row.id}`}
                          className="flex w-full items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] p-3 text-left"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-[var(--text-primary)]">{row.name}</p>
                            <p
                              className="text-[11px] text-[var(--text-muted)]"
                              title={`${row.clientName} · ${ownerCellLabel(row.owner)}`}
                            >
                              {row.clientName} ·{" "}
                              <span
                                className={
                                  isUnassignedOwnerCell(row.owner) ? "italic text-[var(--text-muted)]" : ""
                                }
                              >
                                {isUnassignedOwnerCell(row.owner)
                                  ? "Unassigned"
                                  : ellipsizeOwnerAtWord(ownerCellLabel(row.owner), 32)}
                              </span>
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <SourcePill source={row.source} />
                              <RagLabelPlain rag={row.rag} />
                              <span className="text-[12px] text-[var(--text-secondary)]">
                                {row.openActions} actions · {row.openRisks} risks
                              </span>
                            </div>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <DeliveryHealthDetailPanel
        open={detailOpen}
        row={detailRow}
        onClose={closeRowDetail}
        focusRing={focusRing}
        allowGenerateFromDashboard={dashboardAccess === "full"}
        onGenerateReport={(payload) => onStartGenerationFromDelivery?.(payload)}
      />
    </div>
  );
}
