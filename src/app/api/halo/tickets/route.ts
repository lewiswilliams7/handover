import { NextResponse } from "next/server";

import { decrypt } from "@/lib/encryption";
import {
  clearHaloProjectsCache,
  clearHaloTicketsCache,
  formatProjectsForHandover,
  formatTicketsForHandover,
  getHaloProjects,
  getHaloTickets,
  getHaloTicketsCached,
  getHaloToken,
} from "@/lib/halo";
import { getPlanTierServer, verifyUserPlan } from "@/lib/server/verifyUserPlan";
import { createServerClient } from "@/lib/supabase/server";

type TicketsBody = {
  type?: "tickets" | "projects";
  clientId?: number;
  /** When set (non-empty), only these clients' tickets/projects are fetched. */
  clientIds?: number[];
  projectId?: number;
  statusId?: number;
  dateFrom?: string;
  dateTo?: string;
  count?: number;
  keyword?: string;
  /** When false, skips per-ticket detail fetches (faster, for list/QBR use cases). Defaults to true for backwards compatibility. */
  includeDetails?: boolean;
};

function logTicketsRoute(...args: unknown[]) {
  console.log("[halo/tickets POST]", ...args);
}

function logTicketsRouteError(...args: unknown[]) {
  console.error("[halo/tickets POST]", ...args);
}

export async function POST(req: Request) {
  try {
    const refreshRequested =
      new URL(req.url).searchParams.get("refresh") === "1";
    if (refreshRequested) {
      clearHaloProjectsCache();
      clearHaloTicketsCache();
      logTicketsRoute("refresh=1 - cleared Halo projects and tickets cache");
    }

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    logTicketsRoute("auth getUser:", user?.id ?? "(none)");

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
      const planFields = await verifyUserPlan(user.id);
      if (getPlanTierServer(planFields) < 1) {
        logTicketsRoute("rejected: pro_required for user", user.id);
        return NextResponse.json({ error: "pro_required" }, { status: 403 });
      }
    } catch (e) {
      console.error("[halo/tickets] verifyUserPlan:", e);
      return NextResponse.json({ error: "Could not verify subscription." }, { status: 500 });
    }

    let body: TicketsBody = {};
    try {
      const raw = await req.text();
      if (raw.trim()) {
        body = JSON.parse(raw) as TicketsBody;
      }
    } catch (parseErr) {
      logTicketsRouteError("POST body JSON parse failed:", parseErr);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { data: conn, error: connErr } = await supabase
      .from("halo_connections")
      .select("halo_url, tenant, client_id, client_secret_encrypted")
      .eq("user_id", user.id)
      .maybeSingle();

    logTicketsRoute(
      "halo_connections:",
      conn ? "found" : "not found",
      connErr?.message ? `error: ${connErr.message}` : "",
    );

    if (connErr || !conn) {
      return NextResponse.json({ error: "HaloPSA is not connected yet." }, { status: 400 });
    }

    let clientSecret: string;
    try {
      clientSecret = decrypt(conn.client_secret_encrypted);
    } catch (e) {
      logTicketsRouteError("decrypt client_secret failed:", e);
      const message =
        e instanceof Error
          ? e.message
          : "Could not authenticate with HaloPSA. Check your Client ID and Secret.";
      return NextResponse.json(
        { error: message },
        { status: 400 },
      );
    }
    const clientIds = Array.isArray(body.clientIds)
      ? body.clientIds.filter((x): x is number => typeof x === "number" && Number.isFinite(x))
      : [];

    logTicketsRoute("request body:", {
      type: body.type,
      clientIdsLength: clientIds.length,
      clientIds: clientIds.length <= 20 ? clientIds : `${clientIds.slice(0, 5).join(",")}…(+${clientIds.length})`,
      clientId: body.clientId,
      dateFrom: body.dateFrom,
      dateTo: body.dateTo,
      count: body.count,
      projectId: body.projectId,
      statusId: body.statusId,
      keyword: body.keyword,
    });

    let token = "";
    try {
      token = await getHaloToken({
        haloUrl: conn.halo_url,
        tenant: conn.tenant,
        clientId: conn.client_id,
        clientSecret,
      });
      logTicketsRoute("token:", token ? "obtained" : "empty");
    } catch (tokenErr) {
      logTicketsRouteError("getHaloToken failed:", tokenErr);
      return NextResponse.json(
        { error: "HaloPSA credentials are invalid. Please reconnect." },
        { status: 400 },
      );
    }

    const type = body.type === "projects" ? "projects" : "tickets";
    const includeDetails = body.includeDetails !== false;
    try {
      if (type === "projects") {
        const selectedClientIds =
          clientIds.length > 0
            ? clientIds
            : typeof body.clientId === "number"
              ? [body.clientId]
              : undefined;

        const projects = await getHaloProjects(conn.halo_url, token, {
          clientIds: selectedClientIds,
          count: body.count,
          dateFrom: body.dateFrom,
          dateTo: body.dateTo,
        });

        console.log("[Halo API /api/halo/tickets] POST projects:", {
          fetched: projects.length,
          selectedClientIds,
          dateFrom: body.dateFrom,
          dateTo: body.dateTo,
        });

        if (projects.length === 0) {
          return NextResponse.json({
            type,
            projects: [],
            formatted: formatProjectsForHandover([], []),
            debug:
              "No projects found - check read:projects permission in HaloPSA",
          });
        }
        return NextResponse.json({
          type,
          projects,
          formatted: formatProjectsForHandover(
            projects,
            projects.map(() => ({
              name: true,
              description: true,
              tasks: true,
              notes: true,
            })),
          ),
        });
      }

      const singleClientId =
        clientIds.length === 1 ? clientIds[0] : clientIds.length === 0 ? body.clientId : undefined;

      if (clientIds.length > 1) {
        const fetchLimit = Math.max(body.count ?? 0, 200);
        const allTickets = await getHaloTickets(token, conn.halo_url, {
          dateFrom: body.dateFrom,
          dateTo: body.dateTo,
          count: fetchLimit,
          projectId: body.projectId,
          statusId: body.statusId,
          keyword: body.keyword,
          includeDetails,
        });
        const idSet = new Set(clientIds);
        const merged = allTickets.filter(
          (t) => t.clientId != null && idSet.has(Number(t.clientId)),
        );
        console.log(
          "[tickets] all tickets fetched:",
          allTickets.length,
          "filtered to:",
          merged.length,
          "for clients:",
          clientIds,
        );
        if (merged.length === 0) {
          return NextResponse.json({
            type,
            tickets: [],
            formatted: formatTicketsForHandover([], []),
            debug:
              "No tickets for the selected clients in this date range. Try expanding the range or filters.",
          });
        }
        return NextResponse.json({
          type,
          tickets: merged,
          formatted: formatTicketsForHandover(
            merged,
            merged.map(() => ({
              summary: true,
              description: true,
              actions: true,
              notes: true,
              assignee: true,
            })),
          ),
        });
      }

      logTicketsRoute("single batch getHaloTickets:", {
        clientId: singleClientId ?? "(all)",
        dateFrom: body.dateFrom,
        dateTo: body.dateTo,
        count: body.count,
      });
      let tickets: Awaited<ReturnType<typeof getHaloTickets>>;
      if (!includeDetails) {
        tickets = await getHaloTicketsCached(token, conn.halo_url, {
          clientId: singleClientId,
          count: body.count,
          dateFrom: body.dateFrom,
          dateTo: body.dateTo,
          statusId: body.statusId,
        });
      } else {
        tickets = await getHaloTickets(token, conn.halo_url, {
          clientId: singleClientId,
          projectId: body.projectId,
          statusId: body.statusId,
          dateFrom: body.dateFrom,
          dateTo: body.dateTo,
          count: body.count,
          keyword: body.keyword,
          includeDetails: true,
        });
      }
      logTicketsRoute("single batch tickets count:", tickets.length);
      const rawNotes0 = tickets[0]?.notes;
      if (Array.isArray(rawNotes0) && rawNotes0.length > 0) {
        console.log(
          "[notes] Raw note:",
          JSON.stringify(rawNotes0[0], null, 2),
        );
      }
      return NextResponse.json({
        type,
        tickets,
        formatted: formatTicketsForHandover(
          tickets,
          tickets.map(() => ({
            summary: true,
            description: true,
            actions: true,
            notes: true,
            assignee: true,
          })),
        ),
      });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to fetch HaloPSA data.";
      logTicketsRouteError("inner exception:", message, e instanceof Error ? e.stack : e);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to fetch HaloPSA data.";
    logTicketsRouteError("outer exception:", message, e instanceof Error ? e.stack : e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
