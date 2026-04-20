import { NextResponse } from "next/server";

import { GET as runScheduledReportsCron } from "../scheduled-reports/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Debug: runs the same handler as GET /api/cron/scheduled-reports with a Bearer CRON_SECRET.
 * In production, set CRON_MANUAL_TEST_KEY and call: /api/cron/test-scheduled-reports?key=YOUR_KEY
 */
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 500 });
  }

  if (process.env.NODE_ENV === "production") {
    const expected = process.env.CRON_MANUAL_TEST_KEY?.trim();
    if (!expected) {
      return NextResponse.json(
        { error: "Set CRON_MANUAL_TEST_KEY to use this endpoint in production." },
        { status: 403 },
      );
    }
    const key = new URL(request.url).searchParams.get("key");
    if (key !== expected) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const forwarded = new Request(request.url, {
    method: "GET",
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  return runScheduledReportsCron(forwarded);
}
