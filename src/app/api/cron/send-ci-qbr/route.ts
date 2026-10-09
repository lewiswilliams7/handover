import { NextResponse } from "next/server";

import {
  processCiQbrSchedule,
  type CiQbrScheduleRow,
} from "@/lib/server/process-ci-qbr-schedule";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET ?? ""}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createServiceRoleClient();
  const now = new Date();

  const { data: schedulesRaw } = await adminClient
    .from("scheduled_reports")
    .select(
      "id, user_id, name, ci_qbr_client_name, email_to, email_cc, date_range, enabled, next_run_at, brand_name, hold_for_review",
    )
    .eq("enabled", true)
    .eq("report_type", "ci_qbr")
    .lte("next_run_at", now.toISOString());

  const schedules = (schedulesRaw ?? []) as CiQbrScheduleRow[];

  let sent = 0;

  for (const schedule of schedules) {
    const result = await processCiQbrSchedule(adminClient, schedule, now);
    if (result.held) continue;
    if (result.success) sent++;
  }

  return NextResponse.json({ sent });
}
