import { randomBytes } from "crypto";

import { NextResponse } from "next/server";

import { verifyPortalPassword } from "@/lib/server/portal-password";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { setPortalSessionCookie } from "@/lib/server/portal-session-cookie";
import { PORTAL_SESSION_DAYS } from "@/lib/server/portal-customer-session";

export const runtime = "nodejs";

type PortalClientUserRow = {
  id: string;
  portal_client_id: string;
  password_hash: string | null;
  enabled: boolean | null;
  invite_accepted_at: string | null;
};

async function createPortalSessionForUser(
  admin: ReturnType<typeof createServiceRoleClient>,
  userId: string,
): Promise<{ token: string } | null> {
  const sessionToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + PORTAL_SESSION_DAYS * 24 * 3600 * 1000).toISOString();
  const { error: sErr } = await admin.from("portal_client_sessions").insert({
    portal_client_user_id: userId,
    token: sessionToken,
    expires_at: expiresAt,
    last_used_at: new Date().toISOString(),
  });
  if (sErr) {
    console.error("[portal/auth/login] session insert:", sErr.message);
    return null;
  }
  return { token: sessionToken };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      msp_slug?: string;
      client_slug?: string;
      email?: string;
      password?: string;
    };
    const mspSlug = String(body.msp_slug ?? "")
      .trim()
      .toLowerCase();
    const clientSlug = String(body.client_slug ?? "")
      .trim()
      .toLowerCase();
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(body.password ?? "");
    if (!mspSlug || !email || !password) {
      return NextResponse.json({ error: "Missing fields." }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    const { data: account, error: aErr } = await admin
      .from("portal_accounts")
      .select("id, slug, enabled")
      .eq("slug", mspSlug)
      .maybeSingle();
    if (aErr || !account?.id || account.enabled === false) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    let resolvedClientSlug = clientSlug;
    let portalUser: PortalClientUserRow | null = null;

    if (clientSlug) {
      const { data: client, error: cErr } = await admin
        .from("portal_clients")
        .select("id, slug, enabled")
        .eq("portal_account_id", account.id)
        .eq("slug", clientSlug)
        .maybeSingle();
      if (cErr || !client?.id || client.enabled === false) {
        return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
      }
      resolvedClientSlug = String(client.slug ?? clientSlug);

      const { data: user, error: uErr } = await admin
        .from("portal_client_users")
        .select("id, portal_client_id, password_hash, enabled, invite_accepted_at")
        .eq("portal_client_id", client.id)
        .eq("email", email)
        .maybeSingle();
      if (uErr || !user?.id || user.enabled === false) {
        return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
      }
      portalUser = user as PortalClientUserRow;
    } else {
      const { data: clients, error: clientsErr } = await admin
        .from("portal_clients")
        .select("id, slug, enabled")
        .eq("portal_account_id", account.id);
      if (clientsErr) {
        return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
      }
      const enabledClients = (clients ?? []).filter((c) => c.enabled !== false && c.id && c.slug);
      const clientIds = enabledClients.map((c) => String(c.id));
      if (clientIds.length === 0) {
        return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
      }

      const { data: candidates, error: candErr } = await admin
        .from("portal_client_users")
        .select("id, portal_client_id, password_hash, enabled, invite_accepted_at")
        .eq("email", email)
        .in("portal_client_id", clientIds);
      if (candErr) {
        return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
      }

      const eligible = (candidates ?? []).filter(
        (u) => u.id && u.enabled !== false && u.invite_accepted_at,
      ) as PortalClientUserRow[];

      const passwordMatches: PortalClientUserRow[] = [];
      for (const candidate of eligible) {
        const ok = await verifyPortalPassword(password, candidate.password_hash);
        if (ok) passwordMatches.push(candidate);
      }

      if (passwordMatches.length === 0) {
        return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
      }
      if (passwordMatches.length > 1) {
        return NextResponse.json(
          {
            error:
              "Multiple portal accounts found for this email. Use the client-specific link from your MSP.",
          },
          { status: 403 },
        );
      }

      portalUser = passwordMatches[0]!;
      const clientRow = enabledClients.find((c) => String(c.id) === portalUser!.portal_client_id);
      if (!clientRow?.slug) {
        return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
      }
      resolvedClientSlug = String(clientRow.slug).trim().toLowerCase();
    }

    if (!portalUser?.id) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }
    if (!portalUser.invite_accepted_at) {
      return NextResponse.json(
        { error: "Please accept your invite and set a password first." },
        { status: 403 },
      );
    }

    if (clientSlug) {
      const ok = await verifyPortalPassword(password, portalUser.password_hash);
      if (!ok) {
        return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
      }
    }

    const session = await createPortalSessionForUser(admin, portalUser.id);
    if (!session) {
      return NextResponse.json({ error: "Could not create session." }, { status: 500 });
    }

    const now = new Date().toISOString();
    await admin.from("portal_client_users").update({ last_login_at: now }).eq("id", portalUser.id);

    const res = NextResponse.json({ ok: true, client_slug: resolvedClientSlug });
    setPortalSessionCookie(res, session.token);
    return res;
  } catch (e) {
    console.error("[portal/auth/login]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
