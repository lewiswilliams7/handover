import { createServiceRoleClient } from "@/lib/supabase/admin";

const ISSUE_SCAN_SESSION_MIGRATION = "supabase/migrations/20260830100000_scan_session_email.sql";
const SCAN_SESSIONS_EMAIL_MIGRATION = ISSUE_SCAN_SESSION_MIGRATION;
const CI_CACHE_MIGRATION = "supabase/migrations/20260529000001_ci_cache_and_generation_columns.sql";

const EXPECTED_ISSUE_SCAN_SESSION_PARAMETERS = {
  p_psa_type: "text",
  p_session_token_hash: "text",
  p_ip_fingerprint: "text",
  p_email: "text",
  p_credentials_encrypted: "text",
  p_expires_at: "timestamp with time zone",
} as const;

type OpenApiSchema = {
  properties?: Record<string, { format?: string }>;
  required?: string[];
};

type OpenApiDocument = {
  paths?: Record<
    string,
    {
      post?: {
        parameters?: Array<{
          in?: string;
          schema?: OpenApiSchema;
        }>;
      };
    }
  >;
};

function warnMissing(objectName: string, migration: string): void {
  console.warn(
    `[dev-database-check] Missing ${objectName}. Apply ${migration}.`,
  );
}

async function checkIssueScanSessionSignature(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase service-role configuration is unavailable.");
  }

  const response = await fetch(`${url}/rest/v1/`, {
    headers: {
      Accept: "application/openapi+json",
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Supabase schema request returned HTTP ${response.status}.`);
  }

  const document = (await response.json()) as OpenApiDocument;
  const schema = document.paths?.["/rpc/issue_scan_session"]?.post?.parameters?.find(
    (parameter) => parameter.in === "body",
  )?.schema;
  const actualParameters = schema?.properties ?? {};
  const missingParameters = Object.entries(EXPECTED_ISSUE_SCAN_SESSION_PARAMETERS)
    .filter(([name, format]) => actualParameters[name]?.format !== format)
    .map(([name]) => name);
  const unexpectedParameters = Object.keys(actualParameters).filter(
    (name) => !(name in EXPECTED_ISSUE_SCAN_SESSION_PARAMETERS),
  );
  const requiredParameters = new Set(schema?.required ?? []);
  const missingRequiredParameters = Object.keys(EXPECTED_ISSUE_SCAN_SESSION_PARAMETERS).filter(
    (name) => !requiredParameters.has(name),
  );

  if (
    !schema ||
    missingParameters.length > 0 ||
    unexpectedParameters.length > 0 ||
    missingRequiredParameters.length > 0
  ) {
    const details = [
      ...missingParameters.map((name) => `missing or wrong type: ${name}`),
      ...missingRequiredParameters.map((name) => `not required: ${name}`),
      ...unexpectedParameters.map((name) => `unexpected: ${name}`),
    ].join(", ");
    warnMissing(`issue_scan_session signature (${details || "not exposed"})`, ISSUE_SCAN_SESSION_MIGRATION);
  }
}

async function checkColumn(
  admin: ReturnType<typeof createServiceRoleClient>,
  table: string,
  column: string,
  migration: string,
): Promise<void> {
  const { error } = await admin.from(table).select(column).limit(0);
  if (error) {
    warnMissing(`${table}.${column}`, migration);
  }
}

async function runDevDatabaseObjectCheck(): Promise<void> {
  const admin = createServiceRoleClient();
  await Promise.all([
    checkIssueScanSessionSignature(),
    checkColumn(admin, "scan_sessions", "email", SCAN_SESSIONS_EMAIL_MIGRATION),
    checkColumn(admin, "generations", "compare_cache", CI_CACHE_MIGRATION),
    checkColumn(admin, "generations", "smart_action_suggestions", CI_CACHE_MIGRATION),
  ]);
}

let checkStarted = false;

/** Starts a non-blocking development-only database compatibility check. */
export function startDevDatabaseObjectCheck(): void {
  if (checkStarted || process.env.NODE_ENV !== "development") return;
  checkStarted = true;

  void runDevDatabaseObjectCheck().catch((error: unknown) => {
    console.warn(
      "[dev-database-check] Could not complete database object checks; startup will continue.",
      error instanceof Error ? error.message : "Unknown error.",
    );
  });
}
