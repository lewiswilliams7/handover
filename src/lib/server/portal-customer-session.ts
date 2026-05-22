import { cookies } from "next/headers";

import { createServiceRoleClient } from "@/lib/supabase/admin";

export const PORTAL_SESSION_COOKIE = "portal_session";
export const PORTAL_SESSION_DAYS = 30;

export type PortalSessionContext = {
  sessionId: string;
  token: string;
  expiresAt: string;
  portalClientUserId: string;
  user: {
    id: string;
    email: string;
    display_name: string | null;
    invite_accepted_at: string | null;
    last_login_at: string | null;
    enabled: boolean | null;
  };
  client: {
    id: string;
    client_name: string;
    slug: string;
    client_id: string;
    enabled: boolean | null;
    visibility_tickets: boolean | null;
    visibility_projects: boolean | null;
    visibility_rag: boolean | null;
    visibility_reports: boolean | null;
    visibility_ticket_notes: boolean | null;
    visibility_stats?: boolean | null;
    visibility_priority_breakdown?: boolean | null;
    visibility_resolved_count?: boolean | null;
    visibility_recent_activity?: boolean | null;
    logo_url: string | null;
    psa_source: string | null;
    portal_account_id: string;
    notify_ticket_updates?: boolean | null;
    notify_project_updates?: boolean | null;
  };
  account: {
    id: string;
    slug: string;
    display_name: string | null;
    user_id: string;
  };
};

export async function getPortalSessionFromCookies(): Promise<PortalSessionContext | null> {
  const jar = await cookies();
  const token = jar.get(PORTAL_SESSION_COOKIE)?.value?.trim();
  if (!token) return null;

  const admin = createServiceRoleClient();
  const nowIso = new Date().toISOString();
  const { data: session, error: sErr } = await admin
    .from("portal_client_sessions")
    .select("id, token, expires_at, portal_client_user_id, last_used_at")
    .eq("token", token)
    .maybeSingle();

  if (sErr || !session?.portal_client_user_id) return null;
  if (typeof session.expires_at === "string" && session.expires_at <= nowIso) {
    await admin.from("portal_client_sessions").delete().eq("id", session.id);
    return null;
  }

  const { data: pcUser, error: uErr } = await admin
    .from("portal_client_users")
    .select("id, email, display_name, enabled, invite_accepted_at, last_login_at, portal_client_id")
    .eq("id", session.portal_client_user_id)
    .maybeSingle();
  if (uErr || !pcUser?.portal_client_id) return null;
  if (pcUser.enabled === false) return null;

  const { data: client, error: cErr } = await admin
    .from("portal_clients")
    .select(
      "id, client_name, slug, client_id, enabled, visibility_tickets, visibility_projects, visibility_rag, visibility_reports, visibility_ticket_notes, visibility_stats, visibility_priority_breakdown, visibility_resolved_count, visibility_recent_activity, logo_url, psa_source, portal_account_id, notify_ticket_updates, notify_project_updates",
    )
    .eq("id", pcUser.portal_client_id)
    .maybeSingle();
  if (cErr || !client?.portal_account_id) return null;
  if (client.enabled === false) return null;

  const { data: account, error: aErr } = await admin
    .from("portal_accounts")
    .select("id, slug, display_name, user_id, enabled")
    .eq("id", client.portal_account_id)
    .maybeSingle();
  if (aErr || !account) return null;
  if (account.enabled === false) return null;

  await admin
    .from("portal_client_sessions")
    .update({ last_used_at: nowIso })
    .eq("id", session.id);

  return {
    sessionId: String(session.id),
    token: String(session.token),
    expiresAt: String(session.expires_at),
    portalClientUserId: String(session.portal_client_user_id),
    user: {
      id: String(pcUser.id),
      email: String(pcUser.email ?? ""),
      display_name: typeof pcUser.display_name === "string" ? pcUser.display_name : null,
      invite_accepted_at:
        typeof pcUser.invite_accepted_at === "string" ? pcUser.invite_accepted_at : null,
      last_login_at: typeof pcUser.last_login_at === "string" ? pcUser.last_login_at : null,
      enabled: pcUser.enabled as boolean | null,
    },
    client: {
      id: String(client.id),
      client_name: String(client.client_name ?? ""),
      slug: String(client.slug ?? ""),
      client_id: String(client.client_id ?? ""),
      enabled: client.enabled as boolean | null,
      visibility_tickets: client.visibility_tickets as boolean | null,
      visibility_projects: client.visibility_projects as boolean | null,
      visibility_rag: client.visibility_rag as boolean | null,
      visibility_reports: client.visibility_reports as boolean | null,
      visibility_ticket_notes: client.visibility_ticket_notes as boolean | null,
      visibility_stats: (client as { visibility_stats?: boolean | null }).visibility_stats ?? null,
      visibility_priority_breakdown: (client as { visibility_priority_breakdown?: boolean | null })
        .visibility_priority_breakdown ?? null,
      visibility_resolved_count: (client as { visibility_resolved_count?: boolean | null })
        .visibility_resolved_count ?? null,
      visibility_recent_activity: (client as { visibility_recent_activity?: boolean | null })
        .visibility_recent_activity ?? null,
      logo_url: typeof client.logo_url === "string" ? client.logo_url : null,
      psa_source: typeof client.psa_source === "string" ? client.psa_source : null,
      portal_account_id: String(client.portal_account_id),
      notify_ticket_updates: client.notify_ticket_updates as boolean | null | undefined,
      notify_project_updates: client.notify_project_updates as boolean | null | undefined,
    },
    account: {
      id: String(account.id),
      slug: String(account.slug ?? ""),
      display_name: typeof account.display_name === "string" ? account.display_name : null,
      user_id: String(account.user_id ?? ""),
    },
  };
}

/** Redirect path when an active portal customer session belongs to this MSP slug. */
export async function getPortalCustomerRedirectPath(mspSlug: string): Promise<string | null> {
  const ctx = await getPortalSessionFromCookies();
  if (!ctx?.client.slug || !ctx.account.slug) return null;
  const m = mspSlug.trim().toLowerCase();
  if (ctx.account.slug !== m) return null;
  return `/portal/${encodeURIComponent(ctx.account.slug)}/${encodeURIComponent(ctx.client.slug)}`;
}

export async function resolvePortalClientBySlugs(mspSlug: string, clientSlug: string) {
  const admin = createServiceRoleClient();
  const m = mspSlug.trim().toLowerCase();
  const c = clientSlug.trim().toLowerCase();
  const { data: account, error: aErr } = await admin
    .from("portal_accounts")
    .select("id, slug, display_name, user_id, enabled")
    .eq("slug", m)
    .maybeSingle();
  if (aErr || !account?.id || !account.user_id) return null;
  if (account.enabled === false) return null;

  const { data: client, error: cErr } = await admin
    .from("portal_clients")
    .select(
      "id, client_name, slug, client_id, enabled, visibility_tickets, visibility_projects, visibility_rag, visibility_reports, visibility_ticket_notes, visibility_stats, visibility_priority_breakdown, visibility_resolved_count, visibility_recent_activity, logo_url, psa_source, portal_account_id",
    )
    .eq("portal_account_id", account.id)
    .eq("slug", c)
    .maybeSingle();
  if (cErr || !client) return null;
  if (client.enabled === false) return null;

  return { account, client };
}
