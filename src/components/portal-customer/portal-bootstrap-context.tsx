"use client";

import { createContext, useContext, type ReactNode } from "react";

export type PortalBootstrapAccount = {
  id: string;
  slug: string;
  display_name: string | null;
  user_id: string;
};

export type PortalBootstrapClient = {
  id: string;
  client_name: string;
  slug: string;
  client_id: string;
  logo_url: string | null;
  psa_source: string | null;
  visibility_tickets: boolean | null;
  visibility_projects: boolean | null;
  visibility_rag: boolean | null;
  visibility_reports: boolean | null;
  visibility_ticket_notes: boolean | null;
  visibility_stats?: boolean | null;
  visibility_priority_breakdown?: boolean | null;
  visibility_resolved_count?: boolean | null;
  visibility_recent_activity?: boolean | null;
};

export type PortalBootstrapProfile = {
  company_name?: string | null;
  display_name?: string | null;
  brand_name?: string | null;
  brand_colour?: string | null;
  brand_logo_url?: string | null;
  white_label_mode?: boolean | null;
} | null;

const PortalBootstrapContext = createContext<{
  account: PortalBootstrapAccount;
  client: PortalBootstrapClient;
  profile: PortalBootstrapProfile;
} | null>(null);

export function PortalBootstrapProvider({
  value,
  children,
}: {
  value: { account: PortalBootstrapAccount; client: PortalBootstrapClient; profile: PortalBootstrapProfile };
  children: ReactNode;
}) {
  return <PortalBootstrapContext.Provider value={value}>{children}</PortalBootstrapContext.Provider>;
}

export function usePortalBootstrap() {
  const v = useContext(PortalBootstrapContext);
  if (!v) throw new Error("usePortalBootstrap outside provider");
  return v;
}
