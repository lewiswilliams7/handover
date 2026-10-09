import { NextResponse } from "next/server";

import { decrypt } from "@/lib/encryption";
import { getHaloToken } from "@/lib/halo";
import { invalidateHaloTokenCache } from "@/lib/halo-token-cache";
import { isProUser } from "@/lib/plans";
import { createServerClient } from "@/lib/supabase/server";

function normalizeHaloBase(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

async function probeHaloClientsApi(base: string, accessToken: string): Promise<Response> {
  // Try /api/Clients first
  const clientsRes = await fetch(
    `${base}/api/Clients?pageinate=true&page_size=1&page_no=1&includeinactive=false`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
  );

  // If 404, try /api/Customer as fallback (some on-prem versions use different endpoint)
  if (clientsRes.status === 404) {
    const customerRes = await fetch(
      `${base}/api/Customer?pageinate=true&page_size=1&page_no=1`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    );
    if (customerRes.ok) return customerRes;

    // Try /api/tickets as final fallback — if this works the API is live
    const ticketsRes = await fetch(
      `${base}/api/tickets?pageinate=true&page_size=1&page_no=1`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    );
    return ticketsRes;
  }

  return clientsRes;
}

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!(await isProUser(supabase, user.id))) {
      return NextResponse.json({ error: "pro_required" }, { status: 403 });
    }

    const { data: conn, error } = await supabase
      .from("halo_connections")
      .select("halo_url, tenant, client_id, client_secret_encrypted")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !conn) {
      return NextResponse.json({ error: "HaloPSA is not connected yet." }, { status: 400 });
    }

    const base = normalizeHaloBase(conn.halo_url);
    let clientSecret: string;
    try {
      clientSecret = decrypt(conn.client_secret_encrypted);
    } catch (decErr) {
      console.error("[halo/test] decrypt client_secret failed:", decErr);
      return NextResponse.json(
        { error: "Stored HaloPSA credentials could not be read. Please reconnect." },
        { status: 400 },
      );
    }

    const creds = {
      haloUrl: conn.halo_url,
      tenant: conn.tenant,
      clientId: conn.client_id,
      clientSecret,
    };

    let token = await getHaloToken(creds);
    let res = await probeHaloClientsApi(base, token);

    if (res.status === 401) {
      console.warn("[halo/test] Clients probe returned 401  -  invalidating token cache and retrying once");
      invalidateHaloTokenCache(creds);
      token = await getHaloToken(creds);
      res = await probeHaloClientsApi(base, token);
    }

    if (res.status === 404) {
      return NextResponse.json(
        { error: "HaloPSA API endpoint not found (404). Please ensure your API application has read permissions enabled in HaloPSA under Configuration > Integrations > HaloPSA API. If you are on an on-prem instance, verify the API is enabled and accessible." },
        { status: 400 },
      );
    }

    if (!res.ok) {
      const snippet = await res.text().catch(() => "");
      console.error("[halo/test] Clients probe failed", res.status, snippet.slice(0, 400));
      if (res.status === 401) {
        return NextResponse.json(
          { error: "HaloPSA rejected the access token. Please reconnect or check API permissions." },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: `HaloPSA API check failed (${res.status}).` },
        { status: 400 },
      );
    }

    const { error: touchError } = await supabase
      .from("halo_connections")
      .update({ updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    if (touchError) {
      console.warn("[halo/test] could not record successful connection check:", touchError.message);
    }

    return NextResponse.json({ ok: true, message: "Connection successful" });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to connect to HaloPSA.";
    console.error("[halo/test] unexpected:", e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
