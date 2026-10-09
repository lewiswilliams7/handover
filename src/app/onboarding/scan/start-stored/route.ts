import { after, NextResponse } from "next/server";

import { decrypt } from "@/lib/encryption";
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
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

type StoredHaloConnection = {
  halo_url: string;
  tenant: string | null;
  client_id: string;
  client_secret_encrypted: string;
  updated_at: string | null;
};

type StoredConnectWiseConnection = {
  site_url: string;
  company_id: string;
  public_key_encrypted: string;
  private_key_encrypted: string;
  client_id: string;
  updated_at: string | null;
};

type StartStoredBody = {
  psaType?: "halo" | "connectwise";
};

function storedConnectionError(message: string, status = 400): NextResponse {
  return NextResponse.json(
    { ok: false, error: "stored_connection_unavailable", message },
    { status },
  );
}

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, hasStoredConnection: false }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  const [{ data: halo, error: haloError }, { data: connectwise, error: connectwiseError }] =
    await Promise.all([
      admin.from("halo_connections").select("user_id").eq("user_id", user.id).maybeSingle(),
      admin.from("cw_connections").select("user_id").eq("user_id", user.id).maybeSingle(),
    ]);
  if (haloError && connectwiseError) {
    return NextResponse.json(
      { ok: false, hasStoredConnection: false },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    hasStoredConnection: Boolean(halo || connectwise),
    psaType: halo ? "halo" : connectwise ? "connectwise" : null,
  });
}

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const email = user.email?.trim().toLowerCase() ?? "";
  if (!isValidScanEmail(email)) {
    return storedConnectionError(
      "Your account does not have a valid email address for scan handoff.",
      400,
    );
  }

  let body: StartStoredBody = {};
  try {
    body = (await request.json()) as StartStoredBody;
  } catch {
    // An empty request body is valid.
  }

  const ip = getClientIp(request);
  if (!allowScanValidationAttempt(ip)) {
    return NextResponse.json(
      { ok: false, error: "scan_validation_rate_limited" },
      { status: 429 },
    );
  }

  const admin = createServiceRoleClient();
  const [{ data: halo, error: haloError }, { data: connectwise, error: connectwiseError }] =
    await Promise.all([
      admin
        .from("halo_connections")
        .select("halo_url, tenant, client_id, client_secret_encrypted, updated_at")
        .eq("user_id", user.id)
        .maybeSingle<StoredHaloConnection>(),
      admin
        .from("cw_connections")
        .select(
          "site_url, company_id, public_key_encrypted, private_key_encrypted, client_id, updated_at",
        )
        .eq("user_id", user.id)
        .maybeSingle<StoredConnectWiseConnection>(),
    ]);

  if (haloError && connectwiseError) {
    return storedConnectionError("We could not read your saved PSA connection.", 500);
  }

  const candidates = [
    halo ? { type: "halo" as const, updatedAt: halo.updated_at } : null,
    connectwise ? { type: "connectwise" as const, updatedAt: connectwise.updated_at } : null,
  ].filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null);
  const selectedType =
    body.psaType && candidates.some((candidate) => candidate.type === body.psaType)
      ? body.psaType
      : candidates.sort(
          (left, right) =>
            Date.parse(right.updatedAt ?? "") - Date.parse(left.updatedAt ?? ""),
        )[0]?.type;

  if (!selectedType) {
    return storedConnectionError(
      "No saved PSA connection was found. Connect your PSA before starting a scan.",
      404,
    );
  }

  let credentialsInput: unknown;
  try {
    if (selectedType === "halo" && halo) {
      credentialsInput = {
        psaType: "halo",
        haloUrl: halo.halo_url,
        tenant: halo.tenant,
        clientId: halo.client_id,
        clientSecret: decrypt(halo.client_secret_encrypted),
      };
    } else if (selectedType === "connectwise" && connectwise) {
      credentialsInput = {
        psaType: "connectwise",
        siteUrl: connectwise.site_url,
        companyId: connectwise.company_id,
        publicKey: decrypt(connectwise.public_key_encrypted),
        privateKey: decrypt(connectwise.private_key_encrypted),
        clientId: connectwise.client_id,
      };
    } else {
      return storedConnectionError("The saved PSA connection is no longer available.", 404);
    }
  } catch {
    return storedConnectionError(
      "We could not read your saved PSA credentials. Reconnect your PSA and try again.",
    );
  }

  try {
    const credentials = await validateScanCredentials(credentialsInput);
    if (!allowScanCreation(ip)) {
      return NextResponse.json(
        { ok: false, error: "scan_creation_rate_limited" },
        { status: 429 },
      );
    }

    const session = await issueScanSession(credentials, ip, email);
    after(() => syncScanSession(session.id));

    const response = NextResponse.json({
      ok: true,
      sessionToken: session.token,
      status: "pending",
      expiresAt: session.expiresAt,
      psaType: credentials.psaType,
    });
    response.cookies.set({
      name: SCAN_SESSION_COOKIE,
      value: session.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
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
      return storedConnectionError(
        "Your saved PSA connection could not be validated. Reconnect it and try again.",
      );
    }
    return storedConnectionError("We could not start a scan with your saved PSA connection.", 500);
  }
}
