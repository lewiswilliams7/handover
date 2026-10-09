import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  scanResultsForViewer,
  userCanViewScanDetails,
} from "@/lib/scan-entitlement";
import {
  extractScanToken,
  getClaimedScanForUser,
  getPublicScanStatus,
  SCAN_SESSION_COOKIE,
} from "@/lib/psa/scan-session";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function claimedScanResponse(userId: string): Promise<NextResponse | null> {
  const claimed = await getClaimedScanForUser(userId);
  if (!claimed) return null;
  const entitled = await userCanViewScanDetails(userId);
  return NextResponse.json(
    {
      ok: true,
      status: "claimed",
      progress: claimed.progress ?? { stage: "claimed", completed: 3, total: 3 },
      detailsEntitled: entitled,
      results: scanResultsForViewer(claimed.results, entitled),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const claimedOnly = new URL(request.url).searchParams.get("claimed") === "1";
  if (claimedOnly) {
    const response = user ? await claimedScanResponse(user.id) : null;
    return response ?? NextResponse.json(
      { ok: false, error: "scan_session_unavailable" },
      { status: 404 },
    );
  }

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(SCAN_SESSION_COOKIE)?.value;
  const token = extractScanToken(request, cookieToken);
  if (!token) {
    const response = user ? await claimedScanResponse(user.id) : null;
    if (response) return response;
    return NextResponse.json({ ok: false, error: "scan_session_unavailable" }, { status: 404 });
  }

  const result = await getPublicScanStatus(token);
  if (!result.session || !result.status) {
    return NextResponse.json({ ok: false, error: "scan_session_unavailable" }, { status: 404 });
  }

  if (result.session.status === "claimed") {
    if (!user || user.id !== result.session.claimed_by_user_id) {
      return NextResponse.json(
        { ok: false, error: "scan_session_unavailable" },
        { status: 404 },
      );
    }
    const entitled = await userCanViewScanDetails(user.id);
    return NextResponse.json(
      {
        ok: true,
        status: result.status.status,
        progress: result.status.progress,
        detailsEntitled: entitled,
        results: scanResultsForViewer(result.session.results_json, entitled),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { ok: true, ...result.status },
    { headers: { "Cache-Control": "no-store" } },
  );
}
