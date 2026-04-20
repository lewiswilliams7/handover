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
  return false;
}

export async function proxy(request: NextRequest) {
  const { supabase, response } = createServerClientForMiddleware(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (
    user &&
    (await shouldRedirectToVerifyEmailPage(
      (() => {
        try {
          return createServiceRoleClient();
        } catch {
          // Fail open to session client if service role is unavailable.
          return supabase;
        }
      })(),
      user,
    )) &&
    pathnameRequiresConfirmedEmail(pathname) &&
    !pathname.startsWith("/api")
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
