import { NextResponse } from "next/server";

import { getAppOrigin } from "@/lib/app-url";
import { getDateRangeEndIso, getDateRangeStartIso } from "@/lib/scheduled-reports";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
type ScheduleRow = {
  id: string;
  user_id: string;
  enabled: boolean;
  schedule_time: string;
  name?: string | null;
  client_ids: number[] | null;
  email_to: string | null;
  email_cc?: string | null;
  email_bcc?: string | null;
  include_tabs: string[] | null;
  date_range: string | null;
  email_content_prefs: Record<string, unknown> | null;
  attach_excel: boolean | null;
  excel_tabs: string[] | null;
  report_type?: string | null;
  include_tickets?: boolean | null;
  include_projects?: boolean | null;
  is_note_to_self?: boolean | null;
  recipient_name?: string | null;
  selected_ticket_ids?: number[] | null;
  selected_project_ids?: number[] | null;
  ticket_client_ids?: number[] | null;
  project_client_ids?: number[] | null;
  ticket_all_clients?: boolean | null;
  project_all_clients?: boolean | null;
  brand_name?: string | null;
  email_tone?: string | null;
  push_to_halo?: boolean | null;
  halo_push_outputs?: string[] | null;
  halo_push_excel?: boolean | null;
  halo_push_excel_tabs?: string[] | null;
  halo_push_target?: "all" | "projects" | "tickets" | null;
  post_to_ticket_ids?: number[] | null;
  post_consolidated?: boolean | null;
};

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const scheduleId =
    typeof body.scheduleId === "string"
      ? body.scheduleId
      : typeof body.schedule_id === "string"
        ? body.schedule_id
        : typeof body.id === "string"
          ? body.id
          : "";

  const admin = createServiceRoleClient();
  let query = admin
    .from("scheduled_reports")
    .select("*")
    .eq("user_id", user.id)
    .eq("enabled", true);
  if (scheduleId) query = query.eq("id", scheduleId);

  const { data, error } = await query;
  if (error) {
    console.error("[cron/trigger-now]", error.message);
    return NextResponse.json(
      { error: "Could not trigger scheduled report. Please try again." },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as ScheduleRow[];
  if (rows.length === 0) {
    return NextResponse.json({ processed: 0, results: [] });
  }

  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET missing" }, { status: 500 });
  }

  const baseUrl = getAppOrigin();
  const now = new Date();
  const nowIso = now.toISOString();
  const results: Array<{ scheduleId: string; success: boolean; error?: string }> = [];

  for (const schedule of rows) {
    try {
      const reportType =
        typeof schedule.report_type === "string" ? schedule.report_type : "external";
      const isNoteToSelf =
        schedule.is_note_to_self === true || reportType === "note_to_self";
      let emailTo = (schedule.email_to ?? "").trim();
      if (isNoteToSelf) {
        const { data: udata } = await admin.auth.admin.getUserById(schedule.user_id);
        emailTo = udata?.user?.email?.trim() ?? "";
      }
      if (!emailTo) {
        results.push({ scheduleId: schedule.id, success: false, error: "No email_to" });
        continue;
      }

      const dateFrom = getDateRangeStartIso(schedule.date_range ?? "last_7_days", now);
      const dateTo = getDateRangeEndIso(now);

      const generateRes = await fetch(`${baseUrl}/api/cron/generate-for-schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({
          scheduleId: schedule.id,
          scheduleName: schedule.name ?? "",
          userId: schedule.user_id,
          clientIds: schedule.client_ids ?? [],
          dateRange: schedule.date_range ?? "last_7_days",
          dateFrom,
          dateTo,
          emailTo,
          includeTabs: schedule.include_tabs ?? [],
          emailContentPrefs: schedule.email_content_prefs ?? {},
          attachExcel: schedule.attach_excel !== false,
          excelTabs: schedule.excel_tabs ?? [],
          reportType,
          includeTickets: schedule.include_tickets !== false,
          includeProjects: schedule.include_projects !== false,
          isNoteToSelf,
          recipientName:
            typeof schedule.recipient_name === "string"
              ? schedule.recipient_name
              : null,
          selectedTicketIds: Array.isArray(schedule.selected_ticket_ids)
            ? schedule.selected_ticket_ids
            : [],
          selectedProjectIds: Array.isArray(schedule.selected_project_ids)
            ? schedule.selected_project_ids
            : [],
          ticketClientIds: Array.isArray(schedule.ticket_client_ids)
            ? schedule.ticket_client_ids
            : [],
          projectClientIds: Array.isArray(schedule.project_client_ids)
            ? schedule.project_client_ids
            : [],
          ticketAllClients:
            typeof schedule.ticket_all_clients === "boolean"
              ? schedule.ticket_all_clients
              : true,
          projectAllClients:
            typeof schedule.project_all_clients === "boolean"
              ? schedule.project_all_clients
              : true,
          brandName:
            typeof schedule.brand_name === "string" ? schedule.brand_name : null,
          emailTone:
            typeof schedule.email_tone === "string" ? schedule.email_tone : "professional",
          emailCc: typeof schedule.email_cc === "string" ? schedule.email_cc : "",
          emailBcc: typeof schedule.email_bcc === "string" ? schedule.email_bcc : "",
          pushToHalo: schedule.push_to_halo === true,
          haloPushOutputs: Array.isArray(schedule.halo_push_outputs)
            ? schedule.halo_push_outputs
            : ["client_email", "actions", "risks"],
          haloPushExcel: schedule.halo_push_excel === true,
          haloPushExcelTabs: Array.isArray(schedule.halo_push_excel_tabs)
            ? schedule.halo_push_excel_tabs
            : [],
          haloPushTarget:
            schedule.halo_push_target === "projects" ||
            schedule.halo_push_target === "tickets"
              ? schedule.halo_push_target
              : "all",
          ...(Array.isArray(schedule.post_to_ticket_ids)
            ? { postToTicketIds: schedule.post_to_ticket_ids }
            : {}),
          postConsolidated: schedule.post_consolidated === true,
        }),
      });

      const generated = (await generateRes.json()) as {
        success?: boolean;
        error?: string;
      };
      if (!generateRes.ok || generated.success !== true) {
        throw new Error(generated.error ?? `HTTP ${generateRes.status}`);
      }

      await admin
        .from("scheduled_reports")
        .update({ last_run_at: nowIso, updated_at: nowIso })
        .eq("id", schedule.id);

      results.push({ scheduleId: schedule.id, success: true });
    } catch (e) {
      results.push({
        scheduleId: schedule.id,
        success: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
