import { NextResponse } from "next/server";

import {
  cleanupExpiredScanSessions,
  processPendingScanSessions,
} from "@/lib/psa/scan-session";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET ?? ""}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const processed = await processPendingScanSessions(3);
    const deleted = await cleanupExpiredScanSessions();
    return NextResponse.json({ ok: true, processed, deleted });
  } catch {
    return NextResponse.json(
      { ok: false, error: "scan_cleanup_failed" },
      { status: 500 },
    );
  }
}
