import { NextResponse } from "next/server";

import {
  findUsersDueForScheduledScan,
  runScheduledScanForUser,
  type ScheduledScanOutcome,
} from "@/lib/server/scheduled-scan";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Stop starting new scans after this long, so the last one can finish inside maxDuration. */
const TIME_BUDGET_MS = 200_000;
const MAX_USERS_PER_RUN = 10;

/**
 * Refreshes scans for customers whose latest scan is six or more days old.
 * Safe to call hourly: each call scans as many due customers as fit in the
 * time budget, oldest first, and does nothing when nobody is due.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const admin = createServiceRoleClient();
  const due = await findUsersDueForScheduledScan(admin, MAX_USERS_PER_RUN);
  const outcomes: ScheduledScanOutcome[] = [];

  for (const userId of due) {
    if (Date.now() - started > TIME_BUDGET_MS) break;
    try {
      outcomes.push(await runScheduledScanForUser(admin, userId));
    } catch (error) {
      console.error("[cron/weekly-scan] user failed", userId, error);
      outcomes.push({ userId, status: "failed", reason: "unexpected_error" });
    }
  }

  const summary = {
    due: due.length,
    attempted: outcomes.length,
    scanned: outcomes.filter((o) => o.status === "scanned").length,
    skipped: outcomes.filter((o) => o.status === "skipped").length,
    failed: outcomes.filter((o) => o.status === "failed").length,
    durationMs: Date.now() - started,
  };
  console.log("[cron/weekly-scan]", JSON.stringify(summary));
  return NextResponse.json({
    ok: true,
    ...summary,
    outcomes: outcomes.map((o) =>
      o.status === "scanned" ? { status: o.status } : { status: o.status, reason: o.reason },
    ),
  });
}
