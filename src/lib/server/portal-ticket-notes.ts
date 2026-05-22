import { decrypt } from "@/lib/encryption";
import { getCWAuthHeaders, getCWConnectionForUser } from "@/lib/cw-auth";
import { getHaloToken, getTicketDetails, sortHaloNotesOldestFirst, type HaloNote } from "@/lib/halo";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export type PortalTicketNoteLine = {
  date: string | null;
  author: string;
  content: string;
};

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function strish(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

function haloNotePlainText(note: HaloNote): string {
  const n = note as Record<string, unknown>;
  const fromNote = (
    strish(note.note) ??
    strish(note.details) ??
    strish(note.description) ??
    strish(note.body) ??
    ""
  ).trim();
  if (fromNote) return stripHtmlTags(fromNote);
  const emailPlain = strish(n.emailbody);
  if (emailPlain) return stripHtmlTags(emailPlain);
  const emailHtml = typeof n.emailbody_html === "string" ? n.emailbody_html.trim() : "";
  if (emailHtml) return stripHtmlTags(emailHtml);
  return "";
}

function haloNoteAuthor(note: HaloNote): string {
  const n = note as Record<string, unknown>;
  return (
    strish(note.author) ??
    strish(note.who) ??
    strish(n.agentname) ??
    strish(n.createdby) ??
    strish(n.emailfrom) ??
    "Unknown"
  );
}

function haloNoteDate(note: HaloNote): string | null {
  const n = note as Record<string, unknown>;
  return (
    strish(note.posted) ??
    strish(note.date) ??
    strish(note.created_at) ??
    strish(n.datetime) ??
    strish(n.actiondatecreated) ??
    null
  );
}

function parseCwNotesPayload(data: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(data)) return data as Array<Record<string, unknown>>;
  if (data && typeof data === "object" && "items" in data) {
    const items = (data as { items?: unknown }).items;
    if (Array.isArray(items)) return items as Array<Record<string, unknown>>;
  }
  return [];
}

export async function portalTicketBelongsToClient(opts: {
  mspUserId: string;
  psaSource: string;
  ticketId: number;
  portalClientIdStr: string;
}): Promise<boolean> {
  if (!Number.isFinite(opts.ticketId) || opts.ticketId <= 0) return false;
  const want = Number.parseInt(String(opts.portalClientIdStr).replace(/\D/g, ""), 10);
  if (!Number.isFinite(want) || want <= 0) return false;

  if (opts.psaSource === "connectwise") {
    try {
      const cwConn = await getCWConnectionForUser(opts.mspUserId);
      const headers = await getCWAuthHeaders(opts.mspUserId);
      const base = cwConn.siteUrl.replace(/\/+$/, "");
      const url = `${base}/v4_6_release/apis/3.0/service/tickets/${opts.ticketId}`;
      const res = await fetch(url, { headers, cache: "no-store" });
      if (!res.ok) return false;
      const row = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (!row || typeof row !== "object") return false;
      const company = row.company as { id?: unknown } | null | undefined;
      const cid =
        company && (typeof company.id === "number" || typeof company.id === "string")
          ? Number(company.id)
          : NaN;
      return Number.isFinite(cid) && cid === want;
    } catch {
      return false;
    }
  }

  const admin = createServiceRoleClient();
  const { data: conn, error: cErr } = await admin
    .from("halo_connections")
    .select("halo_url, tenant, client_id, client_secret_encrypted")
    .eq("user_id", opts.mspUserId)
    .maybeSingle();
  if (cErr || !conn) return false;
  let clientSecret: string;
  try {
    clientSecret = decrypt(conn.client_secret_encrypted);
  } catch {
    return false;
  }
  const token = await getHaloToken({
    haloUrl: conn.halo_url,
    tenant: conn.tenant,
    clientId: conn.client_id,
    clientSecret,
  });
  try {
    const ticket = await getTicketDetails(conn.halo_url, token, opts.ticketId);
    const tid = typeof ticket.clientId === "number" && Number.isFinite(ticket.clientId) ? ticket.clientId : null;
    return tid != null && tid === want;
  } catch {
    return false;
  }
}

export async function fetchPortalTicketNotes(opts: {
  mspUserId: string;
  psaSource: string;
  ticketId: number;
}): Promise<PortalTicketNoteLine[]> {
  if (!Number.isFinite(opts.ticketId) || opts.ticketId <= 0) return [];

  if (opts.psaSource === "connectwise") {
    try {
      const cwConn = await getCWConnectionForUser(opts.mspUserId);
      const headers = await getCWAuthHeaders(opts.mspUserId);
      const base = cwConn.siteUrl.replace(/\/+$/, "");
      const url = `${base}/v4_6_release/apis/3.0/service/tickets/${opts.ticketId}/notes?pageSize=200&fields=id,text,createdBy,dateCreated,member`;
      const res = await fetch(url, { headers, cache: "no-store" });
      const raw = (await res.json().catch(() => [])) as unknown;
      const rows = parseCwNotesPayload(raw);
      const lines: PortalTicketNoteLine[] = [];
      for (const row of rows) {
        const text = typeof row.text === "string" ? stripHtmlTags(row.text) : "";
        if (!text || text.length < 2) continue;
        const memberName =
          row.member && typeof row.member === "object" && typeof (row.member as { name?: string }).name === "string"
            ? String((row.member as { name: string }).name).trim()
            : null;
        const createdBy =
          typeof row.createdBy === "string" && row.createdBy.trim() ? row.createdBy.trim() : null;
        lines.push({
          date: typeof row.dateCreated === "string" ? row.dateCreated : null,
          author: memberName ?? createdBy ?? "Unknown",
          content: text,
        });
      }
      lines.sort((a, b) => {
        const ta = a.date ? Date.parse(a.date) : 0;
        const tb = b.date ? Date.parse(b.date) : 0;
        return ta - tb;
      });
      return lines;
    } catch {
      return [];
    }
  }

  const admin = createServiceRoleClient();
  const { data: conn, error: cErr } = await admin
    .from("halo_connections")
    .select("halo_url, tenant, client_id, client_secret_encrypted")
    .eq("user_id", opts.mspUserId)
    .maybeSingle();
  if (cErr || !conn) return [];

  let clientSecret: string;
  try {
    clientSecret = decrypt(conn.client_secret_encrypted);
  } catch {
    return [];
  }

  const token = await getHaloToken({
    haloUrl: conn.halo_url,
    tenant: conn.tenant,
    clientId: conn.client_id,
    clientSecret,
  });

  try {
    const ticket = await getTicketDetails(conn.halo_url, token, opts.ticketId);
    const raw = Array.isArray(ticket.notes) ? (ticket.notes as HaloNote[]) : [];
    const sorted = sortHaloNotesOldestFirst(raw);
    return sorted
      .map((note) => ({
        date: haloNoteDate(note),
        author: haloNoteAuthor(note),
        content: haloNotePlainText(note),
      }))
      .filter((l) => l.content.length > 0);
  } catch {
    return [];
  }
}

/** Last N note lines across several tickets (newest first), for portal activity feed. */
export async function fetchPortalRecentTicketActivity(opts: {
  mspUserId: string;
  psaSource: string;
  ticketIds: number[];
  maxTickets?: number;
  maxResults?: number;
}): Promise<Array<{ date: string | null; author: string; summary: string }>> {
  const maxT = opts.maxTickets ?? 6;
  const maxR = opts.maxResults ?? 5;
  const ids = opts.ticketIds.filter((id) => Number.isFinite(id) && id > 0).slice(0, maxT);
  const merged: Array<{ date: string | null; author: string; summary: string; ts: number }> = [];
  for (const id of ids) {
    const notes = await fetchPortalTicketNotes({
      mspUserId: opts.mspUserId,
      psaSource: opts.psaSource,
      ticketId: id,
    });
    for (const n of notes) {
      const summary =
        n.content.length > 200 ? `${n.content.slice(0, 197).trimEnd()}…` : n.content;
      const ts = n.date ? Date.parse(n.date) : 0;
      merged.push({ date: n.date, author: n.author, summary, ts });
    }
  }
  merged.sort((a, b) => b.ts - a.ts);
  const seen = new Set<string>();
  const out: Array<{ date: string | null; author: string; summary: string }> = [];
  for (const row of merged) {
    const k = `${row.date ?? ""}|${row.author}|${row.summary}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ date: row.date, author: row.author, summary: row.summary });
    if (out.length >= maxR) break;
  }
  return out;
}
