import { NextResponse } from "next/server";

import { decrypt } from "@/lib/encryption";
import {
  getHaloProjects,
  getHaloTickets,
  getHaloToken,
} from "@/lib/halo";
import { isProUser } from "@/lib/plans";
import { createServerClient } from "@/lib/supabase/server";

type Body = {
  type?: "tickets" | "projects";
  clientIds?: number[];
  dateFrom?: string;
  dateTo?: string;
};

function isOpenHaloStatus(statusName: string | null | undefined): boolean {
  const s = (statusName ?? "").trim().toLowerCase();
  return !/resolved|closed|completed|cancelled|canceled|done/.test(s);
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!(await isProUser(supabase, user.id))) {
      return NextResponse.json({ error: "pro_required" }, { status: 403 });
    }

    const { data: conn, error: connErr } = await supabase
      .from("halo_connections")
      .select("halo_url, tenant, client_id, client_secret_encrypted")
      .eq("user_id", user.id)
      .maybeSingle();

    if (connErr || !conn) {
      return NextResponse.json({ error: "HaloPSA is not connected yet." }, { status: 400 });
    }

    let clientSecret: string;
    try {
      clientSecret = decrypt(conn.client_secret_encrypted);
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Could not authenticate with HaloPSA. Check your Client ID and Secret.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const body = (await req.json()) as Body;
    const clientIds = Array.isArray(body.clientIds)
      ? body.clientIds.filter((x): x is number => typeof x === "number" && Number.isFinite(x))
      : [];

    const cacheHeaders = {
      "Cache-Control": "private, max-age=300",
    };

    if (clientIds.length === 0) {
      return NextResponse.json({ counts: {} as Record<string, number> }, { headers: cacheHeaders });
    }

    let token = "";
    try {
      token = await getHaloToken({
        haloUrl: conn.halo_url,
        tenant: conn.tenant,
        clientId: conn.client_id,
        clientSecret,
      });
    } catch {
      return NextResponse.json(
        { error: "HaloPSA credentials are invalid. Please reconnect." },
        { status: 400 },
      );
    }

    const mode = body.type === "projects" ? "projects" : "tickets";
    const counts: Record<string, number> = {};

    if (mode === "tickets") {
      try {
        const allTickets = await getHaloTickets(token, conn.halo_url, {
          dateFrom: body.dateFrom,
          dateTo: body.dateTo,
          count: 3000,
          minimalTicketPayload: true,
        });
        const openTickets = allTickets.filter((t) => isOpenHaloStatus(t.status?.name));
        for (const cid of clientIds) {
          counts[String(cid)] = openTickets.filter(
            (t) => t.clientId != null && Number(t.clientId) === cid,
          ).length;
        }
      } catch {
        for (const cid of clientIds) {
          counts[String(cid)] = 0;
        }
      }
      return NextResponse.json({ counts }, { headers: cacheHeaders });
    }

    try {
      const allProjects = await getHaloProjects(conn.halo_url, token, {
        clientIds,
        dateFrom: body.dateFrom,
        dateTo: body.dateTo,
      });

      for (const cid of clientIds) {
        counts[String(cid)] = allProjects.filter((p) => {
          const pid =
            (p as any).clientId ??
            (p as any).client_id ??
            (p as any).clientid ??
            (p as any).client?.id;
          return pid != null && Number(pid) === cid;
        }).length;
      }
    } catch {
      for (const cid of clientIds) {
        counts[String(cid)] = 0;
      }
    }

    return NextResponse.json({ counts }, { headers: cacheHeaders });
  } catch {
    return NextResponse.json({ error: "Failed to fetch client counts." }, { status: 500 });
  }
}
