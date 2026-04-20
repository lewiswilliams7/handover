import { NextResponse } from "next/server";

import { decrypt } from "@/lib/encryption";
import { getHaloToken } from "@/lib/halo";
import { isProUser } from "@/lib/plans";
import { createServerClient } from "@/lib/supabase/server";

function normalizeHaloBase(url: string): string {
  const normalized = url.trim().replace(/\/+$/, "");
  if (!/^https:\/\/[^/]+$/i.test(normalized)) {
    throw new Error("Halo URL should be https://yourcompany.halopsa.com");
  }
  return normalized;
}

function mapClientRow(c: Record<string, unknown>): { id: number; name: string } {
  const rawId = c.id;
  const id = typeof rawId === "number" ? rawId : Number(rawId);
  const name =
    (typeof c.name === "string" ? c.name : null) ??
    (typeof c.clientname === "string" ? c.clientname : "") ??
    "";
  return { id: Number.isFinite(id) ? id : 0, name };
}

function extractClientsPayload(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.clients)) return o.clients;
    if (Array.isArray(o.result)) return o.result;
    if (Array.isArray(o.data)) return o.data;
  }
  return [];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pageRaw = searchParams.get("page") ?? "1";
    const pageSizeRaw = searchParams.get("page_size") ?? "100";
    const page = Math.max(1, Number.parseInt(pageRaw, 10) || 1);
    const pageSize = Math.min(200, Math.max(1, Number.parseInt(pageSizeRaw, 10) || 100));

    console.log("[halo/clients] params:", { page, pageSize });

    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log("[halo/clients] user:", user?.id ?? "(none)", "error:", authError?.message ?? "(none)");

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!(await isProUser(supabase, user.id))) {
      return NextResponse.json({ error: "pro_required" }, { status: 403 });
    }

    const { data: connection, error: connError } = await supabase
      .from("halo_connections")
      .select("halo_url, tenant, client_id, client_secret_encrypted")
      .eq("user_id", user.id)
      .maybeSingle();

    console.log(
      "[halo/clients] connection:",
      connection ? "found" : "not found",
      "error:",
      connError?.message ?? "(none)",
    );

    if (connError || !connection) {
      return NextResponse.json({ error: "No HaloPSA connection" }, { status: 404 });
    }

    console.log("[halo/clients] connection fields:", Object.keys(connection));

    let haloUrl: string;
    try {
      haloUrl = normalizeHaloBase(connection.halo_url);
    } catch {
      return NextResponse.json({ error: "Invalid HaloPSA URL stored for this account." }, { status: 400 });
    }

    let clientSecret: string;
    try {
      clientSecret = decrypt(connection.client_secret_encrypted);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not decrypt Halo credentials.";
      console.error("[halo/clients] decrypt error:", message);
      return NextResponse.json({ error: message }, { status: 400 });
    }

    let token: string;
    try {
      token = await getHaloToken({
        haloUrl: connection.halo_url,
        tenant: connection.tenant,
        clientId: connection.client_id,
        clientSecret,
      });
      console.log("[halo/clients] token:", "obtained (cached or fresh)");
    } catch (e) {
      console.error("[halo/clients] token error:", e instanceof Error ? e.message : e);
      return NextResponse.json({ error: "Failed to get HaloPSA token" }, { status: 500 });
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const primaryUrl = `${haloUrl}/api/Client?pageinate=true&page_size=${pageSize}&page_no=${page}&includeinactive=false`;
    console.log("[halo/clients] fetching:", primaryUrl);

    const clientsRes = await fetch(primaryUrl, { headers, cache: "no-store" });
    console.log("[halo/clients] clients status:", clientsRes.status);

    if (!clientsRes.ok) {
      const errText = await clientsRes.text();
      console.error("[halo/clients] clients error:", errText.slice(0, 500));

      const altUrl = `${haloUrl}/api/Clients?pageinate=true&page_size=${pageSize}&page_no=${page}&includeinactive=false`;
      console.log("[halo/clients] trying alt:", altUrl);

      const altRes = await fetch(altUrl, { headers, cache: "no-store" });
      console.log("[halo/clients] alt status:", altRes.status);

      if (!altRes.ok) {
        const altErr = await altRes.text();
        console.error("[halo/clients] alt error:", altErr.slice(0, 500));
        return NextResponse.json(
          { error: "HaloPSA clients API error", status: clientsRes.status },
          { status: 500 },
        );
      }

      const altData: unknown = await altRes.json();
      const altRaw = extractClientsPayload(altData);
      const altRecordCount =
        altData && typeof altData === "object" && "record_count" in altData
          ? (altData as { record_count?: unknown }).record_count
          : null;
      const totalNum =
        typeof altRecordCount === "number"
          ? altRecordCount
          : typeof altRecordCount === "string"
            ? Number.parseInt(altRecordCount, 10)
            : altRaw.length;

      console.log("[halo/clients] alt clients:", altRaw.length);

      return NextResponse.json({
        clients: altRaw.map((c) => mapClientRow(c as Record<string, unknown>)),
        hasMore: altRaw.length >= pageSize,
        page,
        total: Number.isFinite(totalNum) ? totalNum : altRaw.length,
      });
    }

    const data: unknown = await clientsRes.json();
    console.log(
      "[halo/clients] response keys:",
      data && typeof data === "object" && !Array.isArray(data) ? Object.keys(data as object) : "(array)",
    );

    const clientsRaw = extractClientsPayload(data);
    console.log("[halo/clients] clients found:", clientsRaw.length);

    if (clientsRaw.length > 0) {
      console.log("[halo/clients] first client:", JSON.stringify(clientsRaw[0]));
    }

    const recordCount =
      data && typeof data === "object" && !Array.isArray(data)
        ? (data as Record<string, unknown>).record_count ??
          (data as Record<string, unknown>).recordCount ??
          (data as Record<string, unknown>).total
        : null;
    const total =
      typeof recordCount === "number"
        ? recordCount
        : typeof recordCount === "string"
          ? Number.parseInt(recordCount, 10)
          : clientsRaw.length;

    return NextResponse.json({
      clients: clientsRaw.map((c) => mapClientRow(c as Record<string, unknown>)),
      hasMore: typeof total === "number" && Number.isFinite(total) ? page * pageSize < total : clientsRaw.length >= pageSize,
      page,
      total: Number.isFinite(total) ? total : clientsRaw.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[halo/clients] EXCEPTION:", message);
    if (stack) console.error("[halo/clients] STACK:", stack);
    return NextResponse.json({ error: "Internal server error", message }, { status: 500 });
  }
}
