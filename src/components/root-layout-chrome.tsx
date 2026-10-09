"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { CookieConsentBar } from "@/components/cookie-consent-bar";
import { MarketingConversionClient } from "@/components/marketing-conversion-client";
import { MarketingFooter } from "@/components/marketing-footer";
import { Nav } from "@/components/nav";
import { MarketingBackgroundLayer, RouteTransition } from "@/components/route-transition";
import { createClient } from "@/lib/supabase/client";

type Props = {
  children: ReactNode;
};

export function RootLayoutChrome({ children }: Props) {
  const pathname = usePathname() ?? "";
  const isPortalRoute = pathname === "/portal" || pathname.startsWith("/portal/");
  const isDashboardRoute = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isAuthRoute = pathname === "/auth" || pathname.startsWith("/auth/");
  const isOnboardingRoute = pathname === "/onboarding" || pathname.startsWith("/onboarding/");
  const isMarketingRoute =
    pathname === "/pricing" ||
    pathname.startsWith("/pricing/") ||
    pathname === "/features" ||
    pathname.startsWith("/features/") ||
    pathname === "/about" ||
    pathname.startsWith("/about/") ||
    pathname === "/blog" ||
    pathname.startsWith("/blog/") ||
    pathname === "/solutions" ||
    pathname.startsWith("/solutions/") ||
    pathname === "/compare" ||
    pathname.startsWith("/compare/") ||
    pathname === "/partners" ||
    pathname.startsWith("/partners/") ||
    pathname === "/contact" ||
    pathname.startsWith("/contact/");
  const [isAuthed, setIsAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    const loadAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!mounted) return;
      setIsAuthed(Boolean(user));
      setAuthChecked(true);
    };

    void loadAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setIsAuthed(Boolean(session?.user));
      setAuthChecked(true);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const showMarketingChrome =
    !isPortalRoute &&
    !isDashboardRoute &&
    !isAuthRoute &&
    !isOnboardingRoute &&
    (isMarketingRoute || (authChecked && !isAuthed));

  return (
    <>
      {showMarketingChrome ? <MarketingBackgroundLayer /> : null}
      {showMarketingChrome ? <Nav /> : null}
      <main className="flex min-h-0 flex-1 flex-col">
        <RouteTransition>{children}</RouteTransition>
      </main>
      {showMarketingChrome ? (
        <>
          <div
            style={{
              height: "1px",
              background: "linear-gradient(90deg, transparent, var(--border), transparent)",
            }}
          />
          {pathname !== "/" ? <MarketingFooter /> : null}
          <CookieConsentBar />
          <MarketingConversionClient />
        </>
      ) : null}
    </>
  );
}

