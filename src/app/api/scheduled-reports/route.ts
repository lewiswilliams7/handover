import { NextResponse } from "next/server";

import {
  DEFAULT_EMAIL_CONTENT_PREFS,
  SCHEDULE_EXCEL_CORE_KEYS,
  SCHEDULE_EXCEL_OPTIONAL_TAB_KEYS,
} from "@/lib/scheduled-email-prefs";
import {
  londonWallScheduleTimeToUtcStored,
  utcStoredScheduleTimeToLondonWall,
} from "@/lib/scheduled-report-schedule-time";
import { computeNextRunUtc } from "@/lib/scheduled-reports";
import { getPlanTierServer, verifyUserPlan } from "@/lib/server/verifyUserPlan";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

const DEFAULT_TABS = [
  "actions",
  "risks",
  "summary",
  "client_email",
  "status_report",
];

function normalizeReportType(r: unknown): "external" | "internal" | "note_to_self" | "qbr" {
  if (typeof r !== "string") return "external";
  const v = r.trim().toLowerCase();
  if (v === "internal") return "internal";
  if (v === "qbr") return "qbr";
  if (v === "note_to_self" || v === "note-to-self" || v === "note to self") return "note_to_self";
  return "external";
}

const VALID_DAYS = new Set([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

function normalizeDay(d: unknown): string {
  if (typeof d !== "string") return "monday";
  const l = d.trim().toLowerCase();
  return VALID_DAYS.has(l) ? l : "monday";
}

function normalizeTime(t: unknown): string {
  if (typeof t !== "string") return "07:00";
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return "07:00";
  const hh = Math.min(23, Math.max(0, Number.parseInt(m[1], 10)));
  const mm = Math.min(59, Math.max(0, Number.parseInt(m[2], 10)));
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function emailFormatForReportType(
  reportType: "external" | "internal" | "note_to_self" | "qbr",
): "professional" | "digest" {
  return reportType === "external" ? "professional" : "digest";
}

function normalizeEmailTone(r: unknown): string {
  if (typeof r !== "string") return "professional";
  const l = r.trim().toLowerCase();
  if (l === "formal" || l === "friendly") return l;
  return "professional";
}

function normalizeDateRange(r: unknown): string {
  if (
    r === "today" ||
    r === "last_30_days" ||
    r === "last_14_days" ||
    r === "this_week" ||
    r === "last_7_days"
  ) {
    return r;
  }
  return "last_7_days";
}

function normalizeEmailContentPrefs(
  raw: unknown,
): Record<string, boolean> {
  const base = { ...DEFAULT_EMAIL_CONTENT_PREFS };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  return {
    include_actions: o.include_actions !== false,
    include_risks: o.include_risks !== false,
    include_client_emails: o.include_client_emails === true,
    include_status: o.include_status === true,
  };
}

function normalizeExcelTabs(raw: unknown): string[] {
  const allKeys = [...SCHEDULE_EXCEL_CORE_KEYS, ...SCHEDULE_EXCEL_OPTIONAL_TAB_KEYS];
  if (!Array.isArray(raw)) {
    return allKeys;
  }
  const allowed = new Set<string>([...SCHEDULE_EXCEL_CORE_KEYS, ...SCHEDULE_EXCEL_OPTIONAL_TAB_KEYS]);
  const selected = raw.filter(
    (x): x is string => typeof x === "string" && allowed.has(x),
  );
  return selected.length > 0 ? [...new Set(selected)] : allKeys;
}

/** Coerce JSON / PostgREST integer arrays (numbers or numeric strings) to unique integers. */
function coalesceIntIds(raw: unknown): number[] {
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

function intArraysMatchDb(a: number[], b: unknown): boolean {
  const right = coalesceIntIds(b);
  if (a.length !== right.length) return false;
  const as = [...a].sort((x, y) => x - y);
  const bs = [...right].sort((x, y) => x - y);
  return as.every((v, i) => v === bs[i]);
}

/** DB keeps schedule_time as UTC HH:mm; API returns Europe/London for display. */
function mapScheduleRowForDisplay(
  row: Record<string, unknown>,
  referenceUtc: Date,
): Record<string, unknown> {
  const raw =
    typeof row.schedule_time === "string" && row.schedule_time.trim()
      ? row.schedule_time.trim()
      : "07:00";
  return {
    ...row,
    schedule_time: utcStoredScheduleTimeToLondonWall(raw, referenceUtc),
  };
}

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("scheduled_reports")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[scheduled-reports GET]", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const ref = new Date();
    const schedules = (data ?? []).map((row) =>
      mapScheduleRowForDisplay(row as Record<string, unknown>, ref),
    );
    return NextResponse.json({
      schedules,
      // Backward compatibility for the pre-campaign UI.
      schedule: (schedules[0] as Record<string, unknown> | undefined) ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let planFieldsForRoute;
    try {
      planFieldsForRoute = await verifyUserPlan(user.id);
    } catch (e) {
      console.error("[scheduled-reports PUT] verifyUserPlan:", e);
      return NextResponse.json({ error: "Could not verify subscription." }, { status: 500 });
    }
    const routeTier = getPlanTierServer(planFieldsForRoute);
    if (routeTier < 1) {
      return NextResponse.json(
        {
          error: "upgrade_required",
          message: "Scheduled reports require an active Professional plan or higher.",
        },
        { status: 403 },
      );
    }

    const body = (await req.json()) as Record<string, unknown>;
    const enabled = body.enabled === true;
    const schedule_day = normalizeDay(body.schedule_day);
    const scheduleTimeLondon = normalizeTime(body.schedule_time);
    const now = new Date();
    const schedule_time = londonWallScheduleTimeToUtcStored(
      scheduleTimeLondon,
      now,
    );
    const date_range = normalizeDateRange(body.date_range);
    const email_to =
      typeof body.email_to === "string" && body.email_to.trim()
        ? body.email_to.trim()
        : user.email ?? null;

    const name =
      typeof body.name === "string" && body.name.trim()
        ? body.name.trim()
        : "Weekly Report";
    const report_type = normalizeReportType(body.report_type);
    const email_format = emailFormatForReportType(report_type);
    const include_tickets = body.include_tickets !== false;
    const include_projects = body.include_projects !== false;
    const is_note_to_self = report_type === "note_to_self" || body.is_note_to_self === true;
    const recipient_name =
      typeof body.recipient_name === "string" && body.recipient_name.trim()
        ? body.recipient_name.trim()
        : null;
    const brand_name =
      typeof body.brand_name === "string" && body.brand_name.trim()
        ? body.brand_name.trim()
        : null;
    const email_tone = normalizeEmailTone(body.email_tone);
    const email_cc =
      typeof body.email_cc === "string" && body.email_cc.trim()
        ? body.email_cc.trim()
        : null;
    const email_bcc =
      typeof body.email_bcc === "string" && body.email_bcc.trim()
        ? body.email_bcc.trim()
        : null;
    const push_to_halo = body.push_to_halo === true;
    const halo_push_outputs = Array.isArray(body.halo_push_outputs)
      ? body.halo_push_outputs.filter((x): x is string => typeof x === "string")
      : ["client_email", "actions", "risks"];
    const halo_push_excel = body.halo_push_excel === true;
    const halo_push_excel_tabs = Array.isArray(body.halo_push_excel_tabs)
      ? body.halo_push_excel_tabs.filter((x): x is string => typeof x === "string")
      : [];
    const halo_push_target =
      body.halo_push_target === "projects" ||
      body.halo_push_target === "tickets" ||
      body.halo_push_target === "all"
        ? body.halo_push_target
        : "all";

    let post_to_ticket_ids: number[] | null = null;
    if (push_to_halo) {
      if (Array.isArray(body.post_to_ticket_ids)) {
        post_to_ticket_ids = body.post_to_ticket_ids.filter(
          (x): x is number => typeof x === "number" && Number.isFinite(x),
        );
      }
    }
    const post_consolidated = push_to_halo && body.post_consolidated === true;

    const client_ids = coalesceIntIds(body.client_ids);
    const ticket_client_ids = coalesceIntIds(body.ticket_client_ids);
    const project_client_ids = coalesceIntIds(body.project_client_ids);
    const ticket_all_clients =
      typeof body.ticket_all_clients === "boolean" ? body.ticket_all_clients : true;
    const project_all_clients =
      typeof body.project_all_clients === "boolean" ? body.project_all_clients : true;
    const selected_ticket_ids = coalesceIntIds(body.selected_ticket_ids);
    const selected_project_ids = coalesceIntIds(body.selected_project_ids);
    const cw_ticket_ids = coalesceIntIds(body.cw_ticket_ids);
    const cw_project_ids = coalesceIntIds(body.cw_project_ids);

    const email_content_prefs = normalizeEmailContentPrefs(body.email_content_prefs);
    const attach_excel = body.attach_excel === false ? false : true;
    const excel_tabs = normalizeExcelTabs(body.excel_tabs);

    // Store a safe core subset for legacy generation.
    const include_tabs: string[] = [];
    if (email_content_prefs.include_actions) include_tabs.push("actions");
    if (email_content_prefs.include_risks) include_tabs.push("risks");
    include_tabs.push("summary");
    if (email_content_prefs.include_client_emails) include_tabs.push("client_email");
    if (email_content_prefs.include_status) include_tabs.push("status_report");

    const schedule_id =
      typeof body.schedule_id === "string"
        ? body.schedule_id
        : typeof body.scheduleId === "string"
          ? body.scheduleId
          : typeof body.id === "string"
            ? body.id
            : "";

    const scheduleIdToUpdate =
      typeof schedule_id === "string" && schedule_id.trim().length > 0 ? schedule_id.trim() : null;

    const next_run_at = enabled
      ? computeNextRunUtc(schedule_day, schedule_time, now).toISOString()
      : null;

    const payload = {
      user_id: user.id,
      enabled,
      schedule_day,
      schedule_time,
      client_ids,
      email_to,
      include_tabs,
      date_range,
      next_run_at,
      updated_at: now.toISOString(),
      email_content_prefs,
      attach_excel,
      excel_tabs,
      name,
      report_type,
      include_tickets,
      include_projects,
      is_note_to_self,
      recipient_name,
      brand_name,
      email_format,
      email_tone,
      email_cc,
      email_bcc,
      push_to_halo,
      halo_push_outputs,
      halo_push_excel,
      halo_push_excel_tabs,
      halo_push_target,
      post_to_ticket_ids,
      post_consolidated,
      ticket_client_ids,
      project_client_ids,
      ticket_all_clients,
      project_all_clients,
      selected_ticket_ids,
      selected_project_ids,
      cw_ticket_ids,
      cw_project_ids,
    };

    console.log("[scheduled-reports PUT] payload to DB:", {
      client_ids: payload.client_ids,
      selected_ticket_ids: payload.selected_ticket_ids,
      selected_project_ids: payload.selected_project_ids,
      cw_ticket_ids: payload.cw_ticket_ids,
      cw_project_ids: payload.cw_project_ids,
      ticket_client_ids: payload.ticket_client_ids,
      project_client_ids: payload.project_client_ids,
      ticket_all_clients: payload.ticket_all_clients,
      project_all_clients: payload.project_all_clients,
    });

    if (getPlanTierServer(planFieldsForRoute) === 1 && enabled) {
      const admin = createServiceRoleClient();
      const { count: enabledCount, error: enErr } = await admin
        .from("scheduled_reports")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("enabled", true);
      if (enErr) {
        console.warn("[scheduled-reports PUT] enabled count:", enErr.message);
      }
      const n = enabledCount ?? 0;
      if (scheduleIdToUpdate) {
        const { data: existingRow } = await admin
          .from("scheduled_reports")
          .select("enabled")
          .eq("id", scheduleIdToUpdate)
          .eq("user_id", user.id)
          .maybeSingle();
        const wasOn = existingRow?.enabled === true;
        if (!wasOn && n >= 3) {
          return NextResponse.json(
            {
              error: "professional_schedule_limit",
              message:
                "You have reached the 3 scheduled report limit on the Professional plan. Upgrade to Team for unlimited scheduled reports.",
            },
            { status: 403 },
          );
        }
      } else if (n >= 3) {
        return NextResponse.json(
          {
            error: "professional_schedule_limit",
            message:
              "You have reached the 3 scheduled report limit on the Professional plan. Upgrade to Team for unlimited scheduled reports.",
          },
          { status: 403 },
        );
      }
    }

    if (scheduleIdToUpdate) {
      const { data, error } = await supabase
        .from("scheduled_reports")
        .update(payload)
        .eq("user_id", user.id)
        .eq("id", scheduleIdToUpdate)
        .select("*")
        .single();
      if (error) {
        console.error("[scheduled-reports PUT update]", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      const row = data as Record<string, unknown>;
      console.log("[scheduled-reports PUT] row after save (DB read):", {
        client_ids: row.client_ids,
        selected_ticket_ids: row.selected_ticket_ids,
        selected_project_ids: row.selected_project_ids,
        ticket_client_ids: row.ticket_client_ids,
        project_client_ids: row.project_client_ids,
        ticket_all_clients: row.ticket_all_clients,
        project_all_clients: row.project_all_clients,
      });
      const mismatch: string[] = [];
      if (!intArraysMatchDb(client_ids, row.client_ids)) mismatch.push("client_ids");
      if (!intArraysMatchDb(ticket_client_ids, row.ticket_client_ids))
        mismatch.push("ticket_client_ids");
      if (!intArraysMatchDb(project_client_ids, row.project_client_ids))
        mismatch.push("project_client_ids");
      if (!intArraysMatchDb(selected_ticket_ids, row.selected_ticket_ids))
        mismatch.push("selected_ticket_ids");
      if (!intArraysMatchDb(selected_project_ids, row.selected_project_ids))
        mismatch.push("selected_project_ids");
      if (!intArraysMatchDb(cw_ticket_ids, row.cw_ticket_ids))
        mismatch.push("cw_ticket_ids");
      if (!intArraysMatchDb(cw_project_ids, row.cw_project_ids))
        mismatch.push("cw_project_ids");
      if (mismatch.length > 0) {
        console.warn("[scheduled-reports PUT] DB row differs from payload for:", mismatch.join(", "));
      } else {
        console.log("[scheduled-reports PUT] DB row matches payload for all id arrays.");
      }
      return NextResponse.json({
        schedule: mapScheduleRowForDisplay(row, new Date()),
      });
    }

    const { data, error } = await supabase
      .from("scheduled_reports")
      .insert({ ...payload, created_at: now.toISOString() })
      .select("*")
      .single();

    if (error) {
      console.error("[scheduled-reports PUT insert]", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const insertRow = data as Record<string, unknown>;
    console.log("[scheduled-reports PUT] row after insert (DB read):", {
      client_ids: insertRow.client_ids,
      selected_ticket_ids: insertRow.selected_ticket_ids,
      selected_project_ids: insertRow.selected_project_ids,
      cw_ticket_ids: insertRow.cw_ticket_ids,
      cw_project_ids: insertRow.cw_project_ids,
      ticket_client_ids: insertRow.ticket_client_ids,
      project_client_ids: insertRow.project_client_ids,
      ticket_all_clients: insertRow.ticket_all_clients,
      project_all_clients: insertRow.project_all_clients,
    });
    const insertMismatch: string[] = [];
    if (!intArraysMatchDb(client_ids, insertRow.client_ids)) insertMismatch.push("client_ids");
    if (!intArraysMatchDb(ticket_client_ids, insertRow.ticket_client_ids))
      insertMismatch.push("ticket_client_ids");
    if (!intArraysMatchDb(project_client_ids, insertRow.project_client_ids))
      insertMismatch.push("project_client_ids");
    if (!intArraysMatchDb(selected_ticket_ids, insertRow.selected_ticket_ids))
      insertMismatch.push("selected_ticket_ids");
    if (!intArraysMatchDb(selected_project_ids, insertRow.selected_project_ids))
      insertMismatch.push("selected_project_ids");
    if (!intArraysMatchDb(cw_ticket_ids, insertRow.cw_ticket_ids))
      insertMismatch.push("cw_ticket_ids");
    if (!intArraysMatchDb(cw_project_ids, insertRow.cw_project_ids))
      insertMismatch.push("cw_project_ids");
    if (insertMismatch.length > 0) {
      console.warn("[scheduled-reports PUT] insert row differs from payload for:", insertMismatch.join(", "));
    } else {
      console.log("[scheduled-reports PUT] insert row matches payload for all id arrays.");
    }

    return NextResponse.json({
      schedule: mapScheduleRowForDisplay(insertRow, new Date()),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  return PUT(req);
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const scheduleId =
      typeof body.schedule_id === "string"
        ? body.schedule_id
        : typeof body.scheduleId === "string"
          ? body.scheduleId
          : typeof body.id === "string"
            ? body.id
            : "";
    if (!scheduleId) {
      return NextResponse.json({ error: "schedule_id required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("scheduled_reports")
      .delete()
      .eq("user_id", user.id)
      .eq("id", scheduleId);

    if (error) {
      console.error("[scheduled-reports DELETE]", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
