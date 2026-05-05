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
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Calendar,
  Check,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Database,
  Download,
  Eye,
  FileEdit,
  Globe,
  LayoutDashboard,
  LayoutList,
  LayoutTemplate,
  Loader2,
  Lock,
  Mail,
  Menu,
  MessageSquare,
  Palette,
  PenLine,
  Plug,
  Plus,
  PoundSterling,
  Settings,
  Shield,
  Sparkles,
  Sun,
  Upload,
  User,
  UserRoundPlus,
  Users,
  Moon,
  Edit2,
  Pencil,
  Play,
  Trash2,
  Send,
  Info,
  Zap,
  X,
  Gift,
} from "lucide-react";
import confetti from "canvas-confetti";
import { mutate } from "swr";

import { createClient } from "@/lib/supabase";
import {
  canonicalPlanId,
  getPlanLabel,
  getUserPlan,
  hasProTierAccess,
  isProOrTeam,
  isSoloGenerationBlockedByPlan,
  normalizePlanLabel,
  planFieldsFromProfileRow,
  profilePlanToUiTier,
  qbrPackUsageHintCopy,
} from "@/lib/plans";
import {
  normalizeTeamDashboardPermission,
  type TeamDashboardPermission,
} from "@/lib/team-dashboard-permission";
import { partnerWhiteLabelActive } from "@/lib/white-label";
import { DeliveryHealthDashboard } from "@/components/delivery-health-dashboard";
import { MarketingFooter } from "@/components/marketing-footer";
import { ReferralsSettingsPanel } from "@/components/referrals-settings-panel";
import { useToast } from "@/components/toasts";
import { useCwProjects, useCwTickets, useHaloTickets } from "@/lib/psa-cache";
import {
  exportActionsCSV,
  exportClientEmailTXT,
  exportRisksCSV,
  exportStatusReportTXT,
  exportToExcel,
  getActionLogExportFilename,
  getClientEmailExportFilename,
  getFullReportExportFilename,
  getRiskLogExportFilename,
  getStatusReportExportFilename,
  parseActionsFromText,
  type ExportMeta,
  type FullReportOutputs,
} from "@/lib/export";
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
  EXTENDED_PM_TAB_LABELS,
  type ExtendedPmTabKey,
  emptyExtendedOutputsObject,
  normalizeExtendedOutputKeys,
} from "@/lib/pm-output-tabs";
import {
  DEFAULT_EMAIL_CONTENT_PREFS,
  SCHEDULE_EXCEL_CORE_KEYS,
  SCHEDULE_EXCEL_OPTIONAL_LABELS,
  SCHEDULE_EXCEL_OPTIONAL_TAB_KEYS,
  type NormalizedEmailContentPrefs,
} from "@/lib/scheduled-email-prefs";
import { getDateRangeEndIso, getDateRangeStartIso } from "@/lib/scheduled-reports";
import { APP_VERSION, BUILD_NUMBER } from "@/lib/version";
import { buildClientEmailSignOffBlock } from "@/lib/client-email-signature";
import { buildDefaultClientEmailSubject } from "@/lib/client-email-send-html";

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
const LS_BASIC_ACTION_EXPORT = "handover_onboarding_basic_action_export";

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
import { HeroProductMockup } from "@/components/hero-product-mockup";
import { HomeRoiCalculator } from "@/components/home-roi-calculator";
import { TestimonialMarquee } from "@/components/testimonial-marquee";
import { ScrollRevealItem } from "@/components/scroll-reveal-item";
import { IntegrationsPanel } from "@/components/integrations-panel";
import { ConfigurationPanel } from "@/components/configuration-panel";
import { invalidatePsaConnectionsCache, usePSAConnections } from "@/hooks/use-psa-connections";
import { HaloImportModal } from "@/components/halo-import-modal";
import { CwImportModal } from "@/components/cw-import-modal";
import { FirstRunOnboardingOverlay } from "@/components/first-run-onboarding";
import { TrialBanner } from "@/components/trial-banner";
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
import { QbrPackBuilder } from "@/components/qbr-pack-builder";
import {
  actionSourceDisplayLabel,
  actionSourceFullTitleForTooltip,
  buildActionSourceColumnForExport,
  buildRiskSourceColumnForExport,
  extractTicketTitlesFromGenerationInput,
  riskSourceDisplayLabel,
  riskSourceFullTitleForTooltip,
} from "@/lib/ticket-source-attribution";
import { stripClientEmailSeparatorLines } from "@/lib/client-email-sanitize";
import {
  buildSmartActionsReportContext,
  shouldOfferSmartActions,
  type SmartActionSuggestion,
} from "@/lib/smart-actions";
import { extractFirstEmailFromText } from "@/lib/email-recipients";
import { cn } from "@/lib/utils";

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

const EXAMPLE_INPUT =
  "Weekly review - Skyline IT Solutions account.\nServer migration to Azure overdue by 2 weeks. Dave handling the backup but not started yet. Client called twice chasing update. Need to send them something today. Risk that old hardware fails before we finish.\nTarget completion: end of month.";

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
    EXTENDED_PM_TAB_KEYS.map((k) => [k, false]),
  ) as Record<ExtendedPmTabKey, boolean>;
}

function hydrateOutputPrefsFromProfile(outputPreferences: unknown): {
  core: Record<ModalOutputKey, boolean>;
  extended: Record<ExtendedPmTabKey, boolean>;
} {
  const extDefault = defaultExtendedOutputPrefs();
  if (!outputPreferences || typeof outputPreferences !== "object") {
    return { core: loadOutputPrefs(), extended: extDefault };
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

  const extended = { ...extDefault };
  if (Array.isArray(raw.extendedTabs)) {
    for (const k of normalizeExtendedOutputKeys(raw.extendedTabs)) {
      extended[k] = true;
    }
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

function visibleExtendedTabsForResult(r: GenerateResult): ExtendedPmTabKey[] {
  if (r._uiTabScope?.extended) {
    return EXTENDED_PM_TAB_KEYS.filter((k) => r._uiTabScope!.extended.includes(k));
  }
  return EXTENDED_PM_TAB_KEYS.filter((k) => Boolean((r[k] ?? "").trim()));
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
};

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

function formatActionsForCopy(actions: ActionRow[], ticketTitles?: string[]): string {
  const showSource = (ticketTitles?.length ?? 0) >= 2;
  return actions
    .map((a, i) => {
      const task = a.task ?? "-";
      const owner = formatOwnerLabel(a.suggested_owner);
      const pri = a.priority ?? "-";
      let block = `${i + 1}. ${task}\n   Owner: ${owner}\n   Priority: ${pri}`;
      if (showSource && ticketTitles) {
        block += `\n   Source: ${actionSourceDisplayLabel(a, ticketTitles)}`;
      }
      return block;
    })
    .join("\n\n");
}

function formatRisksForCopy(risks: RiskRow[], ticketTitles?: string[]): string {
  const showSource = (ticketTitles?.length ?? 0) >= 2;
  return risks
    .map((r, i) => {
      const risk = r.risk ?? "-";
      const impact = r.impact ?? "-";
      const mit = r.mitigation ?? "-";
      let block = `${i + 1}. ${risk}\n   Impact: ${impact}\n   Mitigation: ${mit}`;
      if (showSource && ticketTitles) {
        block += `\n   Source: ${riskSourceDisplayLabel(r, ticketTitles)}`;
      }
      return block;
    })
    .join("\n\n");
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
      return (s?.content ?? result.client_email ?? "").trim();
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

function selectedExcelKeysFromRow(raw: string[] | null | undefined): string[] {
  const allowed = new Set<string>([
    ...SCHEDULE_EXCEL_CORE_KEYS,
    ...SCHEDULE_EXCEL_OPTIONAL_TAB_KEYS,
  ]);
  if (!Array.isArray(raw) || raw.length === 0) {
    return [...SCHEDULE_EXCEL_CORE_KEYS, ...SCHEDULE_EXCEL_OPTIONAL_TAB_KEYS];
  }
  const picked = raw.filter((x): x is string => typeof x === "string" && allowed.has(x));
  return picked.length > 0 ? picked : [...SCHEDULE_EXCEL_CORE_KEYS, ...SCHEDULE_EXCEL_OPTIONAL_TAB_KEYS];
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
    return "rounded-full border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.1)] px-2 py-0.5 text-[11px] font-medium text-[#ef4444]";
  }
  if (p === "medium") {
    return "rounded-full border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.1)] px-2 py-0.5 text-[11px] font-medium text-[#f59e0b]";
  }
  if (p === "low") {
    return "rounded-full border border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.1)] px-2 py-0.5 text-[11px] font-medium text-[#22c55e]";
  }
  return "rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)]";
}

/** Shared keyboard-focus ring (mouse clicks stay clean). */
const focusRing =
  "transition-all duration-[120ms] ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2";

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

function animateValue(
  start: number,
  end: number,
  duration: number,
  setter: (n: number) => void,
) {
  const startTime = performance.now();
  const update = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    setter(Math.round(start + (end - start) * eased));
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  };
  requestAnimationFrame(update);
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

export default function Home() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [gettingStartedChecklistMountKey, setGettingStartedChecklistMountKey] = useState(0);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const showLeftSidebar = Boolean(userEmail);
  const [userFirstName, setUserFirstName] = useState<string | null>(null);
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);
  const [plan, setPlan] = useState<"free" | "pro" | "team" | "enterprise" | null>(
    null,
  );
  /** Raw `profiles.plan` for `getPlanLabel` (sidebar badge). */
  const [profileDbPlan, setProfileDbPlan] = useState<string | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [profileTrialPlan, setProfileTrialPlan] = useState<string | null>(null);
  const [profileSubscriptionStatus, setProfileSubscriptionStatus] = useState<string | null>(null);
  const [planBadgeReady, setPlanBadgeReady] = useState(false);
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  const [showTeamDashboardLink, setShowTeamDashboardLink] = useState(false);
  /** Pro-tier UI (same rule as `/api/delivery-health` — full `profiles` billing fields). */
  const hasProAccess = useMemo(
    () =>
      hasProTierAccess(
        planFieldsFromProfileRow({
          plan: profileDbPlan,
          team_id: userTeamId,
          trial_ends_at: trialEndsAt,
          trial_plan: profileTrialPlan,
          subscription_status: profileSubscriptionStatus,
        }),
      ),
    [
      profileDbPlan,
      userTeamId,
      trialEndsAt,
      profileTrialPlan,
      profileSubscriptionStatus,
    ],
  );

  const soloGenerationLocked = useMemo(
    () =>
      isSoloGenerationBlockedByPlan(
        planFieldsFromProfileRow({
          plan: profileDbPlan,
          team_id: userTeamId,
          trial_ends_at: trialEndsAt,
          trial_plan: profileTrialPlan,
          subscription_status: profileSubscriptionStatus,
        }),
      ),
    [
      profileDbPlan,
      userTeamId,
      trialEndsAt,
      profileTrialPlan,
      profileSubscriptionStatus,
    ],
  );

  const qbrUsageHint = useMemo(
    () =>
      qbrPackUsageHintCopy(
        planFieldsFromProfileRow({
          plan: profileDbPlan,
          team_id: userTeamId,
          trial_ends_at: trialEndsAt,
          trial_plan: profileTrialPlan,
          subscription_status: profileSubscriptionStatus,
        }),
        null,
      ),
    [
      profileDbPlan,
      userTeamId,
      trialEndsAt,
      profileTrialPlan,
      profileSubscriptionStatus,
    ],
  );

  /** Stripe: no second subscription trial while Handover in-app trial is active (server also checks profile). */
  const checkoutHasActiveSoloTrial = useMemo(() => {
    if (userTeamId) return false;
    if (!trialEndsAt || Number.isNaN(Date.parse(trialEndsAt))) return false;
    if (new Date(trialEndsAt) <= new Date()) return false;
    const pdb = normalizePlanLabel(profileDbPlan ?? "");
    return (
      pdb === "professional_trial" ||
      pdb === "team_trial" ||
      (pdb === "free" && Boolean(profileTrialPlan?.trim()))
    );
  }, [userTeamId, trialEndsAt, profileDbPlan, profileTrialPlan]);

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

  const [monthCount, setMonthCount] = useState<number | null>(null);
  const [totalGenerationCount, setTotalGenerationCount] = useState<number | null>(null);
  /** Consecutive UTC days with at least one saved generation (from profiles.current_streak). */
  const [generationStreak, setGenerationStreak] = useState(0);
  const [streakFlameBurst, setStreakFlameBurst] = useState(false);
  /** One dismissible referral line per browser session after a successful generation (output panel). */
  const [showPostGenReferralFooter, setShowPostGenReferralFooter] = useState(false);
  const [firstGenTipDismissed, setFirstGenTipDismissed] = useState<boolean | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const [input, setInput] = useState("");
  const [projectName, setProjectName] = useState("");
  const [clientContactEmail, setClientContactEmail] = useState("");
  const [generationMailtoEmail, setGenerationMailtoEmail] = useState<string | null>(null);
  const [sendClientEmailModalOpen, setSendClientEmailModalOpen] = useState(false);
  const [smartActionsOpen, setSmartActionsOpen] = useState(false);
  const [emailTone, setEmailTone] = useState<Tone>("professional");
  const [lastGeneratedTone, setLastGeneratedTone] = useState<Tone>("professional");
  const [isRewritingEmail, setIsRewritingEmail] = useState(false);
  const rewriteEmailSeqRef = useRef(0);
  const toneRewriteBusyRef = useRef(false);
  const [lastInput, setLastInput] = useState("");
  const ticketTitlesForSourceColumn = useMemo(
    () => extractTicketTitlesFromGenerationInput((input.trim() || lastInput.trim()).trim()),
    [input, lastInput],
  );
  const showTicketSourceColumn = ticketTitlesForSourceColumn.length >= 2;
  const [isGenerating, setIsGenerating] = useState(false);
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
  const [pushModalOpen, setPushModalOpen] = useState(false);
  const [pushSelectedTicketIds, setPushSelectedTicketIds] = useState<number[]>([]);
  const [pushSelectedOutputs, setPushSelectedOutputs] = useState<
    ("client_email" | "actions" | "risks" | "summary" | "status_report")[]
  >(["summary", "actions", "risks"]);
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
  const [editingField, setEditingField] = useState<EditableField>(null);
  const [editingActionRow, setEditingActionRow] = useState<number | null>(null);
  const [editingRiskRow, setEditingRiskRow] = useState<number | null>(null);
  const [outputMainTab, setOutputMainTab] = useState<string>("actions");
  const [onboardingTabsExplored, setOnboardingTabsExplored] = useState(false);
  const [basicOnboardingActionExportDone, setBasicOnboardingActionExportDone] = useState(false);
  const [smartActionEmailBody, setSmartActionEmailBody] = useState<string | null>(null);
  const [smartActionEmailTo, setSmartActionEmailTo] = useState<string | null>(null);
  const [pushHaloHighlight, setPushHaloHighlight] = useState(false);
  const [activeClientEmailIndex, setActiveClientEmailIndex] = useState(0);

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

  const [generateOptionsOpen, setGenerateOptionsOpen] = useState(false);
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
  const [trialBannerDismissed, setTrialBannerDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const authChecked = mounted;
  const [dashGreeting, setDashGreeting] = useState<string | null>(null);
  const [checkoutLoadingPriceId, setCheckoutLoadingPriceId] = useState<string | null>(null);
  /** Active Stripe subscription on monthly Pro or Team price - offer portal to switch to annual */
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
  const [onboardingProfileLoaded, setOnboardingProfileLoaded] = useState(false);
  const [onboardingRequiredExplicit, setOnboardingRequiredExplicit] = useState(false);
  const [onboardingOverlayOpen, setOnboardingOverlayOpen] = useState(false);
  const lastOnboardingHydratedUserIdRef = useRef<string | null>(null);
  const [proFeatureGate, setProFeatureGate] = useState<string | null>(null);
  const [showPostGenProUpsell, setShowPostGenProUpsell] = useState(false);
  const sevenGenToastFiredRef = useRef(false);
  const [premiumHardLimitOpen, setPremiumHardLimitOpen] = useState(false);
  const [hardLimitType, setHardLimitType] = useState<"trial" | "pro_monthly" | "team_monthly">("trial");
  const [scheduledReportsProPaywallOpen, setScheduledReportsProPaywallOpen] = useState(false);
  const [saveTemplateFor, setSaveTemplateFor] = useState<TemplateType | null>(null);
  const [templateNameDraft, setTemplateNameDraft] = useState("");
  const [regenInstruction, setRegenInstruction] = useState<Record<string, string>>({});
  const [regenLoadingFor, setRegenLoadingFor] = useState<string | null>(null);
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);
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
  const [teamMemberCount, setTeamMemberCount] = useState<number | null>(null);
  const [teamMemberRole, setTeamMemberRole] = useState<string | null>(null);
  const [teamDashboardPermission, setTeamDashboardPermission] =
    useState<TeamDashboardPermission>("full");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<
    | "profile"
    | "branding"
    | "signature"
    | "appearance"
    | "privacy"
    | "writing"
    | "outputs"
    | "referrals"
  >("profile");
  const [mainView, setMainView] = useState<
    "generate" | "reports" | "delivery" | "integrations" | "scheduled" | "configuration"
  >("generate");
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
  const [sendingNowId, setSendingNowId] = useState<string | null>(null);
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
      halo_push_outputs?: string[] | null;
      halo_push_excel?: boolean | null;
      halo_push_excel_tabs?: string[] | null;
      halo_push_target?: "all" | "projects" | "tickets" | null;
      post_to_ticket_ids?: number[] | null;
      post_consolidated?: boolean | null;
    }>
  >([]);
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
  const [schEmailPrefs, setSchEmailPrefs] = useState<NormalizedEmailContentPrefs>({
    ...DEFAULT_EMAIL_CONTENT_PREFS,
  });
  const [schAttachExcel, setSchAttachExcel] = useState(true);
  const [schPushToHalo, setSchPushToHalo] = useState(false);
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
  const [reportHistory, setReportHistory] = useState<
    {
      id: string;
      sent_at: string;
      email_to: string | null;
      tickets_processed: number | null;
      clients_covered: string[] | null;
      status: string | null;
      error_message: string | null;
    }[]
  >([]);
  const [reportHistoryLoading, setReportHistoryLoading] = useState(false);
  const [profileFirstName, setProfileFirstName] = useState("");
  const [profileLastName, setProfileLastName] = useState("");
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [profileJobTitle, setProfileJobTitle] = useState("");
  const [profileCompanyName, setProfileCompanyName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [brandColour, setBrandColour] = useState(HANDOVER_BRAND_PRIMARY_HEX);
  const [brandSecondaryColour, setBrandSecondaryColour] = useState(HANDOVER_BRAND_SECONDARY_HEX);
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [brandLogoPreviewKey, setBrandLogoPreviewKey] = useState(0);
  const [brandLogoUploading, setBrandLogoUploading] = useState(false);
  const [brandColourError, setBrandColourError] = useState("");
  const [brandSecondaryColourError, setBrandSecondaryColourError] = useState("");
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const brandPrimaryColorPickerRef = useRef<HTMLInputElement>(null);
  const brandSecondaryColorPickerRef = useRef<HTMLInputElement>(null);
  const [whiteLabelMode, setWhiteLabelMode] = useState(false);
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

  const [signatureOverride, setSignatureOverride] = useState("");
  const [writingStyle, setWritingStyle] = useState("");
  const [compactMode, setCompactMode] = useState(false);
  const [showCharacterCount, setShowCharacterCount] = useState(true);
  const [privacyMode, setPrivacyMode] = useState(false);
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

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark";
    const saved = window.localStorage.getItem("handover-theme");
    return saved === "light" ? "light" : "dark";
  });
  const [heroStat45, setHeroStat45] = useState(0);
  const [heroStat1300, setHeroStat1300] = useState(0);
  const [heroStat30, setHeroStat30] = useState(0);
  const heroStatsRef = useRef<HTMLDivElement | null>(null);
  const [heroStatsVisible, setHeroStatsVisible] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [haloConnected, setHaloConnected] = useState(false);
  const [haloUrl, setHaloUrl] = useState("");
  const [haloUpdatedAt, setHaloUpdatedAt] = useState<string | null>(null);
  const [haloImportedCount, setHaloImportedCount] = useState<number>(0);
  const [haloTestLoading, setHaloTestLoading] = useState(false);
  const [haloAutoClosureSummary, setHaloAutoClosureSummary] = useState(false);
  const [haloAutoClosureSummaryBusy, setHaloAutoClosureSummaryBusy] = useState(false);
  const [haloTenant, setHaloTenant] = useState("");
  const [haloClientId, setHaloClientId] = useState("");
  const [haloClientSecret, setHaloClientSecret] = useState("");
  const [haloError, setHaloError] = useState<string | null>(null);
  const [haloReconnectRecommended, setHaloReconnectRecommended] = useState(false);
  const [haloPermissionWarning, setHaloPermissionWarning] = useState<string | null>(null);
  const [haloLoading, setHaloLoading] = useState(false);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [slackNotificationsEnabled, setSlackNotificationsEnabled] = useState(false);
  const [teamsWebhookUrl, setTeamsWebhookUrl] = useState("");
  const [teamsNotificationsEnabled, setTeamsNotificationsEnabled] = useState(false);
  const [slackWebhookSaveLoading, setSlackWebhookSaveLoading] = useState(false);
  const [teamsWebhookSaveLoading, setTeamsWebhookSaveLoading] = useState(false);
  const [slackWebhookTestLoading, setSlackWebhookTestLoading] = useState(false);
  const [teamsWebhookTestLoading, setTeamsWebhookTestLoading] = useState(false);
  const [haloImportOpen, setHaloImportOpen] = useState(false);
  const [cwImportOpen, setCwImportOpen] = useState(false);
  const [haloHelpOpen, setHaloHelpOpen] = useState(false);
  const [haloConfigOpen, setHaloConfigOpen] = useState(false);
  const [cwConnected, setCwConnected] = useState(false);
  const { data: cachedHaloTickets, mutate: refreshHaloTicketsCache } = useHaloTickets(haloConnected);
  const { data: cachedCwTickets, mutate: refreshCwTicketsCache } = useCwTickets(cwConnected);
  const { data: cachedCwProjects, mutate: refreshCwProjectsCache } = useCwProjects(cwConnected);
  const [cwSiteUrl, setCwSiteUrl] = useState("");
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
  const psaConnections = usePSAConnections({
    halopsa: haloConnected,
    connectwise: cwConnected,
  });
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
  const pushModalPsaLabel =
    psaConnections.multiple || psaConnections.primary === "connectwise"
      ? pushTargetPsa === "connectwise"
        ? "ConnectWise"
        : "HaloPSA"
      : pushPsaLabel;
  const lastPushedPsaLabel =
    lastPushTargetPsa === "connectwise"
      ? "ConnectWise"
      : lastPushTargetPsa === "halopsa"
        ? "HaloPSA"
        : pushPsaLabel;
  useEffect(() => {
    if (!psaConnections.multiple) {
      setSchPushDisplayPsa(
        psaConnections.primary === "connectwise" ? "connectwise" : "halopsa",
      );
      setPushTargetPsa(
        psaConnections.primary === "connectwise" ? "connectwise" : "halopsa",
      );
    }
  }, [psaConnections.multiple, psaConnections.primary]);

  const refreshUsage = useCallback(async (): Promise<number | null> => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUserEmail(null);
      setAuthUserId(null);
      setUserFirstName(null);
      setUserCreatedAt(null);
      setPlan(null);
      setProfileDbPlan(null);
      setTrialEndsAt(null);
      setPlanBadgeReady(false);
      setUserTeamId(null);
      setShowTeamDashboardLink(false);
      setMonthCount(null);
      setTotalGenerationCount(null);
      setGenerationStreak(0);
      setTemplates([]);
      setProjects([]);
      setCollections([]);
      lastOnboardingHydratedUserIdRef.current = null;
      setOnboardingProfileLoaded(true);
      setOnboardingRequiredExplicit(false);
      setOnboardingOverlayOpen(false);
      return null;
    }
    if (lastOnboardingHydratedUserIdRef.current !== user.id) {
      setOnboardingProfileLoaded(false);
    }
    setUserEmail(user.email ?? null);
    setAuthUserId(user.id);
    setUserCreatedAt(typeof user.created_at === "string" ? user.created_at : null);
    setShowSignUpBanner(false);

    const PROFILE_SELECT_FULL =
      "plan, team_id, stripe_customer_id, subscription_status, trial_ends_at, trial_plan, first_name, last_name, display_name, job_title, company_name, brand_name, brand_colour, brand_secondary_colour, brand_logo_url, white_label_mode, signature_override, custom_signoff, writing_style, privacy_mode, compact_mode, show_character_count, output_preferences, total_generations, current_streak, onboarding_completed, referred_by, slack_webhook_url, slack_notifications_enabled, teams_webhook_url, teams_notifications_enabled";
    const PROFILE_SELECT_FALLBACK =
      "plan, team_id, stripe_customer_id, subscription_status, trial_ends_at, trial_plan, first_name, last_name, job_title, company_name, brand_name, brand_colour, brand_secondary_colour, brand_logo_url, white_label_mode, signature_override, custom_signoff, writing_style, privacy_mode, compact_mode, show_character_count, output_preferences, total_generations, current_streak, onboarding_completed, referred_by, slack_webhook_url, slack_notifications_enabled, teams_webhook_url, teams_notifications_enabled";

    let profileRes = await supabase
      .from("profiles")
      .select(PROFILE_SELECT_FULL)
      .eq("id", user.id)
      .maybeSingle();

    if (profileRes.error) {
      console.warn(
        "[refreshUsage] profile select failed (retrying without display_name):",
        profileRes.error.message,
      );
      profileRes = await supabase
        .from("profiles")
        .select(PROFILE_SELECT_FALLBACK)
        .eq("id", user.id)
        .maybeSingle();
      if (profileRes.error) {
        console.error("[refreshUsage] profile fallback failed:", profileRes.error.message);
      }
    }

    const profile = profileRes.data;

    setOnboardingRequiredExplicit(profile?.onboarding_completed === false);
    setOnboardingProfileLoaded(true);
    lastOnboardingHydratedUserIdRef.current = user.id;

    const planFields = planFieldsFromProfileRow(profile);
    const stripeCustRaw =
      typeof profile?.stripe_customer_id === "string"
        ? profile.stripe_customer_id.trim()
        : "";

    if (stripeCustRaw && !hasProTierAccess(planFields)) {
      try {
        const rec = await fetch("/api/profile/reconcile-stripe-plan", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
        });
        if (rec.ok) {
          const j = (await rec.json()) as {
            updated?: boolean;
            plan?: string | null;
            team_id?: string | null;
          };
          if (j.updated) {
            await getUserPlan(supabase, user.id);
          }
        }
      } catch {
        /* ignore reconcile failures */
      }
    }

    const canonical = await getUserPlan(supabase, user.id);
    const tidCanon =
      typeof canonical.team_id === "string" && canonical.team_id.trim()
        ? canonical.team_id.trim()
        : null;
    setUserTeamId(tidCanon);
    setProfileDbPlan(typeof canonical.plan === "string" ? canonical.plan : null);
    setTrialEndsAt(
      typeof canonical.trial_ends_at === "string" && canonical.trial_ends_at.trim()
        ? canonical.trial_ends_at.trim()
        : null,
    );
    setProfileTrialPlan(
      typeof canonical.trial_plan === "string" && canonical.trial_plan.trim()
        ? canonical.trial_plan.trim()
        : null,
    );
    setProfileSubscriptionStatus(
      typeof canonical.subscription_status === "string" && canonical.subscription_status.trim()
        ? canonical.subscription_status.trim()
        : null,
    );
    setPlan(profilePlanToUiTier(canonical));
    setPlanBadgeReady(true);

    let showTeamLink = false;
    try {
      const res = await fetch("/api/user/team-sidebar", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const body = (await res.json()) as { showTeamSidebarLink?: boolean };
      showTeamLink = body.showTeamSidebarLink === true;
    } catch {
      showTeamLink = false;
    }
    setShowTeamDashboardLink(showTeamLink);
    setUserFirstName(
      typeof profile?.first_name === "string" ? profile.first_name : null,
    );
    setProfileFirstName(typeof profile?.first_name === "string" ? profile.first_name : "");
    setProfileLastName(typeof profile?.last_name === "string" ? profile.last_name : "");
    setProfileDisplayName(
      typeof profile?.display_name === "string" ? profile.display_name : "",
    );
    setProfileJobTitle(typeof profile?.job_title === "string" ? profile.job_title : "");
    setProfileCompanyName(typeof profile?.company_name === "string" ? profile.company_name : "");
    setBrandName(typeof profile?.brand_name === "string" ? profile.brand_name : "");
    setBrandColour(
      typeof profile?.brand_colour === "string" && HEX_COLOUR_6.test(profile.brand_colour.trim())
        ? formatHex6Display(profile.brand_colour.trim())
        : HANDOVER_BRAND_PRIMARY_HEX,
    );
    setBrandSecondaryColour(
      typeof profile?.brand_secondary_colour === "string" &&
        HEX_COLOUR_6.test(profile.brand_secondary_colour.trim())
        ? formatHex6Display(profile.brand_secondary_colour.trim())
        : HANDOVER_BRAND_SECONDARY_HEX,
    );
    const logoFromProfile =
      typeof profile?.brand_logo_url === "string" ? profile.brand_logo_url.trim() : "";
    setBrandLogoUrl(logoFromProfile);
    setWhiteLabelMode((profile as { white_label_mode?: boolean })?.white_label_mode === true);
    setSlackWebhookUrl(
      typeof profile?.slack_webhook_url === "string" ? profile.slack_webhook_url : "",
    );
    setSlackNotificationsEnabled(profile?.slack_notifications_enabled === true);
    setTeamsWebhookUrl(
      typeof profile?.teams_webhook_url === "string" ? profile.teams_webhook_url : "",
    );
    setTeamsNotificationsEnabled(profile?.teams_notifications_enabled === true);
    setSignatureOverride(
      typeof profile?.signature_override === "string" && profile.signature_override.trim()
        ? profile.signature_override
        : "",
    );
    setWritingStyle(
      typeof profile?.writing_style === "string" ? profile.writing_style : "",
    );
    setCompactMode(Boolean(profile?.compact_mode));
    setShowCharacterCount(profile?.show_character_count !== false);
    setPrivacyMode(Boolean(profile?.privacy_mode));

    const hydrated = hydrateOutputPrefsFromProfile(profile?.output_preferences);
    setOutputPrefs(hydrated.core);
    setExtendedOutputPrefs(hydrated.extended);

    const [monthRes, totalRes] = await Promise.all([
      supabase
        .from("generations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", startOfMonthUtcIso()),
      supabase
        .from("generations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

    setMonthCount(monthRes.count ?? 0);
    const pg = profile as { total_generations?: number; current_streak?: number } | null;
    if (typeof pg?.current_streak === "number" && pg.current_streak >= 0) {
      setGenerationStreak(pg.current_streak);
    }
    const fromProfile =
      typeof pg?.total_generations === "number" ? pg.total_generations : null;
    const fromTable = totalRes.count ?? 0;
    const total =
      fromProfile !== null ? Math.max(fromProfile, fromTable) : fromTable;
    setTotalGenerationCount(total);
    return total;
  }, []);

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

  const refreshHaloConnection = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setHaloConnected(false);
      setHaloUrl("");
      setHaloPermissionWarning(null);
      setHaloReconnectRecommended(false);
      return;
    }

    try {
      const res = await fetch("/api/halo/connect");
      const data = (await res.json()) as {
        connected?: boolean;
        haloUrl?: string;
        updatedAt?: string | null;
        proRequired?: boolean;
        autoClosureSummaryEnabled?: boolean;
        reconnectRecommended?: boolean;
        connectionCheckFailed?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setHaloConnected(false);
        setHaloReconnectRecommended(true);
        return;
      }
      if (data.proRequired) {
        setHaloConnected(false);
        setHaloUrl("");
        setHaloUpdatedAt(null);
        setHaloPermissionWarning(null);
        setHaloReconnectRecommended(false);
        return;
      }
      const softFail = Boolean(data.reconnectRecommended || data.connectionCheckFailed);
      setHaloReconnectRecommended(softFail);
      setHaloConnected(Boolean(data.connected) && !softFail);
      if (typeof data.haloUrl === "string") {
        setHaloUrl(data.haloUrl);
      } else if (!data.connected && !softFail) {
        setHaloUrl("");
      }
      if (typeof data.updatedAt === "string") {
        setHaloUpdatedAt(data.updatedAt);
      } else if (!data.connected && !softFail) {
        setHaloUpdatedAt(null);
      }
      if (!softFail) {
        setHaloAutoClosureSummary(data.autoClosureSummaryEnabled === true);
      }
      if (!data.connected || softFail) {
        setHaloPermissionWarning(null);
      }
      if (user) {
        const { count } = await supabase
          .from("generations")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .ilike("input_text", "HaloPSA %Export%");
        setHaloImportedCount(count ?? 0);
      }
    } catch {
      setHaloConnected(false);
      setHaloUpdatedAt(null);
      setHaloPermissionWarning(null);
      setHaloReconnectRecommended(true);
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
    [haloAutoClosureSummaryBusy, haloAutoClosureSummary, toast],
  );

  const refreshCwConnection = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setCwConnected(false);
      setCwSiteUrl("");
      invalidatePsaConnectionsCache();
      return;
    }
    try {
      const res = await fetch("/api/cw/connect");
      const data = (await res.json()) as {
        connected?: boolean;
        siteUrl?: string;
      };
      setCwConnected(Boolean(data.connected));
      setCwSiteUrl(typeof data.siteUrl === "string" ? data.siteUrl : "");
      invalidatePsaConnectionsCache();
    } catch {
      setCwConnected(false);
      setCwSiteUrl("");
      invalidatePsaConnectionsCache();
    }
  }, []);

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
        return;
      }

      const profileRow = await getUserPlan(supabase, user.id);
      const isPro = hasProTierAccess(profileRow);
      const accountCreated = new Date(user.created_at ?? Date.now());
      const daysSinceCreation =
        (Date.now() - accountCreated.getTime()) / (1000 * 60 * 60 * 24);
      const pageSize = isPro ? 50 : daysSinceCreation < 14 ? 100 : 10;

      const { data, error } = await supabase
        .from("generations")
        .select(
          "id, project_name, title, collection_id, input_text, output_json, created_at, source, scheduled_report_id",
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
    },
    [],
  );

  const refreshHistory = useCallback(async () => {
    await fetchProjects(0, false);
  }, [fetchProjects]);

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

  const activeClientEmailBody = useMemo(() => {
    if (!result) return "";
    const max = Math.max(0, clientEmailSections.length - 1);
    const idx = Math.min(activeClientEmailIndex, max);
    const s = clientEmailSections[idx];
    return (s?.content ?? result.client_email ?? "").trim();
  }, [result, clientEmailSections, activeClientEmailIndex]);

  const trialInfo = useMemo(() => {
    if (!userEmail || hasProAccess || !userCreatedAt) return null;
    const accountCreated = new Date(userCreatedAt);
    const daysSinceCreation =
      (Date.now() - accountCreated.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation >= 14) return null;
    const trialEndMs = accountCreated.getTime() + 14 * 24 * 60 * 60 * 1000;
    const used = projects.filter((p) => {
      const t = new Date(p.created_at).getTime();
      return t >= accountCreated.getTime() && t <= trialEndMs;
    }).length;
    const trialEnd = new Date(trialEndMs);
    return {
      active: true as const,
      used,
      remaining: Math.max(0, 10 - used),
      endsAt: trialEnd.toISOString(),
    };
  }, [userEmail, hasProAccess, userCreatedAt, projects]);

  const freeGenUsage = useMemo(() => {
    if (!userEmail || hasProAccess) return null;
    if (!userCreatedAt) return null;
    const accountCreated = new Date(userCreatedAt);
    const daysSinceCreation =
      (Date.now() - accountCreated.getTime()) / (1000 * 60 * 60 * 24);
    const inTrial = daysSinceCreation < 14;
    const used = inTrial ? (totalGenerationCount ?? 0) : (monthCount ?? 0);
    return { used, cap: 10 as const, inTrial };
  }, [userEmail, hasProAccess, userCreatedAt, totalGenerationCount, monthCount]);

  useEffect(() => {
    sevenGenToastFiredRef.current = false;
  }, [authUserId]);

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
        "You’re using your included monthly generations quickly. Upgrade to Pro for 200 generations, HaloPSA, scheduled reports, and the full delivery dashboard.",
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
    if (mainView === "delivery" || mainView === "scheduled") {
      setMainView("generate");
    }
  }, [userEmail, hasProAccess, mainView]);

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
    const lastTitle = last
      ? last.project_name?.trim() ||
        (last.input_text || "").trim().slice(0, 48) ||
        "Untitled"
      : "-";
    return {
      total: totalLifetime,
      thisMonth,
      monthName: now.toLocaleString("en-GB", { month: "long" }),
      lastAgo: last ? relativeTimeLabel(last.created_at) : "-",
      lastTitle:
        lastTitle.length > 40 ? `${lastTitle.slice(0, 40)}…` : lastTitle,
    };
  }, [userEmail, projects, monthCount, totalGenerationCount]);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    if (userEmail) {
      setHeroStat45(4);
      setHeroStat1300(1400);
      setHeroStat30(30);
      return;
    }
    if (!mounted || !heroStatsVisible) return;
    setHeroStat45(0);
    setHeroStat1300(0);
    setHeroStat30(0);
    animateValue(0, 4, 1200, setHeroStat45);
    animateValue(0, 1400, 1500, setHeroStat1300);
    animateValue(0, 30, 1000, setHeroStat30);
  }, [userEmail, mounted, heroStatsVisible]);

  useEffect(() => {
    if (userEmail || !mounted) return;
    setHeroStatsVisible(true);
  }, [userEmail, mounted]);

  useEffect(() => {
    if (userEmail || !mounted || !heroStatsRef.current) return;
    const node = heroStatsRef.current;
    const rect = node.getBoundingClientRect();
    const inViewNow = rect.top < window.innerHeight && rect.bottom > 0;
    if (inViewNow) {
      setHeroStatsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setHeroStatsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [userEmail, mounted]);

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
    if (userEmail && authChecked) {
      document.body.setAttribute("data-app-shell", "true");
    } else {
      document.body.removeAttribute("data-app-shell");
    }
    return () => {
      document.body.removeAttribute("data-app-shell");
    };
  }, [userEmail, authChecked]);

  useEffect(() => {
    if (!authChecked || !userEmail) return;
    if (profileDbPlan === "free" && !trialEndsAt) {
      router.push("/welcome");
    }
  }, [authChecked, userEmail, profileDbPlan, trialEndsAt, router]);

  useEffect(() => {
    const supabase = createClient();
    void refreshUsage();
    void refreshTemplates();
    void fetchProjects();
    void refreshCollections();
    setIntegrationsBootstrapping(true);
    void Promise.all([refreshHaloConnection(), refreshCwConnection()])
      .catch(() => {})
      .finally(() => setIntegrationsBootstrapping(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshUsage();
      void refreshTemplates();
      void fetchProjects();
      void refreshCollections();
      setIntegrationsBootstrapping(true);
      void Promise.all([refreshHaloConnection(), refreshCwConnection()])
        .catch(() => {})
        .finally(() => setIntegrationsBootstrapping(false));
    });

    return () => subscription.unsubscribe();
  }, [
    refreshUsage,
    refreshTemplates,
    fetchProjects,
    refreshCollections,
    refreshHaloConnection,
    refreshCwConnection,
  ]);

  useEffect(() => {
    const onReload = () => {
      void refreshUsage();
    };
    window.addEventListener("handover:profile-reload", onReload);
    return () => window.removeEventListener("handover:profile-reload", onReload);
  }, [refreshUsage]);

  useEffect(() => {
    if (!isGenerating) {
      setGenerationLongWait(false);
      return;
    }
    const t = window.setTimeout(() => setGenerationLongWait(true), 5000);
    return () => clearTimeout(t);
  }, [isGenerating]);

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
    setOnboardingOverlayOpen(true);
  }, [userEmail, onboardingProfileLoaded, onboardingRequiredExplicit, totalGenerationCount]);

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
    })();
  }, [toast, userEmail]);

  useEffect(() => {
    const saved = window.localStorage.getItem("handover-theme");
    const initial = saved === "light" ? "light" : "dark";
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

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
    if (!settingsOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSettingsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [settingsOpen]);

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
    const params = new URLSearchParams(window.location.search);
    const openSettingsValue = params.get("openSettings");
    if (openSettingsValue) {
      setSettingsOpen(true);
      if (openSettingsValue === "referrals") {
        setSettingsTab("referrals");
      }
      if (openSettingsValue === "integrations") {
        setMainView("integrations");
        if (params.get("cw") === "1") {
          setIntegrationsInitialDetail("connectwise");
        }
      }
      router.replace("/", { scroll: false });
      return undefined;
    }
    if (params.get("openHaloImport") === "1") {
      void (async () => {
        const supabase = createClient();
        const {
          data: { user: u },
        } = await supabase.auth.getUser();
        if (u) {
          const prof = await getUserPlan(supabase, u.id);
          if (hasProTierAccess(prof))
            setHaloImportOpen(true);
          else setHaloProModalOpen(true);
        }
        router.replace("/", { scroll: false });
      })();
      return undefined;
    }
    if (params.get("success") === "true") {
      setShowSuccessBanner(true);
      router.replace("/", { scroll: false });
      void refreshUsage();
      const t = window.setTimeout(() => void refreshUsage(), 2500);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [router, refreshUsage]);

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

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    setUserEmail(null);
    setUserFirstName(null);
    setPlan(null);
    setProfileDbPlan(null);
    setPlanBadgeReady(false);
    setUserTeamId(null);
    setShowTeamDashboardLink(false);
    setMonthCount(null);
    setTotalGenerationCount(null);
    setGenerationStreak(0);
    setProjects([]);
    setProjectsOffset(0);
    setHasMoreProjects(false);
    setResult(null);
    setInput("");
    setProjectName("");
    setUserCreatedAt(null);
    setMainView("generate");
    setSelectedProjectId(null);
    try {
      window.localStorage.removeItem("handover-pending-profile");
    } catch {
      /* ignore */
    }
    window.location.href = "/";
  };

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
      if (lastImportedHaloItems.length === 0) {
        toast({
          variant: "error",
          message: `Import ${pushPsaLabel} tickets first`,
          subtitle: `Push-back needs imported ${pushPsaLabel} tickets for this generation.`,
        });
        return;
      }
      const ids = lastImportedHaloItems.map((t) => t.id);
      setPushSelectedTicketIds(ids);
      setPushSelectedOutputs(
        presetOutputs && presetOutputs.length > 0
          ? presetOutputs
          : ["summary", "actions", "risks"],
      );
      if (targetPsa) setPushTargetPsa(targetPsa);
      setPushErrors([]);
      setPushModalOpen(true);
    },
    [lastImportedHaloItems, result, toast, hasProAccess, tryOpenProFeatureGate, pushPsaLabel],
  );

  const handlePushToHalo = useCallback(
    (tabName: "client_email" | "actions" | "risks" | "summary" | "status_report") => {
      openPushModal([tabName]);
    },
    [openPushModal],
  );
  const renderPushActionTrigger = useCallback(
    (tabName: "client_email" | "actions" | "risks" | "summary" | "status_report") => {
      if (!psaConnections.primary) return null;
      if (psaConnections.multiple) {
        return (
          <details className="relative">
            <summary
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: 500,
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                background: "transparent",
                color: "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 0.15s",
                listStyle: "none",
              }}
            >
              ↑ Push to PSA
              <ChevronDown className="size-3" />
            </summary>
            <div className="absolute right-0 z-30 mt-1 min-w-[170px] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] p-1 shadow-lg">
              <button
                type="button"
                className="block w-full rounded px-2 py-1.5 text-left text-[12px] hover:bg-[var(--bg-secondary)]"
                onClick={() => openPushModal([tabName], "halopsa")}
              >
                HaloPSA
              </button>
              <button
                type="button"
                className="block w-full rounded px-2 py-1.5 text-left text-[12px] hover:bg-[var(--bg-secondary)]"
                onClick={() => openPushModal([tabName], "connectwise")}
              >
                ConnectWise
              </button>
            </div>
          </details>
        );
      }
      return (
        <button
          type="button"
          onClick={() => handlePushToHalo(tabName)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            fontSize: "12px",
            fontWeight: 500,
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            background: "transparent",
            color: "var(--text-secondary)",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          {`↑ Push to ${pushPsaLabel}`}
        </button>
      );
    },
    [handlePushToHalo, openPushModal, psaConnections.multiple, psaConnections.primary, pushPsaLabel],
  );

  const executePushToHalo = useCallback(async () => {
    if (!result || pushSelectedTicketIds.length === 0 || pushSelectedOutputs.length === 0) return;
    if (pushInFlightRef.current || pushLoading) return;
    pushInFlightRef.current = true;
    const effectivePushTarget =
      psaConnections.multiple
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
      if ((data.failed ?? 0) === 0) {
        setPushModalOpen(false);
        toast({
          message: `Pushed to ${pushLabel} - posted to ${data.posted ?? 0} tickets`,
          variant: "success",
        });
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
    result,
    selectedProjectId,
    toast,
    flushAchievementToasts,
    psaConnections.multiple,
    psaConnections.primary,
    pushTargetPsa,
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

  const handleFullReportExcelExport = useCallback(async () => {
    try {
      console.log("[excel] Starting export");
      if (!hasProAccess) {
        tryOpenProFeatureGate("Full report pack (Excel export)");
        return;
      }
      if (!result) {
        console.error("[excel] No outputs");
        toast({
          message: "No data to export",
          variant: "error",
          durationMs: 4000,
        });
        return;
      }
      console.log(
        "[excel] outputs variable:",
        typeof result,
        result ? Object.keys(result) : "null",
      );
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
      console.log("[excel] outputs type:", typeof outputs);
      console.log("[excel] outputs keys:", Object.keys(outputs ?? {}));
      console.log(
        "[excel] Full outputs keys:",
        JSON.stringify(Object.keys(outputs), null, 2),
      );
      console.log("[excel] actions:", outputs.actions?.length);
      console.log("[excel] risks:", outputs.risks?.length);
      console.log("[excel] summary:", outputs.summary?.length);
      console.log("[excel] actions value type:", typeof outputs.actions);
      console.log(
        "[excel] actions sample:",
        JSON.stringify(outputs.actions)?.substring(0, 200),
      );
      Object.entries(outputs).forEach(([key, val]) => {
        console.log(
          `[excel] ${key}:`,
          typeof val,
          Array.isArray(val)
            ? `array(${val.length})`
            : typeof val === "string"
              ? `string(${val.length})`
              : JSON.stringify(val)?.substring(0, 50),
        );
      });
      console.log("[excel] Calling export with:", {
        projectName: safeProjectName,
        actionsCount: safeResult.actions.length,
        risksCount: safeResult.risks.length,
        selectedTabs: exportFullTabs,
        hasBranding: true,
      });
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
      await exportToExcel(safeResult, safeProjectName, {
        selectedTabs: exportFullTabs ?? [],
        actionColumns: exportFullActionCols ?? [],
        riskColumns: exportFullRiskCols ?? [],
        clientName: safeResult.actions?.[0]?.client_name || null,
        projectName: safeProjectName || null,
        brandName: brandName.trim() || null,
        brandColor: brandColour || null,
        brandSecondaryColor: brandSecondaryColour || null,
        brandLogoUrl: logoForExport,
        whiteLabelMode: partnerWhiteLabelActive({
          plan: plan ?? "free",
          white_label_mode: whiteLabelMode,
          brand_name: brandName,
        }),
        actionSourceColumn: buildActionSourceColumnForExport(safeResult.actions, titlesForExport),
        riskSourceColumn: buildRiskSourceColumnForExport(safeResult.risks, titlesForExport),
        ...buildActionExportMeta(safeProjectName, safeResult.actions),
      });
      console.log("[excel] Export completed");
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
      setExportMenuOpen(false);
      setExportSubPanel(null);
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      console.error("[excel] Export error:", e.message);
      console.error("[excel] Stack:", e.stack);
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
    plan,
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
        router.push("/pricing?upgrade=true");
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
      if (gate.hasStripeCustomer && !checkoutHasActiveSoloTrial) {
        await openBillingPortal("/");
        return;
      }
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          priceId,
          ...(checkoutHasActiveSoloTrial ? { hasActiveTrial: true } : {}),
        }),
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
          tone: outputType === "client_email" ? emailTone : "professional",
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

  const handleToneRewrite = useCallback(
    async (newTone: Tone) => {
      if (!userEmail) return;
      if (toneRewriteBusyRef.current) return;
      if (!lastInput.trim()) return;

      toneRewriteBusyRef.current = true;
      rewriteEmailSeqRef.current += 1;
      const seq = rewriteEmailSeqRef.current;
      setIsRewritingEmail(true);
      try {
        const selectedOutputs = MODAL_OUTPUT_KEYS.filter((k) => outputPrefs[k]);
        const extendedOutputKeys = EXTENDED_PM_TAB_KEYS.filter(
          (k) => extendedOutputPrefs[k],
        );
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: lastInput,
            tone: newTone,
            projectName,
            rewriteEmailOnly: true,
            outputPreferences: { enabledTabs: selectedOutputs },
            extendedOutputKeys,
            privacyMode,
            clientContactName: outputPrefs.client_email
              ? clientContactName.trim() || null
              : null,
            clientContactEmail: outputPrefs.client_email
              ? clientContactEmail.trim() || null
              : null,
          }),
        });
        const data: unknown = await res.json();
        if (seq !== rewriteEmailSeqRef.current) return;

        if (!res.ok) {
          const d = data as { error?: string; details?: string };
          const msg =
            typeof d.details === "string" && d.details.trim()
              ? d.details
              : typeof d.error === "string"
                ? d.error
                : "Could not rewrite email.";
          console.error("Tone rewrite failed:", msg);
          toast({
            message: msg,
            variant: "error",
            durationMs: 4000,
          });
          return;
        }

        const rec = data as { client_email?: unknown };
        if (typeof rec.client_email === "string" && rec.client_email.trim()) {
          setResult((prev) =>
            prev
              ? {
                  ...prev,
                  client_email: stripClientEmailSeparatorLines(rec.client_email as string),
                }
              : prev,
          );
          setLastGeneratedTone(newTone);
        }
      } catch (err) {
        console.error("Tone rewrite failed:", err);
        toast({
          message: "Tone rewrite failed. Please try again.",
          variant: "error",
          durationMs: 4000,
        });
      } finally {
        toneRewriteBusyRef.current = false;
        if (seq === rewriteEmailSeqRef.current) {
          setIsRewritingEmail(false);
        }
      }
    },
    [
      userEmail,
      lastInput,
      projectName,
      outputPrefs,
      extendedOutputPrefs,
      privacyMode,
      clientContactName,
      clientContactEmail,
    ],
  );

  const handleToneRewriteRef = useRef(handleToneRewrite);
  handleToneRewriteRef.current = handleToneRewrite;

  useEffect(() => {
    if (!userEmail) return;
    if (!result || !lastInput.trim()) return;
    if (emailTone === lastGeneratedTone) return;
    void handleToneRewriteRef.current(emailTone);
  }, [emailTone, lastGeneratedTone, result, lastInput, userEmail]);

  const scheduleTicketRange = useMemo(
    () => ({
      from: getDateRangeStartIso(schDateRange),
      to: getDateRangeEndIso(),
    }),
    [schDateRange],
  );

  const ticketClientOptions = useMemo(() => {
    if (scheduleLoading || allClients.length === 0) return [];
    const q = ticketClientSearch.trim().toLowerCase();
    return [...allClients]
      .filter((c) => !q || c.name.toLowerCase().includes(q))
      .filter((c) => allTickets.some((t) => Number(t.clientId ?? t.client_id) === c.id))
      .sort((a, b) => {
        const aCount = allTickets.filter((t) => Number(t.clientId ?? t.client_id) === a.id).length;
        const bCount = allTickets.filter((t) => Number(t.clientId ?? t.client_id) === b.id).length;
        return bCount - aCount || a.name.localeCompare(b.name);
      });
  }, [scheduleLoading, allClients, ticketClientSearch, allTickets]);

  const projectClientOptions = useMemo(() => {
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
  }, [scheduleLoading, allClients, projectClientSearch, allProjects]);

  const upcomingRuns = useMemo(() => {
    return [...campaigns]
      .filter((c) => c.enabled && !!c.next_run_at)
      .sort((a, b) => {
        const at = Date.parse(a.next_run_at ?? "");
        const bt = Date.parse(b.next_run_at ?? "");
        return at - bt;
      })
      .slice(0, 8);
  }, [campaigns]);

  const getTicketCountForClient = useCallback(
    (clientId: number, source: Array<Record<string, unknown>>) =>
      source.filter((t) => Number(t.clientId ?? t.client_id) === clientId).length,
    [],
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
      const fetches: Promise<Response>[] = [];
      fetches.push(fetch("/api/halo/clients?page=1&page_size=200"));
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
    haloConnected,
    refreshCwProjectsCache,
    refreshCwTicketsCache,
    refreshHaloTicketsCache,
  ]);

  useEffect(() => {
    if (!scheduleEditorOpen) return;
    if (schCampaignEditorTab !== 2) return;
    if (dataLoaded || dataLoading) return;
    void loadAllScheduleData();
  }, [scheduleEditorOpen, schCampaignEditorTab, dataLoaded, dataLoading, loadAllScheduleData]);

  const scheduleDataLoadedPrevRef = useRef(false);
  useEffect(() => {
    if (!scheduleEditorOpen) scheduleDataLoadedPrevRef.current = false;
  }, [scheduleEditorOpen]);

  useEffect(() => {
    if (!scheduleEditorOpen || schCampaignEditorTab !== 2) return;
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
          const has = selectedTicketIds.some((tid) => {
            const t = allTickets.find((x) => Number(x.id) === tid);
            return (
              Number(t?.clientId ?? (t as Record<string, unknown> | undefined)?.client_id) ===
              cid
            );
          });
          if (has) next.add(cid);
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
          const has = selectedProjectIds.some((pid) => {
            const t = allProjects.find((x) => Number(x.id) === pid);
            return (
              Number(t?.clientId ?? (t as Record<string, unknown> | undefined)?.client_id) ===
              cid
            );
          });
          if (has) next.add(cid);
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
    let cancelled = false;
    setReportHistoryLoading(true);
    void (async () => {
      try {
        const res = await fetch("/api/scheduled-report-history");
        const data = (await res.json()) as {
          history?: {
            id: string;
            sent_at: string;
            email_to: string | null;
            tickets_processed: number | null;
            clients_covered: string[] | null;
            status: string | null;
            error_message: string | null;
          }[];
        };
        if (!cancelled) {
          setReportHistory(Array.isArray(data.history) ? data.history : []);
        }
      } catch {
        if (!cancelled) setReportHistory([]);
      } finally {
        if (!cancelled) setReportHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mainView, userEmail]);

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
    setSchBrandName("");
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
    setSchHaloPushOutputs(["client_email", "actions", "risks"]);
    setSchHaloPushExcel(false);
    setSchHaloPushExcelTabs([]);
    setSchPostToTicketIds([]);
    setSchPostConsolidated(false);
    postTicketSelectionTouchedRef.current = false;
    setScheduleEditorOpen(true);
  }, [userEmail, hasProAccess]);

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
          : c.report_type === "qbr"
            ? "qbr"
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
    setSchBrandName(typeof c.brand_name === "string" ? c.brand_name : "");
    setSchEmailTone(normalizeSchEmailTone(c.email_tone));
    setSchPushToHalo(c.push_to_halo === true);
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

  const openEditScheduleEditor = (c: (typeof campaigns)[number]) => {
    loadCampaignIntoEditor(c);
    setScheduleEditorIsNew(false);
    setScheduleEditorOpen(true);
  };

  const refreshCampaigns = async () => {
    try {
      const res = await fetch("/api/scheduled-reports");
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
    } catch {
      setCampaigns([]);
      return [];
    }
  };

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
        body: JSON.stringify({
          schedule_id: c.id,
          enabled,
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
            c.excel_tabs ??
            [...SCHEDULE_EXCEL_CORE_KEYS, ...SCHEDULE_EXCEL_OPTIONAL_TAB_KEYS],
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
      });
      const data = (await res.json()) as { schedule?: typeof c; error?: string };
      if (!res.ok) throw new Error(data.error || "Could not update schedule");
    } catch (e) {
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

  const createNewSchedule = () => {
    if (!userEmail) return;
    openNewScheduleEditor();
  };

  useEffect(() => {
    if (mainView !== "scheduled") return;
    if (!userEmail) return;
    let cancelled = false;
    (async () => {
      setScheduleLoading(true);
      setHaloClientsScheduleLoading(true);
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
              : row.report_type === "qbr"
                ? "qbr"
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
          setSchBrandName(typeof row.brand_name === "string" ? row.brand_name : "");
          setSchEmailTone(normalizeSchEmailTone(row.email_tone));
          setSchPushToHalo(row.push_to_halo === true);
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
          setSchBrandName("");
          setSchEmailTone("professional");
          setSchPushToHalo(false);
          setSchHaloPushOutputs(["client_email", "actions", "risks"]);
          setSchHaloPushExcel(false);
          setSchHaloPushExcelTabs([]);
          setSchPostToTicketIds([]);
          setSchPostConsolidated(false);
          postTicketSelectionTouchedRef.current = false;
        }

        try {
          const pageSize = 100;
          const allClients: { id: number; name: string }[] = [];
          let page = 1;
          let hasMore = true;
          while (!cancelled && hasMore && page <= 20) {
            const cres = await fetch(
              `/api/halo/clients?page=${page}&page_size=${pageSize}`,
            );
            const cj = (await cres.json()) as {
              clients?: { id: number; name: string }[];
              hasMore?: boolean;
              error?: string;
            };
            if (!cres.ok) break;
            const batch = cj.clients ?? [];
            allClients.push(...batch);
            if (cj.hasMore === false || batch.length < pageSize) hasMore = false;
            else page += 1;
          }
          if (!cancelled) setHaloClientsForSchedule(allClients);
        } catch {
          if (!cancelled) setHaloClientsForSchedule([]);
        }
      } catch {
        if (!cancelled) setHaloClientsForSchedule([]);
      } finally {
        if (!cancelled) {
          setScheduleLoading(false);
          setHaloClientsScheduleLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mainView, userEmail, flushAchievementToasts]);

  useEffect(() => {
    if (mainView !== "scheduled") return;
    if (schReportType !== "note_to_self") return;
    if (!userEmail) return;
    setSchEmail(userEmail);
  }, [mainView, schReportType, userEmail]);

  const saveScheduledReport = async () => {
    if (!userEmail) return;
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
      void refreshCampaigns();
      toast({
        message: `Schedule created - first report sends on ${formatScheduleTs(
          data.schedule?.next_run_at ?? null,
        )}`,
        durationMs: 2500,
      });
      setScheduleEditorOpen(false);
      void (async () => {
        try {
          const hres = await fetch("/api/scheduled-report-history");
          const hd = (await hres.json()) as {
            history?: typeof reportHistory;
          };
          if (Array.isArray(hd.history)) setReportHistory(hd.history);
        } catch {
          /* ignore */
        }
      })();
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
    [schCampaignId, selectedSchedule?.id, scheduleRow?.id, toast],
  );

  const openScheduleEmailPreview = useCallback(() => {
    void loadScheduleEmailPreview({ openDialog: true });
  }, [loadScheduleEmailPreview]);

  const refreshScheduleEmailPreview = useCallback(() => {
    void loadScheduleEmailPreview({ forceRefresh: true, openDialog: true });
  }, [loadScheduleEmailPreview]);

  useEffect(() => {
    if (!scheduleEditorOpen) return;
    if (schCampaignEditorTab !== 3 && schCampaignEditorTab !== 4) return;
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

  const triggerScheduleNow = async (scheduleId: string) => {
    setSendingNowId(scheduleId);
    setScheduleSaving(true);
    try {
      const res = await fetch("/api/cron/trigger-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId }),
      });
      const data = (await res.json()) as {
        error?: string;
        results?: Array<{ success: boolean; error?: string }>;
      };
      if (!res.ok) throw new Error(data.error || "Could not trigger schedule");
      const first = data.results?.[0];
      if (first?.success) {
        toast({ message: "Report sent successfully", durationMs: 2500 });
      } else {
        toast({
          message: "Failed to send report — please try again",
          variant: "error",
          durationMs: 4500,
        });
      }
      await refreshCampaigns();
    } catch (e) {
      toast({
        message: "Failed to send report — please try again",
        variant: "error",
        durationMs: 4000,
      });
    } finally {
      setScheduleSaving(false);
      setSendingNowId(null);
    }
  };

  const handleSelectProject = (project: ProjectItem) => {
    setMainView("generate");
    setSelectedProjectId(project.id);
    setProjectName(project.project_name ?? "");
    setInput(project.input_text ?? "");
    setGenerationMailtoEmail(null);
    if (project.output_json) {
      setResult(parseApiGenerateResult(project.output_json));
    }
    setLastGeneratedTone(emailTone);
    setSidebarOpenMobile(false);
  };

  const handleNewGeneration = () => {
    setMainView("generate");
    setSelectedProjectId(null);
    setInput("");
    setProjectName("");
    setClientContactName("");
    setClientContactEmail("");
    setGenerationMailtoEmail(null);
    setResult(null);
    setError(null);
    setEditingField(null);
    setEditingActionRow(null);
    setEditingRiskRow(null);
    setLastInput("");
    setLastGeneratedTone(emailTone);
  };

  const markOnboardingComplete = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
    setOnboardingRequiredExplicit(false);
    setOnboardingOverlayOpen(false);
  }, []);

  const saveOnboardingProfileStep = useCallback(async (): Promise<boolean> => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        first_name: profileFirstName.trim() || null,
        last_name: profileLastName.trim() || null,
        display_name: profileDisplayName.trim() || null,
        job_title: profileJobTitle.trim() || null,
        company_name: profileCompanyName.trim() || null,
        signature_override: signatureOverride.trim() || null,
      },
      { onConflict: "id" },
    );
    if (error) {
      toast({ message: "Could not save profile", variant: "error", durationMs: 4000 });
      return false;
    }
    return true;
  }, [
    profileFirstName,
    profileLastName,
    profileDisplayName,
    profileJobTitle,
    profileCompanyName,
    signatureOverride,
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
          message: payload.error ?? "White label requires Enterprise.",
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
    await refreshUsage();
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
    await refreshUsage();
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
    await refreshUsage();
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
    await refreshUsage();
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
    void refreshUsage();
  };

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
    toast({ message: "Output preferences saved", durationMs: 2000 });
    void refreshUsage();
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
          haloUrl: haloUrl.trim(),
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
      setHaloConnected(true);
      setHaloReconnectRecommended(false);
      setHaloPermissionWarning(
        Array.isArray(data.warnings) && data.warnings.length > 0
          ? data.warnings[0]
          : null,
      );
      setHaloClientSecret("");
      toast({ message: "HaloPSA connected", durationMs: 3000 });
      void refreshHaloConnection();
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
      setHaloConnected(false);
      setHaloReconnectRecommended(false);
      setHaloClientSecret("");
      setHaloPermissionWarning(null);
      setHaloAutoClosureSummary(false);
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
    else toast({ message: "Slack notifications updated", durationMs: 2000 });
  };

  const handleTeamsNotificationsToggle = async (enabled: boolean) => {
    const prev = teamsNotificationsEnabled;
    setTeamsNotificationsEnabled(enabled);
    const ok = await patchNotificationWebhooks({ teams_notifications_enabled: enabled });
    if (!ok) setTeamsNotificationsEnabled(prev);
    else toast({ message: "Teams notifications updated", durationMs: 2000 });
  };

  const handleSaveSlackWebhook = async () => {
    if (slackWebhookSaveLoading) return;
    setSlackWebhookSaveLoading(true);
    try {
      const ok = await patchNotificationWebhooks({ slack_webhook_url: slackWebhookUrl.trim() });
      if (ok) toast({ message: "Slack webhook saved", durationMs: 2000 });
    } finally {
      setSlackWebhookSaveLoading(false);
    }
  };

  const handleSaveTeamsWebhook = async () => {
    if (teamsWebhookSaveLoading) return;
    setTeamsWebhookSaveLoading(true);
    try {
      const ok = await patchNotificationWebhooks({ teams_webhook_url: teamsWebhookUrl.trim() });
      if (ok) toast({ message: "Teams webhook saved", durationMs: 2000 });
    } finally {
      setTeamsWebhookSaveLoading(false);
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
      void refreshCwConnection();
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
      setCwConnected(false);
      setCwSiteUrl("");
      setCwPrivateKeyInput("");
      toast({ message: "ConnectWise disconnected", durationMs: 3000 });
      void refreshCwConnection();
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

  const openGenerateOptionsModal = async () => {
    const trimmed = input.trim();
    const effectiveInput = trimmed || lastInput.trim();
    if (!trimmed || isGenerating) return;

    const supabase = createClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      if (trimmed === EXAMPLE_INPUT.trim()) {
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

    setGenerateOptionsOpen(true);
  };

  const executeGenerate = async (selection: Record<ModalOutputKey, boolean>) => {
    const trimmed = input.trim();
    const effectiveInput = trimmed || lastInput.trim();
    if (isGenerating) return;
    if (!effectiveInput || effectiveInput.length < 10) {
      toast({
        message: "Please add some content before generating",
        variant: "error",
        durationMs: 4000,
      });
      return;
    }
    console.log("[generate] Input preview:", effectiveInput.substring(0, 200));
    console.log("[generate] Input length:", effectiveInput.length);

    if (!userEmail) {
      setGenerateOptionsOpen(false);
      if (effectiveInput === EXAMPLE_INPUT.trim()) {
        setDemoTab("actions");
        setDemoModalOpen(true);
      } else {
        setLockedTeaserTab("actions");
        setLockedTeaserOpen(true);
      }
      return;
    }

    if (freeGenUsage && freeGenUsage.used >= freeGenUsage.cap) {
      setGenerateOptionsOpen(false);
      setHardLimitType("trial");
      setPremiumHardLimitOpen(true);
      return;
    }

    const selectedOutputs = MODAL_OUTPUT_KEYS.filter((k) => selection[k]);
    if (selectedOutputs.length === 0) return;

    const extendedOutputKeys = EXTENDED_PM_TAB_KEYS.filter((k) => extendedOutputPrefs[k]);
    const toneAtRun = emailTone;

    saveOutputPrefs(selection);
    setGenerateOptionsOpen(false);

    const clientContactNameForApi = selection.client_email
      ? clientContactName.trim() || null
      : null;
    const clientContactEmailForApi = selection.client_email
      ? clientContactEmail.trim() || null
      : null;

    const supabase = createClient();
    const totalGensBeforeRun = totalGenerationCount ?? 0;
    setIsGenerating(true);
    setError(null);
    setShowSignUpBanner(false);

    try {
      if (effectiveInput.length > 15000) {
        setGenerationPhase("compacting");
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, 1600);
        });
      }
      setGenerationPhase("generating");

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: effectiveInput,
          projectName,
          templateContext: nextTemplateContext,
          selectedOutputs,
          outputPreferences: {
            enabledTabs: selectedOutputs,
          },
          extendedOutputKeys,
          tone: toneAtRun,
          privacyMode,
          clientContactName: clientContactNameForApi,
          clientContactEmail: clientContactEmailForApi,
        }),
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

      const outputSubtitle = MODAL_OUTPUT_KEYS.filter((k) => selection[k])
        .map((k) => OUTPUT_KEY_LABELS[k])
        .join(", ");
      setGenerationToastSubtitle(outputSubtitle);
      setGenerationToastOpen(true);
      setLastInput(effectiveInput);
      setLastGeneratedTone(toneAtRun);
      if (userEmail && !hasProAccess && !readUpgradePromptConsumed()) {
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
      const newTotal = await refreshUsage();
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
      setIsGenerating(false);
    }
  };

  const charCount = input.length;
  const inputCounterColor =
    charCount > 15000
      ? "#CA8A04"
      : charCount > 10000
        ? "#BA7517"
        : "color-mix(in srgb, var(--success) 28%, var(--text-muted))";
  const generationProgressLabel =
    isGenerating && generationPhase === "compacting"
      ? "Compacting..."
      : isGenerating && generationLongWait
        ? "Still working…"
        : isGenerating
          ? "Generating…"
          : "";
  const selectedGenCount = MODAL_OUTPUT_KEYS.filter((k) => outputPrefs[k]).length;

  const showFirstGenOnboardingTip =
    Boolean(userEmail) &&
    firstGenTipDismissed === false &&
    totalGenerationCount === 1;

  const visibleCoreTabsList = useMemo(() => {
    if (!result) return [...MODAL_OUTPUT_KEYS];
    return visibleCoreTabsForResult(result);
  }, [result]);

  const visibleExtendedTabsList = useMemo(() => {
    if (!result) return [];
    return visibleExtendedTabsForResult(result);
  }, [result]);

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
    const all: string[] = [...visibleCoreTabsList, ...visibleExtendedTabsList];
    if (all.length === 0) return;
    if (!all.includes(outputMainTab)) {
      setOutputMainTab(all[0]!);
    }
  }, [result, visibleCoreTabsList, visibleExtendedTabsList, outputMainTab]);

  const filteredHistoryProjects = useMemo(() => {
    let filtered = projects;
    if (selectedHistoryCollectionId !== null) {
      filtered = filtered.filter((p) => p.collection_id === selectedHistoryCollectionId);
    }
    return filtered;
  }, [projects, selectedHistoryCollectionId]);

  const hasEnabledSchedule = useMemo(
    () => campaigns.some((c) => c.enabled === true),
    [campaigns],
  );

  const isTeamPlan = plan === "team";

  useEffect(() => {
    if (!userEmail || !isTeamPlan || !userTeamId) {
      setTeamMemberCount(null);
      setTeamMemberRole(null);
      setTeamDashboardPermission("full");
      return;
    }
    const sb = createClient();
    void (async () => {
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user?.id) {
        setTeamMemberCount(null);
        setTeamMemberRole(null);
        setTeamDashboardPermission("full");
        return;
      }
      const [countRes, memRes] = await Promise.all([
        sb
          .from("team_members")
          .select("*", { count: "exact", head: true })
          .eq("team_id", userTeamId),
        sb
          .from("team_members")
          .select("role, dashboard_permission")
          .eq("team_id", userTeamId)
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (!countRes.error) setTeamMemberCount(countRes.count ?? 0);
      const r = memRes.data?.role;
      setTeamMemberRole(typeof r === "string" ? r : null);
      if (typeof r === "string" && (r === "owner" || r === "admin")) {
        setTeamDashboardPermission("full");
      } else if (r === "member") {
        setTeamDashboardPermission(
          normalizeTeamDashboardPermission(memRes.data?.dashboard_permission),
        );
      } else {
        setTeamDashboardPermission("full");
      }
    })();
  }, [userEmail, isTeamPlan, userTeamId]);

  const deliveryDashboardAccess = useMemo((): TeamDashboardPermission => {
    if (!isTeamPlan || !userTeamId) return "full";
    if (teamMemberRole === "owner" || teamMemberRole === "admin") return "full";
    if (teamMemberRole === "member") {
      return normalizeTeamDashboardPermission(teamDashboardPermission);
    }
    return "full";
  }, [isTeamPlan, userTeamId, teamMemberRole, teamDashboardPermission]);

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
    if (!pushHaloHighlight) return;
    const t = window.setTimeout(() => setPushHaloHighlight(false), 2800);
    return () => window.clearTimeout(t);
  }, [pushHaloHighlight]);

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

  const checklistSteps: ChecklistStepDef[] = useMemo(() => {
    const profileDone =
      profileJobTitle.trim().length > 0 && profileCompanyName.trim().length > 0;
    const firstGenDone = (totalGenerationCount ?? 0) >= 1;
    const basicExportDone = basicOnboardingActionExportDone || hasExportedExcel;

    if (!hasProAccess) {
      return [
        {
          id: "profile",
          label: "Complete your profile",
          description: "Add your signature to client emails",
          cta: "Set up →",
          onCta: () => {
            setSettingsOpen(true);
            setSettingsTab("profile");
            setSidebarOpenMobile(false);
          },
          done: profileDone,
        },
        {
          id: "first_generation",
          label: "Generate your first report",
          description: "See what Handover can do",
          cta: "Generate →",
          onCta: scrollToGenerate,
          done: firstGenDone,
        },
        {
          id: "explore_tabs",
          label: "Try a different output tab (Actions, Risks, Client Email)",
          description: "Explore Risks, Client Email, Summary, or Status report",
          cta: "Try it →",
          onCta: () => {
            setMainView("generate");
            setSettingsOpen(false);
            setSidebarOpenMobile(false);
            setOutputMainTab("client_email");
            window.requestAnimationFrame(() => {
              outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            });
          },
          done: onboardingTabsExplored,
        },
        {
          id: "export_actions_basic",
          label: "Export your action log",
          description: "Download your actions as a CSV file",
          cta: "Export →",
          onCta: () => {
            void runFirstGenExcelFromCelebration();
          },
          done: basicExportDone,
        },
        {
          id: "upgrade_learn_pro",
          label: "Upgrade to Pro to unlock HaloPSA push-back and scheduled reports →",
          description: "Automation, PSA push-back, and the full delivery dashboard",
          cta: "Pricing →",
          onCta: () => {
            router.push("/pricing");
          },
          done: hasProAccess,
        },
      ];
    }

    const showInviteStep = isTeamPlan && teamMemberRole === "owner";
    const lastStepDone = showInviteStep
      ? (teamMemberCount ?? 0) > 1
      : hasProAccess;
    return [
      {
        id: "profile",
        label: "Complete your profile",
        description: "Add your signature to client emails",
        cta: "Set up →",
        onCta: () => {
          setSettingsOpen(true);
          setSettingsTab("profile");
          setSidebarOpenMobile(false);
        },
        done: profileDone,
      },
      {
        id: "first_generation",
        label: "Generate your first report",
        description: "See what Handover can do",
        cta: "Generate →",
        onCta: scrollToGenerate,
        done: firstGenDone,
      },
      {
        id: "scheduled_report",
        label: "Set up a scheduled report",
        description: "Automate your weekly reporting",
        cta: "Set up →",
        onCta: () => {
          if (!hasProAccess) {
            setHaloProModalOpen(true);
            return;
          }
          setMainView("scheduled");
          setSettingsOpen(false);
          setSidebarOpenMobile(false);
        },
        done: hasEnabledSchedule,
      },
      {
        id: "excel_export",
        label: "Export to Excel",
        description: "Download your action log and risk register",
        cta: "Generate & export →",
        onCta: scrollToGenerate,
        done: hasExportedExcel,
      },
      showInviteStep
        ? {
            id: "invite_member",
            label: "Invite a team member",
            description: "Collaborate with your delivery team",
            cta: "Invite →",
            onCta: () => {
              window.location.href = "/dashboard/team";
            },
            done: lastStepDone,
          }
        : {
            id: "upgrade",
            label: "Upgrade to Pro",
            description: "Unlock 200 generations/month, HaloPSA, and automation",
            cta: "Upgrade →",
            onCta: () => {
              router.push("/pricing");
            },
            done: lastStepDone,
          },
    ];
  }, [
    profileJobTitle,
    profileCompanyName,
    totalGenerationCount,
    hasEnabledSchedule,
    hasExportedExcel,
    hasProAccess,
    isTeamPlan,
    teamMemberCount,
    teamMemberRole,
    plan,
    scrollToGenerate,
    router,
    tryOpenProFeatureGate,
    setHaloProModalOpen,
    onboardingTabsExplored,
    basicOnboardingActionExportDone,
    runFirstGenExcelFromCelebration,
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

  /** Paid solo tiers: never show trial banner even if `trial_ends_at` is still set. */
  const canonicalPlanForTrialBanner = canonicalPlanId(profileDbPlan ?? "");
  const isPaidProfileTierForTrialBanner =
    canonicalPlanForTrialBanner === "professional" ||
    canonicalPlanForTrialBanner === "team" ||
    canonicalPlanForTrialBanner === "enterprise";
  const isPaidPlan = ["professional", "team", "enterprise"].includes(
    normalizePlanLabel(profileDbPlan ?? ""),
  );

  const normalizedPlanForTrialBanner = normalizePlanLabel(profileDbPlan ?? "");
  const planLabelIndicatesInAppTrial = normalizedPlanForTrialBanner.includes("trial");
  const trialEndIsFutureForBanner =
    typeof trialEndsAt === "string" &&
    trialEndsAt.trim().length > 0 &&
    !Number.isNaN(Date.parse(trialEndsAt)) &&
    new Date(trialEndsAt) > new Date();

  const trialBannerDaysLeft =
    trialEndsAt && !Number.isNaN(Date.parse(trialEndsAt))
      ? Math.max(
          0,
          Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
        )
      : null;
  const trialBannerExpired = trialEndsAt ? new Date(trialEndsAt) <= new Date() : false;

  const isSoloAppTrialPlanRow =
    Boolean(trialEndsAt) &&
    (profileDbPlan === "professional_trial" ||
      profileDbPlan === "team_trial" ||
      (normalizePlanLabel(profileDbPlan ?? "") === "free" && Boolean(profileTrialPlan?.trim())));

  const showStickyTrialBanner =
    Boolean(userEmail) &&
    !userTeamId &&
    !isPaidProfileTierForTrialBanner &&
    planLabelIndicatesInAppTrial &&
    trialEndIsFutureForBanner;

  const showTrialUpgradeProminentCard =
    Boolean(userEmail) &&
    !userTeamId &&
    !hasProAccess &&
    !isSoloAppTrialPlanRow;

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
        <div className="mt-2 h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-[#0EA5E9]" />
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-full bg-transparent"
      suppressHydrationWarning
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {showStickyTrialBanner && !trialBannerDismissed ? (
        <div
          className={cn(
            "relative z-[100] flex w-full items-center justify-between gap-2 border-b px-3 py-1.5 text-[11px] leading-snug shadow-sm sm:gap-3 sm:px-4 sm:py-2 sm:text-xs",
            showLeftSidebar && "md:ml-[280px]",
            trialBannerExpired
              ? "border-red-500/35 bg-red-950/25 text-red-100"
              : trialBannerDaysLeft !== null && trialBannerDaysLeft <= 3
                ? "border-rose-500/35 bg-rose-950/20 text-[var(--text-primary)]"
                : trialBannerDaysLeft !== null && trialBannerDaysLeft <= 7
                  ? "border-amber-500/30 bg-amber-500/[0.09] text-[var(--text-primary)]"
                  : "border-sky-500/20 bg-sky-500/[0.06] text-[var(--text-primary)] dark:bg-sky-950/25",
          )}
        >
          <p className="min-w-0 flex-1 font-medium">
            {trialBannerExpired
              ? "Your trial has ended. Upgrade to continue."
              : `Your free trial ends in ${trialBannerDaysLeft ?? 0} day${trialBannerDaysLeft === 1 ? "" : "s"}. Upgrade to keep access.`}
          </p>
          <Link
            href="/pricing"
            className={cn(
              "shrink-0 rounded-md px-2.5 py-1 text-[10px] font-semibold sm:text-[11px]",
              trialBannerExpired
                ? "bg-red-600 text-white hover:bg-red-500"
                : "bg-sky-600/90 text-white shadow-sm hover:bg-sky-600 dark:bg-sky-700/90",
            )}
          >
            Upgrade
          </Link>
          <button
            type="button"
            onClick={() => setTrialBannerDismissed(true)}
            className="shrink-0 rounded p-1 text-[var(--text-primary)]/70 transition-colors hover:text-[var(--text-primary)]"
            aria-label="Dismiss"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}
      {showTrialUpgradeProminentCard ? (
        <div className="border-b border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-5">
          <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--accent)]/35 bg-[var(--bg-primary)] p-5 shadow-sm">
            <div className="flex flex-wrap items-start gap-2">
              <Gift className="mt-0.5 size-5 shrink-0 text-[var(--accent)]" aria-hidden />
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Start your 14-day free trial
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                  Full Professional or Team features, no credit card. Open pricing and start your trial in one click.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/pricing?trial=professional"
                className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius)] bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]"
              >
                Professional — 14-day trial
              </Link>
              <Link
                href="/pricing?trial=team"
                className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius)] border border-[var(--border)] bg-transparent px-4 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-secondary)]"
              >
                Team — 14-day trial
              </Link>
            </div>
          </div>
        </div>
      ) : null}
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
      {userEmail ? (
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
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">{`Push to ${pushModalPsaLabel}`}</h3>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {`Post generated outputs as a note on your ${pushModalPsaLabel} tickets`}
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setPushModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-5 lg:grid-cols-3">
              <div className="rounded-[var(--radius)] border border-[var(--border)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">Step 1</p>
                <h4 className="mt-1 text-sm font-semibold text-[var(--text-primary)]">Select tickets to post to</h4>
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <button type="button" className="text-[var(--accent)]" onClick={() => setPushSelectedTicketIds(lastImportedHaloItems.map((t) => t.id))}>Select all</button>
                  <button type="button" className="text-[var(--text-secondary)]" onClick={() => setPushSelectedTicketIds([])}>Deselect all</button>
                </div>
                <div className="mt-3 space-y-2">
                  {lastImportedHaloItems.map((t) => (
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
              <div className="rounded-[var(--radius)] border border-[var(--border)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">Step 2</p>
                <h4 className="mt-1 text-sm font-semibold text-[var(--text-primary)]">Choose what to include in the note</h4>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  {[
                    ["client_email", "Client email"],
                    ["actions", "Action log"],
                    ["risks", "Risk log"],
                    ["summary", "Summary"],
                    ["status_report", "Status report"],
                  ].map(([id, label]) => (
                    <label key={id} className="flex items-center gap-2 rounded border border-[var(--border)] p-2">
                      <input
                        type="checkbox"
                        checked={pushSelectedOutputs.includes(id as "client_email")}
                        onChange={() =>
                          setPushSelectedOutputs((prev) =>
                            prev.includes(id as "client_email")
                              ? prev.filter((x) => x !== id)
                              : [...prev, id as "client_email"],
                          )
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <div className="mt-4 border-t border-[var(--border)] pt-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
                    Excel Report Pack
                  </p>
                  <label className="flex items-center justify-between gap-2 text-sm text-[var(--text-primary)]">
                    <span>{`Attach Excel to ${pushModalPsaLabel} note`}</span>
                    <input type="checkbox" checked={pushAttachExcel} onChange={(e) => setPushAttachExcel(e.target.checked)} />
                  </label>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {`The Excel file will be attached directly to the ${pushModalPsaLabel} ticket note`}
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
              <div className="rounded-[var(--radius)] border border-[var(--border)] p-4">
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
                  className="mt-4 w-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                  onClick={() => void executePushToHalo()}
                  disabled={pushLoading || pushSelectedTicketIds.length === 0 || pushSelectedOutputs.length === 0}
                >
                  {pushLoading ? "Pushing..." : `Push to ${pushModalPsaLabel}`}
                </Button>
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

      <HaloImportModal
        open={haloImportOpen}
        onOpenChange={setHaloImportOpen}
        onProRequired={() => setHaloProModalOpen(true)}
        onConnectionInvalid={(message) => {
          setHaloConnected(false);
          setHaloError(message);
          setMainView("integrations");
          setHaloConfigOpen(true);
        }}
        onImport={({ formatted, count, selectedClientName, dataType, importedItems }) => {
          setInput(formatted);
          setLastImportedHaloItems(importedItems);
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
      <CwImportModal
        open={cwImportOpen}
        connectwiseConnected={cwConnected}
        onOpenChange={setCwImportOpen}
        onImport={({ formatted, count, selectedClientName, dataType, importedItems }) => {
          setInput(formatted);
          setLastImportedHaloItems(importedItems);
          setCwImportedCount((prev) => prev + count);
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
                <div className="flex flex-col items-center justify-center gap-3 px-6 py-16">
                  <Loader2 className="size-10 animate-spin text-[var(--accent)]" aria-hidden />
                  <p className="text-center text-sm text-[var(--text-secondary)]">
                    Pulling live HaloPSA data and generating preview...
                  </p>
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
              <Link href="/auth?tab=signup&returnTo=/welcome" className="mt-6 block">
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
                No credit card required. 14-day free trial.
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
              <Link href="/auth?tab=signup&returnTo=/welcome">
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
                14-day free trial — no credit card required
              </p>
              <Link href="/auth?tab=signup&returnTo=/welcome" className="mt-3 inline-flex w-full">
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

      <Dialog open={generateOptionsOpen} onOpenChange={setGenerateOptionsOpen}>
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>What do you need?</DialogTitle>
            <DialogDescription>Select the outputs to generate</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (MODAL_OUTPUT_KEYS.filter((k) => outputPrefs[k]).length === 0) {
                return;
              }
              void executeGenerate(outputPrefs);
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
              const t = e.target as HTMLElement;
              if (t.tagName === "BUTTON") return;
              if (t.tagName === "INPUT") {
                const ty = (t as HTMLInputElement).type;
                if (ty === "text" || ty === "checkbox" || ty === "email") return;
              }
              if (t.tagName === "TEXTAREA") return;
              if (MODAL_OUTPUT_KEYS.filter((k) => outputPrefs[k]).length === 0) {
                return;
              }
              e.preventDefault();
              void executeGenerate(outputPrefs);
            }}
          >
            <div className="flex max-h-[min(60vh,24rem)] flex-col gap-3 overflow-y-auto pr-1">
              {MODAL_OUTPUT_KEYS.map((key) => (
                <div key={key} className="space-y-0">
                  <label className="flex cursor-pointer items-start gap-3 text-sm text-[var(--text-primary)]">
                    <input
                      type="checkbox"
                      checked={outputPrefs[key]}
                      onChange={() => {
                        if (key === "client_email") {
                          setOutputPrefs((p) => {
                            const next = !p.client_email;
                            if (!next) {
                              setClientContactName("");
                              setClientContactEmail("");
                            }
                            return { ...p, client_email: next };
                          });
                        } else {
                          setOutputPrefs((p) => ({ ...p, [key]: !p[key] }));
                        }
                      }}
                      className="mt-0.5 size-4 shrink-0 rounded border-[var(--border)] text-[var(--accent)] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    />
                    <span>{OUTPUT_KEY_LABELS[key]}</span>
                  </label>
                  {key === "client_email" && outputPrefs.client_email ? (
                    <div className="ml-7 mt-2 space-y-2 border-l-2 border-[var(--border-subtle)] pl-3 duration-200 animate-in fade-in slide-in-from-left-2">
                      <Input
                        value={clientContactName}
                        onChange={(e) => setClientContactName(e.target.value)}
                        placeholder="Contact name (optional)"
                        title='e.g. "James"'
                        disabled={isGenerating}
                        className="h-9 border-[var(--border)]"
                        autoComplete="off"
                      />
                      <Input
                        type="email"
                        value={clientContactEmail}
                        onChange={(e) => setClientContactEmail(e.target.value)}
                        placeholder="Contact email (optional)"
                        title='e.g. "james@crownoil.co.uk"'
                        disabled={isGenerating}
                        className="h-9 border-[var(--border)]"
                        autoComplete="email"
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-4">
              <Button
                type="submit"
                disabled={
                  MODAL_OUTPUT_KEYS.filter((k) => outputPrefs[k]).length === 0
                }
                className="w-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                Generate {selectedGenCount} output{selectedGenCount === 1 ? "" : "s"}
              </Button>
              <button
                type="button"
                className="text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                onClick={() => setGenerateOptionsOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
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
            <DialogTitle>Scheduled reports require Pro</DialogTitle>
            <DialogDescription>
              Upgrade to automate your weekly reporting.
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
            <DialogTitle>Upgrade to Pro</DialogTitle>
            <DialogDescription>
              Export a full report pack with action log, risk log, client email and status report in one formatted Excel
              file.
            </DialogDescription>
            <p className="mt-2 text-[13px] font-medium text-[var(--accent)]">
              From £25/month. Cancel anytime.
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
              See all Pro features
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={haloProModalOpen} onOpenChange={setHaloProModalOpen}>
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Upgrade to Pro</DialogTitle>
            <DialogDescription>
              Connect HaloPSA to pull tickets directly into Handover. No more copy pasting.
            </DialogDescription>
            <p className="mt-2 text-[13px] font-medium text-[var(--accent)]">
              From £25/month. Cancel anytime.
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
              See all Pro features
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={headerUpgradeOpen} onOpenChange={setHeaderUpgradeOpen}>
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Upgrade to Handover Pro</DialogTitle>
            <DialogDescription>
              Unlimited generations, HaloPSA import, full Excel reports, and priority support. £29/month or £25/month
              when billed annually (£300/year).
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

      {showLeftSidebar ? (
        <>
      {sidebarOpenMobile ? (
        <button
          type="button"
          className="fixed inset-0 z-30 md:hidden"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setSidebarOpenMobile(false)}
          aria-label="Close sidebar overlay"
        />
      ) : null}

      <aside
        id="app-sidebar-nav"
        className={cn(
          "fixed top-0 left-0 z-40 flex h-screen min-h-0 w-[280px] flex-col border-r bg-[var(--sidebar-bg)] text-[14px]",
          "border-[var(--sidebar-border)]",
          "transition-transform md:translate-x-0",
          sidebarOpenMobile ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--sidebar-border)] px-4 py-4">
          <a
            href="/"
            style={{
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              flexShrink: 0,
            }}
          >
            {whiteLabelMode && brandLogoUrl.trim() ? (
              <img
                src={brandLogoUrl.trim()}
                alt=""
                style={{
                  maxHeight: "32px",
                  width: "auto",
                  objectFit: "contain",
                  display: "block",
                  flexShrink: 0,
                }}
              />
            ) : (
              <img
                src="/icon2.png"
                alt=""
                style={{
                  width: "28px",
                  height: "28px",
                  objectFit: "contain",
                  display: "block",
                  flexShrink: 0,
                }}
              />
            )}
            <span
              style={{
                fontWeight: 700,
                fontSize: "16px",
                color: "white",
                letterSpacing: "-0.02em",
              }}
            >
              {whiteLabelMode && brandName.trim() ? brandName.trim() : "Handover"}
            </span>
          </a>
          <button
            type="button"
            className="text-[var(--sidebar-text)] md:hidden"
            onClick={() => setSidebarOpenMobile(false)}
            aria-label="Close sidebar"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto p-3">
          <Button
            type="button"
            variant="ghost"
            className={cn(
              "mb-4 h-[34px] w-full justify-start rounded-[var(--radius)] border border-[var(--sidebar-border)] bg-[var(--accent)] px-3 text-[13px] font-medium text-white transition-all duration-[120ms] ease-in-out hover:bg-[var(--accent-hover)] hover:text-white",
              focusRing,
            )}
            onClick={handleNewGeneration}
          >
            <Plus className="mr-2 size-[14px]" />
            New Generation
          </Button>

          {userEmail ? (
            <nav className="mb-4 space-y-0.5" aria-label="Main navigation">
              <button
                type="button"
                onClick={() => {
                  setMainView("generate");
                  setSettingsOpen(false);
                  setSidebarOpenMobile(false);
                }}
                className={cn(
                  "flex h-8 w-full items-center gap-1.5 rounded-[var(--radius)] px-2.5 text-[12px] text-[var(--sidebar-text)] transition-colors duration-[120ms] ease-in-out",
                  mainView === "generate" && !settingsOpen
                    ? "bg-[rgba(255,255,255,0.1)] font-medium text-white"
                    : "hover:bg-[rgba(255,255,255,0.06)]",
                )}
              >
                <Zap className="size-[14px] shrink-0" aria-hidden />
                Generate
              </button>
              <button
                type="button"
                onClick={() => {
                  setMainView("reports");
                  setSettingsOpen(false);
                  setSidebarOpenMobile(false);
                }}
                className={cn(
                  "flex h-8 w-full items-center gap-1.5 rounded-[var(--radius)] px-2.5 text-[12px] text-[var(--sidebar-text)] transition-colors duration-[120ms] ease-in-out",
                  mainView === "reports" && !settingsOpen
                    ? "bg-[rgba(255,255,255,0.1)] font-medium text-white"
                    : "hover:bg-[rgba(255,255,255,0.06)]",
                )}
              >
                <LayoutTemplate className="size-[14px] shrink-0" aria-hidden />
                Reports
              </button>
              {hasProAccess && deliveryDashboardAccess !== "none" ? (
                <button
                  type="button"
                  onClick={() => {
                    setMainView("delivery");
                    setSettingsOpen(false);
                    setSidebarOpenMobile(false);
                  }}
                  className={cn(
                    "flex h-8 w-full items-center gap-1.5 rounded-[var(--radius)] px-2.5 text-[12px] text-[var(--sidebar-text)] transition-colors duration-[120ms] ease-in-out",
                    mainView === "delivery" && !settingsOpen
                      ? "bg-[rgba(255,255,255,0.1)] font-medium text-white"
                      : "hover:bg-[rgba(255,255,255,0.06)]",
                  )}
                >
                  <LayoutDashboard className="size-[14px] shrink-0" aria-hidden />
                  <span className="min-w-0 truncate">Dashboard</span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setMainView("integrations");
                  setSettingsOpen(false);
                  setSidebarOpenMobile(false);
                }}
                className={cn(
                  "flex h-8 w-full items-center gap-1.5 rounded-[var(--radius)] px-2.5 text-[12px] text-[var(--sidebar-text)] transition-colors duration-[120ms] ease-in-out",
                  mainView === "integrations" && !settingsOpen
                    ? "bg-[rgba(255,255,255,0.1)] font-medium text-white"
                    : "hover:bg-[rgba(255,255,255,0.06)]",
                )}
              >
                <Plug className="size-[14px] shrink-0" aria-hidden />
                Integrations
              </button>
              {showTeamDashboardLink ? (
                <Link
                  href="/dashboard/team"
                  onClick={() => setSidebarOpenMobile(false)}
                  className={cn(
                    "flex h-8 w-full items-center gap-1.5 rounded-[var(--radius)] px-2.5 text-[12px] text-[var(--sidebar-text)] transition-colors duration-[120ms] ease-in-out",
                    "hover:bg-[rgba(255,255,255,0.06)]",
                  )}
                >
                  <Users className="size-[14px] shrink-0" aria-hidden />
                  Team
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setMainView("scheduled");
                  setSettingsOpen(false);
                  setSidebarOpenMobile(false);
                }}
                className={cn(
                  "flex h-8 w-full items-center gap-1.5 rounded-[var(--radius)] px-2.5 text-[12px] text-[var(--sidebar-text)] transition-colors duration-[120ms] ease-in-out",
                  mainView === "scheduled" && !settingsOpen
                    ? "bg-[rgba(255,255,255,0.1)] font-medium text-white"
                    : "hover:bg-[rgba(255,255,255,0.06)]",
                )}
              >
                <Calendar className="size-[14px] shrink-0" aria-hidden />
                <span className="min-w-0 truncate">Scheduled</span>
              </button>
            </nav>
          ) : null}

          {userEmail && freeGenUsage && !hasProAccess ? (
            <div
              className="mb-3 rounded-[var(--radius)] border border-[var(--sidebar-border)] bg-[rgba(255,255,255,0.04)] px-2.5 py-2"
              aria-label="Basic plan generation usage"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[rgba(255,255,255,0.4)]">
                  Basic plan
                </span>
                <span className="text-[11px] font-medium tabular-nums text-[rgba(255,255,255,0.85)]">
                  {freeGenUsage.used}/{freeGenUsage.cap}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-[var(--sidebar-text)]">Generations used</p>
              <div
                className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={freeGenUsage.cap}
                aria-valuenow={freeGenUsage.used}
              >
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
                  style={{
                    width: `${Math.min(100, Math.round((freeGenUsage.used / freeGenUsage.cap) * 100))}%`,
                  }}
                />
              </div>
            </div>
          ) : null}
          <div className="mx-2.5 my-1.5 h-px bg-[rgba(255,255,255,0.06)]" />
          <button
            type="button"
            onClick={() => {
              setMainView("configuration");
              setSettingsOpen(false);
              setSidebarOpenMobile(false);
            }}
            className={cn(
              "flex h-8 w-full items-center gap-1.5 rounded-[var(--radius)] px-2.5 text-[12px] text-[var(--sidebar-text)] transition-colors duration-[120ms] ease-in-out",
              mainView === "configuration" && !settingsOpen
                ? "bg-[rgba(255,255,255,0.1)] font-medium text-white"
                : "hover:bg-[rgba(255,255,255,0.06)]",
            )}
          >
            <Settings className="size-[14px] shrink-0" aria-hidden />
            <span className="min-w-0 truncate">Configuration</span>
          </button>

          {userEmail ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setChatsModalOpen(true);
                  setSidebarOpenMobile(false);
                }}
                className={cn(
                  "mb-1 flex h-8 w-full items-center gap-1.5 rounded-[var(--radius)] px-2.5 text-[12px] text-[var(--sidebar-text)] transition-colors duration-[120ms] ease-in-out",
                  chatsModalOpen
                    ? "bg-[rgba(255,255,255,0.1)] font-medium text-white"
                    : "hover:bg-[rgba(255,255,255,0.06)]",
                )}
              >
                <MessageSquare className="size-[14px] shrink-0" aria-hidden />
                <span className="min-w-0 truncate">Chats</span>
                <span
                  className="ml-auto shrink-0 rounded-full bg-[rgba(255,255,255,0.12)] px-1.5 py-px text-[10px] font-semibold tabular-nums text-[rgba(255,255,255,0.85)]"
                  aria-label={`${totalGenerationCount ?? 0} generations`}
                >
                  {totalGenerationCount ?? 0}
                </span>
              </button>
            </>
          ) : (
            <div className="mt-6 rounded-[var(--radius)] px-3 py-3" style={{ backgroundColor: "rgba(56,189,248,0.05)", border: "1px solid rgba(56,189,248,0.15)" }}>
              <p className="text-[13px] font-medium text-white">Save your work</p>
              <p className="mt-1 text-[12px] text-[var(--sidebar-text)]">
                Sign in to save every generation and access your project history.
              </p>
              <Link href="/auth?tab=signin" className="mt-2 block">
                <Button className="w-full rounded-[var(--radius)] bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]">
                  Sign in
                </Button>
              </Link>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-[rgba(255,255,255,0.08)] p-2.5">
          <div className="mb-2 space-y-0.5">
            <Link
              href="/integrations/halopsa"
              className="flex w-full items-center gap-2 rounded-[var(--radius)] px-2 py-1.5 text-[12px] text-[var(--sidebar-text)] transition-colors duration-[120ms] hover:bg-[rgba(255,255,255,0.06)]"
            >
              <Sparkles className="size-3.5" />
              <span>HaloPSA guide</span>
            </Link>
            <Link
              href="/"
              className="flex w-full items-center gap-2 rounded-[var(--radius)] px-2 py-1.5 text-[12px] text-[var(--sidebar-text)] transition-colors duration-[120ms] hover:bg-[rgba(255,255,255,0.06)]"
            >
              <Sparkles className="size-3.5" />
              <span>What&apos;s new</span>
            </Link>
          </div>
          {userEmail ? (
            <>
              <button
                type="button"
                className="mb-2 flex w-full items-center gap-2 rounded-[var(--radius)] p-2.5 transition-colors duration-[120ms] hover:bg-[rgba(255,255,255,0.06)]"
                onClick={() => setSettingsOpen(true)}
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-semibold text-white">
                  {userFirstName?.[0]?.toUpperCase() || userEmail?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-[12px] font-medium text-white">
                      {userFirstName || "Account"}
                    </span>
                    {(() => {
                      if (!planBadgeReady) {
                        return (
                          <span
                            className="inline-block h-3.5 w-12 animate-pulse rounded-full bg-white/10"
                            aria-hidden
                          />
                        );
                      }
                      const planLabel = getPlanLabel(profileDbPlan ?? "free", userTeamId, {
                        trial_ends_at: trialEndsAt,
                        trial_plan: profileTrialPlan,
                      });
                      if (planLabel === "Team") {
                        return (
                          <span
                            className="rounded-full px-1.5 py-px text-[9px] font-medium"
                            style={{
                              background: "rgba(167,139,250,0.25)",
                              color: "#c4b5fd",
                            }}
                          >
                            Team
                          </span>
                        );
                      }
                      if (planLabel === "Professional trial") {
                        return (
                          <span
                            className="rounded-full px-1.5 py-px text-[9px] font-medium"
                            style={{
                              background: "rgba(56,189,248,0.2)",
                              color: "#38bdf8",
                            }}
                          >
                            Professional Trial
                          </span>
                        );
                      }
                      if (planLabel === "Team trial") {
                        return (
                          <span
                            className="rounded-full px-1.5 py-px text-[9px] font-medium"
                            style={{
                              background: "rgba(167,139,250,0.25)",
                              color: "#c4b5fd",
                            }}
                          >
                            Team Trial
                          </span>
                        );
                      }
                      if (planLabel === "Professional") {
                        return (
                          <span
                            className="rounded-full px-1.5 py-px text-[9px] font-medium"
                            style={{
                              background: "rgba(56,189,248,0.2)",
                              color: "#38bdf8",
                            }}
                          >
                            Professional
                          </span>
                        );
                      }
                      if (planLabel === "Enterprise") {
                        return (
                          <span
                            className="rounded-full px-1.5 py-px text-[9px] font-semibold"
                            style={{
                              background: "rgba(201,168,76,0.2)",
                              color: "#C9A84C",
                            }}
                          >
                            Enterprise
                          </span>
                        );
                      }
                      return (
                        <span
                          className="rounded-full px-1.5 py-px text-[9px] font-medium"
                          style={{
                            background: "rgba(255,255,255,0.1)",
                            color: "rgba(255,255,255,0.5)",
                          }}
                        >
                          Basic
                        </span>
                      );
                    })()}
                    {generationStreak >= 1 ? (
                      <span
                        className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[9px] font-semibold tabular-nums text-white/90 ring-1 ring-white/10"
                        style={{ background: "rgba(255,255,255,0.08)" }}
                        title={`You've generated reports ${generationStreak} days in a row. Keep it up!`}
                      >
                        <span
                          className={cn(
                            "inline-block leading-none",
                            streakFlameBurst ? "streak-flame-milestone-celebration" : "",
                          )}
                          style={{ color: streakFlameColor(generationStreak) }}
                          aria-hidden
                        >
                          🔥
                        </span>
                        {generationStreak}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-[10px] text-[rgba(255,255,255,0.35)]">{userEmail}</p>
                </div>
                <Settings className="ml-auto size-[14px] shrink-0 text-[rgba(255,255,255,0.3)] transition-colors hover:text-[rgba(255,255,255,0.7)]" />
              </button>
              {!hasProAccess ? (
                <button
                  type="button"
                  className="mb-2 flex w-full items-center justify-center rounded-[var(--radius)] border border-[var(--accent)] px-3 py-2 text-[12px] font-medium text-[var(--accent)] transition-colors hover:bg-[rgba(255,255,255,0.06)]"
                  onClick={() => {
                    setHeaderUpgradeOpen(true);
                    setSidebarOpenMobile(false);
                  }}
                >
                  Upgrade plan
                </button>
              ) : null}
            </>
          ) : (
            <Link
              href="/auth?tab=signup&returnTo=/welcome"
              className="block text-center text-sm text-[var(--sidebar-text)] underline-offset-4 hover:text-white hover:underline"
            >
              Create free account
            </Link>
          )}
          <div
            style={{
              padding: "4px 12px 8px",
              fontSize: "10px",
              color: "rgba(255,255,255,0.2)",
              textAlign: "center",
              userSelect: "none",
            }}
          >
            v{APP_VERSION}.{BUILD_NUMBER}
          </div>
        </div>
      </aside>
      {userEmail && authChecked && showLeftSidebar && (
        <div
          className="fixed top-0 z-30 flex h-[52px] items-center justify-end px-4"
          style={{
            left: '280px',
            right: '0px',
            top: '0px',
            width: 'auto',
            backgroundColor: '#0F1C3F',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Dashboard link with active underline */}
          <Link
            href="/"
            className="relative mr-3 text-[13px] font-medium text-white transition-colors"
          >
            Dashboard
            <span className="absolute bottom-[-18px] left-0 right-0 h-[2px] bg-[var(--accent)] rounded-full" />
          </Link>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex size-7 items-center justify-center rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.06] transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="size-[14px]" /> : <Moon className="size-[14px]" />}
          </button>

          {/* Avatar */}
          <button
            type="button"
            className="flex size-7 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-semibold text-white ml-1"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
          >
            {userFirstName?.[0]?.toUpperCase() || userEmail?.[0]?.toUpperCase() || "U"}
          </button>

          {/* Settings cog */}
          <button
            type="button"
            className="flex size-7 items-center justify-center rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.06] transition-colors ml-1"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
          >
            <Settings className="size-[14px]" />
          </button>
        </div>
      )}
        </>
      ) : null}

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
              void refreshUsage();
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
                      Upgrade to Pro
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-secondary)]">
                      Access your complete generation history. Never lose a report again.
                    </p>
                    <p className="mt-2 text-[13px] font-medium text-[var(--accent)]">
                      From £25/month. Cancel anytime.
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
                      Upgrade to Pro
                    </Button>
                    <Link
                      href="/pricing"
                      className="mt-2 block text-[13px] font-medium text-[var(--accent)] hover:underline"
                    >
                      See all Pro features
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
            (result.email_subject ?? "").trim() ||
            buildDefaultClientEmailSubject(projectName)
          }
          textBody={smartActionEmailBody ?? activeClientEmailBody}
        />
      ) : null}

      {result && smartActionsResultSnapshot && userEmail ? (
        <SmartActionsPanel
          open={smartActionsOpen}
          onClose={() => setSmartActionsOpen(false)}
          focusRing={focusRing}
          reportContext={smartActionsReportContext}
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

      {settingsOpen ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/30"
          role="presentation"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-panel-title"
            tabIndex={-1}
            className="relative flex h-screen w-full max-w-[580px] border-l border-[var(--border)] bg-[var(--bg-primary)] shadow-xl outline-none"
            onClick={(e) => e.stopPropagation()}
            onKeyDownCapture={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                setSettingsOpen(false);
              }
            }}
          >
            <div className="flex h-full min-h-0 w-full flex-col">
              <div className="relative flex shrink-0 items-center border-b border-[var(--border)] bg-[var(--sidebar-bg)] px-4 py-3.5 sm:px-6">
                <h2
                  id="settings-panel-title"
                  className="min-w-0 flex-1 text-[15px] font-semibold text-white sm:text-[16px]"
                >
                  Settings
                </h2>
              </div>
              <div className="shrink-0 border-b border-[var(--border)] bg-[var(--bg-primary)] px-6 py-3">
                {!isPaidProfileTierForTrialBanner ? (
                  <TrialBanner
                    className="relative w-full mb-2"
                    plan={profileTrialPlan ?? profileDbPlan ?? undefined}
                  />
                ) : null}
              </div>
              <div className="flex min-h-0 flex-1">
                <nav
                  className="w-[180px] shrink-0 border-r border-[var(--border)] bg-[var(--sidebar-bg)] p-2"
                  aria-label="Settings sections"
                >
                  {(
                    [
                      { id: "profile" as const, label: "Profile", Icon: User },
                      { id: "branding" as const, label: "Branding", Icon: Palette },
                      { id: "signature" as const, label: "Signature", Icon: PenLine },
                      { id: "appearance" as const, label: "Appearance", Icon: Palette },
                      { id: "privacy" as const, label: "Privacy", Icon: Shield },
                      { id: "writing" as const, label: "Writing style", Icon: FileEdit },
                      { id: "outputs" as const, label: "Output tabs", Icon: LayoutList },
                      { id: "referrals" as const, label: "Referrals", Icon: Gift },
                    ] as const
                  ).map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSettingsTab(id)}
                      className={cn(
                        "mb-0.5 flex h-8 w-full items-center gap-1.5 rounded-[var(--radius)] px-2.5 text-left text-[12px] transition-colors duration-[120ms]",
                        settingsTab === id
                          ? "bg-[rgba(255,255,255,0.1)] font-medium text-white"
                          : "text-[var(--sidebar-text)] hover:bg-[rgba(255,255,255,0.06)]",
                      )}
                    >
                      <Icon className="size-[14px] shrink-0 opacity-90" aria-hidden />
                      <span className="min-w-0 truncate">{label}</span>
                    </button>
                  ))}
                </nav>
                <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--bg-primary)]">
                <div className="sticky top-4 z-[60] flex justify-end border-b border-[var(--border)] bg-[var(--bg-primary)] px-3 py-3 backdrop-blur-sm supports-[backdrop-filter]:bg-[var(--bg-primary)]/90">
                  <button
                    type="button"
                    className={cn(
                      "flex size-9 items-center justify-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm transition-colors hover:bg-[var(--bg-primary)]",
                      focusRing,
                    )}
                    onClick={() => setSettingsOpen(false)}
                    aria-label="Close settings"
                  >
                    <X className="size-5 shrink-0" aria-hidden />
                  </button>
                </div>
                <div className="p-6">
                {settingsTab === "profile" ? (
                  <div className="space-y-4">
                <div>
                  <h3 className="mb-2 text-[13px] font-semibold text-[var(--text-primary)]">Profile</h3>
                  <p className="mb-3 text-[12px] text-[var(--text-muted)]">
                    First and last name are used for the app greeting. Job title and company feed the default client-email sign-off when you do not use a custom signature.
                  </p>
                <div className="grid grid-cols-2 gap-2">
                  <Input value={profileFirstName} onChange={(e) => setProfileFirstName(e.target.value)} placeholder="First name" className={cn("rounded-[var(--radius)] border-[var(--border)]", focusRing)} />
                  <Input value={profileLastName} onChange={(e) => setProfileLastName(e.target.value)} placeholder="Last name" className={cn("rounded-[var(--radius)] border-[var(--border)]", focusRing)} />
                </div>
                <div className="mt-2">
                  <Input
                    value={profileDisplayName}
                    onChange={(e) => setProfileDisplayName(e.target.value)}
                    placeholder="Display name on client emails (optional)"
                    className={cn("rounded-[var(--radius)] border-[var(--border)]", focusRing)}
                  />
                  <p className="mt-1.5 text-[11px] leading-snug text-[var(--text-muted)]">
                    If set, this line appears in the generated email sign-off. It is never taken from ticket data. Leave blank to sign with company name only (no personal name).
                  </p>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Input value={profileJobTitle} onChange={(e) => setProfileJobTitle(e.target.value)} placeholder="Job title" className={cn("rounded-[var(--radius)] border-[var(--border)]", focusRing)} />
                  <Input value={profileCompanyName} onChange={(e) => setProfileCompanyName(e.target.value)} placeholder="Company name" className={cn("rounded-[var(--radius)] border-[var(--border)]", focusRing)} />
                </div>
                </div>
                <div className="flex justify-end">
                <Button type="button" className={cn("bg-[var(--accent)] text-[13px] text-white hover:bg-[var(--accent-hover)]", focusRing)} onClick={() => void saveSettings()}>
                  Save
                </Button>
                </div>
                {hasProAccess ? (
                  <>
                  <div
                    style={{
                      borderTop: "1px solid var(--border)",
                      paddingTop: "1rem",
                      marginTop: "1rem",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        marginBottom: "4px",
                      }}
                    >
                      Subscription
                    </p>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "var(--text-muted)",
                        marginBottom: "12px",
                      }}
                    >
                      Manage your Pro subscription, update payment details, or cancel your plan.
                    </p>
                    <button
                      type="button"
                      disabled={manageSubscriptionLoading}
                      onClick={() => void handleManageSubscription()}
                      style={{
                        padding: "8px 16px",
                        background: "transparent",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius)",
                        color: "var(--text-primary)",
                        fontSize: "13px",
                        cursor: manageSubscriptionLoading ? "wait" : "pointer",
                        width: "100%",
                        opacity: manageSubscriptionLoading ? 0.85 : 1,
                      }}
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
                  </div>
                  </>
                ) : null}
              </div>
                ) : null}

                {settingsTab === "branding" ? (
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
                            if (plan !== "enterprise") {
                              e.preventDefault();
                              router.push("/contact?plan=enterprise");
                              toast({
                                message: "White label mode is available on Enterprise. Upgrade to Enterprise to enable it.",
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
                            disabled={plan !== "enterprise"}
                            onChange={(e) => {
                              if (plan === "enterprise") {
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
                            {plan !== "enterprise" ? (
                              <span className="mt-2 block text-[11px] text-[var(--text-muted)]">
                                Enterprise only.{" "}
                                <Link
                                  href="/contact?plan=enterprise"
                                  className="font-medium text-[var(--accent)] underline-offset-2 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Upgrade to Enterprise
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
                                  : "#2563eb",
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
                                    : "#2563eb",
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
                                  : "#2563eb",
                              borderColor:
                                /^#?[0-9a-fA-F]{6}$/.test(brandSecondaryColour.trim())
                                  ? brandSecondaryColour.trim().replace(/^#?/, "#")
                                  : /^#?[0-9a-fA-F]{6}$/.test(brandColour.trim())
                                    ? brandColour.trim().replace(/^#?/, "#")
                                    : "#2563eb",
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
                ) : null}

                {settingsTab === "signature" ? (
                  <div className="space-y-4">
                <div>
                  <h3 className="mb-2 text-[13px] font-semibold text-[var(--text-primary)]">Email signature</h3>
                  <p className="mb-3 text-[12px] text-[var(--text-muted)]">
                    Optional full sign-off. When empty, generated emails use your profile display name, job title, and company (see Profile). The model is instructed not to substitute names from tickets.
                  </p>
                <Textarea
                  value={signatureOverride}
                  onChange={(e) => setSignatureOverride(e.target.value)}
                  placeholder={`Kind regards,\nAlex Taylor\nTechnical Project Manager\nHarbour IT Group`}
                  rows={6}
                  className={cn("min-h-36 rounded-[var(--radius)] border-[var(--border)]", focusRing)}
                />
                <div className="mt-3 space-y-2">
                  <p className="text-[13px] font-semibold text-[var(--text-primary)]">Effective sign-off</p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    What generation uses when the box above is empty.
                  </p>
                  <div className="whitespace-pre-wrap rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] p-3 text-sm">
                    {signaturePreview}
                  </div>
                </div>
                </div>
                <div className="flex justify-end">
                <Button type="button" className={cn("bg-[var(--accent)] text-[13px] text-white hover:bg-[var(--accent-hover)]", focusRing)} onClick={() => void saveSignatureOverride()}>
                  Save signature
                </Button>
                </div>
              </div>
                ) : null}

                {settingsTab === "privacy" ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="mb-2 text-[13px] font-semibold text-[var(--text-primary)]">Privacy</h3>
                      <p className="mb-3 text-[12px] text-[var(--text-muted)]">
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

                {settingsTab === "writing" ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="mb-2 text-[13px] font-semibold text-[var(--text-primary)]">Writing style</h3>
                      <p className="mb-3 text-[12px] text-[var(--text-muted)]">
                        Optional. Train Handover to match how you write for clients.
                      </p>
                      {!hasProAccess ? (
                        <div
                          className="rounded-[var(--radius)] border border-[var(--border)] bg-[rgba(56,189,248,0.03)] p-3"
                          role="region"
                          aria-label="Upgrade to Pro for writing style"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex size-8 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
                              <Zap className="size-4" aria-hidden />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                                Upgrade to Pro
                              </p>
                              <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-secondary)]">
                                Train Handover to write in your style. Every output sounds like you wrote it.
                              </p>
                              <p className="mt-2 text-[13px] font-medium text-[var(--accent)]">
                                From £25/month. Cancel anytime.
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
                                Upgrade to Pro
                              </Button>
                              <Link
                                href="/pricing"
                                className="mt-2 block text-center text-[13px] font-medium text-[var(--text-secondary)] hover:text-white"
                              >
                                See all Pro features
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
                <div>
                  <h3 className="mb-2 text-[13px] font-semibold text-[var(--text-primary)]">Appearance</h3>
                  <p className="mb-3 text-[12px] text-[var(--text-muted)]">Theme and layout preferences for this device.</p>
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
                </div>
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
                <Button type="button" className={cn("bg-[var(--accent)] text-[13px] text-white hover:bg-[var(--accent-hover)]", focusRing)} onClick={() => void saveSettings()}>
                  Save
                </Button>
                </div>
              </div>
                ) : null}

                {settingsTab === "outputs" ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="mb-2 text-[13px] font-semibold text-[var(--text-primary)]">
                        Output tabs
                      </h3>
                      <p className="mb-3 text-[12px] text-[var(--text-muted)]">
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
                    </div>
                    <div>
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                        Optional PM deliverables
                      </p>
                      <div className="max-h-[min(40vh,22rem)] space-y-2 overflow-y-auto rounded-[var(--radius)] border border-[var(--border)] p-3">
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
                ) : null}

                {settingsTab === "referrals" ? (
                  isPaidPlan ? (
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
                        Upgrade to Professional or Team to access your referral link and earn £87 for every
                        MSP you refer.
                      </p>
                      <button
                        onClick={() => setSettingsTab("profile")}
                        className="rounded-lg bg-[#0EA5E9] px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-[#0284C7]"
                      >
                        View plans
                      </button>
                    </div>
                  )
                ) : null}

                <div className="mt-8 border-t border-[var(--border)] pt-4">
              {!confirmSignOut ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-secondary)]"
                  onClick={() => setConfirmSignOut(true)}
                  disabled={!userEmail}
                >
                  Sign out
                </Button>
              ) : (
                <div className="space-y-2 rounded-[var(--radius)] border border-[var(--danger)] p-3">
                  <p className="text-sm text-[var(--danger)]">Are you sure?</p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="bg-[var(--danger)] text-white hover:bg-red-600"
                      onClick={handleSignOut}
                      disabled={isSigningOut}
                    >
                      Yes
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setConfirmSignOut(false)}>
                      No
                    </Button>
                  </div>
                </div>
              )}
                </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      ) : null}

      <div
        className={cn(
          "relative ml-0 overflow-x-hidden",
          !userEmail ? "bg-transparent" : "bg-[#172035]",
          showLeftSidebar && "md:ml-[280px]",
        )}
      >
        {userEmail && mainView === "configuration" ? (
          <div className="animate-in fade-in duration-200" style={{ 
            position: 'fixed',
            top: '52px',
            left: '280px',
            right: 0,
            bottom: 0,
            overflow: 'hidden',
            zIndex: 10
          }}>
            <ConfigurationPanel userEmail={userEmail} plan={plan} hasProAccess={hasProAccess} />
          </div>
        ) : null}
        {showLeftSidebar ? (
          <div
            className={cn(
              "sticky top-0 z-20 flex h-[52px] shrink-0 items-center border-b border-[var(--border)] bg-[var(--bg-secondary)] px-3 hidden",
            )}
          >
            <button
              type="button"
              className={cn(
                "inline-flex size-10 items-center justify-center rounded-[var(--radius)] border border-[var(--border)] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-primary)]",
                sidebarOpenMobile && "invisible pointer-events-none",
              )}
              aria-expanded={sidebarOpenMobile}
              aria-controls="app-sidebar-nav"
              aria-label={sidebarOpenMobile ? "Menu open" : "Open menu"}
              onClick={() => setSidebarOpenMobile(true)}
            >
              <Menu className="size-5" />
            </button>
          </div>
        ) : null}
        {userEmail && !isPaidProfileTierForTrialBanner ? <TrialBanner /> : null}
        <div
          className={cn(
            "flex w-full flex-col",
            compactMode
              ? "gap-4 px-3 py-4"
              : !userEmail
                ? "gap-6 px-4 py-4 md:px-8 md:py-6"
        : "w-full gap-4 px-4 py-4 md:px-6 md:py-5",
          )}
        >
        {showSuccessBanner ? (
          <div
            className="flex flex-col gap-2 rounded-[var(--radius)] border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
            style={{ borderColor: "color-mix(in srgb, var(--success) 35%, transparent)", backgroundColor: "color-mix(in srgb, var(--success) 12%, transparent)" }}
            role="status"
          >
            <span className="text-foreground">
              Welcome to Handover Pro - your subscription is active.
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
              className="relative flex flex-col overflow-hidden bg-transparent animate-in fade-in slide-in-from-bottom-4 duration-300"
            >
              <style
                dangerouslySetInnerHTML={{
                  __html: `@keyframes homeHeroAmbientPulse{0%,100%{opacity:.14;transform:scale(1)}50%{opacity:.22;transform:scale(1.06)}}`,
                }}
              />
              <div className="home-hero-drift-layer" aria-hidden>
                <div className="home-hero-drift-orb--a" />
                <div className="home-hero-drift-orb--b" />
              </div>
              <div className="home-hero-dot-overlay" aria-hidden />
              <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
                <div
                  className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full opacity-20"
                  style={{
                    background: "radial-gradient(circle, #0EA5E9 0%, transparent 70%)",
                    animation: "homeHeroAmbientPulse 8s ease-in-out infinite",
                  }}
                />
              </div>
              <div className="relative z-10 grid w-full min-h-0 flex-1 grid-cols-1 gap-6 px-4 pt-12 pb-4 md:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center lg:gap-8 lg:px-8 lg:pb-6">
                <div className="flex min-w-0 flex-col justify-center overflow-x-hidden overflow-y-visible pr-0 md:pr-8">
                  <div className="max-w-full md:max-w-[520px]">
                  <motion.div
                    className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-[12px] font-medium"
                    style={{
                      backgroundColor: "rgba(56, 189, 248, 0.1)",
                      border: "1px solid rgba(56, 189, 248, 0.3)",
                      color: "var(--accent)",
                    }}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  >
                    <span
                      className="handover-pulse inline-block size-2 rounded-full bg-[#22c55e]"
                      aria-hidden
                    />
                    Built for MSP delivery teams
                  </motion.div>

                  <motion.h1
                    className="home-hero-headline-shimmer mt-5 text-4xl font-bold tracking-tight md:text-[56px] lg:text-[58px]"
                    style={{ lineHeight: 1.05 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
                  >
                    The reporting tool built for MSP delivery teams
                  </motion.h1>

                  <motion.p
                    className="mt-4 text-[15px] leading-relaxed text-[var(--text-secondary)] md:text-[18px] md:leading-normal"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
                  >
                    The first purpose-built, out-of-the-box client delivery reporting tool for HaloPSA and ConnectWise
                    MSPs. Connect your PSA and generate your first report in 30 seconds — nothing to configure.
                  </motion.p>
                  <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-muted)] md:text-[15px] md:leading-normal">
                    Free to try - no card required.
                  </p>

                  <motion.div
                    className="mt-6 flex w-full max-w-full flex-col gap-3 md:max-w-none md:flex-row md:flex-wrap"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
                  >
                    <Link
                      href="/auth?tab=signup&returnTo=/welcome"
                      className="bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] hover:from-[#0284C7] hover:to-[#0EA5E9] text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-[#0EA5E9]/20 hover:shadow-[#0EA5E9]/30 transition-all duration-300 transform hover:scale-[1.02] inline-flex w-full items-center justify-center text-sm active:scale-[0.99] md:w-auto"
                    >
                      Start free trial
                    </Link>
                    <Link
                      href="/features"
                      className="bg-white/[0.05] backdrop-blur-sm border border-white/[0.15] hover:bg-white/[0.08] text-white font-medium px-6 py-3 rounded-xl transition-all duration-300 inline-flex w-full items-center justify-center text-sm md:w-auto"
                    >
                      See how it works
                    </Link>
                  </motion.div>
                  <Link
                    href="/demo"
                    className="bg-white/[0.05] backdrop-blur-sm border border-white/[0.15] hover:bg-white/[0.08] text-white font-medium px-6 py-3 rounded-xl transition-all duration-300 mt-3 inline-flex w-full items-center justify-center text-sm md:w-auto md:text-center"
                  >
                    Book a 15-minute demo →
                  </Link>
                  </div>

                  <div
                    ref={heroStatsRef}
                    className="mt-5 w-full min-w-0 border-t border-[var(--border)] pt-5"
                    data-nosnippet
                  >
                    <div className="flex w-full min-w-0 flex-col items-center gap-6 md:flex-row md:flex-nowrap md:items-start md:justify-center md:gap-3">
                      <ScrollRevealItem
                        index={0}
                        className="flex w-full min-w-0 max-w-md flex-1 flex-col items-center border-b border-[var(--border)] px-3 pb-6 text-center md:max-w-none md:border-b-0 md:pb-0 md:items-center"
                      >
                        <Clock
                          className="mb-3 size-6 text-[var(--accent)]"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        <div className="flex min-w-0 flex-wrap items-baseline justify-center gap-1">
                          <div className="whitespace-nowrap text-[clamp(1.2rem,2.5vw,2rem)] font-bold leading-none tracking-tight text-[var(--accent)]">
                            <span>2-{heroStat45}</span>
                            <span className="ml-1">hours</span>
                          </div>
                        </div>
                        <div
                          className="mt-2 w-full whitespace-nowrap text-xs text-[var(--text-secondary)]"
                          style={{ lineHeight: 1.4 }}
                          title="saved per client per week"
                        >
                          saved per client per week
                        </div>
                      </ScrollRevealItem>
                      <ScrollRevealItem
                        index={1}
                        className="flex w-full min-w-0 max-w-md flex-1 flex-col items-center border-b border-[var(--border)] px-3 py-6 text-center md:max-w-none md:border-x md:border-y-0 md:border-b-0 md:py-0"
                      >
                        <Zap
                          className="mb-4 size-6 text-[var(--accent)]"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        <div className="flex min-w-0 flex-wrap items-baseline justify-center gap-1">
                          <div className="whitespace-nowrap text-[clamp(1.2rem,2.5vw,2rem)] font-bold leading-none tracking-tight text-[var(--accent)]">
                            <span>£{heroStat1300.toLocaleString("en-GB")}</span>
                            <span className="ml-1">+</span>
                          </div>
                        </div>
                        <div
                          className="mt-2 w-full whitespace-nowrap text-xs text-[var(--text-secondary)]"
                          style={{ lineHeight: 1.4 }}
                          title="saved per PM per month"
                        >
                          saved per PM per month
                        </div>
                      </ScrollRevealItem>
                      <ScrollRevealItem
                        index={2}
                        className="flex w-full min-w-0 max-w-md flex-1 flex-col items-center px-3 text-center md:max-w-none"
                      >
                        <Clock
                          className="mb-4 size-6 text-[var(--accent)]"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        <div className="flex min-w-0 flex-wrap items-baseline justify-center gap-1">
                          <div className="whitespace-nowrap text-[clamp(1.2rem,2.5vw,2rem)] font-bold leading-none tracking-tight text-[var(--accent)]">
                            <span>{heroStat30}</span>
                            <span className="ml-1">seconds</span>
                          </div>
                        </div>
                        <div
                          className="mt-2 w-full whitespace-nowrap text-xs text-[var(--text-secondary)]"
                          style={{ lineHeight: 1.4 }}
                          title="PSA to client-ready"
                        >
                          PSA to client-ready
                        </div>
                      </ScrollRevealItem>
                    </div>
                  </div>

                  <div className="max-w-full md:max-w-[520px]">
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    14-day free trial. No credit card required.
                  </p>
                  </div>
                </div>

                <motion.div
                  className="relative hidden min-w-0 w-full max-w-full flex-col items-center justify-center overflow-x-hidden sm:flex"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                >
                  <div
                    className="pointer-events-none absolute z-0 hidden size-[400px] rounded-full lg:block"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(56,189,248,0.07) 0%, transparent 70%)",
                    }}
                    aria-hidden
                  />
                  <section
                    className="relative z-10 w-full min-w-0 max-w-full rounded-[var(--radius-lg)] bg-white/[0.03] backdrop-blur-md border border-white/[0.07]"
                    style={{
                      border: "1.5px solid rgba(56,189,248,0.3)",
                      boxShadow:
                        "0 0 0 1px rgba(56,189,248,0.15), 0 4px 24px rgba(56,189,248,0.06), inset 0 1px 0 rgba(255,255,255,0.8)",
                    }}
                  >
                    <div className="relative w-full min-w-0 max-w-full overflow-x-hidden">
                      {/* Glow effect behind the image */}
                      <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 via-blue-500/10 to-transparent rounded-2xl blur-2xl pointer-events-none" />
                      
                      {/* Floating animation wrapper */}
                      <div
                        className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm shadow-2xl shadow-black/60"
                        style={{
                          animation: 'float 6s ease-in-out infinite',
                        }}
                      >
                        {/* Subtle top shine */}
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent pointer-events-none z-10" />
                        
                        <img
                          src="/dashboard.png"
                          alt="Handover delivery health dashboard"
                          className="block h-auto w-full max-w-full"
                          style={{ display: "block" }}
                        />

                        {/* Subtle bottom fade */}
                        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0F1C3F]/60 to-transparent pointer-events-none z-10" />
                      </div>
                    </div>
                  </section>
                </motion.div>
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

            <section
              className="bg-transparent px-4 py-3 md:px-6"
              aria-label="Trusted organisations"
            >
              <div className="flex items-center justify-center gap-6 flex-wrap">
                <span className="text-slate-400 text-sm tracking-wide uppercase whitespace-nowrap">
                  Used by delivery teams at
                </span>

                <img
                  src="/ibm.png"
                  alt="IBM"
                  className="h-8 object-contain opacity-70 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-200"
                />

                <img
                  src="/computacenter.png"
                  alt="Computacenter"
                  className="h-10 object-contain opacity-70 grayscale brightness-150 hover:opacity-100 transition-all duration-200"
                />

                <span className="text-slate-400 text-sm tracking-wide uppercase whitespace-nowrap">
                  and MSP delivery teams worldwide
                </span>

                {/* Divider */}
                <div className="h-10 w-px bg-white/10" />

                {/* HaloPSA Technology Alliance Partner */}
                <a href="/partners/halopsa" className="flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-all duration-200 cursor-pointer">
                  <div className="flex items-center justify-center">
                    <img
                      src="/halo.png"
                      alt="HaloPSA"
                      className="h-5 object-contain grayscale hover:grayscale-0 transition-all duration-200"
                    />
                  </div>
                  <span className="text-slate-400 text-[9px] uppercase tracking-wider whitespace-nowrap">
                    Technology Alliance Partner
                  </span>
                </a>

                {/* Divider */}
                <div className="h-8 w-px bg-white/10 mx-2" />

                {/* ConnectWise Marketplace */}
                <a href="/partners/connectwise" className="flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-all duration-200 cursor-pointer">
                  <img
                    src="/connectwise.png"
                    alt="ConnectWise"
                    className="h-8 object-contain grayscale brightness-150 hover:grayscale-0 transition-all duration-200"
                  />
                  <span className="text-slate-300 text-[10px] uppercase tracking-wider whitespace-nowrap">
                    Marketplace Partner
                  </span>
                </a>
              </div>
            </section>

            <motion.section
              className="mx-auto max-w-[1100px] overflow-x-hidden bg-transparent px-4 pt-8 md:pt-10"
              aria-label="How it works"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <ScrollRevealItem index={0} className="text-center">
                <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)] md:text-3xl">
                  How it <span className="text-gradient-brand">works</span>
                </h2>
              </ScrollRevealItem>

              <div className="mt-8 flex flex-col items-center gap-10 md:hidden">
                <ScrollRevealItem index={1} className="flex w-full max-w-md flex-col items-center text-center">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm shadow-sm">
                    <Plug className="size-[22px] shrink-0 text-[#0EA5E9]" strokeWidth={1.75} aria-hidden />
                  </span>
                  <p className="mt-4 font-bold text-[var(--text-primary)]">Connect or paste</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Connect HaloPSA or paste your meeting notes directly
                  </p>
                </ScrollRevealItem>
                <ScrollRevealItem index={2} className="flex w-full max-w-md flex-col items-center text-center">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm shadow-sm">
                    <Sparkles className="size-[22px] shrink-0 text-[#0EA5E9]" strokeWidth={1.75} aria-hidden />
                  </span>
                  <p className="mt-4 font-bold text-[var(--text-primary)]">Generate in 30 seconds</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Handover reads your data and generates 5 professional outputs simultaneously
                  </p>
                </ScrollRevealItem>
                <ScrollRevealItem index={3} className="flex w-full max-w-md flex-col items-center text-center">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm shadow-sm">
                    <Send className="size-[22px] shrink-0 text-[#0EA5E9]" strokeWidth={1.75} aria-hidden />
                  </span>
                  <p className="mt-4 font-bold text-[var(--text-primary)]">Send or push back</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Send the client email, export to Excel, or push back to HaloPSA or ConnectWise
                    automatically
                  </p>
                </ScrollRevealItem>
              </div>

              <div className="mx-auto mt-10 hidden max-w-[1000px] items-stretch gap-3 md:flex">
                <ScrollRevealItem
                  index={1}
                  className="flex h-full min-w-0 flex-1 flex-col items-center px-2 text-center"
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm shadow-sm">
                    <Plug className="size-[22px] shrink-0 text-[#0EA5E9]" strokeWidth={1.75} aria-hidden />
                  </span>
                  <p className="mt-4 font-bold text-[var(--text-primary)]">Connect or paste</p>
                  <p className="mt-1 flex-1 text-sm text-[var(--text-secondary)]">
                    Connect HaloPSA or paste your meeting notes directly
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
                    <Sparkles className="size-[22px] shrink-0 text-[#0EA5E9]" strokeWidth={1.75} aria-hidden />
                  </span>
                  <p className="mt-4 font-bold text-[var(--text-primary)]">Generate in 30 seconds</p>
                  <p className="mt-1 flex-1 text-sm text-[var(--text-secondary)]">
                    Handover reads your data and generates 5 professional outputs simultaneously
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
                    <Send className="size-[22px] shrink-0 text-[#0EA5E9]" strokeWidth={1.75} aria-hidden />
                  </span>
                  <p className="mt-4 font-bold text-[var(--text-primary)]">Send or push back</p>
                  <p className="mt-1 flex-1 text-sm text-[var(--text-secondary)]">
                    Send the client email, export to Excel, or push back to HaloPSA or ConnectWise
                    automatically
                  </p>
                </ScrollRevealItem>
              </div>
            </motion.section>

            <motion.section
              ref={mockupSectionRef}
              className="overflow-x-hidden bg-transparent px-4 pt-10 md:px-0 md:pt-14"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <ScrollRevealItem index={0} className="text-center">
                <h3 className="text-xl font-semibold text-[var(--text-primary)] md:text-2xl">
                  See exactly what you get
                </h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)] md:text-base">
                  From one paste to five professional outputs
                </p>
              </ScrollRevealItem>

              <div className="relative mx-auto mt-10 w-full min-w-0 max-w-[960px] overflow-x-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-md md:overflow-visible md:p-6">
                <HeroProductMockup variant="full" className="relative z-10 mt-0" />
                <div
                  className="home-mockup-float-badge--1 pointer-events-none absolute z-20 hidden rounded-[8px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-3 py-2 text-[13px] font-medium md:block"
                  style={{ top: 16, right: 16 }}
                  aria-hidden
                >
                  ⚡ Generated in 28 seconds
                </div>
                <div
                  className="home-mockup-float-badge--2 pointer-events-none absolute z-20 hidden rounded-[8px] border border-[#22c55e] bg-white/[0.04] backdrop-blur-sm px-3 py-2 text-[13px] font-medium text-[var(--text-primary)] md:block"
                  style={{ bottom: 16, left: 16 }}
                  aria-hidden
                >
                  <span className="text-[#22c55e]">✓</span> Pushed to HaloPSA / ConnectWise
                </div>
                <div
                  className="home-mockup-float-badge--3 pointer-events-none absolute z-20 hidden rounded-[8px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-3 py-2 text-[13px] font-medium md:block"
                  style={{ bottom: 56, left: 16 }}
                  aria-hidden
                >
                  📧 Sent to client
                </div>
              </div>

              <ScrollRevealItem index={1} className="mt-6 text-center">
                <p className="text-sm text-[var(--text-muted)]">
                  Real outputs from real MSP ticket data
                </p>
              </ScrollRevealItem>

            </motion.section>

            <motion.section
              className="bg-transparent px-4 py-10 md:px-6 md:py-12 lg:py-16"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div className="mx-auto flex min-w-0 max-w-[720px] justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-4 backdrop-blur-md sm:px-2 md:px-4 md:py-5">
                <HomeRoiCalculator variant="full" className="mt-0" />
              </div>
            </motion.section>

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

            <section
              className="w-full px-4 py-12 md:px-6 md:py-14 lg:py-16"
              style={{
                background: "transparent",
              }}
              aria-label="Sign up to generate reports"
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
                  Ready to send client-ready updates automatically?
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-white/75 md:text-base">
                  Connect HaloPSA or ConnectWise once. Generate client-ready reports, QBR packs, and delivery updates automatically. 14-day free trial, no card required.
                </p>
                <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                  <Link
                    href="/auth?tab=signup&returnTo=/welcome"
                    className="bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] hover:from-[#0284C7] hover:to-[#0EA5E9] text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-[#0EA5E9]/20 hover:shadow-[#0EA5E9]/30 transition-all duration-300 transform hover:scale-[1.02] inline-flex w-full flex-1 items-center justify-center text-sm active:scale-[0.98] md:w-auto"
                  >
                    Start free trial →
                  </Link>
                  <Link
                    href="/pricing"
                    className="bg-white/[0.05] backdrop-blur-sm border border-white/[0.15] hover:bg-white/[0.08] text-white font-medium px-6 py-3 rounded-xl transition-all duration-300 py-1 text-center text-sm md:px-4"
                  >
                    Compare plans and pricing →
                  </Link>
                </div>
              </div>
            </section>
          </>
        ) : null) : (
          userEmail && mainView === "scheduled" ? (
            <div className="min-h-full bg-[var(--bg-secondary)] animate-in fade-in duration-300">
              <div className="w-full px-6 py-6">
                <div
                  className="flex flex-col gap-6 rounded-[var(--radius-lg)] sm:flex-row sm:items-center sm:justify-between"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(15,23,42,0.97) 0%, rgba(15,23,42,0.95) 100%)",
                    padding: "2rem",
                    marginBottom: "1.5rem",
                    backgroundImage:
                      "radial-gradient(circle, rgba(56,189,248,0.06) 1px, transparent 1px), radial-gradient(ellipse 70% 50% at 50% 0%, rgba(56,189,248,0.08) 0%, transparent 60%)",
                    backgroundSize: "28px 28px, auto",
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)]"
                    >
                      Scheduled reports
                    </p>
                    <h1 className="mt-1 text-[28px] font-bold text-white">Automated weekly reports</h1>
                    <p className="mt-1.5 max-w-xl text-[14px] leading-relaxed text-white/60">
                      Handover pulls your HaloPSA tickets and emails a generated report automatically.
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                    <>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={schEnabled}
                        aria-label={schEnabled ? "Scheduled reports enabled" : "Scheduled reports disabled"}
                        onClick={() => setSchEnabled((v) => !v)}
                        className={cn(
                          "h-14 min-w-[132px] shrink-0 rounded-full border-2 px-6 text-[13px] font-semibold transition-colors duration-200",
                          schEnabled
                            ? "border-emerald-500/60 bg-emerald-600/35 text-emerald-100 shadow-[0_0_20px_rgba(34,197,94,0.2)]"
                            : "border-slate-500/50 bg-slate-600/25 text-slate-300",
                        )}
                      >
                        {schEnabled ? "Enabled" : "Disabled"}
                      </button>

                      <button
                        type="button"
                        onClick={() => createNewSchedule()}
                        className="h-14 shrink-0 rounded-full bg-[var(--accent)] px-5 text-[13px] font-semibold text-white shadow-[0_0_20px_rgba(56,189,248,0.15)] hover:brightness-110"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Plus className="size-4" />
                          New schedule +
                        </span>
                      </button>
                    </>
                  </div>
                </div>

                {!hasProAccess ? (
                  <div className="mb-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-[13px] text-[var(--text-secondary)]">
                    <span className="font-medium text-[var(--text-primary)]">Basic:</span> walk through the schedule
                    wizard and preview your setup. Upgrade to Pro to save and run automated weekly reports.
                  </div>
                ) : null}
                {scheduleLoading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="size-10 animate-spin text-[var(--accent)]" aria-hidden />
                  </div>
                ) : (
                  <>
                  <div className="mb-6">
                    {campaigns.length === 0 ? (
                      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-10 text-center">
                        <div className="mx-auto mb-4 size-12 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] flex items-center justify-center">
                          <Calendar className="size-5 text-[var(--accent)]" />
                        </div>
                        <h3 className="text-xl font-semibold text-[var(--text-primary)]">No scheduled reports yet</h3>
                        <p className="mt-2 text-[var(--text-secondary)]">
                          Set up your first automated report to save hours every week.
                        </p>
                        <button
                          type="button"
                          onClick={() => createNewSchedule()}
                          className="mt-5 inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white hover:brightness-110"
                        >
                          Create your first schedule →
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)]">
                        <div className="hidden w-full overflow-x-hidden md:block">
                          <table className="w-full table-fixed border-collapse text-left text-sm">
                            <thead>
                              <tr className="border-b border-[var(--border)]">
                                <th style={{ width: "22%" }} className="sticky top-0 z-10 bg-[var(--bg-secondary)] px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] shadow-[0_1px_0_var(--border)]">Schedule name</th>
                                <th style={{ width: "12%", minWidth: "100px" }} className="sticky top-0 z-10 bg-[var(--bg-secondary)] px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] shadow-[0_1px_0_var(--border)]">PSA source</th>
                                <th style={{ width: "8%" }} className="sticky top-0 z-10 bg-[var(--bg-secondary)] px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] shadow-[0_1px_0_var(--border)]">Frequency</th>
                                <th style={{ width: "12%" }} className="sticky top-0 z-10 bg-[var(--bg-secondary)] px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] shadow-[0_1px_0_var(--border)]">Next send date</th>
                                <th style={{ width: "18%" }} className="sticky top-0 z-10 bg-[var(--bg-secondary)] px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] shadow-[0_1px_0_var(--border)]">Recipients</th>
                                <th style={{ width: "10%" }} className="sticky top-0 z-10 bg-[var(--bg-secondary)] px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] shadow-[0_1px_0_var(--border)]">Status</th>
                                <th style={{ width: "18%" }} className="sticky top-0 z-10 bg-[var(--bg-secondary)] px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] shadow-[0_1px_0_var(--border)]">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {campaigns.map((c, idx) => {
                                const frequency =
                                  c.date_range === "last_14_days"
                                    ? "Fortnightly"
                                    : c.date_range === "last_30_days"
                                      ? "Monthly"
                                      : "Weekly";
                                const recipients = [c.email_to, c.email_cc, c.email_bcc]
                                  .filter((v) => typeof v === "string" && v.trim())
                                  .join(", ");
                                const psaSourceLabel =
                                  (c as { source?: string | null }).source === "connectwise"
                                    ? "ConnectWise"
                                    : "HaloPSA";
                                return (
                                  <tr
                                    key={c.id ?? idx}
                                    className="border-b border-[var(--border)]/70 transition-colors hover:bg-[var(--bg-secondary)]/45"
                                  >
                                    <td className="px-3 py-3 text-[var(--text-primary)]">
                                      <p className="truncate font-semibold" title={c.name?.trim() || "Weekly Report"}>{c.name?.trim() || "Weekly Report"}</p>
                                    </td>
                                    <td className="min-w-[100px] px-3 py-3 whitespace-nowrap text-[var(--text-secondary)]">
                                      <span className="block">{psaSourceLabel}</span>
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap text-[var(--text-secondary)]">{frequency}</td>
                                    <td className="px-3 py-3 whitespace-nowrap text-[var(--text-secondary)]">
                                      {c.next_run_at ? formatShortGmtDate(c.next_run_at) : "Not scheduled"}
                                    </td>
                                    <td className="px-3 py-3 text-[var(--text-secondary)]">
                                      <span className="block truncate" title={recipients || "Not set"}>{recipients || "Not set"}</span>
                                    </td>
                                    <td className="px-3 py-3">
                                      <button
                                        type="button"
                                        onClick={() => void toggleCampaignEnabled(c, !c.enabled)}
                                        className={cn(
                                          "inline-flex cursor-pointer items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors",
                                          c.enabled
                                            ? "bg-emerald-500 text-white hover:bg-emerald-600"
                                            : "bg-gray-200 text-gray-700 hover:bg-gray-300",
                                        )}
                                        aria-label={c.enabled ? "Pause schedule" : "Resume schedule"}
                                        title={c.enabled ? "Click to pause" : "Click to activate"}
                                      >
                                        {c.enabled ? "Active" : "Paused"}
                                      </button>
                                    </td>
                                    <td className="px-3 py-3">
                                      <div className="flex items-center gap-1 text-xs">
                                        <button
                                          type="button"
                                          title="Edit schedule"
                                          aria-label="Edit schedule"
                                          className="inline-flex size-7 items-center justify-center rounded-[var(--radius)] border border-[var(--border)] text-[var(--accent)] hover:bg-[var(--bg-secondary)]"
                                          onClick={() => openEditScheduleEditor(c)}
                                        >
                                          <Edit2 className="size-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          title="Send now"
                                          aria-label="Send now"
                                          disabled={!c.id || (scheduleSaving && sendingNowId === c.id)}
                                          className="inline-flex size-7 items-center justify-center rounded-[var(--radius)] border border-[var(--border)] text-teal-600 hover:bg-teal-50 disabled:opacity-60"
                                          onClick={() => {
                                            if (!c.id) return;
                                            void triggerScheduleNow(c.id);
                                          }}
                                        >
                                          {scheduleSaving && sendingNowId === c.id ? (
                                            <Loader2 className="size-3.5 animate-spin" />
                                          ) : (
                                            <Play className="size-3.5" />
                                          )}
                                        </button>
                                        <button
                                          type="button"
                                          title="Delete schedule"
                                          aria-label="Delete schedule"
                                          disabled={!c.id}
                                          className="inline-flex size-7 items-center justify-center rounded-[var(--radius)] border border-[var(--border)] text-red-500 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-60"
                                          onClick={() => {
                                            if (!c.id) return;
                                            setDeleteConfirmScheduleId(c.id);
                                          }}
                                        >
                                          <Trash2 className="size-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        <div className="space-y-3 p-4 md:hidden">
                          {campaigns.map((c, idx) => {
                            const frequency =
                              c.date_range === "last_14_days"
                                ? "Fortnightly"
                                : c.date_range === "last_30_days"
                                  ? "Monthly"
                                  : "Weekly";
                            return (
                              <div
                                key={c.id ?? idx}
                                className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] p-4"
                              >
                                <p className="font-semibold text-[var(--text-primary)]">{c.name?.trim() || "Weekly Report"}</p>
                                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                  {frequency} · Next: {c.next_run_at ? formatShortGmtDate(c.next_run_at) : "Not scheduled"}
                                </p>
                                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                  Recipients: {c.email_to || "Not set"}
                                </p>
                                <div className="mt-3 flex items-center gap-2 text-xs">
                                  <button type="button" className="text-[var(--accent)]" onClick={() => openEditScheduleEditor(c)}>
                                    Edit
                                  </button>
                                  <span className="text-[var(--text-muted)]">·</span>
                                  <button type="button" className="text-[var(--text-secondary)]" onClick={() => void toggleCampaignEnabled(c, !c.enabled)}>
                                    {c.enabled ? "Pause" : "Resume"}
                                  </button>
                                  {c.id ? (
                                    <>
                                      <span className="text-[var(--text-muted)]">·</span>
                                      <button type="button" className="text-[var(--accent)]" onClick={() => void triggerScheduleNow(c.id!)}>
                                        Send now
                                      </button>
                                      <span className="text-[var(--text-muted)]">·</span>
                                      <button type="button" className="text-red-500" onClick={() => void deleteSchedule(c.id!)}>
                                        Delete
                                      </button>
                                    </>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
                    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-6">
                      <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">Campaign editor</h2>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        Open a schedule to edit settings in the side panel.
                      </p>
                      <div className="mt-4 flex items-center gap-2">
                        <Button type="button" onClick={() => createNewSchedule()}>
                          New schedule
                        </Button>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="sticky top-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center justify-between">
                          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Recent reports</h2>
                          <span className="rounded-full bg-[var(--bg-secondary)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">
                            {reportHistory.length}
                          </span>
                        </div>
                        <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                          Last 5 sent reports
                        </p>
                        {reportHistoryLoading ? (
                          <div className="mt-4 flex justify-center py-4">
                            <Loader2 className="size-5 animate-spin text-[var(--accent)]" aria-hidden />
                          </div>
                        ) : reportHistory.length === 0 ? (
                          <div className="mt-4 text-sm text-[var(--text-secondary)]">
                            <p>No reports sent yet.</p>
                            <p className="mt-1">Your schedules are set up and ready to run.</p>
                          </div>
                        ) : (
                          <ul className="mt-4 space-y-2">
                            {reportHistory.slice(0, 5).map((h, idx) => (
                              <li key={h.id} className={cn("rounded-[var(--radius)] border border-[var(--border)] p-2.5", idx % 2 ? "bg-[var(--bg-secondary)]/30" : "")}>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">
                                  {formatScheduleHistorySent(h.sent_at)}
                                </p>
                                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                                  {h.tickets_processed ?? 0} tickets · {h.clients_covered?.length ?? 0} clients
                                </p>
                                <span
                                  className={cn(
                                    "mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                                    h.status === "failed"
                                      ? "bg-red-500/10 text-red-500"
                                      : "bg-emerald-500/10 text-emerald-500",
                                  )}
                                >
                                  {h.status === "failed" ? "Failed" : "Sent"}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}

                        <h3 className="mt-5 text-[13px] font-semibold text-[var(--text-primary)]">
                          Upcoming runs
                        </h3>
                        {upcomingRuns.length === 0 ? (
                          <p className="mt-2 text-xs text-[var(--text-secondary)]">No upcoming runs.</p>
                        ) : (
                          <ul className="mt-2 space-y-1.5 text-xs text-[var(--text-secondary)]">
                            {upcomingRuns.map((c, idx) => (
                              <li key={c.id ?? idx}>
                                {formatScheduleTs(c.next_run_at)} - {c.name?.trim() || "Weekly Report"}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
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
                          {(["Basics", "Schedule", "Data", "Output", "Review"] as const).map((label, idx) => {
                            const complete = idx < schCampaignEditorTab;
                            const active = idx === schCampaignEditorTab;
                            return (
                              <div
                                key={label}
                                className={cn(
                                  "flex h-11 w-1/5 items-center justify-center border-b-2 text-center text-[12px]",
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
                          className="min-h-0 flex-1 overflow-y-auto [webkit-overflow-scrolling:touch]"
                        >
                        <div
                          className="w-full"
                          style={{
                            padding: "2rem 3rem",
                            background:
                              "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(56,189,248,0.05) 0%, transparent 60%)",
                          }}
                        >
                          {schCampaignEditorTab === 0 ? (
                            <div className="space-y-4">
                              <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-6">
                                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--accent)]">Campaign name</p>
                                <Input
                                  value={schName}
                                  onChange={(e) => setSchName(e.target.value)}
                                  placeholder="Weekly client update"
                                />
                              </div>
                              <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-6">
                                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--accent)]">Report type</p>
                                <div className="grid grid-cols-1 gap-2">
                                  {(["external", "internal", "note_to_self", "qbr"] as const).map((rt) => (
                                    <button
                                      key={rt}
                                      type="button"
                                      onClick={() => setSchReportType(rt)}
                                      className={cn(
                                        "relative flex cursor-pointer flex-col gap-2 rounded-[var(--radius-lg)] border-[1.5px] p-5 text-left transition-all duration-200",
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
                                              : rt === "qbr"
                                                ? "bg-amber-500/20 text-amber-300"
                                                : "bg-emerald-500/20 text-emerald-300",
                                        )}
                                      >
                                        {rt === "external" ? <Globe className="size-4" /> : rt === "internal" ? <LayoutList className="size-4" /> : rt === "qbr" ? <BarChart3 className="size-4" /> : <User className="size-4" />}
                                      </span>
                                      <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                                        {rt === "external" ? "External" : rt === "internal" ? "Internal" : rt === "qbr" ? "QBR pack" : "Note to self"}
                                      </p>
                                      <p className="text-[12px] leading-relaxed text-[var(--text-muted)]">
                                        {rt === "external"
                                          ? "Client-facing update email with action-focused language."
                                          : rt === "internal"
                                            ? "Internal delivery summary with operational context."
                                            : rt === "qbr"
                                              ? "Quarterly business review pack with charts, SLA, and business recommendations."
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
                            </div>
                          ) : null}

                          {schCampaignEditorTab === 1 ? (
                            <div className="space-y-4">
                              <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-6">
                                <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--accent)]">Delivery</p>
                                <div className="space-y-4">
                                  <div>
                                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Sent from</p>
                                    <Input value="noreply@gethandover.uk" disabled className="cursor-not-allowed opacity-70" />
                                    <p className="mt-1 text-xs text-[var(--text-muted)]">Replies go to your account email</p>
                                  </div>
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
                                    <p className="mb-2 mt-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Email subject</p>
                                    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-muted)]">
                                      {(schName?.trim() || "Weekly Report")} - [date will be added]
                                    </div>
                                    <p className="mt-1 text-xs italic text-[var(--text-muted)]">
                                      Subject is set automatically from your campaign name and date.
                                    </p>
                                  </div>
                                  <div>
                                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Recipient first name</p>
                                    <Input
                                      value={schRecipientName}
                                      onChange={(e) => setSchRecipientName(e.target.value)}
                                      placeholder="e.g. John"
                                    />
                                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                                      The email will start with "Hi [name]," - leave blank for generic greeting
                                    </p>
                                  </div>
                                  <div>
                                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Email tone</p>
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
                                  <div>
                                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Brand name in email</p>
                                    <Input
                                      value={schBrandName}
                                      onChange={(e) => setSchBrandName(e.target.value)}
                                      placeholder="e.g. Panacea Group"
                                    />
                                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                                      Replaces "Handover" in the email header. Leave blank to use "Handover".
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-6">
                                <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--accent)]">Timing</p>
                                <div className="space-y-4">
                                  <div>
                                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Day (GMT)</p>
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
                                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Time (GMT)</p>
                                    <select
                                      value={schTime}
                                      onChange={(e) => setSchTime(e.target.value)}
                                      className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 text-sm"
                                    >
                                      {SCHEDULE_TIME_OPTIONS.map((t) => (
                                        <option key={t.value} value={t.value}>
                                          {t.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : null}

                          {schCampaignEditorTab === 2 ? (
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
                                        <div className="flex min-h-[220px] items-center justify-center gap-2 text-sm text-[var(--text-secondary)]"><Loader2 className="size-4 animate-spin" />Loading your HaloPSA data...</div>
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
                                              <div className="max-h-[500px] space-y-0 overflow-y-auto rounded-[var(--radius)] border border-[var(--border)]">
                                                {ticketClientOptions.map((client) => {
                                                  const expanded = expandedTicketClients.has(client.id);
                                                  const clientTickets = allTickets.filter((t) => Number(t.clientId ?? t.client_id) === client.id);
                                                  const allChecked = clientTickets.length > 0 && clientTickets.every((t) => selectedTicketIds.includes(Number(t.id)));
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
                                                        <span className="rounded bg-[var(--bg-secondary)] px-1.5 py-0.5">{getTicketCountForClient(client.id, allTickets)}</span>
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
                                          <div className="max-h-[500px] space-y-0 overflow-y-auto rounded-[var(--radius)] border border-[var(--border)]">
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

                          {schCampaignEditorTab === 3 ? (
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
                                        <div className="grid max-h-[280px] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
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
                          ) : null}

                          {schCampaignEditorTab === 4 ? (
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.9fr_1fr]">
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
                                    <button type="button" className="text-[12px] text-[var(--accent)]" onClick={() => setSchCampaignEditorTab(1)}>Edit →</button>
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
                                    <button type="button" className="text-[12px] text-[var(--accent)]" onClick={() => setSchCampaignEditorTab(2)}>Edit →</button>
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
                                  <p className="text-[13px] font-semibold text-[var(--text-primary)]">What you'll receive</p>
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
                          ) : null}
                        </div>
                        </div>

                        <div className="relative flex h-16 shrink-0 items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--bg-primary)] px-8 py-4">
                          <div>
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
                          <div className="ml-auto text-right">
                            {schCampaignEditorTab === 2 ? (
                              <p className="mb-1 text-xs text-[var(--text-secondary)]">
                                Tickets: {selectedTicketIds.length} selected · Projects: {selectedProjectIds.length} selected
                              </p>
                            ) : null}
                            {schCampaignEditorTab < 4 ? (
                              <Button
                                type="button"
                                className={cn("bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]", primaryModalButtonClass)}
                                disabled={
                                  schCampaignEditorTab === 2 &&
                                  !canProceedStep3
                                }
                                onClick={() => setSchCampaignEditorTab((s) => Math.min(4, s + 1))}
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
              <div
                className={cn(
                  !hasProAccess &&
                    "pointer-events-none select-none blur-[3px] brightness-[0.72] saturate-[0.85]",
                )}
              >
                <DeliveryHealthDashboard
                  focusRing={focusRing}
                  dashboardAccess={deliveryDashboardAccess === "read" ? "read" : "full"}
                  onOpenIntegrations={() => {
                    setMainView("integrations");
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
                      Connect HaloPSA and get real-time RAG status across all your projects. Available on Pro.
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
                      Upgrade to Pro
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
            </div>
          ) : userEmail && mainView === "integrations" ? (
            <IntegrationsPanel
              hasProFeatures={hasProAccess}
              userTeamId={userTeamId}
              integrationsBootstrapping={integrationsBootstrapping}
              initialOpenDetail={integrationsInitialDetail}
              onConsumedInitialOpenDetail={() => setIntegrationsInitialDetail(null)}
              haloConnected={haloConnected}
              haloUrl={haloUrl}
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
              fileInputRef={fileInputRef}
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
            />
          ) : (
          <>
            {userEmail && mainView === "reports" ? (
              <>
                <div className="mb-6 w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] md:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                  Quarterly business review
                </p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)] md:text-3xl">
                  QBR Pack
                </h1>
                <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-[var(--text-secondary)]">
                  Connect your PSA, pick clients and date range, then generate branded PDF, Excel, and PowerPoint in one
                  pass.
                </p>
                <div className="mt-6">
                  <QbrPackBuilder
                    embedded
                    hasProAccess={hasProAccess}
                    defaultBrandName={brandName.trim() || "Handover"}
                    defaultBrandColor={brandColour || "#38bdf8"}
                    brandLogoUrl={brandLogoUrl.trim() || null}
                    usageHint={qbrUsageHint}
                  />
                </div>
                </div>
              </>
            ) : null}
            {(!userEmail || mainView === "generate") ? (
            userEmail && soloGenerationLocked ? (
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
            {userEmail && !result && !isGenerating && dashGreeting ? (
              <div className="mb-3 flex flex-col justify-between gap-2 border-b border-[var(--border)] pb-3 sm:flex-row sm:items-center">
                <div>
                  <p className="text-[16px] font-semibold text-[var(--text-primary)]">
                    {dashGreeting}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                    Paste your notes or import from HaloPSA to get started.
                  </p>
                </div>
                <p className="shrink-0 text-[11px] text-[var(--text-muted)]">
                  {new Date().toLocaleDateString("en-GB", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            ) : null}
            <section
              ref={inputSectionRef}
              className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
            >
              <div
                className="flex flex-col gap-1.5 border-b border-[var(--border)] bg-[var(--bg-secondary)] px-[14px] py-2"
                style={{ borderRadius: "var(--radius-lg) var(--radius-lg) 0 0" }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="handover-pulse size-1.5 shrink-0 rounded-full bg-[var(--accent)]"
                      aria-hidden
                    />
                    <span className="text-[12px] font-medium text-[var(--text-muted)]">
                      New generation
                    </span>
                  </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
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
                  {userEmail && hasProAccess && psaConnections.multiple ? (
                    <details className="relative">
                      <summary
                        className={cn(
                          "inline-flex h-7 cursor-pointer list-none items-center gap-1 rounded-[var(--radius)] border border-[var(--border)] px-2.5 text-[11px] text-[var(--text-secondary)]",
                          focusRing,
                        )}
                      >
                        <Database className="size-3 shrink-0" />
                        Import from PSA
                        <ChevronDown className="size-3 shrink-0" />
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
                  ) : userEmail && hasProAccess && psaConnections.primary ? (
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "h-7 gap-1 border-[var(--border)] px-2.5 text-[11px] text-[var(--text-secondary)] transition-all duration-[120ms] ease-in-out",
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
                      <Database className="size-3 shrink-0" />
                      {`Import from ${importPsaLabel}`}
                      <span className="ml-0.5 inline-block size-1.5 rounded-full bg-emerald-500" aria-hidden />
                    </Button>
                  ) : userEmail && hasProAccess && !psaConnections.primary ? (
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "h-7 gap-1 border-[var(--border)] px-2.5 text-[11px] text-[var(--text-muted)] transition-all duration-[120ms] ease-in-out",
                        focusRing,
                      )}
                      disabled
                      title="Connect a PSA in Integrations to import tickets"
                    >
                      <Database className="size-3 shrink-0" />
                      Import from PSA
                    </Button>
                  ) : userEmail && !hasProAccess ? (
                    <button
                      type="button"
                      title="Connect a PSA - available on Pro plan"
                      className={cn(
                        "inline-flex h-7 shrink-0 items-center gap-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] px-2.5 text-[11px] text-[var(--text-muted)] transition-all duration-[120ms] ease-in-out hover:bg-[var(--bg-tertiary)]",
                        focusRing,
                      )}
                      onClick={() => setHaloProModalOpen(true)}
                    >
                      <Database className="size-3" aria-hidden />
                      <span>Import from PSA</span>
                      <span className="rounded-full bg-[var(--accent)] px-1.5 py-px text-[9px] font-semibold text-white">
                        Pro
                      </span>
                    </button>
                  ) : null}
                  {privacyMode ? (
                    <span
                      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        backgroundColor: "rgba(56,189,248,0.08)",
                        border: "1px solid rgba(56,189,248,0.2)",
                        color: "var(--accent)",
                      }}
                    >
                      <Shield className="size-3" aria-hidden />
                      Privacy mode on
                    </span>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    title="Supported formats: CSV (.csv), Microsoft Excel (.xlsx, .xls), Word (.docx)."
                    className={cn(
                      "h-7 border-[var(--border)] px-2.5 text-[11px] text-[var(--text-secondary)] transition-all duration-[120ms] ease-in-out",
                      focusRing,
                    )}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-1 size-3" aria-hidden />
                    Import file (CSV, Excel, Word)
                  </Button>
                </div>
                </div>
                <p className="text-[10px] leading-snug text-[var(--text-muted)] sm:text-right">
                  File import: CSV (.csv), Microsoft Excel (.xlsx, .xls), Word (.docx).
                </p>
              </div>

              <div className="space-y-3 p-[14px]">
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
                ) : null}

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
                <Textarea
                  ref={generateInputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Paste meeting notes, ticket updates, or project data here..."
                  rows={6}
                  maxLength={15000}
                  className={cn(
                    "min-h-[160px] resize-y border-0 bg-transparent px-0 py-1 text-[14px] placeholder:text-[var(--text-muted)] focus-visible:ring-0",
                    focusRing,
                  )}
                  disabled={isGenerating}
                  aria-label="Project notes input"
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                      e.preventDefault();
                      void openGenerateOptionsModal();
                    }
                  }}
                />
                <p className="hidden text-[11px] text-[var(--text-muted)] md:block">
                  ⌘ + Enter to generate
                </p>
                <div className="mt-2 flex flex-col gap-3 border-t border-[var(--border)] pt-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                    {showCharacterCount ? (
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs" style={{ color: inputCounterColor }}>
                          {charCount.toLocaleString()} / 15,000 characters
                        </p>
                        <span
                          className="inline-flex shrink-0 cursor-help text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
                          title="Large inputs are automatically compacted to preserve the most relevant ticket notes while staying within AI limits."
                          aria-label="Large inputs are automatically compacted to preserve the most relevant ticket notes while staying within AI limits."
                        >
                          <Info className="size-3.5" strokeWidth={2} aria-hidden />
                        </span>
                      </div>
                    ) : null}
                    {Boolean(userEmail) && !hasProAccess && trialInfo?.active ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-[var(--text-muted)]">
                          Trial: {trialInfo.used}/10
                        </span>
                        <div
                          className="h-[3px] w-[120px] overflow-hidden rounded-full bg-[var(--border)]"
                          aria-hidden
                        >
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(100, (trialInfo.used / 10) * 100)}%`,
                              background:
                                trialInfo.used >= 9
                                  ? "#D85A30"
                                  : trialInfo.used >= 7
                                    ? "#BA7517"
                                    : "var(--accent)",
                            }}
                          />
                        </div>
                      </div>
                    ) : null}
                    {charCount > 13000 && charCount < 15000 ? (
                      <p className="text-[12px] text-[#BA7517]">
                        Large inputs may reduce output quality. Consider selecting fewer tickets.
                      </p>
                    ) : null}
                    {charCount >= 15000 ? (
                      <p className="text-[12px] text-[#BA7517]">
                        Large input detected - content will be intelligently compacted before generation. You can
                        still generate.
                      </p>
                    ) : null}
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    <Button
                      type="button"
                      size="lg"
                      className={cn(
                        "w-full gap-2 rounded-[var(--radius)] bg-[var(--accent)] px-5 py-2.5 text-[13px] font-medium text-white transition-all duration-[120ms] ease-in-out hover:bg-[var(--accent-hover)] disabled:opacity-80 sm:w-auto",
                        focusRing,
                      )}
                      disabled={isGenerating || !input.trim()}
                      onClick={() => void openGenerateOptionsModal()}
                    >
                      {isGenerating ? (
                        <>
                          <svg className="size-4 animate-spin" viewBox="0 0 24 24" aria-hidden>
                            <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" fill="none" opacity="0.35" />
                            <path d="M22 12a10 10 0 0 1-10 10" stroke="white" strokeWidth="3" fill="none" />
                          </svg>
                          {generationProgressLabel}
                        </>
                      ) : (
                        "Generate Outputs"
                      )}
                    </Button>
                  </div>
                  {isGenerating ? (
                    <div
                      className="mt-2 h-0.5 w-full max-w-md overflow-hidden rounded-full bg-[var(--border)] sm:ml-auto"
                      aria-hidden
                    >
                      <div className="h-full w-2/5 animate-pulse rounded-full bg-[var(--accent)]" />
                    </div>
                  ) : null}
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
                {Boolean(userEmail) && !hasProAccess && trialInfo?.active ? (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-muted)]">
                    <span>
                      Trial ends{" "}
                      {new Date(trialInfo.endsAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      · After trial: Basic plan limits apply
                    </span>
                    <button
                      type="button"
                      className={cn("text-[var(--accent)] transition-colors hover:underline", focusRing)}
                      onClick={() => setHeaderUpgradeOpen(true)}
                    >
                      Upgrade for unlimited →
                    </button>
                  </div>
                ) : null}
                {Boolean(userEmail) &&
                !hasProAccess &&
                trialInfo?.active &&
                trialInfo.remaining <= 2 ? (
                  <p className="text-[12px] font-medium text-[#D85A30]">
                    Only {trialInfo.remaining} trial generation
                    {trialInfo.remaining === 1 ? "" : "s"} left
                  </p>
                ) : null}
                {Boolean(userEmail) &&
                !hasProAccess &&
                !trialInfo &&
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
                          Something went wrong. Please try again.
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() => void openGenerateOptionsModal()}
                        >
                          Retry
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
          </section>
            {dashStats ? (
              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <div
                  className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3.5 py-3 transition-[border-color] duration-150 hover:border-[rgba(56,189,248,0.3)]"
                >
                  <div className="flex items-start gap-2">
                    <Zap className="mt-0.5 size-[14px] shrink-0 text-[var(--accent)]" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                        Total generations
                      </p>
                      <p className="mt-1 text-[22px] font-semibold leading-none text-[var(--text-primary)]">
                        {dashStats.total}
                      </p>
                      <p className="mt-1 text-[11px] text-[var(--text-muted)]">All time</p>
                    </div>
                  </div>
                </div>
                <div
                  className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3.5 py-3 transition-[border-color] duration-150 hover:border-[rgba(56,189,248,0.3)]"
                >
                  <div className="flex items-start gap-2">
                    <Calendar className="mt-0.5 size-[14px] shrink-0 text-[var(--accent)]" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                        This month
                      </p>
                      <p className="mt-1 text-[22px] font-semibold leading-none text-[var(--text-primary)]">
                        {dashStats.thisMonth}
                      </p>
                      <p className="mt-1 truncate text-[11px] text-[var(--text-muted)]">
                        {dashStats.monthName}
                      </p>
                    </div>
                  </div>
                </div>
                <div
                  className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3.5 py-3 transition-[border-color] duration-150 hover:border-[rgba(56,189,248,0.3)]"
                >
                  <div className="flex items-start gap-2">
                    <Clock className="mt-0.5 size-[14px] shrink-0 text-[var(--accent)]" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                        Last generated
                      </p>
                      <p className="mt-1 text-[22px] font-semibold leading-none text-[var(--text-primary)]">
                        {dashStats.lastAgo}
                      </p>
                      <p className="mt-1 truncate text-[11px] text-[var(--text-muted)]" title={dashStats.lastTitle}>
                        {dashStats.lastTitle}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            </>
            )
            ) : null}
          </>
        )
        )}

        {isGenerating &&
        !(userEmail &&
          (mainView === "integrations" ||
            mainView === "scheduled" ||
            mainView === "delivery" ||
            mainView === "reports")) ? (
          <ResultsSkeleton />
        ) : null}

        {!isGenerating &&
        result &&
        !(userEmail &&
          (mainView === "integrations" ||
            mainView === "scheduled" ||
            mainView === "delivery" ||
            mainView === "reports")) ? (
          <div
            ref={outputRef}
            className={cn(
              signedOutCompactMode ? "mt-0 animate-in fade-in slide-in-from-right-4 duration-300" : "mt-8",
              "flex max-h-[min(88dvh,calc(100dvh-13rem))] min-h-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)]",
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
                    disabled={isGenerating || !input.trim()}
                    onClick={() => {
                      setIsEditingSignedOutInput(false);
                      setExportLockedPromptOpen(false);
                      void openGenerateOptionsModal();
                    }}
                  >
                    Generate again
                  </Button>
                </div>
              </div>
            ) : null}
            <Tabs
              value={outputMainTab}
              onValueChange={setOutputMainTab}
              className="flex min-h-0 w-full flex-1 flex-col gap-0"
            >
            {isRewritingEmail ? (
              <div
                className="h-0.5 w-full shrink-0 overflow-hidden bg-[var(--border)]"
                aria-hidden
              >
                <div className="h-full w-full origin-left animate-pulse bg-[var(--accent)]" />
              </div>
            ) : null}
            <div className="flex shrink-0 items-stretch bg-[var(--bg-secondary)]">
              <div className="min-h-0 min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <TabsList
                  variant="line"
                  className="flex h-[42px] min-h-0 w-max min-w-full shrink-0 flex-nowrap items-end overflow-x-visible rounded-none border-0 border-b border-[var(--border)] bg-[var(--bg-secondary)] p-0 pl-4 pr-2"
                >
                  {visibleCoreTabsList.map((key) => (
                    <TabsTrigger
                      key={key}
                      value={key}
                      className="flex h-full shrink-0 items-center rounded-none border-b-2 border-transparent bg-transparent px-4 text-[13px] text-[var(--text-muted)] shadow-none transition-[color,border-color] duration-[120ms] after:hidden hover:text-[var(--text-secondary)] data-[state=active]:border-[var(--accent)] data-[state=active]:font-medium data-[state=active]:text-[var(--text-primary)]"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {OUTPUT_TAB_TRIGGER_LABELS[key]}
                        {key === "client_email" && isRewritingEmail ? (
                          <span className="text-[10px] font-normal text-[var(--text-muted)]">
                            Rewriting…
                          </span>
                        ) : null}
                      </span>
                    </TabsTrigger>
                  ))}
                  {visibleExtendedTabsList.map((key) => (
                    <TabsTrigger
                      key={key}
                      value={key}
                      className="flex h-full shrink-0 items-center rounded-none border-b-2 border-transparent bg-transparent px-4 text-[13px] text-[var(--text-muted)] shadow-none transition-[color,border-color] duration-[120ms] after:hidden hover:text-[var(--text-secondary)] data-[state=active]:border-[var(--accent)] data-[state=active]:font-medium data-[state=active]:text-[var(--text-primary)]"
                    >
                      {EXTENDED_PM_TAB_LABELS[key]}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {smartActionsEligible ? (
                <div className="flex shrink-0 items-center border-l border-b border-[var(--border)] px-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={cn(
                      "h-8 shrink-0 gap-1 whitespace-nowrap rounded-[var(--radius)] border-[var(--border)] px-2.5 text-[11px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]",
                      focusRing,
                    )}
                    onClick={() => setSmartActionsOpen(true)}
                  >
                    <span aria-hidden>⚡</span> Smart Actions
                  </Button>
                </div>
              ) : null}
            </div>

            {visibleCoreTabsList.includes("actions") ? (
            <TabsContent
              value="actions"
              className="mt-0 min-h-0 flex-1 overflow-y-auto rounded-b-[var(--radius-lg)] border border-t-0 border-[var(--border)] bg-[var(--bg-primary)] p-5"
            >
              <Card className="border-0 bg-transparent shadow-none">
                <CardHeader className="flex-row items-center justify-between gap-4 border-b p-0 pb-4">
                  <CardTitle className="text-base">Actions</CardTitle>
                  <CardAction className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copyWithFeedback(
                          "actions",
                          formatActionsForCopy(result.actions, ticketTitlesForSourceColumn),
                        )
                      }
                    >
                      {copiedKey === "actions" ? "Copied!" : "Copy"}
                    </Button>
                    {renderPushActionTrigger("actions")}
                  </CardAction>
                </CardHeader>
                {lastPushed && lastPushedOutputs.includes("actions") ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {`Pushed to ${lastPushedPsaLabel} · ${pushedRelativeText()}`}
                  </div>
                ) : null}
                <CardContent className="p-0 pt-0">
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="bg-[var(--bg-secondary)] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                          Task
                        </TableHead>
                        <TableHead className="bg-[var(--bg-secondary)] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                          Owner
                        </TableHead>
                        <TableHead className="bg-[var(--bg-secondary)] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                          Priority
                        </TableHead>
                        {showTicketSourceColumn ? (
                          <TableHead className="bg-[var(--bg-secondary)] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                            Source
                          </TableHead>
                        ) : null}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.actions.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={showTicketSourceColumn ? 4 : 3}
                            className="whitespace-normal px-4 py-3 text-[var(--text-secondary)]"
                          >
                            No actions returned.
                          </TableCell>
                        </TableRow>
                      ) : (
                        result.actions.map((row, idx) => (
                          <TableRow
                            key={idx}
                            className={cn(
                              idx !== result.actions.length - 1 &&
                                "border-b border-[var(--border)]",
                            )}
                          >
                            <TableCell className="max-w-md whitespace-normal px-3 py-2.5 text-[13px] font-medium">
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
                            <TableCell className="whitespace-normal px-3 py-2.5 text-[13px]">
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
                            <TableCell className="flex items-center gap-2 px-3 py-2.5 text-[13px]">
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
                                onClick={() =>
                                  setEditingActionRow((curr) =>
                                    curr === idx ? null : idx,
                                  )
                                }
                              >
                                <Pencil className="size-3.5" />
                                {editingActionRow === idx ? "Done" : "Edit"}
                              </Button>
                            </TableCell>
                            {showTicketSourceColumn ? (
                              <TableCell className="align-middle px-3 py-2.5">
                                <span
                                  className="inline-block max-w-[11rem] truncate rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-2 py-0.5 text-[11px] font-normal text-[var(--text-muted)]"
                                  title={
                                    actionSourceFullTitleForTooltip(
                                      row,
                                      ticketTitlesForSourceColumn,
                                    ) ?? undefined
                                  }
                                >
                                  {actionSourceDisplayLabel(row, ticketTitlesForSourceColumn)}
                                </span>
                              </TableCell>
                            ) : null}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  </div>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={regenInstruction.actions || ""}
                      onChange={(e) =>
                        setRegenInstruction((prev) => ({
                          ...prev,
                          actions: e.target.value,
                        }))
                      }
                      placeholder="Tweak this output... e.g. make it shorter, add more detail about the risk"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={regenLoadingFor === "actions"}
                      onClick={() => void handleRegenerate("actions")}
                    >
                      {regenLoadingFor === "actions" ? "Regenerating..." : "Regenerate"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            ) : null}

            {visibleCoreTabsList.includes("risks") ? (
            <TabsContent
              value="risks"
              className="mt-0 min-h-0 flex-1 overflow-y-auto rounded-b-[var(--radius-lg)] border border-t-0 border-[var(--border)] bg-[var(--bg-primary)] p-5"
            >
              <Card className="border-0 bg-transparent shadow-none">
                <CardHeader className="flex-row items-center justify-between gap-4 border-b p-0 pb-4">
                  <CardTitle className="text-base">Risks</CardTitle>
                  <CardAction className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copyWithFeedback(
                          "risks",
                          formatRisksForCopy(result.risks, ticketTitlesForSourceColumn),
                        )
                      }
                    >
                      {copiedKey === "risks" ? "Copied!" : "Copy"}
                    </Button>
                    {renderPushActionTrigger("risks")}
                  </CardAction>
                </CardHeader>
                {lastPushed && lastPushedOutputs.includes("risks") ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {`Pushed to ${lastPushedPsaLabel} · ${pushedRelativeText()}`}
                  </div>
                ) : null}
                <CardContent className="p-0 pt-0">
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Risk</TableHead>
                        <TableHead>Impact</TableHead>
                        <TableHead>Mitigation</TableHead>
                        {showTicketSourceColumn ? (
                          <TableHead className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                            Source
                          </TableHead>
                        ) : null}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.risks.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={showTicketSourceColumn ? 4 : 3}
                            className="whitespace-normal text-muted-foreground"
                          >
                            No risks returned.
                          </TableCell>
                        </TableRow>
                      ) : (
                        result.risks.map((row, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="max-w-xs whitespace-normal">
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
                            <TableCell className="max-w-xs whitespace-normal">
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
                            <TableCell className="max-w-md whitespace-normal">
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
                                    onClick={() => setEditingRiskRow(null)}
                                  >
                                    Done
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-start justify-between gap-2">
                                  <span>{row.mitigation ?? "-"}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingRiskRow(idx)}
                                  >
                                    <Pencil className="size-3.5" />
                                    Edit
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                            {showTicketSourceColumn ? (
                              <TableCell className="align-middle">
                                <span
                                  className="inline-block max-w-[11rem] truncate rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-2 py-0.5 text-[11px] font-normal text-[var(--text-muted)]"
                                  title={
                                    riskSourceFullTitleForTooltip(
                                      row,
                                      ticketTitlesForSourceColumn,
                                    ) ?? undefined
                                  }
                                >
                                  {riskSourceDisplayLabel(row, ticketTitlesForSourceColumn)}
                                </span>
                              </TableCell>
                            ) : null}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  </div>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={regenInstruction.risks || ""}
                      onChange={(e) =>
                        setRegenInstruction((prev) => ({
                          ...prev,
                          risks: e.target.value,
                        }))
                      }
                      placeholder="Tweak this output... e.g. make it shorter, add more detail about the risk"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={regenLoadingFor === "risks"}
                      onClick={() => void handleRegenerate("risks")}
                    >
                      {regenLoadingFor === "risks" ? "Regenerating..." : "Regenerate"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            ) : null}

            {visibleCoreTabsList.includes("summary") ? (
            <TabsContent
              value="summary"
              className="mt-0 min-h-0 flex-1 overflow-y-auto rounded-b-[var(--radius-lg)] border border-t-0 border-[var(--border)] bg-[var(--bg-primary)] p-5"
            >
              <Card className="border-0 bg-transparent shadow-none">
                <CardHeader className="flex-row items-center justify-between gap-4 border-b p-0 pb-4">
                  <CardTitle className="text-base">Summary</CardTitle>
                  <CardAction className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copyWithFeedback("summary", result.summary)
                      }
                    >
                      {copiedKey === "summary" ? "Copied!" : "Copy"}
                    </Button>
                    {renderPushActionTrigger("summary")}
                  </CardAction>
                </CardHeader>
                {lastPushed && lastPushedOutputs.includes("summary") ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {`Pushed to ${lastPushedPsaLabel} · ${pushedRelativeText()}`}
                  </div>
                ) : null}
                <CardContent className="p-0 pt-0">
                  {editingField === "summary" ? (
                    <Textarea
                      value={result.summary || ""}
                      onChange={(e) =>
                        setResult((prev) =>
                          prev ? { ...prev, summary: e.target.value } : prev,
                        )
                      }
                      rows={6}
                      className="min-h-28"
                      onBlur={() => setEditingField(null)}
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => setEditingField("summary")}
                    >
                      <p className="mb-2 text-xs text-muted-foreground">
                        Click to edit
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                        {result.summary || "-"}
                      </p>
                    </button>
                  )}
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={regenInstruction.summary || ""}
                      onChange={(e) =>
                        setRegenInstruction((prev) => ({
                          ...prev,
                          summary: e.target.value,
                        }))
                      }
                      placeholder="Tweak this output... e.g. make it shorter, add more detail about the risk"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={regenLoadingFor === "summary"}
                      onClick={() => void handleRegenerate("summary")}
                    >
                      {regenLoadingFor === "summary" ? "Regenerating..." : "Regenerate"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            ) : null}

            {visibleCoreTabsList.includes("client_email") ? (
            <TabsContent
              value="client_email"
              className="mt-0 min-h-0 flex-1 overflow-y-auto rounded-b-[var(--radius-lg)] border border-t-0 border-[var(--border)] bg-[var(--bg-primary)] p-5"
            >
              <Card className="border-0 bg-transparent shadow-none">
                <CardHeader className="flex-row items-center justify-between gap-4 border-b p-0 pb-4">
                  <CardTitle className="text-base">Client Email</CardTitle>
                  <CardAction>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {(["formal", "professional", "friendly"] as Tone[]).map((t) => (
                        <Button
                          key={t}
                          type="button"
                          size="sm"
                          variant={emailTone === t ? "default" : "outline"}
                          disabled={isRewritingEmail}
                          onClick={() => setEmailTone(t)}
                        >
                          {t === "professional" ? "Professional (default)" : toneLabel(t)}
                        </Button>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyWithFeedback("client_email", activeClientEmailBody)
                        }
                      >
                        {copiedKey === "client_email" ? "Copied!" : "Copy"}
                      </Button>
                      {renderPushActionTrigger("client_email")}
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
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 border-[var(--border)]"
                        disabled={!userEmail}
                        title={
                          userEmail
                            ? "Send this email from noreply@gethandover.uk"
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
                <CardContent className="flex flex-col gap-4 p-0">
                  <Button
                    type="button"
                    className="w-full sm:w-fit"
                    onClick={() =>
                      copyWithFeedback("client_email_btn", activeClientEmailBody)
                    }
                  >
                    {copiedKey === "client_email_btn" ? "Copied!" : "Copy Email"}
                  </Button>
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
                  <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] p-4 text-sm leading-relaxed text-foreground">
                    {editingField === "client_email" ? (
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
                        className="min-h-36"
                        onBlur={() => setEditingField(null)}
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => setEditingField("client_email")}
                      >
                        {(clientEmailSections.length > 1
                          ? activeClientEmailBody || "-"
                          : result.client_email || "-"
                        )
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
                    )}
                  </div>
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
                        className="w-full sm:w-fit"
                        onClick={() => {
                          setSaveTemplateFor("email");
                          setTemplateNameDraft("");
                        }}
                      >
                        Save as template
                      </Button>
                    </div>
                  )}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={regenInstruction.client_email || ""}
                      onChange={(e) =>
                        setRegenInstruction((prev) => ({
                          ...prev,
                          client_email: e.target.value,
                        }))
                      }
                      placeholder="Tweak this output... e.g. make it shorter, add more detail about the risk"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={regenLoadingFor === "client_email"}
                      onClick={() => void handleRegenerate("client_email")}
                    >
                      {regenLoadingFor === "client_email" ? "Regenerating..." : "Regenerate"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            ) : null}

            {visibleCoreTabsList.includes("status_report") ? (
            <TabsContent
              value="status_report"
              className="mt-0 min-h-0 flex-1 overflow-y-auto rounded-b-[var(--radius-lg)] border border-t-0 border-[var(--border)] bg-[var(--bg-primary)] p-5"
            >
              <Card className="border-0 bg-transparent shadow-none">
                <CardHeader className="flex-row items-center justify-between gap-4 border-b p-0 pb-4">
                  <CardTitle className="text-base">Status Report</CardTitle>
                  <CardAction className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copyWithFeedback(
                          "status_report",
                          result.status_report,
                        )
                      }
                    >
                      {copiedKey === "status_report" ? "Copied!" : "Copy"}
                    </Button>
                    {renderPushActionTrigger("status_report")}
                  </CardAction>
                </CardHeader>
                {lastPushed && lastPushedOutputs.includes("status_report") ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {`Pushed to ${lastPushedPsaLabel} · ${pushedRelativeText()}`}
                  </div>
                ) : null}
                <CardContent className="flex flex-col gap-4 p-0">
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full sm:w-fit"
                    onClick={() =>
                      copyWithFeedback(
                        "status_report_btn",
                        coerceStringOutput(result.status_report),
                      )
                    }
                  >
                    {copiedKey === "status_report_btn"
                      ? "Copied!"
                      : "Copy Report"}
                  </Button>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {editingField === "status_report" ? (
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
                        className="min-h-36"
                        onBlur={() => setEditingField(null)}
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => setEditingField("status_report")}
                      >
                        <span className="mb-2 block text-xs text-muted-foreground">
                          Click to edit
                        </span>
                        {result.status_report
                          ? renderStatusReportDisplay(coerceStringOutput(result.status_report))
                          : (
                              <span className="text-muted-foreground">-</span>
                            )}
                      </button>
                    )}
                  </div>
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
                        className="w-full sm:w-fit"
                        onClick={() => {
                          setSaveTemplateFor("report");
                          setTemplateNameDraft("");
                        }}
                      >
                        Save as template
                      </Button>
                    </div>
                  )}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={regenInstruction.status_report || ""}
                      onChange={(e) =>
                        setRegenInstruction((prev) => ({
                          ...prev,
                          status_report: e.target.value,
                        }))
                      }
                      placeholder="Tweak this output... e.g. make it shorter, add more detail about the risk"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={regenLoadingFor === "status_report"}
                      onClick={() => void handleRegenerate("status_report")}
                    >
                      {regenLoadingFor === "status_report" ? "Regenerating..." : "Regenerate"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            ) : null}

            {visibleExtendedTabsList.map((extKey) => (
              <TabsContent
                key={extKey}
                value={extKey}
                className="mt-0 min-h-0 flex-1 overflow-y-auto rounded-b-[var(--radius-lg)] border border-t-0 border-[var(--border)] bg-[var(--bg-primary)] p-5"
              >
                <Card className="border-0 bg-transparent shadow-none">
                  <CardHeader className="flex-row items-center justify-between gap-4 border-b p-0 pb-4">
                    <CardTitle className="text-base">
                      {EXTENDED_PM_TAB_LABELS[extKey]}
                    </CardTitle>
                    <CardAction>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyWithFeedback(
                            `ext_${extKey}`,
                            result[extKey] ?? "",
                          )
                        }
                      >
                        {copiedKey === `ext_${extKey}` ? "Copied!" : "Copy"}
                      </Button>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="p-0 pt-0">
                    <p className="mb-2 text-xs text-muted-foreground">Click to edit</p>
                    <Textarea
                      value={result[extKey] ?? ""}
                      onChange={(e) =>
                        setResult((prev) =>
                          prev ? { ...prev, [extKey]: e.target.value } : prev,
                        )
                      }
                      rows={14}
                      className="min-h-[12rem] whitespace-pre-wrap font-sans text-sm leading-relaxed"
                      aria-label={EXTENDED_PM_TAB_LABELS[extKey]}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            ))}

            {mainView !== "configuration" && (
              <div
                className="sticky bottom-0 z-10 flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3"
              >
              {psaConnections.primary && psaConnections.multiple ? (
                <details className="relative">
                  <summary
                    className={cn(
                      "inline-flex h-7 cursor-pointer list-none items-center gap-1 rounded-[var(--radius)] border border-[var(--border)] px-2.5 text-[12px]",
                      focusRing,
                    )}
                  >
                    ↑ Push all to PSA
                    <ChevronDown className="size-3" />
                  </summary>
                  <div className="absolute right-0 z-30 mt-1 min-w-[170px] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] p-1 shadow-lg">
                    <button
                      type="button"
                      className="block w-full rounded px-2 py-1.5 text-left text-[12px] hover:bg-[var(--bg-secondary)]"
                      onClick={() => openPushModal(undefined, "halopsa")}
                    >
                      HaloPSA
                    </button>
                    <button
                      type="button"
                      className="block w-full rounded px-2 py-1.5 text-left text-[12px] hover:bg-[var(--bg-secondary)]"
                      onClick={() => openPushModal(undefined, "connectwise")}
                    >
                      ConnectWise
                    </button>
                  </div>
                </details>
              ) : psaConnections.primary ? (
                <Button
                  id="handover-output-push-halo"
                  type="button"
                  size="sm"
                  className={cn(
                    "h-7 gap-1.5 px-2.5 text-[12px] transition-[box-shadow,ring]",
                    pushHaloHighlight &&
                      "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-primary)]",
                  )}
                  onClick={() => openPushModal()}
                >
                  {`↑ Push all to ${pushPsaLabel}`}
                </Button>
              ) : null}
              <div className="relative" ref={exportMenuRef}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-7 gap-1.5 border-[var(--border)] px-2.5 text-[12px] text-[var(--text-secondary)] transition-all duration-[120ms] ease-in-out",
                    focusRing,
                  )}
                  aria-expanded={exportMenuOpen}
                  aria-haspopup="menu"
                  onClick={() =>
                    setExportMenuOpen((o) => {
                      const next = !o;
                      if (next) setExportLockedPromptOpen(false);
                      if (!next) setExportSubPanel(null);
                      return next;
                    })
                  }
                >
                  <Download className="size-3.5" aria-hidden />
                  Export
                </Button>
                {exportMenuOpen ? (
                  <div
                    role="menu"
                    className="absolute bottom-full right-0 z-50 mb-1 max-h-[min(85vh,32rem)] w-[min(100vw-2rem,22rem)] overflow-y-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] py-1 shadow-md"
                  >
                    <div className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                      Download individual
                    </div>
                    {!userEmail ? (
                      exportLockedPromptOpen ? (
                        <div className="mx-3 my-2 rounded-[var(--radius)] border border-[rgba(56,189,248,0.2)] bg-[rgba(56,189,248,0.05)] px-3 py-3">
                          <div className="flex items-start gap-3">
                            <div className="flex size-9 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
                              <Lock className="size-4" aria-hidden />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                                Create a free account
                              </p>
                              <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-secondary)]">
                                Sign up free to export your outputs. No credit card required.
                              </p>
                              <Link href="/auth?tab=signup&returnTo=/welcome" className="mt-3 block">
                                <Button type="button" className="w-full rounded-[var(--radius)] bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]">
                                  Create free account
                                </Button>
                              </Link>
                              <Link
                                href="/auth?tab=signin"
                                className="mt-2 block text-center text-[13px] font-medium text-[var(--text-secondary)] hover:text-white"
                              >
                                Sign in
                              </Link>
                            </div>
                          </div>
                        </div>
                      ) : null
                    ) : !hasProAccess ? (
                      <div className="mx-3 my-2 rounded-[var(--radius)] border border-[var(--border)] bg-[rgba(56,189,248,0.03)] px-3 py-3">
                        <div className="flex items-start gap-3">
                          <div className="flex size-9 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
                            <Zap className="size-4" aria-hidden />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                              Upgrade to Pro
                            </p>
                            <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-secondary)]">
                              Export a full report pack with action log, risk log, client email and status report in one formatted Excel file.
                            </p>
                            <p className="mt-2 text-[13px] font-medium text-[var(--accent)]">
                              From £25/month. Cancel anytime.
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
                              Upgrade to Pro
                            </Button>
                            <Link
                              href="/pricing"
                              className="mt-2 block text-center text-[13px] font-medium text-[var(--text-secondary)] hover:text-white"
                            >
                              See all Pro features
                            </Link>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    <div
                      className="border-b border-[var(--border-subtle)]"
                      onMouseEnter={() => {
                        if (!userEmail) return;
                        setExportSubPanel("actions");
                      }}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-muted/60"
                        onClick={() =>
                          !userEmail
                            ? setExportLockedPromptOpen(true)
                            : setExportSubPanel((p) => (p === "actions" ? null : "actions"))
                        }
                      >
                        <span>Action log</span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-100">
                            CSV
                          </span>
                          <ChevronDown
                            className={cn(
                              "size-4 text-[var(--text-muted)] transition-transform",
                              exportSubPanel === "actions" && "rotate-180",
                            )}
                            aria-hidden
                          />
                        </span>
                      </button>
                      {exportSubPanel === "actions" ? (
                        <div className="border-t border-[var(--border-subtle)] bg-muted/25 px-3 py-2">
                          <p className="text-xs font-medium text-[var(--text-secondary)]">
                            Choose columns
                          </p>
                          <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1.5">
                            {EXPORT_ACTION_COLUMN_OPTIONS.map((opt) => (
                              <label
                                key={opt.id}
                                className="flex cursor-pointer items-center gap-2 text-xs text-[var(--text-primary)]"
                              >
                                <input
                                  type="checkbox"
                                  checked={exportActionCols.includes(opt.id)}
                                  onChange={(e) =>
                                    setExportActionCols((c) =>
                                      toggleStringInArray(c, opt.id, e.target.checked),
                                    )
                                  }
                                  className="size-3.5 rounded border-[var(--border)]"
                                />
                                {opt.label}
                              </label>
                            ))}
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            className="mt-3 w-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                            disabled={exportActionCols.length === 0}
                            onClick={() => {
                              if (!userEmail) {
                                setExportLockedPromptOpen(true);
                                return;
                              }
                              saveExportActionsColumns(exportActionCols);
                              exportActionsCSV(
                                result.actions,
                                projectName,
                                exportActionCols,
                                buildActionExportMeta(projectName, result.actions),
                              );
                              toast({
                                message: "Downloaded",
                                subtitle: getActionLogExportFilename(projectName),
                                durationMs: 3000,
                              });
                              setExportMenuOpen(false);
                              setExportSubPanel(null);
                            }}
                          >
                            Download
                          </Button>
                        </div>
                      ) : null}
                    </div>
                    <div
                      className="border-b border-[var(--border-subtle)]"
                      onMouseEnter={() => {
                        if (!userEmail) return;
                        setExportSubPanel("risks");
                      }}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-muted/60"
                        onClick={() =>
                          !userEmail
                            ? setExportLockedPromptOpen(true)
                            : setExportSubPanel((p) => (p === "risks" ? null : "risks"))
                        }
                      >
                        <span>Risk log</span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-100">
                            CSV
                          </span>
                          <ChevronDown
                            className={cn(
                              "size-4 text-[var(--text-muted)] transition-transform",
                              exportSubPanel === "risks" && "rotate-180",
                            )}
                            aria-hidden
                          />
                        </span>
                      </button>
                      {exportSubPanel === "risks" ? (
                        <div className="border-t border-[var(--border-subtle)] bg-muted/25 px-3 py-2">
                          <p className="text-xs font-medium text-[var(--text-secondary)]">
                            Choose columns
                          </p>
                          <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1.5">
                            {EXPORT_RISK_COLUMN_OPTIONS.map((opt) => (
                              <label
                                key={opt.id}
                                className="flex cursor-pointer items-center gap-2 text-xs text-[var(--text-primary)]"
                              >
                                <input
                                  type="checkbox"
                                  checked={exportRiskCols.includes(opt.id)}
                                  onChange={(e) =>
                                    setExportRiskCols((c) =>
                                      toggleStringInArray(c, opt.id, e.target.checked),
                                    )
                                  }
                                  className="size-3.5 rounded border-[var(--border)]"
                                />
                                {opt.label}
                              </label>
                            ))}
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            className="mt-3 w-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                            disabled={exportRiskCols.length === 0}
                            onClick={() => {
                              if (!userEmail) {
                                setExportLockedPromptOpen(true);
                                return;
                              }
                              saveExportRisksColumns(exportRiskCols);
                              exportRisksCSV(
                                result.risks,
                                projectName,
                                exportRiskCols,
                                buildActionExportMeta(projectName, result.actions),
                              );
                              toast({
                                message: "Downloaded",
                                subtitle: getRiskLogExportFilename(projectName),
                                durationMs: 3000,
                              });
                              setExportMenuOpen(false);
                              setExportSubPanel(null);
                            }}
                          >
                            Download
                          </Button>
                        </div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-muted/60"
                      onMouseEnter={() => setExportSubPanel(null)}
                      onClick={() => {
                        if (!userEmail) {
                          setExportLockedPromptOpen(true);
                          return;
                        }
                        exportStatusReportTXT(result.status_report, projectName);
                        toast({
                          message: "Downloaded",
                          subtitle: getStatusReportExportFilename(projectName),
                          durationMs: 3000,
                        });
                        setExportMenuOpen(false);
                        setExportSubPanel(null);
                      }}
                    >
                      <span>Status report</span>
                      <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-sky-100 text-sky-950 dark:bg-sky-950/80 dark:text-sky-50">
                        TXT
                      </span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-muted/60"
                      onMouseEnter={() => setExportSubPanel(null)}
                      onClick={() => {
                        if (!userEmail) {
                          setExportLockedPromptOpen(true);
                          return;
                        }
                        exportClientEmailTXT(
                          result.email_subject,
                          result.client_email,
                          projectName,
                        );
                        toast({
                          message: "Downloaded",
                          subtitle: getClientEmailExportFilename(projectName),
                          durationMs: 3000,
                        });
                        setExportMenuOpen(false);
                        setExportSubPanel(null);
                      }}
                    >
                      <span>Client email</span>
                      <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-sky-100 text-sky-950 dark:bg-sky-950/80 dark:text-sky-50">
                        TXT
                      </span>
                    </button>
                    <div className="my-1 h-px bg-[var(--border)]" />
                    <div className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                      Pro features
                    </div>
                    <div
                      className="border-t border-[var(--border-subtle)]"
                      onMouseEnter={() => {
                        if (hasProAccess) setExportSubPanel("fullreport");
                      }}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-muted/60"
                        onClick={() => {
                          if (!userEmail) {
                            setExportLockedPromptOpen(true);
                            return;
                          }
                          if (!hasProAccess) {
                            tryOpenProFeatureGate("Full report pack (Excel export)");
                            setExportMenuOpen(false);
                            return;
                          }
                          setExportSubPanel((p) => (p === "fullreport" ? null : "fullreport"));
                        }}
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          {!hasProAccess ? (
                            <Lock className="size-3.5 shrink-0 text-[var(--text-muted)]" aria-hidden />
                          ) : null}
                          <span className="truncate">Full report pack</span>
                          {!hasProAccess ? (
                            <Badge
                              variant="secondary"
                              className="shrink-0 text-[10px] font-normal"
                            >
                              Pro
                            </Badge>
                          ) : null}
                        </span>
                        {hasProAccess ? (
                          <span className="flex shrink-0 items-center gap-1.5">
                            <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-violet-100 text-violet-950 dark:bg-violet-950/80 dark:text-violet-100">
                              XLSX
                            </span>
                            <ChevronDown
                              className={cn(
                                "size-4 text-[var(--text-muted)] transition-transform",
                                exportSubPanel === "fullreport" && "rotate-180",
                              )}
                              aria-hidden
                            />
                          </span>
                        ) : (
                          <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-violet-100 text-violet-950 dark:bg-violet-950/80 dark:text-violet-100">
                            XLSX
                          </span>
                        )}
                      </button>
                      {hasProAccess && exportSubPanel === "fullreport" ? (
                        <div className="border-t border-[var(--border-subtle)] bg-muted/25 px-3 py-2">
                          <p className="text-xs font-medium text-[var(--text-secondary)]">
                            Choose columns
                          </p>
                          <p className="mt-2 text-[11px] font-medium text-[var(--text-muted)]">
                            Sheets to include
                          </p>
                          <div className="mt-1 grid grid-cols-1 gap-y-1.5">
                            {EXPORT_FULLREPORT_TAB_OPTIONS.map((opt) => (
                              <label
                                key={opt.id}
                                className="flex cursor-pointer items-center gap-2 text-xs text-[var(--text-primary)]"
                              >
                                <input
                                  type="checkbox"
                                  checked={exportFullTabs.includes(opt.id)}
                                  onChange={(e) =>
                                    setExportFullTabs((t) =>
                                      toggleStringInArray(t, opt.id, e.target.checked),
                                    )
                                  }
                                  className="size-3.5 rounded border-[var(--border)]"
                                />
                                {opt.label}
                              </label>
                            ))}
                          </div>
                          <p className="mt-3 text-[11px] font-medium text-[var(--text-muted)]">
                            Action log columns
                          </p>
                          <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1.5">
                            {EXPORT_ACTION_COLUMN_OPTIONS.map((opt) => (
                              <label
                                key={`full-a-${opt.id}`}
                                className="flex cursor-pointer items-center gap-2 text-xs text-[var(--text-primary)]"
                              >
                                <input
                                  type="checkbox"
                                  checked={exportFullActionCols.includes(opt.id)}
                                  onChange={(e) =>
                                    setExportFullActionCols((c) =>
                                      toggleStringInArray(c, opt.id, e.target.checked),
                                    )
                                  }
                                  className="size-3.5 rounded border-[var(--border)]"
                                />
                                {opt.label}
                              </label>
                            ))}
                          </div>
                          <p className="mt-3 text-[11px] font-medium text-[var(--text-muted)]">
                            Risk log columns
                          </p>
                          <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1.5">
                            {EXPORT_RISK_COLUMN_OPTIONS.map((opt) => (
                              <label
                                key={`full-r-${opt.id}`}
                                className="flex cursor-pointer items-center gap-2 text-xs text-[var(--text-primary)]"
                              >
                                <input
                                  type="checkbox"
                                  checked={exportFullRiskCols.includes(opt.id)}
                                  onChange={(e) =>
                                    setExportFullRiskCols((c) =>
                                      toggleStringInArray(c, opt.id, e.target.checked),
                                    )
                                  }
                                  className="size-3.5 rounded border-[var(--border)]"
                                />
                                {opt.label}
                              </label>
                            ))}
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            className="mt-3 w-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                            disabled={
                              exportFullTabs.length === 0 ||
                              (exportFullTabs.includes("actions") &&
                                exportFullActionCols.length === 0) ||
                              (exportFullTabs.includes("risks") &&
                                exportFullRiskCols.length === 0)
                            }
                            onClick={() => {
                              saveFullReportExportPrefs({
                                tabs: exportFullTabs,
                                actionColumns: exportFullActionCols,
                                riskColumns: exportFullRiskCols,
                              });
                              handleFullReportExcelExport();
                            }}
                          >
                            Download
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "h-7 border-[var(--border)] px-2.5 text-[12px] text-[var(--text-secondary)] transition-all duration-[120ms] ease-in-out",
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
                  "h-7 border-[var(--border)] px-2.5 text-[12px] text-[var(--text-secondary)] transition-all duration-[120ms] ease-in-out",
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
            )}
          </Tabs>
            {userEmail && showPostGenReferralFooter ? (
              <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--bg-secondary)]/40 px-4 py-2">
                <p className="min-w-0 text-[11px] leading-snug text-[var(--text-muted)]">
                  <Link
                    href="/referral"
                    className="text-[var(--text-secondary)] underline-offset-2 transition-colors hover:text-[var(--text-primary)] hover:underline"
                  >
                    Refer a colleague → get 3 months free
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
            {userEmail && !hasProAccess && showPostGenProUpsell && !readUpgradePromptConsumed() ? (
              <div
                className="flex flex-col gap-2 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--accent)_6%,var(--bg-secondary))] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                role="region"
                aria-label="Pro features upsell"
              >
                <p className="min-w-0 text-[13px] leading-snug text-[var(--text-secondary)]">
                  Want scheduled reports and HaloPSA push-back?{" "}
                  <span className="text-[var(--text-primary)]">Available on Pro.</span>
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
                    View Pro
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
                  Sign up free to save your results — no credit card required
                </p>
                <Link href="/auth?tab=signup&returnTo=/welcome" className="inline-flex shrink-0">
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
      <MarketingFooter />
      <FirstRunOnboardingOverlay
        open={onboardingOverlayOpen}
        isTrial={!!trialEndsAt}
        welcomeFirstName={onboardingWelcomeFirst}
        profileJobTitle={profileJobTitle}
        profileCompanyName={profileCompanyName}
        signatureOverride={signatureOverride}
        setProfileJobTitle={setProfileJobTitle}
        setProfileCompanyName={setProfileCompanyName}
        setSignatureOverride={setSignatureOverride}
        onSaveProfileStep={saveOnboardingProfileStep}
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
          void markOnboardingComplete();
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#38bdf8", "#1e3a5f", "#ffffff", "#7dd3fc"],
          });
          if (choice === "example") {
            setInput(EXAMPLE_INPUT);
          } else {
            setInput("");
          }
          setMainView("generate");
        }}
        onSkipEntirely={() => markOnboardingComplete()}
      />
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
    </motion.div>
  );
}
