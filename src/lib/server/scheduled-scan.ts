/**
 * Weekly automatic scans.
 *
 * Scan results expire after 7 days, and Revenue at Risk, Churn Replay and
 * Value Receipts all read from the latest scan. Without a scheduled scan a
 * customer's data goes stale (and then disappears) unless someone presses
 * Refresh. This runs the same scan the Refresh button runs, for customers with
 * an active Handover plan and a saved PSA connection, and attaches the result
 * to their account.
 */
import { decrypt } from "@/lib/encryption";
import {
  isValidScanEmail,
  issueScanSession,
  syncScanSession,
  validateScanCredentials,
} from "@/lib/psa/scan-session";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { hasHandoverEntitlement, planFieldsFromProfileRow } from "@/lib/utils/getPlan";

/** Re-scan when the latest scan is at least this old (results expire at 7 days). */
export const SCHEDULED_SCAN_MIN_AGE_MS = 6 * 24 * 60 * 60 * 1000;

type AdminClient = ReturnType<typeof createServiceRoleClient>;

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

export type StoredCredentialsResult =
  | { ok: true; psaType: "halo" | "connectwise"; credentialsInput: unknown }
  | { ok: false; reason: "none" | "unreadable" | "read_failed" };

/**
 * Load and decrypt a user's saved PSA connection. When both exist, the most
 * recently updated one wins unless `prefer` names one that exists.
 */
export async function loadStoredScanCredentials(
  admin: AdminClient,
  userId: string,
  prefer?: "halo" | "connectwise",
): Promise<StoredCredentialsResult> {
  const [{ data: halo, error: haloError }, { data: connectwise, error: connectwiseError }] =
    await Promise.all([
      admin
        .from("halo_connections")
        .select("halo_url, tenant, client_id, client_secret_encrypted, updated_at")
        .eq("user_id", userId)
        .maybeSingle<StoredHaloConnection>(),
      admin
        .from("cw_connections")
        .select("site_url, company_id, public_key_encrypted, private_key_encrypted, client_id, updated_at")
        .eq("user_id", userId)
        .maybeSingle<StoredConnectWiseConnection>(),
    ]);
  if (haloError && connectwiseError) return { ok: false, reason: "read_failed" };

  const candidates = [
    halo ? { type: "halo" as const, updatedAt: halo.updated_at } : null,
    connectwise ? { type: "connectwise" as const, updatedAt: connectwise.updated_at } : null,
  ].filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null);
  const selected =
    prefer && candidates.some((candidate) => candidate.type === prefer)
      ? prefer
      : candidates.sort(
          (left, right) => Date.parse(right.updatedAt ?? "") - Date.parse(left.updatedAt ?? ""),
        )[0]?.type;
  if (!selected) return { ok: false, reason: "none" };

  try {
    if (selected === "halo" && halo) {
      return {
        ok: true,
        psaType: "halo",
        credentialsInput: {
          psaType: "halo",
          haloUrl: halo.halo_url,
          tenant: halo.tenant,
          clientId: halo.client_id,
          clientSecret: decrypt(halo.client_secret_encrypted),
        },
      };
    }
    if (selected === "connectwise" && connectwise) {
      return {
        ok: true,
        psaType: "connectwise",
        credentialsInput: {
          psaType: "connectwise",
          siteUrl: connectwise.site_url,
          companyId: connectwise.company_id,
          publicKey: decrypt(connectwise.public_key_encrypted),
          privateKey: decrypt(connectwise.private_key_encrypted),
          clientId: connectwise.client_id,
        },
      };
    }
  } catch {
    return { ok: false, reason: "unreadable" };
  }
  return { ok: false, reason: "none" };
}

export type ScheduledScanOutcome =
  | { userId: string; status: "scanned"; sessionId: string }
  | { userId: string; status: "skipped" | "failed"; reason: string };

/** Run one scan for a user and attach the result to their account. */
export async function runScheduledScanForUser(
  admin: AdminClient,
  userId: string,
): Promise<ScheduledScanOutcome> {
  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const email = authUser.user?.email?.trim().toLowerCase() ?? "";
  if (!isValidScanEmail(email)) return { userId, status: "skipped", reason: "no_valid_email" };

  const stored = await loadStoredScanCredentials(admin, userId);
  if (!stored.ok) return { userId, status: "skipped", reason: `connection_${stored.reason}` };

  let sessionId: string;
  try {
    const credentials = await validateScanCredentials(stored.credentialsInput);
    const session = await issueScanSession(credentials, "scheduled-scan", email);
    sessionId = session.id;
  } catch (error) {
    return {
      userId,
      status: "failed",
      reason: error instanceof Error ? error.message.slice(0, 120) : "issue_failed",
    };
  }

  await syncScanSession(sessionId);

  // Attach only a finished scan, so a failed run never replaces good results.
  const { data: claimed } = await admin
    .from("scan_sessions")
    .update({ status: "claimed", claimed_by_user_id: userId, credentials_encrypted: null })
    .eq("id", sessionId)
    .eq("status", "complete")
    .select("id")
    .maybeSingle();
  if (!claimed) {
    const { data: row } = await admin
      .from("scan_sessions")
      .select("error_reason")
      .eq("id", sessionId)
      .maybeSingle();
    return { userId, status: "failed", reason: row?.error_reason ?? "scan_incomplete" };
  }
  return { userId, status: "scanned", sessionId };
}

/**
 * Customers due a scan: a saved PSA connection, an active Handover plan, and
 * no scan attached in the last six days. Oldest scans first.
 */
export async function findUsersDueForScheduledScan(
  admin: AdminClient,
  limit: number,
  nowMs: number = Date.now(),
): Promise<string[]> {
  const [{ data: halo }, { data: cw }] = await Promise.all([
    admin.from("halo_connections").select("user_id"),
    admin.from("cw_connections").select("user_id"),
  ]);
  const connected = [
    ...new Set([...(halo ?? []), ...(cw ?? [])].map((row) => String(row.user_id))),
  ];
  if (connected.length === 0) return [];

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, plan, team_id, trial_ends_at, trial_plan, subscription_status")
    .in("id", connected);
  const entitled = (profiles ?? [])
    .filter((row) => hasHandoverEntitlement(planFieldsFromProfileRow(row)))
    .map((row) => String(row.id));
  if (entitled.length === 0) return [];

  const { data: scans } = await admin
    .from("scan_sessions")
    .select("claimed_by_user_id, created_at")
    .in("claimed_by_user_id", entitled)
    .eq("status", "claimed")
    .order("created_at", { ascending: false });
  const latest = new Map<string, number>();
  for (const scan of scans ?? []) {
    const id = String(scan.claimed_by_user_id);
    if (!latest.has(id)) latest.set(id, Date.parse(scan.created_at));
  }

  return entitled
    .filter((id) => {
      const at = latest.get(id);
      return at == null || nowMs - at >= SCHEDULED_SCAN_MIN_AGE_MS;
    })
    .sort((a, b) => (latest.get(a) ?? 0) - (latest.get(b) ?? 0))
    .slice(0, limit);
}
