import type { PortalSessionContext } from "@/lib/server/portal-customer-session";

type OwnerUser = {
  id: string;
  email?: string | null;
};

type OwnerAccountRow = {
  id: unknown;
  slug: unknown;
  user_id: unknown;
};

export function buildOwnerSyntheticSession(
  mspUser: OwnerUser,
  ownerAccount: OwnerAccountRow,
  portalClient: Record<string, unknown>,
): PortalSessionContext {
  return {
    sessionId: "owner-preview",
    token: "owner-preview",
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    portalClientUserId: "owner",
    user: {
      id: mspUser.id,
      email: mspUser.email ?? "",
      display_name: "MSP Owner",
      invite_accepted_at: null,
      last_login_at: null,
      enabled: true,
    },
    client: {
      id: String(portalClient.id ?? ""),
      client_name: String(portalClient.client_name ?? ""),
      slug: String(portalClient.slug ?? ""),
      client_id: String(portalClient.client_id ?? ""),
      enabled: (portalClient.enabled as boolean | null | undefined) ?? true,
      visibility_tickets:
        (portalClient.visibility_tickets as boolean | null | undefined) ?? true,
      visibility_projects:
        (portalClient.visibility_projects as boolean | null | undefined) ?? true,
      visibility_rag: (portalClient.visibility_rag as boolean | null | undefined) ?? true,
      visibility_reports: (portalClient.visibility_reports as boolean | null | undefined) ?? true,
      visibility_ticket_notes:
        (portalClient.visibility_ticket_notes as boolean | null | undefined) ?? true,
      visibility_stats: (portalClient.visibility_stats as boolean | null | undefined) ?? true,
      visibility_priority_breakdown:
        (portalClient.visibility_priority_breakdown as boolean | null | undefined) ?? true,
      visibility_resolved_count:
        (portalClient.visibility_resolved_count as boolean | null | undefined) ?? true,
      visibility_recent_activity:
        (portalClient.visibility_recent_activity as boolean | null | undefined) ?? true,
      logo_url: typeof portalClient.logo_url === "string" ? portalClient.logo_url : null,
      psa_source: typeof portalClient.psa_source === "string" ? portalClient.psa_source : null,
      portal_account_id: String(portalClient.portal_account_id ?? ""),
      notify_ticket_updates:
        (portalClient.notify_ticket_updates as boolean | null | undefined) ?? false,
      notify_project_updates:
        (portalClient.notify_project_updates as boolean | null | undefined) ?? false,
    },
    account: {
      id: String(ownerAccount.id ?? ""),
      slug: String(ownerAccount.slug ?? ""),
      display_name: null,
      user_id: String(ownerAccount.user_id ?? ""),
    },
  };
}
