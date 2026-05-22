import { randomBytes } from "crypto";

import { NextResponse } from "next/server";

import { PORTAL_SESSION_DAYS } from "@/lib/server/portal-customer-session";
import { hashPortalPassword } from "@/lib/server/portal-password";
import { setPortalSessionCookie } from "@/lib/server/portal-session-cookie";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      token?: string;
      password?: string;
    };
    const token = String(body.token ?? "").trim();
    const password = String(body.password ?? "");
    if (!token || password.length < 8) {
      return NextResponse.json({ error: "Token and password (8+ chars) required." }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    const nowIso = new Date().toISOString();
    const { data: user, error: uErr } = await admin
      .from("portal_client_users")
      .select("id, portal_client_id, invite_token, invite_token_expires_at, invite_accepted_at")
      .eq("invite_token", token)
      .maybeSingle();

    if (uErr || !user?.portal_client_id) {
      return NextResponse.json({ error: "Invalid or expired invite." }, { status: 400 });
    }
    if (user.invite_accepted_at) {
      return NextResponse.json({ error: "Invite already accepted." }, { status: 400 });
    }
    if (
      typeof user.invite_token_expires_at === "string" &&
      user.invite_token_expires_at <= nowIso
    ) {
      return NextResponse.json({ error: "Invite has expired." }, { status: 400 });
    }

    const hash = await hashPortalPassword(password);
    const { error: upErr } = await admin
      .from("portal_client_users")
      .update({
        password_hash: hash,
        invite_accepted_at: nowIso,
        invite_token: null,
        invite_token_expires_at: null,
        last_login_at: nowIso,
      })
      .eq("id", user.id);
    if (upErr) {
      console.error("[portal/auth/accept-invite] update:", upErr.message);
      return NextResponse.json({ error: "Could not save password." }, { status: 500 });
    }

    const { data: client, error: cErr } = await admin
      .from("portal_clients")
      .select("id, slug, portal_account_id")
      .eq("id", user.portal_client_id)
      .maybeSingle();
    if (cErr || !client?.portal_account_id) {
      return NextResponse.json({ error: "Client not found." }, { status: 500 });
    }

    const { data: account, error: aErr } = await admin
      .from("portal_accounts")
      .select("slug")
      .eq("id", client.portal_account_id)
      .maybeSingle();
    if (aErr || !account?.slug) {
      return NextResponse.json({ error: "Account not found." }, { status: 500 });
    }

    const sessionToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + PORTAL_SESSION_DAYS * 24 * 3600 * 1000).toISOString();
    const { error: sErr } = await admin.from("portal_client_sessions").insert({
      portal_client_user_id: user.id,
      token: sessionToken,
      expires_at: expiresAt,
      last_used_at: nowIso,
    });
    if (sErr) {
      console.error("[portal/auth/accept-invite] session:", sErr.message);
      return NextResponse.json({ error: "Could not create session." }, { status: 500 });
    }

    const res = NextResponse.json({
      ok: true,
      msp_slug: String(account.slug),
      client_slug: String(client.slug),
    });
    setPortalSessionCookie(res, sessionToken);
    return res;
  } catch (e) {
    console.error("[portal/auth/accept-invite]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
