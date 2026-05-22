import { NextResponse } from "next/server";

import { getCWAuthHeaders, getCWConnectionForUser } from "@/lib/cw-auth";
import { getPlanTierServer, verifyUserPlan } from "@/lib/server/verifyUserPlan";
import { createServerClient } from "@/lib/supabase/server";

type CwProject = {
  id?: number;
  name?: string | null;
  status?: { name?: string | null } | null;
  company?: { id?: number | string | null; name?: string | null } | null;
  manager?: { name?: string | null } | null;
  estimatedEndDate?: string | null;
  targetDate?: string | null;
  closedDate?: string | null;
  description?: string | null;
  actualHours?: number | null;
};
const CW_OPEN_ONLY_CONDITIONS = [
  'status/name!="Closed"',
  'status/name!="Closed (resolved)"',
  'status/name!="Resolved"',
  'status/name!="Completed"',
].join(" and ");

type CwProjectNote = {
  id?: number | string;
  text?: string | null;
  note?: string | null;
  member?: { name?: string | null } | null;
  createdBy?: string | null;
  dateCreated?: string | null;
};

type CwProjectTicket = {
  id?: number;
  summary?: string | null;
  noteCount?: number | null;
  status?: { name?: string | null } | null;
  phase?: { name?: string | null } | null;
  projectPhase?: { name?: string | null } | null;
  owner?: { name?: string | null; identifier?: string | null } | null;
  assignedMember?: { name?: string | null; identifier?: string | null } | null;
  member?: { name?: string | null; identifier?: string | null } | null;
};

type CwTicketNote = {
  id?: number | string;
  text?: string | null;
  note?: string | null;
  member?: { name?: string | null } | null;
  createdBy?: string | null;
  dateCreated?: string | null;
};

type CwProjectPhase = {
  id?: number;
  name?: string | null;
};

type CwProjectTeamMember = {
  member?: { name?: string | null; identifier?: string | null } | null;
  name?: string | null;
  title?: string | null;
  role?: { name?: string | null } | null;
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

    try {
      const planFields = await verifyUserPlan(user.id);
      if (getPlanTierServer(planFields) < 1) {
        return NextResponse.json({ error: "pro_required" }, { status: 403 });
      }
    } catch (e) {
      console.error("[cw/projects] verifyUserPlan:", e);
      return NextResponse.json({ error: "Could not verify subscription." }, { status: 500 });
    }

    const [conn, headers] = await Promise.all([
      getCWConnectionForUser(user.id),
      getCWAuthHeaders(user.id),
    ]);
    const requestUrl = new URL(request.url)
    const companyId = requestUrl.searchParams.get("companyId")?.trim() ?? ""
    const companyCondition = companyId ? ` and company/id=${companyId}` : ""
    const conditions = encodeURIComponent(`${CW_OPEN_ONLY_CONDITIONS}${companyCondition}`)
    const pageSize = 100;
    const maxRows = 1000;
    const rows: CwProject[] = [];
    for (let page = 1; page <= 20 && rows.length < maxRows; page += 1) {
      const url = `${conn.siteUrl}/v4_6_release/apis/3.0/project/projects?conditions=${conditions}&page=${page}&pageSize=${pageSize}`;
      const res = await fetch(url, { headers, cache: "no-store" });
      const text = await res.text();
      if (!res.ok) {
        return NextResponse.json(
          { error: `ConnectWise API error ${res.status}: ${text}` },
          { status: 500 },
        );
      }
      const parsed = JSON.parse(text) as unknown;
      const batch = Array.isArray(parsed)
        ? (parsed as CwProject[])
        : Array.isArray((parsed as { items?: unknown })?.items)
          ? ((parsed as { items: unknown[] }).items as CwProject[])
          : [];
      rows.push(...batch);
      if (batch.length < pageSize) break;
    }

    const projects = await Promise.all(
      rows.slice(0, maxRows).map(async (row) => {
        const id = Number(row.id ?? 0);
        if (!Number.isFinite(id) || id <= 0) {
          return {
            id: 0,
            name: "Untitled",
            status: { name: "Unknown" },
            client: { name: "Unknown" },
            projectmanager: null,
            owner: null,
            targetdate: null,
            timetaken: null,
            description: null,
            notes: [],
            tasks: [],
            teamMembers: [],
            client_name: "Unknown",
            companyId: null,
          };
        }

        const [detailRes, notesRes, phasesRes, tasksRes, membersRes] = await Promise.all([
          fetch(`${conn.siteUrl}/v4_6_release/apis/3.0/project/projects/${id}`, {
            headers,
            cache: "no-store",
          }),
          fetch(`${conn.siteUrl}/v4_6_release/apis/3.0/project/projects/${id}/notes?pageSize=100`, {
            headers,
            cache: "no-store",
          }),
          fetch(`${conn.siteUrl}/v4_6_release/apis/3.0/project/projects/${id}/phases?pageSize=100`, {
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
          fetch(`${conn.siteUrl}/v4_6_release/apis/3.0/project/projects/${id}/teamMembers?pageSize=100`, {
            headers,
            cache: "no-store",
          }),
        ]);

        const detail = detailRes.ok
          ? ((await detailRes.json().catch(() => ({}))) as CwProject)
          : row;
        const notesRaw = notesRes.ok
          ? ((await notesRes.json().catch(() => [])) as unknown)
          : [];
        const phasesRaw = phasesRes.ok
          ? ((await phasesRes.json().catch(() => [])) as unknown)
          : [];
        const tasksRaw = tasksRes.ok
          ? ((await tasksRes.json().catch(() => [])) as unknown)
          : [];
        const membersRaw = membersRes.ok
          ? ((await membersRes.json().catch(() => [])) as unknown)
          : [];

        const noteRows = Array.isArray(notesRaw)
          ? (notesRaw as CwProjectNote[])
          : Array.isArray((notesRaw as { items?: unknown[] })?.items)
            ? ((notesRaw as { items: unknown[] }).items as CwProjectNote[])
            : [];
        const phaseRows = Array.isArray(phasesRaw)
          ? (phasesRaw as CwProjectPhase[])
          : Array.isArray((phasesRaw as { items?: unknown[] })?.items)
            ? ((phasesRaw as { items: unknown[] }).items as CwProjectPhase[])
            : [];
        const taskRows = Array.isArray(tasksRaw)
          ? (tasksRaw as CwProjectTicket[])
          : Array.isArray((tasksRaw as { items?: unknown[] })?.items)
            ? ((tasksRaw as { items: unknown[] }).items as CwProjectTicket[])
            : [];
        const memberRows = Array.isArray(membersRaw)
          ? (membersRaw as CwProjectTeamMember[])
          : Array.isArray((membersRaw as { items?: unknown[] })?.items)
            ? ((membersRaw as { items: unknown[] }).items as CwProjectTeamMember[])
            : [];

        const phaseNameById = new Map<number, string>();
        for (const ph of phaseRows) {
          const phId = Number(ph.id ?? 0);
          if (Number.isFinite(phId) && phId > 0 && ph.name?.trim()) {
            phaseNameById.set(phId, ph.name.trim());
          }
        }

        const enrichedTasks = await Promise.all(
          taskRows.map(async (t) => {
            const taskId = Number(t.id ?? 0);
            const noteCount = Number(t.noteCount ?? 0);
            let taskNotes: Array<{ author: string; date: string | null; content: string }> = [];
            if (taskId > 0 && Number.isFinite(noteCount) && noteCount > 0) {
              const notesRes = await fetch(
                `${conn.siteUrl}/v4_6_release/apis/3.0/service/tickets/${taskId}/notes?pageSize=20`,
                { headers, cache: "no-store" },
              );
              const notesRaw = notesRes.ok
                ? ((await notesRes.json().catch(() => [])) as unknown)
                : [];
              const noteRows = Array.isArray(notesRaw)
                ? (notesRaw as CwTicketNote[])
                : Array.isArray((notesRaw as { items?: unknown[] })?.items)
                  ? ((notesRaw as { items: unknown[] }).items as CwTicketNote[])
                  : [];
              taskNotes = noteRows
                .slice(0, 3)
                .map((n) => ({
                  author: n.member?.name?.trim() || n.createdBy?.trim() || "Unknown",
                  date: n.dateCreated ?? null,
                  content: (n.text ?? n.note ?? "").trim(),
                }))
                .filter((n) => n.content.length > 0);
            }
            return { t, taskNotes };
          }),
        );

        const companyIdRaw = detail.company?.id ?? row.company?.id;
        const companyId =
          typeof companyIdRaw === "number" && Number.isFinite(companyIdRaw)
            ? companyIdRaw
            : typeof companyIdRaw === "string" && companyIdRaw.trim()
              ? (() => {
                  const n = Number(companyIdRaw);
                  return Number.isFinite(n) ? n : null;
                })()
              : null;

        return {
          id,
          name: (detail.name ?? row.name ?? "Untitled").trim(),
          status: { name: (detail.status?.name ?? row.status?.name ?? "Unknown").trim() },
          client: { name: (detail.company?.name ?? row.company?.name ?? "Unknown").trim() },
          companyId,
          projectmanager: detail.manager?.name ? { name: detail.manager.name.trim() } : null,
          owner: detail.manager?.name ? { name: detail.manager.name.trim() } : null,
          targetdate:
            detail.targetDate ?? detail.estimatedEndDate ?? detail.closedDate ??
            row.targetDate ?? row.estimatedEndDate ?? row.closedDate ?? null,
          timetaken:
            typeof detail.actualHours === "number" && Number.isFinite(detail.actualHours)
              ? detail.actualHours
              : typeof row.actualHours === "number" && Number.isFinite(row.actualHours)
                ? row.actualHours
                : null,
          description: detail.description ?? row.description ?? null,
          notes: noteRows.map((n) => ({
            id: String(n.id ?? ""),
            author: n.member?.name?.trim() || n.createdBy?.trim() || "Unknown",
            date: n.dateCreated ?? null,
            content: (n.text ?? n.note ?? "").trim(),
          })),
          tasks: enrichedTasks.map(({ t, taskNotes }) => ({
            id: Number(t.id ?? 0),
            summary: [
              (
                t.projectPhase?.name ??
                t.phase?.name ??
                phaseNameById.get(Number((t.phase as { id?: unknown } | null)?.id ?? 0)) ??
                ""
              ).trim(),
              (t.summary ?? "Untitled task").trim(),
            ]
              .filter(Boolean)
              .join(" - "),
            status: [
              (t.status?.name ?? "Unknown").trim(),
              (
                t.assignedMember?.name ??
                t.owner?.name ??
                t.member?.name ??
                t.assignedMember?.identifier ??
                t.owner?.identifier ??
                t.member?.identifier ??
                ""
              ).trim(),
            ]
              .filter(Boolean)
              .join(" · "),
            notes: taskNotes,
          })).filter((t) => t.id > 0),
          teamMembers: memberRows.map((m) => ({
            name:
              m.member?.name?.trim() ||
              m.member?.identifier?.trim() ||
              m.name?.trim() ||
              "Unknown",
            role: m.role?.name?.trim() || m.title?.trim() || null,
          })),
          client_name: (detail.company?.name ?? row.company?.name ?? "Unknown").trim(),
        };
      }),
    );

    return NextResponse.json({ projects });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch ConnectWise projects." },
      { status: 500 },
    );
  }
}

