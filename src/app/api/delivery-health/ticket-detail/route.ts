import { NextResponse } from "next/server";

import { getCWAuthHeaders, getCWConnectionForUser } from "@/lib/cw-auth";
import { decrypt } from "@/lib/encryption";
import { getHaloToken, getTicketDetails, type HaloTicket } from "@/lib/halo";
import { userHasDeliveryHealthAccess } from "@/lib/plans";
import { createServerClient } from "@/lib/supabase/server";

type ConnectWiseDetailKind = "ticket" | "project" | null;

async function loadConnectWiseDetailResponse(
  userId: string,
  id: number,
  kind: ConnectWiseDetailKind,
) {
  try {
    const cwConn = await getCWConnectionForUser(userId);
    const headers = await getCWAuthHeaders(userId);

    if (kind !== "project") {
      const ticketRes = await fetch(
        `${cwConn.siteUrl}/v4_6_release/apis/3.0/service/tickets/${id}`,
        { headers, cache: "no-store" },
      );
      if (ticketRes.ok) {
        const ticketRaw = (await ticketRes.json().catch(() => ({}))) as Record<string, unknown>;
        const notesRes = await fetch(
          `${cwConn.siteUrl}/v4_6_release/apis/3.0/service/tickets/${id}/notes?pageSize=100`,
          { headers, cache: "no-store" },
        );
        const notesRaw = (await notesRes.json().catch(() => [])) as unknown;
        const notes = (Array.isArray(notesRaw)
          ? notesRaw
          : Array.isArray((notesRaw as { items?: unknown })?.items)
            ? (notesRaw as { items: unknown[] }).items
            : []
        ).map((n) => ({
          id: String((n as { id?: unknown }).id ?? ""),
          who: String((n as { createdBy?: unknown }).createdBy ?? "Unknown"),
          posted: String((n as { dateCreated?: unknown }).dateCreated ?? ""),
          note: String((n as { text?: unknown }).text ?? ""),
        }));
        const ticket: HaloTicket = {
          id,
          summary: String(ticketRaw.summary ?? `Ticket ${id}`),
          details: null,
          status: { name: String((ticketRaw.status as { name?: unknown } | null)?.name ?? "Open") },
          priority: {
            name: String((ticketRaw.priority as { name?: unknown } | null)?.name ?? "Normal"),
          },
          client: { name: String((ticketRaw.company as { name?: unknown } | null)?.name ?? "Unknown") },
          agent: { name: String((ticketRaw.owner as { name?: unknown } | null)?.name ?? "Unassigned") },
          dateoccurred:
            typeof ticketRaw.dateEntered === "string" ? ticketRaw.dateEntered : null,
          targetdate:
            typeof ticketRaw.requiredDate === "string" ? ticketRaw.requiredDate : null,
          timetaken:
            typeof ticketRaw.actualHours === "number" ? ticketRaw.actualHours : 0,
          notes,
        } as HaloTicket;
        return NextResponse.json({ ticket });
      }
      if (kind === "ticket") {
        return NextResponse.json({ error: "No PSA connection found." }, { status: 400 });
      }
    }

    const [projectRes, projectNotesRes, projectTicketsRes] = await Promise.all([
      fetch(`${cwConn.siteUrl}/v4_6_release/apis/3.0/project/projects/${id}`, {
        headers,
        cache: "no-store",
      }),
      fetch(`${cwConn.siteUrl}/v4_6_release/apis/3.0/project/projects/${id}/notes?pageSize=100`, {
        headers,
        cache: "no-store",
      }),
      fetch(
        `${cwConn.siteUrl}/v4_6_release/apis/3.0/project/tickets?conditions=${encodeURIComponent(`project/id=${id}`)}&pageSize=50`,
        {
          headers,
          cache: "no-store",
        },
      ),
    ]);
    if (!projectRes.ok) {
      return NextResponse.json({ error: "No PSA connection found." }, { status: 400 });
    }
    const projectRaw = (await projectRes.json().catch(() => ({}))) as Record<string, unknown>;
    const projectNotesRaw = (await projectNotesRes.json().catch(() => [])) as unknown;
    const projectTicketsRaw = (await projectTicketsRes.json().catch(() => [])) as unknown;
    const projectNotes = (Array.isArray(projectNotesRaw)
      ? projectNotesRaw
      : Array.isArray((projectNotesRaw as { items?: unknown })?.items)
        ? (projectNotesRaw as { items: unknown[] }).items
        : []
    ).map((n) => ({
      id: String((n as { id?: unknown }).id ?? ""),
      who:
        String((n as { member?: { name?: unknown } | null }).member?.name ?? "") ||
        String((n as { createdBy?: unknown }).createdBy ?? "Unknown"),
      posted: String((n as { dateCreated?: unknown }).dateCreated ?? ""),
      note: String(((n as { text?: unknown }).text ?? (n as { note?: unknown }).note ?? "")),
    }));
    const projectTasks = (Array.isArray(projectTicketsRaw)
      ? projectTicketsRaw
      : Array.isArray((projectTicketsRaw as { items?: unknown })?.items)
        ? (projectTicketsRaw as { items: unknown[] }).items
        : []
    ).map((task) => ({
      id: `task-${String((task as { id?: unknown }).id ?? "")}`,
      who:
        String((task as { assignedMember?: { name?: unknown } | null }).assignedMember?.name ?? "") ||
        String((task as { owner?: { name?: unknown } | null }).owner?.name ?? "") ||
        "Unassigned",
      posted: "",
      note: [
        String((task as { summary?: unknown }).summary ?? "Untitled task"),
        String((task as { status?: { name?: unknown } | null }).status?.name ?? "Unknown"),
      ].join(" · "),
    }));
    const ticket: HaloTicket = {
      id,
      summary: String(projectRaw.name ?? `Project ${id}`),
      details: typeof projectRaw.description === "string" ? projectRaw.description : null,
      status: { name: String((projectRaw.status as { name?: unknown } | null)?.name ?? "Open") },
      priority: null,
      client: { name: String((projectRaw.company as { name?: unknown } | null)?.name ?? "Unknown") },
      agent: { name: String((projectRaw.manager as { name?: unknown } | null)?.name ?? "Unassigned") },
      dateoccurred:
        typeof projectRaw.startDate === "string" ? projectRaw.startDate : null,
      targetdate:
        (typeof projectRaw.targetDate === "string" && projectRaw.targetDate) ||
        (typeof projectRaw.estimatedEndDate === "string" && projectRaw.estimatedEndDate) ||
        null,
      timetaken:
        typeof projectRaw.actualHours === "number" ? projectRaw.actualHours : 0,
      notes: [...projectNotes, ...projectTasks],
      is_project: true,
    } as HaloTicket;
    return NextResponse.json({ ticket });
  } catch {
    return NextResponse.json({ error: "No PSA connection found." }, { status: 400 });
  }
}

/**
 * Live HaloPSA ticket/project payload for the delivery health detail panel.
 * Auth matches main delivery-health dashboard (not the separate Pro-only halo/ticket-details route).
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = Number.parseInt(url.searchParams.get("id") ?? "", 10);
    const sourceParam = url.searchParams.get("source");
    const kindParam = url.searchParams.get("kind");
    const detailKind: ConnectWiseDetailKind =
      kindParam === "project" ? "project" : kindParam === "ticket" ? "ticket" : null;
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Ticket id is required." }, { status: 400 });
    }

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await userHasDeliveryHealthAccess(supabase, user.id))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    if (sourceParam === "connectwise") {
      return await loadConnectWiseDetailResponse(user.id, id, detailKind);
    }

    const { data: conn, error } = await supabase
      .from("halo_connections")
      .select("halo_url, tenant, client_id, client_secret_encrypted")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error || !conn) {
      return await loadConnectWiseDetailResponse(user.id, id, null);
    }

    let clientSecret: string;
    try {
      clientSecret = decrypt(conn.client_secret_encrypted);
    } catch {
      return NextResponse.json({ error: "Could not read HaloPSA credentials." }, { status: 400 });
    }

    const token = await getHaloToken({
      haloUrl: conn.halo_url,
      tenant: conn.tenant,
      clientId: conn.client_id,
      clientSecret,
    });
    let ticket: HaloTicket | null = null;
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
        }
        ticket = await getTicketDetails(conn.halo_url, token, id);
        break;
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        if (!lastError.message.includes("rate limit") && !lastError.message.includes("429")) break;
      }
    }
    if (!ticket) {
      const isRateLimit =
        lastError?.message.includes("rate limit") || lastError?.message.includes("429");
      return NextResponse.json(
        {
          error: isRateLimit
            ? "HaloPSA is rate limiting requests — please wait a moment and try again."
            : (lastError?.message ?? "Could not fetch ticket details."),
        },
        { status: isRateLimit ? 503 : 500 },
      );
    }
    return NextResponse.json({ ticket });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch ticket.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
