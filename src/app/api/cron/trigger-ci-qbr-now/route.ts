import { NextResponse } from "next/server";

import { processCiQbrSchedule, type CiQbrScheduleRow } from "@/lib/server/process-ci-qbr-schedule";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

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

  if (!scheduleId) {
    return NextResponse.json({ error: "scheduleId required" }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("scheduled_reports")
    .select(
      "id, user_id, name, ci_qbr_client_name, email_to, email_cc, date_range, enabled, brand_name, hold_for_review",
    )
    .eq("id", scheduleId)
    .eq("user_id", user.id)
    .eq("report_type", "ci_qbr")
    .maybeSingle();

  if (error) {
    console.error("[cron/trigger-ci-qbr-now]", error.message);
    return NextResponse.json(
      { error: "Could not trigger CI QBR schedule. Please try again." },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  const result = await processCiQbrSchedule(admin, data as CiQbrScheduleRow);
  return NextResponse.json({ processed: 1, results: [result] });
}
