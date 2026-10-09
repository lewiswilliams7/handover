import { createHash, randomBytes } from "crypto";

import { decrypt, encrypt } from "@/lib/encryption";
import {
  getAllHaloClients,
  getHaloTickets,
  getHaloToken,
  getHaloTicketStatuses,
  type HaloTicket,
} from "@/lib/halo";
import { invalidateHaloTokenCache } from "@/lib/halo-token-cache";
import {
  getCwAgreements,
  getHaloContracts,
  getHaloRecurringInvoices,
  type CommercialFieldMappingContext,
  type NormalisedContractRecord,
} from "@/lib/psa/contracts";
import {
  getHaloCommercialData,
  type NormalisedQuotation,
  type NormalisedSalesOrder,
} from "@/lib/psa/commercial";
import {
  normalizeConnectWiseSiteUrl,
  fetchAllCWCompanies,
  testCWConnection,
  type ConnectWiseConnection,
} from "@/lib/psa/connectwise";
import {
  aggregateByClientPeriod,
  type ScanProjectInput,
  type ScanTicketInput,
} from "@/lib/psa/scan-aggregate";
import { buildChurnReplay, type ChurnReplayResult } from "@/lib/psa/churn-replay";
import type { ScanEvidenceSource } from "@/lib/psa/scan-evidence";
import {
  FieldProvenanceAccumulator,
  type ScanFieldMappingContext,
} from "@/lib/psa/halo-field-provenance";
import {
  buildScanFindings,
  type ScanFinding,
} from "@/lib/psa/scan-findings";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const SCAN_SESSION_COOKIE = "msp_scan_session";
export const SCAN_SESSION_TTL_MS = 60 * 60 * 1000;
export const SCAN_RESULTS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const PRODUCTION_MAX_VALIDATION_ATTEMPTS_PER_IP_WINDOW = 20;
const DEVELOPMENT_DEFAULT_VALIDATION_ATTEMPTS_PER_IP_WINDOW = 1_000;
const PRODUCTION_MAX_SCAN_CREATIONS_PER_IP_WINDOW = 5;
const DEVELOPMENT_DEFAULT_SCAN_CREATIONS_PER_IP_WINDOW = 5;
const START_RATE_WINDOW_MS = 60 * 60 * 1000;
const startRateBuckets = new Map<string, { count: number; resetAt: number }>();

function configuredRateLimit(
  envName: string,
  productionDefault: number,
  developmentDefault: number,
): number {
  const configured = Number.parseInt(process.env[envName] ?? "", 10);
  const requested =
    Number.isFinite(configured) && configured > 0
      ? configured
      : process.env.NODE_ENV === "production"
        ? productionDefault
        : developmentDefault;

  // Never allow a relaxed value to reach production accidentally.
  return process.env.NODE_ENV === "production"
    ? Math.min(requested, productionDefault)
    : requested;
}

function isResultsExpired(resultsExpiresAt: string | null): boolean {
  return (
    !resultsExpiresAt ||
    Number.isNaN(Date.parse(resultsExpiresAt)) ||
    Date.parse(resultsExpiresAt) <= Date.now()
  );
}

type SessionStatus =
  | "pending"
  | "syncing"
  | "complete"
  | "failed"
  | "claimed";

export type HaloScanCredentials = {
  psaType: "halo";
  haloUrl: string;
  tenant: string | null;
  clientId: string;
  clientSecret: string;
};

export type ConnectWiseScanCredentials = {
  psaType: "connectwise";
  siteUrl: string;
  companyId: string;
  publicKey: string;
  privateKey: string;
  clientId: string;
};

export type ScanSessionCredentials =
  | HaloScanCredentials
  | ConnectWiseScanCredentials;

export type PublicScanStatus = {
  status: SessionStatus;
  scanOutcome:
    | "findings"
    | "no_findings"
    | "metrics_suppressed"
    | "no_clients"
    | null;
  progress: {
    stage: string;
    completed: number;
    total: number | null;
  };
  clientsAnalysed: number | null;
  clientsWithFindings: number | null;
  findingsCount: Record<string, number> | null;
  checksRun: number | null;
  ticketCount: number | null;
  responseTimestampCoveragePct: number | null;
  closeTimestampCoveragePct: number | null;
  clientsWithoutOwner: number | null;
  activeContractsWithoutActivity: number | null;
  clientsInsufficientData: number | null;
  expiringContractCount: number | null;
  expiringContractValue: number | null;
  exposureValue: number | null;
  revenueConcentrationPct: number | null;
  revenueConcentrationSuppressedReason: string | null;
  findingPreviews: ScanFindingPreview[];
  exposureAvailability:
    | "available_value"
    | "available_zero"
    | "available_no_value"
    | "unavailable"
    | "not_calculated"
    | null;
  errorCode: string | null;
};

export type StoredScanResults = {
  byClient: Record<string, unknown>;
  findings: ScanFinding[];
  insufficientData: unknown[];
  portfolio: {
    clientsAnalysed: number;
    clientsWithFindings: number;
    findingsByType: Record<string, number>;
    checksRun: number;
    ticketCount: number;
    responseTimestampCoveragePct: number | null;
    closeTimestampCoveragePct: number | null;
    clientsWithoutOwner: number | null;
    activeContractsWithoutActivity: number | null;
    clientsInsufficientData: number;
    expiringContractCount: number;
    expiringContractValue: number | null;
    exposureValue: number | null;
    exposureCoverage: number | null;
    revenueConcentrationPct: number | null;
    revenueConcentrationSuppressedReason: string | null;
  };
  fieldMapping: ScanFieldMappingContext | null;
  commercialFieldMapping?: CommercialFieldMappingContext | null;
  contractSummary: unknown;
  exposureAvailability:
    | "available_value"
    | "available_zero"
    | "available_no_value"
    | "unavailable"
    | "not_calculated";
  scanOutcome:
    | "findings"
    | "no_findings"
    | "metrics_suppressed"
    | "no_clients";
  suppressedMetricCount: number;
  clientNames: Record<string, string>;
  /** PSA source and normalized instance URL used to build entitled record links. */
  psaType?: ScanEvidenceSource;
  instanceUrl?: string | null;
  /** True only when project findings were calculated from identified parent projects. */
  projectOverrunReliable?: boolean;
  /** Churn Replay™ backtest over clients lost in the scan window. Absent on older scans. */
  churnReplay?: ChurnReplayResult | null;
};

export type ScanFindingPreview = {
  type: string;
  monthlyValue: number | null;
  drivers: Array<{
    value: number;
    baseline: number;
    unit: string;
  }>;
};

/** Return only non-identifying finding evidence for the anonymous preview. */
export function scanFindingPreviewsForViewer(
  results: StoredScanResults | null,
): ScanFindingPreview[] {
  if (!results || !Array.isArray(results.findings)) return [];
  return results.findings.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const finding = raw as Record<string, unknown>;
    if (typeof finding.type !== "string" || !Array.isArray(finding.drivers)) return [];
    const drivers = finding.drivers.flatMap((driver) => {
      if (!driver || typeof driver !== "object") return [];
      const value = (driver as Record<string, unknown>).value;
      const baseline = (driver as Record<string, unknown>).baseline;
      const unit = (driver as Record<string, unknown>).unit;
      return typeof value === "number" &&
        Number.isFinite(value) &&
        typeof baseline === "number" &&
        Number.isFinite(baseline) &&
        typeof unit === "string"
        ? [{ value, baseline, unit }]
        : [];
    });
    return [{
      type: finding.type,
      monthlyValue:
        typeof finding.monthlyValue === "number" && Number.isFinite(finding.monthlyValue)
          ? finding.monthlyValue
          : null,
      drivers: drivers.slice(0, 3),
    }];
  });
}

export function isValidScanEmail(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  );
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function createScanCapability(): {
  token: string;
  tokenHash: string;
} {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: sha256(token) };
}

export function hashScanCapability(token: string): string {
  return sha256(token);
}

export function ipFingerprint(ip: string): string {
  return sha256(`scan-ip:${ip}`);
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function allowRateLimitedRequest(
  ip: string,
  bucketName: string,
  maxRequests: number,
): boolean {
  const now = Date.now();
  const key = `${bucketName}:${ip}`;
  const bucket = startRateBuckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    startRateBuckets.set(key, {
      count: 1,
      resetAt: now + START_RATE_WINDOW_MS,
    });
    return true;
  }
  if (bucket.count >= maxRequests) return false;
  bucket.count += 1;
  return true;
}

export function allowScanValidationAttempt(ip: string): boolean {
  return allowRateLimitedRequest(
    ip,
    "validation",
    configuredRateLimit(
      "SCAN_VALIDATION_ATTEMPTS_PER_IP_WINDOW",
      PRODUCTION_MAX_VALIDATION_ATTEMPTS_PER_IP_WINDOW,
      DEVELOPMENT_DEFAULT_VALIDATION_ATTEMPTS_PER_IP_WINDOW,
    ),
  );
}

export function allowScanCreation(ip: string): boolean {
  return allowRateLimitedRequest(
    ip,
    "creation",
    configuredRateLimit(
      "SCAN_CREATIONS_PER_IP_WINDOW",
      PRODUCTION_MAX_SCAN_CREATIONS_PER_IP_WINDOW,
      DEVELOPMENT_DEFAULT_SCAN_CREATIONS_PER_IP_WINDOW,
    ),
  );
}

/** Backwards-compatible alias for callers that gate scan creation. */
export const allowScanStart = allowScanCreation;

/** TEMPORARY/LOCAL TESTING: production callers cannot clear the limiter. */
export function resetScanStartRateLimit(): void {
  if (process.env.NODE_ENV === "production") return;
  startRateBuckets.clear();
}

export function extractScanToken(
  request: Request,
  cookieToken?: string | null,
): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice("Bearer ".length).trim();
    if (token) return token;
  }
  const headerToken = request.headers.get("x-scan-session-token")?.trim();
  return headerToken || cookieToken?.trim() || null;
}

export function sanitiseScanError(error: unknown): string {
  if (error instanceof ScanSyncError) return error.code;
  if (
    error instanceof Error &&
    /\b(401|403)\b/.test(error.message)
  ) {
    return "upstream_forbidden";
  }
  if (error instanceof Error && /\b429\b/.test(error.message)) {
    return "upstream_rate_limited";
  }
  if (error && typeof error === "object" && "status" in error) {
    const status = Number((error as { status?: unknown }).status);
    if (status === 401 || status === 403) return "upstream_forbidden";
    if (status === 429) return "upstream_rate_limited";
  }
  return "sync_failed";
}

export class ScanSyncError extends Error {
  readonly code:
    | "session_expired"
    | "upstream_forbidden"
    | "upstream_rate_limited"
    | "no_clients"
    | "sync_failed";

  constructor(
    code: ScanSyncError["code"],
    message = code,
  ) {
    super(message);
    this.name = "ScanSyncError";
    this.code = code;
  }
}

function isExpired(expiresAt: string): boolean {
  return Date.parse(expiresAt) <= Date.now();
}

function genericConnectionError(): Error {
  return new ScanValidationError("connection_validation_failed");
}

function normalizeSubmittedHaloUrl(value: string): string {
  const withoutScheme = value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^\/\//, "")
    .replace(/\/+$/, "");
  return `https://${withoutScheme}`;
}

function redactHaloAuthResponse(
  body: string,
  values: Array<string | null | undefined>,
): string {
  let safe = body;
  for (const value of values) {
    if (value) safe = safe.split(value).join("[REDACTED]");
  }
  return safe.slice(0, 2_000);
}

function safeHaloUrlForLog(value: string): string {
  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    return url.toString().replace(/\/+$/, "");
  } catch {
    return "[invalid-url]";
  }
}

export class ScanValidationError extends Error {
  readonly code:
    | "halo_missing_fields"
    | "halo_url_invalid"
    | "halo_auth_failed"
    | "connectwise_missing_fields"
    | "connectwise_auth_failed"
    | "connection_validation_failed";

  constructor(code: ScanValidationError["code"]) {
    super(code);
    this.name = "ScanValidationError";
    this.code = code;
  }
}

export async function validateScanCredentials(
  input: unknown,
): Promise<ScanSessionCredentials> {
  if (!input || typeof input !== "object") throw genericConnectionError();
  const value = input as Record<string, unknown>;

  if (value.psaType === "halo") {
    if (
      typeof value.haloUrl !== "string" ||
      typeof value.clientId !== "string" ||
      typeof value.clientSecret !== "string"
    ) {
      throw new ScanValidationError("halo_missing_fields");
    }
    const haloUrl = normalizeSubmittedHaloUrl(value.haloUrl);
    const clientId = value.clientId.trim();
    const clientSecret = value.clientSecret.trim();
    const tenant =
      typeof value.tenant === "string" && value.tenant.trim()
        ? value.tenant.trim()
        : null;
    if (!haloUrl || !clientId || !clientSecret) {
      throw new ScanValidationError("halo_missing_fields");
    }
    let authFailureLogged = false;
    try {
      // Validation must not be satisfied by a token cached for an older secret.
      invalidateHaloTokenCache({
        haloUrl,
        tenant,
        clientId,
        clientSecret,
      });
      await getHaloToken({
        haloUrl,
        tenant,
        clientId,
        clientSecret,
      }, {
        onAuthFailure: ({ status, body }) => {
          authFailureLogged = true;
          console.error("[scan/start] Halo validation failure", {
            normalizedUrl: safeHaloUrlForLog(haloUrl),
            tenantPresent: tenant != null,
            tenantLength: tenant?.length ?? 0,
            clientIdLength: clientId.length,
            clientSecretLength: clientSecret.length,
            httpStatus: status,
            rawResponseBody: redactHaloAuthResponse(body, [
              clientId,
              clientSecret,
              tenant,
            ]),
          });
        },
      });
    } catch (error) {
      if (!authFailureLogged) {
        console.error("[scan/start] Halo validation request failure", {
          normalizedUrl: safeHaloUrlForLog(haloUrl),
          tenantPresent: tenant != null,
          tenantLength: tenant?.length ?? 0,
          clientIdLength: clientId.length,
          clientSecretLength: clientSecret.length,
          httpStatus: null,
          rawResponseBody: null,
          errorType: error instanceof Error ? error.name : "unknown",
        });
      }
      throw new ScanValidationError("halo_auth_failed");
    }
    return {
      psaType: "halo",
      haloUrl,
      tenant,
      clientId,
      clientSecret,
    };
  }

  if (value.psaType === "connectwise") {
    if (
      typeof value.siteUrl !== "string" ||
      typeof value.companyId !== "string" ||
      typeof value.publicKey !== "string" ||
      typeof value.privateKey !== "string" ||
      typeof value.clientId !== "string"
    ) {
      throw new ScanValidationError("connectwise_missing_fields");
    }
    const connection: ConnectWiseConnection = {
      siteUrl: normalizeConnectWiseSiteUrl(value.siteUrl),
      companyId: value.companyId.trim(),
      publicKey: value.publicKey.trim(),
      privateKey: value.privateKey.trim(),
      clientId: value.clientId.trim(),
    };
    if (
      !connection.siteUrl ||
      !connection.companyId ||
      !connection.publicKey ||
      !connection.privateKey ||
      !connection.clientId
    ) {
      throw new ScanValidationError("connectwise_missing_fields");
    }
    const result = await testCWConnection(connection);
    if (!result.ok) {
      throw new ScanValidationError("connectwise_auth_failed");
    }
    return { psaType: "connectwise", ...connection };
  }

  throw genericConnectionError();
}

export async function issueScanSession(
  credentials: ScanSessionCredentials,
  ip: string,
  email: string,
): Promise<{ id: string; token: string; expiresAt: string }> {
  const capability = createScanCapability();
  const expiresAt = new Date(Date.now() + SCAN_SESSION_TTL_MS).toISOString();
  const encrypted = encrypt(JSON.stringify(credentials));
  const admin = createServiceRoleClient();
  const { data, error } = await admin.rpc("issue_scan_session", {
    p_psa_type: credentials.psaType,
    p_session_token_hash: capability.tokenHash,
    p_ip_fingerprint: ipFingerprint(ip),
    p_email: email.trim().toLowerCase(),
    p_credentials_encrypted: encrypted,
    p_expires_at: expiresAt,
  });
  if (error || typeof data !== "string") {
    console.error("[scan/start] issue_scan_session persistence failure", {
      errorCode: error?.code ?? null,
      errorMessage: error?.message?.slice(0, 300) ?? null,
      returnedUuid: typeof data === "string",
    });
    if (error?.message?.includes("scan_capacity_reached")) {
      throw new Error("scan_capacity_reached");
    }
    throw new Error("Could not create scan session.");
  }
  return { id: data, token: capability.token, expiresAt };
}

async function getSessionByToken(token: string) {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("scan_sessions")
    .select(
      "id,created_at,expires_at,results_expires_at,psa_type,session_token_hash,email,credentials_encrypted,status,progress_json,results_json,claimed_by_user_id,error_reason",
    )
    .eq("session_token_hash", hashScanCapability(token))
    .maybeSingle();
  if (error || !data) return null;
  return data as {
    id: string;
    created_at: string;
    expires_at: string;
    results_expires_at: string | null;
    psa_type: "halo" | "connectwise";
    session_token_hash: string;
    email: string | null;
    credentials_encrypted: string | null;
    status: SessionStatus;
    progress_json: { stage?: string; completed?: number; total?: number | null } | null;
    results_json: StoredScanResults | null;
    claimed_by_user_id: string | null;
    error_reason: string | null;
  };
}

export type ClaimedScanForUser = {
  sessionId: string;
  createdAt: string;
  results: StoredScanResults | null;
  progress: { stage?: string; completed?: number; total?: number | null } | null;
};

type ClaimedScanRow = {
  id: string;
  created_at: string;
  results_json: StoredScanResults | null;
  progress_json: { stage?: string; completed?: number; total?: number | null } | null;
};

function claimedScanFromRow(row: ClaimedScanRow): ClaimedScanForUser {
  return {
    sessionId: row.id,
    createdAt: row.created_at,
    results: row.results_json,
    progress: row.progress_json,
  };
}

export async function getClaimedScanForUser(userId: string): Promise<ClaimedScanForUser | null> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("scan_sessions")
    .select("id,created_at,results_json,progress_json,results_expires_at")
    .eq("claimed_by_user_id", userId)
    .eq("status", "claimed")
    .gt("results_expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return claimedScanFromRow(data as ClaimedScanRow);
}

export async function getPreviousClaimedScanForUser(
  userId: string,
  currentSessionId: string,
): Promise<ClaimedScanForUser | null> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("scan_sessions")
    .select("id,created_at,results_json,progress_json,results_expires_at")
    .eq("claimed_by_user_id", userId)
    .eq("status", "claimed")
    .neq("id", currentSessionId)
    .gt("results_expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return claimedScanFromRow(data as ClaimedScanRow);
}

export async function getPublicScanStatus(
  token: string,
): Promise<{
  session: Awaited<ReturnType<typeof getSessionByToken>>;
  status: PublicScanStatus | null;
}> {
  const session = await getSessionByToken(token);
  if (!session) return { session: null, status: null };
  if (
    (session.status === "complete" || session.status === "claimed") &&
    isResultsExpired(session.results_expires_at)
  ) {
    return { session: null, status: null };
  }
  if (
    session.status !== "complete" &&
    session.status !== "claimed" &&
    isExpired(session.expires_at)
  ) {
    return {
      session,
      status: {
        status: "failed",
        scanOutcome: null,
        progress: { stage: "expired", completed: 0, total: null },
        clientsAnalysed: null,
        clientsWithFindings: null,
        findingsCount: null,
        checksRun: null,
        ticketCount: null,
        responseTimestampCoveragePct: null,
        closeTimestampCoveragePct: null,
        clientsWithoutOwner: null,
        activeContractsWithoutActivity: null,
        clientsInsufficientData: null,
        expiringContractCount: null,
        expiringContractValue: null,
        exposureValue: null,
        revenueConcentrationPct: null,
        revenueConcentrationSuppressedReason: null,
        findingPreviews: [],
        exposureAvailability: null,
        errorCode: "session_expired",
      },
    };
  }

  const results = session.results_json;
  const portfolio = results?.portfolio as
    | {
        clientsAnalysed?: number;
        clientsWithFindings?: number;
        findingsByType?: Record<string, number>;
        checksRun?: number;
        ticketCount?: number;
        responseTimestampCoveragePct?: number | null;
        closeTimestampCoveragePct?: number | null;
        clientsWithoutOwner?: number | null;
        activeContractsWithoutActivity?: number | null;
        clientsInsufficientData?: number;
        expiringContractCount?: number;
        expiringContractValue?: number | null;
        exposureValue?: number | null;
        revenueConcentrationPct?: number | null;
        revenueConcentrationSuppressedReason?: string | null;
      }
    | undefined;
  return {
    session,
    status: {
      status: session.status,
      scanOutcome: results?.scanOutcome ?? null,
      progress: {
        stage: session.progress_json?.stage ?? session.status,
        completed: session.progress_json?.completed ?? 0,
        total: session.progress_json?.total ?? null,
      },
      clientsAnalysed: portfolio?.clientsAnalysed ?? null,
      clientsWithFindings: portfolio?.clientsWithFindings ?? null,
      findingsCount: portfolio?.findingsByType ?? null,
      checksRun: portfolio?.checksRun ?? null,
      ticketCount: portfolio?.ticketCount ?? null,
      responseTimestampCoveragePct: portfolio?.responseTimestampCoveragePct ?? null,
      closeTimestampCoveragePct: portfolio?.closeTimestampCoveragePct ?? null,
      clientsWithoutOwner: portfolio?.clientsWithoutOwner ?? null,
      activeContractsWithoutActivity: portfolio?.activeContractsWithoutActivity ?? null,
      clientsInsufficientData: portfolio?.clientsInsufficientData ?? null,
      expiringContractCount: portfolio?.expiringContractCount ?? null,
      expiringContractValue: portfolio?.expiringContractValue ?? null,
      exposureValue: portfolio?.exposureValue ?? null,
      revenueConcentrationPct: portfolio?.revenueConcentrationPct ?? null,
      revenueConcentrationSuppressedReason:
        portfolio?.revenueConcentrationSuppressedReason ?? null,
      findingPreviews: scanFindingPreviewsForViewer(results),
      exposureAvailability: results?.exposureAvailability ?? null,
      errorCode: session.error_reason,
    },
  };
}

export async function getScanEmailForClaim(token: string): Promise<string | null> {
  const session = await getSessionByToken(token);
  if (!session || isExpired(session.expires_at) || session.status === "claimed") return null;
  return session.email?.trim().toLowerCase() || null;
}

async function updateSession(
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const admin = createServiceRoleClient();
  await admin.from("scan_sessions").update(patch).eq("id", id);
}

function statusNameToOpen(statusName: string): boolean | null {
  const value = statusName.trim().toLowerCase();
  if (
    ["closed", "resolved", "complete", "completed", "cancelled", "canceled"].some((term) =>
      value.includes(term),
    )
  ) {
    return false;
  }
  if (["open", "new", "active", "in progress", "pending", "reopened"].some((term) =>
    value.includes(term),
  )) {
    return true;
  }
  return null;
}

function haloTicketToScanInput(
  ticket: HaloTicket,
  statusNames: Map<number, string>,
): ScanTicketInput {
  const attrs = ticket.scanAttributes;
  const statusOpen =
    ticket.status_id != null
      ? statusNameToOpen(statusNames.get(ticket.status_id) ?? "")
      : null;
  return {
    ticketId: ticket.id,
    clientId: ticket.clientId ?? 0,
    dateEntered: ticket.dateoccurred,
    dateResponded: ticket.dateresponded ?? null,
    dateClosed: ticket.dateclosed ?? null,
    targetDate: ticket.targetdate ?? null,
    priority: attrs?.priority ?? null,
    statusOpen:
      statusOpen ??
      attrs?.statusOpen ??
      (attrs?.hasBeenClosed == null ? null : !attrs.hasBeenClosed),
    owner: attrs?.owner ?? null,
    requester: attrs?.requester ?? null,
    ticketType: attrs?.ticketType ?? null,
    slaDueDate: attrs?.slaDueDate ?? null,
  };
}

function connectWiseNestedName(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (!value || typeof value !== "object") return null;
  const object = value as Record<string, unknown>;
  for (const key of ["name", "label", "value", "id"]) {
    const nested = object[key];
    if (typeof nested === "string" && nested.trim()) return nested.trim();
    if (typeof nested === "number" && Number.isFinite(nested)) return String(nested);
  }
  return null;
}

function connectWiseField(
  row: Record<string, unknown>,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const parts = key.split("/");
    let value: unknown = row;
    for (const part of parts) {
      if (!value || typeof value !== "object") {
        value = null;
        break;
      }
      value = (value as Record<string, unknown>)[part];
    }
    const text = connectWiseNestedName(value);
    if (text) return text;
  }
  return null;
}

function haloTicketToProjectInput(ticket: HaloTicket): ScanProjectInput {
  return {
    projectId: ticket.id,
    clientId: ticket.clientId ?? 0,
    targetDate: ticket.targetdate ?? null,
  };
}

function cwAuth(connection: ConnectWiseConnection): string {
  return `Basic ${Buffer.from(
    `${connection.companyId}+${connection.publicKey}:${connection.privateKey}`,
    "utf8",
  ).toString("base64")}`;
}

async function fetchCwScanTickets(
  connection: ConnectWiseConnection,
  dateFrom: string,
  dateTo: string,
): Promise<{ tickets: ScanTicketInput[]; fieldMapping: ScanFieldMappingContext }> {
  const base = normalizeConnectWiseSiteUrl(connection.siteUrl);
  const conditions = encodeURIComponent(
    `dateEntered >= [${dateFrom}] and dateEntered <= [${dateTo}]`,
  );
  const fields = encodeURIComponent(
    "id,company/id,dateEntered,dateResponded,closedDate,summary,priority/name,status/name," +
      "owner/name,contact/name,type/name,respondByDate,resolveByDate",
  );
  const headers = {
    Authorization: cwAuth(connection),
    clientId: connection.clientId,
    "Content-Type": "application/json",
  };
  const result: ScanTicketInput[] = [];
  const fieldProvenance = new FieldProvenanceAccumulator();
  for (let page = 1; page <= 100; page += 1) {
    const url = `${base}/v4_6_release/apis/3.0/service/tickets?conditions=${conditions}&page=${page}&pageSize=100&fields=${fields}`;
    const response = await fetch(url, { headers, cache: "no-store" });
    if (!response.ok) {
      throw new ScanSyncError(
        response.status === 403 ? "upstream_forbidden" : "sync_failed",
      );
    }
    const body = (await response.json()) as unknown;
    const rows = Array.isArray(body)
      ? body
      : body &&
          typeof body === "object" &&
          Array.isArray((body as { items?: unknown }).items)
        ? (body as { items: unknown[] }).items
        : [];
    for (const raw of rows) {
      if (!raw || typeof raw !== "object") continue;
      const row = raw as Record<string, unknown>;
      const company =
        row.company && typeof row.company === "object"
          ? (row.company as Record<string, unknown>).id
          : null;
      const clientId = Number(company);
      if (!Number.isFinite(clientId) || clientId <= 0) continue;
      const provenanceRow: Record<string, unknown> = {
        ...row,
        dateoccurred: row.dateEntered,
        dateresponded: row.dateResponded,
        dateclosed: row.closedDate,
        priority: connectWiseField(row, ["priority/name", "priority"]),
        status: connectWiseField(row, ["status/name", "status"]),
        owner: connectWiseField(row, ["owner/name", "owner"]),
        contact: connectWiseField(row, ["contact/name", "contact"]),
        tickettype: connectWiseField(row, ["type/name", "type"]),
        respondbydate: connectWiseField(row, ["respondByDate", "respondbydate"]),
        fixbydate: connectWiseField(row, ["resolveByDate", "resolvebydate"]),
      };
      fieldProvenance.recordTicket(provenanceRow);
      const status = (provenanceRow.status as string | null)?.toLowerCase() ?? "";
      result.push({
        ticketId: Number.isSafeInteger(Number(row.id)) ? Number(row.id) : null,
        clientId,
        dateEntered: typeof row.dateEntered === "string" ? row.dateEntered : null,
        dateResponded:
          typeof row.dateResponded === "string" ? row.dateResponded : null,
        dateClosed:
          typeof row.closedDate === "string" ? row.closedDate : null,
        priority: provenanceRow.priority as string | null,
        statusOpen:
          status === "open" || status === "new" || status === "in progress"
            ? true
            : status === "closed" || status === "resolved" || status === "complete"
              ? false
              : null,
        owner: provenanceRow.owner as string | null,
        requester: provenanceRow.contact as string | null,
        ticketType: provenanceRow.tickettype as string | null,
        slaDueDate: provenanceRow.fixbydate as string | null,
      });
    }
    if (rows.length < 100) break;
  }
  return { tickets: result, fieldMapping: fieldProvenance.buildReports() };
}

function dateWindow(): { dateFrom: string; dateTo: string } {
  const to = new Date();
  to.setUTCHours(0, 0, 0, 0);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 365);
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: to.toISOString().slice(0, 10),
  };
}

/**
 * Churn Replay runs after the live checks and must never fail a scan: any
 * error leaves `churnReplay` null and the rest of the results intact.
 */
function safeChurnReplay(
  input: Parameters<typeof buildChurnReplay>[0],
): ChurnReplayResult | null {
  try {
    return buildChurnReplay(input);
  } catch (error) {
    console.error("[scan] churn replay failed", error);
    return null;
  }
}

async function runHaloSync(
  credentials: HaloScanCredentials,
  sessionId: string,
): Promise<StoredScanResults> {
  const window = dateWindow();
  const fetchMeta: {
    recordCount: number | null;
    fieldMapping?: ScanFieldMappingContext;
  } = { recordCount: null };
  const token = await getHaloToken(credentials);
  await updateSession(sessionId, {
    progress_json: { stage: "tickets", completed: 1, total: 3 },
  });
  const tickets = await getHaloTickets(token, credentials.haloUrl, {
    ...window,
    includeClosed: true,
    minimalHistoricalPayload: true,
    throwOnFetchError: true,
    fetchMeta,
  });
  let statusNames = new Map<number, string>();
  try {
    const statuses = await getHaloTicketStatuses(credentials.haloUrl, token);
    statusNames = new Map(statuses.map((status) => [status.id, status.name]));
  } catch {
    // Status checks remain suppressed when the PSA does not expose its catalogue.
  }
  const scanTickets = tickets.map((ticket) => haloTicketToScanInput(ticket, statusNames));
  const clientNames: Record<string, string> = {};
  const scanClientIds = [
    ...new Set(
      scanTickets
        .map((ticket) => ticket.clientId)
        .filter((clientId) => clientId > 0),
    ),
  ];
  for (const ticket of tickets) {
    const clientId = ticket.clientId;
    const name = ticket.client?.name?.trim();
    if (
      typeof clientId === "number" &&
      clientId > 0 &&
      name &&
      !["unknown", "unassigned", "n/a"].includes(name.toLowerCase())
    ) {
      clientNames[String(clientId)] = name;
    }
  }
  if (scanClientIds.length > 0) {
    try {
      const clients = await getAllHaloClients(credentials.haloUrl, token);
      for (const client of clients) {
        if (
          scanClientIds.includes(client.id) &&
          client.name.trim() &&
          !clientNames[String(client.id)] &&
          !["unknown", "unassigned", "n/a"].includes(client.name.trim().toLowerCase())
        ) {
          clientNames[String(client.id)] = client.name.trim();
        }
      }
    } catch {
      // Findings remain useful if the PSA permits tickets but not client reads.
    }
  }
  const projects = tickets
    .filter(
      (ticket) =>
        ticket.is_project === true &&
        ticket.is_project_task !== true &&
        ticket.parent_project_id == null,
    )
    .map(haloTicketToProjectInput);

  await updateSession(sessionId, {
    progress_json: { stage: "contracts", completed: 2, total: 3 },
  });
  let contracts: NormalisedContractRecord[] = [];
  let recurringInvoices: Awaited<
    ReturnType<typeof getHaloRecurringInvoices>
  >["records"] = [];
  let commercialFieldMapping: CommercialFieldMappingContext | null = null;
  let recurringInvoicesLoaded = false;
  let quotations: NormalisedQuotation[] | undefined;
  let salesOrders: NormalisedSalesOrder[] | undefined;
  let contractSummary: unknown = null;
  let exposureAvailability: StoredScanResults["exposureAvailability"] =
    "unavailable";
  let historicalContracts: NormalisedContractRecord[] | undefined;
  try {
    const contractResult = await getHaloContracts(token, credentials.haloUrl);
    contracts = contractResult.records;
    contractSummary = { clientContracts: contractResult.summary };
    try {
      // Ended contracts are only used by Churn Replay to find clients that left.
      historicalContracts = (
        await getHaloContracts(token, credentials.haloUrl, { includeinactive: true })
      ).records;
    } catch {
      historicalContracts = contracts;
    }
  } catch {
    // End dates remain unavailable when ClientContract permission is absent.
  }
  try {
    const recurringResult = await getHaloRecurringInvoices(token, credentials.haloUrl);
    recurringInvoicesLoaded = true;
    recurringInvoices = recurringResult.records;
    commercialFieldMapping = {
      recurringInvoices: recurringResult.fieldMapping,
    };
    contractSummary = {
      ...(contractSummary && typeof contractSummary === "object" ? contractSummary : {}),
      recurringInvoices: {
        total: recurringInvoices.length,
        withMonthlyValue: recurringInvoices.filter(
          (invoice) => invoice.monthlyValue != null,
        ).length,
      },
    };
    const withValue = recurringInvoices.filter(
      (invoice) => invoice.monthlyValue != null && invoice.monthlyValue > 0,
    ).length;
    exposureAvailability =
      recurringInvoices.length === 0
        ? "available_zero"
        : withValue === 0
          ? "available_no_value"
          : "available_value";
  } catch {
    // Ticket findings remain useful when recurring invoice permission is absent.
    exposureAvailability = "unavailable";
  }
  try {
    const commercialResult = await getHaloCommercialData(token, credentials.haloUrl);
    quotations = commercialResult.quotations;
    salesOrders = commercialResult.salesOrders;
    commercialFieldMapping = {
      ...(commercialFieldMapping ?? {}),
      quotations: commercialResult.fieldMapping.quotations,
      salesOrders: commercialResult.fieldMapping.salesOrders,
    };
  } catch {
    // Commercial findings remain suppressed when either commercial endpoint is unavailable.
  }

  const byClient = aggregateByClientPeriod(scanTickets, projects, {
    fieldMapping: fetchMeta.fieldMapping ?? undefined,
  });
  const findings = buildScanFindings({
    byClient,
    tickets: scanTickets,
    projects,
    contracts,
    recurringInvoices: recurringInvoicesLoaded ? recurringInvoices : undefined,
    quotations,
    salesOrders,
    fieldMapping: fetchMeta.fieldMapping ?? null,
    clientNames,
    evidenceSource: "halo",
  });
  const churnReplay = safeChurnReplay({
    tickets: scanTickets,
    contracts: historicalContracts,
    recurringInvoices: recurringInvoicesLoaded ? recurringInvoices : undefined,
    quotations,
    salesOrders,
    fieldMapping: fetchMeta.fieldMapping ?? null,
    clientNames,
    windowStart: window.dateFrom,
  });
  const scanOutcome =
    findings.portfolio.clientsAnalysed === 0
      ? "no_clients"
      : findings.findings.length > 0
      ? "findings"
      : findings.portfolio.clientsAnalysed > 0 &&
          Object.values(byClient).every(
            (aggregate) =>
              aggregate.medianResponseSuppressed &&
              (aggregate.responseCoverageSuppressed ||
                aggregate.responseCoveragePct == null ||
                aggregate.closeCoverageSuppressed ||
                aggregate.closeCoveragePct == null),
          )
        ? "metrics_suppressed"
        : "no_findings";
  await updateSession(sessionId, {
    progress_json: { stage: "complete", completed: 3, total: 3 },
  });
  return {
    byClient,
    findings: findings.findings,
    insufficientData: findings.insufficientData,
    portfolio: findings.portfolio,
    fieldMapping: fetchMeta.fieldMapping ?? null,
    commercialFieldMapping,
    contractSummary,
    exposureAvailability,
    scanOutcome,
    suppressedMetricCount: Object.values(byClient).reduce(
      (count, aggregate) =>
        count +
        Number(aggregate.responseCoverageSuppressed) +
        Number(aggregate.closeCoverageSuppressed) +
        Number(aggregate.medianResponseSuppressed),
      0,
    ),
    clientNames,
    psaType: "halo",
    instanceUrl: credentials.haloUrl.replace(/\/+$/, ""),
    projectOverrunReliable: true,
    churnReplay,
  };
}

async function runConnectWiseSync(
  credentials: ConnectWiseScanCredentials,
  sessionId: string,
): Promise<StoredScanResults> {
  const window = dateWindow();
  const connection: ConnectWiseConnection = credentials;
  await updateSession(sessionId, {
    progress_json: { stage: "tickets", completed: 1, total: 3 },
  });
  const ticketFetch = await fetchCwScanTickets(connection, window.dateFrom, window.dateTo);
  const tickets = ticketFetch.tickets;
  const clientNames: Record<string, string> = {};
  try {
    const companies = await fetchAllCWCompanies(connection);
    for (const company of companies) {
      clientNames[String(company.id)] = company.name;
    }
  } catch {
    // Findings remain useful if company reads are not available.
  }
  await updateSession(sessionId, {
    progress_json: { stage: "contracts", completed: 2, total: 3 },
  });
  let contracts: NormalisedContractRecord[] = [];
  let contractSummary: unknown = null;
  let exposureAvailability: StoredScanResults["exposureAvailability"] =
    "unavailable";
  let historicalContracts: NormalisedContractRecord[] | undefined;
  try {
    const result = await getCwAgreements(connection);
    contracts = result.records;
    try {
      // Cancelled agreements are only used by Churn Replay to find clients that left.
      historicalContracts = (
        await getCwAgreements(connection, { includeCancelled: true })
      ).records;
    } catch {
      historicalContracts = contracts;
    }
    contractSummary = result.summary;
    const totalMonthlyValue = contracts.reduce(
      (sum, contract) =>
        contract.hasValue && contract.monthlyValue != null
          ? sum + contract.monthlyValue
          : sum,
      0,
    );
    exposureAvailability =
      result.summary.total === 0
        ? "available_zero"
        : result.summary.withValue === 0
          ? "available_no_value"
          : totalMonthlyValue === 0
            ? "available_zero"
            : "available_value";
  } catch {
    exposureAvailability = "unavailable";
  }
  const fieldMapping = ticketFetch.fieldMapping;
  const byClient = aggregateByClientPeriod(tickets, [], { fieldMapping });
  const findings = buildScanFindings({
    byClient,
    tickets,
    evidenceSource: "connectwise",
    contracts: exposureAvailability === "unavailable" ? undefined : contracts,
    fieldMapping,
    clientNames,
  });
  const churnReplay = safeChurnReplay({
    tickets,
    contracts: historicalContracts,
    fieldMapping,
    clientNames,
    windowStart: window.dateFrom,
  });
  const scanOutcome =
    findings.portfolio.clientsAnalysed === 0
      ? "no_clients"
      : findings.findings.length > 0
        ? "findings"
        : "no_findings";
  await updateSession(sessionId, {
    progress_json: { stage: "complete", completed: 3, total: 3 },
  });
  return {
    byClient,
    findings: findings.findings,
    insufficientData: findings.insufficientData,
    portfolio: findings.portfolio,
    fieldMapping,
    contractSummary,
    exposureAvailability,
    scanOutcome,
    suppressedMetricCount: 0,
    clientNames,
    psaType: "connectwise",
    instanceUrl: normalizeConnectWiseSiteUrl(connection.siteUrl),
    projectOverrunReliable: false,
    churnReplay,
  };
}

export async function syncScanSession(sessionId: string): Promise<void> {
  const admin = createServiceRoleClient();
  const { data: row } = await admin
    .from("scan_sessions")
    .select("id,expires_at,credentials_encrypted,status,psa_type")
    .eq("id", sessionId)
    .maybeSingle();
  if (!row || row.status === "claimed" || row.status === "complete") return;
  if (isExpired(row.expires_at)) {
    await updateSession(sessionId, {
      status: "failed",
      credentials_encrypted: null,
      error_reason: "session_expired",
      progress_json: { stage: "expired", completed: 0, total: null },
    });
    return;
  }
  if (row.status === "pending") {
    const { data: started } = await admin
      .from("scan_sessions")
      .update({
        status: "syncing",
        progress_json: { stage: "starting", completed: 0, total: 3 },
      })
      .eq("id", sessionId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (!started) return;
  }
  try {
    if (!row.credentials_encrypted) throw new ScanSyncError("sync_failed");
    const credentials = JSON.parse(
      decrypt(row.credentials_encrypted),
    ) as ScanSessionCredentials;
    const results =
      credentials.psaType === "halo"
        ? await runHaloSync(credentials, sessionId)
        : await runConnectWiseSync(credentials, sessionId);
    const latest = await admin
      .from("scan_sessions")
      .select("expires_at")
      .eq("id", sessionId)
      .maybeSingle();
    if (!latest.data || isExpired(latest.data.expires_at)) {
      throw new ScanSyncError("session_expired");
    }
    const hasClients = results.portfolio.clientsAnalysed > 0;
    await updateSession(sessionId, {
      status: "complete",
      results_json: results,
      results_expires_at: new Date(Date.now() + SCAN_RESULTS_TTL_MS).toISOString(),
      credentials_encrypted: null,
      error_reason: null,
      progress_json: {
        stage: hasClients ? "complete" : "no_clients",
        completed: 3,
        total: 3,
      },
    });
  } catch (error) {
    await updateSession(sessionId, {
      status: "failed",
      credentials_encrypted: null,
      error_reason: sanitiseScanError(error),
      progress_json: { stage: "failed", completed: 0, total: null },
    });
  }
}

export async function processPendingScanSessions(limit = 3): Promise<number> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("scan_sessions")
    .select("id")
    .in("status", ["pending", "syncing"])
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(limit);
  let count = 0;
  for (const row of data ?? []) {
    await syncScanSession(row.id);
    count += 1;
  }
  return count;
}

export async function claimScanSession(
  token: string,
  userId: string,
): Promise<{
  sessionId: string;
  createdAt: string;
  status: "claimed";
  syncStatus: SessionStatus;
  results: StoredScanResults | null;
  connectionTransferred: boolean;
  errorCode: string | null;
}> {
  const session = await getSessionByToken(token);
  if (!session) {
    throw new Error("scan_session_unavailable");
  }
  if (
    (session.status === "complete" || session.status === "claimed")
      ? isResultsExpired(session.results_expires_at)
      : isExpired(session.expires_at)
  ) {
    throw new Error("scan_session_unavailable");
  }
  if (session.status === "claimed" && session.claimed_by_user_id !== userId) {
    throw new Error("scan_session_unavailable");
  }
  if (session.claimed_by_user_id && session.claimed_by_user_id !== userId) {
    throw new Error("scan_session_unavailable");
  }

  let connectionTransferred = false;
  if (session.credentials_encrypted) {
    const credentials = JSON.parse(
      decrypt(session.credentials_encrypted),
    ) as ScanSessionCredentials;
    const admin = createServiceRoleClient();
    if (credentials.psaType === "halo") {
      const { data: existing } = await admin
        .from("halo_connections")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (!existing) {
        const { error } = await admin.from("halo_connections").insert({
          user_id: userId,
          halo_url: credentials.haloUrl,
          tenant: credentials.tenant,
          client_id: credentials.clientId,
          client_secret_encrypted: encrypt(credentials.clientSecret),
        });
        if (error && !String(error.message).toLowerCase().includes("duplicate")) {
          throw new Error("scan_claim_failed");
        }
        connectionTransferred = !error;
      }
    } else {
      const { data: existing } = await admin
        .from("cw_connections")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (!existing) {
        const { error } = await admin.from("cw_connections").insert({
          user_id: userId,
          site_url: credentials.siteUrl,
          company_id: credentials.companyId,
          public_key_encrypted: encrypt(credentials.publicKey),
          private_key_encrypted: encrypt(credentials.privateKey),
          client_id: credentials.clientId,
        });
        if (error && !String(error.message).toLowerCase().includes("duplicate")) {
          throw new Error("scan_claim_failed");
        }
        connectionTransferred = !error;
      }
    }
  }

  await updateSession(session.id, {
    status: "claimed",
    claimed_by_user_id: userId,
    credentials_encrypted: null,
  });
  return {
    sessionId: session.id,
    createdAt: session.created_at,
    status: "claimed",
    syncStatus: session.status,
    results: session.results_json,
    connectionTransferred,
    errorCode: session.error_reason,
  };
}

export async function cleanupExpiredScanSessions(): Promise<number> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin.rpc("cleanup_expired_scan_sessions");
  if (error || typeof data !== "number") throw new Error("scan_cleanup_failed");
  return data;
}
