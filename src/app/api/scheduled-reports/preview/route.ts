import { NextResponse } from "next/server";

import { getAppOrigin } from "@/lib/app-url";
import { decrypt } from "@/lib/encryption";
import { getHaloToken, type HaloProject, type HaloTicket } from "@/lib/halo";
import {
  normalizeEmailContentPrefs,
  SCHEDULE_EXCEL_OPTIONAL_TAB_KEYS,
} from "@/lib/scheduled-email-prefs";
import {
  buildSampleEmailHtml,
  buildScheduledReportEmailHtml,
  SCHEDULED_CRON_TEMPLATE_CONTEXT,
} from "@/lib/scheduled-report-email";
import {
  buildScheduledReportFormattedInput,
  coalesceCronIntIds,
  fetchTicketsAndProjectsForScheduledReport,
  SCHEDULE_REPORT_INPUT_MAX_CHARS,
} from "@/lib/scheduled-report-halo-input";
import { getDateRangeEndIso, getDateRangeStartIso } from "@/lib/scheduled-reports";
import { createServerClient } from "@/lib/supabase/server";
import {
  EXTENDED_PM_TAB_KEYS,
  normalizeExtendedOutputKeys,
} from "@/lib/pm-output-tabs";
import { partnerWhiteLabelActive } from "@/lib/white-label";

export const maxDuration = 300;

const CORE_TAB_SET = new Set([
  "actions",
  "risks",
  "summary",
  "client_email",
  "status_report",
]);

function uniqueClientNames(tickets: HaloTicket[]): string[] {
  const names = new Set<string>();
  for (const t of tickets) {
    const n = t.client?.name?.trim();
    if (n) names.add(n);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

function uniqueClientNamesFromProjects(projects: HaloProject[]): string[] {
  const names = new Set<string>();
  for (const p of projects) {
    const n = p.client?.name?.trim();
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

function normalizePreviewTone(raw: unknown): "formal" | "professional" | "friendly" {
  if (typeof raw !== "string") return "professional";
  const l = raw.trim().toLowerCase();
  if (l === "formal" || l === "friendly") return l;
  return "professional";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const scheduleId =
      searchParams.get("scheduleId") ?? searchParams.get("schedule_id");

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const generatedAt = new Date().toISOString();

    if (!scheduleId) {
      return NextResponse.json({ html: buildSampleEmailHtml(), generatedAt });
    }

    const secret = process.env.CRON_SECRET?.trim();
    if (!secret) {
      console.error("[preview] CRON_SECRET missing");
      return NextResponse.json(
        { error: "Preview is not configured (CRON_SECRET missing)" },
        { status: 500 },
      );
    }

    const scheduleRes = await supabase
      .from("scheduled_reports")
      .select("*")
      .eq("user_id", user.id)
      .eq("id", scheduleId)
      .maybeSingle();

    if (scheduleRes.error) {
      console.error("[preview] schedule query error:", scheduleRes.error.message);
      return NextResponse.json({ error: scheduleRes.error.message }, { status: 500 });
    }

    const scheduleRow = scheduleRes.data;
    if (!scheduleRow) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    console.log("[preview] schedule record:", {
      selected_ticket_ids: scheduleRow.selected_ticket_ids,
      selected_project_ids: scheduleRow.selected_project_ids,
      client_ids: scheduleRow.client_ids,
      ticket_client_ids: scheduleRow.ticket_client_ids,
      project_client_ids: scheduleRow.project_client_ids,
    });

    const clientIds = coalesceCronIntIds(scheduleRow.client_ids);
    const selectedTicketIds = coalesceCronIntIds(scheduleRow.selected_ticket_ids);
    const selectedProjectIds = coalesceCronIntIds(scheduleRow.selected_project_ids);
    const ticketClientIds = coalesceCronIntIds(scheduleRow.ticket_client_ids);
    const projectClientIds = coalesceCronIntIds(scheduleRow.project_client_ids);
    const ticketAllClients =
      typeof scheduleRow.ticket_all_clients === "boolean"
        ? scheduleRow.ticket_all_clients
        : true;
    const projectAllClients =
      typeof scheduleRow.project_all_clients === "boolean"
        ? scheduleRow.project_all_clients
        : true;

    const emailPrefs = normalizeEmailContentPrefs(scheduleRow.email_content_prefs ?? {});
    const attachExcel = scheduleRow.attach_excel !== false;
    const reportTypeRaw =
      typeof scheduleRow.report_type === "string" ? scheduleRow.report_type : "external";
    const reportType =
      reportTypeRaw === "internal" || reportTypeRaw === "note_to_self"
        ? reportTypeRaw
        : "external";
    const includeTickets = scheduleRow.include_tickets !== false;
    const includeProjects = scheduleRow.include_projects !== false;
    const isNoteToSelf =
      scheduleRow.is_note_to_self === true || reportType === "note_to_self";
    const excelTabsRaw = Array.isArray(scheduleRow.excel_tabs)
      ? (scheduleRow.excel_tabs as unknown[]).filter(
          (x: unknown): x is string => typeof x === "string",
        )
      : [];
    const generateTone = normalizePreviewTone(scheduleRow.email_tone);
    const recipientName =
      typeof scheduleRow.recipient_name === "string" ? scheduleRow.recipient_name.trim() : "";
    const scheduleBrandName =
      typeof scheduleRow.brand_name === "string" ? scheduleRow.brand_name.trim() : "";

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("brand_name, plan, white_label_mode")
      .eq("id", user.id)
      .maybeSingle();
    const profileBrandName =
      profileRow && typeof profileRow.brand_name === "string"
        ? profileRow.brand_name.trim()
        : "";
    const effectiveBrandName = profileBrandName || scheduleBrandName;
    const whiteLabelActive = partnerWhiteLabelActive(
      profileRow as { plan?: string | null; white_label_mode?: boolean | null; brand_name?: string | null } | null,
    );

    const { data: connection, error: connErr } = await supabase
      .from("halo_connections")
      .select("halo_url, tenant, client_id, client_secret_encrypted")
      .eq("user_id", user.id)
      .maybeSingle();

    if (connErr || !connection) {
      return NextResponse.json(
        { error: "Connect HaloPSA to preview your report." },
        { status: 400 },
      );
    }

    let clientSecret: string;
    try {
      clientSecret = decrypt(connection.client_secret_encrypted);
    } catch (e) {
      console.error("[preview] decrypt credentials failed:", e);
      return NextResponse.json(
        { error: "Could not read Halo credentials." },
        { status: 500 },
      );
    }

    let token: string;
    try {
      token = await getHaloToken({
        haloUrl: connection.halo_url,
        tenant: connection.tenant,
        clientId: connection.client_id,
        clientSecret,
      });
    } catch (e) {
      console.error("[preview] Halo token failed:", e);
      return NextResponse.json(
        { error: "Could not authenticate with HaloPSA." },
        { status: 500 },
      );
    }

    const previewNow = new Date();
    const dateRangeKey =
      typeof scheduleRow.date_range === "string" ? scheduleRow.date_range : "last_7_days";
    const dateFrom = getDateRangeStartIso(dateRangeKey, previewNow);
    const dateTo = getDateRangeEndIso(previewNow);

    const scheduleData = {
      selected_ticket_ids: selectedTicketIds,
      selected_project_ids: selectedProjectIds,
    };
    console.log("[scheduled] ticket IDs to fetch:", scheduleData.selected_ticket_ids);
    console.log("[scheduled] project IDs to fetch:", scheduleData.selected_project_ids);

    let tickets: HaloTicket[] = [];
    let projects: HaloProject[] = [];
    const isScheduledReport = true;
    try {
      const fetched = await fetchTicketsAndProjectsForScheduledReport({
        haloUrl: connection.halo_url,
        token,
        isScheduledReport,
        includeTickets,
        includeProjects,
        clientIds,
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
      const allItems = [...tickets, ...projects].filter(Boolean);
      console.log("[scheduled] total items fetched:", allItems.length);
    } catch (e) {
      console.error("[preview] Halo fetch failed:", e);
      return NextResponse.json(
        {
          error:
            e instanceof Error ? e.message : "Could not load data from HaloPSA.",
        },
        { status: 500 },
      );
    }

    const processedCount = tickets.length + projects.length;
    if (processedCount === 0) {
      return NextResponse.json(
        {
          error: "no_tickets",
          message: `No tickets/projects found in ${dateRangeKey.replace(/_/g, " ")} for this preview.`,
        },
        { status: 200 },
      );
    }

    const clientNames = new Set<string>();
    for (const n of uniqueClientNames(tickets)) clientNames.add(n);
    for (const n of uniqueClientNamesFromProjects(projects)) clientNames.add(n);
    const clientCount = Math.max(clientNames.size, 1);

    const formattedInput = buildScheduledReportFormattedInput(
      tickets,
      projects,
      SCHEDULE_REPORT_INPUT_MAX_CHARS,
    );

    const outputsNeeded = new Set<string>(["summary"]);
    if (emailPrefs.include_actions) outputsNeeded.add("actions");
    if (emailPrefs.include_risks) outputsNeeded.add("risks");
    if (emailPrefs.include_client_emails) outputsNeeded.add("client_email");
    if (emailPrefs.include_status) outputsNeeded.add("status_report");

    if (attachExcel) {
      for (const k of excelTabsRaw) {
        if (CORE_TAB_SET.has(k)) outputsNeeded.add(k);
      }
    }

    let coreOutputs = [...outputsNeeded].filter((t: string) => CORE_TAB_SET.has(t));
    if (coreOutputs.length === 0) {
      coreOutputs = ["summary"];
    }

    const optionalSet = new Set<string>(SCHEDULE_EXCEL_OPTIONAL_TAB_KEYS);
    const extendedFromExcel = excelTabsRaw.filter((t: string) => optionalSet.has(t));
    let extendedKeys = normalizeExtendedOutputKeys(extendedFromExcel);

    if (attachExcel && extendedKeys.length === 0 && excelTabsRaw.length > 0) {
      extendedKeys = normalizeExtendedOutputKeys(
        excelTabsRaw.filter((t: string) =>
          (EXTENDED_PM_TAB_KEYS as readonly string[]).includes(t),
        ),
      );
    }

    const weekEnding = weekEndingSlug(previewNow);
    const projectName = `Weekly report  -  ${weekEnding}`;

    const baseUrl = getAppOrigin();
    const explicitTicketOrProjectSelection =
      selectedTicketIds.length > 0 || selectedProjectIds.length > 0;

    const generateRes = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
        "x-cron-secret": secret,
      },
      body: JSON.stringify({
        input: formattedInput,
        tone: generateTone,
        projectName,
        isCronJob: true,
        scheduleId,
        selectedOutputs: coreOutputs,
        outputPreferences: { enabledTabs: coreOutputs },
        extendedOutputKeys: extendedKeys,
        privacyMode: false,
        cronUserId: user.id,
        scheduledCron: true,
        scheduledIncludeAllSelectedTickets:
          isScheduledReport || explicitTicketOrProjectSelection,
        clientContactName: recipientName || undefined,
        reportType,
        includeTickets,
        includeProjects,
        isNoteToSelf,
        templateContext: SCHEDULED_CRON_TEMPLATE_CONTEXT,
      }),
    });

    const generated = (await generateRes.json()) as Record<string, unknown>;

    if (!generateRes.ok) {
      const err =
        (typeof generated.error === "string" ? generated.error : null) ??
        (typeof generated.details === "string" ? generated.details : null) ??
        "Generation failed";
      console.error("[preview] /api/generate failed:", err, "status:", generateRes.status);
      return NextResponse.json({ error: err }, { status: generateRes.status || 500 });
    }

    const ticketCount = processedCount;
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

    return NextResponse.json({ html, generatedAt });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    console.error("[preview] unhandled error:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
