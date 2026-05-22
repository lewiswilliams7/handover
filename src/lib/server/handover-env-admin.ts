/**
 * Comma-separated lists in env (server-only). Used for /api/admin/* without changing core auth.
 */
export function isHandoverEnvAdmin(userId: string, email: string | null | undefined): boolean {
  const idsRaw = process.env.HANDOVER_ADMIN_USER_IDS?.trim() ?? "";
  if (idsRaw) {
    const set = new Set(
      idsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
    if (set.has(userId)) return true;
  }

  const emailsRaw = process.env.HANDOVER_ADMIN_EMAILS?.trim() ?? "";
  if (emailsRaw && email?.trim()) {
    const lowered = email.trim().toLowerCase();
    const set = new Set(
      emailsRaw
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    );
    if (set.has(lowered)) return true;
  }

  return false;
}
