import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { insertPendingVerificationAndSendEmail } from "@/lib/auth/custom-email-verification";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  scanResultsForViewer,
  userCanViewScanDetails,
} from "@/lib/scan-entitlement";
import { compareScanFindings } from "@/lib/psa/scan-comparison";
import {
  claimScanSession,
  extractScanToken,
  getScanEmailForClaim,
  getPreviousClaimedScanForUser,
  SCAN_SESSION_COOKIE,
} from "@/lib/psa/scan-session";
import { syncScanFindingLedger } from "@/lib/psa/scan-finding-ledger";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function markClaimRedirectPending(
  admin: ReturnType<typeof createServiceRoleClient>,
  userId: string,
): Promise<void> {
  const { error } = await admin
    .from("profiles")
    .update({ scan_claim_redirect_pending: true })
    .eq("id", userId);
  if (error) {
    console.error("[scan/claim] could not mark first-sign-in redirect", {
      userId,
      error: error.message,
    });
  }
}

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let body: { sessionToken?: string; password?: string } = {};
  try {
    body = (await request.json()) as { sessionToken?: string; password?: string };
  } catch {
    // The HttpOnly cookie is also accepted, so an empty body is valid.
  }

  const cookieStore = await cookies();
  const token = extractScanToken(
    request,
    body.sessionToken?.trim() || cookieStore.get(SCAN_SESSION_COOKIE)?.value,
  );
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "scan_session_unavailable" },
      { status: 404 },
    );
  }

  if (!user) {
    const password = body.password ?? "";
    if (password.length < 8) {
      return NextResponse.json(
        { ok: false, error: "invalid_password", message: "Choose a password with at least 8 characters." },
        { status: 400 },
      );
    }
    const email = await getScanEmailForClaim(token);
    if (!email) {
      return NextResponse.json(
        { ok: false, error: "scan_session_unavailable" },
        { status: 404 },
      );
    }

    let admin: ReturnType<typeof createServiceRoleClient>;
    try {
      admin = createServiceRoleClient();
    } catch {
      return NextResponse.json(
        { ok: false, error: "account_creation_failed" },
        { status: 500 },
      );
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { scan_verification_pending: true },
    });
    if (createError || !created.user?.id) {
      return NextResponse.json(
        {
          ok: false,
          error: createError?.message?.toLowerCase().includes("already")
            ? "account_exists"
            : "account_creation_failed",
          message: createError?.message?.toLowerCase().includes("already")
            ? "An account already exists for this email. Sign in to claim the scan."
            : "We could not create the account. Please try again.",
        },
        { status: createError?.message?.toLowerCase().includes("already") ? 409 : 500 },
      );
    }

    try {
      const result = await claimScanSession(token, created.user.id);
      await markClaimRedirectPending(admin, created.user.id);
      const verification = await insertPendingVerificationAndSendEmail(
        admin,
        created.user.id,
        email,
      );
      const response = NextResponse.json({
        ok: true,
        accountCreated: true,
        sessionId: result.sessionId,
        createdAt: result.createdAt,
        requiresEmailVerification: true,
        emailVerificationSent: verification.ok,
        status: result.status,
        syncStatus: result.syncStatus,
        connectionTransferred: result.connectionTransferred,
        errorCode: result.errorCode,
        detailsEntitled: false,
        results: scanResultsForViewer(result.results, false),
      });
      response.cookies.delete(SCAN_SESSION_COOKIE);
      return response;
    } catch {
      await admin.auth.admin.deleteUser(created.user.id);
      return NextResponse.json(
        { ok: false, error: "scan_claim_failed", message: "We could not claim this scan. Please try again." },
        { status: 500 },
      );
    }
  }

  try {
    const result = await claimScanSession(token, user.id);
    const admin = createServiceRoleClient();
    await markClaimRedirectPending(admin, user.id);
    const entitled = await userCanViewScanDetails(user.id);
    const previousScan = entitled
      ? await getPreviousClaimedScanForUser(user.id, result.sessionId)
      : null;
    const comparison =
      entitled && result.results && previousScan?.results
        ? compareScanFindings(
            result.results,
            previousScan.results,
            result.createdAt,
            previousScan.createdAt,
          )
        : null;
    if (entitled && result.results) {
      if (previousScan?.results) {
        await syncScanFindingLedger({
          userId: user.id,
          sessionId: previousScan.sessionId,
          createdAt: previousScan.createdAt,
          results: previousScan.results,
        });
      }
      await syncScanFindingLedger({
        userId: user.id,
        sessionId: result.sessionId,
        createdAt: result.createdAt,
        results: result.results,
        previousSessionId: previousScan?.sessionId,
        comparison,
      });
    }
    const response = NextResponse.json({
      ok: true,
      sessionId: result.sessionId,
      createdAt: result.createdAt,
      status: result.status,
      syncStatus: result.syncStatus,
      connectionTransferred: result.connectionTransferred,
      errorCode: result.errorCode,
      detailsEntitled: entitled,
      results: scanResultsForViewer(result.results, entitled),
      comparison: entitled ? comparison : null,
    });
    response.cookies.delete(SCAN_SESSION_COOKIE);
    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "scan_session_unavailable" },
      { status: 404 },
    );
  }
}
