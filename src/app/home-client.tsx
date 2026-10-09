"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  ArrowRight,
  AlertTriangle,
  BarChart2,
  Brain,
  Calendar,
  CalendarClock,
  Check,
  CheckSquare,
  ClipboardList,
  CheckCircle,
  CheckCircle2,
  ClipboardCheck,
  ChevronDown,
  CornerDownLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  Database,
  Eye,
  FileEdit,
  FileSpreadsheet,
  FileText,
  Globe,
  LayoutList,
  Loader2,
  Lock,
  Mail,
  Plug,
  Plus,
  PoundSterling,
  Shield,
  Sparkles,
  Sun,
  TrendingUp,
  Upload,
  User,
  Moon,
  Edit2,
  Pencil,
  Play,
  Trash2,
  Send,
  ThumbsDown,
  ThumbsUp,
  Zap,
  X,
  Info,
} from "lucide-react";
import { mutate } from "swr";
import { HandoverTourDevTrigger } from "@/components/handover-tour-dev-trigger";
import {
  advanceHandoverTourAfterGeneration,
  HANDOVER_TOUR_ELEMENT_WAIT_MS,
  hasHandoverTourStartedThisSession,
  registerHandoverTourCompletionHandler,
  startHandoverProductTour,
  waitForHandoverTourElement,
} from "@/lib/handover-tour-session";

import { createClient } from "@/lib/supabase";
import {
  getPlanLabel,
  getPlanTierFromFields,
  normalizePlanLabel,
  planFieldsFromProfileRow,
} from "@/lib/plans";
import {
  FREE_MONTHLY_GENERATION_LIMIT,
  GROWTH_MONTHLY_GENERATION_LIMIT,
  STARTER_MONTHLY_GENERATION_LIMIT,
  STARTER_MONTHLY_REPORT_LIMIT,
} from "@/lib/plan-limits";
import { partnerWhiteLabelActive } from "@/lib/white-label";
import { DemoBanner } from "@/components/demo-banner";
import { MarketingFooter } from "@/components/marketing-footer";
import { ReferralsSettingsPanel } from "@/components/referrals-settings-panel";
import { useToast } from "@/components/toasts";
import { useCwProjects, useCwTickets, useHaloTickets } from "@/lib/psa-cache";
import {
  parseActionsFromText,
  splitStatusReportDisplayBlocks,
  getActionLogExportFilename,
  getFullReportExportFilename,
  type ExportMeta,
  type FullReportOutputs,
} from "@/lib/export-parsers";
import {
  getCachedMeetingPrepContentFromKeys,
  getCachedMeetingPrepTicketTitleFromKeys,
} from "@/lib/meeting-prep-cache";
import { deriveAutoTitle } from "@/lib/derive-generation-title";
import { markUpgradePromptConsumed, readUpgradePromptConsumed } from "@/lib/upgrade-prompt-session";
import {
  STREAK_FLAME_CELEBRATION_MILESTONES,
  streakFlameColor,
  streakMilestoneToAchievementId,
} from "@/lib/achievements";
import {
  STRIPE_PRO_ANNUAL_PRICE_ID,
  STRIPE_PRO_MONTHLY_PRICE_ID,
} from "@/lib/stripe-price-ids";
import {
  detectImportFileFormat,
  formatImportedFileTypeLabel,
  IMPORT_FILE_PARSE_ERROR_MESSAGE,
  parseCSVFile,
  parseDocxFileToImportText,
  parseExcelFileToImportText,
} from "@/lib/file-import";
import {
  EXTENDED_PM_TAB_KEYS,
  EXTENDED_PM_TAB_KEYS_EXCEL_ONLY_STRIP,
  EXTENDED_PM_TAB_LABELS,
  type ExtendedPmTabKey,
  emptyExtendedOutputsObject,
  normalizeExtendedOutputKeys,
} from "@/lib/pm-output-tabs";
import {
  DEFAULT_EMAIL_CONTENT_PREFS,
  normalizeExcelExportEngineTabIds,
  SCHEDULE_EXCEL_CORE_KEYS,
  SCHEDULE_EXCEL_OPTIONAL_LABELS,
  SCHEDULE_EXCEL_OPTIONAL_TAB_KEYS,
  selectedExcelKeysFromRow,
  type NormalizedEmailContentPrefs,
} from "@/lib/scheduled-email-prefs";
import {
  londonWallScheduleTimeToUtcStored,
  utcStoredScheduleTimeToLondonWall,
} from "@/lib/scheduled-report-schedule-time";
import {
  computeNextRunUtc,
  getDateRangeEndIso,
  getDateRangeStartIso,
} from "@/lib/scheduled-reports";
import { buildClientEmailSignOffBlock } from "@/lib/client-email-signature";
import { buildDefaultClientEmailSubject } from "@/lib/client-email-send-html";
import { buildDeliveryHealthSwrKey } from "@/lib/delivery-health-swr";
import type { DeliveryHealthRow } from "@/lib/delivery-health";
import { DEMO_CLIENTS, DEMO_EXAMPLE_INPUT, DEMO_PROJECTS, DEMO_TICKETS } from "@/lib/demo-data";

/** Signed-in shell background — shared by top bar and main content for a seamless join. */
const SIGNED_IN_SHELL_BACKGROUND =
  "radial-gradient(ellipse at top right, rgba(14,165,233,0.04) 0%, transparent 60%), var(--bg-primary)";

const MAIN_VIEW_VALUES = [
  "overview",
  "generate",
  "reports",
  "delivery",
  "scheduled",
  "configuration",
  "organisation",
  "changelog",
  "client-intelligence",
  "approvals",
] as const;

type MainView = (typeof MAIN_VIEW_VALUES)[number];

const MAIN_VIEW_SET = new Set<string>(MAIN_VIEW_VALUES);

function isMainView(value: string | null): value is MainView {
  return value !== null && MAIN_VIEW_SET.has(value);
}

function homePathPreservingViewParam(): string {
  const view = new URLSearchParams(window.location.search).get("view");
  return view ? `/?view=${encodeURIComponent(view)}` : "/";
}

/** Extended outputs shown in Excel export only — excluded from on-screen output tab strip and panels. */
const EXCEL_ONLY_TAB_KEYS: ReadonlySet<string> = EXTENDED_PM_TAB_KEYS_EXCEL_ONLY_STRIP;

/** Display titles for schedule Data-step rows (raw Halo ticket records, no extra fetch). */
function scheduleDataStepSupportTitle(rec: Record<string, unknown>): string {
  for (const key of ["summary", "idsummary", "title", "subject", "name"] as const) {
    const v = rec[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  const rawId = rec.id ?? rec.ticket_id;
  return rawId != null ? `Ticket ${String(rawId)}` : "Ticket";
}

function scheduleDataStepProjectTitle(rec: Record<string, unknown>): string {
  for (const key of ["name", "summary", "title"] as const) {
    const v = rec[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  const rawId = rec.id ?? rec.ticket_id;
  return rawId != null ? `Project ${String(rawId)}` : "Project";
}

function deriveHaloPushTargetForSave(
  ids: number[],
  rows: { id: number; kind: "support" | "project" }[],
): "all" | "projects" | "tickets" {
  const supportIds = rows.filter((r) => r.kind === "support").map((r) => r.id);
  const projectIds = rows.filter((r) => r.kind === "project").map((r) => r.id);
  if (rows.length === 0) return "all";
  const sel = new Set(ids);
  const everyIncluded = (arr: number[]) =>
    arr.length > 0 && arr.every((id) => sel.has(id));
  const someIncluded = (arr: number[]) => arr.some((id) => sel.has(id));
  if (supportIds.length > 0 && projectIds.length > 0) {
    if (
      everyIncluded(supportIds) &&
      everyIncluded(projectIds) &&
      ids.length === rows.length
    )
      return "all";
    if (everyIncluded(projectIds) && !someIncluded(supportIds)) return "projects";
    if (everyIncluded(supportIds) && !someIncluded(projectIds)) return "tickets";
    return "all";
  }
  if (projectIds.length > 0) return everyIncluded(projectIds) ? "projects" : "all";
  if (supportIds.length > 0) return everyIncluded(supportIds) ? "tickets" : "all";
  return "all";
}

const LS_EXPORT_ACTIONS = "handover-export-prefs-actions";
const LS_EXPORT_RISKS = "handover-export-prefs-risks";
const LS_EXPORT_FULLREPORT = "handover-export-prefs-fullreport";
const LS_FIRST_GEN_TIP_DISMISSED = "handover_first_gen_tip_dismissed";
const LS_FIRST_GEN_CELEBRATED = "handover_first_gen_celebrated";
const LS_EXCEL_EXPORTED = "handover_excel_exported";
const LS_ONBOARDING_TABS = "handover_onboarding_explored_tabs";
const ONBOARDING_PAGE_SEEN_KEY = "handover_onboarding_page_seen";
const LS_BASIC_ACTION_EXPORT = "handover_onboarding_basic_action_export";
/** Soft cap for manual paste / PSA export text sent to /api/generate (matches server maxLength). */
const GENERATION_INPUT_CHAR_LIMIT = 25000;
const GENERATION_INPUT_WARN_CHARS = 22000;

const GEN_PROGRESS_MESSAGES = [
  "Reading your PSA data...",
  "Generating action log...",
  "Writing client email...",
  "Finalising report...",
] as const;
const SS_DEMO_INPUT = "handover_demo_input";
const SS_PRO_75_DISMISSED = "handover_pro_75_dismissed";
const LS_PRO_TEAM_RECO_SEEN = "handover_pro_team_reco_seen";
const PORTAL_SLUG_RE = /^[a-z0-9-]{3,30}$/;

/** Defaults for export column / tab pickers (also used when localStorage is empty). */
const EXPORT_DEFAULTS = {
  actions: [
    "task",
    "owner",
    "priority",
    "status",
    "due_date",
    "notes",
    "project_name",
    "client_name",
  ],
  risks: [
    "risk",
    "impact",
    "mitigation",
    "status",
    "owner",
    "priority",
    "rag",
    "project_name",
    "client_name",
  ],
  fullReport: {
    tabs: [
      "actions",
      "risks",
      "summary",
      "client_email",
      "status_report",
    ],
    actionColumns: [
      "task",
      "owner",
      "priority",
      "status",
      "due_date",
      "notes",
      "project_name",
      "client_name",
    ],
    riskColumns: [
      "risk",
      "impact",
      "mitigation",
      "status",
      "owner",
      "priority",
      "rag",
      "project_name",
      "client_name",
    ],
  },
} as const;

const EXPORT_ACTION_COLUMN_OPTIONS: { id: string; label: string }[] = [
  { id: "task", label: "Task" },
  { id: "owner", label: "Owner" },
  { id: "priority", label: "Priority" },
  { id: "status", label: "Status" },
  { id: "due_date", label: "Due date" },
  { id: "notes", label: "Notes" },
  { id: "project_name", label: "Project name" },
  { id: "client_name", label: "Client name" },
  { id: "date_generated", label: "Date generated" },
];

const EXPORT_RISK_COLUMN_OPTIONS: { id: string; label: string }[] = [
  { id: "risk", label: "Risk" },
  { id: "impact", label: "Impact" },
  { id: "mitigation", label: "Mitigation" },
  { id: "status", label: "Status" },
  { id: "owner", label: "Owner" },
  { id: "priority", label: "Priority" },
  { id: "rag", label: "RAG" },
  { id: "project_name", label: "Project name" },
  { id: "client_name", label: "Client name" },
  { id: "date_generated", label: "Date generated" },
  { id: "review_date", label: "Review date" },
];

const EXPORT_FULLREPORT_TAB_OPTIONS: { id: string; label: string }[] = [
  { id: "actions", label: "Action log tab" },
  { id: "risks", label: "Risk log tab" },
  { id: "summary", label: "Summary tab" },
  { id: "client_email", label: "Client email tab" },
  { id: "status_report", label: "Status report tab" },
  { id: "executive_summary", label: "Executive summary (from summary)" },
  { id: "rag_dashboard", label: "RAG dashboard tab" },
  ...EXTENDED_PM_TAB_KEYS.map((id) => ({
    id,
    label: `${EXTENDED_PM_TAB_LABELS[id]} tab`,
  })),
];

const ACTION_COL_IDS = new Set(EXPORT_ACTION_COLUMN_OPTIONS.map((o) => o.id));
const RISK_COL_IDS = new Set(EXPORT_RISK_COLUMN_OPTIONS.map((o) => o.id));
const FULLREPORT_TAB_IDS = new Set(EXPORT_FULLREPORT_TAB_OPTIONS.map((o) => o.id));

function sanitizePortalSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 30);
}

function toggleStringInArray(arr: string[], id: string, on: boolean): string[] {
  if (on) return arr.includes(id) ? arr : [...arr, id];
  return arr.filter((x) => x !== id);
}

function loadExportActionsColumns(): string[] {
  try {
    const raw = window.localStorage.getItem(LS_EXPORT_ACTIONS);
    if (!raw) return [...EXPORT_DEFAULTS.actions];
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return [...EXPORT_DEFAULTS.actions];
    const next = p.filter((x): x is string => typeof x === "string" && ACTION_COL_IDS.has(x));
    return next.length > 0 ? next : [...EXPORT_DEFAULTS.actions];
  } catch {
    return [...EXPORT_DEFAULTS.actions];
  }
}

function saveExportActionsColumns(cols: string[]) {
  try {
    window.localStorage.setItem(LS_EXPORT_ACTIONS, JSON.stringify(cols));
  } catch {
    /* ignore */
  }
}

function loadExportRisksColumns(): string[] {
  try {
    const raw = window.localStorage.getItem(LS_EXPORT_RISKS);
    if (!raw) return [...EXPORT_DEFAULTS.risks];
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return [...EXPORT_DEFAULTS.risks];
    const next = p.filter((x): x is string => typeof x === "string" && RISK_COL_IDS.has(x));
    return next.length > 0 ? next : [...EXPORT_DEFAULTS.risks];
  } catch {
    return [...EXPORT_DEFAULTS.risks];
  }
}

function saveExportRisksColumns(cols: string[]) {
  try {
    window.localStorage.setItem(LS_EXPORT_RISKS, JSON.stringify(cols));
  } catch {
    /* ignore */
  }
}

function loadFullReportExportPrefs(): {
  tabs: string[];
  actionColumns: string[];
  riskColumns: string[];
} {
  const fallback = {
    tabs: [...EXPORT_DEFAULTS.fullReport.tabs],
    actionColumns: [...EXPORT_DEFAULTS.fullReport.actionColumns],
    riskColumns: [...EXPORT_DEFAULTS.fullReport.riskColumns],
  };
  try {
    const raw = window.localStorage.getItem(LS_EXPORT_FULLREPORT);
    if (!raw) return fallback;
    const p = JSON.parse(raw) as Record<string, unknown>;
    const tabs = Array.isArray(p.tabs)
      ? p.tabs.filter((x): x is string => typeof x === "string" && FULLREPORT_TAB_IDS.has(x))
      : fallback.tabs;
    const actionColumns = Array.isArray(p.actionColumns)
      ? p.actionColumns.filter((x): x is string => typeof x === "string" && ACTION_COL_IDS.has(x))
      : fallback.actionColumns;
    const riskColumns = Array.isArray(p.riskColumns)
      ? p.riskColumns.filter((x): x is string => typeof x === "string" && RISK_COL_IDS.has(x))
      : fallback.riskColumns;
    return {
      tabs: tabs.length > 0 ? tabs : fallback.tabs,
      actionColumns: actionColumns.length > 0 ? actionColumns : fallback.actionColumns,
      riskColumns: riskColumns.length > 0 ? riskColumns : fallback.riskColumns,
    };
  } catch {
    return fallback;
  }
}

function saveFullReportExportPrefs(prefs: {
  tabs: string[];
  actionColumns: string[];
  riskColumns: string[];
}) {
  try {
    window.localStorage.setItem(LS_EXPORT_FULLREPORT, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LightningBoltIcon } from "@/components/lightning-bolt-icon";
import { TestimonialMarquee } from "@/components/testimonial-marquee";
import { ScrollRevealItem } from "@/components/scroll-reveal-item";
import { IntegrationsPanel } from "@/components/integrations-panel";
import {
  ConfigurationPanel,
  type ConfigurationTargetSection,
} from "@/components/configuration-panel";
import { EnterprisePortalOnboarding } from "@/components/enterprise-portal-onboarding";
import { EnterprisePortalClientsSection } from "@/components/enterprise-portal-clients-section";
import { FirstRunOnboardingOverlay } from "@/components/first-run-onboarding";
import { ChatsModal } from "@/components/chats-modal";
import { FirstGenerationCelebrationModal } from "@/components/first-generation-celebration-modal";
import { SendClientEmailModal } from "@/components/send-client-email-modal";
import { SmartActionsPanel } from "@/components/smart-actions-panel";
import {
  GettingStartedChecklistWidget,
  clearGettingStartedChecklistStorage,
  type ChecklistStepDef,
} from "@/components/getting-started-checklist-widget";
import { PremiumHardLimitModal, ProFeatureGateModal } from "@/components/premium-upgrade-ui";
import { UpgradePlanCards } from "@/components/upgrade-plan-cards";
import { CiQbrBuilder } from "@/components/ci-qbr-builder";
import { ClientIntelligenceAlerts } from "@/components/client-intelligence-alerts";
import { OverviewHomeView } from "@/components/overview-home-view";
import { PageHeader } from "@/components/page-header";
import { ScheduledRecentSends } from "@/components/scheduled-recent-sends";
import { useScheduledHistory } from "@/hooks/use-scheduled-history";
import { ChangelogView } from "@/components/changelog-view";
import { PSAEmptyState } from "@/components/psa-empty-state";
import {
  actionSourceDisplayLabel,
  actionSourceFullTitleForTooltip,
  buildActionSourceColumnForExport,
  buildRiskSourceColumnForExport,
  extractTicketTitlesFromGenerationInput,
  riskSourceDisplayLabel,
  riskSourceFullTitleForTooltip,
} from "@/lib/ticket-source-attribution";
import { TICKET_SECTION_RULE } from "@/lib/psa/format";
import { stripClientEmailSeparatorLines } from "@/lib/client-email-sanitize";
import {
  buildSmartActionsReportContext,
  shouldOfferSmartActions,
  type SmartActionSuggestion,
} from "@/lib/smart-actions";
import { extractFirstEmailFromText } from "@/lib/email-recipients";
import { cn } from "@/lib/utils";
import { normalizeHaloUrlForSubmit } from "@/lib/halo-url";
import { SettingsBodyPortal, useAppShell } from "@/components/app-shell";

const QbrPackBuilder = dynamic(
  () =>
    import("@/components/qbr-pack-builder").then((m) => ({
      default: m.QbrPackBuilder,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-[var(--accent)]" />
      </div>
    ),
  },
);

const HaloImportModal = dynamic(
  () =>
    import("@/components/halo-import-modal").then((m) => ({
      default: m.HaloImportModal,
    })),
  { ssr: false, loading: () => null },
);

const CwImportModal = dynamic(
  () =>
    import("@/components/cw-import-modal").then((m) => ({
      default: m.CwImportModal,
    })),
  { ssr: false, loading: () => null },
);

const DeliveryHealthDashboard = dynamic(
  () =>
    import("@/components/delivery-health-dashboard").then((m) => ({
      default: m.DeliveryHealthDashboard,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-[var(--accent)]" />
      </div>
    ),
  },
);

const ClientIntelligenceView = dynamic(
  () =>
    import("@/components/client-intelligence-view").then((m) => ({
      default: m.ClientIntelligenceView,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-[var(--accent)]" />
      </div>
    ),
  },
);

type ActionRow = {
  task: string | null;
  suggested_owner: string | null;
  priority: string | null;
  notes?: string | null;
  status?: string | null;
  due_date?: string | null;
  client_name?: string | null;
  project_name?: string | null;
  source_ticket?: string | null;
};

type RiskRow = {
  risk: string | null;
  impact: string | null;
  mitigation: string | null;
  owner?: string | null;
  rag?: string | null;
  priority?: string | null;
  source_ticket?: string | null;
};

type GenerateResult = {
  actions: ActionRow[];
  risks: RiskRow[];
  summary: string;
  client_email: string;
  email_note?: string;
  email_subject: string;
  status_report: string;
  /** Which output tabs were requested for this run (UI); optional on older saved history. */
  _uiTabScope?: {
    core: ("actions" | "risks" | "summary" | "status_report" | "client_email")[];
    extended: ExtendedPmTabKey[];
  };
  _trial?: {
    active: boolean;
    used: number;
    remaining: number;
    endsAt: string;
  };
} & Record<ExtendedPmTabKey, string>;

type ImportedHaloItem = {
  id: number;
  title: string;
  clientName: string;
  status: string;
  type: "ticket" | "project";
};

function haloClientNameFromRow(row: Record<string, unknown>): string {
  const c = row.client as { name?: string } | undefined;
  if (c && typeof c.name === "string" && c.name.trim()) return c.name.trim();
  const raw = row.client_name;
  return typeof raw === "string" && raw.trim() ? raw.trim() : "";
}

/** Restore ConnectWise import rows from saved generation input (headers include ticket/project IDs). */
function parseCwImportedItemsFromInput(input: string): ImportedHaloItem[] {
  const items: ImportedHaloItem[] = [];
  if (!input.includes("═══ TICKET #") && !input.includes("═══ PROJECT #")) return items;
  const re =
    /═══ (TICKET|PROJECT) #(\d+) ═══\n([\s\S]*?)(?=\n═══ (?:TICKET|PROJECT) #|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    const kind = m[1].toLowerCase() === "project" ? "project" : "ticket";
    const id = Number(m[2]);
    const block = m[3] ?? "";
    const title =
      (kind === "project"
        ? block.match(/^Name:\s*(.+)$/m)?.[1]?.trim()
        : block.match(/^Title:\s*(.+)$/m)?.[1]?.trim()) ||
      block.match(/^(?:Title|Name):\s*(.+)$/m)?.[1]?.trim() ||
      `${kind === "project" ? "Project" : "Ticket"} ${id}`;
    const client = block.match(/^Client:\s*(.+)$/m)?.[1]?.trim() || "Unknown";
    const status = block.match(/^Status:\s*(.+)$/m)?.[1]?.trim() || "Open";
    if (Number.isFinite(id)) {
      items.push({ id, title, clientName: client, status, type: kind });
    }
  }
  return items;
}

function parseHaloSectionMetaFromInput(input: string): Array<{
  title: string;
  clientName: string;
  status: string;
  type: "ticket" | "project";
}> {
  const out: Array<{
    title: string;
    clientName: string;
    status: string;
    type: "ticket" | "project";
  }> = [];
  if (!input.includes("Source: HaloPSA")) return out;
  const sections = input.split(TICKET_SECTION_RULE).map((s) => s.trim()).filter(Boolean);
  for (const s of sections) {
    if (!s.includes("Source: HaloPSA")) continue;
    const isProject = s.includes("Type: Project") || /^PROJECT \d+ of \d+/m.test(s);
    const title =
      (isProject ? s.match(/^Name:\s*(.+)$/m)?.[1]?.trim() : s.match(/^Title:\s*(.+)$/m)?.[1]?.trim()) ||
      s.match(/^(?:Title|Name):\s*(.+)$/m)?.[1]?.trim();
    const client = s.match(/^Client:\s*(.+)$/m)?.[1]?.trim();
    const status = s.match(/^Status:\s*(.+)$/m)?.[1]?.trim() || "Open";
    if (title && client) {
      out.push({ title, clientName: client, status, type: isProject ? "project" : "ticket" });
    }
  }
  return out;
}

function matchHaloMetaToImportedItems(
  meta: ReturnType<typeof parseHaloSectionMetaFromInput>,
  haloRows: Array<Record<string, unknown>>,
): ImportedHaloItem[] {
  const items: ImportedHaloItem[] = [];
  for (const m of meta) {
    const row = haloRows.find((t) => {
      const sum = String(t.summary ?? "").trim();
      const cname = haloClientNameFromRow(t);
      return sum === m.title && cname === m.clientName;
    });
    if (row && row.id != null && Number.isFinite(Number(row.id))) {
      items.push({
        id: Number(row.id),
        title: m.title,
        clientName: m.clientName,
        status: m.status,
        type: m.type,
      });
    }
  }
  return items;
}

function haloImportedItemsForClientName(
  clientName: string,
  haloRows: Array<Record<string, unknown>>,
  cap = 60,
): ImportedHaloItem[] {
  const needle = clientName.trim().toLowerCase();
  if (!needle) return [];
  const out: ImportedHaloItem[] = [];
  for (const t of haloRows) {
    if (out.length >= cap) break;
    const cname = haloClientNameFromRow(t);
    if (cname.trim().toLowerCase() !== needle) continue;
    const id = Number(t.id);
    if (!Number.isFinite(id)) continue;
    const isProject = Boolean((t as { is_project?: boolean }).is_project);
    out.push({
      id,
      title: String(t.summary ?? `Ticket ${id}`).trim() || `Ticket ${id}`,
      clientName: cname || clientName,
      status: String((t as { status?: { name?: string } }).status?.name ?? "Open"),
      type: isProject ? "project" : "ticket",
    });
  }
  return out;
}

function restoreImportedItemsForHistory(
  inputText: string,
  haloRows: Array<Record<string, unknown>> | undefined,
): ImportedHaloItem[] {
  const cw = parseCwImportedItemsFromInput(inputText);
  if (cw.length > 0) return cw;
  const rows = Array.isArray(haloRows) ? haloRows : [];
  if (rows.length === 0) return [];
  const meta = parseHaloSectionMetaFromInput(inputText);
  const matched = matchHaloMetaToImportedItems(meta, rows);
  return matched;
}

function haloInputSectionForImportedItem(
  inputText: string,
  item: ImportedHaloItem,
): string | null {
  if (!inputText.includes(TICKET_SECTION_RULE)) return null;
  const sections = inputText.split(TICKET_SECTION_RULE).map((s) => s.trim()).filter(Boolean);
  for (const section of sections) {
    const title =
      (item.type === "project"
        ? section.match(/^Name:\s*(.+)$/m)?.[1]?.trim()
        : section.match(/^Title:\s*(.+)$/m)?.[1]?.trim()) ||
      section.match(/^(?:Title|Name):\s*(.+)$/m)?.[1]?.trim();
    const client = section.match(/^Client:\s*(.+)$/m)?.[1]?.trim();
    if (title === item.title && client === item.clientName) return section;
  }
  return null;
}

/** True when a Halo import row or formatted section looks internal-facing (not client email). */
function isImportedItemInternalFacing(
  item: ImportedHaloItem,
  inputText: string,
  haloRows: Array<Record<string, unknown>>,
): boolean {
  const row = haloRows.find((t) => Number(t.id) === item.id);
  if (row) {
    if (Boolean(row.projectinternaltask)) return true;
    const ticketType = String(
      (row as { ticket_type?: string }).ticket_type ?? "",
    ).toLowerCase();
    if (ticketType.includes("internal")) return true;
    const typeName = String(
      (row as { ticket_type_name?: string }).ticket_type_name ?? "",
    ).toLowerCase();
    if (typeName.includes("internal")) return true;
    if (Boolean((row as { is_project_task?: boolean }).is_project_task)) {
      if (typeName.includes("internal") || ticketType.includes("internal")) return true;
    }
    const emailToList = row.emailtolist ?? row.email_to_list;
    if (
      emailToList == null ||
      emailToList === "" ||
      (Array.isArray(emailToList) && emailToList.length === 0)
    ) {
      const userName = String(row.user_name ?? "").trim().toLowerCase();
      const agentName = String(
        (row as { agent?: { name?: string } }).agent?.name ?? "",
      )
        .trim()
        .toLowerCase();
      if (userName && agentName && userName === agentName) return true;
    }
  }

  const section = haloInputSectionForImportedItem(inputText, item);
  if (section) {
    const ticketTypeLine = section.match(/^Ticket Type:\s*(.+)$/im)?.[1] ?? "";
    if (/internal/i.test(ticketTypeLine)) return true;
    if (/projectinternaltask|internal task/i.test(section)) return true;
  }
  return false;
}

function resolveClientEmailTabDisplay(
  items: ImportedHaloItem[],
  inputText: string,
  haloRows: Array<Record<string, unknown>>,
): { label: "Client Email" | "Internal Update"; showInternalBadge: boolean } {
  if (items.length === 0) {
    return { label: "Client Email", showInternalBadge: false };
  }
  let internalCount = 0;
  let externalCount = 0;
  for (const item of items) {
    if (isImportedItemInternalFacing(item, inputText, haloRows)) internalCount += 1;
    else externalCount += 1;
  }
  if (internalCount > 0 && externalCount === 0) {
    return { label: "Internal Update", showInternalBadge: true };
  }
  return { label: "Client Email", showInternalBadge: false };
}

function parseActionFromApi(x: unknown): ActionRow {
  if (!x || typeof x !== "object") {
    return { task: null, suggested_owner: null, priority: null };
  }
  const o = x as Record<string, unknown>;
  const taskRaw = o.task ?? o.action ?? o.title ?? o.name ?? o.Task;
  const task =
    typeof taskRaw === "string" ? taskRaw : taskRaw != null ? String(taskRaw) : null;
  const ownerRaw =
    o.suggested_owner ?? o.owner ?? o.Owner ?? o.assignee ?? o.assigned_to;
  const suggested_owner =
    ownerRaw === null || ownerRaw === undefined
      ? null
      : typeof ownerRaw === "string"
        ? ownerRaw
        : String(ownerRaw);
  const srcRaw =
    o.source_ticket ?? o.ticket_title ?? o.ticketTitle ?? o.source_ticket_title ?? o.source;
  const source_ticket =
    typeof srcRaw === "string" && srcRaw.trim()
      ? srcRaw.trim()
      : srcRaw != null && String(srcRaw).trim()
        ? String(srcRaw).trim()
        : null;
  return {
    task,
    suggested_owner,
    priority: typeof o.priority === "string" ? o.priority : null,
    notes: typeof o.notes === "string" ? o.notes : null,
    status: typeof o.status === "string" ? o.status : null,
    due_date: typeof o.due_date === "string" ? o.due_date : null,
    client_name: typeof o.client_name === "string" ? o.client_name : null,
    project_name: typeof o.project_name === "string" ? o.project_name : null,
    source_ticket,
  };
}

function parseRiskFromApi(x: unknown): RiskRow {
  if (!x || typeof x !== "object") {
    return { risk: null, impact: null, mitigation: null };
  }
  const o = x as Record<string, unknown>;
  const riskRaw = o.risk ?? o.title ?? o.name ?? o.description;
  const impactRaw = o.impact ?? o.severity;
  const mitRaw = o.mitigation ?? o.response;
  const srcRaw =
    o.source_ticket ?? o.ticket_title ?? o.ticketTitle ?? o.source_ticket_title ?? o.source;
  const source_ticket =
    typeof srcRaw === "string" && srcRaw.trim()
      ? srcRaw.trim()
      : srcRaw != null && String(srcRaw).trim()
        ? String(srcRaw).trim()
        : null;
  return {
    risk: typeof riskRaw === "string" ? riskRaw : riskRaw != null ? String(riskRaw) : null,
    impact: typeof impactRaw === "string" ? impactRaw : impactRaw != null ? String(impactRaw) : null,
    mitigation: typeof mitRaw === "string" ? mitRaw : mitRaw != null ? String(mitRaw) : null,
    owner: typeof o.owner === "string" ? o.owner : undefined,
    rag: typeof o.rag === "string" ? o.rag : undefined,
    priority: typeof o.priority === "string" ? o.priority : undefined,
    source_ticket,
  };
}

function parseUiTabScope(raw: unknown): GenerateResult["_uiTabScope"] | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const allowedCore = new Set<string>([
    "actions",
    "risks",
    "summary",
    "status_report",
    "client_email",
  ]);
  const t = raw as { core?: unknown; extended?: unknown };
  const coreRaw = Array.isArray(t.core) ? t.core : [];
  const core = coreRaw.filter(
    (x): x is NonNullable<GenerateResult["_uiTabScope"]>["core"][number] =>
      typeof x === "string" && allowedCore.has(x),
  );
  const extended = Array.isArray(t.extended)
    ? normalizeExtendedOutputKeys(t.extended)
    : [];
  if (core.length === 0 && extended.length === 0) return undefined;
  return { core, extended };
}

function coerceStringOutput(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function parseApiGenerateResult(raw: unknown): GenerateResult {
  const baseExt = emptyExtendedOutputsObject();
  if (!raw || typeof raw !== "object") {
    return {
      actions: [],
      risks: [],
      summary: "",
      client_email: "",
      email_note: "",
      email_subject: "",
      status_report: "",
      ...baseExt,
    };
  }
  const o = raw as Record<string, unknown>;
  const ext = { ...baseExt };
  for (const k of EXTENDED_PM_TAB_KEYS) {
    ext[k] = typeof o[k] === "string" ? o[k] : "";
  }
  const trial = o._trial;
  const uiTabScope = parseUiTabScope(o._uiTabScope);

  const actionsRaw = o.actions ?? o.action_log ?? o.actionLog;
  let actions: ActionRow[] = [];
  if (Array.isArray(actionsRaw)) {
    actions = actionsRaw.map(parseActionFromApi);
  } else if (typeof actionsRaw === "string") {
    actions = parseActionsFromText(actionsRaw).map((a) => ({
      task: a.task,
      suggested_owner: a.suggested_owner,
      priority: a.priority,
      notes: a.notes ?? null,
      status: a.status ?? null,
      due_date: a.due_date ?? null,
      client_name: a.client_name ?? null,
      project_name: a.project_name ?? null,
      source_ticket: a.source_ticket ?? null,
    }));
  }

  const risksRaw = o.risks ?? o.risk_log ?? o.riskLog;
  let risks: RiskRow[] = [];
  if (Array.isArray(risksRaw)) {
    risks = risksRaw.map(parseRiskFromApi);
  } else if (typeof risksRaw === "string" && risksRaw.trim()) {
    try {
      const p: unknown = JSON.parse(risksRaw.trim());
      if (Array.isArray(p)) risks = p.map(parseRiskFromApi);
    } catch {
      risks = [];
    }
  }

  const rawClientEmail =
    typeof o.client_email === "string"
      ? o.client_email
      : typeof o.clientEmail === "string"
        ? o.clientEmail
        : "";

  return {
    actions,
    risks,
    summary: coerceStringOutput(o.summary),
    client_email:
      rawClientEmail.trim().length > 0
        ? stripClientEmailSeparatorLines(rawClientEmail)
        : rawClientEmail,
    email_note: typeof o.email_note === "string" ? o.email_note : "",
    email_subject:
      typeof o.email_subject === "string"
        ? o.email_subject
        : typeof o.emailSubject === "string"
          ? o.emailSubject
          : "",
    status_report:
      typeof o.status_report === "string"
        ? o.status_report
        : typeof o.status_report === "object" && o.status_report !== null
          ? coerceStringOutput(o.status_report)
        : typeof o.statusReport === "string"
          ? o.statusReport
          : typeof o.statusReport === "object" && o.statusReport !== null
            ? coerceStringOutput(o.statusReport)
          : "",
    ...ext,
    ...(uiTabScope ? { _uiTabScope: uiTabScope } : {}),
    ...(trial !== undefined && trial !== null && typeof trial === "object"
      ? { _trial: trial as NonNullable<GenerateResult["_trial"]> }
      : {}),
  };
}

const SIGNED_OUT_DEMO_RESULT: GenerateResult = {
  actions: [
    {
      task: "Chase Dave to start Azure backup - not yet started",
      suggested_owner: "Dave",
      priority: "High",
    },
    {
      task: "Send client update today - client has chased twice",
      suggested_owner: null,
      priority: "High",
    },
    {
      task: "Assess old hardware health before migration begins",
      suggested_owner: "Dave",
      priority: "High",
    },
    {
      task: "Complete Azure migration by end of month",
      suggested_owner: "Dave",
      priority: "Medium",
    },
  ],
  risks: [
    {
      risk: "Old hardware failure before migration completes",
      impact: "Data loss and extended downtime for Skyline IT Solutions",
      mitigation:
        "Start backup immediately and assess hardware health before any migration steps begin",
    },
  ],
  summary:
    "The Azure migration for Skyline IT Solutions is overdue by two weeks. Dave is assigned to the backup which has not yet started. The client has chased twice this week and needs an update today.",
  email_subject: "Re: Azure Migration - Action Required",
  client_email:
    "Hi Jeff,\n\nFollowing your calls this week - apologies for the delay. Here is where the migration stands.\n\nThe Azure migration is currently overdue by two weeks. Dave is picking up the backup this week as the immediate priority before migration can proceed. We are targeting completion by end of month.\n\nI will be in touch by Wednesday with a progress update, or sooner if anything changes.\n\nKind regards,\nSarah Mitchell\nService Delivery Manager\nHarbour IT Solutions",
  status_report:
    "PROJECT STATUS\nAzure Migration - Skyline IT Solutions - Overdue - Red\n\nPROGRESS\nMigration overdue by two weeks. Backup not yet started.\n\nACTIONS\n1. Chase Dave to start backup immediately (Dave) - High\n2. Send client update today (Unassigned) - High\n3. Assess hardware health (Dave) - High\n4. Complete migration by end of month (Dave) - Medium\n\nRISKS AND ISSUES\n1. Hardware failure risk - Data loss if hardware fails before backup - Start backup immediately\n\nNEXT STEPS\n1. Dave to start backup today\n2. Send client update to Skyline IT Solutions\n3. Assess hardware health before migration begins",
  ...emptyExtendedOutputsObject(),
};

function onboardingStagedDueDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

function ONBOARDING_STAGED_RESULT(): GenerateResult {
  return {
    actions: [
      {
        task: "Confirm SPF record change is fully propagated and monitor for any further bounce reports from Hartigan & Co through end of week",
        suggested_owner: "Alex Thompson",
        priority: "Medium",
        due_date: onboardingStagedDueDate(4),
        status: "Open",
        client_name: "Northwood Manufacturing",
      },
      {
        task: "Chase finance for MFA hardware token procurement sign-off - 3 remote users remain uncovered",
        suggested_owner: "Jamie Clarke",
        priority: "High",
        due_date: onboardingStagedDueDate(7),
        status: "Open",
        client_name: "Northwood Manufacturing",
      },
      {
        task: "Begin SharePoint Phase 2 archive migration (~2TB legacy folders) following successful 847GB active data cutover",
        suggested_owner: "Alex Thompson",
        priority: "Medium",
        due_date: onboardingStagedDueDate(7),
        status: "Open",
        client_name: "Northwood Manufacturing",
      },
      {
        task: "Complete warehouse floor 2 Wi-Fi site survey to assess additional access point placement near loading bay",
        suggested_owner: "Jamie Clarke",
        priority: "Low",
        due_date: onboardingStagedDueDate(5),
        status: "Open",
        client_name: "Northwood Manufacturing",
      },
    ],
    risks: [
      {
        risk: "3 remote users remain without MFA coverage while hardware token procurement awaits finance sign-off, leaving a security gap until resolved",
        impact: "Medium",
        mitigation:
          "Escalate procurement approval directly with finance lead this week to avoid extended exposure",
        owner: "Jamie Clarke",
        rag: "amber",
      },
      {
        risk: "SharePoint archive migration (~2TB) could encounter unforeseen file path or permission issues not present in Phase 1's smaller dataset",
        impact: "Low",
        mitigation:
          "Review archive folder structure for legacy permission anomalies before migration window begins",
        owner: "Alex Thompson",
        rag: "green",
      },
    ],
    summary:
      "Northwood Manufacturing's portfolio is in a healthy state this week. The Office 365 email delivery issue was resolved promptly after an SPF misconfiguration was identified and corrected, with no further bounce reports since Wednesday. SharePoint Phase 2 migration is progressing well, with 847GB of active data successfully moved over the weekend and the larger archive phase now scheduled. The main outstanding item is MFA hardware token procurement, currently awaiting finance approval, which is the priority focus for next week.",
    client_email:
      "Hi team,\n\nA quick update on this week's activity.\n\nThe email delivery issue affecting outbound messages to external recipients has been resolved - this was caused by an SPF record misconfiguration following the recent DNS migration, which we've corrected and verified. We're monitoring delivery over the coming days to confirm full resolution.\n\nThe SharePoint migration continues on track. We successfully moved 847GB of active document data over the weekend with no reported issues, and we'll begin the archive phase (older legacy folders) next week.\n\nThe MFA hardware tokens for your remaining remote users are still pending procurement approval - we're chasing this and will keep you posted once tokens are ordered.\n\nLet us know if you have any questions.\n\nBest regards",
    email_subject: "Northwood Manufacturing - Weekly Update",
    status_report:
      "Status Report - Northwood Manufacturing\n\nEmail Delivery: Resolved - SPF misconfiguration corrected, monitoring ongoing\nSharePoint Migration: On track - Phase 2 active data complete (847GB), archive phase scheduled next week\nMFA Rollout: Pending - hardware token procurement awaiting finance approval\nNetwork: Minor Wi-Fi coverage gap identified on warehouse floor 2, site survey scheduled",
    ...emptyExtendedOutputsObject(),
    decisions_log:
      "DEC-001 | 12 June | Proceed with SPF record correction immediately rather than waiting for scheduled maintenance window | Alex Thompson | SPF misconfiguration after DNS migration was causing bounced emails to external recipients including Hartigan & Co | Medium | Wait for scheduled maintenance window | Agreed\nDEC-002 | 10 June | Defer SharePoint archive migration (~2TB) to next week's maintenance window rather than bundling with Phase 2 active data cutover | Client IT lead | Phase 2 active data cutover (847GB) completed without user-reported issues | Low | Bundle archive migration with Phase 2 active data cutover | Agreed",
    meeting_notes:
      "Northwood Manufacturing - Weekly Sync\n\nAttendees: Alex Thompson, Jamie Clarke\n\nDiscussed: SPF resolution confirmed stable, no further bounce reports. MFA hardware token order pending finance sign-off - client asked to expedite given remote worker exposure. SharePoint archive phase confirmed for next week, no concerns raised. Wi-Fi survey booked for warehouse floor 2.\n\nNext steps: chase finance on MFA approval, confirm archive migration window with client before Thursday.",
  };
}

type CompareResultPayload = {
  what_changed: string;
  resolved: string[];
  new_items: string[];
  still_open: string[];
  trend: "improving" | "stable" | "worsening";
  trend_justification: string;
};

const ONBOARDING_STAGED_COMPARE_RESULT: CompareResultPayload = {
  what_changed:
    "Since the last Northwood report, the Office 365 SPF email delivery issue was resolved and monitoring is ongoing. MFA hardware token procurement has progressed to awaiting finance approval. SharePoint Phase 2 active data migration completed over the weekend; archive phase is now scheduled.",
  resolved: [
    "Office 365 outbound email delivery failure (SPF misconfiguration), resolved since last report",
  ],
  new_items: [
    "MFA hardware token procurement moved from Open to Awaiting Approval",
    "SharePoint Phase 2 active data cutover (847GB) completed over the weekend",
  ],
  still_open: [
    "MFA rollout: 3 remote users still without hardware token coverage pending finance sign-off",
    "SharePoint Phase 2 archive migration (~2TB legacy folders), scheduled to begin next week",
    "Warehouse floor 2 Wi-Fi coverage gap: site survey booked for next Thursday",
  ],
  trend: "improving",
  trend_justification:
    "Email delivery restored after SPF fix; migration progressing with no user-reported issues from Phase 1 cutover.",
};

const INPUT_QUALITY_TOOLTIP_TEXT =
  "Reflects how complete your ticket data is. Scores below 70 may result in shorter, more conservative outputs since we don't invent details that aren't in your tickets.";

const REPORT_QUALITY_TOOLTIP_TEXT =
  "Based on whether actions have clear owners and due dates, and whether risks include mitigations. Lower scores usually mean some ticket data was too sparse to generate complete details.";

function formatRelativeTimeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "just now";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.floor(hr / 24);
  return `${day} day${day === 1 ? "" : "s"} ago`;
}

function approvalSourceLabel(source: string): string {
  if (source === "digest") return "Digest";
  if (source === "ci") return "CI";
  return "PSA";
}

const HOLD_FOR_REVIEW_TOOLTIP = "Hold for review before sending";

function HoldForReviewRowToggle({
  active,
  disabled,
  onToggle,
}: {
  active: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  const [tipOpen, setTipOpen] = useState(false);
  return (
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        disabled={disabled}
        onClick={onToggle}
        onMouseEnter={() => setTipOpen(true)}
        onMouseLeave={() => setTipOpen(false)}
        onFocus={() => setTipOpen(true)}
        onBlur={() => setTipOpen(false)}
        className={cn(
          "inline-flex size-7 items-center justify-center rounded-[var(--radius)] border transition-colors",
          active
            ? "border-[var(--accent)]/40 bg-[var(--accent)]/15 text-[var(--accent)]"
            : "border-white/[0.08] bg-white/[0.04] text-white/40 hover:border-[var(--accent)]/25 hover:text-[var(--accent)]",
          disabled && "cursor-not-allowed opacity-50",
        )}
        aria-label={HOLD_FOR_REVIEW_TOOLTIP}
        aria-pressed={active}
      >
        <ClipboardCheck className="size-3.5" aria-hidden />
      </button>
      {tipOpen ? (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-max max-w-[11rem] -translate-x-1/2 rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1 text-center text-[11px] leading-snug text-[var(--text-secondary)] shadow-[var(--shadow-sm)]"
        >
          {HOLD_FOR_REVIEW_TOOLTIP}
        </span>
      ) : null}
    </span>
  );
}

function HoldForReviewRequiredBadge() {
  return (
    <span className="rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/15 px-1.5 py-px text-[9px] font-semibold text-[var(--accent)]">
      Review required
    </span>
  );
}

function ScheduleHoldForReviewField({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 pr-2">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Hold for review before sending
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            When enabled, reports generated by this schedule will wait in Approvals for your
            review before sending.
          </p>
        </div>
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-pressed={checked}
          aria-label="Hold for review before sending"
          onClick={() => {
            if (!disabled) onChange(!checked);
          }}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onChange(!checked);
            }
          }}
          style={{
            width: "44px",
            height: "24px",
            borderRadius: "999px",
            background: checked ? "#1D9E75" : "rgba(255,255,255,0.15)",
            position: "relative",
            cursor: disabled ? "not-allowed" : "pointer",
            transition: "background 0.2s ease",
            flexShrink: 0,
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "3px",
              left: checked ? "23px" : "3px",
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              background: "white",
              transition: "left 0.2s ease",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function InfoHoverTooltip({ text, ariaLabel }: { text: string; ariaLabel: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex cursor-help"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
      aria-label={ariaLabel}
    >
      <Info className="size-3.5 shrink-0 text-[var(--text-muted)]" aria-hidden />
      {open ? (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 max-w-xs -translate-x-1/2 rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1 text-[12px] leading-snug text-[var(--text-secondary)] shadow-[var(--shadow-sm)]"
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}

function toFullReportOutputs(r: GenerateResult): FullReportOutputs {
  const ext = emptyExtendedOutputsObject();
  for (const k of EXTENDED_PM_TAB_KEYS) {
    ext[k] = typeof r[k] === "string" ? r[k] : "";
  }
  return {
    actions: r.actions,
    risks: r.risks,
    summary: coerceStringOutput(r.summary),
    client_email: r.client_email,
    email_subject: r.email_subject,
    status_report: coerceStringOutput(r.status_report),
    ...ext,
  };
}

const HANDOVER_OUTPUT_PREFS_KEY = "handover-output-prefs";
const HANDOVER_EXTENDED_OUTPUT_PREFS_KEY = "handover-extended-output-prefs";

type ModalOutputKey =
  | "actions"
  | "risks"
  | "summary"
  | "status_report"
  | "client_email";

const MODAL_OUTPUT_KEYS: readonly ModalOutputKey[] = [
  "actions",
  "risks",
  "summary",
  "status_report",
  "client_email",
] as const;

const OUTPUT_KEY_LABELS: Record<ModalOutputKey, string> = {
  actions: "Action list",
  risks: "Risk log",
  summary: "Summary",
  status_report: "Status report",
  client_email: "Client email",
};

const OUTPUT_TAB_TRIGGER_LABELS: Record<ModalOutputKey, string> = {
  actions: "Actions",
  risks: "Risks",
  summary: "Summary",
  status_report: "Status Report",
  client_email: "Client Email",
};

function defaultOutputPrefs(): Record<ModalOutputKey, boolean> {
  return Object.fromEntries(
    MODAL_OUTPUT_KEYS.map((k) => [k, true]),
  ) as Record<ModalOutputKey, boolean>;
}

function loadOutputPrefs(): Record<ModalOutputKey, boolean> {
  const fallback = defaultOutputPrefs();
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(HANDOVER_OUTPUT_PREFS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return fallback;
    const allowed = new Set(
      parsed.filter(
        (x): x is ModalOutputKey =>
          typeof x === "string" &&
          (MODAL_OUTPUT_KEYS as readonly string[]).includes(x),
      ),
    );
    if (allowed.size === 0) return fallback;
    return Object.fromEntries(
      MODAL_OUTPUT_KEYS.map((k) => [k, allowed.has(k)]),
    ) as Record<ModalOutputKey, boolean>;
  } catch {
    return fallback;
  }
}

function saveOutputPrefs(sel: Record<ModalOutputKey, boolean>) {
  if (typeof window === "undefined") return;
  const keys = MODAL_OUTPUT_KEYS.filter((k) => sel[k]);
  window.localStorage.setItem(HANDOVER_OUTPUT_PREFS_KEY, JSON.stringify(keys));
}

function defaultExtendedOutputPrefs(): Record<ExtendedPmTabKey, boolean> {
  return Object.fromEntries(
    EXTENDED_PM_TAB_KEYS.map((k) => [k, true]),
  ) as Record<ExtendedPmTabKey, boolean>;
}

/** Persist enabled extended PM tabs (mirrors core output prefs in localStorage). */
function loadExtendedOutputPrefs(): Record<ExtendedPmTabKey, boolean> {
  const fallback = defaultExtendedOutputPrefs();
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(HANDOVER_EXTENDED_OUTPUT_PREFS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return fallback;
    const enabled = new Set(normalizeExtendedOutputKeys(parsed));
    if (enabled.size === 0) return fallback;
    return Object.fromEntries(
      EXTENDED_PM_TAB_KEYS.map((k) => [k, enabled.has(k)]),
    ) as Record<ExtendedPmTabKey, boolean>;
  } catch {
    return fallback;
  }
}

function saveExtendedOutputPrefs(prefs: Record<ExtendedPmTabKey, boolean>) {
  if (typeof window === "undefined") return;
  const keys = EXTENDED_PM_TAB_KEYS.filter((k) => prefs[k]);
  window.localStorage.setItem(HANDOVER_EXTENDED_OUTPUT_PREFS_KEY, JSON.stringify(keys));
}

function hydrateOutputPrefsFromProfile(outputPreferences: unknown): {
  core: Record<ModalOutputKey, boolean>;
  extended: Record<ExtendedPmTabKey, boolean>;
} {
  if (!outputPreferences || typeof outputPreferences !== "object") {
    return { core: loadOutputPrefs(), extended: defaultExtendedOutputPrefs() };
  }
  const raw = outputPreferences as { coreOutputs?: unknown; extendedTabs?: unknown };

  let core: Record<ModalOutputKey, boolean>;
  if (Array.isArray(raw.coreOutputs) && raw.coreOutputs.length > 0) {
    const allowed = new Set(
      raw.coreOutputs.filter(
        (x): x is ModalOutputKey =>
          typeof x === "string" &&
          (MODAL_OUTPUT_KEYS as readonly string[]).includes(x),
      ),
    );
    core = Object.fromEntries(
      MODAL_OUTPUT_KEYS.map((k) => [k, allowed.has(k)]),
    ) as Record<ModalOutputKey, boolean>;
  } else {
    core = loadOutputPrefs();
  }

  let extended: Record<ExtendedPmTabKey, boolean>;
  if (Array.isArray(raw.extendedTabs) && raw.extendedTabs.length > 0) {
    extended = Object.fromEntries(
      EXTENDED_PM_TAB_KEYS.map((k) => [k, false]),
    ) as Record<ExtendedPmTabKey, boolean>;
    for (const k of normalizeExtendedOutputKeys(raw.extendedTabs)) {
      extended[k] = true;
    }
  } else {
    extended = defaultExtendedOutputPrefs();
  }

  return { core, extended };
}

function visibleCoreTabsForResult(r: GenerateResult): ModalOutputKey[] {
  const scope = r._uiTabScope?.core;
  if (scope && scope.length > 0) {
    return MODAL_OUTPUT_KEYS.filter((k) => scope.includes(k));
  }
  const inferred = MODAL_OUTPUT_KEYS.filter((k) => {
    switch (k) {
      case "actions":
        return r.actions.length > 0;
      case "risks":
        return r.risks.length > 0;
      case "summary":
        return Boolean((r.summary ?? "").trim());
      case "client_email":
        return Boolean((r.client_email ?? "").trim());
      case "status_report":
        return Boolean((r.status_report ?? "").trim());
      default:
        return false;
    }
  });
  return inferred.length > 0 ? inferred : [...MODAL_OUTPUT_KEYS];
}

function hasExtendedPmTabContent(r: GenerateResult, k: ExtendedPmTabKey): boolean {
  const v = r[k];
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "string") return Boolean(v.trim());
  return false;
}

function visibleExtendedTabsForResult(r: GenerateResult): ExtendedPmTabKey[] {
  const extScope = r._uiTabScope?.extended;
  let keys: ExtendedPmTabKey[];
  if (extScope != null && extScope.length > 0) {
    keys = EXTENDED_PM_TAB_KEYS.filter((k) => extScope.includes(k));
  } else if (extScope != null && extScope.length === 0) {
    keys = EXTENDED_PM_TAB_KEYS.filter((k) => hasExtendedPmTabContent(r, k));
  } else {
    keys = EXTENDED_PM_TAB_KEYS.filter((k) => hasExtendedPmTabContent(r, k));
  }
  return keys.filter((k) => !EXCEL_ONLY_TAB_KEYS.has(k));
}

/** Extended Excel tabs synthesized from core actions/risks/summary in exportFullReport. */
const EXCEL_EXTENDED_SYNTH_FROM_CORE: ReadonlySet<ExtendedPmTabKey> = new Set([
  "raid_log",
  "change_log",
  "stakeholder_update",
  "communication_log",
  "project_health_dashboard",
  "risk_register_detailed",
  "pestle_analysis",
  "issue_log",
  "lessons_learned",
  "invoice_time_summary",
]);

/** Extended Excel tabs that need populated result field or external config (no core-only synthesis). */
const EXCEL_EXTENDED_GATED_ON_FIELD: ReadonlySet<ExtendedPmTabKey> = new Set([
  "decisions_log",
  "meeting_notes",
]);

function hasCoreDataForExcelSynthesis(r: GenerateResult): boolean {
  const hasActions = Array.isArray(r.actions) && r.actions.length > 0;
  const hasRisks = Array.isArray(r.risks) && r.risks.length > 0;
  const hasSummary = typeof r.summary === "string" && r.summary.trim().length > 0;
  return hasActions || hasRisks || hasSummary;
}

/** Core + extended outputs for Excel export — extended IDs from content only (not _uiTabScope). */
function generatedOutputTabIdsForExcelExport(r: GenerateResult): Set<string> {
  const coreIds =
    r._uiTabScope?.core && r._uiTabScope.core.length > 0
      ? [...r._uiTabScope.core]
      : [...visibleCoreTabsForResult(r)];
  const canSynthesizeExt = hasCoreDataForExcelSynthesis(r);
  const extendedIds = EXTENDED_PM_TAB_KEYS.filter((k) => {
    const val = r[k];
    const hasContent = typeof val === "string" && val.trim().length > 0;
    if (hasContent) return true;
    if (EXCEL_EXTENDED_GATED_ON_FIELD.has(k)) return false;
    if (EXCEL_EXTENDED_SYNTH_FROM_CORE.has(k) && canSynthesizeExt) return true;
    return false;
  });
  return new Set<string>([...coreIds, ...extendedIds]);
}

function isExportPickerTabGenerated(tabId: string, generated: Set<string>): boolean {
  if (tabId === "executive_summary") return generated.has("summary");
  if (tabId === "rag_dashboard") return false;
  return generated.has(tabId);
}

function exportPickerTabIdsForResult(r: GenerateResult): string[] {
  const gen = generatedOutputTabIdsForExcelExport(r);
  return EXPORT_FULLREPORT_TAB_OPTIONS.filter((o) => isExportPickerTabGenerated(o.id, gen)).map(
    (o) => o.id,
  );
}

function buildActionExportMeta(projectName: string, actions: ActionRow[]): ExportMeta {
  const cn = firstExportClientName(actions);
  return {
    clientName: cn || null,
    projectName: projectName.trim() || null,
  };
}

type EditableField = "summary" | "client_email" | "status_report" | null;
type Tone = "formal" | "professional" | "friendly";
type TemplateType = "email" | "report";

type SavedTemplate = {
  id: string;
  name: string;
  content: string;
  template_type: TemplateType;
  created_at?: string;
};

type ProjectItem = {
  id: string;
  project_name: string | null;
  title?: string | null;
  collection_id?: string | null;
  input_text: string;
  output_json: Partial<GenerateResult> | null;
  created_at: string;
  source?: string | null;
  scheduled_report_id?: string | null;
  report_type?: string | null;
  reportType?: string | null;
};

function formatShortRelativeTime(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const diffMs = Date.now() - t;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} mins ago`;
  const hours = Math.floor(mins / 60);
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

type CollectionApiRow = {
  id: string;
  name: string;
  color: string;
  pinned: boolean;
  generation_count: number;
};

/** True when owner should show as "Unassigned" in UI and copy. */
function isUnassignedOwner(raw: string | null | undefined): boolean {
  if (raw == null) return true;
  const t = raw.trim();
  if (t === "") return true;
  const lower = t.toLowerCase();
  if (lower === "null" || lower === "unassigned") return true;
  if (t === "\u2014" || t === "-" || t === "\u2013") return true;
  return false;
}

function formatOwnerLabel(raw: string | null | undefined): string {
  return isUnassignedOwner(raw) ? "Unassigned" : (raw ?? "").trim();
}

function actionOwnerForQuality(a: ActionRow): string {
  return (a.suggested_owner ?? "").trim();
}

function isMissingActionOwner(a: ActionRow): boolean {
  const owner = actionOwnerForQuality(a);
  if (!owner || owner === "TBC") return true;
  return isUnassignedOwner(owner);
}

function calculateReportQuality(result: GenerateResult): {
  score: number;
  issues: string[];
} {
  const issues: string[] = [];
  let deductions = 0;

  if (result.actions && result.actions.length > 0) {
    const missingOwners = result.actions.filter((a) => isMissingActionOwner(a)).length;
    const missingDates = result.actions.filter(
      (a) => !a.due_date || a.due_date.trim() === "",
    ).length;
    if (missingOwners > 0) {
      issues.push(
        `${missingOwners} action${missingOwners > 1 ? "s" : ""} missing owner`,
      );
      deductions += missingOwners * 8;
    }
    if (missingDates > 0) {
      issues.push(
        `${missingDates} action${missingDates > 1 ? "s" : ""} without due date`,
      );
      deductions += missingDates * 5;
    }
  } else if (result.actions && result.actions.length === 0) {
    issues.push("No actions identified");
    deductions += 15;
  }

  if (result.risks && result.risks.length > 0) {
    const missingMitigation = result.risks.filter(
      (r) => !r.mitigation || r.mitigation.trim() === "",
    ).length;
    if (missingMitigation > 0) {
      issues.push(
        `${missingMitigation} risk${missingMitigation > 1 ? "s" : ""} without mitigation`,
      );
      deductions += missingMitigation * 6;
    }
  }

  return { score: Math.max(0, Math.min(100, 100 - deductions)), issues };
}

function qualityImprovementTips(issues: string[]): string[] {
  const tips: string[] = [];
  for (const issue of issues) {
    if (issue.includes("missing owner")) {
      tips.push(
        "Assign a named owner to each action - avoid TBC, blank, or unassigned owners.",
      );
    } else if (issue.includes("without due date")) {
      tips.push("Add a due date to every action so expectations are clear.");
    } else if (issue.includes("No actions identified")) {
      tips.push(
        "Add more ticket detail or import from your PSA so open work items can be extracted.",
      );
    } else if (issue.includes("without mitigation")) {
      tips.push("Describe how each risk will be managed or reduced before sharing.");
    } else {
      tips.push(`Improve: ${issue}`);
    }
  }
  return tips;
}

/** Status report body often uses "(null)", em-dash, "()", "(unassigned)" for missing owners in numbered lines. */
const STATUS_REPORT_OWNER_PLACEHOLDER =
  /(\((?:null|\u2014|\u2013|-|unassigned|\s*)\))/gi;

function renderStatusReportDisplay(text: string): ReactNode {
  const trimmed = text.trim();
  if (!trimmed) {
    return (
      <span className="text-muted-foreground">-</span>
    );
  }
  const pieces = text.split(STATUS_REPORT_OWNER_PLACEHOLDER);
  return (
    <span className="whitespace-pre-wrap">
      {pieces.map((piece, i) =>
        i % 2 === 1 ? (
          <span key={i} className="text-muted-foreground">
            Unassigned
          </span>
        ) : (
          piece
        ),
      )}
    </span>
  );
}

function formatActionDueForCopy(due: string | null | undefined): string {
  const d = (due ?? "").trim();
  return d || "TBC";
}

function formatActionsForCopy(actions: ActionRow[], ticketTitles?: string[]): string {
  if (actions.length === 0) return "";
  const showSource = (ticketTitles?.length ?? 0) >= 2;
  const lines = ["ACTION LOG", "──────────────────────", ""];
  actions.forEach((a, i) => {
    const task = (a.task ?? "").trim() || "-";
    const owner = formatOwnerLabel(a.suggested_owner);
    const pri = (a.priority ?? "").trim() || "-";
    const due = formatActionDueForCopy(a.due_date);
    lines.push(`${i + 1}. ${task}`);
    lines.push(`   Owner: ${owner} | Priority: ${pri} | Due: ${due}`);
    if (showSource && ticketTitles) {
      lines.push(`   Source: ${actionSourceDisplayLabel(a, ticketTitles)}`);
    }
    lines.push("");
  });
  return lines.join("\n").trimEnd();
}

function formatRisksForCopy(risks: RiskRow[], ticketTitles?: string[]): string {
  if (risks.length === 0) return "";
  const showSource = (ticketTitles?.length ?? 0) >= 2;
  const lines = ["RISK LOG", "──────────────────────", ""];
  risks.forEach((r, i) => {
    const risk = (r.risk ?? "").trim() || "-";
    const impact = (r.impact ?? "").trim() || "-";
    const mit = (r.mitigation ?? "").trim() || "-";
    lines.push(`${i + 1}. ${risk}`);
    lines.push(`   Owner: TBC | Impact: ${impact} | Probability: TBC | Status: TBC`);
    lines.push(`   Mitigation: ${mit}`);
    if (showSource && ticketTitles) {
      lines.push(`   Source: ${riskSourceDisplayLabel(r, ticketTitles)}`);
    }
    lines.push("");
  });
  return lines.join("\n").trimEnd();
}

function dueDateToInputValue(due: string | null | undefined): string {
  const s = (due ?? "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const parsed = Date.parse(s);
  if (Number.isFinite(parsed)) {
    const d = new Date(parsed);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return "";
}

function formatDueDateFromInput(isoYmd: string): string {
  const trimmed = isoYmd.trim();
  if (!trimmed) return "";
  const d = new Date(`${trimmed}T12:00:00`);
  if (Number.isNaN(d.getTime())) return trimmed;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function firstExportClientName(actions: ActionRow[]): string | null {
  for (const a of actions) {
    const c = (a.client_name ?? "").trim();
    if (c) return c;
  }
  return null;
}

function formatAllOutputsForCopy(result: GenerateResult, ticketTitles?: string[]): string {
  const lines = [
    "ACTIONS",
    formatActionsForCopy(result.actions, ticketTitles) || "No actions returned.",
    "",
    "RISKS",
    formatRisksForCopy(result.risks, ticketTitles) || "No risks returned.",
    "",
    "SUMMARY",
    result.summary || "No summary returned.",
    "",
    "CLIENT EMAIL",
    result.client_email || "No client email returned.",
    "",
    "STATUS REPORT",
    result.status_report || "No status report returned.",
  ];
  for (const k of EXTENDED_PM_TAB_KEYS) {
    const t = (result[k] ?? "").trim();
    if (!t) continue;
    lines.push("", EXTENDED_PM_TAB_LABELS[k].toUpperCase(), t);
  }
  return lines.join("\n");
}

const encodeMailto = (str: string) =>
  encodeURIComponent(str).replace(/\+/g, "%20").replace(/%2B/g, "+");

function buildMailtoLink(
  emailSubject: string,
  clientEmailBody: string,
  toAddress?: string | null,
): string {
  const subject = emailSubject.trim();
  const body = (clientEmailBody ?? "").replace(/\n/g, "\r\n");
  const to = (toAddress ?? "").trim();

  const parts: string[] = [];
  if (subject) parts.push(`subject=${encodeMailto(subject)}`);
  if (body) parts.push(`body=${encodeMailto(body)}`);
  const q = parts.join("&");

  if (to) {
    return `mailto:${encodeURIComponent(to)}${q ? `?${q}` : ""}`;
  }
  return `mailto:?${q}`;
}

type ParsedClientEmailSection = { client: string | null; content: string };

const CLIENT_EMAIL_HEADER_RE = /^CLIENT EMAIL\s*-\s*[^:\n]+:\s*/i;

/** Strip leading CLIENT EMAIL - [Name]: header (single-client display/copy only). */
function stripLeadingClientEmailHeader(text: string): string {
  return text.replace(CLIENT_EMAIL_HEADER_RE, "").trim();
}

/** Splits model output into per-client sections when formatted as CLIENT EMAIL - Name: ... separated by --- */
function parseClientEmails(emailContent: string): ParsedClientEmailSection[] {
  const text = (emailContent ?? "").trim();
  if (!text) return [{ client: null, content: "" }];

  const labelMatches = [...text.matchAll(/CLIENT EMAIL\s*-\s*([^:\n]+)\s*:\s*/gi)];
  if (labelMatches.length === 0) {
    return [{ client: null, content: text }];
  }
  if (labelMatches.length === 1) {
    const m = labelMatches[0];
    const body = text.slice((m.index ?? 0) + m[0].length).trim();
    return [{ client: m[1].trim(), content: body }];
  }

  const out: ParsedClientEmailSection[] = [];
  for (let i = 0; i < labelMatches.length; i++) {
    const start = (labelMatches[i].index ?? 0) + labelMatches[i][0].length;
    const end =
      i + 1 < labelMatches.length
        ? (labelMatches[i + 1].index ?? text.length)
        : text.length;
    let body = text.slice(start, end).trim();
    body = body.replace(/^-{3,}\s*\n?/, "").replace(/\n-{3,}\s*$/, "").trim();
    out.push({ client: labelMatches[i][1].trim(), content: body });
  }
  return out;
}

function getOutputTabPlaintext(
  tab: string,
  result: GenerateResult,
  clientSections: ParsedClientEmailSection[],
  activeClientEmailIndex: number,
  ticketTitles?: string[],
): string {
  switch (tab) {
    case "actions":
      return formatActionsForCopy(result.actions, ticketTitles);
    case "risks":
      return formatRisksForCopy(result.risks, ticketTitles);
    case "summary":
      return result.summary ?? "";
    case "client_email": {
      const max = Math.max(0, clientSections.length - 1);
      const idx = Math.min(activeClientEmailIndex, max);
      const s = clientSections[idx];
      let body = (s?.content ?? result.client_email ?? "").trim();
      if (clientSections.length === 1) {
        body = stripLeadingClientEmailHeader(body);
      }
      const subject = (result.email_subject ?? "").trim();
      const parts: string[] = [];
      if (subject) parts.push(`Subject: ${subject}`);
      if (body) parts.push(body);
      return parts.join("\n\n");
    }
    case "status_report":
      return result.status_report ?? "";
    default:
      if (EXTENDED_PM_TAB_KEYS.includes(tab as ExtendedPmTabKey)) {
        return result[tab as ExtendedPmTabKey] ?? "";
      }
      return "";
  }
}

function toneLabel(tone: Tone): string {
  if (tone === "formal") return "Formal";
  if (tone === "friendly") return "Friendly";
  return "Professional";
}

function OutputTabEmptyState({
  icon,
  message,
}: {
  icon: ReactNode;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className="text-[var(--text-secondary)] opacity-40 [&_svg]:h-8 [&_svg]:w-8">
        {icon}
      </div>
      <div className="text-center">
        <p className="text-[13px] text-[var(--text-secondary)]">{message}</p>
        <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
          Try regenerating with more detailed notes for better results
        </p>
      </div>
    </div>
  );
}

function formatScheduleTs(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "-";
  }
}

/** e.g. Monday 28 March, 7:00am (London) */
function formatScheduleHistorySent(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Europe/London",
    });
  } catch {
    return "-";
  }
}

function formatShortGmtDate(iso: string | null | undefined): string {
  if (!iso) return "Never";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "Europe/London",
    });
  } catch {
    return "Never";
  }
}

function normalizePrefsFromApi(raw: unknown): NormalizedEmailContentPrefs {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_EMAIL_CONTENT_PREFS };
  const o = raw as Record<string, unknown>;
  return {
    include_actions: o.include_actions !== false,
    include_risks: o.include_risks !== false,
    include_client_emails: o.include_client_emails === true,
    include_status: o.include_status === true,
  };
}

const SCHEDULE_DAY_OPTIONS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const SCHEDULE_TIME_OPTIONS: { value: string; label: string }[] = [
  { value: "06:00", label: "6:00am" },
  { value: "07:00", label: "7:00am" },
  { value: "08:00", label: "8:00am" },
  { value: "09:00", label: "9:00am" },
  { value: "10:00", label: "10:00am" },
  { value: "12:00", label: "12:00pm" },
  { value: "15:00", label: "3:00pm" },
  { value: "17:00", label: "5:00pm" },
];

const CAMPAIGN_EDITOR_TABS = ["Basics", "Schedule", "Data", "Output"] as const;

function excelSheetLabel(key: string): string {
  if (key === "actions") return "Action Log";
  if (key === "risks") return "Risk Log";
  if (key === "summary") return "Executive Summary";
  if (key === "status_report") return "Status Report";
  if (key === "client_email") return "Client Updates";
  if (key in SCHEDULE_EXCEL_OPTIONAL_LABELS) {
    return SCHEDULE_EXCEL_OPTIONAL_LABELS[key as keyof typeof SCHEDULE_EXCEL_OPTIONAL_LABELS];
  }
  return key;
}

function normalizeSchEmailTone(v: unknown): "formal" | "professional" | "friendly" {
  if (v === "formal" || v === "friendly") return v;
  return "professional";
}

function scheduleDateRangeLabel(key: string): string {
  if (key === "last_14_days") return "Last 14 days of tickets";
  if (key === "this_week") return "This week (Mon-Sun GMT)";
  return "Last 7 days of tickets";
}

function relativeTimeLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}

function priorityBadgeClass(priority: string | null): string {
  const p = (priority ?? "").toLowerCase();
  if (p === "high") {
    return "inline-flex shrink-0 items-center rounded-md border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] px-1.5 py-px text-[10px] font-semibold text-[#ef4444]";
  }
  if (p === "medium") {
    return "inline-flex shrink-0 items-center rounded-md border border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.08)] px-1.5 py-px text-[10px] font-semibold text-[#f59e0b]";
  }
  if (p === "low") {
    return "inline-flex shrink-0 items-center rounded-md border border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.08)] px-1.5 py-px text-[10px] font-semibold text-[#22c55e]";
  }
  return "inline-flex shrink-0 items-center rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-1.5 py-px text-[10px] font-semibold text-[var(--text-muted)]";
}

/** Shared keyboard-focus ring (mouse clicks stay clean). */
const focusRing =
  "transition-all duration-[120ms] ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2";

/** Generation output tab panel — single scroll container for tab content */
const OUTPUT_TAB_PANEL_CLASS =
  "mt-0 flex min-h-0 flex-1 flex-col overflow-visible rounded-b-[var(--radius-lg)] border-x border-b border-[var(--border)] bg-[var(--bg-secondary)] p-3 outline-none md:overflow-y-auto";

/** Inset surface wrapping Card inside each output tab */
const OUTPUT_TAB_CONTENT_SHELL =
  "animate-in fade-in duration-150 flex flex-col rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--border)_70%,transparent),inset_0_18px_36px_-18px_color-mix(in_srgb,var(--bg-secondary)_85%,transparent)]";

const OUTPUT_TAB_CARD_CLASS =
  "flex flex-col gap-0 overflow-visible border-0 bg-transparent py-0 shadow-none";

const OUTPUT_TAB_CARD_BODY_SCROLL =
  "flex flex-col overflow-visible";

const OUTPUT_TAB_CARD_BODY_INNER_SCROLL =
  "min-h-0 w-full overflow-visible";

const FOLLOW_UP_ALL_CLIENTS = "__all__";

/** Generation output tabs — underline active state only (no pill/box). */
const OUTPUT_SEGMENT_TRIGGER_CLASS =
  "relative !flex-none shrink-0 justify-center rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 pb-2 pt-1 text-[13px] font-medium text-[var(--text-muted)] shadow-none transition-colors duration-150 ease-out after:!hidden hover:text-[var(--text-secondary)] data-active:border-[var(--accent)] data-active:bg-transparent data-active:text-[var(--text-primary)] data-active:shadow-none dark:data-active:bg-transparent -mb-px";

const OUTPUT_REGEN_BAR_CLASS =
  "mt-3 flex min-h-[38px] items-center gap-1.5 rounded-[var(--radius)] bg-[var(--bg-secondary)] px-2 py-1 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--border)_55%,transparent)]";

const OUTPUT_REGEN_INPUT_CLASS =
  "h-8 flex-1 border-0 bg-transparent px-2 text-[13px] leading-snug text-[var(--text-primary)] shadow-none placeholder:text-[var(--text-muted)] placeholder:opacity-65 focus-visible:ring-0 focus-visible:ring-offset-0";

const OUTPUT_REGEN_BUTTON_CLASS =
  "h-9 shrink-0 rounded-full px-3.5 text-[11px] font-semibold shadow-none";

function isAuthConnectionFailure(err: unknown): boolean {
  if (!err) return false;
  if (typeof err === "object" && err !== null && "name" in err) {
    const name = String((err as { name: unknown }).name);
    if (name.includes("AuthRetryableFetchError") || name === "FetchError") return true;
  }
  const msg =
    typeof err === "object" && err !== null && "message" in err
      ? String((err as { message: unknown }).message)
      : String(err);
  const lower = msg.toLowerCase();
  return (
    lower.includes("fetch") ||
    lower.includes("network") ||
    lower.includes("enotfound") ||
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("timeout")
  );
}

function ResultsSkeleton() {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="border-b pb-4">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-md" />
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="mb-3 h-4 w-full rounded shimmer-skeleton" />
        <div className="mb-3 h-4 w-[95%] rounded shimmer-skeleton" />
        <div className="mb-3 h-4 w-[88%] rounded shimmer-skeleton" />
        <div className="h-4 w-[70%] rounded shimmer-skeleton" />
      </CardContent>
    </Card>
  );
}

function startOfMonthUtcIso(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
  ).toISOString();
}

const HANDOVER_BRAND_PRIMARY_HEX = "#2563EB";
const HANDOVER_BRAND_SECONDARY_HEX = "#1E40AF";
const HEX_COLOUR_6 = /^#?[0-9a-fA-F]{6}$/;

/** Value for native colour picker (`<input type="color">` requires `#rrggbb`). */
function hexForColorInput(raw: string, fallbackHex: string): string {
  const t = raw.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(t)) return `#${t.toLowerCase()}`;
  const f = fallbackHex.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(f)) return `#${f.toLowerCase()}`;
  return "#2563eb";
}

function formatHex6Display(value: string): string {
  const t = value.trim();
  if (!HEX_COLOUR_6.test(t)) return value;
  return `#${t.replace(/^#/, "").toUpperCase()}`;
}

/** Coerce Supabase / JSON integer arrays (may include numeric strings) to finite integers. */
function normalizeCampaignIntIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const out: number[] = [];
  for (const x of raw) {
    if (typeof x === "number" && Number.isFinite(x)) {
      out.push(Math.trunc(x));
    } else if (typeof x === "string" && x.trim()) {
      const n = Number(x.trim());
      if (Number.isFinite(n)) out.push(Math.trunc(n));
    }
  }
  return [...new Set(out)];
}

const SCHEDULE_PREVIEW_CACHE_MS = 5 * 60 * 1000;

/** Relative age for preview timestamp line; `tick` bumps on an interval so the label updates. */
function formatScheduledPreviewAgeLabel(iso: string | null, tick: number): string | null {
  void tick;
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min === 1) return "1 minute ago";
  if (min < 60) return `${min} minutes ago`;
  const h = Math.floor(min / 60);
  if (h === 1) return "1 hour ago";
  if (h < 48) return `${h} hours ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "1 day ago" : `${d} days ago`;
}

function UpgradeWall({ message }: { message: string }) {
  return (
    <div className="flex min-h-[400px] w-full flex-col items-center justify-center gap-5 rounded-[var(--radius-lg)] border border-amber-500/25 bg-amber-500/[0.06] px-8 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15">
        <svg width="22" height="22" fill="none" stroke="#f59e0b" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </div>
      <div>
        <p className="mb-2 text-[17px] font-semibold text-white/90">{message}</p>
        <p className="mb-5 text-[14px] text-white/55">Upgrade to restore full access to your workspace.</p>
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] px-5 py-2.5 text-[14px] font-semibold text-[#0f172a] transition-all hover:scale-[1.02]"
        >
          Upgrade now →
        </Link>
      </div>
    </div>
  );
}

type OverviewAttentionReasonCategory =
  | "past_target"
  | "sla_breached"
  | "sla_at_risk"
  | "due_soon"
  | "red_rag"
  | "amber_rag";

const OVERVIEW_ATTENTION_REASON_SEVERITY: Record<OverviewAttentionReasonCategory, number> = {
  past_target: 1,
  sla_breached: 2,
  sla_at_risk: 3,
  due_soon: 4,
  red_rag: 5,
  amber_rag: 6,
};

type OverviewAttentionRowMatch = {
  name: string;
  pastTargetDays?: number;
  dueInDays?: number;
};

function classifyOverviewAttentionRow(row: DeliveryHealthRow): {
  category: OverviewAttentionReasonCategory;
  match: OverviewAttentionRowMatch;
} | null {
  const name = row.name?.trim() || "Untitled";
  if (row.daysToTarget !== null && row.daysToTarget < 0) {
    return {
      category: "past_target",
      match: { name, pastTargetDays: Math.abs(row.daysToTarget) },
    };
  }
  if (row.slaRisk === "overdue") {
    return { category: "sla_breached", match: { name } };
  }
  if (row.slaRisk === "at_risk") {
    return { category: "sla_at_risk", match: { name } };
  }
  if (row.daysToTarget !== null && row.daysToTarget <= 7) {
    return {
      category: "due_soon",
      match: { name, dueInDays: row.daysToTarget },
    };
  }
  if (row.rag === "red") {
    return { category: "red_rag", match: { name } };
  }
  if (row.rag === "amber") {
    return { category: "amber_rag", match: { name } };
  }
  return null;
}

function buildOverviewAttentionReason(
  category: OverviewAttentionReasonCategory,
  matches: OverviewAttentionRowMatch[],
): string {
  const count = matches.length;
  switch (category) {
    case "past_target":
      if (count === 1 && matches[0]?.pastTargetDays != null) {
        return `${matches[0].pastTargetDays} days past target`;
      }
      if (count > 1) {
        return `Past target on ${count} tickets`;
      }
      return "Past target";
    case "sla_breached":
      return count > 1 ? `SLA breached on ${count} tickets` : "SLA breached";
    case "sla_at_risk":
      return count > 1 ? `SLA at risk on ${count} tickets` : "SLA at risk";
    case "due_soon": {
      const days = matches[0]?.dueInDays;
      if (days != null) {
        return `Due in ${days} day${days === 1 ? "" : "s"}`;
      }
      return "Due soon";
    }
    case "red_rag":
      return count > 1 ? `No recent activity on ${count} tickets` : "No recent activity";
    case "amber_rag":
      return count > 1 ? `Needs review on ${count} tickets` : "Needs review";
    default:
      return "";
  }
}

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shell = useAppShell();
  const {
    authChecked,
    userEmail,
    authUserId,
    userCreatedAt,
    userFirstName,
    profile,
    plan,
    profileDbPlan,
    trialEndsAt,
    profileTrialPlan,
    profileSubscriptionStatus,
    userTeamId,
    entitlement,
    usage,
    teamVisibility,
    branding,
    profileForm,
    psa,
    onboarding,
    sidebarPinned,
    sidebarHovered,
    setSidebarOpenMobile,
    theme,
    setTheme,
    settings,
    refreshShellData,
    registerOnSignOut,
  } = shell;
  const hasProAccess = entitlement.hasProAccess;
  const soloGenerationLocked = entitlement.soloGenerationLocked;
  const isExpiredTrial = entitlement.isExpiredTrial;
  const qbrUsageHint = entitlement.qbrUsageHint;
  const paymentPastDue = entitlement.paymentPastDue;
  const {
    monthCount,
    qbrMonthCount,
    generationLimitOverride,
    monthlyStats,
    monthlyStatsLoading,
    totalGenerationCount,
    setGenerationStreak,
  } = usage;
  const {
    tourCompleted,
    setTourCompleted,
    hasCompletedLoop,
    setHasCompletedLoop,
  } = shell;
  const {
    deliveryAccess: deliveryDashboardAccess,
  } = teamVisibility;
  const {
    brandName,
    setBrandName,
    brandColour,
    setBrandColour,
    brandSecondaryColour,
    setBrandSecondaryColour,
    brandLogoUrl,
    setBrandLogoUrl,
    brandLogoPreviewKey,
    setBrandLogoPreviewKey,
    whiteLabelMode,
    setWhiteLabelMode,
    brandColourError,
    setBrandColourError,
    brandSecondaryColourError,
    setBrandSecondaryColourError,
  } = branding;
  const {
    profileFirstName,
    setProfileFirstName,
    profileLastName,
    setProfileLastName,
    profileDisplayName,
    setProfileDisplayName,
    profileJobTitle,
    setProfileJobTitle,
    profileCompanyName,
    setProfileCompanyName,
    profileOutputLanguage,
    setProfileOutputLanguage,
    signatureOverride,
    setSignatureOverride,
    writingStyle,
    setWritingStyle,
    compactMode,
    setCompactMode,
    dashboardViewMode,
    setDashboardViewMode,
    showCharacterCount,
    setShowCharacterCount,
    privacyMode,
    setPrivacyMode,
  } = profileForm;
  const {
    haloConnected,
    setHaloConnected,
    haloUrl,
    setHaloUrl,
    haloClientIdMasked,
    haloClientIdLength,
    haloUpdatedAt,
    haloAutoClosureSummary,
    setHaloAutoClosureSummary,
    haloReconnectRecommended,
    setHaloReconnectRecommended,
    loading: psaLoading,
    cwConnected,
    cwSiteUrl,
    slackWebhookUrl,
    setSlackWebhookUrl,
    slackNotificationsEnabled,
    setSlackNotificationsEnabled,
    teamsWebhookUrl,
    setTeamsWebhookUrl,
    teamsNotificationsEnabled,
    setTeamsNotificationsEnabled,
  } = psa;
  const {
    profileLoaded: onboardingProfileLoaded,
    requiredExplicit: onboardingRequiredExplicit,
    setRequiredExplicit: setOnboardingRequiredExplicit,
    overlayOpen: onboardingOverlayOpen,
    setOverlayOpen: setOnboardingOverlayOpen,
  } = onboarding;
  const [gettingStartedChecklistMountKey, setGettingStartedChecklistMountKey] = useState(0);
  const showLeftSidebar = Boolean(userEmail);
  const onboardingWelcomeFirst = useMemo(() => {
    const fromProfile = userFirstName?.trim();
    if (fromProfile) {
      return (
        fromProfile.charAt(0).toUpperCase() +
        (fromProfile.length > 1 ? fromProfile.slice(1).toLowerCase() : "")
      );
    }
    const local = userEmail?.split("@")[0]?.trim();
    if (!local) return null;
    const piece = local.split(/[._-]/)[0]?.trim();
    if (!piece) return null;
    return (
      piece.charAt(0).toUpperCase() + (piece.length > 1 ? piece.slice(1).toLowerCase() : "")
    );
  }, [userFirstName, userEmail]);

  const [streakFlameBurst, setStreakFlameBurst] = useState(false);
  /** One dismissible referral line per browser session after a successful generation (output panel). */
  const [showPostGenReferralFooter, setShowPostGenReferralFooter] = useState(false);
  const [firstGenTipDismissed, setFirstGenTipDismissed] = useState<boolean | null>(null);
  const [pro75Dismissed, setPro75Dismissed] = useState(false);
  const [showProTeamRecommendation, setShowProTeamRecommendation] = useState(false);

  const [input, setInput] = useState("");
  const [projectName, setProjectName] = useState("");
  const [clientContactEmail, setClientContactEmail] = useState("");
  const [generationMailtoEmail, setGenerationMailtoEmail] = useState<string | null>(null);
  const [sendClientEmailModalOpen, setSendClientEmailModalOpen] = useState(false);
  const [smartActionsOpen, setSmartActionsOpen] = useState(false);
  const GENERATION_EMAIL_TONE: Tone = "professional";
  const [lastGeneratedTone, setLastGeneratedTone] = useState<Tone>("professional");
  const [lastInput, setLastInput] = useState("");
  const ticketTitlesForSourceColumn = useMemo(
    () => extractTicketTitlesFromGenerationInput((input.trim() || lastInput.trim()).trim()),
    [input, lastInput],
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const genProgressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const genStartTime = useRef<number | null>(null);
  const [lastGenDurationMs, setLastGenDurationMs] = useState<number | null>(null);
  const [showTimeSaved, setShowTimeSaved] = useState(false);
  const [generationLongWait, setGenerationLongWait] = useState(false);
  /** UI-only: brief "Compacting..." before fetch when input is over the soft character cap. */
  const [generationPhase, setGenerationPhase] = useState<
    "idle" | "compacting" | "generating"
  >("idle");
  const [integrationsBootstrapping, setIntegrationsBootstrapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importedFileName, setImportedFileName] = useState<string | null>(null);
  const [importedFileTypeLabel, setImportedFileTypeLabel] = useState<string | null>(null);
  const [lastImportedHaloItems, setLastImportedHaloItems] = useState<ImportedHaloItem[]>([]);
  const [lastInputQuality, setLastInputQuality] = useState<{ score: number; reasons: string[] } | null>(
    null,
  );
  const [lastImportSourcePsa, setLastImportSourcePsa] = useState<"halopsa" | "connectwise" | null>(null);
  const [pushModalOpen, setPushModalOpen] = useState(false);
  /** Mobile (< md) stepped layout inside push modal; desktop ignores. */
  const [pushModalMobileStep, setPushModalMobileStep] = useState(0);
  const [pushSelectedTicketIds, setPushSelectedTicketIds] = useState<number[]>([]);
  const [pushSelectedOutputs, setPushSelectedOutputs] = useState<
    ("client_email" | "actions" | "risks" | "summary" | "status_report")[]
  >(["summary", "actions", "risks"]);
  const [pushSummaryScope, setPushSummaryScope] = useState<"per_ticket" | "combined_all">(
    "combined_all",
  );
  const [pushStatusScope, setPushStatusScope] = useState<"per_ticket" | "combined_all">(
    "combined_all",
  );
  const [pushAttachExcel, setPushAttachExcel] = useState(false);
  /** Excel tabs for Halo push attachment only - excludes client_email by default. */
  const [selectedExcelTabs, setSelectedExcelTabs] = useState<string[]>([
    "actions",
    "risks",
    "summary",
    "status_report",
  ]);
  const [pushLoading, setPushLoading] = useState(false);
  const pushInFlightRef = useRef(false);
  const [pushErrors, setPushErrors] = useState<Array<{ ticketId: number; error: string }>>([]);
  const [lastPushed, setLastPushed] = useState<Date | null>(null);
  const [lastPushTargetPsa, setLastPushTargetPsa] = useState<"halopsa" | "connectwise" | null>(
    null,
  );
  const [lastPushedOutputs, setLastPushedOutputs] = useState<
    ("client_email" | "actions" | "risks" | "summary" | "status_report")[]
  >([]);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [savedGenerationId, setSavedGenerationId] = useState<string | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResultPayload | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareNoPrevious, setCompareNoPrevious] = useState(false);
  const [hasPreviousReport, setHasPreviousReport] = useState(false);
  const [stagedCompareExample, setStagedCompareExample] = useState(false);
  const [generationRating, setGenerationRating] = useState<"positive" | "negative" | null>(
    null,
  );
  const [reportQualityTipsOpen, setReportQualityTipsOpen] = useState(false);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [followUpModalBody, setFollowUpModalBody] = useState("");
  const [followUpModalSubject, setFollowUpModalSubject] = useState("");
  const [followUpModalActionCount, setFollowUpModalActionCount] = useState(0);
  const [followUpClientScope, setFollowUpClientScope] = useState<string>("");
  const [editingField, setEditingField] = useState<EditableField>(null);
  const [editingActionRow, setEditingActionRow] = useState<number | null>(null);
  const [editingDueDateRow, setEditingDueDateRow] = useState<number | null>(null);
  const [sessionUsesDemoData, setSessionUsesDemoData] = useState(false);
  const [editingRiskRow, setEditingRiskRow] = useState<number | null>(null);
  const [outputMainTab, setOutputMainTab] = useState<string>("client_email");
  const outputTabScrollRef = useRef<HTMLDivElement | null>(null);
  const [outputTabScrollEdges, setOutputTabScrollEdges] = useState({ left: false, right: false });
  const [isInputCollapsed, setIsInputCollapsed] = useState(false);
  /** Empty-layout "Add manually" — presentation only; does not affect import/generation logic. */
  const [generateManualExpanded, setGenerateManualExpanded] = useState(false);
  const [fullReportExportPickerOpen, setFullReportExportPickerOpen] = useState(false);
  const [schedulePrefillImportBanner, setSchedulePrefillImportBanner] = useState(false);
  const [scheduleWizardNextFlash, setScheduleWizardNextFlash] = useState(false);
  const scheduleWizardFlashTimerRef = useRef<number | null>(null);
  const scheduleWizardPrevRequiredRef = useRef<number | null>(null);
  const [onboardingTabsExplored, setOnboardingTabsExplored] = useState(false);
  const [basicOnboardingActionExportDone, setBasicOnboardingActionExportDone] = useState(false);
  const [smartActionEmailBody, setSmartActionEmailBody] = useState<string | null>(null);
  const [smartActionEmailTo, setSmartActionEmailTo] = useState<string | null>(null);
  const [pushHaloHighlight, setPushHaloHighlight] = useState(false);
  const [pushQuickActionSuccess, setPushQuickActionSuccess] = useState(false);
  const [postOnboardingNewGenHighlight, setPostOnboardingNewGenHighlight] = useState(false);
  const [sendEmailButtonHighlight, setSendEmailButtonHighlight] = useState(false);
  const [genProgressMsgIx, setGenProgressMsgIx] = useState(0);
  const [activeClientEmailIndex, setActiveClientEmailIndex] = useState(0);
  const [activeStatusReportIndex, setActiveStatusReportIndex] = useState(-1);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputSectionRef = useRef<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportSubPanel, setExportSubPanel] = useState<
    null | "actions" | "risks" | "fullreport"
  >(null);
  const [exportActionCols, setExportActionCols] = useState<string[]>(() => [
    ...EXPORT_DEFAULTS.actions,
  ]);
  const [exportRiskCols, setExportRiskCols] = useState<string[]>(() => [
    ...EXPORT_DEFAULTS.risks,
  ]);
  const [exportFullTabs, setExportFullTabs] = useState<string[]>(() => [
    ...EXPORT_DEFAULTS.fullReport.tabs,
  ]);
  const [exportFullActionCols, setExportFullActionCols] = useState<string[]>(() => [
    ...EXPORT_DEFAULTS.fullReport.actionColumns,
  ]);
  const [exportFullRiskCols, setExportFullRiskCols] = useState<string[]>(() => [
    ...EXPORT_DEFAULTS.fullReport.riskColumns,
  ]);
  const [proExportModalOpen, setProExportModalOpen] = useState(false);
  const [haloProModalOpen, setHaloProModalOpen] = useState(false);
  const [headerUpgradeOpen, setHeaderUpgradeOpen] = useState(false);
  const [npsOpen, setNpsOpen] = useState(false);
  const [npsPhase, setNpsPhase] = useState<
    "score" | "promoter" | "passive" | "detractor" | "thanks"
  >("score");
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [npsComment, setNpsComment] = useState("");
  const [npsSending, setNpsSending] = useState(false);
  const npsAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mockupSectionRef = useRef<HTMLDivElement | null>(null);
  const outputRef = useRef<HTMLDivElement | null>(null);
  const generateInputRef = useRef<HTMLTextAreaElement | null>(null);

  const [signedOutInputSnapshot, setSignedOutInputSnapshot] = useState<string>("");
  const [isEditingSignedOutInput, setIsEditingSignedOutInput] = useState(false);

  const [generationToastOpen, setGenerationToastOpen] = useState(false);
  const [generationToastSubtitle, setGenerationToastSubtitle] = useState("");
  const generationToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [exportLockedPromptOpen, setExportLockedPromptOpen] = useState(false);

  const [isCheckingAuthForGenerate, setIsCheckingAuthForGenerate] = useState(false);
  const [templateSaveCtaHighlight, setTemplateSaveCtaHighlight] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [demoTab, setDemoTab] = useState<"actions" | "risks" | "summary" | "client_email" | "status_report">("actions");
  const [lockedTeaserOpen, setLockedTeaserOpen] = useState(false);
  const [lockedTeaserTab, setLockedTeaserTab] = useState<
    "actions" | "risks" | "summary" | "client_email" | "status_report"
  >("actions");
  const [outputPrefs, setOutputPrefs] = useState<Record<ModalOutputKey, boolean>>(
    () => defaultOutputPrefs(),
  );
  const [extendedOutputPrefs, setExtendedOutputPrefs] = useState<
    Record<ExtendedPmTabKey, boolean>
  >(() => defaultExtendedOutputPrefs());
  const [clientContactName, setClientContactName] = useState("");
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [showSignUpBanner, setShowSignUpBanner] = useState(false);
  const mounted = authChecked;
  const [dashGreeting, setDashGreeting] = useState<string | null>(null);
  const [checkoutLoadingPriceId, setCheckoutLoadingPriceId] = useState<string | null>(null);
  /** Active Stripe subscription on monthly Starter or Growth price - offer portal to switch to annual */
  const [stripeMonthlyPayingPlan, setStripeMonthlyPayingPlan] = useState<
    "professional" | "team" | null
  >(null);
  const [portalNavigating, setPortalNavigating] = useState(false);
  const [manageSubscriptionLoading, setManageSubscriptionLoading] = useState(false);
  const billingPortalBusyRef = useRef(false);
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [templatePreview, setTemplatePreview] = useState<SavedTemplate | null>(null);
  const [nextTemplateContext, setNextTemplateContext] = useState<string>("");
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [projectsOffset, setProjectsOffset] = useState(0);
  const [hasMoreProjects, setHasMoreProjects] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [collections, setCollections] = useState<CollectionApiRow[]>([]);
  const [selectedHistoryCollectionId, setSelectedHistoryCollectionId] = useState<string | null>(
    null,
  );
  const [onboardingPageVisited, setOnboardingPageVisited] = useState(false);
  const onboardingRedirectPending = useMemo(() => {
    if (!userEmail) return false;
    if (!onboardingProfileLoaded) return true;
    if (!onboardingRequiredExplicit) return false;
    if (onboardingPageVisited) return false;
    return true;
  }, [
    userEmail,
    onboardingProfileLoaded,
    onboardingRequiredExplicit,
    onboardingPageVisited,
  ]);
  const lastOnboardingHydratedUserIdRef = useRef<string | null>(null);
  const autoRestoreLastSessionRanRef = useRef(false);
  const [stagedGenerationReady, setStagedGenerationReady] = useState(false);
  const [shouldAutoStartTour, setShouldAutoStartTour] = useState(false);
  const tourAutoStartAttemptedRef = useRef(false);
  const tourCompletionCelebrationFiredRef = useRef(false);
  const [proFeatureGate, setProFeatureGate] = useState<string | null>(null);
  const [showPostGenProUpsell, setShowPostGenProUpsell] = useState(false);
  /** True after user has pushed to PSA or sent client email at least once (profiles.has_completed_loop). */
  /** When non-null, show dismissible banner above output after auto-restoring last generation. */
  const [lastSessionRestoreBannerProject, setLastSessionRestoreBannerProject] =
    useState<ProjectItem | null>(null);
  const sevenGenToastFiredRef = useRef(false);
  const [premiumHardLimitOpen, setPremiumHardLimitOpen] = useState(false);
  const [hardLimitType, setHardLimitType] = useState<"trial" | "pro_monthly" | "team_monthly">("trial");
  const [scheduledReportsProPaywallOpen, setScheduledReportsProPaywallOpen] = useState(false);
  const [saveTemplateFor, setSaveTemplateFor] = useState<TemplateType | null>(null);
  const [templateNameDraft, setTemplateNameDraft] = useState("");
  const [regenInstruction, setRegenInstruction] = useState<Record<string, string>>({});
  const [regenLoadingFor, setRegenLoadingFor] = useState<string | null>(null);
  const [chatsModalOpen, setChatsModalOpen] = useState(false);
  const [firstGenCelebrationOpen, setFirstGenCelebrationOpen] = useState(false);
  const [hasExportedExcel, setHasExportedExcel] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(LS_EXCEL_EXPORTED) === "true";
    } catch {
      return false;
    }
  });
  const settingsTab = settings.tab;
  const setSettingsOpen = settings.setOpen;
  const setSettingsTab = settings.setTab;
  const [configurationTargetSection, setConfigurationTargetSection] =
    useState<ConfigurationTargetSection | null>(null);
  const clearConfigurationTargetSection = useCallback(() => {
    setConfigurationTargetSection(null);
  }, []);
  const openIntegrationsInConfiguration = useCallback(
    (opts?: { initialDetail?: "halo" | "connectwise" }) => {
      setMainView("configuration");
      setConfigurationTargetSection("integrations");
      if (opts?.initialDetail) setIntegrationsInitialDetail(opts.initialDetail);
      else setIntegrationsInitialDetail(null);
      setSettingsOpen(false);
      setSidebarOpenMobile(false);
    },
    [],
  );
  const [mainView, setMainView] = useState<MainView>("overview");
  const viewUrlHydratedRef = useRef(false);
  const viewChangedFromUrlRef = useRef(false);

  useEffect(() => {
    const viewParam = searchParams.get("view");
    if (isMainView(viewParam) && viewParam !== mainView) {
      viewChangedFromUrlRef.current = true;
      setMainView(viewParam);
    }
    viewUrlHydratedRef.current = true;
  }, [mainView, searchParams]);

  useEffect(() => {
    if (!viewUrlHydratedRef.current) return;
    if (viewChangedFromUrlRef.current) {
      viewChangedFromUrlRef.current = false;
      return;
    }

    const url = new URL(window.location.href);
    if (url.searchParams.get("view") === mainView) return;
    url.searchParams.set("view", mainView);

    const query = url.searchParams.toString();
    const nextUrl = `${url.pathname}${query ? `?${query}` : ""}${url.hash}`;
    window.history.replaceState(window.history.state, "", nextUrl);
    window.dispatchEvent(new Event("handover:view-change"));
  }, [mainView]);

  const [reportsSubView, setReportsSubView] = useState<
    "service-review" | "qbr"
  >("service-review");
  const reportsSubviewUrlHydratedRef = useRef(false);
  const reportsSubviewChangedFromUrlRef = useRef(false);

  useEffect(() => {
    const value = searchParams.get("reportsSubview");
    const fromUrl =
      value === "qbr"
        ? "qbr"
        : value === "service" || value === "service-review"
          ? "service-review"
          : null;
    if (fromUrl && fromUrl !== reportsSubView) {
      reportsSubviewChangedFromUrlRef.current = true;
      setReportsSubView(fromUrl);
    }
    reportsSubviewUrlHydratedRef.current = true;
  }, [reportsSubView, searchParams]);

  useEffect(() => {
    if (!reportsSubviewUrlHydratedRef.current) return;
    if (reportsSubviewChangedFromUrlRef.current) {
      reportsSubviewChangedFromUrlRef.current = false;
      return;
    }
    const url = new URL(window.location.href);
    const nextValue = reportsSubView === "qbr" ? "qbr" : "service";
    if (url.searchParams.get("reportsSubview") === nextValue) return;
    url.searchParams.set("reportsSubview", nextValue);
    const query = url.searchParams.toString();
    const nextUrl = `${url.pathname}${query ? `?${query}` : ""}${url.hash}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [reportsSubView]);
  const [qbrIntelligenceContext, setQbrIntelligenceContext] = useState<{
    clientName: string;
    accountNarrative: string;
    keyAchievements: string[];
    openRisks: string[];
    qbrTalkingPoints: string[];
    relationshipHealth: string;
  } | null>(null);
  const [deliveryHealthPresetClient, setDeliveryHealthPresetClient] = useState("");
  const [deliveryHealthPresetReason, setDeliveryHealthPresetReason] = useState("");
  const [deliveryHealthPresetAffectedItems, setDeliveryHealthPresetAffectedItems] = useState<
    string[]
  >([]);
  const [clientIntelligencePresetClient, setClientIntelligencePresetClient] = useState<
    string | null
  >(null);
  const [clientIntelligencePresetTab, setClientIntelligencePresetTab] = useState<
    "history" | "summary" | null
  >(null);
  const [clientIntelligencePresetHighlight, setClientIntelligencePresetHighlight] =
    useState(false);
  const [projectsBootstrapped, setProjectsBootstrapped] = useState(false);
  const [integrationsInitialDetail, setIntegrationsInitialDetail] = useState<
    "halo" | "connectwise" | null
  >(null);
  const [scheduleReportPreviewOpen, setScheduleReportPreviewOpen] = useState(false);
  const [scheduleEmailPreviewLoading, setScheduleEmailPreviewLoading] = useState(false);
  const [scheduleEmailPreviewHtml, setScheduleEmailPreviewHtml] = useState<string | null>(null);
  const [scheduleEmailPreviewError, setScheduleEmailPreviewError] = useState<string | null>(null);
  const [scheduleEmailPreviewGeneratedAt, setScheduleEmailPreviewGeneratedAt] = useState<
    string | null
  >(null);
  const [schedulePreviewAgeTick, setSchedulePreviewAgeTick] = useState(0);
  const scheduleEmailPreviewCacheRef = useRef<{
    scheduleId: string;
    html: string;
    generatedAt: string;
    fetchedAt: number;
  } | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [digestSettings, setDigestSettings] = useState<{
    enabled: boolean;
    frequency: string;
    send_day: string;
    send_time: string;
    delivery_email: boolean;
    delivery_slack: boolean;
    delivery_teams: boolean;
    email_to: string;
  } | null>(null);
  const [digestLoading, setDigestLoading] = useState(false);
  const [digestSaving, setDigestSaving] = useState(false);
  const [digestSettingsExpanded, setDigestSettingsExpanded] = useState(false);
  const [scheduledCiOpen, setScheduledCiOpen] = useState(false);
  const [newCiScheduleType, setNewCiScheduleType] = useState<"service_review" | "qbr">("service_review");
  const [newCiFrequency, setNewCiFrequency] = useState<"weekly" | "fortnightly" | "monthly">("monthly");
  const [newCiScheduleClient, setNewCiScheduleClient] = useState("");
  const [newCiScheduleEmail, setNewCiScheduleEmail] = useState("");
  const [newCiScheduleDay, setNewCiScheduleDay] = useState("monday");
  const [newCiScheduleTime, setNewCiScheduleTime] = useState("08:00");
  const [newCiHoldForReview, setNewCiHoldForReview] = useState(false);
  const [editingCiScheduleId, setEditingCiScheduleId] = useState<string | null>(null);
  const [savingCiSchedule, setSavingCiSchedule] = useState(false);
  const [ciClients, setCiClients] = useState<{ name: string }[]>([]);
  const [sendingNowId, setSendingNowId] = useState<string | null>(null);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState<
    Array<{
      id: string;
      schedule_id: string | null;
      source: string;
      created_at: string;
      schedule_name: string | null;
      client_label: string | null;
      subject: string | null;
      text: string | null;
      html: string | null;
    }>
  >([]);
  const [pendingApprovalsLoading, setPendingApprovalsLoading] = useState(false);
  const [approvalActionId, setApprovalActionId] = useState<string | null>(null);
  const [rejectConfirmApprovalId, setRejectConfirmApprovalId] = useState<string | null>(null);
  const [expandedApprovalIds, setExpandedApprovalIds] = useState<Set<string>>(() => new Set());
  const [deleteConfirmScheduleId, setDeleteConfirmScheduleId] = useState<string | null>(null);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [schEnabled, setSchEnabled] = useState(false);
  const [schDay, setSchDay] = useState("monday");
  const [schTime, setSchTime] = useState("07:00");
  const [schEmail, setSchEmail] = useState("");
  const [schEmailCc, setSchEmailCc] = useState("");
  const [schEmailBcc, setSchEmailBcc] = useState("");
  const [schCcBccOpen, setSchCcBccOpen] = useState(false);
  const [schRecipientName, setSchRecipientName] = useState("");
  const [schDateRange, setSchDateRange] = useState("last_7_days");
  const [haloClientsForSchedule, setHaloClientsForSchedule] = useState<
    { id: number; name: string }[]
  >([]);
  const [haloClientsScheduleLoading, setHaloClientsScheduleLoading] = useState(false);
  const [scheduleRow, setScheduleRow] = useState<{
    id?: string;
    last_run_at: string | null;
    next_run_at: string | null;
  } | null>(null);
  const [campaigns, setCampaigns] = useState<
    Array<{
      id?: string;
      enabled: boolean;
      schedule_day: string;
      schedule_time: string;
      email_to: string | null;
      email_cc?: string | null;
      email_bcc?: string | null;
      date_range: string;
      client_ids: number[] | null;
      last_run_at: string | null;
      next_run_at: string | null;
      email_content_prefs?: unknown;
      attach_excel?: boolean | null;
      excel_tabs?: string[] | null;
      name?: string | null;
      report_type?: string | null;
      include_tickets?: boolean | null;
      include_projects?: boolean | null;
      is_note_to_self?: boolean | null;
      recipient_name?: string | null;
      ticket_client_ids?: number[] | null;
      project_client_ids?: number[] | null;
      ticket_all_clients?: boolean | null;
      project_all_clients?: boolean | null;
      selected_ticket_ids?: number[] | null;
      selected_project_ids?: number[] | null;
      brand_name?: string | null;
      email_tone?: string | null;
      push_to_halo?: boolean | null;
      hold_for_review?: boolean | null;
      halo_push_outputs?: string[] | null;
      halo_push_excel?: boolean | null;
      halo_push_excel_tabs?: string[] | null;
      halo_push_target?: "all" | "projects" | "tickets" | null;
      post_to_ticket_ids?: number[] | null;
      post_consolidated?: boolean | null;
      ci_qbr_client_name?: string | null;
    }>
  >([]);
  /** Master toggle UI — not derived from `campaigns.every(enabled)` so pausing one row cannot flip it. */
  const [scheduledReportsMasterEnabled, setScheduledReportsMasterEnabled] = useState(true);
  const schedulesMasterSyncedRef = useRef(false);
  const [schCampaignEditorTab, setSchCampaignEditorTab] = useState(0);
  const [scheduleEditorOpen, setScheduleEditorOpen] = useState(false);
  const [scheduleEditorIsNew, setScheduleEditorIsNew] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<
    (typeof campaigns)[number] | null
  >(null);
  const campaignEditorRef = useRef<HTMLDivElement>(null);
  const [schCampaignId, setSchCampaignId] = useState<string | null>(null);
  const [schName, setSchName] = useState<string>("Weekly Report");
  const [schBrandName, setSchBrandName] = useState<string>("");
  const [schEmailTone, setSchEmailTone] = useState<"formal" | "professional" | "friendly">(
    "professional",
  );
  const [schReportType, setSchReportType] = useState<
    "external" | "internal" | "note_to_self" | "qbr"
  >("external");
  const [schIncludeTickets, setSchIncludeTickets] = useState(true);
  const [schIncludeProjects, setSchIncludeProjects] = useState(true);
  const [ticketClientMode, setTicketClientMode] = useState<"all" | "selected">("all");
  const [projectClientMode, setProjectClientMode] = useState<"all" | "selected">("all");
  const [selectedTicketClients, setSelectedTicketClients] = useState<number[]>([]);
  const [selectedProjectClients, setSelectedProjectClients] = useState<number[]>([]);
  const [selectedTicketIds, setSelectedTicketIds] = useState<number[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<number[]>([]);
  const [ticketClientSearch, setTicketClientSearch] = useState("");
  const [projectClientSearch, setProjectClientSearch] = useState("");
  const [expandedTicketClients, setExpandedTicketClients] = useState<Set<number>>(new Set());
  const [expandedProjectClients, setExpandedProjectClients] = useState<Set<number>>(new Set());
  const [allClients, setAllClients] = useState<Array<{ id: number; name: string }>>([]);
  const [allTickets, setAllTickets] = useState<Array<Record<string, unknown>>>([]);
  const [allProjects, setAllProjects] = useState<Array<Record<string, unknown>>>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [demoDisabled, setDemoDisabled] = useState(false);
  const [demoForceEnabled, setDemoForceEnabled] = useState(false);
  const [schEmailPrefs, setSchEmailPrefs] = useState<NormalizedEmailContentPrefs>({
    ...DEFAULT_EMAIL_CONTENT_PREFS,
  });
  const [schAttachExcel, setSchAttachExcel] = useState(true);
  const [schPushToHalo, setSchPushToHalo] = useState(false);
  const [schHoldForReview, setSchHoldForReview] = useState(false);
  const [schHaloPushOutputs, setSchHaloPushOutputs] = useState<string[]>([
    "client_email",
    "actions",
    "risks",
  ]);
  const [schHaloPushExcel, setSchHaloPushExcel] = useState(false);
  const [schHaloPushExcelTabs, setSchHaloPushExcelTabs] = useState<string[]>([]);
  const [schPostToTicketIds, setSchPostToTicketIds] = useState<number[]>([]);
  const [schPostConsolidated, setSchPostConsolidated] = useState(false);
  const postTicketSelectionTouchedRef = useRef(false);
  const [schExcelOptional, setSchExcelOptional] = useState<string[]>([
    ...SCHEDULE_EXCEL_CORE_KEYS,
    ...SCHEDULE_EXCEL_OPTIONAL_TAB_KEYS,
  ]);
  const [scheduleClientCounts, setScheduleClientCounts] = useState<Record<string, number>>(
    {},
  );
  const [scheduleCountsLoading, setScheduleCountsLoading] = useState(false);
  const [portalSlug, setPortalSlug] = useState("");
  const [portalSlugChecking, setPortalSlugChecking] = useState(false);
  const [portalSlugAvailable, setPortalSlugAvailable] = useState<boolean | null>(null);
  const [portalSlugSaving, setPortalSlugSaving] = useState(false);
  const [portalSlugCopied, setPortalSlugCopied] = useState(false);
  const [sharePortalClientId, setSharePortalClientId] = useState<string | null>(null);
  const [sharePortalBusy, setSharePortalBusy] = useState(false);
  const [deliveryPortalClients, setDeliveryPortalClients] = useState<
    Array<{ clientName: string; slug: string; mspSlug: string }>
  >([]);
  const [brandLogoUploading, setBrandLogoUploading] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const brandPrimaryColorPickerRef = useRef<HTMLInputElement>(null);
  const brandSecondaryColorPickerRef = useRef<HTMLInputElement>(null);
  const isLogoUrlAccessible = useCallback(async (url: string): Promise<boolean> => {
    const trimmed = url.trim();
    if (!trimmed) return false;
    try {
      const res = await fetch(trimmed, { method: "HEAD" });
      if (res.ok) return true;
    } catch {
      /* fallback to GET */
    }
    try {
      const res = await fetch(trimmed, { method: "GET" });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  const toast = useToast();

  const flushAchievementToasts = useCallback(
    async (ids: string[]) => {
      const cleaned = [
        ...new Set(
          ids
            .filter((x) => typeof x === "string" && x.trim())
            .map((x) => x.trim()),
        ),
      ];
      if (cleaned.length === 0) return;
      let unlocked: { id: string; subtitle: string }[] = [];
      try {
        const res = await fetch("/api/profile/achievements/try", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ ids: cleaned }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          unlocked?: { id: string; subtitle: string }[];
        };
        if (Array.isArray(data.unlocked)) unlocked = data.unlocked;
      } catch {
        return;
      }
      if (unlocked.length === 0) return;
      await new Promise((r) => window.setTimeout(r, 1000));
      unlocked.forEach((u, i) => {
        window.setTimeout(() => {
          toast({
            variant: "achievement",
            message: "Achievement Unlocked 🏆",
            subtitle: u.subtitle,
            durationMs: 4000,
          });
        }, i * 350);
      });
    },
    [toast],
  );

  const [haloImportedCount, setHaloImportedCount] = useState<number>(0);
  const [featuredShot, setFeaturedShot] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setFeaturedShot((prev) => (prev + 1) % 6);
    }, 3500);
    return () => clearInterval(interval);
  }, []);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);
  const [haloTestLoading, setHaloTestLoading] = useState(false);
  const [haloAutoClosureSummaryBusy, setHaloAutoClosureSummaryBusy] = useState(false);
  const [haloTenant, setHaloTenant] = useState("");
  const [haloClientId, setHaloClientId] = useState("");
  const [haloClientSecret, setHaloClientSecret] = useState("");
  const [haloError, setHaloError] = useState<string | null>(null);
  const [haloPermissionWarning, setHaloPermissionWarning] = useState<string | null>(null);
  const [haloLoading, setHaloLoading] = useState(false);
  const slackConnected = Boolean(slackWebhookUrl.trim());
  const teamsConnected = Boolean(teamsWebhookUrl.trim());
  const [slackWebhookSaveLoading, setSlackWebhookSaveLoading] = useState(false);
  const [teamsWebhookSaveLoading, setTeamsWebhookSaveLoading] = useState(false);
  const [slackWebhookTestLoading, setSlackWebhookTestLoading] = useState(false);
  const [teamsWebhookTestLoading, setTeamsWebhookTestLoading] = useState(false);
  const [haloImportOpen, setHaloImportOpen] = useState(false);
  const [cwImportOpen, setCwImportOpen] = useState(false);
  const [haloHelpOpen, setHaloHelpOpen] = useState(false);
  const [haloConfigOpen, setHaloConfigOpen] = useState(false);
  const [haloLastSynced, setHaloLastSynced] = useState<Date | null>(null);
  const [cwLastSynced, setCwLastSynced] = useState<Date | null>(null);
  const { data: cachedHaloTickets, mutate: refreshHaloTicketsCache } = useHaloTickets(haloConnected);
  const { data: cachedCwTickets, mutate: refreshCwTicketsCache } = useCwTickets(cwConnected);
  const { data: cachedCwProjects, mutate: refreshCwProjectsCache } = useCwProjects(cwConnected);

  useEffect(() => {
    if (cachedHaloTickets) setHaloLastSynced(new Date());
  }, [cachedHaloTickets]);

  useEffect(() => {
    if (cachedCwTickets) setCwLastSynced(new Date());
  }, [cachedCwTickets]);
  const [cwImportedCount, setCwImportedCount] = useState<number>(0);
  const [cwSiteUrlInput, setCwSiteUrlInput] = useState("");
  const [cwCompanyIdInput, setCwCompanyIdInput] = useState("");
  const [cwPublicKeyInput, setCwPublicKeyInput] = useState("");
  const [cwPrivateKeyInput, setCwPrivateKeyInput] = useState("");
  const [cwClientIdInput, setCwClientIdInput] = useState("");
  const [cwConfigOpen, setCwConfigOpen] = useState(false);
  const [cwError, setCwError] = useState<string | null>(null);
  const [cwSaveLoading, setCwSaveLoading] = useState(false);
  const [cwTestLoading, setCwTestLoading] = useState(false);
  const [cwTestOk, setCwTestOk] = useState<boolean | null>(null);
  const [cwTestMessage, setCwTestMessage] = useState<string | null>(null);
  const psaConnections = useMemo(() => {
    const multiple = haloConnected && cwConnected;
    return {
      halopsa: haloConnected,
      connectwise: cwConnected,
      primary: haloConnected ? ("halopsa" as const) : cwConnected ? ("connectwise" as const) : null,
      multiple,
    };
  }, [cwConnected, haloConnected]);
  const psaStatus = useMemo(
    () => ({ loading: psaLoading, halo: haloConnected, connectwise: cwConnected }),
    [cwConnected, haloConnected, psaLoading],
  );
  const noPsaConnected = !psaStatus.loading && !psaStatus.halo && !psaStatus.connectwise;
  useEffect(() => {
    try {
      setDemoDisabled(window.localStorage.getItem("handover_demo_disabled") === "true");
      setDemoForceEnabled(window.localStorage.getItem("handover_demo_force_enabled") === "true");
    } catch {
      setDemoDisabled(false);
      setDemoForceEnabled(false);
    }
  }, []);
  const demoModeActive =
    Boolean(userEmail) &&
    !psaStatus.loading &&
    ((noPsaConnected && !demoDisabled) || demoForceEnabled);
  const psaConnected =
    !psaStatus.loading && (psaStatus.halo || psaStatus.connectwise);
  const demoToggleChecked = psaConnected
    ? demoForceEnabled
    : demoForceEnabled || (noPsaConnected && !demoDisabled);
  const showDemoDataBanner = demoModeActive && sessionUsesDemoData;
  const importPsaLabel =
    psaConnections.primary === "connectwise" && !psaConnections.multiple
      ? "ConnectWise"
      : psaConnections.primary === "halopsa" && !psaConnections.multiple
        ? "HaloPSA"
        : "PSA";
  const pushPsaLabel =
    psaConnections.primary === "connectwise" && !psaConnections.multiple
      ? "ConnectWise"
      : psaConnections.primary === "halopsa" && !psaConnections.multiple
        ? "HaloPSA"
        : "PSA";
  const [schPushDisplayPsa, setSchPushDisplayPsa] = useState<"halopsa" | "connectwise">(
    psaConnections.primary === "connectwise" ? "connectwise" : "halopsa",
  );
  const [pushTargetPsa, setPushTargetPsa] = useState<"halopsa" | "connectwise">(
    psaConnections.primary === "connectwise" ? "connectwise" : "halopsa",
  );
  const pushModalPsaLabel = pushTargetPsa === "connectwise" ? "ConnectWise" : "HaloPSA";
  const lastPushedPsaLabel =
    lastPushTargetPsa === "connectwise"
      ? "ConnectWise"
      : lastPushTargetPsa === "halopsa"
        ? "HaloPSA"
        : pushPsaLabel;
  useEffect(() => {
    if (lastImportSourcePsa) {
      setPushTargetPsa(lastImportSourcePsa);
      return;
    }
    if (!psaConnections.multiple) {
      setSchPushDisplayPsa(
        psaConnections.primary === "connectwise" ? "connectwise" : "halopsa",
      );
      setPushTargetPsa(
        psaConnections.primary === "connectwise" ? "connectwise" : "halopsa",
      );
    }
  }, [psaConnections.multiple, psaConnections.primary, lastImportSourcePsa]);

  const scheduleNpsAfterGeneration = useCallback((userId: string) => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem("handover-nps-shown") === "true") return;
    void (async () => {
      const sb = createClient();
      const { count, error } = await sb
        .from("generations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      if (error || count !== 3) return;
      await new Promise((r) => setTimeout(r, 2000));
      if (window.localStorage.getItem("handover-nps-shown") === "true") return;
      setNpsScore(null);
      setNpsComment("");
      setNpsPhase("score");
      setNpsOpen(true);
    })();
  }, []);

  const refreshTemplates = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setTemplates([]);
      return;
    }

    try {
      const res = await fetch("/api/templates");
      const data = (await res.json()) as { templates?: SavedTemplate[] };
      if (res.ok) {
        setTemplates(data.templates ?? []);
      }
    } catch (e) {
      console.error("Templates fetch error:", e);
    }
  }, []);

  const handleHaloAutoClosureSummaryChange = useCallback(
    async (enabled: boolean) => {
      if (haloAutoClosureSummaryBusy) return;
      const previous = haloAutoClosureSummary;
      setHaloAutoClosureSummary(enabled);
      setHaloAutoClosureSummaryBusy(true);
      try {
        const res = await fetch("/api/halo/connection", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ auto_closure_summary: enabled }),
        });
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setHaloAutoClosureSummary(previous);
          toast({
            message: body.error?.trim() || "Could not save closure summary preference",
            variant: "error",
            durationMs: 5000,
          });
          return;
        }
        toast({
          message: "Closure summary preference saved",
          variant: "success",
          durationMs: 2800,
        });
        await refreshShellData();
      } catch {
        setHaloAutoClosureSummary(previous);
        toast({
          message: "Could not save closure summary preference",
          variant: "error",
          durationMs: 5000,
        });
      } finally {
        setHaloAutoClosureSummaryBusy(false);
      }
    },
    [haloAutoClosureSummaryBusy, haloAutoClosureSummary, refreshShellData, toast],
  );

  const fetchProjects = useCallback(
    async (offset = 0, append = false) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setProjects([]);
        setProjectsOffset(0);
        setHasMoreProjects(false);
        setProjectsBootstrapped(true);
        return;
      }

      const isPro = hasProAccess;
      const accountCreated = new Date(user.created_at ?? Date.now());
      const daysSinceCreation =
        (Date.now() - accountCreated.getTime()) / (1000 * 60 * 60 * 24);
      const pageSize = isPro ? 50 : daysSinceCreation < 14 ? 100 : 10;

      const { data, error } = await supabase
        .from("generations")
        .select(
          "id, project_name, title, collection_id, input_text, output_json, created_at, source, scheduled_report_id, report_type",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.error("Projects fetch error:", error);
        return;
      }

      const rows = (data ?? []) as ProjectItem[];
      setProjects((prev) => (append ? [...prev, ...rows] : rows));
      setProjectsOffset(offset + rows.length);
      setHasMoreProjects(isPro && rows.length === pageSize);
      setProjectsBootstrapped(true);
    },
    [hasProAccess],
  );

  const sidebarExpanded = sidebarPinned || sidebarHovered;
  const sidebarMainOffset = sidebarExpanded
    ? "var(--app-sidebar-expanded-width)"
    : "var(--app-sidebar-compact-width)";

  const refreshHistory = useCallback(async () => {
    await fetchProjects(0, false);
  }, [fetchProjects]);

  const markProfileLoopCompleted = useCallback(async () => {
    try {
      const res = await fetch("/api/profile/complete-loop", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) return;
      setHasCompletedLoop(true);
      void refreshShellData();
      if (userEmail && !hasProAccess && !readUpgradePromptConsumed()) {
        setShowPostGenProUpsell(true);
      }
    } catch {
      /* ignore */
    }
  }, [userEmail, hasProAccess, refreshShellData]);

  const refreshCollections = useCallback(async () => {
    try {
      const res = await fetch("/api/collections", { credentials: "same-origin" });
      const data = (await res.json()) as { collections?: CollectionApiRow[] };
      if (res.ok && Array.isArray(data.collections)) {
        setCollections(data.collections);
      }
    } catch (e) {
      console.error("Collections fetch error:", e);
    }
  }, []);

  const clientEmailSections = useMemo(
    () =>
      result
        ? parseClientEmails(result.client_email ?? "")
        : [{ client: null, content: "" }],
    [result, result?.client_email],
  );

  useEffect(() => {
    setActiveClientEmailIndex(0);
  }, [result?.client_email]);

  const statusReportSections = useMemo(() => {
    if (!result?.status_report?.trim()) return [];
    const blocks = splitStatusReportDisplayBlocks(coerceStringOutput(result.status_report));
    return blocks.length > 1 ? blocks : [];
  }, [result?.status_report]);

  useEffect(() => {
    setActiveStatusReportIndex(-1);
  }, [result?.status_report]);

  const activeClientEmailBody = useMemo(() => {
    if (!result) return "";
    const max = Math.max(0, clientEmailSections.length - 1);
    const idx = Math.min(activeClientEmailIndex, max);
    const s = clientEmailSections[idx];
    const raw = (s?.content ?? result.client_email ?? "").trim();
    if (clientEmailSections.length === 1) {
      return stripLeadingClientEmailHeader(raw);
    }
    return raw;
  }, [result, clientEmailSections, activeClientEmailIndex]);

  const followUpClientOptions = useMemo(() => {
    if (!result?.actions?.length) return [] as string[];
    const names = new Set<string>();
    for (const a of result.actions) {
      const c = (a.client_name ?? "").trim();
      if (c) names.add(c);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [result?.actions]);

  const freeGenUsage = useMemo(() => {
    if (!userEmail || hasProAccess) return null;
    return { used: monthCount ?? 0, cap: 10 as const, inTrial: false };
  }, [userEmail, hasProAccess, monthCount]);

  const hasPortalPlanAccess = useMemo(
    () =>
      getPlanTierFromFields(
        planFieldsFromProfileRow({
          plan: profileDbPlan,
          team_id: userTeamId,
          trial_ends_at: trialEndsAt,
          trial_plan: profileTrialPlan,
          subscription_status: profileSubscriptionStatus,
        }),
      ) >= 2,
    [
      profileDbPlan,
      userTeamId,
      trialEndsAt,
      profileTrialPlan,
      profileSubscriptionStatus,
    ],
  );

  const normalizedProfilePlan = useMemo(
    () => normalizePlanLabel(profileDbPlan ?? ""),
    [profileDbPlan],
  );
  const isEnterprisePlanUser = useMemo(
    () => normalizedProfilePlan === "enterprise",
    [normalizedProfilePlan],
  );

  useEffect(() => {
    let cancelled = false;
    if (!userEmail || !hasPortalPlanAccess || !portalSlug.trim()) {
      setDeliveryPortalClients([]);
      return;
    }
    void (async () => {
      const res = await fetch("/api/portal/clients", { credentials: "same-origin", cache: "no-store" });
      if (!res.ok || cancelled) return;
      const j = (await res.json().catch(() => ({}))) as {
        clients?: Array<{ client_name?: string | null; slug?: string | null }>;
      };
      const clients = (j.clients ?? [])
        .map((c) => ({
          clientName: typeof c.client_name === "string" ? c.client_name : "",
          slug: typeof c.slug === "string" ? c.slug : "",
          mspSlug: portalSlug,
        }))
        .filter((c) => c.clientName && c.slug && c.mspSlug);
      if (!cancelled) setDeliveryPortalClients(clients);
    })();
    return () => {
      cancelled = true;
    };
  }, [userEmail, hasPortalPlanAccess, portalSlug]);

  useEffect(() => {
    let cancelled = false;
    if (!result || !userEmail || !hasPortalPlanAccess || !portalSlug.trim()) {
      setSharePortalClientId(null);
      return;
    }
    void (async () => {
      const res = await fetch("/api/portal/clients", { credentials: "same-origin", cache: "no-store" });
      if (!res.ok || cancelled) return;
      const j = (await res.json().catch(() => ({}))) as {
        clients?: Array<{ id: string; client_name: string }>;
      };
      const clients = j.clients ?? [];
      const actionName =
        (result.actions?.[0] as { client_name?: string } | undefined)?.client_name?.trim().toLowerCase() ?? "";
      const proj = projectName.trim().toLowerCase();
      const match = clients.find((c) => {
        const n = (c.client_name ?? "").trim().toLowerCase();
        return n && (n === actionName || n === proj);
      });
      if (!cancelled) setSharePortalClientId(match?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [result, projectName, userEmail, hasPortalPlanAccess, portalSlug]);

  const isProfessionalPlanUser = useMemo(
    () =>
      normalizedProfilePlan === "professional" ||
      normalizedProfilePlan === "professional_trial" ||
      profileDbPlan === "professional_trial",
    [normalizedProfilePlan, profileDbPlan],
  );
  const proMonthlyUsage = useMemo(() => {
    if (!isProfessionalPlanUser) return null;
    return Math.max(0, monthCount ?? 0);
  }, [isProfessionalPlanUser, monthCount]);
  const showPro75Warning = Boolean(
    isProfessionalPlanUser &&
      proMonthlyUsage != null &&
      proMonthlyUsage >= 150 &&
      proMonthlyUsage < 180 &&
      !pro75Dismissed,
  );
  const showPro90Warning = Boolean(
    isProfessionalPlanUser && proMonthlyUsage != null && proMonthlyUsage >= 180 && proMonthlyUsage < 200,
  );
  const showPro100Warning = Boolean(
    isProfessionalPlanUser && proMonthlyUsage != null && proMonthlyUsage >= 200,
  );

  useEffect(() => {
    if (!isProfessionalPlanUser || !authUserId) {
      setPro75Dismissed(false);
      return;
    }
    const monthKey = new Date().toISOString().slice(0, 7);
    const key = `${SS_PRO_75_DISMISSED}:${authUserId}:${monthKey}`;
    try {
      setPro75Dismissed(window.sessionStorage.getItem(key) === "1");
    } catch {
      setPro75Dismissed(false);
    }
  }, [isProfessionalPlanUser, authUserId, monthCount]);

  const dismissPro75Warning = useCallback(() => {
    if (!authUserId) {
      setPro75Dismissed(true);
      return;
    }
    const monthKey = new Date().toISOString().slice(0, 7);
    const key = `${SS_PRO_75_DISMISSED}:${authUserId}:${monthKey}`;
    try {
      window.sessionStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    setPro75Dismissed(true);
  }, [authUserId]);

  useEffect(() => {
    if (!isProfessionalPlanUser || !userCreatedAt || (proMonthlyUsage ?? 0) <= 150) {
      setShowProTeamRecommendation(false);
      return;
    }
    const ageDays = (Date.now() - new Date(userCreatedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays <= 14) {
      setShowProTeamRecommendation(false);
      return;
    }
    const key = authUserId ? `${LS_PRO_TEAM_RECO_SEEN}:${authUserId}` : LS_PRO_TEAM_RECO_SEEN;
    try {
      const seen = window.localStorage.getItem(key) === "1";
      if (seen) {
        setShowProTeamRecommendation(false);
        return;
      }
      setShowProTeamRecommendation(true);
      window.localStorage.setItem(key, "1");
    } catch {
      setShowProTeamRecommendation(true);
    }
  }, [isProfessionalPlanUser, userCreatedAt, proMonthlyUsage, authUserId]);

  useEffect(() => {
    sevenGenToastFiredRef.current = false;
  }, [authUserId]);

  useEffect(() => {
    if (!demoModeActive) return;
    if (!input.trim()) return;
    try {
      window.sessionStorage.setItem(SS_DEMO_INPUT, input);
    } catch {
      /* ignore */
    }
  }, [demoModeActive, input]);

  useEffect(() => {
    if (psaStatus.loading) return;
    if (!psaStatus.halo && !psaStatus.connectwise) return;
    setSessionUsesDemoData(false);
    try {
      window.sessionStorage.removeItem(SS_DEMO_INPUT);
    } catch {
      /* ignore */
    }
  }, [psaStatus.loading, psaStatus.halo, psaStatus.connectwise]);

  useEffect(() => {
    if (!demoModeActive) {
      setAllClients([]);
      setAllTickets([]);
      setAllProjects([]);
      setDataLoaded(false);
      setDataLoading(false);
    }
  }, [demoModeActive]);

  useEffect(() => {
    if (!userEmail || hasProAccess || !freeGenUsage || !authUserId) return;
    if (freeGenUsage.used < 7) return;
    if (sevenGenToastFiredRef.current) return;
    const key = `handover_7gen_nudge_${authUserId}`;
    try {
      if (window.localStorage.getItem(key)) return;
    } catch {
      return;
    }
    sevenGenToastFiredRef.current = true;
    toast({
      message:
        "You’re using your included monthly generations quickly. Move to Handover for the complete workspace and automation.",
      durationMs: 12000,
    });
    try {
      window.localStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
  }, [userEmail, hasProAccess, freeGenUsage, authUserId, toast]);

  const tryOpenProFeatureGate = useCallback((feature: string) => {
    if (readUpgradePromptConsumed()) return;
    setProFeatureGate(feature);
  }, []);

  useEffect(() => {
    if (!userEmail) return;
    if (hasProAccess) return;
    if (mainView === "delivery" || mainView === "organisation") {
      setMainView("generate");
    }
  }, [userEmail, hasProAccess, mainView]);

  useEffect(() => {
    if (!userEmail) return;
    if (mainView !== "organisation") return;
    if (!hasProAccess || (!hasPortalPlanAccess && !demoModeActive)) {
      if (hasProAccess) {
        router.push("/attention");
      } else {
        setMainView("generate");
      }
      setSidebarOpenMobile(false);
      setSettingsOpen(false);
    }
  }, [
    userEmail,
    hasProAccess,
    hasPortalPlanAccess,
    demoModeActive,
    mainView,
    router,
  ]);

  const dashStats = useMemo(() => {
    if (!userEmail) return null;
    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
    ).getTime();
    const thisMonthFromProjects = projects.filter(
      (p) => new Date(p.created_at).getTime() >= monthStart,
    ).length;
    const thisMonth =
      monthCount !== null ? monthCount : thisMonthFromProjects;
    const totalLifetime =
      totalGenerationCount !== null ? totalGenerationCount : projects.length;
    const hasAnyActivity =
      projects.length >= 1 ||
      (totalGenerationCount !== null && totalGenerationCount > 0) ||
      (monthCount !== null && monthCount > 0);
    if (!hasAnyActivity) return null;
    const sorted = [...projects].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    const last = sorted[0];
    const rawTitle = last
      ? last.project_name?.trim() ||
        (last.input_text || "").trim().slice(0, 48) ||
        "Untitled"
      : "-";
    const PROMPT_PREFIXES = ["QBR:", "One concise", "Write a", "Generate", "You are", "CONTEXT:", "MSP"];
    const isPromptLeak =
      rawTitle !== "-" &&
      PROMPT_PREFIXES.some((prefix) => rawTitle.startsWith(prefix));
    const lastTitle = isPromptLeak
      ? "Report"
      : rawTitle.length > 40
        ? `${rawTitle.slice(0, 40)}…`
        : rawTitle;
    return {
      total: totalLifetime,
      thisMonth,
      monthName: now.toLocaleString("en-GB", { month: "long" }),
      lastAgo: last ? relativeTimeLabel(last.created_at) : "-",
      lastTitle,
    };
  }, [userEmail, projects, monthCount, totalGenerationCount]);

  const [overviewHealthRows, setOverviewHealthRows] = useState<DeliveryHealthRow[]>([]);
  const [overviewHealthLoading, setOverviewHealthLoading] = useState(false);
  const signOutInFlightRef = useRef(false);
  const handleSignOut = useCallback(async () => {
    if (signOutInFlightRef.current) return;
    signOutInFlightRef.current = true;
    await createClient().auth.signOut();
    setProjects([]);
    setOverviewHealthRows([]);
    setProjectsOffset(0);
    setHasMoreProjects(false);
    setResult(null);
    setInput("");
    setProjectName("");
    setSelectedProjectId(null);
    try {
      window.localStorage.removeItem("handover-pending-profile");
    } catch {
      /* ignore */
    }
    window.location.href = "/";
  }, []);

  useEffect(() => registerOnSignOut(handleSignOut), [handleSignOut, registerOnSignOut]);

  const overviewAttentionItems = useMemo(() => {
    if (!overviewHealthRows.length) return [];

    const clientMap = new Map<
      string,
      {
        clientName: string;
        worstRag: "red" | "amber" | "green" | "grey";
        openCount: number;
        overdueCount: number;
        buckets: Partial<
          Record<OverviewAttentionReasonCategory, { matches: OverviewAttentionRowMatch[] }>
        >;
      }
    >();

    const ragOrder: Record<"red" | "amber" | "green" | "grey", number> = {
      red: 3,
      amber: 2,
      green: 1,
      grey: 0,
    };

    for (const row of overviewHealthRows) {
      const name = row.clientName?.trim() || "";
      if (!name) continue;

      const existing = clientMap.get(name);
      const rag = row.rag || "grey";

      const currentWorst = existing?.worstRag || "grey";
      const newWorst = ragOrder[rag] > ragOrder[currentWorst] ? rag : currentWorst;

      const classified = classifyOverviewAttentionRow(row);
      const buckets = { ...(existing?.buckets ?? {}) };
      if (classified) {
        const bucket = buckets[classified.category] ?? { matches: [] };
        bucket.matches.push(classified.match);
        buckets[classified.category] = bucket;
      }

      clientMap.set(name, {
        clientName: name,
        worstRag: newWorst,
        openCount: (existing?.openCount || 0) + 1,
        overdueCount:
          (existing?.overdueCount || 0) +
          (row.daysToTarget !== null && row.daysToTarget < 0 ? 1 : 0),
        buckets,
      });
    }

    const sortOrder: Record<"red" | "amber" | "green" | "grey", number> = {
      red: 2,
      amber: 1,
      green: 0,
      grey: 0,
    };

    return Array.from(clientMap.values())
      .filter(
        (c) =>
          (c.worstRag === "red" || c.worstRag === "amber") &&
          c.clientName !== "Unknown" &&
          c.clientName.length > 0,
      )
      .map((entry) => {
        let winningCategory: OverviewAttentionReasonCategory | null = null;
        let bestSeverity = Number.POSITIVE_INFINITY;
        for (const category of Object.keys(entry.buckets) as OverviewAttentionReasonCategory[]) {
          const severity = OVERVIEW_ATTENTION_REASON_SEVERITY[category];
          if (severity < bestSeverity) {
            bestSeverity = severity;
            winningCategory = category;
          }
        }

        const winningMatches =
          winningCategory != null ? (entry.buckets[winningCategory]?.matches ?? []) : [];
        const reason =
          winningCategory != null
            ? buildOverviewAttentionReason(winningCategory, winningMatches)
            : "";

        return {
          clientName: entry.clientName,
          worstRag: entry.worstRag,
          openCount: entry.openCount,
          overdueCount: entry.overdueCount,
          reason,
          affectedItemNames: winningMatches.map((m) => m.name),
        };
      })
      .sort((a, b) => sortOrder[b.worstRag] - sortOrder[a.worstRag])
      .slice(0, 6);
  }, [overviewHealthRows]);

  useEffect(() => {
    if (mainView !== "overview") return;
    if (!haloConnected && !cwConnected) return;
    if (!userEmail) return;
    if (!hasProAccess) return;
    if (overviewHealthRows.length > 0) return;

    setOverviewHealthLoading(true);
    fetch("/api/delivery-health", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { rows?: DeliveryHealthRow[] } | null) => {
        if (data?.rows) setOverviewHealthRows(data.rows);
      })
      .catch(() => {})
      .finally(() => setOverviewHealthLoading(false));
  }, [mainView, haloConnected, cwConnected, userEmail, hasProAccess, overviewHealthRows.length]);

  useEffect(() => {
    if (!userEmail || campaigns.length > 0) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/scheduled-reports");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { schedules?: typeof campaigns };
        const schedules = Array.isArray(data.schedules) ? data.schedules : [];
        if (!cancelled) setCampaigns(schedules);
      } catch {
        /* overview preload — ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userEmail, campaigns.length]);

  useEffect(() => {
    try {
      if (typeof window === "undefined") {
        setFirstGenTipDismissed(false);
        return;
      }
      setFirstGenTipDismissed(
        window.localStorage.getItem(LS_FIRST_GEN_TIP_DISMISSED) === "true",
      );
    } catch {
      setFirstGenTipDismissed(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted || !userEmail) {
      setDashGreeting(null);
      return;
    }
    const h = new Date().getHours();
    const g = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    setDashGreeting(userFirstName ? `${g}, ${userFirstName}.` : `${g}.`);
  }, [mounted, userEmail, userFirstName]);

  useEffect(() => {
    if (!authChecked || !userEmail || !profileDbPlan || hasProAccess) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/onboarding/scan/status?claimed=1", {
          credentials: "include",
          cache: "no-store",
        });
        if (!cancelled && response.ok) {
          const data = (await response.json()) as { status?: string };
          if (data.status === "claimed") {
            router.replace("/onboarding/results");
            return;
          }
        }
      } catch {
        // Fall through to the new-scan destination.
      }
      if (!cancelled) router.replace("/onboarding/connect");
    })();
    return () => {
      cancelled = true;
    };
  }, [authChecked, userEmail, profileDbPlan, hasProAccess, router]);

  useEffect(() => {
    const onReload = () => {
      void refreshShellData();
    };
    window.addEventListener("handover:profile-reload", onReload);
    return () => window.removeEventListener("handover:profile-reload", onReload);
  }, [refreshShellData]);

  useEffect(() => {
    if (!isGenerating) {
      setGenerationLongWait(false);
      return;
    }
    const t = window.setTimeout(() => setGenerationLongWait(true), 5000);
    return () => clearTimeout(t);
  }, [isGenerating]);

  useEffect(() => {
    return () => {
      if (genProgressRef.current) clearInterval(genProgressRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isGenerating) {
      setGenProgressMsgIx(0);
      return;
    }
    setGenProgressMsgIx(0);
    const id = window.setInterval(() => {
      setGenProgressMsgIx((i) => (i + 1) % GEN_PROGRESS_MESSAGES.length);
    }, 2000);
    return () => window.clearInterval(id);
  }, [isGenerating]);

  useEffect(() => {
    try {
      setOnboardingPageVisited(sessionStorage.getItem(ONBOARDING_PAGE_SEEN_KEY) === "1");
    } catch {
      setOnboardingPageVisited(false);
    }
  }, []);

  useEffect(() => {
    if (!userEmail || !onboardingProfileLoaded || !onboardingRequiredExplicit) return;
    if (plan === "enterprise") return;
    if (onboardingPageVisited) return;
    router.replace("/onboarding");
  }, [
    userEmail,
    onboardingProfileLoaded,
    onboardingRequiredExplicit,
    plan,
    onboardingPageVisited,
    router,
  ]);

  useEffect(() => {
    if (!userEmail) {
      setOnboardingOverlayOpen(false);
      return;
    }
    if (!onboardingProfileLoaded) {
      setOnboardingOverlayOpen(false);
      return;
    }
    if (!onboardingRequiredExplicit) {
      setOnboardingOverlayOpen(false);
      return;
    }
    if ((totalGenerationCount ?? 0) > 0) {
      setOnboardingOverlayOpen(false);
      return;
    }
    if (onboardingPageVisited) {
      setOnboardingOverlayOpen(false);
      return;
    }
    setOnboardingOverlayOpen(true);
  }, [
    userEmail,
    onboardingProfileLoaded,
    onboardingRequiredExplicit,
    totalGenerationCount,
    onboardingPageVisited,
  ]);

  useEffect(() => {
    if (plan !== "enterprise") {
      setPortalSlugChecking(false);
      setPortalSlugAvailable(null);
      return;
    }
    const normalized = sanitizePortalSlug(portalSlug);
    if (!PORTAL_SLUG_RE.test(normalized)) {
      setPortalSlugChecking(false);
      setPortalSlugAvailable(null);
      return;
    }
    const timer = window.setTimeout(() => {
      void (async () => {
        setPortalSlugChecking(true);
        try {
          const res = await fetch(
            `/api/portal/check-slug?slug=${encodeURIComponent(normalized)}`,
            { credentials: "same-origin" },
          );
          const body = (await res.json()) as { available?: boolean };
          setPortalSlugAvailable(res.ok ? body.available === true : false);
        } catch {
          setPortalSlugAvailable(false);
        } finally {
          setPortalSlugChecking(false);
        }
      })();
    }, 500);
    return () => window.clearTimeout(timer);
  }, [plan, portalSlug]);

  useEffect(() => {
    if (!userEmail) return;
    const pendingRaw = window.localStorage.getItem("handover-pending-profile");
    if (!pendingRaw) return;

    void (async () => {
      let pending: unknown;
      try {
        pending = JSON.parse(pendingRaw);
      } catch {
        window.localStorage.removeItem("handover-pending-profile");
        return;
      }

      if (!pending || typeof pending !== "object") return;

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const p = pending as Partial<{
        firstName: string | null;
        lastName: string | null;
        jobTitle: string | null;
        companyName: string | null;
      }>;

      const first_name = typeof p.firstName === "string" ? p.firstName.trim() : null;
      const last_name = typeof p.lastName === "string" ? p.lastName.trim() : null;
      const job_title = typeof p.jobTitle === "string" ? p.jobTitle.trim() : null;
      const company_name = typeof p.companyName === "string" ? p.companyName.trim() : null;

      const { error } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            first_name,
            last_name,
            job_title,
            company_name,
          },
          { onConflict: "id" },
        );

      if (error) {
        console.error("[profile pending] upsert failed:", error);
        return;
      }

      window.localStorage.removeItem("handover-pending-profile");
      toast({ message: "Profile saved. Welcome to Handover!", durationMs: 4000 });
      await refreshShellData();
    })();
  }, [refreshShellData, toast, userEmail]);

  useEffect(() => {
    if (!npsOpen || npsPhase !== "thanks") return;
    window.localStorage.setItem("handover-nps-shown", "true");
    const t = window.setTimeout(() => {
      setNpsOpen(false);
      setNpsPhase("score");
      setNpsScore(null);
      setNpsComment("");
    }, 2000);
    return () => window.clearTimeout(t);
  }, [npsOpen, npsPhase]);

  useEffect(() => {
    if (npsOpen) return;
    if (npsAdvanceTimerRef.current) {
      clearTimeout(npsAdvanceTimerRef.current);
      npsAdvanceTimerRef.current = null;
    }
  }, [npsOpen]);

  useEffect(() => {
    if (!exportMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const el = exportMenuRef.current;
      if (el && !el.contains(e.target as Node)) {
        setExportMenuOpen(false);
        setExportSubPanel(null);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [exportMenuOpen]);

  useEffect(() => {
    if (!generationToastOpen) return;
    const t = window.setTimeout(() => setGenerationToastOpen(false), 3000);
    return () => window.clearTimeout(t);
  }, [generationToastOpen]);

  useEffect(() => {
    if (exportSubPanel === "actions") {
      setExportActionCols(loadExportActionsColumns());
    } else if (exportSubPanel === "risks") {
      setExportRiskCols(loadExportRisksColumns());
    } else if (exportSubPanel === "fullreport") {
      const p = loadFullReportExportPrefs();
      setExportFullTabs(p.tabs);
      setExportFullActionCols(p.actionColumns);
      setExportFullRiskCols(p.riskColumns);
    }
  }, [exportSubPanel]);

  useEffect(() => {
    if (onboardingRedirectPending) return;
    const params = new URLSearchParams(window.location.search);
    const demoInputParam = params.get("demoInput");
    const reportTypeParam = params.get("reportType");

    if (demoInputParam) {
      try {
        const decoded = decodeURIComponent(demoInputParam);
        if (decoded.trim()) {
          const reportTypeLabel = reportTypeParam?.trim() ?? "";
          const inputWithReportType = reportTypeLabel
            ? `Report type: ${reportTypeLabel}\n\n${decoded}`
            : decoded;
          setInput(inputWithReportType);
          setMainView("generate");
          setSessionUsesDemoData(true);
          window.sessionStorage.setItem(SS_DEMO_INPUT, inputWithReportType);
        }
      } catch {
        /* ignore */
      }
      if (reportTypeParam?.trim()) {
        try {
          window.sessionStorage.setItem(
            "handover_onboarding_report_type",
            reportTypeParam.trim(),
          );
        } catch {
          /* ignore */
        }
      }
      if (params.get("onboarding") === "complete") {
        void refreshShellData();
        const clientParam = params.get("client")?.trim() ?? "";
        if (clientParam === "Northwood Manufacturing") {
          setStagedGenerationReady(true);
          if (params.get("startTour") === "1") {
            setShouldAutoStartTour(true);
          }
        }
      }
      router.replace(homePathPreservingViewParam(), { scroll: false });
      return undefined;
    }

    const openSettingsValue = params.get("openSettings");
    if (openSettingsValue) {
      setSettingsOpen(true);
      const settingsTabParam = params.get("tab");
      if (
        settingsTabParam === "profile" ||
        settingsTabParam === "billing" ||
        settingsTabParam === "preferences" ||
        settingsTabParam === "appearance" ||
        settingsTabParam === "privacy" ||
        settingsTabParam === "referrals"
      ) {
        setSettingsTab(settingsTabParam);
      } else if (openSettingsValue === "referrals") {
        setSettingsTab("referrals");
      }
      if (openSettingsValue === "integrations") {
        openIntegrationsInConfiguration(
          params.get("cw") === "1" ? { initialDetail: "connectwise" } : undefined,
        );
      }
      router.replace(homePathPreservingViewParam(), { scroll: false });
      return undefined;
    }
    if (params.get("openHaloImport") === "1") {
      void (async () => {
        if (hasProAccess) setHaloImportOpen(true);
        else if (userEmail) setHaloProModalOpen(true);
        router.replace(homePathPreservingViewParam(), { scroll: false });
      })();
      return undefined;
    }
    if (params.get("success") === "true") {
      setShowSuccessBanner(true);
      router.replace(homePathPreservingViewParam(), { scroll: false });
      void refreshShellData();
      const t = window.setTimeout(() => void refreshShellData(), 2500);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [hasProAccess, refreshShellData, router, userEmail, onboardingRedirectPending]);

  useEffect(() => {
    if (!userEmail) return;
    let cancelled = false;
    void (async () => {
      try {
        const ref = window.localStorage.getItem("handover_ref");
        if (!ref?.trim()) return;
        const res = await fetch("/api/referrals/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ code: ref.trim() }),
        });
        const json = (await res.json()) as { ok?: boolean; already?: boolean };
        if (cancelled) return;
        if (res.ok && (json.ok === true || json.already === true)) {
          window.localStorage.removeItem("handover_ref");
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userEmail]);

  const copyWithFeedback = useCallback(
    async (key: string, text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        setCopiedKey(key);
        copyTimeoutRef.current = setTimeout(() => setCopiedKey(null), 2000);
        toast({
          message: "Copied to clipboard",
          durationMs: 1500,
        });
      } catch (e) {
        console.error("Clipboard error:", e);
      }
    },
    [toast],
  );

  const pushModalImportRows = useMemo(() => {
    const haloRows = Array.isArray(cachedHaloTickets?.tickets)
      ? (cachedHaloTickets.tickets as Array<Record<string, unknown>>)
      : [];

    if (lastImportSourcePsa === "connectwise") {
      if (lastImportedHaloItems.length > 0) return lastImportedHaloItems;
      return parseCwImportedItemsFromInput(input);
    }

    if (lastImportSourcePsa === "halopsa") {
      if (lastImportedHaloItems.length > 0) return lastImportedHaloItems;
      return restoreImportedItemsForHistory(input, haloRows);
    }

    if (lastImportedHaloItems.length > 0) return lastImportedHaloItems;
    const fromCw = parseCwImportedItemsFromInput(input);
    if (fromCw.length > 0) return fromCw;
    const restored = restoreImportedItemsForHistory(input, haloRows);
    if (restored.length > 0) return restored;
    const clientGuess = (result?.actions?.[0]?.client_name ?? "").trim();
    if (clientGuess && haloRows.length > 0) {
      const fallback = haloImportedItemsForClientName(clientGuess, haloRows);
      if (fallback.length > 0) return fallback;
    }
    return [];
  }, [
    lastImportedHaloItems,
    lastImportSourcePsa,
    input,
    cachedHaloTickets?.tickets,
    result?.actions,
  ]);

  const clientEmailTabDisplay = useMemo(() => {
    const haloRows = Array.isArray(cachedHaloTickets?.tickets)
      ? (cachedHaloTickets.tickets as Array<Record<string, unknown>>)
      : [];
    return resolveClientEmailTabDisplay(lastImportedHaloItems, input, haloRows);
  }, [lastImportedHaloItems, input, cachedHaloTickets?.tickets]);

  const showPushPsaPicker =
    !lastImportSourcePsa && psaConnections.multiple;
  const pushModalHeaderLabel = lastImportSourcePsa
    ? lastImportSourcePsa === "connectwise"
      ? "ConnectWise"
      : "HaloPSA"
    : pushModalPsaLabel;

  const openPushModal = useCallback(
    (
      presetOutputs?: ("client_email" | "actions" | "risks" | "summary" | "status_report")[],
      targetPsa?: "halopsa" | "connectwise",
    ) => {
      if (!result) return;
      if (!hasProAccess) {
        tryOpenProFeatureGate(`Push to ${pushPsaLabel}`);
        return;
      }
      const rows = pushModalImportRows;
      if (rows.length === 0) {
        toast({
          variant: "error",
          message: `Import ${pushPsaLabel} tickets first`,
          subtitle: `Push-back needs imported ${pushPsaLabel} tickets for this generation.`,
        });
        return;
      }
      if (lastImportSourcePsa) {
        setPushTargetPsa(lastImportSourcePsa);
      } else if (targetPsa) {
        setPushTargetPsa(targetPsa);
      } else if (psaConnections.multiple) {
        const fromCw = parseCwImportedItemsFromInput(input);
        setPushTargetPsa(fromCw.length > 0 ? "connectwise" : "halopsa");
      }
      const ids = rows.map((t) => t.id);
      setPushSelectedTicketIds(ids);
      const defaultPushOutputs: ("actions" | "risks" | "summary" | "status_report")[] = [
        "summary",
        "actions",
        "risks",
      ];
      const initialPushOutputs =
        presetOutputs && presetOutputs.length > 0 ? presetOutputs : defaultPushOutputs;
      setPushSelectedOutputs(
        initialPushOutputs.filter(
          (k): k is "actions" | "risks" | "summary" | "status_report" => k !== "client_email",
        ),
      );
      setPushSummaryScope("combined_all");
      setPushStatusScope("combined_all");
      setPushErrors([]);
      setPushModalMobileStep(0);
      setPushModalOpen(true);
    },
    [
      pushModalImportRows,
      result,
      toast,
      hasProAccess,
      tryOpenProFeatureGate,
      pushPsaLabel,
      lastImportSourcePsa,
      psaConnections.multiple,
      input,
    ],
  );

  const onShareReportToPortal = useCallback(async () => {
    if (!result || !sharePortalClientId) return;
    setSharePortalBusy(true);
    try {
      const res = await fetch(`/api/portal/clients/${encodeURIComponent(sharePortalClientId)}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          title: projectName.trim() || "Handover report",
          content: result,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast({
          variant: "error",
          message: j.error ?? "Could not share to portal.",
          durationMs: 5000,
        });
        return;
      }
      toast({ message: "Shared to client portal", variant: "success", durationMs: 4000 });
    } finally {
      setSharePortalBusy(false);
    }
  }, [result, sharePortalClientId, projectName, toast]);

  const executePushToHalo = useCallback(async () => {
    if (!result || pushSelectedTicketIds.length === 0 || pushSelectedOutputs.length === 0) return;
    if (pushInFlightRef.current || pushLoading) return;
    pushInFlightRef.current = true;
    const effectivePushTarget = lastImportSourcePsa
      ? lastImportSourcePsa
      : psaConnections.multiple
        ? pushTargetPsa
        : psaConnections.primary === "connectwise"
          ? "connectwise"
          : "halopsa";
    const pushRoute =
      effectivePushTarget === "connectwise" ? "/api/cw/push-note" : "/api/halo/push-note";
    const pushLabel = effectivePushTarget === "connectwise" ? "ConnectWise" : "HaloPSA";
    setPushLoading(true);
    setPushErrors([]);
    try {
      console.log("[push modal] sending:", {
        selectedOutputs: pushSelectedOutputs,
        hasRisks: result?.risks?.length ?? 0,
        hasActions: result?.actions?.length ?? 0,
      });
      const res = await fetch(pushRoute, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketIds: pushSelectedTicketIds,
          itemTypes:
            effectivePushTarget === "connectwise" && psaConnections.connectwise
              ? Object.fromEntries(
                  pushSelectedTicketIds.map((id) => {
                    const isProject =
                      allProjects.some((p) => Number(p.id) === id) &&
                      !allTickets.some(
                        (t) => Number(t.id) === id && !(t as { is_project?: boolean }).is_project,
                      );
                    return [String(id), isProject ? "project" : "ticket"];
                  }),
                )
              : undefined,
          outputs: result,
          selectedOutputs: pushSelectedOutputs,
          attachExcel: pushAttachExcel,
          excelTabs: selectedExcelTabs,
          projectName,
          generationId: selectedProjectId,
          pushSummaryScope,
          pushStatusScope,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        posted?: number;
        failed?: number;
        results?: Array<{ ticketId: number; success: boolean; error?: string }>;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "Push failed");
      }
      const failedRows = (data.results ?? [])
        .filter((r) => !r.success)
        .map((r) => ({ ticketId: r.ticketId, error: r.error || "Failed to push" }));
      setPushErrors(failedRows);
      const pushedAt = new Date();
      setLastPushed(pushedAt);
      setLastPushTargetPsa(effectivePushTarget);
      setLastPushedOutputs(pushSelectedOutputs);
      if ((data.posted ?? 0) > 0) {
        void flushAchievementToasts(["first_halo_pushback"]);
      }
      if ((data.posted ?? 0) > 0) {
        setPushQuickActionSuccess(true);
      }
      if ((data.failed ?? 0) === 0) {
        setPushModalOpen(false);
        toast({
          message: `Pushed to ${pushLabel} - posted to ${data.posted ?? 0} tickets`,
          variant: "success",
        });
        if ((data.posted ?? 0) > 0) {
          void markProfileLoopCompleted();
        }
      } else if ((data.posted ?? 0) > 0) {
        toast({
          message: `${data.posted ?? 0} of ${pushSelectedTicketIds.length} tickets posted successfully`,
          variant: "success",
        });
      } else {
        toast({ message: "Push failed for all selected tickets", variant: "error" });
      }
    } catch (err) {
      toast({
        variant: "error",
        message: err instanceof Error ? err.message : "Push failed",
      });
    } finally {
      setPushLoading(false);
      pushInFlightRef.current = false;
    }
  }, [
    pushLoading,
    projectName,
    pushAttachExcel,
    allProjects,
    allTickets,
    selectedExcelTabs,
    pushSelectedOutputs,
    pushSelectedTicketIds,
    pushSummaryScope,
    pushStatusScope,
    result,
    selectedProjectId,
    toast,
    flushAchievementToasts,
    markProfileLoopCompleted,
    psaConnections.multiple,
    psaConnections.primary,
    pushTargetPsa,
    lastImportSourcePsa,
  ]);

  const replayGenerationWebhookNotify = useCallback(async () => {
    if (!result) throw new Error("No report loaded.");
    const res = await fetch("/api/generation/replay-webhook-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        outputs: result,
        projectName,
        savedGenerationId: selectedProjectId,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      throw new Error(
        typeof data.error === "string" && data.error.trim()
          ? data.error
          : "Could not send Slack notification.",
      );
    }
  }, [result, projectName, selectedProjectId]);

  const toggleSelectedExcelTab = useCallback((tab: string) => {
    setSelectedExcelTabs((prev) => (prev.includes(tab) ? prev.filter((t) => t !== tab) : [...prev, tab]));
  }, []);

  const pushedRelativeText = useCallback((): string => {
    if (!lastPushed) return "";
    const mins = Math.floor((Date.now() - lastPushed.getTime()) / (1000 * 60));
    if (mins <= 0) return "just now";
    if (mins === 1) return "1 min ago";
    return `${mins} mins ago`;
  }, [lastPushed]);

  const visibleCoreTabsList = useMemo(() => {
    if (!result) return [...MODAL_OUTPUT_KEYS];
    return visibleCoreTabsForResult(result);
  }, [result]);

  const visibleExtendedTabsList = useMemo(() => {
    if (!result) return [];
    return visibleExtendedTabsForResult(result);
  }, [result]);

  const outputTabStripExtendedKeys = useMemo(
    () => visibleExtendedTabsList.filter((k) => !EXCEL_ONLY_TAB_KEYS.has(k)),
    [visibleExtendedTabsList],
  );

  const fullReportExcelSheetPickerOptions = useMemo(() => {
    if (!result) return [] as { id: string; label: string }[];
    const gen = generatedOutputTabIdsForExcelExport(result);
    return EXPORT_FULLREPORT_TAB_OPTIONS.filter((o) => isExportPickerTabGenerated(o.id, gen));
  }, [result]);

  const scheduleWizardStep0RequiredRemaining = useMemo(() => {
    let n = 0;
    if (!(schName ?? "").trim()) n += 1;
    if (schReportType !== "note_to_self" && !(schEmail ?? "").trim()) n += 1;
    if (!schDay) n += 1;
    if (!schTime) n += 1;
    return n;
  }, [schName, schEmail, schReportType, schDay, schTime]);

  const scheduleWizardStep1RequiredRemaining = useMemo(() => {
    if (!schIncludeTickets && !schIncludeProjects) return 1;
    let n = 0;
    if (
      schIncludeTickets &&
      ticketClientMode === "selected" &&
      selectedTicketClients.length === 0 &&
      selectedTicketIds.length === 0
    ) {
      n += 1;
    }
    if (
      schIncludeProjects &&
      projectClientMode === "selected" &&
      selectedProjectClients.length === 0 &&
      selectedProjectIds.length === 0
    ) {
      n += 1;
    }
    return n;
  }, [
    schIncludeTickets,
    schIncludeProjects,
    ticketClientMode,
    projectClientMode,
    selectedTicketClients.length,
    selectedTicketIds.length,
    selectedProjectClients.length,
    selectedProjectIds.length,
  ]);

  const scheduleWizardRequiredRemaining =
    schCampaignEditorTab === 0
      ? scheduleWizardStep0RequiredRemaining
      : schCampaignEditorTab === 1
        ? scheduleWizardStep1RequiredRemaining
        : 0;

  const handleFullReportExcelExport = useCallback(async () => {
    try {
      if (!hasProAccess) {
        tryOpenProFeatureGate("Full report pack (Excel export)");
        return;
      }
      if (!result) {
        toast({
          message: "No data to export",
          variant: "error",
          durationMs: 4000,
        });
        return;
      }
      const outputs = toFullReportOutputs(result);
      const safeResult: FullReportOutputs = {
        ...outputs,
        actions: Array.isArray(outputs.actions) ? outputs.actions : [],
        risks: Array.isArray(outputs.risks) ? outputs.risks : [],
      };
      const safeProjectName =
        (projectName || "").trim() ||
        safeResult.actions?.[0]?.project_name ||
        "Handover Report";
      const selectedTabsForExport = normalizeExcelExportEngineTabIds(exportFullTabs ?? []);
      const supabaseExport = createClient();
      const {
        data: { user: exportUser },
      } = await supabaseExport.auth.getUser();
      let logoForExport: string | null = null;
      if (exportUser?.id) {
        const { data: freshLogoRow } = await supabaseExport
          .from("profiles")
          .select("brand_logo_url")
          .eq("id", exportUser.id)
          .maybeSingle();
        const freshUrl =
          typeof freshLogoRow?.brand_logo_url === "string"
            ? freshLogoRow.brand_logo_url.trim()
            : "";
        logoForExport = freshUrl || null;
        if (freshUrl && freshUrl !== brandLogoUrl.trim()) {
          setBrandLogoUrl(freshUrl);
        }
      } else {
        logoForExport = brandLogoUrl.trim() || null;
      }
      if (logoForExport) {
        const ok = await isLogoUrlAccessible(logoForExport);
        if (!ok) logoForExport = null;
      }
      const titlesForExport = extractTicketTitlesFromGenerationInput(
        (input.trim() || lastInput.trim()).trim(),
      );
      const { exportToExcel } = await import("@/lib/export-excel");
      await exportToExcel(safeResult, safeProjectName, {
        selectedTabs: selectedTabsForExport,
        actionColumns: exportFullActionCols ?? [],
        riskColumns: exportFullRiskCols ?? [],
        clientName: safeResult.actions?.[0]?.client_name || null,
        projectName: safeProjectName || null,
        brandName: brandName.trim() || null,
        brandColor: brandColour || null,
        brandSecondaryColor: brandSecondaryColour || null,
        brandLogoUrl: logoForExport,
        whiteLabelMode: partnerWhiteLabelActive({
          plan: profileDbPlan,
          team_id: userTeamId,
          trial_ends_at: trialEndsAt,
          trial_plan: profileTrialPlan,
          subscription_status: profileSubscriptionStatus,
          white_label_mode: whiteLabelMode,
          brand_name: brandName,
        }),
        actionSourceColumn: buildActionSourceColumnForExport(safeResult.actions, titlesForExport),
        riskSourceColumn: buildRiskSourceColumnForExport(safeResult.risks, titlesForExport),
        meetingPrepContent: getCachedMeetingPrepContentFromKeys([
          safeResult.actions?.[0]?.client_name,
          safeProjectName,
          ...new Set(
            (safeResult.actions ?? [])
              .map((a) => (typeof a === "object" && a && "client_name" in a ? String((a as { client_name?: string }).client_name ?? "").trim() : ""))
              .filter(Boolean),
          ),
        ]),
        meetingPrepTicketTitle: getCachedMeetingPrepTicketTitleFromKeys([
          safeResult.actions?.[0]?.client_name,
          safeProjectName,
        ]),
        ...buildActionExportMeta(safeProjectName, safeResult.actions),
      });
      try {
        window.localStorage.setItem(LS_EXCEL_EXPORTED, "true");
      } catch {
        /* ignore */
      }
      setHasExportedExcel(true);
      toast({
        message: "Downloaded",
        subtitle: getFullReportExportFilename(projectName),
        durationMs: 3000,
      });
      setFullReportExportPickerOpen(false);
      setExportMenuOpen(false);
      setExportSubPanel(null);
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e.message);
      toast({
        message: `Export failed: ${e.message}`,
        variant: "error",
        durationMs: 5000,
      });
    }
  }, [
    hasProAccess,
    result,
    projectName,
    exportFullTabs,
    exportFullActionCols,
    exportFullRiskCols,
    brandName,
    brandColour,
    brandSecondaryColour,
    brandLogoUrl,
    whiteLabelMode,
    profileDbPlan,
    userTeamId,
    trialEndsAt,
    profileTrialPlan,
    profileSubscriptionStatus,
    isLogoUrlAccessible,
    toast,
    tryOpenProFeatureGate,
    input,
    lastInput,
  ]);

  const runFirstGenExcelFromCelebration = useCallback(async () => {
    if (!result?.actions?.length) {
      toast({
        message: "Nothing to export yet",
        subtitle: "Generate a report with actions first.",
        durationMs: 3200,
      });
      return;
    }
    if (!hasProAccess) {
      const { exportActionsCSV } = await import("@/lib/export-excel");
      exportActionsCSV(
        result.actions,
        projectName,
        [...EXPORT_DEFAULTS.actions],
        buildActionExportMeta(projectName, result.actions),
      );
      try {
        window.localStorage.setItem(LS_BASIC_ACTION_EXPORT, "true");
      } catch {
        /* ignore */
      }
      setBasicOnboardingActionExportDone(true);
      toast({
        message: "Downloaded",
        subtitle: getActionLogExportFilename(projectName),
        durationMs: 3000,
      });
      return;
    }
    await handleFullReportExcelExport();
  }, [hasProAccess, result, projectName, handleFullReportExcelExport, toast]);

  const openFullReportExportPicker = useCallback(() => {
    if (!result) {
      toast({
        message: "No data to export",
        variant: "error",
        durationMs: 4000,
      });
      return;
    }
    if (!hasProAccess) {
      void runFirstGenExcelFromCelebration();
      return;
    }
    const gen = generatedOutputTabIdsForExcelExport(result);
    const allowedTabIds = EXPORT_FULLREPORT_TAB_OPTIONS.filter((o) =>
      isExportPickerTabGenerated(o.id, gen),
    ).map((o) => o.id);
    const p = loadFullReportExportPrefs();
    const nextTabs = p.tabs.filter((id) => allowedTabIds.includes(id));
    setExportFullTabs(nextTabs.length > 0 ? nextTabs : [...allowedTabIds]);
    setExportFullActionCols(p.actionColumns);
    setExportFullRiskCols(p.riskColumns);
    setFullReportExportPickerOpen(true);
  }, [hasProAccess, result, runFirstGenExcelFromCelebration, toast]);

  const openBillingPortal = useCallback(
    async (returnPath = "/") => {
      if (billingPortalBusyRef.current) return;
      billingPortalBusyRef.current = true;
      setPortalNavigating(true);
      try {
        const res = await fetch("/api/stripe/portal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ returnPath }),
          credentials: "include",
        });
        const data = (await res.json()) as { url?: string; error?: string };
        if (data.url) {
          window.location.href = data.url;
          return;
        }
        toast({
          message: data.error || "Could not open billing portal",
          variant: "error",
          durationMs: 5000,
        });
      } catch {
        toast({
          message: "Could not open billing portal",
          variant: "error",
          durationMs: 5000,
        });
      } finally {
        billingPortalBusyRef.current = false;
        setPortalNavigating(false);
      }
    },
    [toast],
  );

  const handleManageSubscription = useCallback(async () => {
    if (manageSubscriptionLoading) return;
    setManageSubscriptionLoading(true);
    try {
      const raw = profileDbPlan ?? "";
      const p = normalizePlanLabel(raw);
      const canon = p === "pro" ? "professional" : p;

      if (canon === "professional_trial" || canon === "team_trial") {
        try {
          const res = await fetch("/api/stripe/portal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ returnPath: "/" }),
            credentials: "include",
          });
          const data = (await res.json()) as { url?: string };
          if (res.ok && data.url) {
            window.location.href = data.url;
            return;
          }
          router.push("/pricing?upgrade=true");
        } catch {
          router.push("/pricing?upgrade=true");
        }
        return;
      }
      if (canon === "free" || canon === "basic") {
        router.push("/pricing?upgrade=true");
        return;
      }
      if (canon === "professional" || canon === "team" || canon === "enterprise") {
        await openBillingPortal("/");
        return;
      }
      router.push("/pricing?upgrade=true");
    } finally {
      setManageSubscriptionLoading(false);
    }
  }, [manageSubscriptionLoading, profileDbPlan, router, openBillingPortal]);

  const startCheckout = async (priceId: string) => {
    if (checkoutLoadingPriceId || !priceId) return;
    setCheckoutLoadingPriceId(priceId);
    try {
      const gateRes = await fetch("/api/stripe/has-billing-customer", { credentials: "include" });
      const gate = (await gateRes.json()) as { hasStripeCustomer?: boolean };
      if (gate.hasStripeCustomer) {
        await openBillingPortal("/");
        return;
      }
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ priceId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        console.error(data.error ?? "Checkout failed");
        return;
      }
      window.location.href = data.url;
    } catch (e) {
      console.error(e);
    } finally {
      setCheckoutLoadingPriceId(null);
    }
  };

  useEffect(() => {
    if (!userEmail) {
      setStripeMonthlyPayingPlan(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/stripe/subscription-billing", {
          credentials: "include",
        });
        if (!res.ok || cancelled) return;
        const body = (await res.json()) as {
          activeMonthlyPayingSubscription?: boolean;
          plan?: "professional" | "team" | null;
        };
        if (cancelled) return;
        setStripeMonthlyPayingPlan(
          body.activeMonthlyPayingSubscription && body.plan ? body.plan : null,
        );
      } catch {
        if (!cancelled) setStripeMonthlyPayingPlan(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userEmail]);

  const handleSaveTemplate = async (templateType: TemplateType) => {
    const name = templateNameDraft.trim();
    if (!name || !result) return;
    const content =
      templateType === "email" ? result.client_email : result.status_report;
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, content, templateType }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        setError(d.error || "Failed to save template.");
        return;
      }
      setTemplateNameDraft("");
      setSaveTemplateFor(null);
      void refreshTemplates();
    } catch (e) {
      console.error("Template save error:", e);
      setError("Failed to save template.");
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      const res = await fetch("/api/templates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        if (templatePreview?.id === id) setTemplatePreview(null);
        void refreshTemplates();
      }
    } catch (e) {
      console.error("Template delete error:", e);
    }
  };

  const applyTemplateForNextGeneration = (template: SavedTemplate) => {
    const typeLabel = template.template_type === "email" ? "email" : "report";
    setNextTemplateContext(
      `Use this as the style and format reference for the ${typeLabel} output:\n${template.content}`,
    );
    setTemplatePreview(null);
  };

  const handleRegenerate = async (outputType: string) => {
    if (!result) return;
    const instruction = (regenInstruction[outputType] || "").trim();
    if (!instruction) return;
    const originalOutput =
      outputType === "client_email"
        ? result.client_email
        : outputType === "status_report"
          ? result.status_report
          : outputType === "summary"
            ? result.summary
            : outputType === "actions"
              ? formatActionsForCopy(result.actions, ticketTitlesForSourceColumn)
              : formatRisksForCopy(result.risks, ticketTitlesForSourceColumn);

    setRegenLoadingFor(outputType);
    try {
      const res = await fetch("/api/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          original_output: originalOutput,
          output_type: outputType,
          instruction,
          tone: outputType === "client_email" ? GENERATION_EMAIL_TONE : "professional",
          context: input,
        }),
      });
      const data = (await res.json()) as { result?: string; error?: string };
      if (!res.ok || !data.result) {
        setError(data.error || "Failed to regenerate output.");
        return;
      }
      setResult((prev) => {
        if (!prev) return prev;
        if (outputType === "client_email")
          return { ...prev, client_email: stripClientEmailSeparatorLines(data.result!) };
        if (outputType === "status_report") return { ...prev, status_report: data.result! };
        if (outputType === "summary") return { ...prev, summary: data.result! };
        if (outputType === "actions") {
          return {
            ...prev,
            actions: [{ task: data.result!, suggested_owner: null, priority: null }],
          };
        }
        return {
          ...prev,
          risks: [{ risk: data.result!, impact: null, mitigation: null }],
        };
      });
      setRegenInstruction((prev) => ({ ...prev, [outputType]: "" }));
    } catch (e) {
      console.error("Regenerate request error:", e);
      setError("Failed to regenerate output.");
    } finally {
      setRegenLoadingFor(null);
    }
  };

  const scheduleTicketRange = useMemo(
    () => ({
      from: getDateRangeStartIso(schDateRange),
      to: getDateRangeEndIso(),
    }),
    [schDateRange],
  );

  const ticketClientOptions = useMemo(() => {
    if (demoModeActive) {
      const q = ticketClientSearch.trim().toLowerCase();
      return DEMO_CLIENTS.map((c) => ({ id: c.id, name: `${c.name} (Demo)` }))
        .filter((c) => !q || c.name.toLowerCase().includes(q))
        .filter((c) => {
          const baseName = c.name.replace(/\s+\(Demo\)$/i, "");
          const dc = DEMO_CLIENTS.find((x) => x.name === baseName);
          return dc != null;
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    if (scheduleLoading || allClients.length === 0) return [];
    const q = ticketClientSearch.trim().toLowerCase();
    const includePreselectedTicketClient = (c: { id: number; name: string }) =>
      scheduleEditorOpen &&
      schCampaignEditorTab === 1 &&
      ticketClientMode === "selected" &&
      selectedTicketClients.includes(c.id);
    return [...allClients]
      .filter((c) => !q || c.name.toLowerCase().includes(q))
      .filter(
        (c) =>
          includePreselectedTicketClient(c) ||
          allTickets.some((t) => Number(t.clientId ?? t.client_id) === c.id),
      )
      .sort((a, b) => {
        const aCount = allTickets.filter((t) => Number(t.clientId ?? t.client_id) === a.id).length;
        const bCount = allTickets.filter((t) => Number(t.clientId ?? t.client_id) === b.id).length;
        return bCount - aCount || a.name.localeCompare(b.name);
      });
  }, [
    demoModeActive,
    scheduleLoading,
    allClients,
    ticketClientSearch,
    allTickets,
    scheduleEditorOpen,
    schCampaignEditorTab,
    ticketClientMode,
    selectedTicketClients,
  ]);

  const projectClientOptions = useMemo(() => {
    if (demoModeActive) {
      const q = projectClientSearch.trim().toLowerCase();
      return DEMO_CLIENTS.map((c) => ({ id: c.id, name: `${c.name} (Demo)` }))
        .filter((c) => !q || c.name.toLowerCase().includes(q))
        .filter((c) => {
          const baseName = c.name.replace(/\s+\(Demo\)$/i, "");
          const dc = DEMO_CLIENTS.find((x) => x.name === baseName);
          return dc != null;
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    if (scheduleLoading || allClients.length === 0) return [];
    const q = projectClientSearch.trim().toLowerCase();
    return [...allClients]
      .filter((c) => !q || c.name.toLowerCase().includes(q))
      .filter((c) => allProjects.some((t) => Number(t.clientId ?? t.client_id) === c.id))
      .sort((a, b) => {
        const aCount = allProjects.filter((t) => Number(t.clientId ?? t.client_id) === a.id).length;
        const bCount = allProjects.filter((t) => Number(t.clientId ?? t.client_id) === b.id).length;
        return bCount - aCount || a.name.localeCompare(b.name);
      });
  }, [demoModeActive, scheduleLoading, allClients, projectClientSearch, allProjects]);

  const scheduledHistoryActive = mainView === "scheduled" && Boolean(userEmail);
  const psaScheduledHistory = useScheduledHistory("psa", scheduledHistoryActive);
  const ciScheduledHistory = useScheduledHistory("ci", scheduledHistoryActive);
  const digestScheduledHistory = useScheduledHistory("digest", scheduledHistoryActive);

  const isCiSchedule = useCallback(
    (c: (typeof campaigns)[number]) =>
      c.report_type === "ci_qbr" ||
      (typeof c.ci_qbr_client_name === "string" &&
        c.ci_qbr_client_name.trim().length > 0),
    [],
  );

  const psaCampaigns = useMemo(
    () => campaigns.filter((c) => !isCiSchedule(c)),
    [campaigns, isCiSchedule],
  );

  const ciCampaigns = useMemo(
    () => campaigns.filter(isCiSchedule),
    [campaigns, isCiSchedule],
  );

  useEffect(() => {
    if (mainView !== "scheduled") return;
    if (scheduleLoading) return;
    if (campaigns.length === 0) return;
    if (schedulesMasterSyncedRef.current) return;
    schedulesMasterSyncedRef.current = true;
    setScheduledReportsMasterEnabled(campaigns.every((c) => c.enabled));
  }, [mainView, scheduleLoading, campaigns]);

  const getTicketCountForClient = useCallback(
    (clientId: number, source: Array<Record<string, unknown>>) =>
      source.filter((t) => Number(t.clientId ?? t.client_id) === clientId).length,
    [],
  );

  /** Tickets for schedule Data step row, including selected IDs not present in open-ticket cache (e.g. closed). */
  const scheduleTicketsForClientRow = useCallback(
    (clientId: number, clientName: string) => {
      const base = allTickets.filter((t) => Number(t.clientId ?? t.client_id) === clientId);
      const ghostIds = selectedTicketIds.filter((tid) => {
        if (base.some((t) => Number(t.id) === tid)) return false;
        return lastImportedHaloItems.some(
          (it) =>
            it.type === "ticket" &&
            it.id === tid &&
            it.clientName.trim().toLowerCase() === clientName.trim().toLowerCase(),
        );
      });
      const ghosts: Array<Record<string, unknown>> = ghostIds.map((tid) => {
        const meta = lastImportedHaloItems.find((it) => it.id === tid);
        return {
          id: tid,
          summary: meta?.title ?? `Ticket ${tid}`,
          clientId,
          client_id: clientId,
          status_id: 1,
        };
      });
      return [...base, ...ghosts];
    },
    [allTickets, selectedTicketIds, lastImportedHaloItems],
  );

  const canProceedStep3 =
    (schIncludeTickets &&
      (ticketClientMode === "all" ||
        selectedTicketClients.length > 0 ||
        selectedTicketIds.length > 0)) ||
    (schIncludeProjects &&
      (projectClientMode === "all" ||
        selectedProjectClients.length > 0 ||
        selectedProjectIds.length > 0));

  const handleClientCheck = useCallback(
    (clientId: number, checked: boolean, mode: "tickets" | "projects") => {
      if (mode === "tickets") {
        const clientTickets = allTickets
          .filter((t) => Number(t.clientId ?? t.client_id) === clientId)
          .map((t) => Number(t.id));
        if (checked) {
          setSelectedTicketClients((prev) =>
            prev.includes(clientId) ? prev : [...prev, clientId],
          );
          setSelectedTicketIds((prev) => Array.from(new Set([...prev, ...clientTickets])));
        } else {
          setSelectedTicketClients((prev) => prev.filter((id) => id !== clientId));
          setSelectedTicketIds((prev) => prev.filter((id) => !clientTickets.includes(id)));
        }
        return;
      }
      const clientProjects = allProjects
        .filter((t) => Number(t.clientId ?? t.client_id) === clientId)
        .map((t) => Number(t.id));
      if (checked) {
        setSelectedProjectClients((prev) =>
          prev.includes(clientId) ? prev : [...prev, clientId],
        );
        setSelectedProjectIds((prev) => Array.from(new Set([...prev, ...clientProjects])));
      } else {
        setSelectedProjectClients((prev) => prev.filter((id) => id !== clientId));
        setSelectedProjectIds((prev) => prev.filter((id) => !clientProjects.includes(id)));
      }
    },
    [allTickets, allProjects],
  );
  const handleTicketCheck = useCallback(
    (ticketId: number, clientId: number, checked: boolean) => {
      if (checked) {
        setSelectedTicketIds((prev) => (prev.includes(ticketId) ? prev : [...prev, ticketId]));
        setSelectedTicketClients((prev) =>
          prev.includes(clientId) ? prev : [...prev, clientId],
        );
        return;
      }
      setSelectedTicketIds((prev) => {
        const next = prev.filter((id) => id !== ticketId);
        const remainingForClient = next.filter((id) => {
          const ticket = allTickets.find((t) => Number(t.id) === id);
          return Number(ticket?.clientId ?? ticket?.client_id) === clientId;
        });
        if (remainingForClient.length === 0) {
          setSelectedTicketClients((curr) => curr.filter((id) => id !== clientId));
        }
        return next;
      });
    },
    [allTickets],
  );
  const handleProjectCheck = useCallback(
    (projectId: number, clientId: number, checked: boolean) => {
      if (checked) {
        setSelectedProjectIds((prev) =>
          prev.includes(projectId) ? prev : [...prev, projectId],
        );
        setSelectedProjectClients((prev) =>
          prev.includes(clientId) ? prev : [...prev, clientId],
        );
        return;
      }
      setSelectedProjectIds((prev) => {
        const next = prev.filter((id) => id !== projectId);
        const remainingForClient = next.filter((id) => {
          const project = allProjects.find((t) => Number(t.id) === id);
          return Number(project?.clientId ?? project?.client_id) === clientId;
        });
        if (remainingForClient.length === 0) {
          setSelectedProjectClients((curr) => curr.filter((id) => id !== clientId));
        }
        return next;
      });
    },
    [allProjects],
  );

  const haloPushScopeRows = useMemo(() => {
    const rows: { id: number; title: string; kind: "support" | "project" }[] = [];
    if (schIncludeTickets) {
      let list = allTickets;
      if (ticketClientMode === "selected") {
        list = allTickets.filter((t) => selectedTicketIds.includes(Number(t.id)));
      }
      for (const t of list) {
        rows.push({
          id: Number(t.id),
          title: String((t.summary as string | undefined) ?? `Ticket ${String(t.id)}`),
          kind: "support",
        });
      }
    }
    if (schIncludeProjects) {
      let list = allProjects;
      if (projectClientMode === "selected") {
        list = allProjects.filter((p) => selectedProjectIds.includes(Number(p.id)));
      }
      for (const p of list) {
        rows.push({
          id: Number(p.id),
          title: String((p.name as string | undefined) ?? `Project ${String(p.id)}`),
          kind: "project",
        });
      }
    }
    rows.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "support" ? -1 : 1;
      return a.title.localeCompare(b.title);
    });
    return rows;
  }, [
    schIncludeTickets,
    schIncludeProjects,
    ticketClientMode,
    projectClientMode,
    allTickets,
    allProjects,
    selectedTicketIds,
    selectedProjectIds,
  ]);

  const consolidatedPostTargetLabel = useMemo(() => {
    for (const id of schPostToTicketIds) {
      const row = haloPushScopeRows.find((r) => r.id === id);
      if (row) return row.title;
    }
    return null;
  }, [schPostToTicketIds, haloPushScopeRows]);

  const allPostTargetsSelected = useMemo(
    () =>
      haloPushScopeRows.length > 0 &&
      haloPushScopeRows.every((r) => schPostToTicketIds.includes(r.id)),
    [haloPushScopeRows, schPostToTicketIds],
  );

  const haloPushProjectRows = useMemo(
    () => haloPushScopeRows.filter((r) => r.kind === "project"),
    [haloPushScopeRows],
  );
  const haloPushSupportRows = useMemo(
    () => haloPushScopeRows.filter((r) => r.kind === "support"),
    [haloPushScopeRows],
  );

  useEffect(() => {
    if (!schPushToHalo) return;
    if (haloPushScopeRows.length === 0) return;
    if (postTicketSelectionTouchedRef.current) return;
    setSchPostToTicketIds(haloPushScopeRows.map((r) => r.id));
  }, [schPushToHalo, haloPushScopeRows]);

  const primaryModalButtonClass =
    "cursor-pointer select-none transition-all duration-150 hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] active:brightness-95";
  const secondaryModalButtonClass =
    "cursor-pointer select-none transition-all duration-150 hover:bg-[var(--bg-secondary)] hover:border-[var(--text-muted)] active:scale-[0.98]";

  const renderScheduleCheckbox = (
    checked: boolean,
    onToggle: () => void,
    disabled = false,
  ) => (
    <div
      role="button"
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onToggle();
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }
      }}
      className={cn(
        "flex size-5 shrink-0 select-none items-center justify-center rounded-[5px] border-2 transition-all duration-150",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      )}
      style={{
        borderColor: checked ? "var(--accent)" : "var(--border)",
        background: checked ? "var(--accent)" : "transparent",
      }}
    >
      {checked ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path
            d="M20 6L9 17l-5-5"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </div>
  );

  const formatScheduleDayLabel = (day: string) =>
    day ? `${day.charAt(0).toUpperCase()}${day.slice(1)}` : "Monday";
  const formatScheduleTime12h = (value: string) => {
    const [hh, mm] = value.split(":").map((n) => Number(n));
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return `${value} GMT`;
    const h12 = ((hh + 11) % 12) + 1;
    const suffix = hh >= 12 ? "pm" : "am";
    return `${h12}:${String(mm).padStart(2, "0")}${suffix} GMT`;
  };
  const getDisplayStatus = (statusId: number) => {
    if (statusId === 1) return "Open";
    if (statusId === 2) return "In Progress";
    if (statusId === 9) return "On Hold";
    if (statusId === 16) return "Resolved";
    if (statusId === 17) return "Closed";
    return "Open";
  };
  const getStatusBadgeClass = (status: string) => {
    if (status === "In Progress") return "bg-sky-500/20 text-sky-300";
    if (status === "On Hold") return "bg-amber-500/20 text-amber-300";
    if (status === "Resolved" || status === "Closed")
      return "bg-emerald-500/20 text-emerald-300";
    return "bg-slate-500/20 text-slate-300";
  };

  const loadAllScheduleData = useCallback(async () => {
    setDataLoading(true);
    try {
      if (demoModeActive) {
        const demoClients = DEMO_CLIENTS.map((c) => ({ id: c.id, name: `${c.name} (Demo)` }));
        const demoClientIdByName = new Map(DEMO_CLIENTS.map((c) => [c.name, c.id]));
        const demoTickets = DEMO_TICKETS.map((t) => {
          const clientId = demoClientIdByName.get(t.client.name) ?? 0;
          return {
            ...t,
            id: Number(String(t.id).replace(/\D/g, "")) || 0,
            clientId,
            client_id: clientId,
            _source: "halopsa" as const,
            source: "halopsa" as const,
            is_project: false,
          };
        });
        const demoProjects = DEMO_PROJECTS.map((p) => {
          const clientId = demoClientIdByName.get(p.client.name) ?? 0;
          return {
            ...p,
            summary: p.name,
            is_project: true,
            source: "halopsa" as const,
            clientId,
            client_id: clientId,
            _source: "halopsa" as const,
          };
        });
        setAllClients(demoClients);
        setAllTickets(demoTickets);
        setAllProjects(demoProjects);
        setDataLoaded(true);
        return;
      }

      const fetches: Promise<Response>[] = [];
      fetches.push(fetch("/api/halo/clients?all_pages=1&page_size=1000"));
      const [clientsRes] = await Promise.all(fetches);
      const clientsJson = clientsRes
        ? ((await clientsRes.json()) as {
            clients?: Array<{ id: number; name: string }>;
          })
        : { clients: [] };
      const tickets = haloConnected
        ? (Array.isArray(cachedHaloTickets?.tickets)
            ? (cachedHaloTickets.tickets as Array<Record<string, unknown>>)
            : ((await refreshHaloTicketsCache())?.tickets as Array<Record<string, unknown>> | undefined) ?? [])
        : [];
      const cwTickets = cwConnected
        ? (Array.isArray(cachedCwTickets?.tickets)
            ? (cachedCwTickets.tickets as Array<Record<string, unknown>>)
            : ((await refreshCwTicketsCache())?.tickets as Array<Record<string, unknown>> | undefined) ?? [])
        : [];
      const cwProjects = cwConnected
        ? (Array.isArray(cachedCwProjects?.projects)
            ? (cachedCwProjects.projects as Array<Record<string, unknown>>)
            : ((await refreshCwProjectsCache())?.projects as Array<Record<string, unknown>> | undefined) ?? [])
        : [];
      const clients = Array.isArray(clientsJson.clients) ? clientsJson.clients : [];
      const cwClientMap = new Map<number, string>();
      const cwSyntheticClientIdByName = new Map<string, number>();
      let nextSyntheticClientId = -1;
      const resolveCwClientId = (item: Record<string, unknown>) => {
        const raw = Number(
          (item.client as { id?: unknown } | undefined)?.id ??
            item.clientId ??
            item.client_id,
        );
        if (Number.isFinite(raw) && raw > 0) return raw;
        const name = String((item.client as { name?: unknown } | undefined)?.name ?? "")
          .trim()
          .toLowerCase();
        if (!name) return 0;
        const existing = cwSyntheticClientIdByName.get(name);
        if (existing != null) return existing;
        const created = nextSyntheticClientId--;
        cwSyntheticClientIdByName.set(name, created);
        return created;
      };
      for (const t of [...cwTickets, ...cwProjects]) {
        const cid = resolveCwClientId(t);
        const cname = String((t.client as { name?: unknown } | undefined)?.name ?? "").trim();
        if (Number.isFinite(cid) && cid !== 0 && cname) cwClientMap.set(cid, cname);
      }
      const mergedClients = [
        ...clients,
        ...[...cwClientMap.entries()].map(([id, name]) => ({ id, name })),
      ];
      const nonProjectTickets = tickets
        .filter((t) => t.is_project !== true)
        .map((t) => ({ ...t, _source: "halopsa" as const }));
      const projectTickets = tickets
        .filter((t) => t.is_project === true)
        .map((t) => ({ ...t, _source: "halopsa" as const }));
      const cwTicketRows = cwTickets.map((t) => ({
        ...t,
        source:
          (t as { source?: unknown }).source === "connectwise"
            ? "connectwise"
            : "connectwise",
        _source: "connectwise" as const,
        psa: "cw",
        clientId: resolveCwClientId(t),
      }));
      const cwProjectRows = cwProjects.map((p) => ({
        ...p,
        summary: String(p.name ?? `Project ${String(p.id ?? "")}`),
        is_project: true,
        source: "connectwise",
        _source: "connectwise" as const,
        clientId: resolveCwClientId(p),
      }));

      setAllClients(mergedClients);
      setAllTickets([...nonProjectTickets, ...cwTicketRows]);
      setAllProjects([...projectTickets, ...cwProjectRows]);
      setDataLoaded(true);
    } finally {
      setDataLoading(false);
    }
  }, [
    cachedCwProjects,
    cachedCwTickets,
    cachedHaloTickets,
    cwConnected,
    demoModeActive,
    haloConnected,
    refreshCwProjectsCache,
    refreshCwTicketsCache,
    refreshHaloTicketsCache,
  ]);

  useEffect(() => {
    if (!scheduleEditorOpen) return;
    if (schCampaignEditorTab !== 1) return;
    if (dataLoaded || dataLoading) return;
    void loadAllScheduleData();
  }, [scheduleEditorOpen, schCampaignEditorTab, dataLoaded, dataLoading, loadAllScheduleData]);

  const scheduleDataLoadedPrevRef = useRef(false);
  useEffect(() => {
    if (!scheduleEditorOpen) scheduleDataLoadedPrevRef.current = false;
  }, [scheduleEditorOpen]);

  useEffect(() => {
    if (!scheduleEditorOpen || schCampaignEditorTab !== 1) return;
    const wasLoaded = scheduleDataLoadedPrevRef.current;
    scheduleDataLoadedPrevRef.current = dataLoaded;
    if (!dataLoaded || wasLoaded) return;

    if (ticketClientMode === "selected" && selectedTicketIds.length > 0) {
      const merged = new Set(selectedTicketClients);
      for (const tid of selectedTicketIds) {
        const t = allTickets.find((x) => Number(x.id) === tid);
        const cid = Number(
          t?.clientId ?? (t as Record<string, unknown> | undefined)?.client_id,
        );
        if (Number.isFinite(cid)) merged.add(cid);
      }
      const mergedArr = [...merged].sort((a, b) => a - b);
      const prevArr = [...selectedTicketClients].sort((a, b) => a - b);
      if (mergedArr.join(",") !== prevArr.join(",")) {
        setSelectedTicketClients(mergedArr);
      }
      setExpandedTicketClients((prev) => {
        const next = new Set(prev);
        for (const cid of mergedArr) {
          next.add(cid);
        }
        return next;
      });
    }

    if (projectClientMode === "selected" && selectedProjectIds.length > 0) {
      const merged = new Set(selectedProjectClients);
      for (const pid of selectedProjectIds) {
        const t = allProjects.find((x) => Number(x.id) === pid);
        const cid = Number(
          t?.clientId ?? (t as Record<string, unknown> | undefined)?.client_id,
        );
        if (Number.isFinite(cid)) merged.add(cid);
      }
      const mergedArr = [...merged].sort((a, b) => a - b);
      const prevArr = [...selectedProjectClients].sort((a, b) => a - b);
      if (mergedArr.join(",") !== prevArr.join(",")) {
        setSelectedProjectClients(mergedArr);
      }
      setExpandedProjectClients((prev) => {
        const next = new Set(prev);
        for (const cid of mergedArr) {
          next.add(cid);
        }
        return next;
      });
    }
  }, [
    scheduleEditorOpen,
    schCampaignEditorTab,
    dataLoaded,
    ticketClientMode,
    projectClientMode,
    selectedTicketIds,
    selectedProjectIds,
    allTickets,
    allProjects,
    selectedTicketClients,
    selectedProjectClients,
  ]);

  const scheduleTicketTreePrefillSyncedRef = useRef(false);
  useEffect(() => {
    if (!scheduleEditorOpen || schCampaignEditorTab !== 1) {
      scheduleTicketTreePrefillSyncedRef.current = false;
      return;
    }
    if (!dataLoaded || dataLoading) {
      scheduleTicketTreePrefillSyncedRef.current = false;
    }
  }, [scheduleEditorOpen, schCampaignEditorTab, dataLoaded, dataLoading]);

  useEffect(() => {
    if (!scheduleEditorOpen || schCampaignEditorTab !== 1) return;
    if (!dataLoaded || dataLoading) return;
    if (ticketClientMode !== "selected" || selectedTicketIds.length === 0) return;
    if (scheduleTicketTreePrefillSyncedRef.current) return;

    const clientIdsFound = new Set<number>();
    for (const tid of selectedTicketIds) {
      const row = allTickets.find((x) => Number(x.id) === tid);
      if (row) {
        const cid = Number(row.clientId ?? (row as Record<string, unknown>).client_id);
        if (Number.isFinite(cid)) clientIdsFound.add(cid);
        continue;
      }
      const imp = lastImportedHaloItems.find((it) => it.type === "ticket" && it.id === tid);
      if (imp) {
        const nm = imp.clientName.trim().toLowerCase();
        const match = allClients.find((c) => c.name.trim().toLowerCase() === nm);
        if (match) clientIdsFound.add(match.id);
      }
    }
    if (clientIdsFound.size === 0) return;

    scheduleTicketTreePrefillSyncedRef.current = true;
    setExpandedTicketClients((prev) => {
      const next = new Set(prev);
      for (const id of clientIdsFound) next.add(id);
      return next;
    });
    setSelectedTicketClients((prev) => {
      const next = new Set([...prev, ...clientIdsFound]);
      return [...next].sort((a, b) => a - b);
    });
  }, [
    scheduleEditorOpen,
    schCampaignEditorTab,
    dataLoaded,
    dataLoading,
    ticketClientMode,
    selectedTicketIds,
    allTickets,
    allClients,
    lastImportedHaloItems,
  ]);

  useEffect(() => {
    setDataLoaded(false);
  }, [schDateRange]);
  useEffect(() => {
    setDataLoaded(false);
  }, [cwConnected]);
  const [stepBarGlow, setStepBarGlow] = useState(false);
  useEffect(() => {
    setStepBarGlow(true);
    const t = window.setTimeout(() => setStepBarGlow(false), 220);
    return () => window.clearTimeout(t);
  }, [schCampaignEditorTab]);

  useEffect(() => {
    if (mainView !== "scheduled" || !userEmail) return;
    if (haloClientsForSchedule.length === 0) {
      setScheduleClientCounts({});
      return;
    }
    if (!schIncludeTickets && !schIncludeProjects) {
      setScheduleClientCounts({});
      return;
    }
    let cancelled = false;
    setScheduleCountsLoading(true);
    void (async () => {
      try {
        const clientIds = haloClientsForSchedule.map((x) => x.id);
        const dateFrom = scheduleTicketRange.from;
        const dateTo = scheduleTicketRange.to;

        const baseBody = { clientIds, dateFrom, dateTo };

        if (schIncludeTickets && schIncludeProjects) {
          const [tRes, pRes] = await Promise.all([
            fetch("/api/halo/client-counts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ type: "tickets", ...baseBody }),
            }),
            fetch("/api/halo/client-counts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ type: "projects", ...baseBody }),
            }),
          ]);
          const [tJson, pJson] = await Promise.all([tRes.json(), pRes.json()]) as [
            { counts?: Record<string, number> },
            { counts?: Record<string, number> },
          ];
          if (!cancelled && tRes.ok && pRes.ok && tJson.counts && pJson.counts) {
            const summed: Record<string, number> = {};
            for (const [k, v] of Object.entries(tJson.counts)) summed[k] = (summed[k] ?? 0) + v;
            for (const [k, v] of Object.entries(pJson.counts)) summed[k] = (summed[k] ?? 0) + v;
            setScheduleClientCounts(summed);
          } else if (!cancelled) {
            setScheduleClientCounts({});
          }
        } else {
          const onlyType = schIncludeProjects ? "projects" : "tickets";
          const res = await fetch("/api/halo/client-counts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: onlyType, ...baseBody }),
          });
          const data = (await res.json()) as { counts?: Record<string, number> };
          if (!cancelled && res.ok && data.counts) setScheduleClientCounts(data.counts);
          else if (!cancelled) setScheduleClientCounts({});
        }
      } catch {
        if (!cancelled) setScheduleClientCounts({});
      } finally {
        if (!cancelled) setScheduleCountsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    mainView,
    plan,
    haloClientsForSchedule,
    scheduleTicketRange.from,
    scheduleTicketRange.to,
    schIncludeTickets,
    schIncludeProjects,
  ]);

  const scrollCampaignEditorIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      campaignEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const openNewScheduleEditor = useCallback(() => {
    setScheduleEditorIsNew(true);
    setSelectedSchedule(null);
    setSchCampaignEditorTab(0);
    setSchCampaignId(null);
    setSchName("Weekly Report");
    setSchBrandName(profileCompanyName.trim());
    setSchEmailTone("professional");
    setSchReportType("external");
    setSchIncludeTickets(false);
    setSchIncludeProjects(false);
    setTicketClientMode("all");
    setProjectClientMode("all");
    setSelectedTicketClients([]);
    setSelectedProjectClients([]);
    setSelectedTicketIds([]);
    setSelectedProjectIds([]);
    setTicketClientSearch("");
    setProjectClientSearch("");
    setExpandedTicketClients(new Set());
    setExpandedProjectClients(new Set());
    setDataLoaded(false);
    setSchEnabled(false);
    setSchDay("monday");
    setSchTime("07:00");
    setSchEmail(userEmail ?? "");
    setSchEmailCc("");
    setSchEmailBcc("");
    setSchCcBccOpen(false);
    setSchRecipientName("");
    setSchDateRange("last_7_days");
    setSchEmailPrefs({ ...DEFAULT_EMAIL_CONTENT_PREFS, include_client_emails: false });
    setSchAttachExcel(hasProAccess);
    setSchExcelOptional([...SCHEDULE_EXCEL_CORE_KEYS, ...SCHEDULE_EXCEL_OPTIONAL_TAB_KEYS]);
    setSchPushToHalo(false);
    setSchHoldForReview(false);
    setSchHaloPushOutputs(["client_email", "actions", "risks"]);
    setSchHaloPushExcel(false);
    setSchHaloPushExcelTabs([]);
    setSchPostToTicketIds([]);
    setSchPostConsolidated(false);
    postTicketSelectionTouchedRef.current = false;
    setScheduleEditorOpen(true);
  }, [userEmail, hasProAccess, profileCompanyName]);

  const toggleExcelTab = useCallback((tab: string) => {
    setSchExcelOptional((prev) =>
      prev.includes(tab) ? prev.filter((t) => t !== tab) : [...prev, tab],
    );
  }, []);

  const loadCampaignIntoEditor = (
    c: (typeof campaigns)[number] | null | undefined,
  ) => {
    if (!c) return;
    if (!c.id) return;
    setSelectedSchedule(c);
    setSchCampaignEditorTab(0);
    const rt =
      c.is_note_to_self === true
        ? "note_to_self"
        : c.report_type === "internal"
          ? "internal"
          : c.report_type === "note_to_self"
            ? "note_to_self"
            : "external";

    setSchCampaignId(c.id);
    setScheduleRow({
      id: c.id,
      last_run_at: c.last_run_at ?? null,
      next_run_at: c.next_run_at ?? null,
    });
    setSchEnabled(!!c.enabled);
    setSchDay(c.schedule_day || "monday");
    setSchTime(c.schedule_time || "07:00");
    setSchName(c.name?.trim() || "Weekly Report");
    setSchReportType(rt);
    setSchIncludeTickets(c.include_tickets !== false);
    setSchIncludeProjects(c.include_projects !== false);

    const effectiveEmail = !userEmail
      ? (c.email_to ?? "")
      : rt === "note_to_self"
        ? userEmail.trim()
        : (c.email_to ?? userEmail).trim();
    setSchEmail(effectiveEmail);
    const ccLoad = typeof c.email_cc === "string" ? c.email_cc : "";
    const bccLoad = typeof c.email_bcc === "string" ? c.email_bcc : "";
    setSchEmailCc(ccLoad);
    setSchEmailBcc(bccLoad);
    setSchCcBccOpen(ccLoad.trim().length > 0 || bccLoad.trim().length > 0);
    setSchRecipientName(c.recipient_name?.trim() || "");

    setSchDateRange(c.date_range || "last_7_days");
    const ticketIds = normalizeCampaignIntIds(c.ticket_client_ids);
    const projectIds = normalizeCampaignIntIds(c.project_client_ids);
    const fallbackIds = normalizeCampaignIntIds(c.client_ids);
    const selectedStIds = normalizeCampaignIntIds(c.selected_ticket_ids);
    const selectedSpIds = normalizeCampaignIntIds(c.selected_project_ids);
    const ticketAll =
      c.ticket_all_clients !== false &&
      ticketIds.length === 0 &&
      selectedStIds.length === 0;
    const projectAll =
      c.project_all_clients !== false &&
      projectIds.length === 0 &&
      selectedSpIds.length === 0;
    setTicketClientMode(ticketAll ? "all" : "selected");
    setProjectClientMode(projectAll ? "all" : "selected");
    setSelectedTicketClients(ticketAll ? [] : ticketIds.length > 0 ? ticketIds : fallbackIds);
    setSelectedProjectClients(projectAll ? [] : projectIds.length > 0 ? projectIds : fallbackIds);
    setSelectedTicketIds(selectedStIds);
    setSelectedProjectIds(selectedSpIds);
    setTicketClientSearch("");
    setProjectClientSearch("");
    setExpandedTicketClients(new Set());
    setExpandedProjectClients(new Set());
    setDataLoaded(false);
    setSchEmailPrefs(normalizePrefsFromApi(c.email_content_prefs));
    setSchAttachExcel(c.attach_excel !== false);
    setSchExcelOptional(selectedExcelKeysFromRow(c.excel_tabs));
    setSchBrandName(
      typeof c.brand_name === "string" && c.brand_name.trim()
        ? c.brand_name
        : profileCompanyName.trim(),
    );
    setSchEmailTone(normalizeSchEmailTone(c.email_tone));
    setSchPushToHalo(c.push_to_halo === true);
    setSchHoldForReview(c.hold_for_review === true);
    setSchHaloPushOutputs(
      Array.isArray(c.halo_push_outputs) && c.halo_push_outputs.length > 0
        ? c.halo_push_outputs
        : ["client_email", "actions", "risks"],
    );
    setSchHaloPushExcel(c.halo_push_excel === true);
    setSchHaloPushExcelTabs(Array.isArray(c.halo_push_excel_tabs) ? c.halo_push_excel_tabs : []);
    if (Array.isArray(c.post_to_ticket_ids)) {
      setSchPostToTicketIds(
        c.post_to_ticket_ids.filter((id): id is number => typeof id === "number"),
      );
      postTicketSelectionTouchedRef.current = true;
    } else {
      setSchPostToTicketIds([]);
      postTicketSelectionTouchedRef.current = false;
    }
    setSchPostConsolidated(c.post_consolidated === true);

    // Clear preview state when switching campaigns.
    scheduleEmailPreviewCacheRef.current = null;
    setScheduleEmailPreviewHtml(null);
    setScheduleEmailPreviewError(null);
    setScheduleEmailPreviewLoading(false);
    setScheduleEmailPreviewGeneratedAt(null);
  };

  const openCiScheduleEdit = (c: (typeof campaigns)[number]) => {
    const isQbr = c.report_type === "ci_qbr";
    setNewCiScheduleType(isQbr ? "qbr" : "service_review");
    const clientName =
      c.ci_qbr_client_name?.trim() || c.name?.split(" — ")[0]?.trim() || "";
    setNewCiScheduleClient(clientName);
    setNewCiScheduleEmail(c.email_to ?? "");
    setNewCiScheduleDay(c.schedule_day ?? "monday");
    const loadRef = new Date();
    const rawStoredTime =
      typeof c.schedule_time === "string" && c.schedule_time.trim()
        ? c.schedule_time.trim()
        : "08:00";
    if (c.id) {
      setNewCiScheduleTime(c.schedule_time ?? "08:00");
      void (async () => {
        const supabase = createClient();
        const { data } = await supabase
          .from("scheduled_reports")
          .select("schedule_time")
          .eq("id", c.id)
          .maybeSingle();
        const rawUtc =
          typeof data?.schedule_time === "string" && data.schedule_time.trim()
            ? data.schedule_time.trim()
            : rawStoredTime;
        setNewCiScheduleTime(utcStoredScheduleTimeToLondonWall(rawUtc, loadRef));
      })();
    } else {
      setNewCiScheduleTime("08:00");
    }
    setNewCiHoldForReview(c.hold_for_review === true);
    if (!isQbr) {
      if (c.date_range === "last_7_days") setNewCiFrequency("weekly");
      else if (c.date_range === "last_14_days") setNewCiFrequency("fortnightly");
      else setNewCiFrequency("monthly");
    }
    setEditingCiScheduleId(c.id ?? null);
    setScheduledCiOpen(true);
  };

  const openEditScheduleEditor = (c: (typeof campaigns)[number]) => {
    if (c.report_type === "ci_qbr" || c.ci_qbr_client_name) {
      openCiScheduleEdit(c);
      return;
    }
    loadCampaignIntoEditor(c);
    setScheduleEditorIsNew(false);
    setScheduleEditorOpen(true);
  };

  const refreshCampaigns = async (): Promise<typeof campaigns | null> => {
    try {
      const res = await fetch("/api/scheduled-reports");
      if (!res.ok) {
        console.error("[refreshCampaigns] fetch failed:", res.status, res.statusText);
        return null;
      }
      const data = (await res.json()) as {
        schedules?: typeof campaigns;
        schedule?: typeof campaigns[number];
      };
      const next = Array.isArray(data.schedules)
        ? data.schedules
        : data.schedule
          ? [data.schedule]
          : [];
      setCampaigns(next);
      if (next.some((c) => Boolean(c.last_run_at))) {
        void flushAchievementToasts(["first_scheduled_report_sent"]);
      }
      return next;
    } catch (e) {
      console.error("[refreshCampaigns] fetch error:", e);
      return null;
    }
  };

  const buildSchedulePatchPayload = useCallback(
    (
      c: (typeof campaigns)[number],
      overrides?: { enabled?: boolean; hold_for_review?: boolean },
    ) => ({
      schedule_id: c.id,
      enabled: overrides?.enabled !== undefined ? overrides.enabled : c.enabled,
      schedule_day: c.schedule_day,
      schedule_time: c.schedule_time,
      email_to: c.email_to,
      email_cc: c.email_cc ?? null,
      email_bcc: c.email_bcc ?? null,
      date_range: c.date_range,
      client_ids: Array.isArray(c.client_ids) ? c.client_ids : [],
      email_content_prefs: c.email_content_prefs ?? DEFAULT_EMAIL_CONTENT_PREFS,
      attach_excel: c.attach_excel ?? true,
      excel_tabs:
        c.excel_tabs ?? [...SCHEDULE_EXCEL_CORE_KEYS, ...SCHEDULE_EXCEL_OPTIONAL_TAB_KEYS],
      name: c.name ?? "Weekly Report",
      brand_name: c.brand_name ?? null,
      report_type: c.report_type ?? "external",
      include_tickets: c.include_tickets ?? true,
      include_projects: c.include_projects ?? true,
      is_note_to_self: c.is_note_to_self ?? false,
      recipient_name: c.recipient_name ?? null,
      ticket_client_ids: Array.isArray(c.ticket_client_ids) ? c.ticket_client_ids : [],
      project_client_ids: Array.isArray(c.project_client_ids) ? c.project_client_ids : [],
      ticket_all_clients:
        typeof c.ticket_all_clients === "boolean" ? c.ticket_all_clients : true,
      project_all_clients:
        typeof c.project_all_clients === "boolean" ? c.project_all_clients : true,
      selected_ticket_ids: Array.isArray(c.selected_ticket_ids) ? c.selected_ticket_ids : [],
      selected_project_ids: Array.isArray(c.selected_project_ids) ? c.selected_project_ids : [],
      email_tone: c.email_tone ?? "professional",
      push_to_halo: c.push_to_halo === true,
      hold_for_review:
        overrides?.hold_for_review !== undefined
          ? overrides.hold_for_review === true
          : c.hold_for_review === true,
      halo_push_outputs: Array.isArray(c.halo_push_outputs) ? c.halo_push_outputs : [],
      halo_push_excel: c.halo_push_excel === true,
      halo_push_excel_tabs: Array.isArray(c.halo_push_excel_tabs) ? c.halo_push_excel_tabs : [],
      halo_push_target:
        c.halo_push_target === "projects" || c.halo_push_target === "tickets"
          ? c.halo_push_target
          : "all",
      post_to_ticket_ids:
        c.push_to_halo === true && Array.isArray(c.post_to_ticket_ids)
          ? c.post_to_ticket_ids
          : null,
      post_consolidated: c.push_to_halo === true && c.post_consolidated === true,
    }),
    [],
  );

  const toggleCampaignEnabled = async (c: (typeof campaigns)[number], enabled: boolean) => {
    if (!userEmail) return;
    if (!c.id) return;
    const previousEnabled = c.enabled;
    setCampaigns((prev) =>
      prev.map((row) => (row.id === c.id ? { ...row, enabled } : row)),
    );
    if (selectedSchedule?.id === c.id) {
      setSelectedSchedule((prev) => (prev ? { ...prev, enabled } : prev));
      setSchEnabled(enabled);
    }
    setScheduleSaving(true);
    try {
      const res = await fetch("/api/scheduled-reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildSchedulePatchPayload(c, { enabled })),
      });
      const data = (await res.json()) as { schedule?: typeof c; error?: string };
      if (!res.ok) throw new Error(data.error || "Could not update schedule");
      void refreshCampaigns();
    } catch {
      setCampaigns((prev) =>
        prev.map((row) => (row.id === c.id ? { ...row, enabled: previousEnabled } : row)),
      );
      if (selectedSchedule?.id === c.id) {
        setSelectedSchedule((prev) => (prev ? { ...prev, enabled: previousEnabled } : prev));
        setSchEnabled(previousEnabled);
      }
      toast({
        message: "Failed to update schedule status",
        variant: "error",
        durationMs: 4000,
      });
    } finally {
      setScheduleSaving(false);
    }
  };

  const toggleHoldForReview = async (
    c: (typeof campaigns)[number],
    holdForReview: boolean,
  ) => {
    if (!userEmail) return;
    if (!c.id) return;
    const previousHold = c.hold_for_review === true;
    setCampaigns((prev) =>
      prev.map((row) =>
        row.id === c.id ? { ...row, hold_for_review: holdForReview } : row,
      ),
    );
    if (selectedSchedule?.id === c.id || schCampaignId === c.id) {
      setSchHoldForReview(holdForReview);
    }
    if (editingCiScheduleId === c.id) {
      setNewCiHoldForReview(holdForReview);
    }
    setScheduleSaving(true);
    try {
      const res = await fetch("/api/scheduled-reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildSchedulePatchPayload(c, { hold_for_review: holdForReview })),
      });
      const data = (await res.json()) as { schedule?: typeof c; error?: string };
      if (!res.ok) throw new Error(data.error || "Could not update schedule");
      void refreshCampaigns();
    } catch {
      setCampaigns((prev) =>
        prev.map((row) =>
          row.id === c.id ? { ...row, hold_for_review: previousHold } : row,
        ),
      );
      if (selectedSchedule?.id === c.id || schCampaignId === c.id) {
        setSchHoldForReview(previousHold);
      }
      if (editingCiScheduleId === c.id) {
        setNewCiHoldForReview(previousHold);
      }
      toast({
        message: "Failed to update hold for review",
        variant: "error",
        durationMs: 4000,
      });
    } finally {
      setScheduleSaving(false);
    }
  };

  const toggleAllCampaignsEnabled = async (enabled: boolean) => {
    if (!userEmail) return;
    const targets = campaigns.filter((c) => Boolean(c.id));
    if (targets.length === 0) return;
    const previousCampaigns = campaigns;
    const previousSchEnabled = schEnabled;
    const previousMasterEnabled = scheduledReportsMasterEnabled;
    setScheduledReportsMasterEnabled(enabled);
    setCampaigns((prev) => prev.map((c) => ({ ...c, enabled })));
    setSchEnabled(enabled);
    setScheduleSaving(true);
    try {
      for (const c of targets) {
        const res = await fetch("/api/scheduled-reports", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildSchedulePatchPayload(c, { enabled })),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || "Could not update schedule");
      }
      void refreshCampaigns();
      if (selectedSchedule?.id) {
        const matched = targets.find((c) => c.id === selectedSchedule.id);
        if (matched) {
          setSelectedSchedule((prev) => (prev ? { ...prev, enabled } : prev));
          setSchEnabled(enabled);
        }
      }
    } catch {
      setScheduledReportsMasterEnabled(previousMasterEnabled);
      setCampaigns(previousCampaigns);
      setSchEnabled(previousSchEnabled);
      if (selectedSchedule?.id) {
        const prevSelected = previousCampaigns.find((c) => c.id === selectedSchedule.id);
        if (prevSelected) {
          setSelectedSchedule((prev) =>
            prev ? { ...prev, enabled: prevSelected.enabled } : prev,
          );
        }
      }
      toast({
        message: "Failed to update schedule status",
        variant: "error",
        durationMs: 4000,
      });
    } finally {
      setScheduleSaving(false);
    }
  };

  const createNewSchedule = () => {
    if (!userEmail) return;
    openNewScheduleEditor();
  };

  useEffect(() => {
    if (mainView !== "scheduled") return;
    if (!userEmail) return;
    let cancelled = false;

    void (async () => {
      setScheduleLoading(true);
      setTicketClientSearch("");
      setProjectClientSearch("");
      try {
        const res = await fetch("/api/scheduled-reports");
        const data = (await res.json()) as {
          schedules?: Array<{
            id?: string;
            enabled: boolean;
            schedule_day: string;
            schedule_time: string;
            email_to: string | null;
            date_range: string;
            client_ids: number[] | null;
            last_run_at: string | null;
            next_run_at: string | null;
            email_content_prefs?: unknown;
            attach_excel?: boolean | null;
            excel_tabs?: string[] | null;
            name?: string | null;
            report_type?: string | null;
            include_tickets?: boolean | null;
            include_projects?: boolean | null;
            is_note_to_self?: boolean | null;
            recipient_name?: string | null;
            ticket_client_ids?: number[] | null;
            project_client_ids?: number[] | null;
            ticket_all_clients?: boolean | null;
            project_all_clients?: boolean | null;
            selected_ticket_ids?: number[] | null;
            selected_project_ids?: number[] | null;
            brand_name?: string | null;
            email_format?: string | null;
            email_tone?: string | null;
            push_to_halo?: boolean | null;
            hold_for_review?: boolean | null;
            halo_push_outputs?: string[] | null;
            halo_push_excel?: boolean | null;
            halo_push_excel_tabs?: string[] | null;
            halo_push_target?: "all" | "projects" | "tickets" | null;
            post_to_ticket_ids?: number[] | null;
            post_consolidated?: boolean | null;
          }>;
          schedule?: {
            id?: string;
            enabled: boolean;
            schedule_day: string;
            schedule_time: string;
            email_to: string | null;
            date_range: string;
            client_ids: number[] | null;
            last_run_at: string | null;
            next_run_at: string | null;
            email_content_prefs?: unknown;
            attach_excel?: boolean | null;
            excel_tabs?: string[] | null;
            name?: string | null;
            report_type?: string | null;
            include_tickets?: boolean | null;
            include_projects?: boolean | null;
            is_note_to_self?: boolean | null;
            recipient_name?: string | null;
            ticket_client_ids?: number[] | null;
            project_client_ids?: number[] | null;
            ticket_all_clients?: boolean | null;
            project_all_clients?: boolean | null;
            selected_ticket_ids?: number[] | null;
            selected_project_ids?: number[] | null;
            brand_name?: string | null;
            email_format?: string | null;
            email_tone?: string | null;
            push_to_halo?: boolean | null;
            hold_for_review?: boolean | null;
            halo_push_outputs?: string[] | null;
            halo_push_excel?: boolean | null;
            halo_push_excel_tabs?: string[] | null;
            halo_push_target?: "all" | "projects" | "tickets" | null;
            post_to_ticket_ids?: number[] | null;
            post_consolidated?: boolean | null;
          } | null;
        };
        if (cancelled) return;
        const schedules = Array.isArray(data.schedules) ? data.schedules : [];
        setCampaigns(schedules);
        if (schedules.some((s) => Boolean(s.last_run_at))) {
          void flushAchievementToasts(["first_scheduled_report_sent"]);
        }

        const row = data.schedule ?? schedules[0] ?? null;
        setScheduleRow(
          row
            ? {
                id: row.id,
                last_run_at: row.last_run_at,
                next_run_at: row.next_run_at,
              }
            : null,
        );
        if (row) {
          setSelectedSchedule(row);
          setSchEnabled(row.enabled);
          setSchDay(row.schedule_day || "monday");
          setSchTime(row.schedule_time || "07:00");
          setSchCampaignId(row.id ?? null);
          setSchName(row.name?.trim() || "Weekly Report");

          const rt = row.is_note_to_self === true
            ? "note_to_self"
            : row.report_type === "internal"
              ? "internal"
              : row.report_type === "note_to_self"
                ? "note_to_self"
                : "external";
          setSchReportType(rt);
          setSchIncludeTickets(row.include_tickets !== false);
          setSchIncludeProjects(row.include_projects !== false);

          setSchEmail(
            rt === "note_to_self" ? userEmail.trim() : (row.email_to || userEmail).trim(),
          );
          {
            const r = row as { email_cc?: unknown; email_bcc?: unknown };
            const ccR = typeof r.email_cc === "string" ? r.email_cc : "";
            const bccR = typeof r.email_bcc === "string" ? r.email_bcc : "";
            setSchEmailCc(ccR);
            setSchEmailBcc(bccR);
            setSchCcBccOpen(ccR.trim().length > 0 || bccR.trim().length > 0);
          }
          setSchRecipientName(row.recipient_name?.trim() || "");
          setSchDateRange(row.date_range || "last_7_days");
          const ticketIds = normalizeCampaignIntIds(row.ticket_client_ids);
          const projectIds = normalizeCampaignIntIds(row.project_client_ids);
          const fallbackIds = normalizeCampaignIntIds(row.client_ids);
          const selectedStIdsRow = normalizeCampaignIntIds(row.selected_ticket_ids);
          const selectedSpIdsRow = normalizeCampaignIntIds(row.selected_project_ids);
          const ticketAll =
            row.ticket_all_clients !== false &&
            ticketIds.length === 0 &&
            selectedStIdsRow.length === 0;
          const projectAll =
            row.project_all_clients !== false &&
            projectIds.length === 0 &&
            selectedSpIdsRow.length === 0;
          setTicketClientMode(ticketAll ? "all" : "selected");
          setProjectClientMode(projectAll ? "all" : "selected");
          setSelectedTicketClients(ticketAll ? [] : ticketIds.length > 0 ? ticketIds : fallbackIds);
          setSelectedProjectClients(projectAll ? [] : projectIds.length > 0 ? projectIds : fallbackIds);
          setSelectedTicketIds(selectedStIdsRow);
          setSelectedProjectIds(selectedSpIdsRow);
          setTicketClientSearch("");
          setProjectClientSearch("");
          setExpandedTicketClients(new Set());
          setExpandedProjectClients(new Set());
          setDataLoaded(false);
          setSchEmailPrefs(normalizePrefsFromApi(row.email_content_prefs));
          setSchAttachExcel(row.attach_excel !== false);
          setSchExcelOptional(selectedExcelKeysFromRow(row.excel_tabs));
          setSchBrandName(
            typeof row.brand_name === "string" && row.brand_name.trim()
              ? row.brand_name
              : profileCompanyName.trim(),
          );
          setSchEmailTone(normalizeSchEmailTone(row.email_tone));
          setSchPushToHalo(row.push_to_halo === true);
          setSchHoldForReview(row.hold_for_review === true);
          setSchHaloPushOutputs(
            Array.isArray(row.halo_push_outputs) && row.halo_push_outputs.length > 0
              ? row.halo_push_outputs
              : ["client_email", "actions", "risks"],
          );
          setSchHaloPushExcel(row.halo_push_excel === true);
          setSchHaloPushExcelTabs(
            Array.isArray(row.halo_push_excel_tabs) ? row.halo_push_excel_tabs : [],
          );
          if (Array.isArray(row.post_to_ticket_ids)) {
            setSchPostToTicketIds(
              row.post_to_ticket_ids.filter((id): id is number => typeof id === "number"),
            );
            postTicketSelectionTouchedRef.current = true;
          } else {
            setSchPostToTicketIds([]);
            postTicketSelectionTouchedRef.current = false;
          }
          setSchPostConsolidated(row.post_consolidated === true);
        } else {
          setSelectedSchedule(null);
          setSchCampaignId(null);
          setSchName("Weekly Report");
          setSchReportType("external");
          setSchIncludeTickets(false);
          setSchIncludeProjects(false);
          setTicketClientMode("all");
          setProjectClientMode("all");
          setSelectedTicketClients([]);
          setSelectedProjectClients([]);
          setSelectedTicketIds([]);
          setSelectedProjectIds([]);
          setTicketClientSearch("");
          setProjectClientSearch("");
          setExpandedTicketClients(new Set());
          setExpandedProjectClients(new Set());
          setDataLoaded(false);
          setSchEnabled(false);
          setSchDay("monday");
          setSchTime("07:00");
          setSchEmail(userEmail);
          setSchEmailCc("");
          setSchEmailBcc("");
          setSchCcBccOpen(false);
          setSchRecipientName("");
          setSchDateRange("last_7_days");
          setSchEmailPrefs({ ...DEFAULT_EMAIL_CONTENT_PREFS });
          setSchAttachExcel(true);
          setSchExcelOptional([...SCHEDULE_EXCEL_CORE_KEYS, ...SCHEDULE_EXCEL_OPTIONAL_TAB_KEYS]);
          setSchBrandName(profileCompanyName.trim());
          setSchEmailTone("professional");
          setSchPushToHalo(false);
          setSchHoldForReview(false);
          setSchHaloPushOutputs(["client_email", "actions", "risks"]);
          setSchHaloPushExcel(false);
          setSchHaloPushExcelTabs([]);
          setSchPostToTicketIds([]);
          setSchPostConsolidated(false);
          postTicketSelectionTouchedRef.current = false;
        }
      } catch {
        /* schedules fetch — table shows empty/stale until retry */
      } finally {
        if (!cancelled) setScheduleLoading(false);
      }
    })();

    void (async () => {
      setDigestLoading(true);
      try {
        const digestRes = await fetch("/api/digest/settings", {
          credentials: "same-origin",
        });
        const digestData = (await digestRes.json()) as {
          settings: typeof digestSettings;
        };
        if (!cancelled) {
          setDigestSettings(
            digestData.settings ?? {
              enabled: false,
              frequency: "weekly",
              send_day: "monday",
              send_time: "08:00",
              delivery_email: true,
              delivery_slack: false,
              delivery_teams: false,
              email_to: userEmail ?? "",
            },
          );
        }
      } catch {
        /* digest panel can render with null settings until loaded */
      } finally {
        if (!cancelled) setDigestLoading(false);
      }
    })();

    void (async () => {
      setHaloClientsScheduleLoading(true);
      try {
        const cres = await fetch("/api/halo/clients?all_pages=1&page_size=1000");
        const cj = (await cres.json()) as {
          clients?: { id: number; name: string }[];
          error?: string;
        };
        const allClients = !cancelled && cres.ok && Array.isArray(cj.clients) ? cj.clients : [];
        if (!cancelled) setHaloClientsForSchedule(allClients);
      } catch {
        if (!cancelled) setHaloClientsForSchedule([]);
      } finally {
        if (!cancelled) setHaloClientsScheduleLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mainView, userEmail, flushAchievementToasts]);

  const saveDigestSettings = useCallback(
    async (updates: Partial<NonNullable<typeof digestSettings>>) => {
      if (!digestSettings) return;
      setDigestSaving(true);
      const merged = {
        ...digestSettings,
        ...updates,
      };
      setDigestSettings(merged);
      try {
        await fetch("/api/digest/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(merged),
        });
      } catch (e) {
        console.error("[digest save]", e);
      } finally {
        setDigestSaving(false);
      }
    },
    [digestSettings],
  );

  const saveNewCiSchedule = useCallback(async () => {
    if (!newCiScheduleClient || !newCiScheduleEmail) return;
    setSavingCiSchedule(true);
    try {
      const isQbr = newCiScheduleType === "qbr";
      const dateRangeMap = {
        weekly: "last_7_days",
        fortnightly: "last_14_days",
        monthly: "last_30_days",
      } as const;
      const date_range = isQbr ? "last_90_days" : dateRangeMap[newCiFrequency];
      const now = new Date();
      const scheduleTimeLondon = newCiScheduleTime.trim() || "08:00";
      const schedule_time = londonWallScheduleTimeToUtcStored(
        scheduleTimeLondon,
        now,
      );
      const nextRun = computeNextRunUtc(newCiScheduleDay, schedule_time, now);

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const fields = {
        name: `${newCiScheduleClient} — ${isQbr ? "Quarterly QBR" : "Monthly Service Review"}`,
        report_type: isQbr ? "ci_qbr" : "external",
        ci_qbr_client_name: newCiScheduleClient,
        email_to: newCiScheduleEmail,
        schedule_day: newCiScheduleDay,
        schedule_time,
        date_range,
        next_run_at: nextRun.toISOString(),
        include_tickets: !isQbr,
        include_projects: !isQbr,
        hold_for_review: newCiHoldForReview === true,
      };

      const wasEditing = !!editingCiScheduleId;

      if (editingCiScheduleId) {
        await supabase
          .from("scheduled_reports")
          .update(fields)
          .eq("id", editingCiScheduleId);
      } else {
        await supabase.from("scheduled_reports").insert({
          user_id: user.id,
          enabled: true,
          ...fields,
        });
      }

      setEditingCiScheduleId(null);
      setScheduledCiOpen(false);
      setNewCiScheduleClient("");
      setNewCiScheduleEmail("");
      setNewCiHoldForReview(false);

      void refreshCampaigns();
      toast({
        message: wasEditing ? "Schedule updated" : "Schedule created",
        variant: "success",
        durationMs: 3000,
      });
    } catch (e) {
      console.error("[ci-schedule save]", e);
      toast({
        message: editingCiScheduleId
          ? "Could not update schedule"
          : "Could not create schedule",
        variant: "error",
        durationMs: 4000,
      });
    } finally {
      setSavingCiSchedule(false);
    }
  }, [
    newCiScheduleClient,
    newCiScheduleEmail,
    newCiScheduleType,
    newCiFrequency,
    newCiScheduleDay,
    newCiScheduleTime,
    newCiHoldForReview,
    editingCiScheduleId,
    campaigns,
    toast,
  ]);

  useEffect(() => {
    if (mainView !== "scheduled") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/client-intelligence/clients");
        const data = (await res.json()) as { clients?: Array<{ name: string }> };
        if (!cancelled && Array.isArray(data.clients)) {
          setCiClients(data.clients.map((c) => ({ name: c.name })));
        }
      } catch (e) {
        console.error("[ci-clients]", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mainView]);

  useEffect(() => {
    if (mainView !== "scheduled") return;
    if (schReportType !== "note_to_self") return;
    if (!userEmail) return;
    setSchEmail(userEmail);
  }, [mainView, schReportType, userEmail]);

  const saveScheduledReport = async () => {
    console.log("[saveScheduledReport] demoModeActive:", demoModeActive, "psaStatus:", psaStatus, "demoForceEnabled:", demoForceEnabled, "demoDisabled:", demoDisabled);
    if (!userEmail) return;

    const existingScheduleIdForCap =
      schCampaignId ?? selectedSchedule?.id ?? scheduleRow?.id ?? null;
    if (noPsaConnected && !existingScheduleIdForCap) {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const uid = user?.id ?? authUserId;
      if (uid) {
        const { count } = await supabase
          .from("scheduled_reports")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid);
        if ((count ?? 0) >= 3) {
          toast({
            message:
              "You can save up to 3 scheduled reports in demo mode. Connect your PSA to unlock unlimited scheduling.",
            variant: "error",
            durationMs: 5000,
          });
          return;
        }
      }
    }

    if (!schIncludeTickets && !schIncludeProjects) {
      toast({
        message: "Enable tickets or projects to continue.",
        variant: "error",
        durationMs: 4000,
      });
      return;
    }
    const hasTicketSelection =
      schIncludeTickets &&
      (ticketClientMode === "all" ||
        selectedTicketClients.length > 0 ||
        selectedTicketIds.length > 0);
    const hasProjectSelection =
      schIncludeProjects &&
      (projectClientMode === "all" ||
        selectedProjectClients.length > 0 ||
        selectedProjectIds.length > 0);
    if (!hasTicketSelection && !hasProjectSelection) {
      toast({
        message:
          "Select at least one ticket or project (or choose All clients for tickets and/or projects).",
        variant: "error",
        durationMs: 4000,
      });
      return;
    }
    if (!hasProAccess) {
      setScheduledReportsProPaywallOpen(true);
      return;
    }
    setScheduleSaving(true);
    try {
      const includeTabsSet = new Set<string>();
      includeTabsSet.add("summary");
      if (schEmailPrefs.include_actions) includeTabsSet.add("actions");
      if (schEmailPrefs.include_risks) includeTabsSet.add("risks");
      if (schEmailPrefs.include_status) includeTabsSet.add("status_report");
      if (schAttachExcel) {
        for (const k of schExcelOptional) includeTabsSet.add(k);
      }
      const excel_tabs = [...schExcelOptional];

      const existingScheduleId = schCampaignId ?? selectedSchedule?.id ?? null;

      const postIdsForSave =
        schPushToHalo &&
        schPostToTicketIds.length === 0 &&
        haloPushScopeRows.length > 0 &&
        !postTicketSelectionTouchedRef.current
          ? haloPushScopeRows.map((r) => r.id)
          : schPostToTicketIds;

      const ticketClientIdsForSave =
        ticketClientMode === "all"
          ? []
          : Array.from(
              new Set([
                ...selectedTicketClients,
                ...selectedTicketIds.flatMap((tid) => {
                  const t = allTickets.find((x) => Number(x.id) === tid);
                  const cid = Number(
                    t?.clientId ?? (t as Record<string, unknown> | undefined)?.client_id,
                  );
                  return Number.isFinite(cid) ? [cid] : [];
                }),
              ]),
            );
      const projectClientIdsForSave =
        projectClientMode === "all"
          ? []
          : Array.from(
              new Set([
                ...selectedProjectClients,
                ...selectedProjectIds.flatMap((pid) => {
                  const t = allProjects.find((x) => Number(x.id) === pid);
                  const cid = Number(
                    t?.clientId ?? (t as Record<string, unknown> | undefined)?.client_id,
                  );
                  return Number.isFinite(cid) ? [cid] : [];
                }),
              ]),
            );
      const clientIdsForSave = Array.from(
        new Set([...ticketClientIdsForSave, ...projectClientIdsForSave]),
      );
      const cwTicketIdsForSave = selectedTicketIds.filter((id) => {
        const t = allTickets.find((x) => Number(x.id) === id);
        const src =
          (t as { _source?: unknown; source?: unknown } | undefined)?._source ??
          (t as { source?: unknown } | undefined)?.source;
        return src === "connectwise";
      });
      const haloTicketIdsForSave = selectedTicketIds.filter((id) => {
        const t = allTickets.find((x) => Number(x.id) === id);
        const src =
          (t as { _source?: unknown; source?: unknown } | undefined)?._source ??
          (t as { source?: unknown } | undefined)?.source;
        return src !== "connectwise";
      });
      const cwProjectIdsForSave = selectedProjectIds.filter((id) => {
        const p = allProjects.find((x) => Number(x.id) === id);
        const src =
          (p as { _source?: unknown; source?: unknown } | undefined)?._source ??
          (p as { source?: unknown } | undefined)?.source;
        return src === "connectwise";
      });
      const haloProjectIdsForSave = selectedProjectIds.filter((id) => {
        const p = allProjects.find((x) => Number(x.id) === id);
        const src =
          (p as { _source?: unknown; source?: unknown } | undefined)?._source ??
          (p as { source?: unknown } | undefined)?.source;
        return src !== "connectwise";
      });

      const campaignSavePayload = {
        enabled: schEnabled,
        schedule_id: existingScheduleId ?? undefined,
        id: existingScheduleId ?? undefined,
        name: schName,
        brand_name: schBrandName.trim() || null,
        report_type: schReportType,
        include_tickets: schIncludeTickets,
        include_projects: schIncludeProjects,
        is_note_to_self: schReportType === "note_to_self",
        schedule_day: schDay,
        schedule_time: schTime,
        email_to:
          schReportType === "note_to_self" ? userEmail : schEmail.trim() || userEmail,
        recipient_name: schRecipientName.trim() || null,
        email_tone: schEmailTone,
        email_cc: schEmailCc.trim() || null,
        email_bcc: schEmailBcc.trim() || null,
        date_range: schDateRange,
        client_ids: clientIdsForSave,
        ticket_client_ids: ticketClientIdsForSave,
        project_client_ids: projectClientIdsForSave,
        ticket_all_clients: ticketClientMode === "all",
        project_all_clients: projectClientMode === "all",
        selected_ticket_ids: haloTicketIdsForSave,
        selected_project_ids: haloProjectIdsForSave,
        cw_ticket_ids: cwTicketIdsForSave,
        cw_project_ids: cwProjectIdsForSave,
        include_tabs: [...includeTabsSet],
        email_content_prefs: { ...schEmailPrefs, include_client_emails: false },
        attach_excel: schAttachExcel,
        excel_tabs,
        push_to_halo: schPushToHalo,
        hold_for_review: schHoldForReview === true,
        halo_push_outputs: schHaloPushOutputs,
        halo_push_excel: schHaloPushExcel,
        halo_push_excel_tabs: schHaloPushExcelTabs,
        halo_push_target: deriveHaloPushTargetForSave(postIdsForSave, haloPushScopeRows),
        post_to_ticket_ids: schPushToHalo ? postIdsForSave : null,
        post_consolidated: schPushToHalo && schPostConsolidated,
      };

      console.log("[campaign save] halo tickets:", haloTicketIdsForSave);
      console.log("[campaign save] halo projects:", haloProjectIdsForSave);
      console.log("[campaign save] cw tickets:", cwTicketIdsForSave);
      console.log("[campaign save] cw projects:", cwProjectIdsForSave);
      console.log("[campaign save] client_ids:", campaignSavePayload.client_ids);
      console.log("[campaign save] ticket_client_ids:", campaignSavePayload.ticket_client_ids);
      console.log("[campaign save] project_client_ids:", campaignSavePayload.project_client_ids);

      const res = await fetch("/api/scheduled-reports", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campaignSavePayload),
      });
      const data = (await res.json()) as {
        schedule?: (typeof campaigns)[number];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "Could not save schedule");
      }
      if (data.schedule) {
        const s = data.schedule;
        if (typeof s.id === "string") setSchCampaignId(s.id);
        setSelectedSchedule(s);
        setScheduleRow({
          id: typeof s.id === "string" ? s.id : undefined,
          last_run_at: s.last_run_at ?? null,
          next_run_at: s.next_run_at ?? null,
        });
      }
      scheduleEmailPreviewCacheRef.current = null;
      const savedSchedule = data.schedule;
      const refreshedList = await refreshCampaigns();
      if (savedSchedule && typeof savedSchedule.id === "string" && savedSchedule.id) {
        const sid = savedSchedule.id;
        const present = (refreshedList ?? []).some((c) => c.id === sid);
        if (!present) {
          setCampaigns((prev) => (prev.some((c) => c.id === sid) ? prev : [savedSchedule, ...prev]));
        }
      }
      toast({
        message: `Schedule created - first report sends on ${formatScheduleTs(
          data.schedule?.next_run_at ?? null,
        )}`,
        durationMs: 2500,
      });
      setScheduleEditorOpen(false);
      void psaScheduledHistory.refetch();
    } catch (e) {
      toast({
        message:
          e instanceof Error && e.message
            ? e.message
            : "Could not save schedule",
        variant: "error",
        durationMs: 4000,
      });
    } finally {
      setScheduleSaving(false);
    }
  };

  const loadScheduleEmailPreview = useCallback(
    async (opts?: { forceRefresh?: boolean; openDialog?: boolean }) => {
      const forceRefresh = opts?.forceRefresh === true;
      const openDialog = opts?.openDialog !== false;
      if (demoModeActive) {
        if (openDialog) {
          toast({
            message: "Connect your PSA to enable scheduled reports",
            variant: "error",
            durationMs: 4000,
          });
        }
        return;
      }
      const scheduleId = (
        schCampaignId ??
        selectedSchedule?.id ??
        scheduleRow?.id ??
        ""
      ).trim();
      if (!scheduleId) {
        if (openDialog) {
          toast({
            message: "Save the campaign first to preview the scheduled email.",
            variant: "error",
            durationMs: 4000,
          });
        }
        return;
      }
      if (openDialog) setScheduleReportPreviewOpen(true);

      const cache = scheduleEmailPreviewCacheRef.current;
      if (
        !forceRefresh &&
        cache &&
        cache.scheduleId === scheduleId &&
        Date.now() - cache.fetchedAt < SCHEDULE_PREVIEW_CACHE_MS
      ) {
        setScheduleEmailPreviewHtml(cache.html);
        setScheduleEmailPreviewGeneratedAt(cache.generatedAt);
        setScheduleEmailPreviewLoading(false);
        setScheduleEmailPreviewError(null);
        return;
      }

      setScheduleEmailPreviewLoading(true);
      setScheduleEmailPreviewError(null);
      if (forceRefresh || !cache || cache.scheduleId !== scheduleId) {
        setScheduleEmailPreviewHtml(null);
      }
      try {
        const res = await fetch(
          `/api/scheduled-reports/preview?scheduleId=${encodeURIComponent(scheduleId)}`,
          { method: "GET" },
        );
        const data = (await res.json()) as {
          html?: string;
          generatedAt?: string;
          error?: string;
          message?: string;
        };
        if (!res.ok || typeof data.html !== "string") {
          const errMsg =
            data.error === "no_tickets" && typeof data.message === "string"
              ? data.message
              : (data.error ?? "Unable to load preview.");
          throw new Error(errMsg);
        }
        const generatedAt =
          typeof data.generatedAt === "string" ? data.generatedAt : new Date().toISOString();
        scheduleEmailPreviewCacheRef.current = {
          scheduleId,
          html: data.html,
          generatedAt,
          fetchedAt: Date.now(),
        };
        setScheduleEmailPreviewHtml(data.html);
        setScheduleEmailPreviewGeneratedAt(generatedAt);
      } catch (error) {
        setScheduleEmailPreviewError(
          error instanceof Error ? error.message : "Unable to load preview.",
        );
        setScheduleEmailPreviewHtml(null);
        setScheduleEmailPreviewGeneratedAt(null);
      } finally {
        setScheduleEmailPreviewLoading(false);
      }
    },
    [schCampaignId, selectedSchedule?.id, scheduleRow?.id, toast, demoModeActive],
  );

  const openScheduleEmailPreview = useCallback(() => {
    void loadScheduleEmailPreview({ openDialog: true });
  }, [loadScheduleEmailPreview]);

  const refreshScheduleEmailPreview = useCallback(() => {
    void loadScheduleEmailPreview({ forceRefresh: true, openDialog: true });
  }, [loadScheduleEmailPreview]);

  useEffect(() => {
    if (!scheduleEditorOpen) return;
    if (schCampaignEditorTab !== 2) return;
    const id = (schCampaignId ?? selectedSchedule?.id ?? scheduleRow?.id ?? "").trim();
    if (!id) return;
    void loadScheduleEmailPreview({ openDialog: false });
  }, [
    scheduleEditorOpen,
    schCampaignEditorTab,
    schCampaignId,
    selectedSchedule?.id,
    scheduleRow?.id,
    loadScheduleEmailPreview,
  ]);

  useEffect(() => {
    if (!scheduleReportPreviewOpen) return;
    const timer = window.setInterval(() => {
      setSchedulePreviewAgeTick((x) => x + 1);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [scheduleReportPreviewOpen]);

  const deleteSchedule = async (scheduleId: string) => {
    setScheduleSaving(true);
    try {
      const res = await fetch("/api/scheduled-reports", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule_id: scheduleId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not delete schedule");
      if (schCampaignId === scheduleId) {
        setSelectedSchedule(null);
        setSchCampaignId(null);
      }
      setCampaigns((prev) => prev.filter((c) => c.id !== scheduleId));
      setScheduleEditorOpen(false);
      setDeleteConfirmScheduleId(null);
      toast({ message: "Schedule deleted", durationMs: 2200 });
    } catch (e) {
      toast({
        message: e instanceof Error ? e.message : "Could not delete schedule",
        variant: "error",
        durationMs: 4000,
      });
    } finally {
      setScheduleSaving(false);
    }
  };

  const triggerScheduleNow = async (
    scheduleId: string,
    reportType?: string | null,
    ciClientName?: string | null,
  ) => {
    setSendingNowId(scheduleId);
    setScheduleSaving(true);
    try {
      const endpoint =
        reportType === "ci_qbr"
          ? "/api/cron/trigger-ci-qbr-now"
          : ciClientName
            ? "/api/cron/trigger-ci-service-review-now"
            : "/api/cron/trigger-now";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId }),
      });
      const data = (await res.json()) as {
        error?: string;
        results?: Array<{ success: boolean; held?: boolean; error?: string }>;
      };
      if (!res.ok) throw new Error(data.error || "Could not trigger schedule");
      const first = data.results?.[0];
        if (first?.held) {
        toast({
          message: "Report generated and is awaiting your approval",
          durationMs: 3500,
        });
        void fetch("/api/pending-approvals/count")
          .then((r) => r.json())
          .then((d: { count?: number }) => {
            if (typeof d.count === "number") setPendingApprovalsCount(d.count);
          })
          .catch(() => undefined);
      } else if (first?.success) {
        toast({ message: "Report sent successfully", durationMs: 2500 });
      } else {
        const reason = first?.error;
        const friendlyMessage =
          reason === "no_connection"
            ? "No PSA connected - connect HaloPSA or ConnectWise first"
            : reason === "HTTP 200"
              ? "This client has no PSA data yet - connect a PSA or use Client Intelligence reports instead"
              : "Failed to send report - please try again";

        toast({
          message: friendlyMessage,
          variant: "error",
          durationMs: 4000,
        });
      }
      await refreshCampaigns();
    } catch (e) {
      toast({
        message: "Failed to send report - please try again",
        variant: "error",
        durationMs: 4000,
      });
    } finally {
      setScheduleSaving(false);
      setSendingNowId(null);
    }
  };

  const fetchPendingApprovalsCount = useCallback(async () => {
    if (!userEmail) return;
    try {
      const res = await fetch("/api/pending-approvals/count");
      const data = (await res.json()) as { count?: number };
      if (res.ok && typeof data.count === "number") {
        setPendingApprovalsCount(data.count);
      }
    } catch {
      /* ignore */
    }
  }, [userEmail]);

  const loadPendingApprovals = useCallback(async () => {
    if (!userEmail) return;
    setPendingApprovalsLoading(true);
    try {
      const res = await fetch("/api/pending-approvals");
      const data = (await res.json()) as {
        approvals?: Array<{
          id: string;
          schedule_id: string | null;
          source: string;
          created_at: string;
          schedule_name: string | null;
          client_label: string | null;
          subject: string | null;
          text: string | null;
          html: string | null;
        }>;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Could not load approvals");
      const list = Array.isArray(data.approvals) ? data.approvals : [];
      setPendingApprovals(list);
      setPendingApprovalsCount(list.length);
    } catch (e) {
      toast({
        message: e instanceof Error ? e.message : "Could not load approvals",
        variant: "error",
        durationMs: 4000,
      });
      setPendingApprovals([]);
    } finally {
      setPendingApprovalsLoading(false);
    }
  }, [userEmail, toast]);

  const runApprovalAction = useCallback(
    async (
      approvalId: string,
      action: "approve" | "reject" | "approve_and_stop",
    ) => {
      setApprovalActionId(approvalId);
      try {
        const res = await fetch(`/api/pending-approvals/${approvalId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const data = (await res.json()) as { error?: string; success?: boolean };
        if (!res.ok) throw new Error(data.error || "Action failed");

        setPendingApprovals((prev) => prev.filter((row) => row.id !== approvalId));
        setPendingApprovalsCount((prev) => Math.max(0, prev - 1));
        setRejectConfirmApprovalId(null);
        setExpandedApprovalIds((prev) => {
          const next = new Set(prev);
          next.delete(approvalId);
          return next;
        });

        if (action === "reject") {
          toast({ message: "Report rejected", durationMs: 3000 });
        } else if (action === "approve_and_stop") {
          toast({
            message:
              "Report sent. Future reports from this schedule will send automatically.",
            durationMs: 4000,
          });
          void refreshCampaigns();
        } else {
          toast({ message: "Report sent", durationMs: 3000 });
          void refreshCampaigns();
        }
      } catch (e) {
        toast({
          message: e instanceof Error ? e.message : "Could not complete action",
          variant: "error",
          durationMs: 4000,
        });
      } finally {
        setApprovalActionId(null);
      }
    },
    [toast, refreshCampaigns],
  );

  useEffect(() => {
    if (!userEmail) return;
    void fetchPendingApprovalsCount();
    const timer = window.setInterval(() => {
      void fetchPendingApprovalsCount();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [userEmail, fetchPendingApprovalsCount]);

  useEffect(() => {
    if (!userEmail) return;
    if (mainView === "approvals") {
      void loadPendingApprovals();
      return;
    }
    void fetchPendingApprovalsCount();
  }, [mainView, userEmail, loadPendingApprovals, fetchPendingApprovalsCount]);

  const handleSelectProject = useCallback(
    (project: ProjectItem) => {
      setLastSessionRestoreBannerProject(null);
      setMainView("generate");
      setSelectedProjectId(project.id);
      setProjectName(project.project_name ?? "");
      setInput(project.input_text ?? "");
      const restoredInput = project.input_text ?? "";
      if (parseCwImportedItemsFromInput(restoredInput).length > 0) {
        setLastImportSourcePsa("connectwise");
      } else if (restoredInput.includes("Source: HaloPSA")) {
        setLastImportSourcePsa("halopsa");
      }
      setGenerationMailtoEmail(null);
      if (project.output_json) {
        setResult(parseApiGenerateResult(project.output_json));
      }
      setSavedGenerationId(project.id);
      setGenerationRating(null);
      setLastGeneratedTone(GENERATION_EMAIL_TONE);
      setSidebarOpenMobile(false);
      const haloRows = Array.isArray(cachedHaloTickets?.tickets)
        ? (cachedHaloTickets.tickets as Array<Record<string, unknown>>)
        : [];
      setLastImportedHaloItems(restoreImportedItemsForHistory(project.input_text ?? "", haloRows));
      const restoredLabel =
        typeof project.project_name === "string" ? project.project_name.trim() : "";
      toast({
        message: restoredLabel ? `Restored - ${restoredLabel}` : "History restored",
        durationMs: 3000,
      });
    },
    [toast, cachedHaloTickets?.tickets],
  );

  useEffect(() => {
    if (!selectedProjectId) return;
    if (lastImportedHaloItems.length > 0) return;
    const p = projects.find((x) => x.id === selectedProjectId);
    const inputText = p?.input_text ?? "";
    if (!inputText) return;
    if (parseCwImportedItemsFromInput(inputText).length > 0) return;
    const haloRows = Array.isArray(cachedHaloTickets?.tickets)
      ? (cachedHaloTickets.tickets as Array<Record<string, unknown>>)
      : [];
    if (haloRows.length === 0) return;
    const next = restoreImportedItemsForHistory(inputText, haloRows);
    if (next.length === 0) return;
    setLastImportedHaloItems(next);
  }, [selectedProjectId, projects, cachedHaloTickets?.tickets, lastImportedHaloItems.length]);

  const rateGeneration = useCallback(
    async (generationId: string, rating: "positive" | "negative") => {
      setGenerationRating(rating);
      try {
        await fetch(`/api/generations/${generationId}/rate`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating }),
          credentials: "same-origin",
        });
      } catch {
        // Non-blocking — rating failure should not affect UX
      }
    },
    [],
  );

  const loadCompare = useCallback(async () => {
    if (!savedGenerationId) return;

    const clientNameForCompare =
      projectName.trim() ||
      (() => {
        const m = input.match(/^Client:\s*(.+)$/im);
        return m?.[1]?.trim() ?? "";
      })();

    if (!clientNameForCompare) return;

    setCompareLoading(true);
    setCompareResult(null);
    setCompareNoPrevious(false);

    try {
      const res = await fetch("/api/client-intelligence/compare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          currentGenerationId: savedGenerationId,
          clientName: clientNameForCompare,
        }),
      });
      const data = (await res.json()) as {
        comparison?: typeof compareResult;
        noPrevious?: boolean;
      };
      if (data.noPrevious) {
        setCompareNoPrevious(true);
      } else {
        setCompareResult(data.comparison ?? null);
      }
    } catch (e) {
      console.error("[compare]", e);
    } finally {
      setCompareLoading(false);
    }
  }, [savedGenerationId, projectName, input]);

  const resetGenerateToEmpty = useCallback(() => {
    setMainView("generate");
    setSelectedProjectId(null);
    setInput("");
    setProjectName("");
    setClientContactName("");
    setClientContactEmail("");
    setGenerationMailtoEmail(null);
    setResult(null);
    setSavedGenerationId(null);
    setGenerationRating(null);
    setError(null);
    setEditingField(null);
    setEditingActionRow(null);
    setEditingRiskRow(null);
    setEditingDueDateRow(null);
    setLastInput("");
    setLastGeneratedTone(GENERATION_EMAIL_TONE);
    setLastSessionRestoreBannerProject(null);
    setLastImportedHaloItems([]);
    setLastInputQuality(null);
    setLastImportSourcePsa(null);
    setIsInputCollapsed(false);
    setGenerateManualExpanded(false);
    setImportedFileName(null);
    setImportedFileTypeLabel(null);
    setStagedGenerationReady(false);
    setCompareResult(null);
    setHasPreviousReport(false);
    setStagedCompareExample(false);
  }, []);

  const handleNewGeneration = () => {
    resetGenerateToEmpty();
  };

  const markOnboardingComplete = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
    await refreshShellData();
    setOnboardingRequiredExplicit(false);
    setOnboardingOverlayOpen(false);
  }, [refreshShellData]);

  const markTourCompleted = useCallback(async () => {
    setTourCompleted(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from("profiles")
        .update({ tour_completed: true })
        .eq("id", user.id);
      if (error) return;
      await refreshShellData();
      if (tourCompletionCelebrationFiredRef.current) return;
      tourCompletionCelebrationFiredRef.current = true;
      const confetti = (await import("canvas-confetti")).default;
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#38bdf8", "#1e3a5f", "#ffffff", "#7dd3fc"],
      });
      toast({
        variant: "achievement",
        message: "Achievement Unlocked 🏆",
        subtitle: "You've completed the Handover tour. You're ready to go.",
        durationMs: 5000,
      });
    } catch {
      /* ignore */
    }
  }, [refreshShellData, toast]);

  const saveOnboardingProfileStep = useCallback(async (): Promise<boolean> => {
    const fn = profileFirstName.trim();
    const ln = profileLastName.trim();
    const displayFromNames = fn && ln ? `${fn} ${ln}` : null;
    const res = await fetch("/api/profile/update", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: fn || null,
        last_name: ln || null,
        display_name: profileDisplayName.trim() || displayFromNames,
        job_title: profileJobTitle.trim() || null,
        company_name: profileCompanyName.trim() || null,
        output_language: profileOutputLanguage.trim() || "English",
        signature_override: signatureOverride.trim() || null,
      }),
    });
    if (!res.ok) {
      toast({ message: "Could not save profile", variant: "error", durationMs: 4000 });
      return false;
    }
    await refreshShellData();
    return true;
  }, [
    profileFirstName,
    profileLastName,
    profileDisplayName,
    profileJobTitle,
    profileCompanyName,
    profileOutputLanguage,
    signatureOverride,
    refreshShellData,
    toast,
  ]);

  const saveBrandingSettings = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    let primaryErr = "";
    let secondaryErr = "";
    if (!HEX_COLOUR_6.test(brandColour.trim())) {
      primaryErr = "Enter a valid hex colour (#RRGGBB).";
    }
    if (!HEX_COLOUR_6.test(brandSecondaryColour.trim())) {
      secondaryErr = "Enter a valid hex colour (#RRGGBB).";
    }
    setBrandColourError(primaryErr);
    setBrandSecondaryColourError(secondaryErr);
    if (primaryErr || secondaryErr) {
      toast({
        message: "Fix colour values before saving.",
        variant: "error",
        durationMs: 4000,
      });
      return;
    }
    const normalizedColour = `#${brandColour.trim().replace(/^#/, "").toLowerCase()}`;
    const normalizedSecondary = `#${brandSecondaryColour.trim().replace(/^#/, "").toLowerCase()}`;
    const res = await fetch("/api/profile/branding", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brand_name: brandName.trim(),
        brand_colour: normalizedColour,
        brand_secondary_colour: normalizedSecondary,
        brand_logo_url: brandLogoUrl.trim(),
        white_label_mode: whiteLabelMode,
      }),
    });
    const payload = (await res.json().catch(() => ({}))) as {
      error?: string;
      white_label_mode?: boolean;
      ok?: boolean;
    };
    if (!res.ok) {
      console.error("[branding] save failed:", { status: res.status, payload });
      if (res.status === 403) {
        toast({
          message: payload.error ?? "White label mode is included with Handover.",
          variant: "error",
          durationMs: 5000,
        });
        setWhiteLabelMode(false);
      } else {
        setError("Failed to save branding settings.");
      }
      return;
    }
    setBrandColour(formatHex6Display(normalizedColour));
    setBrandSecondaryColour(formatHex6Display(normalizedSecondary));
    setBrandColourError("");
    setBrandSecondaryColourError("");
    if (typeof payload.white_label_mode === "boolean") {
      setWhiteLabelMode(payload.white_label_mode);
      console.log("[branding] profiles.white_label_mode after save:", payload.white_label_mode);
    }
    toast({ message: "Branding saved successfully", durationMs: 2000 });
    if (brandLogoUrl.trim()) {
      setBrandLogoPreviewKey((k) => k + 1);
    }
    await mutate("/api/profile");
    await mutate("/api/profile/branding");
    window.dispatchEvent(new Event("handover:profile-reload"));
    await refreshShellData();
  };

  const uploadBrandLogo = async (file: File | null) => {
    if (!file) return;
    setBrandLogoUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      if (file.size > 2 * 1024 * 1024) {
        setError("Logo must be under 2MB.");
        return;
      }
      if (!file.type.startsWith("image/")) {
        setError("Please choose an image file.");
        return;
      }
      const formData = new FormData();
      formData.set("logo", file);
      const res = await fetch("/api/brand/upload-logo", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      const payload = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        throw new Error(payload.error ?? "Upload failed.");
      }
      const uploadedUrl = payload.url;
      if (!uploadedUrl?.trim()) {
        throw new Error("Upload succeeded but no public URL was returned.");
      }
      setBrandLogoUrl(uploadedUrl);
      setBrandLogoPreviewKey((k) => k + 1);
      const { error: upsertErr } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          brand_logo_url: uploadedUrl,
        },
        { onConflict: "id" },
      );
      if (upsertErr) {
        throw new Error(upsertErr.message);
      }
      await refreshShellData();
      toast({ message: "Logo uploaded", durationMs: 2000 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload logo.");
    } finally {
      setBrandLogoUploading(false);
    }
  };

  const brandingColoursForApi = useCallback(() => {
    const bc = HEX_COLOUR_6.test(brandColour.trim())
      ? `#${brandColour.trim().replace(/^#/, "").toLowerCase()}`
      : "#2563eb";
    const bs = HEX_COLOUR_6.test(brandSecondaryColour.trim())
      ? `#${brandSecondaryColour.trim().replace(/^#/, "").toLowerCase()}`
      : "#1e40af";
    return { bc, bs };
  }, [brandColour, brandSecondaryColour]);

  const removeBrandLogo = async () => {
    const {
      data: { user },
    } = await createClient().auth.getUser();
    if (!user) return;
    const { bc, bs } = brandingColoursForApi();
    const res = await fetch("/api/profile/branding", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brand_name: brandName.trim(),
        brand_colour: bc,
        brand_secondary_colour: bs,
        brand_logo_url: "",
        white_label_mode: whiteLabelMode,
      }),
    });
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      toast({
        message: payload.error ?? "Could not remove logo.",
        variant: "error",
        durationMs: 4000,
      });
      return;
    }
    setBrandLogoUrl("");
    setBrandLogoPreviewKey((k) => k + 1);
    if (logoFileInputRef.current) {
      logoFileInputRef.current.value = "";
    }
    toast({ message: "Logo removed", durationMs: 2000 });
    await refreshShellData();
  };

  const resetBrandPrimaryColour = async () => {
    const {
      data: { user },
    } = await createClient().auth.getUser();
    if (!user) return;
    const secondary = HEX_COLOUR_6.test(brandSecondaryColour.trim())
      ? `#${brandSecondaryColour.trim().replace(/^#/, "").toLowerCase()}`
      : "#1e40af";
    const res = await fetch("/api/profile/branding", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brand_name: brandName.trim(),
        brand_colour: "#2563eb",
        brand_secondary_colour: secondary,
        brand_logo_url: brandLogoUrl.trim(),
        white_label_mode: whiteLabelMode,
      }),
    });
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      toast({
        message: payload.error ?? "Could not reset colour.",
        variant: "error",
        durationMs: 4000,
      });
      return;
    }
    setBrandColour(HANDOVER_BRAND_PRIMARY_HEX);
    setBrandColourError("");
    toast({ message: "Primary colour reset to Handover default", durationMs: 2000 });
    await refreshShellData();
  };

  const resetBrandSecondaryColour = async () => {
    const {
      data: { user },
    } = await createClient().auth.getUser();
    if (!user) return;
    const primary = HEX_COLOUR_6.test(brandColour.trim())
      ? `#${brandColour.trim().replace(/^#/, "").toLowerCase()}`
      : "#2563eb";
    const res = await fetch("/api/profile/branding", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brand_name: brandName.trim(),
        brand_colour: primary,
        brand_secondary_colour: "#1e40af",
        brand_logo_url: brandLogoUrl.trim(),
        white_label_mode: whiteLabelMode,
      }),
    });
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      toast({
        message: payload.error ?? "Could not reset colour.",
        variant: "error",
        durationMs: 4000,
      });
      return;
    }
    setBrandSecondaryColour(HANDOVER_BRAND_SECONDARY_HEX);
    setBrandSecondaryColourError("");
    toast({ message: "Accent colour reset to Handover default", durationMs: 2000 });
    await refreshShellData();
  };

  const saveSettings = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { bc, bs } = brandingColoursForApi();
    const { error: upsertErr } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        first_name: profileFirstName.trim() || null,
        last_name: profileLastName.trim() || null,
        display_name: profileDisplayName.trim() || null,
        job_title: profileJobTitle.trim() || null,
        company_name: profileCompanyName.trim() || null,
        brand_name: brandName.trim() || null,
        brand_colour: bc,
        brand_secondary_colour: bs,
        brand_logo_url: brandLogoUrl.trim() || null,
        compact_mode: compactMode,
        show_character_count: showCharacterCount,
        privacy_mode: privacyMode,
      },
      { onConflict: "id" },
    );
    if (upsertErr) {
      setError("Failed to save settings.");
      return;
    }
    toast({ message: "Settings saved", durationMs: 2000 });
    await refreshShellData();
  };

  const savePortalSlug = useCallback(async (overrideSlug?: string): Promise<boolean> => {
    const slug = sanitizePortalSlug(overrideSlug ?? portalSlug);
    if (!PORTAL_SLUG_RE.test(slug)) {
      toast({ message: "Slug must be 3-30 chars: a-z, 0-9, or hyphen.", variant: "error" });
      return false;
    }
    setPortalSlugSaving(true);
    try {
      const res = await fetch("/api/portal/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          slug,
          display_name: profileCompanyName.trim() || profileDisplayName.trim() || null,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast({
          message: body.error ?? "Could not save portal URL",
          variant: "error",
          durationMs: 4000,
        });
        return false;
      }
      setPortalSlug(slug);
      setPortalSlugAvailable(true);
      toast({ message: "Portal URL saved", durationMs: 2000 });
      return true;
    } finally {
      setPortalSlugSaving(false);
    }
  }, [portalSlug, profileCompanyName, profileDisplayName, toast]);

  const completeEnterpriseOnboardingWithSlug = useCallback(
    async (slug: string) => {
      const ok = await savePortalSlug(slug);
      if (!ok) return;
      await markOnboardingComplete();
      setMainView("generate");
    },
    [markOnboardingComplete, savePortalSlug],
  );

  const saveOutputTabPreferences = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const payload = {
      coreOutputs: MODAL_OUTPUT_KEYS.filter((k) => outputPrefs[k]),
      extendedTabs: EXTENDED_PM_TAB_KEYS.filter((k) => extendedOutputPrefs[k]),
    };
    const { error } = await supabase
      .from("profiles")
      .update({ output_preferences: payload })
      .eq("id", user.id);
    if (error) {
      setError("Failed to save output tab preferences.");
      return;
    }
    saveOutputPrefs(outputPrefs);
    saveExtendedOutputPrefs(extendedOutputPrefs);
    toast({ message: "Output preferences saved", durationMs: 2000 });
    await refreshShellData();
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    window.localStorage.setItem("handover-theme", next);
  };
  const saveSignatureOverride = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error: upsertErr } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        signature_override: signatureOverride.trim() || null,
      },
      { onConflict: "id" },
    );
    if (upsertErr) {
      setError("Failed to save signature.");
      return;
    }
    await refreshShellData();
    toast({ message: "Settings saved", durationMs: 2000 });
  };

  const WRITING_STYLE_MAX = 500;

  const saveWritingStyle = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const trimmed = writingStyle.trim().slice(0, WRITING_STYLE_MAX);
    const { error: upsertErr } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        writing_style: trimmed || null,
      },
      { onConflict: "id" },
    );
    if (upsertErr) {
      setError("Failed to save writing style.");
      return;
    }
    setWritingStyle(trimmed);
    await refreshShellData();
    toast({ message: "Settings saved", durationMs: 2000 });
  };

  const handleHaloConnect = async () => {
    if (haloLoading) return;
    setHaloLoading(true);
    setHaloError(null);
    try {
      const res = await fetch("/api/halo/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          haloUrl: normalizeHaloUrlForSubmit(haloUrl),
          tenant: haloTenant.trim() || null,
          clientId: haloClientId.trim(),
          clientSecret: haloClientSecret,
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        warnings?: string[];
      };
      if (res.status === 403 && data.error === "pro_required") {
        setHaloProModalOpen(true);
        return;
      }
      if (!res.ok || !data.success) {
        const err =
          data.error ?? "Connection failed - check your credentials";
        setHaloError(err);
        toast({
          message: err,
          variant: "error",
          durationMs: 5000,
        });
        return;
      }
      setHaloReconnectRecommended(false);
      setHaloPermissionWarning(
        Array.isArray(data.warnings) && data.warnings.length > 0
          ? data.warnings[0]
          : null,
      );
      setHaloClientSecret("");
      toast({ message: "HaloPSA connected", durationMs: 3000 });
      await refreshShellData();
    } catch {
      setHaloError("Connection failed - check your credentials");
      toast({
        message: "Connection failed - check your credentials",
        variant: "error",
        durationMs: 5000,
      });
    } finally {
      setHaloLoading(false);
    }
  };

  const handleHaloDisconnect = async () => {
    const confirmed = window.confirm(
      "This will remove your HaloPSA connection. Are you sure?",
    );
    if (!confirmed) return;
    setHaloLoading(true);
    setHaloError(null);
    try {
      const res = await fetch("/api/halo/connect", { method: "DELETE" });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        const err = data.error ?? "Failed to disconnect HaloPSA.";
        setHaloError(err);
        toast({ message: err, variant: "error", durationMs: 5000 });
        return;
      }
      setHaloReconnectRecommended(false);
      setHaloClientSecret("");
      setHaloPermissionWarning(null);
      setHaloAutoClosureSummary(false);
      await refreshShellData();
      toast({ message: "HaloPSA disconnected", durationMs: 3000 });
    } catch {
      setHaloError("Failed to disconnect HaloPSA.");
      toast({
        message: "Failed to disconnect HaloPSA.",
        variant: "error",
        durationMs: 5000,
      });
    } finally {
      setHaloLoading(false);
    }
  };

  const handleHaloTestConnection = async () => {
    if (haloTestLoading) return;
    setHaloTestLoading(true);
    setHaloError(null);
    try {
      const res = await fetch("/api/halo/test");
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Connection test failed.");
      }
      toast({ message: "Connection successful", durationMs: 3000 });
      await refreshShellData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Connection test failed.";
      setHaloError(msg);
      toast({ message: "Connection test failed", subtitle: msg, variant: "error" });
    } finally {
      setHaloTestLoading(false);
    }
  };

  const patchNotificationWebhooks = async (body: Record<string, unknown>) => {
    const res = await fetch("/api/profile/notification-webhooks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { error?: string };
    if (res.status === 403 && data.error === "pro_required") {
      setHaloProModalOpen(true);
      return false;
    }
    if (!res.ok) {
      toast({
        message: data.error ?? "Could not save notification settings.",
        variant: "error",
        durationMs: 5000,
      });
      return false;
    }
    return true;
  };

  const handleSlackNotificationsToggle = async (enabled: boolean) => {
    const prev = slackNotificationsEnabled;
    setSlackNotificationsEnabled(enabled);
    const ok = await patchNotificationWebhooks({ slack_notifications_enabled: enabled });
    if (!ok) setSlackNotificationsEnabled(prev);
    else {
      await refreshShellData();
      toast({ message: "Slack notifications updated", durationMs: 2000 });
    }
  };

  const handleTeamsNotificationsToggle = async (enabled: boolean) => {
    const prev = teamsNotificationsEnabled;
    setTeamsNotificationsEnabled(enabled);
    const ok = await patchNotificationWebhooks({ teams_notifications_enabled: enabled });
    if (!ok) setTeamsNotificationsEnabled(prev);
    else {
      await refreshShellData();
      toast({ message: "Teams notifications updated", durationMs: 2000 });
    }
  };

  const handleSaveSlackWebhook = async () => {
    if (slackWebhookSaveLoading) return;
    setSlackWebhookSaveLoading(true);
    try {
      const ok = await patchNotificationWebhooks({ slack_webhook_url: slackWebhookUrl.trim() });
      if (ok) {
        await refreshShellData();
        toast({ message: "Slack webhook saved", durationMs: 2000 });
      }
    } finally {
      setSlackWebhookSaveLoading(false);
    }
  };

  const handleSaveTeamsWebhook = async () => {
    if (teamsWebhookSaveLoading) return;
    setTeamsWebhookSaveLoading(true);
    try {
      const ok = await patchNotificationWebhooks({ teams_webhook_url: teamsWebhookUrl.trim() });
      if (ok) {
        await refreshShellData();
        toast({ message: "Teams webhook saved", durationMs: 2000 });
      }
    } finally {
      setTeamsWebhookSaveLoading(false);
    }
  };

  const handleDisconnectSlackNotifications = async () => {
    const ok = await patchNotificationWebhooks({
      slack_webhook_url: "",
      slack_notifications_enabled: false,
    });
    if (ok) {
      setSlackWebhookUrl("");
      setSlackNotificationsEnabled(false);
      await refreshShellData();
      toast({ message: "Slack disconnected", durationMs: 2000 });
    }
  };

  const handleDisconnectTeamsNotifications = async () => {
    const ok = await patchNotificationWebhooks({
      teams_webhook_url: "",
      teams_notifications_enabled: false,
    });
    if (ok) {
      setTeamsWebhookUrl("");
      setTeamsNotificationsEnabled(false);
      await refreshShellData();
      toast({ message: "Teams disconnected", durationMs: 2000 });
    }
  };

  const handleTestSlackWebhook = async () => {
    if (slackWebhookTestLoading) return;
    const url = slackWebhookUrl.trim();
    if (!url) {
      toast({ message: "Paste a webhook URL first.", variant: "error", durationMs: 4000 });
      return;
    }
    setSlackWebhookTestLoading(true);
    try {
      const res = await fetch("/api/integrations/test-chat-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "slack", webhookUrl: url }),
      });
      const data = (await res.json()) as { error?: string; detail?: string };
      if (!res.ok) {
        toast({
          message: data.error ?? "Test failed",
          subtitle: data.detail,
          variant: "error",
          durationMs: 6000,
        });
        return;
      }
      toast({ message: "Test message sent to Slack", durationMs: 3000 });
    } catch {
      toast({ message: "Test request failed.", variant: "error", durationMs: 5000 });
    } finally {
      setSlackWebhookTestLoading(false);
    }
  };

  const handleTestTeamsWebhook = async () => {
    if (teamsWebhookTestLoading) return;
    const url = teamsWebhookUrl.trim();
    if (!url) {
      toast({ message: "Paste a webhook URL first.", variant: "error", durationMs: 4000 });
      return;
    }
    setTeamsWebhookTestLoading(true);
    try {
      const res = await fetch("/api/integrations/test-chat-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "teams", webhookUrl: url }),
      });
      const data = (await res.json()) as { error?: string; detail?: string };
      if (!res.ok) {
        toast({
          message: data.error ?? "Test failed",
          subtitle: data.detail,
          variant: "error",
          durationMs: 6000,
        });
        return;
      }
      toast({ message: "Test message sent to Teams", durationMs: 3000 });
    } catch {
      toast({ message: "Test request failed.", variant: "error", durationMs: 5000 });
    } finally {
      setTeamsWebhookTestLoading(false);
    }
  };

  const handleCwSave = async () => {
    if (cwSaveLoading) return;
    setCwSaveLoading(true);
    setCwError(null);
    setCwTestOk(null);
    setCwTestMessage(null);
    try {
      const res = await fetch("/api/cw/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteUrl: cwSiteUrlInput.trim(),
          companyId: cwCompanyIdInput.trim(),
          publicKey: cwPublicKeyInput.trim(),
          privateKey: cwPrivateKeyInput,
          clientId: cwClientIdInput.trim(),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        const err = data.error ?? "Failed to save ConnectWise connection.";
        setCwError(err);
        toast({ message: err, variant: "error", durationMs: 5000 });
        return;
      }
      setCwPrivateKeyInput("");
      setCwConfigOpen(false);
      toast({ message: "ConnectWise connected", durationMs: 3000 });
      await refreshShellData();
    } catch {
      const err = "Failed to save ConnectWise connection.";
      setCwError(err);
      toast({ message: err, variant: "error", durationMs: 5000 });
    } finally {
      setCwSaveLoading(false);
    }
  };

  const handleCwDisconnect = async () => {
    const confirmed = window.confirm(
      "This will remove your ConnectWise connection. Are you sure?",
    );
    if (!confirmed) return;
    setCwSaveLoading(true);
    setCwError(null);
    setCwTestOk(null);
    setCwTestMessage(null);
    try {
      const res = await fetch("/api/cw/connect", { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        const err = data.error ?? "Failed to disconnect ConnectWise.";
        setCwError(err);
        toast({ message: err, variant: "error", durationMs: 5000 });
        return;
      }
      setCwPrivateKeyInput("");
      toast({ message: "ConnectWise disconnected", durationMs: 3000 });
      await refreshShellData();
    } catch {
      setCwError("Failed to disconnect ConnectWise.");
      toast({
        message: "Failed to disconnect ConnectWise.",
        variant: "error",
        durationMs: 5000,
      });
    } finally {
      setCwSaveLoading(false);
    }
  };

  const handleCwTestConnection = async () => {
    if (cwTestLoading) return;
    setCwTestLoading(true);
    setCwError(null);
    setCwTestOk(null);
    setCwTestMessage(null);
    try {
      if (cwConnected) {
        const res = await fetch("/api/cw/test");
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          const msg = data.error ?? "Connection test failed.";
          setCwTestOk(false);
          setCwTestMessage(msg);
          toast({ message: "ConnectWise test failed", subtitle: msg, variant: "error" });
          return;
        }
        setCwTestOk(true);
        setCwTestMessage(null);
        toast({ message: "Connection successful", durationMs: 3000 });
        return;
      }
      const res = await fetch("/api/cw/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteUrl: cwSiteUrlInput.trim(),
          companyId: cwCompanyIdInput.trim(),
          publicKey: cwPublicKeyInput.trim(),
          privateKey: cwPrivateKeyInput,
          clientId: cwClientIdInput.trim(),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        const msg = data.error ?? "Connection test failed.";
        setCwTestOk(false);
        setCwTestMessage(msg);
        toast({ message: "ConnectWise test failed", subtitle: msg, variant: "error" });
        return;
      }
      setCwTestOk(true);
      setCwTestMessage(null);
      toast({ message: "Connection successful", durationMs: 3000 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Connection test failed.";
      setCwTestOk(false);
      setCwTestMessage(msg);
      toast({ message: "ConnectWise test failed", subtitle: msg, variant: "error" });
    } finally {
      setCwTestLoading(false);
    }
  };

  const handleImportFile = async (file: File | null) => {
    if (!file) return;
    const fmt = detectImportFileFormat(file.name);
    if (!fmt) {
      toast({
        message: "Unsupported file type",
        subtitle: "Use CSV (.csv), Excel (.xlsx, .xls), or Word (.docx).",
        variant: "error",
        durationMs: 4000,
      });
      return;
    }

    try {
      let parsed = "";
      if (fmt === "csv") {
        parsed = await parseCSVFile(file);
      } else if (fmt === "excel") {
        parsed = await parseExcelFileToImportText(file);
      } else {
        parsed = await parseDocxFileToImportText(file);
      }

      if (!parsed.trim()) {
        throw new Error(IMPORT_FILE_PARSE_ERROR_MESSAGE);
      }

      setInput(parsed);
      setImportedFileName(file.name);
      const typeLabel = formatImportedFileTypeLabel(file.name, fmt);
      setImportedFileTypeLabel(typeLabel);
      const lines = parsed.split("\n").filter((line) => line.trim().length > 0).length;
      toast({
        message: "File imported",
        subtitle: `${typeLabel} · ${lines} lines`,
        durationMs: 3000,
      });
    } catch (e) {
      setImportedFileName(null);
      setImportedFileTypeLabel(null);
      if (fmt === "csv" && e instanceof Error && e.message.trim()) {
        toast({
          message: e.message,
          variant: "error",
          durationMs: 5000,
        });
      } else {
        toast({
          message: IMPORT_FILE_PARSE_ERROR_MESSAGE,
          variant: "error",
          durationMs: 5000,
        });
      }
    }
  };

  const requestFullGeneration = async () => {
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;

    setIsCheckingAuthForGenerate(true);
    try {
      const supabase = createClient();
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        if (trimmed === DEMO_EXAMPLE_INPUT.trim()) {
          setDemoTab("actions");
          setDemoModalOpen(true);
        } else {
          setLockedTeaserTab("actions");
          setLockedTeaserOpen(true);
        }
        return;
      }

      if (freeGenUsage && freeGenUsage.used >= freeGenUsage.cap) {
        setHardLimitType("trial");
        setPremiumHardLimitOpen(true);
        return;
      }
      if (showPro100Warning) {
        toast({
          message: "You’ve reached your monthly limit. Move to Handover to continue generating.",
          variant: "error",
          durationMs: 5000,
        });
        return;
      }

      if (MODAL_OUTPUT_KEYS.filter((k) => outputPrefs[k]).length === 0) {
        toast({
          message: "Enable at least one output in Settings → Output tabs, then generate again.",
          variant: "error",
          durationMs: 5000,
        });
        return;
      }

      if (stagedGenerationReady) {
        void executeStagedOnboardingGenerate(outputPrefs);
        return;
      }

      void executeGenerate(outputPrefs);
    } finally {
      setIsCheckingAuthForGenerate(false);
    }
  };

  const executeStagedOnboardingGenerate = async (
    selection: Record<ModalOutputKey, boolean>,
  ) => {
    const trimmed = input.trim();
    const effectiveInput = trimmed || lastInput.trim();
    if (isGenerating) return;
    if (!effectiveInput || effectiveInput.length < 10) {
      toast({
        message:
          "Add a bit more detail and try again - the more context you give, the better your report will be.",
        variant: "error",
        durationMs: 4000,
      });
      return;
    }

    const selectedOutputs = MODAL_OUTPUT_KEYS.filter((k) => selection[k]);
    if (selectedOutputs.length === 0) return;

    const extendedOutputKeys = EXTENDED_PM_TAB_KEYS.filter((k) => extendedOutputPrefs[k]);

    setShowTimeSaved(false);
    setLastGenDurationMs(null);
    setResult(null);
    setIsInputCollapsed(
      lastImportedHaloItems.length > 0 || input.length > 500,
    );
    setSavedGenerationId(null);
    setCompareResult(null);
    setCompareLoading(false);
    setCompareNoPrevious(false);
    setHasPreviousReport(false);
    setStagedCompareExample(false);
    setGenerationRating(null);
    setOutputMainTab("actions");
    setActiveClientEmailIndex(0);
    setEditingActionRow(null);
    setEditingDueDateRow(null);
    setEditingRiskRow(null);
    setEditingField(null);
    setFollowUpModalOpen(false);
    setFollowUpModalBody("");
    setFollowUpModalSubject("");
    setSmartActionEmailBody(null);
    setSmartActionEmailTo(null);

    setIsGenerating(true);
    genStartTime.current = Date.now();
    setGenProgress(0);
    if (genProgressRef.current) clearInterval(genProgressRef.current);
    genProgressRef.current = setInterval(() => {
      setGenProgress((prev) => {
        if (prev < 40) return prev + 2.5;
        if (prev < 85) return prev + 0.4;
        return prev;
      });
    }, 150);
    setError(null);
    setShowSignUpBanner(false);
    setGenerationPhase("generating");

    try {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 2750);
      });

      const coreScope = selectedOutputs.filter((k): k is ModalOutputKey =>
        (MODAL_OUTPUT_KEYS as readonly string[]).includes(k),
      );
      const nextResult: GenerateResult = {
        ...ONBOARDING_STAGED_RESULT(),
        _uiTabScope: {
          core: coreScope.length > 0 ? coreScope : [...MODAL_OUTPUT_KEYS],
          extended: extendedOutputKeys,
        },
      };
      setResult(nextResult);
      setExportFullTabs(exportPickerTabIdsForResult(nextResult));
      setIsInputCollapsed(true);
      genStartTime.current = null;
      setStagedGenerationReady(false);
      setHasPreviousReport(true);
      setCompareResult(ONBOARDING_STAGED_COMPARE_RESULT);
      setStagedCompareExample(true);
      void advanceHandoverTourAfterGeneration();
    } catch (e) {
      console.error(e);
      setError("Network error. Please try again.");
      toast({
        message: "Generation failed - please try again",
        variant: "error",
        durationMs: 5000,
      });
    } finally {
      setGenerationPhase("idle");
      setGenProgress(100);
      if (genProgressRef.current) {
        clearInterval(genProgressRef.current);
        genProgressRef.current = null;
      }
      genStartTime.current = null;
      setIsGenerating(false);
    }
  };

  const executeGenerate = async (selection: Record<ModalOutputKey, boolean>) => {
    const trimmed = input.trim();
    const effectiveInput = trimmed || lastInput.trim();
    if (isGenerating) return;
    if (!effectiveInput || effectiveInput.length < 10) {
      toast({
        message:
          "Add a bit more detail and try again - the more context you give, the better your report will be.",
        variant: "error",
        durationMs: 4000,
      });
      return;
    }
    console.log("[generate] Input preview:", effectiveInput.substring(0, 200));
    console.log("[generate] Input length:", effectiveInput.length);

    if (!userEmail) {
      if (effectiveInput === DEMO_EXAMPLE_INPUT.trim()) {
        setDemoTab("actions");
        setDemoModalOpen(true);
      } else {
        setLockedTeaserTab("actions");
        setLockedTeaserOpen(true);
      }
      return;
    }

    if (freeGenUsage && freeGenUsage.used >= freeGenUsage.cap) {
      setHardLimitType("trial");
      setPremiumHardLimitOpen(true);
      return;
    }
    if (showPro100Warning) {
      toast({
        message: "You’ve reached your monthly limit. Move to Handover to continue generating.",
        variant: "error",
        durationMs: 5000,
      });
      return;
    }

    const selectedOutputs = MODAL_OUTPUT_KEYS.filter((k) => selection[k]);
    if (selectedOutputs.length === 0) return;

    const extendedOutputKeys = EXTENDED_PM_TAB_KEYS.filter((k) => extendedOutputPrefs[k]);
    const toneAtRun = GENERATION_EMAIL_TONE;

    saveOutputPrefs(selection);
    saveExtendedOutputPrefs(extendedOutputPrefs);

    const clientContactNameForApi = selection.client_email
      ? clientContactName.trim() || null
      : null;
    const clientContactEmailForApi = selection.client_email
      ? clientContactEmail.trim() || null
      : null;

    setShowTimeSaved(false);
    setLastGenDurationMs(null);
    setResult(null);
    setIsInputCollapsed(
      lastImportedHaloItems.length > 0 || input.length > 500,
    );
    setSavedGenerationId(null);
    setCompareResult(null);
    setCompareLoading(false);
    setCompareNoPrevious(false);
    setHasPreviousReport(false);
    setGenerationRating(null);
    setOutputMainTab("actions");
    setActiveClientEmailIndex(0);
    setEditingActionRow(null);
    setEditingDueDateRow(null);
    setEditingRiskRow(null);
    setEditingField(null);
    setFollowUpModalOpen(false);
    setFollowUpModalBody("");
    setFollowUpModalSubject("");
    setSmartActionEmailBody(null);
    setSmartActionEmailTo(null);

    const supabase = createClient();
    const totalGensBeforeRun = totalGenerationCount ?? 0;
    setIsGenerating(true);
    genStartTime.current = Date.now();
    setGenProgress(0);
    if (genProgressRef.current) clearInterval(genProgressRef.current);
    genProgressRef.current = setInterval(() => {
      setGenProgress((prev) => {
        if (prev < 40) return prev + 2.5;
        if (prev < 85) return prev + 0.4;
        return prev;
      });
    }, 150);
    setError(null);
    setShowSignUpBanner(false);

    try {
      if (effectiveInput.length > GENERATION_INPUT_CHAR_LIMIT) {
        setGenerationPhase("compacting");
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, 1600);
        });
      }
      setGenerationPhase("generating");

      const generateRequestBody = {
        input: effectiveInput,
        projectName,
        templateContext: nextTemplateContext,
        selectedOutputs,
        outputPreferences: {
          enabledTabs: selectedOutputs,
          extendedTabs: extendedOutputKeys,
        },
        extendedOutputKeys,
        tone: toneAtRun,
        privacyMode,
        clientContactName: clientContactNameForApi,
        clientContactEmail: clientContactEmailForApi,
        inputQualityScore: lastInputQuality?.score ?? null,
      };
      console.log("[generate][audit] client → POST /api/generate", {
        extendedOutputKeys: generateRequestBody.extendedOutputKeys,
        extendedOutputKeysLength: generateRequestBody.extendedOutputKeys.length,
        outputPreferences: generateRequestBody.outputPreferences,
        selectedOutputs: generateRequestBody.selectedOutputs,
        extendedOutputPrefsSnapshot: Object.fromEntries(
          EXTENDED_PM_TAB_KEYS.map((k) => [k, extendedOutputPrefs[k]]),
        ) as Record<ExtendedPmTabKey, boolean>,
        inputLengthChars: effectiveInput.length,
      });

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generateRequestBody),
      });

      const data: unknown = await res.json();

      if (res.status === 403) {
        const trialErr =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          (data as { error: unknown }).error === "trial_limit_reached";
        if (trialErr) {
          setHardLimitType("trial");
          setPremiumHardLimitOpen(true);
          return;
        }
        const err =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          (data as { error: unknown }).error === "limit_reached";
        if (err) {
          setHardLimitType("pro_monthly");
          setPremiumHardLimitOpen(true);
          return;
        }
        const teamLimit =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          (data as { error: unknown }).error === "team_limit_reached";
        if (teamLimit) {
          setHardLimitType("team_monthly");
          const msg =
            typeof data === "object" &&
            data !== null &&
            "message" in data &&
            typeof (data as { message?: unknown }).message === "string"
              ? (data as { message: string }).message
              : "Your team has reached its monthly generation limit.";
          toast({ message: msg, variant: "error", durationMs: 8000 });
          setPremiumHardLimitOpen(true);
          return;
        }
      }
      if (res.status === 401) {
        const err =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          (data as { error: unknown }).error === "auth_required";
        if (err) {
          setDemoTab("actions");
          setDemoModalOpen(true);
          return;
        }
      }

      if (!res.ok) {
        const d = data as { error?: string; details?: string };
        const msg =
          typeof d.details === "string" && d.details.trim()
            ? `${typeof d.error === "string" ? d.error : "Error"}: ${d.details}`
            : typeof d.error === "string"
              ? d.error
              : "Failed to generate outputs.";
        setError(msg);
        toast({
          message: "Generation failed - please try again",
          variant: "error",
          durationMs: 5000,
        });
        return;
      }

      const rawSaved =
        typeof data === "object" && data !== null
          ? (data as Record<string, unknown>).savedGenerationId
          : null;
      const savedGenId = typeof rawSaved === "string" ? rawSaved : null;

      const parsed = parseApiGenerateResult(data);
      const condensedFlag =
        typeof data === "object" &&
        data !== null &&
        "inputCondensed" in data &&
        (data as { inputCondensed?: unknown }).inputCondensed === true;
      const condensedFromRaw =
        typeof data === "object" &&
        data !== null &&
        "inputCondensedFrom" in data
          ? (data as { inputCondensedFrom?: unknown }).inputCondensedFrom
          : undefined;
      const condensedFrom =
        typeof condensedFromRaw === "number"
          ? condensedFromRaw
          : typeof condensedFromRaw === "string"
            ? Number(condensedFromRaw)
            : NaN;
      if (condensedFlag) {
        toast({
          message: "Large import condensed",
          subtitle: `Your import was ${
            Number.isFinite(condensedFrom) && condensedFrom > 25000 ? "very large" : "large"
          } and was automatically condensed to fit. Some older notes may have been shortened. For best results with large imports, filter by specific client or date range.`,
          variant: "error",
          durationMs: 8000,
        });
      }
      const streakPayload = data as Record<string, unknown>;
      const streakCur = streakPayload._streakCurrent;
      const smRaw = streakPayload._streakMilestone;
      let streakMilestoneHit: number | null = null;
      if (typeof smRaw === "number" && Number.isFinite(smRaw)) {
        streakMilestoneHit = smRaw;
      } else if (smRaw != null && String(smRaw) !== "null" && String(smRaw) !== "") {
        const n = Number(smRaw);
        if (Number.isFinite(n)) streakMilestoneHit = n;
      }
      if (typeof streakCur === "number" && Number.isFinite(streakCur)) {
        setGenerationStreak(Math.max(0, streakCur));
        console.log("[streak] value from generate response (DB updated via apply_generation_streak)", {
          currentStreak: streakCur,
        });
      }
      const coreScope = selectedOutputs.filter((k): k is ModalOutputKey =>
        (MODAL_OUTPUT_KEYS as readonly string[]).includes(k),
      );
      const nextResult = {
        ...parsed,
        _uiTabScope: {
          core: coreScope.length > 0 ? coreScope : [...MODAL_OUTPUT_KEYS],
          extended: extendedOutputKeys,
        },
      };
      setResult(nextResult);
      setIsInputCollapsed(true);
      const genDurationMs = genStartTime.current
        ? Date.now() - genStartTime.current
        : null;
      genStartTime.current = null;
      if (genDurationMs && genDurationMs > 15000) {
        if (Math.random() < 0.3) {
          setLastGenDurationMs(genDurationMs);
          setShowTimeSaved(true);
          window.setTimeout(() => setShowTimeSaved(false), 8000);
        }
      }
      setSavedGenerationId(savedGenId);
      const clientNameForCompare =
        projectName.trim() ||
        (() => {
          const m = input.match(/^Client:\s*(.+)$/im);
          return m?.[1]?.trim() ?? "";
        })();
      if (savedGenId && clientNameForCompare) {
        void fetch("/api/client-intelligence/compare", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            currentGenerationId: savedGenId,
            clientName: clientNameForCompare,
            checkOnly: true,
          }),
        })
          .then((r) => r.json())
          .then((data: { noPrevious?: boolean }) => {
            setHasPreviousReport(!data.noPrevious);
          })
          .catch(() => {
            setHasPreviousReport(false);
          });
      }
      setGenerationRating(null);
      setFollowUpModalOpen(false);
      setFollowUpModalBody("");
      setReportQualityTipsOpen(false);
      {
        const coreVis = visibleCoreTabsForResult(nextResult);
        const extVis = visibleExtendedTabsForResult(nextResult);
        let preferredTab: string;
        if (coreVis.includes("actions")) {
          preferredTab = "actions";
        } else if (coreVis[0]) {
          preferredTab = coreVis[0];
        } else if (extVis[0]) {
          preferredTab = extVis[0];
        } else {
          preferredTab = "actions";
        }
        setOutputMainTab(preferredTab);
      }
      window.setTimeout(() => {
        outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
      try {
        window.sessionStorage.removeItem(SS_DEMO_INPUT);
      } catch {
        /* ignore */
      }
      if (typeof console !== "undefined") {
        console.log("[SmartActions] after generation", {
          eligible: shouldOfferSmartActions(nextResult, projectName, {
            surface: "generation",
          }),
        });
      }
      try {
        if (window.sessionStorage.getItem("handover_referral_output_banner_dismissed") !== "1") {
          setShowPostGenReferralFooter(true);
        }
      } catch {
        setShowPostGenReferralFooter(true);
      }
      setEditingField(null);
      setEditingActionRow(null);
      setEditingRiskRow(null);
      setNextTemplateContext("");
      setGenerationMailtoEmail(
        selection.client_email ? clientContactEmail.trim() || null : null,
      );

      const isQbrReport =
        effectiveInput.trim().startsWith("QBR CONTEXT:") ||
        effectiveInput.trim().startsWith("QBR:");
      setGenerationToastSubtitle(
        isQbrReport
          ? "QBR pack ready - PowerPoint and Excel included."
          : "Actions, risks, summary and client email - ready to send.",
      );
      setGenerationToastOpen(true);
      setLastInput(effectiveInput);
      setLastGeneratedTone(toneAtRun);
      if (
        userEmail &&
        !hasProAccess &&
        !readUpgradePromptConsumed() &&
        hasCompletedLoop
      ) {
        setShowPostGenProUpsell(true);
      }

      if (!privacyMode && savedGenId) {
        const autoTitle = deriveAutoTitle({
          actions: parsed.actions,
          projectName,
          createdAt: new Date(),
        });
        void fetch(`/api/generations/${savedGenId}/title`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: autoTitle }),
          credentials: "same-origin",
        }).then(() => {
          void refreshHistory();
          void refreshCollections();
        });
      }

      const {
        data: { user: authedUser },
      } = await supabase.auth.getUser();
      if (!authedUser) return;
      setShowSignUpBanner(false);
      const newTotal = await refreshShellData();
      const achievementIds: string[] = [];
      if (totalGensBeforeRun < 1 && (newTotal ?? 0) >= 1) achievementIds.push("first_generation");
      if (totalGensBeforeRun < 10 && (newTotal ?? 0) >= 10) achievementIds.push("total_generations_10");
      if (totalGensBeforeRun < 50 && (newTotal ?? 0) >= 50) achievementIds.push("total_generations_50");
      const streakAchId =
        streakMilestoneHit != null ? streakMilestoneToAchievementId(streakMilestoneHit) : null;
      if (streakAchId) achievementIds.push(streakAchId);
      void flushAchievementToasts(achievementIds);
      if (
        streakMilestoneHit != null &&
        STREAK_FLAME_CELEBRATION_MILESTONES.has(streakMilestoneHit)
      ) {
        setStreakFlameBurst(true);
        window.setTimeout(() => setStreakFlameBurst(false), 2000);
      }
      void refreshHistory();
      scheduleNpsAfterGeneration(authedUser.id);
      if (!privacyMode && newTotal === 1) {
        let alreadyCelebrated = false;
        try {
          alreadyCelebrated =
            window.localStorage.getItem(LS_FIRST_GEN_CELEBRATED) === "true";
        } catch {
          alreadyCelebrated = false;
        }
        if (!alreadyCelebrated) {
          setFirstGenCelebrationOpen(true);
        }
      }
    } catch (e) {
      console.error(e);
      setError("Network error. Please try again.");
      toast({
        message: "Generation failed - please try again",
        variant: "error",
        durationMs: 5000,
      });
    } finally {
      setGenerationPhase("idle");
      setGenProgress(100);
      if (genProgressRef.current) {
        clearInterval(genProgressRef.current);
        genProgressRef.current = null;
      }
      genStartTime.current = null;
      setIsGenerating(false);
    }
  };

  const charCount = input.length;
  const generationProgressLabel =
    isGenerating && generationPhase === "compacting"
      ? "Compacting..."
      : isGenerating && generationLongWait
        ? "Still working…"
        : isGenerating
          ? "Generating…"
          : "";
  const showFirstGenOnboardingTip =
    Boolean(userEmail) &&
    firstGenTipDismissed === false &&
    totalGenerationCount === 1;

  const smartActionsEligible = useMemo(() => {
    if (!userEmail || !result) return false;
    return shouldOfferSmartActions(result, projectName, { surface: "generation" });
  }, [userEmail, result, projectName]);

  const smartActionsReportContext = useMemo(() => {
    if (!result) return "";
    return buildSmartActionsReportContext({ projectName, result });
  }, [result, projectName]);

  const smartActionsResultSnapshot = useMemo(() => {
    if (!result) return null;
    return {
      actions: result.actions,
      client_email: result.client_email,
      summary: result.summary,
      status_report: result.status_report,
    };
  }, [result]);

  useEffect(() => {
    if (!result) setSmartActionsOpen(false);
  }, [result]);

  useEffect(() => {
    if (!result) setShowPostGenReferralFooter(false);
  }, [result]);

  useEffect(() => {
    if (!result) return;
    const all: string[] = [...visibleCoreTabsList, ...outputTabStripExtendedKeys];
    if (hasPreviousReport) all.push("compare");
    if (all.length === 0) return;
    if (!all.includes(outputMainTab)) {
      setOutputMainTab(all[0]!);
    }
  }, [result, visibleCoreTabsList, outputTabStripExtendedKeys, outputMainTab, hasPreviousReport]);

  const filteredHistoryProjects = useMemo(() => {
    let filtered = projects;
    if (selectedHistoryCollectionId !== null) {
      filtered = filtered.filter((p) => p.collection_id === selectedHistoryCollectionId);
    }
    return filtered;
  }, [projects, selectedHistoryCollectionId]);

  const showGenerateEmptyLayout = Boolean(userEmail && !result && !isGenerating);
  const generateStartingDataLoaded =
    showGenerateEmptyLayout &&
    (lastImportedHaloItems.length > 0 ||
      input.trim().length > 0 ||
      Boolean(importedFileName) ||
      generateManualExpanded);
  const bothPsasConnected = haloConnected && cwConnected;
  const generateHasInput = input.trim().length > 0;
  const generateButtonMuted = !generateHasInput;
  const generateSelectedOutputLabels = useMemo(
    () =>
      MODAL_OUTPUT_KEYS.filter((k) => outputPrefs[k]).map((k) => OUTPUT_TAB_TRIGGER_LABELS[k]),
    [outputPrefs],
  );

  useEffect(() => {
    if (!shouldAutoStartTour || tourAutoStartAttemptedRef.current) return;
    if (onboardingRedirectPending || !userEmail || mainView !== "generate") return;
    if (hasHandoverTourStartedThisSession()) {
      setShouldAutoStartTour(false);
      return;
    }

    const attemptStart = () => {
      const generateBtn = document.getElementById("handover-generate-outputs-btn");
      if (!generateBtn) return false;
      tourAutoStartAttemptedRef.current = true;
      setShouldAutoStartTour(false);
      registerHandoverTourCompletionHandler(() => {
        void markTourCompleted();
      });
      startHandoverProductTour({ includeGenerateStep: true, includeOutputSteps: true });
      return true;
    };

    if (attemptStart()) return undefined;

    let attempts = 0;
    const intervalId = window.setInterval(() => {
      attempts += 1;
      if (attemptStart() || attempts >= 40) {
        window.clearInterval(intervalId);
        if (attempts >= 40) {
          setShouldAutoStartTour(false);
        }
      }
    }, 50);

    return () => window.clearInterval(intervalId);
  }, [
    shouldAutoStartTour,
    onboardingRedirectPending,
    userEmail,
    mainView,
    generateStartingDataLoaded,
    markTourCompleted,
  ]);

  const startProductTourReplay = useCallback(async () => {
    setMainView("generate");
    setSettingsOpen(false);
    setSidebarOpenMobile(false);
    registerHandoverTourCompletionHandler(() => {
      void markTourCompleted();
    });

    await waitForHandoverTourElement(
      "#handover-generate-outputs-btn",
      HANDOVER_TOUR_ELEMENT_WAIT_MS,
    );
    if (result) {
      await waitForHandoverTourElement(
        '[data-tour="output-tabs-region"]',
        HANDOVER_TOUR_ELEMENT_WAIT_MS,
      );
    }
    const hasOutput =
      Boolean(result) &&
      Boolean(document.querySelector('[data-tour="output-tabs-region"]'));

    startHandoverProductTour({
      includeGenerateStep: false,
      includeOutputSteps: hasOutput,
    });
  }, [markTourCompleted, result]);

  const generatePsaLiveTicketCount = useMemo(() => {
    if (haloConnected && Array.isArray(cachedHaloTickets?.tickets)) {
      return (cachedHaloTickets.tickets as Array<Record<string, unknown>>).filter(
        (t) => !t.is_project && !t.is_project_task,
      ).length;
    }
    if (cwConnected && Array.isArray(cachedCwTickets?.tickets)) {
      return (cachedCwTickets.tickets as Array<Record<string, unknown>>).filter(
        (t) => !t.cwProjectId || Number(t.cwProjectId) <= 0,
      ).length;
    }
    return null;
  }, [haloConnected, cwConnected, cachedHaloTickets?.tickets, cachedCwTickets?.tickets]);

  const generatePsaLiveClientCount = useMemo(() => {
    const tickets =
      haloConnected && Array.isArray(cachedHaloTickets?.tickets)
        ? (cachedHaloTickets.tickets as Array<Record<string, unknown>>)
        : cwConnected && Array.isArray(cachedCwTickets?.tickets)
          ? (cachedCwTickets.tickets as Array<Record<string, unknown>>)
          : [];
    const names = new Set<string>();
    for (const t of tickets) {
      const client = t.client as { name?: string } | undefined;
      const raw =
        (typeof client?.name === "string" && client.name.trim()) ||
        (typeof t.clientName === "string" && t.clientName.trim()) ||
        (typeof t.client_name === "string" && t.client_name.trim()) ||
        "";
      if (raw) names.add(raw);
    }
    return names.size;
  }, [haloConnected, cwConnected, cachedHaloTickets?.tickets, cachedCwTickets?.tickets]);

  const psaSidebarSyncLabel = useMemo(() => {
    const synced = haloConnected ? haloLastSynced : cwLastSynced;
    if (!synced) return "connected";
    const mins = Math.floor((Date.now() - synced.getTime()) / 60000);
    if (mins < 1) return "synced just now";
    if (mins === 1) return "synced 1m ago";
    if (mins < 60) return `synced ${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `synced ${hrs}h ago`;
  }, [haloConnected, cwConnected, haloLastSynced, cwLastSynced]);

  const generatePsaCardSubLabel = useMemo(() => {
    const syncLabel = psaSidebarSyncLabel || "connected";
    if (generatePsaLiveTicketCount === null) {
      return `Live tickets and projects · ${syncLabel}`;
    }
    const clientPart =
      generatePsaLiveClientCount > 0 ? ` · ${generatePsaLiveClientCount} clients` : "";
    return `${generatePsaLiveTicketCount} tickets${clientPart} · ${syncLabel}`;
  }, [generatePsaLiveTicketCount, generatePsaLiveClientCount, psaSidebarSyncLabel]);

  const openPsaImportFromGenerate = useCallback(() => {
    if (!hasProAccess && !demoModeActive) {
      setHaloProModalOpen(true);
      return;
    }
    if (psaConnections.primary === "halopsa") {
      setHaloImportOpen(true);
    } else if (psaConnections.primary === "connectwise") {
      setCwImportOpen(true);
    } else if (haloConnected) {
      setHaloImportOpen(true);
    } else if (cwConnected) {
      setCwImportOpen(true);
    }
  }, [
    cwConnected,
    demoModeActive,
    haloConnected,
    hasProAccess,
    psaConnections.primary,
  ]);

  const onGeneratePsaImportCardClick = useCallback(() => {
    if (!hasProAccess && !demoModeActive) {
      setHaloProModalOpen(true);
      return;
    }
    if (psaConnections.multiple) {
      return;
    }
    openPsaImportFromGenerate();
  }, [demoModeActive, hasProAccess, openPsaImportFromGenerate, psaConnections.multiple]);

  const onGenerateConnectPsaCardClick = useCallback(() => {
    openIntegrationsInConfiguration();
    setSettingsOpen(false);
    setSidebarOpenMobile(false);
  }, [openIntegrationsInConfiguration]);

  const onGenerateDemoImportCardClick = useCallback(() => {
    if (!hasProAccess && !demoModeActive) {
      setHaloProModalOpen(true);
      return;
    }
    setHaloImportOpen(true);
  }, [demoModeActive, hasProAccess]);

  const onGenerateManualStart = useCallback(() => {
    setGenerateManualExpanded(true);
    setIsInputCollapsed(false);
    window.requestAnimationFrame(() => generateInputRef.current?.focus());
  }, []);

  const hasEnabledSchedule = useMemo(
    () => campaigns.some((c) => c.enabled === true),
    [campaigns],
  );

  useEffect(() => {
    if (mainView !== "delivery") return;
    if (deliveryDashboardAccess !== "none") return;
    setMainView("generate");
    setSidebarOpenMobile(false);
    setSettingsOpen(false);
  }, [mainView, deliveryDashboardAccess]);

  const scrollToGenerate = useCallback(() => {
    setMainView("generate");
    setSettingsOpen(false);
    setSidebarOpenMobile(false);
    window.requestAnimationFrame(() => {
      generateInputRef.current?.focus();
      generateInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);

  useEffect(() => {
    try {
      setOnboardingTabsExplored(window.localStorage.getItem(LS_ONBOARDING_TABS) === "true");
      setBasicOnboardingActionExportDone(
        window.localStorage.getItem(LS_BASIC_ACTION_EXPORT) === "true",
      );
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!result || !userEmail) return;
    if (outputMainTab === "actions") return;
    try {
      window.localStorage.setItem(LS_ONBOARDING_TABS, "true");
    } catch {
      /* ignore */
    }
    setOnboardingTabsExplored(true);
  }, [result, outputMainTab, userEmail]);

  useEffect(() => {
    if (!pushModalOpen) setPushModalMobileStep(0);
  }, [pushModalOpen]);

  useEffect(() => {
    if (!pushHaloHighlight) return;
    const t = window.setTimeout(() => setPushHaloHighlight(false), 2800);
    return () => window.clearTimeout(t);
  }, [pushHaloHighlight]);

  useEffect(() => {
    if (!pushQuickActionSuccess) return;
    const t = window.setTimeout(() => setPushQuickActionSuccess(false), 2000);
    return () => window.clearTimeout(t);
  }, [pushQuickActionSuccess]);

  useEffect(() => {
    if (!templateSaveCtaHighlight) return;
    const t = window.setTimeout(() => setTemplateSaveCtaHighlight(false), 4500);
    return () => window.clearTimeout(t);
  }, [templateSaveCtaHighlight]);

  useEffect(() => {
    if (!postOnboardingNewGenHighlight) return;
    const t = window.setTimeout(() => setPostOnboardingNewGenHighlight(false), 3000);
    return () => window.clearTimeout(t);
  }, [postOnboardingNewGenHighlight]);

  useEffect(() => {
    if (!sendEmailButtonHighlight) return;
    const t = window.setTimeout(() => setSendEmailButtonHighlight(false), 3000);
    return () => window.clearTimeout(t);
  }, [sendEmailButtonHighlight]);

  const syncOutputTabScrollEdges = useCallback(() => {
    const el = outputTabScrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const sl = el.scrollLeft;
    const eps = 2;
    setOutputTabScrollEdges({
      left: sl > eps,
      right: maxScroll > eps && sl < maxScroll - eps,
    });
  }, []);

  useEffect(() => {
    const el = outputTabScrollRef.current;
    if (!el) return;
    syncOutputTabScrollEdges();
    const onScroll = () => syncOutputTabScrollEdges();
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(() => syncOutputTabScrollEdges());
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [result, visibleCoreTabsList, outputTabStripExtendedKeys, syncOutputTabScrollEdges]);

  useEffect(() => {
    const root = outputTabScrollRef.current;
    if (!root) return;
    const active = root.querySelector('[data-state="active"]') as HTMLElement | null;
    active?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [outputMainTab, result]);

  useEffect(() => {
    if (!scheduleEditorOpen) {
      setSchedulePrefillImportBanner(false);
    }
  }, [scheduleEditorOpen]);

  useEffect(() => {
    scheduleWizardPrevRequiredRef.current = null;
  }, [scheduleEditorOpen, schCampaignEditorTab]);

  useEffect(() => {
    if (!scheduleEditorOpen) {
      scheduleWizardPrevRequiredRef.current = null;
      return;
    }
    if (schCampaignEditorTab > 1) return;
    const prev = scheduleWizardPrevRequiredRef.current;
    scheduleWizardPrevRequiredRef.current = scheduleWizardRequiredRemaining;
    if (prev === null || prev <= 0 || scheduleWizardRequiredRemaining > 0) return;
    if (scheduleWizardFlashTimerRef.current) {
      window.clearTimeout(scheduleWizardFlashTimerRef.current);
    }
    setScheduleWizardNextFlash(true);
    scheduleWizardFlashTimerRef.current = window.setTimeout(() => {
      scheduleWizardFlashTimerRef.current = null;
      setScheduleWizardNextFlash(false);
    }, 900);
    return () => {
      if (scheduleWizardFlashTimerRef.current) {
        window.clearTimeout(scheduleWizardFlashTimerRef.current);
        scheduleWizardFlashTimerRef.current = null;
      }
    };
  }, [scheduleEditorOpen, schCampaignEditorTab, scheduleWizardRequiredRemaining]);

  const handleSmartActionEmail = useCallback(
    async (suggestion: SmartActionSuggestion) => {
      const clientBody = activeClientEmailBody.trim();
      if (clientBody.length >= 40) {
        setSmartActionEmailBody(null);
        setSmartActionEmailTo(null);
        setSendClientEmailModalOpen(true);
        return;
      }
      try {
        const blob = `${lastInput}\n${input}\n${(result?.status_report ?? "").slice(0, 8000)}`;
        const fromNotes = extractFirstEmailFromText(blob);
        const res = await fetch("/api/generation/smart-action-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            actionTitle: suggestion.action,
            description: suggestion.description,
            context: (lastInput || input || "").slice(0, 16000),
            summary: (result?.summary ?? "").slice(0, 4000),
          }),
        });
        const data = (await res.json()) as { body?: string; error?: string };
        if (!res.ok || typeof data.body !== "string" || !data.body.trim()) {
          toast({
            message:
              (typeof data.error === "string" && data.error.trim()) || "Could not draft email.",
            variant: "error",
            durationMs: 5000,
          });
          return;
        }
        setSmartActionEmailBody(data.body.trim());
        setSmartActionEmailTo(fromNotes ?? "");
        setSendClientEmailModalOpen(true);
      } catch {
        toast({
          message: "Could not draft email.",
          variant: "error",
          durationMs: 5000,
        });
      }
    },
    [activeClientEmailBody, lastInput, input, result, toast],
  );

  const onQuickEmailClient = useCallback((): boolean | Promise<boolean> => {
    if (!result) {
      setMainView("generate");
      setSidebarOpenMobile(false);
      toast({
        message: "Generate a report first, then you can send it to your client",
        variant: "info",
        durationMs: 4500,
      });
      return false;
    }
    setMainView("generate");
    setSidebarOpenMobile(false);
    setOutputMainTab("client_email");

    const runScrollHighlight = () => {
      outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      document
        .getElementById("handover-send-client-email-btn")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      setSendEmailButtonHighlight(true);
    };

    return new Promise<boolean>((resolve) => {
      let attempts = 0;
      const tryFindSendButton = () => {
        const btn = document.getElementById("handover-send-client-email-btn");
        if (btn) {
          runScrollHighlight();
          resolve(true);
          return;
        }
        attempts += 1;
        if (attempts >= 10) {
          toast({
            message: "Could not locate your report - try scrolling down manually",
            variant: "info",
            durationMs: 4500,
          });
          resolve(false);
          return;
        }
        window.setTimeout(tryFindSendButton, 50);
      };
      tryFindSendButton();
    });
  }, [result, toast]);

  const checklistSteps: ChecklistStepDef[] = useMemo(() => {
    const profileDone =
      profileJobTitle.trim().length > 0 && profileCompanyName.trim().length > 0;
    const firstGenDone = (totalGenerationCount ?? 0) >= 1;
    const psaConnected =
      psaStatus.halo || psaStatus.connectwise || haloConnected || cwConnected;
    const hasScheduledReport = hasEnabledSchedule;
    const hasGeneratedQbr = projects.some(
      (g) => g.report_type === "qbr" || g.reportType === "qbr",
    );

    if (!hasProAccess) {
      return [
        {
          id: "profile",
          label: "Complete your profile",
          description:
            "Add your name, job title, and company so your reports are personalised.",
          cta: "Set up →",
          onCta: () => {
            setSettingsOpen(true);
            setSettingsTab("profile");
            setSidebarOpenMobile(false);
          },
          done: profileDone,
        },
        {
          id: "product_tour",
          label: tourCompleted ? "Replay the tour" : "Take the tour",
          description: "A 5-step walkthrough of what Handover can do for you",
          cta: tourCompleted ? "Replay" : "Start",
          onCta: () => {
            void startProductTourReplay();
          },
          done: tourCompleted,
        },
        {
          id: "first_generation",
          label: "Generate your first report",
          description:
            "Connect your PSA or use demo mode to see your first AI-generated client report.",
          cta: "Generate →",
          onCta: scrollToGenerate,
          done: firstGenDone,
        },
        {
          id: "send_client_email",
          label: "Send a report to a client",
          description:
            "Use one-click send to email a report directly to a client from Handover.",
          cta: "Send →",
          onCta: onQuickEmailClient,
          done: basicOnboardingActionExportDone,
        },
        {
          id: "explore_qbr",
          label: "Generate a QBR pack",
          description:
            "Try the QBR generator and download your first quarterly business review pack.",
          cta: "QBR →",
          onCta: () => {
            setMainView("reports");
            setSettingsOpen(false);
            setSidebarOpenMobile(false);
          },
          done: false,
        },
        {
          id: "upgrade_pro",
          label: "Move to Handover",
          description:
            "Unlock the complete Handover workspace, automation, and client-ready outputs.",
          cta: "View pricing →",
          onCta: () => {
            router.push("/pricing");
          },
          done: false,
        },
      ];
    }

    return [
      {
        id: "profile",
        label: "Complete your profile",
        description:
          "Add your name, job title, and company so your reports are personalised.",
        cta: "Set up →",
        onCta: () => {
          setSettingsOpen(true);
          setSettingsTab("profile");
          setSidebarOpenMobile(false);
        },
        done: profileDone,
      },
      {
        id: "product_tour",
        label: tourCompleted ? "Replay the tour" : "Take the tour",
        description: "A 5-step walkthrough of what Handover can do for you",
        cta: tourCompleted ? "Replay" : "Start",
        onCta: () => {
          void startProductTourReplay();
        },
        done: tourCompleted,
      },
      {
        id: "first_generation",
        label: "Generate your first report",
        description:
          "Connect your PSA or use demo mode to see your first AI-generated client report.",
        cta: "Generate →",
        onCta: scrollToGenerate,
        done: firstGenDone,
      },
      {
        id: "connect_psa",
        label: "Connect your PSA",
        description:
          "Link HaloPSA or ConnectWise to generate reports from your live data.",
        cta: "Connect →",
        onCta: () => {
          setMainView("configuration");
          setSettingsOpen(false);
          setSidebarOpenMobile(false);
        },
        done: psaConnected,
      },
      {
        id: "send_client_email",
        label: "Send a report to a client",
        description:
          "Send your first AI-generated client update directly from Handover.",
        cta: "Send →",
        onCta: onQuickEmailClient,
        done: basicOnboardingActionExportDone,
      },
      {
        id: "scheduled_report",
        label: "Set up a scheduled report",
        description:
          "Automate your weekly client updates - set up once, Handover handles the rest.",
        cta: "Set up →",
        onCta: () => {
          setMainView("scheduled");
          setSettingsOpen(false);
          setSidebarOpenMobile(false);
        },
        done: hasScheduledReport,
      },
      {
        id: "qbr_pack",
        label: "Generate a QBR pack",
        description:
          "Create your first quarterly business review pack from live PSA data.",
        cta: "QBR →",
        onCta: () => {
          setMainView("reports");
          setSettingsOpen(false);
          setSidebarOpenMobile(false);
        },
        done: hasGeneratedQbr,
      },
    ];
  }, [
    profileJobTitle,
    profileCompanyName,
    totalGenerationCount,
    hasEnabledSchedule,
    hasProAccess,
    psaStatus.halo,
    psaStatus.connectwise,
    haloConnected,
    cwConnected,
    projects,
    scrollToGenerate,
    router,
    onQuickEmailClient,
    basicOnboardingActionExportDone,
    tourCompleted,
    startProductTourReplay,
  ]);

  const onQuickPushToPsa = useCallback(() => {
    openPushModal();
  }, [openPushModal]);

  const onQuickExportExcel = useCallback(() => {
    void openFullReportExportPicker();
  }, [openFullReportExportPicker]);

  const reportQuality = useMemo(
    () => (result ? calculateReportQuality(result) : null),
    [result],
  );

  const generateFollowUpEmail = useCallback(
    async (clientScope: string, options?: { openModal?: boolean }) => {
      if (!result?.actions?.length || followUpLoading || isGenerating) return;
      const scope = clientScope.trim() || FOLLOW_UP_ALL_CLIENTS;
      const scopedActions =
        scope === FOLLOW_UP_ALL_CLIENTS
          ? result.actions
          : result.actions.filter((a) => (a.client_name ?? "").trim() === scope);
      const openActions = scopedActions
        .map((a) => a.task?.trim())
        .filter((t): t is string => Boolean(t));
      if (openActions.length === 0) {
        toast({
          message: "No open actions for this client",
          variant: "error",
          durationMs: 4000,
        });
        return;
      }

      if (!userEmail) return;
      if (freeGenUsage && freeGenUsage.used >= freeGenUsage.cap) {
        setHardLimitType("trial");
        setPremiumHardLimitOpen(true);
        return;
      }
      if (showPro100Warning) {
        toast({
          message: "You’ve reached your monthly limit. Move to Handover to continue generating.",
          variant: "error",
          durationMs: 5000,
        });
        return;
      }

      const clientLabel =
        scope === FOLLOW_UP_ALL_CLIENTS
          ? "all clients"
          : scope;
      const chaseInput = `Generate a brief professional follow-up email chasing these open actions for ${clientLabel}: ${openActions.join(", ")}. Keep it to 3-4 sentences.`;

      setFollowUpLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: chaseInput,
            projectName:
              scope === FOLLOW_UP_ALL_CLIENTS ? projectName : scope,
            templateContext: "",
            selectedOutputs: ["client_email"],
            outputPreferences: {
              enabledTabs: ["client_email"],
              extendedTabs: [],
            },
            extendedOutputKeys: [],
            tone: GENERATION_EMAIL_TONE,
            privacyMode,
            clientContactName: clientContactName.trim() || null,
            clientContactEmail: clientContactEmail.trim() || null,
          }),
        });
        const data: unknown = await res.json();
        if (!res.ok) {
          toast({
            message: "Could not generate follow-up - try again",
            variant: "error",
            durationMs: 5000,
          });
          return;
        }
        const parsed = parseApiGenerateResult(data);
        const body = (parsed.client_email ?? "").trim();
        if (!body) {
          toast({
            message: "Could not generate follow-up - try again",
            variant: "error",
            durationMs: 5000,
          });
          return;
        }
        setFollowUpModalBody(body);
        setFollowUpModalSubject(
          (parsed.email_subject ?? "").trim() ||
            buildDefaultClientEmailSubject(
              scope === FOLLOW_UP_ALL_CLIENTS ? projectName : scope,
            ),
        );
        setFollowUpModalActionCount(openActions.length);
        setFollowUpClientScope(scope);
        if (options?.openModal !== false) {
          setFollowUpModalOpen(true);
        }
        void refreshShellData();
      } catch {
        toast({
          message: "Could not generate follow-up - try again",
          variant: "error",
          durationMs: 5000,
        });
      } finally {
        setFollowUpLoading(false);
      }
    },
    [
      result,
      followUpLoading,
      isGenerating,
      userEmail,
      freeGenUsage,
      showPro100Warning,
      projectName,
      privacyMode,
      clientContactName,
      clientContactEmail,
      toast,
      refreshShellData,
    ],
  );

  const onFollowUpEmailClick = useCallback(() => {
    if (!result?.actions?.length || followUpLoading || isGenerating) return;
    const clients = followUpClientOptions;
    if (clients.length <= 1) {
      const scope = clients[0] ?? FOLLOW_UP_ALL_CLIENTS;
      void generateFollowUpEmail(scope);
      return;
    }
    let defaultClient = clients[0]!;
    let bestCount = -1;
    for (const name of clients) {
      const count = result.actions.filter(
        (a) => (a.client_name ?? "").trim() === name && Boolean(a.task?.trim()),
      ).length;
      if (count > bestCount) {
        bestCount = count;
        defaultClient = name;
      }
    }
    setFollowUpClientScope(defaultClient);
    setFollowUpModalOpen(true);
    setFollowUpModalBody("");
    void generateFollowUpEmail(defaultClient, { openModal: false });
  }, [
    result,
    followUpLoading,
    isGenerating,
    followUpClientOptions,
    generateFollowUpEmail,
  ]);

  const openScheduleEditorFromGeneration = useCallback(() => {
    if (!hasProAccess) {
      setHaloProModalOpen(true);
      return;
    }
    setMainView("scheduled");
    setSettingsOpen(false);
    setSidebarOpenMobile(false);
    openNewScheduleEditor();
    const ticketIds = lastImportedHaloItems.filter((t) => t.type === "ticket").map((t) => t.id);
    const projectIds = lastImportedHaloItems.filter((t) => t.type === "project").map((t) => t.id);
    const ticketClientIds: number[] = [];
    const seenCid = new Set<number>();
    for (const item of lastImportedHaloItems) {
      if (item.type !== "ticket") continue;
      const row = allTickets.find((x) => Number(x.id) === item.id);
      const cid = Number(
        row?.clientId ?? (row as Record<string, unknown> | undefined)?.client_id,
      );
      if (Number.isFinite(cid) && !seenCid.has(cid)) {
        seenCid.add(cid);
        ticketClientIds.push(cid);
      }
    }
    if (ticketIds.length > 0) {
      setSelectedTicketIds(ticketIds);
      setSchIncludeTickets(true);
    }
    if (projectIds.length > 0) {
      setSelectedProjectIds(projectIds);
      setSchIncludeProjects(true);
    }
    if (ticketIds.length > 0 || projectIds.length > 0) {
      setTicketClientMode("selected");
      setProjectClientMode("selected");
    }
    if (ticketClientIds.length > 0) {
      setSelectedTicketClients(ticketClientIds);
      setExpandedTicketClients(new Set([ticketClientIds[0]]));
    }
    const clientLabel = lastImportedHaloItems[0]?.clientName?.trim() || "";
    if (projectName.trim()) setSchName(projectName.trim());
    if (clientLabel) setSchRecipientName(clientLabel);
    setSchedulePrefillImportBanner(lastImportedHaloItems.length > 0);
    setSchCampaignEditorTab(1);
    window.requestAnimationFrame(() => scrollCampaignEditorIntoView());
  }, [
    hasProAccess,
    openNewScheduleEditor,
    lastImportedHaloItems,
    allTickets,
    projectName,
    scrollCampaignEditorIntoView,
  ]);

  const signaturePreview = buildClientEmailSignOffBlock(
    signatureOverride,
    profileDisplayName,
    profileJobTitle,
    profileCompanyName,
  );
  const signedOutCompactMode =
    !userEmail && Boolean(result) && !isEditingSignedOutInput && !isGenerating;
  const signedOutInputPreview =
    (signedOutInputSnapshot || input || "").trim().length > 60
      ? `${(signedOutInputSnapshot || input || "").trim().slice(0, 60)}...`
      : (signedOutInputSnapshot || input || "").trim();

  const isPaidPlan = ["professional", "handover", "starter_programme", "team", "enterprise"].includes(
    normalizePlanLabel(profileDbPlan ?? ""),
  );
  const billingProfileFields = useMemo(
    () =>
      planFieldsFromProfileRow({
        plan: profileDbPlan,
        team_id: userTeamId,
        trial_ends_at: trialEndsAt,
        trial_plan: profileTrialPlan,
        subscription_status: profileSubscriptionStatus,
      }),
    [
      profileDbPlan,
      userTeamId,
      trialEndsAt,
      profileTrialPlan,
      profileSubscriptionStatus,
    ],
  );
  const billingTier = useMemo(
    () => getPlanTierFromFields(billingProfileFields),
    [billingProfileFields],
  );
  const billingGenerationLimit = useMemo(() => {
    if (generationLimitOverride != null) return generationLimitOverride;
    if (billingTier >= 3) return null;
    if (billingTier >= 2) return GROWTH_MONTHLY_GENERATION_LIMIT;
    if (billingTier >= 1) return STARTER_MONTHLY_GENERATION_LIMIT;
    return FREE_MONTHLY_GENERATION_LIMIT;
  }, [billingTier, generationLimitOverride]);
  const billingReportLimit = useMemo(() => {
    if (billingTier >= 2) return null;
    if (billingTier >= 1) return STARTER_MONTHLY_REPORT_LIMIT;
    return 0;
  }, [billingTier]);
  const isBillingGrowthOrAbove = billingTier >= 2;
  const fixedPanelTopBelowChrome = paymentPastDue
    ? "var(--app-fixed-panel-top-past-due)"
    : "var(--app-fixed-panel-top)";

  const configurationBrandingSection = !hasProAccess ? null : (

                  <div className="space-y-4">
                    <div>
                      <h3 className="mb-2 text-[13px] font-semibold text-[var(--text-primary)]">Branding</h3>
                      <p className="mb-3 text-[12px] text-[var(--text-muted)]">
                        Brand details are used in generated outputs, Excel exports, and sender display names.
                      </p>
                      <div className="space-y-3">
                        <label
                          className="flex cursor-pointer items-start gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] p-3"
                          onClick={(e) => {
                            if (billingTier < 2) {
                              e.preventDefault();
                              router.push("/pricing?upgrade=true");
                              toast({
                                message:
                                  "White label mode is included with Handover. Upgrade to enable it.",
                                variant: "error",
                                durationMs: 5000,
                              });
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            className={cn("mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]", focusRing)}
                            checked={whiteLabelMode}
                            disabled={billingTier < 2}
                            onChange={(e) => {
                              if (billingTier >= 2) {
                                setWhiteLabelMode(e.target.checked);
                              }
                            }}
                          />
                          <span className="text-[12px] leading-snug text-[var(--text-primary)]">
                            <span className="font-medium">White label mode</span>
                            <span className="text-[var(--text-muted)]">
                              {" "}
                              - remove all Handover branding from scheduled emails, client send, Excel exports, and
                              Halo ticket notes (requires a brand name above).
                            </span>
                            {billingTier < 2 ? (
                              <span className="mt-2 block text-[11px] text-[var(--text-muted)]">
                                Growth and above.{" "}
                                <Link
                                  href="/pricing?upgrade=true"
                                  className="font-medium text-[var(--accent)] underline-offset-2 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Upgrade on pricing
                                </Link>
                              </span>
                            ) : null}
                          </span>
                        </label>
                        <Input
                          value={brandName}
                          onChange={(e) => setBrandName(e.target.value)}
                          placeholder="Brand name (e.g. Northstar MSP)"
                          className={cn("rounded-[var(--radius)] border-[var(--border)]", focusRing)}
                        />
                        <div className="space-y-1.5">
                          <label className="text-[12px] text-[var(--text-secondary)]">
                            Name in scheduled email header
                          </label>
                          <Input
                            value={schBrandName}
                            onChange={(e) => setSchBrandName(e.target.value)}
                            placeholder="e.g. Northstar MSP (defaults to Handover if blank)"
                            className={cn("rounded-[var(--radius)] border-[var(--border)]", focusRing)}
                          />
                          <p className="text-[11px] text-[var(--text-muted)]">
                            Shown to recipients on automated scheduled sends; your account brand above is used
                            elsewhere.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[12px] text-[var(--text-secondary)]">Primary colour</label>
                          <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] p-3">
                            <input
                              ref={brandPrimaryColorPickerRef}
                              type="color"
                              className="pointer-events-none fixed h-px w-px opacity-0"
                              tabIndex={-1}
                              aria-hidden
                              value={hexForColorInput(brandColour, HANDOVER_BRAND_PRIMARY_HEX)}
                              onChange={(e) => {
                                setBrandColour(formatHex6Display(e.target.value));
                                setBrandColourError("");
                              }}
                            />
                            <button
                              type="button"
                              className={cn(
                                "size-9 shrink-0 rounded border border-[var(--border)] shadow-sm transition-opacity hover:opacity-90",
                                focusRing,
                              )}
                              style={{
                                backgroundColor: HEX_COLOUR_6.test(brandColour.trim())
                                  ? `#${brandColour.trim().replace(/^#/, "")}`
                                  : "var(--accent)",
                              }}
                              aria-label="Open primary colour picker"
                              onClick={() => brandPrimaryColorPickerRef.current?.click()}
                            />
                            <Input
                              value={brandColour}
                              onChange={(e) => {
                                setBrandColour(e.target.value);
                                setBrandColourError("");
                              }}
                              placeholder={HANDOVER_BRAND_PRIMARY_HEX}
                              spellCheck={false}
                              autoCapitalize="off"
                              className={cn(
                                "min-w-0 flex-1 rounded-[var(--radius)] border-[var(--border)] font-mono text-[13px] sm:max-w-[11rem]",
                                focusRing,
                              )}
                              aria-invalid={Boolean(brandColourError)}
                              aria-describedby={brandColourError ? "brand-colour-primary-err" : undefined}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className={cn("shrink-0 text-[12px]", focusRing)}
                              onClick={() => void resetBrandPrimaryColour()}
                            >
                              Reset to default
                            </Button>
                          </div>
                          {brandColourError ? (
                            <p id="brand-colour-primary-err" className="text-[12px] text-[var(--danger)]">
                              {brandColourError}
                            </p>
                          ) : null}
                        </div>
                        <div className="space-y-2">
                          <label className="text-[12px] text-[var(--text-secondary)]">Accent colour</label>
                          <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] p-3">
                            <input
                              ref={brandSecondaryColorPickerRef}
                              type="color"
                              className="pointer-events-none fixed h-px w-px opacity-0"
                              tabIndex={-1}
                              aria-hidden
                              value={hexForColorInput(brandSecondaryColour, HANDOVER_BRAND_SECONDARY_HEX)}
                              onChange={(e) => {
                                setBrandSecondaryColour(formatHex6Display(e.target.value));
                                setBrandSecondaryColourError("");
                              }}
                            />
                            <button
                              type="button"
                              className={cn(
                                "size-9 shrink-0 rounded border border-[var(--border)] shadow-sm transition-opacity hover:opacity-90",
                                focusRing,
                              )}
                              style={{
                                backgroundColor: HEX_COLOUR_6.test(brandSecondaryColour.trim())
                                  ? `#${brandSecondaryColour.trim().replace(/^#/, "")}`
                                  : "#1e40af",
                              }}
                              aria-label="Open accent colour picker"
                              onClick={() => brandSecondaryColorPickerRef.current?.click()}
                            />
                            <Input
                              value={brandSecondaryColour}
                              onChange={(e) => {
                                setBrandSecondaryColour(e.target.value);
                                setBrandSecondaryColourError("");
                              }}
                              placeholder={HANDOVER_BRAND_SECONDARY_HEX}
                              spellCheck={false}
                              autoCapitalize="off"
                              className={cn(
                                "min-w-0 flex-1 rounded-[var(--radius)] border-[var(--border)] font-mono text-[13px] sm:max-w-[11rem]",
                                focusRing,
                              )}
                              aria-invalid={Boolean(brandSecondaryColourError)}
                              aria-describedby={
                                brandSecondaryColourError ? "brand-colour-secondary-err" : undefined
                              }
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className={cn("shrink-0 text-[12px]", focusRing)}
                              onClick={() => void resetBrandSecondaryColour()}
                            >
                              Reset to default
                            </Button>
                          </div>
                          {brandSecondaryColourError ? (
                            <p id="brand-colour-secondary-err" className="text-[12px] text-[var(--danger)]">
                              {brandSecondaryColourError}
                            </p>
                          ) : null}
                        </div>
                        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] p-2">
                          <p className="mb-1.5 text-[11px] font-medium text-[var(--text-muted)]">Colour preview</p>
                          <div className="flex h-8 w-full overflow-hidden rounded-md border border-[var(--border)]">
                            <div
                              className="flex-1"
                              style={{
                                background:
                                  /^#?[0-9a-fA-F]{6}$/.test(brandColour.trim())
                                    ? brandColour.trim().replace(/^#?/, "#")
                                    : "var(--accent)",
                              }}
                              title="Primary"
                            />
                            <div
                              className="flex-1"
                              style={{
                                background:
                                  /^#?[0-9a-fA-F]{6}$/.test(brandSecondaryColour.trim())
                                    ? brandSecondaryColour.trim().replace(/^#?/, "#")
                                    : "#1e40af",
                              }}
                              title="Accent"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[12px] text-[var(--text-secondary)]">Logo</label>
                          {brandLogoUrl.trim() ? (
                            <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
                              <img
                                key={brandLogoPreviewKey}
                                src={brandLogoUrl.trim()}
                                alt="Current brand logo"
                                className="max-h-16 max-w-[200px] rounded border border-[var(--border)] bg-[var(--bg-primary)] object-contain"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className={cn("text-[12px]", focusRing)}
                                onClick={() => void removeBrandLogo()}
                                disabled={brandLogoUploading}
                              >
                                Remove logo
                              </Button>
                            </div>
                          ) : (
                            <>
                              <input
                                ref={logoFileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp"
                                onChange={(e) => void uploadBrandLogo(e.target.files?.[0] ?? null)}
                                className={cn("block w-full text-[12px] text-[var(--text-secondary)]", focusRing)}
                              />
                              {brandLogoUploading ? (
                                <p className="text-[12px] text-[var(--text-muted)]">Uploading logo...</p>
                              ) : null}
                            </>
                          )}
                        </div>
                        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
                          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                            Excel header preview
                          </p>
                          <div
                            className="flex items-center gap-3 rounded-[6px] border px-3 py-2"
                            style={{
                              background:
                                /^#?[0-9a-fA-F]{6}$/.test(brandColour.trim())
                                  ? brandColour.trim().replace(/^#?/, "#")
                                  : "var(--accent)",
                              borderColor:
                                /^#?[0-9a-fA-F]{6}$/.test(brandSecondaryColour.trim())
                                  ? brandSecondaryColour.trim().replace(/^#?/, "#")
                                  : /^#?[0-9a-fA-F]{6}$/.test(brandColour.trim())
                                    ? brandColour.trim().replace(/^#?/, "#")
                                    : "var(--accent)",
                            }}
                          >
                            {brandLogoUrl ? (
                              <img
                                key={`excel-${brandLogoPreviewKey}`}
                                src={brandLogoUrl}
                                alt="Brand logo"
                                className="h-8 w-8 rounded bg-white/90 p-1 object-contain"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded bg-white/20" />
                            )}
                            <span className="text-[12px] font-semibold text-white">
                              {(brandName.trim() || "Handover")} Report Header
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        className={cn("bg-[var(--accent)] text-[13px] text-white hover:bg-[var(--accent-hover)]", focusRing)}
                        onClick={() => void saveBrandingSettings()}
                      >
                        Save branding
                      </Button>
                    </div>
                  </div>
  );

  const authLoading = mounted && !onboardingProfileLoaded;
  if (authLoading) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4"
        style={{ backgroundColor: "#080D14" }}
      >
        <div className="flex items-center gap-3">
          <img src="/icon2.png" alt="" className="h-8 w-8 object-contain" />
          <span className="text-xl font-bold text-white">Handover</span>
        </div>
        <div className="mt-2 h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-[var(--accent)]" />
      </div>
    );
  }

  return (
    <motion.div
      className={cn(
        userEmail && result && mainView === "generate"
          ? "relative min-h-[100dvh] bg-transparent app-shell-bg md:min-h-0 md:h-screen md:overflow-hidden"
          : "min-h-full bg-transparent",
        userEmail && !(result && mainView === "generate") && "relative app-shell-bg",
      )}
      suppressHydrationWarning
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Dialog
        open={lightboxImage !== null}
        onOpenChange={(open) => !open && setLightboxImage(null)}
      >
        <DialogContent className="max-w-[90vw] overflow-hidden p-4 sm:max-w-[90vw]" showCloseButton>
          {lightboxImage ? (
            <div className="flex flex-col items-center gap-3">
              <img
                src={lightboxImage.src}
                alt={lightboxImage.alt}
                style={{
                  maxWidth: "90vw",
                  maxHeight: "85vh",
                  objectFit: "contain",
                  width: "auto",
                  height: "auto",
                  display: "block",
                }}
              />
              <p className="text-center text-sm text-[var(--text-secondary)]">
                {lightboxImage.alt}
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      {generationToastOpen ? (
        <div
          className="fixed right-4 top-4 z-[120] animate-in fade-in slide-in-from-right-4 duration-200 rounded-lg border border-emerald-700/30 bg-emerald-600 px-4 py-3 text-white shadow-lg"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5" aria-hidden />
            <div>
              <p className="text-sm font-semibold">Outputs generated</p>
              <p className="mt-1 text-xs leading-snug opacity-95">{generationToastSubtitle}</p>
            </div>
          </div>
        </div>
      ) : null}
      {userEmail && !onboardingRedirectPending ? (
        <GettingStartedChecklistWidget
          key={gettingStartedChecklistMountKey}
          steps={checklistSteps}
          storageScope={userEmail}
        />
      ) : null}
      {pushModalOpen ? (
        <div className="fixed inset-0 z-[140] bg-black/60 p-4">
          <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)]">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">{`Push to ${pushModalHeaderLabel}`}</h3>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {`Post generated outputs as a note on your ${pushModalHeaderLabel} tickets`}
                  </p>
                  {showPushPsaPicker ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                        Push to
                      </span>
                      <div className="inline-flex rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] p-0.5">
                        <button
                          type="button"
                          className={cn(
                            "rounded-[calc(var(--radius)-2px)] px-3 py-1 text-[12px] font-medium transition-colors",
                            pushTargetPsa === "halopsa"
                              ? "bg-[var(--accent)] text-white"
                              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                            focusRing,
                          )}
                          onClick={() => setPushTargetPsa("halopsa")}
                        >
                          HaloPSA
                        </button>
                        <button
                          type="button"
                          className={cn(
                            "rounded-[calc(var(--radius)-2px)] px-3 py-1 text-[12px] font-medium transition-colors",
                            pushTargetPsa === "connectwise"
                              ? "bg-[var(--accent)] text-white"
                              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                            focusRing,
                          )}
                          onClick={() => setPushTargetPsa("connectwise")}
                        >
                          ConnectWise
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setPushModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto overscroll-contain p-5 lg:grid-cols-3 md:overscroll-auto">
              <div
                className={cn(
                  "rounded-[var(--radius)] border border-[var(--border)] p-4",
                  pushModalMobileStep !== 0 && "hidden lg:block",
                )}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">Step 1</p>
                <h4 className="mt-1 text-sm font-semibold text-[var(--text-primary)]">Select tickets to post to</h4>
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <button type="button" className="text-[var(--accent)]" onClick={() => setPushSelectedTicketIds(pushModalImportRows.map((t) => t.id))}>Select all</button>
                  <button type="button" className="text-[var(--text-secondary)]" onClick={() => setPushSelectedTicketIds([])}>Deselect all</button>
                </div>
                <div className="mt-3 space-y-2">
                  {pushModalImportRows.map((t) => (
                    <label key={t.id} className="flex items-start gap-2 rounded-[var(--radius)] border border-[var(--border)] p-2 text-xs">
                      <input
                        type="checkbox"
                        checked={pushSelectedTicketIds.includes(t.id)}
                        onChange={() =>
                          setPushSelectedTicketIds((prev) =>
                            prev.includes(t.id) ? prev.filter((x) => x !== t.id) : [...prev, t.id],
                          )
                        }
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-[var(--text-primary)]">{t.title} - {t.clientName}</span>
                        <span className="text-[var(--text-muted)]">#{t.id} · {t.status}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div
                className={cn(
                  "rounded-[var(--radius)] border border-[var(--border)] p-4",
                  pushModalMobileStep !== 1 && "hidden lg:block",
                )}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">Step 2</p>
                <h4 className="mt-1 text-sm font-semibold text-[var(--text-primary)]">Choose what to include in the note</h4>
                <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                  Client email is sent via Email client, not pushed to PSA.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  {(
                    [
                      ["actions", "Action log"],
                      ["risks", "Risk log"],
                      ["summary", "Summary"],
                      ["status_report", "Status report"],
                    ] as const
                  ).map(([id, label]) => (
                    <label key={id} className="flex items-center gap-2 rounded border border-[var(--border)] p-2">
                      <input
                        type="checkbox"
                        checked={pushSelectedOutputs.includes(id)}
                        onChange={() =>
                          setPushSelectedOutputs((prev) =>
                            prev.includes(id)
                              ? prev.filter((x) => x !== id)
                              : [...prev, id],
                          )
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
                {pushSelectedTicketIds.length > 1 && pushSelectedOutputs.includes("summary") ? (
                  <div className="mt-4 space-y-2">
                    <p className="text-[11px] font-medium text-[var(--text-muted)]">Summary scope</p>
                    <div
                      className="inline-flex rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] p-0.5"
                      role="group"
                      aria-label="Summary scope"
                    >
                      <button
                        type="button"
                        className={cn(
                          "rounded-[calc(var(--radius)-2px)] px-2.5 py-1 text-[11px] font-medium transition-colors",
                          pushSummaryScope === "per_ticket"
                            ? "bg-[var(--accent)] text-white"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                          focusRing,
                        )}
                        onClick={() => setPushSummaryScope("per_ticket")}
                      >
                        Per ticket
                      </button>
                      <button
                        type="button"
                        className={cn(
                          "rounded-[calc(var(--radius)-2px)] px-2.5 py-1 text-[11px] font-medium transition-colors",
                          pushSummaryScope === "combined_all"
                            ? "bg-[var(--accent)] text-white"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                          focusRing,
                        )}
                        onClick={() => setPushSummaryScope("combined_all")}
                      >
                        Combined (all tickets)
                      </button>
                    </div>
                  </div>
                ) : null}
                {pushSelectedTicketIds.length > 1 && pushSelectedOutputs.includes("status_report") ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-[11px] font-medium text-[var(--text-muted)]">Status report scope</p>
                    <div
                      className="inline-flex rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] p-0.5"
                      role="group"
                      aria-label="Status report scope"
                    >
                      <button
                        type="button"
                        className={cn(
                          "rounded-[calc(var(--radius)-2px)] px-2.5 py-1 text-[11px] font-medium transition-colors",
                          pushStatusScope === "per_ticket"
                            ? "bg-[var(--accent)] text-white"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                          focusRing,
                        )}
                        onClick={() => setPushStatusScope("per_ticket")}
                      >
                        Per ticket
                      </button>
                      <button
                        type="button"
                        className={cn(
                          "rounded-[calc(var(--radius)-2px)] px-2.5 py-1 text-[11px] font-medium transition-colors",
                          pushStatusScope === "combined_all"
                            ? "bg-[var(--accent)] text-white"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                          focusRing,
                        )}
                        onClick={() => setPushStatusScope("combined_all")}
                      >
                        Combined (all tickets)
                      </button>
                    </div>
                  </div>
                ) : null}
                <div className="mt-4 border-t border-[var(--border)] pt-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
                    Excel Report Pack
                  </p>
                  <label className="flex items-center justify-between gap-2 text-sm text-[var(--text-primary)]">
                    <span>{`Attach Excel to ${pushModalHeaderLabel} note`}</span>
                    <input type="checkbox" checked={pushAttachExcel} onChange={(e) => setPushAttachExcel(e.target.checked)} />
                  </label>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {`The Excel file will be attached directly to the ${pushModalHeaderLabel} ticket note`}
                  </p>
                  {pushAttachExcel ? (
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      {[...SCHEDULE_EXCEL_CORE_KEYS, ...SCHEDULE_EXCEL_OPTIONAL_TAB_KEYS].map((tab) => (
                        <label key={tab} className="flex items-center gap-2 rounded border border-[var(--border)] p-2">
                          <input
                            type="checkbox"
                            checked={selectedExcelTabs.includes(tab)}
                            onChange={() => {
                              if (tab === "client_email") {
                                setSelectedExcelTabs((prev) =>
                                  prev.includes("client_email")
                                    ? prev.filter((t) => t !== "client_email")
                                    : [...prev, "client_email"],
                                );
                              } else {
                                toggleSelectedExcelTab(tab);
                              }
                            }}
                          />
                          {excelSheetLabel(tab)}
                        </label>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <div
                className={cn(
                  "rounded-[var(--radius)] border border-[var(--border)] p-4",
                  pushModalMobileStep !== 2 && "hidden lg:block",
                )}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">Step 3</p>
                <h4 className="mt-1 text-sm font-semibold text-[var(--text-primary)]">Confirm</h4>
                <div className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                  <p>Posting to: <strong>{pushSelectedTicketIds.length}</strong> tickets</p>
                  <p>Includes: <strong>{pushSelectedOutputs.join(", ") || "None"}</strong></p>
                  <p>Excel: <strong>{pushAttachExcel ? `Attached (${selectedExcelTabs.length} sheets)` : "No attachment"}</strong></p>
                </div>
                {pushErrors.length > 0 ? (
                  <div className="mt-3 rounded border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-300">
                    {pushErrors.map((e) => (
                      <p key={e.ticketId}>#{e.ticketId}: {e.error}</p>
                    ))}
                  </div>
                ) : null}
                <Button
                  type="button"
                  className="mt-4 hidden w-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] lg:flex"
                  onClick={() => void executePushToHalo()}
                  disabled={pushLoading || pushSelectedTicketIds.length === 0 || pushSelectedOutputs.length === 0}
                >
                  {pushLoading ? "Pushing..." : `Push to ${pushModalHeaderLabel}`}
                </Button>
              </div>
            </div>
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 lg:hidden">
              {pushModalMobileStep > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPushModalMobileStep((s) => Math.max(0, s - 1))}
                >
                  ← Back
                </Button>
              ) : (
                <span className="w-px shrink-0" aria-hidden />
              )}
              {pushModalMobileStep < 2 ? (
                <Button
                  type="button"
                  size="sm"
                  className="ml-auto bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                  disabled={
                    (pushModalMobileStep === 0 &&
                      (pushSelectedTicketIds.length === 0 || pushLoading)) ||
                    (pushModalMobileStep === 1 && (pushSelectedOutputs.length === 0 || pushLoading))
                  }
                  onClick={() => setPushModalMobileStep((s) => Math.min(2, s + 1))}
                >
                  Next →
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  className="ml-auto bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                  onClick={() => void executePushToHalo()}
                  disabled={pushLoading || pushSelectedTicketIds.length === 0 || pushSelectedOutputs.length === 0}
                >
                  {pushLoading ? "Pushing..." : `Push to ${pushModalHeaderLabel}`}
                </Button>
              )}
            </div>
            </div>
          </div>
        </div>
      ) : null}
      <Dialog open={!!templatePreview} onOpenChange={() => setTemplatePreview(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{templatePreview?.name ?? "Template"}</DialogTitle>
            <DialogDescription>
              Template preview
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[340px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/20 p-3 text-sm">
            {templatePreview?.content}
          </div>
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={() => templatePreview && void handleDeleteTemplate(templatePreview.id)}
            >
              Delete
            </Button>
            <Button
              type="button"
              onClick={() => templatePreview && applyTemplateForNextGeneration(templatePreview)}
            >
              Use this template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!onboardingRedirectPending ? (
      <HaloImportModal
        open={haloImportOpen}
        onOpenChange={setHaloImportOpen}
        forceDemoMode={demoModeActive}
        onProRequired={() => setHaloProModalOpen(true)}
        onConnectionInvalid={(message) => {
          setHaloConnected(false);
          setHaloError(message);
          openIntegrationsInConfiguration({ initialDetail: "halo" });
          setHaloConfigOpen(true);
        }}
        onImport={({ formatted, count, selectedClientName, dataType, importedItems, fromDemo, inputQuality }) => {
          setInput(formatted);
          setSessionUsesDemoData(Boolean(fromDemo));
          setLastImportedHaloItems(importedItems);
          setLastInputQuality(inputQuality ?? null);
          setLastImportSourcePsa("halopsa");
          setPushTargetPsa("halopsa");
          setIsInputCollapsed(importedItems.length > 0);
          if (selectedClientName) {
            setProjectName(selectedClientName);
          }
          setHaloImportOpen(false);
          window.requestAnimationFrame(() => {
            inputSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          });
          const noun =
            dataType === "projects"
              ? count === 1
                ? "project"
                : "projects"
              : count === 1
                ? "ticket"
                : "tickets";
          toast({
            message: "Imported from HaloPSA",
            subtitle: `${count} ${noun} imported - ready to generate`,
            durationMs: 3000,
          });
        }}
      />
      ) : null}
      {!onboardingRedirectPending ? (
      <CwImportModal
        open={cwImportOpen}
        connectwiseConnected={cwConnected}
        forceDemoMode={demoModeActive}
        demoModeActive={demoModeActive}
        onOpenChange={setCwImportOpen}
        onImport={({ formatted, count, selectedClientName, dataType, importedItems, fromDemo, inputQuality }) => {
          setInput(formatted);
          setSessionUsesDemoData(Boolean(fromDemo));
          setLastImportedHaloItems(importedItems);
          setLastInputQuality(inputQuality ?? null);
          setIsInputCollapsed(importedItems.length > 0);
          setCwImportedCount((prev) => prev + count);
          setLastImportSourcePsa("connectwise");
          setPushTargetPsa("connectwise");
          if (selectedClientName) {
            setProjectName(selectedClientName);
          }
          setCwImportOpen(false);
          window.requestAnimationFrame(() => {
            inputSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          });
          const noun =
            dataType === "projects"
              ? count === 1
                ? "project"
                : "projects"
              : count === 1
                ? "ticket"
                : "tickets";
          toast({
            message: "Imported from ConnectWise",
            subtitle: `${count} ${noun} imported - ready to generate`,
            durationMs: 3000,
          });
        }}
      />
      ) : null}

      <Dialog
        open={scheduleReportPreviewOpen}
        onOpenChange={(open) => {
          setScheduleReportPreviewOpen(open);
          if (!open) {
            setScheduleEmailPreviewLoading(false);
            setScheduleEmailPreviewHtml(null);
            setScheduleEmailPreviewError(null);
            setScheduleEmailPreviewGeneratedAt(null);
          }
        }}
      >
        <DialogContent
          className="flex max-h-[min(90vh,860px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[720px)"
          showCloseButton
        >
          <DialogHeader className="shrink-0 border-b border-[var(--border)] px-6 py-4 text-left">
            <DialogTitle>Email preview</DialogTitle>
            <DialogDescription className="text-[var(--text-secondary)]">
              This is what your next report will look like
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--bg-secondary)]">
            <div className="min-h-[min(52vh,480px)] flex-1 overflow-hidden">
              {scheduleEmailPreviewLoading ? (
                <div className="flex flex-col gap-4 px-6 py-10" aria-busy>
                  <p className="text-center text-sm text-[var(--text-secondary)]">
                    Pulling live HaloPSA data and generating preview...
                  </p>
                  <div className="animate-pulse space-y-3">
                    <div className="mx-auto h-3 w-[55%] max-w-sm rounded bg-[var(--bg-primary)]" />
                    <div className="min-h-[min(280px,40vh)] w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] shadow-inner" />
                    <div className="mx-auto h-2 w-2/3 max-w-md rounded bg-[var(--bg-primary)]" />
                  </div>
                </div>
              ) : scheduleEmailPreviewError ? (
                <div className="px-6 py-8">
                  <p className="text-sm text-red-600 dark:text-red-400">{scheduleEmailPreviewError}</p>
                </div>
              ) : scheduleEmailPreviewHtml ? (
                <iframe
                  title="Scheduled report email preview"
                  className="h-[min(72vh,720px)] w-full border-0 bg-white"
                  sandbox="allow-same-origin"
                  srcDoc={scheduleEmailPreviewHtml}
                />
              ) : (
                <div className="px-6 py-8">
                  <p className="text-sm text-[var(--text-muted)]">No preview loaded.</p>
                </div>
              )}
            </div>
            <div className="shrink-0 border-t border-[var(--border)] bg-[var(--bg-primary)] px-6 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-[var(--text-muted)]">
                  {scheduleEmailPreviewGeneratedAt ? (
                    <>
                      Preview generated{" "}
                      <span className="font-medium text-[var(--text-secondary)]">
                        {formatScheduledPreviewAgeLabel(
                          scheduleEmailPreviewGeneratedAt,
                          schedulePreviewAgeTick,
                        )}
                      </span>{" "}
                      from live HaloPSA data
                    </>
                  ) : (
                    "Preview uses the same generation path as Send now (no email is sent)."
                  )}
                </p>
                <button
                  type="button"
                  disabled={scheduleEmailPreviewLoading}
                  className="shrink-0 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => void refreshScheduleEmailPreview()}
                >
                  {scheduleEmailPreviewLoading ? "Refreshing…" : "Refresh preview"}
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {lockedTeaserOpen ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-[rgba(255,255,255,0.85)] dark:bg-[rgba(15,23,42,0.85)]"
            style={{ backdropFilter: "blur(8px)" }}
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
            <div
              className="w-full max-w-[860px] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-5"
              style={{ filter: "blur(6px)" }}
            >
              <Tabs
                value={lockedTeaserTab}
                onValueChange={(v) =>
                  setLockedTeaserTab(v as "actions" | "risks" | "summary" | "client_email" | "status_report")
                }
                className="w-full gap-0"
              >
                <TabsList
                  variant="line"
                  className="min-h-[48px] w-full flex-nowrap overflow-x-auto items-center justify-start gap-4 rounded-none border-b border-[var(--border)] bg-[var(--bg-secondary)] p-0"
                >
                  <TabsTrigger value="actions">Actions</TabsTrigger>
                  <TabsTrigger value="risks">Risks</TabsTrigger>
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="client_email">Client Email</TabsTrigger>
                  <TabsTrigger value="status_report">Status Report</TabsTrigger>
                </TabsList>
                <TabsContent value={lockedTeaserTab} className="mt-0 pt-4">
                  <div className="space-y-3">
                    <div className="h-4 w-[85%] rounded bg-[var(--border)]/60" />
                    <div className="h-4 w-[95%] rounded bg-[var(--border)]/60" />
                    <div className="h-4 w-[92%] rounded bg-[var(--border)]/60" />
                    <div className="h-4 w-[75%] rounded bg-[var(--border)]/60" />
                    <div className="h-4 w-[88%] rounded bg-[var(--border)]/60" />
                    <div className="h-4 w-[68%] rounded bg-[var(--border)]/60" />
                    <div className="h-4 w-[90%] rounded bg-[var(--border)]/60" />
                    <div className="h-4 w-[80%] rounded bg-[var(--border)]/60" />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div className="relative w-full max-w-[480px] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-8 text-center shadow-lg">
              <button
                type="button"
                aria-label="Close teaser"
                onClick={() => setLockedTeaserOpen(false)}
                className="absolute right-4 top-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="size-4" />
              </button>
              <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
                <Lock className="size-6" />
              </div>
              <h3 className="text-[22px] font-bold text-[var(--text-primary)]">
                Your outputs are ready
              </h3>
              <p className="mt-3 text-[15px] text-[var(--text-secondary)]">
                Create a free account to see your action list, risk log, client
                email and status report.
              </p>
              <Link href="/onboarding/connect" className="mt-6 block">
                <Button className="w-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]">
                  Create free account
                </Button>
              </Link>
              <Link
                href="/auth?tab=signin"
                className="mt-3 block text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Sign in
              </Link>
              <p className="mt-4 text-[12px] text-[var(--text-muted)]">
                Run the free PSA scan before you buy.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <Dialog open={demoModalOpen} onOpenChange={setDemoModalOpen}>
        <DialogContent className="sm:max-w-[680px] overflow-hidden" showCloseButton>
          <DialogHeader>
            <DialogTitle>Here is what Handover generates</DialogTitle>
            <DialogDescription>
              From your notes to 5 professional outputs in seconds
            </DialogDescription>
          </DialogHeader>
          <div
            className="flex flex-col gap-3 rounded-[var(--radius-lg)] p-3 sm:flex-row sm:items-center sm:justify-between"
            style={{
              backgroundColor: "rgba(56,189,248,0.08)",
              border: "1px solid rgba(56,189,248,0.2)",
            }}
          >
            <p className="text-sm text-[var(--text-secondary)]">
              This is a demo output. Create a free account to generate from your
              own notes.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/onboarding/connect">
                <Button
                  type="button"
                  className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                >
                  Create free account
                </Button>
              </Link>
              <Link href="/auth?tab=signin">
                <Button type="button" variant="outline">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>

          <Tabs
            value={demoTab}
            onValueChange={(v) =>
              setDemoTab(v as "actions" | "risks" | "summary" | "client_email" | "status_report")
            }
            className="w-full gap-0"
          >
            <TabsList
              variant="line"
              className="min-h-[48px] w-full flex-nowrap overflow-x-auto items-center justify-start gap-4 rounded-none border-b border-[var(--border)] bg-[var(--bg-secondary)] p-0"
            >
              <TabsTrigger value="actions" className="shrink-0 text-[var(--text-muted)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--accent)] data-[state=active]:text-[var(--text-primary)]">
                Actions
              </TabsTrigger>
              <TabsTrigger value="risks" className="shrink-0 text-[var(--text-muted)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--accent)] data-[state=active]:text-[var(--text-primary)]">
                Risks
              </TabsTrigger>
              <TabsTrigger value="summary" className="shrink-0 text-[var(--text-muted)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--accent)] data-[state=active]:text-[var(--text-primary)]">
                Summary
              </TabsTrigger>
              <TabsTrigger value="client_email" className="shrink-0 text-[var(--text-muted)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--accent)] data-[state=active]:text-[var(--text-primary)]">
                Client Email
              </TabsTrigger>
              <TabsTrigger value="status_report" className="shrink-0 text-[var(--text-muted)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--accent)] data-[state=active]:text-[var(--text-primary)]">
                Status Report
              </TabsTrigger>
            </TabsList>

            <TabsContent value="actions" className="mt-0 overflow-hidden pt-4">
              <div className="mb-3 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    copyWithFeedback(
                      "demo_actions",
                      formatActionsForCopy(SIGNED_OUT_DEMO_RESULT.actions),
                    )
                  }
                >
                  Copy
                </Button>
              </div>
              <Table style={{ tableLayout: "fixed", width: "100%" }}>
                <TableHeader>
                  <TableRow>
                    <TableHead style={{ width: "60%" }}>Task</TableHead>
                    <TableHead style={{ width: "20%" }}>Owner</TableHead>
                    <TableHead style={{ width: "20%" }}>Priority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SIGNED_OUT_DEMO_RESULT.actions.map((row, idx) => (
                    <TableRow key={`demo-action-${idx}`}>
                      <TableCell style={{ overflow: "hidden", whiteSpace: "normal", wordBreak: "break-word" }}>
                        {row.task}
                      </TableCell>
                      <TableCell style={{ overflow: "hidden", whiteSpace: "normal", wordBreak: "break-word" }}>
                        {formatOwnerLabel(row.suggested_owner)}
                      </TableCell>
                      <TableCell style={{ overflow: "hidden", whiteSpace: "normal", wordBreak: "break-word" }}>
                        {row.priority}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="risks" className="mt-0 overflow-hidden pt-4">
              <div className="mb-3 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    copyWithFeedback(
                      "demo_risks",
                      formatRisksForCopy(SIGNED_OUT_DEMO_RESULT.risks),
                    )
                  }
                >
                  Copy
                </Button>
              </div>
              <Table style={{ tableLayout: "fixed", width: "100%" }}>
                <TableHeader>
                  <TableRow>
                    <TableHead style={{ width: "35%" }}>Risk</TableHead>
                    <TableHead style={{ width: "35%" }}>Impact</TableHead>
                    <TableHead style={{ width: "30%" }}>Mitigation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SIGNED_OUT_DEMO_RESULT.risks.map((row, idx) => (
                    <TableRow key={`demo-risk-${idx}`}>
                      <TableCell style={{ overflow: "hidden", whiteSpace: "normal", wordBreak: "break-word" }}>
                        {row.risk}
                      </TableCell>
                      <TableCell style={{ overflow: "hidden", whiteSpace: "normal", wordBreak: "break-word" }}>
                        {row.impact}
                      </TableCell>
                      <TableCell style={{ overflow: "hidden", whiteSpace: "normal", wordBreak: "break-word" }}>
                        {row.mitigation}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="summary" className="mt-0 pt-4">
              <div className="mb-3 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    copyWithFeedback("demo_summary", SIGNED_OUT_DEMO_RESULT.summary)
                  }
                >
                  Copy
                </Button>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {SIGNED_OUT_DEMO_RESULT.summary}
              </p>
            </TabsContent>

            <TabsContent value="client_email" className="mt-0 pt-4">
              <div className="mb-3 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    copyWithFeedback(
                      "demo_client_email",
                      SIGNED_OUT_DEMO_RESULT.client_email,
                    )
                  }
                >
                  Copy
                </Button>
              </div>
              <p className="mb-3 text-xs text-[var(--text-muted)]">
                Subject: {SIGNED_OUT_DEMO_RESULT.email_subject}
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {SIGNED_OUT_DEMO_RESULT.client_email}
              </p>
            </TabsContent>

            <TabsContent value="status_report" className="mt-0 pt-4">
              <div className="mb-3 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    copyWithFeedback(
                      "demo_status_report",
                      SIGNED_OUT_DEMO_RESULT.status_report,
                    )
                  }
                >
                  Copy
                </Button>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {SIGNED_OUT_DEMO_RESULT.status_report}
              </p>
            </TabsContent>
          </Tabs>

          <div className="pt-2">
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-4">
              <p className="text-sm text-[var(--text-secondary)]">
                Free PSA scan
              </p>
              <Link href="/onboarding/connect" className="mt-3 inline-flex w-full">
                <Button
                  type="button"
                  className="w-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                >
                  Create free account
                </Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PremiumHardLimitModal
        open={premiumHardLimitOpen}
        onOpenChange={setPremiumHardLimitOpen}
        checkoutLoadingPriceId={checkoutLoadingPriceId}
        onCheckout={(id) => void startCheckout(id)}
        onContinueFree={() => setPremiumHardLimitOpen(false)}
        limitType={hardLimitType}
        monthlyPayingPlan={stripeMonthlyPayingPlan}
        onSwitchToAnnualPortal={() => void openBillingPortal("/")}
        portalLoading={portalNavigating}
      />

      <ProFeatureGateModal
        open={proFeatureGate !== null}
        onOpenChange={(o) => {
          if (!o) {
            markUpgradePromptConsumed();
            setProFeatureGate(null);
          }
        }}
        featureName={proFeatureGate ?? "This feature"}
        upgradePlan={proFeatureGate === "Client Intelligence" ? "growth" : "starter"}
        checkoutLoadingPriceId={checkoutLoadingPriceId}
        onCheckout={(id) => {
          markUpgradePromptConsumed();
          setProFeatureGate(null);
          void startCheckout(id);
        }}
        monthlyPayingPlan={stripeMonthlyPayingPlan}
        onSwitchToAnnualPortal={() => void openBillingPortal("/")}
        portalLoading={portalNavigating}
      />

      <Dialog
        open={scheduledReportsProPaywallOpen}
        onOpenChange={setScheduledReportsProPaywallOpen}
      >
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Scheduled Reports is included with Handover</DialogTitle>
            <DialogDescription>
              Upgrade to unlock automated weekly reporting - save schedules, run on your PSA data, and email clients on
              autopilot.
            </DialogDescription>
          </DialogHeader>
          <UpgradePlanCards
            className="mt-2"
            onUpgrade={(id) => {
              setScheduledReportsProPaywallOpen(false);
              void startCheckout(id);
            }}
            loadingPriceId={checkoutLoadingPriceId}
            monthlyPayingSubscription={stripeMonthlyPayingPlan}
            onSwitchToAnnualPortal={() => void openBillingPortal("/")}
            portalLoading={portalNavigating}
          />
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setScheduledReportsProPaywallOpen(false)}>
              Not now
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={proExportModalOpen} onOpenChange={setProExportModalOpen}>
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Move to Handover</DialogTitle>
            <DialogDescription>
              Export a full report pack with action log, risk log, client email and status report in one formatted Excel
              file.
            </DialogDescription>
            <p className="mt-2 text-[13px] font-medium text-[var(--accent)]">
              £499/month or £4,990/year. Cancel anytime.
            </p>
          </DialogHeader>
          <UpgradePlanCards
            className="mt-2"
            onUpgrade={(id) => void startCheckout(id)}
            loadingPriceId={checkoutLoadingPriceId}
            monthlyPayingSubscription={stripeMonthlyPayingPlan}
            onSwitchToAnnualPortal={() => void openBillingPortal("/")}
            portalLoading={portalNavigating}
          />
          <DialogFooter className="sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setProExportModalOpen(false)}>
              Not now
            </Button>
          </DialogFooter>
          <div className="px-6 pb-5 text-center">
            <Link
              href="/pricing"
              className="text-[13px] font-medium text-[var(--text-secondary)] hover:text-white"
            >
              See all features
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={fullReportExportPickerOpen}
        onOpenChange={(open) => {
          setFullReportExportPickerOpen(open);
        }}
      >
        <DialogContent className="max-h-[min(90dvh,720px)] overflow-y-auto sm:max-w-2xl" showCloseButton>
          <DialogHeader>
            <DialogTitle>Export Excel - sheets</DialogTitle>
            <DialogDescription>
              Choose which workbook tabs to include. Your selection is remembered on this device.
            </DialogDescription>
          </DialogHeader>
          {fullReportExcelSheetPickerOptions.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No generated sheets available to export.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[12px] font-medium text-[var(--text-secondary)]">Workbook tabs</p>
                <button
                  type="button"
                  className={cn("text-[12px] font-medium text-[var(--accent)] underline-offset-2 hover:underline", focusRing)}
                  onClick={() =>
                    setExportFullTabs(fullReportExcelSheetPickerOptions.map((o) => o.id))
                  }
                >
                  Select all
                </button>
              </div>
              <div className="max-h-none space-y-0 overflow-visible rounded-[var(--radius)] border border-[var(--border)] md:max-h-[min(70vh,500px)] md:overflow-y-auto">
                {fullReportExcelSheetPickerOptions.map((row) => {
                  const checked = exportFullTabs.includes(row.id);
                  return (
                    <label
                      key={row.id}
                      className="flex cursor-pointer items-center gap-3 border-b border-[var(--border)] px-3 py-2.5 text-[13px] last:border-b-0 hover:bg-[color-mix(in_srgb,var(--bg-secondary)_80%,transparent)]"
                    >
                      <input
                        type="checkbox"
                        className="size-4 shrink-0 rounded border-[var(--border)] text-[var(--accent)]"
                        checked={checked}
                        onChange={() =>
                          setExportFullTabs((prev) => toggleStringInArray(prev, row.id, !checked))
                        }
                      />
                      <span className="text-[var(--text-primary)]">{row.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setFullReportExportPickerOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
              disabled={exportFullTabs.length === 0 || fullReportExcelSheetPickerOptions.length === 0}
              onClick={() => {
                const defCols = EXPORT_DEFAULTS.fullReport;
                const actionCols = [...defCols.actionColumns];
                const riskCols = [...defCols.riskColumns];
                setExportFullActionCols(actionCols);
                setExportFullRiskCols(riskCols);
                saveFullReportExportPrefs({
                  tabs: exportFullTabs,
                  actionColumns: actionCols,
                  riskColumns: riskCols,
                });
                void handleFullReportExcelExport();
              }}
            >
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={haloProModalOpen} onOpenChange={setHaloProModalOpen}>
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Move to Handover</DialogTitle>
            <DialogDescription>
              Connect HaloPSA to pull tickets directly into Handover. No more copy pasting.
            </DialogDescription>
            <p className="mt-2 text-[13px] font-medium text-[var(--accent)]">
              £499/month or £4,990/year. Cancel anytime.
            </p>
          </DialogHeader>
          <UpgradePlanCards
            className="mt-2"
            onUpgrade={(id) => void startCheckout(id)}
            loadingPriceId={checkoutLoadingPriceId}
            monthlyPayingSubscription={stripeMonthlyPayingPlan}
            onSwitchToAnnualPortal={() => void openBillingPortal("/")}
            portalLoading={portalNavigating}
          />
          <DialogFooter className="sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setHaloProModalOpen(false)}>
              Not now
            </Button>
          </DialogFooter>
          <div className="px-6 pb-5 text-center">
            <Link
              href="/pricing"
              className="text-[13px] font-medium text-[var(--text-secondary)] hover:text-white"
            >
              See all features
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={headerUpgradeOpen} onOpenChange={setHeaderUpgradeOpen}>
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Move to Handover</DialogTitle>
            <DialogDescription>
              Unlimited generations, HaloPSA import, full Excel reports, PowerPoint exports, and priority support.
              £499/month or £4,990/year.
            </DialogDescription>
          </DialogHeader>
          <UpgradePlanCards
            className="mt-2"
            onUpgrade={(id) => void startCheckout(id)}
            loadingPriceId={checkoutLoadingPriceId}
            monthlyPayingSubscription={stripeMonthlyPayingPlan}
            onSwitchToAnnualPortal={() => void openBillingPortal("/")}
            portalLoading={portalNavigating}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={npsOpen}
        onOpenChange={(open) => {
          if (open) {
            if (npsAdvanceTimerRef.current) {
              clearTimeout(npsAdvanceTimerRef.current);
              npsAdvanceTimerRef.current = null;
            }
            setNpsOpen(true);
          } else {
            setNpsOpen(false);
            setNpsPhase("score");
            setNpsScore(null);
            setNpsComment("");
            setNpsSending(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          {npsPhase === "score" ? (
            <>
              <DialogHeader>
                <DialogTitle>Quick question</DialogTitle>
                <DialogDescription>
                  How likely are you to recommend Handover to a colleague?
                </DialogDescription>
              </DialogHeader>
              <div className="mt-2 flex flex-wrap justify-center gap-1.5 sm:gap-1">
                {Array.from({ length: 11 }, (_, s) => {
                  const detractor = s <= 6;
                  const passive = s >= 7 && s <= 8;
                  const selected = npsPhase === "score" && npsScore === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      className={cn(
                        "h-9 min-w-8 rounded-md border text-sm font-medium transition-colors sm:min-w-9",
                        detractor &&
                          (selected
                            ? "border-red-500 bg-red-500 text-white"
                            : "border-red-200/80 bg-background hover:bg-red-500/15 dark:border-red-900/50 dark:hover:bg-red-500/20"),
                        passive &&
                          (selected
                            ? "border-amber-500 bg-amber-500 text-white"
                            : "border-amber-200/90 bg-background hover:bg-amber-500/18 dark:border-amber-900/40 dark:hover:bg-amber-500/22"),
                        !detractor &&
                          !passive &&
                          (selected
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-emerald-200/90 bg-background hover:bg-emerald-500/18 dark:border-emerald-900/40 dark:hover:bg-emerald-500/22"),
                      )}
                      onClick={() => {
                        if (npsAdvanceTimerRef.current) {
                          clearTimeout(npsAdvanceTimerRef.current);
                          npsAdvanceTimerRef.current = null;
                        }
                        setNpsScore(s);
                        npsAdvanceTimerRef.current = setTimeout(() => {
                          npsAdvanceTimerRef.current = null;
                          if (s >= 9) setNpsPhase("promoter");
                          else if (s >= 7) setNpsPhase("passive");
                          else setNpsPhase("detractor");
                        }, 500);
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between px-0.5 text-xs text-muted-foreground">
                <span>Not likely</span>
                <span>Very likely</span>
              </div>
            </>
          ) : null}

          {npsPhase === "promoter" ? (
            <div className="grid gap-4 pt-1">
              <p className="text-sm text-foreground">
                That is great to hear. Would you mind sharing a quick review? It really helps.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                  onClick={() => {
                    window.open(
                      `mailto:lewis@gethandover.uk?subject=${encodeURIComponent("Handover review")}`,
                      "_blank",
                      "noopener,noreferrer",
                    );
                    setNpsPhase("thanks");
                  }}
                >
                  Leave a review
                </Button>
                <button
                  type="button"
                  className="text-left text-sm text-muted-foreground underline-offset-4 hover:underline"
                  onClick={() => setNpsPhase("thanks")}
                >
                  Maybe later
                </button>
              </div>
            </div>
          ) : null}

          {npsPhase === "passive" ? (
            <div className="grid gap-4 pt-1">
              <p className="text-sm text-foreground">
                Thanks for the feedback. What would make it a 10 for you?
              </p>
              <Textarea
                value={npsComment}
                onChange={(e) => setNpsComment(e.target.value)}
                rows={3}
                className="min-h-[4.5rem] resize-y"
                placeholder="Optional"
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  disabled={npsSending || npsScore == null}
                  className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                  onClick={() => {
                    if (npsScore == null) return;
                    void (async () => {
                      const sb = createClient();
                      const {
                        data: { user: u },
                      } = await sb.auth.getUser();
                      if (!u) return;
                      setNpsSending(true);
                      try {
                        const res = await fetch("/api/nps", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            score: npsScore,
                            comment: npsComment.trim() || null,
                            userId: u.id,
                          }),
                        });
                        if (!res.ok) {
                          toast({
                            message: "Could not send feedback",
                            variant: "error",
                            durationMs: 4000,
                          });
                          return;
                        }
                        setNpsPhase("thanks");
                      } finally {
                        setNpsSending(false);
                      }
                    })();
                  }}
                >
                  {npsSending ? "Sending…" : "Send feedback"}
                </Button>
                <button
                  type="button"
                  className="text-left text-sm text-muted-foreground underline-offset-4 hover:underline"
                  onClick={() => setNpsPhase("thanks")}
                >
                  Skip
                </button>
              </div>
            </div>
          ) : null}

          {npsPhase === "detractor" ? (
            <div className="grid gap-4 pt-1">
              <p className="text-sm text-foreground">Sorry to hear that. What is not working for you?</p>
              <Textarea
                value={npsComment}
                onChange={(e) => setNpsComment(e.target.value)}
                rows={3}
                className="min-h-[4.5rem] resize-y"
                placeholder="Tell us more"
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  disabled={npsSending || npsScore == null}
                  className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                  onClick={() => {
                    if (npsScore == null) return;
                    void (async () => {
                      const sb = createClient();
                      const {
                        data: { user: u },
                      } = await sb.auth.getUser();
                      if (!u) return;
                      setNpsSending(true);
                      try {
                        const res = await fetch("/api/nps", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            score: npsScore,
                            comment: npsComment.trim() || null,
                            userId: u.id,
                          }),
                        });
                        if (!res.ok) {
                          toast({
                            message: "Could not send feedback",
                            variant: "error",
                            durationMs: 4000,
                          });
                          return;
                        }
                        setNpsPhase("thanks");
                      } finally {
                        setNpsSending(false);
                      }
                    })();
                  }}
                >
                  {npsSending ? "Sending…" : "Send feedback"}
                </Button>
                <button
                  type="button"
                  className="text-left text-sm text-muted-foreground underline-offset-4 hover:underline"
                  onClick={() => setNpsPhase("thanks")}
                >
                  Skip
                </button>
              </div>
            </div>
          ) : null}

          {npsPhase === "thanks" ? (
            <p className="py-4 text-center text-sm text-foreground">Thanks for your feedback</p>
          ) : null}
        </DialogContent>
      </Dialog>

      {userEmail && onboardingRedirectPending ? (
        <div
          className="flex h-screen w-screen items-center justify-center"
          style={{ background: "var(--bg-primary, #0f172a)" }}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[var(--accent)]" />
          </div>
        </div>
      ) : null}
      {(!userEmail || !onboardingRedirectPending) ? (
        <div>
        <div className="app-shell-geometry">
      {userEmail ? (
        <ChatsModal
          open={chatsModalOpen}
          onClose={() => setChatsModalOpen(false)}
          collections={collections}
          onRefreshCollections={refreshCollections}
          selectedCollectionId={selectedHistoryCollectionId}
          onSelectCollection={setSelectedHistoryCollectionId}
          filteredProjects={filteredHistoryProjects}
          selectedProjectId={selectedProjectId}
          onSelectProject={(p) => handleSelectProject(p as ProjectItem)}
          onNewGeneration={() => {
            handleNewGeneration();
            setChatsModalOpen(false);
            window.requestAnimationFrame(() => {
              generateInputRef.current?.focus();
              generateInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            });
          }}
          hasMoreProjects={hasMoreProjects}
          onLoadMoreProjects={() => void fetchProjects(projectsOffset, true)}
          mounted={mounted}
          formatRelativeTime={relativeTimeLabel}
          onRenameGeneration={async (id, title) => {
            const res = await fetch(`/api/generations/${id}/title`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title }),
              credentials: "same-origin",
            });
            if (res.ok) void refreshHistory();
          }}
          onMoveGeneration={async (id, collectionId) => {
            const res = await fetch(`/api/generations/${id}/collection`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ collection_id: collectionId }),
              credentials: "same-origin",
            });
            if (res.ok) {
              void refreshHistory();
              void refreshCollections();
            }
          }}
          onDeleteGeneration={async (id) => {
            const res = await fetch(`/api/generations/${id}`, {
              method: "DELETE",
              credentials: "same-origin",
            });
            if (res.ok) {
              if (selectedProjectId === id) handleNewGeneration();
              void refreshHistory();
              void refreshCollections();
              void refreshShellData();
            }
          }}
          onCreateCollection={async (name, color) => {
            const res = await fetch("/api/collections", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, color }),
              credentials: "same-origin",
            });
            if (res.ok) void refreshCollections();
          }}
          onUpdateCollection={async (id, patch) => {
            const res = await fetch(`/api/collections/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(patch),
              credentials: "same-origin",
            });
            if (res.ok) void refreshCollections();
          }}
          onDeleteCollection={async (id) => {
            const res = await fetch(`/api/collections/${id}`, {
              method: "DELETE",
              credentials: "same-origin",
            });
            if (res.ok) void refreshCollections();
          }}
          freeHistoryUpsell={
            !hasProAccess ? (
              <div
                className="mt-3 rounded-[var(--radius)] border border-[var(--border)] bg-[rgba(56,189,248,0.03)] p-3"
                role="region"
                aria-label="Upgrade for full history"
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
                    <Zap className="size-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                      Move to Handover
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-secondary)]">
                      Access your complete generation history. Never lose a report again.
                    </p>
                    <p className="mt-2 text-[13px] font-medium text-[var(--accent)]">
                      £499/month or £4,990/year. Cancel anytime.
                    </p>
                    <Button
                      type="button"
                      className="mt-3 w-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                      onClick={() => setHeaderUpgradeOpen(true)}
                      disabled={
                        (!STRIPE_PRO_MONTHLY_PRICE_ID && !STRIPE_PRO_ANNUAL_PRICE_ID) ||
                        checkoutLoadingPriceId !== null
                      }
                    >
                      Move to Handover
                    </Button>
                    <Link
                      href="/pricing"
                      className="mt-2 block text-[13px] font-medium text-[var(--accent)] hover:underline"
                    >
                      See all features
                    </Link>
                  </div>
                </div>
              </div>
            ) : null
          }
        />
      ) : null}

      <FirstGenerationCelebrationModal
        open={firstGenCelebrationOpen}
        onClose={() => setFirstGenCelebrationOpen(false)}
        onViewReport={() => {
          outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        onScheduleReport={() => {
          setFirstGenCelebrationOpen(false);
          if (!hasProAccess) {
            setHaloProModalOpen(true);
            return;
          }
          setMainView("scheduled");
          setSettingsOpen(false);
          setSidebarOpenMobile(false);
          openNewScheduleEditor();
          window.requestAnimationFrame(() => scrollCampaignEditorIntoView());
        }}
        onPushToHalo={() => {
          setFirstGenCelebrationOpen(false);
          outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          window.requestAnimationFrame(() => {
            document
              .getElementById("handover-output-push-halo")
              ?.scrollIntoView({ behavior: "smooth", block: "center" });
            setPushHaloHighlight(true);
          });
          if (!hasProAccess) {
            tryOpenProFeatureGate(`Push to ${pushPsaLabel}`);
            return;
          }
          openPushModal();
        }}
        onExportExcel={() => {
          setFirstGenCelebrationOpen(false);
          outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          void runFirstGenExcelFromCelebration();
        }}
      />

      {result ? (
        <SendClientEmailModal
          open={sendClientEmailModalOpen}
          onOpenChange={(open) => {
            setSendClientEmailModalOpen(open);
            if (!open) {
              setSmartActionEmailBody(null);
              setSmartActionEmailTo(null);
            }
          }}
          initialTo={smartActionEmailTo ?? generationMailtoEmail ?? ""}
          initialSubject={
            smartActionEmailBody === followUpModalBody && followUpModalSubject.trim()
              ? followUpModalSubject.trim()
              : (result.email_subject ?? "").trim() ||
                buildDefaultClientEmailSubject(projectName)
          }
          textBody={smartActionEmailBody ?? activeClientEmailBody}
          onSendSuccess={() => void markProfileLoopCompleted()}
        />
      ) : null}

      <Dialog open={followUpModalOpen} onOpenChange={setFollowUpModalOpen}>
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Follow-up email</DialogTitle>
            <DialogDescription>
              Based on {followUpModalActionCount} open action
              {followUpModalActionCount === 1 ? "" : "s"}
              {followUpClientOptions.length > 1
                ? followUpClientScope === FOLLOW_UP_ALL_CLIENTS
                  ? " across all clients"
                  : ` for ${followUpClientScope}`
                : ""}{" "}
              from your last report
            </DialogDescription>
          </DialogHeader>
          {followUpClientOptions.length > 1 ? (
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-[var(--text-muted)]">
                Follow up for
              </p>
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Follow-up client">
                {followUpClientOptions.map((clientName) => (
                  <button
                    key={clientName}
                    type="button"
                    role="tab"
                    aria-selected={followUpClientScope === clientName}
                    disabled={followUpLoading}
                    onClick={() => void generateFollowUpEmail(clientName, { openModal: false })}
                    className={cn(
                      "cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                      followUpClientScope === clientName
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : "border-[var(--border)] bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]",
                    )}
                  >
                    {clientName}
                  </button>
                ))}
                <button
                  type="button"
                  role="tab"
                  aria-selected={followUpClientScope === FOLLOW_UP_ALL_CLIENTS}
                  disabled={followUpLoading}
                  onClick={() =>
                    void generateFollowUpEmail(FOLLOW_UP_ALL_CLIENTS, { openModal: false })
                  }
                  className={cn(
                    "cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                    followUpClientScope === FOLLOW_UP_ALL_CLIENTS
                      ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                      : "border-[var(--border)] bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]",
                  )}
                >
                  All clients
                </button>
              </div>
            </div>
          ) : null}
          <div className="max-h-[min(50dvh,320px)] min-h-[8rem] overflow-y-auto overscroll-contain whitespace-pre-wrap rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)]/40 p-3 text-[13px] leading-relaxed text-[var(--text-primary)] md:overscroll-auto">
            {followUpLoading && !followUpModalBody.trim() ? (
              <span className="text-[var(--text-muted)]">Generating...</span>
            ) : (
              followUpModalBody
            )}
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className={cn(focusRing)}
              onClick={() => {
                void navigator.clipboard.writeText(followUpModalBody);
                toast({
                  message: "Copied to clipboard",
                  variant: "success",
                  durationMs: 2500,
                });
              }}
            >
              Copy
            </Button>
            <Button
              type="button"
              className={cn("bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]", focusRing)}
              onClick={() => {
                setSmartActionEmailBody(followUpModalBody);
                setSmartActionEmailTo(generationMailtoEmail ?? "");
                setFollowUpModalOpen(false);
                setSendClientEmailModalOpen(true);
              }}
            >
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {result && smartActionsResultSnapshot && userEmail ? (
        <SmartActionsPanel
          open={smartActionsOpen}
          onClose={() => setSmartActionsOpen(false)}
          focusRing={focusRing}
          reportContext={smartActionsReportContext}
          generationId={savedGenerationId}
          resultSnapshot={smartActionsResultSnapshot}
          projectName={projectName}
          onDoEmail={handleSmartActionEmail}
          onDoPushHalo={() => openPushModal()}
          onDoSchedule={() => {
            if (!hasProAccess) {
              setHaloProModalOpen(true);
              return;
            }
            setMainView("scheduled");
            setSettingsOpen(false);
            setSidebarOpenMobile(false);
          }}
          onDoSlack={replayGenerationWebhookNotify}
        />
      ) : null}

      <SettingsBodyPortal>                <div className="mx-auto max-w-2xl px-6 py-8">
                {settingsTab === "profile" ? (
                  <div className="space-y-8">
                    <div className="space-y-2">
                      <h3 className="text-[14px] font-medium text-white">Personal details</h3>
                      <p className="text-[12px] text-[var(--text-muted)]">
                        Your name and job title appear in client email sign-offs when no custom signature is set.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={profileFirstName}
                          onChange={(e) => setProfileFirstName(e.target.value)}
                          placeholder="First name"
                          className={cn("rounded-[var(--radius)] border-[var(--border)]", focusRing)}
                        />
                        <Input
                          value={profileLastName}
                          onChange={(e) => setProfileLastName(e.target.value)}
                          placeholder="Last name"
                          className={cn("rounded-[var(--radius)] border-[var(--border)]", focusRing)}
                        />
                      </div>
                      <Input
                        value={profileDisplayName}
                        onChange={(e) => setProfileDisplayName(e.target.value)}
                        placeholder="Display name on client emails (optional)"
                        className={cn("rounded-[var(--radius)] border-[var(--border)]", focusRing)}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={profileJobTitle}
                          onChange={(e) => setProfileJobTitle(e.target.value)}
                          placeholder="Job title"
                          className={cn("rounded-[var(--radius)] border-[var(--border)]", focusRing)}
                        />
                        <Input
                          value={profileCompanyName}
                          onChange={(e) => setProfileCompanyName(e.target.value)}
                          placeholder="Company name"
                          className={cn("rounded-[var(--radius)] border-[var(--border)]", focusRing)}
                        />
                      </div>
                      <div className="flex justify-end pt-1">
                        <Button
                          type="button"
                          className={cn(
                            "bg-[var(--accent)] text-[13px] text-white hover:bg-[var(--accent-hover)]",
                            focusRing,
                          )}
                          onClick={() => void saveSettings()}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-[14px] font-medium text-white">Signature</h3>
                      <p className="text-[12px] text-[var(--text-muted)]">
                        Optional full sign-off. When empty, generated emails use your profile display name, job title, and company (see Profile). The model is instructed not to substitute names from tickets.
                      </p>
                      <Textarea
                        value={signatureOverride}
                        onChange={(e) => setSignatureOverride(e.target.value)}
                        placeholder={"Kind regards,\nAlex Taylor\nTechnical Project Manager\nHarbour IT Group"}
                        rows={6}
                        className={cn("min-h-36 rounded-[var(--radius)] border-[var(--border)]", focusRing)}
                      />
                      <div className="space-y-2">
                        <p className="text-[13px] font-semibold text-[var(--text-primary)]">Effective sign-off</p>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          What generation uses when the box above is empty.
                        </p>
                        <div className="whitespace-pre-wrap rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] p-3 text-sm">
                          {signaturePreview}
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          className={cn("bg-[var(--accent)] text-[13px] text-white hover:bg-[var(--accent-hover)]", focusRing)}
                          onClick={() => void saveSignatureOverride()}
                        >
                          Save signature
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {settingsTab === "billing" ? (
                  <div className="space-y-5">
                    <div className="space-y-4">
                      {/* Reports meter — QBR packs + service reviews (hidden on free tier) */}
                      {billingReportLimit !== 0 ? (
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <p className="text-[13px] font-semibold text-white/80">
                              Reports this month
                            </p>
                            <p className="mt-0.5 text-[11px] text-white/40">
                              Client reports, service reviews, QBR packs
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-[12px] tabular-nums text-white/40">
                              {qbrMonthCount ?? 0}
                              {billingReportLimit !== null ? ` / ${billingReportLimit}` : ""}
                            </p>
                            {billingReportLimit === null ? (
                              <span className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                                Unlimited
                              </span>
                            ) : null}
                          </div>
                        </div>
                        {billingReportLimit !== null && billingReportLimit > 0 ? (
                          <>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  (qbrMonthCount ?? 0) >= billingReportLimit
                                    ? "bg-red-400"
                                    : (qbrMonthCount ?? 0) >= billingReportLimit * 0.9
                                      ? "bg-amber-400"
                                      : "bg-gradient-to-r from-[var(--accent)] to-[#7dd3fc]",
                                )}
                                style={{
                                  width: `${Math.min(
                                    100,
                                    ((qbrMonthCount ?? 0) / billingReportLimit) * 100,
                                  )}%`,
                                }}
                              />
                            </div>
                            {(qbrMonthCount ?? 0) >= billingReportLimit * 0.7 ? (
                              <div className="mt-3 flex items-center justify-between">
                                <p
                                  className={cn(
                                    "text-[12px]",
                                    (qbrMonthCount ?? 0) >= billingReportLimit
                                      ? "text-red-300"
                                      : "text-amber-300",
                                  )}
                                >
                                  {(qbrMonthCount ?? 0) >= billingReportLimit
                                    ? "Monthly report limit reached"
                                    : "Approaching report limit"}
                                </p>
                                <Link
                                  href="/pricing"
                                  onClick={() => setSettingsOpen(false)}
                                  className="text-[12px] font-semibold text-[var(--accent)] transition-colors hover:text-white"
                                >
                                  Move to Handover →
                                </Link>
                              </div>
                            ) : null}
                          </>
                        ) : null}
                        <p className="mt-2 text-[11px] text-white/30">Resets 1st of each month</p>
                      </div>
                      ) : null}

                      {/* Generations meter */}
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <p className="text-[13px] font-semibold text-white/80">
                              Generations this month
                            </p>
                            <p className="mt-0.5 text-[11px] text-white/40">
                              Manual reports, PSA imports, scheduled runs
                            </p>
                          </div>
                          <p className="text-[12px] tabular-nums text-white/40">
                            {monthCount ?? 0}
                            {billingGenerationLimit === null
                              ? " / ∞"
                              : ` / ${billingGenerationLimit}`}
                          </p>
                        </div>
                        {billingGenerationLimit !== null ? (
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                (() => {
                                  const pct =
                                    (monthCount ?? 0) / billingGenerationLimit;
                                  return pct >= 0.9
                                    ? "bg-red-400"
                                    : pct >= 0.75
                                      ? "bg-amber-400"
                                      : "bg-gradient-to-r from-[var(--accent)] to-[#7dd3fc]";
                                })(),
                              )}
                              style={{
                                width: `${Math.min(
                                  100,
                                  ((monthCount ?? 0) / billingGenerationLimit) * 100,
                                )}%`,
                              }}
                            />
                          </div>
                        ) : null}
                        {billingGenerationLimit !== null &&
                          (() => {
                            const pct = (monthCount ?? 0) / billingGenerationLimit;
                            if (pct >= 0.75) {
                              return (
                                <div className="mt-3 flex items-center justify-between">
                                  <p
                                    className={cn(
                                      "text-[12px]",
                                      pct >= 1
                                        ? "text-red-300"
                                        : pct >= 0.9
                                          ? "text-red-300"
                                          : "text-amber-300",
                                    )}
                                  >
                                    {pct >= 1
                                      ? "Monthly limit reached"
                                      : pct >= 0.9
                                        ? "Almost at limit"
                                        : "Approaching limit"}
                                  </p>
                                  {!isBillingGrowthOrAbove ? (
                                    <Link
                                      href="/pricing"
                                      onClick={() => setSettingsOpen(false)}
                                      className="text-[12px] font-semibold text-[var(--accent)] transition-colors hover:text-white"
                                    >
                                      Move to Handover →
                                    </Link>
                                  ) : null}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        <p className="mt-2 text-[11px] text-white/30">
                          Resets 1st of each month ·
                          {profile?.generation_limit_override ? " Grandfathered limit" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
                      <p className="mb-1 text-[13px] font-semibold text-white/80">Current plan</p>
                      <p className="mb-4 text-[13px] text-white/50">
                        {getPlanLabel(profileDbPlan ?? "free", userTeamId, {
                          trial_ends_at: trialEndsAt,
                          trial_plan: profileTrialPlan,
                        }) || "Free"}
                        {trialEndsAt && new Date(trialEndsAt) > new Date()
                          ? ` · Trial ends ${new Date(trialEndsAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                            })}`
                          : ""}
                      </p>
                      {hasProAccess ? (
                        <button
                          type="button"
                          disabled={manageSubscriptionLoading}
                          onClick={() => void handleManageSubscription()}
                          className="w-full cursor-pointer rounded-[var(--radius)] border border-[var(--border)] bg-transparent px-4 py-2 text-[13px] text-[var(--text-primary)] transition-colors hover:border-white/30 disabled:cursor-wait disabled:opacity-60"
                        >
                          {manageSubscriptionLoading ? (
                            <span className="inline-flex items-center justify-center gap-2">
                              <Loader2 className="size-4 animate-spin" aria-hidden />
                              Checking subscription…
                            </span>
                          ) : (
                            "Manage subscription →"
                          )}
                        </button>
                      ) : (
                        <Link
                          href="/pricing"
                          onClick={() => setSettingsOpen(false)}
                          className="inline-flex w-full items-center justify-center rounded-[var(--radius)] bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] px-4 py-2 text-[13px] font-semibold text-[#0f172a] transition-all hover:scale-[1.01]"
                        >
                          Move to Handover →
                        </Link>
                      )}
                    </div>
                  </div>
                ) : null}

                {settingsTab === "referrals" ? (
                  <div className="space-y-5">
{isPaidPlan ? (
                    <ReferralsSettingsPanel
                      hasProAccess={hasProAccess}
                      onStartCheckout={(id) => void startCheckout(id)}
                      checkoutLoading={checkoutLoadingPriceId !== null}
                      focusRing={focusRing}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0EA5E9]/10">
                        <Lock className="text-[#0EA5E9]" size={20} />
                      </div>
                      <h3 className="text-lg font-semibold text-white">Referrals are available on paid plans</h3>
                      <p className="max-w-sm text-sm text-slate-400">
                        Move to Handover to access your referral link and earn referral credit for every MSP you refer.
                      </p>
                      <button
                        onClick={() => setSettingsTab("billing")}
                        className="rounded-lg bg-[#0EA5E9] px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-[#0284C7]"
                      >
                        View plans
                      </button>
                    </div>
                  )}
                </div>
                ) : null}

                {settingsTab === "preferences" ? (
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <h3 className="text-[14px] font-medium text-white">Output Tabs</h3>
                      <p className="text-[12px] text-[var(--text-muted)]">
                        Choose what appears in the generate dialog and what is produced on each run. Core outputs are on by default; optional PM tabs add RAID logs, meeting notes, and more.
                      </p>
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                        Core outputs
                      </p>
                      <div className="space-y-2 rounded-[var(--radius)] border border-[var(--border)] p-3">
                        {MODAL_OUTPUT_KEYS.map((key) => (
                          <label
                            key={key}
                            className="flex cursor-pointer items-center justify-between gap-3 text-[13px] text-[var(--text-primary)]"
                          >
                            <span>{OUTPUT_KEY_LABELS[key]}</span>
                            <input
                              type="checkbox"
                              className={cn("size-4 shrink-0 rounded border-[var(--border)]", focusRing)}
                              checked={outputPrefs[key]}
                              onChange={(e) =>
                                setOutputPrefs((prev) => ({
                                  ...prev,
                                  [key]: e.target.checked,
                                }))
                              }
                            />
                          </label>
                        ))}
                      </div>
                      <div>
                        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                          Optional PM deliverables
                        </p>
                        <div className="max-h-none space-y-2 overflow-visible rounded-[var(--radius)] border border-[var(--border)] p-3 md:max-h-[min(40vh,22rem)] md:overflow-y-auto">
                          {EXTENDED_PM_TAB_KEYS.map((key) => (
                            <label
                              key={key}
                              className="flex cursor-pointer items-center justify-between gap-3 text-[13px] text-[var(--text-primary)]"
                            >
                              <span className="min-w-0">{EXTENDED_PM_TAB_LABELS[key]}</span>
                              <input
                                type="checkbox"
                                className={cn("size-4 shrink-0 rounded border-[var(--border)]", focusRing)}
                                checked={extendedOutputPrefs[key]}
                                onChange={(e) =>
                                  setExtendedOutputPrefs((prev) => ({
                                    ...prev,
                                    [key]: e.target.checked,
                                  }))
                                }
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          className={cn(
                            "bg-[var(--accent)] text-[13px] text-white hover:bg-[var(--accent-hover)]",
                            focusRing,
                          )}
                          onClick={() => void saveOutputTabPreferences()}
                          disabled={!userEmail}
                        >
                          Save output preferences
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-[14px] font-medium text-white">Writing Style</h3>
                      <p className="text-[12px] text-[var(--text-muted)]">
                        Optional. Train Handover to match how you write for clients.
                      </p>
                      {!hasProAccess ? (
                        <div
                          className="rounded-[var(--radius)] border border-[var(--border)] bg-[rgba(56,189,248,0.03)] p-3"
                          role="region"
                          aria-label="Upgrade to Starter for writing style"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex size-8 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
                              <Zap className="size-4" aria-hidden />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                                Move to Handover
                              </p>
                              <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-secondary)]">
                                Train Handover to write in your style. Every output sounds like you wrote it.
                              </p>
                              <p className="mt-2 text-[13px] font-medium text-[var(--accent)]">
                                £499/month or £4,990/year. Cancel anytime.
                              </p>
                              <Button
                                type="button"
                                className={cn(
                                  "mt-3 w-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]",
                                  focusRing,
                                )}
                                onClick={() => setHeaderUpgradeOpen(true)}
                                disabled={
                                  (!STRIPE_PRO_MONTHLY_PRICE_ID && !STRIPE_PRO_ANNUAL_PRICE_ID) ||
                                  checkoutLoadingPriceId !== null
                                }
                              >
                                Move to Handover
                              </Button>
                              <Link
                                href="/pricing"
                                className="mt-2 block text-center text-[13px] font-medium text-[var(--text-secondary)] hover:text-white"
                              >
                                See all features
                              </Link>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Textarea
                            value={writingStyle}
                            onChange={(e) =>
                              setWritingStyle(e.target.value.slice(0, WRITING_STYLE_MAX))
                            }
                            placeholder='e.g. I always open with the project status. I use first names with clients. I prefer short paragraphs. I always mention the next scheduled call or review date.'
                            rows={4}
                            className={cn("min-h-[6.5rem] rounded-[var(--radius)] border-[var(--border)]", focusRing)}
                            maxLength={WRITING_STYLE_MAX}
                            aria-label="Writing style preferences"
                          />
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs text-[var(--text-muted)]" aria-live="polite">
                              {writingStyle.length} / {WRITING_STYLE_MAX} characters
                            </p>
                            <Button
                              type="button"
                              className={cn("bg-[var(--accent)] text-[13px] text-white hover:bg-[var(--accent-hover)]", focusRing)}
                              onClick={() => void saveWritingStyle()}
                            >
                              Save writing style
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : null}

                {settingsTab === "appearance" ? (
                  <div className="space-y-4">
                    <p className="text-[12px] text-[var(--text-muted)]">Theme and layout preferences for this device.</p>
                    <label className="flex items-center justify-between rounded-[var(--radius)] border border-[var(--border)] p-3 text-sm">
                      <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                        {theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
                        Dark mode
                      </span>
                      <input type="checkbox" checked={theme === "dark"} onChange={toggleTheme} className={focusRing} />
                    </label>
                    <label className="flex items-center justify-between rounded-[var(--radius)] border border-[var(--border)] p-3 text-sm">
                      <span>Compact mode</span>
                      <input type="checkbox" checked={compactMode} onChange={(e) => setCompactMode(e.target.checked)} className={focusRing} />
                    </label>
                    <label className="flex items-center justify-between rounded-[var(--radius)] border border-[var(--border)] p-3 text-sm">
                      <span>Show character count</span>
                      <input type="checkbox" checked={showCharacterCount} onChange={(e) => setShowCharacterCount(e.target.checked)} className={focusRing} />
                    </label>
                    <div className="rounded-[var(--radius)] border border-[var(--border)] p-4">
                      <h4 className="text-[13px] font-semibold text-[var(--text-primary)]">Getting started checklist</h4>
                      <p className="mt-1.5 text-[12px] leading-snug text-[var(--text-muted)]">
                        If you dismissed the corner checklist, restore it here. This applies on this browser only.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn("mt-3 text-[13px]", focusRing)}
                        onClick={() => {
                          if (!userEmail) return;
                          clearGettingStartedChecklistStorage(userEmail);
                          setGettingStartedChecklistMountKey((k) => k + 1);
                        }}
                      >
                        Show getting started checklist
                      </Button>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        className={cn("bg-[var(--accent)] text-[13px] text-white hover:bg-[var(--accent-hover)]", focusRing)}
                        onClick={() => void saveSettings()}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : null}

                {settingsTab === "privacy" ? (
                  <div className="space-y-5">
                    <div className="space-y-4">
                      <p className="text-[12px] text-[var(--text-muted)]">
                        Control whether generations are saved to your account history.
                      </p>
                      <label className="flex items-start justify-between gap-4 rounded-[var(--radius)] border border-[var(--border)] p-3">
                        <div className="min-w-0">
                          <p className="text-sm text-[var(--text-primary)]">Don&apos;t save generation history</p>
                          <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-muted)]">
                            When enabled, generations are processed but not stored. Useful for sensitive client data.
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          className={cn("mt-1 shrink-0", focusRing)}
                          checked={privacyMode}
                          onChange={(e) => setPrivacyMode(e.target.checked)}
                        />
                      </label>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          className={cn("bg-[var(--accent)] text-[13px] text-white hover:bg-[var(--accent-hover)]", focusRing)}
                          onClick={() => void saveSettings()}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}

                </div>
      </SettingsBodyPortal>

      <div
        className={cn(
          "relative ml-0",
          userEmail && result && mainView === "generate"
            ? "flex min-h-[100dvh] flex-col md:min-h-0 md:h-screen md:overflow-hidden"
            : userEmail
              ? "overflow-x-hidden"
              : "overflow-visible",
          !userEmail ? "border-0 bg-transparent shadow-none ring-0 outline-none" : "",
        )}
        style={userEmail ? { background: SIGNED_IN_SHELL_BACKGROUND } : undefined}
      >
        {userEmail && mainView === "configuration" ? (
          <div
            className="animate-in fade-in duration-200 max-md:!left-0 transition-[left] duration-150 ease-out"
            style={{
              position: "fixed",
              top: fixedPanelTopBelowChrome,
            left: sidebarMainOffset,
              right: 0,
              bottom: 0,
              overflow: "hidden",
              zIndex: 10,
            }}
          >
            <ConfigurationPanel
              userEmail={userEmail}
              plan={plan}
              hasProAccess={hasProAccess}
              hasPortalPlanAccess={hasPortalPlanAccess || demoModeActive}
              demoModeActive={demoModeActive}
              demoEnabled={demoToggleChecked}
              demoForceEnabled={demoForceEnabled}
              psaConnected={psaConnected}
              brandingSection={configurationBrandingSection}
              integrationsSection={
                <IntegrationsPanel
                  hasProFeatures={hasProAccess}
                  userTeamId={userTeamId}
                  integrationsBootstrapping={integrationsBootstrapping}
                  initialOpenDetail={integrationsInitialDetail}
                  onConsumedInitialOpenDetail={() => setIntegrationsInitialDetail(null)}
                  haloConnected={haloConnected}
                  haloUrl={haloUrl}
                  haloClientIdMasked={haloClientIdMasked}
                  haloClientIdLength={haloClientIdLength}
                  haloUpdatedAt={haloUpdatedAt}
                  haloImportedCount={haloImportedCount}
                  haloConfigOpen={haloConfigOpen}
                  setHaloConfigOpen={setHaloConfigOpen}
                  haloUrlInput={haloUrl}
                  setHaloUrlInput={setHaloUrl}
                  haloTenant={haloTenant}
                  setHaloTenant={setHaloTenant}
                  haloClientId={haloClientId}
                  setHaloClientId={setHaloClientId}
                  haloClientSecret={haloClientSecret}
                  setHaloClientSecret={setHaloClientSecret}
                  haloHelpOpen={haloHelpOpen}
                  setHaloHelpOpen={setHaloHelpOpen}
                  haloError={haloError}
                  haloReconnectRecommended={haloReconnectRecommended}
                  onOpenHaloReconnectConfig={() => setHaloConfigOpen(true)}
                  haloPermissionWarning={haloPermissionWarning}
                  haloLoading={haloLoading}
                  haloTestLoading={haloTestLoading}
                  haloAutoClosureSummary={haloAutoClosureSummary}
                  haloAutoClosureSummaryBusy={haloAutoClosureSummaryBusy}
                  onHaloAutoClosureSummaryChange={handleHaloAutoClosureSummaryChange}
                  onConnect={handleHaloConnect}
                  onTest={handleHaloTestConnection}
                  onDisconnect={handleHaloDisconnect}
                  onImportTickets={() => setHaloImportOpen(true)}
                  onUpgrade={() => setHaloProModalOpen(true)}
                  upgradeDisabled={
                    (!STRIPE_PRO_MONTHLY_PRICE_ID && !STRIPE_PRO_ANNUAL_PRICE_ID) ||
                    checkoutLoadingPriceId !== null
                  }
                  cwConnected={cwConnected}
                  cwSiteUrl={cwSiteUrl}
                  cwImportedCount={cwImportedCount}
                  cwSiteUrlInput={cwSiteUrlInput}
                  setCwSiteUrlInput={setCwSiteUrlInput}
                  cwCompanyIdInput={cwCompanyIdInput}
                  setCwCompanyIdInput={setCwCompanyIdInput}
                  cwPublicKeyInput={cwPublicKeyInput}
                  setCwPublicKeyInput={setCwPublicKeyInput}
                  cwPrivateKeyInput={cwPrivateKeyInput}
                  setCwPrivateKeyInput={setCwPrivateKeyInput}
                  cwClientIdInput={cwClientIdInput}
                  setCwClientIdInput={setCwClientIdInput}
                  cwConfigOpen={cwConfigOpen}
                  setCwConfigOpen={setCwConfigOpen}
                  cwError={cwError}
                  cwSaveLoading={cwSaveLoading}
                  cwTestLoading={cwTestLoading}
                  cwTestOk={cwTestOk}
                  cwTestMessage={cwTestMessage}
                  onCwSave={handleCwSave}
                  onCwTest={handleCwTestConnection}
                  onCwDisconnect={handleCwDisconnect}
                  slackWebhookUrl={slackWebhookUrl}
                  setSlackWebhookUrl={setSlackWebhookUrl}
                  slackNotificationsEnabled={slackNotificationsEnabled}
                  onSlackNotificationsToggle={handleSlackNotificationsToggle}
                  teamsWebhookUrl={teamsWebhookUrl}
                  setTeamsWebhookUrl={setTeamsWebhookUrl}
                  teamsNotificationsEnabled={teamsNotificationsEnabled}
                  onTeamsNotificationsToggle={handleTeamsNotificationsToggle}
                  slackWebhookSaveLoading={slackWebhookSaveLoading}
                  teamsWebhookSaveLoading={teamsWebhookSaveLoading}
                  slackWebhookTestLoading={slackWebhookTestLoading}
                  teamsWebhookTestLoading={teamsWebhookTestLoading}
                  onSaveSlackWebhook={handleSaveSlackWebhook}
                  onSaveTeamsWebhook={handleSaveTeamsWebhook}
                  onTestSlackWebhook={handleTestSlackWebhook}
                  onTestTeamsWebhook={handleTestTeamsWebhook}
                  onDisconnectSlackNotifications={handleDisconnectSlackNotifications}
                  onDisconnectTeamsNotifications={handleDisconnectTeamsNotifications}
                />
              }
              targetSection={configurationTargetSection}
              onTargetSectionApplied={clearConfigurationTargetSection}
              dashboardViewMode={dashboardViewMode}
              onDashboardViewModeChange={setDashboardViewMode}
              onToggleDemo={(enabled) => {
                const activeMainView: string = mainView;
                try {
                  if (enabled) {
                    window.localStorage.removeItem("handover_demo_disabled");
                    window.localStorage.setItem("handover_demo_force_enabled", "true");
                    setDemoForceEnabled(true);
                    setDemoDisabled(false);
                  } else {
                    window.localStorage.removeItem("handover_demo_force_enabled");
                    window.localStorage.setItem("handover_demo_disabled", "true");
                    setDemoDisabled(true);
                    setDemoForceEnabled(false);
                    setSessionUsesDemoData(false);
                    toast({ message: "Demo mode disabled - reloading your data", durationMs: 2500 });
                    if (activeMainView === "generate") {
                      setInput("");
                      setResult(null);
                      setIsInputCollapsed(false);
                    }
                    if (activeMainView === "delivery") {
                      const deliveryHealthKey = buildDeliveryHealthSwrKey(
                        false,
                        cwConnected,
                        psaConnections.primary,
                      );
                      if (deliveryHealthKey) void mutate(deliveryHealthKey);
                    }
                    void refreshShellData();
                  }
                } catch {
                  setDemoForceEnabled(enabled);
                  if (!enabled) setDemoDisabled(true);
                  else setDemoDisabled(false);
                }
              }}
            />
          </div>
        ) : null}
        {userEmail && mainView === "changelog" ? (
          <div key="changelog" className="min-h-full animate-in fade-in duration-200">
            <ChangelogView />
          </div>
        ) : null}
        {userEmail && mainView === "organisation" ? (
          <div
            className="animate-in fade-in duration-200 max-md:!left-0 h-full min-h-0 transition-[left] duration-150 ease-out"
            style={{
              position: "fixed",
              top: fixedPanelTopBelowChrome,
            left: sidebarMainOffset,
              right: 0,
              bottom: 0,
              overflow: "hidden",
              zIndex: 10,
            }}
          >
            <EnterprisePortalClientsSection
              enabled={hasProAccess}
              portalSlug={portalSlug}
              companyDisplayName={
                profileCompanyName.trim() || profileDisplayName.trim() || "Organisation"
              }
              organisationCompanyName={
                profileCompanyName.trim() || profileDisplayName.trim()
              }
              brandLogoUrl={brandLogoUrl.trim()}
              brandColour={brandColour.trim()}
              whiteLabelMode={whiteLabelMode}
              primaryPsa={
                psaConnections.multiple
                  ? pushTargetPsa
                  : psaConnections.primary === "connectwise"
                    ? "connectwise"
                    : psaConnections.primary === "halopsa"
                      ? "halopsa"
                      : null
              }
              bothConnected={psaConnections.multiple}
              deliveryAccess={deliveryDashboardAccess}
              profilePlan={profileDbPlan}
              demoModeActive={demoModeActive}
              monthCount={monthCount}
              totalGenerationCount={totalGenerationCount}
              projects={projects}
              onNavigateToDelivery={() => {
                setMainView("delivery");
                setSettingsOpen(false);
                setSidebarOpenMobile(false);
              }}
              onOpenConfiguration={(targetSection) => {
                setMainView("configuration");
                setSettingsOpen(false);
                setSidebarOpenMobile(false);
                if (targetSection === "branding") setConfigurationTargetSection("branding");
                if (targetSection === "integrations") setConfigurationTargetSection("integrations");
              }}
              onCloseMobileSidebar={() => setSidebarOpenMobile(false)}
            />
          </div>
        ) : null}
        <div
          className={cn(
            "flex w-full flex-col",
            userEmail && mainView === "generate" && (result || isGenerating)
              ? cn(
                  "min-h-0 flex-1 gap-4 overflow-hidden px-4 pb-0 md:px-6",
                  paymentPastDue
                    ? "pt-[var(--app-fixed-panel-top-past-due)]"
                    : "pt-[var(--app-fixed-panel-top)]",
                )
              : userEmail
                ? cn(
                    "w-full gap-4 overflow-x-hidden px-4 pb-4 md:px-6 md:pb-5",
                    paymentPastDue
                      ? "pt-[var(--app-content-top-mobile-past-due)] md:pt-[var(--app-content-top-desktop-past-due)]"
                      : "pt-[var(--app-content-top-mobile)] md:pt-[var(--app-content-top-desktop)]",
                  )
                : "gap-6 overflow-visible px-4 py-4 md:px-8 md:py-6",
            !userEmail && "border-0 shadow-none ring-0 outline-none",
          )}
        >
        {showSuccessBanner ? (
          <div
            className="flex flex-col gap-2 rounded-[var(--radius)] border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
            style={{ borderColor: "color-mix(in srgb, var(--success) 35%, transparent)", backgroundColor: "color-mix(in srgb, var(--success) 12%, transparent)" }}
            role="status"
          >
            <span className="text-foreground">
              Welcome to Handover. Your subscription is active.
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 self-end sm:self-auto"
              onClick={() => setShowSuccessBanner(false)}
            >
              Dismiss
            </Button>
          </div>
        ) : null}

        {!userEmail ? (!signedOutCompactMode ? (
          <>
            <section
              className="relative flex flex-col overflow-visible lg:overflow-hidden border-0 bg-transparent pt-[var(--app-header-height)] shadow-none ring-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-300"
            >
              <style
                dangerouslySetInnerHTML={{
                  __html: `@keyframes homeHeroAmbientPulse{0%,100%{opacity:.14;transform:scale(1)}50%{opacity:.22;transform:scale(1.06)}}`,
                }}
              />
              <div className="home-hero-drift-layer border-0 outline-none shadow-none" aria-hidden>
                <div className="home-hero-drift-orb--a" />
                <div className="home-hero-drift-orb--b" />
              </div>
              <div className="home-hero-dot-overlay border-0 outline-none shadow-none" aria-hidden />
              <div className="pointer-events-none absolute inset-0 z-[1] overflow-visible border-0 outline-none shadow-none">
                <div
                  className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full opacity-20"
                  style={{
                    background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)",
                    animation: "homeHeroAmbientPulse 12s ease-in-out infinite",
                  }}
                />
              </div>
              <div className="relative z-10 grid w-full min-h-0 flex-1 grid-cols-1 gap-6 overflow-visible lg:overflow-hidden px-4 pt-2 pb-3 md:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center lg:gap-6 lg:px-8 lg:pb-4">
                <div className="flex min-w-0 flex-col justify-center overflow-x-hidden overflow-y-visible pr-0 md:pr-8">
                  <div className="max-w-full md:max-w-[600px]">
                  <motion.h1
                    className="mt-3 text-2xl font-semibold leading-[0.95] tracking-tight text-white sm:text-3xl md:text-5xl lg:text-6xl"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
                  >
                    See which clients are slipping, and what they&apos;re worth.
                  </motion.h1>

                  <motion.p
                    className="mt-2.5 text-sm leading-relaxed text-[var(--text-secondary)] md:text-base md:leading-normal"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.16, ease: [0.25, 0.46, 0.45, 0.94] }}
                  >
                    Handover reads your HaloPSA or ConnectWise history, puts a
                    pound value on every client that has changed, tells you what
                    to do about it, and proves it on the clients you have
                    already lost.
                  </motion.p>
                  <motion.p
                    className="mt-1.5 text-[13px] leading-relaxed text-white/60 md:text-[15px] md:leading-normal"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                  >
                    Free scan, read-only, about a minute. Then £499 a month or £4,990 a year, everything included.
                  </motion.p>

                  <motion.div
                    className="mt-4 flex w-full max-w-full flex-col gap-3 sm:flex-row md:max-w-none md:flex-wrap"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.24, ease: [0.25, 0.46, 0.45, 0.94] }}
                  >
                    <Link
                      href="/onboarding/connect"
                      className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] hover:from-[var(--accent-hover)] hover:to-[var(--accent)] text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-[color-mix(in_srgb,var(--accent)_25%,transparent)] hover:shadow-[color-mix(in_srgb,var(--accent)_35%,transparent)] transition-all duration-300 transform hover:scale-[1.02] inline-flex w-full items-center justify-center text-sm active:scale-[0.99] md:w-auto"
                    >
                      Run your free scan
                    </Link>
                    <Link
                      href="/demo"
                      className="bg-white/[0.05] backdrop-blur-sm border border-white/[0.15] hover:bg-white/[0.08] text-white font-medium px-6 py-3 rounded-xl transition-all duration-300 inline-flex w-full items-center justify-center text-sm md:w-auto"
                    >
                      Book a walkthrough
                    </Link>
                  </motion.div>
                  </div>
                </div>

                <motion.div
                  className="relative hidden min-w-0 w-full max-w-full flex-col items-center justify-center overflow-visible lg:overflow-hidden pointer-events-none lg:flex"
                  style={{ marginTop: "0px" }}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                >
                  <div
                    className="home-hero-screenshot-cluster"
                    style={{
                      position: "relative",
                      flexShrink: 0,
                      pointerEvents: "none",
                      background: "none",
                      border: "none",
                      outline: "none",
                    }}
                  >
                    {/* Shot 3 — dashboard2 — back layer, bottom right */}
                    <div
                      style={{
                        position: "absolute",
                        right: "0px",
                        top: "325px",
                        width: "460px",
                        zIndex: featuredShot === 3 ? 40 : 10,
                        transition: "all 700ms cubic-bezier(0.4,0,0.2,1)",
                        opacity: featuredShot === 3 ? 1 : 0.45,
                        transform: featuredShot === 3
                          ? "scale(1.04) translateY(-20px) translateX(-160px)"
                          : "scale(0.97) translateY(0px) translateX(0px)",
                        borderRadius: "10px",
                        boxShadow: featuredShot === 3
                          ? "0 0 40px rgba(56,189,248,0.25), 0 20px 60px rgba(0,0,0,0.7)"
                          : "0 4px 24px rgba(0,0,0,0.5)",
                        pointerEvents: "none",
                        overflow: "hidden",
                      }}
                    >
                      <img
                        src="/dashboard2.png"
                        alt="Delivery dashboard"
                        style={{
                          width: "100%",
                          display: "block",
                          borderRadius: "9px",
                          cursor: "pointer",
                          pointerEvents: "auto",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxImage({ src: "/dashboard2.png", alt: "Delivery dashboard" });
                        }}
                      />
                    </div>

                    {/* Shot 2 — exceldoc — back layer, bottom left */}
                    <div
                      style={{
                        position: "absolute",
                        left: "0px",
                        top: "330px",
                        width: "440px",
                        zIndex: featuredShot === 2 ? 40 : 11,
                        transition: "all 700ms cubic-bezier(0.4,0,0.2,1)",
                        opacity: featuredShot === 2 ? 1 : 0.45,
                        transform: featuredShot === 2
                          ? "scale(1.04) translateY(-20px) translateX(160px)"
                          : "scale(0.97) translateY(0px) translateX(0px)",
                        borderRadius: "10px",
                        boxShadow: featuredShot === 2
                          ? "0 0 40px rgba(56,189,248,0.25), 0 20px 60px rgba(0,0,0,0.7)"
                          : "0 4px 24px rgba(0,0,0,0.5)",
                        pointerEvents: "none",
                        overflow: "hidden",
                      }}
                    >
                      <img
                        src="/exceldoc.png"
                        alt="Excel export"
                        style={{
                          width: "100%",
                          display: "block",
                          borderRadius: "9px",
                          cursor: "pointer",
                          pointerEvents: "auto",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxImage({ src: "/exceldoc.png", alt: "Excel export" });
                        }}
                      />
                    </div>

                    {/* Shot 4 — scheduled2 — mid layer, centre */}
                    <div
                      style={{
                        position: "absolute",
                        left: "120px",
                        top: "160px",
                        width: "440px",
                        zIndex: featuredShot === 4 ? 40 : 20,
                        transition: "all 700ms cubic-bezier(0.4,0,0.2,1)",
                        opacity: featuredShot === 4 ? 1 : 0.75,
                        transform: featuredShot === 4
                          ? "scale(1.04) translateY(-20px) translateX(20px)"
                          : "scale(0.97) translateY(0px) translateX(0px)",
                        borderRadius: "10px",
                        boxShadow: featuredShot === 4
                          ? "0 0 40px rgba(56,189,248,0.25), 0 20px 60px rgba(0,0,0,0.7)"
                          : "0 8px 32px rgba(0,0,0,0.55)",
                        pointerEvents: "none",
                        overflow: "hidden",
                      }}
                    >
                      <img
                        src="/scheduled2.png"
                        alt="Scheduled reports"
                        style={{
                          width: "100%",
                          display: "block",
                          borderRadius: "9px",
                          cursor: "pointer",
                          pointerEvents: "auto",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxImage({ src: "/scheduled2.png", alt: "Scheduled reports" });
                        }}
                      />
                    </div>

                    {/* Shot 5 — clientintel — mid layer, mid right */}
                    <div
                      style={{
                        position: "absolute",
                        right: "0px",
                        top: "190px",
                        width: "480px",
                        zIndex: featuredShot === 5 ? 40 : 16,
                        transition: "all 700ms cubic-bezier(0.4,0,0.2,1)",
                        opacity: featuredShot === 5 ? 1 : 0.5,
                        transform: featuredShot === 5
                          ? "scale(1.04) translateY(-18px) translateX(-150px)"
                          : "scale(0.97) translateY(0px) translateX(0px)",
                        borderRadius: "10px",
                        boxShadow: featuredShot === 5
                          ? "0 0 40px rgba(56,189,248,0.25), 0 20px 60px rgba(0,0,0,0.7)"
                          : "0 8px 32px rgba(0,0,0,0.55)",
                        pointerEvents: "none",
                        overflow: "hidden",
                      }}
                    >
                      <img
                        src="/clientintel.png"
                        alt="Client Intelligence"
                        style={{
                          width: "100%",
                          display: "block",
                          borderRadius: "9px",
                          cursor: "pointer",
                          pointerEvents: "auto",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxImage({ src: "/clientintel.png", alt: "Client Intelligence" });
                        }}
                      />
                    </div>

                    {/* Shot 0 — qbrpowerpoint — front layer, top right, largest */}
                    <div
                      style={{
                        position: "absolute",
                        right: "0px",
                        top: "0px",
                        width: "560px",
                        zIndex: featuredShot === 0 ? 40 : 30,
                        transition: "all 700ms cubic-bezier(0.4,0,0.2,1)",
                        opacity: featuredShot === 0 ? 1 : 0.7,
                        transform: featuredShot === 0
                          ? "scale(1.04) translateY(-16px) translateX(-180px)"
                          : "scale(0.97) translateY(0px) translateX(0px)",
                        borderRadius: "10px",
                        boxShadow: featuredShot === 0
                          ? "0 0 40px rgba(56,189,248,0.25), 0 20px 60px rgba(0,0,0,0.7)"
                          : "0 12px 48px rgba(0,0,0,0.65)",
                        pointerEvents: "none",
                        overflow: "hidden",
                      }}
                    >
                      <img
                        src="/qbrpowerpoint.png"
                        alt="QBR pack"
                        style={{
                          width: "100%",
                          display: "block",
                          borderRadius: "9px",
                          cursor: "pointer",
                          pointerEvents: "auto",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxImage({ src: "/qbrpowerpoint.png", alt: "QBR pack" });
                        }}
                      />
                    </div>

                    {/* Shot 1 — generate2 — front layer, top left */}
                    <div
                      style={{
                        position: "absolute",
                        left: "0px",
                        top: "10px",
                        width: "480px",
                        zIndex: featuredShot === 1 ? 40 : 12,
                        transition: "all 700ms cubic-bezier(0.4,0,0.2,1)",
                        opacity: featuredShot === 1 ? 1 : 0.55,
                        transform: featuredShot === 1
                          ? "scale(1.04) translateY(-16px) translateX(140px)"
                          : "scale(0.97) translateY(0px) translateX(0px)",
                        borderRadius: "10px",
                        boxShadow: featuredShot === 1
                          ? "0 0 40px rgba(56,189,248,0.25), 0 20px 60px rgba(0,0,0,0.7)"
                          : "0 8px 40px rgba(0,0,0,0.6)",
                        pointerEvents: "none",
                        overflow: "hidden",
                      }}
                    >
                      <img
                        src="/generate2.png"
                        alt="Report generation"
                        style={{
                          width: "100%",
                          display: "block",
                          borderRadius: "9px",
                          cursor: "pointer",
                          pointerEvents: "auto",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxImage({ src: "/generate2.png", alt: "Report generation" });
                        }}
                      />
                    </div>
                  </div>
                </motion.div>
              </div>

              <div
                className="relative z-10 w-full px-4 md:px-6 lg:px-8"
                aria-label="Trusted organisations"
              >
                <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
                  <a
                    href="https://www.g2.com/products/handover"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 transition-colors hover:border-white/20"
                  >
                    <span className="text-[13px] leading-none text-yellow-400">★★★★★</span>
                    <span className="text-[12px] text-white/60">5.0 on G2</span>
                  </a>

                  <span className="hidden text-white/15 sm:block">·</span>

                  <a
                    href="https://usehalo.com/integration/handover-integration/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 transition-opacity hover:opacity-80"
                  >
                    <img
                      src="/halopsa.png"
                      alt="HaloPSA"
                      width={20}
                      height={20}
                      className="h-5 w-auto object-contain opacity-60"
                    />
                    <span className="text-[11px] font-medium uppercase tracking-wide text-white/40">
                      HaloPSA Marketplace
                    </span>
                  </a>

                  <span className="hidden text-white/15 sm:block">·</span>

                  <a
                    href="https://marketplace.connectwise.com/handover"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 transition-opacity hover:opacity-80"
                  >
                    <img
                      src="/connectwise.jpeg"
                      alt="ConnectWise"
                      width={20}
                      height={20}
                      className="h-5 w-auto rounded-sm object-contain opacity-60"
                      style={{ background: "white", padding: "2px" }}
                    />
                    <span className="text-[11px] font-medium uppercase tracking-wide text-white/40">
                      ConnectWise Marketplace
                    </span>
                  </a>
                </div>
              </div>

              <button
                type="button"
                className="handover-bounce absolute bottom-4 left-1/2 z-10 hidden -translate-x-1/2 md:flex"
                aria-label="Scroll to see the mockup"
                onClick={() => mockupSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="var(--text-muted)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </section>

            <section ref={mockupSectionRef} className="px-4 py-10 md:px-8 md:py-16">
              <div className="mx-auto max-w-[1000px]">
                <div className="mb-10 text-center">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#38bdf8]">
                    Why it matters
                  </p>
                  <h2 className="text-2xl font-semibold text-white md:text-3xl">
                    Know which clients moved before the call
                  </h2>
                  <p className="mx-auto mt-3 max-w-[520px] text-[14px] text-white/50">
                    Service, commercial and relationship signals, each measured against that client&apos;s own normal.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    {
                      title: "Service slipping",
                      body: "First response and resolution times drifting, backlogs growing and tickets left open, compared with that client's own history rather than a portfolio average.",
                    },
                    {
                      title: "Commercial signals",
                      body: "Renewals coming up, quotes left unapproved, orders drying up and contracts that no longer match the work, all with a pound value attached.",
                    },
                    {
                      title: "Relationship risk",
                      body: "Busy clients going quiet, everything raised by one contact, accounts with no named owner. The quiet signs that a client is drifting, with the evidence attached.",
                    },
                  ].map((card) => (
                    <div
                      key={card.title}
                      className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6"
                    >
                      <p className="text-[14px] font-semibold text-white">{card.title}</p>
                      <p className="mt-2 text-[13px] leading-relaxed text-white/50">{card.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="px-4 py-10 md:px-8 md:py-16">
              <div className="mx-auto max-w-[1000px]">
                <div className="mb-10 text-center">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#38bdf8]">
                    Client retention
                  </p>
                  <h2 className="text-2xl font-semibold text-white md:text-3xl">
                    Poor communication costs MSPs clients
                  </h2>
                  <p className="mx-auto mt-3 max-w-[520px] text-[14px] leading-relaxed text-white/50">
                    Knowing who is drifting before they leave is the other half of the job.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-6">
                    <p className="mb-3 text-[42px] font-bold leading-none text-red-400">23%</p>
                    <p className="mb-2 text-[13px] font-semibold text-white">
                      of SMEs left their MSP due to poor customer service or account management
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-6">
                    <p className="mb-3 text-[42px] font-bold leading-none text-amber-400">67%</p>
                    <p className="mb-2 text-[13px] font-semibold text-white">
                      of SMEs plan to increase their MSP investment over the next 12 months
                    </p>
                    <p className="text-[11px] leading-relaxed text-white/30">
                      The market is growing. The MSPs who communicate best will capture it.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#38bdf8]/20 bg-[#38bdf8]/[0.04] p-6">
                    <p className="mb-3 text-[42px] font-bold leading-none text-[#38bdf8]">76%</p>
                    <p className="mb-2 text-[13px] font-semibold text-white">
                      of SMEs rely on an MSP for at least some IT functions
                    </p>
                    <p className="text-[11px] leading-relaxed text-white/30">
                      Every one of them forms an opinion about their MSP based on how well they communicate.
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-center text-[11px] text-white/30">
                  Source:{" "}
                  <a
                    href="https://jumpcloud.com/resources/your-route-to-positive-client-interactions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/45 underline-offset-2 hover:text-white/70 hover:underline"
                  >
                    JumpCloud SME IT Trends Report 2024
                  </a>
                  , 612 respondents
                </p>

                <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <p className="mx-auto max-w-[680px] text-center text-[13px] leading-relaxed text-white/60">
                    Revenue at Risk shows which clients are drifting and what they are worth, while there is still time
                    to change their mind. Save Plays tell you what to do next.
                  </p>
                </div>

                <p className="mt-6 text-center">
                  <Link
                    href="/blog/why-msp-clients-leave"
                    className="text-[13px] font-medium text-[#38bdf8] underline-offset-4 hover:underline"
                  >
                    Why MSP clients leave, and how communication fixes it →
                  </Link>
                </p>
              </div>
            </section>

            <section className="bg-transparent">
              <motion.div
                className="w-full bg-transparent px-4 pt-8 pb-6 md:px-8"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <h2 className="mx-auto max-w-[1000px] text-2xl font-semibold leading-snug text-white md:text-3xl">
                  Clients don&apos;t leave MSPs because of bad technical work.{" "}
                  <span className="text-[var(--accent)]">
                    They leave because they stopped feeling informed.
                  </span>
                </h2>
              </motion.div>

              <motion.section
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="mx-auto w-full max-w-7xl bg-transparent px-4 py-12 md:px-6 md:py-24"
              >
              <div className="mb-16 text-center">
                <h2 className="text-3xl font-bold text-white sm:text-4xl">
                  One loop, from the first warning to the renewal
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-[16px] text-[#94a3b8]">
                  Handover finds the clients that are drifting, proves it on your own history, puts your value in front of the people who renew, and counts what you keep.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {(
                  [
                    {
                      title: "Spot it, in pounds.",
                      body: "Every client whose service or relationship has changed against its own history, ranked by the annual revenue it holds. Your week starts with who to call, not a blank inbox.",
                      punchline: "Revenue at Risk™",
                      href: "/features/revenue-at-risk",
                    },
                    {
                      title: "Prove it would have worked.",
                      body: "Handover rewinds your PSA to before each client you lost and shows whether it would have warned you, and how early. You see it on your own data before you pay anything.",
                      punchline: "Churn Replay™",
                      href: "/features/churn-replay",
                    },
                    {
                      title: "Show your value, count what you keep.",
                      body: "Service reviews, QBR packs and the client portal put your work in front of the people who renew. When a flagged client recovers, its value is added to your Saved Revenue.",
                      punchline: "Saved Revenue",
                      href: "/features/revenue-at-risk#saved-revenue",
                    },
                  ] as const
                ).map((card, i) => (
                    <motion.div
                      key={card.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      whileHover={{ y: -6 }}
                      className={cn(
                        "group min-w-0 w-full rounded-2xl border border-white/[0.08] border-t border-t-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-white/[0.04] p-8 backdrop-blur-sm transition-all duration-300 hover:border-[color-mix(in_srgb,var(--accent)_20%,transparent)] hover:bg-white/[0.08] hover:shadow-[0_0_40px_-8px_color-mix(in_srgb,var(--accent)_18%,transparent)]",
                        i === 1 && "bg-[rgba(56,189,248,0.03)] border-[rgba(56,189,248,0.15)]",
                      )}
                    >
                      <span className="text-[56px] font-bold leading-none text-white/[0.08] tabular-nums select-none">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h3 className="mb-3 text-xl font-bold text-white">{card.title}</h3>
                      <p className="mb-5 text-[15px] leading-relaxed text-[#94a3b8]">{card.body}</p>
                      <Link
                        href={card.href}
                        className="text-cyan-300 text-sm font-semibold not-italic tracking-[-0.01em] underline decoration-cyan-300/30 underline-offset-4 transition-colors hover:text-cyan-200 hover:decoration-cyan-200/60"
                      >
                        {card.punchline}
                      </Link>
                    </motion.div>
                  ))}
              </div>
              </motion.section>
            </section>

            <motion.section
              className="bg-transparent py-12 md:py-14 lg:py-20"
              aria-label="Testimonials"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div className="mx-auto mb-10 max-w-[960px] px-6 text-center">
                <ScrollRevealItem index={0} className="text-center">
                  <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)] md:text-3xl">
                    What delivery professionals say
                  </h2>
                  <p className="mt-2 text-[15px] text-[var(--text-secondary)]">
                    From PMs and SDMs at leading IT organisations
                  </p>
                </ScrollRevealItem>
              </div>
              <div className="w-full overflow-hidden">
                <ScrollRevealItem index={1} className="block">
                  <TestimonialMarquee />
                </ScrollRevealItem>
              </div>
            </motion.section>

            <p className="px-4 pb-2 text-center text-sm text-[var(--text-secondary)] md:px-6">
              Want to see how you prove value to clients?{" "}
              <Link
                href="/solutions/qbr-and-reporting"
                className="font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
              >
                See service reviews and QBRs.
              </Link>
            </p>

            <motion.section
              className="mx-auto max-w-[1100px] overflow-x-hidden bg-transparent px-4 pt-8 md:pt-10"
              aria-label="How it works"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <ScrollRevealItem index={0} className="text-center">
                <h2 className="text-xl font-semibold tracking-tight text-white md:text-3xl">
                  From PSA to saved client in three <span className="text-cyan-400">steps.</span>
                </h2>
              </ScrollRevealItem>

              <div className="mt-8 flex flex-col items-center gap-10 md:hidden">
                <ScrollRevealItem index={1} className="flex w-full max-w-md flex-col items-center text-center">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm shadow-sm">
                    <Plug className="size-[22px] shrink-0 text-[var(--accent)]" strokeWidth={1.75} aria-hidden />
                  </span>
                  <p className="mt-4 font-bold text-[var(--text-primary)]">Connect your PSA once.</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Link HaloPSA or ConnectWise read-only in under a minute. Handover reads your tickets, contracts and billing directly. No exports, no copy-pasting.
                  </p>
                </ScrollRevealItem>
                <ScrollRevealItem index={2} className="flex w-full max-w-md flex-col items-center text-center">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm shadow-sm">
                    <Sparkles className="size-[22px] shrink-0 text-[var(--accent)]" strokeWidth={1.75} aria-hidden />
                  </span>
                  <p className="mt-4 font-bold text-[var(--text-primary)]">See who is slipping, in pounds.</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Handover checks every client against its own history and ranks the ones that changed by the revenue they hold.
                  </p>
                </ScrollRevealItem>
                <ScrollRevealItem index={3} className="flex w-full max-w-md flex-col items-center text-center">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm shadow-sm">
                    <Send className="size-[22px] shrink-0 text-[var(--accent)]" strokeWidth={1.75} aria-hidden />
                  </span>
                  <p className="mt-4 font-bold text-[var(--text-primary)]">Run the Save Play.</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Follow the steps, send the email to the decision-maker, and Handover tracks whether the client recovers.
                  </p>
                </ScrollRevealItem>
              </div>

              <div className="mx-auto mt-10 hidden max-w-[1000px] items-stretch gap-3 md:flex">
                <ScrollRevealItem
                  index={1}
                  className="flex h-full min-w-0 flex-1 flex-col items-center px-2 text-center"
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm shadow-sm">
                    <Plug className="size-[22px] shrink-0 text-[var(--accent)]" strokeWidth={1.75} aria-hidden />
                  </span>
                  <p className="mt-4 font-bold text-[var(--text-primary)]">Connect your PSA once.</p>
                  <p className="mt-1 flex-1 text-sm text-[var(--text-secondary)]">
                    Link HaloPSA or ConnectWise read-only in under a minute. Handover reads your tickets, contracts and billing directly. No exports, no copy-pasting.
                  </p>
                </ScrollRevealItem>
                <div
                  className="h-px min-w-[24px] flex-1 bg-[var(--accent)]/40"
                  style={{ maxWidth: "100px" }}
                  aria-hidden
                />
                <ScrollRevealItem
                  index={2}
                  className="flex h-full min-w-0 flex-1 flex-col items-center px-2 text-center"
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm shadow-sm">
                    <Sparkles className="size-[22px] shrink-0 text-[var(--accent)]" strokeWidth={1.75} aria-hidden />
                  </span>
                  <p className="mt-4 font-bold text-[var(--text-primary)]">See who is slipping, in pounds.</p>
                  <p className="mt-1 flex-1 text-sm text-[var(--text-secondary)]">
                    Handover checks every client against its own history and ranks the ones that changed by the revenue they hold.
                  </p>
                </ScrollRevealItem>
                <div
                  className="h-px min-w-[24px] flex-1 bg-[var(--accent)]/40"
                  style={{ maxWidth: "100px" }}
                  aria-hidden
                />
                <ScrollRevealItem
                  index={3}
                  className="flex h-full min-w-0 flex-1 flex-col items-center px-2 text-center"
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm shadow-sm">
                    <Send className="size-[22px] shrink-0 text-[var(--accent)]" strokeWidth={1.75} aria-hidden />
                  </span>
                  <p className="mt-4 font-bold text-[var(--text-primary)]">Run the Save Play.</p>
                  <p className="mt-1 flex-1 text-sm text-[var(--text-secondary)]">
                    Follow the steps, send the email to the decision-maker, and Handover tracks whether the client recovers.
                  </p>
                </ScrollRevealItem>
              </div>
            </motion.section>

            <motion.section
              className="w-full px-4 py-12 md:px-6 md:py-14 lg:py-16"
              style={{
                background: "transparent",
              }}
              aria-label="Run your free scan"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <div
                className="mx-auto max-w-[720px] rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 shadow-xl backdrop-blur-md sm:p-8 md:p-10"
                style={{
                  borderColor: "color-mix(in srgb, var(--accent) 40%, transparent)",
                  background:
                    "linear-gradient(145deg, rgba(30,41,59,0.6) 0%, rgba(15,23,42,0.85) 100%)",
                }}
              >
                <h2 className="text-xl font-semibold text-white md:text-[28px]">
                  Find out which of last year&apos;s losses you could have kept.
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-white/75 md:text-base">
                  Connect HaloPSA or ConnectWise read-only. In about a minute you see your Revenue at Risk and a Churn Replay of the clients you lost, on your own data.
                </p>
                <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                  <Link
                    href="/onboarding/connect"
                    className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] hover:from-[var(--accent-hover)] hover:to-[var(--accent)] text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-[color-mix(in_srgb,var(--accent)_25%,transparent)] hover:shadow-[color-mix(in_srgb,var(--accent)_35%,transparent)] transition-all duration-300 transform hover:scale-[1.02] inline-flex w-full flex-1 items-center justify-center text-sm active:scale-[0.98] md:w-auto"
                  >
                    Run your free scan
                  </Link>
                  <Link
                    href="/pricing"
                    className="bg-white/[0.05] backdrop-blur-sm border border-white/[0.15] hover:bg-white/[0.08] text-white font-medium px-6 py-3 rounded-xl transition-all duration-300 py-1 text-center text-sm md:px-4"
                  >
                    See pricing →
                  </Link>
                </div>
              </div>
            </motion.section>
          </>
        ) : null) : (
          userEmail && mainView === "approvals" ? (
            <div key="approvals" className="min-h-full animate-in fade-in duration-300">
              <div className="w-full px-6 py-6">
                <PageHeader
                  title="Approvals"
                  description="Reports waiting for your review before they're sent."
                />

                {pendingApprovalsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="size-6 animate-spin text-[var(--accent)]" aria-hidden />
                  </div>
                ) : pendingApprovals.length === 0 ? (
                  <div className="rounded-xl border border-white/[0.06] bg-[var(--surface-1)] px-6 py-12 text-center [box-shadow:var(--shadow-sm),var(--shadow-inset)]">
                    <p className="text-[14px] text-[var(--text-secondary)]">
                      Nothing waiting for approval. Reports from schedules with review enabled
                      will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingApprovals.map((approval) => {
                      const title =
                        approval.client_label?.trim() ||
                        approval.schedule_name?.trim() ||
                        "Scheduled report";
                      const previewText = (approval.text ?? "").replace(/\s+/g, " ").trim();
                      const previewSnippet =
                        previewText.length > 200
                          ? `${previewText.slice(0, 200)}…`
                          : previewText;
                      const expanded = expandedApprovalIds.has(approval.id);
                      const acting = approvalActionId === approval.id;
                      const rejectConfirm = rejectConfirmApprovalId === approval.id;

                      return (
                        <div
                          key={approval.id}
                          className="rounded-xl border border-white/[0.06] bg-[var(--surface-1)] p-5 [box-shadow:var(--shadow-sm),var(--shadow-inset)]"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
                                {title}
                              </h2>
                              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                  {approvalSourceLabel(approval.source)}
                                </span>
                                <span className="text-[12px] text-[var(--text-muted)]">
                                  {formatRelativeTimeAgo(approval.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 space-y-2">
                            {approval.subject ? (
                              <p className="text-[13px] font-medium text-[var(--text-primary)]">
                                {approval.subject}
                              </p>
                            ) : null}
                            <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
                              {previewSnippet || "No preview text available."}
                            </p>
                            {approval.html ? (
                              <button
                                type="button"
                                className="text-[12px] font-medium text-[var(--accent)] hover:underline"
                                onClick={() => {
                                  setExpandedApprovalIds((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(approval.id)) next.delete(approval.id);
                                    else next.add(approval.id);
                                    return next;
                                  });
                                }}
                              >
                                {expanded ? "Collapse" : "Expand"}
                              </button>
                            ) : null}
                            {expanded && approval.html ? (
                              <div className="max-h-80 overflow-auto rounded-[var(--radius)] border border-[var(--border)] bg-white">
                                <iframe
                                  sandbox=""
                                  title={`Preview: ${title}`}
                                  srcDoc={approval.html}
                                  className="min-h-[240px] w-full border-0"
                                />
                              </div>
                            ) : null}
                          </div>

                          <div className="mt-5 flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                              disabled={acting}
                              onClick={() => void runApprovalAction(approval.id, "approve")}
                            >
                              {acting ? (
                                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                              ) : null}
                              Approve &amp; Send
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="gap-1.5 border-[var(--border)]"
                              disabled={acting || !approval.schedule_id}
                              onClick={() =>
                                void runApprovalAction(approval.id, "approve_and_stop")
                              }
                            >
                              Approve &amp; Stop Asking
                              <InfoHoverTooltip
                                text="Also turns off review for this schedule"
                                ariaLabel="Approve and stop asking explanation"
                              />
                            </Button>
                            {!rejectConfirm ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="text-[var(--text-muted)] hover:text-[var(--danger)]"
                                disabled={acting}
                                onClick={() => setRejectConfirmApprovalId(approval.id)}
                              >
                                Reject
                              </Button>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius)] border border-[var(--danger)]/40 bg-[var(--danger)]/5 px-3 py-2">
                                <span className="text-[12px] text-[var(--danger)]">
                                  Reject this report?
                                </span>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="bg-[var(--danger)] text-white hover:bg-red-600"
                                  disabled={acting}
                                  onClick={() => void runApprovalAction(approval.id, "reject")}
                                >
                                  Yes, reject
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={acting}
                                  onClick={() => setRejectConfirmApprovalId(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : userEmail && mainView === "scheduled" ? (
            <div className="min-h-full bg-[var(--bg-secondary)] animate-in fade-in duration-300">
              <div className="w-full px-6 py-6">
                <PageHeader
                  eyebrow="AUTOMATED · REPORTS"
                  title="Scheduled"
                  description="Reports that send automatically on your chosen cadence."
                />

                {isExpiredTrial || soloGenerationLocked ? (
                  <UpgradeWall message="Your trial has ended - Scheduled Reports require an active plan." />
                ) : (
                <>
                {showDemoDataBanner ? (
                  <div className="mb-4">
                    <DemoBanner
                      onConnectPSA={() => {
                        openIntegrationsInConfiguration();
                        setSettingsOpen(false);
                        setSidebarOpenMobile(false);
                      }}
                    />
                  </div>
                ) : null}

                {!hasProAccess ? (
                  <div className="mb-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-[13px] text-[var(--text-secondary)]">
                    <span className="font-medium text-[var(--text-primary)]">Preview:</span> walk through the schedule
                    wizard and preview your setup. Move to Handover to save and run automated weekly reports.
                  </div>
                ) : null}

                {campaigns.length > 0 ? (
                  <div className="mb-4 flex justify-end">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={scheduledReportsMasterEnabled}
                      aria-label={
                        scheduledReportsMasterEnabled
                          ? "Scheduled reports enabled"
                          : "Scheduled reports disabled"
                      }
                      onClick={() => void toggleAllCampaignsEnabled(!scheduledReportsMasterEnabled)}
                      disabled={scheduleSaving}
                      className={cn(
                        "min-w-[132px] shrink-0 rounded-full border-2 px-5 py-2 text-[12px] font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60",
                        scheduledReportsMasterEnabled
                          ? "border-emerald-500/60 bg-emerald-600/35 text-emerald-100 shadow-[0_0_20px_rgba(34,197,94,0.2)]"
                          : "border-slate-500/50 bg-slate-600/25 text-slate-300",
                      )}
                    >
                      {scheduledReportsMasterEnabled ? "Enabled" : "Disabled"}
                    </button>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  {/* Card 1: PSA Scheduled Reports */}
                  <div className="rounded-xl border border-white/[0.06] bg-[var(--surface-1)] p-5 [box-shadow:var(--shadow-sm),var(--shadow-inset)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-[13px] font-semibold text-[var(--text-primary)]">
                          Scheduled Reports
                        </h2>
                        <p className="mt-1 text-[11px] leading-snug text-[var(--text-muted)]">
                          Weekly, fortnightly, or monthly reports from your PSA ticket data, sent
                          automatically.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => createNewSchedule()}
                        className="shrink-0 rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] px-3 py-1.5 text-[11px] font-semibold text-[#0f172a] transition-all hover:scale-[1.02]"
                      >
                        + New schedule
                      </button>
                    </div>

                    <div className="mt-4">
                      {scheduleLoading ? (
                        <ul className="space-y-2" aria-busy>
                          {[0, 1, 2].map((i) => (
                            <li
                              key={i}
                              className="animate-pulse rounded-lg border border-white/[0.06] px-3 py-2.5"
                            >
                              <div className="h-3 w-32 rounded bg-[var(--bg-secondary)]" />
                              <div className="mt-1.5 h-2.5 w-24 rounded bg-[var(--bg-secondary)]" />
                            </li>
                          ))}
                        </ul>
                      ) : psaCampaigns.length === 0 ? (
                        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-4 text-center">
                          <p className="text-[12px] font-medium text-[var(--text-primary)]">
                            No scheduled reports yet
                          </p>
                          <button
                            type="button"
                            onClick={() => createNewSchedule()}
                            className="mt-3 rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] px-3 py-1.5 text-[11px] font-semibold text-[#0f172a]"
                          >
                            + New schedule
                          </button>
                        </div>
                      ) : (
                        <ul className="divide-y divide-white/[0.06]">
                          {psaCampaigns.map((c, idx) => (
                            <li
                              key={c.id ?? idx}
                              className="flex items-center gap-2 py-2.5 first:pt-0 last:pb-0"
                            >
                              <div className="min-w-0 flex-1">
                                <p
                                  className="truncate text-[12px] font-semibold text-[var(--text-primary)]"
                                  title={c.name?.trim() || "Weekly Report"}
                                >
                                  {c.name?.trim() || "Weekly Report"}
                                </p>
                                <p className="tabular text-[10px] text-[var(--text-muted)]">
                                  <span className="inline-flex flex-wrap items-center gap-1.5">
                                    <span>
                                      Next:{" "}
                                      {c.next_run_at
                                        ? formatShortGmtDate(c.next_run_at)
                                        : "Not scheduled"}
                                    </span>
                                    {c.hold_for_review === true ? (
                                      <HoldForReviewRequiredBadge />
                                    ) : null}
                                  </span>
                                </p>
                              </div>
                              <HoldForReviewRowToggle
                                active={c.hold_for_review === true}
                                disabled={scheduleSaving}
                                onToggle={() =>
                                  void toggleHoldForReview(c, !(c.hold_for_review === true))
                                }
                              />
                              <button
                                type="button"
                                onClick={() => void toggleCampaignEnabled(c, !c.enabled)}
                                className={cn(
                                  "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap transition-colors",
                                  c.enabled
                                    ? "border-[#4E9C6F]/30 bg-[#4E9C6F]/15 text-[#4E9C6F]"
                                    : "border-white/[0.08] bg-white/[0.04] text-white/40",
                                )}
                                aria-label={c.enabled ? "Pause schedule" : "Resume schedule"}
                              >
                                {c.enabled ? "Active" : "Paused"}
                              </button>
                              <button
                                type="button"
                                title="Edit schedule"
                                aria-label="Edit schedule"
                                className="inline-flex size-7 shrink-0 items-center justify-center rounded-[var(--radius)] border border-[var(--border)] text-[var(--accent)] hover:bg-[var(--bg-secondary)]"
                                onClick={() => openEditScheduleEditor(c)}
                              >
                                <Edit2 className="size-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <ScheduledRecentSends
                      history={psaScheduledHistory.history}
                      loading={psaScheduledHistory.loading}
                    />
                  </div>

                  {/* Card 2: Portfolio Intelligence Digest */}
                  <div className="rounded-xl border border-white/[0.06] bg-[var(--surface-1)] p-5 [box-shadow:var(--shadow-sm),var(--shadow-inset)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-[13px] font-semibold text-[var(--text-primary)]">
                          Portfolio Intelligence Digest
                        </h2>
                        <p className="mt-1 text-[11px] leading-snug text-[var(--text-muted)]">
                          A weekly AI summary of what needs attention across your portfolio,
                          delivered to your inbox.
                        </p>
                      </div>
                      <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={digestSettings?.enabled ?? false}
                          disabled={digestLoading || !digestSettings}
                          onChange={(e) =>
                            void saveDigestSettings({
                              enabled: e.target.checked,
                            })
                          }
                        />
                        <div className="h-5 w-9 rounded-full bg-white/[0.08] after:absolute after:left-[2px] after:top-[2px] after:size-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[var(--accent)] peer-checked:after:translate-x-full" />
                      </label>
                    </div>

                    <div className="mt-4">
                      {digestSettings?.enabled ? (
                        <div className="space-y-2">
                          <p className="text-[11px] text-white/70">
                            {digestSettings.frequency.charAt(0).toUpperCase() +
                              digestSettings.frequency.slice(1)}{" "}
                            on{" "}
                            {digestSettings.send_day.charAt(0).toUpperCase() +
                              digestSettings.send_day.slice(1)}{" "}
                            at{" "}
                            {SCHEDULE_TIME_OPTIONS.find(
                              (t) => t.value === digestSettings.send_time,
                            )?.label ?? digestSettings.send_time}{" "}
                            GMT
                          </p>
                          <button
                            type="button"
                            onClick={() => setDigestSettingsExpanded(!digestSettingsExpanded)}
                            className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
                          >
                            {digestSettingsExpanded ? "Hide settings" : "Configure"}
                          </button>
                          {digestSettingsExpanded ? (
                            <div className="space-y-3 border-t border-white/[0.06] pt-3">
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-medium text-[var(--text-muted)]">
                                  Frequency
                                </label>
                                <select
                                  value={digestSettings.frequency}
                                  onChange={(e) =>
                                    void saveDigestSettings({
                                      frequency: e.target.value,
                                    })
                                  }
                                  className="max-w-xs rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-2 py-1.5 text-[11px] text-[var(--text-primary)] focus:outline-none"
                                >
                                  <option value="weekly">Weekly</option>
                                  <option value="fortnightly">Fortnightly</option>
                                  <option value="monthly">Monthly</option>
                                </select>
                              </div>
                              <div>
                                <label className="mb-2 block text-[10px] font-medium text-[var(--text-muted)]">
                                  Day
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                  {SCHEDULE_DAY_OPTIONS.map((day) => (
                                    <button
                                      key={day}
                                      type="button"
                                      onClick={() =>
                                        void saveDigestSettings({
                                          send_day: day,
                                        })
                                      }
                                      className={cn(
                                        "rounded-lg px-2.5 py-1 text-[11px] capitalize transition-colors",
                                        digestSettings.send_day === day
                                          ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                                          : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08]",
                                      )}
                                    >
                                      {day.slice(0, 3)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-medium text-[var(--text-muted)]">
                                  Time
                                </label>
                                <select
                                  value={digestSettings.send_time}
                                  onChange={(e) =>
                                    void saveDigestSettings({
                                      send_time: e.target.value,
                                    })
                                  }
                                  className="max-w-xs rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-2 py-1.5 text-[11px] text-[var(--text-primary)] focus:outline-none"
                                  style={{ colorScheme: "dark" }}
                                >
                                  {SCHEDULE_TIME_OPTIONS.map((t) => (
                                    <option
                                      key={t.value}
                                      value={t.value}
                                      style={{
                                        backgroundColor: "#0A0F1E",
                                        color: "#FFFFFF",
                                      }}
                                    >
                                      {t.label} GMT
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-medium text-[var(--text-muted)]">
                                  Deliver to
                                </label>
                                <input
                                  type="email"
                                  value={digestSettings.email_to}
                                  onChange={(e) =>
                                    setDigestSettings((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            email_to: e.target.value,
                                          }
                                        : prev,
                                    )
                                  }
                                  onBlur={() =>
                                    void saveDigestSettings({
                                      email_to: digestSettings.email_to,
                                    })
                                  }
                                  placeholder={userEmail ?? "your@email.com"}
                                  className="max-w-xs rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-2 py-1.5 text-[11px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                                />
                              </div>
                              {digestSaving && (
                                <p className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                                  <Loader2 className="size-2.5 animate-spin" />
                                  Saving...
                                </p>
                              )}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-[11px] text-[var(--text-muted)]">
                          Enable to receive a weekly portfolio health summary automatically.
                        </p>
                      )}
                    </div>

                    <ScheduledRecentSends
                      history={digestScheduledHistory.history}
                      loading={digestScheduledHistory.loading}
                    />
                  </div>

                  {/* Card 3: Service Reviews & QBRs (CI) */}
                  <div className="rounded-xl border border-white/[0.06] bg-[var(--surface-1)] p-5 [box-shadow:var(--shadow-sm),var(--shadow-inset)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-[13px] font-semibold text-[var(--text-primary)]">
                          Service Reviews & QBRs
                        </h2>
                        <p className="mt-1 text-[11px] leading-snug text-[var(--text-muted)]">
                          Per-client service reviews and QBR packs from Client Intelligence, sent on a
                          schedule.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (scheduledCiOpen) {
                            setScheduledCiOpen(false);
                            setEditingCiScheduleId(null);
                            setNewCiScheduleClient("");
                            setNewCiScheduleEmail("");
                            setNewCiHoldForReview(false);
                          } else {
                            setEditingCiScheduleId(null);
                            setNewCiScheduleClient("");
                            setNewCiScheduleEmail("");
                            setNewCiHoldForReview(false);
                            setScheduledCiOpen(true);
                          }
                        }}
                        className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-primary)] transition-colors hover:text-[var(--accent)]"
                      >
                        {scheduledCiOpen ? "Cancel" : "+ Add"}
                      </button>
                    </div>

                    <div className="mt-4">
                      {ciCampaigns.length === 0 ? (
                        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-4 text-center">
                          <p className="text-[12px] font-medium text-[var(--text-primary)]">
                            No service reviews or QBRs scheduled yet
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCiScheduleId(null);
                              setNewCiScheduleClient("");
                              setNewCiScheduleEmail("");
                              setNewCiHoldForReview(false);
                              setScheduledCiOpen(true);
                            }}
                            className="mt-3 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-primary)] hover:text-[var(--accent)]"
                          >
                            + Add
                          </button>
                        </div>
                      ) : (
                        <ul className="divide-y divide-white/[0.06]">
                          {ciCampaigns.map((c, idx) => {
                            const clientName =
                              c.ci_qbr_client_name?.trim() ||
                              c.name?.split(" — ")[0]?.trim() ||
                              "Client";
                            const typeLabel =
                              c.report_type === "ci_qbr" ? "QBR" : "Service Review";
                            return (
                              <li
                                key={c.id ?? idx}
                                className="flex items-center gap-2 py-2.5 first:pt-0 last:pb-0"
                              >
                                <div className="min-w-0 flex-1">
                                  <p
                                    className="truncate text-[12px] font-semibold text-[var(--text-primary)]"
                                    title={clientName}
                                  >
                                    {clientName}
                                  </p>
                                  <p className="text-[10px] text-[var(--text-muted)]">
                                    <span className="inline-flex flex-wrap items-center gap-1.5">
                                      <span>
                                        {typeLabel} · Next:{" "}
                                        {c.next_run_at
                                          ? formatShortGmtDate(c.next_run_at)
                                          : "Not scheduled"}
                                      </span>
                                      {c.hold_for_review === true ? (
                                        <HoldForReviewRequiredBadge />
                                      ) : null}
                                    </span>
                                  </p>
                                </div>
                                <HoldForReviewRowToggle
                                  active={c.hold_for_review === true}
                                  disabled={scheduleSaving}
                                  onToggle={() =>
                                    void toggleHoldForReview(c, !(c.hold_for_review === true))
                                  }
                                />
                                <button
                                  type="button"
                                  onClick={() => void toggleCampaignEnabled(c, !c.enabled)}
                                  className={cn(
                                    "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap transition-colors",
                                    c.enabled
                                      ? "border-[#4E9C6F]/30 bg-[#4E9C6F]/15 text-[#4E9C6F]"
                                      : "border-white/[0.08] bg-white/[0.04] text-white/40",
                                  )}
                                  aria-label={c.enabled ? "Pause schedule" : "Resume schedule"}
                                >
                                  {c.enabled ? "Active" : "Paused"}
                                </button>
                                <button
                                  type="button"
                                  title="Edit schedule"
                                  aria-label="Edit schedule"
                                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-[var(--radius)] border border-[var(--border)] text-[var(--accent)] hover:bg-[var(--bg-secondary)]"
                                  onClick={() => openEditScheduleEditor(c)}
                                >
                                  <Edit2 className="size-3.5" />
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>

                    {scheduledCiOpen && (
                      <div className="mt-4 space-y-3 border-t border-white/[0.06] pt-4">
                        {newCiScheduleType === "service_review" ? (
                          <div>
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/30">
                              Frequency
                            </p>
                            <div className="flex gap-1.5">
                              {(["weekly", "fortnightly", "monthly"] as const).map((f) => (
                                <button
                                  key={f}
                                  type="button"
                                  onClick={() => setNewCiFrequency(f)}
                                  className={cn(
                                    "rounded-lg px-2.5 py-1.5 text-[11px] capitalize transition-colors",
                                    newCiFrequency === f
                                      ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                                      : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08]",
                                  )}
                                >
                                  {f}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setNewCiScheduleType("service_review")}
                            className={cn(
                              "rounded-lg border p-2.5 text-left transition-all",
                              newCiScheduleType === "service_review"
                                ? "border-[var(--accent)]/40 bg-[var(--accent)]/10"
                                : "border-[var(--border)] hover:border-white/20",
                            )}
                          >
                            <p className="mb-0.5 text-[11px] font-semibold text-[var(--text-primary)]">
                              Service Review
                            </p>
                            <p className="text-[10px] text-[var(--text-muted)]">Monthly · PSA-powered</p>
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewCiScheduleType("qbr")}
                            className={cn(
                              "rounded-lg border p-2.5 text-left transition-all",
                              newCiScheduleType === "qbr"
                                ? "border-[var(--accent)]/40 bg-[var(--accent)]/10"
                                : "border-[var(--border)] hover:border-white/20",
                            )}
                          >
                            <div className="mb-0.5 flex items-center gap-1.5">
                              <p className="text-[11px] font-semibold text-[var(--text-primary)]">QBR</p>
                              <span className="rounded-full bg-[var(--accent)]/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-[var(--accent)]">
                                Beta
                              </span>
                            </div>
                            <p className="text-[10px] text-[var(--text-muted)]">Quarterly · CI-powered</p>
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-medium text-[var(--text-muted)]">Client</label>
                            <select
                              value={newCiScheduleClient}
                              onChange={(e) => setNewCiScheduleClient(e.target.value)}
                              className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-2 py-1.5 text-[11px] text-[var(--text-primary)] focus:outline-none"
                            >
                              <option value="">Select client...</option>
                              {ciClients.map((c) => (
                                <option key={c.name} value={c.name}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-medium text-[var(--text-muted)]">Deliver to</label>
                            <input
                              type="email"
                              value={newCiScheduleEmail}
                              onChange={(e) => setNewCiScheduleEmail(e.target.value)}
                              placeholder={userEmail ?? "email@msp.com"}
                              className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-2 py-1.5 text-[11px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/30">
                            Timing
                          </p>
                          <div className="mb-2 flex flex-wrap gap-1.5">
                            {SCHEDULE_DAY_OPTIONS.map((day) => (
                              <button
                                key={day}
                                type="button"
                                onClick={() => setNewCiScheduleDay(day)}
                                className={cn(
                                  "rounded-lg px-2.5 py-1 text-[11px] capitalize transition-colors",
                                  newCiScheduleDay === day
                                    ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                                    : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08]",
                                )}
                              >
                                {day.slice(0, 3)}
                              </button>
                            ))}
                          </div>
                          <select
                            value={newCiScheduleTime}
                            onChange={(e) => setNewCiScheduleTime(e.target.value)}
                            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[12px] text-white"
                            style={{ colorScheme: "dark" }}
                          >
                            {SCHEDULE_TIME_OPTIONS.map((t) => (
                              <option
                                key={t.value}
                                value={t.value}
                                style={{
                                  backgroundColor: "#0A0F1E",
                                  color: "#FFFFFF",
                                }}
                              >
                                {t.label} GMT
                              </option>
                            ))}
                          </select>
                        </div>

                        <ScheduleHoldForReviewField
                          checked={newCiHoldForReview}
                          onChange={setNewCiHoldForReview}
                          disabled={savingCiSchedule}
                        />

                        <button
                          type="button"
                          disabled={!newCiScheduleClient || !newCiScheduleEmail || savingCiSchedule}
                          onClick={() => void saveNewCiSchedule()}
                          className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-1.5 text-[11px] font-semibold text-[#06091a] transition-all hover:scale-[1.02] disabled:scale-100 disabled:opacity-50"
                        >
                          {savingCiSchedule ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Calendar className="size-3" />
                          )}
                          Schedule {newCiScheduleType === "qbr" ? "quarterly QBR" : "monthly review"}
                        </button>
                      </div>
                    )}

                    <ScheduledRecentSends
                      history={ciScheduledHistory.history}
                      loading={ciScheduledHistory.loading}
                    />
                  </div>
                </div>

                  {scheduleEditorOpen ? (
                    <div className="fixed inset-0 z-[100] flex min-h-0 flex-col overflow-hidden bg-[var(--bg-secondary)]">
                        <style jsx global>{`
                          @keyframes pulse-glow {
                            0% { box-shadow: 0 4px 16px rgba(56,189,248,0.3); }
                            50% { box-shadow: 0 4px 24px rgba(56,189,248,0.5); }
                            100% { box-shadow: 0 4px 16px rgba(56,189,248,0.3); }
                          }
                        `}</style>
                        <div className="relative z-10 flex h-[60px] shrink-0 items-center justify-between border-b border-[var(--border)] bg-[#0f172a] px-8">
                          <div className="flex items-center gap-2 text-white">
                            <Sparkles className="size-4 text-[var(--accent)]" />
                            <h2 className="text-[16px] font-semibold">
                              {scheduleEditorIsNew ? "New schedule" : "Edit schedule"}
                            </h2>
                          </div>
                          <button
                            type="button"
                            onClick={() => setScheduleEditorOpen(false)}
                            className="rounded-full p-2 text-white/90 hover:text-white"
                          >
                            <X className="size-6" />
                          </button>
                        </div>
                        <div className={cn("relative z-10 flex h-11 shrink-0 items-center border-b border-[var(--border)] bg-[var(--bg-primary)] px-8 transition-shadow duration-200", stepBarGlow ? "shadow-[0_0_0_3px_rgba(56,189,248,0.25)]" : "")}>
                          {(["Who & when", "What data", "Review & deliver"] as const).map((label, idx) => {
                            const complete = idx < schCampaignEditorTab;
                            const active = idx === schCampaignEditorTab;
                            return (
                              <div
                                key={label}
                                className={cn(
                                  "flex h-11 w-1/3 items-center justify-center border-b-2 text-center text-[12px]",
                                  active
                                    ? "border-[var(--accent)] font-medium text-[var(--text-primary)]"
                                    : complete
                                      ? "border-transparent text-[var(--accent)]"
                                      : "border-transparent text-[var(--text-muted)]",
                                )}
                              >
                                {complete ? `✓ ${label}` : label}
                              </div>
                            );
                          })}
                        </div>

                        <div
                          className="min-h-0 flex-1 overflow-y-auto overscroll-contain [webkit-overflow-scrolling:touch] md:overscroll-auto"
                        >
                        <div
                          className="w-full"
                          style={{
                            padding: "2rem 3rem",
                            background:
                              "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(56,189,248,0.05) 0%, transparent 60%)",
                          }}
                        >
                          {schedulePrefillImportBanner ? (
                            <p className="mb-4 text-[12px] text-[var(--text-secondary)]">
                              Pre-filled from your last import
                            </p>
                          ) : null}
                          {showDemoDataBanner ? (
                            <div className="mb-6">
                              <DemoBanner
                                onConnectPSA={() => {
                                  setScheduleEditorOpen(false);
                                  openIntegrationsInConfiguration();
                                  setSettingsOpen(false);
                                  setSidebarOpenMobile(false);
                                }}
                              />
                            </div>
                          ) : null}
                          {schCampaignEditorTab === 0 ? (
                            <div className="space-y-4">
                              <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-5 lg:p-6">
                                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
                                  Campaign name
                                </p>
                                <Input
                                  value={schName}
                                  onChange={(e) => setSchName(e.target.value)}
                                  placeholder="Weekly client update"
                                />
                              </div>
                              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start lg:gap-6">
                                <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-5 lg:p-6">
                                  <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
                                    Delivery
                                  </p>
                                  <div className="space-y-4">
                                    <div>
                                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                                        Send to (comma-separated for multiple)
                                      </p>
                                      <Input
                                        type="text"
                                        autoComplete="email"
                                        value={schEmail}
                                        onChange={(e) => setSchEmail(e.target.value)}
                                        placeholder={userEmail ?? "you@company.com"}
                                      />
                                      <button
                                        type="button"
                                        className="mt-2 text-left text-[12px] font-medium text-[var(--accent)] underline-offset-2 hover:underline"
                                        onClick={() => setSchCcBccOpen((o) => !o)}
                                      >
                                        {schCcBccOpen ? "− Hide CC/BCC" : "+ Add CC/BCC"}
                                      </button>
                                      {schCcBccOpen ? (
                                        <div className="mt-3 space-y-3">
                                          <div>
                                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                                              CC (optional)
                                            </p>
                                            <Input
                                              type="text"
                                              value={schEmailCc}
                                              onChange={(e) => setSchEmailCc(e.target.value)}
                                              placeholder="cc1@client.com, cc2@client.com"
                                            />
                                          </div>
                                          <div>
                                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                                              BCC (optional)
                                            </p>
                                            <Input
                                              type="text"
                                              value={schEmailBcc}
                                              onChange={(e) => setSchEmailBcc(e.target.value)}
                                              placeholder="bcc@example.com"
                                            />
                                          </div>
                                        </div>
                                      ) : null}
                                      <p className="mb-2 mt-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                                        Email subject
                                      </p>
                                      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-muted)]">
                                        {(schName?.trim() || "Weekly Report")} - [date will be added]
                                      </div>
                                      <p className="mt-1 text-xs italic text-[var(--text-muted)]">
                                        Subject is set automatically from your campaign name and date.
                                      </p>
                                    </div>
                                    <div>
                                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                                        Recipient first name
                                      </p>
                                      <Input
                                        value={schRecipientName}
                                        onChange={(e) => setSchRecipientName(e.target.value)}
                                        placeholder="e.g. John"
                                      />
                                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                                        The email will start with &quot;Hi [name],&quot; - leave blank for generic greeting
                                      </p>
                                    </div>
                                    <div>
                                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                                        Email tone
                                      </p>
                                      <div className="flex flex-wrap gap-2">
                                        {(["formal", "professional", "friendly"] as const).map((tone) => (
                                          <button
                                            key={tone}
                                            type="button"
                                            onClick={() => setSchEmailTone(tone)}
                                            className={cn(
                                              "rounded-full border-[1.5px] px-4 py-2 text-[13px] font-medium capitalize transition-all duration-150 active:scale-95",
                                              schEmailTone === tone
                                                ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-[0_2px_8px_rgba(56,189,248,0.3)]"
                                                : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[rgba(56,189,248,0.4)] hover:text-[var(--text-primary)]",
                                            )}
                                          >
                                            {tone}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-4">
                                  <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-5 lg:p-6">
                                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
                                      Report type
                                    </p>
                                    <div className="grid grid-cols-1 gap-2">
                                      {(["external", "internal", "note_to_self"] as const).map((rt) => (
                                        <button
                                          key={rt}
                                          type="button"
                                          onClick={() => setSchReportType(rt)}
                                          className={cn(
                                            "relative flex cursor-pointer flex-col gap-2 rounded-[var(--radius-lg)] border-[1.5px] p-4 text-left transition-all duration-200 lg:p-5",
                                            schReportType === rt
                                              ? "border-2 border-[var(--accent)] bg-[rgba(56,189,248,0.06)] -translate-y-0.5"
                                              : "border-[var(--border)] hover:-translate-y-0.5 hover:border-[rgba(56,189,248,0.4)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]",
                                          )}
                                        >
                                          <span
                                            className={cn(
                                              "inline-flex size-8 items-center justify-center rounded-full",
                                              rt === "external"
                                                ? "bg-sky-500/20 text-sky-300"
                                                : rt === "internal"
                                                  ? "bg-purple-500/20 text-purple-300"
                                                  : "bg-emerald-500/20 text-emerald-300",
                                            )}
                                          >
                                            {rt === "external" ? (
                                              <Globe className="size-4" />
                                            ) : rt === "internal" ? (
                                              <LayoutList className="size-4" />
                                            ) : (
                                              <User className="size-4" />
                                            )}
                                          </span>
                                          <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                                            {rt === "external"
                                              ? "External"
                                              : rt === "internal"
                                                ? "Internal"
                                                : "Note to self"}
                                          </p>
                                          <p className="text-[12px] leading-relaxed text-[var(--text-muted)]">
                                            {rt === "external"
                                              ? "Client-facing update email with action-focused language."
                                              : rt === "internal"
                                                ? "Internal delivery summary with operational context."
                                                : "Personal digest sent to your own account email."}
                                          </p>
                                          {schReportType === rt ? (
                                            <span className="absolute right-3 top-3 inline-flex size-5 items-center justify-center rounded-full bg-[var(--accent)] text-white">
                                              <Check className="size-3" />
                                            </span>
                                          ) : null}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-5 lg:p-6">
                                    <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
                                      Timing
                                    </p>
                                    <div className="space-y-4">
                                      <div>
                                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                                          Day (GMT)
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                          {SCHEDULE_DAY_OPTIONS.map((d) => (
                                            <button
                                              key={d}
                                              type="button"
                                              onClick={() => setSchDay(d)}
                                              className={cn(
                                                "min-w-11 cursor-pointer rounded-full border-[1.5px] px-3.5 py-2 text-center text-[13px] font-medium capitalize transition-all duration-150 active:scale-95",
                                                schDay === d
                                                  ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-[0_2px_8px_rgba(56,189,248,0.3)]"
                                                  : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[rgba(56,189,248,0.4)] hover:text-[var(--text-primary)]",
                                              )}
                                            >
                                              {d.slice(0, 3)}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      <div>
                                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                                          Time (GMT)
                                        </p>
                                        <select
                                          value={schTime}
                                          onChange={(e) => setSchTime(e.target.value)}
                                          className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 text-sm text-[var(--text-primary)]"
                                          style={{ colorScheme: "dark" }}
                                        >
                                          {SCHEDULE_TIME_OPTIONS.map((t) => (
                                            <option
                                              key={t.value}
                                              value={t.value}
                                              style={{
                                                backgroundColor: "#0A0F1E",
                                                color: "#FFFFFF",
                                              }}
                                            >
                                              {t.label}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : null}

                          {schCampaignEditorTab === 1 ? (
                            <div className="space-y-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-6">
                              <div>
                                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--accent)]">Ticket date range</p>
                                <select
                                  value={schDateRange}
                                  onChange={(e) => setSchDateRange(e.target.value)}
                                  className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 text-sm"
                                >
                                  <option value="today">Today</option>
                                  <option value="this_week">This week</option>
                                  <option value="last_7_days">Last 7 days</option>
                                  <option value="last_14_days">Last 14 days</option>
                                  <option value="last_30_days">Last 30 days</option>
                                </select>
                              </div>
                              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                                <div className={cn(
                                  "space-y-3 rounded-[var(--radius)] border p-[14px]",
                                  schIncludeTickets
                                    ? "border-[rgba(56,189,248,0.4)] bg-[rgba(56,189,248,0.04)]"
                                    : "border-[var(--border)] bg-[var(--bg-primary)]",
                                )}>
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <p className="text-[14px] font-semibold uppercase text-[var(--text-primary)]">Tickets</p>
                                      <p className="mt-1 text-xs text-[var(--text-secondary)]">Support tickets and service requests</p>
                                    </div>
                                    <div role="button" tabIndex={0} onClick={() => setSchIncludeTickets((v) => !v)} style={{ width: "44px", height: "24px", borderRadius: "999px", background: schIncludeTickets ? "#1D9E75" : "rgba(255,255,255,0.15)", position: "relative", cursor: "pointer", transition: "background 0.2s ease", flexShrink: 0 }}>
                                      <div style={{ position: "absolute", top: "3px", left: schIncludeTickets ? "23px" : "3px", width: "18px", height: "18px", borderRadius: "50%", background: "white", transition: "left 0.2s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
                                    </div>
                                  </div>
                                  {schIncludeTickets ? (
                                    <div className="space-y-2 border-t border-[var(--border)] pt-3">
                                      {dataLoading && !dataLoaded ? (
                                        <div className="min-h-[220px] space-y-3 py-4" aria-busy>
                                          <p className="text-center text-sm text-[var(--text-secondary)]">
                                            Loading your HaloPSA data...
                                          </p>
                                          <div className="space-y-2">
                                            {[0, 1, 2, 3].map((row) => (
                                              <div
                                                key={row}
                                                className="flex animate-pulse gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-3"
                                              >
                                                <div className="h-4 w-4 shrink-0 rounded bg-[var(--bg-secondary)]" />
                                                <div className="min-w-0 flex-1 space-y-2">
                                                  <div className="h-3 w-[75%] max-w-[280px] rounded bg-[var(--bg-secondary)]" />
                                                  <div className="h-3 w-[50%] max-w-[180px] rounded bg-[var(--bg-secondary)]" />
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="flex items-center justify-between">
                                            <p className="text-xs font-semibold uppercase text-[var(--text-muted)]">Select clients</p>
                                            <label className="flex items-center gap-2 text-sm">
                                              {renderScheduleCheckbox(ticketClientMode === "all", () =>
                                                setTicketClientMode(
                                                  ticketClientMode === "all" ? "selected" : "all",
                                                ),
                                              )}
                                              All clients
                                            </label>
                                          </div>
                                          {ticketClientMode === "selected" ? (
                                            <>
                                              <Input className="h-10" placeholder="Search ticket clients..." value={ticketClientSearch} onChange={(e) => setTicketClientSearch(e.target.value)} />
                                              <div className="max-h-none space-y-0 overflow-visible rounded-[var(--radius)] border border-[var(--border)] md:max-h-[500px] md:overflow-y-auto">
                                                {ticketClientOptions.map((client) => {
                                                  const expanded = expandedTicketClients.has(client.id);
                                                  const clientTickets = scheduleTicketsForClientRow(
                                                    client.id,
                                                    client.name,
                                                  );
                                                  const allChecked =
                                                    clientTickets.length > 0 &&
                                                    clientTickets.every((t) =>
                                                      selectedTicketIds.includes(Number(t.id)),
                                                    );
                                                  return (
                                                    <div key={`t-${client.id}`} className={cn("border-b border-[var(--border)] px-[14px] py-3 hover:bg-[var(--bg-secondary)] last:border-b-0", allChecked ? "border-l-3 border-l-[var(--accent)] bg-[rgba(56,189,248,0.06)]" : "")}>
                                                      <div className="flex items-center gap-2 text-xs">
                                                        <button type="button" className="w-4 text-[var(--text-muted)]" onClick={(e) => { e.stopPropagation(); setExpandedTicketClients((prev) => { const next = new Set(prev); if (next.has(client.id)) next.delete(client.id); else next.add(client.id); return next; }); }}>
                                                          {expanded ? (
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                                                          ) : (
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                                                          )}
                                                        </button>
                                                        {renderScheduleCheckbox(
                                                          allChecked,
                                                          () => handleClientCheck(client.id, !allChecked, "tickets"),
                                                        )}
                                                        <button type="button" className="min-w-0 flex-1 truncate text-left text-[13px]" onClick={() => handleClientCheck(client.id, !allChecked, "tickets")}>{client.name}</button>
                                                        <span className="rounded bg-[var(--bg-secondary)] px-1.5 py-0.5">
                                                          {clientTickets.length}
                                                        </span>
                                                      </div>
                                                      {expanded ? (
                                                        <div className="ml-6 mt-1 space-y-1">
                                                          <button
                                                        type="button"
                                                        className="text-[11px] text-[var(--accent)]"
                                                        onClick={() => {
                                                          setSelectedTicketClients((prev) =>
                                                            prev.includes(client.id) ? prev : [...prev, client.id],
                                                          );
                                                          setSelectedTicketIds((prev) =>
                                                            Array.from(
                                                              new Set([
                                                                ...prev,
                                                                ...clientTickets.map((t) => Number(t.id)),
                                                              ]),
                                                            ),
                                                          );
                                                        }}
                                                      >
                                                        Select all tickets
                                                      </button>
                                                          {clientTickets.map((t) => (
                                                            <label key={`tt-${String(t.id)}`} className="ml-4 flex items-center gap-2 border-l-2 border-[var(--border)] bg-[rgba(0,0,0,0.15)] px-[14px] py-[10px] text-[11px] text-[var(--text-secondary)]">
                                                              {renderScheduleCheckbox(
                                                                selectedTicketIds.includes(Number(t.id)),
                                                                () =>
                                                                  handleTicketCheck(
                                                                    Number(t.id),
                                                                    client.id,
                                                                    !selectedTicketIds.includes(Number(t.id)),
                                                                  ),
                                                              )}
                                                              <span className="max-w-[230px] truncate">{String(t.summary ?? `Ticket ${String(t.id)}`).slice(0, 40)}</span>
                                                              {(() => {
                                                                const rawStatusId = Number((t as { status_id?: unknown }).status_id);
                                                                const statusLabel = getDisplayStatus(Number.isFinite(rawStatusId) ? rawStatusId : 1);
                                                                return (
                                                                  <span className={cn("rounded px-1.5 py-0.5", getStatusBadgeClass(statusLabel))}>
                                                                    {statusLabel}
                                                                  </span>
                                                                );
                                                              })()}
                                                            </label>
                                                          ))}
                                                        </div>
                                                      ) : null}
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </>
                                          ) : null}
                                        </>
                                      )}
                                    </div>
                                  ) : null}
                                </div>

                                <div className={cn(
                                  "space-y-3 rounded-[var(--radius)] border p-[14px]",
                                  schIncludeProjects
                                    ? "border-[rgba(56,189,248,0.4)] bg-[rgba(56,189,248,0.04)]"
                                    : "border-[var(--border)] bg-[var(--bg-primary)]",
                                )}>
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <p className="text-[14px] font-semibold uppercase text-[var(--text-primary)]">Projects</p>
                                      <p className="mt-1 text-xs text-[var(--text-secondary)]">Project-type tickets and deliverables</p>
                                    </div>
                                    <div role="button" tabIndex={0} onClick={() => setSchIncludeProjects((v) => !v)} style={{ width: "44px", height: "24px", borderRadius: "999px", background: schIncludeProjects ? "#1D9E75" : "rgba(255,255,255,0.15)", position: "relative", cursor: "pointer", transition: "background 0.2s ease", flexShrink: 0 }}>
                                      <div style={{ position: "absolute", top: "3px", left: schIncludeProjects ? "23px" : "3px", width: "18px", height: "18px", borderRadius: "50%", background: "white", transition: "left 0.2s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
                                    </div>
                                  </div>
                                  {schIncludeProjects ? (
                                    <div className="space-y-2 border-t border-[var(--border)] pt-3">
                                      <div className="flex items-center justify-between">
                                        <p className="text-xs font-semibold uppercase text-[var(--text-muted)]">Select clients</p>
                                        <label className="flex items-center gap-2 text-sm">
                                          {renderScheduleCheckbox(projectClientMode === "all", () =>
                                            setProjectClientMode(
                                              projectClientMode === "all" ? "selected" : "all",
                                            ),
                                          )}
                                          All clients
                                        </label>
                                      </div>
                                      {projectClientMode === "selected" ? (
                                        <>
                                          <Input className="h-10" placeholder="Search project clients..." value={projectClientSearch} onChange={(e) => setProjectClientSearch(e.target.value)} />
                                          <div className="max-h-none space-y-0 overflow-visible rounded-[var(--radius)] border border-[var(--border)] md:max-h-[500px] md:overflow-y-auto">
                                            {projectClientOptions.map((client) => {
                                              const expanded = expandedProjectClients.has(client.id);
                                              const clientProjects = allProjects.filter((t) => Number(t.clientId ?? t.client_id) === client.id);
                                              const allChecked = clientProjects.length > 0 && clientProjects.every((t) => selectedProjectIds.includes(Number(t.id)));
                                              return (
                                                <div key={`p-${client.id}`} className={cn("border-b border-[var(--border)] px-[14px] py-3 hover:bg-[var(--bg-secondary)] last:border-b-0", allChecked ? "border-l-3 border-l-[var(--accent)] bg-[rgba(56,189,248,0.06)]" : "")}>
                                                  <div className="flex items-center gap-2 text-xs">
                                                    <button type="button" className="w-4 text-[var(--text-muted)]" onClick={(e) => { e.stopPropagation(); setExpandedProjectClients((prev) => { const next = new Set(prev); if (next.has(client.id)) next.delete(client.id); else next.add(client.id); return next; }); }}>
                                                      {expanded ? (
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                                                      ) : (
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                                                      )}
                                                    </button>
                                                    {renderScheduleCheckbox(
                                                      allChecked,
                                                      () => handleClientCheck(client.id, !allChecked, "projects"),
                                                    )}
                                                    <button type="button" className="min-w-0 flex-1 truncate text-left text-[13px]" onClick={() => handleClientCheck(client.id, !allChecked, "projects")}>{client.name}</button>
                                                    <span className="rounded bg-[var(--bg-secondary)] px-1.5 py-0.5">{getTicketCountForClient(client.id, allProjects)}</span>
                                                  </div>
                                                  {expanded ? (
                                                    <div className="ml-6 mt-1 space-y-1">
                                                      <button
                                                      type="button"
                                                      className="text-[11px] text-[var(--accent)]"
                                                      onClick={() => {
                                                        setSelectedProjectClients((prev) =>
                                                          prev.includes(client.id) ? prev : [...prev, client.id],
                                                        );
                                                        setSelectedProjectIds((prev) =>
                                                          Array.from(
                                                            new Set([
                                                              ...prev,
                                                              ...clientProjects.map((t) => Number(t.id)),
                                                            ]),
                                                          ),
                                                        );
                                                      }}
                                                    >
                                                      Select all tickets
                                                    </button>
                                                      {clientProjects.map((t) => (
                                                        <label key={`pp-${String(t.id)}`} className="ml-4 flex items-center gap-2 border-l-2 border-[var(--border)] bg-[rgba(0,0,0,0.15)] px-[14px] py-[10px] text-[11px] text-[var(--text-secondary)]">
                                                          {renderScheduleCheckbox(
                                                            selectedProjectIds.includes(Number(t.id)),
                                                            () =>
                                                              handleProjectCheck(
                                                                Number(t.id),
                                                                client.id,
                                                                !selectedProjectIds.includes(Number(t.id)),
                                                              ),
                                                          )}
                                                          <span className="max-w-[230px] truncate">{String(t.summary ?? `Ticket ${String(t.id)}`).slice(0, 40)}</span>
                                                          {(() => {
                                                            const rawStatusId = Number((t as { status_id?: unknown }).status_id);
                                                            const statusLabel = getDisplayStatus(Number.isFinite(rawStatusId) ? rawStatusId : 1);
                                                            return (
                                                              <span className={cn("rounded px-1.5 py-0.5", getStatusBadgeClass(statusLabel))}>
                                                                {statusLabel}
                                                              </span>
                                                            );
                                                          })()}
                                                        </label>
                                                      ))}
                                                    </div>
                                                  ) : null}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </>
                                      ) : null}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          ) : null}

                          {schCampaignEditorTab === 2 ? (
                            <>
                            <div className="space-y-4">
                              <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-6">
                                <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--accent)]">Email content</p>
                                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                  {[
                                    { key: "summary", label: "Weekly summary", checked: true, locked: true },
                                    { key: "actions", label: "Action log", checked: schEmailPrefs.include_actions },
                                    { key: "risks", label: "Key risks", checked: schEmailPrefs.include_risks },
                                    { key: "status", label: "Status per project/ticket", checked: schEmailPrefs.include_status },
                                  ].map((item) => (
                                    <button
                                      key={item.key}
                                      type="button"
                                      disabled={item.locked === true}
                                      onClick={() => {
                                        if (item.key === "actions") setSchEmailPrefs((p) => ({ ...p, include_actions: !p.include_actions }));
                                        if (item.key === "risks") setSchEmailPrefs((p) => ({ ...p, include_risks: !p.include_risks }));
                                        if (item.key === "status") setSchEmailPrefs((p) => ({ ...p, include_status: !p.include_status }));
                                      }}
                                      className={cn(
                                        "flex items-center gap-2 rounded-[var(--radius)] border px-3 py-2 text-left transition-all duration-150",
                                        item.checked
                                          ? "border-[var(--accent)] bg-[rgba(56,189,248,0.06)]"
                                          : "border-[var(--border)] hover:border-[rgba(56,189,248,0.4)] hover:bg-[rgba(56,189,248,0.03)]",
                                        item.locked ? "cursor-not-allowed opacity-70" : "cursor-pointer",
                                      )}
                                    >
                                      {renderScheduleCheckbox(!!item.checked, () => {}, item.locked === true)}
                                      <span className="text-[13px] font-medium">{item.label}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-6">
                                <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--accent)]">Excel attachment</p>
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-sm font-medium text-[var(--text-primary)]">Attach Excel report</p>
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setSchAttachExcel((v) => !v)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        setSchAttachExcel((v) => !v);
                                      }
                                    }}
                                    style={{
                                      width: "44px",
                                      height: "24px",
                                      borderRadius: "999px",
                                      background: schAttachExcel ? "#1D9E75" : "rgba(255,255,255,0.15)",
                                      position: "relative",
                                      cursor: "pointer",
                                      transition: "background 0.2s ease",
                                      flexShrink: 0,
                                    }}
                                  >
                                    <div
                                      style={{
                                        position: "absolute",
                                        top: "3px",
                                        left: schAttachExcel ? "23px" : "3px",
                                        width: "18px",
                                        height: "18px",
                                        borderRadius: "50%",
                                        background: "white",
                                        transition: "left 0.2s ease",
                                        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                                      }}
                                    />
                                  </div>
                                </div>
                                {schAttachExcel ? (
                                  <div className="mt-3 rounded-[var(--radius)] border border-[var(--border)] p-3">
                                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Report sheets</p>
                                    {[...SCHEDULE_EXCEL_CORE_KEYS, ...SCHEDULE_EXCEL_OPTIONAL_TAB_KEYS].map((key) => (
                                      <button key={key} type="button" onClick={() => toggleExcelTab(key)} className={cn("mb-1 flex w-full items-center gap-2 rounded-[var(--radius)] border px-3 py-2 text-left text-xs transition-all duration-150", schExcelOptional.includes(key) ? "border-[var(--accent)] bg-[rgba(56,189,248,0.06)]" : "border-[var(--border)] hover:border-[rgba(56,189,248,0.4)] hover:bg-[rgba(56,189,248,0.03)]")}>
                                        {renderScheduleCheckbox(schExcelOptional.includes(key), () => toggleExcelTab(key))}
                                        {excelSheetLabel(key)}
                                      </button>
                                    ))}
                                    <button
                                      type="button"
                                      className="mt-2 text-xs text-[var(--accent)]"
                                      onClick={() => void openScheduleEmailPreview()}
                                    >
                                      Preview email →
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                              <ScheduleHoldForReviewField
                                checked={schHoldForReview}
                                onChange={setSchHoldForReview}
                                disabled={scheduleSaving}
                              />
                              <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-6">
                                <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
                                  {psaConnections.multiple ? "PSA" : pushPsaLabel}
                                </p>
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0 pr-2">
                                    <p className="text-sm font-medium text-[var(--text-primary)]">
                                      {`Push back to ${psaConnections.multiple ? "PSA" : pushPsaLabel}`}
                                    </p>
                                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                                      After the scheduled run generates the report, post a handover note to each ticket included in the report (email is still sent as normal).
                                    </p>
                                  </div>
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() =>
                                      setSchPushToHalo((v) => {
                                        const next = !v;
                                        if (!next) postTicketSelectionTouchedRef.current = false;
                                        return next;
                                      })
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        setSchPushToHalo((v) => {
                                          const next = !v;
                                          if (!next) postTicketSelectionTouchedRef.current = false;
                                          return next;
                                        });
                                      }
                                    }}
                                    style={{
                                      width: "44px",
                                      height: "24px",
                                      borderRadius: "999px",
                                      background: schPushToHalo ? "#1D9E75" : "rgba(255,255,255,0.15)",
                                      position: "relative",
                                      cursor: "pointer",
                                      transition: "background 0.2s ease",
                                      flexShrink: 0,
                                    }}
                                  >
                                    <div
                                      style={{
                                        position: "absolute",
                                        top: "3px",
                                        left: schPushToHalo ? "23px" : "3px",
                                        width: "18px",
                                        height: "18px",
                                        borderRadius: "50%",
                                        background: "white",
                                        transition: "left 0.2s ease",
                                        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                                      }}
                                    />
                                  </div>
                                </div>
                                {psaConnections.multiple ? (
                                  <div className="mt-3">
                                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                      Push back target
                                    </label>
                                    <select
                                      className={cn(
                                        "w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-xs text-[var(--text-primary)]",
                                        focusRing,
                                      )}
                                      value={schPushDisplayPsa}
                                      onChange={(e) =>
                                        setSchPushDisplayPsa(
                                          e.target.value === "connectwise"
                                            ? "connectwise"
                                            : "halopsa",
                                        )
                                      }
                                    >
                                      <option value="halopsa">HaloPSA</option>
                                      <option value="connectwise">ConnectWise</option>
                                    </select>
                                  </div>
                                ) : null}
                                {schPushToHalo ? (
                                  <div className="mt-3 space-y-3">
                                    <div>
                                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Include in note</p>
                                      <div className="grid grid-cols-2 gap-2 text-xs">
                                        {[
                                          ["client_email", "Client email"],
                                          ["actions", "Action log"],
                                          ["risks", "Risk log"],
                                          ["summary", "Summary"],
                                          ["status_report", "Status report"],
                                        ].map(([id, label]) => (
                                          <button
                                            key={id}
                                            type="button"
                                            className={cn(
                                              "flex items-center gap-2 rounded-[var(--radius)] border px-3 py-2 text-left",
                                              schHaloPushOutputs.includes(id)
                                                ? "border-[var(--accent)] bg-[rgba(56,189,248,0.06)]"
                                                : "border-[var(--border)]",
                                            )}
                                            onClick={() =>
                                              setSchHaloPushOutputs((prev) =>
                                                prev.includes(id)
                                                  ? prev.filter((x) => x !== id)
                                                  : [...prev, id],
                                              )
                                            }
                                          >
                                            {renderScheduleCheckbox(schHaloPushOutputs.includes(id), () => {})}
                                            {label}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <label className="flex items-center justify-between text-sm text-[var(--text-primary)]">
                                      <span>Attach Excel to note</span>
                                      <input
                                        type="checkbox"
                                        checked={schHaloPushExcel}
                                        onChange={(e) => setSchHaloPushExcel(e.target.checked)}
                                      />
                                    </label>
                                    {schHaloPushExcel ? (
                                      <div className="grid grid-cols-2 gap-2 text-xs">
                                        {[...SCHEDULE_EXCEL_CORE_KEYS, ...SCHEDULE_EXCEL_OPTIONAL_TAB_KEYS].map((k) => (
                                          <button
                                            key={`push-${k}`}
                                            type="button"
                                            className={cn(
                                              "flex items-center gap-2 rounded-[var(--radius)] border px-3 py-2 text-left",
                                              schHaloPushExcelTabs.includes(k)
                                                ? "border-[var(--accent)] bg-[rgba(56,189,248,0.06)]"
                                                : "border-[var(--border)]",
                                            )}
                                            onClick={() =>
                                              setSchHaloPushExcelTabs((prev) =>
                                                prev.includes(k)
                                                  ? prev.filter((x) => x !== k)
                                                  : [...prev, k],
                                              )
                                            }
                                          >
                                            {renderScheduleCheckbox(schHaloPushExcelTabs.includes(k), () => {})}
                                            {excelSheetLabel(k)}
                                          </button>
                                        ))}
                                      </div>
                                    ) : null}
                                    <div>
                                      <div className="mb-2 flex items-center justify-between gap-2">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                          Post to
                                        </p>
                                        {haloPushScopeRows.length > 0 ? (
                                          <button
                                            type="button"
                                            className="shrink-0 text-[11px] text-[var(--accent)]"
                                            onClick={() => {
                                              postTicketSelectionTouchedRef.current = true;
                                              if (allPostTargetsSelected) {
                                                setSchPostToTicketIds([]);
                                              } else {
                                                setSchPostToTicketIds(haloPushScopeRows.map((r) => r.id));
                                              }
                                            }}
                                          >
                                            {allPostTargetsSelected ? "Deselect all" : "Select all"}
                                          </button>
                                        ) : null}
                                      </div>
                                      {haloPushScopeRows.length === 0 ? (
                                        <p className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text-muted)]">
                                          Configure the Data tab and load HaloPSA data to list tickets and projects here.
                                        </p>
                                      ) : (
                                        <div className="grid max-h-none grid-cols-1 gap-2 overflow-visible sm:grid-cols-2 md:max-h-[280px] md:overflow-y-auto">
                                          {haloPushProjectRows.length > 0 && haloPushSupportRows.length > 0 ? (
                                            <>
                                              <p className="col-span-full text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                                Projects
                                              </p>
                                              {haloPushProjectRows.map((row) => (
                                                <button
                                                  key={`post-${row.kind}-${row.id}-${row.title}`}
                                                  type="button"
                                                  className={cn(
                                                    "flex w-full min-w-0 items-center gap-2 rounded-[var(--radius)] border px-3 py-2 text-left text-xs transition-all duration-150",
                                                    schPostToTicketIds.includes(row.id)
                                                      ? "border-[var(--accent)] bg-[rgba(56,189,248,0.06)]"
                                                      : "border-[var(--border)] hover:border-[rgba(56,189,248,0.4)] hover:bg-[rgba(56,189,248,0.03)]",
                                                  )}
                                                  onClick={() => {
                                                    postTicketSelectionTouchedRef.current = true;
                                                    setSchPostToTicketIds((prev) =>
                                                      prev.includes(row.id)
                                                        ? prev.filter((x) => x !== row.id)
                                                        : [...prev, row.id],
                                                    );
                                                  }}
                                                >
                                                  {renderScheduleCheckbox(
                                                    schPostToTicketIds.includes(row.id),
                                                    () => {},
                                                  )}
                                                  <span className="min-w-0 flex-1 truncate font-medium text-[var(--text-primary)]">
                                                    {row.title}
                                                  </span>
                                                </button>
                                              ))}
                                              <p className="col-span-full pt-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                                Support Tickets
                                              </p>
                                              {haloPushSupportRows.map((row) => (
                                                <button
                                                  key={`post-${row.kind}-${row.id}-${row.title}`}
                                                  type="button"
                                                  className={cn(
                                                    "flex w-full min-w-0 items-center gap-2 rounded-[var(--radius)] border px-3 py-2 text-left text-xs transition-all duration-150",
                                                    schPostToTicketIds.includes(row.id)
                                                      ? "border-[var(--accent)] bg-[rgba(56,189,248,0.06)]"
                                                      : "border-[var(--border)] hover:border-[rgba(56,189,248,0.4)] hover:bg-[rgba(56,189,248,0.03)]",
                                                  )}
                                                  onClick={() => {
                                                    postTicketSelectionTouchedRef.current = true;
                                                    setSchPostToTicketIds((prev) =>
                                                      prev.includes(row.id)
                                                        ? prev.filter((x) => x !== row.id)
                                                        : [...prev, row.id],
                                                    );
                                                  }}
                                                >
                                                  {renderScheduleCheckbox(
                                                    schPostToTicketIds.includes(row.id),
                                                    () => {},
                                                  )}
                                                  <span className="min-w-0 flex-1 truncate font-medium text-[var(--text-primary)]">
                                                    {row.title}
                                                  </span>
                                                </button>
                                              ))}
                                            </>
                                          ) : (
                                            haloPushScopeRows.map((row) => (
                                              <button
                                                key={`post-${row.kind}-${row.id}-${row.title}`}
                                                type="button"
                                                className={cn(
                                                  "flex w-full min-w-0 items-center gap-2 rounded-[var(--radius)] border px-3 py-2 text-left text-xs transition-all duration-150",
                                                  schPostToTicketIds.includes(row.id)
                                                    ? "border-[var(--accent)] bg-[rgba(56,189,248,0.06)]"
                                                    : "border-[var(--border)] hover:border-[rgba(56,189,248,0.4)] hover:bg-[rgba(56,189,248,0.03)]",
                                                )}
                                                onClick={() => {
                                                  postTicketSelectionTouchedRef.current = true;
                                                  setSchPostToTicketIds((prev) =>
                                                    prev.includes(row.id)
                                                      ? prev.filter((x) => x !== row.id)
                                                      : [...prev, row.id],
                                                  );
                                                }}
                                              >
                                                {renderScheduleCheckbox(
                                                  schPostToTicketIds.includes(row.id),
                                                  () => {},
                                                )}
                                                <span className="min-w-0 flex-1 truncate font-medium text-[var(--text-primary)]">
                                                  {row.title}
                                                </span>
                                              </button>
                                            ))
                                          )}
                                        </div>
                                      )}
                                      <div className="mt-4 flex items-center justify-between gap-3">
                                        <p className="text-sm font-medium text-[var(--text-primary)]">
                                          Consolidated summary instead
                                        </p>
                                        <div
                                          role="button"
                                          tabIndex={0}
                                          onClick={() => setSchPostConsolidated((v) => !v)}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                              e.preventDefault();
                                              setSchPostConsolidated((v) => !v);
                                            }
                                          }}
                                          style={{
                                            width: "44px",
                                            height: "24px",
                                            borderRadius: "999px",
                                            background: schPostConsolidated
                                              ? "#1D9E75"
                                              : "rgba(255,255,255,0.15)",
                                            position: "relative",
                                            cursor: "pointer",
                                            transition: "background 0.2s ease",
                                            flexShrink: 0,
                                          }}
                                        >
                                          <div
                                            style={{
                                              position: "absolute",
                                              top: "3px",
                                              left: schPostConsolidated ? "23px" : "3px",
                                              width: "18px",
                                              height: "18px",
                                              borderRadius: "50%",
                                              background: "white",
                                              transition: "left 0.2s ease",
                                              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                                            }}
                                          />
                                        </div>
                                      </div>
                                      <p className="mt-3 text-xs leading-relaxed text-[var(--text-muted)]">
                                        {schPostConsolidated
                                          ? consolidatedPostTargetLabel
                                            ? `A single combined note will be posted to ${consolidatedPostTargetLabel}.`
                                            : "A single combined note will be posted to the first selected ticket in the list above."
                                          : "Each selected ticket will receive a note containing only its own generated content."}
                                      </p>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                            <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-[1.9fr_1fr]">
                              <div className="space-y-3">
                                <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-6">
                                  <div className="mb-3 flex items-center justify-between border-b border-[var(--border)] pb-3">
                                    <p className="text-[13px] font-semibold text-[var(--text-primary)]">Campaign</p>
                                    <button type="button" className="text-[12px] text-[var(--accent)]" onClick={() => setSchCampaignEditorTab(0)}>Edit →</button>
                                  </div>
                                  <div className="flex justify-between py-1"><span className="text-xs text-[var(--text-muted)]">Name</span><span className="text-[13px] font-medium text-[var(--text-primary)]">{schName || "Weekly Report"}</span></div>
                                  <div className="flex justify-between py-1"><span className="text-xs text-[var(--text-muted)]">Brand</span><span className="text-[13px] font-medium text-[var(--text-primary)]">{schBrandName.trim() || "Handover"}</span></div>
                                  <div className="flex justify-between py-1"><span className="text-xs text-[var(--text-muted)]">Type</span><span className="text-[13px] font-medium text-[var(--text-primary)]">{schReportType.replace(/_/g, " ")}</span></div>
                                </div>
                                <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-6">
                                  <div className="mb-3 flex items-center justify-between border-b border-[var(--border)] pb-3">
                                    <p className="text-[13px] font-semibold text-[var(--text-primary)]">Schedule</p>
                                    <button type="button" className="text-[12px] text-[var(--accent)]" onClick={() => setSchCampaignEditorTab(0)}>Edit →</button>
                                  </div>
                                  <div className="flex justify-between py-1"><span className="text-xs text-[var(--text-muted)]">Day</span><span className="text-[13px] font-medium text-[var(--text-primary)]">{formatScheduleDayLabel(schDay)}</span></div>
                                  <div className="flex justify-between py-1"><span className="text-xs text-[var(--text-muted)]">Time</span><span className="text-[13px] font-medium text-[var(--text-primary)]">{formatScheduleTime12h(schTime)}</span></div>
                                  <div className="flex justify-between py-1"><span className="text-xs text-[var(--text-muted)]">Send to</span><span className="max-w-[65%] text-right text-[13px] font-medium text-[var(--text-primary)]">{schEmail || "Not set"}</span></div>
                                  {schEmailCc.trim() ? (
                                    <div className="flex justify-between py-1">
                                      <span className="text-xs text-[var(--text-muted)]">CC</span>
                                      <span className="max-w-[65%] text-right text-[13px] font-medium text-[var(--text-primary)]">
                                        {schEmailCc}
                                      </span>
                                    </div>
                                  ) : null}
                                  {schEmailBcc.trim() ? (
                                    <div className="flex justify-between py-1">
                                      <span className="text-xs text-[var(--text-muted)]">BCC</span>
                                      <span className="max-w-[65%] text-right text-[13px] font-medium text-[var(--text-primary)]">
                                        {schEmailBcc}
                                      </span>
                                    </div>
                                  ) : null}
                                  <div className="flex justify-between py-1"><span className="text-xs text-[var(--text-muted)]">Tone</span><span className="text-[13px] font-medium capitalize text-[var(--text-primary)]">{schEmailTone}</span></div>
                                </div>
                                <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-6">
                                  <div className="mb-3 flex items-center justify-between border-b border-[var(--border)] pb-3">
                                    <p className="text-[13px] font-semibold text-[var(--text-primary)]">Data</p>
                                    <button type="button" className="text-[12px] text-[var(--accent)]" onClick={() => setSchCampaignEditorTab(1)}>Edit →</button>
                                  </div>
                                  <div className="flex justify-between py-1"><span className="text-xs text-[var(--text-muted)]">Includes</span><span className="text-[13px] font-medium text-[var(--text-primary)]">{schIncludeTickets ? "Tickets" : ""}{schIncludeTickets && schIncludeProjects ? " | " : ""}{schIncludeProjects ? "Projects" : ""}</span></div>
                                  <div className="flex justify-between py-1"><span className="text-xs text-[var(--text-muted)]">Clients</span><span className="text-[13px] font-medium text-[var(--text-primary)]">{ticketClientMode === "all" && projectClientMode === "all" ? "All clients" : `${selectedTicketClients.length + selectedProjectClients.length} clients selected`}</span></div>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <div className="rounded-[var(--radius-lg)] border border-[rgba(56,189,248,0.15)] bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(15,23,42,0.95))] p-6">
                                  <p className="text-[14px] font-semibold text-white">Schedule summary</p>
                                  <div className="mt-2 space-y-1 text-xs text-white/80">
                                    <p>First run: {formatScheduleTs(scheduleRow?.next_run_at ?? null)}</p>
                                    <p>Frequency: Weekly</p>
                                    <p>Report type: {schReportType.replace(/_/g, " ")}</p>
                                    <p>
                                      Email format:{" "}
                                      {schReportType === "external"
                                        ? "Professional email"
                                        : "Digest"}
                                    </p>
                                    <p className="capitalize">Tone: {schEmailTone}</p>
                                    <p>Excel: {schAttachExcel ? `Attached (${schExcelOptional.length} sheets)` : "Not attached"}</p>
                                  </div>
                                </div>
                                <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-6">
                                  <p className="text-[13px] font-semibold text-[var(--text-primary)]">What you&apos;ll receive</p>
                                  <button
                                    type="button"
                                    className="mt-2 text-xs text-[var(--accent)]"
                                    onClick={() => void openScheduleEmailPreview()}
                                  >
                                    Preview email →
                                  </button>
                                  <div className="mt-2 space-y-1 text-xs text-[var(--text-primary)]">
                                    <p>✓ Weekly summary email</p>
                                    {schEmailPrefs.include_actions ? <p>✓ Action log</p> : null}
                                    {schEmailPrefs.include_risks ? <p>✓ Key risks</p> : null}
                                    {schAttachExcel ? <p>✓ Excel report ({schExcelOptional.length} sheets)</p> : null}
                                  </div>
                                </div>
                              </div>
                            </div>
                            </>
                          ) : null}
                        </div>
                        </div>

                        <div className="relative flex min-h-[4rem] shrink-0 flex-wrap items-center gap-3 border-t border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 sm:px-8 sm:py-4">
                          <div className="shrink-0">
                            {schCampaignEditorTab > 0 ? (
                              <Button
                                type="button"
                                variant="outline"
                                className={secondaryModalButtonClass}
                                onClick={() => setSchCampaignEditorTab((prev) => prev - 1)}
                              >
                                ← Back
                              </Button>
                            ) : (
                              <Button type="button" variant="outline" className={secondaryModalButtonClass} onClick={() => setScheduleEditorOpen(false)}>
                                Cancel
                              </Button>
                            )}
                          </div>
                          <div className="order-3 flex min-w-0 flex-1 basis-full items-center justify-center px-2 text-center sm:order-none sm:basis-auto sm:justify-center">
                            {schCampaignEditorTab < 2 ? (
                              scheduleWizardRequiredRemaining > 0 ? (
                                <p className="text-[12px] text-[var(--text-secondary)]">
                                  Required fields remaining:{" "}
                                  <span className="font-semibold text-[var(--text-primary)]">
                                    {scheduleWizardRequiredRemaining}
                                  </span>
                                </p>
                              ) : (
                                <p className="text-[12px] font-medium text-emerald-500">✓ Ready to continue</p>
                              )
                            ) : (
                              <p className="text-[12px] font-medium text-emerald-500">✓ Ready to continue</p>
                            )}
                          </div>
                          <div className="ml-auto flex shrink-0 flex-col items-end gap-1 text-right">
                            {schCampaignEditorTab === 1 ? (
                              <p className="mb-0.5 text-xs text-[var(--text-secondary)]">
                                Tickets: {selectedTicketIds.length} selected · Projects: {selectedProjectIds.length}{" "}
                                selected
                              </p>
                            ) : null}
                            {schCampaignEditorTab < 2 ? (
                              <Button
                                type="button"
                                className={cn(
                                  "h-11 min-w-[7.5rem] bg-[var(--accent)] px-5 text-[14px] font-semibold text-white hover:bg-[var(--accent-hover)]",
                                  primaryModalButtonClass,
                                  scheduleWizardNextFlash &&
                                    schCampaignEditorTab < 2 &&
                                    "animate-pulse motion-reduce:animate-none",
                                )}
                                disabled={
                                  schCampaignEditorTab === 1 &&
                                  !canProceedStep3
                                }
                                onClick={() => setSchCampaignEditorTab((s) => Math.min(2, s + 1))}
                              >
                                Next →
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                className={cn("bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]", primaryModalButtonClass)}
                                style={{ boxShadow: "0 4px 16px rgba(56,189,248,0.3)", animation: "pulse-glow 2s infinite" }}
                                disabled={scheduleSaving}
                                onClick={() => void saveScheduledReport()}
                              >
                                {scheduleSaving
                                  ? scheduleEditorIsNew
                                    ? "Creating..."
                                    : "Saving..."
                                  : scheduleEditorIsNew
                                    ? "Create schedule"
                                    : "Save"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                  ) : null}
                </>
                )}
              </div>
            </div>
          ) : userEmail &&
            mainView === "delivery" &&
            deliveryDashboardAccess !== "none" ? (
            <div key="delivery" className="relative animate-in fade-in duration-200">
              {isExpiredTrial || soloGenerationLocked ? (
                <UpgradeWall message="Your trial has ended - Delivery Health requires an active plan." />
              ) : (
              <>
              <div
                className={cn(
                  !hasProAccess &&
                    "pointer-events-none select-none blur-[3px] brightness-[0.72] saturate-[0.85]",
                )}
              >
                <DeliveryHealthDashboard
                  focusRing={focusRing}
                  portalClients={deliveryPortalClients}
                  dashboardAccess={deliveryDashboardAccess === "read" ? "read" : "full"}
                  viewMode={dashboardViewMode}
                  demoMode={demoModeActive}
                  initialClientFilter={deliveryHealthPresetClient}
                  initialClientReason={deliveryHealthPresetReason}
                  initialAffectedItemNames={deliveryHealthPresetAffectedItems}
                  onOpenIntegrations={() => {
                    openIntegrationsInConfiguration();
                    setSettingsOpen(false);
                    setSidebarOpenMobile(false);
                  }}
                  onOpenHaloImport={() => setHaloImportOpen(true)}
                  onStartGenerationFromDelivery={({ text, clientName }) => {
                    setInput(text);
                    if (clientName) setProjectName(clientName);
                    setMainView("generate");
                    setSettingsOpen(false);
                    setSidebarOpenMobile(false);
                    window.requestAnimationFrame(() => {
                      inputSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    });
                    toast({
                      message: "Ready to generate",
                      subtitle: "Review the imported HaloPSA content, then run generate.",
                      durationMs: 3200,
                    });
                  }}
                />
              </div>
              {!hasProAccess ? (
                <div className="pointer-events-auto absolute inset-0 z-10 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]">
                  <div
                    className="max-w-md rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
                    role="dialog"
                    aria-labelledby="delivery-health-upgrade-title"
                  >
                    <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
                      <Lock className="size-5" aria-hidden />
                    </div>
                    <h2
                      id="delivery-health-upgrade-title"
                      className="text-lg font-semibold tracking-tight text-[var(--text-primary)]"
                    >
                      Unlock the Delivery Health Dashboard
                    </h2>
                    <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                      Connect HaloPSA and get real-time RAG status across all your projects. Available on Growth and above.
                    </p>
                    <Button
                      type="button"
                      className="mt-5 w-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                      disabled={
                        (!STRIPE_PRO_MONTHLY_PRICE_ID && !STRIPE_PRO_ANNUAL_PRICE_ID) ||
                        checkoutLoadingPriceId !== null
                      }
                      onClick={() => setHeaderUpgradeOpen(true)}
                    >
                      Move to Handover
                    </Button>
                    <Link
                      href="/pricing"
                      className="mt-3 inline-block text-[13px] font-medium text-[var(--accent)] hover:underline"
                    >
                      Compare plans
                    </Link>
                  </div>
                </div>
              ) : null}
              </>
              )}
            </div>
          ) : (
          <>
            {userEmail && mainView === "overview" ? (
              <div key="overview" className="animate-in fade-in duration-200">
                {monthCount === 0 && projectsBootstrapped ? (
                  <div className="mb-6 mx-4 rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/[0.04] p-6 md:mx-6">
                    <p className="mb-2 text-[13px] font-semibold text-white">Welcome to Handover</p>
                    <p className="mb-4 text-[12px] leading-relaxed text-white/55">
                      Generate your first report to start building your account intelligence. Connect your PSA or paste
                      notes directly - your first report takes under 30 seconds.
                    </p>
                    <button
                      type="button"
                      onClick={() => setMainView("generate")}
                      className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-[12px] font-semibold text-[#06091a] transition-all hover:scale-[1.02]"
                    >
                      Generate first report
                    </button>
                  </div>
                ) : null}
                {hasProAccess && (
                  <div className="px-4 pt-4 md:px-6">
                    <ClientIntelligenceAlerts
                      onGoToGenerate={(clientName) => {
                        setProjectName(clientName);
                        setMainView("generate");
                        window.requestAnimationFrame(() => {
                          generateInputRef.current?.focus();
                          inputSectionRef.current?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                        });
                      }}
                      onGoToClientIntelligence={(clientName, context) => {
                        setClientIntelligencePresetClient(clientName);
                        setClientIntelligencePresetTab(
                          context.type === "overdue" ? "history" : "summary",
                        );
                        setClientIntelligencePresetHighlight(
                          context.type === "risks",
                        );
                        setMainView("client-intelligence");
                      }}
                      onGoToReports={() => {
                        setMainView("reports");
                      }}
                    />
                  </div>
                )}
                <OverviewHomeView
                  isTrialExpired={isExpiredTrial || soloGenerationLocked}
                  userFirstName={userFirstName}
                  dashStats={dashStats}
                  projects={projects}
                  campaigns={campaigns}
                  monthlyStats={monthlyStats}
                  monthlyStatsLoading={monthlyStatsLoading}
                  loading={!projectsBootstrapped}
                  attentionItems={overviewAttentionItems}
                  attentionLoading={overviewHealthLoading}
                  formatRelativeTime={relativeTimeLabel}
                  onSelectProject={(p) => {
                    handleSelectProject(p as ProjectItem);
                    setMainView("generate");
                  }}
                  onGoToGenerate={() => {
                    setMainView("generate");
                    window.requestAnimationFrame(() => {
                      generateInputRef.current?.focus();
                      generateInputRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                    });
                  }}
                  onGoToDelivery={() => {
                    if (hasProAccess && deliveryDashboardAccess !== "none") {
                      setMainView("delivery");
                    } else {
                      tryOpenProFeatureGate("Delivery Health Dashboard");
                    }
                  }}
                  onGoToDeliveryForClient={(clientName, reason, affectedItemNames) => {
                    setDeliveryHealthPresetClient(clientName);
                    setDeliveryHealthPresetReason(reason?.trim() ?? "");
                    setDeliveryHealthPresetAffectedItems(affectedItemNames ?? []);
                    if (hasProAccess && deliveryDashboardAccess !== "none") {
                      setMainView("delivery");
                    } else {
                      tryOpenProFeatureGate("Delivery Health Dashboard");
                    }
                  }}
                />
              </div>
            ) : null}
            {userEmail && mainView === "reports" ? (
              <div className="flex h-full min-h-0 flex-col animate-in fade-in duration-200">
                <div className="flex flex-shrink-0 items-center gap-6 border-b border-[var(--border)] px-6 py-4">
                  <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
                    Reports
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setReportsSubView("service-review")}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-all duration-150",
                        reportsSubView === "service-review"
                          ? "border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]"
                          : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                      )}
                    >
                      Service Review
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportsSubView("qbr")}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-all duration-150",
                        reportsSubView === "qbr"
                          ? "border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]"
                          : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                      )}
                    >
                      Quarterly Business Review
                      <span className="rounded-full bg-[var(--accent)]/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                        Beta
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 overflow-hidden">
                  {reportsSubView === "qbr" ? (
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                      <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--border)] px-6 py-4">
                        <div className="flex items-center gap-3">
                          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
                            Quarterly Business Review
                          </h2>
                          <span className="rounded-full bg-[var(--accent)]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--accent)]">
                            Beta
                          </span>
                        </div>
                      </div>

                      <div className="mx-6 mt-4 rounded-xl border border-[var(--accent)]/15 bg-[var(--accent)]/[0.04] p-4">
                        <p className="text-[12px] leading-relaxed text-[var(--text-secondary)]">
                          Generate a QBR pack from your Client Intelligence history. Includes account narrative, recurring
                          issues, open risks, key achievements, and strategic talking points.
                        </p>
                        <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-muted)]">
                          Beta: Financial data integration (budget tracking, time entries, invoice history) is on the
                          roadmap and will further enrich this output.
                        </p>
                      </div>

                      <div className="min-h-0 flex-1 overflow-visible p-6 md:overflow-y-auto">
                        <CiQbrBuilder
                          userId={authUserId ?? ""}
                          hasProAccess={hasProAccess}
                          defaultBrandName={
                            brandName.trim() || profileCompanyName.trim() || "Handover"
                          }
                          defaultBrandColor={brandColour || "#38bdf8"}
                          brandLogoUrl={brandLogoUrl.trim() || null}
                          onNavigateToCI={() => setMainView("client-intelligence")}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      {noPsaConnected && !demoModeActive ? (
                        <div className="flex flex-1 items-center justify-center p-8">
                          <PSAEmptyState
                            title="No PSA connected"
                            description="Connect your PSA to import tickets and generate reports."
                          />
                        </div>
                      ) : psaStatus.loading && !demoModeActive ? (
                        <div className="flex-1 space-y-4 p-6" aria-busy>
                          <div className="grid gap-3 sm:grid-cols-3">
                            {[0, 1, 2].map((i) => (
                              <div
                                key={i}
                                className="h-24 rounded-[var(--radius-lg)] border border-[var(--border)] bg-white/5 animate-pulse"
                              />
                            ))}
                          </div>
                          <div className="h-48 rounded-[var(--radius-lg)] border border-[var(--border)] bg-white/5 animate-pulse" />
                          <div className="h-12 w-40 rounded-[var(--radius)] bg-white/5 animate-pulse" />
                        </div>
                      ) : isExpiredTrial || soloGenerationLocked ? (
                        <div className="flex flex-1 items-center justify-center p-8">
                          <UpgradeWall message="Your trial has ended - QBR Builder requires an active plan." />
                        </div>
                      ) : (
                        <div className="min-h-0 flex-1 overflow-visible md:overflow-y-auto">
                          <div className="mx-auto w-full max-w-3xl p-6">
                            <QbrPackBuilder
                              embedded
                              demoMode={demoModeActive}
                              hasProAccess={hasProAccess}
                              defaultBrandName={
                                brandName.trim() ||
                                profileCompanyName.trim() ||
                                "Handover"
                              }
                              defaultBrandColor={brandColour || "#38bdf8"}
                              brandLogoUrl={brandLogoUrl.trim() || null}
                              usageHint={qbrUsageHint}
                              intelligenceContext={qbrIntelligenceContext}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : null}
            {userEmail && mainView === "client-intelligence" ? (
              <div
                key="client-intelligence"
                className="animate-in fade-in duration-200 flex h-full min-h-0 flex-col overflow-hidden"
              >
                {!isBillingGrowthOrAbove ? (
                  <div className="mx-4 mb-4 mt-4 flex items-center gap-3 rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-4 py-3 md:mx-6">
                    <span className="text-[12px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                      Handover feature
                    </span>
                    <span className="text-[12px] text-white/60">
                      Client Intelligence is included with Handover. You&apos;re viewing a demo.
                      Move to Handover to use it on your real client data.
                    </span>
                    <Link
                      href="/pricing"
                      className="ml-auto whitespace-nowrap text-[12px] font-medium text-[var(--accent)] hover:underline"
                    >
                      Move to Handover →
                    </Link>
                  </div>
                ) : null}
                <div className="min-h-0 flex-1">
                  <ClientIntelligenceView
                    userId={authUserId ?? ""}
                    userEmail={userEmail ?? null}
                    initialClientName={clientIntelligencePresetClient}
                    initialTab={clientIntelligencePresetTab ?? undefined}
                    initialHighlightRisks={clientIntelligencePresetHighlight}
                    demoMode={demoModeActive || !isBillingGrowthOrAbove}
                    onNavigateToGenerate={() => setMainView("generate")}
                    onGenerateQbr={(clientName, summary) => {
                      setMainView("reports");
                      setReportsSubView("service-review");
                      setQbrIntelligenceContext({
                        clientName,
                        accountNarrative: summary.account_narrative,
                        keyAchievements: summary.key_achievements,
                        openRisks: summary.open_risks,
                        qbrTalkingPoints: summary.qbr_talking_points,
                        relationshipHealth: summary.relationship_health,
                      });
                      toast({
                        message:
                          "Building your QBR pack using Account Intelligence data",
                        variant: "info",
                        durationMs: 4500,
                      });
                    }}
                  />
                </div>
              </div>
            ) : null}
            {(!userEmail || mainView === "generate") ? (
            userEmail && (soloGenerationLocked || isExpiredTrial) ? (
              <div className="mb-6 flex min-h-[320px] w-full flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-red-500/35 bg-red-600 px-6 py-10 text-center text-white shadow-lg">
                <p className="max-w-md text-lg font-semibold leading-snug">
                  Your workspace is read-only until you upgrade. You can still view reports you already generated.
                </p>
                <Link
                  href="/pricing"
                  className="inline-flex h-11 items-center justify-center rounded-[var(--radius)] bg-white px-6 text-sm font-semibold text-red-700 shadow hover:bg-red-50"
                >
                  View plans and upgrade
                </Link>
              </div>
            ) : (
            <>
            {userEmail && !result && !isGenerating && noPsaConnected && !demoModeActive ? (
              <div className="mb-3 rounded-[var(--radius)] border border-amber-500/35 border-l-4 bg-amber-500/10 px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="inline-flex items-center gap-2 text-[13px] text-amber-100">
                    <AlertTriangle className="size-4 shrink-0" />
                    Connect HaloPSA or ConnectWise to import live tickets and generate reports automatically.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 bg-amber-500 px-2.5 text-[11px] font-semibold text-white hover:bg-amber-400"
                    onClick={() => {
                      openIntegrationsInConfiguration();
                      setSettingsOpen(false);
                      setSidebarOpenMobile(false);
                    }}
                  >
                    Connect HaloPSA or ConnectWise →
                  </Button>
                </div>
              </div>
            ) : null}
            <div className={cn("relative w-full", result && "flex-shrink-0")}>
            <section
              ref={inputSectionRef}
              className={cn(
                "relative z-10 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--bg-primary)] shadow-[0_1px_3px_rgba(0,0,0,0.05)]",
                result && "flex-shrink-0",
                showGenerateEmptyLayout && "flex min-h-[75vh] flex-col",
                isGenerating &&
                  !(
                    userEmail &&
                    (mainView === "overview" ||
                      mainView === "changelog" ||
                      mainView === "configuration" ||
                      mainView === "scheduled" ||
                      mainView === "delivery" ||
                      mainView === "reports" ||
                      mainView === "organisation" ||
                      mainView === "client-intelligence" ||
                      mainView === "approvals")
                  ) &&
                  "flex min-h-[75vh] flex-col",
                !input.trim()
                  ? "border border-[var(--accent)]/15 shadow-[0_0_20px_rgba(14,165,233,0.06)]"
                  : "border border-[var(--accent)]/30 shadow-[0_0_25px_rgba(14,165,233,0.10)]",
              )}
            >
              {!(result && isInputCollapsed) && !showGenerateEmptyLayout && !isGenerating ? (
              <div
                className="flex flex-wrap items-center justify-end gap-2 border-b border-[var(--border)] bg-[var(--bg-secondary)] px-[14px] py-2.5"
                style={{ borderRadius: "var(--radius-lg) var(--radius-lg) 0 0" }}
              >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      void handleImportFile(file);
                      e.currentTarget.value = "";
                    }}
                  />
                  {noPsaConnected && userEmail && hasProAccess && psaConnections.multiple ? (
                    <details className="relative">
                      <summary
                        className={cn(
                          "inline-flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--bg-secondary)_65%,var(--bg-primary))]",
                          focusRing,
                        )}
                      >
                        <Database className="size-4 shrink-0" aria-hidden />
                        Import from PSA
                        <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden />
                      </summary>
                      <div className="absolute right-0 z-30 mt-1 min-w-[180px] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] p-1 shadow-lg">
                        <button
                          type="button"
                          className="block w-full rounded px-2 py-1.5 text-left text-[12px] hover:bg-[var(--bg-secondary)]"
                          onClick={() => setHaloImportOpen(true)}
                        >
                          HaloPSA
                        </button>
                        <button
                          type="button"
                          className="block w-full rounded px-2 py-1.5 text-left text-[12px] hover:bg-[var(--bg-secondary)]"
                          onClick={() => {
                            console.log("[import-psa] ConnectWise menu item click", {
                              cwConnected,
                              haloConnected,
                              primary: psaConnections.primary,
                              multiple: psaConnections.multiple,
                              settingCwImportOpen: true,
                            });
                            setCwImportOpen(true);
                          }}
                        >
                          ConnectWise
                        </button>
                      </div>
                    </details>
                  ) : noPsaConnected && userEmail && hasProAccess && psaConnections.primary ? (
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "h-9 gap-1.5 border-[var(--border)] bg-[var(--bg-primary)] px-3 text-[12px] font-medium text-[var(--text-secondary)] transition-all duration-[120ms] ease-in-out hover:bg-[color-mix(in_srgb,var(--bg-secondary)_65%,var(--bg-primary))]",
                        focusRing,
                      )}
                      onClick={() => {
                        if (psaConnections.primary === "halopsa") {
                          setHaloImportOpen(true);
                        } else {
                          console.log("[import-psa] single Import button → ConnectWise", {
                            cwConnected,
                            haloConnected,
                            primary: psaConnections.primary,
                            multiple: psaConnections.multiple,
                            settingCwImportOpen: true,
                          });
                          setCwImportOpen(true);
                        }
                      }}
                      title={
                        psaConnections.primary === "halopsa" && haloUrl
                          ? `Connected to ${haloUrl}`
                          : undefined
                      }
                    >
                      <Database className="size-4 shrink-0" aria-hidden />
                      {`Import from ${importPsaLabel}`}
                      <span className="ml-0.5 inline-block size-1.5 rounded-full bg-emerald-500" aria-hidden />
                    </Button>
                  ) : noPsaConnected && userEmail && hasProAccess && !psaConnections.primary ? (
                    demoModeActive ? (
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "h-9 gap-1.5 border-[var(--border)] bg-[var(--bg-primary)] px-3 text-[12px] font-medium text-[var(--text-secondary)] transition-all duration-[120ms] ease-in-out hover:bg-[color-mix(in_srgb,var(--bg-secondary)_65%,var(--bg-primary))]",
                          focusRing,
                        )}
                        onClick={() => setHaloImportOpen(true)}
                        title="Using demo data"
                      >
                        <Database className="size-4 shrink-0" aria-hidden />
                        Import demo data
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "h-9 gap-1.5 border-[var(--border)] bg-[var(--bg-primary)] px-3 text-[12px] font-medium text-[var(--text-muted)] transition-all duration-[120ms] ease-in-out",
                          focusRing,
                        )}
                        disabled
                        title="Connect a PSA in Integrations to import tickets"
                      >
                        <Database className="size-4 shrink-0" aria-hidden />
                        Import from PSA
                      </Button>
                    )
                  ) : noPsaConnected && userEmail && !hasProAccess ? (
                    <Button
                      type="button"
                      variant="outline"
                      title="Connect a PSA - included with Handover"
                      className={cn(
                        "h-9 gap-1.5 border-[var(--border)] bg-[var(--bg-primary)] px-3 text-[12px] font-medium text-[var(--text-secondary)] transition-all duration-[120ms] ease-in-out hover:bg-[color-mix(in_srgb,var(--bg-secondary)_65%,var(--bg-primary))]",
                        focusRing,
                      )}
                      onClick={() => setHaloProModalOpen(true)}
                    >
                      <Database className="size-4 shrink-0" aria-hidden />
                      <span>Import from PSA</span>
                      <span className="rounded-full bg-[var(--accent)] px-1.5 py-px text-[9px] font-semibold text-white">
                        Handover
                      </span>
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    title="Supported formats: CSV (.csv), Microsoft Excel (.xlsx, .xls), Word (.docx)."
                    className={cn(
                      "h-9 gap-1.5 border-[var(--border)] bg-[var(--bg-primary)] px-3 text-[12px] font-medium text-[var(--text-secondary)] transition-all duration-[120ms] ease-in-out hover:bg-[color-mix(in_srgb,var(--bg-secondary)_65%,var(--bg-primary))]",
                      focusRing,
                    )}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="size-4 shrink-0" aria-hidden />
                    Import file
                  </Button>
              </div>
              ) : null}

              <div
                className={cn(
                  showGenerateEmptyLayout || isGenerating
                    ? "flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-6"
                    : "space-y-3 p-[14px]",
                )}
              >
                {isGenerating &&
                !(userEmail &&
                  (mainView === "overview" ||
                    mainView === "changelog" ||
                    mainView === "configuration" ||
                    mainView === "scheduled" ||
                    mainView === "delivery" ||
                    mainView === "reports" ||
                    mainView === "organisation" ||
                    mainView === "client-intelligence" ||
                    mainView === "approvals")) ? (
                  <div className="flex flex-1 flex-col items-center justify-center py-6 md:py-10">
                    <p className="max-w-md text-center text-[length:var(--t-h4)] font-medium text-[var(--text-secondary)]">
                      {generationPhase === "compacting"
                        ? lastImportSourcePsa != null || lastImportedHaloItems.length > 0
                          ? "Reading your PSA data…"
                          : "Processing your notes…"
                        : genProgress < 40
                          ? "Analysing tickets and projects…"
                          : genProgress < 70
                            ? "Identifying actions and risks…"
                            : genProgress < 85
                              ? "Writing your report…"
                              : "Finalising outputs…"}
                    </p>
                    <p className="mt-2 text-center text-[length:var(--t-body-sm)] tabular-nums text-[var(--text-muted)]">
                      {Math.round(genProgress)}%
                    </p>
                    <div className="mt-5 h-1 w-full max-w-md overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[#7dd3fc] transition-all duration-300 ease-out"
                        style={{ width: `${genProgress}%` }}
                      />
                    </div>
                    <div className="mt-8 w-full max-w-2xl">
                      <ResultsSkeleton />
                    </div>
                  </div>
                ) : showGenerateEmptyLayout ? (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls,.docx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        void handleImportFile(file);
                        e.currentTarget.value = "";
                      }}
                    />
                    {!generateStartingDataLoaded ? (
                      <div className="animate-in fade-in duration-500 flex flex-1 flex-col items-center justify-center py-6 md:py-10">
                        <h2
                          className="mb-2 text-center font-semibold tracking-tight text-[var(--text-primary)]"
                          style={{ fontSize: "var(--t-h1)" }}
                        >
                          How would you like to start?
                        </h2>
                        <p className="animate-in fade-in duration-500 mx-auto mb-2 max-w-xl text-center text-[length:var(--t-body-sm)] text-[var(--text-secondary)]">
                          Connect your PSA, paste notes, or try a demo. It takes under a minute.
                        </p>
                        <div
                          data-tour="generate-chooser"
                          className="grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-3"
                        >
                          {!noPsaConnected ? (
                            bothPsasConnected ? (
                              <div className="flex flex-col rounded-xl border border-white/[0.06] bg-[var(--surface-1)] p-5 text-left [box-shadow:var(--shadow-sm),var(--shadow-inset)] md:p-6">
                                <div className="mb-4 flex items-center gap-2">
                                  <Database className="size-7 shrink-0 text-[var(--accent)]" aria-hidden />
                                  <span className="inline-block size-1.5 rounded-full bg-emerald-500" aria-hidden />
                                </div>
                                <p className="text-[length:var(--t-h4)] font-semibold text-[var(--text-primary)]">
                                  Import from PSA
                                </p>
                                <p className="mt-1.5 text-[length:var(--t-body-sm)] leading-relaxed text-[var(--text-secondary)]">
                                  Pull live tickets and projects automatically
                                </p>
                                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                                  <button
                                    type="button"
                                    className={cn(
                                      "flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-3 py-2 text-[12px] font-medium text-[var(--accent)] transition-all hover:bg-[var(--accent)]/20",
                                      focusRing,
                                    )}
                                    onClick={() => {
                                      if (!hasProAccess && !demoModeActive) {
                                        setHaloProModalOpen(true);
                                        return;
                                      }
                                      setHaloImportOpen(true);
                                    }}
                                  >
                                    HaloPSA
                                  </button>
                                  <button
                                    type="button"
                                    className={cn(
                                      "flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-3 py-2 text-[12px] font-medium text-[var(--accent)] transition-all hover:bg-[var(--accent)]/20",
                                      focusRing,
                                    )}
                                    onClick={() => {
                                      if (!hasProAccess && !demoModeActive) {
                                        setHaloProModalOpen(true);
                                        return;
                                      }
                                      setCwImportOpen(true);
                                    }}
                                  >
                                    ConnectWise
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className={cn(
                                  "flex flex-col rounded-xl border border-white/[0.06] bg-[var(--surface-1)] p-5 text-left transition-colors [box-shadow:var(--shadow-sm),var(--shadow-inset)] hover:border-[var(--accent)]/25 md:p-6",
                                  focusRing,
                                )}
                                onClick={onGeneratePsaImportCardClick}
                              >
                                <div className="mb-4 flex items-center gap-2">
                                  <Database className="size-7 shrink-0 text-[var(--accent)]" aria-hidden />
                                  <span className="inline-block size-1.5 rounded-full bg-emerald-500" aria-hidden />
                                </div>
                                <p className="text-[length:var(--t-h4)] font-semibold text-[var(--text-primary)]">
                                  {`Import from ${importPsaLabel}`}
                                </p>
                                <p className="mt-1.5 text-[length:var(--t-body-sm)] leading-relaxed text-[var(--text-secondary)]">
                                  Pull live tickets and projects automatically
                                </p>
                              </button>
                            )
                          ) : (
                            <button
                              type="button"
                              className={cn(
                                "flex flex-col rounded-xl border border-white/[0.06] bg-[var(--surface-1)] p-5 text-left transition-colors [box-shadow:var(--shadow-sm),var(--shadow-inset)] hover:border-[var(--accent)]/25 md:p-6",
                                focusRing,
                              )}
                              onClick={onGenerateConnectPsaCardClick}
                            >
                              <div className="relative mb-4 w-fit">
                                <Database className="size-7 shrink-0 text-[var(--accent)]" aria-hidden />
                                <Lock
                                  className="absolute -bottom-0.5 -right-1 size-3.5 rounded-full bg-[var(--surface-1)] text-[var(--text-secondary)]"
                                  aria-hidden
                                />
                              </div>
                              <p className="text-[length:var(--t-h4)] font-semibold text-[var(--text-primary)]">
                                Connect HaloPSA or ConnectWise
                              </p>
                              <p className="mt-1.5 text-[length:var(--t-body-sm)] leading-relaxed text-[var(--text-secondary)]">
                                Connect your PSA to import tickets automatically
                              </p>
                            </button>
                          )}
                          <button
                            type="button"
                            data-tour="generate-manual-card"
                            className={cn(
                              "flex flex-col rounded-xl border border-white/[0.06] bg-[var(--surface-1)] p-5 text-left transition-colors [box-shadow:var(--shadow-sm),var(--shadow-inset)] hover:border-[var(--accent)]/25 md:p-6",
                              focusRing,
                            )}
                            onClick={onGenerateManualStart}
                          >
                            <Pencil className="mb-4 size-7 shrink-0 text-[var(--accent)]" aria-hidden />
                            <p className="text-[length:var(--t-h4)] font-semibold text-[var(--text-primary)]">
                              Add manually
                            </p>
                            <p className="mt-1.5 text-[length:var(--t-body-sm)] leading-relaxed text-[var(--text-secondary)]">
                              Type or paste your own ticket notes
                            </p>
                          </button>
                          <button
                            type="button"
                            className={cn(
                              "flex flex-col rounded-xl border border-white/[0.06] bg-[var(--surface-1)] p-4 text-left transition-colors [box-shadow:var(--shadow-sm),var(--shadow-inset)] hover:border-[var(--accent)]/20 md:col-span-1 md:p-5",
                              focusRing,
                            )}
                            onClick={onGenerateDemoImportCardClick}
                          >
                            <Sparkles className="mb-3 size-6 shrink-0 text-[var(--text-muted)]" aria-hidden />
                            <p className="text-[length:var(--t-body)] font-medium text-[var(--text-secondary)]">
                              Try demo data
                            </p>
                            <p className="mt-1 text-[length:var(--t-caption)] leading-relaxed text-[var(--text-muted)]">
                              See Handover in action with sample data
                            </p>
                          </button>
                        </div>
                        <button
                          type="button"
                          className={cn(
                            "mt-6 text-[length:var(--t-caption)] font-medium text-[var(--text-muted)] underline-offset-2 transition-colors hover:text-[var(--accent)] hover:underline",
                            focusRing,
                          )}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          or import a file (CSV, Excel, Word) →
                        </button>
                        <div className="mt-8 w-full max-w-md border-b border-[var(--border)]/60 pb-1.5">
                          <Input
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="Project name (optional)"
                            disabled={isGenerating}
                            aria-label="Project name (optional)"
                            className={cn(
                              "h-8 rounded-none border-0 bg-transparent px-0 text-[length:var(--t-caption)] font-normal placeholder:text-[var(--text-muted)] focus-visible:ring-0",
                              focusRing,
                            )}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="animate-in fade-in duration-500 flex min-h-0 flex-1 flex-col gap-4">
                        {isInputCollapsed &&
                        (lastImportedHaloItems.length > 0 || input.length > 500) ? (
                          <>
                            <div className="rounded-xl border border-white/[0.06] bg-[var(--surface-1)] p-4 md:p-5 [box-shadow:var(--shadow-sm),var(--shadow-inset)]">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex min-w-0 flex-1 items-start gap-3">
                                  <ClipboardList
                                    className="mt-0.5 size-5 shrink-0 text-[var(--accent)]"
                                    aria-hidden
                                  />
                                  <div className="min-w-0">
                                    <p className="text-[length:var(--t-h4)] font-semibold text-[var(--text-primary)]">
                                      {lastImportedHaloItems.length > 0
                                        ? `${importPsaLabel} data imported`
                                        : "Long notes loaded"}
                                    </p>
                                    <p className="mt-1 text-[length:var(--t-body-sm)] text-[var(--text-secondary)]">
                                      {lastImportedHaloItems.length > 0
                                        ? `${lastImportedHaloItems.length} ${lastImportedHaloItems.length === 1 ? "item" : "items"}`
                                        : null}
                                      {lastImportedHaloItems.length > 0 &&
                                      lastImportedHaloItems[0]?.clientName?.trim()
                                        ? ` · ${lastImportedHaloItems[0].clientName.trim()}`
                                        : null}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className={cn("h-9 shrink-0 px-4 text-[13px] font-semibold", focusRing)}
                                  onClick={() => setIsInputCollapsed(false)}
                                >
                                  Edit
                                </Button>
                              </div>
                              {lastInputQuality ? (
                                lastInputQuality.score === 100 ? (
                                  <p className="mt-3 flex items-center gap-2 border-t border-[var(--border)] pt-3 text-[12px] font-medium text-green-400">
                                    ✓ Input quality: Excellent
                                    <InfoHoverTooltip
                                      text={INPUT_QUALITY_TOOLTIP_TEXT}
                                      ariaLabel="About input quality"
                                    />
                                  </p>
                                ) : (
                                  <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-3">
                                    <span
                                      className={cn(
                                        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                                        lastInputQuality.score >= 80
                                          ? "bg-green-500/15 text-green-400"
                                          : lastInputQuality.score >= 60
                                            ? "bg-amber-500/15 text-amber-400"
                                            : "bg-red-500/15 text-red-400",
                                      )}
                                    >
                                      Input quality: {lastInputQuality.score}/100
                                      <InfoHoverTooltip
                                        text={INPUT_QUALITY_TOOLTIP_TEXT}
                                        ariaLabel="About input quality"
                                      />
                                    </span>
                                    {lastInputQuality.reasons.length > 0 ? (
                                      <span className="min-w-0 flex-1 text-[12px] text-[var(--text-secondary)]">
                                        {lastInputQuality.reasons.join(" · ")}
                                      </span>
                                    ) : null}
                                  </div>
                                )
                              ) : null}
                            </div>
                            {lastImportedHaloItems.length > 0 ? (
                              <div className="animate-in fade-in duration-500 my-auto flex min-h-0 flex-1 flex-col items-center justify-center border-t border-b border-white/[0.04] px-2 py-4">
                                <p className="mb-3 text-[length:var(--t-caption)] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                                  What happens next
                                </p>
                                <div className="flex flex-wrap items-center justify-center gap-3">
                                  {generateSelectedOutputLabels.map((label) => (
                                    <span
                                      key={label}
                                      className="inline-flex items-center gap-1.5 text-[length:var(--t-body-sm)] text-[var(--text-secondary)]"
                                    >
                                      <Check className="size-3.5 shrink-0 text-[var(--accent)]" aria-hidden />
                                      {label}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <div className="relative flex min-h-0 flex-1 flex-col">
                            {generateManualExpanded ? (
                              <button
                                type="button"
                                className={cn(
                                  "mb-2 inline-flex items-center gap-1 self-start text-[length:var(--t-body-sm)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]",
                                  focusRing,
                                )}
                                onClick={() => resetGenerateToEmpty()}
                              >
                                <ChevronLeft className="size-3.5 shrink-0" aria-hidden />
                                Back
                              </button>
                            ) : null}
                            <Textarea
                              ref={generateInputRef}
                              value={input}
                              onChange={(e) => setInput(e.target.value)}
                              placeholder="Paste ticket notes, project updates, or meeting notes here. Then click Generate Outputs."
                              rows={16}
                              maxLength={GENERATION_INPUT_CHAR_LIMIT}
                              className={cn(
                                "min-h-[400px] flex-1 resize-y border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 pr-14 pb-8 text-[14px] placeholder:text-[var(--text-muted)] focus-visible:ring-1 focus-visible:ring-[var(--accent)]",
                                focusRing,
                              )}
                              disabled={isGenerating}
                              aria-label="Project notes input"
                              onKeyDown={(e) => {
                                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                                  e.preventDefault();
                                  void requestFullGeneration();
                                }
                              }}
                            />
                            <button
                              type="button"
                              className={cn(
                                "absolute top-3 right-3 cursor-pointer rounded p-1 text-[var(--text-secondary)] transition-colors hover:bg-white/10 hover:text-white",
                                input.trim().length > 0
                                  ? "opacity-100"
                                  : "pointer-events-none opacity-0",
                              )}
                              aria-label="Clear input"
                              onClick={() => resetGenerateToEmpty()}
                            >
                              <X className="size-3.5" aria-hidden />
                            </button>
                            <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-[var(--text-secondary)] tabular-nums">
                              {charCount.toLocaleString()} / {GENERATION_INPUT_CHAR_LIMIT.toLocaleString()}
                            </span>
                          </div>
                        )}
                        <div className="rounded-xl border border-white/[0.06] bg-[var(--surface-1)] p-3">
                          <label
                            htmlFor="generate-project-name"
                            className="mb-1.5 block text-[length:var(--t-label)] font-medium uppercase tracking-wide text-[var(--text-muted)]"
                          >
                            Project / Client
                          </label>
                          <Input
                            id="generate-project-name"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="Project name..."
                            disabled={isGenerating}
                            aria-label="Project name (optional)"
                            className={cn(
                              "h-auto rounded-none border-0 bg-transparent px-0 text-[length:var(--t-body-sm)] font-medium placeholder:text-[var(--text-muted)] focus-visible:ring-0",
                              focusRing,
                            )}
                          />
                        </div>
                        {importedFileName ? (
                          <p className="-mt-2 text-xs text-[var(--text-muted)]">
                            Imported:{" "}
                            <span className="font-medium text-[var(--text-secondary)]">{importedFileName}</span>
                            {importedFileTypeLabel ? (
                              <>
                                {" "}
                                <span className="text-[var(--text-muted)]">({importedFileTypeLabel})</span>
                              </>
                            ) : null}
                          </p>
                        ) : null}
                      </div>
                    )}
                    {showFirstGenOnboardingTip ? (
                      <div
                        className="flex flex-col gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2.5 text-[13px] sm:flex-row sm:items-start sm:justify-between sm:gap-3"
                        role="status"
                      >
                        <p className="text-[var(--text-secondary)]">
                          <span className="font-medium text-[var(--text-primary)]">Tip:</span> the more detail in your
                          notes, the better the output. Include ticket names, owner names, blockers, and any recent
                          updates for best results.
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 shrink-0 self-end text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)] sm:self-start"
                          onClick={() => {
                            try {
                              window.localStorage.setItem(LS_FIRST_GEN_TIP_DISMISSED, "true");
                            } catch {
                              /* ignore */
                            }
                            setFirstGenTipDismissed(true);
                          }}
                        >
                          Dismiss
                        </Button>
                      </div>
                    ) : null}
                    {showDemoDataBanner ? (
                      <DemoBanner
                        className={
                          lastInputQuality
                            ? "border border-amber-500/20 bg-transparent px-3 py-1.5"
                            : undefined
                        }
                        onConnectPSA={() => {
                          openIntegrationsInConfiguration();
                          setSettingsOpen(false);
                          setSidebarOpenMobile(false);
                        }}
                      />
                    ) : null}
                    {showPro75Warning ? (
                      <div className="flex items-start justify-between gap-3 rounded-[var(--radius)] border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-[13px] text-amber-100">
                        <p>You&apos;ve used {proMonthlyUsage} of your 200 monthly generations.</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 shrink-0 px-2 text-[11px] text-amber-200 hover:bg-amber-500/15 hover:text-amber-100"
                          onClick={dismissPro75Warning}
                        >
                          Dismiss
                        </Button>
                      </div>
                    ) : null}
                    {showPro90Warning ? (
                      <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-amber-500/45 bg-amber-500/12 px-3 py-2.5 text-[13px] text-amber-100 sm:flex-row sm:items-center sm:justify-between">
                        <p>
                          You&apos;re nearly out of generations this month. Move to Handover for the complete workspace.
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 shrink-0 bg-amber-500 px-2.5 text-[11px] font-semibold text-white hover:bg-amber-400"
                          onClick={() => void startCheckout(STRIPE_PRO_MONTHLY_PRICE_ID)}
                        >
                          Move to Handover
                        </Button>
                      </div>
                    ) : null}
                    {showPro100Warning ? (
                      <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-red-500/45 bg-red-500/12 px-3 py-2.5 text-[13px] text-red-100 sm:flex-row sm:items-center sm:justify-between">
                        <p>You&apos;ve reached your monthly limit. Move to Handover to continue generating.</p>
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 shrink-0 bg-red-500 px-2.5 text-[11px] font-semibold text-white hover:bg-red-400"
                          onClick={() => void startCheckout(STRIPE_PRO_MONTHLY_PRICE_ID)}
                        >
                          Move to Handover
                        </Button>
                      </div>
                    ) : null}
                    {privacyMode ? (
                      <div
                        className="flex items-center gap-1.5 rounded-[var(--radius)] border border-[rgba(56,189,248,0.2)] px-2.5 py-1.5 text-[11px] text-[var(--accent)]"
                        style={{ backgroundColor: "rgba(56,189,248,0.06)" }}
                      >
                        <Shield className="size-3.5 shrink-0" aria-hidden />
                        <span>Privacy mode on - generations are not saved to your history.</span>
                      </div>
                    ) : null}
                    {charCount > GENERATION_INPUT_WARN_CHARS && charCount < GENERATION_INPUT_CHAR_LIMIT ? (
                      <p className="text-[12px] text-[#BA7517]">
                        Large inputs may reduce output quality. Consider selecting fewer tickets.
                      </p>
                    ) : null}
                    {charCount >= GENERATION_INPUT_CHAR_LIMIT ? (
                      <p className="text-[12px] text-[#BA7517]">
                        Large input detected - content will be intelligently compacted before generation. You can still
                        generate.
                      </p>
                    ) : null}
                    {(generateStartingDataLoaded || generateHasInput || isGenerating) ? (
                    <div
                      className={cn(
                        "mt-auto flex flex-col gap-2 border-t border-[var(--border)] pt-4",
                        !generateStartingDataLoaded && "mt-6",
                      )}
                    >
                      <Button
                        id="handover-generate-outputs-btn"
                        type="button"
                        size="lg"
                        className={cn(
                          "w-full gap-2 rounded-[var(--radius)] bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] px-5 font-semibold text-[#0f172a] transition-all duration-[120ms] ease-in-out",
                          generateStartingDataLoaded ? "h-12 py-3 text-[14px]" : "py-2.5 text-[13px]",
                          generateButtonMuted &&
                            !(isGenerating || isCheckingAuthForGenerate) &&
                            "cursor-not-allowed opacity-50",
                          (isGenerating || isCheckingAuthForGenerate) && "opacity-80",
                          !generateButtonMuted &&
                            !(isGenerating || isCheckingAuthForGenerate) &&
                            "hover:brightness-110",
                          focusRing,
                        )}
                        disabled={isGenerating || isCheckingAuthForGenerate}
                        onClick={() => void requestFullGeneration()}
                      >
                        {isCheckingAuthForGenerate ? (
                          <>
                            <svg className="size-4 animate-spin" viewBox="0 0 24 24" aria-hidden>
                              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" fill="none" opacity="0.35" />
                              <path d="M22 12a10 10 0 0 1-10 10" stroke="white" strokeWidth="3" fill="none" />
                            </svg>
                            Checking…
                          </>
                        ) : isGenerating ? (
                          <>
                            <svg className="size-4 animate-spin" viewBox="0 0 24 24" aria-hidden>
                              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" fill="none" opacity="0.35" />
                              <path d="M22 12a10 10 0 0 1-10 10" stroke="white" strokeWidth="3" fill="none" />
                            </svg>
                            {generationProgressLabel}
                          </>
                        ) : (
                          <>
                            <LightningBoltIcon className="text-[#0f172a]" />
                            Generate Outputs
                          </>
                        )}
                      </Button>
                      <p className="hidden text-center text-[11px] text-[var(--text-muted)] md:block">
                        ⌘ + Enter to generate
                      </p>
                    </div>
                    ) : null}
                  </>
                ) : null}
                {!isGenerating && !showGenerateEmptyLayout && !(result && isInputCollapsed) ? (
                <>
                {templates.length > 0 ? (
                  <div className="grid gap-2">
                    <label className="text-xs text-muted-foreground">My templates</label>
                    <select
                      className={cn(
                        "h-9 rounded-[var(--radius)] border border-input bg-background px-3 text-sm transition-all duration-[120ms] ease-in-out",
                        focusRing,
                      )}
                      defaultValue=""
                      onChange={(e) => {
                        const id = e.target.value;
                        if (!id) return;
                        const t = templates.find((tpl) => tpl.id === id);
                        if (t) setTemplatePreview(t);
                        e.currentTarget.value = "";
                      }}
                    >
                      <option value="">Select a template...</option>
                      <optgroup label="Email templates">
                        {templates
                          .filter((t) => t.template_type === "email")
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="Report templates">
                        {templates
                          .filter((t) => t.template_type === "report")
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                      </optgroup>
                    </select>
                    {nextTemplateContext ? (
                      <p className="text-xs text-muted-foreground">
                        Template context queued for next generation.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-secondary)_60%,transparent)] px-3 py-2.5">
                    <p className="text-[11px] leading-snug text-[var(--text-muted)]">
                      <span className="font-medium text-[var(--text-secondary)]">Try a template:</span> after you
                      generate, use{" "}
                      <span className="text-[var(--text-secondary)]">Save as template</span> on any output tab, then
                      pick it here for your next run.
                    </p>
                    {result ? (
                      <button
                        type="button"
                        className={cn(
                          "mt-2 text-[11px] font-medium text-[var(--accent)] underline-offset-2 hover:underline",
                          focusRing,
                        )}
                        onClick={() => {
                          const coreVis = visibleCoreTabsForResult(result);
                          const pick =
                            coreVis.includes("client_email")
                              ? "client_email"
                              : coreVis.includes("summary")
                                ? "summary"
                                : coreVis[0];
                          if (pick) setOutputMainTab(pick);
                          window.requestAnimationFrame(() => {
                            outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                          });
                          setTemplateSaveCtaHighlight(true);
                        }}
                      >
                        Show in outputs →
                      </button>
                    ) : null}
                  </div>
                )}

                <div className="border-b border-[var(--border)] pb-2.5">
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Project name..."
                    disabled={isGenerating}
                    aria-label="Project name (optional)"
                    className={cn(
                      "h-auto rounded-none border-0 bg-transparent px-0 text-[14px] font-medium placeholder:text-[var(--text-muted)] focus-visible:ring-0",
                      focusRing,
                    )}
                  />
                </div>
                {importedFileName ? (
                  <p className="-mt-1 text-xs text-[var(--text-muted)]">
                    Imported:{" "}
                    <span className="font-medium text-[var(--text-secondary)]">{importedFileName}</span>
                    {importedFileTypeLabel ? (
                      <>
                        {" "}
                        <span className="text-[var(--text-muted)]">({importedFileTypeLabel})</span>
                      </>
                    ) : null}
                  </p>
                ) : null}
                {showFirstGenOnboardingTip ? (
                  <div
                    className="flex flex-col gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2.5 text-[13px] sm:flex-row sm:items-start sm:justify-between sm:gap-3"
                    role="status"
                  >
                    <p className="text-[var(--text-secondary)]">
                      <span className="font-medium text-[var(--text-primary)]">Tip:</span> the more detail in your
                      notes, the better the output. Include ticket names, owner names, blockers, and any recent
                      updates for best results.
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 shrink-0 self-end text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)] sm:self-start"
                      onClick={() => {
                        try {
                          window.localStorage.setItem(LS_FIRST_GEN_TIP_DISMISSED, "true");
                        } catch {
                          /* ignore */
                        }
                        setFirstGenTipDismissed(true);
                      }}
                    >
                      Dismiss
                    </Button>
                  </div>
                ) : null}
                {showPro75Warning ? (
                  <div className="flex items-start justify-between gap-3 rounded-[var(--radius)] border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-[13px] text-amber-100">
                    <p>You&apos;ve used {proMonthlyUsage} of your 200 monthly generations.</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 shrink-0 px-2 text-[11px] text-amber-200 hover:bg-amber-500/15 hover:text-amber-100"
                      onClick={dismissPro75Warning}
                    >
                      Dismiss
                    </Button>
                  </div>
                ) : null}
                {showPro90Warning ? (
                  <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-amber-500/45 bg-amber-500/12 px-3 py-2.5 text-[13px] text-amber-100 sm:flex-row sm:items-center sm:justify-between">
                    <p>
                      You&apos;re nearly out of generations this month. Move to Handover for the complete workspace.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 shrink-0 bg-amber-500 px-2.5 text-[11px] font-semibold text-white hover:bg-amber-400"
                      onClick={() => void startCheckout(STRIPE_PRO_MONTHLY_PRICE_ID)}
                    >
                      Move to Handover
                    </Button>
                  </div>
                ) : null}
                {showPro100Warning ? (
                  <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-red-500/45 bg-red-500/12 px-3 py-2.5 text-[13px] text-red-100 sm:flex-row sm:items-center sm:justify-between">
                    <p>You&apos;ve reached your monthly limit. Move to Handover to continue generating.</p>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 shrink-0 bg-red-500 px-2.5 text-[11px] font-semibold text-white hover:bg-red-400"
                      onClick={() => void startCheckout(STRIPE_PRO_MONTHLY_PRICE_ID)}
                    >
                      Move to Handover
                    </Button>
                  </div>
                ) : null}
                {showProTeamRecommendation ? (
                  <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-[13px] text-amber-100 sm:flex-row sm:items-center sm:justify-between">
                    <p>
                      You're close to your monthly limit. Handover removes it.
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 shrink-0 px-2 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/15 hover:text-amber-100"
                      onClick={() => {
                        setShowProTeamRecommendation(false);
                        void startCheckout(STRIPE_PRO_MONTHLY_PRICE_ID);
                      }}
                    >
                      See Handover
                    </Button>
                  </div>
                ) : null}
                {showDemoDataBanner ? (
                  <DemoBanner
                    onConnectPSA={() => {
                      openIntegrationsInConfiguration();
                      setSettingsOpen(false);
                      setSidebarOpenMobile(false);
                    }}
                  />
                ) : null}
                {privacyMode ? (
                  <div
                    className="flex items-center gap-1.5 rounded-[var(--radius)] border border-[rgba(56,189,248,0.2)] px-2.5 py-1.5 text-[11px] text-[var(--accent)]"
                    style={{ backgroundColor: "rgba(56,189,248,0.06)" }}
                  >
                    <Shield className="size-3.5 shrink-0" aria-hidden />
                    <span>Privacy mode on - generations are not saved to your history.</span>
                  </div>
                ) : null}
                </>
                ) : null}
                {!isGenerating &&
                !showGenerateEmptyLayout &&
                (isInputCollapsed &&
                (result ||
                  isGenerating ||
                  lastImportedHaloItems.length > 0 ||
                  input.length > 500) ? (
                  <div
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-secondary)_70%,var(--bg-primary))] px-3",
                      result ? "h-11 py-1" : "h-14 py-2",
                    )}
                  >
                    <div
                      className={cn(
                        "flex min-w-0 flex-1 items-center gap-2 text-[var(--text-primary)]",
                        result ? "text-[12px]" : "text-[13px]",
                      )}
                    >
                      <ClipboardList
                        className={cn("shrink-0 text-[var(--accent)]", result ? "size-3.5" : "size-4")}
                        aria-hidden
                      />
                      <span className="min-w-0 truncate">
                        {lastImportedHaloItems.length > 0
                          ? `${importPsaLabel} data imported - ${lastImportedHaloItems.length} ${lastImportedHaloItems.length === 1 ? "item" : "items"}`
                          : "Long notes loaded"}{" "}
                        {lastImportedHaloItems.length > 0 && lastImportedHaloItems[0]?.clientName?.trim()
                          ? `· ${lastImportedHaloItems[0].clientName.trim()}`
                          : null}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {result ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn(
                            "h-8 shrink-0 gap-1.5 border-[var(--border)] px-3 text-[13px] font-semibold",
                            focusRing,
                          )}
                          onClick={() => handleNewGeneration()}
                        >
                          <Plus className="size-3.5 shrink-0" aria-hidden />
                          New generation
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={cn("h-8 shrink-0 px-3", focusRing)}
                        onClick={() => setIsInputCollapsed(false)}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {result ? (
                      <div className="mb-2 flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "h-9 shrink-0 gap-1.5 border-[var(--border)] px-3 text-[13px] font-semibold",
                            focusRing,
                          )}
                          onClick={() => handleNewGeneration()}
                        >
                          <Plus className="size-3.5 shrink-0" aria-hidden />
                          New generation
                        </Button>
                      </div>
                    ) : null}
                    {!result && !isGenerating && !input.trim() ? (
                      <div className="mb-3 flex items-start gap-3 rounded-xl border border-[var(--accent)]/15 bg-[var(--accent)]/[0.04] px-4 py-3">
                        <div className="mt-0.5 flex size-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/20 text-[10px] font-bold text-[var(--accent)]">
                          1
                        </div>
                        <div className="flex-1">
                          <p className="text-[12px] font-medium text-white/70">
                            Import your PSA data or paste notes
                          </p>
                          <p className="mt-0.5 text-[11px] text-white/40">
                            Use the HaloPSA or ConnectWise import buttons above, or paste ticket notes directly into the
                            box below. Then click Generate.
                          </p>
                        </div>
                      </div>
                    ) : null}
                  <div className="relative">
                    <Textarea
                      ref={generateInputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Import your PSA tickets using the buttons above, or paste notes directly. Then select your output types and generate."
                      rows={6}
                      maxLength={GENERATION_INPUT_CHAR_LIMIT}
                      className={cn(
                        "resize-y border-0 bg-transparent px-0 py-1 pr-14 pb-7 text-[14px] placeholder:text-[var(--text-muted)] focus-visible:ring-0",
                        "min-h-[200px]",
                        focusRing,
                      )}
                      disabled={isGenerating}
                      aria-label="Project notes input"
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                          e.preventDefault();
                          void requestFullGeneration();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className={cn(
                        "absolute top-2 right-2 cursor-pointer rounded p-1 text-[var(--text-secondary)] transition-colors hover:bg-white/10 hover:text-white",
                        input.trim().length > 0
                          ? "opacity-100"
                          : "pointer-events-none opacity-0",
                      )}
                      aria-label="Clear input"
                      onClick={() => resetGenerateToEmpty()}
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>
                    <span className="pointer-events-none absolute bottom-1.5 right-0 text-[11px] text-[var(--text-secondary)] tabular-nums">
                      {charCount.toLocaleString()} / {GENERATION_INPUT_CHAR_LIMIT.toLocaleString()}
                    </span>
                  </div>
                  </>
                ))}
                {!isGenerating && !showGenerateEmptyLayout && !(result && isInputCollapsed) ? (
                <>
                {charCount > GENERATION_INPUT_WARN_CHARS && charCount < GENERATION_INPUT_CHAR_LIMIT ? (
                  <p className="text-[12px] text-[#BA7517]">
                    Large inputs may reduce output quality. Consider selecting fewer tickets.
                  </p>
                ) : null}
                {charCount >= GENERATION_INPUT_CHAR_LIMIT ? (
                  <p className="text-[12px] text-[#BA7517]">
                    Large input detected - content will be intelligently compacted before generation. You can still
                    generate.
                  </p>
                ) : null}
                <div className="mt-1 flex flex-col gap-2 border-t border-[var(--border)] pt-3">
                  <Button
                    type="button"
                    size="lg"
                    className={cn(
                      "w-full gap-2 rounded-[var(--radius)] bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] px-5 py-2.5 text-[13px] font-semibold text-[#0f172a] transition-all duration-[120ms] ease-in-out",
                      generateButtonMuted &&
                        !(isGenerating || isCheckingAuthForGenerate) &&
                        "cursor-not-allowed opacity-50",
                      (isGenerating || isCheckingAuthForGenerate) && "opacity-80",
                      !generateButtonMuted &&
                        !(isGenerating || isCheckingAuthForGenerate) &&
                        "hover:brightness-110",
                      focusRing,
                    )}
                    disabled={isGenerating || isCheckingAuthForGenerate}
                    onClick={() => void requestFullGeneration()}
                  >
                    {isCheckingAuthForGenerate ? (
                      <>
                        <svg className="size-4 animate-spin" viewBox="0 0 24 24" aria-hidden>
                          <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" fill="none" opacity="0.35" />
                          <path d="M22 12a10 10 0 0 1-10 10" stroke="white" strokeWidth="3" fill="none" />
                        </svg>
                        Checking…
                      </>
                    ) : isGenerating ? (
                      <>
                        <svg className="size-4 animate-spin" viewBox="0 0 24 24" aria-hidden>
                          <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" fill="none" opacity="0.35" />
                          <path d="M22 12a10 10 0 0 1-10 10" stroke="white" strokeWidth="3" fill="none" />
                        </svg>
                        {generationProgressLabel}
                      </>
                    ) : (
                      <>
                        <LightningBoltIcon className="text-[#0f172a]" />
                        Generate Outputs
                      </>
                    )}
                  </Button>
                  <p className="hidden text-center text-[11px] text-[var(--text-muted)] md:block">
                    ⌘ + Enter to generate
                  </p>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
                  <Shield className="size-3.5 shrink-0" aria-hidden />
                  <span>
                    Your data is sent to OpenAI for processing only and is never stored or used for
                    training.{" "}
                    <Link href="/privacy" className="hover:underline">
                      Privacy policy →
                    </Link>
                  </span>
                </div>
                {Boolean(userEmail) &&
                !hasProAccess &&
                monthCount !== null &&
                freeGenUsage ? (
                  <div
                    className="mt-3 rounded-[var(--radius)] px-[14px] py-[10px]"
                    style={{
                      background: "rgba(56,189,248,0.04)",
                      border: "1px solid rgba(56,189,248,0.12)",
                    }}
                  >
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-[var(--text-secondary)]">
                        {monthCount} generations used this month
                      </span>
                    </div>
                    <div
                      className="mt-[6px] h-1 overflow-hidden rounded-full"
                      style={{ background: "var(--bg-secondary)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (Math.min(freeGenUsage.cap, monthCount) / freeGenUsage.cap) * 100)}%`,
                          background: "var(--accent)",
                        }}
                      />
                    </div>
                    <div className="mt-[6px] flex items-center justify-between text-[11px]">
                      <span className="text-[var(--text-muted)]">
                        Resets{" "}
                        {new Date(
                          new Date().getFullYear(),
                          new Date().getMonth() + 1,
                          1,
                        ).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <button
                        type="button"
                        className="text-[var(--accent)]"
                        onClick={() => setHeaderUpgradeOpen(true)}
                      >
                        Upgrade for unlimited →
                      </button>
                    </div>
                  </div>
                ) : null}
                {error ? (
                  <div
                    className="rounded-[var(--radius)] border px-3 py-3"
                    style={{
                      borderColor: "rgba(239,68,68,0.35)",
                      backgroundColor: "rgba(239,68,68,0.08)",
                    }}
                    role="alert"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-[var(--danger)]">⚠</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--danger)]">
                          Generation failed
                        </p>
                        <p className="text-sm text-[var(--danger)]/90">
                          This is usually a temporary issue - your input has been saved. Try again
                          and it should work.
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() => void requestFullGeneration()}
                        >
                          Retry
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
                </>
                ) : null}
              </div>
          </section>
            </div>
            </>
            )
            ) : null}
          </>
        )
        )}

        {!isGenerating &&
        result &&
        !(userEmail &&
          (mainView === "overview" ||
            mainView === "changelog" ||
            mainView === "configuration" ||
            mainView === "scheduled" ||
            mainView === "delivery" ||
            mainView === "reports" ||
            mainView === "organisation" ||
            mainView === "client-intelligence" ||
            mainView === "approvals")) ? (
          <div
            ref={outputRef}
            className={cn(
              signedOutCompactMode ? "mt-0 animate-in fade-in duration-500" : "mt-8 animate-in fade-in duration-500",
              "relative flex flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] pt-2 pb-3",
              userEmail &&
                result &&
                mainView === "generate" &&
                "mt-2 min-h-0 flex-1 overflow-hidden",
              signedOutCompactMode &&
                result &&
                "mt-0 min-h-0 flex-1 overflow-hidden",
              "shadow-[0_0_0_1px_color-mix(in_srgb,var(--border)_40%,transparent),0_0_60px_-10px_color-mix(in_srgb,var(--accent)_25%,transparent)]",
              "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:z-[1] before:h-px before:bg-gradient-to-r before:from-transparent before:via-[color-mix(in_srgb,var(--accent)_48%,transparent)] before:to-transparent before:opacity-[0.85]",
            )}
          >
            {signedOutCompactMode ? (
              <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-[var(--text-secondary)]">
                    {signedOutInputPreview}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-[var(--radius)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                    onClick={() => {
                      setInput(signedOutInputSnapshot);
                      setResult(null);
                      setIsInputCollapsed(false);
                      setShowSignUpBanner(false);
                      setIsEditingSignedOutInput(true);
                      setExportLockedPromptOpen(false);
                      setExportMenuOpen(false);
                      setExportSubPanel(null);
                    }}
                  >
                    Edit input
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 rounded-[var(--radius)] bg-[var(--accent)] px-4 text-[13px] font-semibold text-white hover:bg-[var(--accent-hover)]"
                    disabled={isGenerating || isCheckingAuthForGenerate || !input.trim()}
                    onClick={() => {
                      setIsEditingSignedOutInput(false);
                      setExportLockedPromptOpen(false);
                      void requestFullGeneration();
                    }}
                  >
                    <LightningBoltIcon className="text-white" />
                    Generate again
                  </Button>
                </div>
              </div>
            ) : null}
            {userEmail && result && lastSessionRestoreBannerProject ? (
              <div
                className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] border-l-2 border-l-[var(--accent)] bg-[color-mix(in_srgb,var(--bg-secondary)_55%,var(--bg-primary))] px-3 py-2"
                role="status"
              >
                <p className="min-w-0 text-[12px] text-[var(--text-secondary)]">
                  Showing your last report  - {" "}
                  <span className="font-semibold text-[var(--text-primary)]">
                    {(
                      lastSessionRestoreBannerProject.project_name ||
                      lastSessionRestoreBannerProject.title ||
                      "Untitled"
                    )
                      .trim()
                      .slice(0, 200) || "Untitled"}
                  </span>
                  {" · "}
                  <span className="text-[var(--text-muted)]">
                    {formatShortRelativeTime(lastSessionRestoreBannerProject.created_at)}
                  </span>
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    className={cn(
                      "text-[12px] font-medium text-[var(--accent)] underline-offset-2 hover:underline",
                      focusRing,
                    )}
                    onClick={() => {
                      setLastSessionRestoreBannerProject(null);
                      handleNewGeneration();
                      window.requestAnimationFrame(() => generateInputRef.current?.focus());
                    }}
                  >
                    New generation →
                  </button>
                  <button
                    type="button"
                    className="rounded-[var(--radius)] p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                    aria-label="Dismiss"
                    onClick={() => setLastSessionRestoreBannerProject(null)}
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
            ) : null}
            <div className="flex-shrink-0">
            {userEmail && (result || lastInputQuality) ? (
              <div className="mb-4 shrink-0 px-3 pt-1">
                {result ? (
                  <p className="mb-2 text-[12px] font-medium tracking-normal text-[var(--text-secondary)]">
                    Send or save your report
                  </p>
                ) : null}
                <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)]">
                  {result ? (
                  <div className="flex flex-wrap gap-2 p-3">
                    <button
                      type="button"
                      disabled={followUpLoading || isGenerating}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[12px] font-semibold text-[#0f172a] transition-all hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50",
                        focusRing,
                      )}
                      onClick={onQuickEmailClient}
                    >
                      <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      Email client
                    </button>
                    <button
                      type="button"
                      disabled={followUpLoading || isGenerating}
                      className={cn(
                        "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-1.5 text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--bg-secondary)_70%,var(--bg-primary))] disabled:cursor-not-allowed disabled:opacity-50",
                        focusRing,
                      )}
                      onClick={onQuickPushToPsa}
                    >
                      {pushQuickActionSuccess ? (
                        <CheckCircle className="h-3.5 w-3.5 shrink-0 text-green-500" aria-hidden />
                      ) : (
                        <Upload className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      )}
                      Push to PSA
                    </button>
                    <button
                      type="button"
                      disabled={followUpLoading || isGenerating}
                      className={cn(
                        "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-1.5 text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--bg-secondary)_70%,var(--bg-primary))] disabled:cursor-not-allowed disabled:opacity-50",
                        focusRing,
                      )}
                      onClick={onQuickExportExcel}
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      Export Excel
                    </button>
                    <button
                      type="button"
                      disabled={followUpLoading || isGenerating}
                      className={cn(
                        "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-1.5 text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--bg-secondary)_70%,var(--bg-primary))] disabled:cursor-not-allowed disabled:opacity-50",
                        focusRing,
                      )}
                      onClick={openScheduleEditorFromGeneration}
                    >
                      <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      Schedule this
                    </button>
                    {result.actions && result.actions.length > 0 ? (
                      <button
                        type="button"
                        disabled={followUpLoading || isGenerating}
                        className={cn(
                          "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-1.5 text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--bg-secondary)_70%,var(--bg-primary))] disabled:cursor-not-allowed disabled:opacity-50",
                          focusRing,
                        )}
                        onClick={() => onFollowUpEmailClick()}
                      >
                        {followUpLoading ? (
                          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                        ) : (
                          <CornerDownLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        )}
                        {followUpLoading ? "Generating..." : "Follow up email"}
                      </button>
                    ) : null}
                    {smartActionsEligible ? (
                      <button
                        type="button"
                        onClick={() => setSmartActionsOpen(true)}
                        className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-transparent px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] transition-all duration-150 hover:border-[var(--accent)]/30 hover:text-[var(--accent)]"
                      >
                        <Zap className="size-3.5" />
                        Smart Actions
                      </button>
                    ) : null}
                  </div>
                  ) : null}
                  {lastInputQuality && !result ? (
                    lastInputQuality.score === 100 ? (
                      <p className="flex items-center gap-3 border-t border-[var(--border)] px-4 py-2 text-[11px] font-medium text-green-400">
                        ✓ Input quality: Excellent
                        <InfoHoverTooltip
                          text={INPUT_QUALITY_TOOLTIP_TEXT}
                          ariaLabel="About input quality"
                        />
                      </p>
                    ) : (
                      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border)] px-4 py-2">
                        <span
                          className={cn(
                            "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                            lastInputQuality.score >= 80
                              ? "bg-green-500/15 text-green-400"
                              : lastInputQuality.score >= 60
                                ? "bg-amber-500/15 text-amber-400"
                                : "bg-red-500/15 text-red-400",
                          )}
                        >
                          Input quality: {lastInputQuality.score}/100
                          <InfoHoverTooltip
                            text={INPUT_QUALITY_TOOLTIP_TEXT}
                            ariaLabel="About input quality"
                          />
                        </span>
                        {lastInputQuality.reasons.length > 0 ? (
                          <span className="min-w-0 flex-1 text-[11px] text-[var(--text-secondary)]">
                            {lastInputQuality.reasons.join(" · ")}
                          </span>
                        ) : null}
                      </div>
                    )
                  ) : null}
                  {reportQuality ? (
                    reportQuality.score === 100 ? (
                      <p
                        data-tour="report-quality-badge"
                        className="flex items-center gap-3 border-t border-[var(--border)] px-4 py-2 text-[11px] font-medium text-green-400"
                      >
                        ✓ Report quality: Excellent
                        <InfoHoverTooltip
                          text={REPORT_QUALITY_TOOLTIP_TEXT}
                          ariaLabel="About report quality"
                        />
                      </p>
                    ) : (
                      <>
                        <div
                          data-tour="report-quality-badge"
                          className="flex flex-wrap items-center gap-3 border-t border-[var(--border)] px-4 py-2"
                        >
                          <span
                            className={cn(
                              "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                              reportQuality.score >= 80
                                ? "bg-green-500/15 text-green-400"
                                : reportQuality.score >= 60
                                  ? "bg-amber-500/15 text-amber-400"
                                  : "bg-red-500/15 text-red-400",
                            )}
                          >
                            Quality: {reportQuality.score}/100
                            <InfoHoverTooltip
                              text={REPORT_QUALITY_TOOLTIP_TEXT}
                              ariaLabel="About report quality"
                            />
                          </span>
                          {reportQuality.issues.length > 0 ? (
                            <span className="min-w-0 flex-1 text-[11px] text-[var(--text-secondary)]">
                              {reportQuality.issues.join(" · ")}
                            </span>
                          ) : null}
                          <button
                            type="button"
                            className="shrink-0 cursor-pointer text-[11px] text-[var(--accent)] hover:underline"
                            onClick={() => setReportQualityTipsOpen((v) => !v)}
                          >
                            How to improve →
                          </button>
                        </div>
                        {reportQualityTipsOpen && reportQuality.issues.length > 0 ? (
                          <ul className="list-disc space-y-1 border-t border-[var(--border)] px-4 py-2 pl-8 text-[11px] text-[var(--text-secondary)]">
                            {qualityImprovementTips(reportQuality.issues).map((tip, i) => (
                              <li key={i}>{tip}</li>
                            ))}
                          </ul>
                        ) : null}
                      </>
                    )
                  ) : null}
                </div>
              </div>
            ) : null}
            {showTimeSaved && lastGenDurationMs ? (
              <div className="animate-in fade-in slide-in-from-top-2 duration-500 mx-4 mt-3 flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/[0.06] px-4 py-2.5">
                <div className="size-1.5 flex-shrink-0 rounded-full bg-green-400" />
                <p className="text-[12px] text-green-300/90">
                  Generated in {(lastGenDurationMs / 1000).toFixed(0)}s. Manual
                  equivalent: roughly{" "}
                  {Math.max(
                    1,
                    Math.round(
                      (result?.actions?.length ?? 5) * 0.4 +
                        (result?.risks?.length ?? 3) * 0.3 +
                        1.5,
                    ),
                  )}
                  h of PM time.
                </p>
                <button
                  type="button"
                  onClick={() => setShowTimeSaved(false)}
                  className="ml-auto text-[11px] text-green-400/50 transition-colors hover:text-green-400/80"
                >
                  ✕
                </button>
              </div>
            ) : null}
            </div>
            <Tabs
              data-tour="output-tabs-region"
              value={outputMainTab}
              onValueChange={setOutputMainTab}
              className={cn(
                "flex w-full flex-col gap-0",
                userEmail &&
                  result &&
                  mainView === "generate" &&
                  "min-h-0 flex-1 overflow-hidden",
                signedOutCompactMode && result && "min-h-0 flex-1 overflow-hidden",
              )}
            >
            <div className="shrink-0 border-b border-[var(--border)] bg-[var(--bg-primary)] px-3 pt-2 md:hidden">
              <label htmlFor="output-main-tab-select" className="sr-only">
                Output section
              </label>
              <select
                id="output-main-tab-select"
                className={cn(
                  "h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 text-[13px] text-[var(--text-primary)]",
                  focusRing,
                )}
                value={outputMainTab}
                onChange={(e) => setOutputMainTab(e.target.value)}
              >
                {visibleCoreTabsList.map((key) => (
                  <option key={key} value={key}>
                    {key === "client_email"
                      ? `✉ ${clientEmailTabDisplay.label}`
                      : OUTPUT_TAB_TRIGGER_LABELS[key]}
                  </option>
                ))}
                {outputTabStripExtendedKeys.map((key) => (
                  <option key={key} value={key}>
                    {EXTENDED_PM_TAB_LABELS[key]}
                  </option>
                ))}
                {hasPreviousReport ? (
                  <option value="compare">What changed</option>
                ) : null}
              </select>
            </div>
            <div className="relative hidden shrink-0 items-stretch border-b border-[var(--border)] bg-[var(--bg-primary)] md:flex">
              <button
                type="button"
                aria-label="Scroll tabs left"
                className={cn(
                  "flex w-8 shrink-0 items-center justify-center border-r border-[var(--border)] text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]",
                  !outputTabScrollEdges.left && "pointer-events-none opacity-0",
                  focusRing,
                )}
                onClick={() =>
                  outputTabScrollRef.current?.scrollBy({ left: -200, behavior: "smooth" })
                }
              >
                <ChevronLeft className="size-5" aria-hidden />
              </button>
              <div className="relative min-w-0 flex-1">
                <div
                  ref={outputTabScrollRef}
                  className="relative flex min-h-0 min-w-0 overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                >
                  <div
                    className={cn(
                      "pointer-events-none absolute left-0 top-0 z-[1] h-full w-10 bg-gradient-to-r from-[var(--bg-primary)] to-transparent transition-opacity duration-150",
                      outputTabScrollEdges.left ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden
                  />
                  <div
                    className={cn(
                      "pointer-events-none absolute right-0 top-0 z-[1] h-full w-12 bg-gradient-to-l from-[var(--bg-primary)] to-transparent transition-opacity duration-150",
                      outputTabScrollEdges.right ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden
                  />
                  <TabsList
                    variant="line"
                    className="relative z-0 flex !h-auto w-max min-w-0 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-500 flex-nowrap items-end gap-4 rounded-none border-0 bg-transparent p-0 px-3 pt-2 shadow-none"
                  >
                    {visibleCoreTabsList.map((key) => (
                      <TabsTrigger
                        key={key}
                        value={key}
                        data-tour={`output-tab-${key}`}
                        className={cn(
                          "inline-flex items-center",
                          OUTPUT_SEGMENT_TRIGGER_CLASS,
                          focusRing,
                        )}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {key === "client_email" ? (
                            <Mail
                              className="size-3.5 shrink-0 text-[var(--text-muted)]"
                              aria-hidden
                            />
                          ) : null}
                          {key === "client_email"
                            ? clientEmailTabDisplay.label
                            : OUTPUT_TAB_TRIGGER_LABELS[key]}
                          {key === "client_email" && clientEmailTabDisplay.showInternalBadge ? (
                            <span className="inline-flex items-center rounded-md border border-amber-500/35 bg-amber-500/15 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300">
                              Internal
                            </span>
                          ) : null}
                        </span>
                      </TabsTrigger>
                    ))}
                    {outputTabStripExtendedKeys.map((key) => (
                      <TabsTrigger
                        key={key}
                        value={key}
                        className={cn(
                          "inline-flex items-center",
                          OUTPUT_SEGMENT_TRIGGER_CLASS,
                          focusRing,
                        )}
                      >
                        {EXTENDED_PM_TAB_LABELS[key]}
                      </TabsTrigger>
                    ))}
                    {hasPreviousReport ? (
                      <TabsTrigger
                        value="compare"
                        className={cn(
                          "inline-flex items-center",
                          OUTPUT_SEGMENT_TRIGGER_CLASS,
                          focusRing,
                        )}
                      >
                        <BarChart2 className="mr-1.5 size-3" />
                        What changed
                        {compareLoading ? (
                          <div className="ml-1.5 size-2.5 animate-spin rounded-full border border-current border-t-transparent" />
                        ) : null}
                      </TabsTrigger>
                    ) : null}
                  </TabsList>
                </div>
              </div>
              <button
                type="button"
                aria-label="Scroll tabs right"
                className={cn(
                  "flex w-8 shrink-0 items-center justify-center border-l border-[var(--border)] text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]",
                  !outputTabScrollEdges.right && "pointer-events-none opacity-0",
                  focusRing,
                )}
                onClick={() =>
                  outputTabScrollRef.current?.scrollBy({ left: 200, behavior: "smooth" })
                }
              >
                <ChevronRight className="size-5" aria-hidden />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-visible md:overflow-y-auto">
            {hasPreviousReport ? (
            <TabsContent value="compare" className="flex-1 min-h-0">
              <div className="space-y-4 p-4">
                {compareLoading ? (
                  <div className="flex items-center justify-center gap-3 py-12">
                    <div className="size-5 animate-spin rounded-full border-2 border-white/20 border-t-[var(--accent)]" />
                    <p className="text-[13px] text-[var(--text-muted)]">
                      Comparing with previous report...
                    </p>
                  </div>
                ) : compareResult ? (
                  <div className="space-y-4">
                    {stagedCompareExample ? (
                      <p className="text-[12px] text-[var(--text-muted)]">
                        Example comparison. Real reports compare against your previous report
                        automatically
                      </p>
                    ) : null}
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "rounded-full px-3 py-1 text-[12px] font-semibold uppercase tracking-wide",
                          compareResult.trend === "improving"
                            ? "bg-green-500/10 text-green-400"
                            : compareResult.trend === "worsening"
                              ? "bg-red-500/10 text-red-400"
                              : "bg-white/[0.06] text-white/50",
                        )}
                      >
                        {compareResult.trend === "improving"
                          ? "↑ Improving"
                          : compareResult.trend === "worsening"
                            ? "↓ Worsening"
                            : "→ Stable"}
                      </span>
                      <p className="text-[13px] text-[var(--text-secondary)]">
                        {compareResult.trend_justification}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                        What changed
                      </p>
                      <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
                        {compareResult.what_changed}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {compareResult.resolved.length > 0 && (
                        <div className="rounded-xl border border-green-500/15 bg-green-500/[0.04] p-4">
                          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-green-400">
                            Resolved ({compareResult.resolved.length})
                          </p>
                          <ul className="space-y-2">
                            {compareResult.resolved.map((item, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-[12px] text-white/70"
                              >
                                <span className="mt-0.5 flex-shrink-0 font-bold text-green-400">
                                  ✓
                                </span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {compareResult.new_items.length > 0 && (
                        <div className="rounded-xl border border-[var(--accent)]/15 bg-[var(--accent)]/[0.04] p-4">
                          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                            New ({compareResult.new_items.length})
                          </p>
                          <ul className="space-y-2">
                            {compareResult.new_items.map((item, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-[12px] text-white/70"
                              >
                                <span className="mt-0.5 flex-shrink-0 font-bold text-[var(--accent)]">
                                  +
                                </span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {compareResult.still_open.length > 0 && (
                        <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-4">
                          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-amber-400">
                            Ongoing ({compareResult.still_open.length})
                          </p>
                          <ul className="space-y-2">
                            {compareResult.still_open.map((item, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-[12px] text-white/70"
                              >
                                <span className="mt-0.5 flex-shrink-0 font-bold text-amber-400">
                                  →
                                </span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 py-12">
                    <BarChart2 className="size-8 text-[var(--accent)] opacity-40" />
                    <p className="max-w-xs text-center text-[13px] text-[var(--text-muted)]">
                      Compare this report with the previous one to see what was resolved, what is
                      new, and what is still ongoing.
                    </p>
                    <button
                      type="button"
                      onClick={() => void loadCompare()}
                      className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[12px] font-semibold text-[#06091a] transition-all hover:scale-[1.02]"
                    >
                      Generate comparison
                    </button>
                  </div>
                )}
              </div>
            </TabsContent>
            ) : null}
            {visibleCoreTabsList.includes("actions") ? (
            <TabsContent value="actions" className={OUTPUT_TAB_PANEL_CLASS}>
              <div className={OUTPUT_TAB_CONTENT_SHELL}>
              <Card className={OUTPUT_TAB_CARD_CLASS}>
                <CardHeader className="flex-row items-center justify-between gap-3 border-b border-[var(--border)] px-4 pb-3 pt-4">
                  <CardTitle className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
                    Actions
                  </CardTitle>
                </CardHeader>
                {lastPushed && lastPushedOutputs.includes("actions") ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {`Pushed to ${lastPushedPsaLabel} · ${pushedRelativeText()}`}
                  </div>
                ) : null}
                <CardContent className={cn(OUTPUT_TAB_CARD_BODY_SCROLL, "p-0 pt-0")}>
                  <div className={cn(OUTPUT_TAB_CARD_BODY_INNER_SCROLL, "min-w-0 px-2 pb-1 pt-2")}>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[var(--border)] hover:bg-transparent">
                        <TableHead className="h-auto bg-[color-mix(in_srgb,var(--bg-secondary)_92%,transparent)] px-2.5 py-1.5 text-left text-[10px] font-semibold uppercase leading-tight tracking-[0.06em] text-[var(--text-muted)]">
                          Task
                        </TableHead>
                        <TableHead className="h-auto bg-[color-mix(in_srgb,var(--bg-secondary)_92%,transparent)] px-2.5 py-1.5 text-left text-[10px] font-semibold uppercase leading-tight tracking-[0.06em] text-[var(--text-muted)]">
                          Owner
                        </TableHead>
                        <TableHead className="hidden h-auto w-32 bg-[color-mix(in_srgb,var(--bg-secondary)_92%,transparent)] px-2.5 py-1.5 text-left text-[10px] font-semibold uppercase leading-tight tracking-[0.06em] text-[var(--text-muted)] md:table-cell">
                          Due date
                        </TableHead>
                        <TableHead className="h-auto bg-[color-mix(in_srgb,var(--bg-secondary)_92%,transparent)] px-2.5 py-1.5 text-left text-[10px] font-semibold uppercase leading-tight tracking-[0.06em] text-[var(--text-muted)]">
                          Priority
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.actions.length === 0 ? (
                        <TableRow className="border-0 hover:bg-transparent">
                          <TableCell colSpan={4} className="p-0">
                            <OutputTabEmptyState
                              icon={<CheckSquare strokeWidth={1.25} />}
                              message="No actions returned."
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        result.actions.map((row, idx) => (
                          <TableRow
                            key={idx}
                            className={cn(
                              "border-[var(--border)] transition-colors duration-150 animate-in fade-in slide-in-from-bottom-1 duration-300",
                              idx % 2 === 1 && "bg-white/[0.02]",
                              idx !== result.actions.length - 1 &&
                                "border-b",
                            )}
                            style={{
                              animationDelay: `${idx * 40}ms`,
                              animationFillMode: "both",
                            }}
                          >
                            <TableCell className="max-w-md whitespace-normal px-2.5 py-1.5 text-[13px] font-medium leading-snug text-[var(--text-primary)]">
                              {editingActionRow === idx ? (
                                <Input
                                  value={row.task ?? ""}
                                  onChange={(e) => {
                                    setResult((prev) => {
                                      if (!prev) return prev;
                                      const next = [...prev.actions];
                                      next[idx] = {
                                        ...next[idx],
                                        task: e.target.value || null,
                                      };
                                      return { ...prev, actions: next };
                                    });
                                  }}
                                  className="h-8"
                                />
                              ) : (
                                row.task ?? "-"
                              )}
                            </TableCell>
                            <TableCell className="whitespace-normal px-2.5 py-1.5 text-[13px] leading-snug text-[var(--text-secondary)]">
                              {editingActionRow === idx ? (
                                <Input
                                  value={row.suggested_owner ?? ""}
                                  onChange={(e) => {
                                    setResult((prev) => {
                                      if (!prev) return prev;
                                      const next = [...prev.actions];
                                      next[idx] = {
                                        ...next[idx],
                                        suggested_owner: e.target.value || null,
                                      };
                                      return { ...prev, actions: next };
                                    });
                                  }}
                                  className="h-8"
                                />
                              ) : isUnassignedOwner(row.suggested_owner) ? (
                                <span className="text-[var(--text-secondary)]">
                                  Unassigned
                                </span>
                              ) : (
                                (row.suggested_owner ?? "").trim()
                              )}
                            </TableCell>
                            <TableCell className="group hidden w-32 whitespace-nowrap px-2.5 py-1.5 text-[13px] leading-snug md:table-cell">
                              {editingDueDateRow === idx ? (
                                <input
                                  type="date"
                                  autoFocus
                                  value={dueDateToInputValue(row.due_date)}
                                  className="h-8 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-2 text-[12px] text-[var(--text-primary)]"
                                  onChange={(e) => {
                                    const formatted = formatDueDateFromInput(e.target.value);
                                    setResult((prev) => {
                                      if (!prev) return prev;
                                      const next = [...prev.actions];
                                      next[idx] = {
                                        ...next[idx],
                                        due_date: formatted || null,
                                      };
                                      return { ...prev, actions: next };
                                    });
                                  }}
                                  onBlur={() => setEditingDueDateRow(null)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") setEditingDueDateRow(null);
                                  }}
                                />
                              ) : (
                                <button
                                  type="button"
                                  className={cn(
                                    "inline-flex w-full cursor-pointer items-center gap-1 text-left",
                                    focusRing,
                                  )}
                                  onClick={() => setEditingDueDateRow(idx)}
                                >
                                  {(row.due_date ?? "").trim() ? (
                                    <span>{row.due_date}</span>
                                  ) : (
                                    <span className="text-[var(--text-secondary)]"> - </span>
                                  )}
                                  <Edit2
                                    className="size-3 shrink-0 text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100"
                                    aria-hidden
                                  />
                                </button>
                              )}
                            </TableCell>
                            <TableCell className="px-2.5 py-1.5 align-middle">
                              <div className="flex items-center gap-1.5">
                              {editingActionRow === idx ? (
                                <Input
                                  value={row.priority ?? ""}
                                  onChange={(e) => {
                                    setResult((prev) => {
                                      if (!prev) return prev;
                                      const next = [...prev.actions];
                                      next[idx] = {
                                        ...next[idx],
                                        priority: e.target.value || null,
                                      };
                                      return { ...prev, actions: next };
                                    });
                                  }}
                                  className="h-8 w-24"
                                />
                              ) : (
                                <span className={priorityBadgeClass(row.priority)}>
                                  {row.priority ?? "-"}
                                </span>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  "size-7 shrink-0 p-0 text-[var(--text-muted)] hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] hover:text-[var(--text-primary)]",
                                  focusRing,
                                )}
                                aria-label={
                                  editingActionRow === idx
                                    ? "Done editing row"
                                    : "Edit row"
                                }
                                onClick={() =>
                                  setEditingActionRow((curr) =>
                                    curr === idx ? null : idx,
                                  )
                                }
                              >
                                {editingActionRow === idx ? (
                                  <Check className="size-3.5" aria-hidden />
                                ) : (
                                  <Pencil className="size-3.5" aria-hidden />
                                )}
                              </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  </div>
                  <div className={cn(OUTPUT_REGEN_BAR_CLASS, "mx-4 mb-4 mt-2 shrink-0")}>
                    <Input
                      value={regenInstruction.actions || ""}
                      onChange={(e) =>
                        setRegenInstruction((prev) => ({
                          ...prev,
                          actions: e.target.value,
                        }))
                      }
                      placeholder="Tweak this output... e.g. make it shorter, add more detail about the risk"
                      className={OUTPUT_REGEN_INPUT_CLASS}
                    />
                    <Button
                      type="button"
                      disabled={regenLoadingFor === "actions"}
                      className={cn(
                        OUTPUT_REGEN_BUTTON_CLASS,
                        "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-50",
                        focusRing,
                      )}
                      onClick={() => void handleRegenerate("actions")}
                    >
                      {regenLoadingFor === "actions" ? "Regenerating..." : "Regenerate"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              </div>
            </TabsContent>
            ) : null}

            {visibleCoreTabsList.includes("risks") ? (
            <TabsContent value="risks" className={OUTPUT_TAB_PANEL_CLASS}>
              <div className={OUTPUT_TAB_CONTENT_SHELL}>
              <Card className={OUTPUT_TAB_CARD_CLASS}>
                <CardHeader className="flex-row items-center justify-between gap-3 border-b border-[var(--border)] px-4 pb-3 pt-4">
                  <CardTitle className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
                    Risks
                  </CardTitle>
                </CardHeader>
                {lastPushed && lastPushedOutputs.includes("risks") ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {`Pushed to ${lastPushedPsaLabel} · ${pushedRelativeText()}`}
                  </div>
                ) : null}
                <CardContent className={cn(OUTPUT_TAB_CARD_BODY_SCROLL, "p-0 pt-0")}>
                  <div className={cn(OUTPUT_TAB_CARD_BODY_INNER_SCROLL, "min-w-0 overflow-x-auto px-2 pb-1 pt-2")}>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[var(--border)] hover:bg-transparent">
                        <TableHead className="h-auto bg-[color-mix(in_srgb,var(--bg-secondary)_92%,transparent)] px-2.5 py-1.5 text-left text-[10px] font-semibold uppercase leading-tight tracking-[0.06em] text-[var(--text-muted)]">
                          Risk
                        </TableHead>
                        <TableHead className="h-auto bg-[color-mix(in_srgb,var(--bg-secondary)_92%,transparent)] px-2.5 py-1.5 text-left text-[10px] font-semibold uppercase leading-tight tracking-[0.06em] text-[var(--text-muted)]">
                          Impact
                        </TableHead>
                        <TableHead className="h-auto bg-[color-mix(in_srgb,var(--bg-secondary)_92%,transparent)] px-2.5 py-1.5 text-left text-[10px] font-semibold uppercase leading-tight tracking-[0.06em] text-[var(--text-muted)]">
                          Mitigation
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.risks.length === 0 ? (
                        <TableRow className="border-0 hover:bg-transparent">
                          <TableCell colSpan={3} className="p-0">
                            <OutputTabEmptyState
                              icon={<AlertTriangle strokeWidth={1.25} />}
                              message="No risks returned."
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        result.risks.map((row, idx) => (
                          <TableRow
                            key={idx}
                            className={cn(
                              "border-[var(--border)] transition-colors duration-150 animate-in fade-in slide-in-from-bottom-1 duration-300",
                              idx % 2 === 1 && "bg-white/[0.02]",
                              idx !== result.risks.length - 1 && "border-b",
                            )}
                            style={{
                              animationDelay: `${idx * 40}ms`,
                              animationFillMode: "both",
                            }}
                          >
                            <TableCell className="max-w-xs whitespace-normal px-2.5 py-1.5 text-[13px] leading-snug text-[var(--text-primary)]">
                              {editingRiskRow === idx ? (
                                <Textarea
                                  value={row.risk ?? ""}
                                  onChange={(e) => {
                                    setResult((prev) => {
                                      if (!prev) return prev;
                                      const next = [...prev.risks];
                                      next[idx] = {
                                        ...next[idx],
                                        risk: e.target.value || null,
                                      };
                                      return { ...prev, risks: next };
                                    });
                                  }}
                                  rows={2}
                                  className="min-h-10"
                                />
                              ) : (
                                row.risk ?? "-"
                              )}
                            </TableCell>
                            <TableCell className="max-w-xs whitespace-normal px-2.5 py-1.5 text-[13px] leading-snug text-[var(--text-secondary)]">
                              {editingRiskRow === idx ? (
                                <Textarea
                                  value={row.impact ?? ""}
                                  onChange={(e) => {
                                    setResult((prev) => {
                                      if (!prev) return prev;
                                      const next = [...prev.risks];
                                      next[idx] = {
                                        ...next[idx],
                                        impact: e.target.value || null,
                                      };
                                      return { ...prev, risks: next };
                                    });
                                  }}
                                  rows={2}
                                  className="min-h-10"
                                />
                              ) : (
                                row.impact ?? "-"
                              )}
                            </TableCell>
                            <TableCell className="max-w-md whitespace-normal px-2.5 py-1.5 text-[13px] leading-snug text-[var(--text-secondary)]">
                              {editingRiskRow === idx ? (
                                <div className="flex items-start gap-2">
                                  <Textarea
                                    value={row.mitigation ?? ""}
                                    onChange={(e) => {
                                      setResult((prev) => {
                                        if (!prev) return prev;
                                        const next = [...prev.risks];
                                        next[idx] = {
                                          ...next[idx],
                                          mitigation: e.target.value || null,
                                        };
                                        return { ...prev, risks: next };
                                      });
                                    }}
                                    rows={2}
                                    className="min-h-10"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                      "size-7 shrink-0 p-0 text-[var(--text-muted)] hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] hover:text-[var(--text-primary)]",
                                      focusRing,
                                    )}
                                    aria-label="Done editing row"
                                    onClick={() => setEditingRiskRow(null)}
                                  >
                                    <Check className="size-3.5" aria-hidden />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-start justify-between gap-2">
                                  <span>{row.mitigation ?? "-"}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                      "size-7 shrink-0 p-0 text-[var(--text-muted)] hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] hover:text-[var(--text-primary)]",
                                      focusRing,
                                    )}
                                    aria-label="Edit row"
                                    onClick={() => setEditingRiskRow(idx)}
                                  >
                                    <Pencil className="size-3.5" aria-hidden />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  </div>
                  <div className={cn(OUTPUT_REGEN_BAR_CLASS, "mx-4 mb-4 mt-2 shrink-0")}>
                    <Input
                      value={regenInstruction.risks || ""}
                      onChange={(e) =>
                        setRegenInstruction((prev) => ({
                          ...prev,
                          risks: e.target.value,
                        }))
                      }
                      placeholder="Tweak this output... e.g. make it shorter, add more detail about the risk"
                      className={OUTPUT_REGEN_INPUT_CLASS}
                    />
                    <Button
                      type="button"
                      disabled={regenLoadingFor === "risks"}
                      className={cn(
                        OUTPUT_REGEN_BUTTON_CLASS,
                        "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-50",
                        focusRing,
                      )}
                      onClick={() => void handleRegenerate("risks")}
                    >
                      {regenLoadingFor === "risks" ? "Regenerating..." : "Regenerate"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              </div>
            </TabsContent>
            ) : null}

            {visibleCoreTabsList.includes("summary") ? (
            <TabsContent value="summary" className={OUTPUT_TAB_PANEL_CLASS}>
              <div className={OUTPUT_TAB_CONTENT_SHELL}>
              <Card className={OUTPUT_TAB_CARD_CLASS}>
                <CardHeader className="flex-row items-center justify-between gap-3 border-b border-[var(--border)] px-4 pb-3 pt-4">
                  <CardTitle className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
                    Summary
                  </CardTitle>
                </CardHeader>
                {lastPushed && lastPushedOutputs.includes("summary") ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {`Pushed to ${lastPushedPsaLabel} · ${pushedRelativeText()}`}
                  </div>
                ) : null}
                <CardContent className={cn(OUTPUT_TAB_CARD_BODY_SCROLL, "p-0")}>
                  <div className={cn(OUTPUT_TAB_CARD_BODY_INNER_SCROLL, "px-4 pb-4 pt-4")}>
                  {editingField === "summary" ? (
                    <Textarea
                      value={result.summary || ""}
                      onChange={(e) =>
                        setResult((prev) =>
                          prev ? { ...prev, summary: e.target.value } : prev,
                        )
                      }
                      rows={6}
                      className="min-h-28 border-[var(--border)] bg-[var(--bg-secondary)] text-[13px] leading-relaxed text-[var(--text-primary)]"
                      onBlur={() => setEditingField(null)}
                      autoFocus
                    />
                  ) : !(result.summary ?? "").trim() ? (
                    <OutputTabEmptyState
                      icon={<FileText strokeWidth={1.25} />}
                      message="No summary returned."
                    />
                  ) : (
                    <button
                      type="button"
                      className="w-full rounded-[calc(var(--radius)-2px)] text-left ring-offset-[var(--bg-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_6%,transparent)]"
                      onClick={() => setEditingField("summary")}
                    >
                      <p className="mb-2 text-[11px] text-[var(--text-muted)]">
                        Click to edit
                      </p>
                      <p className="whitespace-pre-wrap text-[13px] leading-[1.55] text-[var(--text-primary)]">
                        {result.summary || "-"}
                      </p>
                    </button>
                  )}
                  </div>
                  <div className={cn(OUTPUT_REGEN_BAR_CLASS, "mx-4 mb-4 mt-2 shrink-0")}>
                    <Input
                      value={regenInstruction.summary || ""}
                      onChange={(e) =>
                        setRegenInstruction((prev) => ({
                          ...prev,
                          summary: e.target.value,
                        }))
                      }
                      placeholder="Tweak this output... e.g. make it shorter, add more detail about the risk"
                      className={OUTPUT_REGEN_INPUT_CLASS}
                    />
                    <Button
                      type="button"
                      disabled={regenLoadingFor === "summary"}
                      className={cn(
                        OUTPUT_REGEN_BUTTON_CLASS,
                        "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-50",
                        focusRing,
                      )}
                      onClick={() => void handleRegenerate("summary")}
                    >
                      {regenLoadingFor === "summary" ? "Regenerating..." : "Regenerate"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              </div>
            </TabsContent>
            ) : null}

            {visibleCoreTabsList.includes("client_email") ? (
            <TabsContent
              value="client_email"
              className={OUTPUT_TAB_PANEL_CLASS}
            >
              <div className={OUTPUT_TAB_CONTENT_SHELL}>
              <Card className={OUTPUT_TAB_CARD_CLASS}>
                <CardHeader className="flex-row items-center justify-between gap-4 border-b border-[var(--border)] px-4 pb-3 pt-4">
                  <CardTitle className="inline-flex items-center gap-2 text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
                    {clientEmailTabDisplay.label}
                    {clientEmailTabDisplay.showInternalBadge ? (
                      <span className="inline-flex items-center rounded-md border border-amber-500/35 bg-amber-500/15 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300">
                        Internal
                      </span>
                    ) : null}
                  </CardTitle>
                  <CardAction>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        title="Opens in your default email client (Outlook, Apple Mail etc)"
                        className="gap-1.5 border-[var(--border)]"
                        onClick={() => {
                          const mailtoLink = buildMailtoLink(
                            result.email_subject,
                            activeClientEmailBody,
                            generationMailtoEmail,
                          );
                          window.open(mailtoLink, "_blank");
                        }}
                      >
                        <Mail className="size-3.5" aria-hidden />
                        Open in mail
                      </Button>
                      <Button
                        id="handover-send-client-email-btn"
                        type="button"
                        variant="outline"
                        size="sm"
                        className={cn(
                          "gap-1.5 border-[var(--border)]",
                          sendEmailButtonHighlight &&
                            "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-primary)] animate-pulse",
                        )}
                        disabled={!userEmail}
                        title={
                          userEmail
                            ? "Send this email from hello@gethandover.uk"
                            : "Sign in to send email"
                        }
                        onClick={() => setSendClientEmailModalOpen(true)}
                      >
                        <Send className="size-3.5" aria-hidden />
                        Send Email
                      </Button>
                    </div>
                  </CardAction>
                </CardHeader>
                {lastPushed && lastPushedOutputs.includes("client_email") ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {`Pushed to ${lastPushedPsaLabel} · ${pushedRelativeText()}`}
                  </div>
                ) : null}
                <CardContent className={cn(OUTPUT_TAB_CARD_BODY_SCROLL, "p-0")}>
                  <div
                    className={cn(
                      OUTPUT_TAB_CARD_BODY_INNER_SCROLL,
                      "flex flex-col gap-4 px-4 pb-4 pt-4",
                    )}
                  >
                  {clientEmailSections.length > 1 ? (
                    <div
                      className="mb-3 flex flex-wrap gap-2"
                      role="tablist"
                      aria-label="Client emails"
                    >
                      {clientEmailSections.map((em, i) => (
                        <button
                          key={i}
                          type="button"
                          role="tab"
                          aria-selected={activeClientEmailIndex === i}
                          onClick={() => setActiveClientEmailIndex(i)}
                          className={cn(
                            "cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                            activeClientEmailIndex === i
                              ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                              : "border-[var(--border)] bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]",
                          )}
                        >
                          {em.client ?? `Email ${i + 1}`}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {result.email_note?.trim() ? (
                    <div
                      style={{
                        backgroundColor: "rgba(0,0,0,0.04)",
                        borderLeft: "3px solid var(--accent)",
                        padding: "8px 12px",
                        borderRadius: "4px",
                        fontSize: "13px",
                        color: "var(--text-muted)",
                        marginBottom: "12px",
                        display: "flex",
                        gap: "8px",
                        alignItems: "flex-start",
                      }}
                      role="note"
                      aria-label="Multiple clients note"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                      <div style={{ whiteSpace: "pre-wrap" }}>{result.email_note}</div>
                    </div>
                  ) : null}
                  {editingField === "client_email" ? (
                    <div className="rounded-[calc(var(--radius)-2px)] border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-secondary)_55%,var(--bg-primary))] px-4 py-3 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--border)_50%,transparent)] text-[13px] leading-[1.55] text-[var(--text-primary)]">
                      <Textarea
                        value={result.client_email || ""}
                        onChange={(e) =>
                          setResult((prev) =>
                            prev
                              ? { ...prev, client_email: e.target.value }
                              : prev,
                          )
                        }
                        rows={10}
                        className="min-h-36 border-[var(--border)] bg-[var(--bg-primary)] text-[13px] leading-relaxed text-[var(--text-primary)]"
                        onBlur={() => setEditingField(null)}
                        autoFocus
                      />
                    </div>
                  ) : !activeClientEmailBody ? (
                    <OutputTabEmptyState
                      icon={<Mail strokeWidth={1.25} />}
                      message="No client email returned."
                    />
                  ) : (
                    <div
                      className="min-h-0 w-full rounded-[calc(var(--radius)-2px)] border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-secondary)_55%,var(--bg-primary))] px-4 py-3 text-[13px] leading-[1.55] text-[var(--text-primary)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--border)_50%,transparent)]"
                    >
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => setEditingField("client_email")}
                      >
                        {(activeClientEmailBody || "-")
                          .split("\n")
                          .map((line, i) => (
                            <p
                              key={i}
                              style={{
                                marginBottom: line === "" ? "1rem" : "0.25rem",
                                minHeight: line === "" ? "0.5rem" : "auto",
                              }}
                            >
                              {line || "\u00A0"}
                            </p>
                          ))}
                      </button>
                    </div>
                  )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-4 px-4 pb-4">
                  {saveTemplateFor === "email" ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        value={templateNameDraft}
                        onChange={(e) => setTemplateNameDraft(e.target.value)}
                        placeholder="Template name"
                      />
                      <Button
                        type="button"
                        onClick={() => void handleSaveTemplate("email")}
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setSaveTemplateFor(null);
                          setTemplateNameDraft("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {templates.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No templates yet - generate an output and save it as a template to reuse your preferred style
                        </p>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full sm:w-fit transition-shadow",
                          templateSaveCtaHighlight &&
                            "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-primary)]",
                        )}
                        onClick={() => {
                          setSaveTemplateFor("email");
                          setTemplateNameDraft("");
                        }}
                      >
                        Save as template
                      </Button>
                    </div>
                  )}
                  <div className={OUTPUT_REGEN_BAR_CLASS}>
                    <Input
                      value={regenInstruction.client_email || ""}
                      onChange={(e) =>
                        setRegenInstruction((prev) => ({
                          ...prev,
                          client_email: e.target.value,
                        }))
                      }
                      placeholder="Tweak this output... e.g. make it shorter, add more detail about the risk"
                      className={OUTPUT_REGEN_INPUT_CLASS}
                    />
                    <Button
                      type="button"
                      disabled={regenLoadingFor === "client_email"}
                      className={cn(
                        OUTPUT_REGEN_BUTTON_CLASS,
                        "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-50",
                        focusRing,
                      )}
                      onClick={() => void handleRegenerate("client_email")}
                    >
                      {regenLoadingFor === "client_email" ? "Regenerating..." : "Regenerate"}
                    </Button>
                  </div>
                  </div>
                </CardContent>
              </Card>
              </div>
            </TabsContent>
            ) : null}

            {visibleCoreTabsList.includes("status_report") ? (
            <TabsContent value="status_report" className={OUTPUT_TAB_PANEL_CLASS}>
              <div className={OUTPUT_TAB_CONTENT_SHELL}>
              <Card className={OUTPUT_TAB_CARD_CLASS}>
                <CardHeader className="flex-row items-center justify-between gap-3 border-b border-[var(--border)] px-4 pb-3 pt-4">
                  <CardTitle className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
                    Status Report
                  </CardTitle>
                </CardHeader>
                {lastPushed && lastPushedOutputs.includes("status_report") ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {`Pushed to ${lastPushedPsaLabel} · ${pushedRelativeText()}`}
                  </div>
                ) : null}
                <CardContent className={cn(OUTPUT_TAB_CARD_BODY_SCROLL, "p-0")}>
                  <div
                    className={cn(
                      OUTPUT_TAB_CARD_BODY_INNER_SCROLL,
                      "flex flex-col gap-4 px-4 pb-4 pt-4",
                    )}
                  >
                  {statusReportSections.length > 1 ? (
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        className={cn(
                          "rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
                          activeStatusReportIndex === -1
                            ? "bg-[var(--accent)] text-white"
                            : "bg-white/5 text-[var(--text-secondary)] hover:text-white",
                        )}
                        onClick={() => setActiveStatusReportIndex(-1)}
                      >
                        All
                      </button>
                      {statusReportSections.map((section, i) => (
                        <button
                          key={i}
                          type="button"
                          className={cn(
                            "rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
                            activeStatusReportIndex === i
                              ? "bg-[var(--accent)] text-white"
                              : "bg-white/5 text-[var(--text-secondary)] hover:text-white",
                          )}
                          onClick={() => setActiveStatusReportIndex(i)}
                        >
                          {section.title}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {editingField === "status_report" ? (
                    <div className="rounded-[calc(var(--radius)-2px)] border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-secondary)_55%,var(--bg-primary))] px-4 py-3 whitespace-pre-wrap text-[13px] leading-[1.55] text-[var(--text-primary)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--border)_50%,transparent)]">
                      <Textarea
                        value={result.status_report || ""}
                        onChange={(e) =>
                          setResult((prev) =>
                            prev
                              ? { ...prev, status_report: e.target.value }
                              : prev,
                          )
                        }
                        rows={10}
                        className="min-h-36 border-[var(--border)] bg-[var(--bg-primary)] text-[13px] leading-relaxed text-[var(--text-primary)]"
                        onBlur={() => setEditingField(null)}
                        autoFocus
                      />
                    </div>
                  ) : !(result.status_report ?? "").trim() ? (
                    <OutputTabEmptyState
                      icon={<ClipboardList strokeWidth={1.25} />}
                      message="No status report returned."
                    />
                  ) : (
                    <div
                      className="min-h-0 w-full rounded-[calc(var(--radius)-2px)] border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-secondary)_55%,var(--bg-primary))] px-4 py-3 text-[13px] leading-[1.55] text-[var(--text-primary)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--border)_50%,transparent)]"
                    >
                      {statusReportSections.length > 1 && activeStatusReportIndex >= 0 ? (
                        <button
                          type="button"
                          className="w-full rounded-[calc(var(--radius)-4px)] text-left ring-offset-[var(--bg-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_6%,transparent)]"
                          onClick={() => setEditingField("status_report")}
                        >
                          <span className="mb-2 block text-[11px] text-[var(--text-muted)]">
                            Click to edit
                          </span>
                          {renderStatusReportDisplay(
                            statusReportSections[activeStatusReportIndex]?.content ?? "",
                          )}
                        </button>
                      ) : statusReportSections.length > 1 && activeStatusReportIndex === -1 ? (
                        <div className="flex flex-col gap-4">
                          {statusReportSections.map((section, i) => (
                            <div
                              key={`${section.title}-${i}`}
                              className={cn(
                                i > 0 &&
                                  "border-t border-[var(--border)] pt-4",
                              )}
                            >
                              <p className="mb-2 text-[12px] font-medium text-[var(--accent)]">
                                {section.title}
                                {section.client ? ` - ${section.client}` : ""}
                              </p>
                              <button
                                type="button"
                                className="w-full rounded-[calc(var(--radius)-4px)] text-left ring-offset-[var(--bg-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_6%,transparent)]"
                                onClick={() => setEditingField("status_report")}
                              >
                                {renderStatusReportDisplay(section.content)}
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="w-full rounded-[calc(var(--radius)-4px)] text-left ring-offset-[var(--bg-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_6%,transparent)]"
                          onClick={() => setEditingField("status_report")}
                        >
                          <span className="mb-2 block text-[11px] text-[var(--text-muted)]">
                            Click to edit
                          </span>
                          {renderStatusReportDisplay(
                            coerceStringOutput(result.status_report),
                          )}
                        </button>
                      )}
                    </div>
                  )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-4 px-4 pb-4">
                  {saveTemplateFor === "report" ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        value={templateNameDraft}
                        onChange={(e) => setTemplateNameDraft(e.target.value)}
                        placeholder="Template name"
                      />
                      <Button
                        type="button"
                        onClick={() => void handleSaveTemplate("report")}
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setSaveTemplateFor(null);
                          setTemplateNameDraft("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {templates.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No templates yet - generate an output and save it as a template to reuse your preferred style
                        </p>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full sm:w-fit transition-shadow",
                          templateSaveCtaHighlight &&
                            "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-primary)]",
                        )}
                        onClick={() => {
                          setSaveTemplateFor("report");
                          setTemplateNameDraft("");
                        }}
                      >
                        Save as template
                      </Button>
                    </div>
                  )}
                  <div className={OUTPUT_REGEN_BAR_CLASS}>
                    <Input
                      value={regenInstruction.status_report || ""}
                      onChange={(e) =>
                        setRegenInstruction((prev) => ({
                          ...prev,
                          status_report: e.target.value,
                        }))
                      }
                      placeholder="Tweak this output... e.g. make it shorter, add more detail about the risk"
                      className={OUTPUT_REGEN_INPUT_CLASS}
                    />
                    <Button
                      type="button"
                      disabled={regenLoadingFor === "status_report"}
                      className={cn(
                        OUTPUT_REGEN_BUTTON_CLASS,
                        "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-50",
                        focusRing,
                      )}
                      onClick={() => void handleRegenerate("status_report")}
                    >
                      {regenLoadingFor === "status_report" ? "Regenerating..." : "Regenerate"}
                    </Button>
                  </div>
                  </div>
                </CardContent>
              </Card>
              </div>
            </TabsContent>
            ) : null}

            {outputTabStripExtendedKeys.map((extKey) => (
              <TabsContent
                key={extKey}
                value={extKey}
                className={OUTPUT_TAB_PANEL_CLASS}
              >
                <div className={OUTPUT_TAB_CONTENT_SHELL}>
                <Card className={OUTPUT_TAB_CARD_CLASS}>
                  <CardHeader className="flex-row items-center justify-between gap-3 border-b border-[var(--border)] px-4 pb-3 pt-4">
                    <CardTitle className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
                      {EXTENDED_PM_TAB_LABELS[extKey]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className={cn(OUTPUT_TAB_CARD_BODY_SCROLL, "px-4 pb-4 pt-4")}>
                    <p className="mb-2 text-[11px] text-[var(--text-muted)]">Click to edit</p>
                    <Textarea
                      value={result[extKey] ?? ""}
                      onChange={(e) =>
                        setResult((prev) =>
                          prev ? { ...prev, [extKey]: e.target.value } : prev,
                        )
                      }
                      rows={14}
                      className="min-h-[12rem] whitespace-pre-wrap border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-secondary)_45%,var(--bg-primary))] font-sans text-[13px] leading-relaxed text-[var(--text-primary)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--border)_45%,transparent)]"
                      aria-label={EXTENDED_PM_TAB_LABELS[extKey]}
                    />
                  </CardContent>
                </Card>
                </div>
              </TabsContent>
            ))}

            </div>
          </Tabs>

            {result && !isGenerating && savedGenerationId && !generationRating ? (
              <div className="flex shrink-0 animate-in fade-in items-center gap-3 border-t border-[var(--border)] px-4 py-3 duration-300">
                <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  Rate this output
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void rateGeneration(savedGenerationId, "positive")}
                    className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-[12px] font-medium text-white/40 transition-all duration-150 hover:bg-white/[0.07] hover:text-white/70"
                  >
                    <ThumbsUp className="size-3" />
                    <span>Good</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void rateGeneration(savedGenerationId, "negative")}
                    className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-[12px] font-medium text-white/40 transition-all duration-150 hover:bg-white/[0.07] hover:text-white/70"
                  >
                    <ThumbsDown className="size-3" />
                    <span>Needs work</span>
                  </button>
                </div>
              </div>
            ) : null}

            {result &&
            mainView !== "overview" &&
            mainView !== "changelog" &&
            mainView !== "configuration" &&
            mainView !== "organisation" ? (
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 border-[var(--border)] px-2.5 text-[12px] text-[var(--text-secondary)] transition-all duration-150 ease-out",
                      focusRing,
                    )}
                    onClick={() =>
                      copyWithFeedback(
                        "output_tab",
                        getOutputTabPlaintext(
                          outputMainTab,
                          result,
                          clientEmailSections,
                          activeClientEmailIndex,
                          ticketTitlesForSourceColumn,
                        ),
                      )
                    }
                  >
                    {copiedKey === "output_tab" ? "Copied!" : "Copy tab"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 border-[var(--border)] px-2.5 text-[12px] text-[var(--text-secondary)] transition-all duration-150 ease-out",
                      focusRing,
                    )}
                    onClick={() =>
                      copyWithFeedback(
                        "all_outputs",
                        formatAllOutputsForCopy(result, ticketTitlesForSourceColumn),
                      )
                    }
                  >
                    {copiedKey === "all_outputs" ? "Copied!" : "Copy all outputs"}
                  </Button>
                </div>
                <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
                  {userEmail && hasPortalPlanAccess && portalSlug.trim() && sharePortalClientId ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-8 border-[var(--border)] px-2.5 text-[12px] text-[var(--text-secondary)] transition-all duration-150 ease-out",
                        focusRing,
                      )}
                      disabled={sharePortalBusy}
                      onClick={() => void onShareReportToPortal()}
                    >
                      {sharePortalBusy ? "Sharing…" : "Share to portal"}
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
            {userEmail && showPostGenReferralFooter ? (
              <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--bg-secondary)]/40 px-4 py-2">
                <p className="min-w-0 text-[11px] leading-snug text-[var(--text-muted)]">
                  <Link
                    href="/referral"
                    className="text-[var(--text-secondary)] underline-offset-2 transition-colors hover:text-[var(--text-primary)] hover:underline"
                  >
                    Refer a colleague → earn 1 month free (£79 credit)
                  </Link>
                </p>
                <button
                  type="button"
                  className="shrink-0 rounded-[var(--radius)] px-2 py-0.5 text-[15px] leading-none text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
                  aria-label="Dismiss"
                  onClick={() => {
                    try {
                      window.sessionStorage.setItem("handover_referral_output_banner_dismissed", "1");
                    } catch {
                      /* ignore */
                    }
                    setShowPostGenReferralFooter(false);
                  }}
                >
                  ×
                </button>
              </div>
            ) : null}
            {userEmail &&
            !hasProAccess &&
            hasCompletedLoop &&
            showPostGenProUpsell &&
            !readUpgradePromptConsumed() ? (
              <div
                className="flex flex-col gap-2 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--accent)_6%,var(--bg-secondary))] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                role="region"
                aria-label="Pro features upsell"
              >
                <p className="min-w-0 text-[13px] leading-snug text-[var(--text-secondary)]">
                  Want scheduled reports and HaloPSA push-back?{" "}
                  <span className="text-[var(--text-primary)]">Available on Growth and above.</span>
                </p>
                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 bg-[var(--accent)] px-3 text-[12px] font-semibold text-white hover:bg-[var(--accent-hover)]"
                    onClick={() => {
                      markUpgradePromptConsumed();
                      setShowPostGenProUpsell(false);
                      setHeaderUpgradeOpen(true);
                    }}
                  >
                    Upgrade
                  </Button>
                  <button
                    type="button"
                    className="text-[12px] font-medium text-[var(--text-muted)] underline-offset-4 hover:text-[var(--text-primary)] hover:underline"
                    onClick={() => {
                      markUpgradePromptConsumed();
                      setShowPostGenProUpsell(false);
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ) : null}
            {showSignUpBanner ? (
              <div
                className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[rgba(56,189,248,0.2)] bg-[rgba(56,189,248,0.05)] px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                role="region"
                aria-label="Sign up to save results"
              >
                <p className="text-[13px] text-[var(--text-secondary)]">
                  Sign up free to save your results
                </p>
                <Link href="/onboarding/connect" className="inline-flex shrink-0">
                  <Button
                    type="button"
                    className="h-10 rounded-[var(--radius)] bg-[var(--accent)] px-5 text-[13px] font-semibold text-white hover:bg-[var(--accent-hover)]"
                  >
                    Create free account
                  </Button>
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}

      </div>
      </div>
      </div>
        </div>
      ) : null}
      {!showLeftSidebar ? <MarketingFooter /> : null}
      {hasPortalPlanAccess ? (
        <EnterprisePortalOnboarding
          open={
            onboardingOverlayOpen &&
            !onboardingPageVisited &&
            !onboardingRedirectPending
          }
          companyName={profileCompanyName.trim() || profileDisplayName.trim()}
          onConfirm={completeEnterpriseOnboardingWithSlug}
          onSkip={markOnboardingComplete}
        />
      ) : (
        <FirstRunOnboardingOverlay
          open={
            onboardingOverlayOpen &&
            !onboardingPageVisited &&
            !onboardingRedirectPending
          }
          isTrial={!!trialEndsAt}
          welcomeFirstName={onboardingWelcomeFirst}
          firstName={profileFirstName}
          setFirstName={setProfileFirstName}
          lastName={profileLastName}
          setLastName={setProfileLastName}
          jobTitle={profileJobTitle}
          setJobTitle={setProfileJobTitle}
          companyName={profileCompanyName}
          setCompanyName={setProfileCompanyName}
          outputLanguage={profileOutputLanguage}
          setOutputLanguage={setProfileOutputLanguage}
          onSaveProfile={async () => {
            const ok = await saveOnboardingProfileStep();
            if (!ok) throw new Error("profile save failed");
          }}
          haloUrl={haloUrl}
          setHaloUrl={setHaloUrl}
          haloTenant={haloTenant}
          setHaloTenant={setHaloTenant}
          haloClientId={haloClientId}
          setHaloClientId={setHaloClientId}
          haloClientSecret={haloClientSecret}
          setHaloClientSecret={setHaloClientSecret}
          haloLoading={haloLoading}
          haloError={haloError}
          haloConnected={haloConnected}
          onHaloConnect={handleHaloConnect}
          onComplete={(choice) => {
            void (async () => {
              await markOnboardingComplete();
              const confetti = (await import("canvas-confetti")).default;
              confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ["#38bdf8", "#1e3a5f", "#ffffff", "#7dd3fc"],
              });
              if (choice === "example") {
                setInput(DEMO_EXAMPLE_INPUT);
              } else {
                setInput("");
              }
              setMainView("generate");
              setPostOnboardingNewGenHighlight(true);
            })();
          }}
          onSkipEntirely={async () => {
            await markOnboardingComplete();
            try {
              sessionStorage.setItem(ONBOARDING_PAGE_SEEN_KEY, "1");
            } catch {
              /* ignore */
            }
            setPostOnboardingNewGenHighlight(true);
          }}
        />
      )}
      <Dialog
        open={Boolean(deleteConfirmScheduleId)}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmScheduleId(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete scheduled report</DialogTitle>
            <DialogDescription>
              Delete this scheduled report? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmScheduleId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={scheduleSaving || !deleteConfirmScheduleId}
              onClick={() => {
                if (!deleteConfirmScheduleId) return;
                void deleteSchedule(deleteConfirmScheduleId);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {userEmail && mainView === "generate" ? <HandoverTourDevTrigger /> : null}
    </motion.div>
  );
}
