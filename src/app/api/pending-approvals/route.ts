import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/server";

type JoinedSchedule = {
  name: string | null;
  report_type: string | null;
  ci_qbr_client_name: string | null;
};

type ApprovalRow = {
  id: string;
  schedule_id: string | null;
  source: string;
  status: string;
  payload: Record<string, unknown>;
  created_at: string;
  scheduled_reports: JoinedSchedule | JoinedSchedule[] | null;
};

const APPROVALS_SELECT = `
  id,
  schedule_id,
  source,
  status,
  payload,
  created_at,
  scheduled_reports (
    name,
    report_type,
    ci_qbr_client_name
  )
`;

function joinedSchedule(
  scheduledReports: ApprovalRow["scheduled_reports"],
): JoinedSchedule | null {
  if (!scheduledReports) return null;
  if (Array.isArray(scheduledReports)) {
    return scheduledReports[0] ?? null;
  }
  return scheduledReports;
}

function mapApprovalRow(row: ApprovalRow) {
  const joined = joinedSchedule(row.scheduled_reports);
  const payload = row.payload ?? {};
  const scheduleNameFromPayload =
    typeof payload.scheduleName === "string" ? payload.scheduleName.trim() : "";
  const clientsCovered = Array.isArray(payload.clientsCovered)
    ? payload.clientsCovered.filter((x): x is string => typeof x === "string")
    : [];
  const scheduleName =
    (typeof joined?.name === "string" && joined.name.trim()) ||
    scheduleNameFromPayload ||
    null;
  const clientLabel =
    clientsCovered.length > 0 ? clientsCovered.join(", ") : scheduleName;

  return {
    id: row.id,
    schedule_id: row.schedule_id,
    source: row.source,
    status: row.status,
    created_at: row.created_at,
    schedule_name: scheduleName,
    client_label: clientLabel,
    subject: typeof payload.subject === "string" ? payload.subject : null,
    text: typeof payload.text === "string" ? payload.text : null,
    html: typeof payload.html === "string" ? payload.html : null,
    payload,
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
      .from("pending_approvals")
      .select(APPROVALS_SELECT)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      if (error.message.includes("pending_approvals") || error.code === "42P01") {
        return NextResponse.json({ approvals: [] });
      }
      console.error("[pending-approvals GET]", error.message);
      return NextResponse.json(
        { error: "Could not load approvals. Please try again." },
        { status: 500 },
      );
    }

    const approvals = (data ?? []).map((row) =>
      mapApprovalRow(row as ApprovalRow),
    );

    return NextResponse.json({ approvals });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
