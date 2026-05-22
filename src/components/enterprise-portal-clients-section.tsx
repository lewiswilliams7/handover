"use client";

import {
  BarChart3,
  Building2,
  Check,
  LayoutDashboard,
  MoreHorizontal,
  Plus,
  Users,
  X,
} from "lucide-react";
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
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import useSWR from "swr";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/toasts";
import type { DeliveryHealthApiResponse, DeliveryHealthRag, DeliveryHealthRow } from "@/lib/delivery-health";
import {
  buildDeliveryHealthSwrKey,
  DELIVERY_HEALTH_SWR_OPTIONS,
  fetchDeliveryHealth,
} from "@/lib/delivery-health-swr";
import { usePSAConnections } from "@/hooks/use-psa-connections";
import { cn } from "@/lib/utils";
import { normalizePlanLabel } from "@/lib/utils/getPlan";

type PortalClientRow = {
  id: string;
  client_name: string;
  slug: string;
  enabled: boolean | null;
  user_count: number;
  psa_source?: string | null;
  logo_url?: string | null;
};

function normClient(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Match delivery-health `clientName` to portal client rows (case-insensitive). */
function matchPortalClientIdByName(
  clients: PortalClientRow[],
  deliveryClientName: string,
): string | null {
  const t = normClient(deliveryClientName);
  const row = clients.find((c) => normClient(c.client_name) === t);
  return row?.id ?? null;
}

function worstRagForRows(rows: DeliveryHealthRow[], clientName: string): DeliveryHealthRag | "off" {
  const t = normClient(clientName);
  const subset = rows.filter((r) => normClient(r.clientName) === t || normClient(r.clientName).includes(t));
  if (subset.length === 0) return "grey";
  const order: DeliveryHealthRag[] = ["red", "amber", "green", "grey"];
  let best = 3;
  for (const r of subset) {
    const i = order.indexOf(r.rag);
    if (i >= 0 && i < best) best = i;
  }
  return order[best] ?? "grey";
}

function clientInitials(name: string): string {
  const w = name.trim().split(/\s+/).filter(Boolean);
  if (w.length >= 2) return `${w[0]![0] ?? ""}${w[1]![0] ?? ""}`.toUpperCase();
  const s = name.trim();
  if (s.length >= 2) return s.slice(0, 2).toUpperCase();
  return (s[0] ?? "?").toUpperCase();
}

function ragDotClass(rag: DeliveryHealthRag | "off", enabled: boolean): string {
  if (!enabled || rag === "off") return "bg-slate-500";
  if (rag === "red") return "bg-red-500";
  if (rag === "amber") return "bg-amber-500";
  if (rag === "green") return "bg-emerald-500";
  return "bg-slate-400";
}

type PsaClient = { id: number | string; name: string };

/** Match `/api/halo/clients` response shapes: `{ clients }`, `{ result }`, `{ data }`, or a bare array. */
function extractClientsFromApiPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const o = payload as Record<string, unknown>;
    if (Array.isArray(o.clients)) return o.clients;
    if (Array.isArray(o.result)) return o.result;
    if (Array.isArray(o.data)) return o.data;
  }
  return [];
}

function mapPsaClientRow(row: unknown): PsaClient | null {
  if (!row || typeof row !== "object") return null;
  const c = row as Record<string, unknown>;
  const rawId = c.id ?? c.client_id ?? c.clientid ?? c.ClientID ?? c.ClientId;
  const idStr = rawId !== undefined && rawId !== null ? String(rawId).trim() : "";
  const name =
    (typeof c.name === "string" ? c.name : "") ||
    (typeof c.clientname === "string" ? c.clientname : "") ||
    (typeof c.client_name === "string" ? c.client_name : "") ||
    (typeof c.ClientName === "string" ? c.ClientName : "");
  const trimmed = name.trim();
  if (!idStr || !trimmed) return null;
  return { id: typeof rawId === "number" ? rawId : idStr, name: trimmed };
}

const HEX_COLOUR_6 = /^#?[0-9a-fA-F]{6}$/i;

function normalizeHexColour(raw: string): string | null {
  const t = raw.trim();
  if (!HEX_COLOUR_6.test(t)) return null;
  const hex = `#${t.replace(/^#/, "").toLowerCase()}`;
  return hex;
}

type TeamMemberRow = {
  id: string;
  user_id: string;
  role: string;
  display_name: string | null;
  email: string | null;
  last_sign_in_at: string | null;
  joined_at: string | null;
};

export function EnterprisePortalClientsSection(props: {
  enabled: boolean;
  portalSlug: string;
  companyDisplayName: string;
  /** Company name from profile (branding summary). */
  organisationCompanyName: string;
  brandLogoUrl: string;
  brandColour: string;
  whiteLabelMode: boolean;
  primaryPsa: "halopsa" | "connectwise" | null;
  /** Both Halo and CW connected — portal wizard can choose client list source. */
  bothConnected?: boolean;
  deliveryAccess: "none" | "read" | "full";
  profilePlan: string | null;
  demoModeActive?: boolean;
  onOpenConfiguration: (targetSection?: "branding" | "integrations") => void;
  onCloseMobileSidebar?: () => void;
  monthCount: number | null;
  totalGenerationCount: number | null;
  projects: Array<{ id: string; created_at: string }>;
  onNavigateToDelivery: () => void;
}) {
  const toast = useToast();
  const psaConnections = usePSAConnections();
  const [clients, setClients] = useState<PortalClientRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [scheduledEnabledCount, setScheduledEnabledCount] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [psaSearch, setPsaSearch] = useState("");
  const [psaResults, setPsaResults] = useState<PsaClient[]>([]);
  const [psaLoading, setPsaLoading] = useState(false);
  const [selectedPsa, setSelectedPsa] = useState<PsaClient | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualId, setManualId] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [slug, setSlug] = useState("");
  const [visT, setVisT] = useState(true);
  const [visP, setVisP] = useState(true);
  const [visR, setVisR] = useState(true);
  const [visRep, setVisRep] = useState(false);
  const [contacts, setContacts] = useState<Array<{ email: string; name: string }>>([{ email: "", name: "" }]);
  const [saving, setSaving] = useState(false);
  const [drawerClientId, setDrawerClientId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<"overview" | "contacts" | "settings">("overview");
  const [detail, setDetail] = useState<{
    client: Record<string, unknown>;
    users: Array<Record<string, unknown>>;
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [panelSection, setPanelSection] = useState<"overview" | "company" | "clients">("overview");
  const [clientFilter, setClientFilter] = useState("");
  const [openMenu, setOpenMenu] = useState<{ id: string; top: number; right: number } | null>(null);
  const [pendingPortalLogoFile, setPendingPortalLogoFile] = useState<File | null>(null);
  const prevCreateOpenRef = useRef(false);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamSolo, setTeamSolo] = useState<boolean | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMemberRow[]>([]);
  const [teamLoadError, setTeamLoadError] = useState<string | null>(null);
  const [wizardClientPullSource, setWizardClientPullSource] = useState<"halopsa" | "connectwise">(
    "halopsa",
  );

  const enterprise = normalizePlanLabel(props.profilePlan ?? "") === "enterprise";
  const bothConnected = Boolean(props.bothConnected);

  const filteredClients = useMemo(() => {
    const q = clientFilter.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.client_name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q),
    );
  }, [clients, clientFilter]);

  const filteredPsaResults = useMemo(() => {
    const q = psaSearch.trim().toLowerCase();
    if (!q) return psaResults;
    return psaResults.filter((c) => String(c.name ?? "").toLowerCase().includes(q));
  }, [psaResults, psaSearch]);

  const menuRow = useMemo(() => {
    if (!openMenu) return null;
    return clients.find((x) => x.id === openMenu.id) ?? null;
  }, [openMenu, clients]);

  const loadClients = useCallback(async () => {
    if (!props.enabled || !enterprise) return;
    setLoading(true);
    try {
      const res = await fetch("/api/portal/clients", { credentials: "same-origin", cache: "no-store" });
      const j = (await res.json().catch(() => ({}))) as { clients?: PortalClientRow[] };
      if (res.ok && Array.isArray(j.clients)) setClients(j.clients);
    } finally {
      setLoading(false);
    }
  }, [props.enabled, enterprise]);

  const orgHealthSwrKey = useMemo(() => {
    if (!props.enabled || props.deliveryAccess === "none" || !enterprise) {
      return null;
    }
    return buildDeliveryHealthSwrKey(
      props.demoModeActive === true,
      psaConnections.connectwise,
      psaConnections.primary,
    );
  }, [
    props.enabled,
    props.deliveryAccess,
    props.demoModeActive,
    enterprise,
    psaConnections.connectwise,
    psaConnections.primary,
  ]);

  const { data: orgHealthData, isLoading: orgHealthLoading } = useSWR<DeliveryHealthApiResponse>(
    orgHealthSwrKey,
    fetchDeliveryHealth,
    DELIVERY_HEALTH_SWR_OPTIONS,
  );

  const healthRows = useMemo(
    () => (Array.isArray(orgHealthData?.rows) ? orgHealthData.rows : []),
    [orgHealthData?.rows],
  );

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  useEffect(() => {
    if (panelSection !== "overview" || !enterprise || !props.enabled) return;
    let cancelled = false;
    void fetch("/api/scheduled-reports", { credentials: "same-origin", cache: "no-store" })
      .then(async (res) => {
        const j = (await res.json().catch(() => ({}))) as { schedules?: Array<{ enabled?: boolean }> };
        if (cancelled || !res.ok) return;
        const schedules = Array.isArray(j.schedules) ? j.schedules : [];
        setScheduledEnabledCount(schedules.filter((s) => s.enabled === true).length);
      })
      .catch(() => {
        if (!cancelled) setScheduledEnabledCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [panelSection, enterprise, props.enabled]);

  useEffect(() => {
    if (createOpen && !prevCreateOpenRef.current) {
      setPendingPortalLogoFile(null);
      setWizardClientPullSource("halopsa");
    }
    prevCreateOpenRef.current = createOpen;
  }, [createOpen]);

  useEffect(() => {
    if (panelSection !== "company" || !enterprise || !props.enabled) return;
    let cancelled = false;
    setTeamLoading(true);
    setTeamLoadError(null);
    void fetch("/api/team/members", { credentials: "same-origin", cache: "no-store" })
      .then(async (res) => {
        const j = (await res.json().catch(() => ({}))) as {
          solo?: boolean;
          members?: TeamMemberRow[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setTeamSolo(null);
          setTeamMembers([]);
          setTeamLoadError(typeof j.error === "string" ? j.error : "Could not load team.");
          return;
        }
        setTeamSolo(Boolean(j.solo));
        setTeamMembers(Array.isArray(j.members) ? j.members : []);
      })
      .catch(() => {
        if (!cancelled) {
          setTeamSolo(null);
          setTeamMembers([]);
          setTeamLoadError("Could not load team.");
        }
      })
      .finally(() => {
        if (!cancelled) setTeamLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [panelSection, enterprise, props.enabled]);

  useEffect(() => {
    if (!createOpen) {
      return;
    }
    const effectiveSource: "halopsa" | "connectwise" | null = bothConnected
      ? wizardClientPullSource
      : props.primaryPsa === "halopsa" || props.primaryPsa === "connectwise"
        ? props.primaryPsa
        : null;
    if (effectiveSource === null) {
      return;
    }
    let cancelled = false;
    void (async () => {
      setPsaLoading(true);
      try {
        const relativeUrl =
          effectiveSource === "halopsa"
            ? "/api/halo/clients?count=2500"
            : "/api/cw/clients";
        const fullUrl =
          typeof window !== "undefined" ? new URL(relativeUrl, window.location.origin).href : relativeUrl;
        const res = await fetch(relativeUrl, { credentials: "same-origin", cache: "no-store" });
        let payload: unknown = null;
        try {
          payload = await res.json();
        } catch {
          payload = null;
        }
        try {
          console.log(
            "[portal wizard] raw response:",
            JSON.stringify(payload ?? null).slice(0, 200),
          );
        } catch {
          console.log("[portal wizard] raw response:", "(unserializable)");
        }
        const clientList = extractClientsFromApiPayload(payload);
        console.log("[portal wizard] raw fetch result:", clientList.length);
        console.log("[EnterprisePortalClientsSection] PSA client fetch", {
          urlFull: fullUrl,
          primaryPsa: props.primaryPsa,
          bothConnected,
          wizardClientPullSource: bothConnected ? wizardClientPullSource : undefined,
          effectiveSource,
          demoMode: Boolean(props.demoModeActive),
          resultCount: clientList.length,
          status: res.status,
          ok: res.ok,
          response: payload,
        });
        if (!res.ok) {
          if (!cancelled) setPsaResults([]);
          return;
        }
        const mapped = clientList
          .map((row) => mapPsaClientRow(row))
          .filter((c): c is PsaClient => c != null);
        if (!cancelled) {
          setPsaResults(mapped);
          console.log("[portal wizard] clients loaded:", mapped.length);
        }
      } finally {
        if (!cancelled) setPsaLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    createOpen,
    props.primaryPsa,
    props.demoModeActive,
    bothConnected,
    wizardClientPullSource,
  ]);

  const openDrawer = async (
    id: string,
    initialTab: "overview" | "contacts" | "settings" = "overview",
  ) => {
    setDrawerClientId(id);
    setDrawerTab(initialTab);
    setDetailLoading(true);
    props.onCloseMobileSidebar?.();
    try {
      const res = await fetch(`/api/portal/clients/${encodeURIComponent(id)}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const j = (await res.json().catch(() => ({}))) as {
        client?: Record<string, unknown>;
        users?: Array<Record<string, unknown>>;
      };
      if (res.ok && j.client) setDetail({ client: j.client, users: j.users ?? [] });
      else setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDrawer = () => {
    setDrawerClientId(null);
    setDetail(null);
  };

  useEffect(() => {
    if (openMenu && !clients.some((x) => x.id === openMenu.id)) setOpenMenu(null);
  }, [openMenu, clients]);

  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      const menuEl = document.getElementById("portal-client-actions-menu");
      const triggerEl = document.getElementById(`portal-client-kebab-${openMenu.id}`);
      if (menuEl?.contains(t) || triggerEl?.contains(t)) return;
      setOpenMenu(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openMenu]);

  useEffect(() => {
    if (!openMenu) return;
    const onScrollOrResize = () => setOpenMenu(null);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [openMenu]);

  const suggestSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30);

  const onCreate = async () => {
    const src = bothConnected ? wizardClientPullSource : props.primaryPsa ?? "halopsa";
    const clientName = manualMode ? manualName.trim() : selectedPsa?.name.trim() ?? "";
    const clientId = manualMode ? manualId.trim() : String(selectedPsa?.id ?? "");
    if (!clientName || !clientId || !isValidClientSlug(slug)) {
      toast({ message: "Check client details and slug (3–30 chars, lowercase).", variant: "error" });
      return;
    }
    const validContacts = contacts.filter((c) => c.email.includes("@"));
    if (validContacts.length === 0) {
      toast({ message: "Add at least one contact email.", variant: "error" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/portal/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          client_name: clientName,
          client_id: clientId,
          slug,
          psa_source: src,
          visibility_tickets: visT,
          visibility_projects: visP,
          visibility_rag: visR,
          visibility_reports: visRep,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { client?: { id: string }; error?: string };
      if (!res.ok || !j.client?.id) {
        toast({ message: j.error ?? "Could not create portal.", variant: "error" });
        return;
      }
      const cid = j.client.id;
      for (const c of validContacts) {
        await fetch(`/api/portal/clients/${encodeURIComponent(cid)}/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ email: c.email.trim().toLowerCase(), display_name: c.name.trim() || null }),
        });
      }
      let logoUploadFailed = false;
      if (pendingPortalLogoFile) {
        const fd = new FormData();
        fd.set("logo", pendingPortalLogoFile);
        const logoRes = await fetch(`/api/portal/clients/${encodeURIComponent(cid)}/logo`, {
          method: "POST",
          credentials: "same-origin",
          body: fd,
        });
        logoUploadFailed = !logoRes.ok;
      }
      if (logoUploadFailed) {
        toast({
          message:
            "Portal created and invites sent, but the logo could not be uploaded. Add it from the client settings tab.",
          variant: "error",
          durationMs: 6500,
        });
      } else {
        toast({ message: "Portal created and invites sent", variant: "success" });
      }
      setCreateOpen(false);
      setStep(1);
      setSelectedPsa(null);
      setManualMode(false);
      setManualName("");
      setManualId("");
      setSlug("");
      setContacts([{ email: "", name: "" }]);
      setPendingPortalLogoFile(null);
      await loadClients();
    } finally {
      setSaving(false);
    }
  };

  const drawerClient = useMemo(() => clients.find((c) => c.id === drawerClientId), [clients, drawerClientId]);

  function toLocalYmd(d: Date): string {
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const overviewRows = orgHealthData?.rows ?? healthRows;

  const portfolioRagCounts = useMemo(() => {
    const c = { red: 0, amber: 0, green: 0, grey: 0 };
    for (const r of overviewRows) {
      if (r.rag === "red") c.red += 1;
      else if (r.rag === "amber") c.amber += 1;
      else if (r.rag === "green") c.green += 1;
      else c.grey += 1;
    }
    return c;
  }, [overviewRows]);

  const weekGenData = useMemo(() => {
    const keys: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      keys.push(toLocalYmd(d));
    }
    const counts: Record<string, number> = Object.fromEntries(keys.map((k) => [k, 0]));
    for (const p of props.projects) {
      const t = new Date(p.created_at);
      if (Number.isNaN(t.getTime())) continue;
      const k = toLocalYmd(t);
      if (k in counts) counts[k] = (counts[k] ?? 0) + 1;
    }
    return keys.map((k) => {
      const parts = k.split("-");
      const label =
        parts.length === 3 ? `${Number(parts[1]!)}-${Number(parts[2]!)}` : k;
      const d = new Date(`${k}T12:00:00`);
      const tooltipDate = Number.isNaN(d.getTime())
        ? k
        : d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
      return { date: k, count: counts[k] ?? 0, label, tooltipDate };
    });
  }, [props.projects]);

  const atRiskClientsList = useMemo(() => {
    const risky = overviewRows.filter((r) => r.rag === "red" || r.rag === "amber");
    type Agg = { rag: DeliveryHealthRag; ticketCount: number; riskSum: number };
    const m = new Map<string, Agg>();
    for (const r of risky) {
      const name = r.clientName.trim();
      if (!name) continue;
      const cur = m.get(name) ?? { rag: r.rag, ticketCount: 0, riskSum: 0 };
      if (r.rag === "red") cur.rag = "red";
      else if (cur.rag !== "red" && r.rag === "amber") cur.rag = "amber";
      if (r.kind === "ticket") cur.ticketCount += 1;
      cur.riskSum += r.openRisks;
      m.set(name, cur);
    }
    return [...m.entries()]
      .map(([clientName, v]) => ({ clientName, ...v }))
      .sort((a, b) => {
        if (a.rag === "red" && b.rag !== "red") return -1;
        if (b.rag === "red" && a.rag !== "red") return 1;
        return b.ticketCount - a.ticketCount;
      })
      .slice(0, 5);
  }, [overviewRows]);

  const enabledPortalCount = useMemo(
    () => clients.filter((c) => c.enabled !== false).length,
    [clients],
  );
  const portalsWithUsersCount = useMemo(
    () => clients.filter((c) => c.enabled !== false && c.user_count > 0).length,
    [clients],
  );

  const piePortfolioData = useMemo(
    () => [
      { name: "Red", value: portfolioRagCounts.red, fill: "#ef4444" },
      { name: "Amber", value: portfolioRagCounts.amber, fill: "#f59e0b" },
      { name: "Green", value: portfolioRagCounts.green, fill: "#22c55e" },
      { name: "Grey", value: portfolioRagCounts.grey, fill: "#64748b" },
    ],
    [portfolioRagCounts],
  );

  if (!enterprise || !props.enabled) return null;

  const companyNavLabel =
    props.companyDisplayName?.trim() || "Company";

  const portalBase = "gethandover.uk/portal";
  const brandHex = normalizeHexColour(props.brandColour);
  const companyNameLabel =
    props.organisationCompanyName?.trim() ||
    props.companyDisplayName?.trim() ||
    "—";

  return (
    <>
      <div className="flex w-full" style={{ minHeight: "calc(100vh - 52px)" }}>
        <div className="flex w-[220px] shrink-0 flex-col overflow-y-auto border-r border-[var(--border)] bg-[var(--bg-secondary)]">
          <div className="shrink-0 border-b border-[var(--border)] px-4 py-4">
            <h1 className="text-[15px] font-semibold text-[var(--text-primary)]">Organisation</h1>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">Client portals and company</p>
          </div>
          <nav className="flex-1 p-2">
            <button
              type="button"
              onClick={() => setPanelSection("overview")}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-[var(--radius)] px-3 py-2 text-left text-[13px] transition-colors",
                panelSection === "overview"
                  ? "bg-[var(--accent)]/15 font-medium text-[var(--accent)]"
                  : "text-[var(--text-secondary)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]",
              )}
            >
              <LayoutDashboard className="size-[14px] shrink-0" aria-hidden />
              <span className="flex-1 truncate">Overview</span>
            </button>
            <button
              type="button"
              onClick={() => setPanelSection("company")}
              className={cn(
                "mt-0.5 flex w-full items-center gap-2.5 rounded-[var(--radius)] px-3 py-2 text-left text-[13px] transition-colors",
                panelSection === "company"
                  ? "bg-[var(--accent)]/15 font-medium text-[var(--accent)]"
                  : "text-[var(--text-secondary)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]",
              )}
            >
              <Building2 className="size-[14px] shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{companyNavLabel}</span>
            </button>
            <button
              type="button"
              onClick={() => setPanelSection("clients")}
              className={cn(
                "mt-0.5 flex w-full items-center gap-2.5 rounded-[var(--radius)] px-3 py-2 text-left text-[13px] transition-colors",
                panelSection === "clients"
                  ? "bg-[var(--accent)]/15 font-medium text-[var(--accent)]"
                  : "text-[var(--text-secondary)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]",
              )}
            >
              <Users className="size-[14px] shrink-0" aria-hidden />
              <span className="flex-1 truncate">Clients</span>
            </button>
          </nav>
        </div>

        <div className="min-w-0 flex-1 overflow-y-auto bg-[var(--bg-secondary)]">
          <div
            className={cn(
              "mx-auto px-6 py-8",
              panelSection === "overview" ? "max-w-6xl" : "max-w-3xl",
            )}
          >
            {panelSection === "company" ? (
              <div className="space-y-6">
                <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-5">
                  <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Branding</h2>
                  <dl className="mt-4 space-y-4 text-[13px]">
                    <div>
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                        Company name
                      </dt>
                      <dd className="mt-1 text-[14px] font-medium text-[var(--text-primary)]">{companyNameLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                        Brand logo
                      </dt>
                      <dd className="mt-1 flex items-center gap-3">
                        {props.brandLogoUrl.trim() ? (
                          <img
                            src={props.brandLogoUrl.trim()}
                            alt=""
                            className="h-10 w-auto max-w-[160px] rounded-[var(--radius)] object-contain"
                          />
                        ) : (
                          <span className="text-[var(--text-secondary)]">No logo uploaded</span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                        Brand colour
                      </dt>
                      <dd className="mt-1 flex items-center gap-2">
                        {brandHex ? (
                          <>
                            <span
                              className="size-6 shrink-0 rounded-full border border-[var(--border)] shadow-inner"
                              style={{ backgroundColor: brandHex }}
                              aria-hidden
                            />
                            <span className="font-mono text-[12px] text-[var(--text-secondary)]">{brandHex}</span>
                          </>
                        ) : (
                          <span className="text-[var(--text-secondary)]">Not set</span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                        White label mode
                      </dt>
                      <dd className="mt-1">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                            props.whiteLabelMode
                              ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                              : "bg-[var(--bg-secondary)] text-[var(--text-muted)] ring-1 ring-[var(--border)]",
                          )}
                        >
                          {props.whiteLabelMode ? "Enabled" : "Disabled"}
                        </span>
                      </dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    className="mt-5 text-left text-[13px] font-medium text-[var(--accent)] transition-colors hover:underline"
                    onClick={() => {
                      props.onOpenConfiguration("branding");
                      props.onCloseMobileSidebar?.();
                    }}
                  >
                    Manage branding in Configuration →
                  </button>
                </div>

                <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-5">
                  <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Team members</h2>
                  {teamLoadError && !teamLoading ? (
                    <p className="mt-3 text-[13px] text-red-400">{teamLoadError}</p>
                  ) : null}
                  {teamLoading ? (
                    <div className="mt-4 space-y-3">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-12 animate-pulse rounded-[var(--radius)] bg-[var(--bg-secondary)]"
                        />
                      ))}
                    </div>
                  ) : !teamLoadError && teamSolo ? (
                    <div className="mt-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-4">
                      <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
                        You&apos;re on a solo plan. Upgrade to Team to add members.
                      </p>
                      <Link
                        href="/pricing"
                        className="mt-3 inline-flex text-[13px] font-medium text-[var(--accent)] hover:underline"
                      >
                        View pricing
                      </Link>
                    </div>
                  ) : !teamLoadError && teamSolo === false ? (
                    teamMembers.length === 0 ? (
                      <p className="mt-3 text-[13px] text-[var(--text-secondary)]">No team members found.</p>
                    ) : (
                      <ul className="mt-4 space-y-2">
                        {teamMembers.map((m) => {
                          const label = m.display_name?.trim() || m.email || m.user_id;
                          const sub = m.display_name?.trim() && m.email ? m.email : null;
                          const roleNorm = typeof m.role === "string" ? m.role.toLowerCase() : "member";
                          const roleLabel =
                            roleNorm === "owner" ? "Owner" : roleNorm === "admin" ? "Admin" : "Member";
                          let lastIn = "—";
                          if (m.last_sign_in_at) {
                            const d = new Date(m.last_sign_in_at);
                            if (!Number.isNaN(d.getTime())) {
                              lastIn = d.toLocaleString(undefined, {
                                dateStyle: "medium",
                                timeStyle: "short",
                              });
                            }
                          }
                          return (
                            <li key={m.id}>
                              <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2.5">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-primary)] text-[11px] font-semibold text-[var(--text-primary)] ring-1 ring-[var(--border)]">
                                  {clientInitials(label)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-[13px] font-medium text-[var(--text-primary)]">
                                    {label}
                                  </div>
                                  {sub ? (
                                    <div className="truncate text-[12px] text-[var(--text-muted)]">{sub}</div>
                                  ) : null}
                                  <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                                    Last signed in: {lastIn}
                                  </div>
                                </div>
                                <span className="shrink-0 rounded-full bg-[var(--bg-primary)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] ring-1 ring-[var(--border)]">
                                  {roleLabel}
                                </span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )
                  ) : null}
                </div>
              </div>
            ) : panelSection === "overview" ? (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold text-[var(--text-primary)]">Analytics</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
                    <p className="text-[13px] text-[var(--text-secondary)]">Total clients</p>
                    <p className="mt-2 text-3xl font-bold text-white">{enabledPortalCount}</p>
                  </div>
                  <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
                    <p className="text-[13px] text-[var(--text-secondary)]">Generations this month</p>
                    <p className="mt-2 text-3xl font-bold text-white">
                      {props.monthCount !== null ? props.monthCount : "—"}
                    </p>
                    {props.totalGenerationCount !== null ? (
                      <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                        {props.totalGenerationCount} all-time
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
                    <p className="text-[13px] text-[var(--text-secondary)]">Active scheduled reports</p>
                    <p className="mt-2 text-3xl font-bold text-white">
                      {scheduledEnabledCount !== null ? scheduledEnabledCount : "—"}
                    </p>
                  </div>
                  <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
                    <p className="text-[13px] text-[var(--text-secondary)]">Open tickets</p>
                    <p className="mt-2 text-3xl font-bold text-white">
                      {props.deliveryAccess !== "none" && orgHealthData?.stats?.tickets?.activeCount != null
                        ? orgHealthData.stats.tickets.activeCount
                        : "—"}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
                    <p className="mb-1 text-center text-[13px] font-medium text-[var(--text-secondary)]">
                      Portfolio health
                    </p>
                    {props.deliveryAccess !== "none" && orgHealthLoading ? (
                      <div className="mx-auto mt-4 h-52 max-w-[280px] animate-pulse rounded-full bg-[var(--bg-primary)]" />
                    ) : props.deliveryAccess === "none" ? (
                      <p className="mt-6 text-center text-[13px] text-[var(--text-muted)]">
                        Connect delivery health to see portfolio RAG.
                      </p>
                    ) : (
                      <>
                        <div className="relative mx-auto h-56 w-full max-w-[280px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={piePortfolioData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={58}
                                outerRadius={82}
                                paddingAngle={2}
                              >
                                {piePortfolioData.map((entry) => (
                                  <Cell key={entry.name} fill={entry.fill} />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(v: number, n: string) => [`${v}`, n]}
                                contentStyle={{
                                  background: "var(--bg-primary)",
                                  border: "1px solid var(--border)",
                                  borderRadius: 8,
                                  fontSize: 12,
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-2">
                            <span className="text-center text-[11px] font-medium text-[var(--text-muted)]">
                              Portfolio
                              <br />
                              health
                            </span>
                          </div>
                        </div>
                        <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[12px] text-[var(--text-secondary)]">
                          {piePortfolioData.map((s) => (
                            <li key={s.name} className="inline-flex items-center gap-1.5">
                              <span className="size-2 rounded-full" style={{ backgroundColor: s.fill }} />
                              {s.name}: <span className="tabular-nums text-white">{s.value}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                  <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
                    <p className="mb-3 text-[13px] font-medium text-[var(--text-secondary)]">
                      Generations this week
                    </p>
                    {props.projects.length === 0 ? (
                      <p className="py-10 text-center text-[13px] text-[var(--text-muted)]">
                        No generation history yet
                      </p>
                    ) : (
                      <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={weekGenData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                            <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                            <YAxis allowDecimals={false} tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                            <Tooltip
                              cursor={{ fill: "rgba(255,255,255,0.04)" }}
                              content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const p = payload[0]?.payload as {
                                  tooltipDate?: string;
                                  count?: number;
                                };
                                return (
                                  <div
                                    className="rounded-lg border border-[var(--border)] px-2 py-1.5 text-[11px]"
                                    style={{ background: "var(--bg-primary)" }}
                                  >
                                    <div className="text-[var(--text-muted)]">{p?.tooltipDate}</div>
                                    <div className="font-medium text-white">Generations: {p?.count ?? 0}</div>
                                  </div>
                                );
                              }}
                            />
                            <Bar dataKey="count" name="Generations" radius={[4, 4, 0, 0]}>
                              {weekGenData.map((_, i) => (
                                <Cell key={i} fill="var(--accent)" />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
                  <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">Clients needing attention</h3>
                  {props.deliveryAccess !== "none" && orgHealthLoading ? (
                    <div className="mt-4 space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-10 animate-pulse rounded-[var(--radius)] bg-[var(--bg-primary)]" />
                      ))}
                    </div>
                  ) : props.deliveryAccess === "none" ? (
                    <p className="mt-3 text-[13px] text-[var(--text-muted)]">Delivery health is not available.</p>
                  ) : atRiskClientsList.length === 0 ? (
                    <div className="mt-4 flex items-center gap-2 text-[13px] text-emerald-400">
                      <Check className="size-4 shrink-0" aria-hidden />
                      <span>All clients are on track</span>
                    </div>
                  ) : (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[420px] text-left text-[13px]">
                        <thead className="border-b border-[var(--border)] text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                          <tr>
                            <th className="py-2 pr-2 font-medium">Client</th>
                            <th className="py-2 pr-2 font-medium">RAG</th>
                            <th className="py-2 pr-2 font-medium">Open tickets</th>
                            <th className="py-2 pr-2 font-medium">Open risks</th>
                            <th className="py-2 text-right font-medium"> </th>
                          </tr>
                        </thead>
                        <tbody>
                          {atRiskClientsList.map((row) => (
                            <tr key={row.clientName} className="border-b border-[var(--border)] last:border-0">
                              <td className="py-2.5 pr-2 font-medium text-white">{row.clientName}</td>
                              <td className="py-2.5 pr-2">
                                <span
                                  className={cn(
                                    "inline-block size-2.5 rounded-full",
                                    row.rag === "red" ? "bg-red-500" : "bg-amber-500",
                                  )}
                                />
                              </td>
                              <td className="py-2.5 pr-2 tabular-nums text-[var(--text-secondary)]">
                                {row.ticketCount}
                              </td>
                              <td className="py-2.5 pr-2 tabular-nums text-[var(--text-secondary)]">
                                {row.riskSum}
                              </td>
                              <td className="py-2.5 text-right">
                                <button
                                  type="button"
                                  className="text-[12px] font-medium text-[var(--accent)] hover:underline"
                                  onClick={() => {
                                    const id = matchPortalClientIdByName(clients, row.clientName);
                                    if (id) {
                                      void openDrawer(id, "overview");
                                    } else {
                                      props.onNavigateToDelivery();
                                    }
                                    props.onCloseMobileSidebar?.();
                                  }}
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
                  <div className="flex flex-wrap items-center gap-2 text-[13px] text-[var(--text-secondary)]">
                    <BarChart3 className="size-4 text-[var(--accent)]" aria-hidden />
                    <span>
                      <span className="font-semibold text-white">{portalsWithUsersCount}</span> of{" "}
                      <span className="font-semibold text-white">{enabledPortalCount}</span> clients have active
                      portals
                    </span>
                  </div>
                </div>
              </div>
            ) : !props.portalSlug?.trim() ? (
              <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-6 text-center">
                <p className="text-[14px] font-medium text-[var(--text-primary)]">Set up your portal URL first</p>
                <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
                  Save your MSP portal slug in Configuration before adding client portals.
                </p>
                <Button
                  type="button"
                  className="mt-4 bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                  onClick={() => {
                    props.onOpenConfiguration();
                    props.onCloseMobileSidebar?.();
                  }}
                >
                  Open Configuration
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">Clients</h2>
                    <span className="rounded-full bg-[var(--bg-primary)] px-2 py-0.5 text-[12px] font-medium tabular-nums text-[var(--text-secondary)] ring-1 ring-[var(--border)]">
                      {clients.length}
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="shrink-0 gap-1 bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                    onClick={() => {
                      setCreateOpen(true);
                      setStep(1);
                    }}
                  >
                    <Plus className="size-4" aria-hidden />
                    Add client
                  </Button>
                </div>
                <div className="mb-4">
                  <Input
                    placeholder="Filter by client name…"
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                    className="max-w-md bg-[var(--bg-primary)]"
                  />
                </div>
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-[72px] animate-pulse rounded-[var(--radius-lg)] bg-[var(--bg-primary)] ring-1 ring-[var(--border)]"
                      />
                    ))}
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] px-6 py-14 text-center">
                    <Building2 className="mb-3 size-10 text-[var(--accent)] opacity-80" aria-hidden />
                    <p className="text-[15px] font-semibold text-[var(--text-primary)]">No client portals yet</p>
                    <Button
                      type="button"
                      className="mt-4 gap-1 bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                      onClick={() => {
                        setCreateOpen(true);
                        setStep(1);
                      }}
                    >
                      <Plus className="size-4" aria-hidden />
                      Add your first client
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)]">
                    <div className="grid grid-cols-[1.6fr_1.5fr_0.7fr_0.9fr_0.9fr_0.6fr_56px] items-center border-b border-[var(--border)] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                      <span>Client name</span>
                      <span>Portal URL</span>
                      <span>PSA</span>
                      <span>Contacts</span>
                      <span>Status</span>
                      <span>RAG</span>
                      <span className="text-right">Actions</span>
                    </div>
                    <ul>
                      {filteredClients.map((c) => {
                        const rag = c.enabled === false ? "off" : worstRagForRows(healthRows, c.client_name);
                        const psaLabel =
                          String(c.psa_source ?? "").toLowerCase() === "connectwise" ? "CW" : "Halo";
                        return (
                          <li key={c.id}>
                            <div
                              className="group relative grid cursor-pointer grid-cols-[1.6fr_1.5fr_0.7fr_0.9fr_0.9fr_0.6fr_56px] items-center border-b border-[var(--border)] px-3 py-2 transition-colors hover:bg-white/[0.02]"
                              onClick={() => void openDrawer(c.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  void openDrawer(c.id);
                                }
                              }}
                              role="button"
                              tabIndex={0}
                            >
                              <p className="truncate text-[13px] font-medium text-white">{c.client_name}</p>
                              <p className="truncate text-[12px] text-[#94a3b8]">/{props.portalSlug}/{c.slug}</p>
                              <span className="inline-flex w-fit rounded-full bg-[var(--bg-secondary)] px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)] ring-1 ring-[var(--border)]">
                                {psaLabel}
                              </span>
                              <span className="text-[12px] text-[#94a3b8]">{c.user_count} contacts</span>
                              <span
                                className={cn(
                                  "inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-medium ring-1",
                                  c.enabled === false
                                    ? "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30"
                                    : "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
                                )}
                              >
                                {c.enabled === false ? "Disabled" : "Active"}
                              </span>
                              <span
                                className={cn("size-2.5 shrink-0 rounded-full", ragDotClass(rag, c.enabled !== false))}
                                title="RAG"
                              />
                              <div id={`portal-client-kebab-${c.id}`} className="relative z-10 ml-auto flex justify-end">
                                <button
                                  type="button"
                                  className={cn(
                                    "rounded-[var(--radius)] p-1.5 text-[var(--text-muted)] opacity-0 transition-opacity hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] group-hover:opacity-100 focus:opacity-100",
                                    openMenu?.id === c.id && "opacity-100",
                                  )}
                                  aria-label="Client actions"
                                  aria-expanded={openMenu?.id === c.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (openMenu?.id === c.id) {
                                      setOpenMenu(null);
                                      return;
                                    }
                                    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                                    setOpenMenu({
                                      id: c.id,
                                      top: rect.bottom + 6,
                                      right: window.innerWidth - rect.right,
                                    });
                                  }}
                                >
                                  <MoreHorizontal className="size-4" />
                                </button>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          className="!max-w-5xl w-[90vw] max-h-[90vh] overflow-y-auto border-[var(--border)] bg-[var(--bg-primary)] p-6 text-[var(--text-primary)]"
          style={{ maxWidth: "64rem" }}
        >
          <DialogHeader>
            <DialogTitle>Create client portal</DialogTitle>
          </DialogHeader>
          {step === 1 ? (
            <div className="space-y-3 text-[13px]">
              {props.demoModeActive ? (
                <p className="rounded-[var(--radius)] border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-200">
                  Turn off demo mode to see real PSA clients.
                </p>
              ) : null}
              {bothConnected && !props.demoModeActive ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] text-[var(--text-secondary)]">Pull clients from:</span>
                  <div className="inline-flex gap-1">
                    <button
                      type="button"
                      onClick={() => setWizardClientPullSource("halopsa")}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                        wizardClientPullSource === "halopsa"
                          ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--text-primary)]"
                          : "border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:bg-[var(--bg-primary)]",
                      )}
                    >
                      HaloPSA
                    </button>
                    <button
                      type="button"
                      onClick={() => setWizardClientPullSource("connectwise")}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                        wizardClientPullSource === "connectwise"
                          ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--text-primary)]"
                          : "border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:bg-[var(--bg-primary)]",
                      )}
                    >
                      ConnectWise
                    </button>
                  </div>
                </div>
              ) : null}
              <Input
                placeholder="Search PSA clients…"
                value={psaSearch}
                onChange={(e) => setPsaSearch(e.target.value)}
                disabled={Boolean(props.demoModeActive)}
                className="bg-[var(--bg-secondary)]"
              />
              <button
                type="button"
                className="text-[12px] text-[var(--accent)] hover:underline"
                onClick={() => {
                  setManualMode(true);
                  setSelectedPsa(null);
                }}
              >
                Can&apos;t find client? Enter manually
              </button>
              {manualMode ? (
                <div className="space-y-2 rounded-[var(--radius)] border border-[var(--border)] p-3">
                  <Input
                    placeholder="Client name"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="bg-[var(--bg-secondary)]"
                  />
                  <Input
                    placeholder={
                      (bothConnected ? wizardClientPullSource : props.primaryPsa) === "connectwise"
                        ? "Company ID"
                        : "Client ID"
                    }
                    value={manualId}
                    onChange={(e) => setManualId(e.target.value)}
                    className="bg-[var(--bg-secondary)]"
                  />
                </div>
              ) : (
                <div className="max-h-96 space-y-1 overflow-y-auto rounded-[var(--radius)] border border-[var(--border)] p-2">
                  {psaLoading ? (
                    <p className="text-[12px] text-[var(--text-muted)]">Loading…</p>
                  ) : (
                    filteredPsaResults.map((c) => (
                      <button
                        key={`${c.id}`}
                        type="button"
                        className={cn(
                          "flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[12px] hover:bg-[var(--bg-secondary)]",
                          selectedPsa?.id === c.id ? "bg-[var(--bg-secondary)]" : "",
                        )}
                        onClick={() => {
                          setSelectedPsa(c);
                          setSlug(suggestSlug(c.name));
                        }}
                      >
                        <span className="truncate">{c.name}</span>
                        <span className="ml-2 shrink-0 text-[11px] text-[var(--text-muted)]">{c.id}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : null}
          {step === 2 ? (
            <div className="space-y-3 text-[13px]">
              <div>
                <label className="text-[12px] text-[var(--text-secondary)]">
                  Logo <span className="font-normal text-[var(--text-muted)]">(optional)</span>
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="mt-1 block w-full cursor-pointer text-[12px] text-[var(--text-secondary)] file:mr-3 file:rounded-[var(--radius)] file:border file:border-[var(--border)] file:bg-[var(--bg-secondary)] file:px-3 file:py-1.5 file:text-[12px] file:text-[var(--text-primary)]"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setPendingPortalLogoFile(f ?? null);
                  }}
                />
                <p className="mt-1 text-[11px] leading-snug text-[var(--text-muted)]">
                  {pendingPortalLogoFile
                    ? `Selected: ${pendingPortalLogoFile.name} — uploads when you create the portal.`
                    : "You can add or change the logo later from the client portal settings."}
                </p>
              </div>
              <div>
                <label className="text-[12px] text-[var(--text-secondary)]">Portal slug</label>
                <div className="mt-1 flex items-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] px-2">
                  <span className="shrink-0 text-[11px] text-[var(--text-muted)]">…/portal/{props.portalSlug}/</span>
                  <Input
                    value={slug}
                    onChange={(e) =>
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, "")
                          .slice(0, 30),
                      )
                    }
                    className="border-0 bg-transparent"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <RowToggle label="Tickets" checked={visT} onCheckedChange={setVisT} />
                <RowToggle label="Projects" checked={visP} onCheckedChange={setVisP} />
                <RowToggle label="RAG overview" checked={visR} onCheckedChange={setVisR} />
                <RowToggle label="Reports" checked={visRep} onCheckedChange={setVisRep} />
              </div>
            </div>
          ) : null}
          {step === 3 ? (
            <div className="space-y-2 text-[13px]">
              {contacts.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder="Email"
                    value={c.email}
                    onChange={(e) => {
                      const next = [...contacts];
                      next[i] = { ...next[i], email: e.target.value };
                      setContacts(next);
                    }}
                    className="bg-[var(--bg-secondary)]"
                  />
                  <Input
                    placeholder="Name"
                    value={c.name}
                    onChange={(e) => {
                      const next = [...contacts];
                      next[i] = { ...next[i], name: e.target.value };
                      setContacts(next);
                    }}
                    className="bg-[var(--bg-secondary)]"
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setContacts([...contacts, { email: "", name: "" }])}
              >
                Add contact
              </Button>
            </div>
          ) : null}
          {step === 4 ? (
            <div className="space-y-2 text-[13px] text-[var(--text-secondary)]">
              <p>
                <strong className="text-[var(--text-primary)]">Client:</strong>{" "}
                {manualMode ? manualName : selectedPsa?.name}
              </p>
              <p>
                <strong className="text-[var(--text-primary)]">Slug:</strong> {slug}
              </p>
              <p>
                <strong className="text-[var(--text-primary)]">Contacts:</strong>{" "}
                {contacts.filter((c) => c.email.includes("@")).length}
              </p>
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:justify-between">
            {step > 1 ? (
              <Button type="button" variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))}>
                Back
              </Button>
            ) : (
              <span />
            )}
            {step < 4 ? (
              <Button
                type="button"
                onClick={() => {
                  if (step === 1 && !manualMode && !selectedPsa) {
                    toast({ message: "Select a PSA client or use manual entry.", variant: "error" });
                    return;
                  }
                  if (step === 1 && manualMode && (!manualName.trim() || !manualId.trim())) {
                    toast({ message: "Enter client name and ID.", variant: "error" });
                    return;
                  }
                  if (step === 1) {
                    const baseName = manualMode ? manualName : (selectedPsa?.name ?? "");
                    const auto = suggestSlug(baseName);
                    if (!slug.trim() && auto) setSlug(auto);
                    const effective = slug.trim() || auto;
                    if (!isValidClientSlug(effective)) {
                      toast({ message: "Set a valid portal slug (3–30 lowercase letters, numbers, hyphens).", variant: "error" });
                      return;
                    }
                    if (effective !== slug) setSlug(effective);
                  }
                  setStep((s) => s + 1);
                }}
              >
                Next
              </Button>
            ) : (
              <Button type="button" disabled={saving} onClick={() => void onCreate()}>
                {saving ? "Creating…" : "Create portal and send invites"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {drawerClientId ? (
        <div
          className="fixed inset-0 z-50 flex cursor-default justify-end bg-black/50"
          role="presentation"
          onClick={closeDrawer}
        >
          <div
            className="flex h-full w-full max-w-md cursor-auto flex-col border-l border-[var(--border)] bg-[var(--bg-primary)] shadow-xl"
            role="dialog"
            aria-modal
            aria-labelledby="portal-client-drawer-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative shrink-0 border-b border-[var(--border)] px-4 py-3 pr-14">
              <h2 id="portal-client-drawer-title" className="truncate pr-2 text-[15px] font-semibold">
                {drawerClient?.client_name ?? "Client"}
              </h2>
              <button
                type="button"
                className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-[var(--radius)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                onClick={closeDrawer}
                aria-label="Close drawer"
              >
                <X className="size-5 shrink-0" aria-hidden />
              </button>
            </div>
            <div className="border-b border-[var(--border)] px-2 py-2">
              <div className="flex gap-1">
                {(["overview", "contacts", "settings"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={cn(
                      "rounded-[var(--radius)] px-3 py-1.5 text-[12px] capitalize",
                      drawerTab === t ? "bg-[var(--bg-secondary)] text-white" : "text-[var(--text-secondary)]",
                    )}
                    onClick={() => setDrawerTab(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 text-[13px]">
              {detailLoading ? (
                <p className="text-[var(--text-muted)]">Loading…</p>
              ) : detail ? (
                <>
                  {drawerTab === "overview" ? (
                    <div className="space-y-3">
                      <p className="text-[var(--text-secondary)]">
                        Portal URL:{" "}
                        <span className="break-all text-[var(--text-primary)]">
                          {typeof window !== "undefined"
                            ? `${window.location.origin}/portal/${props.portalSlug}/${String(detail.client.slug ?? "")}`
                            : ""}
                        </span>
                      </p>
                      <a
                        href={
                          typeof window !== "undefined"
                            ? `${window.location.origin}/portal/${props.portalSlug}/${String(detail.client.slug ?? "")}`
                            : "#"
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex text-[var(--accent)] hover:underline"
                      >
                        View portal →
                      </a>
                    </div>
                  ) : null}
                  {drawerTab === "contacts" ? (
                    <div className="space-y-3">
                      {(detail.users ?? []).map((u) => (
                        <div
                          key={String(u.id)}
                          className="rounded-[var(--radius)] border border-[var(--border)] p-3"
                        >
                          <p className="font-medium">{String(u.display_name ?? u.email ?? "")}</p>
                          <p className="text-[12px] text-[var(--text-muted)]">{String(u.email ?? "")}</p>
                          <p className="text-[11px] text-[var(--text-muted)]">
                            {u.invite_accepted_at ? "Accepted" : "Pending invite"}
                          </p>
                          <div className="mt-2 flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                void fetch(
                                  `/api/portal/clients/${encodeURIComponent(drawerClientId!)}/users/${encodeURIComponent(String(u.id))}/resend-invite`,
                                  { method: "POST", credentials: "same-origin" },
                                ).then(() => toast({ message: "Invite resent", variant: "success" }))
                              }
                            >
                              Resend
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                void fetch(
                                  `/api/portal/clients/${encodeURIComponent(drawerClientId!)}/users/${encodeURIComponent(String(u.id))}`,
                                  { method: "DELETE", credentials: "same-origin" },
                                ).then(async () => {
                                  toast({ message: "User removed", variant: "success" });
                                  await openDrawer(drawerClientId!, "contacts");
                                })
                              }
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const email = window.prompt("Email");
                          if (!email?.trim()) return;
                          void fetch(`/api/portal/clients/${encodeURIComponent(drawerClientId!)}/users`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials: "same-origin",
                            body: JSON.stringify({ email: email.trim().toLowerCase() }),
                          }).then(async (res) => {
                            if (res.ok) {
                              toast({ message: "Invite sent", variant: "success" });
                              await openDrawer(drawerClientId!, "contacts");
                            } else toast({ message: "Could not add contact", variant: "error" });
                          });
                        }}
                      >
                        + Add contact
                      </Button>
                    </div>
                  ) : null}
                  {drawerTab === "settings" ? (
                    <PortalClientSettingsPanel
                      clientId={drawerClientId}
                      detail={detail}
                      onSaved={async () => {
                        await loadClients();
                        await openDrawer(drawerClientId!, "settings");
                      }}
                    />
                  ) : null}
                </>
              ) : (
                <p className="text-[var(--text-muted)]">Could not load client.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {openMenu && menuRow && typeof document !== "undefined"
        ? createPortal(
            <div
              id="portal-client-actions-menu"
              className="fixed z-[200] min-w-[10rem] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] py-1 text-[12px] shadow-lg"
              style={{ top: openMenu.top, right: openMenu.right }}
              role="presentation"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <ul className="m-0 list-none p-0" role="menu">
                <li>
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full px-3 py-2 text-left text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenu(null);
                      window.open(
                        `https://${portalBase}/${props.portalSlug}/${encodeURIComponent(menuRow.slug)}`,
                        "_blank",
                        "noopener,noreferrer",
                      );
                    }}
                  >
                    View portal
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full px-3 py-2 text-left text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenu(null);
                      void openDrawer(menuRow.id, "settings");
                    }}
                  >
                    Edit
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full px-3 py-2 text-left text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                    onClick={async (e) => {
                      e.stopPropagation();
                      setOpenMenu(null);
                      const next = menuRow.enabled !== true;
                      const res = await fetch(`/api/portal/clients/${encodeURIComponent(menuRow.id)}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        credentials: "same-origin",
                        body: JSON.stringify({ enabled: next }),
                      });
                      if (res.ok) {
                        toast({
                          message: next ? "Portal enabled" : "Portal disabled",
                          variant: "success",
                        });
                        await loadClients();
                      } else toast({ message: "Could not update", variant: "error" });
                    }}
                  >
                    {menuRow.enabled === false ? "Enable" : "Disable"}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full px-3 py-2 text-left text-red-400 hover:bg-[var(--bg-secondary)]"
                    onClick={async (e) => {
                      e.stopPropagation();
                      setOpenMenu(null);
                      if (!window.confirm("Delete this client portal? This cannot be undone.")) return;
                      const res = await fetch(`/api/portal/clients/${encodeURIComponent(menuRow.id)}`, {
                        method: "DELETE",
                        credentials: "same-origin",
                      });
                      if (res.ok) {
                        toast({ message: "Portal deleted", variant: "success" });
                        if (drawerClientId === menuRow.id) closeDrawer();
                        await loadClients();
                      } else toast({ message: "Delete failed", variant: "error" });
                    }}
                  >
                    Delete
                  </button>
                </li>
              </ul>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function RowToggle({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] text-[var(--text-secondary)]">{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function isValidClientSlug(s: string): boolean {
  return /^[a-z0-9-]{3,30}$/.test(s);
}

function PortalClientSettingsPanel({
  clientId,
  detail,
  onSaved,
}: {
  clientId: string;
  detail: { client: Record<string, unknown> };
  onSaved: () => Promise<void>;
}) {
  const toast = useToast();
  const c = detail.client;
  const [enabled, setEnabled] = useState(c.enabled === true);
  const [vt, setVt] = useState(c.visibility_tickets !== false);
  const [vp, setVp] = useState(c.visibility_projects !== false);
  const [vr, setVr] = useState(c.visibility_rag !== false);
  const [vrep, setVrep] = useState(c.visibility_reports === true);
  const [vnotes, setVnotes] = useState(
    (c as { visibility_ticket_notes?: boolean | null }).visibility_ticket_notes !== false,
  );
  const [visPriorityBreakdown, setVisPriorityBreakdown] = useState(
    (c as { visibility_priority_breakdown?: boolean | null }).visibility_priority_breakdown !== false,
  );
  const [visResolvedCount, setVisResolvedCount] = useState(
    (c as { visibility_resolved_count?: boolean | null }).visibility_resolved_count === true,
  );
  const [visRecentActivity, setVisRecentActivity] = useState(
    (c as { visibility_recent_activity?: boolean | null }).visibility_recent_activity !== false,
  );
  const [nt, setNt] = useState(c.notify_ticket_updates !== false);
  const [np, setNp] = useState(c.notify_project_updates !== false);

  useEffect(() => {
    const row = detail.client;
    setEnabled(row.enabled === true);
    setVt(row.visibility_tickets !== false);
    setVp(row.visibility_projects !== false);
    setVr(row.visibility_rag !== false);
    setVrep(row.visibility_reports === true);
    setVnotes((row as { visibility_ticket_notes?: boolean | null }).visibility_ticket_notes !== false);
    setVisPriorityBreakdown(
      (row as { visibility_priority_breakdown?: boolean | null }).visibility_priority_breakdown !== false,
    );
    setVisResolvedCount(
      (row as { visibility_resolved_count?: boolean | null }).visibility_resolved_count === true,
    );
    setVisRecentActivity(
      (row as { visibility_recent_activity?: boolean | null }).visibility_recent_activity !== false,
    );
    setNt(row.notify_ticket_updates !== false);
    setNp(row.notify_project_updates !== false);
  }, [detail.client, clientId]);

  const patchImmediate = useCallback(
    async (patch: Record<string, unknown>, rollback: () => void) => {
      const res = await fetch(`/api/portal/clients/${encodeURIComponent(clientId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        toast({ message: "Saved", variant: "success" });
        await onSaved();
        return;
      }
      rollback();
      toast({ message: "Update failed", variant: "error" });
    },
    [clientId, onSaved, toast],
  );

  const save = async () => {
    const res = await fetch(`/api/portal/clients/${encodeURIComponent(clientId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        enabled,
        visibility_tickets: vt,
        visibility_projects: vp,
        notify_ticket_updates: nt,
        notify_project_updates: np,
      }),
    });
    if (res.ok) {
      toast({ message: "Saved", variant: "success" });
      await onSaved();
    } else toast({ message: "Save failed", variant: "error" });
  };

  const uploadLogo = async (file: File) => {
    const fd = new FormData();
    fd.set("logo", file);
    const res = await fetch(`/api/portal/clients/${encodeURIComponent(clientId)}/logo`, {
      method: "POST",
      body: fd,
      credentials: "same-origin",
    });
    if (res.ok) {
      toast({ message: "Logo updated", variant: "success" });
      await onSaved();
    } else toast({ message: "Upload failed", variant: "error" });
  };

  const del = async () => {
    if (!window.confirm("Delete this client portal? This cannot be undone.")) return;
    const res = await fetch(`/api/portal/clients/${encodeURIComponent(clientId)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (res.ok) {
      toast({ message: "Portal deleted", variant: "success" });
      window.location.reload();
    } else toast({ message: "Delete failed", variant: "error" });
  };

  return (
    <div className="space-y-4">
      <RowToggle label="Portal enabled" checked={enabled} onCheckedChange={setEnabled} />
      <RowToggle label="Tickets" checked={vt} onCheckedChange={setVt} />
      <RowToggle label="Projects" checked={vp} onCheckedChange={setVp} />
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        Analytics &amp; visibility
      </p>
      <div className="space-y-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)]/40 p-3">
        <RowToggle
          label="Show service health status"
          checked={vr}
          onCheckedChange={(next) => {
            const prev = vr;
            setVr(next);
            void patchImmediate({ visibility_rag: next }, () => setVr(prev));
          }}
        />
        <RowToggle
          label="Show ticket priority breakdown"
          checked={visPriorityBreakdown}
          onCheckedChange={(next) => {
            const prev = visPriorityBreakdown;
            setVisPriorityBreakdown(next);
            void patchImmediate({ visibility_priority_breakdown: next }, () => setVisPriorityBreakdown(prev));
          }}
        />
        <RowToggle
          label="Show resolved tickets count"
          checked={visResolvedCount}
          onCheckedChange={(next) => {
            const prev = visResolvedCount;
            setVisResolvedCount(next);
            void patchImmediate({ visibility_resolved_count: next }, () => setVisResolvedCount(prev));
          }}
        />
        <RowToggle
          label="Show recent activity feed"
          checked={visRecentActivity}
          onCheckedChange={(next) => {
            const prev = visRecentActivity;
            setVisRecentActivity(next);
            void patchImmediate({ visibility_recent_activity: next }, () => setVisRecentActivity(prev));
          }}
        />
        <div className="space-y-1">
          <RowToggle
            label="Show ticket notes to client"
            checked={vnotes}
            onCheckedChange={(next) => {
              const prev = vnotes;
              setVnotes(next);
              void patchImmediate({ visibility_ticket_notes: next }, () => setVnotes(prev));
            }}
          />
          <p className="text-[11px] leading-snug text-[var(--text-muted)]">
            When enabled, clients can expand tickets to read internal notes and updates
          </p>
        </div>
        <RowToggle
          label="Show reports tab"
          checked={vrep}
          onCheckedChange={(next) => {
            const prev = vrep;
            setVrep(next);
            void patchImmediate({ visibility_reports: next }, () => setVrep(prev));
          }}
        />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Notifications</p>
      <RowToggle label="Ticket updates" checked={nt} onCheckedChange={setNt} />
      <RowToggle label="Project updates" checked={np} onCheckedChange={setNp} />
      <div>
        <p className="mb-1 text-[12px] text-[var(--text-secondary)]">Client logo</p>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="text-[12px] text-[var(--text-secondary)]"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadLogo(f);
          }}
        />
      </div>
      <Button type="button" onClick={() => void save()}>
        Save settings
      </Button>
      <div className="rounded-[var(--radius)] border border-red-900/40 bg-red-950/20 p-3">
        <p className="text-[12px] font-semibold text-red-300">Danger zone</p>
        <Button type="button" variant="destructive" className="mt-2" onClick={() => void del()}>
          Delete portal
        </Button>
      </div>
    </div>
  );
}
