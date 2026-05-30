"use client";

import Image from "next/image";
import { ChevronDown, ExternalLink, Loader2, X } from "lucide-react";
import {
  Component,
  type ErrorInfo,
  Fragment,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { usePortalBootstrap } from "@/components/portal-customer/portal-bootstrap-context";
import { cleanTicketNoteContent } from "@/lib/note-cleaner";
import { mspBrandAccentColour, mspBrandLogoUrl } from "@/lib/portal-customer-brand-display";
import { cn } from "@/lib/utils";

type PortalNoteLine = { date: string | null; author: string; content: string };

type PortalTicketRow = {
  id: number;
  summary: string;
  status: string;
  priority: string;
  engineer: string;
  lastUpdated: string | null;
};

type SessionPayload = {
  session: { expires_at: string };
  user: { email: string; display_name: string | null };
  client?: {
    visibility_tickets: boolean | null;
    visibility_projects: boolean | null;
    visibility_rag: boolean | null;
    visibility_reports: boolean | null;
    visibility_ticket_notes?: boolean | null;
    visibility_stats?: boolean | null;
    visibility_priority_breakdown?: boolean | null;
    visibility_resolved_count?: boolean | null;
    visibility_recent_activity?: boolean | null;
  } | null;
  msp_profile: {
    brand_name?: string | null;
    brand_logo_url?: string | null;
    brand_colour?: string | null;
    white_label_mode?: boolean | null;
    company_name?: string | null;
    display_name?: string | null;
  } | null;
  isOwnerPreview?: boolean;
};

type PortalData = {
  tickets?: PortalTicketRow[];
  projects?: Array<{
    id: number;
    name: string;
    status: string;
    percentComplete: number | null;
    engineer: string;
    targetDate: string | null;
  }>;
  rag?: "red" | "amber" | "green" | "grey" | null;
  lastUpdated: string;
  selfServiceUrl?: string | null;
  ticketNotes?: PortalNoteLine[];
  ticketNotesTicketId?: number;
  projectNotes?: PortalNoteLine[];
  projectNotesProjectId?: number;
  stats?: {
    openTickets: number;
    highPriority?: number;
    mediumPriority?: number;
    lowPriority?: number;
    activeProjects: number;
    avgProjectProgress: number;
    rag: "red" | "amber" | "green" | "grey";
    resolvedThisMonth?: number;
    monthlyVolume?: Record<string, number>;
  };
  recentActivity?: Array<{ date: string | null; author: string; summary: string }>;
};

type PortalReportRow = {
  id: string;
  title: string;
  content: unknown;
  created_at: string;
};

class PortalDashboardErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[portal-dashboard]", error, errorInfo.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <p className="text-[15px] font-semibold text-[var(--text-primary)]">Something went wrong</p>
          <p className="max-w-md text-[13px] text-[var(--text-secondary)]">
            Please refresh the page. If the problem continues, contact your MSP.
          </p>
          <button
            type="button"
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-2 text-[13px] text-[var(--text-primary)]"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function portalServiceHealthLabel(r: PortalData["rag"]): string {
  switch (r) {
    case "red":
      return "Action required";
    case "amber":
      return "Needs attention";
    case "green":
      return "On track";
    case "grey":
      return "Checking status...";
    default:
      return "Checking status...";
  }
}

function ragColor(r: PortalData["rag"]): string {
  switch (r) {
    case "red":
      return "#ef4444";
    case "amber":
      return "#f59e0b";
    case "green":
      return "#22c55e";
    case "grey":
      return "#94a3b8";
    default:
      return "#64748b";
  }
}

export function PortalCustomerDashboard() {
  return (
    <PortalDashboardErrorBoundary>
      <PortalCustomerDashboardInner />
    </PortalDashboardErrorBoundary>
  );
}

function PortalCustomerDashboardInner() {
  const { account, client, profile } = usePortalBootstrap();
  const [session, setSession] = useState<SessionPayload | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);
  const [volumePeriod, setVolumePeriod] = useState<"3m" | "6m" | "12m">("6m");

  const [tab, setTab] = useState<"overview" | "tickets" | "projects" | "reports">("overview");
  const [data, setData] = useState<PortalData | null>(null);
  const [dataErr, setDataErr] = useState<string | null>(null);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketModalId, setTicketModalId] = useState<string | null>(null);
  const [ticketModalRow, setTicketModalRow] = useState<PortalTicketRow | null>(null);
  const [expandedTicketId, setExpandedTicketId] = useState<number | null>(null);
  const [ticketNotesById, setTicketNotesById] = useState<Record<number, PortalNoteLine[]>>({});
  const [ticketNotesLoadingId, setTicketNotesLoadingId] = useState<number | null>(null);
  const [expandedProjectId, setExpandedProjectId] = useState<number | null>(null);
  const [projectNotesById, setProjectNotesById] = useState<Record<number, PortalNoteLine[]>>({});
  const [projectNotesLoadingId, setProjectNotesLoadingId] = useState<number | null>(null);
  const [portalReports, setPortalReports] = useState<PortalReportRow[] | null>(null);
  const [portalReportsErr, setPortalReportsErr] = useState<string | null>(null);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const ticketNotesLoadedRef = useRef<Set<number>>(new Set());
  const projectNotesLoadedRef = useRef<Set<number>>(new Set());

  const mergedVisibility = useMemo(() => {
    const sc = session?.user && session.client ? session.client : null;
    const c = client;
    return {
      showTickets: (sc?.visibility_tickets ?? c.visibility_tickets) !== false,
      showProjects: (sc?.visibility_projects ?? c.visibility_projects) !== false,
      showRag: (sc?.visibility_rag ?? c.visibility_rag) !== false,
      showReports: (sc?.visibility_reports ?? c.visibility_reports) === true,
      showVisibilityStats: (sc?.visibility_stats ?? c.visibility_stats ?? true) !== false,
      showPriorityBreakdownUi: (sc?.visibility_priority_breakdown ?? c.visibility_priority_breakdown ?? true) !== false,
      showResolvedCountUi: (sc?.visibility_resolved_count ?? c.visibility_resolved_count) === true,
      showRecentFeedUi: (sc?.visibility_recent_activity ?? c.visibility_recent_activity ?? true) !== false,
    };
  }, [session, client]);

  const chartDerived = useMemo(() => {
    const s = data?.stats;
    let priorityPieData: Array<{ name: string; value: number; fill: string }> = [];
    if (s && s.highPriority != null && s.mediumPriority != null && s.lowPriority != null) {
      const rows = [
        { name: "High", value: s.highPriority ?? 0, fill: "#ef4444" },
        { name: "Medium", value: s.mediumPriority ?? 0, fill: "#f59e0b" },
        { name: "Low", value: s.lowPriority ?? 0, fill: "#22c55e" },
      ];
      const total = rows.reduce((a, r) => a + r.value, 0);
      if (total > 0) priorityPieData = rows.filter((r) => r.value > 0);
    }
    const priorityTotal =
      s && s.highPriority != null
        ? (s.highPriority ?? 0) + (s.mediumPriority ?? 0) + (s.lowPriority ?? 0)
        : 0;
    const projectBars = (data?.projects ?? []).slice(0, 5).map((p) => {
      const name = typeof p?.name === "string" ? p.name : "";
      return {
        name: name.length > 32 ? `${name.slice(0, 29)}…` : name,
        percentComplete: Math.min(100, Math.max(0, p?.percentComplete ?? 0)),
      };
    });
    const monthsBack = volumePeriod === "3m" ? 3 : volumePeriod === "12m" ? 12 : 6;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - monthsBack);
    const monthlyVolumeData = Object.entries(s?.monthlyVolume ?? {})
      .filter(([month]) => new Date(`${month}-01`) >= cutoff)
      .sort()
      .map(([month, count]) => ({
        month: new Date(`${month}-01`).toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
        tickets: count as number,
      }));
    return { priorityPieData, priorityTotal, projectBars, monthlyVolumeData };
  }, [data, volumePeriod]);

  const mspDisplay =
    profile?.brand_name?.trim() ||
    profile?.company_name?.trim() ||
    profile?.display_name?.trim() ||
    account.display_name?.trim() ||
    "Your MSP";

  const mspLogo = mspBrandLogoUrl(profile?.brand_logo_url);
  const accent = mspBrandAccentColour(profile?.brand_colour);
  const hidePoweredBy = profile?.white_label_mode === true;

  const loadSession = useCallback(async () => {
    const res = await fetch("/api/portal/auth/session", { credentials: "include", cache: "no-store" });
    if (!res.ok) {
      setSession(null);
      return;
    }
    const json = (await res.json()) as SessionPayload;
    setSession(json);
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const dataUrl = useMemo(
    () => `/api/portal/${encodeURIComponent(account.slug)}/${encodeURIComponent(client.slug)}/data`,
    [account.slug, client.slug],
  );
  const reportsUrl = useMemo(
    () => `/api/portal/${encodeURIComponent(account.slug)}/${encodeURIComponent(client.slug)}/reports`,
    [account.slug, client.slug],
  );

  const loadData = useCallback(async () => {
    setDataErr(null);
    const res = await fetch(dataUrl, { credentials: "include", cache: "no-store" });
    if (!res.ok) {
      setDataErr("Could not load PSA data.");
      setData(null);
      return;
    }
    setData((await res.json()) as PortalData);
  }, [dataUrl]);

  useEffect(() => {
    if (session && session.user) void loadData();
  }, [session, loadData]);

  useEffect(() => {
    const showReportsMerged =
      session?.user && (session.client?.visibility_reports ?? client.visibility_reports) === true;
    if (!showReportsMerged) return;
    if (tab !== "reports" && tab !== "overview") return;
    let cancelled = false;
    setPortalReportsErr(null);
    void (async () => {
      const res = await fetch(reportsUrl, { credentials: "include", cache: "no-store" });
      if (!res.ok) {
        if (!cancelled) {
          setPortalReportsErr("Could not load reports.");
          setPortalReports([]);
        }
        return;
      }
      const j = (await res.json().catch(() => ({}))) as { reports?: PortalReportRow[] };
      if (!cancelled) setPortalReports(Array.isArray(j.reports) ? j.reports : []);
    })();
    return () => {
      cancelled = true;
    };
  }, [session, tab, reportsUrl, client.visibility_reports]);

  const showTicketNotes =
    (session?.client?.visibility_ticket_notes ?? client.visibility_ticket_notes) !== false;

  const toggleTicketExpanded = useCallback(
    async (ticketId: number) => {
      if (!showTicketNotes) return;
      if (expandedTicketId === ticketId) {
        setExpandedTicketId(null);
        return;
      }
      setExpandedTicketId(ticketId);
      if (ticketNotesLoadedRef.current.has(ticketId)) return;
      ticketNotesLoadedRef.current.add(ticketId);
      setTicketNotesLoadingId(ticketId);
      try {
        const res = await fetch(
          `${dataUrl}?ticketId=${encodeURIComponent(String(ticketId))}`,
          { credentials: "include", cache: "no-store" },
        );
        const j = (await res.json().catch(() => ({}))) as {
          ticketNotes?: Array<{ date: string | null; author: string; content: string }>;
        };
        const notes = Array.isArray(j.ticketNotes) ? j.ticketNotes : [];
        setTicketNotesById((prev) => ({ ...prev, [ticketId]: notes }));
      } catch {
        ticketNotesLoadedRef.current.delete(ticketId);
      } finally {
        setTicketNotesLoadingId(null);
      }
    },
    [dataUrl, expandedTicketId, showTicketNotes],
  );

  const toggleProjectExpanded = useCallback(
    async (projectId: number) => {
      if (!showTicketNotes) return;
      if (expandedProjectId === projectId) {
        setExpandedProjectId(null);
        return;
      }
      setExpandedProjectId(projectId);
      if (projectNotesLoadedRef.current.has(projectId)) return;
      projectNotesLoadedRef.current.add(projectId);
      setProjectNotesLoadingId(projectId);
      try {
        const res = await fetch(
          `${dataUrl}?projectId=${encodeURIComponent(String(projectId))}`,
          { credentials: "include", cache: "no-store" },
        );
        const j = (await res.json().catch(() => ({}))) as {
          projectNotes?: PortalNoteLine[];
        };
        const notes = Array.isArray(j.projectNotes) ? j.projectNotes : [];
        setProjectNotesById((prev) => ({ ...prev, [projectId]: notes }));
      } catch {
        projectNotesLoadedRef.current.delete(projectId);
      } finally {
        setProjectNotesLoadingId(null);
      }
    },
    [dataUrl, expandedProjectId, showTicketNotes],
  );

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/portal/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          msp_slug: account.slug,
          client_slug: client.slug,
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) {
        setLoginError(j.error ?? "Sign in failed.");
        return;
      }
      setPassword("");
      await loadSession();
    } finally {
      setBusy(false);
    }
  };

  const onForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/portal/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase(),
          msp_slug: account.slug,
          client_slug: client.slug,
        }),
      });
      if (!res.ok) {
        setForgotMsg("Could not send reset email.");
        return;
      }
      setForgotMsg("If an account exists for that email, we sent reset instructions.");
    } finally {
      setBusy(false);
    }
  };

  const onLogout = async () => {
    await fetch("/api/portal/auth/logout", { method: "POST", credentials: "include" });
    setSession(null);
    setData(null);
  };

  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--text-secondary)]">
        Loading…
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <div
          className={cn(
            "w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] p-6 md:p-8",
          )}
        >
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            {mspLogo ? (
              // eslint-disable-next-line @next/next/no-img-element -- remote MSP branding URLs
              <img src={mspLogo} alt="" className="h-10 w-auto max-w-[200px] object-contain" />
            ) : (
              <Image src="/icon2.png" alt="Handover" width={40} height={40} className="rounded-md" />
            )}
            <div>
              <h1 className="text-lg font-semibold">{mspDisplay}</h1>
              <p className="mt-1 text-[13px] text-[var(--text-secondary)]">Client portal — {client.client_name}</p>
            </div>
          </div>
          {!forgotOpen ? (
            <form className="space-y-4" onSubmit={(e) => void onLogin(e)}>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">Email</label>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[13px] outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">Password</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[13px] outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>
              {loginError ? <p className="text-[13px] text-red-400">{loginError}</p> : null}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-[var(--radius)] py-2.5 text-[13px] font-semibold text-white transition-opacity disabled:opacity-50"
                style={{ backgroundColor: accent }}
              >
                {busy ? "Signing in…" : "Sign in"}
              </button>
              <button
                type="button"
                className="w-full text-center text-[12px] text-[var(--accent)] hover:underline"
                onClick={() => {
                  setForgotOpen(true);
                  setForgotEmail(email);
                }}
              >
                Forgot password?
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={(e) => void onForgot(e)}>
              <p className="text-[13px] text-[var(--text-secondary)]">
                Enter your email and we will send a reset link if an account exists.
              </p>
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[13px] outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
              {forgotMsg ? <p className="text-[13px] text-[var(--text-secondary)]">{forgotMsg}</p> : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 rounded-[var(--radius)] border border-[var(--border)] py-2 text-[13px]"
                  onClick={() => {
                    setForgotOpen(false);
                    setForgotMsg(null);
                  }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 rounded-[var(--radius)] py-2 text-[13px] font-semibold text-white transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: accent }}
                >
                  Send link
                </button>
              </div>
            </form>
          )}
        </div>
        {!hidePoweredBy ? (
          <p className="mt-8 text-[11px] text-[var(--text-muted)]">Powered by Handover</p>
        ) : null}
      </div>
    );
  }

  const {
    showTickets,
    showProjects,
    showRag,
    showReports,
    showVisibilityStats,
    showPriorityBreakdownUi,
    showResolvedCountUi,
    showRecentFeedUi,
  } = mergedVisibility;

  const tabs: Array<{ id: typeof tab; label: string }> = [{ id: "overview", label: "Overview" }];
  if (showTickets) tabs.push({ id: "tickets", label: "Tickets" });
  if (showProjects) tabs.push({ id: "projects", label: "Projects" });
  if (showReports) tabs.push({ id: "reports", label: "Reports" });

  const portalRag = (data?.stats?.rag ?? data?.rag ?? null) as PortalData["rag"];
  const openTickets = data?.stats?.openTickets ?? data?.tickets?.length ?? 0;
  const openProjects = data?.stats?.activeProjects ?? data?.projects?.length ?? 0;
  const selfServiceUrl = data?.selfServiceUrl?.trim() || "";

  const { priorityPieData, priorityTotal, projectBars, monthlyVolumeData } = chartDerived;

  const hasPriorityChart = showPriorityBreakdownUi && showTickets;
  const hasProjectChart = showProjects && projectBars.length > 0;
  const hasMonthlyVolumeChart = showVisibilityStats && monthlyVolumeData.length > 0;

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 md:px-6"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex min-w-0 items-center gap-3">
          {mspLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mspLogo} alt="" className="h-8 w-auto max-w-[120px] shrink-0 object-contain md:max-w-[160px]" />
          ) : (
            <Image src="/icon2.png" alt="" width={32} height={32} className="shrink-0 rounded" />
          )}
          <div className="min-w-0 text-center md:flex-1">
            <p className="truncate text-[11px] uppercase tracking-wide text-[var(--text-muted)] md:hidden">Client</p>
            <h1 className="truncate text-[15px] font-semibold md:text-lg">{client.client_name}</h1>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void onLogout()}
          className="shrink-0 rounded-[var(--radius)] border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]"
        >
          Log out
        </button>
      </header>

      <div className="border-b border-[var(--border)] bg-[var(--bg-secondary)] px-2 md:px-4">
        <nav className="flex gap-1 overflow-x-auto py-2" aria-label="Portal sections">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "shrink-0 rounded-[var(--radius)] px-3 py-1.5 text-[12px] font-medium transition-colors",
                tab === t.id ? "bg-[var(--bg-primary)] text-white" : "text-[var(--text-secondary)] hover:text-white",
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <main className="flex-1 space-y-6 px-4 py-6 md:px-8">
        {dataErr ? <p className="text-[13px] text-red-400">{dataErr}</p> : null}

        {tab === "overview" ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {showRag ? (
                <div className="rounded-2xl border border-[#2d3f5e] bg-[#1a2540] p-6">
                  <p className="text-[13px] text-[var(--text-secondary)]">Service health</p>
                  <div className="mt-4 flex items-center gap-3">
                    <span
                      className="inline-block size-8 shrink-0 rounded-full ring-2 ring-white/10"
                      style={{ backgroundColor: ragColor(portalRag) }}
                      aria-hidden
                    />
                    <span className="text-xl font-semibold text-white">
                      {portalServiceHealthLabel(portalRag)}
                    </span>
                  </div>
                </div>
              ) : null}
              {showTickets ? (
                <div className="rounded-2xl border border-[#2d3f5e] bg-[#1a2540] p-6">
                  <p className="text-[13px] text-[var(--text-secondary)]">Open tickets</p>
                  <p className="mt-3 text-3xl font-bold tabular-nums text-white">{openTickets}</p>
                </div>
              ) : null}
              {showProjects ? (
                <div className="rounded-2xl border border-[#2d3f5e] bg-[#1a2540] p-6">
                  <p className="text-[13px] text-[var(--text-secondary)]">Active projects</p>
                  <p className="mt-3 text-3xl font-bold tabular-nums text-white">{openProjects}</p>
                </div>
              ) : null}
              {showResolvedCountUi && data?.stats != null && data.stats.resolvedThisMonth != null ? (
                <div className="rounded-2xl border border-[#2d3f5e] bg-[#1a2540] p-6">
                  <p className="text-[13px] text-[var(--text-secondary)]">Resolved this month</p>
                  <p className="mt-3 text-3xl font-bold tabular-nums text-white">
                    {data.stats.resolvedThisMonth}
                  </p>
                </div>
              ) : null}
            </div>

            {showVisibilityStats && (hasPriorityChart || hasProjectChart || hasMonthlyVolumeChart) ? (
              <div
                className={cn(
                  "grid gap-4",
                  hasPriorityChart && hasProjectChart ? "lg:grid-cols-2" : "grid-cols-1",
                )}
              >
                {hasPriorityChart ? (
                  <div className="rounded-2xl border border-[#2d3f5e] bg-[#1a2540] p-6">
                    <p className="mb-2 text-[13px] font-medium text-white">
                      Open tickets by priority
                    </p>
                    {priorityPieData.length === 0 ? (
                      <p className="py-8 text-center text-[13px] text-[var(--text-muted)]">
                        No priority data for open tickets.
                      </p>
                    ) : (
                      <div className="relative mx-auto h-52 w-full max-w-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={priorityPieData ?? []}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={48}
                              outerRadius={72}
                              paddingAngle={2}
                            >
                              {priorityPieData.map((entry) => (
                                <Cell key={entry.name} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(v: number, name: string) => [`${v} ticket${v !== 1 ? "s" : ""}`, name]}
                              contentStyle={{
                                background: "#0f172a",
                                border: "1px solid #2d3f5e",
                                borderRadius: 8,
                                fontSize: 12,
                              }}
                              labelStyle={{ color: "#ffffff" }}
                              itemStyle={{ color: "#ffffff" }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl font-bold text-white">{priorityTotal}</span>
                        </div>
                      </div>
                    )}
                    <div className="mt-3 flex justify-center gap-4">
                      {priorityPieData.map((entry) => (
                        <div key={entry.name} className="flex items-center gap-1.5">
                          <div className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.fill }} />
                          <span className="text-[11px] text-white">{entry.value} {entry.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {hasProjectChart ? (
                  <div className="rounded-2xl border border-[#2d3f5e] bg-[#1a2540] p-6">
                    <p className="mb-3 text-[13px] font-medium text-white">Project progress</p>
                    <div className="h-56 w-full min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={projectBars ?? []}
                          margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#2d3f5e" horizontal={false} />
                          <XAxis type="number" domain={[0, 100]} tick={{ fill: "#ffffff", fontSize: 11 }} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={108}
                            tick={{ fill: "#ffffff", fontSize: 11 }}
                            interval={0}
                          />
                          <Tooltip
                            formatter={(v: number) => [`${v}%`, "Complete"]}
                            contentStyle={{
                              background: "#0f172a",
                              border: "1px solid #2d3f5e",
                              borderRadius: 8,
                              fontSize: 12,
                            }}
                            labelStyle={{ color: "#ffffff" }}
                            itemStyle={{ color: "#ffffff" }}
                          />
                          <Bar dataKey="percentComplete" radius={[0, 4, 4, 0]}>
                            {projectBars.map((_, i) => (
                              <Cell key={i} fill="#0EA5E9" />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : null}
                {hasMonthlyVolumeChart && (
                  <div className="col-span-full rounded-2xl border border-[#2d3f5e] bg-[#1a2540] p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-[13px] font-medium text-white">Ticket volume</p>
                      <div className="flex gap-1">
                        {(["3m", "6m", "12m"] as const).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setVolumePeriod(p)}
                            className={cn(
                              "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                              volumePeriod === p
                                ? "border border-[var(--accent)]/30 bg-[var(--accent)]/20 text-white"
                                : "text-[var(--text-secondary)] hover:text-white",
                            )}
                          >
                            {p === "3m" ? "3 months" : p === "6m" ? "6 months" : "12 months"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={monthlyVolumeData} barSize={28}>
                        <XAxis
                          dataKey="month"
                          tick={{ fill: "#94a3b8", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "#94a3b8", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                          width={24}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(14,165,233,0.08)" }}
                          contentStyle={{ background: "#0f172a", border: "1px solid #2d3f5e", borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ color: "#ffffff" }}
                          itemStyle={{ color: "#ffffff" }}
                          formatter={(v: number) => [`${v} ticket${v !== 1 ? "s" : ""}`, ""]}
                        />
                        <Bar dataKey="tickets" fill="var(--accent)" radius={[4, 4, 0, 0]} opacity={0.85} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            ) : null}

            {showRecentFeedUi && (data?.recentActivity ?? []).length > 0 ? (
              <div className="rounded-2xl border border-[#2d3f5e] bg-[#1a2540] p-6">
                <h3 className="text-[15px] font-semibold text-white">Recent activity</h3>
                <ul className="mt-4 space-y-4 border-l border-[#2d3f5e] pl-4">
                  {(data?.recentActivity ?? []).map((item, idx) => (
                    <li key={`${item.date ?? ""}-${idx}`} className="relative text-[13px]">
                      <span
                        className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-[var(--accent)]"
                        aria-hidden
                      />
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {item.date
                          ? new Date(item.date).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "—"}{" "}
                        · {item.author}
                      </p>
                      <p className="mt-1 leading-relaxed text-[var(--text-secondary)]">{item.summary}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {showReports ? (
              <div className="rounded-2xl border border-[#2d3f5e] bg-[#1a2540] p-6 text-[13px] text-[var(--text-secondary)]">
                <h3 className="text-[15px] font-semibold text-white">Reports</h3>
                {portalReportsErr ? <p className="mt-2 text-red-400">{portalReportsErr}</p> : null}
                {!portalReportsErr && portalReports && portalReports.length === 0 ? (
                  <p className="mt-3">No reports yet — your MSP will share reports here.</p>
                ) : null}
                {portalReports && portalReports.length > 0 ? (
                  <ul className="mt-4 space-y-3">
                    {portalReports.map((r) => {
                      const open = expandedReportId === r.id;
                      return (
                        <li
                          key={r.id}
                          className="rounded-[var(--radius)] border border-[#2d3f5e] bg-[#0f172a]/60 p-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-[var(--text-primary)]">{r.title}</p>
                              <p className="text-[11px] text-[var(--text-muted)]">
                                {new Date(r.created_at).toLocaleString(undefined, {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}
                              </p>
                            </div>
                            <button
                              type="button"
                              className="shrink-0 rounded-[var(--radius)] border border-[#2d3f5e] px-2.5 py-1 text-[12px] text-[var(--text-primary)] hover:bg-[#1a2540]"
                              onClick={() => setExpandedReportId(open ? null : r.id)}
                            >
                              {open ? "Hide" : "View"}
                            </button>
                          </div>
                          {open ? (
                            <pre className="mt-3 max-h-[min(60vh,28rem)] overflow-auto whitespace-pre-wrap rounded border border-[#2d3f5e] bg-[#0f172a] p-3 text-[11px] leading-relaxed text-[var(--text-primary)]">
                              {JSON.stringify(r.content, null, 2)}
                            </pre>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            ) : null}

            <div className="rounded-2xl border border-[#2d3f5e] bg-[#1a2540] p-4 text-[12px] text-[var(--text-muted)]">
              Last updated:{" "}
              {data?.lastUpdated
                ? new Date(data.lastUpdated).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
                : "—"}
            </div>
          </div>
        ) : null}

        {tab === "tickets" && showTickets ? (
          <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)]">
            <table className="min-w-full text-left text-[13px]">
              <thead className="border-b border-[var(--border)] text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                <tr>
                  {showTicketNotes ? (
                    <th className="w-8 px-1 py-2 font-medium" aria-hidden />
                  ) : null}
                  <th className="px-3 py-2 font-medium">Summary</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Priority</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">Engineer</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">Last updated</th>
                </tr>
              </thead>
              <tbody>
                {(data?.tickets ?? []).map((row) => {
                  const open = ticketModalOpen && ticketModalId === String(row.id);
                  return (
                    <Fragment key={row.id}>
                      <tr
                        className={cn(
                          "border-b border-[var(--border)]",
                          showTicketNotes ? "cursor-pointer hover:bg-[var(--bg-primary)]/40" : "",
                        )}
                        onClick={() => {
                          if (showTicketNotes) {
                            setTicketModalRow(row);
                            setTicketModalId(String(row.id));
                            setTicketModalOpen(true);
                            void toggleTicketExpanded(row.id);
                          }
                        }}
                      >
                        {showTicketNotes ? (
                          <td className="px-1 py-2 align-middle">
                            <ChevronDown
                              className={cn(
                                "mx-auto size-4 shrink-0 text-[var(--text-muted)] transition-transform",
                                open ? "rotate-180" : "rotate-0",
                              )}
                              aria-hidden
                            />
                          </td>
                        ) : null}
                        <td className="max-w-[220px] truncate px-3 py-2 text-[var(--text-primary)]">{row.summary}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-[var(--text-secondary)]">{row.status}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-[var(--text-secondary)]">{row.priority}</td>
                        <td className="hidden whitespace-nowrap px-3 py-2 text-[var(--text-secondary)] sm:table-cell">
                          {row.engineer}
                        </td>
                        <td className="hidden whitespace-nowrap px-3 py-2 text-[var(--text-secondary)] md:table-cell">
                          {row.lastUpdated
                            ? new Date(row.lastUpdated).toLocaleDateString(undefined, { dateStyle: "medium" })
                            : "—"}
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            {(data?.tickets ?? []).length === 0 ? (
              <p className="p-4 text-[13px] text-[var(--text-secondary)]">No open tickets.</p>
            ) : null}
          </div>
        ) : null}

        {tab === "projects" && showProjects ? (
          <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)]">
            <table className="min-w-full text-left text-[13px]">
              <thead className="border-b border-[var(--border)] text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                <tr>
                  {showTicketNotes ? (
                    <th className="w-8 px-1 py-2 font-medium" aria-hidden />
                  ) : null}
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">% complete</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">Engineer</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">Target</th>
                </tr>
              </thead>
              <tbody>
                {(data?.projects ?? []).map((row) => {
                  const open = expandedProjectId === row.id;
                  const notes = projectNotesById[row.id] ?? [];
                  return (
                    <Fragment key={row.id}>
                      <tr
                        className={cn(
                          "border-b border-[var(--border)]",
                          showTicketNotes ? "cursor-pointer hover:bg-[var(--bg-primary)]/40" : "",
                        )}
                        onClick={() => {
                          if (showTicketNotes) void toggleProjectExpanded(row.id);
                        }}
                      >
                        {showTicketNotes ? (
                          <td className="px-1 py-2 align-middle">
                            <ChevronDown
                              className={cn(
                                "mx-auto size-4 shrink-0 text-[var(--text-muted)] transition-transform",
                                open ? "rotate-180" : "rotate-0",
                              )}
                              aria-hidden
                            />
                          </td>
                        ) : null}
                        <td className="max-w-[220px] truncate px-3 py-2">{row.name}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-[var(--text-secondary)]">{row.status}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-[var(--text-secondary)]">
                          {row.percentComplete != null ? `${row.percentComplete}%` : "—"}
                        </td>
                        <td className="hidden whitespace-nowrap px-3 py-2 text-[var(--text-secondary)] sm:table-cell">
                          {row.engineer}
                        </td>
                        <td className="hidden whitespace-nowrap px-3 py-2 text-[var(--text-secondary)] md:table-cell">
                          {row.targetDate
                            ? new Date(row.targetDate).toLocaleDateString(undefined, { dateStyle: "medium" })
                            : "—"}
                        </td>
                      </tr>
                      {showTicketNotes && open ? (
                        <tr key={`${row.id}-project-notes`} className="border-b border-[var(--border)] bg-[var(--bg-primary)]/30">
                          <td colSpan={showTicketNotes ? 6 : 5} className="px-3 py-3">
                            {projectNotesLoadingId === row.id ? (
                              <div className="flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
                                <Loader2 className="size-4 animate-spin" aria-hidden />
                                Loading notes…
                              </div>
                            ) : notes.length === 0 ? (
                              <p className="text-[12px] text-[var(--text-muted)]">No notes to show.</p>
                            ) : (
                              <ul className="space-y-3">
                                {notes.map((n, i) => (
                                  <li key={`${row.id}-pn-${i}`} className="text-[12px] leading-relaxed">
                                    <p className="font-medium text-[var(--text-secondary)]">
                                      {n.date
                                        ? new Date(n.date).toLocaleString(undefined, {
                                            dateStyle: "medium",
                                            timeStyle: "short",
                                          })
                                        : "—"}{" "}
                                      · {n.author}
                                    </p>
                                    <p className="mt-1 whitespace-pre-wrap text-[var(--text-primary)]">
                                      {cleanTicketNoteContent(n.content)}
                                    </p>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            {(data?.projects ?? []).length === 0 ? (
              <p className="p-4 text-[13px] text-[var(--text-secondary)]">No active projects.</p>
            ) : null}
          </div>
        ) : null}

        {tab === "reports" && showReports ? (
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-[13px] text-[var(--text-secondary)] md:p-6">
            {portalReportsErr ? <p className="text-red-400">{portalReportsErr}</p> : null}
            {!portalReportsErr && portalReports && portalReports.length === 0 ? (
              <p>No reports yet — your MSP will share reports here.</p>
            ) : null}
            {portalReports && portalReports.length > 0 ? (
              <ul className="space-y-3">
                {portalReports.map((r) => {
                  const open = expandedReportId === r.id;
                  return (
                    <li
                      key={r.id}
                      className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)]/40 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-[var(--text-primary)]">{r.title}</p>
                          <p className="text-[11px] text-[var(--text-muted)]">
                            {new Date(r.created_at).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="shrink-0 rounded-[var(--radius)] border border-[var(--border)] px-2.5 py-1 text-[12px] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                          onClick={() => setExpandedReportId(open ? null : r.id)}
                        >
                          {open ? "Hide" : "View"}
                        </button>
                      </div>
                      {open ? (
                        <pre className="mt-3 max-h-[min(60vh,28rem)] overflow-auto whitespace-pre-wrap rounded border border-[var(--border)] bg-[var(--bg-primary)] p-3 text-[11px] leading-relaxed text-[var(--text-primary)]">
                          {JSON.stringify(r.content, null, 2)}
                        </pre>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        ) : null}
      </main>

      {!hidePoweredBy ? (
        <footer className="border-t border-[var(--border)] py-4 text-center text-[11px] text-[var(--text-muted)]">
          Powered by Handover
        </footer>
      ) : (
        <footer className="h-2" />
      )}

      {ticketModalOpen && ticketModalRow && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setTicketModalOpen(false);
          }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative z-10 flex flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] shadow-2xl"
            style={{ width: "700px", maxWidth: "90vw", maxHeight: "85vh", overflow: "hidden" }}
          >
            <div className="flex shrink-0 items-start justify-between border-b border-[var(--border)] px-6 py-4">
              <div className="min-w-0 flex-1 pr-4">
                <h2 className="truncate text-[15px] font-semibold text-white">{ticketModalRow.summary}</h2>
                <div className="mt-2 flex flex-wrap gap-3 text-[12px] text-[var(--text-secondary)]">
                  <span>Status: <span className="text-white">{ticketModalRow.status}</span></span>
                  <span>Priority: <span className="text-white">{ticketModalRow.priority}</span></span>
                  {ticketModalRow.engineer ? (
                    <span>Engineer: <span className="text-white">{ticketModalRow.engineer}</span></span>
                  ) : null}
                  {ticketModalRow.lastUpdated ? (
                    <span>Updated: <span className="text-white">{new Date(ticketModalRow.lastUpdated).toLocaleDateString()}</span></span>
                  ) : null}
                </div>
                {selfServiceUrl ? (
                  <a
                    href={selfServiceUrl.replace(/\/$/, "")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-[var(--accent)] hover:underline"
                  >
                    <ExternalLink className="size-3" />
                    View self-service portal
                  </a>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setTicketModalOpen(false)}
                className="shrink-0 text-[var(--text-secondary)] transition-colors hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              {ticketNotesLoadingId === ticketModalRow.id ? (
                <div className="flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
                  <Loader2 className="size-4 animate-spin" />
                  Loading notes...
                </div>
              ) : (ticketNotesById[ticketModalRow.id] ?? []).length === 0 ? (
                <p className="text-[12px] text-[var(--text-muted)]">No notes to show.</p>
              ) : (
                <ul className="space-y-4">
                  {(ticketNotesById[ticketModalRow.id] ?? []).map((n, i) => (
                    <li key={i} className="border-b border-[var(--border)] pb-4 last:border-0 last:pb-0">
                      <p className="mb-1 text-[11px] font-medium text-[var(--text-secondary)]">
                        {n.date ? new Date(n.date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—"} · {n.author}
                      </p>
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--text-primary)]">
                        {cleanTicketNoteContent(n.content)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex shrink-0 justify-end border-t border-[var(--border)] px-6 py-3">
              <button
                type="button"
                onClick={() => setTicketModalOpen(false)}
                className="text-[13px] text-[var(--text-secondary)] transition-colors hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
