/**
 * Local, read-only security checks for the anonymous scan foundation.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.json scripts/scan-session-verify.mjs
 */
import fs from "fs";
import path from "path";
import {
  createScanCapability,
  hashScanCapability,
  sanitiseScanError,
  ScanSyncError,
} from "../src/lib/psa/scan-session.ts";

const root = process.cwd();
const checks = [];

function check(name, condition) {
  checks.push({ name, ok: Boolean(condition) });
}

const capabilities = Array.from({ length: 100 }, () => createScanCapability());
check(
  "100 capabilities are unique",
  new Set(capabilities.map((item) => item.token)).size === 100,
);
check(
  "capabilities are 256-bit URL-safe tokens",
  capabilities.every((item) => item.token.length >= 42 && /^[A-Za-z0-9_-]+$/.test(item.token)),
);
check(
  "only hashes are suitable for persistence",
  capabilities.every(
    (item) =>
      item.tokenHash === hashScanCapability(item.token) &&
      item.tokenHash !== item.token &&
      /^[a-f0-9]{64}$/.test(item.tokenHash),
  ),
);
check(
  "upstream 403 is sanitized",
  sanitiseScanError(new ScanSyncError("upstream_forbidden")) === "upstream_forbidden",
);
check(
  "unexpected errors are generic",
  sanitiseScanError(new Error("secret-value")) === "sync_failed",
);

const migration = fs.readFileSync(
  path.join(root, "supabase", "migrations", "20260829200000_scan_sessions.sql"),
  "utf8",
);
const startRoute = fs.readFileSync(
  path.join(root, "src", "app", "onboarding", "scan", "start", "route.ts"),
  "utf8",
);
const statusRoute = fs.readFileSync(
  path.join(root, "src", "app", "onboarding", "scan", "status", "route.ts"),
  "utf8",
);
const claimRoute = fs.readFileSync(
  path.join(root, "src", "app", "onboarding", "scan", "claim", "route.ts"),
  "utf8",
);
const cleanupRoute = fs.readFileSync(
  path.join(root, "src", "app", "api", "cron", "cleanup-scan-sessions", "route.ts"),
  "utf8",
);
const vercelConfig = fs.readFileSync(path.join(root, "vercel.json"), "utf8");

check("RLS is enabled", /enable row level security/i.test(migration));
check("anon has no table privileges", /revoke all on table public\.scan_sessions from anon/i.test(migration));
check(
  "credentials are excluded from authenticated grants",
  !/grant select \([^)]*credentials_encrypted[^)]*\)/is.test(migration),
);
check("start route has no console logging", !/console\.(log|error|warn)/.test(startRoute));
check("status route has no credential column reference", !/credentials_encrypted/.test(statusRoute));
check("claim route does not return credential fields", !/credentials_encrypted/.test(claimRoute));
check("expiry cleanup function exists", /cleanup_expired_scan_sessions/.test(migration));
check("cleanup route requires CRON_SECRET bearer", /authorization[\s\S]*Bearer \$\{process\.env\.CRON_SECRET/.test(cleanupRoute));
check("hourly cleanup is external to Vercel", !/cleanup-scan-sessions/.test(vercelConfig));
check(
  "anonymous status path has no results property",
  /return NextResponse\.json\(\s*\{\s*ok: true,\s*\.\.\.result\.status\s*\}/m.test(statusRoute),
);

const failed = checks.filter((item) => !item.ok);
for (const item of checks) {
  console.log(`${item.ok ? "PASS" : "FAIL"} ${item.name}`);
}
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
if (failed.length > 0) process.exit(1);
