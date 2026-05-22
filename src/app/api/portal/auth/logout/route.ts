import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { PORTAL_SESSION_COOKIE } from "@/lib/server/portal-customer-session";
import { clearPortalSessionCookie } from "@/lib/server/portal-session-cookie";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function POST() {
  try {
    const jar = await cookies();
    const token = jar.get(PORTAL_SESSION_COOKIE)?.value?.trim();
    const admin = createServiceRoleClient();
    if (token) {
      await admin.from("portal_client_sessions").delete().eq("token", token);
    }
    const res = NextResponse.json({ ok: true });
    clearPortalSessionCookie(res);
    return res;
  } catch (e) {
    console.error("[portal/auth/logout]", e);
    const res = NextResponse.json({ ok: true });
    clearPortalSessionCookie(res);
    return res;
  }
}
