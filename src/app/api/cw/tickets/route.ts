import { NextResponse } from "next/server";

import { getCWAuthHeaders, getCWConnectionForUser } from "@/lib/cw-auth";
import { getPlanTierServer, verifyUserPlan } from "@/lib/server/verifyUserPlan";
import { createServerClient } from "@/lib/supabase/server";

type CwTicket = {
  id?: number;
  summary?: string | null;
  status?: { name?: string | null } | null;
  type?: { name?: string | null } | null;
  subType?: { name?: string | null } | null;
  priority?: { name?: string | null } | null;
  owner?: { name?: string | null } | null;
  assignedTo?: string | { identifier?: string | null; name?: string | null } | null;
  resources?: Array<{ name?: string | null; identifier?: string | null } | null> | null;
  company?: { id?: number | string | null; name?: string | null } | null;
  dateEntered?: string | null;
  requiredDate?: string | null;
  targetDate?: string | null;
  closedDate?: string | null;
  actualHours?: number | null;
  project?: { id?: number | string | null } | null;
};

function resolveCwOwnerName(row: CwTicket): string | null {
  const ownerName = row.owner?.name?.trim();
  if (ownerName) return ownerName;
  if (typeof row.assignedTo === "string") {
    const assignedTo = row.assignedTo.trim();
    if (assignedTo) return assignedTo;
  } else if (row.assignedTo) {
    const assignedTo =
      row.assignedTo.name?.trim() ||
      row.assignedTo.identifier?.trim() ||
      null;
    if (assignedTo) return assignedTo;
  }
  const firstResource = (Array.isArray(row.resources) ? row.resources : []).find(
    (resource) => resource?.name?.trim() || resource?.identifier?.trim(),
  );
  if (firstResource) {
    return firstResource.name?.trim() || firstResource.identifier?.trim() || null;
  }
  return null;
}
const CW_OPEN_ONLY_CONDITIONS = [
  'status/name!="Closed"',
  'status/name!="Closed (resolved)"',
  'status/name!="Resolved"',
  'status/name!="Completed"',
].join(" and ");

function mapCwRowToTicket(row: CwTicket) {
  const resolvedOwner = resolveCwOwnerName(row);
  const typeName = (row.type?.name ?? "").trim();
  const subTypeName = (row.subType?.name ?? "").trim();
  const compositeCategory =
    typeName && subTypeName
      ? `${typeName} — ${subTypeName}`
      : typeName || subTypeName || null;
  return {
    id: Number(row.id ?? 0),
    summary: (row.summary ?? "Untitled").trim(),
    status: { name: (row.status?.name ?? "Unknown").trim() },
    client: { name: (row.company?.name ?? "Unknown").trim() },
    priority: normalizeCwPriorityName(row.priority?.name)
      ? { name: normalizeCwPriorityName(row.priority?.name) as string }
      : null,
    agent: resolvedOwner ? { name: resolvedOwner } : null,
    owner: resolvedOwner ? { name: resolvedOwner } : null,
    assignedTo: row.assignedTo ?? null,
    dateoccurred: row.dateEntered ?? null,
    targetdate: row.requiredDate ?? row.targetDate ?? row.closedDate ?? null,
    slaTargetSet: !!(row.requiredDate?.trim() || row.targetDate?.trim()),
    timetaken:
      typeof row.actualHours === "number" && Number.isFinite(row.actualHours)
        ? row.actualHours
        : null,
    companyId: row.company?.id ?? null,
    client_name: (row.company?.name ?? "Unknown").trim(),
    source: "connectwise" as const,
    cwType: typeName || null,
    cwSubType: subTypeName || null,
    category: compositeCategory,
    cwProjectId:
      row.project?.id != null && Number.isFinite(Number(row.project.id))
        ? Number(row.project.id)
        : null,
  };
}

function normalizeCwPriorityName(raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const withoutPrefix = value.replace(/^priority\s*\d+\s*[-:]\s*/i, "").trim();
  const lowered = `${withoutPrefix} ${value}`.toLowerCase();
  if (lowered.includes("critical") || lowered.includes("high") || /\bp1\b/.test(lowered)) {
    return "High";
  }
  if (lowered.includes("low") || /\bp4\b|\bp5\b/.test(lowered)) {
    return "Low";
  }
  return "Medium";
}

export async function GET(request: Request) {
  let connection: { siteUrl: string; hasHeaders: boolean } | null = null;
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
      console.error("[cw/tickets GET] verifyUserPlan:", e);
      return NextResponse.json({ error: "Could not verify subscription." }, { status: 500 });
    }

    const [conn, headers] = await Promise.all([
      getCWConnectionForUser(user.id),
      getCWAuthHeaders(user.id),
    ]);
    connection = { siteUrl: conn.siteUrl, hasHeaders: Boolean(headers) };
    const requestUrl = new URL(request.url);
    const keyword = requestUrl.searchParams.get("keyword")?.trim().toLowerCase() ?? "";
    const countRaw = Number.parseInt(requestUrl.searchParams.get("count") ?? "", 10);
    const maxRows =
      Number.isFinite(countRaw) && countRaw > 0
        ? Math.min(1000, Math.max(1, countRaw))
        : 1000;
    const companyId = requestUrl.searchParams.get("companyId")?.trim() ?? ""
    const companyCondition = companyId ? ` and company/id=${companyId}` : ""
    const conditions = encodeURIComponent(`${CW_OPEN_ONLY_CONDITIONS}${companyCondition}`)
    const pageSize = 100;
    const rows: CwTicket[] = [];
    for (let page = 1; page <= 20 && rows.length < maxRows; page += 1) {
      const url = `${conn.siteUrl}/v4_6_release/apis/3.0/service/tickets?conditions=${conditions}&page=${page}&pageSize=${pageSize}`;
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
        ? (parsed as CwTicket[])
        : Array.isArray((parsed as { items?: unknown })?.items)
          ? ((parsed as { items: unknown[] }).items as CwTicket[])
          : [];
      rows.push(...batch);
      if (batch.length < pageSize) break;
    }

    const slicedRows = rows.slice(0, maxRows);

    const tickets = slicedRows.map((row) => {
      console.log("[cw] ticket owner fields:", {
        owner: row.owner,
        assignedTo: row.assignedTo,
        resources: row.resources,
      });
      return mapCwRowToTicket(row);
    });
    const keywordFiltered = keyword
      ? tickets.filter((t) =>
          (t.summary ?? "").toLowerCase().includes(keyword) ||
          (t.client?.name ?? "").toLowerCase().includes(keyword),
        )
      : tickets;

    return NextResponse.json({ tickets: keywordFiltered });
  } catch (e) {
    console.log("[cw/tickets] error:", e);
    console.log("[cw/tickets] connection:", connection);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch ConnectWise tickets." },
      { status: 500 },
    );
  }
}

/** QBR / analytics: tickets in a date range (includes closed), paginated. */
export async function POST(req: Request) {
  let connection: { siteUrl: string; hasHeaders: boolean } | null = null;
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
      console.error("[cw/tickets POST] verifyUserPlan:", e);
      return NextResponse.json({ error: "Could not verify subscription." }, { status: 500 });
    }

    let body: { dateFrom?: string; dateTo?: string } = {};
    try {
      const raw = await req.text();
      if (raw.trim()) body = JSON.parse(raw) as { dateFrom?: string; dateTo?: string };
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const from = typeof body.dateFrom === "string" ? body.dateFrom.trim() : "";
    const to = typeof body.dateTo === "string" ? body.dateTo.trim() : "";
    if (!from || !to) {
      return NextResponse.json({ error: "dateFrom and dateTo are required" }, { status: 400 });
    }

    const [conn, headers] = await Promise.all([
      getCWConnectionForUser(user.id),
      getCWAuthHeaders(user.id),
    ]);
    connection = { siteUrl: conn.siteUrl, hasHeaders: Boolean(headers) };

    const fromBracket = from.includes("[") ? from : `[${from}]`;
    const toBracket = to.includes("[") ? to : `[${to}]`;
    const conditions = encodeURIComponent(
      `dateEntered >= ${fromBracket} and dateEntered <= ${toBracket}`,
    );

    const pageSize = 100;
    const maxRows = 1000;
    const rows: CwTicket[] = [];
    for (let page = 1; page <= 20 && rows.length < maxRows; page += 1) {
      const url = `${conn.siteUrl}/v4_6_release/apis/3.0/service/tickets?conditions=${conditions}&page=${page}&pageSize=${pageSize}`;
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
        ? (parsed as CwTicket[])
        : Array.isArray((parsed as { items?: unknown })?.items)
          ? ((parsed as { items: unknown[] }).items as CwTicket[])
          : [];
      rows.push(...batch);
      if (batch.length < pageSize) break;
    }

    const tickets = rows.slice(0, maxRows).map((row) => mapCwRowToTicket(row));
    return NextResponse.json({ tickets, count: tickets.length });
  } catch (e) {
    console.log("[cw/tickets POST] error:", e);
    console.log("[cw/tickets POST] connection:", connection);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch ConnectWise tickets." },
      { status: 500 },
    );
  }
}

