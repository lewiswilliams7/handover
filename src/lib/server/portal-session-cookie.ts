import type { NextResponse } from "next/server";

import { PORTAL_SESSION_COOKIE, PORTAL_SESSION_DAYS } from "@/lib/server/portal-customer-session";

export function setPortalSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(PORTAL_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * PORTAL_SESSION_DAYS,
  });
}

export function clearPortalSessionCookie(res: NextResponse): void {
  res.cookies.set(PORTAL_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}
