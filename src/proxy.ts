/** Next.js 16+ root proxy (replaces `middleware.ts`). */
import { shouldRedirectToVerifyEmailPage } from "@/lib/auth/email-verification-gate";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClientForMiddleware } from "@/lib/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Refreshes Supabase auth cookies on every matched request so server components and
 * `/api/*` routes see a valid session. Auth redirects here are **session-only** (no plan checks).
 * Plan allow-list for product logic lives in `src/lib/auth/authenticated-dashboard-plans.ts`.
 */

function pathnameRequiresConfirmedEmail(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname.startsWith("/dashboard")) return true;
  if (pathname.startsWith("/account")) return true;
  if (pathname.startsWith("/settings")) return true;
  if (pathname === "/onboarding") return true;
  return false;
}

function isAllowedBeforeEmailVerification(pathname: string): boolean {
  if (pathname.startsWith("/auth")) return true;
  if (pathname === "/onboarding/results") return true;
  return (
    pathname === "/api/auth/sign-in-hint" ||
    pathname === "/api/auth/scan-claim-redirect" ||
    pathname.startsWith("/api/auth/email-verification/")
  );
}

export async function proxy(request: NextRequest) {
  const { supabase, response } = createServerClientForMiddleware(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const mustVerify = user
    ? await shouldRedirectToVerifyEmailPage(
        (() => {
          try {
            return createServiceRoleClient();
          } catch {
            return supabase;
          }
        })(),
        user,
      )
    : false;

  if (user && mustVerify && pathname === "/") {
    let hasClaimedScan = false;
    try {
      const admin = createServiceRoleClient();
      const { data } = await admin
        .from("scan_sessions")
        .select("id")
        .eq("claimed_by_user_id", user.id)
        .eq("status", "claimed")
        .limit(1)
        .maybeSingle();
      hasClaimedScan = Boolean(data?.id);
    } catch {
      // Verification redirects must remain safe if the scan lookup is unavailable.
    }
    if (hasClaimedScan) {
      const resultsUrl = request.nextUrl.clone();
      resultsUrl.pathname = "/onboarding/results";
      resultsUrl.search = "";
      const redirectRes = NextResponse.redirect(resultsUrl);
      response.cookies.getAll().forEach((c) => {
        redirectRes.cookies.set(c.name, c.value);
      });
      return redirectRes;
    }
  }

  if (
    user &&
    mustVerify &&
    pathname.startsWith("/api") &&
    !isAllowedBeforeEmailVerification(pathname)
  ) {
    return NextResponse.json(
      { ok: false, error: "email_verification_required" },
      { status: 403 },
    );
  }

  if (
    user &&
    mustVerify &&
    pathnameRequiresConfirmedEmail(pathname) &&
    !isAllowedBeforeEmailVerification(pathname)
  ) {
    const verifyUrl = request.nextUrl.clone();
    verifyUrl.pathname = "/auth/verify-email";
    verifyUrl.search = "";
    const redirectRes = NextResponse.redirect(verifyUrl);
    response.cookies.getAll().forEach((c) => {
      redirectRes.cookies.set(c.name, c.value);
    });
    return redirectRes;
  }

  const isProtectedAccount =
    pathname === "/account" || pathname.startsWith("/account/");

  if (isProtectedAccount && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth";
    redirectUrl.search = "?tab=signin";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
