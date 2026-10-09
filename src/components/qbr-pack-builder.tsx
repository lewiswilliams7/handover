"use client";

import React, { useEffect, useMemo, useState } from "react";
import JSZip from "jszip";
import * as XLSX from "xlsx-js-style";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Brain, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/toasts";
import { PSAEmptyState } from "@/components/psa-empty-state";
import { DemoBanner } from "@/components/demo-banner";
import { usePSAStatus } from "@/hooks/usePSAStatus";
import {
  applySectionValidationToToggles,
  buildQbrValidationSnapshot,
  countSectionsAvailable,
  haloStatusNameLooksResolved,
  QBR_DATA_DRIVEN_SECTION_IDS,
  QBR_SECTION_LABELS,
  type QbrValidationSnapshot,
  ticketCountsAsResolved,
} from "@/lib/qbr-validation";
import { generateQbrPdf } from "@/lib/qbr-pdf-generate";
import { useCwProjects, useCwTickets, useHaloProjects, useHaloTickets } from "@/lib/psa-cache";
import { DEMO_CLIENTS, DEMO_PROJECTS, DEMO_TICKETS } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

type HaloNoteLike = {
  note?: string | null;
  text?: string | null;
  details?: string | null;
  description?: string | null;
  body?: string | null;
};

type TicketRow = {
  id: number;
  summary?: string | null;
  status?: { name?: string | null } | null;
  /** HaloPSA ticket status id when present (for status catalogue matching). */
  status_id?: number | null;
  priority?: { name?: string | null } | null;
  dateoccurred?: string | null;
  timetaken?: number | null;
  source?: "halopsa" | "connectwise";
  category?: string | null;
  ticket_type_name?: string | null;
  tickettype?: { name?: string | null } | null;
  category_1?: string | null;
  category_2?: string | null;
  cwType?: string | null;
  cwSubType?: string | null;
  notes?: HaloNoteLike[] | null;
  actions?: HaloNoteLike[] | null;
  /** ConnectWise / Halo target or due date — used for SLA target validation. */
  targetdate?: string | null;
  slaTargetSet?: boolean;
};

type ProjectRow = {
  id: number;
  name?: string | null;
  status?: { name?: string | null } | null;
  completionpercent?: number | null;
  tasks?: Array<unknown> | null;
  source?: "halopsa" | "connectwise";
};

function sanitiseProjectName(name: string | null | undefined, id: string | number): string {
  const raw = String(name ?? "").trim();
  if (/^child ticket of id/i.test(raw)) {
    return `Untitled Project - Ref ${id}`;
  }
  return raw || `Project ${id}`;
}

/** Stable PSA client identity for filtering and prompts — never match on display name alone. */
function qbrPsaClientKey(row: {
  source?: unknown;
  clientId?: unknown;
  client_id?: unknown;
  /** ConnectWise list/detail payloads use company id on tickets and projects. */
  companyId?: unknown;
}): string | null {
  const isCw = row.source === "connectwise";
  const rawId = isCw ? (row.clientId ?? row.client_id ?? row.companyId) : (row.clientId ?? row.client_id);
  if (rawId === null || rawId === undefined || rawId === "") return null;
  const src = isCw ? "connectwise" : "halopsa";
  return `${src}:${String(rawId)}`;
}

function qbrPromptEscapeDisplayName(name: string): string {
  return name.replace(/\\/g, "\\\\").replace(/"/g, "'");
}

function qbrResolveClientDisplayName(
  clientKey: string,
  sampleTicketOrProject: TicketRow | ProjectRow | undefined,
  availableClients: Array<{ name: string; id: number | string; source: "halopsa" | "connectwise" }>,
): string {
  const hit = availableClients.find((c) => `${c.source}:${String(c.id)}` === clientKey);
  if (hit?.name?.trim()) return hit.name.trim();
  const rec = sampleTicketOrProject as Record<string, unknown> | undefined;
  const nested = rec?.client as { name?: unknown } | undefined;
  const n =
    (typeof nested?.name === "string" && nested.name) ||
    (typeof rec?.client_name === "string" && rec.client_name) ||
    "";
  return typeof n === "string" && n.trim() ? n.trim() : clientKey;
}

type QbrSections = {
  executiveSummary: boolean;
  ticketVolume: boolean;
  resolutionPerformance: boolean;
  ticketBreakdown: boolean;
  openVsClosed: boolean;
  projectStatus: boolean;
  slaPerformance: boolean;
  risksActions: boolean;
  nextSteps: boolean;
  recurringIssues: boolean;
  periodComparison: boolean;
  firstContactResolution: boolean;
};

type GeneratedQbr = {
  generatedAt: string;
  dateRangeLabel: string;
  /** End of the reporting period (YYYY-MM-DD), aligned with PSA fetch `toIso`. */
  periodEndDate?: string;
  brandName: string;
  brandColor: string;
  brandLogoUrl?: string | null;
  tickets: TicketRow[];
  projects: ProjectRow[];
  weeklyCounts: Array<{ week: string; count: number }>;
  resolutionByPriority: Array<{ key: "P1" | "P2" | "P3"; priority: string; avgHours: number; ticketCount: number }>;
  ticketBreakdown: Array<{ name: string; value: number }>;
  ticketBreakdownMode: "type_category" | "status";
  ticketBreakdownNote: string | null;
  openVsClosed: { raised: number; resolved: number; open: number; resolvedPct: number };
  projectRows: Array<{ name: string; percent: number; rag: "Red" | "Amber" | "Green"; owner?: string; nextAction?: string }>;
  slaCompliancePct: number | null;
  executiveSummary: string;
  risks: Array<{ risk: string; impact: string; mitigation: string }>;
  actions: Array<{ task: string; suggested_owner?: string | null; priority?: string | null }>;
  recommendations: string;
  recommendationItems: Array<{
    action: string;
    owner: string;
    target: string;
    riskAddressed: string;
  }>;
  execPullQuote: string;
  recurringIssues: {
    rows: Array<{ name: string; count: number; pct: number }>;
    topInsight: string;
  };
  periodComparison: {
    current: { volume: number; resolutionPct: number; avgResolutionHrs: number };
    previous: { volume: number; resolutionPct: number; avgResolutionHrs: number };
    trendLine: string;
  };
  firstContactResolution: {
    pct: number;
    resolvedEvaluated: number;
    fcrCount: number;
    benchmarkNote: string;
  };
  includedSections: QbrSections;
  /** Sections the user wanted but were dropped at generation for insufficient data. */
  autoExcludedSectionLabels?: string[];
};

const DEFAULT_SECTIONS: QbrSections = {
  executiveSummary: true,
  ticketVolume: true,
  resolutionPerformance: true,
  ticketBreakdown: true,
  openVsClosed: true,
  projectStatus: true,
  slaPerformance: true,
  risksActions: true,
  nextSteps: true,
  recurringIssues: true,
  periodComparison: true,
  firstContactResolution: true,
};

const QBR_CHART_PALETTE = [
  "#5BA8FF",
  "#0F1C3F",
  "#B79268",
  "#4E9C6F",
  "#C8553D",
  "#D9A441",
] as const;

function chartColor(i: number): string {
  return QBR_CHART_PALETTE[i % QBR_CHART_PALETTE.length] ?? QBR_CHART_PALETTE[0];
}

const BODY_TEXT = "#1F2937";
const HEADING_NAVY = "#0F1C3F";
/** PDF capture: avoid Tailwind/CSS variables that resolve to oklab/lab in computed styles. */
const PDF_BORDER_HEX = "#E5E7EB";
const PDF_BG_SECONDARY_HEX = "#F1F5F9";
const PDF_CAPTION_GREY = "#6B7280";
const PDF_FONT_STACK = "'Inter', 'Helvetica Neue', Arial, sans-serif";

/** Normalises AI / injected copy for PDF: NBSP, ZWSP; collapses horizontal spaces; keeps newlines for pre-wrap. */
function normaliseQbrPdfText(text: string | null | undefined): string {
  let s = String(text ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/\u200B/g, "")
    .replace(/[\u200C\u200D\uFEFF]/g, "");
  s = s.replace(/[ \t\f\v]+/g, " ");
  s = s.replace(/\n[ \t]+/g, "\n");
  s = s.replace(/[ \t]+\n/g, "\n");
  return s.trim();
}

/** Shared typography for `#qbr-pdf-content` (on-screen preview). */
const QBR_PDF_H4: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: HEADING_NAVY,
  fontFamily: PDF_FONT_STACK,
  margin: "0 0 12px",
  pageBreakAfter: "avoid",
  breakAfter: "avoid",
};
const QBR_PDF_H5: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: HEADING_NAVY,
  fontFamily: PDF_FONT_STACK,
  margin: "0 0 8px",
};
const QBR_PDF_BODY: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 400,
  color: BODY_TEXT,
  fontFamily: PDF_FONT_STACK,
  lineHeight: 1.65,
};
const QBR_PDF_CAPTION: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 400,
  color: PDF_CAPTION_GREY,
  fontFamily: PDF_FONT_STACK,
};

/** On-screen PDF preview layout (export uses programmatic jsPDF in `generateQbrPdf`). */
function QbrPdfChunk({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div data-qbr-print-page className={cn(className)} style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
      {children}
    </div>
  );
}

function renderPieValueLabel(props: Record<string, unknown>) {
  const cx = Number(props.cx ?? 0);
  const cy = Number(props.cy ?? 0);
  const midAngle = Number(props.midAngle ?? 0);
  const innerRadius = Number(props.innerRadius ?? 0);
  const outerRadius = Number(props.outerRadius ?? 0);
  const percent = Number(props.percent ?? 0);
  const name = String(props.name ?? "");
  const value = Number(props.value ?? 0);
  const RAD = Math.PI / 180;
  const small = percent < 0.07;
  const ir = innerRadius + (outerRadius - innerRadius) * 0.55;
  const label = `${name}: ${Number.isFinite(value) ? value : 0}`;
  const posR = small ? outerRadius + 22 : ir;
  const x = cx + posR * Math.cos(-midAngle * RAD);
  const y = cy + posR * Math.sin(-midAngle * RAD);
  return (
    <text
      x={x}
      y={y}
      fill={BODY_TEXT}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={11}
      fontFamily={PDF_FONT_STACK}
    >
      {label}
    </text>
  );
}

const PRIORITY_LABEL: Record<"P1" | "P2" | "P3", string> = {
  P1: "Priority 1 (Critical)",
  P2: "Priority 2 (High)",
  P3: "Priority 3 (Normal)",
};

function normalizePriority(raw: string | null | undefined): "P1" | "P2" | "P3" {
  const v = String(raw ?? "").toLowerCase();
  if (v.includes("critical") || /\bp\s*1\b/.test(v)) return "P1";
  if (v.includes("high") || /\bp\s*2\b/.test(v)) return "P2";
  return "P3";
}

function noteBlob(notes: HaloNoteLike[] | null | undefined): string {
  if (!Array.isArray(notes)) return "";
  return notes
    .map((n) => `${n.note ?? ""} ${n.text ?? ""} ${n.details ?? ""} ${n.description ?? ""} ${n.body ?? ""}`)
    .join("\n")
    .toLowerCase();
}

/** HaloPSA: reassignment / escalation signals in ticket history (actions + notes). */
function haloHistorySuggestsReassignmentOrEscalation(t: TicketRow): boolean {
  const blob = `${noteBlob(t.notes as HaloNoteLike[])} ${noteBlob(t.actions as HaloNoteLike[])}`;
  if (!blob.trim()) return false;
  return (
    /\breassign(ed|ment)?\b/.test(blob) ||
    /\btransferred\b/.test(blob) ||
    /\bescalat/.test(blob) ||
    /\bowner (changed|update)/.test(blob) ||
    /\bassigned to\b/.test(blob) ||
    /\btier\s*2\b/.test(blob)
  );
}

/** ConnectWise note text: transfer / escalation. */
function cwNotesSuggestTransferOrEscalation(noteTexts: string): boolean {
  const v = noteTexts.toLowerCase();
  if (!v.trim()) return false;
  return (
    /\btransfer(r(ed|ring)?)?\b/.test(v) ||
    /\bescalat/.test(v) ||
    /\breassign/.test(v) ||
    /\btier\s*2\b/.test(v) ||
    /\brouting to\b/.test(v)
  );
}

function breakdownBucketName(t: TicketRow & Record<string, unknown>): string {
  if (t.source === "connectwise") {
    const type = String(t.cwType ?? "").trim();
    const sub = String(t.cwSubType ?? "").trim();
    const cat = typeof t.category === "string" ? t.category.trim() : "";
    if (type && sub) return `${type} - ${sub}`;
    if (cat) return cat;
    if (type) return type;
    if (sub) return sub;
  }
  const typeName =
    String(t.ticket_type_name ?? "").trim() ||
    (t.tickettype && typeof t.tickettype === "object"
      ? String((t.tickettype as { name?: string }).name ?? "").trim()
      : "");
  const c1 = String(t.category_1 ?? "").trim();
  const c2 = String(t.category_2 ?? "").trim();
  if (c1 && c2) return `${c1} - ${c2}`;
  if (c1) return c1;
  if (c2) return c2;
  if (typeName) return typeName;
  const cat = typeof t.category === "string" ? t.category.trim() : "";
  if (cat) return cat;
  return "";
}

function chunkList<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Preserve newlines; repair common fused punctuation/word glitches from model output (does not strip spaces). */
function normalizeRecommendationsText(raw: string): string {
  let s = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  s = s.replace(/([.!?:;,])([A-Za-z])/g, "$1 $2");
  return s;
}

function qbrPeriodMetrics(
  tickets: TicketRow[],
  haloResolvedStatusIds: Set<number> | null,
): { volume: number; resolutionPct: number; avgResolutionHrs: number } {
  const vol = tickets.length;
  if (vol === 0) return { volume: 0, resolutionPct: 0, avgResolutionHrs: 0 };
  let res = 0;
  let hrsSum = 0;
  let hrsN = 0;
  for (const t of tickets) {
    if (ticketCountsAsResolved(t, haloResolvedStatusIds)) {
      res += 1;
      hrsSum += Number(t.timetaken ?? 0) || 0;
      hrsN += 1;
    }
  }
  return {
    volume: vol,
    resolutionPct: Math.round((res / vol) * 100),
    avgResolutionHrs: hrsN > 0 ? Number((hrsSum / hrsN).toFixed(2)) : 0,
  };
}

async function cwNotesIndicateTransferOrEscalation(ticketId: number): Promise<boolean> {
  try {
    const res = await fetch(`/api/cw/ticket-detail?id=${ticketId}`);
    if (!res.ok) return false;
    const data = (await res.json()) as { notes?: Array<{ content?: string }> };
    const blob = (data.notes ?? []).map((n) => n.content ?? "").join("\n");
    return cwNotesSuggestTransferOrEscalation(blob);
  } catch {
    return false;
  }
}

async function batchCwTransferFlagsForTickets(ids: number[]): Promise<Map<number, boolean>> {
  const map = new Map<number, boolean>();
  const chunk = 8;
  for (let i = 0; i < ids.length; i += chunk) {
    const slice = ids.slice(i, i + chunk);
    await Promise.all(
      slice.map(async (id) => {
        const bad = await cwNotesIndicateTransferOrEscalation(id);
        map.set(id, bad);
      }),
    );
  }
  return map;
}

function startOfWeekLabel(dateIso: string): string {
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return "Unknown";
  const day = d.getDay();
  const diff = (day + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - diff);
  return monday.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

type Props = {
  hasProAccess: boolean;
  defaultBrandName: string;
  defaultBrandColor: string;
  /** Account branding logo (e.g. from profile); shown on PowerPoint when set. */
  brandLogoUrl?: string | null;
  embedded?: boolean;
  demoMode?: boolean;
  /** Plan copy for monthly QBR allowance (enforced server-side on `/api/generate`). */
  usageHint?: string | null;
  /** Optional Client Intelligence context (wired to QBR prompt in a follow-up). */
  intelligenceContext?: {
    clientName: string;
    accountNarrative: string;
    keyAchievements: string[];
    openRisks: string[];
    qbrTalkingPoints: string[];
    relationshipHealth: string;
  } | null;
};

const SECTION_UI: Record<keyof QbrSections, { label: string; description: string }> = {
  executiveSummary: { label: "Executive Summary", description: "Business-language summary of wins, challenges, and outlook." },
  ticketVolume: { label: "Ticket Volume", description: "Weekly ticket activity trend over the selected period." },
  resolutionPerformance: { label: "Resolution Performance", description: "Average resolution time split by priority band." },
  ticketBreakdown: { label: "Ticket Breakdown", description: "Category/type distribution to show support workload mix." },
  openVsClosed: { label: "Open vs Closed", description: "Raised, resolved, and open position with progress gauge." },
  projectStatus: { label: "Project Status", description: "Progress bars, RAG state, and delivery visibility by project." },
  slaPerformance: { label: "SLA Performance", description: "Compliance % gauge and service-level quality indicator." },
  risksActions: { label: "Risks and Actions", description: "Top risks and mitigations with clear action ownership." },
  nextSteps: { label: "Next Steps and Recommendations", description: "Forward-looking recommendations for the next period." },
  recurringIssues: { label: "Recurring Issues", description: "Categories that repeat often, with share of volume." },
  periodComparison: { label: "Period Comparison", description: "This period vs the same length before it: volume, resolution, and time." },
  firstContactResolution: { label: "First Contact Resolution", description: "Share of resolved tickets without reassignment or escalation in history." },
};

function safeColorHex(color: string | null | undefined, fallback = "#38bdf8"): string {
  const value = String(color ?? "").trim();
  return /^#?[0-9a-fA-F]{6}$/.test(value) ? (value.startsWith("#") ? value : `#${value}`) : fallback;
}

function colorNoHash(color: string): string {
  return safeColorHex(color).replace("#", "").toUpperCase();
}

/** PowerPoint cover: hide period when range is All time; otherwise labels are formatted dates (not presets). */
function qbrPptPeriodLine(dateRangeLabel: string): string | null {
  const t = dateRangeLabel.trim().toLowerCase();
  if (!t || t === "all time") return null;
  return `Period: ${dateRangeLabel.trim()}`;
}

function generateApiErrorMessage(data: Record<string, unknown>, fallback: string): string {
  const msg = data.message;
  if (typeof msg === "string" && msg.trim()) return msg.trim();
  const err = data.error;
  if (typeof err === "string" && err.trim()) return err.trim();
  return fallback;
}

export function QbrPackBuilder({
  hasProAccess,
  defaultBrandName,
  defaultBrandColor,
  brandLogoUrl: brandLogoUrlProp = null,
  embedded = false,
  demoMode = false,
  usageHint = null,
  intelligenceContext = null,
}: Props) {
  const toast = useToast();
  const psaStatus = usePSAStatus();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [qbr, setQbr] = useState<GeneratedQbr | null>(null);
  const [sources, setSources] = useState<{ halopsa: boolean; connectwise: boolean }>({
    halopsa: false,
    connectwise: false,
  });
  const [qbrSelectedClients, setQbrSelectedClients] = useState<string[]>([]);
  const [autoIntelligence, setAutoIntelligence] = useState<NonNullable<Props["intelligenceContext"]> | null>(
    null,
  );
  const [qbrExpandedClients, setQbrExpandedClients] = useState<Set<string>>(new Set());
  const [qbrAvailableClients, setQbrAvailableClients] = useState<
    Array<{
      name: string;
      id: number | string;
      source: "halopsa" | "connectwise";
      tickets: Array<{ id: number | string; title: string }>;
    }>
  >([]);
  const [qbrClientsLoading, setQbrClientsLoading] = useState(true);
  const [clientTickets, setClientTickets] = useState<Record<string, Array<{ id: number; title: string }>>>({});
  const [loadingTickets, setLoadingTickets] = useState<Record<string, boolean>>({});
  const [clientExpandTab, setClientExpandTab] = useState<Record<string, "tickets" | "projects">>({});
  const [clientProjects, setClientProjects] = useState<Record<string, Array<{ id: number; title: string }>>>({});
  const [loadingProjects, setLoadingProjects] = useState<Record<string, boolean>>({});
  const [selectedTicketIds, setSelectedTicketIds] = useState<Set<string>>(new Set());
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [clientSearch, setClientSearch] = useState("");
  const [dateRange, setDateRange] = useState<
    "all_time" | "last_30_days" | "last_90_days" | "last_6_months" | "last_12_months" | "custom"
  >("last_90_days");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [sections, setSections] = useState<QbrSections>(DEFAULT_SECTIONS);
  const [brandName, setBrandName] = useState(defaultBrandName);
  const [brandColor, setBrandColor] = useState(defaultBrandColor || "#38bdf8");
  const [brandLogoUrl, setBrandLogoUrl] = useState(brandLogoUrlProp?.trim() || "");
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [step3Snapshot, setStep3Snapshot] = useState<QbrValidationSnapshot | null>(null);
  const [step3Loading, setStep3Loading] = useState(false);
  const [selectionCounts, setSelectionCounts] = useState<{ tickets: number; projects: number; clients: number }>({
    tickets: 0,
    projects: 0,
    clients: 0,
  });
  const [clientsWithData, setClientsWithData] = useState<Record<string, { tickets: number; projects: number }>>({});
  const [clientsWithDataLoading, setClientsWithDataLoading] = useState(false);
  useEffect(() => {
    if (demoMode) {
      setSources({ halopsa: true, connectwise: false });
      return;
    }
    if (psaStatus.loading) return;
    setSources({
      halopsa: psaStatus.halo ?? false,
      connectwise: psaStatus.connectwise ?? false,
    });
  }, [demoMode, psaStatus.halo, psaStatus.connectwise, psaStatus.loading]);

  const noPsaConnected =
    !demoMode && !psaStatus.loading && !psaStatus.halo && !psaStatus.connectwise;

  const { data: haloTicketsCached, mutate: refreshHaloTickets } = useHaloTickets(
    sources.halopsa && !demoMode,
  );
  const { data: haloProjectsCached, mutate: refreshHaloProjects } = useHaloProjects(
    sources.halopsa && !demoMode,
  );
  const { data: cwTicketsCached, mutate: refreshCwTickets } = useCwTickets(
    sources.connectwise && !demoMode,
  );
  const { data: cwProjectsCached, mutate: refreshCwProjects } = useCwProjects(
    sources.connectwise && !demoMode,
  );

  useEffect(() => {
    const u = brandLogoUrlProp?.trim();
    if (u) setBrandLogoUrl(u);
  }, [brandLogoUrlProp]);

  useEffect(() => {
    if (demoMode) {
      const demoClients = DEMO_CLIENTS.map((c) => ({
        name: c.name,
        id: c.id,
        source: "halopsa" as const,
        tickets: [],
      }));
      setQbrAvailableClients(demoClients);
      setQbrClientsLoading(false);
      return;
    }
    if (!sources.halopsa && !sources.connectwise) {
      setQbrAvailableClients([]);
      setQbrSelectedClients([]);
      return;
    }

    let cancelled = false;

    const fetchClients = async () => {
      setQbrClientsLoading(true);
      try {
        const result: Array<{
          name: string;
          id: number | string;
          source: "halopsa" | "connectwise";
          tickets: Array<{ id: number | string; title: string }>;
        }> = [];

        if (sources.halopsa) {
          const res = await fetch("/api/halo/clients?all_pages=1&page_size=1000", {
            credentials: "same-origin",
          });
          if (res.ok) {
            const json = (await res.json()) as { clients?: Array<{ id: number; name: string }> };
            const arr = json.clients ?? [];
            arr.forEach((c) => {
              result.push({ name: c.name, id: c.id, source: "halopsa", tickets: [] });
            });
          }
        }

        if (sources.connectwise) {
          try {
            const res = await fetch('/api/cw/clients', { credentials: 'same-origin' })
            if (res.ok) {
              const json = await res.json() as { clients?: Array<{ id: number; name: string }> }
              const arr = json.clients ?? []
              arr.forEach(c => {
                result.push({ name: c.name, id: c.id, source: 'connectwise', tickets: [] })
              })
            }
          } catch (e) {
            console.error('[qbr cw clients]', e)
          }
        }

        if (!cancelled) {
          setQbrAvailableClients(result);
        }
      } catch (e) {
        console.error("[qbr fetchClients]", e);
      } finally {
        if (!cancelled) setQbrClientsLoading(false);
      }
    };

    void fetchClients();

    return () => {
      cancelled = true;
    };
  }, [demoMode, sources.halopsa, sources.connectwise]);

  const loadTicketsForClient = async (
    clientId: number | string,
    source: "halopsa" | "connectwise",
  ): Promise<Array<{ id: number; title: string }>> => {
    const key = `${source}:${String(clientId)}`
    if (clientTickets[key]) return clientTickets[key] ?? []
    if (loadingTickets[key]) return []
    setLoadingTickets(prev => ({ ...prev, [key]: true }))
    try {
      let tickets: Array<{ id: number; title: string }> = []
      if (demoMode) {
        const selectedClientName =
          qbrAvailableClients.find(
            (c) => String(c.id) === String(clientId) && c.source === source,
          )?.name ?? "";
        tickets = DEMO_TICKETS.filter((t) => t.client.name === selectedClientName).map((t) => ({
          id: Number(String(t.id).replace(/\D/g, "")) || 0,
          title: t.summary || String(t.id),
        }));
      } else if (source === "halopsa") {
        const res = await fetch("/api/halo/tickets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ type: "tickets", clientId, count: 200, includeDetails: false }),
        })
        if (res.ok) {
          const data = await res.json() as { tickets?: Array<{ id: number; summary?: string }> }
          tickets = (data.tickets ?? []).map(t => ({ id: t.id, title: t.summary || String(t.id) }))
        } else {
          let errMsg = `Failed to load tickets (${res.status})`
          try {
            const errData = await res.json() as { error?: string }
            if (errData.error) errMsg = errData.error
          } catch {}
          console.error("[loadTickets] API error:", errMsg)
          throw new Error(errMsg)
        }
      } else {
        const res = await fetch(`/api/cw/tickets?companyId=${clientId}&count=200`, {
          credentials: "same-origin",
        })
        if (res.ok) {
          const data = await res.json() as { tickets?: Array<{ id: number; title?: string; summary?: string }> } | Array<{ id: number; title?: string; summary?: string }>
          const arr = Array.isArray(data) ? data : (data.tickets ?? [])
          tickets = arr.map(t => ({ id: t.id, title: t.title || t.summary || String(t.id) }))
        }
      }
      setClientTickets(prev => ({ ...prev, [key]: tickets }))
      return tickets
    } catch (e) {
      console.error("[loadTickets]", e)
      toast({ message: e instanceof Error ? e.message : "Failed to load tickets", variant: "error" })
      return []
    } finally {
      setLoadingTickets(prev => ({ ...prev, [key]: false }))
    }
  };

  const loadProjectsForClient = async (
    clientId: number | string,
    source: "halopsa" | "connectwise",
  ): Promise<Array<{ id: number; title: string }>> => {
    const key = `${source}:${String(clientId)}`
    if (clientProjects[key]) return clientProjects[key] ?? []
    if (loadingProjects[key]) return []
    setLoadingProjects(prev => ({ ...prev, [key]: true }))
    try {
      let projects: Array<{ id: number; title: string }> = []
      if (demoMode) {
        const selectedClientName =
          qbrAvailableClients.find(
            (c) => String(c.id) === String(clientId) && c.source === source,
          )?.name ?? "";
        projects = DEMO_PROJECTS.filter((p) => p.client.name === selectedClientName).map((p) => ({
          id: p.id,
          title: p.name || String(p.id),
        }));
      } else if (source === "halopsa") {
        const res = await fetch(`/api/halo/projects?clientId=${clientId}`, {
          credentials: "same-origin",
        })
        if (res.ok) {
          const data = await res.json() as Array<{ id: number; summary?: string; name?: string }> | { projects?: Array<{ id: number; summary?: string; name?: string }> }
          const arr = Array.isArray(data) ? data : (data.projects ?? [])
          projects = arr.map(p => ({ id: p.id, title: p.summary || p.name || String(p.id) }))
        }
      } else {
        const res = await fetch(`/api/cw/projects?companyId=${clientId}`, {
          credentials: "same-origin",
        })
        if (res.ok) {
          const data = await res.json() as { projects?: Array<{ id: number; name?: string; summary?: string }> } | Array<{ id: number; name?: string; summary?: string }>
          const arr = Array.isArray(data) ? data : (data.projects ?? [])
          projects = arr.map(p => ({ id: p.id, title: p.name || p.summary || String(p.id) }))
        }
      }
      setClientProjects(prev => ({ ...prev, [key]: projects }))
      return projects
    } catch (e) {
      console.error("[loadProjects]", e)
      return []
    } finally {
      setLoadingProjects(prev => ({ ...prev, [key]: false }))
    }
  };

  const canGenerate = useMemo(
    () =>
      hasProAccess &&
      (demoMode || sources.halopsa || sources.connectwise) &&
      (dateRange !== "custom" || (customFrom.trim() && customTo.trim())),
    [hasProAccess, demoMode, sources.halopsa, sources.connectwise, dateRange, customFrom, customTo],
  );

  /** Sections shown in the on-screen preview (subset of the generated pack). */
  const pdfIncludedSections = useMemo((): QbrSections | null => {
    if (!qbr) return null;
    return {
      ...qbr.includedSections,
      periodComparison: false,
      recurringIssues: false,
      firstContactResolution: false,
    };
  }, [qbr]);

  const step1Valid = dateRange !== "custom" || (Boolean(customFrom.trim()) && Boolean(customTo.trim()));
  const step2Valid = demoMode || sources.halopsa || sources.connectwise;
  const step3Valid = qbrSelectedClients.length > 0;
  const step4NextDisabled = !canGenerate || step3Loading;
  const qbrAvailableClientsFiltered = useMemo(
    () =>
      qbrAvailableClients.filter((c) => {
        const key = `${c.source}:${String(c.id)}`;
        const m = clientsWithData[key];
        return (m?.tickets ?? 0) > 0 || (m?.projects ?? 0) > 0;
      }),
    [qbrAvailableClients, clientsWithData],
  );

  useEffect(() => {
    if (step !== 3 || !sources.halopsa || demoMode) return;
    let cancelled = false;
    const loadAllProjects = async () => {
      try {
        const res = await fetch("/api/halo/projects", { credentials: "same-origin" });
        if (!res.ok || cancelled) return;
        const data = await res.json() as {
          projects?: Array<{ id: number; summary?: string; name?: string; clientId?: number | null }>;
        };
        const projects = data.projects ?? [];
        const byClient: Record<number, Array<{ id: number; title: string }>> = {};
        for (const p of projects) {
          if (!p.clientId) continue;
          if (!byClient[p.clientId]) byClient[p.clientId] = [];
          byClient[p.clientId].push({ id: p.id, title: p.summary || p.name || String(p.id) });
        }
        if (cancelled) return;
        setClientProjects((prev) => {
          const next = { ...prev };
          for (const [clientId, projectList] of Object.entries(byClient)) {
            const key = `halopsa:${clientId}`;
            if (!next[key]) next[key] = projectList;
          }
          return next;
        });
      } catch (e) {
        console.error("[bulkLoadProjects]", e);
      }
    };
    loadAllProjects();
    return () => { cancelled = true; };
  }, [step, sources.halopsa, demoMode]);

  useEffect(() => {
    const allowed = new Set(qbrAvailableClientsFiltered.map((c) => `${c.source}:${String(c.id)}`));
    setQbrSelectedClients((prev) => prev.filter((k) => allowed.has(k)));
    setSelectedTicketIds((prev) => new Set([...prev].filter((k) => allowed.has(k.split(":").slice(0, 2).join(":")))));
    setSelectedProjectIds((prev) => new Set([...prev].filter((k) => allowed.has(k.split(":").slice(0, 2).join(":")))));
  }, [qbrAvailableClientsFiltered]);

  const getRangeBoundsIso = useMemo((): { fromIso: string | null; toIso: string | null } => {
    if (dateRange === "all_time") return { fromIso: null, toIso: null };
    const now = new Date();
    if (dateRange === "custom") {
      if (!customFrom.trim() || !customTo.trim()) return { fromIso: null, toIso: null };
      return { fromIso: new Date(customFrom).toISOString(), toIso: new Date(customTo).toISOString() };
    }
    const days =
      dateRange === "last_30_days"
        ? 30
        : dateRange === "last_90_days"
          ? 90
          : dateRange === "last_6_months"
            ? 183
            : 365;
    return {
      fromIso: new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString(),
      toIso: now.toISOString(),
    };
  }, [dateRange, customFrom, customTo]);

  useEffect(() => {
    if (qbrSelectedClients.length !== 1) {
      setAutoIntelligence(null);
      return;
    }
    const clientKey = qbrSelectedClients[0];
    const client = qbrAvailableClients.find((c) => `${c.source}:${String(c.id)}` === clientKey);
    const clientName = client?.name?.trim();
    if (!clientName) {
      setAutoIntelligence(null);
      return;
    }
    let cancelled = false;
    const { fromIso, toIso } = getRangeBoundsIso;
    void (async () => {
      try {
        const res = await fetch("/api/client-intelligence/summarise", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            clientName,
            periodFrom: fromIso ?? undefined,
            periodTo: toIso ?? undefined,
          }),
        });
        const data = (await res.json()) as { summary?: Record<string, unknown> };
        if (cancelled || !res.ok || !data.summary) return;
        const s = data.summary;
        setAutoIntelligence({
          clientName,
          accountNarrative: String(s.account_narrative ?? ""),
          keyAchievements: Array.isArray(s.key_achievements) ? (s.key_achievements as string[]) : [],
          openRisks: Array.isArray(s.open_risks) ? (s.open_risks as string[]) : [],
          qbrTalkingPoints: Array.isArray(s.qbr_talking_points) ? (s.qbr_talking_points as string[]) : [],
          relationshipHealth: String(s.relationship_health ?? "amber"),
        });
      } catch {
        if (!cancelled) setAutoIntelligence(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [qbrSelectedClients.join(","), qbrAvailableClients, getRangeBoundsIso]);

  useEffect(() => {
    if (step !== 4 || !canGenerate) {
      return;
    }
    let cancelled = false;
    setStep3Loading(true);
    void (async () => {
      try {
        const { fromIso, toIso } = getRangeBoundsIso;

        const { tickets, projects } = await fetchTicketsAndProjects(fromIso, toIso);

        let haloResolvedStatusIds: Set<number> | null = null;
        if (sources.halopsa) {
          try {
            const sr = await fetch("/api/halo/ticket-statuses");
            const j = (await sr.json().catch(() => ({}))) as { statuses?: Array<{ id?: number; name?: string }> };
            const rows = Array.isArray(j.statuses) ? j.statuses : [];
            const s = new Set<number>();
            for (const r of rows) {
              const id =
                typeof r.id === "number" && Number.isFinite(r.id) ? r.id : Number.parseInt(String(r.id ?? ""), 10);
              if (!Number.isFinite(id)) continue;
              if (haloStatusNameLooksResolved(r.name ?? "")) s.add(id);
            }
            if (s.size > 0) haloResolvedStatusIds = s;
          } catch {
            haloResolvedStatusIds = null;
          }
        }

        const prevTickets =
          fromIso && toIso
            ? await (async () => {
                const fromMs = new Date(fromIso).getTime();
                const toMs = new Date(toIso).getTime();
                const durationMs = Math.max(0, toMs - fromMs);
                const prevToMs = fromMs - 1;
                const prevFromMs = prevToMs - durationMs;
                const prevFromIso = new Date(prevFromMs).toISOString();
                const prevToIso = new Date(prevToMs).toISOString();
                const prev = await fetchTicketsAndProjects(prevFromIso, prevToIso);
                return prev.tickets;
              })()
            : [];

        const weeklyMap = new Map<string, number>();
        for (const t of tickets) {
          const week = startOfWeekLabel(String(t.dateoccurred ?? ""));
          weeklyMap.set(week, (weeklyMap.get(week) ?? 0) + 1);
        }
        const weeklyCounts = [...weeklyMap.entries()].map(([week, count]) => ({ week, count }));

        const snap = buildQbrValidationSnapshot(tickets, prevTickets, projects, weeklyCounts, haloResolvedStatusIds);
        if (cancelled) return;
        setStep3Snapshot(snap);
        setSections((prev) => {
          const n = { ...prev };
          QBR_DATA_DRIVEN_SECTION_IDS.forEach((k) => {
            if (!snap.flags[k].ok) n[k] = false;
          });
          return n;
        });
      } catch {
        if (!cancelled) setStep3Snapshot(null);
      } finally {
        if (!cancelled) setStep3Loading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, canGenerate, getRangeBoundsIso, sources.halopsa, sources.connectwise, qbrSelectedClients.join(","), Array.from(selectedTicketIds).join(","), Array.from(selectedProjectIds).join(",")]);

  useEffect(() => {
    if (!canGenerate) {
      setClientsWithData({});
      setSelectionCounts({ tickets: 0, projects: 0, clients: 0 });
      return;
    }
    let cancelled = false;
    setClientsWithDataLoading(true);
    void (async () => {
      try {
        const { fromIso, toIso } = getRangeBoundsIso;
        const { tickets, projects } = await fetchTicketsAndProjects(fromIso, toIso, { applySelection: false });
        if (cancelled) return;
        const metrics: Record<string, { tickets: number; projects: number }> = {};
        for (const c of qbrAvailableClients) {
          metrics[`${c.source}:${String(c.id)}`] = { tickets: 0, projects: 0 };
        }
        for (const t of tickets) {
          const key = qbrPsaClientKey(t as TicketRow & Record<string, unknown>);
          if (!key) continue;
          if (!metrics[key]) metrics[key] = { tickets: 0, projects: 0 };
          metrics[key].tickets += 1;
        }
        for (const p of projects) {
          const key = qbrPsaClientKey(p as ProjectRow & Record<string, unknown>);
          if (!key) continue;
          if (!metrics[key]) metrics[key] = { tickets: 0, projects: 0 };
          metrics[key].projects += 1;
        }
        setClientsWithData(metrics);

        const selected = await fetchTicketsAndProjects(fromIso, toIso, { applySelection: true });
        const selectedClientKeys = new Set<string>();
        for (const t of selected.tickets) {
          const key = qbrPsaClientKey(t as TicketRow & Record<string, unknown>);
          if (key) selectedClientKeys.add(key);
        }
        for (const p of selected.projects) {
          const key = qbrPsaClientKey(p as ProjectRow & Record<string, unknown>);
          if (key) selectedClientKeys.add(key);
        }
        if (!cancelled) {
          setSelectionCounts({
            tickets: selected.tickets.length,
            projects: selected.projects.length,
            clients: selectedClientKeys.size,
          });
        }
      } finally {
        if (!cancelled) setClientsWithDataLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canGenerate, getRangeBoundsIso, qbrAvailableClients, qbrSelectedClients.join(","), Array.from(selectedTicketIds).join(","), Array.from(selectedProjectIds).join(",")]);

  async function fetchTicketsAndProjects(
    fromIso: string | null,
    toIso: string | null,
    opts?: { applySelection?: boolean },
  ): Promise<{ tickets: TicketRow[]; projects: ProjectRow[] }> {
    const tickets: TicketRow[] = [];
    const projects: ProjectRow[] = [];

    if (demoMode) {
      const demoClientIdByName = new Map(DEMO_CLIENTS.map((c) => [c.name, c.id]));
      tickets.push(
        ...DEMO_TICKETS.map((t) => {
          const clientId = demoClientIdByName.get(t.client.name) ?? 0;
          return {
            ...t,
            id: Number(String(t.id).replace(/\D/g, "")) || 0,
            source: "halopsa" as const,
            clientId,
            client_id: clientId,
          } as TicketRow & Record<string, unknown>;
        }),
      );
      projects.push(
        ...DEMO_PROJECTS.map((p) => {
          const clientId = demoClientIdByName.get(p.client.name) ?? 0;
          return {
            ...p,
            source: "halopsa" as const,
            clientId,
            client_id: clientId,
          } as ProjectRow & Record<string, unknown>;
        }),
      );
    }

    if (!demoMode && sources.halopsa) {
      const tData = (haloTicketsCached ??
        (await refreshHaloTickets())) as { tickets?: TicketRow[] } | undefined;
      const pData = (haloProjectsCached ??
        (await refreshHaloProjects())) as { projects?: ProjectRow[] } | undefined;
      tickets.push(...(Array.isArray(tData?.tickets) ? tData.tickets.map((t) => ({ ...t, source: "halopsa" as const })) : []));
      projects.push(...(Array.isArray(pData?.projects) ? pData.projects.map((p) => ({ ...p, source: "halopsa" as const })) : []));
    }

    if (!demoMode && sources.connectwise) {
      const tData = (cwTicketsCached ??
        (await refreshCwTickets())) as { tickets?: TicketRow[]; error?: string } | undefined;
      const pData = (cwProjectsCached ??
        (await refreshCwProjects())) as { projects?: ProjectRow[] } | undefined;
      tickets.push(...(Array.isArray(tData?.tickets) ? tData.tickets.map((t) => ({ ...t, source: "connectwise" as const })) : []));
      projects.push(...(Array.isArray(pData?.projects) ? pData.projects.map((p) => ({ ...p, source: "connectwise" as const })) : []));
    }

    const shouldApplyDateFilter = Boolean(fromIso && toIso);
    const fromMs = shouldApplyDateFilter ? new Date(fromIso as string).getTime() : Number.NEGATIVE_INFINITY;
    const toMs = shouldApplyDateFilter ? new Date(toIso as string).getTime() : Number.POSITIVE_INFINITY;
    const filteredTickets = tickets.filter((t) => {
      if (!shouldApplyDateFilter) return true;
      const d = new Date(String(t.dateoccurred ?? "")).getTime();
      return Number.isFinite(d) && d >= fromMs && d <= toMs;
    });
    // Filter by selected clients if any are chosen (exact source:id keys — never name-only matching).
    const applySelection = opts?.applySelection !== false;
    const selectedClientKeys =
      applySelection && qbrSelectedClients.length > 0 ? new Set(qbrSelectedClients) : null;

    const filteredByClient =
      selectedClientKeys == null || selectedClientKeys.size === 0
        ? filteredTickets
        : filteredTickets.filter((t) => {
            const k = qbrPsaClientKey(t as TicketRow & Record<string, unknown>);
            return k != null && selectedClientKeys.has(k);
          });

    const filteredProjectsByClient =
      selectedClientKeys == null || selectedClientKeys.size === 0
        ? projects
        : projects.filter((p) => {
            const k = qbrPsaClientKey(p as ProjectRow & Record<string, unknown>);
            return k != null && selectedClientKeys.has(k);
          });

    // If specific tickets are selected for any client, filter to just those
    const hasSpecificTickets = applySelection && selectedTicketIds.size > 0;
    const finalTickets = !hasSpecificTickets
      ? filteredByClient
      : filteredByClient.filter((t) => {
          const ck = qbrPsaClientKey(t as TicketRow & Record<string, unknown>);
          if (!ck || !qbrSelectedClients.includes(ck)) return false;
          const hasClientSpecific = Array.from(selectedTicketIds).some((idKey) =>
            idKey.startsWith(`${ck}:`),
          );
          if (!hasClientSpecific) return true;
          return selectedTicketIds.has(`${ck}:${t.id}`);
        });

    const hasSpecificProjects = applySelection && selectedProjectIds.size > 0;
    const finalProjects = !hasSpecificProjects
      ? filteredProjectsByClient
      : filteredProjectsByClient.filter((p) => {
          const ck = qbrPsaClientKey(p as ProjectRow & Record<string, unknown>);
          if (!ck || !qbrSelectedClients.includes(ck)) return false;
          const hasClientSpecific = Array.from(selectedProjectIds).some((idKey) =>
            idKey.startsWith(`${ck}:`),
          );
          if (!hasClientSpecific) return true;
          return selectedProjectIds.has(`${ck}:${p.id}`);
        });

    return { tickets: finalTickets, projects: finalProjects }
  }

  function coerceQbrRisksArray(raw: unknown): Array<{ risk: string; impact: string; mitigation: string }> {
    if (Array.isArray(raw)) {
      return raw as Array<{ risk: string; impact: string; mitigation: string }>;
    }
    if (typeof raw === "string") {
      const t = raw.trim();
      if (!t) return [];
      try {
        const p = JSON.parse(t) as unknown;
        if (Array.isArray(p)) return p as Array<{ risk: string; impact: string; mitigation: string }>;
      } catch {
        /* ignore */
      }
      if (t.length > 10) return [{ risk: t, impact: "", mitigation: "" }];
    }
    return [];
  }

  function coerceQbrActionsArray(raw: unknown): Array<{ task: string; suggested_owner?: string; priority?: string }> {
    if (Array.isArray(raw)) {
      return raw as Array<{ task: string; suggested_owner?: string; priority?: string }>;
    }
    if (typeof raw === "string") {
      const t = raw.trim();
      if (!t) return [];
      try {
        const p = JSON.parse(t) as unknown;
        if (Array.isArray(p)) return p as Array<{ task: string; suggested_owner?: string; priority?: string }>;
      } catch {
        /* ignore */
      }
      if (t.length > 10) return [{ task: t }];
    }
    return [];
  }

  function hasMeaningfulRisksActionsContent(ai: {
    risks: Array<{ risk: string; impact: string; mitigation: string }>;
    actions: Array<{ task: string; suggested_owner?: string; priority?: string }>;
  }): boolean {
    const riskMeaningful = ai.risks.some(
      (r) =>
        (typeof r.risk === "string" && r.risk.trim().length > 0) ||
        (typeof r.impact === "string" && r.impact.trim().length > 0) ||
        (typeof r.mitigation === "string" && r.mitigation.trim().length > 0),
    );
    const actionMeaningful = ai.actions.some((a) => typeof a.task === "string" && a.task.trim().length > 0);
    return riskMeaningful || actionMeaningful;
  }

  function truncText(v: string, max = 500): string {
    const t = v.trim();
    if (!t) return "";
    return t.length > max ? `${t.slice(0, max)}…` : t;
  }

  function ticketDetailsForPrompt(t: TicketRow & Record<string, unknown>): string {
    const detailsRaw =
      (typeof t.details === "string" && t.details) ||
      (typeof t.description === "string" && t.description) ||
      "";
    const details = truncText(detailsRaw, 500);
    const customFields =
      Array.isArray(t.customfields) && t.customfields.length > 0
        ? truncText(
            JSON.stringify(
              t.customfields.map((cf) => {
                if (cf && typeof cf === "object") {
                  const row = cf as Record<string, unknown>;
                  return {
                    name: row.name ?? row.label ?? row.field ?? row.key ?? null,
                    value: row.value ?? row.display ?? row.text ?? null,
                  };
                }
                return cf;
              }),
            ),
            500,
          )
        : "";

    const detailBits = [
      details ? `details=${details}` : "",
      customFields ? `custom_fields=${customFields}` : "",
    ].filter(Boolean);
    return detailBits.length > 0 ? ` | ${detailBits.join(" | ")}` : "";
  }

  async function buildAiSections(
    tickets: TicketRow[],
    projects: ProjectRow[],
    fromIso: string | null,
    toIso: string | null,
  ) {
    const hasExplicitSelections =
      qbrSelectedClients.length > 0 || selectedTicketIds.size > 0 || selectedProjectIds.size > 0;

    const ticketBudgetTotal = hasExplicitSelections ? 150 : 80;
    const projectBudgetTotal = hasExplicitSelections ? 60 : 40;

    const groupedTickets = new Map<string, TicketRow[]>();
    for (const t of tickets) {
      const k = qbrPsaClientKey(t as TicketRow & Record<string, unknown>);
      if (!k) continue;
      const arr = groupedTickets.get(k) ?? [];
      arr.push(t);
      groupedTickets.set(k, arr);
    }
    const groupedProjects = new Map<string, ProjectRow[]>();
    for (const p of projects) {
      const k = qbrPsaClientKey(p as ProjectRow & Record<string, unknown>);
      if (!k) continue;
      const arr = groupedProjects.get(k) ?? [];
      arr.push(p);
      groupedProjects.set(k, arr);
    }

    for (const [, arr] of groupedTickets) {
      arr.sort((a, b) => {
        const aMs = new Date(String(a.dateoccurred ?? "")).getTime();
        const bMs = new Date(String(b.dateoccurred ?? "")).getTime();
        const av = Number.isFinite(aMs) ? aMs : 0;
        const bv = Number.isFinite(bMs) ? bMs : 0;
        return bv - av;
      });
    }

    const unionKeys = [...new Set([...groupedTickets.keys(), ...groupedProjects.keys()])];
    const orderedKeys =
      qbrSelectedClients.length > 0
        ? [
            ...qbrSelectedClients.filter(
              (k) =>
                (groupedTickets.get(k)?.length ?? 0) > 0 ||
                (groupedProjects.get(k)?.length ?? 0) > 0,
            ),
            ...unionKeys.filter((k) => !qbrSelectedClients.includes(k)).sort(),
          ]
        : [...unionKeys].sort();

    let ticketBudget = ticketBudgetTotal;
    let projectBudget = projectBudgetTotal;

    const promptLines: string[] = [
      "QBR CONTEXT: Write for MSP business reviews, client-facing and business language. Avoid deep technical jargon.",
      "This is a quarterly business review. Focus on trends, performance, patterns and outcomes across the period.",
      "EXECUTIVE SUMMARY: Write a single punchy pull-quote sentence (max 25 words) that captures the defining theme of this quarter - the most important single thing a director needs to know. Put this in a field called exec_pull_quote. Then write a full executive summary paragraph (3-5 sentences) for the summary field.",
      "RECOMMENDATIONS: You must output exactly 3-5 structured commitments as a JSON array in a field called recommendation_items. Each must be an object with these exact keys:",
      '  action: specific verb-led action (e.g. "Complete Azure migration cutover", "Audit backup reliability at [client]")',
      '  owner: job title of the responsible person (e.g. "Service Delivery Manager", "Project Lead") - infer from ticket assignee if available, otherwise use role title',
      '  target: target date as relative string (e.g. "30 Jun 2026", "14 Jun 2026") - use ticket due dates if available, otherwise set +14 days from today',
      "  riskAddressed: one sentence explaining what risk or issue this addresses",
      "Do NOT produce generic advice. Each commitment must be specific to the data provided. No more than 5 items.",
      "NEXT STEPS (status_report field): Also output a plain string array of 5-8 bullet points as the status_report field for fallback use.",
      "TOP ISSUES: describe repeated categories/patterns and business impact.",
      "Tone: strategic and reflective, not operational status reporting.",
      `Period: ${fromIso && toIso ? `${fromIso} to ${toIso}` : "All time"}`,
      `Tickets in scope: ${tickets.length}`,
      `Projects in scope: ${projects.length}`,
      "CLIENT ATTRIBUTION: Only attribute tickets/projects to the exact client they belong to.",
    ];

    for (const clientKey of orderedKeys) {
      if (ticketBudget <= 0 && projectBudget <= 0) break;
      const ts = groupedTickets.get(clientKey) ?? [];
      const ps = groupedProjects.get(clientKey) ?? [];
      if (ts.length === 0 && ps.length === 0) continue;

      const displayRaw = qbrResolveClientDisplayName(clientKey, ts[0] ?? ps[0], qbrAvailableClients);
      const display = qbrPromptEscapeDisplayName(displayRaw);

      promptLines.push(
        `--- BEGIN CLIENT BLOCK psa_client_key=${clientKey} client_display_name="${display}" ---`,
      );
      promptLines.push("Tickets:");
      for (const t of ts) {
        if (ticketBudget <= 0) break;
        promptLines.push(
          `- #${t.id}: ${t.summary ?? "Untitled"} | psa_client_key=${clientKey} | client_display_name="${display}" | status=${t.status?.name ?? "Unknown"} | priority=${t.priority?.name ?? "Unknown"} | hours=${t.timetaken ?? 0}${ticketDetailsForPrompt(t as TicketRow & Record<string, unknown>)}`,
        );
        ticketBudget--;
      }
      promptLines.push("Projects:");
      for (const p of ps) {
        if (projectBudget <= 0) break;
        promptLines.push(
          `- #${p.id}: ${p.name ?? "Untitled"} | psa_client_key=${clientKey} | client_display_name="${display}" | status=${p.status?.name ?? "Unknown"} | completion=${Number.isFinite(Number(p.completionpercent)) ? Number(p.completionpercent) : 0}%`,
        );
        projectBudget--;
      }
      promptLines.push(`--- END CLIENT BLOCK psa_client_key=${clientKey} ---`);
    }

    // Surface named project references explicitly for the AI
    const namedProjects = projects.slice(0, 10).map((p) => p.name ?? `Project #${p.id}`).filter(Boolean);
    const namedTicketPatterns = tickets.slice(0, 5).map((t) => `#${t.id}: ${t.summary ?? "Untitled"}`).filter(Boolean);
    if (namedProjects.length > 0) {
      promptLines.push(`KEY PROJECTS IN SCOPE: ${namedProjects.join(", ")}`);
    }
    if (namedTicketPatterns.length > 0) {
      promptLines.push(`SAMPLE TICKETS: ${namedTicketPatterns.join(" | ")}`);
    }
    promptLines.push(`TODAY'S DATE: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`);
    promptLines.push("CRITICAL: recommendation_items actions must reference the specific project names and ticket patterns above. Do not produce generic advice.");

    const input = promptLines.join("\n");

    const effectiveIntelligence = intelligenceContext ?? autoIntelligence ?? null;

    const ciBlock = effectiveIntelligence
      ? `

##########  CLIENT INTELLIGENCE CONTEXT  ##########

This Service Review is informed by accumulated account intelligence.

RELATIONSHIP HEALTH: ${effectiveIntelligence.relationshipHealth}

ACCOUNT NARRATIVE:
${effectiveIntelligence.accountNarrative}

KEY ACHIEVEMENTS THIS PERIOD:
${effectiveIntelligence.keyAchievements.map((a) => `- ${a}`).join("\n")}

OPEN RISKS:
${effectiveIntelligence.openRisks.map((r) => `- ${r}`).join("\n")}

QBR TALKING POINTS (from account intelligence):
${effectiveIntelligence.qbrTalkingPoints.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Use this intelligence to enrich the executive summary and recommendations. Reference the account narrative where relevant.
`
      : "";

    const res = await fetch("/api/qbr-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: input + ciBlock, tone: "professional" }),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new Error(generateApiErrorMessage(data, "QBR AI generation failed"));
    const recRaw = typeof data.status_report === "string" ? data.status_report.trim() : "";
    const execPullQuote = typeof data.exec_pull_quote === "string"
      ? data.exec_pull_quote.trim()
      : "";
    let recommendationItems: GeneratedQbr["recommendationItems"] = [];
    try {
      const raw = data.recommendation_items;
      if (Array.isArray(raw)) {
        recommendationItems = raw
          .filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null)
          .map((r) => ({
            action: typeof r.action === "string" ? r.action : "",
            owner: typeof r.owner === "string" ? r.owner : "",
            target: typeof r.target === "string" ? r.target : "",
            riskAddressed: typeof r.riskAddressed === "string" ? r.riskAddressed : "",
          }))
          .filter((r) => r.action.length > 0);
      }
    } catch {}
    if (recommendationItems.length === 0) {
      recommendationItems = normalizeRecommendationsText(recRaw)
        .split("\n")
        .filter(Boolean)
        .map((line) => ({
          action: line.replace(/^[\d\.\-\•\*]+\s*/, "").trim(),
          owner: "",
          target: "",
          riskAddressed: "",
        }));
    }
    return {
      executiveSummary: typeof data.summary === "string" ? data.summary : "",
      actions: coerceQbrActionsArray(data.actions),
      risks: coerceQbrRisksArray(data.risks),
      recommendations: normalizeRecommendationsText(recRaw),
      recommendationItems,
      execPullQuote,
    };
  }

  async function generateQbr() {
    if (!canGenerate) return;
    setLoading(true);
    try {
      const { fromIso, toIso } = getRangeBoundsIso;
      if (!fromIso && !toIso && sections.projectStatus) {
        // Allow generation but warn — do not block
        console.warn("[generateQbr] No date range set - generating with all-time data");
      }

      const { tickets, projects } = await fetchTicketsAndProjects(fromIso, toIso);

      let haloResolvedStatusIds: Set<number> | null = null;
      if (sources.halopsa) {
        try {
          const sr = await fetch("/api/halo/ticket-statuses");
          const j = (await sr.json().catch(() => ({}))) as { statuses?: Array<{ id?: number; name?: string }> };
          const rows = Array.isArray(j.statuses) ? j.statuses : [];
          const s = new Set<number>();
          for (const r of rows) {
            const id = typeof r.id === "number" && Number.isFinite(r.id) ? r.id : Number.parseInt(String(r.id ?? ""), 10);
            if (!Number.isFinite(id)) continue;
            if (haloStatusNameLooksResolved(r.name ?? "")) s.add(id);
          }
          if (s.size > 0) haloResolvedStatusIds = s;
        } catch {
          haloResolvedStatusIds = null;
        }
      }

      const prevTickets =
        fromIso && toIso
          ? await (async () => {
              const fromMs = new Date(fromIso).getTime();
              const toMs = new Date(toIso).getTime();
              const durationMs = Math.max(0, toMs - fromMs);
              const prevToMs = fromMs - 1;
              const prevFromMs = prevToMs - durationMs;
              const prevFromIso = new Date(prevFromMs).toISOString();
              const prevToIso = new Date(prevToMs).toISOString();
              const prev = await fetchTicketsAndProjects(prevFromIso, prevToIso);
              return prev.tickets;
            })()
          : [];

      const weeklyMap = new Map<string, number>();
      const resolutionByPriority = new Map<"P1" | "P2" | "P3", { total: number; count: number }>();
      let resolved = 0;
      for (const t of tickets) {
        const week = startOfWeekLabel(String(t.dateoccurred ?? ""));
        weeklyMap.set(week, (weeklyMap.get(week) ?? 0) + 1);
        const p = normalizePriority(t.priority?.name ?? null);
        const r = resolutionByPriority.get(p) ?? { total: 0, count: 0 };
        r.total += Number(t.timetaken ?? 0) || 0;
        r.count += 1;
        resolutionByPriority.set(p, r);
        if (ticketCountsAsResolved(t, haloResolvedStatusIds)) resolved += 1;
      }
      const raised = tickets.length;
      const openCount = Math.max(0, raised - resolved);

      const weeklyCountsArr = [...weeklyMap.entries()].map(([week, count]) => ({ week, count }));
      const validationSnap = buildQbrValidationSnapshot(
        tickets,
        prevTickets,
        projects,
        weeklyCountsArr,
        haloResolvedStatusIds,
      );
      const applied = applySectionValidationToToggles(sections, validationSnap);
      let effective = applied.effective;
      const autoExcludedLabels = [...applied.autoExcludedLabels];

      const bp = validationSnap.breakdownPack;
      const breakdownAgg = {
        rows: bp.ok ? bp.rows : [],
        mode: bp.mode,
        note: bp.ok ? bp.note : null,
      };

      const resolutionRows = (["P1", "P2", "P3"] as const)
        .map((key) => {
          const v = resolutionByPriority.get(key);
          if (!v || v.count === 0) return null;
          const avg = v.total / v.count;
          return {
            key,
            priority: PRIORITY_LABEL[key],
            avgHours: Number(avg.toFixed(2)),
            ticketCount: v.count,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x != null);
      const projectsWithTasks = projects.filter((p) => Array.isArray(p.tasks) && p.tasks.length > 0);
      const projectRows = projectsWithTasks.map((p) => {
        const percent = Number.isFinite(Number(p.completionpercent))
          ? Math.max(0, Math.min(100, Number(p.completionpercent)))
          : null;

        const taskTotal = Array.isArray(p.tasks) ? p.tasks.length : 0;
        const tasksDone =
          Array.isArray(p.tasks)
            ? p.tasks.filter((t) => {
                const v = String(
                  (t as { status?: unknown; statusName?: unknown }).status ??
                    (t as { status?: unknown; statusName?: unknown }).statusName ??
                    "",
                ).toLowerCase();
                return /complet|done|closed|resolved/.test(v);
              }).length
            : 0;

        const derivedPercent =
          percent !== null
            ? percent
            : taskTotal > 0
              ? Math.round((tasksDone / taskTotal) * 100)
              : null;

        const displayPercent = derivedPercent ?? 0;
        const rag: "Red" | "Amber" | "Green" =
          derivedPercent === null || derivedPercent === 0
            ? "Amber"
            : derivedPercent >= 80
              ? "Green"
              : derivedPercent >= 45
                ? "Amber"
                : "Red";

        return {
          name: sanitiseProjectName(p.name, p.id),
          percent: displayPercent,
          rag,
          owner: undefined,
          nextAction: Array.isArray(p.tasks) && p.tasks.length > 0
            ? (p.tasks[0] as { summary?: string | null })?.summary ?? undefined
            : undefined,
        };
      });

      const catMap = new Map<string, number>();
      for (const t of tickets) {
        const key = breakdownBucketName(t as TicketRow & Record<string, unknown>) || "Unknown";
        catMap.set(key, (catMap.get(key) ?? 0) + 1);
      }
      const recurringRows = [...catMap.entries()]
        .filter(([name, c]) => name !== "Unknown" && c >= 3)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({
          name,
          count,
          pct: raised > 0 ? Math.round((count / raised) * 1000) / 10 : 0,
        }));

      if (effective.recurringIssues && recurringRows.length === 0) {
        effective = { ...effective, recurringIssues: false };
        autoExcludedLabels.push(SECTION_UI.recurringIssues.label);
      }

      let recurringInsight =
        recurringRows[0] != null
          ? `Consider root-cause review for "${recurringRows[0].name}" (${recurringRows[0].count} occurrences, ${recurringRows[0].pct}% of tickets).`
          : "No recurring issues identified this quarter - all tickets were unique incidents.";
      if (recurringRows.length > 0 && effective.recurringIssues) {
        try {
          const ir = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              input: `QBR: One concise sentence (client-facing) for an MSP quarterly review about the recurring support theme "${recurringRows[0].name}" (${recurringRows[0].count} tickets, ${recurringRows[0].pct}% of volume). No bullet list.`,
              tone: "professional",
              reportType: "external",
              selectedOutputs: ["summary"],
              outputPreferences: { enabledTabs: ["summary"] },
            }),
          });
          const id = (await ir.json().catch(() => ({}))) as { summary?: string };
          if (typeof id.summary === "string" && id.summary.trim()) recurringInsight = id.summary.trim();
        } catch {
          /* keep template */
        }
      }

      const curPm = qbrPeriodMetrics(tickets, haloResolvedStatusIds);
      const prevPm = qbrPeriodMetrics(prevTickets, haloResolvedStatusIds);
      const volPct =
        prevPm.volume === 0
          ? curPm.volume > 0
            ? 100
            : 0
          : Math.round(((curPm.volume - prevPm.volume) / prevPm.volume) * 100);
      const trendLine = `Ticket volume ${volPct >= 0 ? "increased" : "decreased"} by ${Math.abs(volPct)}% compared to the previous period.`;

      let fcrBlock: GeneratedQbr["firstContactResolution"] = {
        pct: 0,
        resolvedEvaluated: 0,
        fcrCount: 0,
        benchmarkNote: "Industry average first contact resolution rate for MSPs is typically 70 to 75 percent.",
      };
      const resolvedTickets = tickets.filter((t) => ticketCountsAsResolved(t, haloResolvedStatusIds));
      if (resolvedTickets.length > 0 && effective.firstContactResolution) {
        let fcrCount = 0;
        const haloRes = resolvedTickets.filter((t) => t.source === "halopsa");
        const cwRes = resolvedTickets.filter((t) => t.source === "connectwise");
        for (const t of haloRes) {
          if (!haloHistorySuggestsReassignmentOrEscalation(t)) fcrCount += 1;
        }
        const cwIds = cwRes.map((t) => t.id).filter((id) => id > 0).slice(0, 120);
        const cwBad = cwIds.length > 0 ? await batchCwTransferFlagsForTickets(cwIds) : new Map<number, boolean>();
        for (const t of cwRes) {
          if (!cwIds.includes(t.id)) continue;
          if (!cwBad.get(t.id)) fcrCount += 1;
        }
        fcrBlock = {
          pct: Math.round((fcrCount / resolvedTickets.length) * 100),
          resolvedEvaluated: resolvedTickets.length,
          fcrCount,
          benchmarkNote: "Industry average first contact resolution rate for MSPs is typically 70 to 75 percent.",
        };
      }

      const needsAi =
        validationSnap.hasAiScope &&
        (sections.executiveSummary || sections.risksActions || sections.nextSteps);

      const ai = needsAi
        ? await buildAiSections(tickets, projects, fromIso, toIso)
        : {
            executiveSummary: "",
            actions: [] as Array<{ task: string; suggested_owner?: string; priority?: string }>,
            risks: [] as Array<{ risk: string; impact: string; mitigation: string }>,
            recommendations: "",
            recommendationItems: [] as GeneratedQbr["recommendationItems"],
            execPullQuote: "",
          };

      /** Post-generation: AI-only sections — never add to autoExcludedLabels (data-insufficient banner). */
      if (!validationSnap.hasAiScope) {
        effective = {
          ...effective,
          executiveSummary: false,
          risksActions: false,
          nextSteps: false,
        };
      } else if (needsAi) {
        if (sections.executiveSummary) {
          const hasExec = typeof ai.executiveSummary === "string" && ai.executiveSummary.trim().length > 0;
          effective = { ...effective, executiveSummary: hasExec };
        }
        if (sections.risksActions) {
          const hasRa = hasMeaningfulRisksActionsContent(ai);
          effective = { ...effective, risksActions: hasRa };
        }
        if (sections.nextSteps) {
          const hasNext =
            typeof ai.recommendations === "string" && ai.recommendations.trim().length > 10;
          effective = { ...effective, nextSteps: hasNext };
        }
      }

      if (process.env.NODE_ENV !== "production") {
        console.debug("[QBR] risks/actions before pack render", {
          risksCount: ai.risks.length,
          actionsCount: ai.actions.length,
          risksActionsIncluded: effective.risksActions,
        });
      }

      const generated: GeneratedQbr = {
        generatedAt: new Date().toISOString(),
        dateRangeLabel:
          fromIso && toIso
            ? `${new Date(fromIso).toLocaleDateString("en-GB")} - ${new Date(toIso).toLocaleDateString("en-GB")}`
            : "All time",
        periodEndDate: toIso ? new Date(toIso).toISOString().slice(0, 10) : undefined,
        brandName: brandName.trim() || "Handover",
        brandColor: brandColor.trim() || "#38bdf8",
        brandLogoUrl: brandLogoUrl.trim() || null,
        tickets,
        projects,
        weeklyCounts: weeklyCountsArr,
        resolutionByPriority: resolutionRows,
        ticketBreakdown: breakdownAgg.rows,
        ticketBreakdownMode: breakdownAgg.mode,
        ticketBreakdownNote: breakdownAgg.note,
        openVsClosed: {
          raised,
          resolved,
          open: openCount,
          resolvedPct: raised > 0 ? Math.round((resolved / raised) * 100) : 0,
        },
        projectRows,
        slaCompliancePct: raised > 0 ? Math.max(0, Math.min(100, Math.round((resolved / raised) * 100))) : 100,
        executiveSummary: effective.executiveSummary ? ai.executiveSummary : "",
        risks: effective.risksActions ? ai.risks : [],
        actions: effective.risksActions ? ai.actions : [],
        recommendations: effective.nextSteps ? ai.recommendations : "",
        recommendationItems: effective.nextSteps ? ai.recommendationItems : [],
        execPullQuote: effective.executiveSummary ? ai.execPullQuote : "",
        recurringIssues: {
          rows: recurringRows,
          topInsight: recurringInsight,
        },
        periodComparison: {
          current: {
            volume: curPm.volume,
            resolutionPct: curPm.resolutionPct,
            avgResolutionHrs: curPm.avgResolutionHrs,
          },
          previous: {
            volume: prevPm.volume,
            resolutionPct: prevPm.resolutionPct,
            avgResolutionHrs: prevPm.avgResolutionHrs,
          },
          trendLine,
        },
        firstContactResolution: fcrBlock,
        includedSections: effective,
        autoExcludedSectionLabels: autoExcludedLabels.length > 0 ? [...new Set(autoExcludedLabels)] : undefined,
      };
      const result = generated;
      console.log("QBR_FIXTURE:", JSON.stringify(result, null, 2));

      setQbr(generated);
      void fetch("/api/qbr/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateRange: generated.dateRangeLabel,
          ticketsProcessed: generated.tickets.length,
          clientsCovered: [],
        }),
      });
      toast({ message: "QBR pack generated", durationMs: 2500 });
    } catch (e) {
      toast({ message: e instanceof Error ? e.message : "Failed to generate QBR pack", variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  function exportExcel() {
    if (!qbr) return;
    const wb = XLSX.utils.book_new();
    const accent = safeColorHex(qbr.brandColor);
    const aoa: Array<Array<string | number>> = [];
    const merges: XLSX.Range[] = [];
    const sectionHeaderRows: number[] = [];

    const pushSection = (title: string) => {
      sectionHeaderRows.push(aoa.length);
      aoa.push([title, "", "", "", "", ""]);
      merges.push({ s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: 5 } });
    };

    if (qbr.includedSections.executiveSummary) {
      pushSection("Executive Summary");
      aoa.push([qbr.executiveSummary || "-", "", "", "", "", ""]);
      merges.push({ s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: 5 } });
      aoa.push([]);
    }
    if (qbr.includedSections.ticketVolume || qbr.includedSections.resolutionPerformance || qbr.includedSections.openVsClosed) {
      pushSection("Ticket Metrics");
      aoa.push(["Week", "Ticket Count", "Priority", "Avg Resolution Hours", "Raised", "Resolved"]);
      const maxRows = Math.max(qbr.weeklyCounts.length, qbr.resolutionByPriority.length, 1);
      for (let i = 0; i < maxRows; i += 1) {
        const week = qbr.weeklyCounts[i];
        const pr = qbr.resolutionByPriority[i];
        aoa.push([
          week?.week ?? "",
          week?.count ?? "",
          pr?.priority ?? "",
          pr ? pr.avgHours : "",
          i === 0 ? qbr.openVsClosed.raised : "",
          i === 0 ? qbr.openVsClosed.resolved : "",
        ]);
      }
      aoa.push([]);
    }
    if (qbr.includedSections.periodComparison) {
      pushSection("Period Comparison");
      aoa.push(["Metric", "This period", "Previous period", "", "", ""]);
      aoa.push([
        "Ticket volume",
        qbr.periodComparison.current.volume,
        qbr.periodComparison.previous.volume,
        "",
        "",
        "",
      ]);
      aoa.push([
        "Resolution rate %",
        qbr.periodComparison.current.resolutionPct,
        qbr.periodComparison.previous.resolutionPct,
        "",
        "",
        "",
      ]);
      aoa.push([
        "Avg resolution (hrs)",
        qbr.periodComparison.current.avgResolutionHrs,
        qbr.periodComparison.previous.avgResolutionHrs,
        "",
        "",
        "",
      ]);
      aoa.push([qbr.periodComparison.trendLine, "", "", "", "", ""]);
      aoa.push([]);
    }
    if (qbr.includedSections.recurringIssues) {
      pushSection("Top Recurring Issues This Quarter");
      aoa.push(["Category", "Count", "% of total", "", "", ""]);
      for (const r of qbr.recurringIssues.rows) aoa.push([r.name, r.count, r.pct, "", "", ""]);
      aoa.push(["Insight", qbr.recurringIssues.topInsight, "", "", "", ""]);
      aoa.push([]);
    }
    if (qbr.includedSections.firstContactResolution) {
      pushSection("First Contact Resolution");
      aoa.push([
        "FCR %",
        qbr.firstContactResolution.pct,
        "Resolved evaluated",
        qbr.firstContactResolution.resolvedEvaluated,
        "FCR count",
        qbr.firstContactResolution.fcrCount,
      ]);
      aoa.push([qbr.firstContactResolution.benchmarkNote, "", "", "", "", ""]);
      aoa.push([]);
    }
    if (qbr.includedSections.projectStatus) {
      pushSection("Project Status");
      aoa.push(["Project Name", "Progress %", "RAG Status", "", "", ""]);
      for (const p of qbr.projectRows) aoa.push([p.name, p.percent, p.rag, "", "", ""]);
      aoa.push([]);
    }
    if (qbr.includedSections.slaPerformance) {
      pushSection("SLA Performance");
      aoa.push(["SLA Compliance %", qbr.slaCompliancePct ?? "Unavailable", "", "", "", ""]);
      aoa.push([]);
    }
    if (qbr.includedSections.risksActions) {
      pushSection("Risks and Actions");
      aoa.push(["Risk", "Impact", "Mitigation", "Action", "Owner", "Priority"]);
      const raCount = Math.max(qbr.risks.length, qbr.actions.length, 1);
      for (let i = 0; i < raCount; i += 1) {
        aoa.push([
          qbr.risks[i]?.risk ?? "",
          qbr.risks[i]?.impact ?? "",
          qbr.risks[i]?.mitigation ?? "",
          qbr.actions[i]?.task ?? "",
          qbr.actions[i]?.suggested_owner ?? "",
          qbr.actions[i]?.priority ?? "",
        ]);
      }
      aoa.push([]);
    }
    if (qbr.includedSections.nextSteps) {
      pushSection("Recommendations");
      aoa.push([qbr.recommendations || "-", "", "", "", "", ""]);
      merges.push({ s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: 5 } });
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!merges"] = merges;
    ws["!cols"] = [{ wch: 32 }, { wch: 18 }, { wch: 18 }, { wch: 36 }, { wch: 24 }, { wch: 14 }];
    ws["!rows"] = aoa.map((row) => {
      const textLen = row.map((v) => String(v ?? "").length).reduce((m, v) => Math.max(m, v), 0);
      return { hpt: Math.min(64, Math.max(20, Math.ceil(textLen / 55) * 14)) };
    });

    for (let r = 0; r < aoa.length; r += 1) {
      for (let c = 0; c < 6; c += 1) {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (!ws[ref]) continue;
        ws[ref].s = {
          font: { name: "Calibri", sz: 11, color: { rgb: "1F2937" } },
          alignment: { vertical: "top", wrapText: true },
          border: {
            top: { style: "thin", color: { rgb: "E2E8F0" } },
            bottom: { style: "thin", color: { rgb: "E2E8F0" } },
          },
        };
      }
    }

    for (const r of sectionHeaderRows) {
      const ref = XLSX.utils.encode_cell({ r, c: 0 });
      if (!ws[ref]) continue;
      ws[ref].s = {
        font: { name: "Calibri", sz: 12, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: colorNoHash(accent) } },
        alignment: { vertical: "center" },
      };
    }

    XLSX.utils.book_append_sheet(wb, ws, "QBR Pack");
    const _xlsxDate = new Date();
    const _xlsxQuarter = `Q${Math.ceil((_xlsxDate.getMonth() + 1) / 3)}-${_xlsxDate.getFullYear()}`;
    const _xlsxSafeName = (qbr.brandName || "Client")
      .replace(/[^a-zA-Z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    XLSX.writeFile(wb, `${_xlsxSafeName}_QBR_${_xlsxQuarter}.xlsx`);
  }

  async function exportPptx() {
    if (!qbr) return;
    if (!qbr.dateRangeLabel || qbr.dateRangeLabel.toLowerCase() === "all time") {
      // Show warning but allow export to proceed
      console.warn("[exportPptx] Exporting with 'All time' period - consider setting a date range");
    }
    const PptxGenJS = (await import("pptxgenjs")).default;
    const pptx = new PptxGenJS();
    pptx.theme = { headFontFace: "Inter", bodyFontFace: "Inter" };
    pptx.layout = "LAYOUT_WIDE";
    const accent = safeColorHex(qbr.brandColor);
    const NAVY = "0F1C3F";
    const SLIDE_BG = "0A0E1F";
    const SLIDE_TEXT = "F0F2F8";
    const SLIDE_DIM = "8B8FA8";
    const SLIDE_BORDER = "1E2235";
    const BODY = SLIDE_TEXT;
    const CHART_COLORS = {
      primary: colorNoHash(accent) || "5BA8FF",
      navy: "0F1C3F",
      ragRed: "C8553D",
      ragAmber: "D9A441",
      ragGreen: "4E9C6F",
      neutral: "B79268",
    } as const;
    const SLIDE_W = 13.333;
    const SLIDE_H = 7.5;
    const PT_TO_IN = 1 / 72;
    const HEADER_H = 50 * PT_TO_IN;
    const FOOTER_H = 25 * PT_TO_IN;
    const PAD_20 = 20 * PT_TO_IN;
    const BOX_PAD = [PAD_20, PAD_20, PAD_20, PAD_20] as [number, number, number, number];
    const BODY_FS = 14;
    const TITLE_FS = 24;
    const bodyTop = HEADER_H + PAD_20;
    const leftX = 0.35 + PAD_20;
    const HARD_BOTTOM_PT = 420;
    const recMaxBottom = HARD_BOTTOM_PT * PT_TO_IN;
    const recBoxH = Math.max(0.35, recMaxBottom - bodyTop);
    if (!qbr.periodEndDate && qbr.dateRangeLabel?.toLowerCase() === "all time") {
      console.warn("[exportPptx] Generating QBR with All time period - consider setting a date range for production use");
    }

    let headerLogoData: string | null = null;
    let logoNaturalW = 0;
    let logoNaturalH = 0;
    const logoUrl = (qbr.brandLogoUrl ?? "").trim();
    if (logoUrl) {
      try {
        const logoRes = await fetch(logoUrl, { mode: "cors" });
        if (logoRes.ok) {
          const logoBlob = await logoRes.blob();
          headerLogoData = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(logoBlob);
          });
          const dims = await new Promise<{ w: number; h: number }>((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
            img.onerror = () => resolve({ w: 1, h: 1 });
            img.src = headerLogoData!;
          });
          logoNaturalW = dims.w;
          logoNaturalH = dims.h;
        } else {
          console.error("[exportPptx] Logo fetch failed:", logoRes.status);
        }
      } catch (e) {
        console.error("[exportPptx] Logo fetch error:", e);
      }
    }

    const addChrome = (slide: ReturnType<typeof pptx.addSlide>, title: string, pageNumber: number) => {
      slide.background = { color: SLIDE_BG };
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: SLIDE_W, h: HEADER_H, fill: { color: SLIDE_BG }, line: { color: SLIDE_BG } });
      slide.addText(title, {
        x: 0.35,
        y: 0,
        w: headerLogoData ? 8.6 : 9.8,
        h: HEADER_H,
        fontFace: "Inter",
        bold: true,
        fontSize: TITLE_FS,
        color: SLIDE_TEXT,
        valign: "middle",
        margin: BOX_PAD,
      });
      if (headerLogoData) {
        const maxW = 1.3;
        const maxH = 0.32;
        const aspect = logoNaturalW / Math.max(logoNaturalH, 1);
        const logoW = Math.min(maxW, maxH * aspect);
        const logoH = logoW / aspect;
        slide.addImage({
          data: headerLogoData,
          x: 13.33 - logoW - 0.25,
          y: (0.5 - logoH) / 2,
          w: logoW,
          h: logoH,
        });
      } else {
        slide.addText(qbr.brandName, {
          x: 10.2,
          y: 0,
          w: 2.9,
          h: HEADER_H,
          fontFace: "Inter",
          bold: true,
          fontSize: BODY_FS,
          color: SLIDE_TEXT,
          align: "right",
          valign: "middle",
          margin: BOX_PAD,
        });
      }
      slide.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: SLIDE_H - FOOTER_H,
        w: SLIDE_W,
        h: FOOTER_H,
        fill: { color: SLIDE_BORDER },
        line: { color: SLIDE_BORDER },
      });
      slide.addText(qbr.brandName, {
        x: 0.35,
        y: SLIDE_H - FOOTER_H,
        w: 8,
        h: FOOTER_H,
        fontFace: "Inter",
        fontSize: 10,
        color: SLIDE_DIM,
        valign: "middle",
        margin: BOX_PAD,
      });
      slide.addText(String(pageNumber), {
        x: 12,
        y: SLIDE_H - FOOTER_H,
        w: 1,
        h: FOOTER_H,
        fontFace: "Courier New",
        fontSize: 10,
        color: SLIDE_DIM,
        align: "right",
        valign: "middle",
        margin: BOX_PAD,
      });
    };

    const addSectionDivider = (title: string, number: string) => {
      const slide = pptx.addSlide();
      slide.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: SLIDE_W,
        h: SLIDE_H,
        fill: { color: NAVY },
        line: { color: NAVY },
      });
      slide.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: SLIDE_W,
        h: 0.08,
        fill: { color: CHART_COLORS.primary },
        line: { color: CHART_COLORS.primary },
      });
      slide.addText(number, {
        x: 0.8,
        y: 2.0,
        w: 2,
        h: 1.5,
        fontFace: "Courier New",
        fontSize: 72,
        color: CHART_COLORS.primary,
        transparency: 70,
        bold: true,
      });
      slide.addText(title, {
        x: 0.8,
        y: 3.2,
        w: 11.5,
        h: 1.2,
        fontFace: "Inter",
        fontSize: 48,
        color: "FFFFFF",
        bold: true,
      });
    };
    const smartTitle = (s: string): string => {
      const PRESERVE = /^(HaloPSA|ConnectWise|3CX|Microsoft|Azure|Google|AWS|VMware|Veeam|Cisco|Barracuda|SQL|CRM|ERP|VPN|MFA|SLA|SOW|IT|MSP|PSA|AI|API|UI|UX|ID|P1|P2|P3|P4|SO|PRJ|INC|RFC)$/i;
      return s.split(/\s+/).map((w) => {
        if (PRESERVE.test(w)) return w; // known product/acronym - leave exactly as-is
        if (/[A-Z].*[A-Z]/.test(w)) return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); // mixed case like UPgrades → Upgrades
        if (/[A-Z]/.test(w)) return w; // single uppercase start - leave alone
        return w.charAt(0).toUpperCase() + w.slice(1); // all lowercase - title-case
      }).join(" ");
    };

    let page = 1;
    const qbrClientName =
      ((qbr as GeneratedQbr & { clientName?: string }).clientName ?? qbr.brandName ?? "Client").trim() || "Client";
    const qbrCover = qbr as GeneratedQbr & {
      clientName?: string;
      client?: { name?: string };
    };
    const coverHeroName =
      qbrCover.clientName || qbrCover.client?.name || qbr.brandName || "Client";
    const heroFontSize =
      coverHeroName.length <= 10
        ? 116
        : coverHeroName.length <= 16
          ? 90
          : coverHeroName.length <= 22
            ? 72
            : 56;
    const coverIssueDate = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const cover = pptx.addSlide();
    cover.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: SLIDE_W,
      h: SLIDE_H,
      fill: { color: NAVY },
      line: { color: NAVY },
    });
    cover.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: SLIDE_W,
      h: 0.08,
      fill: { color: CHART_COLORS.primary },
      line: { color: CHART_COLORS.primary },
    });
    if (headerLogoData) {
      const maxW = 1.8;
      const maxH = 0.55;
      const aspect = logoNaturalW / Math.max(logoNaturalH, 1);
      const logoW = Math.min(maxW, maxH * aspect);
      const logoH = logoW / aspect;
      cover.addImage({
        data: headerLogoData,
        x: 0.5,
        y: 0.18,
        w: logoW,
        h: logoH,
      });
    } else if (qbr.brandName?.trim()) {
      cover.addText(qbr.brandName.trim(), {
        x: 0.8,
        y: 0.24,
        w: 3.5,
        h: 0.5,
        fontFace: "Inter",
        fontSize: 18,
        color: "FFFFFF",
        bold: true,
      });
    }
    cover.addText("QUARTERLY BUSINESS REVIEW", {
      x: 0.8,
      y: 1.2,
      w: 11.5,
      h: 0.4,
      fontFace: "Courier New",
      fontSize: 11,
      color: CHART_COLORS.primary,
      bold: false,
    });
    cover.addText(coverHeroName, {
      x: 0.8,
      y: 1.8,
      w: 11.5,
      h: 3.55,
      fontFace: "Inter",
      fontSize: heroFontSize,
      color: "FFFFFF",
      bold: true,
    });
    cover.addText(`${qbr.dateRangeLabel} · Issued ${coverIssueDate}`, {
      x: 0.8,
      y: 5.1,
      w: 8,
      h: 0.4,
      fontFace: "Courier New",
      fontSize: 12,
      color: "FFFFFF",
      transparency: 40,
    });
    if (!headerLogoData && qbr.brandName?.trim()) {
      cover.addText(qbr.brandName.trim(), {
        x: 0.8,
        y: 6.6,
        w: 4,
        h: 0.4,
        fontFace: "Inter",
        fontSize: 14,
        color: "FFFFFF",
        bold: true,
      });
    }
    cover.addText(`Prepared for ${qbrClientName}`, {
      x: 8,
      y: 6.6,
      w: 4.5,
      h: 0.4,
      fontFace: "Courier New",
      fontSize: 11,
      color: "FFFFFF",
      transparency: 40,
      align: "right",
    });

    let _sectionNum = 0;
    const _nextSection = () => String(++_sectionNum).padStart(2, "0");

    addSectionDivider("Executive Summary", _nextSection());
    const executive = pptx.addSlide();
    addChrome(executive, "Executive Summary", page++);
    executive.addText("SECTION 01 · OVERVIEW", {
      x: 0.4,
      y: 0.85,
      w: 6.5,
      h: 0.2,
      fontSize: 9,
      fontFace: "Courier New",
      color: CHART_COLORS.primary,
      charSpacing: 3,
    });
    executive.addText("Executive summary.", {
      x: 0.4,
      y: 1.1,
      w: 6.5,
      h: 0.7,
      fontSize: 40,
      fontFace: "Inter",
      bold: true,
      color: SLIDE_TEXT,
    });
    if (qbr.execPullQuote?.trim()) {
      executive.addText(`\u201C${qbr.execPullQuote.trim()}\u201D`, {
        x: 0.4,
        y: 1.95,
        w: 8.5,
        h: 1.4,
        fontSize: 22,
        fontFace: "Inter",
        bold: true,
        color: SLIDE_TEXT,
        italic: false,
        wrap: true,
      });
    }
    const slaDisplay = (qbr.slaCompliancePct === null || qbr.slaCompliancePct === 0)
      ? " - "
      : `${qbr.slaCompliancePct}%`;
    const slaSub = (qbr.slaCompliancePct === null || qbr.slaCompliancePct === 0)
      ? "Insufficient data"
      : "Resolution quality";
    const kpiRows = [
      { label: "TOTAL TICKETS", value: String(qbr.openVsClosed.raised), sub: "Raised in period" },
      { label: "OPEN TICKETS", value: String(qbr.openVsClosed.open), sub: "Still open now" },
      { label: "SLA COMPLIANCE", value: slaDisplay, sub: slaSub },
      { label: "PROJECTS", value: String(qbr.projects.length), sub: "In reporting scope" },
    ];
    kpiRows.forEach((kpi, idx) => {
      const cardY = 0.85 + idx * 1.45;
      executive.addShape(pptx.ShapeType.rect, {
        x: 9.2,
        y: cardY,
        w: 3.9,
        h: 1.35,
        fill: { color: SLIDE_BORDER },
        line: { color: SLIDE_BORDER },
      });
      executive.addText(kpi.label, {
        x: 9.38,
        y: cardY + 0.1,
        w: 3.5,
        h: 0.2,
        fontSize: 8,
        fontFace: "Courier New",
        color: SLIDE_DIM,
        charSpacing: 2,
      });
      executive.addText(kpi.value, {
        x: 9.38,
        y: cardY + 0.35,
        w: 3.5,
        h: 0.6,
        fontSize: 36,
        fontFace: "Courier New",
        bold: true,
        color: SLIDE_TEXT,
      });
      executive.addText(kpi.sub, {
        x: 9.38,
        y: cardY + 0.95,
        w: 3.5,
        h: 0.2,
        fontSize: 10,
        fontFace: "Inter",
        color: SLIDE_DIM,
      });
    });

    addSectionDivider("Ticket Overview", _nextSection());

    const metrics = pptx.addSlide();
    addChrome(metrics, "Ticket Metrics", page++);
    metrics.addText("Ticket Volume (Weekly)", {
      x: leftX,
      y: bodyTop,
      w: 5.8,
      h: 0.35,
      fontFace: "Inter",
      bold: true,
      fontSize: BODY_FS,
      color: NAVY,
    });
    const maxWeekly = Math.max(1, ...qbr.weeklyCounts.map((w) => w.count));
    qbr.weeklyCounts.slice(0, 8).forEach((w, idx) => {
      const y = bodyTop + 0.45 + idx * 0.58;
      const barW = Math.max(0.2, (w.count / maxWeekly) * 3.5);
      const c = idx === 0 ? CHART_COLORS.primary : CHART_COLORS.neutral;
      metrics.addText(w.week, { x: leftX, y, w: 1.4, h: 0.24, fontFace: "Inter", fontSize: BODY_FS, color: BODY });
      metrics.addShape(pptx.ShapeType.rect, { x: 2.15, y: y + 0.02, w: barW, h: 0.22, fill: { color: c }, line: { color: c } });
      metrics.addText(w.count.toLocaleString(), { x: 5.75, y, w: 0.8, h: 0.24, fontFace: "Courier New", fontSize: BODY_FS, color: BODY, align: "right" });
    });
    metrics.addText("Resolution Performance", {
      x: 7.0,
      y: bodyTop,
      w: 5.9,
      h: 0.35,
      fontFace: "Inter",
      bold: true,
      fontSize: BODY_FS,
      color: NAVY,
    });
    metrics.addText(
      "Average time in hours to resolve tickets by priority level during the reporting period.",
      {
        x: 7.0,
        y: bodyTop + 0.38,
        w: 5.9,
        h: 0.55,
        fontFace: "Inter",
        fontSize: BODY_FS,
        color: SLIDE_TEXT,
        wrap: true,
      },
    );
    const maxRes = Math.max(1, ...qbr.resolutionByPriority.map((r) => r.avgHours));
    const p3Row = qbr.resolutionByPriority.find((r) => r.key === "P3");
    const bench =
      p3Row && p3Row.avgHours <= 48
        ? "Industry benchmark for P3 resolution is typically 24-48 hours."
        : "";
    qbr.resolutionByPriority.forEach((r, idx) => {
      const y = bodyTop + 1.05 + idx * 0.95;
      const barW = Math.max(0.2, (r.avgHours / maxRes) * 3.2);
      const c = idx === 0 ? CHART_COLORS.primary : CHART_COLORS.neutral;
      const existingBenchmarkText =
        r.key === "P3" && r.avgHours <= 48
          ? "Industry benchmark for P3 resolution is typically 24-48 hours."
          : "";
      const displayHours = r.ticketCount < 3 ? " - " : `${r.avgHours.toFixed(1)}h`;
      const displaySub = r.ticketCount < 3 ? "Too few tickets" : existingBenchmarkText;
      const line = `${r.priority}: ${displayHours} average resolution time`;
      metrics.addText(line, {
        x: 7.0,
        y: y + 0.15,
        w: 6.1,
        h: 0.28,
        fontFace: "Inter",
        fontSize: BODY_FS,
        color: BODY,
        wrap: true,
      });
      if (displaySub) {
        metrics.addText(displaySub, {
          x: 7.0,
          y: y + 0.65,
          w: 6.1,
          h: 0.2,
          fontFace: "Inter",
          fontSize: 10,
          color: BODY,
          wrap: true,
        });
      }
      metrics.addShape(pptx.ShapeType.rect, { x: 7.0, y: y + 0.38, w: barW, h: 0.22, fill: { color: c }, line: { color: c } });
    });
    if (bench && !qbr.resolutionByPriority.some((r) => r.ticketCount < 3)) {
      metrics.addText(bench, {
        x: 7.0,
        y: bodyTop + 1.05 + qbr.resolutionByPriority.length * 0.78 + 0.1,
        w: 6.1,
        h: 0.55,
        fontFace: "Inter",
        italic: true,
        fontSize: BODY_FS,
        color: BODY,
        wrap: true,
      });
    }

    if (qbr.includedSections.periodComparison) {
      const pc = pptx.addSlide();
      addChrome(pc, "Period Comparison", page++);
      pc.addText(qbr.periodComparison.trendLine, {
        x: leftX,
        y: bodyTop,
        w: 12.3,
        h: 0.45,
        fontFace: "Inter",
        fontSize: BODY_FS,
        color: BODY,
        wrap: true,
      });
      const tbl = [
        "Metric | This period | Previous period",
        `Ticket volume | ${qbr.periodComparison.current.volume} | ${qbr.periodComparison.previous.volume}`,
        `Resolution rate % | ${qbr.periodComparison.current.resolutionPct} | ${qbr.periodComparison.previous.resolutionPct}`,
        `Avg resolution (hrs) | ${qbr.periodComparison.current.avgResolutionHrs} | ${qbr.periodComparison.previous.avgResolutionHrs}`,
      ].join("\n");
      pc.addText(tbl, {
        x: leftX,
        y: bodyTop + 0.55,
        w: 12.3,
        h: 2.5,
        fontFace: "Inter",
        fontSize: BODY_FS,
        color: BODY,
        valign: "top",
        wrap: true,
        margin: BOX_PAD,
      });
    }

    if (qbr.includedSections.recurringIssues) {
      const ri = pptx.addSlide();
      addChrome(ri, "Top Recurring Issues This Quarter", page++);
      const recurringSorted = [...qbr.recurringIssues.rows].sort((a, b) => b.count - a.count);
      const recurringTop = recurringSorted.slice(0, 5);
      if (recurringSorted.length > 5) {
        const remainderCount = recurringSorted.slice(5).reduce((sum, r) => sum + r.count, 0);
        const remainderPct = Number(
          recurringSorted.slice(5).reduce((sum, r) => sum + r.pct, 0).toFixed(1),
        );
        recurringTop.push({ name: "Other", count: remainderCount, pct: remainderPct });
      }
      const lines =
        recurringTop.length === 0
          ? "No category reached three or more occurrences."
          : recurringTop.map((r) => `${r.name}: ${r.count} (${r.pct}%)`).join("\n");
      ri.addText(lines, {
        x: leftX,
        y: bodyTop,
        w: 12.3,
        h: 2.2,
        fontFace: "Inter",
        fontSize: BODY_FS,
        color: BODY,
        valign: "top",
        wrap: true,
        margin: BOX_PAD,
      });
      ri.addText(qbr.recurringIssues.topInsight, {
        x: leftX,
        y: bodyTop + 2.35,
        w: 12.3,
        h: 1.2,
        fontFace: "Inter",
        italic: true,
        fontSize: BODY_FS,
        color: BODY,
        wrap: true,
        margin: BOX_PAD,
      });
    }

    if (qbr.includedSections.firstContactResolution) {
      const fcr = pptx.addSlide();
      addChrome(fcr, "First Contact Resolution", page++);
      const body =
        qbr.firstContactResolution.resolvedEvaluated === 0
          ? "No resolved tickets in this period."
          : `${qbr.firstContactResolution.pct}% (${qbr.firstContactResolution.fcrCount} of ${qbr.firstContactResolution.resolvedEvaluated} resolved tickets with no reassignment / transfer or escalation signals).\n\n${qbr.firstContactResolution.benchmarkNote}`;
      fcr.addText(body, {
        x: leftX,
        y: bodyTop,
        w: 12.3,
        h: recBoxH,
        fontFace: "Inter",
        fontSize: BODY_FS,
        color: BODY,
        valign: "top",
        wrap: true,
        margin: BOX_PAD,
      });
    }

    const projectChunks: GeneratedQbr["projectRows"][] = [];
    if (qbr.includedSections.projectStatus) {
      for (let i = 0; i < qbr.projectRows.length; i += 10) projectChunks.push(qbr.projectRows.slice(i, i + 10));
      if (projectChunks.length > 1 && projectChunks[projectChunks.length - 1]?.length === 1) {
        const last = projectChunks.pop();
        if (last && projectChunks[projectChunks.length - 1]) {
          projectChunks[projectChunks.length - 1].push(...last);
        }
      }
      if (projectChunks.length === 0) projectChunks.push([]);
      addSectionDivider("Project Status", _nextSection());
    }
    projectChunks.forEach((chunk, idx) => {
      const slide = pptx.addSlide();
      addChrome(
        slide,
        idx === 0 ? "Project Status Overview" : `Project Status · ${idx + 1} of ${projectChunks.length}`,
        page++,
      );
      const hdrY = bodyTop;
      const rowH = 0.42;
      chunk.forEach((p, i) => {
        const y = hdrY + i * rowH;
        const ragColor =
          p.rag === "Green"
            ? CHART_COLORS.ragGreen
            : p.rag === "Amber"
              ? CHART_COLORS.ragAmber
              : CHART_COLORS.ragRed;
        slide.addText(smartTitle(p.name), {
          x: leftX,
          y,
          w: 5.4,
          h: rowH,
          fontFace: "Inter",
          fontSize: 11,
          color: BODY,
          valign: "middle",
          wrap: true,
        });
        if (p.percent > 0) {
          slide.addShape(pptx.ShapeType.rect, {
            x: 5.85,
            y: y + 0.14,
            w: 3.5,
            h: 0.18,
            fill: { color: "E5E7EB" },
            line: { color: "E5E7EB" },
          });
          slide.addShape(pptx.ShapeType.rect, {
            x: 5.85,
            y: y + 0.14,
            w: (p.percent / 100) * 3.5,
            h: 0.18,
            fill: { color: CHART_COLORS.primary },
            line: { color: CHART_COLORS.primary },
          });
        }
        slide.addText(p.percent > 0 ? `${p.percent}%` : " - ", {
          x: 9.45,
          y,
          w: 0.75,
          h: rowH,
          fontFace: "Courier New",
          fontSize: 12,
          color: BODY,
          align: "right",
          valign: "middle",
        });
        if (p.percent === 0) {
          slide.addText(" - ", {
            x: 10.35,
            y: y + 0.1,
            w: 1.15,
            h: 0.28,
            fontFace: "Courier New",
            fontSize: 12,
            color: BODY,
            align: "center",
            valign: "middle",
          });
        } else {
          slide.addShape(pptx.ShapeType.roundRect, {
            x: 10.35,
            y: y + 0.1,
            w: 1.15,
            h: 0.28,
            fill: { color: ragColor },
            line: { color: ragColor },
            rectRadius: 0.04,
          });
          slide.addText(p.rag, {
            x: 10.35,
            y: y + 0.1,
            w: 1.15,
            h: 0.28,
            fontFace: "Courier New",
            bold: true,
            fontSize: 11,
            color: "FFFFFF",
            align: "center",
            valign: "middle",
          });
        }
      });
    });

    const riskChunks = chunkList(qbr.risks, 8);
    const actionChunks = chunkList(qbr.actions, 8);
    const raSlides = qbr.includedSections.risksActions ? Math.max(riskChunks.length, actionChunks.length, 1) : 0;
    if (qbr.includedSections.risksActions) {
      addSectionDivider("Risks & Actions", _nextSection());
    }
    for (let s = 0; s < raSlides; s += 1) {
      const slide = pptx.addSlide();
      const title =
        s === 0 ? "Risks and Actions" : "Risks and Actions (continued)";
      addChrome(slide, title, page++);
      const risksBlock = (riskChunks[s] ?? [])
        .map((r) => `• ${r.risk} (${r.impact})`)
        .join("\n");
      const actionsBlock = (actionChunks[s] ?? []).map((a) => `• ${a.task}`).join("\n");
      slide.addText("Risks", {
        x: leftX,
        y: bodyTop,
        w: 5.9,
        h: 0.35,
        fontFace: "Inter",
        bold: true,
        fontSize: BODY_FS,
        color: NAVY,
      });
      slide.addText(risksBlock || "• None", {
        x: leftX,
        y: bodyTop + 0.42,
        w: 5.9,
        h: 3.9,
        fontFace: "Inter",
        fontSize: BODY_FS,
        color: BODY,
        valign: "top",
        wrap: true,
        margin: BOX_PAD,
      });
      slide.addText("Actions", {
        x: 6.85,
        y: bodyTop,
        w: 5.9,
        h: 0.35,
        fontFace: "Inter",
        bold: true,
        fontSize: BODY_FS,
        color: NAVY,
      });
      slide.addText(actionsBlock || "• None", {
        x: 6.85,
        y: bodyTop + 0.42,
        w: 5.9,
        h: 3.9,
        fontFace: "Inter",
        fontSize: BODY_FS,
        color: BODY,
        valign: "top",
        wrap: true,
        margin: BOX_PAD,
      });
    }

    const lookAheadSection = _nextSection();
    const hasStructuredItems = Array.isArray(qbr.recommendationItems) && qbr.recommendationItems.length > 0;
    const hasFallbackText = typeof qbr.recommendations === "string" && qbr.recommendations.trim().length > 0;
    const fallbackItems = [
      { action: "Review open project status and confirm next milestones with client stakeholders", owner: "Service Delivery Manager", target: "End of Q3", riskAddressed: "Prevents project stall and maintains client confidence in delivery." },
      { action: "Schedule quarterly service review meeting to align on priorities and upcoming work", owner: "Account Manager", target: "End of Q3", riskAddressed: "Ensures ongoing alignment and surfaces any emerging concerns early." },
      { action: "Audit and close any tickets with no activity in the last 30 days", owner: "Service Desk Lead", target: "End of Q3", riskAddressed: "Reduces backlog noise and keeps the active queue focused on live issues." },
    ];
    const recText = (qbr.recommendations || "").trim();
    const recItems = (() => {
      if (!recText || recText === "-") return [] as string[];
      const lines = recText.split(/\n+/).map((l) => l.trim()).filter(Boolean);
      const items: string[] = [];
      for (const line of lines) {
        const cleaned = line.replace(/^[\s•\-*]+|^\d+[.)]\s*/, "").trim();
        if (cleaned) items.push(cleaned);
      }
      return items.length > 0 ? items : [recText];
    })();
    const structuredRecItemsRaw = (qbr.recommendationItems ?? []).filter((item) => item.action?.trim().length > 0).slice(0, 5);
    const structuredRecItems = hasStructuredItems
      ? structuredRecItemsRaw
      : !hasFallbackText
        ? fallbackItems
        : [];
    const hasStructuredMetadata = structuredRecItems.some((item) => item.owner?.trim() || item.target?.trim());
    if (structuredRecItems.length > 0 && hasStructuredMetadata) {
        const rec = pptx.addSlide();
        addChrome(rec, "Next quarter priorities.", page++);
        rec.addText(`${lookAheadSection} · LOOKING AHEAD`, {
          x: 0.4,
          y: 0.85,
          w: 6.5,
          h: 0.22,
          fontFace: "Courier New",
          fontSize: 9,
          color: CHART_COLORS.primary,
          charSpacing: 3,
        });
        structuredRecItems.forEach((item, i) => {
          const rowY = 1.1 + i * 1.18;
          const cleanAction = item.action.replace(/['"]/g, "");
          const cleanRisk = item.riskAddressed.replace(/['"]/g, "");
          rec.addText(String(i + 1).padStart(2, "0"), {
            x: 0.35,
            y: rowY,
            w: 0.9,
            h: 0.9,
            fontSize: 52,
            fontFace: "Courier New",
            bold: true,
            color: CHART_COLORS.primary,
            wrap: false,
          });
          rec.addText(cleanAction, {
            x: 1.4,
            y: rowY + 0.05,
            w: 7.8,
            h: 0.55,
            fontSize: 12,
            fontFace: "Inter",
            bold: true,
            color: SLIDE_TEXT,
            wrap: true,
          });
          rec.addText(cleanRisk, {
            x: 1.4,
            y: rowY + 0.62,
            w: 7.5,
            h: 0.42,
            fontSize: 10,
            fontFace: "Inter",
            color: SLIDE_DIM,
            wrap: true,
          });
          rec.addText(`OWNER  ${item.owner || "TBC"}`, {
            x: 9.4,
            y: rowY + 0.08,
            w: 3.7,
            h: 0.25,
            fontSize: 8,
            fontFace: "Courier New",
            color: SLIDE_DIM,
          });
          rec.addText(`TARGET  ${item.target || "TBC"}`, {
            x: 9.4,
            y: rowY + 0.50,
            w: 3.7,
            h: 0.25,
            fontSize: 9,
            fontFace: "Courier New",
            color: CHART_COLORS.primary,
          });
          rec.addShape(pptx.ShapeType.line, {
            x: 0.35,
            y: rowY + 1.15,
            w: 12.8,
            h: 0,
            line: { color: SLIDE_BORDER, width: 0.5 },
          });
        });
    } else {
        const REC_CARDS_PER_SLIDE = 8;
        const recChunks: string[][] = [];
        const fallbackTextItems =
          recItems.length > 0
            ? recItems
            : fallbackItems.map((item) => item.action);
        for (let i = 0; i < fallbackTextItems.length; i += REC_CARDS_PER_SLIDE) {
          recChunks.push(fallbackTextItems.slice(i, i + REC_CARDS_PER_SLIDE));
        }
        if (recChunks.length === 0) recChunks.push([]);
        recChunks.forEach((chunk, ri) => {
          const rec = pptx.addSlide();
          addChrome(
            rec,
            ri === 0 ? "Next quarter priorities." : "Next quarter priorities.",
            page++,
          );
          if (ri === 0) {
            rec.addText(`${lookAheadSection} · LOOKING AHEAD`, {
              x: 0.4,
              y: 0.85,
              w: 6.5,
              h: 0.22,
              fontFace: "Courier New",
              fontSize: 9,
              color: CHART_COLORS.primary,
              charSpacing: 3,
            });
          }
          const baseGlobalIndex = ri * REC_CARDS_PER_SLIDE;
          const leftCount = Math.ceil(chunk.length / 2);
          let leftCardY = 1.1;
          let rightCardY = 1.1;
          chunk.forEach((text, i) => {
            const isLeft = i < leftCount;
            const colX = isLeft ? 0.4 : 6.55;
            const cardY = isLeft ? leftCardY : rightCardY;
            const badgeY = cardY + 0.26;
            rec.addShape(pptx.ShapeType.rect, {
              x: colX,
              y: badgeY,
              w: 0.32,
              h: 0.32,
              fill: { color: CHART_COLORS.primary },
              line: { color: CHART_COLORS.primary },
            });
            rec.addText(String(baseGlobalIndex + i + 1), {
              x: colX,
              y: badgeY,
              w: 0.32,
              h: 0.32,
              fontFace: "Courier New",
              fontSize: 11,
              bold: true,
              color: "FFFFFF",
              align: "center",
              valign: "middle",
              margin: 0,
            });
            rec.addText(text, {
              x: colX + 0.42,
              y: cardY + 0.08,
              w: 5.18,
              h: 1.1,
              fontFace: "Inter",
              fontSize: 11,
              color: SLIDE_TEXT,
              valign: "middle",
              wrap: true,
            });
            if (isLeft) leftCardY += 1.3;
            else rightCardY += 1.3;
          });
          if (chunk.length === 0) {
            rec.addText(" - ", {
              x: 0.4,
              y: 1.1,
              w: 11.5,
              h: 0.5,
              fontFace: "Inter",
              fontSize: 11,
              color: SLIDE_TEXT,
            });
          }
        });
    }

    const _qbrFallbackDate = new Date();
    const qbrExportMeta = qbr as GeneratedQbr & {
      periodEndDate?: string;
      periodEnd?: string;
      clientName?: string;
      client?: { name?: string };
    };
    let _periodEnd: Date | null = null;
    if (qbrExportMeta.periodEndDate) {
      const d = new Date(qbrExportMeta.periodEndDate);
      if (!Number.isNaN(d.getTime())) _periodEnd = d;
    } else if (qbrExportMeta.periodEnd) {
      const d = new Date(qbrExportMeta.periodEnd);
      if (!Number.isNaN(d.getTime())) _periodEnd = d;
    } else {
      const label = qbr.dateRangeLabel.trim();
      if (label && label.toLowerCase() !== "all time") {
        const endPart = label.includes(" - ") ? label.split(" - ").pop()?.trim() ?? "" : "";
        const m = endPart.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m) {
          const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
          if (!Number.isNaN(d.getTime())) _periodEnd = d;
        }
      }
    }
    if (!_periodEnd) {
      console.warn("[exportPptx] No period end date on QBR; using export date for quarter in filename");
      _periodEnd = _qbrFallbackDate;
    }
    const _qbrQuarter = `Q${Math.ceil((_periodEnd.getMonth() + 1) / 3)}-${_periodEnd.getFullYear()}`;
    const _clientName =
      qbrExportMeta.clientName || qbrExportMeta.client?.name || qbr.brandName || "Client";
    const _qbrSafeName = _clientName
      .replace(/[^a-zA-Z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    const fileName = `${_qbrSafeName}_QBR_${_qbrQuarter}.pptx`;
    const buf = await pptx.write({ outputType: "arraybuffer" });
    const zip = await JSZip.loadAsync(buf);
    const themePath = "ppt/theme/theme1.xml";
    const themeFile = zip.file(themePath);
    if (themeFile) {
      let theme = await themeFile.async("string");
      const brandHex = colorNoHash(accent) || "2563EB";
      const palette: Record<string, string> = {
        accent1: brandHex,
        accent2: "B79268",
        accent3: "0F1C3F",
        accent4: "C8553D",
        accent5: "D9A441",
        accent6: "4E9C6F",
      };
      for (const [name, hex] of Object.entries(palette)) {
        theme = theme.replace(
          new RegExp(`(<a:${name}>\\s*<a:srgbClr val=")[0-9A-Fa-f]{6}(")`, "i"),
          `$1${hex}$2`,
        );
      }
      zip.file(themePath, theme);
    }
    const themedBuf = await zip.generateAsync({ type: "uint8array" });
    const blob = new Blob(
      [themedBuf.buffer as ArrayBuffer],
      { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    if (!qbr) return;
    try {
      generateQbrPdf(qbr, qbr.includedSections);
      toast({ message: "QBR pack exported as PDF", durationMs: 2500 });
    } catch (e) {
      console.error("[qbr-pdf] PDF generation failed:", e);
      toast({
        message: e instanceof Error ? e.message : "Failed to generate PDF export.",
        variant: "error",
      });
    }
  }

  const builder = (
    <>
      {demoMode ? <DemoBanner className="mb-3" /> : null}
      {noPsaConnected ? (
        <PSAEmptyState
          title="No PSA connected"
          description="Connect your PSA to build QBR packs from live ticket and project data."
        />
      ) : (
      <div className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-4 md:p-6">
        {usageHint ? <p className="mb-4 text-xs text-[var(--text-muted)]">{usageHint}</p> : null}
        <div className="mb-5 flex flex-wrap gap-2">
          {([
            { id: 1, title: "Date Range" },
            { id: 2, title: "Sources" },
            { id: 3, title: "Clients" },
            { id: 4, title: "Sections" },
            { id: 5, title: "Branding" },
          ] as const).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStep(item.id)}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${step === item.id ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-secondary)] text-[var(--text-secondary)]"}`}
            >
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-black/10 text-[11px]">{item.id}</span>
              {item.title}
            </button>
          ))}
        </div>

        {step === 1 ? (
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Choose Date Range</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Define the period covered by this QBR pack.</p>
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {(["all_time", "last_30_days", "last_90_days", "last_6_months", "last_12_months", "custom"] as const).map((r) => (
                  <Button key={r} type="button" variant={dateRange === r ? "default" : "outline"} onClick={() => setDateRange(r)}>
                    {r === "all_time"
                      ? "All time"
                      : r === "custom"
                        ? "Custom"
                        : r.replaceAll("_", " ")}
                  </Button>
                ))}
              </div>
              {dateRange === "custom" ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                  <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Select PSA Sources</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Choose which connected PSA systems feed this QBR pack.</p>
            </div>
            <div className="space-y-3">
              <label className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3">
                <span className="text-sm font-medium">HaloPSA</span>
                <Switch
                  checked={sources.halopsa}
                  disabled={!psaStatus.halo && !demoMode}
                  onCheckedChange={(v) => setSources((s) => ({ ...s, halopsa: Boolean(v) }))}
                />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3">
                <span className="text-sm font-medium">ConnectWise</span>
                <Switch
                  checked={sources.connectwise}
                  disabled={!psaStatus.connectwise && !demoMode}
                  onCheckedChange={(v) => setSources((s) => ({ ...s, connectwise: Boolean(v) }))}
                />
              </label>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Select Clients</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Choose clients with data in the selected date range.
              </p>
            </div>
            {(qbrAvailableClientsFiltered.length > 0 || qbrClientsLoading || clientsWithDataLoading) && (
              <div className="border-t border-[var(--border)] pt-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={qbrSelectedClients.length === qbrAvailableClientsFiltered.length && qbrAvailableClientsFiltered.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setQbrSelectedClients(qbrAvailableClientsFiltered.map((c) => `${c.source}:${String(c.id)}`));
                        } else {
                          setQbrSelectedClients([]);
                          setSelectedTicketIds(new Set());
                          setSelectedProjectIds(new Set());
                        }
                      }}
                      className="rounded border-[var(--border)] accent-[var(--accent)]"
                    />
                    <span className="text-[13px] font-semibold text-[var(--text-primary)]">Clients</span>
                    {qbrSelectedClients.length > 0 ? (
                      <span className="rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-[11px] font-medium text-[var(--accent)]">
                        {qbrSelectedClients.length} selected
                      </span>
                    ) : null}
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {qbrAvailableClientsFiltered.length} clients
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="mb-2 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  id="qbr-client-search"
                />
                {qbrClientsLoading || clientsWithDataLoading ? (
                  <p className="py-4 text-[13px] text-[var(--text-muted)]">Loading clients...</p>
                ) : (
                  <div className="max-h-none overflow-visible rounded-[var(--radius-lg)] border border-[var(--border)] md:max-h-[260px] md:overflow-y-auto">
                    {qbrAvailableClientsFiltered
                      .filter((c) => !clientSearch || c.name.toLowerCase().includes(clientSearch.toLowerCase()))
                      .map((client, idx) => {
                        const clientKey = `${client.source}:${String(client.id)}`;
                        const isSelected = qbrSelectedClients.includes(clientKey);
                        const isExpanded = qbrExpandedClients.has(clientKey);
                        const metrics = clientsWithData[clientKey] ?? { tickets: 0, projects: 0 };
                        return (
                          <div key={clientKey} className={cn(idx > 0 && "border-t border-[var(--border)]")}>
                            <div
                              className={cn(
                                "flex cursor-pointer select-none items-center gap-3 px-3 py-2.5 transition-colors",
                                isSelected ? "bg-[var(--accent)]/[0.07]" : "hover:bg-[var(--bg-secondary)]",
                              )}
                              onClick={async () => {
                                if (isSelected) {
                                  setQbrSelectedClients((prev) => prev.filter((id) => id !== clientKey));
                                  setSelectedTicketIds((prev) => new Set([...prev].filter((id) => !id.startsWith(`${clientKey}:`))));
                                  setSelectedProjectIds((prev) => new Set([...prev].filter((id) => !id.startsWith(`${clientKey}:`))));
                                  return;
                                }
                                setQbrSelectedClients((prev) => (prev.includes(clientKey) ? prev : [...prev, clientKey]));
                                const [clientTicketRows, clientProjectRows] = await Promise.all([
                                  loadTicketsForClient(client.id, client.source),
                                  loadProjectsForClient(client.id, client.source),
                                ]);
                                setSelectedTicketIds((prev) => {
                                  const next = new Set(prev);
                                  for (const t of clientTicketRows) next.add(`${clientKey}:${t.id}`);
                                  return next;
                                });
                                setSelectedProjectIds((prev) => {
                                  const next = new Set(prev);
                                  for (const p of clientProjectRows) next.add(`${clientKey}:${p.id}`);
                                  return next;
                                });
                              }}
                            >
                              <input type="checkbox" checked={isSelected} onChange={() => {}} className="pointer-events-none shrink-0 rounded accent-[var(--accent)]" />
                              <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--text-primary)]">
                                {client.name} ({metrics.tickets} tickets, {metrics.projects} projects)
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQbrExpandedClients((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(clientKey)) next.delete(clientKey);
                                    else next.add(clientKey);
                                    return next;
                                  });
                                  setClientExpandTab((prev) => ({ ...prev, [clientKey]: "tickets" }));
                                  void loadTicketsForClient(client.id, client.source);
                                  void loadProjectsForClient(client.id, client.source);
                                }}
                                className={cn(
                                  "flex shrink-0 items-center justify-center rounded p-1 transition-colors",
                                  isExpanded ? "text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                                )}
                                title="Show tickets and projects"
                              >
                                <svg className={cn("size-3.5 transition-transform duration-200", isExpanded && "rotate-180")} viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                            {isExpanded ? (
                              <div className="border-t border-[var(--border)]/60 bg-[var(--bg-secondary)]/50">
                                <div className="flex border-b border-[var(--border)]/60 px-3">
                                  {(["tickets", "projects"] as const).map((tab) => (
                                    <button
                                      key={tab}
                                      type="button"
                                      onClick={() => {
                                        setClientExpandTab((prev) => ({ ...prev, [clientKey]: tab }));
                                        if (tab === "tickets") void loadTicketsForClient(client.id, client.source);
                                        if (tab === "projects") void loadProjectsForClient(client.id, client.source);
                                      }}
                                      className={cn(
                                        "border-b-2 -mb-px px-3 py-2 text-[12px] font-medium transition-colors",
                                        (clientExpandTab[clientKey] ?? "tickets") === tab
                                          ? "border-[var(--accent)] text-[var(--accent)]"
                                          : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                                      )}
                                    >
                                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                    </button>
                                  ))}
                                </div>
                                <div className="max-h-none overflow-visible px-3 py-2 md:max-h-48 md:overflow-y-auto">
                                  {(clientExpandTab[clientKey] ?? "tickets") === "tickets" ? (
                                    loadingTickets[clientKey] ? (
                                      <p className="py-2 text-[12px] text-[var(--text-muted)]">Loading tickets...</p>
                                    ) : (clientTickets[clientKey] ?? []).length === 0 ? (
                                      <p className="py-2 text-[12px] text-[var(--text-muted)]">No tickets found</p>
                                    ) : (
                                      <div className="flex flex-col gap-0.5">
                                        {(clientTickets[clientKey] ?? []).map((ticket) => (
                                          <label key={ticket.id} className="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 hover:bg-[var(--bg-primary)] transition-colors">
                                            <input
                                              type="checkbox"
                                              checked={selectedTicketIds.has(`${clientKey}:${ticket.id}`)}
                                              onChange={(e) => {
                                                const ticketKey = `${clientKey}:${ticket.id}`;
                                                setSelectedTicketIds((prev) => {
                                                  const next = new Set(prev);
                                                  if (e.target.checked) next.add(ticketKey);
                                                  else next.delete(ticketKey);
                                                  return next;
                                                });
                                              }}
                                              className="shrink-0 rounded accent-[var(--accent)]"
                                            />
                                            <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--text-secondary)]">{ticket.title}</span>
                                          </label>
                                        ))}
                                      </div>
                                    )
                                  ) : loadingProjects[clientKey] ? (
                                    <p className="py-2 text-[12px] text-[var(--text-muted)]">Loading projects...</p>
                                  ) : (clientProjects[clientKey] ?? []).length === 0 ? (
                                    <p className="py-2 text-[12px] text-[var(--text-muted)]">No projects found</p>
                                  ) : (
                                    <div className="flex flex-col gap-0.5">
                                      {(clientProjects[clientKey] ?? []).map((project) => (
                                        <label key={project.id} className="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 hover:bg-[var(--bg-primary)] transition-colors">
                                          <input
                                            type="checkbox"
                                            checked={selectedProjectIds.has(`${clientKey}:${project.id}`)}
                                            onChange={(e) => {
                                              const projectKey = `${clientKey}:${project.id}`;
                                              setSelectedProjectIds((prev) => {
                                                const next = new Set(prev);
                                                if (e.target.checked) next.add(projectKey);
                                                else next.delete(projectKey);
                                                return next;
                                              });
                                            }}
                                            className="shrink-0 rounded accent-[var(--accent)]"
                                          />
                                          <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--text-secondary)]">{project.title}</span>
                                        </label>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            {autoIntelligence ? (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-3 py-2 text-[12px] text-[var(--accent)]">
                <Brain className="size-3.5 shrink-0" />
                Client Intelligence context loaded - this Service Review is enriched with account history
              </div>
            ) : null}
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Configure Sections</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Choose exactly what appears in the final QBR pack.</p>
            </div>
            {step3Loading ? (
              <p className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Loader2 className="size-4 shrink-0 animate-spin text-[var(--accent)]" aria-hidden />
                Checking your data for the selected period...
              </p>
            ) : step3Snapshot ? (
              <div
                className="rounded-lg border border-cyan-200/90 bg-cyan-50 px-3 py-2.5 text-sm leading-relaxed text-cyan-950 dark:border-cyan-800/80 dark:bg-cyan-950/35 dark:text-cyan-50"
                role="status"
              >
                We found{" "}
                <strong>{step3Snapshot.stats.ticketCount}</strong>{" "}
                {step3Snapshot.stats.ticketCount === 1 ? "ticket" : "tickets"} and{" "}
                <strong>{step3Snapshot.stats.projectCount}</strong>{" "}
                {step3Snapshot.stats.projectCount === 1 ? "project" : "projects"}{" "}
                {dateRange === "all_time"
                  ? "across all available data."
                  : dateRange === "custom" && customFrom.trim() && customTo.trim()
                  ? `from ${new Date(customFrom).toLocaleDateString("en-GB")} to ${new Date(customTo).toLocaleDateString("en-GB")}.`
                  : dateRange === "last_30_days"
                    ? "in the last 30 days."
                    : dateRange === "last_6_months"
                      ? "in the last 6 months."
                      : dateRange === "last_12_months"
                        ? "in the last 12 months."
                      : "in the last 90 days."}{" "}
                <strong>{countSectionsAvailable(step3Snapshot)}</strong> of 12 section types have enough data to generate.
                {12 - countSectionsAvailable(step3Snapshot) > 0 ? (
                  <>
                    {" "}
                    You can still build a strong pack with the sections that are available - the others are shown greyed out
                    until your data meets their thresholds.
                  </>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-amber-800 dark:text-amber-300">
                Could not load validation data. Confirm PSA connections and try again.
              </p>
            )}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(Object.keys(DEFAULT_SECTIONS) as Array<keyof QbrSections>).map((k) => {
                const flag = step3Snapshot?.flags[k];
                const insufficient = Boolean(flag && !flag.ok);
                const checking = step3Loading;
                const canToggle = !insufficient && !checking;
                return (
                  <div
                    key={k}
                    className={`rounded-lg border p-3 ${
                      insufficient
                        ? "border-[var(--border)] bg-[var(--bg-secondary)] opacity-50"
                        : "border-[var(--border)] bg-[var(--bg-primary)]"
                    }`}
                  >
                    {checking ? (
                      <div className="mb-2 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
                        Checking data...
                      </div>
                    ) : null}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{SECTION_UI[k].label}</p>
                          {insufficient && !checking ? (
                            <span
                              className="inline-flex shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
                              title={flag?.tooltip ?? "Not enough data for this section."}
                            >
                              Not enough data
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{SECTION_UI[k].description}</p>
                      </div>
                      <Switch
                        checked={insufficient ? false : sections[k]}
                        disabled={!canToggle}
                        onCheckedChange={(v) => {
                          if (!canToggle) return;
                          setSections((s) => ({ ...s, [k]: Boolean(v) }));
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Branding</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Set identity details used in exports and chart styling.</p>
              <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">Your logo will appear on every slide.</p>
              <div className="mt-3 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                <p>
                  <strong>{selectionCounts.tickets}</strong> tickets and{" "}
                  <strong>{selectionCounts.projects}</strong> projects selected across{" "}
                  <strong>{selectionCounts.clients}</strong>{" "}
                  clients
                </p>
                <p className="mt-1">
                  Date range:{" "}
                  {dateRange === "all_time"
                    ? "All time"
                    : dateRange === "custom" && customFrom.trim() && customTo.trim()
                    ? `${new Date(customFrom).toLocaleDateString("en-GB")} to ${new Date(customTo).toLocaleDateString("en-GB")}`
                    : dateRange === "last_30_days"
                      ? "Last 30 days"
                      : dateRange === "last_6_months"
                        ? "Last 6 months"
                        : dateRange === "last_12_months"
                          ? "Last 12 months"
                          : "Last 90 days"}
                </p>
              </div>
            </div>
            <div className="grid gap-2">
              <Input placeholder="Company name" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
              <Input placeholder="#38bdf8" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} />
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Company logo (optional)
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="mt-1 block w-full text-sm"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    void (async () => {
                      try {
                        const fd = new FormData();
                        fd.set("logo", f);
                        const res = await fetch("/api/brand/upload-logo", { method: "POST", body: fd });
                        const data = (await res.json()) as { url?: string; error?: string };
                        if (!res.ok) throw new Error(data.error || "Upload failed");
                        if (typeof data.url === "string") setBrandLogoUrl(data.url.trim());
                      } catch (err) {
                        toast({ message: err instanceof Error ? err.message : "Logo upload failed", variant: "error" });
                      }
                    })();
                  }}
                />
              </label>
              {brandLogoUrl ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={brandLogoUrl} alt="" className="h-10 w-auto max-w-[160px] object-contain" />
                  <Button type="button" variant="outline" size="sm" onClick={() => setBrandLogoUrl("")}>
                    Remove logo
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-3 border-t border-[var(--border)] pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-h-9 min-w-0 flex-1 items-center">
              {step > 1 ? (
                <Button type="button" variant="outline" onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4 | 5) : s))}>
                  Back
                </Button>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-2">
              {step < 5 ? (
                <Button
                  type="button"
                  disabled={
                    (step === 1 && !step1Valid) ||
                    (step === 2 && !step2Valid) ||
                    (step === 3 && !step3Valid) ||
                    (step === 4 && step4NextDisabled)
                  }
                  onClick={() => setStep((s) => (s < 5 ? ((s + 1) as 1 | 2 | 3 | 4 | 5) : s))}
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="button"
                  className="bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent)] hover:opacity-90"
                  disabled={!canGenerate || loading}
                  onClick={() => void generateQbr()}
                >
                  {loading ? "Generating QBR..." : "Generate QBR Pack"}
                </Button>
              )}
            </div>
          </div>
          {qbr ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void exportPdf()}>
                Export PDF
              </Button>
              <Button type="button" variant="outline" onClick={exportExcel}>
                Export Excel
              </Button>
              <Button type="button" variant="outline" onClick={() => void exportPptx()}>
                Export PowerPoint (.pptx)
              </Button>
            </div>
          ) : null}
        </div>
      </div>
      )}

      {qbr && pdfIncludedSections ? (
        <>
          <style
            dangerouslySetInnerHTML={{
              __html: `@container (max-width: 380px) { .qbr-pdf-header-shell .qbr-pdf-header-text { display: none !important; } }`,
            }}
          />
        <div className="flex flex-col gap-[24px] pt-0">
          <div
            id="qbr-pdf-content"
            className="qbr-pdf-render-root flex flex-col"
            style={{
              gap: 24,
              margin: 0,
              paddingTop: 0,
              fontFamily: PDF_FONT_STACK,
              fontSize: 13,
              fontWeight: 400,
              lineHeight: 1.65,
              wordSpacing: "normal",
              fontFeatureSettings: '"liga" 1',
              color: BODY_TEXT,
            }}
          >
            <QbrPdfChunk>
              <div className="flex flex-col" style={{ gap: 24 }}>
                <div
                  className="qbr-pdf-header-shell w-full rounded p-4"
                  style={{
                    border: `1px solid ${PDF_BORDER_HEX}`,
                    borderTop: `4px solid ${safeColorHex(qbr.brandColor)}`,
                    containerType: "inline-size",
                    fontFamily: PDF_FONT_STACK,
                  }}
                >
                  {qbr.brandLogoUrl ? (
                    <div className="flex w-full max-w-full flex-nowrap items-start justify-between gap-4" style={{ gap: "16px" }}>
                      <div
                        className="qbr-pdf-header-text min-w-0 shrink pr-2"
                        style={{ maxWidth: "calc(100% - 120px - 16px)" }}
                      >
                        <h3
                          style={{
                            fontSize: 18,
                            fontWeight: 600,
                            color: HEADING_NAVY,
                            fontFamily: PDF_FONT_STACK,
                            margin: 0,
                          }}
                        >
                          {qbr.brandName} QBR Pack
                        </h3>
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qbr.brandLogoUrl}
                        alt=""
                        className="h-auto max-h-[40px] max-w-[120px] w-auto shrink-0 object-contain"
                        style={{ objectFit: "contain" }}
                      />
                    </div>
                  ) : (
                    <>
                      <h3
                        style={{
                          fontSize: 18,
                          fontWeight: 600,
                          color: HEADING_NAVY,
                          fontFamily: PDF_FONT_STACK,
                          margin: 0,
                        }}
                      >
                        {qbr.brandName} QBR Pack
                      </h3>
                    </>
                  )}
                </div>
                {pdfIncludedSections.executiveSummary ? (
                  <section
                    className="rounded p-4"
                    style={{
                      border: `1px solid ${PDF_BORDER_HEX}`,
                      fontFamily: PDF_FONT_STACK,
                      pageBreakInside: "avoid",
                      breakInside: "avoid",
                    }}
                  >
                    <h4 style={QBR_PDF_H4}>Executive Summary</h4>
                    <p
                      style={{
                        ...QBR_PDF_BODY,
                        margin: 0,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {normaliseQbrPdfText(qbr.executiveSummary) || " - "}
                    </p>
                  </section>
                ) : null}
              </div>
            </QbrPdfChunk>
            {pdfIncludedSections.ticketVolume ? (
              <QbrPdfChunk>
                <section className="rounded p-4" style={{ border: `1px solid ${PDF_BORDER_HEX}`, fontFamily: PDF_FONT_STACK }}>
                  <h4 style={QBR_PDF_H4}>Ticket Volume Chart</h4>
                  <div
                    className="relative z-0 w-full shrink-0 overflow-hidden"
                    style={{ height: 256, pageBreakInside: "avoid", breakInside: "avoid" }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={qbr.weeklyCounts}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="week"
                          tick={{ fontSize: 11, fill: PDF_CAPTION_GREY, fontFamily: PDF_FONT_STACK }}
                        />
                        <YAxis tick={{ fontSize: 11, fill: PDF_CAPTION_GREY, fontFamily: PDF_FONT_STACK }} />
                        <Tooltip />
                        <Bar dataKey="count" name="Tickets">
                          {qbr.weeklyCounts.map((_, idx) => (
                            <Cell key={`w-${idx}`} fill={chartColor(idx)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              </QbrPdfChunk>
            ) : null}
            {pdfIncludedSections.resolutionPerformance ? (
              <QbrPdfChunk>
                <section className="rounded p-4" style={{ border: `1px solid ${PDF_BORDER_HEX}`, fontFamily: PDF_FONT_STACK }}>
                  <h4 style={{ ...QBR_PDF_H4, margin: "0 0 4px" }}>Average Resolution Time by Priority</h4>
                  <p style={{ ...QBR_PDF_CAPTION, margin: "0 0 12px" }}>Avg. Resolution Time (hrs)</p>
                  <div
                    className="relative z-0 w-full shrink-0 overflow-hidden"
                    style={{ height: 288, pageBreakInside: "avoid", breakInside: "avoid" }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={qbr.resolutionByPriority}
                        margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="priority"
                          tick={{ fontSize: 11, fill: PDF_CAPTION_GREY, fontFamily: PDF_FONT_STACK }}
                          label={{
                            value: "Priority Level",
                            position: "bottom",
                            offset: 8,
                            fontSize: 11,
                            fill: PDF_CAPTION_GREY,
                            fontFamily: PDF_FONT_STACK,
                          }}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: PDF_CAPTION_GREY, fontFamily: PDF_FONT_STACK }}
                          label={{
                            value: "Hours to Resolve",
                            angle: -90,
                            position: "insideLeft",
                            fontSize: 11,
                            fill: PDF_CAPTION_GREY,
                            fontFamily: PDF_FONT_STACK,
                          }}
                        />
                        <Tooltip
                          formatter={(value: number | string) => [`${value} hrs`, "Avg. Resolution Time (hrs)"]}
                          labelFormatter={(label) => String(label)}
                        />
                        <Bar dataKey="avgHours" name="Avg. Resolution Time (hrs)">
                          {qbr.resolutionByPriority.map((_, idx) => (
                            <Cell key={`res-${idx}`} fill={chartColor(idx)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <ul
                    className="relative z-[1] mt-4 flex w-full flex-wrap gap-x-4 gap-y-2 leading-snug"
                    style={{ ...QBR_PDF_CAPTION, color: BODY_TEXT, fontSize: 13 }}
                  >
                    {qbr.resolutionByPriority.map((r, idx) => (
                      <li key={r.key} className="flex max-w-[min(100%,280px)] items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: chartColor(idx) }} aria-hidden />
                        <span className="min-w-0" style={{ whiteSpace: "normal" }}>
                          {r.priority}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              </QbrPdfChunk>
            ) : null}
          {pdfIncludedSections.ticketBreakdown ? (
            <QbrPdfChunk>
              <section className="rounded p-4" style={{ border: `1px solid ${PDF_BORDER_HEX}`, fontFamily: PDF_FONT_STACK }}>
                <h4 style={QBR_PDF_H4}>
                  {qbr.ticketBreakdownMode === "status" ? "Ticket Breakdown by Status" : "Ticket Breakdown by Type and Category"}
                </h4>
                <div
                  className="relative z-0 w-full shrink-0 overflow-hidden"
                  style={{ height: 320, pageBreakInside: "avoid", breakInside: "avoid" }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 8, right: 8, bottom: 16, left: 8 }}>
                      <Pie
                        data={qbr.ticketBreakdown}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={88}
                        paddingAngle={2}
                        labelLine={{ stroke: "#94a3b8" }}
                        label={renderPieValueLabel}
                      >
                        {qbr.ticketBreakdown.map((entry, idx) => (
                          <Cell key={`${entry.name}-${idx}`} fill={chartColor(idx)} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul
                  className="relative z-[1] mt-4 flex w-full flex-wrap gap-x-4 gap-y-2 leading-snug"
                  style={{ ...QBR_PDF_BODY, margin: 0 }}
                >
                  {qbr.ticketBreakdown.map((d, i) => (
                    <li key={d.name} className="flex max-w-[min(100%,280px)] items-start gap-2">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: chartColor(i) }} aria-hidden />
                      <span className="min-w-0" style={{ whiteSpace: "normal" }}>
                        {d.name}: {d.value}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </QbrPdfChunk>
          ) : null}
          {pdfIncludedSections.openVsClosed ? (
            <QbrPdfChunk>
              <section className="rounded p-4" style={{ border: `1px solid ${PDF_BORDER_HEX}`, fontFamily: PDF_FONT_STACK }}>
                <h4 style={QBR_PDF_H4}>Open vs Resolved Tickets</h4>
                <div className="flex flex-col" style={{ gap: 16 }}>
                  <div style={QBR_PDF_BODY}>
                    <p style={{ ...QBR_PDF_BODY, fontWeight: 600, margin: "0 0 4px" }}>Total tickets: {qbr.openVsClosed.raised}</p>
                    <p style={{ ...QBR_PDF_BODY, margin: "0 0 4px" }}>Open Tickets: {qbr.openVsClosed.open}</p>
                    <p style={{ ...QBR_PDF_BODY, margin: 0 }}>Resolved Tickets: {qbr.openVsClosed.resolved}</p>
                  </div>
                  <div
                    className="relative z-0 w-full shrink-0 overflow-hidden"
                    style={{ height: 224, pageBreakInside: "avoid", breakInside: "avoid" }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 4, right: 4, bottom: 8, left: 4 }}>
                        <Pie
                          data={[
                            { name: "Open Tickets", value: qbr.openVsClosed.open },
                            { name: "Resolved Tickets", value: qbr.openVsClosed.resolved },
                          ]}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={48}
                          outerRadius={82}
                          paddingAngle={2}
                          labelLine={{ stroke: "#94a3b8" }}
                          label={renderPieValueLabel}
                        >
                          <Cell fill={chartColor(1)} />
                          <Cell fill={chartColor(0)} />
                        </Pie>
                        <Tooltip formatter={(v: number) => [v, "Tickets"]} contentStyle={{ color: BODY_TEXT, fontFamily: PDF_FONT_STACK }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul
                    className="relative z-[1] mt-2 flex w-full flex-wrap gap-x-4 gap-y-2 leading-snug"
                    style={{ ...QBR_PDF_BODY, margin: 0, listStyle: "none", padding: 0 }}
                  >
                    <li className="flex items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: chartColor(1) }} aria-hidden />
                      <span style={{ whiteSpace: "normal" }}>Open Tickets: {qbr.openVsClosed.open}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: chartColor(0) }} aria-hidden />
                      <span style={{ whiteSpace: "normal" }}>Resolved Tickets: {qbr.openVsClosed.resolved}</span>
                    </li>
                  </ul>
                </div>
              </section>
            </QbrPdfChunk>
          ) : null}
          {pdfIncludedSections.projectStatus ? (
            <QbrPdfChunk>
            <section className="rounded p-4" style={{ border: `1px solid ${PDF_BORDER_HEX}`, fontFamily: PDF_FONT_STACK }}>
              <h4 style={QBR_PDF_H4}>Project Status Overview</h4>
              {qbr.projectRows.length === 0 ? (
                <p style={QBR_PDF_BODY}>No projects in this period.</p>
              ) : (
                <div className="flex flex-col" style={{ gap: 8 }}>
                  {qbr.projectRows.map((p) => {
                    const ragColor = p.rag === "Green" ? "#22c55e" : p.rag === "Amber" ? "#f59e0b" : "#ef4444";
                    return (
                      <div
                        key={p.name}
                        className="flex flex-wrap items-center gap-2 rounded px-2 py-1.5"
                        style={{
                          ...QBR_PDF_BODY,
                          margin: 0,
                          pageBreakInside: "avoid",
                          breakInside: "avoid",
                          border: `1px solid ${PDF_BORDER_HEX}`,
                        }}
                      >
                        <span className="min-w-0 flex-1 font-medium leading-tight" style={{ whiteSpace: "normal" }}>
                          {p.name}
                        </span>
                        <span
                          className="shrink-0 rounded px-2 py-0.5 font-semibold text-white"
                          style={{ ...QBR_PDF_CAPTION, fontWeight: 600, fontSize: 11, background: ragColor, color: "#ffffff" }}
                        >
                          {p.rag}
                        </span>
                        <div className="flex min-w-[140px] flex-1 items-center gap-2 sm:max-w-[45%]">
                          <div
                            className="h-2 min-w-0 flex-1 overflow-hidden rounded"
                            style={{ backgroundColor: PDF_BG_SECONDARY_HEX }}
                          >
                            <div className="h-full rounded" style={{ width: `${p.percent}%`, background: ragColor }} />
                          </div>
                          <span className="w-10 shrink-0 text-right tabular-nums" style={QBR_PDF_BODY}>
                            {p.percent}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
            </QbrPdfChunk>
          ) : null}
          {pdfIncludedSections.slaPerformance ? (
            <QbrPdfChunk>
              <section className="rounded p-4" style={{ border: `1px solid ${PDF_BORDER_HEX}`, fontFamily: PDF_FONT_STACK }}>
                <h4 style={QBR_PDF_H4}>SLA Performance</h4>
                <p style={{ ...QBR_PDF_BODY, margin: 0, pageBreakInside: "avoid" }}>
                  {qbr.slaCompliancePct == null ? "SLA data unavailable" : `${qbr.slaCompliancePct}% compliance`}
                </p>
              </section>
            </QbrPdfChunk>
          ) : null}
          {pdfIncludedSections.risksActions
            ? (() => {
                const riskChunks = chunkList(qbr.risks, 10);
                const actionChunks = chunkList(qbr.actions, 10);
                const n = Math.max(riskChunks.length, actionChunks.length, 1);
                return (
                  <QbrPdfChunk>
                  <section className="rounded p-4" style={{ border: `1px solid ${PDF_BORDER_HEX}`, fontFamily: PDF_FONT_STACK }}>
                    <h4 style={QBR_PDF_H4}>Risks and Actions</h4>
                    <div className="flex flex-col" style={{ gap: 16 }}>
                      {Array.from({ length: n }, (_, i) => (
                        <div
                          key={`ra-${i}`}
                          className={`grid grid-cols-1 gap-4 md:grid-cols-2${i > 0 ? " pt-4" : ""}`}
                          style={i > 0 ? { borderTop: `1px solid ${PDF_BORDER_HEX}` } : undefined}
                        >
                          <div>
                            <h5 style={QBR_PDF_H5}>{n > 1 ? `Risks (part ${i + 1})` : "Risks"}</h5>
                            <ul className="list-disc space-y-2 pl-5" style={{ ...QBR_PDF_BODY, margin: 0 }}>
                              {(riskChunks[i] ?? []).map((r, idx) => (
                                <li key={`${r.risk}-${idx}`} style={{ whiteSpace: "normal" }}>
                                  {normaliseQbrPdfText(r.risk)}
                                  {r.impact ? ` (${normaliseQbrPdfText(r.impact)})` : ""}
                                </li>
                              ))}
                              {(riskChunks[i] ?? []).length === 0 ? <li>None listed</li> : null}
                            </ul>
                          </div>
                          <div>
                            <h5 style={QBR_PDF_H5}>{n > 1 ? `Actions (part ${i + 1})` : "Actions"}</h5>
                            <ul className="list-disc space-y-2 pl-5" style={{ ...QBR_PDF_BODY, margin: 0 }}>
                              {(actionChunks[i] ?? []).map((a, idx) => (
                                <li key={`${a.task}-${idx}`} style={{ whiteSpace: "normal" }}>
                                  {normaliseQbrPdfText(a.task)}
                                </li>
                              ))}
                              {(actionChunks[i] ?? []).length === 0 ? <li>None listed</li> : null}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                  </QbrPdfChunk>
                );
              })()
            : null}
          {pdfIncludedSections.nextSteps ? (
            <QbrPdfChunk>
              <section className="rounded p-4" style={{ border: `1px solid ${PDF_BORDER_HEX}`, fontFamily: PDF_FONT_STACK }}>
                <h4 style={QBR_PDF_H4}>Next Steps / Recommendations</h4>
                <p
                  style={{
                    ...QBR_PDF_BODY,
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {normaliseQbrPdfText(qbr.recommendations) || " - "}
                </p>
              </section>
            </QbrPdfChunk>
          ) : null}
          </div>
          {qbr.includedSections.periodComparison ? (
            <section className="rounded p-4"
                style={{ border: `1px solid ${PDF_BORDER_HEX}` }}>
              <h4 className="mb-2 text-lg font-semibold" style={{ color: HEADING_NAVY }}>
                Ticket Volume Comparison
              </h4>
              <p className="mb-3 text-sm" style={{ color: BODY_TEXT }}>
                {qbr.periodComparison.trendLine}
              </p>
              <div className="h-72 w-full min-h-[18rem] shrink-0 overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      {
                        metric: "Ticket volume",
                        thisPeriod: qbr.periodComparison.current.volume,
                        previousPeriod: qbr.periodComparison.previous.volume,
                      },
                      {
                        metric: "Resolution rate %",
                        thisPeriod: qbr.periodComparison.current.resolutionPct,
                        previousPeriod: qbr.periodComparison.previous.resolutionPct,
                      },
                      {
                        metric: "Avg resolution (hrs)",
                        thisPeriod: qbr.periodComparison.current.avgResolutionHrs,
                        previousPeriod: qbr.periodComparison.previous.avgResolutionHrs,
                      },
                    ]}
                    margin={{ top: 8, right: 8, left: 8, bottom: 28 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="metric" tick={{ fontSize: 11, fill: BODY_TEXT }} />
                    <YAxis tick={{ fontSize: 12, fill: BODY_TEXT }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ color: BODY_TEXT }} />
                    <Bar dataKey="thisPeriod" name="This period" fill={chartColor(0)} />
                    <Bar dataKey="previousPeriod" name="Previous period" fill={chartColor(1)} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          ) : null}
          {qbr.includedSections.recurringIssues ? (
            <section className="rounded p-4"
                style={{ border: `1px solid ${PDF_BORDER_HEX}` }}>
              <h4 className="mb-2 text-lg font-semibold" style={{ color: HEADING_NAVY }}>
                Top Recurring Issues This Quarter
              </h4>
              {qbr.recurringIssues.rows.length === 0 ? (
                <p className="text-sm" style={{ color: BODY_TEXT }}>
                  No category reached three or more occurrences in this period.
                </p>
              ) : (
                <>
                  <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm" style={{ color: BODY_TEXT }}>
                    {qbr.recurringIssues.rows.map((r) => (
                      <li key={r.name}>
                        {r.name} - {r.count} tickets ({r.pct}% of total)
                      </li>
                    ))}
                  </ol>
                  <p className="text-sm italic" style={{ color: BODY_TEXT }}>
                    {qbr.recurringIssues.topInsight}
                  </p>
                </>
              )}
            </section>
          ) : null}
          {qbr.includedSections.firstContactResolution ? (
            <section className="rounded p-4"
                style={{ border: `1px solid ${PDF_BORDER_HEX}` }}>
              <h4 className="mb-2 text-lg font-semibold" style={{ color: HEADING_NAVY }}>
                First Contact Resolution Rate
              </h4>
              {qbr.firstContactResolution.resolvedEvaluated === 0 ? (
                <p className="text-sm" style={{ color: BODY_TEXT }}>
                  No resolved tickets in this period - first contact resolution cannot be calculated.
                </p>
              ) : (
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-8">
                  <div className="mx-auto flex w-44 shrink-0 flex-col items-center">
                    <div className="h-36 w-44 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart
                          cx="50%"
                          cy="50%"
                          innerRadius="55%"
                          outerRadius="100%"
                          data={[{ name: "fcr", value: qbr.firstContactResolution.pct, fill: chartColor(1) }]}
                          startAngle={90}
                          endAngle={-270}
                        >
                          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                          <RadialBar dataKey="value" cornerRadius={6} background={{ fill: "#e5e7eb" }} />
                        </RadialBarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="mt-1 text-center text-2xl font-bold" style={{ color: HEADING_NAVY }}>
                      {qbr.firstContactResolution.pct}%
                    </p>
                  </div>
                  <div className="min-w-0 flex-1 text-sm" style={{ color: BODY_TEXT }}>
                    <p className="mb-2">
                      Based on {qbr.firstContactResolution.resolvedEvaluated} resolved tickets in period (
                      {qbr.firstContactResolution.fcrCount} with no reassignment / transfer or escalation signals in history).
                    </p>
                    <p className="text-xs leading-relaxed">{qbr.firstContactResolution.benchmarkNote}</p>
                  </div>
                </div>
              )}
            </section>
          ) : null}
        </div>
        </>
      ) : null}
    </>
  );

  if (embedded) {
    return <div className="space-y-4">{builder}</div>;
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full sm:w-auto"
        disabled={!hasProAccess}
        title={
          hasProAccess
            ? "Generate a visual quarterly business review pack"
            : "QBR Pack is available on Professional"
        }
        onClick={() => setOpen(true)}
      >
        Generate QBR Pack
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92dvh] max-w-[96vw] overflow-y-auto overscroll-contain sm:max-w-7xl md:max-h-[92vh] md:overscroll-auto">
          <DialogHeader>
            <DialogTitle>QBR Pack Builder</DialogTitle>
          </DialogHeader>
          {builder}
        </DialogContent>
      </Dialog>
    </>
  );
}

