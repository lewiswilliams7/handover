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
import { PageHeader } from "@/components/page-header";
import {
  buildDeliveryHealthSwrKey,
  DELIVERY_HEALTH_SWR_OPTIONS,
  fetchDeliveryHealth,
} from "@/lib/delivery-health-swr";
import { DeliveryHealthDetailPanel } from "@/components/delivery-health-detail-panel";
import { usePSAConnections } from "@/hooks/use-psa-connections";
import { usePSAStatus } from "@/hooks/usePSAStatus";
import { PSAEmptyState } from "@/components/psa-empty-state";
import { DemoBanner } from "@/components/demo-banner";
import {
  ellipsizeOwnerAtWord,
  isUnassignedOwnerCell,
  ownerCellLabel,
} from "@/lib/owner-cell-format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/toasts";
import { DEMO_CLIENTS, DEMO_PROJECTS, DEMO_TICKETS } from "@/lib/demo-data";
import { cleanTicketNoteContent } from "@/lib/note-cleaner";

const VIEW_STORAGE_KEY = "delivery-health-view";

type ViewMode = "all" | "projects" | "tickets" | "overdue";

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

function displayDeliveryHealthClientName(clientName: string | null | undefined): string {
  const raw = String(clientName ?? "").trim();
  if (!raw || raw === "Unknown") return "Unnamed account";
  return raw;
}

function isClosedStatusName(statusName: string): boolean {
  const t = statusTokensForFilter(statusName);
  return (
    /^(resolved|closed|completed|cancelled|canceled|duplicate|merged)\b/.test(t) ||
    /\bresolved\b/.test(t) ||
    /\bclosed\b/.test(t)
  );
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
  | "statusName"
  | "timeLogged"
  | "lastReportSent";

export type DeliveryHealthClientListViewMode = "paginated" | "continuous";

const CLIENTS_PER_PAGE = 25;

type Props = {
  focusRing: string;
  portalClients?: Array<{ clientName: string; slug: string; mspSlug: string }>;
  /** read: table only - no row detail or generate-from-dashboard (team permission). */
  dashboardAccess?: "full" | "read";
  /** Display-only pagination for the client portfolio table (all data still fetched). */
  viewMode?: DeliveryHealthClientListViewMode;
  demoMode?: boolean;
  onOpenIntegrations?: () => void;
  onOpenHaloImport?: () => void;
  onStartGenerationFromDelivery?: (payload: {
    text: string;
    clientName: string | null;
  }) => void;
  /** Applied when navigating from overview attention queue (or similar). */
  initialClientFilter?: string;
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

function formatTimeLogged(hours: number | null): string {
  if (hours == null || !Number.isFinite(hours) || hours <= 0) return "0m";
  const totalMinutes = Math.max(0, Math.round(hours * 60));
  if (totalMinutes < 60) return `${totalMinutes}m`;
  if (totalMinutes < 8 * 60) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 8);
  const remHours = totalHours % 8;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
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

function CustomersLoadingState() {
  return (
    <div className="p-4">
      <div className="flex items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
        <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" aria-hidden />
        <span className="text-[13px] text-[var(--text-secondary)]">Loading customers...</span>
      </div>
      <div className="mt-4 w-full overflow-x-auto md:overflow-visible">
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
            <col style={{ width: "120px" }} />
          </colgroup>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DeliveryHealthDashboard({
  focusRing,
  dashboardAccess = "full",
  viewMode: clientListViewMode = "paginated",
  demoMode = false,
  onOpenIntegrations,
  onOpenHaloImport,
  onStartGenerationFromDelivery,
  initialClientFilter = "",
}: Props) {
  const psaConnections = usePSAConnections();
  const psaStatus = usePSAStatus();
  const cwEnabled = psaConnections.connectwise;
  const toast = useToast();
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [clientFilter, setClientFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");

  useEffect(() => {
    const preset = initialClientFilter.trim();
    if (preset) setClientFilter(preset);
  }, [initialClientFilter]);
  const [statusFilter, setStatusFilter] = useState("");
  const [ragFilter, setRagFilter] = useState<"all" | DeliveryHealthRag | "sla_at_risk">("all");
  const [statusPortfolioFilter, setStatusPortfolioFilter] =
    useState<StatusPortfolioFilter>("all");
  const [priorityPortfolioFilter, setPriorityPortfolioFilter] =
    useState<PriorityPortfolioFilter>("all");
  const [slaPortfolioFilter, setSlaPortfolioFilter] = useState<SlaPortfolioFilter>("all");

  const hasActiveFilters = Boolean(
    clientFilter.trim() ||
      ownerFilter.trim() ||
      statusFilter ||
      ragFilter !== "all" ||
      statusPortfolioFilter !== "all" ||
      priorityPortfolioFilter !== "all" ||
      slaPortfolioFilter !== "all",
  );

  const activeFilterCount = [
    clientFilter.trim(),
    ownerFilter.trim(),
    statusFilter,
    ragFilter !== "all" ? ragFilter : "",
    statusPortfolioFilter !== "all" ? statusPortfolioFilter : "",
    priorityPortfolioFilter !== "all" ? priorityPortfolioFilter : "",
    slaPortfolioFilter !== "all" ? slaPortfolioFilter : "",
  ].filter(Boolean).length;

  const filterFieldClass = cn(
    "w-full rounded-md border border-white/[0.08] bg-[var(--surface-2)] px-3 py-1.5 text-[13px] text-white/80 placeholder:text-white/30 focus:border-[var(--accent)]/50 focus:outline-none",
    focusRing,
  );

  useEffect(() => {
    if (hasActiveFilters) setFiltersOpen(true);
  }, []);
  const [selectedForChase, setSelectedForChase] = useState<Set<number>>(new Set());
  const [chaseModalOpen, setChaseModalOpen] = useState(false);
  const [chaseNoteTemplate, setChaseNoteTemplate] = useState(
    "Hi @{engineer}, this ticket is overdue and requires your attention. Please update with your current status and expected resolution date.",
  );
  const [chasingInFlight, setChasingInFlight] = useState(false);
  const [chaseSearchQuery, setChaseSearchQuery] = useState("");
  const [chaseOwnerFilter, setChaseOwnerFilter] = useState<string>("all");
  const [ownerDropdownOpen, setOwnerDropdownOpen] = useState(false);
  const [autoChaseDays, setAutoChaseDays] = useState<number>(3);
  const [autoChasEnabled, setAutoChasEnabled] = useState(false);
  const [defaultChaseMessage, setDefaultChaseMessage] = useState(
    "Hi @{engineer}, this ticket is overdue and requires your attention. Please update with your current status and expected resolution date. Thank you.",
  );
  const [clientPage, setClientPage] = useState(1);

  const demoResponse = useMemo<DeliveryHealthApiResponse | null>(() => {
    if (!demoMode) return null;
    const now = Date.now();
    const rows: DeliveryHealthRow[] = [
      ...DEMO_TICKETS.map((t, idx) => {
        const targetIso = new Date(t.targetdate).toISOString();
        const daysToTarget = Math.floor(
          (new Date(t.targetdate).getTime() - Date.now()) / 86400000,
        );
        const slaRisk: DeliveryHealthSlaRisk | null =
          daysToTarget < 0 ? "overdue" : daysToTarget <= 7 ? "at_risk" : null;
        const rag: DeliveryHealthRag =
          t.overdue || daysToTarget < 0 ? "red" : t.priorityLevel === 1 ? "amber" : "green";
        return {
          id: 10000 + idx,
          kind: "ticket" as const,
          source: "halopsa" as const,
          name: t.summary,
          clientName: t.client?.name ?? "",
          owner: t.agent?.name ?? null,
          statusName: t.status?.name ?? "",
          priorityName: t.priority?.name ?? null,
          rag,
          openActions: t.priorityLevel === 1 ? 3 : 1,
          openRisks: t.overdue ? 1 : 0,
          daysToTarget,
          lastGeneratedAt: null,
          ticketAgeDays: Math.max(
            0,
            Math.floor((now - new Date(t.dateoccurred).getTime()) / 86400000),
          ),
          lastNoteAt: t.dateoccurred,
          lastNotePreview: cleanTicketNoteContent(t.details ?? ""),
          targetDateIso: targetIso,
          targetHours: null,
          timeLogged: t.timetaken / 60,
          description: cleanTicketNoteContent(t.details ?? ""),
          notes: [],
          latestOpenActions: [],
          latestOpenRisks: [],
          haloTicketUrl: "#",
          slaRisk,
          createdAtIso: t.dateoccurred,
          firstResponseHours: null,
          projectTaskTotal: null,
          projectTaskCompleted: null,
        };
      }),
      ...DEMO_PROJECTS.map((p, idx) => {
        const daysToTarget = Math.floor(
          (new Date(p.targetdate).getTime() - Date.now()) / 86400000,
        );
        const rag: DeliveryHealthRag =
          p.status?.name.toLowerCase() === "on hold"
            ? "amber"
            : p.percentcomplete >= 70
              ? "green"
              : "amber";
        return {
          id: 20000 + idx,
          kind: "project" as const,
          source: "halopsa" as const,
          name: p.name,
          clientName: p.client?.name ?? "",
          owner: p.agent?.name ?? null,
          statusName: p.status?.name ?? "",
          priorityName: null,
          rag,
          openActions: p.percentcomplete < 50 ? 3 : 1,
          openRisks: p.status?.name.toLowerCase() === "on hold" ? 1 : 0,
          daysToTarget,
          lastGeneratedAt: null,
          ticketAgeDays: p.dateoccurred
            ? Math.max(
                0,
                Math.floor((now - new Date(p.dateoccurred).getTime()) / 86400000),
              )
            : null,
          lastNoteAt: p.dateoccurred ?? null,
          lastNotePreview: cleanTicketNoteContent(p.description ?? ""),
          targetDateIso: new Date(p.targetdate).toISOString(),
          targetHours: null,
          timeLogged: p.timetaken / 60,
          description: cleanTicketNoteContent(p.description ?? ""),
          notes: [],
          latestOpenActions: [],
          latestOpenRisks: [],
          haloTicketUrl: "#",
          slaRisk: null,
          createdAtIso: p.dateoccurred ?? null,
          firstResponseHours: null,
          projectTaskTotal: 10,
          projectTaskCompleted: Math.round((p.percentcomplete / 100) * 10),
        };
      }),
    ];

    const buildStrip = (subset: DeliveryHealthRow[]) => {
      const activeCount = subset.length;
      const totalOpenActions = subset.reduce((sum, r) => sum + r.openActions, 0);
      const totalOpenRisks = subset.reduce((sum, r) => sum + r.openRisks, 0);
      const overdueTargets = subset.filter(
        (r) => r.daysToTarget != null && r.daysToTarget < 0,
      ).length;
      const perDay = subset
        .filter((r) => r.targetDateIso && r.daysToTarget != null && r.daysToTarget >= 0)
        .map((r) => r.timeLogged / Math.max(1, r.daysToTarget ?? 1));
      return {
        activeCount,
        totalOpenActions,
        totalOpenRisks,
        overdueTargets,
        avgHoursPerDayToTarget:
          perDay.length > 0
            ? Math.round((perDay.reduce((sum, v) => sum + v, 0) / perDay.length) * 10) / 10
            : null,
      };
    };

    const projectRows = rows.filter((r) => r.kind === "project");
    const ticketRows = rows.filter((r) => r.kind === "ticket");

    return {
      access: "full",
      refreshedAt: new Date().toISOString(),
      haloConnected: false,
      cwConnected: false,
      stats: {
        projects: buildStrip(projectRows),
        tickets: buildStrip(ticketRows),
      },
      rows,
      statDetails: {
        openRisks: [],
        overdueTickets: [],
        slaAtRisk: [],
      },
    };
  }, [demoMode]);

  useEffect(() => {
    if (data?.access !== "full" && ragFilter === "sla_at_risk") {
      setRagFilter("all");
    }
  }, [data?.access, ragFilter]);

  useEffect(() => {
    try {
      const v = localStorage.getItem(VIEW_STORAGE_KEY);
      if (v === "projects" || v === "tickets" || v === "all" || v === "overdue") setViewMode(v);
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

  const swrKey = useMemo(
    () => buildDeliveryHealthSwrKey(demoMode, cwEnabled, psaConnections.primary),
    [demoMode, cwEnabled, psaConnections.primary],
  );

  const {
    data: swrData,
    error: swrErr,
    isLoading: swrLoading,
    mutate: mutateHealth,
  } = useSWR<DeliveryHealthApiResponse>(
    swrKey,
    fetchDeliveryHealth,
    {
      ...DELIVERY_HEALTH_SWR_OPTIONS,
    },
  );

  useEffect(() => {
    if (demoMode) {
      setData(demoResponse);
      setFetchError(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }
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
  }, [demoMode, demoResponse, swrData, swrErr, swrLoading]);

  useEffect(() => {
    if (demoMode) return;
    const timer = window.setTimeout(() => {
      setLoading(false);
    }, 15_000);
    return () => window.clearTimeout(timer);
  }, [demoMode, swrKey]);

  const scopedRows = useMemo(() => {
    if (!data?.rows) return [];
    const cleanedRows = data.rows.map((r) => ({
      ...r,
      lastNotePreview: cleanTicketNoteContent(r.lastNotePreview ?? ""),
      description: cleanTicketNoteContent(r.description ?? ""),
    }));
    if (viewMode === "all") return cleanedRows;
    return cleanedRows.filter((r) =>
      viewMode === "projects" ? r.kind === "project" : r.kind === "ticket",
    );
  }, [data, viewMode]);

  const filteredRows = useMemo(() => {
    const c = clientFilter.trim().toLowerCase();
    const o = ownerFilter.trim().toLowerCase();
    return scopedRows.filter((r) => {
      if (c && !r.clientName.toLowerCase().includes(c)) return false;
      if (o && !(r.owner ?? "").toLowerCase().includes(o)) return false;
      if (statusFilter && r.statusName !== statusFilter) return false;
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
    statusFilter,
    ragFilter,
    statusPortfolioFilter,
    priorityPortfolioFilter,
    slaPortfolioFilter,
  ]);

  const visibleTicketTimeLoggedHours = useMemo(
    () =>
      filteredRows
        .filter((r) => r.kind === "ticket")
        .reduce((sum, r) => {
          if (!Number.isFinite(r.timeLogged)) return sum;
          const hours = r.timeLogged > 100 ? r.timeLogged / 60 : r.timeLogged;
          return sum + hours;
        }, 0),
    [filteredRows],
  );

  const overdueRows = useMemo(() => {
    let rows = (data?.rows ?? []).filter(
      (r) => r.daysToTarget !== null && r.daysToTarget < 0 && r.owner !== null,
    );
    if (chaseSearchQuery.trim()) {
      const q = chaseSearchQuery.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.clientName?.toLowerCase().includes(q) ||
          r.owner?.toLowerCase().includes(q),
      );
    }
    if (chaseOwnerFilter !== "all") {
      rows = rows.filter((r) => r.owner === chaseOwnerFilter);
    }
    return rows;
  }, [data, chaseSearchQuery, chaseOwnerFilter]);

  const allOverdueOwners = useMemo(() => {
    const owners = new Set<string>();
    (data?.rows ?? [])
      .filter((r) => r.daysToTarget !== null && r.daysToTarget < 0 && r.owner)
      .forEach((r) => owners.add(r.owner!));
    return Array.from(owners).sort();
  }, [data]);

  const clientFilterOptions = useMemo(() => {
    if (demoMode) {
      return DEMO_CLIENTS.map((c) => c.name).sort((a, b) => a.localeCompare(b));
    }
    const names = new Set<string>();
    for (const row of scopedRows) {
      const name = String(row.clientName ?? "").trim();
      if (name) names.add(name);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [demoMode, scopedRows]);

  const ownerFilterOptions = useMemo(() => {
    const names = new Set<string>();
    for (const row of scopedRows) {
      const name = String(row.owner ?? "").trim();
      if (name) names.add(name);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [scopedRows]);

  const dynamicStatusOptions = useMemo(() => {
    const base = new Set(["new", "in progress", "on hold", "resolved", "closed"]);
    const statuses = new Set<string>();
    for (const row of scopedRows) {
      const s = statusTokensForFilter(row.statusName);
      if (s && !base.has(s)) statuses.add(s);
    }
    return [...statuses].sort((a, b) => a.localeCompare(b));
  }, [scopedRows]);

  const statusFilterOptions = useMemo(
    () => [...new Set(scopedRows.map((r) => r.statusName).filter(Boolean))].sort(),
    [scopedRows],
  );

  const statStrip = useMemo(() => {
    if (!data) return null;
    if (viewMode === "projects") return data.stats.projects;
    if (viewMode === "tickets") return data.stats.tickets;
    return {
      activeCount: data.stats.projects.activeCount + data.stats.tickets.activeCount,
      totalOpenActions: data.stats.projects.totalOpenActions + data.stats.tickets.totalOpenActions,
      totalOpenRisks: Math.max(
        data.stats.projects.totalOpenRisks,
        data.stats.tickets.totalOpenRisks,
      ),
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
          cmp = a.clientName.localeCompare(b.clientName, undefined, { sensitivity: "base" });
          break;
        case "rag": {
          cmp = ragOrder[a.rag] - ragOrder[b.rag];
          break;
        }
        case "statusName":
          cmp = (a.statusName ?? "").localeCompare(b.statusName ?? "", undefined, {
            sensitivity: "base",
          });
          break;
        case "timeLogged":
          // DeliveryHealthRow.timeLogged is the per-ticket field (hours as number)
          cmp = (a.timeLogged ?? 0) - (b.timeLogged ?? 0);
          break;
        case "lastReportSent": {
          const at = a.lastGeneratedAt ? new Date(a.lastGeneratedAt).getTime() : 0;
          const bt = b.lastGeneratedAt ? new Date(b.lastGeneratedAt).getTime() : 0;
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
      const timeLoggedHours = tickets.reduce(
        (sum, t) => sum + (Number.isFinite(t.timeLogged) ? t.timeLogged : 0),
        0,
      );
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
        timeLoggedHours,
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
        "sticky top-0 z-10 bg-[var(--surface-1)]/85 px-3 py-2.5 text-left shadow-[0_1px_0_var(--border)] backdrop-blur-sm",
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
        case "statusName":
          cmp = (a.representative?.statusName ?? "").localeCompare(
            b.representative?.statusName ?? "",
            undefined,
            { sensitivity: "base" },
          );
          break;
        case "timeLogged":
          cmp = (a.timeLoggedHours ?? 0) - (b.timeLoggedHours ?? 0);
          break;
        case "lastReportSent": {
          const at = a.lastReportSent ? new Date(a.lastReportSent).getTime() : 0;
          const bt = b.lastReportSent ? new Date(b.lastReportSent).getTime() : 0;
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

  const totalClientCount = sortedClientRows.length;
  const totalClientPages = Math.max(1, Math.ceil(totalClientCount / CLIENTS_PER_PAGE));
  const safeClientPage = Math.min(Math.max(1, clientPage), totalClientPages);

  useEffect(() => {
    setClientPage(1);
  }, [
    clientFilter,
    ownerFilter,
    ragFilter,
    statusFilter,
    statusPortfolioFilter,
    priorityPortfolioFilter,
    slaPortfolioFilter,
    viewMode,
    sortKey,
    sortDir,
    clientListViewMode,
  ]);

  const visibleClientRows = useMemo(() => {
    if (clientListViewMode === "continuous") return sortedClientRows;
    const start = (safeClientPage - 1) * CLIENTS_PER_PAGE;
    return sortedClientRows.slice(start, start + CLIENTS_PER_PAGE);
  }, [sortedClientRows, clientListViewMode, safeClientPage]);

  const visibleMobileRows = useMemo(() => {
    if (clientListViewMode === "continuous") return sortedRows;
    const names = new Set(visibleClientRows.map((r) => r.clientName));
    return sortedRows.filter((r) => names.has(r.clientName));
  }, [sortedRows, visibleClientRows, clientListViewMode]);

  const totalDesktopRowCount = sortedRows.length;
  const totalDesktopPages = Math.max(1, Math.ceil(totalDesktopRowCount / CLIENTS_PER_PAGE));
  const safeDesktopPage = Math.min(Math.max(1, clientPage), totalDesktopPages);
  const visibleDesktopRows = useMemo(() => {
    if (clientListViewMode === "continuous") return sortedRows;
    const start = (safeDesktopPage - 1) * CLIENTS_PER_PAGE;
    return sortedRows.slice(start, start + CLIENTS_PER_PAGE);
  }, [sortedRows, clientListViewMode, safeDesktopPage]);

  const clientPageRangeStart =
    totalClientCount === 0 ? 0 : (safeClientPage - 1) * CLIENTS_PER_PAGE + 1;
  const clientPageRangeEnd = Math.min(safeClientPage * CLIENTS_PER_PAGE, totalClientCount);
  const desktopPageRangeStart =
    totalDesktopRowCount === 0 ? 0 : (safeDesktopPage - 1) * CLIENTS_PER_PAGE + 1;
  const desktopPageRangeEnd = Math.min(safeDesktopPage * CLIENTS_PER_PAGE, totalDesktopRowCount);

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

  const handleOverdueChase = useCallback(
    async (ticket: {
      id: number | string;
      title: string;
      assignedEngineer?: string;
      source: "halopsa" | "connectwise";
    }) => {
      const engineer = ticket.assignedEngineer?.trim() || "team";
      const note = chaseNoteTemplate.replace(/\{engineer\}/g, engineer);

      try {
        const res = await fetch("/api/psa/chase-ticket", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            ticketId: ticket.id,
            note,
            source: ticket.source,
          }),
        });

        if (!res.ok) throw new Error("Failed to push chase note");

        toast({
          message: "Chase note sent",
          subtitle:
            engineer === "team"
              ? undefined
              : `Internal note pushed to ticket with @${engineer}`,
          variant: "success",
          durationMs: 4000,
        });
      } catch {
        toast({
          message: "Failed to send chase note",
          variant: "error",
          durationMs: 3000,
        });
      }
    },
    [chaseNoteTemplate, toast],
  );

  const handleBulkChase = useCallback(async () => {
    if (selectedForChase.size === 0) return;
    setChasingInFlight(true);
    const toChase = overdueRows.filter((r) => selectedForChase.has(r.id));

    let successCount = 0;
    let failCount = 0;

    for (const ticket of toChase) {
      const note = chaseNoteTemplate.replace("{engineer}", ticket.owner ?? "team");
      try {
        const res = await fetch("/api/psa/chase-ticket", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            ticketId: ticket.id,
            note,
            source: ticket.source,
          }),
        });
        if (res.ok) successCount += 1;
        else failCount += 1;
      } catch {
        failCount += 1;
      }
    }

    setChasingInFlight(false);
    setChaseModalOpen(false);
    setSelectedForChase(new Set());

    if (successCount > 0) {
      toast({
        message: `${successCount} chase note${successCount > 1 ? "s" : ""} sent`,
        subtitle: failCount > 0 ? `${failCount} failed — check PSA connection` : undefined,
        variant: "success",
        durationMs: 4000,
      });
    } else {
      toast({
        message: "Failed to send chase notes",
        subtitle: "Check your PSA connection and try again.",
        variant: "error",
        durationMs: 4000,
      });
    }
  }, [chaseNoteTemplate, overdueRows, selectedForChase, toast]);

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

  const lastRefreshedLabel = data ? formatRelativeRefreshed(data.refreshedAt) : "—";

  const handleHealthRefresh = useCallback(async () => {
    if (demoMode) return;
    setRefreshing(true);
    try {
      const params = new URLSearchParams();
      params.set("refresh", "1");
      if (cwEnabled && psaConnections.primary === "connectwise") {
        params.set("source", "connectwise");
      }
      const res = await fetch(`/api/delivery-health?${params.toString()}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const json = (await res.json()) as DeliveryHealthApiResponse & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not load dashboard.");
      await mutateHealth(json, { revalidate: false });
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Could not load dashboard.");
    } finally {
      setRefreshing(false);
    }
  }, [cwEnabled, demoMode, mutateHealth, psaConnections.primary]);

  return (
    <div className="min-h-full bg-[var(--bg-secondary)] animate-in fade-in duration-300">
      <div className="w-full max-w-none px-6 py-6">
        <PageHeader
          eyebrow="DELIVERY · REAL-TIME"
          title="Delivery Health"
          description="Live PSA projects and tickets with actions and risks from your history."
          actions={
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-white/40">
                Refreshed{" "}
                <span className="text-white/60">{lastRefreshedLabel}</span>
              </span>
              <button
                type="button"
                disabled={loading || refreshing}
                onClick={() => void handleHealthRefresh()}
                className="flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[12px] text-white/60 transition-all duration-150 hover:border-white/20 hover:text-white/80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {refreshing ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="size-3.5" aria-hidden />
                )}
                Refresh
              </button>
            </div>
          }
        />

        {demoMode ? (
          <div className="mb-4">
            <DemoBanner
              onConnectPSA={() => {
                onOpenIntegrations?.();
              }}
            />
          </div>
        ) : null}

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
                  {(() => {
                    const slaAtRiskCount = data?.statDetails?.slaAtRisk.length ?? 0;
                    return (
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
                          valueClassName: "text-white/96",
                        },
                        {
                          label: "SLA At Risk",
                          value: String(slaAtRiskCount),
                          delay: "75ms",
                          icon: AlertTriangle,
                          valueClassName:
                            slaAtRiskCount > 0 ? "text-[#f59e0b]" : "text-white/96",
                        },
                        {
                          label: "Open risks",
                          value: String(statStrip.totalOpenRisks),
                          delay: "150ms",
                          icon: AlertTriangle,
                          valueClassName: "text-white/96",
                        },
                        {
                          label: "Overdue (target)",
                          value: String(statStrip.overdueTargets),
                          delay: "225ms",
                          icon: CalendarClock,
                          valueClassName:
                            statStrip.overdueTargets > 0 ? "text-[#ef4444]" : "text-white/96",
                        },
                        {
                          label: "Time Logged",
                          value: formatTimeLogged(visibleTicketTimeLoggedHours),
                          sub: "Total across visible tickets",
                          delay: "300ms",
                          icon: Timer,
                          valueClassName: "text-white/96",
                        },
                      ] as const
                    ).map((card) => {
                    const Icon = card.icon;
                    return (
                      <div
                        key={card.label}
                        className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both relative rounded-[var(--radius-lg)] border border-white/[0.06] bg-[var(--surface-1)] p-4 duration-500"
                        style={{ animationDelay: card.delay }}
                      >
                        <div className="relative flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                              {card.label}
                            </p>
                            <p
                              className={cn(
                                "tabular mt-1.5 text-2xl font-bold",
                                card.valueClassName,
                              )}
                            >
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
                  });
                  })()}
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
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === "overdue"}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all duration-200 ease-out",
                      viewMode === "overdue"
                        ? "bg-amber-500 text-white shadow-sm"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                      focusRing,
                    )}
                    onClick={() => setViewMode("overdue")}
                  >
                    Overdue ({(data?.rows ?? []).filter((r) => r.daysToTarget !== null && r.daysToTarget < 0).length})
                  </button>
                </div>
              </div>

              {!loading && liveAccess ? (
                <>
                  <div className="flex items-center gap-2 border-b border-white/[0.04] px-4 py-2">
                    <button
                      type="button"
                      onClick={() => setFiltersOpen((prev) => !prev)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] font-medium transition-all duration-150",
                        filtersOpen || hasActiveFilters
                          ? "border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)]"
                          : "border-white/[0.08] bg-white/[0.03] text-white/60 hover:border-white/20 hover:text-white/80",
                        focusRing,
                      )}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                        <path
                          d="M1 3h10M3 6h6M5 9h2"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                      Filters
                      {hasActiveFilters ? (
                        <span className="ml-0.5 rounded-full bg-[var(--accent)] px-1.5 py-px text-[9px] font-bold text-[#0f172a]">
                          {activeFilterCount}
                        </span>
                      ) : null}
                    </button>

                    {clientFilter.trim() ? (
                      <span className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/70">
                        Client: {clientFilter.trim()}
                        <button
                          type="button"
                          onClick={() => setClientFilter("")}
                          className="ml-1 text-white/40 hover:text-white/80"
                          aria-label="Clear client filter"
                        >
                          ✕
                        </button>
                      </span>
                    ) : null}
                    {ownerFilter.trim() ? (
                      <span className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/70">
                        Owner: {ownerFilter.trim()}
                        <button
                          type="button"
                          onClick={() => setOwnerFilter("")}
                          className="ml-1 text-white/40 hover:text-white/80"
                          aria-label="Clear owner filter"
                        >
                          ✕
                        </button>
                      </span>
                    ) : null}
                    {statusFilter ? (
                      <span className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/70">
                        Status: {statusFilter}
                        <button
                          type="button"
                          onClick={() => setStatusFilter("")}
                          className="ml-1 text-white/40 hover:text-white/80"
                          aria-label="Clear status filter"
                        >
                          ✕
                        </button>
                      </span>
                    ) : null}
                    {ragFilter !== "all" ? (
                      <span className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/70">
                        RAG: {ragFilter === "sla_at_risk" ? "SLA at risk" : ragFilter}
                        <button
                          type="button"
                          onClick={() => setRagFilter("all")}
                          className="ml-1 text-white/40 hover:text-white/80"
                          aria-label="Clear RAG filter"
                        >
                          ✕
                        </button>
                      </span>
                    ) : null}
                    {statusPortfolioFilter !== "all" ? (
                      <span className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/70">
                        Portfolio status: {statusPortfolioFilter}
                        <button
                          type="button"
                          onClick={() => setStatusPortfolioFilter("all")}
                          className="ml-1 text-white/40 hover:text-white/80"
                          aria-label="Clear portfolio status filter"
                        >
                          ✕
                        </button>
                      </span>
                    ) : null}
                    {priorityPortfolioFilter !== "all" ? (
                      <span className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/70">
                        Priority: {priorityPortfolioFilter}
                        <button
                          type="button"
                          onClick={() => setPriorityPortfolioFilter("all")}
                          className="ml-1 text-white/40 hover:text-white/80"
                          aria-label="Clear priority filter"
                        >
                          ✕
                        </button>
                      </span>
                    ) : null}
                    {slaPortfolioFilter !== "all" ? (
                      <span className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/70">
                        SLA: {slaPortfolioFilter.replace("_", " ")}
                        <button
                          type="button"
                          onClick={() => setSlaPortfolioFilter("all")}
                          className="ml-1 text-white/40 hover:text-white/80"
                          aria-label="Clear SLA filter"
                        >
                          ✕
                        </button>
                      </span>
                    ) : null}

                    {hasActiveFilters ? (
                      <button
                        type="button"
                        onClick={() => {
                          setClientFilter("");
                          setOwnerFilter("");
                          setStatusFilter("");
                          setRagFilter("all");
                          setStatusPortfolioFilter("all");
                          setPriorityPortfolioFilter("all");
                          setSlaPortfolioFilter("all");
                        }}
                        className="ml-auto text-[11px] text-white/40 transition-colors hover:text-white/70"
                      >
                        Clear all
                      </button>
                    ) : null}
                  </div>

                  <div
                    className={cn(
                      "overflow-hidden border-b border-white/[0.04] transition-all duration-200 ease-in-out",
                      filtersOpen ? "max-h-[280px] opacity-100" : "max-h-0 opacity-0",
                    )}
                  >
                    <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
                      <div>
                        <div className="mono-label mb-1.5">Client</div>
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-white/30" />
                          <input
                            type="search"
                            placeholder="Filter by client"
                            value={clientFilter}
                            onChange={(e) => setClientFilter(e.target.value)}
                            list="delivery-health-client-options"
                            className={cn(filterFieldClass, "pl-9")}
                          />
                          <datalist id="delivery-health-client-options">
                            {clientFilterOptions.map((name) => (
                              <option key={name} value={name} />
                            ))}
                          </datalist>
                        </div>
                      </div>
                      <div>
                        <div className="mono-label mb-1.5">Owner</div>
                        <div className="relative">
                          <User className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-white/30" />
                          <input
                            type="search"
                            placeholder="Filter by owner"
                            value={ownerFilter}
                            onChange={(e) => setOwnerFilter(e.target.value)}
                            list="delivery-health-owner-options"
                            className={cn(filterFieldClass, "pl-9")}
                          />
                          <datalist id="delivery-health-owner-options">
                            {ownerFilterOptions.map((name) => (
                              <option key={name} value={name} />
                            ))}
                          </datalist>
                        </div>
                      </div>
                      <div>
                        <div className="mono-label mb-1.5">Exact status</div>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className={filterFieldClass}
                        >
                          <option value="">All statuses</option>
                          {statusFilterOptions.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <div className="mono-label mb-1.5">RAG</div>
                        <select
                          value={ragFilter}
                          onChange={(e) =>
                            setRagFilter(e.target.value as "all" | DeliveryHealthRag | "sla_at_risk")
                          }
                          className={filterFieldClass}
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
                      <div>
                        <div className="mono-label mb-1.5">Status</div>
                        <select
                          value={statusPortfolioFilter}
                          onChange={(e) =>
                            setStatusPortfolioFilter(e.target.value as StatusPortfolioFilter)
                          }
                          className={filterFieldClass}
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
                      <div>
                        <div className="mono-label mb-1.5">Priority</div>
                        <select
                          value={priorityPortfolioFilter}
                          onChange={(e) =>
                            setPriorityPortfolioFilter(e.target.value as PriorityPortfolioFilter)
                          }
                          className={filterFieldClass}
                        >
                          <option value="all">All</option>
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                      <div>
                        <div className="mono-label mb-1.5">SLA</div>
                        <select
                          value={slaPortfolioFilter}
                          onChange={(e) =>
                            setSlaPortfolioFilter(e.target.value as SlaPortfolioFilter)
                          }
                          className={filterFieldClass}
                        >
                          <option value="all">All</option>
                          <option value="overdue">SLA Overdue</option>
                          <option value="at_risk">SLA At Risk</option>
                          <option value="on_track">On Track</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}

              {viewMode === "overdue" ? (
                <div className="flex flex-col gap-4 p-4">
                  <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={autoChasEnabled}
                            onCheckedChange={(v) => setAutoChasEnabled(Boolean(v))}
                          />
                          <span className="text-[13px] font-medium text-[var(--text-primary)]">Auto-chase</span>
                        </div>
                        {autoChasEnabled && (
                          <div className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
                            <span>after</span>
                            <input
                              type="number"
                              min={1}
                              max={30}
                              value={autoChaseDays}
                              onChange={(e) => setAutoChaseDays(Number(e.target.value))}
                              className="w-14 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] px-2 py-1 text-center text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-amber-400"
                            />
                            <span>days overdue</span>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const msg = window.prompt(
                            "Default chase message (use {engineer} for name):",
                            defaultChaseMessage,
                          );
                          if (msg !== null) setDefaultChaseMessage(msg);
                          setChaseNoteTemplate(msg ?? defaultChaseMessage);
                        }}
                        className="text-[12px] text-[var(--text-muted)] underline-offset-2 transition-colors hover:text-[var(--text-primary)] hover:underline"
                      >
                        Edit default message
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[180px] flex-1">
                      <input
                        type="text"
                        value={chaseSearchQuery}
                        onChange={(e) => setChaseSearchQuery(e.target.value)}
                        placeholder="Search tickets, clients..."
                        className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-1.5 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                      />
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOwnerDropdownOpen((v) => !v)}
                        className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-1.5 text-[13px] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                      >
                        {chaseOwnerFilter === "all" ? "All engineers" : `@${chaseOwnerFilter}`}
                        <svg className="size-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                      {ownerDropdownOpen && (
                        <div className="absolute left-0 top-full z-20 mt-1 w-52 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] py-1 shadow-xl">
                          <button
                            type="button"
                            onClick={() => {
                              setChaseOwnerFilter("all");
                              setOwnerDropdownOpen(false);
                            }}
                            className={cn(
                              "w-full px-3 py-1.5 text-left text-[13px] transition-colors hover:bg-[var(--bg-secondary)]",
                              chaseOwnerFilter === "all"
                                ? "font-medium text-[var(--accent)]"
                                : "text-[var(--text-primary)]",
                            )}
                          >
                            All engineers
                          </button>
                          {allOverdueOwners.map((owner) => (
                            <button
                              key={owner}
                              type="button"
                              onClick={() => {
                                setChaseOwnerFilter(owner);
                                setOwnerDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full px-3 py-1.5 text-left text-[13px] transition-colors hover:bg-[var(--bg-secondary)]",
                                chaseOwnerFilter === owner
                                  ? "font-medium text-[var(--accent)]"
                                  : "text-[var(--text-primary)]",
                              )}
                            >
                              @{owner}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-amber-500/20 bg-amber-500/[0.06] px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedForChase.size === overdueRows.length && overdueRows.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedForChase(new Set(overdueRows.map((r) => r.id)));
                          } else {
                            setSelectedForChase(new Set());
                          }
                        }}
                        className="rounded border-amber-400/50"
                      />
                      <span className="text-[13px] text-[var(--text-secondary)]">
                        {selectedForChase.size > 0
                          ? `${selectedForChase.size} selected`
                          : `${overdueRows.length} overdue ticket${overdueRows.length !== 1 ? "s" : ""}`}
                      </span>
                    </div>
                    {selectedForChase.size > 0 && (
                      <button
                        type="button"
                        onClick={() => setChaseModalOpen(true)}
                        className="rounded-[var(--radius)] bg-amber-500 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-amber-400"
                      >
                        Chase {selectedForChase.size} selected →
                      </button>
                    )}
                  </div>

                  {overdueRows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <p className="text-[15px] font-medium text-[var(--text-primary)]">No overdue tickets</p>
                      <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                        {chaseSearchQuery || chaseOwnerFilter !== "all"
                          ? "No tickets match your filters."
                          : "All tickets are within their target dates."}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {overdueRows.map((row) => (
                        <div
                          key={row.id}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-[var(--radius-lg)] border px-4 py-3 transition-all duration-150",
                            selectedForChase.has(row.id)
                              ? "border-amber-400/40 bg-amber-500/[0.08]"
                              : "border-[var(--border)] bg-[var(--bg-primary)] hover:border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]",
                          )}
                          onClick={() => {
                            const next = new Set(selectedForChase);
                            if (next.has(row.id)) next.delete(row.id);
                            else next.add(row.id);
                            setSelectedForChase(next);
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedForChase.has(row.id)}
                            onChange={() => {}}
                            className="pointer-events-none shrink-0 rounded border-[var(--border)]"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium text-[var(--text-primary)]">{row.name}</p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-muted)]">
                              <span>{displayDeliveryHealthClientName(row.clientName)}</span>
                              {row.owner && (
                                <>
                                  <span>·</span>
                                  <span className="text-[var(--text-secondary)]">@{row.owner}</span>
                                </>
                              )}
                              <span>·</span>
                              <span className="font-medium text-red-400">
                                {Math.abs(row.daysToTarget ?? 0)} days overdue
                              </span>
                              {row.priorityName && (
                                <>
                                  <span>·</span>
                                  <span>{row.priorityName}</span>
                                </>
                              )}
                            </div>
                          </div>
                          {row.haloTicketUrl && (
                            <a
                              href={row.haloTicketUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="shrink-0 rounded border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                            >
                              View →
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {chaseModalOpen && (
                    <div
                      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-16"
                      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
                      onClick={(e) => {
                        if (e.target === e.currentTarget) setChaseModalOpen(false);
                      }}
                    >
                      <div className="w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] shadow-2xl">
                        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                          <div>
                            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
                              Chase {selectedForChase.size} overdue ticket{selectedForChase.size !== 1 ? "s" : ""}
                            </h2>
                            <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                              An internal note will be pushed to each selected ticket in your PSA.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setChaseModalOpen(false)}
                            className="rounded-md p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                          >
                            <svg className="size-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                            </svg>
                          </button>
                        </div>

                        <div className="px-5 pt-4">
                          <label className="mb-1.5 block text-[12px] font-medium text-[var(--text-secondary)]">
                            Note to send{" "}
                            <span className="font-normal text-[var(--text-muted)]">
                              — use {"{engineer}"} to insert their name
                            </span>
                          </label>
                          <textarea
                            value={chaseNoteTemplate}
                            onChange={(e) => setChaseNoteTemplate(e.target.value)}
                            rows={4}
                            className="w-full resize-none rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                          />
                        </div>

                        <div className="px-5 pb-2 pt-3">
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                            Tickets ({selectedForChase.size})
                          </p>
                          <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto pr-1">
                            {overdueRows
                              .filter((r) => selectedForChase.has(r.id))
                              .map((r) => (
                                <div
                                  key={r.id}
                                  className="flex items-center gap-2 rounded-[var(--radius)] bg-[var(--bg-secondary)] px-3 py-2"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-[12px] font-medium text-[var(--text-primary)]">
                                      {r.name}
                                    </p>
                                    <p className="text-[11px] text-[var(--text-muted)]">
                                      @{r.owner ?? "unassigned"} ·{" "}
                                      {displayDeliveryHealthClientName(r.clientName)} ·{" "}
                                      <span className="text-red-400">
                                        {Math.abs(r.daysToTarget ?? 0)}d overdue
                                      </span>
                                    </p>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-5 py-4">
                          <button
                            type="button"
                            onClick={() => setChaseModalOpen(false)}
                            disabled={chasingInFlight}
                            className="rounded-[var(--radius)] border border-[var(--border)] px-4 py-2 text-[13px] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleBulkChase()}
                            disabled={chasingInFlight}
                            className="flex items-center gap-2 rounded-[var(--radius)] bg-amber-500 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-amber-400 disabled:opacity-50"
                          >
                            {chasingInFlight && (
                              <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                />
                              </svg>
                            )}
                            {chasingInFlight
                              ? "Sending..."
                              : `Send ${selectedForChase.size} note${selectedForChase.size !== 1 ? "s" : ""}`}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : loading ? (
                <CustomersLoadingState />
              ) : !demoMode && !psaStatus.loading && !psaStatus.halo && !psaStatus.connectwise ? (
                <div className="px-6 py-10">
                  <PSAEmptyState
                    title="No PSA connected"
                    description="Connect HaloPSA or ConnectWise to view your delivery health."
                    showButton={false}
                  />
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
                  {/* Desktop table: per-ticket layout */}
                  <div className="hidden w-full md:block md:max-h-[min(70vh,720px)] md:overflow-auto">
                    <table className="w-full table-fixed border-collapse text-left text-[13px]">
                      <colgroup>
                        <col style={{ width: "14%" }} />
                        <col style={{ width: "24%" }} />
                        <col style={{ width: "8%" }} />
                        <col style={{ width: "11%" }} />
                        <col style={{ width: "12%" }} />
                        <col style={{ width: "9%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "8%" }} />
                        <col style={{ width: "86px" }} />
                      </colgroup>
                      <thead className="sticky top-0 z-10 backdrop-blur-sm bg-[var(--surface-1)]/85">
                        <tr className="border-b border-white/[0.04]">
                          {headerCell("clientName", "Client/Account")}
                          <th className="sticky top-0 z-10 bg-[var(--surface-1)]/85 px-3 py-2.5 text-left shadow-[0_1px_0_var(--border)] text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] backdrop-blur-sm">Ticket/Project</th>
                          {headerCell("rag", "RAG")}
                          {headerCell("statusName", "Status")}
                          <th className="sticky top-0 z-10 bg-[var(--surface-1)]/85 px-3 py-2.5 text-left shadow-[0_1px_0_var(--border)] text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] backdrop-blur-sm">Owner</th>
                          <th className="sticky top-0 z-10 bg-[var(--surface-1)]/85 px-3 py-2.5 text-left shadow-[0_1px_0_var(--border)] text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] backdrop-blur-sm">Priority</th>
                          <th className="sticky top-0 z-10 bg-[var(--surface-1)]/85 px-3 py-2.5 text-left shadow-[0_1px_0_var(--border)] text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] backdrop-blur-sm">SLA</th>
                          {headerCell("timeLogged", "Time Logged")}
                          <th className="sticky top-0 z-10 bg-[var(--surface-1)]/85 px-3 py-2.5 text-center shadow-[0_1px_0_var(--border)] text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] backdrop-blur-sm">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleDesktopRows.map((row) => {
                          const closed = isClosedStatusName(row.statusName);
                          const displayName = row.name.length > 40 ? `${row.name.slice(0, 37)}...` : row.name;
                          return (
                            <tr
                              key={`${row.source}-${row.kind}-${row.id}`}
                              className={cn(
                                "group border-b border-white/[0.04] transition-colors duration-200 ease-out",
                                "hover:bg-white/[0.025]",
                                closed && "opacity-60",
                              )}
                            >
                              <td className="min-w-0 px-3 py-2.5 align-top text-[var(--text-secondary)]">
                                <p className="truncate">
                                  {displayDeliveryHealthClientName(row.clientName)}
                                </p>
                              </td>
                              <td className="min-w-0 px-3 py-2.5 align-top">
                                <p className="truncate font-medium text-white" title={row.name}>
                                  {displayName}
                                </p>
                                <div className="mt-1 flex items-center gap-2">
                                  <SourcePill source={row.source} />
                                  <span
                                    className={cn(
                                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                                      row.kind === "ticket"
                                        ? "bg-blue-500/15 text-blue-300"
                                        : "bg-violet-500/15 text-violet-300",
                                    )}
                                  >
                                    {row.kind === "ticket" ? "Ticket" : "Project"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 align-top">
                                <RagBadge rag={row.rag} />
                              </td>
                              <td className="px-3 py-2.5 align-top text-[12px] text-[var(--text-secondary)]">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span>{row.statusName || "—"}</span>
                                  {closed ? (
                                    <span className="rounded-full bg-slate-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-300">
                                      Closed
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 align-top text-[12px] text-[var(--text-secondary)]">
                                {row.owner || "—"}
                              </td>
                              <td className="px-3 py-2.5 align-top text-[12px] text-[var(--text-secondary)]">
                                {row.priorityName || "—"}
                              </td>
                              <td className="px-3 py-2.5 align-top">
                                {row.slaRisk ? (
                                  <SlaRiskBadge level={row.slaRisk} />
                                ) : (
                                  <span className="text-[12px] text-[var(--text-secondary)]">On track</span>
                                )}
                              </td>
                              <td className="tabular px-3 py-2.5 align-top text-[var(--text-primary)]">
                                {formatTimeLogged(row.timeLogged)}
                              </td>
                              <td className="px-3 py-2.5 align-top opacity-0 transition-opacity duration-100 group-hover:opacity-100">
                                <div className="flex flex-col items-center gap-1">
                                  <button
                                    type="button"
                                    title="View"
                                    className={cn(
                                      "inline-flex items-center gap-1 rounded border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]",
                                      focusRing,
                                    )}
                                    onClick={() => {
                                      openRowDetail(row);
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
                  {clientListViewMode === "paginated" && totalDesktopRowCount > 0 ? (
                    <div className="hidden flex-col gap-3 border-t border-[var(--border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:flex">
                      <p className="text-[12px] text-[var(--text-secondary)]">
                        {`Showing ${desktopPageRangeStart}-${desktopPageRangeEnd} of ${totalDesktopRowCount} tickets/projects`}
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-[12px] text-[var(--text-secondary)]">
                          {`Page ${safeDesktopPage} of ${totalDesktopPages}`}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={focusRing}
                          disabled={safeDesktopPage <= 1}
                          onClick={() => setClientPage((p) => Math.max(1, p - 1))}
                        >
                          Previous
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={focusRing}
                          disabled={safeDesktopPage >= totalDesktopPages}
                          onClick={() => setClientPage((p) => Math.min(totalDesktopPages, p + 1))}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  {clientListViewMode === "paginated" && totalClientCount > 0 ? (
                    <div className="flex flex-col gap-3 border-t border-[var(--border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:hidden">
                      <p className="tabular text-[12px] text-[var(--text-secondary)]">
                        {`Showing ${clientPageRangeStart}-${clientPageRangeEnd} of ${totalClientCount} clients`}
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="tabular text-[12px] text-[var(--text-secondary)]">
                          {`Page ${safeClientPage} of ${totalClientPages}`}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={focusRing}
                          disabled={safeClientPage <= 1}
                          onClick={() => setClientPage((p) => Math.max(1, p - 1))}
                        >
                          Previous
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={focusRing}
                          disabled={safeClientPage >= totalClientPages}
                          onClick={() => setClientPage((p) => Math.min(totalClientPages, p + 1))}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  ) : null}


                  {/* Mobile cards (stacked per account row) */}
                  <div className="space-y-3 p-4 md:hidden">
                    {visibleMobileRows.map((row) =>
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
                              title={`${displayDeliveryHealthClientName(row.clientName)} · ${ownerCellLabel(row.owner)}`}
                            >
                              {displayDeliveryHealthClientName(row.clientName)} ·{" "}
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
                              <span className="tabular text-[12px] text-[var(--text-secondary)]">
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
                              title={`${displayDeliveryHealthClientName(row.clientName)} · ${ownerCellLabel(row.owner)}`}
                            >
                              {displayDeliveryHealthClientName(row.clientName)} ·{" "}
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
                              <span className="tabular text-[12px] text-[var(--text-secondary)]">
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
                              title={`${displayDeliveryHealthClientName(row.clientName)} · ${ownerCellLabel(row.owner)}`}
                            >
                              {displayDeliveryHealthClientName(row.clientName)} ·{" "}
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
                              <span className="tabular text-[12px] text-[var(--text-secondary)]">
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
        demoMode={demoMode}
        onClose={closeRowDetail}
        focusRing={focusRing}
        allowGenerateFromDashboard={dashboardAccess === "full"}
        onGenerateReport={(payload) => onStartGenerationFromDelivery?.(payload)}
      />
    </div>
  );
}
