import { NextResponse } from "next/server";

import { getCWAuthHeaders, getCWConnectionForUser } from "@/lib/cw-auth";
import { createServerClient } from "@/lib/supabase/server";

type CwNote = {
  id?: number;
  createdBy?: string | null;
  member?: { name?: string | null } | null;
  dateCreated?: string | null;
  text?: string | null;
  detailDescriptionFlag?: boolean | null;
  internalAnalysisFlag?: boolean | null;
  resolutionFlag?: boolean | null;
};

type CwProjectTicket = {
  id?: number;
  summary?: string | null;
  status?: { name?: string | null } | null;
  projectPhase?: { name?: string | null } | null;
  phase?: { name?: string | null } | null;
  owner?: { name?: string | null; identifier?: string | null } | null;
  assignedMember?: { name?: string | null; identifier?: string | null } | null;
};

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = Number.parseInt(url.searchParams.get("id") ?? "", 10);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "Ticket id is required." }, { status: 400 });
    }

    const [conn, headers] = await Promise.all([
      getCWConnectionForUser(user.id),
      getCWAuthHeaders(user.id),
    ]);
    const ticketUrl = `${conn.siteUrl}/v4_6_release/apis/3.0/service/tickets/${id}`;
    const ticketRes = await fetch(ticketUrl, { headers, cache: "no-store" });
    if (ticketRes.ok) {
      const ticketRaw = (await ticketRes.json().catch(() => ({}))) as Record<string, unknown>;
      const notesUrl = `${conn.siteUrl}/v4_6_release/apis/3.0/service/tickets/${id}/notes?pageSize=100`;
      const res = await fetch(notesUrl, { headers, cache: "no-store" });
      const text = await res.text();
      if (!res.ok) {
        return NextResponse.json(
          { error: `ConnectWise API error ${res.status}: ${text}` },
          { status: 500 },
        );
      }

      const parsed = JSON.parse(text) as unknown;
      const rows = Array.isArray(parsed)
        ? (parsed as CwNote[])
        : Array.isArray((parsed as { items?: unknown })?.items)
          ? ((parsed as { items: unknown[] }).items as CwNote[])
          : [];

      const notes = rows.map((row) => ({
        id: String(row.id ?? ""),
        author:
          row.member?.name?.trim() ||
          row.createdBy?.trim() ||
          "Unknown",
        date: row.dateCreated ?? null,
        content: (row.text ?? "").trim(),
        type: row.resolutionFlag
          ? "resolution"
          : row.internalAnalysisFlag
            ? "internal"
            : row.detailDescriptionFlag
              ? "detail"
              : "note",
      }));

      const ticket = {
        id,
        summary: String(ticketRaw.summary ?? `Ticket ${id}`),
        status: {
          name: String((ticketRaw.status as { name?: unknown } | null)?.name ?? "Unknown"),
        },
        company: {
          id: (ticketRaw.company as { id?: unknown } | null)?.id ?? null,
          name: String((ticketRaw.company as { name?: unknown } | null)?.name ?? "Unknown"),
        },
        priority:
          (ticketRaw.priority as { name?: unknown } | null)?.name != null
            ? {
                name: String((ticketRaw.priority as { name?: unknown }).name),
              }
            : null,
        owner:
          (ticketRaw.owner as { name?: unknown } | null)?.name != null
            ? { name: String((ticketRaw.owner as { name?: unknown }).name) }
            : null,
        dateEntered: typeof ticketRaw.dateEntered === "string" ? ticketRaw.dateEntered : null,
        requiredDate:
          (typeof ticketRaw.requiredDate === "string" && ticketRaw.requiredDate) ||
          (typeof ticketRaw.targetDate === "string" && ticketRaw.targetDate) ||
          (typeof ticketRaw.closedDate === "string" && ticketRaw.closedDate) ||
          null,
        actualHours:
          typeof ticketRaw.actualHours === "number" && Number.isFinite(ticketRaw.actualHours)
            ? ticketRaw.actualHours
            : 0,
      };

      return NextResponse.json({ ticket, notes });
    }

    const [projectRes, notesRes, projectTicketsRes] = await Promise.all([
      fetch(`${conn.siteUrl}/v4_6_release/apis/3.0/project/projects/${id}`, {
        headers,
        cache: "no-store",
      }),
      fetch(`${conn.siteUrl}/v4_6_release/apis/3.0/project/projects/${id}/notes?pageSize=100`, {
        headers,
        cache: "no-store",
      }),
      fetch(
        `${conn.siteUrl}/v4_6_release/apis/3.0/project/tickets?conditions=${encodeURIComponent(`project/id=${id}`)}&pageSize=50`,
        {
          headers,
          cache: "no-store",
        },
      ),
    ]);
    if (!projectRes.ok) {
      const ticketText = await ticketRes.text().catch(() => "");
      return NextResponse.json(
        {
          error: `ConnectWise API error ${ticketRes.status}: ${ticketText || `Project ${id} not found`}`,
        },
        { status: 500 },
      );
    }

    const projectRaw = (await projectRes.json().catch(() => ({}))) as Record<string, unknown>;
    const notesRaw = (await notesRes.json().catch(() => [])) as unknown;
    const projectTicketsRaw = (await projectTicketsRes.json().catch(() => [])) as unknown;
    const rows = Array.isArray(notesRaw)
      ? (notesRaw as CwNote[])
      : Array.isArray((notesRaw as { items?: unknown })?.items)
        ? ((notesRaw as { items: unknown[] }).items as CwNote[])
        : [];
    const projectTickets = Array.isArray(projectTicketsRaw)
      ? (projectTicketsRaw as CwProjectTicket[])
      : Array.isArray((projectTicketsRaw as { items?: unknown })?.items)
        ? ((projectTicketsRaw as { items: unknown[] }).items as CwProjectTicket[])
        : [];
    const taskNotes = projectTickets.map((task) => ({
      id: `task-${String(task.id ?? "")}`,
      author:
        task.assignedMember?.name?.trim() ||
        task.owner?.name?.trim() ||
        task.assignedMember?.identifier?.trim() ||
        task.owner?.identifier?.trim() ||
        "Unassigned",
      date: null as string | null,
      content: [
        (task.projectPhase?.name ?? task.phase?.name ?? "").trim(),
        (task.summary ?? "Untitled task").trim(),
        (task.status?.name ?? "Unknown").trim(),
      ]
        .filter(Boolean)
        .join(" · "),
      type: "task",
    }));

    const notes = [
      ...rows.map((row) => ({
        id: String(row.id ?? ""),
        author:
          row.member?.name?.trim() ||
          row.createdBy?.trim() ||
          "Unknown",
        date: row.dateCreated ?? null,
        content: (row.text ?? "").trim(),
        type: "project_note",
      })),
      ...taskNotes,
    ];

    const ticket = {
      id,
      summary: String(projectRaw.name ?? `Project ${id}`),
      status: {
        name: String((projectRaw.status as { name?: unknown } | null)?.name ?? "Unknown"),
      },
      company: {
        id: (projectRaw.company as { id?: unknown } | null)?.id ?? null,
        name: String((projectRaw.company as { name?: unknown } | null)?.name ?? "Unknown"),
      },
      priority: null,
      owner:
        (projectRaw.manager as { name?: unknown } | null)?.name != null
          ? { name: String((projectRaw.manager as { name?: unknown }).name) }
          : null,
      dateEntered: typeof projectRaw.startDate === "string" ? projectRaw.startDate : null,
      requiredDate:
        (typeof projectRaw.targetDate === "string" && projectRaw.targetDate) ||
        (typeof projectRaw.estimatedEndDate === "string" && projectRaw.estimatedEndDate) ||
        (typeof projectRaw.closedDate === "string" && projectRaw.closedDate) ||
        null,
      actualHours:
        typeof projectRaw.actualHours === "number" && Number.isFinite(projectRaw.actualHours)
          ? projectRaw.actualHours
          : 0,
      is_project: true,
    };

    return NextResponse.json({ ticket, notes });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load ConnectWise ticket detail." },
      { status: 500 },
    );
  }
}

