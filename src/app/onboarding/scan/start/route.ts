import { after, NextResponse } from "next/server";

import {
  allowScanCreation,
  allowScanValidationAttempt,
  getClientIp,
  isValidScanEmail,
  issueScanSession,
  SCAN_SESSION_COOKIE,
  SCAN_RESULTS_TTL_MS,
  ScanValidationError,
  syncScanSession,
  validateScanCredentials,
} from "@/lib/psa/scan-session";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

function looksLikeHostedHaloUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const withoutScheme = value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^\/\//, "")
    .split("/")[0]
    ?.split(":")[0]
    .toLowerCase();
  return Boolean(
    withoutScheme &&
      (withoutScheme.endsWith(".usehalo.com") ||
        withoutScheme.endsWith(".halopsa.com")),
  );
}

function connectionFailureInputBranch(input: unknown): string {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return "malformed_credentials_payload";
  }
  const psaType = (input as { psaType?: unknown }).psaType;
  if (typeof psaType !== "string" || !psaType.trim()) {
    return "missing_psa_type";
  }
  return "unsupported_psa_type";
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_request" },
      { status: 400 },
    );
  }

  if (!allowScanValidationAttempt(ip)) {
    return NextResponse.json(
      { ok: false, error: "scan_validation_rate_limited" },
      { status: 429 },
    );
  }

  const credentialsInput =
    body && typeof body === "object" && "credentials" in body
      ? (body as { credentials?: unknown }).credentials
      : body;
  const email =
    body && typeof body === "object" && "email" in body
      ? (body as { email?: unknown }).email
      : null;
  if (!isValidScanEmail(email)) {
    return NextResponse.json(
      { ok: false, error: "invalid_email", message: "Enter a valid email address to receive your scan handoff." },
      { status: 400 },
    );
  }

  let stage = "validate_credentials";
  try {
    const credentials = await validateScanCredentials(credentialsInput);
    stage = "scan_creation_rate_limit";
    if (!allowScanCreation(ip)) {
      return NextResponse.json(
        { ok: false, error: "scan_creation_rate_limited" },
        { status: 429 },
      );
    }
    stage = "issue_scan_session";
    const session = await issueScanSession(credentials, ip, email);

    // `after` keeps the response fast while ensuring the sync is scheduled by Next.
    stage = "schedule_scan_sync";
    after(() => syncScanSession(session.id));

    const response = NextResponse.json({
      ok: true,
      sessionToken: session.token,
      status: "pending",
      expiresAt: session.expiresAt,
    });
    response.cookies.set({
      name: SCAN_SESSION_COOKIE,
      value: session.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      // The capability may read a completed, credential-free result for seven
      // days. Server-side expiry still blocks access to live credentials at
      // the original one-hour deadline.
      expires: new Date(Date.now() + SCAN_RESULTS_TTL_MS),
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "scan_capacity_reached") {
      return NextResponse.json(
        { ok: false, error: "scan_capacity_reached" },
        { status: 503 },
      );
    }
    if (error instanceof ScanValidationError) {
      if (error.code === "connection_validation_failed") {
        console.error("[scan/start] connection_validation_failed branch", {
          branch: connectionFailureInputBranch(credentialsInput),
          stage,
          errorType: error.name,
        });
      }
      const messages: Record<string, string> = {
        halo_missing_fields: "Enter the HaloPSA URL, Client ID, and Client Secret.",
        halo_auth_failed: looksLikeHostedHaloUrl(
          credentialsInput &&
            typeof credentialsInput === "object" &&
            "haloUrl" in credentialsInput
            ? (credentialsInput as { haloUrl?: unknown }).haloUrl
            : undefined,
        )
          ? "HaloPSA rejected the connection. This looks like a hosted Halo instance, so a tenant is probably required. For handoveruk.trial.usehalo.com, enter handoveruk."
          : "HaloPSA rejected the connection. Check the tenant and API application credentials.",
        connectwise_missing_fields:
          "Enter the ConnectWise site URL, company ID, public key, private key, and Client ID.",
        connectwise_auth_failed:
          "ConnectWise rejected these credentials. Check the site URL, API member keys, Client ID, and read permissions.",
        connection_validation_failed:
          "We could not validate this PSA connection.",
      };
      return NextResponse.json(
        { ok: false, error: error.code, message: messages[error.code] },
        { status: 400 },
      );
    }
    console.error("[scan/start] connection_validation_failed branch", {
      branch: "unexpected_error",
      stage,
      errorType: error instanceof Error ? error.name : "unknown",
      errorMessage: error instanceof Error ? error.message.slice(0, 200) : "unknown",
    });
    return NextResponse.json(
      { ok: false, error: "connection_validation_failed" },
      { status: 400 },
    );
  }
}
