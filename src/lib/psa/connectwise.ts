import type { NormalisedNote, NormalisedTicket } from "@/lib/psa/types";

export type ConnectWiseConnection = {
  /** e.g. "https://na.myconnectwise.net" */
  siteUrl: string;
  /** e.g. "mycompany" */
  companyId: string;
  publicKey: string;
  privateKey: string;
  /** ConnectWise requires a clientId header */
  clientId: string;
};

type CwNameRef = { name?: string | null } | null | undefined;

type CwCompanyRow = {
  id?: number;
  name?: string | null;
};

type CwServiceTicketRow = {
  id?: number;
  summary?: string | null;
  status?: CwNameRef;
  company?: { id?: number; name?: string | null } | null;
  contactName?: string | null;
  owner?: CwNameRef;
  priority?: CwNameRef;
  requiredDate?: string | null;
  actualHours?: number | null;
  initialDescription?: string | null;
};

type CwTicketNoteRow = {
  id?: number;
  text?: string | null;
  createdBy?: string | null;
  dateCreated?: string | null;
  detailDescriptionFlag?: boolean | null;
  internalAnalysisFlag?: boolean | null;
  resolutionFlag?: boolean | null;
  member?: { name?: string | null } | null;
};

export function normalizeConnectWiseSiteUrl(url: string): string {
  let normalized = url.trim();
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }
  normalized = normalized.replace(/^http:\/\//i, "https://");
  normalized = normalized.replace(/\/v4_6_release\/apis\/3\.0\/?$/i, "");
  normalized = normalized.replace(/\/+$/, "");
  return normalized;
}

function buildCWAuthHeader(conn: ConnectWiseConnection): string {
  const credentials = `${conn.companyId}+${conn.publicKey}:${conn.privateKey}`;
  return `Basic ${Buffer.from(credentials, "utf8").toString("base64")}`;
}

function parseCwListPayload<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && "items" in data) {
    const items = (data as { items?: unknown }).items;
    if (Array.isArray(items)) return items as T[];
  }
  return [];
}

async function cwFetch(
  conn: ConnectWiseConnection,
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const base = normalizeConnectWiseSiteUrl(conn.siteUrl);
  const url = `${base}/v4_6_release/apis/3.0${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: buildCWAuthHeader(conn),
      clientId: conn.clientId,
      "Content-Type": "application/json",
      ...(options.headers && typeof options.headers === "object" && !(options.headers instanceof Headers)
        ? (options.headers as Record<string, string>)
        : {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ConnectWise API error ${res.status} on ${path}: ${body}`);
  }
  return res;
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function testCWConnection(
  conn: ConnectWiseConnection,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await cwFetch(conn, "/system/info");
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: errMessage(err) };
  }
}

export async function fetchCWCompanies(
  conn: ConnectWiseConnection,
): Promise<{ id: number; name: string }[]> {
  const conditions = encodeURIComponent('status/name="Active"');
  const res = await cwFetch(
    conn,
    `/company/companies?pageSize=1000&fields=id,name&conditions=${conditions}`,
  );
  const data: unknown = await res.json();
  const rows = parseCwListPayload<CwCompanyRow>(data);
  const out: { id: number; name: string }[] = [];
  for (const row of rows) {
    if (typeof row.id === "number" && Number.isFinite(row.id)) {
      const name =
        typeof row.name === "string" && row.name.trim() ? row.name.trim() : "Unknown";
      out.push({ id: row.id, name });
    }
  }
  return out;
}

export async function fetchCWServiceTickets(
  conn: ConnectWiseConnection,
  companyIds: number[],
  dateFrom?: string,
): Promise<NormalisedTicket[]> {
  if (companyIds.length === 0) return [];

  const companyCond = companyIds.map((id) => `company/id=${id}`).join(" OR ");
  const dateCond = dateFrom ? ` AND dateEntered>=[${dateFrom}]` : "";
  const conditions = encodeURIComponent(`(${companyCond})${dateCond}`);

  const res = await cwFetch(
    conn,
    `/service/tickets?conditions=${conditions}&pageSize=100&fields=id,summary,status,company,contactName,owner,priority,requiredDate,actualHours,initialDescription`,
  );
  const data: unknown = await res.json();
  const tickets = parseCwListPayload<CwServiceTicketRow>(data);

  const withNotes = await Promise.all(
    tickets.map(async (t) => {
      const id = typeof t.id === "number" && Number.isFinite(t.id) ? t.id : 0;
      const notes = id > 0 ? await fetchCWTicketNotes(conn, id) : [];
      return normaliseCWTicket(t, notes, "ticket");
    }),
  );
  return withNotes;
}

async function fetchCWTicketNotes(
  conn: ConnectWiseConnection,
  ticketId: number,
): Promise<NormalisedNote[]> {
  const res = await cwFetch(
    conn,
    `/service/tickets/${ticketId}/notes?pageSize=100&fields=id,text,createdBy,dateCreated,detailDescriptionFlag,internalAnalysisFlag,resolutionFlag,member`,
  );
  const data: unknown = await res.json();
  const notes = parseCwListPayload<CwTicketNoteRow>(data);

  const mapped = notes
    .filter((n) => typeof n.text === "string" && n.text.length >= 10)
    .map((n): NormalisedNote => {
      const memberName =
        n.member && typeof n.member === "object" && typeof n.member.name === "string"
          ? n.member.name
          : null;
      const createdBy =
        typeof n.createdBy === "string" && n.createdBy.trim() ? n.createdBy.trim() : null;
      return {
        id: String(n.id ?? ""),
        date: typeof n.dateCreated === "string" ? n.dateCreated : null,
        author: memberName ?? createdBy ?? "Unknown",
        type: "note",
        content: n.text as string,
      };
    });

  mapped.sort((a, b) => {
    const ta = a.date ? Date.parse(a.date) : NaN;
    const tb = b.date ? Date.parse(b.date) : NaN;
    if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return ta - tb;
    const ia = Number.parseInt(a.id, 10);
    const ib = Number.parseInt(b.id, 10);
    if (Number.isFinite(ia) && Number.isFinite(ib) && ia !== ib) return ia - ib;
    return a.id.localeCompare(b.id);
  });

  return mapped;
}

function normaliseCWTicket(
  t: CwServiceTicketRow,
  notes: NormalisedNote[],
  type: "ticket" | "project",
): NormalisedTicket {
  const id =
    typeof t.id === "number" && Number.isFinite(t.id) ? String(t.id) : "0";
  const summary =
    typeof t.summary === "string" && t.summary.trim() ? t.summary.trim() : "Untitled";
  const statusName =
    t.status && typeof t.status === "object" && typeof t.status.name === "string"
      ? t.status.name
      : "Unknown";
  const clientName =
    t.company && typeof t.company === "object" && typeof t.company.name === "string"
      ? t.company.name
      : "Unknown";
  const contact =
    typeof t.contactName === "string" && t.contactName.trim()
      ? t.contactName.trim()
      : null;
  const owner =
    t.owner && typeof t.owner === "object" && typeof t.owner.name === "string"
      ? t.owner.name
      : null;
  const priority =
    t.priority && typeof t.priority === "object" && typeof t.priority.name === "string"
      ? t.priority.name
      : null;
  const required =
    typeof t.requiredDate === "string" && t.requiredDate.trim()
      ? t.requiredDate.trim()
      : null;
  const hours =
    typeof t.actualHours === "number" && Number.isFinite(t.actualHours)
      ? t.actualHours
      : 0;
  const desc =
    typeof t.initialDescription === "string" && t.initialDescription.trim()
      ? t.initialDescription.trim()
      : null;

  return {
    id,
    title: summary,
    type,
    status: statusName,
    client: clientName,
    clientContact: contact,
    assignedEngineer: owner,
    priority,
    targetDate: required,
    timeLogged: hours,
    description: desc,
    notes,
    source: "connectwise",
  };
}
