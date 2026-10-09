import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/server";

export type ScheduledReportHistorySource = "psa" | "ci" | "digest" | "manual_qbr";

type HistoryTypeFilter = "psa" | "ci" | "digest";

const KNOWN_SOURCES = new Set<ScheduledReportHistorySource>([
  "psa",
  "ci",
  "digest",
  "manual_qbr",
]);

type JoinedSchedule = {
  report_type: string | null;
  ci_qbr_client_name: string | null;
};

type HistoryRow = {
  id: string;
  sent_at: string;
  email_to: string | null;
  tickets_processed: number | null;
  clients_covered: string[] | null;
  status: string | null;
  error_message: string | null;
  schedule_id: string | null;
  source: string | null;
  scheduled_reports: JoinedSchedule | JoinedSchedule[] | null;
};

const HISTORY_SELECT = `
  id,
  sent_at,
  email_to,
  tickets_processed,
  clients_covered,
  status,
  error_message,
  schedule_id,
  source,
  scheduled_reports (
    report_type,
    ci_qbr_client_name
  )
`;

function parseTypeFilter(raw: string | null): HistoryTypeFilter | null {
  if (raw === "psa" || raw === "ci" || raw === "digest") return raw;
  return null;
}

function joinedSchedule(
  scheduledReports: HistoryRow["scheduled_reports"],
): JoinedSchedule | null {
  if (!scheduledReports) return null;
  if (Array.isArray(scheduledReports)) {
    return scheduledReports[0] ?? null;
  }
  return scheduledReports;
}

function isCiSchedule(schedule: HistoryRow["scheduled_reports"]): boolean {
  const joined = joinedSchedule(schedule);
  if (!joined) return false;
  const reportType =
    typeof joined.report_type === "string" ? joined.report_type.trim() : "";
  const clientName =
    typeof joined.ci_qbr_client_name === "string"
      ? joined.ci_qbr_client_name.trim()
      : "";
  return reportType === "ci_qbr" || clientName.length > 0;
}

/** Backward compatibility for rows inserted before source was written. */
function deriveHistorySource(row: HistoryRow): ScheduledReportHistorySource {
  if (row.schedule_id) {
    return isCiSchedule(row.scheduled_reports) ? "ci" : "psa";
  }
  return "manual_qbr";
}

function resolveHistorySource(row: HistoryRow): ScheduledReportHistorySource {
  if (
    row.source &&
    KNOWN_SOURCES.has(row.source as ScheduledReportHistorySource)
  ) {
    return row.source as ScheduledReportHistorySource;
  }
  return deriveHistorySource(row);
}

function normalizeHistoryRow(raw: Record<string, unknown>): HistoryRow {
  return {
    id: String(raw.id ?? ""),
    sent_at: String(raw.sent_at ?? ""),
    email_to: typeof raw.email_to === "string" ? raw.email_to : null,
    tickets_processed:
      typeof raw.tickets_processed === "number" ? raw.tickets_processed : null,
    clients_covered: Array.isArray(raw.clients_covered)
      ? (raw.clients_covered as string[])
      : null,
    status: typeof raw.status === "string" ? raw.status : null,
    error_message: typeof raw.error_message === "string" ? raw.error_message : null,
    schedule_id: typeof raw.schedule_id === "string" ? raw.schedule_id : null,
    source: typeof raw.source === "string" ? raw.source : null,
    scheduled_reports:
      (raw.scheduled_reports as HistoryRow["scheduled_reports"]) ?? null,
  };
}

function mapHistoryRow(row: HistoryRow) {
  const joined = joinedSchedule(row.scheduled_reports);
  return {
    id: row.id,
    sent_at: row.sent_at,
    email_to: row.email_to,
    tickets_processed: row.tickets_processed,
    clients_covered: row.clients_covered,
    status: row.status,
    error_message: row.error_message,
    schedule_id: row.schedule_id,
    report_type:
      typeof joined?.report_type === "string" ? joined.report_type : null,
    ci_qbr_client_name:
      typeof joined?.ci_qbr_client_name === "string"
        ? joined.ci_qbr_client_name
        : null,
    source: resolveHistorySource(row),
  };
}

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const typeFilter = parseTypeFilter(new URL(request.url).searchParams.get("type"));

    let query = supabase
      .from("scheduled_report_history")
      .select(HISTORY_SELECT)
      .eq("user_id", user.id);

    if (typeFilter) {
      query = query.eq("source", typeFilter);
    }

    const { data, error } = await query
      .order("sent_at", { ascending: false })
      .limit(10);

    if (error) {
      if (error.message.includes("scheduled_report_history") || error.code === "42P01") {
        return NextResponse.json({ history: [] });
      }
      console.error("[scheduled-report-history GET]", error.message);
      return NextResponse.json(
        { error: "Could not load report history. Please try again." },
        { status: 500 },
      );
    }

    const history = (data ?? []).map((row) =>
      mapHistoryRow(normalizeHistoryRow(row as Record<string, unknown>)),
    );

    return NextResponse.json({ history });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
