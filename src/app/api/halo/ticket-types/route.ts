import { NextResponse } from "next/server";

import { decrypt } from "@/lib/encryption";
import { getHaloToken } from "@/lib/halo";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: connection, error: connErr } = await supabase
      .from("halo_connections")
      .select("halo_url, tenant, client_id, client_secret_encrypted")
      .eq("user_id", user.id)
      .maybeSingle();

    if (connErr || !connection) {
      return NextResponse.json({ error: "No connection" }, { status: 404 });
    }

    const clientSecret = decrypt(connection.client_secret_encrypted);
    const token = await getHaloToken({
      haloUrl: connection.halo_url,
      tenant: connection.tenant,
      clientId: connection.client_id,
      clientSecret,
    });

    const res = await fetch(`${connection.halo_url}/api/TicketType`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Halo TicketType failed (${res.status})`, details: text.slice(0, 300) },
        { status: 400 },
      );
    }

    const data: unknown = await res.json();
    const ticketTypes = (() => {
      if (Array.isArray(data)) return data;
      if (data && typeof data === "object") {
        const o = data as Record<string, unknown>;
        if (Array.isArray(o.tickettypes)) return o.tickettypes;
        if (Array.isArray(o.result)) return o.result;
      }
      return [];
    })();

    const normalized = ticketTypes
      .map((t) => {
        const o = t as Record<string, unknown>;
        return {
          id:
            typeof o.id === "number"
              ? o.id
              : typeof o.id === "string"
                ? Number.parseInt(o.id, 10)
                : NaN,
          name: typeof o.name === "string" ? o.name : "",
          use:
            typeof o.use === "string"
              ? o.use
              : typeof o.usedfor === "string"
                ? o.usedfor
                : "",
        };
      })
      .filter((t) => Number.isFinite(t.id));

    console.log("[ticket-types] found:", normalized.length);
    console.log(
      "[ticket-types] project types:",
      normalized
        .filter((t) => t.use.toLowerCase().includes("project"))
        .map((t) => ({ id: t.id, name: t.name, use: t.use })),
    );

    return NextResponse.json({ ticketTypes: normalized });
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error(String(err));
    console.error("[ticket-types] error:", e.message);
    console.error("[halo/ticket-types]", e);
    return NextResponse.json(
      { error: "Could not load ticket types. Please try again." },
      { status: 500 },
    );
  }
}

