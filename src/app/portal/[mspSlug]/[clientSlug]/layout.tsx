import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PortalBootstrapProvider } from "@/components/portal-customer/portal-bootstrap-context";
import { resolveBrandLogoUrlForExcel } from "@/lib/branding-logo";
import { resolvePortalClientBySlugs } from "@/lib/server/portal-customer-session";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type Props = { children: React.ReactNode; params: Promise<{ mspSlug: string; clientSlug: string }> };

export default async function ClientPortalLayout({ children, params }: Props) {
  const { mspSlug, clientSlug } = await params;
  const resolved = await resolvePortalClientBySlugs(mspSlug, clientSlug);
  if (!resolved) notFound();

  const admin = createServiceRoleClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("company_name, display_name, brand_name, brand_colour, brand_logo_url, white_label_mode")
    .eq("id", resolved.account.user_id)
    .maybeSingle();

  let profileForPortal: typeof profile = null;
  if (profile) {
    const rawLogo = typeof profile.brand_logo_url === "string" ? profile.brand_logo_url.trim() : "";
    const resolvedBrandLogo = rawLogo ? await resolveBrandLogoUrlForExcel(admin, rawLogo) : null;
    profileForPortal = {
      ...profile,
      brand_logo_url: resolvedBrandLogo ?? (rawLogo || null),
    };
  }

  const account = {
    id: String(resolved.account.id),
    slug: String(resolved.account.slug ?? ""),
    display_name: typeof resolved.account.display_name === "string" ? resolved.account.display_name : null,
    user_id: String(resolved.account.user_id ?? ""),
  };
  const client = {
    id: String(resolved.client.id),
    client_name: String(resolved.client.client_name ?? ""),
    slug: String(resolved.client.slug ?? ""),
    client_id: String(resolved.client.client_id ?? ""),
    logo_url: typeof resolved.client.logo_url === "string" ? resolved.client.logo_url : null,
    psa_source: typeof resolved.client.psa_source === "string" ? resolved.client.psa_source : null,
    visibility_tickets: resolved.client.visibility_tickets as boolean | null,
    visibility_projects: resolved.client.visibility_projects as boolean | null,
    visibility_rag: resolved.client.visibility_rag as boolean | null,
    visibility_reports: resolved.client.visibility_reports as boolean | null,
    visibility_ticket_notes:
      (resolved.client as { visibility_ticket_notes?: boolean | null }).visibility_ticket_notes ?? true,
    visibility_stats: (resolved.client as { visibility_stats?: boolean | null }).visibility_stats ?? true,
    visibility_priority_breakdown:
      (resolved.client as { visibility_priority_breakdown?: boolean | null }).visibility_priority_breakdown ??
      true,
    visibility_resolved_count:
      (resolved.client as { visibility_resolved_count?: boolean | null }).visibility_resolved_count ?? false,
    visibility_recent_activity:
      (resolved.client as { visibility_recent_activity?: boolean | null }).visibility_recent_activity ?? true,
  };

  return (
    <PortalBootstrapProvider value={{ account, client, profile: profileForPortal }}>
      <div
        className="min-h-screen text-[var(--text-primary)] antialiased"
        style={{
          backgroundColor: "var(--bg-primary)",
          fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui",
        }}
      >
        {children}
      </div>
    </PortalBootstrapProvider>
  );
}
