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
  const rawId = c.id ?? c.client_id ?? c.clientid ?? c.ClientID ?? c.ClientId;
  const id =
    typeof rawId === "number"
      ? rawId
      : Number(typeof rawId === "string" ? rawId.trim() : String(rawId ?? "").trim());
  const name =
    (typeof c.name === "string" ? c.name : null) ??
    (typeof c.clientname === "string" ? c.clientname : null) ??
    (typeof c.client_name === "string" ? c.client_name : null) ??
    (typeof c.ClientName === "string" ? c.ClientName : null) ??
    "";
  const trimmed = String(name).trim();
  return { id: Number.isFinite(id) ? id : 0, name: trimmed };
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

function recordTotalFromPayload(data: unknown, fallbackLen: number): number {
  if (!data || typeof data !== "object" || Array.isArray(data)) return fallbackLen;
  const o = data as Record<string, unknown>;
  const rcPick = o.record_count ?? o.recordCount ?? o.total ?? o.TotalRecordCount;
  if (typeof rcPick === "number" && Number.isFinite(rcPick)) return rcPick;
  if (typeof rcPick === "string") {
    const n = Number.parseInt(rcPick, 10);
    if (Number.isFinite(n)) return n;
  }
  return fallbackLen;
}

type ListMode = "singular" | "plural";

function buildListUrl(haloUrl: string, mode: ListMode, pageNo: number, pageSize: number, count: number): string {
  const seg = mode === "singular" ? "Client" : "Clients";
  return `${haloUrl}/api/${seg}?count=${count}&page_size=${pageSize}&page_no=${pageNo}`;
}

async function fetchHaloListPage(
  haloUrl: string,
  headers: HeadersInit,
  mode: ListMode,
  pageNo: number,
  pageSize: number,
  count: number,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const url = buildListUrl(haloUrl, mode, pageNo, pageSize, count);
  const res = await fetch(url, { headers, cache: "no-store" });
  let data: unknown = null;
  if (res.ok) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  }
  return { ok: res.ok, status: res.status, data };
}

async function discoverListMode(
  haloUrl: string,
  headers: HeadersInit,
  pageSize: number,
  count: number,
): Promise<{ mode: ListMode; data: unknown } | null> {
  const s = await fetchHaloListPage(haloUrl, headers, "singular", 1, pageSize, count);
  if (s.ok && s.data) return { mode: "singular", data: s.data };
  const p = await fetchHaloListPage(haloUrl, headers, "plural", 1, pageSize, count);
  if (p.ok && p.data) return { mode: "plural", data: p.data };
  return null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const countRaw = searchParams.get("count") ?? "2500";
    const pageSizeRaw = searchParams.get("page_size") ?? countRaw;
    const qRaw = searchParams.get("q") ?? "";
    const q = qRaw.trim().toLowerCase();
    const count = Math.min(2500, Math.max(1, Number.parseInt(countRaw, 10) || 2500));
    const pageSize = Math.min(2500, Math.max(1, Number.parseInt(pageSizeRaw, 10) || count));

    console.log("[halo/clients] params:", { count, pageSize, q: q || undefined });

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
      return NextResponse.json({ clients: [] });
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const applyQ = (rows: { id: number; name: string }[]) =>
      q.length > 0
        ? rows.filter((c) => c.name.toLowerCase().includes(q) || String(c.id).includes(q))
        : rows;
    const discovered = await discoverListMode(haloUrl, headers, pageSize, count);
    if (!discovered) {
      console.error("[halo/clients] could not discover Client/Clients list endpoint");
      return NextResponse.json({ clients: [] });
    }

    const byId = new Map<number, { id: number; name: string }>();
    const mergeRows = (data: unknown) => {
      const rows = extractClientsPayload(data);
      for (const row of rows) {
        const mapped = mapClientRow(row as Record<string, unknown>);
        if (mapped.id > 0 && mapped.name.trim()) byId.set(mapped.id, mapped);
      }
      return rows.length;
    };

    const firstPageRowCount = mergeRows(discovered.data);
    let targetTotal = recordTotalFromPayload(discovered.data, firstPageRowCount);
    // Halo often returns fewer rows than requested page_size (e.g. 27 vs 2500) while record_count
    // reflects the full directory — do not treat a short page as the last page in that case.
    if (targetTotal <= firstPageRowCount) {
      targetTotal = Number.POSITIVE_INFINITY;
    }
    let pageNo = 2;
    const maxPages = 500;
    while (pageNo <= maxPages) {
      let pageRes: { ok: boolean; status: number; data: unknown };
      try {
        pageRes = await fetchHaloListPage(haloUrl, headers, discovered.mode, pageNo, pageSize, count);
      } catch (pageErr) {
        console.error("[halo/clients] page fetch threw:", pageNo, pageErr);
        break;
      }
      if (!pageRes.ok || !pageRes.data) {
        console.error("[halo/clients] page fetch failed:", pageNo, "status:", pageRes.status);
        break;
      }
      const sizeBefore = byId.size;
      const rowsThisPage = mergeRows(pageRes.data);
      if (rowsThisPage === 0) break;
      if (
        targetTotal === Number.POSITIVE_INFINITY &&
        byId.size === sizeBefore &&
        rowsThisPage > 0
      ) {
        break;
      }
      if (targetTotal !== Number.POSITIVE_INFINITY) {
        const reported = recordTotalFromPayload(pageRes.data, targetTotal);
        if (Number.isFinite(reported) && reported > targetTotal) {
          targetTotal = reported;
        }
        if (byId.size >= targetTotal) break;
      }
      pageNo += 1;
    }

    const sorted = [...byId.values()].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
    const filtered = applyQ(sorted);
    console.log("[halo/clients] total fetched:", sorted.length);
    return NextResponse.json({ clients: filtered });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[halo/clients] EXCEPTION:", message);
    if (stack) console.error("[halo/clients] STACK:", stack);
    return NextResponse.json({ clients: [] });
  }
}
