import { randomBytes } from "crypto";

import { NextResponse } from "next/server";

import { sendPortalPasswordResetEmail } from "@/lib/emails";
import { PORTAL_SESSION_DAYS } from "@/lib/server/portal-customer-session";
import { hashPortalPassword } from "@/lib/server/portal-password";
import { setPortalSessionCookie } from "@/lib/server/portal-session-cookie";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      msp_slug?: string;
      client_slug?: string;
      token?: string;
      password?: string;
    };

    const admin = createServiceRoleClient();

    if (body.token && body.password) {
      const token = String(body.token).trim();
      const password = String(body.password);
      if (password.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
      }
      const nowIso = new Date().toISOString();
      const { data: user, error: uErr } = await admin
        .from("portal_client_users")
        .select("id, portal_client_id, password_reset_token, password_reset_expires_at")
        .eq("password_reset_token", token)
        .maybeSingle();
      if (uErr || !user?.id) {
        return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });
      }
      const exp = user.password_reset_expires_at as string | null;
      if (!exp || exp <= nowIso) {
        return NextResponse.json({ error: "Reset link has expired." }, { status: 400 });
      }

      const hash = await hashPortalPassword(password);
      await admin
        .from("portal_client_users")
        .update({
          password_hash: hash,
          password_reset_token: null,
          password_reset_expires_at: null,
          last_login_at: nowIso,
        })
        .eq("id", user.id);

      const { data: client } = await admin
        .from("portal_clients")
        .select("id, slug, portal_account_id")
        .eq("id", user.portal_client_id)
        .maybeSingle();
      if (!client?.portal_account_id) {
        return NextResponse.json({ error: "Client not found." }, { status: 500 });
      }
      const { data: account } = await admin
        .from("portal_accounts")
        .select("slug")
        .eq("id", client.portal_account_id)
        .maybeSingle();
      if (!account?.slug) {
        return NextResponse.json({ error: "Account not found." }, { status: 500 });
      }

      const sessionToken = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + PORTAL_SESSION_DAYS * 24 * 3600 * 1000).toISOString();
      await admin.from("portal_client_sessions").insert({
        portal_client_user_id: user.id,
        token: sessionToken,
        expires_at: expiresAt,
        last_used_at: nowIso,
      });

      const res = NextResponse.json({
        ok: true,
        msp_slug: String(account.slug),
        client_slug: String(client.slug),
      });
      setPortalSessionCookie(res, sessionToken);
      return res;
    }

    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const mspSlug = String(body.msp_slug ?? "")
      .trim()
      .toLowerCase();
    const clientSlug = String(body.client_slug ?? "")
      .trim()
      .toLowerCase();
    if (!email || !mspSlug || !clientSlug) {
      return NextResponse.json({ error: "email, msp_slug, and client_slug are required." }, { status: 400 });
    }

    const { data: account } = await admin
      .from("portal_accounts")
      .select("id, slug, user_id, enabled")
      .eq("slug", mspSlug)
      .maybeSingle();
    if (!account?.id || account.enabled === false) {
      return NextResponse.json({ ok: true });
    }

    const { data: client } = await admin
      .from("portal_clients")
      .select("id, slug, enabled")
      .eq("portal_account_id", account.id)
      .eq("slug", clientSlug)
      .maybeSingle();
    if (!client?.id || client.enabled === false) {
      return NextResponse.json({ ok: true });
    }

    const { data: user } = await admin
      .from("portal_client_users")
      .select("id, email")
      .eq("portal_client_id", client.id)
      .eq("email", email)
      .maybeSingle();
    if (!user?.id) {
      return NextResponse.json({ ok: true });
    }

    const resetToken = randomBytes(32).toString("hex");
    const resetExp = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    await admin
      .from("portal_client_users")
      .update({
        password_reset_token: resetToken,
        password_reset_expires_at: resetExp,
      })
      .eq("id", user.id);

    const { data: profile } = await admin
      .from("profiles")
      .select("company_name, display_name, brand_name, brand_logo_url, white_label_mode, plan")
      .eq("id", account.user_id)
      .maybeSingle();

    await sendPortalPasswordResetEmail({
      to: email,
      mspSlug: String(account.slug),
      clientSlug: String(client.slug),
      resetToken,
      mspProfile: profile,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[portal/auth/reset-password]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
