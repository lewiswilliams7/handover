"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Flag,
  Globe,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";

import { useToast } from "@/components/toasts";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatLoggedHours, hasLoggedWork } from "@/lib/format-logged-hours";
import { usePSAConnections } from "@/hooks/use-psa-connections";
import { TICKET_SECTION_RULE } from "@/lib/halo";
import { Input } from "@/components/ui/input";
import { invalidatePsaCache, useHaloProjects, useHaloTickets } from "@/lib/psa-cache";
import { cn } from "@/lib/utils";
import {
  DEMO_CLIENTS,
  DEMO_PROJECTS,
  DEMO_TICKETS,
  mapDemoTicketsToHaloTickets,
} from "@/lib/demo-data";
import { DemoBanner } from "@/components/demo-banner";

type HaloClient = { id: number; name: string };
type HaloNote = {
  id?: number | string;
  note?: string | null;
  details?: string | null;
  description?: string | null;
  body?: string | null;
  posted?: string | null;
  date?: string | null;
  created_at?: string | null;
  created?: string | null;
  who?: string | null;
  author?: string | null;
  agent?: { name?: string | null } | null;
};
type HaloTicket = {
  id: number | string;
  summary: string;
  details: string | null;
  status: { name: string };
  priority?: { name: string } | null;
  client: { name: string } | null;
  agent: { name: string } | null;
  dateoccurred: string | null;
  targetdate?: string | null;
  timetaken?: number | null;
  flagged?: boolean | null;
  ticket_type?: string;
  tickettype_id?: number | null;
  is_project?: boolean;
  is_project_task?: boolean;
  parent_project_id?: number | null;
  notes?: HaloNote[];
};

function projectVsTicketBadgeStyle(isProject: boolean): CSSProperties {
  if (isProject) {
    return {
      background: "rgba(139,92,246,0.1)",
      color: "#8b5cf6",
      border: "1px solid rgba(139,92,246,0.2)",
    };
  }
  return {
    background: "var(--bg-secondary)",
    color: "var(--text-muted)",
    border: "1px solid var(--border)",
  };
}
type HaloProject = {
  id: number | string;
  name: string;
  status: { name: string } | null;
  client: { name: string } | null;
  projectmanager: { name: string } | null;
  targetdate: string | null;
  completionpercent?: number | null;
  description: string | null;
  notes?: HaloNote[];
};

type TimePresetId =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_7"
  | "last_14"
  | "last_30"
  | "custom";

type SelClient = { id: number; name: string };

function haloImportTicketClientId(t: HaloTicket): number | null {
  const raw = (t as unknown as { clientId?: unknown }).clientId;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function countPickedClientsHiddenAfterFetch(
  picked: SelClient[],
  clientIdsWithResults: Set<number>,
): number {
  if (picked.length === 0) return 0;
  return picked.filter((c) => !clientIdsWithResults.has(c.id)).length;
}

function utcTodayBase(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function toYmdUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getPresetDateRange(
  preset: TimePresetId,
  customFrom: string,
  customTo: string,
): { from: string; to: string; label: string } {
  const today = utcTodayBase();
  switch (preset) {
    case "today": {
      const d = toYmdUtc(today);
      return { from: d, to: d, label: "Today" };
    }
    case "yesterday": {
      const y = new Date(today);
      y.setUTCDate(y.getUTCDate() - 1);
      const d = toYmdUtc(y);
      return { from: d, to: d, label: "Yesterday" };
    }
    case "this_week": {
      const dow = today.getUTCDay();
      const mondayOffset = dow === 0 ? -6 : 1 - dow;
      const monday = new Date(today);
      monday.setUTCDate(monday.getUTCDate() + mondayOffset);
      return { from: toYmdUtc(monday), to: toYmdUtc(today), label: "This week" };
    }
    case "last_7": {
      const start = new Date(today);
      start.setUTCDate(start.getUTCDate() - 7);
      return { from: toYmdUtc(start), to: toYmdUtc(today), label: "Last 7 days" };
    }
    case "last_14": {
      const start = new Date(today);
      start.setUTCDate(start.getUTCDate() - 14);
      return { from: toYmdUtc(start), to: toYmdUtc(today), label: "Last 14 days" };
    }
    case "last_30": {
      const start = new Date(today);
      start.setUTCDate(start.getUTCDate() - 30);
      return { from: toYmdUtc(start), to: toYmdUtc(today), label: "Last 30 days" };
    }
    case "custom":
      return {
        from: customFrom,
        to: customTo,
        label:
          customFrom && customTo
            ? `${customFrom} → ${customTo}`
            : "Custom range",
      };
  }
}

const TIME_PRESET_ROW: { id: TimePresetId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "this_week", label: "This week" },
  { id: "last_7", label: "Last 7 days" },
  { id: "last_14", label: "Last 14 days" },
  { id: "last_30", label: "Last 30 days" },
  { id: "custom", label: "Custom" },
];

/** Project tab: same presets as tickets except no "Yesterday". */
const PROJECT_TIME_PRESET_ROW: { id: TimePresetId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "this_week", label: "This week" },
  { id: "last_7", label: "Last 7 days" },
  { id: "last_14", label: "Last 14 days" },
  { id: "last_30", label: "Last 30 days" },
  { id: "custom", label: "Custom" },
];

type HaloImportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProRequired?: () => void;
  onConnectionInvalid?: (message: string) => void;
  forceDemoMode?: boolean;
  onImport: (payload: {
    formatted: string;
    count: number;
    selectedClientName: string | null;
    dataType: "tickets" | "projects";
    fromDemo?: boolean;
    importedItems: Array<{
      id: number;
      title: string;
      clientName: string;
      status: string;
      type: "ticket" | "project";
    }>;
    inputQuality?: { score: number; reasons: string[] };
  }) => void;
};

function noteText(note: HaloNote): string {
  return (note.note ?? note.details ?? note.description ?? note.body ?? "").trim();
}
function noteDate(note: HaloNote): string {
  return (
    note.posted ??
    note.date ??
    note.created_at ??
    note.created ??
    "Unknown"
  );
}
function noteAuthor(note: HaloNote): string {
  return (note.author ?? note.who ?? note.agent?.name ?? "Unknown").trim();
}

function noteKey(n: HaloNote): string {
  return String(n.id ?? `${noteDate(n)}-${noteAuthor(n)}-${noteText(n).slice(0, 20)}`);
}

function buildEmptyNoteSelection(items: Array<HaloTicket | HaloProject>): Record<string, Record<string, boolean>> {
  const noteMap: Record<string, Record<string, boolean>> = {};
  for (const item of items) {
    const per: Record<string, boolean> = {};
    for (const n of item.notes ?? []) {
      per[noteKey(n as HaloNote)] = false;
    }
    noteMap[String(item.id)] = per;
  }
  return noteMap;
}

function isTestTicket(title: string): boolean {
  const testPatterns = [
    /^test/i,
    /test ticket/i,
    /^so \d+ - testing/i,
    /test - ps project/i,
    /^so \d+ - recurring/i,
    /testing provisioning/i,
  ];
  return testPatterns.some((p) => p.test(title));
}

function isAutomatedTicket(title: string): boolean {
  const automatedPatterns = [
    /sonicwall/i,
    /new firmware/i,
    /software release/i,
    /\[request id/i,
  ];
  return automatedPatterns.some((p) => p.test(title));
}

function calculateInputQuality(tickets: HaloTicket[]): {
  score: number;
  reasons: string[];
} {
  if (tickets.length === 0) return { score: 0, reasons: ["No tickets selected"] };

  const reasons: string[] = [];
  let score = 100;

  if (tickets.length < 3) {
    score -= 20;
    reasons.push(
      `Only ${tickets.length} ticket${tickets.length === 1 ? "" : "s"} selected. Outputs may be limited`,
    );
  }

  const shortDesc = tickets.filter((t) => {
    const desc = (t.details || t.summary || "").trim();
    return desc.split(/\s+/).filter(Boolean).length < 20;
  });
  if (shortDesc.length > 0) {
    const deduction = Math.min(shortDesc.length * 8, 40);
    score -= deduction;
    reasons.push(
      `${shortDesc.length} ticket${shortDesc.length === 1 ? "" : "s"} with limited description`,
    );
  }

  const noNotes = tickets.filter((t) => !t.notes || t.notes.length === 0);
  if (noNotes.length > 0) {
    const deduction = Math.min(noNotes.length * 5, 25);
    score -= deduction;
    reasons.push(`${noNotes.length} ticket${noNotes.length === 1 ? "" : "s"} with no notes`);
  }

  const closedNoResolution = tickets.filter((t) => {
    const isClosed =
      t.status?.name?.toLowerCase().includes("closed") ||
      t.status?.name?.toLowerCase().includes("resolved");
    const hasResolution = t.notes?.some(
      (n) => (n.note || n.details || n.body || "").trim().length > 20,
    );
    return isClosed && !hasResolution;
  });
  if (closedNoResolution.length > 0) {
    const deduction = Math.min(closedNoResolution.length * 7, 30);
    score -= deduction;
    reasons.push(
      `${closedNoResolution.length} closed ticket${closedNoResolution.length === 1 ? "" : "s"} without resolution notes`,
    );
  }

  return { score: Math.max(0, Math.min(100, score)), reasons };
}

export function HaloImportModal({
  open,
  onOpenChange,
  onProRequired,
  onConnectionInvalid,
  forceDemoMode = false,
  onImport,
}: HaloImportModalProps) {
  const psaConnections = usePSAConnections();
  const toast = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [step2HiddenClientsCount, setStep2HiddenClientsCount] = useState(0);
  const [importMode, setImportMode] = useState<"tickets" | "projects">("tickets");
  const [clients, setClients] = useState<HaloClient[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [allClientsSelected, setAllClientsSelected] = useState(true);
  const [pickedClients, setPickedClients] = useState<SelClient[]>([]);
  const [clientOpenCounts, setClientOpenCounts] = useState<Record<string, number>>({});
  const [countsLoading, setCountsLoading] = useState(false);
  const [limit] = useState(100);
  const [tickets, setTickets] = useState<HaloTicket[]>([]);
  const [projects, setProjects] = useState<HaloProject[]>([]);
  const [selectedIds, setSelectedIds] = useState<Array<number | string>>([]);
  const [expandedIds, setExpandedIds] = useState<Array<number | string>>([]);
  const [selectedNotes, setSelectedNotes] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(false);
  const [fetchProgress, setFetchProgress] = useState<number>(0);
  const [fetchProgressText, setFetchProgressText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [ticketSearch, setTicketSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const [clientsLoading, setClientsLoading] = useState(false);
  const { data: haloTicketsCached, mutate: refreshHaloTickets } = useHaloTickets(
    open && !forceDemoMode,
  );
  const { data: haloProjectsCached, mutate: refreshHaloProjects } = useHaloProjects(
    open && !forceDemoMode,
  );

  const fetchHaloClients = useCallback(
    async (opts?: { bustCache?: boolean; resetSelection?: boolean }) => {
      if (forceDemoMode) return;
      setClientsLoading(true);
      setClients([]);
      setClientOpenCounts({});
      if (opts?.resetSelection) {
        setAllClientsSelected(false);
        setPickedClients([]);
      }
      try {
        const qs = new URLSearchParams({ all_pages: "1", page_size: "1000" });
        if (opts?.bustCache) {
          qs.set("refresh", "1");
          qs.set("_", String(Date.now()));
        }
        const res = await fetch(`/api/halo/clients?${qs.toString()}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as {
          clients?: HaloClient[];
          error?: string;
        };

        if (res.status === 403 && data.error === "pro_required") {
          onOpenChangeRef.current(false);
          onProRequiredRef.current?.();
          return;
        }

        if (!res.ok && !(data.clients && data.clients.length > 0)) {
          throw new Error(data.error ?? "Failed to fetch clients.");
        }

        const allClients = data.clients ?? [];
        setClients(allClients);
        console.log("[modal] All clients loaded:", allClients.length);
      } finally {
        setClientsLoading(false);
      }
    },
    [forceDemoMode],
  );

  const applyDemoTicketsToModal = useCallback(() => {
    const haloTickets = mapDemoTicketsToHaloTickets();
    setTickets(haloTickets);
    setProjects([]);
    setSelectedNotes(buildEmptyNoteSelection(haloTickets));
    setDemoMode(true);
  }, []);

  const refreshCachedPsaData = useCallback(async () => {
    if (forceDemoMode) {
      applyDemoTicketsToModal();
      setProjects(
        DEMO_PROJECTS.map((p) => ({
          id: p.id,
          name: p.name,
          status: p.status,
          client: p.client,
          projectmanager: p.projectmanager,
          targetdate: p.targetdate,
          completionpercent: p.completionpercent,
          description: p.description ?? null,
          notes: [],
        })),
      );
      return;
    }
    await fetchHaloClients({ bustCache: true, resetSelection: true });
    const cacheBust = Date.now();
    if (importMode === "tickets") {
      await fetch(`/api/halo/tickets?refresh=1&_=${cacheBust}`, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "tickets", count: 1000 }),
      }).catch((e) => console.error("[modal] tickets refresh fetch:", e));
      await refreshHaloTickets();
    } else {
      await refreshHaloProjects();
    }
  }, [
    forceDemoMode,
    applyDemoTicketsToModal,
    fetchHaloClients,
    importMode,
    refreshHaloTickets,
    refreshHaloProjects,
  ]);

  const onOpenChangeRef = useRef(onOpenChange);
  const onProRequiredRef = useRef(onProRequired);
  onOpenChangeRef.current = onOpenChange;
  onProRequiredRef.current = onProRequired;

  /** Only true while dialog is open; cleared when it closes so next open runs init again. */
  const haloImportSessionStartedRef = useRef(false);

  const openItemsDateRange = useMemo(() => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setUTCFullYear(start.getUTCFullYear() - 10);
    return { from: toYmdUtc(start), to: toYmdUtc(today) };
  }, []);

  useEffect(() => {
    setAllClientsSelected(true);
    setPickedClients([]);
  }, [importMode]);

  useEffect(() => {
    if (!forceDemoMode) return;
    setClientOpenCounts(
      Object.fromEntries(
        DEMO_CLIENTS.map((c) => [
          String(c.id),
          1,
        ]),
      ),
    );
  }, [forceDemoMode, importMode]);

  useEffect(() => {
    if (!open) {
      haloImportSessionStartedRef.current = false;
      return;
    }
    if (haloImportSessionStartedRef.current) {
      return;
    }
    haloImportSessionStartedRef.current = true;

    setStep(1);
    setStep2HiddenClientsCount(0);
    setTickets([]);
    setProjects([]);
    setSelectedIds([]);
    setExpandedIds([]);
    setSelectedNotes({});
    setClientSearch("");
    setKeyword("");
    setTicketSearch("");
    setAllClientsSelected(true);
    setPickedClients([]);
    setClientOpenCounts({});
    setError(null);
    setDemoMode(forceDemoMode);
    setFetchProgress(0);
    setFetchProgressText("");

    if (forceDemoMode) {
      const demoClients: HaloClient[] = DEMO_CLIENTS.map((c) => ({
        id: c.id,
        name: c.name,
      }));
      setClients(demoClients);
      setClientOpenCounts(
        Object.fromEntries(DEMO_CLIENTS.map((c) => [String(c.id), 1])),
      );
      applyDemoTicketsToModal();
      setClientsLoading(false);
      return;
    }

    void (async () => {
      try {
        const connRes = await fetch("/api/halo/connect");
        const connData = (await connRes.json()) as {
          connected?: boolean;
          haloUrl?: string;
          proRequired?: boolean;
        };
        if (connData.proRequired) {
          onOpenChangeRef.current(false);
          onProRequiredRef.current?.();
          return;
        }

        await fetchHaloClients();
      } catch (e) {
        setClientsLoading(false);
        setError(e instanceof Error ? e.message : "Failed to load HaloPSA.");
      }
    })();
  }, [open, forceDemoMode, fetchHaloClients, applyDemoTicketsToModal]);

  useEffect(() => {
    if (!open || clients.length === 0 || demoMode || forceDemoMode || importMode !== "tickets") return;
    let cancelled = false;
    setCountsLoading(true);
    void (async () => {
      try {
        const res = await fetch("/api/halo/client-counts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "tickets",
            clientIds: clients.map((c) => c.id),
            dateFrom: openItemsDateRange.from,
            dateTo: openItemsDateRange.to,
          }),
        });
        const data = (await res.json()) as { counts?: Record<string, number>; error?: string };
        if (!cancelled && res.ok) {
          setClientOpenCounts(data.counts ?? {});
        }
      } catch {
        if (!cancelled) setClientOpenCounts({});
      } finally {
        if (!cancelled) setCountsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, clients, importMode, demoMode, openItemsDateRange.from, openItemsDateRange.to]);

  useEffect(() => {
    if (!open || clients.length === 0 || demoMode || forceDemoMode || importMode !== "projects") return;
    let cancelled = false;
    setCountsLoading(true);
    void (async () => {
      try {
        const res = await fetch("/api/halo/client-counts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "projects",
            clientIds: clients.map((c) => c.id),
            dateFrom: openItemsDateRange.from,
            dateTo: openItemsDateRange.to,
          }),
        });
        const data = (await res.json()) as { counts?: Record<string, number>; error?: string };
        if (!cancelled && res.ok) {
          setClientOpenCounts(data.counts ?? {});
        }
      } catch {
        if (!cancelled) setClientOpenCounts({});
      } finally {
        if (!cancelled) setCountsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, clients, importMode, demoMode, openItemsDateRange.from, openItemsDateRange.to]);

  useEffect(() => {
    if (!open || step !== 1) return;
    const id = requestAnimationFrame(() => document.getElementById("halo-client-search")?.focus());
    return () => cancelAnimationFrame(id);
  }, [open, step]);

  useEffect(() => {
    if (step === 1) setTicketSearch("");
  }, [step]);

  /** Clients with activity in period (sorted by count desc), then filtered by search. While counts load, show name-filtered full list A-Z. */
  const displayClientsStep1 = useMemo(() => {
    if (clientsLoading || clients.length === 0) return [];
    const q = clientSearch.trim().toLowerCase();
    const byName = (c: HaloClient) => !q || c.name.toLowerCase().includes(q);

    if (importMode === "tickets") {
      if (countsLoading) {
        return [...clients].filter(byName).sort((a, b) => a.name.localeCompare(b.name));
      }
      return clients
        .filter((c) => (clientOpenCounts[String(c.id)] ?? 0) > 0)
        .filter(byName)
        .sort(
          (a, b) =>
            (clientOpenCounts[String(b.id)] ?? 0) - (clientOpenCounts[String(a.id)] ?? 0),
        );
    }

    if (countsLoading) {
      return [...clients].filter(byName).sort((a, b) => a.name.localeCompare(b.name));
    }
    return clients
      .filter((c) => (clientOpenCounts[String(c.id)] ?? 0) > 0)
      .filter(byName)
      .sort(
        (a, b) =>
          (clientOpenCounts[String(b.id)] ?? 0) - (clientOpenCounts[String(a.id)] ?? 0),
      );
  }, [
    clients,
    clientsLoading,
    clientSearch,
    importMode,
    countsLoading,
    clientOpenCounts,
  ]);

  /** Clients with ≥1 open ticket in the selected period (full list, not search-filtered). */
  const clientsWithOpenTicketsCount = useMemo(() => {
    if (importMode !== "tickets") return 0;
    let n = 0;
    for (const c of clients) {
      if ((clientOpenCounts[String(c.id)] ?? 0) > 0) n += 1;
    }
    return n;
  }, [clients, importMode, clientOpenCounts]);

  /** For "All clients" summary: clients with ticket counts in the selected period. */
  const clientsWithTickets = useMemo(() => {
    if (importMode !== "tickets") return [];
    return clients
      .map((c) => ({
        id: c.id,
        name: c.name,
        ticketCount: clientOpenCounts[String(c.id)] ?? 0,
      }))
      .filter((c) => c.ticketCount > 0);
  }, [clients, importMode, clientOpenCounts]);

  const allClientsFetchTotalTickets = useMemo(
    () => clientsWithTickets.reduce((sum, c) => sum + c.ticketCount, 0),
    [clientsWithTickets],
  );

  const clientsWithActiveProjectsCount = useMemo(() => {
    if (importMode !== "projects") return 0;
    let n = 0;
    for (const c of clients) {
      if ((clientOpenCounts[String(c.id)] ?? 0) > 0) n += 1;
    }
    return n;
  }, [clients, importMode, clientOpenCounts]);

  const clientsWithProjects = useMemo(() => {
    if (importMode !== "projects") return [];
    return clients
      .map((c) => ({
        id: c.id,
        name: c.name,
        projectCount: clientOpenCounts[String(c.id)] ?? 0,
      }))
      .filter((c) => c.projectCount > 0);
  }, [clients, importMode, clientOpenCounts]);

  const allClientsFetchTotalProjects = useMemo(
    () => clientsWithProjects.reduce((sum, c) => sum + c.projectCount, 0),
    [clientsWithProjects],
  );

  const filteredTickets = useMemo(() => {
    const q = ticketSearch.trim().toLowerCase();
    const base = tickets.filter(
      (t) =>
        t.is_project !== true &&
        t.is_project_task !== true &&
        !(typeof t.parent_project_id === "number" && Number.isFinite(t.parent_project_id) && t.parent_project_id > 0),
    );
    if (!q) return base;
    return base.filter(
      (t) =>
        (t.summary ?? "").toLowerCase().includes(q) ||
        (t.client?.name ?? "").toLowerCase().includes(q) ||
        (t.status?.name ?? "").toLowerCase().includes(q),
    );
  }, [tickets, ticketSearch]);

  const filteredProjects = useMemo(() => {
    if (importMode !== "projects") return [];
    const q = ticketSearch.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        (p.name ?? "").toLowerCase().includes(q) ||
        (p.client?.name ?? "").toLowerCase().includes(q) ||
        (p.status?.name ?? "").toLowerCase().includes(q),
    );
  }, [importMode, projects, ticketSearch]);

  const rows = importMode === "tickets" ? filteredTickets : filteredProjects;

  const groupedForStep2 = useMemo(() => {
    const entries = Object.entries(
      rows.reduce<Record<string, Array<HaloTicket | HaloProject>>>((acc, item) => {
        const key = item.client?.name ?? "Unknown client";
        acc[key] = acc[key] ?? [];
        acc[key].push(item);
        return acc;
      }, {}),
    );
    entries.sort(([a], [b]) => a.localeCompare(b));
    return entries;
  }, [rows]);

  const selectedCount = selectedIds.length;
  const selectedTicketCount = tickets.filter((t) => t.is_project !== true && selectedIds.includes(t.id)).length;
  const selectedProjectCount = projects.filter((p) => selectedIds.includes(p.id)).length;

  const step2Totals = useMemo(() => {
    const clientKeys = new Set(rows.map((r) => r.client?.name ?? "Unknown"));
    return { ticketCount: rows.length, clientCount: clientKeys.size };
  }, [rows]);

  const allVisibleSelected =
    rows.length > 0 && rows.every((r) => selectedIds.includes(r.id));

  const selectedNotesCount = useMemo(() => {
    let n = 0;
    const list = importMode === "tickets" ? tickets : projects;
    for (const item of list) {
      if (!selectedIds.includes(item.id)) continue;
      const map = selectedNotes[String(item.id)] ?? {};
      for (const v of Object.values(map)) {
        if (v) n += 1;
      }
    }
    return n;
  }, [importMode, tickets, projects, selectedIds, selectedNotes]);

  const generatingForLabel = useMemo(() => {
    if (allClientsSelected) return "All clients";
    if (pickedClients.length === 0) return " - ";
    return pickedClients.map((c) => c.name).join(", ");
  }, [allClientsSelected, pickedClients]);

  const step3PreviewLabels = useMemo(() => {
    const items: Array<{ id: number | string; label: string }> = [];
    if (importMode === "tickets") {
      for (const t of tickets) {
        if (t.is_project === true || t.is_project_task === true) continue;
        if (!selectedIds.includes(t.id)) continue;
        items.push({ id: t.id, label: t.summary?.trim() || `Ticket ${t.id}` });
        if (items.length >= 3) break;
      }
    } else {
      for (const p of projects) {
        if (!selectedIds.includes(p.id)) continue;
        items.push({ id: p.id, label: p.name?.trim() || `Project ${p.id}` });
        if (items.length >= 3) break;
      }
    }
    return items;
  }, [importMode, tickets, projects, selectedIds]);

  const step3PreviewOverflow = useMemo(() => {
    const total = importMode === "tickets" ? selectedTicketCount : selectedProjectCount;
    return Math.max(0, total - step3PreviewLabels.length);
  }, [importMode, selectedTicketCount, selectedProjectCount, step3PreviewLabels.length]);

  const fetchSummaryLine = useMemo(() => {
    if (importMode !== "tickets") {
      if (allClientsSelected) return "Fetch all clients · open projects";
      if (pickedClients.length === 0) return "";
      return `Fetch projects for ${pickedClients.map((c) => c.name).join(" · ")} · open only`;
    }
    if (allClientsSelected) return "Fetch all clients · open tickets";
    if (pickedClients.length === 0) return "";
    return `Fetch tickets for ${pickedClients.map((c) => c.name).join(" · ")} · open only`;
  }, [importMode, allClientsSelected, pickedClients]);

  const canFetchStep1 =
    !clientsLoading && (allClientsSelected || pickedClients.length > 0);

  const toggleAllClients = () => {
    if (allClientsSelected) {
      setAllClientsSelected(false);
    } else {
      setPickedClients([]);
      setAllClientsSelected(true);
    }
  };

  const togglePickedClient = (c: HaloClient) => {
    setAllClientsSelected(false);
    setPickedClients((prev) => {
      const exists = prev.some((p) => p.id === c.id);
      if (exists) return prev.filter((p) => p.id !== c.id);
      return [...prev, { id: c.id, name: c.name }];
    });
  };

  const isClientPicked = (id: number) => pickedClients.some((p) => p.id === id);

  const exitDemoMode = useCallback(() => {
    setDemoMode(false);
    setTickets([]);
    setProjects([]);
    setSelectedIds([]);
    setExpandedIds([]);
    setSelectedNotes({});
    setTicketSearch("");
    setError(null);
    void fetchHaloClients();
  }, [fetchHaloClients]);

  const loadDemoData = () => {
    setImportMode("tickets");
    setAllClientsSelected(true);
    setPickedClients([]);
    applyDemoTicketsToModal();
    setSelectedIds([]);
    setExpandedIds([]);
    setStep(2);
  };

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    setFetchProgress(0);
    setFetchProgressText("");
    try {
      if (forceDemoMode) {
        const selectedDemoNames = allClientsSelected
          ? null
          : new Set(
              pickedClients
                .map((p) => DEMO_CLIENTS.find((c) => c.id === p.id)?.name)
                .filter((name): name is string => Boolean(name)),
            );
        if (importMode === "projects") {
          const projectRows = DEMO_PROJECTS.filter((p) =>
            selectedDemoNames ? selectedDemoNames.has(p.client.name) : true,
          );
          setProjects(
            projectRows.map((p) => ({
              id: p.id,
              name: p.name,
              status: p.status,
              client: p.client,
              projectmanager: p.projectmanager,
              targetdate: p.targetdate,
              completionpercent: p.completionpercent,
              description: p.description ?? null,
              notes: [],
            })),
          );
          setTickets([]);
          setSelectedIds([]);
          setSelectedNotes(
            buildEmptyNoteSelection(
              projectRows.map((p) => ({
                id: p.id,
                name: p.name,
                status: p.status,
                client: p.client,
                projectmanager: p.projectmanager,
                targetdate: p.targetdate,
                completionpercent: p.completionpercent,
                description: p.description ?? null,
                notes: [],
              })),
            ),
          );
            setDemoMode(true);
          setStep(2);
          return;
        }
        const ticketRows = mapDemoTicketsToHaloTickets().filter((t) =>
          selectedDemoNames ? selectedDemoNames.has(t.client?.name ?? "") : true,
        );
        setTickets(ticketRows);
        setProjects([]);
        setSelectedIds([]);
        setExpandedIds([]);
        setSelectedNotes(buildEmptyNoteSelection(ticketRows));
        setDemoMode(true);
        setStep(2);
        return;
      }

      const clientIdsPayload = allClientsSelected
        ? undefined
        : pickedClients.map((p) => p.id);

      if (importMode === "projects") {
        const projectData = (haloProjectsCached ??
          (await refreshHaloProjects())) as { projects?: HaloProject[] } | undefined;
        let projectRows = Array.isArray(projectData?.projects) ? projectData.projects : [];
        const kw = keyword.trim().toLowerCase();
        if (kw) {
          projectRows = projectRows.filter((p) =>
            (p.name ?? "").toLowerCase().includes(kw) ||
            (p.description ?? "").toLowerCase().includes(kw) ||
            (p.client?.name ?? "").toLowerCase().includes(kw),
          );
        }
        if (clientIdsPayload && clientIdsPayload.length > 0) {
          const selectedClientNames = new Set(
            clients.filter((c) => clientIdsPayload.includes(c.id)).map((c) => c.name.toLowerCase()),
          );
          projectRows = projectRows.filter((p) =>
            selectedClientNames.has((p.client?.name ?? "").toLowerCase()),
          );
        }
        const detailedProjects = await Promise.all(
          projectRows.map(async (p) => {
            const dr = await fetch(`/api/halo/ticket-details?id=${p.id}`);
            const dd = (await dr.json()) as { ticket?: HaloTicket; error?: string };
            if (!dr.ok || !dd.ticket) throw new Error(dd.error ?? `Failed to fetch project ${p.id}`);
            return {
              ...p,
              notes: Array.isArray(dd.ticket.notes) ? dd.ticket.notes : [],
            };
          }),
        );
        const projectClientIds = new Set<number>();
        for (const p of detailedProjects) {
          const match = clients.find(
            (c) => c.name.toLowerCase() === (p.client?.name ?? "").toLowerCase(),
          );
          if (match) projectClientIds.add(match.id);
        }
        const hiddenProjects =
          !allClientsSelected && pickedClients.length > 0
            ? countPickedClientsHiddenAfterFetch(pickedClients, projectClientIds)
            : 0;
        setStep2HiddenClientsCount(hiddenProjects);
        setProjects(detailedProjects);
        setTickets([]);
        void refreshHaloProjects();
        setSelectedIds([]);
        setSelectedNotes(buildEmptyNoteSelection(detailedProjects));
        setStep(2);
        return;
      }

      const cachedResult = (haloTicketsCached ??
        (await refreshHaloTickets())) as { tickets?: HaloTicket[] } | undefined;
      const cachedBase = Array.isArray(cachedResult?.tickets)
        ? (cachedResult.tickets as HaloTicket[])
        : [];
      const selectedClientIdSet = new Set(clientIdsPayload ?? []);
      const keywordLower = keyword.trim().toLowerCase();
      const baseTickets =
        cachedBase.length > 0
          ? cachedBase.filter((t) => {
              const cid = Number((t as unknown as { clientId?: unknown }).clientId ?? 0);
              const inClientScope =
                selectedClientIdSet.size === 0 || (Number.isFinite(cid) && selectedClientIdSet.has(cid));
              const inKeywordScope =
                !keywordLower ||
                (t.summary ?? "").toLowerCase().includes(keywordLower) ||
                (t.details ?? "").toLowerCase().includes(keywordLower) ||
                String((t as Record<string, unknown>).category_1 ?? "").toLowerCase().includes(keywordLower) ||
                String((t as Record<string, unknown>).category_2 ?? "").toLowerCase().includes(keywordLower) ||
                (t.client?.name ?? "").toLowerCase().includes(keywordLower);
              return inClientScope && inKeywordScope;
            })
          : [];
      let resolvedTickets = baseTickets;
      if (resolvedTickets.length === 0) {
        const res = await fetch("/api/halo/tickets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "tickets",
            ...(clientIdsPayload && clientIdsPayload.length > 0 ? { clientIds: clientIdsPayload } : {}),
            dateFrom: openItemsDateRange.from,
            dateTo: openItemsDateRange.to,
            count: limit,
            keyword: keyword.trim() || undefined,
          }),
        });
        const data = (await res.json()) as { tickets?: HaloTicket[]; error?: string };
        if (!res.ok) {
          if (res.status === 403 && data.error === "pro_required") {
            onOpenChange(false);
            onProRequired?.();
            return;
          }
          if (data.error?.toLowerCase().includes("reconnect")) {
            onConnectionInvalid?.(data.error);
          }
          throw new Error(data.error ?? "Failed to fetch data.");
        }
        resolvedTickets = Array.isArray(data.tickets) ? data.tickets : [];
      }
      if (resolvedTickets.length === 0) {
        const hiddenEmpty =
          !allClientsSelected && pickedClients.length > 0 ? pickedClients.length : 0;
        setStep2HiddenClientsCount(hiddenEmpty);
        setTickets([]);
        setProjects([]);
        setSelectedIds([]);
        setSelectedNotes({});
        setStep(2);
        return;
      }
      setFetchProgressText(`Fetching 0 of ${resolvedTickets.length} tickets...`);
      let fetched = 0;
      const detailed = await Promise.all(
        resolvedTickets.map(async (t) => {
          const dr = await fetch(`/api/halo/ticket-details?id=${t.id}`);
          const dd = (await dr.json()) as { ticket?: HaloTicket; error?: string };
          if (!dr.ok || !dd.ticket) throw new Error(dd.error ?? `Failed to fetch ticket ${t.id}`);
          fetched += 1;
          setFetchProgress(Math.round((fetched / resolvedTickets.length) * 100));
          setFetchProgressText(`Fetching ${fetched} of ${resolvedTickets.length} tickets...`);
          return dd.ticket;
        }),
      );
      const ticketClientIds = new Set<number>();
      for (const t of detailed) {
        const cid = haloImportTicketClientId(t);
        if (cid != null) ticketClientIds.add(cid);
      }
      const hiddenTickets =
        !allClientsSelected && pickedClients.length > 0
          ? countPickedClientsHiddenAfterFetch(pickedClients, ticketClientIds)
          : 0;
      setStep2HiddenClientsCount(hiddenTickets);
      setTickets(detailed);
      setProjects([]);
      setSelectedIds([]);
      setSelectedNotes(buildEmptyNoteSelection(detailed));
      setStep(2);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to fetch data.";
      setError(msg);
      toast({ message: "Halo import failed", subtitle: msg, variant: "error" });
    } finally {
      setLoading(false);
      setFetchProgressText("");
    }
  };

  const toggleExpanded = (id: number | string) => {
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleItemSelected = (id: number | string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectAllVisible = () => {
    const allIds = rows.map((r) => r.id);
    setSelectedIds(Array.from(new Set([...selectedIds, ...allIds])));
    allIds.forEach((id) => setAllNotesForTicket(id, true));
  };

  const deselectAllVisible = () => {
    const visible = new Set(rows.map((r) => r.id));
    setSelectedIds((prev) => prev.filter((id) => !visible.has(id)));
    rows.forEach((r) => setAllNotesForTicket(r.id, false));
  };

  const allGroupSelected = (items: Array<HaloTicket | HaloProject>) =>
    items.length > 0 && items.every((i) => selectedIds.includes(i.id));

  const selectAllInGroup = (items: Array<HaloTicket | HaloProject>) => {
    const ids = items.map((i) => i.id);
    setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
    ids.forEach((id) => setAllNotesForTicket(id, true));
  };

  const deselectAllInGroup = (items: Array<HaloTicket | HaloProject>) => {
    const drop = new Set(items.map((i) => i.id));
    setSelectedIds((prev) => prev.filter((id) => !drop.has(id)));
    items.forEach((item) => setAllNotesForTicket(item.id, false));
  };

  const setAllNotesForTicket = (itemId: number | string, on: boolean) => {
    const item = rows.find((r) => r.id === itemId);
    if (!item) return;
    const next: Record<string, boolean> = { ...(selectedNotes[String(itemId)] ?? {}) };
    for (const n of item.notes ?? []) {
      next[noteKey(n as HaloNote)] = on;
    }
    setSelectedNotes((prev) => ({
      ...prev,
      [String(itemId)]: next,
    }));
    if (on && importMode === "projects") {
      setSelectedIds((prev) =>
        prev.includes(itemId) ? prev : [...prev, itemId],
      );
    }
  };

  const allNotesSelectedForTicket = (item: HaloTicket | HaloProject): boolean => {
    const notes = item.notes ?? [];
    if (notes.length === 0) return false;
    const map = selectedNotes[String(item.id)] ?? {};
    return notes.every((n) => map[noteKey(n as HaloNote)] === true);
  };

  const importSelected = () => {
    if (selectedCount === 0) return;
    const selectedTickets = tickets
      .filter((t) => t.is_project !== true && selectedIds.includes(t.id));
    const selectedProjects = projects.filter((p) => selectedIds.includes(p.id));

    const ticketText = selectedTickets
      .map((t, idx) => {
        const notes = (t.notes ?? [])
          .filter((n) => selectedNotes[String(t.id)]?.[noteKey(n as HaloNote)] ?? false)
          .filter((n) => {
            const txt = noteText(n as HaloNote);
            if (!txt || txt.length < 10) return false;
            if (/system|auto/i.test(noteAuthor(n as HaloNote))) return false;
            if (txt.toLowerCase() === t.summary.toLowerCase()) return false;
            const ts = new Date(noteDate(n as HaloNote)).getTime();
            if (!Number.isNaN(ts)) {
              const age = (Date.now() - ts) / (1000 * 60 * 60 * 24);
              if (age > 30) return false;
            }
            return true;
          })
          .sort((a, b) => {
            const ta = new Date(noteDate(a as HaloNote)).getTime();
            const tb = new Date(noteDate(b as HaloNote)).getTime();
            const aOk = !Number.isNaN(ta);
            const bOk = !Number.isNaN(tb);
            if (aOk && bOk && ta !== tb) return ta - tb;
            return String(a.id ?? "").localeCompare(String(b.id ?? ""));
          })
          .map((n) => `  - [${noteDate(n as HaloNote)}] ${noteAuthor(n as HaloNote)}: ${noteText(n as HaloNote)}`)
          .join("\n");
        return [
          TICKET_SECTION_RULE,
          `TICKET ${idx + 1} of ${selectedTickets.length}`,
          TICKET_SECTION_RULE,
          "Source: HaloPSA",
          `Title: ${t.summary}`,
          `Status: ${t.status?.name ?? "Unknown"}`,
          `Client: ${t.client?.name ?? "Unknown"}`,
          `Owner: ${t.agent?.name ?? "Unassigned"}`,
          `Priority: ${t.priority?.name ?? "None"}`,
          `Target date: ${t.targetdate ?? "Not set"}`,
          `Time logged: ${formatLoggedHours(t.timetaken ?? 0)}`,
          `Description: ${t.details ?? "None"}`,
          "Notes:",
          notes || "  - None",
        ].join("\n");
      })
      .join("\n\n");
    const projectText = selectedProjects
      .map((p, idx) => {
        const notes = (p.notes ?? [])
          .filter((n) => selectedNotes[String(p.id)]?.[noteKey(n as HaloNote)] ?? false)
          .sort((a, b) => {
            const ta = new Date(noteDate(a as HaloNote)).getTime();
            const tb = new Date(noteDate(b as HaloNote)).getTime();
            const aOk = !Number.isNaN(ta);
            const bOk = !Number.isNaN(tb);
            if (aOk && bOk && ta !== tb) return ta - tb;
            return String(a.id ?? "").localeCompare(String(b.id ?? ""));
          })
          .map((n) => `  - [${noteDate(n as HaloNote)}] ${noteAuthor(n as HaloNote)}: ${noteText(n as HaloNote)}`)
          .join("\n");
        return [
          TICKET_SECTION_RULE,
          `PROJECT ${idx + 1} of ${selectedProjects.length}`,
          TICKET_SECTION_RULE,
          "Type: Project",
          "Source: HaloPSA",
          `Title: ${p.name}`,
          `Status: ${p.status?.name ?? "Unknown"}`,
          `Client: ${p.client?.name ?? "Unknown"}`,
          `Project manager: ${p.projectmanager?.name ?? "Unassigned"}`,
          `Target date: ${p.targetdate ?? "Not set"}`,
          `Completion: ${p.completionpercent ?? 0}%`,
          `Description: ${p.description ?? "None"}`,
          "Notes:",
          notes || "  - None",
        ].join("\n");
      })
      .join("\n\n");
    const allImportedItems = [
      ...selectedTickets.map((t) => ({
        id: Number(t.id),
        title: t.summary ?? `Ticket ${String(t.id)}`,
        clientName: t.client?.name ?? "Unknown",
        status: t.status?.name ?? "Open",
        type: "ticket" as const,
      })),
      ...selectedProjects.map((p) => ({
        id: Number(p.id),
        title: p.name ?? `Project ${String(p.id)}`,
        clientName: p.client?.name ?? "Unknown",
        status: p.status?.name ?? "Open",
        type: "project" as const,
      })),
    ];
    const combinedText = [ticketText, projectText].filter((s) => s.trim().length > 0).join("\n\n");
    const selectedClientName =
      new Set(allImportedItems.map((t) => t.clientName)).size === 1
        ? allImportedItems[0]?.clientName ?? null
        : null;
    const inputQuality = calculateInputQuality(selectedTickets);
    onImport({
      formatted: `HaloPSA Export - ${allImportedItems.length} items\n\n${combinedText}`,
      count: allImportedItems.length,
      selectedClientName,
      dataType: selectedProjects.length > 0 && selectedTickets.length === 0 ? "projects" : "tickets",
      fromDemo: demoMode,
      importedItems: allImportedItems,
      inputQuality,
    });
    window.setTimeout(() => onOpenChange(false), 500);
  };

  return (
    <Dialog
      open={open}
      modal={true}
      disablePointerDismissal={true}
      onOpenChange={(nextOpen, eventDetails) => {
        if (
          !nextOpen &&
          eventDetails &&
          typeof eventDetails === "object" &&
          "reason" in eventDetails &&
          eventDetails.reason === "focus-out" &&
          "cancel" in eventDetails &&
          typeof eventDetails.cancel === "function"
        ) {
          eventDetails.cancel();
          return;
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex h-[min(90vh,700px)] max-h-[min(90vh,700px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-3 pr-12">
          <DialogHeader className="space-y-0 p-0">
            <DialogTitle className="flex items-center gap-2.5 text-[20px] font-semibold tracking-tight">
              <img
                src="/halopsa.png"
                alt=""
                style={{
                  width: "28px",
                  height: "28px",
                  objectFit: "contain",
                  borderRadius: "6px",
                }}
              />
              Import from HaloPSA
            </DialogTitle>
          </DialogHeader>
          <button
            type="button"
            className="absolute top-3 right-3 rounded-[var(--radius)] p-2 text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
          </button>
        </div>

        <p className="shrink-0 border-b border-[var(--border)] px-4 py-2 text-[13px] text-[var(--text-muted)]">
          Step {step} of 3
        </p>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-4 md:overscroll-auto">
        {forceDemoMode ? (
          <div
            className="mb-4 rounded-[var(--radius)] border px-3 py-2 text-[12px]"
            style={{
              background: "rgba(245, 158, 11, 0.08)",
              borderColor: "rgba(245, 158, 11, 0.35)",
              color: "rgb(251, 191, 36)",
            }}
          >
            Demo mode - showing sample tickets. Connect HaloPSA to import your real data.
          </div>
        ) : demoMode ? (
          <DemoBanner
            onConnectPSA={() => {
              onOpenChange(false);
              onConnectionInvalid?.("Connect HaloPSA to import your live tickets.");
            }}
          />
        ) : null}
        {error ? (
          /No projects found/i.test(error) ? (
            <div
              className="rounded-[var(--radius-lg)] border p-5"
              style={{
                background: "rgba(186,117,23,0.05)",
                borderColor: "rgba(186,117,23,0.2)",
              }}
            >
              <div className="inline-flex items-center gap-2 text-[#BA7517]">
                <AlertTriangle className="size-4" />
                <p className="text-[14px] font-semibold">No projects found</p>
              </div>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                This is usually caused by missing TicketType or Tickets read permissions on your HaloPSA API application.
              </p>
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-[13px] text-[var(--text-secondary)]">
                <li>Go to Configuration → Integrations → Halo API in HaloPSA</li>
                <li>Click View Applications → your Handover app</li>
                <li>Go to Permissions tab</li>
                <li>Tick read:tickettype and read:tickets and click Save</li>
                <li>Come back and try importing again</li>
              </ol>
              <Link
                href="/integrations/halopsa"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-[13px] text-[var(--accent)] hover:underline"
              >
                View full setup guide →
              </Link>
              <div className="mt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void fetchItems()}
                >
                  Try again
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-[var(--radius)] border border-[var(--danger)]/35 bg-[var(--danger)]/8 px-3 py-2 text-sm text-[var(--danger)]">
              <span className="inline-flex items-center gap-2">
                <AlertTriangle className="size-4" /> {error}
              </span>
            </div>
          )
        ) : null}
        {loading && fetchProgressText ? (
          <div>
            <p className="text-xs text-[var(--text-secondary)]">{fetchProgressText}</p>
            <div className="mt-1 h-1 rounded-full bg-[var(--bg-secondary)]">
              <div className="h-1 rounded-full bg-[var(--accent)] transition-all duration-300" style={{ width: `${fetchProgress}%` }} />
            </div>
          </div>
        ) : null}

        <div className="space-y-5">
          {step === 1 ? (
            <>
              <div className="inline-flex rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] p-1">
                {(["tickets", "projects"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setImportMode(m)}
                    className={`rounded-full border px-6 py-2 text-[14px] font-medium ${
                      importMode === m
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : "border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {m === "tickets" ? "Tickets" : "Projects"}
                  </button>
                ))}
              </div>

              <section>
                <div className="mb-3">
                  <label className="mb-1 block text-[12px] text-[var(--text-secondary)]">
                    Filter by keyword or project name (optional)
                  </label>
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder={'e.g. "Migration project" or "firewall"'}
                    className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  />
                </div>
                <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Which client?</h3>
                <p className="mt-1 text-[14px] text-[var(--text-secondary)]">
                  Select one or more clients to load their {importMode === "tickets" ? "tickets" : "projects"}
                </p>
                <Input
                  id="halo-client-search"
                  className="mt-4 h-10 w-full rounded-[var(--radius)] border-[var(--border)] text-[14px]"
                  placeholder="Search clients..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  aria-label="Search clients"
                  autoComplete="off"
                  disabled={clientsLoading}
                />
                {clientsLoading ? (
                  <p className="mt-2 text-[12px] text-[var(--text-muted)]">Loading clients…</p>
                ) : importMode === "tickets" ? (
                  <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                    {countsLoading && clients.length > 0
                      ? "Loading ticket counts for this period…"
                      : `Showing ${displayClientsStep1.length} clients with open tickets in the selected period`}
                  </p>
                ) : (
                  <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                    {countsLoading && clients.length > 0
                      ? "Loading project counts for this period…"
                      : `Showing ${displayClientsStep1.length} clients with active projects in the selected period`}
                  </p>
                )}

                {clientsLoading ? (
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-[76px] animate-pulse rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)]"
                        aria-hidden
                      />
                    ))}
                  </div>
                ) : null}

                {!clientsLoading ? (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={toggleAllClients}
                    className={cn(
                      "relative md:col-span-2 text-left transition-all duration-[150ms] ease-in-out",
                      "rounded-[var(--radius)] border",
                      allClientsSelected
                        ? "border-[var(--accent)] bg-[rgba(56,189,248,0.06)]"
                        : "border-[var(--border)] bg-[rgba(56,189,248,0.03)] hover:border-[rgba(56,189,248,0.4)]",
                    )}
                    style={{
                      padding: "12px 16px",
                      borderWidth: allClientsSelected ? "1.5px" : "1px",
                    }}
                  >
                    {allClientsSelected ? (
                      <span
                        className="absolute top-3 right-3 flex size-4 items-center justify-center rounded-full bg-[var(--accent)] text-white"
                        aria-hidden
                      >
                        <Check className="size-2.5" strokeWidth={3} />
                      </span>
                    ) : null}
                    <div className="flex gap-3 pr-8">
                      <Globe className="size-5 shrink-0 text-[var(--accent)]" aria-hidden />
                      <div>
                        <p className="text-[14px] font-semibold text-[var(--text-primary)]">All clients</p>
                        <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                          {importMode === "tickets"
                            ? `Pull tickets from all ${clientsWithOpenTicketsCount} clients with open tickets`
                            : `Pull projects from all ${clientsWithActiveProjectsCount} clients with active projects`}
                        </p>
                      </div>
                    </div>
                  </button>

                  {importMode === "tickets" && allClientsSelected && !countsLoading ? (
                    <>
                      <div
                        className="md:col-span-2"
                        style={{
                          marginTop: "8px",
                          padding: "8px 12px",
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius)",
                          fontSize: "12px",
                          color: "var(--text-muted)",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                          <path
                            d="M12 8v4m0 4h.01"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                        <span>
                          {`${allClientsFetchTotalTickets} tickets across ${clientsWithTickets.length} clients will be fetched for this time period`}
                        </span>
                      </div>
                      <p className="md:col-span-2 rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-[13px] text-[var(--text-secondary)]">
                        Tip: For best results, generate one client at a time
                      </p>
                      {allClientsFetchTotalTickets > 50 ? (
                        <div
                          className="md:col-span-2"
                          style={{
                            marginTop: "8px",
                            fontSize: "12px",
                            color: "#BA7517",
                          }}
                        >
                          Fetching many tickets may take longer and use more of your character limit.
                          Consider selecting specific clients instead.
                        </div>
                      ) : null}
                    </>
                  ) : null}

                  {importMode === "projects" && allClientsSelected && !countsLoading ? (
                    <>
                      <div
                        className="md:col-span-2"
                        style={{
                          marginTop: "8px",
                          padding: "8px 12px",
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius)",
                          fontSize: "12px",
                          color: "var(--text-muted)",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                          <path
                            d="M12 8v4m0 4h.01"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                        <span>
                          {`${allClientsFetchTotalProjects} projects across ${clientsWithProjects.length} clients will be fetched for this time period`}
                        </span>
                      </div>
                      <p className="md:col-span-2 rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-[13px] text-[var(--text-secondary)]">
                        Tip: For best results, generate one client at a time
                      </p>
                      {allClientsFetchTotalProjects > 50 ? (
                        <div
                          className="md:col-span-2"
                          style={{
                            marginTop: "8px",
                            fontSize: "12px",
                            color: "#BA7517",
                          }}
                        >
                          Fetching many projects may take longer and use more of your character limit.
                          Consider selecting specific clients instead.
                        </div>
                      ) : null}
                    </>
                  ) : null}

                  {displayClientsStep1.map((c) => {
                    const selected = !allClientsSelected && isClientPicked(c.id);
                    const cnt = clientOpenCounts[String(c.id)];
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => togglePickedClient(c)}
                        className={cn(
                          "relative rounded-[var(--radius)] text-left transition-all duration-[150ms] ease-in-out",
                          "cursor-pointer border bg-[var(--bg-primary)]",
                          selected
                            ? "border-[var(--accent)] bg-[rgba(56,189,248,0.05)]"
                            : "border-[var(--border)] hover:border-[rgba(56,189,248,0.4)]",
                        )}
                        style={{
                          padding: "12px 16px",
                          borderWidth: selected ? "1.5px" : "1px",
                        }}
                      >
                        {selected ? (
                          <span
                            className="absolute top-3 right-3 flex size-4 items-center justify-center rounded-full bg-[var(--accent)] text-white"
                            aria-hidden
                          >
                            <Check className="size-2.5" strokeWidth={3} />
                          </span>
                        ) : null}
                        <div className="flex items-start justify-between gap-2 pr-7">
                          <p className="min-w-0 text-[14px] font-medium text-[var(--text-primary)]">{c.name}</p>
                          <span
                            className="shrink-0 rounded-full py-0.5 text-[11px] text-[var(--text-muted)]"
                            style={{
                              background: "var(--bg-secondary)",
                              padding: "2px 8px",
                            }}
                          >
                            {countsLoading
                              ? "…"
                              : cnt !== undefined
                                ? importMode === "tickets"
                                  ? `${cnt} open ticket${cnt === 1 ? "" : "s"}`
                                  : `${cnt} open project${cnt === 1 ? "" : "s"}`
                                : " - "}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                ) : null}

                {forceDemoMode && importMode === "tickets" && tickets.length > 0 ? (
                  <div className="mt-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)]/40 p-3">
                    <p className="text-[12px] font-semibold text-[var(--text-primary)]">
                      Sample open tickets ({tickets.length})
                    </p>
                    <ul className="mt-2 max-h-none space-y-2 overflow-visible md:max-h-48 md:overflow-y-auto">
                      {tickets.map((t) => (
                        <li key={String(t.id)} className="text-[12px] leading-snug text-[var(--text-secondary)]">
                          <span className="font-medium text-[var(--text-primary)]">
                            {t.summary ?? `Ticket ${t.id}`}
                          </span>
                          <span className="text-[var(--text-muted)]">
                            {" "}
                            · {t.client?.name ?? "Unknown"} · {t.status?.name ?? "Open"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <button
                type="button"
                className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-colors duration-200 mb-4"
                onClick={() => {
                  if (demoMode && !forceDemoMode) exitDemoMode();
                  if (forceDemoMode) applyDemoTicketsToModal();
                  setStep(1);
                  setStep2HiddenClientsCount(0);
                  setSelectedIds([]);
                }}
              >
                <ChevronLeft size={16} />
                Back
              </button>
              <input
                type="text"
                placeholder={importMode === "tickets" ? "Search tickets..." : "Search projects..."}
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                autoComplete="off"
                aria-label={importMode === "tickets" ? "Search tickets" : "Search projects"}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  marginBottom: "12px",
                  outline: "none",
                }}
              />
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[13px] text-[var(--text-muted)]">
                    {importMode === "tickets" ? (
                      <>
                        {step2Totals.ticketCount} tickets found across {step2Totals.clientCount} clients
                      </>
                    ) : (
                      <>{step2Totals.ticketCount} projects found</>
                    )}
                  </p>
                  {step2HiddenClientsCount > 0 ? (
                    <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                      {step2HiddenClientsCount} client
                      {step2HiddenClientsCount === 1 ? "" : "s"} had no open{" "}
                      {importMode === "tickets" ? "tickets" : "projects"} and{" "}
                      {step2HiddenClientsCount === 1 ? "was" : "were"} hidden
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="shrink-0 text-[13px] font-medium text-[var(--accent)] hover:underline"
                  onClick={allVisibleSelected ? deselectAllVisible : selectAllVisible}
                >
                  {allVisibleSelected ? "Deselect all" : "Select all"}
                </button>
              </div>

              <div className="space-y-6">
                {groupedForStep2.length === 0 ? (
                  <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-6 text-center text-sm text-[var(--text-muted)]">
                    {importMode === "tickets" ? "No open tickets found." : "No active projects found."}
                  </div>
                ) : null}
                {groupedForStep2.map(([clientName, items]) => {
                  const gAll = allGroupSelected(items);
                  return (
                  <div key={clientName || "_single"} className="space-y-2">
                    <div className="flex items-baseline justify-between gap-2 border-b border-[var(--border)] pb-2">
                      <div className="min-w-0">
                        <p
                          className="text-[13px] font-semibold uppercase tracking-[0.05em] text-[var(--text-secondary)]"
                        >
                          {clientName || "Unknown client"}
                        </p>
                        <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                          {items.length} {importMode === "tickets" ? "tickets" : "projects"}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 text-[13px] font-medium text-[var(--accent)] hover:underline"
                        onClick={() => (gAll ? deselectAllInGroup(items) : selectAllInGroup(items))}
                      >
                        {gAll ? "Deselect all" : "Select all"}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {items.map((item) => {
                        const isTicket = importMode === "tickets";
                        const isProjectMode = importMode === "projects";
                        const t = item as HaloTicket;
                        const p = item as HaloProject;
                        const title = isTicket ? t.summary : p.name;
                        const statusName = isTicket ? t.status?.name : p.status?.name ?? "Unknown";
                        const owner = isTicket
                          ? t.agent?.name ?? "Unassigned"
                          : p.projectmanager?.name ?? "Unassigned";
                        const priority = isTicket ? t.priority?.name ?? "None" : null;
                        const selected = selectedIds.includes(item.id);
                        const notes = item.notes ?? [];
                        const allNotesOn = allNotesSelectedForTicket(item);
                        const projectDescription =
                          !isTicket && typeof p.description === "string" && p.description.trim()
                            ? p.description.trim()
                            : "";
                        const projectTasks =
                          !isTicket &&
                          Array.isArray((p as unknown as { tasks?: unknown[] }).tasks)
                            ? (((p as unknown as { tasks?: unknown[] }).tasks ?? []) as Array<{
                                name?: string | null;
                                summary?: string | null;
                              }>)
                            : [];
                        const ticketKindStyle =
                          isTicket
                            ? projectVsTicketBadgeStyle(isProjectMode || Boolean(t.is_project))
                            : undefined;

                        return (
                          <div
                            key={item.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleItemSelected(item.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                toggleItemSelected(item.id);
                              }
                            }}
                            className={cn(
                              "rounded-[var(--radius)] border p-3 shadow-[0_1px_0_rgba(15,23,42,0.04)] transition-colors",
                              "cursor-pointer",
                              selected
                                ? "border-[rgba(56,189,248,0.3)]"
                                : "border-[var(--border)] bg-[var(--bg-primary)]",
                            )}
                            style={
                              selected
                                ? {
                                    background: "rgba(56,189,248,0.04)",
                                    borderColor: "rgba(56,189,248,0.3)",
                                  }
                                : { background: "var(--bg-primary)" }
                            }
                          >
                            <div className="flex items-start gap-3">
                              <span
                                className="mt-0.5 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                              >
                                <Checkbox
                                  checked={selected}
                                  onCheckedChange={() => toggleItemSelected(item.id)}
                                  aria-label={`Select ${title}`}
                                />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-[14px] font-medium leading-snug text-[var(--text-primary)]">
                                  {title}
                                </p>
                                {isTicket ? (
                                  <>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-[var(--text-secondary)]">
                                      <span className="rounded-full bg-[var(--bg-secondary)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-primary)]">
                                        {statusName}
                                      </span>
                                      {isTicket ? (
                                        <span
                                          className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                                          style={ticketKindStyle}
                                        >
                                          {isProjectMode || t.is_project ? "Project" : "Ticket"}
                                        </span>
                                      ) : null}
                                      {isProjectMode && hasLoggedWork(t.timetaken) ? (
                                        <span className="rounded-full bg-[rgba(139,92,246,0.1)] px-2 py-0.5 text-[11px] font-medium text-[#8b5cf6]">
                                          Time: {formatLoggedHours(t.timetaken)}
                                        </span>
                                      ) : null}
                                      {psaConnections.multiple ? (
                                        <span className="rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                                          HaloPSA
                                        </span>
                                      ) : null}
                                      <span>
                                        {owner}
                                        {priority != null ? ` · ${priority}` : ""}
                                      </span>
                                      {isTestTicket(t.summary) ? (
                                        <span className="rounded-full bg-[var(--bg-secondary)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                                          Test
                                        </span>
                                      ) : null}
                                      {isAutomatedTicket(t.summary) ? (
                                        <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-200">
                                          Auto
                                        </span>
                                      ) : null}
                                      {t.flagged ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] text-red-600">
                                          <Flag className="size-3.5" /> Flagged
                                        </span>
                                      ) : null}
                                    </div>
                                    <button
                                      type="button"
                                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)]"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleExpanded(item.id);
                                      }}
                                    >
                                      {expandedIds.includes(item.id) ? (
                                        <ChevronDown className="size-3.5" />
                                      ) : (
                                        <ChevronRight className="size-3.5" />
                                      )}
                                      Show notes ({notes.length})
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-[var(--text-secondary)]">
                                      <span className="rounded-full bg-[var(--bg-secondary)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-primary)]">
                                        {statusName}
                                      </span>
                                    </div>
                                    <p className="mt-1.5 text-[13px] text-[var(--text-secondary)]">
                                      {p.client?.name ?? "Unknown client"}
                                    </p>
                                    <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                                      {[
                                        p.targetdate ? `Target: ${p.targetdate}` : null,
                                        `Manager: ${owner}`,
                                      ]
                                        .filter(Boolean)
                                        .join(" · ")}
                                    </p>
                                    {p.completionpercent != null ? (
                                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                                        Progress: {p.completionpercent}%
                                      </p>
                                    ) : null}
                                    {projectDescription || notes.length > 0 || projectTasks.length > 0 ? (
                                      <button
                                        type="button"
                                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)]"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleExpanded(item.id);
                                        }}
                                      >
                                        {expandedIds.includes(item.id) ? (
                                          <ChevronDown className="size-3.5" />
                                        ) : (
                                          <ChevronRight className="size-3.5" />
                                        )}
                                        Show project details
                                      </button>
                                    ) : null}
                                  </>
                                )}
                              </div>
                            </div>
                            {isTicket && expandedIds.includes(item.id) ? (
                              <div
                                className="mt-2 space-y-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] p-2"
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                              >
                                {notes.length === 0 ? (
                                  <p className="text-xs text-[var(--text-muted)]">No notes found.</p>
                                ) : (
                                  <>
                                    <div className="flex items-center justify-between gap-2 px-1">
                                      <span className="text-[13px] font-medium text-[var(--text-primary)]">
                                        Notes ({notes.length})
                                      </span>
                                      <button
                                        type="button"
                                        className="cursor-pointer text-[12px] font-medium text-[var(--accent)] hover:underline"
                                        onClick={() =>
                                          setAllNotesForTicket(item.id, !allNotesOn)
                                        }
                                      >
                                        {allNotesOn ? "Deselect all notes" : "Select all notes"}
                                      </button>
                                    </div>
                                    {notes.map((n) => {
                                      const k = noteKey(n as HaloNote);
                                      const checked = selectedNotes[String(item.id)]?.[k] ?? false;
                                      return (
                                        <div
                                          key={k}
                                          role="button"
                                          tabIndex={0}
                                          className="block cursor-pointer rounded border p-2 text-[13px] transition-colors"
                                          style={{
                                            borderColor: "var(--border)",
                                            background: checked
                                              ? "rgba(56,189,248,0.04)"
                                              : "var(--bg-primary)",
                                          }}
                                          onClick={() =>
                                            setSelectedNotes((prev) => ({
                                              ...prev,
                                              [String(item.id)]: {
                                                ...(prev[String(item.id)] ?? {}),
                                                [k]: !checked,
                                              },
                                            }))
                                          }
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                              e.preventDefault();
                                              setSelectedNotes((prev) => ({
                                                ...prev,
                                                [String(item.id)]: {
                                                  ...(prev[String(item.id)] ?? {}),
                                                  [k]: !checked,
                                                },
                                              }));
                                            }
                                          }}
                                        >
                                          <div className="flex items-start gap-2">
                                            <span
                                              className="mt-0.5 shrink-0"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <Checkbox
                                                checked={checked}
                                                onCheckedChange={(v) =>
                                                  setSelectedNotes((prev) => ({
                                                    ...prev,
                                                    [String(item.id)]: {
                                                      ...(prev[String(item.id)] ?? {}),
                                                      [k]: Boolean(v),
                                                    },
                                                  }))
                                                }
                                                aria-label="Include note"
                                              />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                              <p className="line-clamp-2 text-[13px] text-[var(--text-primary)]">
                                                {noteText(n as HaloNote) || " - "}
                                              </p>
                                              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                                                {noteAuthor(n as HaloNote)} · {noteDate(n as HaloNote)}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </>
                                )}
                              </div>
                            ) : null}
                            {!isTicket && expandedIds.includes(item.id) ? (
                              <div
                                className="mt-2 space-y-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] p-3"
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                              >
                                <div>
                                  <p className="mb-1 text-[12px] font-medium text-[var(--text-primary)]">
                                    Description
                                  </p>
                                  {projectDescription ? (
                                    <p className="whitespace-pre-wrap text-[13px] text-[var(--text-primary)]">
                                      {projectDescription}
                                    </p>
                                  ) : (
                                    <p className="text-xs text-[var(--text-muted)]">No project description.</p>
                                  )}
                                </div>
                                <div>
                                  <p className="mb-1 text-[12px] font-medium text-[var(--text-primary)]">
                                    Project notes
                                  </p>
                                  {notes.length > 0 ? (
                                    <>
                                      <div className="flex items-center justify-between gap-2 px-1">
                                        <span className="text-[13px] font-medium text-[var(--text-primary)]">
                                          Notes ({notes.length})
                                        </span>
                                        <button
                                          type="button"
                                          className="cursor-pointer text-[12px] font-medium text-[var(--accent)] hover:underline"
                                          onClick={() =>
                                            setAllNotesForTicket(item.id, !allNotesOn)
                                          }
                                        >
                                          {allNotesOn ? "Deselect all notes" : "Select all notes"}
                                        </button>
                                      </div>
                                      <div className="space-y-2">
                                        {notes.map((n) => {
                                          const k = noteKey(n as HaloNote);
                                          const checked = selectedNotes[String(item.id)]?.[k] ?? false;
                                          return (
                                            <div
                                              key={k}
                                              role="button"
                                              tabIndex={0}
                                              className="block cursor-pointer rounded border p-2 text-[13px] transition-colors"
                                              style={{
                                                borderColor: "var(--border)",
                                                background: checked
                                                  ? "rgba(56,189,248,0.04)"
                                                  : "var(--bg-primary)",
                                              }}
                                              onClick={() =>
                                                {
                                                  const nextChecked = !checked;
                                                  setSelectedNotes((prev) => ({
                                                    ...prev,
                                                    [String(item.id)]: {
                                                      ...(prev[String(item.id)] ?? {}),
                                                      [k]: nextChecked,
                                                    },
                                                  }));
                                                  if (nextChecked) {
                                                    setSelectedIds((prev) =>
                                                      prev.includes(item.id) ? prev : [...prev, item.id],
                                                    );
                                                  }
                                                }
                                              }
                                              onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                  e.preventDefault();
                                                  setSelectedNotes((prev) => ({
                                                    ...prev,
                                                    [String(item.id)]: {
                                                      ...(prev[String(item.id)] ?? {}),
                                                      [k]: !checked,
                                                    },
                                                  }));
                                                  if (!checked) {
                                                    setSelectedIds((prev) =>
                                                      prev.includes(item.id) ? prev : [...prev, item.id],
                                                    );
                                                  }
                                                }
                                              }}
                                            >
                                              <div className="flex items-start gap-2">
                                                <span
                                                  className="mt-0.5 shrink-0"
                                                  onClick={(e) => e.stopPropagation()}
                                                >
                                                  <Checkbox
                                                    checked={checked}
                                                    onCheckedChange={(v) =>
                                                      {
                                                        const isChecked = Boolean(v);
                                                        setSelectedNotes((prev) => ({
                                                          ...prev,
                                                          [String(item.id)]: {
                                                            ...(prev[String(item.id)] ?? {}),
                                                            [k]: isChecked,
                                                          },
                                                        }));
                                                        if (isChecked) {
                                                          setSelectedIds((prev) =>
                                                            prev.includes(item.id) ? prev : [...prev, item.id],
                                                          );
                                                        }
                                                      }
                                                    }
                                                    aria-label="Include note"
                                                  />
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                  <p className="line-clamp-2 text-[13px] text-[var(--text-primary)]">
                                                    {noteText(n as HaloNote) || " - "}
                                                  </p>
                                                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                                                    {noteAuthor(n as HaloNote)} · {noteDate(n as HaloNote)}
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </>
                                  ) : (
                                    <p className="text-xs text-[var(--text-muted)]">No project notes.</p>
                                  )}
                                </div>
                                <div>
                                  <p className="mb-1 text-[12px] font-medium text-[var(--text-primary)]">
                                    Project tickets/tasks
                                  </p>
                                  {projectTasks.length > 0 ? (
                                    <div className="space-y-1.5">
                                      {projectTasks.map((task, idx) => (
                                        <p key={`${task.name ?? "task"}-${idx}`} className="text-[12px] text-[var(--text-secondary)]">
                                          {task.summary || task.name || "Untitled task"}
                                        </p>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-[var(--text-muted)]">No project tickets.</p>
                                  )}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  );
                })}
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <div className="flex flex-1 flex-col space-y-3">
              <p className="text-[15px] font-semibold text-[var(--text-primary)]">Review and generate</p>
              <div className="space-y-1.5 text-[14px] text-[var(--text-secondary)]">
                <p>
                  <span className="text-[var(--text-muted)]">Generating for: </span>
                  {generatingForLabel}
                </p>
                <p>
                  <span className="text-[var(--text-muted)]">Tickets: </span>
                  {`${selectedTicketCount} selected`}
                </p>
                <p>
                  <span className="text-[var(--text-muted)]">Projects: </span>
                  {`${selectedProjectCount} selected`}
                </p>
                <p>
                  <span className="text-[var(--text-muted)]">Notes: </span>
                  {selectedNotesCount} selected
                </p>
                <p>
                  <span className="text-[var(--text-muted)]">Scope: </span>
                  All open {importMode === "tickets" ? "tickets" : "projects"}
                </p>
              </div>
              {step3PreviewLabels.length > 0 ? (
                <div className="mt-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)]/40 px-3 py-3">
                  <p className="text-[12px] font-medium text-[var(--text-muted)]">
                    {importMode === "tickets" ? "Tickets to import" : "Projects to import"}
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {step3PreviewLabels.map((item) => (
                      <li
                        key={item.id}
                        className="truncate text-[13px] text-[var(--text-secondary)]"
                        title={item.label}
                      >
                        {item.label}
                      </li>
                    ))}
                  </ul>
                  {step3PreviewOverflow > 0 ? (
                    <p className="mt-2 text-[12px] text-[var(--text-muted)]">
                      +{step3PreviewOverflow} more selected
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        </div>

        <div className="sticky bottom-0 z-10 shrink-0 border-t border-[var(--border)] bg-[var(--bg-primary)] p-4">
          {step === 1 ? (
            <div className="space-y-2">
              {fetchSummaryLine ? (
                <p className="text-center text-[12px] text-[var(--text-muted)]">{fetchSummaryLine}</p>
              ) : null}
              <Button
                type="button"
                className="h-11 w-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                onClick={() => void fetchItems()}
                disabled={loading || !canFetchStep1}
              >
                {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                {importMode === "tickets" ? "Fetch tickets →" : "Fetch projects →"}
              </Button>
              {!forceDemoMode ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full"
                  onClick={() => {
                    void (async () => {
                      await invalidatePsaCache();
                      await refreshCachedPsaData();
                    })();
                  }}
                >
                  <RefreshCw className="mr-2 size-4" />
                  Refresh cached PSA data
                </Button>
              ) : null}
              {!forceDemoMode ? (
                <button
                  type="button"
                  className="w-full text-center text-xs text-[var(--text-muted)]"
                  onClick={loadDemoData}
                >
                  No HaloPSA account? Load demo data →
                </button>
              ) : null}
            </div>
          ) : null}
          {step === 2 ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] text-[var(--text-muted)]">
                {selectedTicketCount} tickets and {selectedProjectCount} projects selected, {selectedNotesCount} notes selected
              </p>
              <Button
                type="button"
                className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                onClick={() => setStep(3)}
                disabled={selectedCount === 0}
              >
                Continue →
              </Button>
            </div>
          ) : null}
          {step === 3 ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button type="button" className="h-11 bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]" onClick={importSelected}>
                Import to Handover →
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
