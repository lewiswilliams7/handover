import { NextResponse } from "next/server";

import { getAppOrigin } from "@/lib/app-url";
import { assertFreeScheduledRunAllowed } from "@/lib/free-tier-monthly-usage";
import {
  computeNextRunFromLastRunUtc,
  getDateRangeEndIso,
  getDateRangeStartIso,
} from "@/lib/scheduled-reports";
import { userIdsWithScheduledAccess } from "@/lib/plans";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/** Origin for internal cron fetches when NEXT_PUBLIC_APP_URL is unset (e.g. Vercel preview). */
function getCronFetchOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vu = process.env.VERCEL_URL?.trim();
  if (vu) return `https://${vu.replace(/^https?:\/\//, "")}`;
  return getAppOrigin();
}

type ScheduleRow = {
  id: string;
  user_id: string;
  enabled: boolean;
  schedule_day: string;
  schedule_time: string;
  client_ids: number[] | null;
  email_to: string | null;
  email_cc?: string | null;
  email_bcc?: string | null;
  name?: string | null;
  include_tabs: string[] | null;
  date_range: string | null;
  next_run_at: string | null;
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
  cw_ticket_ids?: number[] | string | null;
  cw_project_ids?: number[] | string | null;
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
  timezone?: string | null;
  send_day?: string | null;
  send_time?: string | null;
  active?: boolean | null;
};

function parseScheduleIdArray(raw: unknown): number[] {
  if (Array.isArray(raw)) {
    return raw
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n))
      .map((n) => Math.trunc(n));
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      return parseScheduleIdArray(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  return [];
}

function weekdayInTimezone(now: Date, timezone: string): string {
  return now
    .toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: timezone,
    })
    .toLowerCase();
}

export async function GET(request: Request) {
  console.log("[cron] scheduled-reports GET hit", new Date().toISOString());

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn("[cron] scheduled-reports unauthorized", {
      hasSecret: Boolean(process.env.CRON_SECRET),
      hasAuthHeader: Boolean(authHeader),
      xVercelCron: request.headers.get("x-vercel-cron"),
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const now = new Date();
  const nowIso = now.toISOString();
  console.log("[cron] Current UTC hour:", now.getUTCHours());
  console.log("[cron] Current UTC time:", nowIso);

  if (now.getUTCDate() === 1) {
    const { error: resetErr } = await supabase.from("teams").update({ generation_count: 0 });
    if (resetErr) {
      console.error("[cron] team generation reset:", resetErr.message);
    } else {
      console.log("[cron] Reset teams.generation_count (UTC month rollover day)");
    }
  }

  const todayUtc = weekdayInTimezone(now, "UTC");

  console.log("[cron] Today (UTC) is:", todayUtc);

  const { data: dueNext, error: errDue } = await supabase
    .from("scheduled_reports")
    .select("*")
    .eq("enabled", true)
    .lte("next_run_at", nowIso);

  if (errDue) {
    console.error("[cron] scheduled_reports query", errDue.message);
    console.error("[cron/scheduled-reports] due query failed:", errDue.message);
    return NextResponse.json(
      { error: "Scheduled report cron failed. Please try again." },
      { status: 500 },
    );
  }

  const { data: dueNull, error: errNull } = await supabase
    .from("scheduled_reports")
    .select("*")
    .eq("enabled", true)
    .is("next_run_at", null);

  if (errNull) {
    console.error("[cron] scheduled_reports null next_run", errNull.message);
    console.error("[cron/scheduled-reports] null next_run query failed:", errNull.message);
    return NextResponse.json(
      { error: "Scheduled report cron failed. Please try again." },
      { status: 500 },
    );
  }

  const byId = new Map<string, ScheduleRow>();
  const candidates = [...(dueNext ?? []), ...(dueNull ?? [])];
  for (const s of candidates) {
    byId.set(s.id, s);
  }
  const due = [...byId.values()].filter((schedule) => {
    const timezone =
      typeof schedule.timezone === "string" && schedule.timezone.trim()
        ? schedule.timezone.trim()
        : "Europe/London";
    const scheduleDayRaw =
      typeof schedule.schedule_day === "string" ? schedule.schedule_day : "";
    const scheduleDay = scheduleDayRaw.trim().toLowerCase();
    const todayInScheduleTimezone = weekdayInTimezone(now, timezone);
    const include = scheduleDay === todayInScheduleTimezone;
    console.log("[cron] Checking schedule:", {
      id: schedule.id,
      send_day: schedule.send_day ?? schedule.schedule_day ?? null,
      send_time: schedule.send_time ?? schedule.schedule_time ?? null,
      timezone,
      active: schedule.active ?? schedule.enabled ?? null,
      todayInScheduleTimezone,
      included: include,
      exclusionReason: include ? null : "schedule_day_mismatch",
    });
    return include;
  });

  console.log("[cron] Schedules due after timezone/day check:", due.length);

  const userIds = [...new Set(due.map((s) => s.user_id))];
  const proIds =
    userIds.length > 0
      ? await userIdsWithScheduledAccess(supabase, userIds)
      : new Set<string>();

  const results: {
    scheduleId: string;
    success: boolean;
    skipped?: string;
    error?: string;
  }[] = [];

  const baseUrl = getCronFetchOrigin();

  for (const schedule of due) {
    try {
      if (!proIds.has(schedule.user_id)) {
        const allowed = await assertFreeScheduledRunAllowed(supabase, schedule.user_id);
        if (!allowed) {
          const st =
            typeof schedule.schedule_time === "string" && schedule.schedule_time.trim()
              ? schedule.schedule_time.trim()
              : "07:00";
          const nextRun = computeNextRunFromLastRunUtc(st, new Date(nowIso));
          await supabase
            .from("scheduled_reports")
            .update({
              next_run_at: nextRun.toISOString(),
              updated_at: nowIso,
            })
            .eq("id", schedule.id);
          results.push({
            scheduleId: schedule.id,
            success: false,
            skipped: "free_monthly_cap",
          });
          continue;
        }
      }

      const reportType =
        typeof schedule.report_type === "string" ? schedule.report_type : "external";
      const isNoteToSelf =
        schedule.is_note_to_self === true || reportType === "note_to_self";

      let emailTo = (schedule.email_to ?? "").trim();
      if (isNoteToSelf) {
        // For personal note-to-self: always use the user's signup email.
        const { data: udata } = await supabase.auth.admin.getUserById(schedule.user_id);
        emailTo = udata?.user?.email?.trim() ?? "";
      }

      if (!emailTo) {
        console.log("[cron] Skipping  -  no email_to", schedule.id);
        results.push({
          scheduleId: schedule.id,
          success: false,
          skipped: "no_email",
        });
        continue;
      }

      const dateFrom = getDateRangeStartIso(
        schedule.date_range ?? "last_7_days",
        now,
      );
      const dateTo = getDateRangeEndIso(now);

      const generateRes = await fetch(
        `${baseUrl}/api/cron/generate-for-schedule`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.CRON_SECRET}`,
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
            cw_ticket_ids: parseScheduleIdArray(schedule.cw_ticket_ids),
            cw_project_ids: parseScheduleIdArray(schedule.cw_project_ids),
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
        },
      );

      const generateResult = (await generateRes.json()) as {
        skipped?: boolean;
        reason?: string;
        error?: string;
        success?: boolean;
      };

      if (!generateRes.ok) {
        throw new Error(generateResult.error ?? `HTTP ${generateRes.status}`);
      }

      const advanceSchedule =
        generateResult.success === true ||
        (generateResult.skipped === true &&
          (generateResult.reason === "no_tickets" ||
            generateResult.reason === "No tickets" ||
            generateResult.reason === "no_connection" ||
            generateResult.reason === "free_monthly_cap"));

      if (advanceSchedule) {
        const nextRun = computeNextRunFromLastRunUtc(
          schedule.schedule_time,
          new Date(nowIso),
        );

        const { error: upErr } = await supabase
          .from("scheduled_reports")
          .update({
            last_run_at: nowIso,
            next_run_at: nextRun.toISOString(),
            updated_at: nowIso,
          })
          .eq("id", schedule.id);

        if (upErr) {
          console.error("[cron] Failed to update schedule", schedule.id, upErr.message);
        }
      }

      results.push({
        scheduleId: schedule.id,
        success: generateResult.success === true,
        skipped: generateResult.skipped ? generateResult.reason : undefined,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[cron] Schedule failed", schedule.id, message);
      results.push({
        scheduleId: schedule.id,
        success: false,
        error: message,
      });
    }
  }

  return NextResponse.json({
    processed: results.length,
    results,
  });
}
