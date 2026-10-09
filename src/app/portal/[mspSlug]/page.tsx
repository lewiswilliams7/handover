import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import dynamic from "next/dynamic";

import { AuthForm } from "@/app/auth/auth-form";
import PageTransition from "@/components/PageTransition";
import { PortalMspCustomerLogin } from "@/components/portal-customer/portal-msp-customer-login";
import { resolveBrandLogoUrlForExcel } from "@/lib/branding-logo";
import { getPortalCustomerRedirectPath } from "@/lib/server/portal-customer-session";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

const HomeClient = dynamic(() => import("../../home-client"), { ssr: true });

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

type PageProps = {
  params: Promise<{ mspSlug: string }>;
  searchParams: Promise<{ customer?: string | string[] }>;
};

const SLUG_RE = /^[a-z0-9-]{3,30}$/;

function domainFromEmail(email: string | null | undefined): string {
  if (!email || typeof email !== "string") return "";
  const at = email.lastIndexOf("@");
  if (at <= -1 || at === email.length - 1) return "";
  return email.slice(at + 1).trim().toLowerCase();
}

function normalizeAllowedDomain(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return "";
  return raw.trim().toLowerCase().replace(/^@+/, "");
}

function isCustomerPortalMode(raw: string | string[] | undefined): boolean {
  if (raw === "1" || raw === "true") return true;
  if (Array.isArray(raw)) return raw.some((v) => v === "1" || v === "true");
  return false;
}

function PortalLogin({ mspSlug }: { mspSlug: string }) {
  return (
    <AuthForm
      initialAuthError={false}
      initialAuthCallbackError={false}
      initialConfirmationExpired={false}
      callbackFailureReason={null}
      initialTab="signin"
      returnTo={`/portal/${mspSlug}`}
    />
  );
}

export default async function PortalMspSlugPage({ params, searchParams }: PageProps) {
  const { mspSlug: rawMspSlug } = await params;
  const mspSlug = rawMspSlug.trim().toLowerCase();
  if (!SLUG_RE.test(mspSlug)) notFound();

  const admin = createServiceRoleClient();
  const { data: portal } = await admin
    .from("portal_accounts")
    .select("slug, enabled, allowed_domain, user_id, display_name")
    .eq("slug", mspSlug)
    .maybeSingle();

  if (!portal || portal.enabled === false) {
    notFound();
  }

  const customerRedirect = await getPortalCustomerRedirectPath(mspSlug);
  if (customerRedirect) {
    redirect(customerRedirect);
  }

  const sp = await searchParams;
  const customerMode = isCustomerPortalMode(sp.customer);

  if (customerMode) {
    let brandLogoUrl: string | null = null;
    let brandColour: string | null = null;
    let mspDisplayName =
      typeof portal.display_name === "string" && portal.display_name.trim()
        ? portal.display_name.trim()
        : "Your MSP";

    if (portal.user_id) {
      const { data: profile } = await admin
        .from("profiles")
        .select("company_name, display_name, brand_name, brand_colour, brand_logo_url")
        .eq("id", portal.user_id)
        .maybeSingle();
      if (profile) {
        mspDisplayName =
          (typeof profile.brand_name === "string" && profile.brand_name.trim()) ||
          (typeof profile.company_name === "string" && profile.company_name.trim()) ||
          (typeof profile.display_name === "string" && profile.display_name.trim()) ||
          mspDisplayName;
        brandColour = typeof profile.brand_colour === "string" ? profile.brand_colour : null;
        const rawLogo = typeof profile.brand_logo_url === "string" ? profile.brand_logo_url.trim() : "";
        if (rawLogo) {
          brandLogoUrl = (await resolveBrandLogoUrlForExcel(admin, rawLogo)) ?? rawLogo;
        }
      }
    }

    return (
      <PortalMspCustomerLogin
        mspSlug={mspSlug}
        mspDisplayName={mspDisplayName}
        brandLogoUrl={brandLogoUrl}
        brandColour={brandColour}
      />
    );
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <PortalLogin mspSlug={mspSlug} />;
  }

  const allowedDomain = normalizeAllowedDomain(portal.allowed_domain);
  const userDomain = domainFromEmail(user.email);
  const hasDomainRestriction = allowedDomain.length > 0;

  if (hasDomainRestriction && userDomain !== allowedDomain) {
    await supabase.auth.signOut();
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-180px)] w-full max-w-[760px] items-center px-4 py-12 md:min-h-[calc(100vh-180px)]">
        <div className="w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-6 text-center md:p-8">
          <h1 className="text-xl font-semibold text-[var(--text-primary)] md:text-2xl">Portal access restricted</h1>
          <p className="mt-3 text-[14px] leading-relaxed text-[var(--text-secondary)]">
            {`This portal is restricted to ${allowedDomain} accounts`}
          </p>
          <a
            href={`/auth?tab=signin&returnTo=${encodeURIComponent(`/portal/${mspSlug}`)}`}
            className="mt-5 inline-flex rounded-[var(--radius)] bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            Back to login
          </a>
        </div>
      </div>
    );
  }

  if (user?.id) {
    return (
      <PageTransition>
        <HomeClient />
      </PageTransition>
    );
  }
  return <PortalLogin mspSlug={mspSlug} />;
}
