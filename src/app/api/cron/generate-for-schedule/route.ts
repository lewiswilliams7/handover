import { NextResponse } from "next/server";
import { Resend } from "resend";

import { getAppOrigin } from "@/lib/app-url";
import { decrypt } from "@/lib/encryption";
import { exportFullReportToBuffer } from "@/lib/export";
import { getHaloToken, type HaloProject, type HaloTicket } from "@/lib/halo";
import {
  buildScheduledReportFormattedInput,
  coalesceCronIntIds,
  fetchTicketsAndProjectsForScheduledReport,
  SCHEDULE_REPORT_INPUT_MAX_CHARS,
} from "@/lib/scheduled-report-halo-input";
import { filterOutputsForSchedulePushItem } from "@/lib/filter-outputs-for-schedule-push";
import { pushHandoverOutputsToHaloTickets } from "@/lib/halo-push-note";
import type { HaloPushOutputKey } from "@/lib/halo-push";
import {
  normalizeEmailContentPrefs,
  normalizeExcelExportEngineTabIds,
  selectedExcelKeysFromRow,
} from "@/lib/scheduled-email-prefs";
import {
  buildScheduledReportEmailHtml,
  buildScheduledReportPlainText,
  SCHEDULED_CRON_TEMPLATE_CONTEXT,
} from "@/lib/scheduled-report-email";
import { notifyHandoverGenerationWebhooks } from "@/lib/chat-generation-notify";
import { buildReportEmailResendFromHeader } from "@/lib/resend-from-header";
import { partnerReportFileSlug, partnerWhiteLabelActive } from "@/lib/white-label";
import { fetchScheduledEmailSenderContext } from "@/lib/scheduled-resend-sender";
import {
  getDateRangeEndIso,
  getDateRangeStartIso,
} from "@/lib/scheduled-reports";
import {
  assertFreeScheduledRunAllowed,
  incrementFreeScheduledRunCount,
} from "@/lib/free-tier-monthly-usage";
import { resolveBrandLogoUrlForExcel } from "@/lib/branding-logo";
import { parseCommaSeparatedEmails, resendRecipientList } from "@/lib/email-recipients";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { hasProTierAccess, planFieldsFromProfileRow } from "@/lib/utils/getPlan";
import {
  EXTENDED_PM_TAB_KEYS,
  normalizeExtendedOutputKeys,
} from "@/lib/pm-output-tabs";
import { formatTicketsForPrompt } from "@/lib/psa/format";
import type { NormalisedNote, NormalisedTicket } from "@/lib/psa/types";

export const maxDuration = 300;

const CORE_TAB_SET = new Set([
  "actions",
  "risks",
  "summary",
  "client_email",
  "status_report",
]);

const DEFAULT_ACTION_COLS = [
  "task",
  "owner",
  "priority",
  "status",
  "due_date",
  "notes",
  "project_name",
  "client_name",
];
const DEFAULT_RISK_COLS = [
  "risk",
  "impact",
  "mitigation",
  "status",
  "owner",
  "priority",
  "rag",
  "project_name",
  "client_name",
];

function parsePossiblyStringifiedJson(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return raw;
  }
}

function haloTicketNotesToNormalised(notes: unknown): NormalisedNote[] {
  if (!Array.isArray(notes)) return [];
  const out: NormalisedNote[] = [];
  for (const n of notes) {
    const rec = n as Record<string, unknown>;
    const text =
      typeof rec.note === "string"
        ? rec.note
        : typeof rec.text === "string"
          ? rec.text
          : "";
    if (!text.trim()) continue;
    const author =
      typeof rec.who === "string" && rec.who.trim()
        ? rec.who.trim()
        : typeof rec.author === "string" && rec.author.trim()
          ? rec.author.trim()
          : "Unknown";
    const date =
      typeof rec.posted === "string"
        ? rec.posted
        : typeof rec.date === "string"
          ? rec.date
          : null;
    out.push({
      id: String(rec.id ?? ""),
      date,
      author,
      type: "note",
      content: text,
    });
  }
  return out;
}

function haloTicketsToConnectWisePromptTickets(tickets: HaloTicket[]): NormalisedTicket[] {
  return tickets.map((t): NormalisedTicket => {
    const id = String(t.id ?? "");
    const title = String(t.summary ?? `Ticket ${id}`).trim() || `Ticket ${id}`;
    const status = String(t.status?.name ?? "Unknown").trim();
    const client = String(t.client?.name ?? "Unknown").trim();
    const assignedEngineer =
      typeof t.agent === "object" && t.agent && typeof t.agent.name === "string"
        ? t.agent.name.trim()
        : null;
    const priority =
      t.priority && typeof t.priority === "object" && typeof t.priority.name === "string"
        ? t.priority.name.trim()
        : null;
    const targetDate =
      typeof t.targetdate === "string" && t.targetdate.trim() ? t.targetdate.trim() : null;
    const timeLogged =
      typeof t.timetaken === "number" && Number.isFinite(t.timetaken) ? t.timetaken : 0;
    const description =
      typeof t.details === "string" && t.details.trim() ? t.details.trim() : null;
    const isProject = Boolean((t as { is_project?: unknown }).is_project === true);
    return {
      id,
      title,
      type: isProject ? "project" : "ticket",
      status,
      client,
      clientContact: null,
      assignedEngineer,
      priority,
      targetDate,
      timeLogged,
      description,
      notes: haloTicketNotesToNormalised(t.notes),
      source: "connectwise",
    };
  });
}

function uniqueClientNames(tickets: HaloTicket[]): string[] {
  const names = new Set<string>();
  for (const t of tickets) {
    const n = t.client?.name?.trim();
    if (n) names.add(n);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

function weekEndingSlug(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

type CwConnRow = {
  site_url: string;
  company_id: string;
  client_id: string;
  public_key_encrypted: string;
  private_key_encrypted: string;
};

function cwAuthHeadersFromConn(row: CwConnRow): {
  Authorization: string;
  clientId: string;
  "Content-Type": string;
} {
  const publicKey = decrypt(row.public_key_encrypted);
  const privateKey = decrypt(row.private_key_encrypted);
  const auth = Buffer.from(`${row.company_id}+${publicKey}:${privateKey}`, "utf8").toString("base64");
  return {
    Authorization: `Basic ${auth}`,
    clientId: row.client_id,
    "Content-Type": "application/json",
  };
}

async function fetchCwTicketDetailAsHalo(
  siteUrl: string,
  headers: { Authorization: string; clientId: string; "Content-Type": string },
  id: number,
): Promise<HaloTicket | null> {
  const ticketRes = await fetch(`${siteUrl}/v4_6_release/apis/3.0/service/tickets/${id}`, {
    headers,
    cache: "no-store",
  });
  if (!ticketRes.ok) return null;
  const ticket = (await ticketRes.json().catch(() => ({}))) as Record<string, unknown>;
  const notesRes = await fetch(`${siteUrl}/v4_6_release/apis/3.0/service/tickets/${id}/notes?pageSize=100`, {
    headers,
    cache: "no-store",
  });
  const notesRaw = (await notesRes.json().catch(() => [])) as unknown;
  const notes = (Array.isArray(notesRaw)
    ? notesRaw
    : Array.isArray((notesRaw as { items?: unknown[] })?.items)
      ? (notesRaw as { items: unknown[] }).items
      : []
  ).map((n) => ({
    id: String((n as { id?: unknown }).id ?? ""),
    who:
      String((n as { member?: { name?: unknown } | null }).member?.name ?? "") ||
      String((n as { createdBy?: unknown }).createdBy ?? "Unknown"),
    posted: String((n as { dateCreated?: unknown }).dateCreated ?? ""),
    note: String((n as { text?: unknown }).text ?? ""),
  }));
  return {
    id,
    summary: String(ticket.summary ?? `Ticket ${id}`),
    details: null,
    status: { name: String((ticket.status as { name?: unknown } | null)?.name ?? "Open") },
    priority: {
      name: String((ticket.priority as { name?: unknown } | null)?.name ?? "Normal"),
    },
    client: { name: String((ticket.company as { name?: unknown } | null)?.name ?? "Unknown") },
    agent:
      (ticket.owner as { name?: unknown } | null)?.name != null
        ? { name: String((ticket.owner as { name?: unknown }).name) }
        : null,
    dateoccurred: typeof ticket.dateEntered === "string" ? ticket.dateEntered : null,
    targetdate:
      (typeof ticket.requiredDate === "string" && ticket.requiredDate) ||
      (typeof ticket.targetDate === "string" && ticket.targetDate) ||
      (typeof ticket.closedDate === "string" && ticket.closedDate) ||
      null,
    timetaken:
      typeof ticket.actualHours === "number" && Number.isFinite(ticket.actualHours)
        ? ticket.actualHours
        : 0,
    notes,
    source: "connectwise",
  } as unknown as HaloTicket;
}

async function fetchCwProjectDetailAsHaloProject(
  siteUrl: string,
  headers: { Authorization: string; clientId: string; "Content-Type": string },
  id: number,
): Promise<HaloProject | null> {
  const [projectRes, notesRes, phasesRes, tasksRes] = await Promise.all([
    fetch(`${siteUrl}/v4_6_release/apis/3.0/project/projects/${id}`, {
      headers,
      cache: "no-store",
    }),
    fetch(`${siteUrl}/v4_6_release/apis/3.0/project/projects/${id}/notes?pageSize=100`, {
      headers,
      cache: "no-store",
    }),
    fetch(`${siteUrl}/v4_6_release/apis/3.0/project/projects/${id}/phases?pageSize=100`, {
      headers,
      cache: "no-store",
    }),
    fetch(
      `${siteUrl}/v4_6_release/apis/3.0/project/tickets?conditions=${encodeURIComponent(`project/id=${id}`)}&pageSize=50`,
      {
        headers,
        cache: "no-store",
      },
    ),
  ]);
  const phaseRows = (phasesRes.ok
    ? ((await phasesRes.json().catch(() => [])) as unknown)
    : []) as unknown;
  if (!projectRes.ok) return null;
  const project = (await projectRes.json().catch(() => ({}))) as Record<string, unknown>;
  const notesRaw = (await notesRes.json().catch(() => [])) as unknown;
  const tasksRaw = (await tasksRes.json().catch(() => [])) as unknown;
  const notes = (Array.isArray(notesRaw)
    ? notesRaw
    : Array.isArray((notesRaw as { items?: unknown[] })?.items)
      ? (notesRaw as { items: unknown[] }).items
      : []
  ).map((n) => ({
    id: String((n as { id?: unknown }).id ?? ""),
    who:
      String((n as { member?: { name?: unknown } | null }).member?.name ?? "") ||
      String((n as { createdBy?: unknown }).createdBy ?? "Unknown"),
    posted: String((n as { dateCreated?: unknown }).dateCreated ?? ""),
    note: String(((n as { text?: unknown }).text ?? (n as { note?: unknown }).note ?? "")),
  }));
  const phaseNameById = new Map<number, string>();
  const phaseItems = (Array.isArray(phaseRows)
    ? phaseRows
    : Array.isArray((phaseRows as { items?: unknown[] })?.items)
      ? (phaseRows as { items: unknown[] }).items
      : []) as Array<Record<string, unknown>>;
  for (const phase of phaseItems) {
    const phaseId = Number(phase.id ?? 0);
    const phaseName = String(phase.name ?? "").trim();
    if (Number.isFinite(phaseId) && phaseId > 0 && phaseName) {
      phaseNameById.set(phaseId, phaseName);
    }
  }
  const taskRows = (Array.isArray(tasksRaw)
    ? tasksRaw
    : Array.isArray((tasksRaw as { items?: unknown[] })?.items)
      ? (tasksRaw as { items: unknown[] }).items
      : []) as Array<Record<string, unknown>>;
  const taskLines = taskRows.map((task) => {
    const phaseObj = (task as { phase?: { name?: unknown; id?: unknown } | null }).phase ?? null;
    const phase = String(
      (task as { projectPhase?: { name?: unknown } | null }).projectPhase?.name ??
        phaseObj?.name ??
        phaseNameById.get(Number(phaseObj?.id ?? 0)) ??
        "",
    ).trim();
    const summary = String((task as { summary?: unknown }).summary ?? "Untitled task").trim();
    const status = String(
      (task as { status?: { name?: unknown } | null }).status?.name ?? "Unknown",
    ).trim();
    const member = String(
      (task as { assignedMember?: { name?: unknown } | null }).assignedMember?.name ??
        (task as { owner?: { name?: unknown } | null }).owner?.name ??
        "",
    ).trim();
    return [phase, summary, status, member].filter(Boolean).join(" · ");
  });
  if (taskLines.length > 0) {
    notes.push({
      id: "cw-phase-tasks",
      who: "ConnectWise",
      posted: new Date().toISOString(),
      note: `Phase tasks:\n${taskLines.map((line) => `- ${line}`).join("\n")}`,
    });
  }
  const taskNoteBlocks = await Promise.all(
    taskRows.map(async (task) => {
      const taskId = Number(task.id ?? 0);
      const noteCount = Number(task.noteCount ?? 0);
      if (!Number.isFinite(taskId) || taskId <= 0 || !Number.isFinite(noteCount) || noteCount <= 0) {
        return null;
      }
      const taskNotesRes = await fetch(
        `${siteUrl}/v4_6_release/apis/3.0/service/tickets/${taskId}/notes?pageSize=20`,
        {
          headers,
          cache: "no-store",
        },
      );
      if (!taskNotesRes.ok) return null;
      const taskNotesRaw = (await taskNotesRes.json().catch(() => [])) as unknown;
      const taskNotes = (Array.isArray(taskNotesRaw)
        ? taskNotesRaw
        : Array.isArray((taskNotesRaw as { items?: unknown[] })?.items)
          ? (taskNotesRaw as { items: unknown[] }).items
          : []
      )
        .slice(0, 3)
        .map((n) => ({
          author:
            String((n as { member?: { name?: unknown } | null }).member?.name ?? "") ||
            String((n as { createdBy?: unknown }).createdBy ?? "Unknown"),
          date: String((n as { dateCreated?: unknown }).dateCreated ?? ""),
          content: String(((n as { text?: unknown }).text ?? (n as { note?: unknown }).note ?? "")).trim(),
        }))
        .filter((n) => n.content.length > 0);
      if (taskNotes.length === 0) return null;
      const summary = String(task.summary ?? `Task ${taskId}`).trim();
      return {
        id: `cw-task-notes-${taskId}`,
        who: "ConnectWise",
        posted: taskNotes[0]?.date || new Date().toISOString(),
        note: [
          `Task notes: ${summary}`,
          ...taskNotes.map((n) => `- ${n.author}${n.date ? ` (${n.date})` : ""}: ${n.content}`),
        ].join("\n"),
      };
    }),
  );
  for (const block of taskNoteBlocks) {
    if (block) notes.push(block);
  }

  return {
    id,
    name: String(project.name ?? `Project ${id}`),
    status:
      (project.status as { name?: unknown } | null)?.name != null
        ? { name: String((project.status as { name?: unknown }).name) }
        : null,
    clientId:
      typeof (project.company as { id?: unknown } | null)?.id === "number"
        ? ((project.company as { id?: number }).id ?? null)
        : null,
    client:
      (project.company as { name?: unknown } | null)?.name != null
        ? { name: String((project.company as { name?: unknown }).name) }
        : null,
    description: typeof project.description === "string" ? project.description : null,
    projectmanager:
      (project.manager as { name?: unknown } | null)?.name != null
        ? { name: String((project.manager as { name?: unknown }).name) }
        : null,
    startdate: typeof project.startDate === "string" ? project.startDate : null,
    targetdate:
      (typeof project.targetDate === "string" && project.targetDate) ||
      (typeof project.estimatedEndDate === "string" && project.estimatedEndDate) ||
      (typeof project.closedDate === "string" && project.closedDate) ||
      null,
    completionpercent:
      typeof project.percentComplete === "number" && Number.isFinite(project.percentComplete)
        ? project.percentComplete
        : null,
    tasks: null,
    notes,
    source: "connectwise",
  } as HaloProject;
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const scheduleId = typeof body.scheduleId === "string" ? body.scheduleId : "";
  const userId = typeof body.userId === "string" ? body.userId : "";
  console.log("[cron-generate] scheduleId received:", scheduleId);
  console.log("[cron-generate] userId received:", userId);
  let clientIds = coalesceCronIntIds(body.clientIds);
  const dateRangeKey =
    typeof body.dateRange === "string" ? body.dateRange : "last_7_days";
  const dateFrom =
    typeof body.dateFrom === "string"
      ? body.dateFrom
      : getDateRangeStartIso(dateRangeKey);
  const dateTo =
    typeof body.dateTo === "string" ? body.dateTo : getDateRangeEndIso();
  const emailTo = typeof body.emailTo === "string" ? body.emailTo.trim() : "";
  const emailCcRaw = typeof body.emailCc === "string" ? body.emailCc.trim() : "";
  const emailBccRaw = typeof body.emailBcc === "string" ? body.emailBcc.trim() : "";
  const recipientName =
    typeof body.recipientName === "string" ? body.recipientName.trim() : "";
  const scheduleName =
    typeof body.scheduleName === "string" ? body.scheduleName.trim() : "";
  const brandName =
    typeof body.brandName === "string" ? body.brandName.trim() : "";
  let pushToHalo = body.pushToHalo === true;
  const haloPushOutputSet = new Set<HaloPushOutputKey>([
    "client_email",
    "actions",
    "risks",
    "summary",
    "status_report",
  ]);
  const haloPushOutputs: HaloPushOutputKey[] = Array.isArray(body.haloPushOutputs)
    ? body.haloPushOutputs.filter(
        (x): x is HaloPushOutputKey => typeof x === "string" && haloPushOutputSet.has(x as HaloPushOutputKey),
      )
    : ["client_email", "actions", "risks"];
  let haloPushExcel = body.haloPushExcel === true;
  const haloPushExcelTabs = Array.isArray(body.haloPushExcelTabs)
    ? body.haloPushExcelTabs.filter((x): x is string => typeof x === "string")
    : [];
  const haloPushTarget =
    body.haloPushTarget === "projects" || body.haloPushTarget === "tickets"
      ? body.haloPushTarget
      : "all";
  const postTargetsExplicit = Array.isArray(body.postToTicketIds);
  const postToTicketIdsRaw = postTargetsExplicit
    ? (body.postToTicketIds as unknown[]).filter(
        (x): x is number => typeof x === "number" && Number.isFinite(x),
      )
    : [];
  const postConsolidated = body.postConsolidated === true;
  const reportTypeRaw =
    typeof body.reportType === "string" ? body.reportType : "external";
  const reportType: "external" | "internal" | "note_to_self" | "qbr" =
    reportTypeRaw === "internal" || reportTypeRaw === "note_to_self" || reportTypeRaw === "qbr"
      ? reportTypeRaw
      : "external";
  const includeTickets = body.includeTickets !== false;
  const includeProjects = body.includeProjects !== false;
  let selectedTicketIds = coalesceCronIntIds(body.selectedTicketIds ?? body.selected_ticket_ids);
  let selectedProjectIds = coalesceCronIntIds(body.selectedProjectIds ?? body.selected_project_ids);
  let cwTicketIds: number[] = [];
  let cwProjectIds: number[] = [];

  const emailToneRaw =
    typeof body.emailTone === "string" ? body.emailTone.trim().toLowerCase() : "professional";
  const generateTone =
    emailToneRaw === "formal" || emailToneRaw === "friendly" || emailToneRaw === "professional"
      ? emailToneRaw
      : "professional";

  const isNoteToSelf =
    body.isNoteToSelf === true || reportType === "note_to_self";
  const legacyIncludeTabs = Array.isArray(body.includeTabs)
    ? body.includeTabs.filter((x): x is string => typeof x === "string")
    : [];

  const emailPrefs = normalizeEmailContentPrefs(body.emailContentPrefs);
  let attachExcel = body.attachExcel !== false;
  let excelTabsRaw = Array.isArray(body.excelTabs)
    ? body.excelTabs.filter((x): x is string => typeof x === "string")
    : [];

  const toList = parseCommaSeparatedEmails(emailTo);
  const ccList = parseCommaSeparatedEmails(emailCcRaw);
  const bccList = parseCommaSeparatedEmails(emailBccRaw);

  if (!userId) {
    return NextResponse.json(
      { error: "userId required" },
      { status: 400 },
    );
  }

  const supabase = createServiceRoleClient();

  if (scheduleId.trim()) {
    const { data: scheduleOwner, error: scheduleOwnerErr } = await supabase
      .from("scheduled_reports")
      .select("user_id")
      .eq("id", scheduleId.trim())
      .single();

    if (scheduleOwnerErr || !scheduleOwner || scheduleOwner.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  let scheduleRow: Record<string, unknown> | null = null;
  if (scheduleId.trim()) {
    const { data: scheduleFromDb, error: scheduleErr } = await supabase
      .from("scheduled_reports")
      .select("*")
      .eq("user_id", userId)
      .eq("id", scheduleId.trim())
      .maybeSingle();
    if (scheduleErr) {
      console.error("[cron-generate] scheduled_reports fetch failed:", scheduleErr.message);
    } else if (scheduleFromDb) {
      scheduleRow = scheduleFromDb as Record<string, unknown>;
    }
  }

  console.log("[cron-generate] scheduleRow found:", scheduleRow ? "YES" : "NO - null");
  if (!scheduleRow && scheduleId.trim()) {
    console.log("[cron-generate] DB returned no row for scheduleId:", scheduleId, "userId:", userId);
  }

  if (scheduleRow) {
    const cwTicketIdsFromSchedule: number[] = (() => {
      try {
        const raw = scheduleRow.cw_ticket_ids;
        if (!raw || raw === "[]") return [];
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        return Array.isArray(parsed) ? parsed.map(Number).filter((n) => Number.isFinite(n)) : [];
      } catch {
        return [];
      }
    })();
    const cwProjectIdsFromSchedule: number[] = (() => {
      try {
        const raw = scheduleRow.cw_project_ids;
        if (!raw || raw === "[]") return [];
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        return Array.isArray(parsed) ? parsed.map(Number).filter((n) => Number.isFinite(n)) : [];
      } catch {
        return [];
      }
    })();

    console.log("[scheduled] cw_ticket_ids raw:", scheduleRow.cw_ticket_ids);
    console.log("[scheduled] cw_project_ids raw:", scheduleRow.cw_project_ids);
    console.log("[scheduled] cw tickets parsed:", cwTicketIdsFromSchedule);
    console.log("[scheduled] cw projects parsed:", cwProjectIdsFromSchedule);

    cwTicketIds = cwTicketIdsFromSchedule;
    cwProjectIds = cwProjectIdsFromSchedule;

    const scheduleClientIds = coalesceCronIntIds(scheduleRow.client_ids);
    if (scheduleClientIds.length > 0) clientIds = scheduleClientIds;

    const haloTicketsFromSchedule = coalesceCronIntIds(scheduleRow.selected_ticket_ids);
    const haloProjectsFromSchedule = coalesceCronIntIds(scheduleRow.selected_project_ids);
    if (haloTicketsFromSchedule.length > 0) selectedTicketIds = haloTicketsFromSchedule;
    if (haloProjectsFromSchedule.length > 0) selectedProjectIds = haloProjectsFromSchedule;

    const ticketClientsFromSchedule = coalesceCronIntIds(scheduleRow.ticket_client_ids);
    const projectClientsFromSchedule = coalesceCronIntIds(scheduleRow.project_client_ids);
    if (ticketClientsFromSchedule.length > 0) {
      Object.assign(body, { ticketClientIds: ticketClientsFromSchedule });
    }
    if (projectClientsFromSchedule.length > 0) {
      Object.assign(body, { projectClientIds: projectClientsFromSchedule });
    }
    if (typeof scheduleRow.ticket_all_clients === "boolean") {
      Object.assign(body, { ticketAllClients: scheduleRow.ticket_all_clients });
    }
    if (typeof scheduleRow.project_all_clients === "boolean") {
      Object.assign(body, { projectAllClients: scheduleRow.project_all_clients });
    }
  } else {
    const rawCwTicketIds = body.cw_ticket_ids ?? body.cwTicketIds;
    const rawCwProjectIds = body.cw_project_ids ?? body.cwProjectIds;
    cwTicketIds = coalesceCronIntIds(
      typeof rawCwTicketIds === "string"
        ? parsePossiblyStringifiedJson(rawCwTicketIds || "[]")
        : rawCwTicketIds || [],
    );
    cwProjectIds = coalesceCronIntIds(
      typeof rawCwProjectIds === "string"
        ? parsePossiblyStringifiedJson(rawCwProjectIds || "[]")
        : rawCwProjectIds || [],
    );
  }

  if (excelTabsRaw.length === 0 && scheduleRow) {
    const rawDb = scheduleRow.excel_tabs;
    let parsed: unknown = rawDb;
    if (typeof rawDb === "string") {
      const t = rawDb.trim();
      if (t) {
        try {
          parsed = JSON.parse(t);
        } catch {
          parsed = [];
        }
      } else {
        parsed = [];
      }
    }
    if (Array.isArray(parsed)) {
      excelTabsRaw = parsed.filter((x): x is string => typeof x === "string");
    }
  }

  const resolvedScheduleExcelTabs = normalizeExcelExportEngineTabIds(
    selectedExcelKeysFromRow(excelTabsRaw),
  );

  console.log("[scheduled] cw ticket IDs:", cwTicketIds);
  console.log("[scheduled] cw project IDs:", cwProjectIds);

  const ticketClientIds = coalesceCronIntIds(body.ticketClientIds);
  const projectClientIds = coalesceCronIntIds(body.projectClientIds);
  const ticketAllClients = body.ticketAllClients !== false;
  const projectAllClients = body.projectAllClients !== false;

  console.log("[cron-generate] email check:", {
    emailTo,
    toCount: toList.length,
    scheduleEmailTo: typeof body.emailTo === "string" ? body.emailTo : null,
    isNoteToSelf,
    userId,
  });

  if (toList.length === 0) {
    console.error("[cron-generate] No valid send-to email for schedule:", scheduleId);
    return NextResponse.json(
      {
        success: false,
        error:
          "No valid email address configured. Please edit your schedule and add at least one send-to address.",
      },
      { status: 400 },
    );
  }

  const { data: planRow } = await supabase
    .from("profiles")
    .select("plan, team_id, trial_ends_at, trial_plan, subscription_status")
    .eq("id", userId)
    .maybeSingle();
  const pf = planFieldsFromProfileRow(planRow);
  const paid = hasProTierAccess(pf);
  if (!paid) {
    const ok = await assertFreeScheduledRunAllowed(supabase, userId);
    if (!ok) {
      return NextResponse.json({ skipped: true, reason: "free_monthly_cap" });
    }
    attachExcel = false;
    pushToHalo = false;
    haloPushExcel = false;
  }

  const { replyTo: userReplyTo, profileForResendFrom } =
    await fetchScheduledEmailSenderContext(supabase, userId);
  const profileBrandName =
    profileForResendFrom &&
    typeof profileForResendFrom.brand_name === "string" &&
    profileForResendFrom.brand_name.trim()
      ? profileForResendFrom.brand_name.trim()
      : "";
  const brandProfile = profileForResendFrom as Record<string, unknown>;
  const profileBrandColour =
    brandProfile.brand_colour &&
    typeof brandProfile.brand_colour === "string"
      ? brandProfile.brand_colour.trim()
      : "";
  const profileBrandLogoUrl =
    brandProfile.brand_logo_url &&
    typeof brandProfile.brand_logo_url === "string"
      ? brandProfile.brand_logo_url.trim()
      : "";
  const profileBrandSecondaryColour =
    brandProfile.brand_secondary_colour &&
    typeof brandProfile.brand_secondary_colour === "string"
      ? brandProfile.brand_secondary_colour.trim()
      : "";
  const effectiveBrandName = profileBrandName || brandName;
  const resolvedBrandLogoUrl = await resolveBrandLogoUrlForExcel(supabase, profileBrandLogoUrl || null);

  const whiteLabelActive = partnerWhiteLabelActive(
    profileForResendFrom as {
      plan?: string | null;
      white_label_mode?: boolean | null;
      brand_name?: string | null;
    },
  );

  async function recordHistory(args: {
    ticketsProcessed: number;
    clientsCovered: string[];
    status: "sent" | "failed";
    errorMessage?: string | null;
  }) {
    const { error } = await supabase.from("scheduled_report_history").insert({
      user_id: userId,
      schedule_id: scheduleId || null,
      email_to: emailTo,
      tickets_processed: args.ticketsProcessed,
      clients_covered: args.clientsCovered,
      status: args.status,
      error_message: args.errorMessage ?? null,
    });
    if (error) {
      console.error("[cron-generate] history insert failed", error.message);
    }
  }

  const { data: connection } = await supabase
    .from("halo_connections")
    .select("halo_url, tenant, client_id, client_secret_encrypted")
    .eq("user_id", userId)
    .maybeSingle();
  const wantsHalo =
    selectedTicketIds.length > 0 ||
    selectedProjectIds.length > 0 ||
    (cwTicketIds.length === 0 && cwProjectIds.length === 0);
  const wantsConnectWise = cwTicketIds.length > 0 || cwProjectIds.length > 0;

  // Only pass positive client IDs to HaloPSA filters.
  const haloClientIds = clientIds.filter((id) => id > 0);

  let token: string | null = null;
  if (wantsHalo && connection) {
    let clientSecret: string;
    try {
      clientSecret = decrypt(connection.client_secret_encrypted);
    } catch (e) {
      console.error("[cron-generate] decrypt failed", e);
      return NextResponse.json(
        { error: "Could not decrypt Halo credentials" },
        { status: 500 },
      );
    }

    try {
      token = await getHaloToken({
        haloUrl: connection.halo_url,
        tenant: connection.tenant,
        clientId: connection.client_id,
        clientSecret,
      });
    } catch (e) {
      console.error("[cron-generate] token failed", e);
      return NextResponse.json({ error: "Halo token failed" }, { status: 500 });
    }
  } else if (wantsHalo && !connection) {
    console.log("[cron-generate] No HaloPSA connection for user", userId);
    if (!wantsConnectWise) {
      return NextResponse.json(
        { skipped: true, reason: "no_connection" },
        { status: 200 },
      );
    }
  }

  const scheduleData = {
    selected_ticket_ids: selectedTicketIds,
    selected_project_ids: selectedProjectIds,
    cw_ticket_ids: cwTicketIds,
    cw_project_ids: cwProjectIds,
  };
  console.log("[scheduled] halo ticket IDs:", scheduleData.selected_ticket_ids);
  console.log("[scheduled] halo project IDs:", scheduleData.selected_project_ids);
  console.log("[scheduled] cw ticket IDs:", scheduleData.cw_ticket_ids);
  console.log("[scheduled] cw project IDs:", scheduleData.cw_project_ids);
  console.log("[scheduled] total items to fetch:", {
    haloTickets: scheduleData.selected_ticket_ids?.length || 0,
    haloProjects: scheduleData.selected_project_ids?.length || 0,
    cwTickets: scheduleData.cw_ticket_ids?.length || 0,
    cwProjects: scheduleData.cw_project_ids?.length || 0,
  });

  let tickets: HaloTicket[] = [];
  let projects: HaloProject[] = [];
  const isScheduledReport = true;
  try {
    if (wantsHalo && token && connection) {
      const fetched = await fetchTicketsAndProjectsForScheduledReport({
        haloUrl: connection.halo_url,
        token,
        isScheduledReport,
        includeTickets,
        includeProjects,
        clientIds: haloClientIds,
        selectedTicketIds,
        selectedProjectIds,
        ticketClientIds,
        projectClientIds,
        ticketAllClients,
        projectAllClients,
        dateFrom,
        dateTo,
      });
      tickets = fetched.tickets;
      projects = fetched.projects;
    }

    if (wantsConnectWise) {
      const { data: cwConn } = await supabase
        .from("cw_connections")
        .select("site_url, company_id, client_id, public_key_encrypted, private_key_encrypted")
        .eq("user_id", userId)
        .maybeSingle<CwConnRow>();
      if (!cwConn) {
        console.log("[cron-generate] No ConnectWise connection for user", userId);
      } else {
        const cwHeaders = cwAuthHeadersFromConn(cwConn);
        const [cwTicketRows, cwProjectRows] = await Promise.all([
          Promise.all(
            [...new Set(cwTicketIds)].map((id) =>
              fetchCwTicketDetailAsHalo(cwConn.site_url, cwHeaders, id),
            ),
          ),
          Promise.all(
            [...new Set(cwProjectIds)].map((id) =>
              fetchCwProjectDetailAsHaloProject(cwConn.site_url, cwHeaders, id),
            ),
          ),
        ]);
        const cwTickets = cwTicketRows.filter((t): t is HaloTicket => t != null);
        const cwProjects = cwProjectRows.filter((p): p is HaloProject => p != null);
        console.log("[scheduled] cw tickets fetched:", cwTickets.length);
        console.log("[scheduled] cw projects fetched:", cwProjects.length);
        tickets = [
          ...tickets,
          ...cwTickets,
        ];
        projects = [
          ...projects,
          ...cwProjects,
        ];
      }
    }
    const allItems = [...tickets, ...projects].filter(Boolean);
    console.log("[scheduled] total combined items:", allItems.length);
  } catch (e) {
    console.error("[cron-generate] PSA fetch failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "PSA data fetch failed" },
      { status: 500 },
    );
  }

  const ticketCount = tickets.length + projects.length;
  const processedCount = ticketCount;
  if (processedCount === 0) {
    console.log("[cron-generate] No content, skipping email", {
      userId,
      scheduleId,
      includeTickets,
      includeProjects,
    });
    return NextResponse.json({
      skipped: true,
      reason: "No tickets",
    });
  }

  const clientNamesSet = new Set<string>();
  for (const t of tickets) {
    const n = t.client?.name?.trim();
    if (n) clientNamesSet.add(n);
  }
  for (const p of projects) {
    const n = p.client?.name?.trim();
    if (n) clientNamesSet.add(n);
  }
  const clientNames = [...clientNamesSet].sort((a, b) => a.localeCompare(b));
  const clientCount = Math.max(clientNames.length, 1);

  const cwOnlyTickets = tickets.filter((t) => (t as { source?: unknown }).source === "connectwise");
  const cwOnlyProjects = projects.filter((p) => (p as { source?: unknown }).source === "connectwise");

  let formattedInput = buildScheduledReportFormattedInput(
    tickets.filter((t) => (t as { source?: unknown }).source !== "connectwise"),
    projects.filter((p) => (p as { source?: unknown }).source !== "connectwise"),
    SCHEDULE_REPORT_INPUT_MAX_CHARS,
  );

  const cwPromptTickets = haloTicketsToConnectWisePromptTickets(cwOnlyTickets);
  const cwPromptProjectsAsTickets: HaloTicket[] = cwOnlyProjects.map((p) => ({
    id: Number(p.id),
    summary: String(p.name ?? `Project ${String(p.id ?? "")}`),
    details: typeof p.description === "string" ? p.description : null,
    status: p.status ? { name: String(p.status.name ?? "Unknown") } : { name: "Unknown" },
    priority: null,
    client: p.client ? { name: String(p.client.name ?? "Unknown") } : { name: "Unknown" },
    agent: p.projectmanager?.name ? { name: String(p.projectmanager.name) } : null,
    dateoccurred: typeof p.startdate === "string" ? p.startdate : null,
    targetdate: typeof p.targetdate === "string" ? p.targetdate : null,
    timetaken:
      typeof p.completionpercent === "number" && Number.isFinite(p.completionpercent)
        ? p.completionpercent
        : 0,
    notes: Array.isArray(p.notes)
      ? (p.notes as Array<Record<string, unknown>>).map((n) => ({
          id: String(n.id ?? ""),
          who: String(n.who ?? "Unknown"),
          posted: String(n.posted ?? ""),
          note: String(n.note ?? ""),
        }))
      : [],
    is_project: true,
    source: "connectwise",
  } as unknown as HaloTicket));
  const cwPromptTicketsAll = [
    ...cwPromptTickets,
    ...haloTicketsToConnectWisePromptTickets(cwPromptProjectsAsTickets),
  ];
  if (cwPromptTicketsAll.length > 0) {
    const cwPrompt = formatTicketsForPrompt(cwPromptTicketsAll);
    formattedInput = [formattedInput, cwPrompt].filter(Boolean).join("\n\n");
    if (formattedInput.length > SCHEDULE_REPORT_INPUT_MAX_CHARS) {
      formattedInput = formattedInput.slice(0, SCHEDULE_REPORT_INPUT_MAX_CHARS);
    }
  }

  const outputsNeeded = new Set<string>(["summary"]);
  if (emailPrefs.include_actions) outputsNeeded.add("actions");
  if (emailPrefs.include_risks) outputsNeeded.add("risks");
  if (emailPrefs.include_client_emails) outputsNeeded.add("client_email");
  if (emailPrefs.include_status) outputsNeeded.add("status_report");

  if (attachExcel) {
    for (const k of resolvedScheduleExcelTabs) {
      if (CORE_TAB_SET.has(k)) outputsNeeded.add(k);
    }
  }

  // Core outputs must always be generated so Excel (and email) have full workbook data.
  for (const tab of CORE_TAB_SET) {
    outputsNeeded.add(tab);
  }

  if (attachExcel) {
    for (const key of resolvedScheduleExcelTabs) {
      if ((EXTENDED_PM_TAB_KEYS as readonly string[]).includes(key)) {
        outputsNeeded.add(key);
      }
    }
  }

  let coreOutputs = [...outputsNeeded].filter((t) => CORE_TAB_SET.has(t));
  if (coreOutputs.length === 0) {
    coreOutputs = ["summary"];
  }

  const extendedScheduleKeys = resolvedScheduleExcelTabs.filter((t) =>
    (EXTENDED_PM_TAB_KEYS as readonly string[]).includes(t),
  );
  let extendedKeys = normalizeExtendedOutputKeys(extendedScheduleKeys);

  if (attachExcel && extendedKeys.length === 0 && excelTabsRaw.length > 0) {
    extendedKeys = normalizeExtendedOutputKeys(
      excelTabsRaw.filter((t) =>
        (EXTENDED_PM_TAB_KEYS as readonly string[]).includes(t),
      ),
    );
  }

  if (legacyIncludeTabs.length > 0 && !("emailContentPrefs" in body)) {
    const selectedCore = legacyIncludeTabs.filter((t) => CORE_TAB_SET.has(t));
    coreOutputs =
      selectedCore.length > 0
        ? selectedCore
        : ["actions", "risks", "summary", "client_email", "status_report"];
    extendedKeys = normalizeExtendedOutputKeys(
      legacyIncludeTabs.filter((t) =>
        (EXTENDED_PM_TAB_KEYS as readonly string[]).includes(t),
      ),
    );
  }

  const generateEnabledTabs = [...new Set<string>([...coreOutputs, ...extendedKeys])];

  const now = new Date();
  const weekEnding = weekEndingSlug(now);
  const projectName = `Weekly report  -  ${weekEnding}`;

  const baseUrl = getAppOrigin();
  const templateContext = SCHEDULED_CRON_TEMPLATE_CONTEXT;

  // Scheduled reports include all selected tickets regardless of internal/external status — user selection is explicit
  const explicitTicketOrProjectSelection =
    selectedTicketIds.length > 0 ||
    selectedProjectIds.length > 0 ||
    cwTicketIds.length > 0 ||
    cwProjectIds.length > 0;

  const allTickets = tickets;
  const promptString = formattedInput;
  console.log("[scheduled] total tickets fetched:", allTickets.length);
  console.log("[scheduled] total prompt length:", promptString.length);
  console.log("[scheduled] ticket titles included:", allTickets.map((t) => t.summary));

  const generateRes = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
      "x-cron-secret": secret ?? "",
    },
    body: JSON.stringify({
      input: formattedInput,
      tone: generateTone,
      projectName,
      isCronJob: true,
      scheduleId,
      selectedOutputs: generateEnabledTabs,
      outputPreferences: { enabledTabs: generateEnabledTabs },
      extendedOutputKeys: extendedKeys,
      privacyMode: false,
      cronUserId: userId,
      scheduledCron: true,
      /** When true, /api/generate widens prompts so internal/non-client rows are not dropped for external reports. */
      scheduledIncludeAllSelectedTickets:
        isScheduledReport || explicitTicketOrProjectSelection,
      clientContactName: recipientName || undefined,
      reportType,
      includeTickets,
      includeProjects,
      isNoteToSelf,
      templateContext,
    }),
  });

  const generated = (await generateRes.json()) as Record<string, unknown>;

  if (!generateRes.ok) {
    const err =
      (typeof generated.error === "string" ? generated.error : null) ??
      (typeof generated.details === "string" ? generated.details : null) ??
      "Generation failed";
    console.error("[cron-generate] generate failed", err);
    await recordHistory({
      ticketsProcessed: processedCount,
      clientsCovered: clientIds.length === 0 ? ["All clients"] : clientNames,
      status: "failed",
      errorMessage: err,
    });
    return NextResponse.json({ error: err }, { status: generateRes.status || 500 });
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) {
    console.warn("[cron-generate] RESEND_API_KEY missing");
    await recordHistory({
      ticketsProcessed: tickets.length,
      clientsCovered: clientIds.length === 0 ? ["All clients"] : clientNames,
      status: "failed",
      errorMessage: "Email not configured",
    });
    return NextResponse.json(
      { error: "Email not configured" },
      { status: 500 },
    );
  }

  const html = buildScheduledReportEmailHtml(generated, {
    weekEnding,
    ticketCount,
    clientCount,
    prefs: emailPrefs,
    attachExcel,
    reportType,
    recipientName,
    brandName: effectiveBrandName,
    whiteLabelActive,
    appUrl: baseUrl,
    excelTabCount: excelTabsRaw.length,
  });
  const text = buildScheduledReportPlainText(generated, {
    weekEnding,
    ticketCount,
    clientCount,
    prefs: emailPrefs,
    attachExcel,
    reportType,
    recipientName,
    brandName: effectiveBrandName,
    whiteLabelActive,
    appUrl: baseUrl,
    excelTabCount: excelTabsRaw.length,
  });

  let excelBuffer: Buffer | null = null;
  if (attachExcel) {
    try {
      excelBuffer = await exportFullReportToBuffer(generated, projectName, {
        selectedTabs: resolvedScheduleExcelTabs,
        actionColumns: DEFAULT_ACTION_COLS,
        riskColumns: DEFAULT_RISK_COLS,
        projectName,
        brandName: effectiveBrandName || null,
        brandColor: profileBrandColour || null,
        brandSecondaryColor: profileBrandSecondaryColour || null,
        brandLogoUrl: resolvedBrandLogoUrl || null,
        whiteLabelMode: whiteLabelActive,
      });
    } catch (excelErr) {
      console.error("[cron-generate] Excel buffer failed", excelErr);
    }
  }

  const resend = new Resend(resendKey);
  const fileSlug = weekEnding.replace(/\s+/g, "-");
  const subject = scheduleName
    ? `${scheduleName}  -  ${weekEnding}`
    : whiteLabelActive && effectiveBrandName
      ? `${effectiveBrandName} Report  -  ${weekEnding}`
      : `Weekly Report  -  ${weekEnding}`;
  const resendFromHeader = buildReportEmailResendFromHeader(profileForResendFrom);
  const attachPrefix = whiteLabelActive && effectiveBrandName
    ? partnerReportFileSlug(effectiveBrandName)
    : "Handover";
  const toField = resendRecipientList(toList)!;
  const ccField = resendRecipientList(ccList);
  const bccField = resendRecipientList(bccList);

  const { error: sendErr } = await resend.emails.send({
    from: resendFromHeader,
    ...(userReplyTo ? { replyTo: userReplyTo } : {}),
    to: toField,
    ...(ccField ? { cc: ccField } : {}),
    ...(bccField ? { bcc: bccField } : {}),
    subject,
    headers: {
      "X-Entity-Ref-ID": scheduleId || `user-${userId}`,
      "List-Unsubscribe": "<mailto:unsubscribe@gethandover.uk>",
    },
    html,
    text,
    attachments:
      attachExcel && excelBuffer
        ? [
            {
              filename: `${attachPrefix}-Report-${fileSlug}.xlsx`,
              content: excelBuffer.toString("base64"),
              contentType:
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            },
          ]
        : undefined,
  });

  if (sendErr) {
    console.error("[cron-generate] Resend error", sendErr);
    await recordHistory({
      ticketsProcessed: processedCount,
      clientsCovered: clientIds.length === 0 ? ["All clients"] : clientNames,
      status: "failed",
      errorMessage: sendErr.message ?? "Email send failed",
    });
    return NextResponse.json(
      { error: sendErr.message ?? "Email send failed" },
      { status: 500 },
    );
  }

  await recordHistory({
    ticketsProcessed: processedCount,
    clientsCovered: clientIds.length === 0 ? ["All clients"] : clientNames,
    status: "sent",
  });

  console.log("[cron-generate] Email sent to", toList.join(", "), "processed", processedCount);

  const savedGenId =
    typeof generated.savedGenerationId === "string"
      ? generated.savedGenerationId
      : null;
  void notifyHandoverGenerationWebhooks({
    supabase,
    userId,
    parsed: generated as Record<string, unknown>,
    projectName,
    savedGenerationId: savedGenId,
  }).catch((e) => console.error("[cron-generate] chat notify:", e));

  if (pushToHalo && connection && token) {
    const ticketIdsForPush = tickets
      .map((t) => Number(t.id))
      .filter((id) => Number.isFinite(id));
    const projectIdsForPush = projects
      .map((p) => Number(p.id))
      .filter((id) => Number.isFinite(id));
    const legacyScopeIds =
      haloPushTarget === "projects"
        ? projectIdsForPush
        : haloPushTarget === "tickets"
          ? ticketIdsForPush
          : [...ticketIdsForPush, ...projectIdsForPush];

    const orderedPushIds = postTargetsExplicit
      ? postToTicketIdsRaw.filter((id: number) => legacyScopeIds.includes(id))
      : legacyScopeIds;

    if (orderedPushIds.length > 0) {
      const fullOutputs = generated as Record<string, unknown>;
      if (postConsolidated) {
        const pushResult = await pushHandoverOutputsToHaloTickets({
          haloUrl: connection.halo_url,
          token,
          ticketIds: [orderedPushIds[0]],
          outputs: fullOutputs,
          selectedOutputs: haloPushOutputs,
          projectName,
          attachExcel: haloPushExcel,
          excelTabs: haloPushExcelTabs,
          brandName: effectiveBrandName || null,
          brandColor: profileBrandColour || null,
          brandLogoUrl: resolvedBrandLogoUrl || null,
          partnerWhiteLabel: whiteLabelActive,
          logTag: "[cron-generate]",
        });
        console.log("[cron-generate] Halo push (consolidated):", {
          posted: pushResult.posted,
          failed: pushResult.failed,
        });
      } else {
        let posted = 0;
        let failed = 0;
        for (const id of orderedPushIds) {
          const ticket = tickets.find((t) => Number(t.id) === id);
          const project = projects.find((p) => Number(p.id) === id);
          const outputs =
            ticket != null
              ? filterOutputsForSchedulePushItem(fullOutputs, {
                  kind: "support",
                  ticket,
                })
              : project != null
                ? filterOutputsForSchedulePushItem(fullOutputs, {
                    kind: "project",
                    project,
                  })
                : fullOutputs;
          const pushResult = await pushHandoverOutputsToHaloTickets({
            haloUrl: connection.halo_url,
            token,
            ticketIds: [id],
            outputs,
            selectedOutputs: haloPushOutputs,
            projectName,
            attachExcel: haloPushExcel,
            excelTabs: haloPushExcelTabs,
            brandName: effectiveBrandName || null,
            brandColor: profileBrandColour || null,
            brandLogoUrl: resolvedBrandLogoUrl || null,
            partnerWhiteLabel: whiteLabelActive,
            logTag: "[cron-generate]",
          });
          posted += pushResult.posted;
          failed += pushResult.failed;
        }
        console.log("[cron-generate] Halo push (per-ticket):", { posted, failed });
      }
    }
  }

  if (!paid) {
    await incrementFreeScheduledRunCount(supabase, userId);
  }

  return NextResponse.json({
    success: true,
    ticketsProcessed: processedCount,
    emailSent: emailTo,
    skipped: false,
  });
}
