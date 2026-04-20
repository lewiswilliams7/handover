import { getCachedHaloAccessToken } from "@/lib/halo-token-cache";

/**
 * Halo list/detail `fields` - user-requested columns plus Halo keys needed for
 * `mapTicket` / delivery health (type, description) without a second list shape.
 */
const HALO_TICKETS_LIST_FIELDS =
  "id,summary,status,priority,client,agent,manager,team,dateoccurred,targetdate,timetaken," +
  "details,description,tickettype,tickettype_id,use,main_project_id,projectinternaltask," +
  "client_id,clientid,assignedto,assigned_to,technician,who,who_agentid,actionby_agent_id," +
  "category_1,category_2,category1,category2";

function applyHaloTicketsListEnrichment(
  url: URL,
  opts: { minimalTicketPayload?: boolean },
): void {
  if (opts.minimalTicketPayload) return;
  url.searchParams.set("includedetails", "true");
  url.searchParams.set("fields", HALO_TICKETS_LIST_FIELDS);
}
import {
  formatTicketsForPrompt,
  TICKET_SECTION_RULE,
} from "@/lib/psa/format";
import type { NormalisedNote, NormalisedTicket } from "@/lib/psa/types";
import { stripHtmlToPlainText } from "@/lib/utils";

export interface HaloCredentials {
  haloUrl: string;
  tenant: string | null;
  clientId: string;
  clientSecret: string;
}

function strField(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** Resolves display name from nested objects or string refs (HaloPSA varies by endpoint). */
function nestedName(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "object" && v !== null) {
    const o = v as Record<string, unknown>;
    if (typeof o.name === "string" && o.name.trim()) return o.name.trim();
    if (typeof o.Name === "string" && o.Name.trim()) return o.Name.trim();
    if (typeof o.Status === "string" && o.Status.trim()) return o.Status.trim();
  }
  return null;
}

/** Status string from ticket payload when Halo sends a name (preferred over numeric id mapping). */
function pickExplicitStatusName(ticket: Record<string, unknown>): string | null {
  const st = ticket.status;
  if (st && typeof st === "object" && st !== null) {
    const o = st as Record<string, unknown>;
    if (typeof o.name === "string" && o.name.trim()) return o.name.trim();
    if (typeof o.Status === "string" && o.Status.trim()) return o.Status.trim();
  }
  return (
    nestedName(st) ??
    strField(ticket.statusname) ??
    strField(ticket.status_name) ??
    strField(ticket.ticketstatus) ??
    strField(ticket.ticketstatusname) ??
    (typeof st === "string" ? st.trim() : null) ??
    strField(ticket.status) ??
    null
  );
}

function pickStatusName(ticket: Record<string, unknown>): string {
  const st = ticket.status;
  if (st && typeof st === "object" && st !== null) {
    const o = st as Record<string, unknown>;
    if (typeof o.name === "string" && o.name.trim()) return o.name.trim();
    if (typeof o.Status === "string" && o.Status.trim()) return o.Status.trim();
  }
  return (
    nestedName(st) ??
    strField(ticket.statusname) ??
    strField(ticket.status_name) ??
    strField(ticket.ticketstatus) ??
    strField(ticket.ticketstatusname) ??
    (typeof st === "string" ? st.trim() : null) ??
    strField(ticket.status) ??
    "Open"
  );
}

function pickClientName(ticket: Record<string, unknown>): string {
  const c = ticket.client;
  if (c && typeof c === "object" && c !== null) {
    const o = c as Record<string, unknown>;
    const fromObj =
      strField(o.name) ??
      strField(o.clientname) ??
      strField(o.client_name) ??
      nestedName(c);
    if (fromObj) return fromObj;
  }
  if (typeof c === "string" && c.trim()) return c.trim();

  const customer = ticket.customer;
  if (customer && typeof customer === "object" && customer !== null) {
    const o = customer as Record<string, unknown>;
    const cn =
      strField(o.name) ??
      strField(o.customername) ??
      strField(o.customer_name) ??
      nestedName(customer);
    if (cn) return cn;
  }
  if (typeof customer === "string" && customer.trim()) return customer.trim();

  const site = ticket.site;
  if (site && typeof site === "object" && site !== null) {
    const o = site as Record<string, unknown>;
    const sn = strField(o.name) ?? strField(o.sitename) ?? nestedName(site);
    if (sn) return sn;
  }

  const acct = ticket.account;
  if (acct && typeof acct === "object" && acct !== null) {
    const o = acct as Record<string, unknown>;
    const an = strField(o.name) ?? strField(o.accountname) ?? nestedName(acct);
    if (an) return an;
  }

  const comp = ticket.company;
  if (comp && typeof comp === "object" && comp !== null) {
    const o = comp as Record<string, unknown>;
    const cn = strField(o.name) ?? strField(o.companyname) ?? nestedName(comp);
    if (cn) return cn;
  }

  return (
    nestedName(c) ??
    strField(ticket.clientname) ??
    strField(ticket.client_name) ??
    strField(ticket.sitename) ??
    strField(ticket.companyname) ??
    strField(ticket.accountname) ??
    "Unknown"
  );
}

/** Project / ticket manager (HaloPSA `manager` object), not the same as agent on all record types. */
function pickManagerName(ticket: Record<string, unknown>): string | null {
  const m = ticket.manager;
  if (m && typeof m === "object" && m !== null) {
    const o = m as Record<string, unknown>;
    const n = strField(o.name) ?? nestedName(m);
    if (n) return n;
  }
  const pm = ticket.projectmanager;
  if (pm && typeof pm === "object" && pm !== null) {
    const n = nestedName(pm) ?? strField((pm as Record<string, unknown>).name);
    if (n) return n;
  }
  return (
    strField(ticket.managername) ??
    strField(ticket.manager_name) ??
    strField(ticket.projectmanagername) ??
    null
  );
}

function pickNestedPersonName(obj: unknown): string | null {
  if (obj == null) return null;
  if (typeof obj === "string" && obj.trim()) return obj.trim();
  if (typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  return (
    strField(o.name) ??
    strField(o.agentname) ??
    strField(o.agent_name) ??
    nestedName(obj)
  );
}

/** Delivery health Owner column: tickets - agent → assignedto → assignee → technician. */
function pickTicketOwnerForDashboard(ticket: Record<string, unknown>): string | null {
  const ag = ticket.agent;
  if (typeof ag === "string" && ag.trim()) return ag.trim();
  if (ag && typeof ag === "object" && ag !== null) {
    const n = pickNestedPersonName(ag);
    if (n) return n;
  }
  const assigned = ticket.assignedto ?? ticket.assigned_to;
  if (typeof assigned === "string" && assigned.trim()) return assigned.trim();
  if (assigned && typeof assigned === "object") {
    const n = pickNestedPersonName(assigned);
    if (n) return n;
  }
  const asg = ticket.assignee;
  if (typeof asg === "string" && asg.trim()) return asg.trim();
  if (asg && typeof asg === "object" && asg !== null) {
    const n = pickNestedPersonName(asg);
    if (n) return n;
  }
  const tech = ticket.technician;
  if (typeof tech === "string" && tech.trim()) return tech.trim();
  if (tech && typeof tech === "object" && tech !== null) {
    const n = pickNestedPersonName(tech);
    if (n) return n;
  }
  return (
    strField(ticket.agentname) ??
    strField(ticket.agent_name) ??
    strField(ticket.technicianname) ??
    null
  );
}

/** Direct ticket/project agent only (no assigned/team fallback). */
function pickPrimaryAgentName(ticket: Record<string, unknown>): string | null {
  const ag = ticket.agent;
  if (typeof ag === "string" && ag.trim()) return ag.trim();
  if (ag && typeof ag === "object") {
    const n = pickNestedPersonName(ag);
    if (n) return n;
  }
  return strField(ticket.agentname) ?? strField(ticket.agent_name) ?? null;
}

/** Delivery health Owner column: projects - manager → lead → assignedto. */
function pickProjectOwnerForDashboard(ticket: Record<string, unknown>): string | null {
  const fromMgr = pickManagerName(ticket);
  if (fromMgr) return fromMgr;
  const lead = ticket.lead;
  if (typeof lead === "string" && lead.trim()) return lead.trim();
  if (lead && typeof lead === "object" && lead !== null) {
    const n = pickNestedPersonName(lead);
    if (n) return n;
  }
  const assigned = ticket.assignedto ?? ticket.assigned_to;
  if (typeof assigned === "string" && assigned.trim()) return assigned.trim();
  if (assigned && typeof assigned === "object") {
    const n = pickNestedPersonName(assigned);
    if (n) return n;
  }
  return null;
}

/** End user / reporter - NOT the assigned engineer (do not use for suggested_owner). */
function pickClientContactName(ticket: Record<string, unknown>): string | null {
  const fromUser =
    strField(ticket.user_name) ??
    strField(ticket.username) ??
    strField(ticket.requester) ??
    strField(ticket.requestername) ??
    strField(ticket.raisedby) ??
    strField(ticket.raised_by) ??
    strField(ticket.endusername) ??
    strField(ticket.contactname) ??
    null;
  if (fromUser) return fromUser;

  const req = ticket.requester ?? ticket.contact ?? ticket.enduser;
  if (req && typeof req === "object") {
    const n =
      nestedName(req) ??
      strField((req as Record<string, unknown>).name) ??
      strField((req as Record<string, unknown>).contactname);
    if (n) return n;
  }
  return null;
}

function pickPriorityName(ticket: Record<string, unknown>): string {
  const pr = ticket.priority;
  return (
    nestedName(pr) ??
    strField(ticket.priorityname) ??
    strField(ticket.priority_name) ??
    (typeof pr === "string" ? pr.trim() : null) ??
    "Standard"
  );
}

/** HaloPSA numeric ticket status IDs (common defaults; unknown IDs → null so nested API names win). */
function getStatusName(statusId: number): string | null {
  const statusMap: Record<number, string> = {
    1: "Open",
    2: "In Progress",
    3: "Awaiting User",
    4: "Awaiting Agent",
    5: "Awaiting Parts",
    6: "Awaiting Change",
    7: "Awaiting Problem",
    8: "Awaiting Release",
    9: "On Hold",
    10: "Scheduled",
    11: "Pending Approval",
    12: "Pending",
    13: "New",
    14: "Active",
    15: "Completed",
    16: "Resolved",
    17: "Closed",
    18: "Cancelled",
    19: "Merged",
    20: "Duplicate",
    21: "Reopened",
    22: "In Progress",
    23: "Waiting",
    24: "Deferred",
    25: "Testing",
    26: "Approved",
    27: "Rejected",
    28: "Planning",
    29: "Design",
    30: "Development",
  };
  return statusMap[statusId] ?? null;
}

/** HaloPSA list/detail payloads often expose `status_id` instead of a nested status object. */
function haloStatusLabelFromId(statusId: unknown): string | null {
  if (statusId === null || statusId === undefined || statusId === "") return null;
  const n =
    typeof statusId === "number" ? statusId : Number.parseInt(String(statusId), 10);
  if (!Number.isFinite(n)) return null;
  return getStatusName(n);
}

function haloPriorityLabelFromId(priorityId: unknown): string | null {
  if (priorityId === null || priorityId === undefined) return null;
  const n =
    typeof priorityId === "number" ? priorityId : Number.parseInt(String(priorityId), 10);
  if (!Number.isFinite(n)) return null;
  switch (n) {
    case 1:
      return "Low";
    case 2:
      return "Medium";
    case 3:
      return "High";
    case 4:
      return "Critical";
    default:
      return "Standard";
  }
}

function parseTicketClientId(ticket: Record<string, unknown>): number | null {
  const raw = ticket.client_id ?? ticket.clientid;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function pickTargetDateSkippingHaloNullSentinels(
  ticket: Record<string, unknown>,
): string | null {
  const td =
    strField(ticket.targetdate) ??
    strField(ticket.target_date) ??
    strField(ticket.duedate) ??
    strField(ticket.due_date) ??
    strField(ticket.datedue) ??
    null;
  if (!td) return null;
  if (td.startsWith("1900") || td.startsWith("1899")) return null;
  return td;
}

function numField(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function parseTickettypeId(ticket: Record<string, unknown>): number | null {
  const raw = ticket.tickettype_id;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Classifies Halo ticket type config, `use`, project flags, and parent project for AI / UI. */
export function classifyHaloTicketType(
  ticket: Record<string, unknown>,
  ticketTypes?: Record<number, HaloTicketTypeEntry> | null,
): {
  ticket_type: string;
  is_project: boolean;
  ticket_type_name: string;
  is_project_task: boolean;
  parent_project_id: number | null;
  tickettype_id: number | null;
} {
  const useRaw = ticket.use;
  const useVal = typeof useRaw === "string" ? useRaw.trim().toLowerCase() : "";
  const projectinternaltask = Boolean(ticket.projectinternaltask);
  const mainPid = numField(ticket.main_project_id);
  const tickettype_id = parseTickettypeId(ticket);

  const meta =
    tickettype_id != null && ticketTypes && ticketTypes[tickettype_id]
      ? ticketTypes[tickettype_id]
      : undefined;
  const typeUseNorm =
    typeof meta?.use === "string" ? meta.use.trim().toLowerCase() : "";
  const isProjectFromTicketType =
    typeUseNorm === "projects" || typeUseNorm === "project";
  const isProjectFromRawUse = useVal === "project" || useVal === "projects";

  const is_project_task =
    projectinternaltask === true || (ticket.main_project_id != null && mainPid > 0);

  const is_project =
    isProjectFromTicketType || isProjectFromRawUse || is_project_task;

  let ticket_type: string;
  if (isProjectFromTicketType || isProjectFromRawUse) {
    ticket_type = "Project";
  } else if (projectinternaltask || mainPid > 0) {
    ticket_type = "Project Task";
  } else if (useVal === "task") {
    ticket_type = "Task";
  } else if (useVal === "opportunity") {
    ticket_type = "Opportunity";
  } else {
    ticket_type = "Ticket";
  }

  const ticket_type_name =
    (meta?.name && String(meta.name).trim()) ||
    nestedName(ticket.tickettype) ||
    "";

  return {
    ticket_type,
    is_project,
    ticket_type_name,
    is_project_task,
    parent_project_id: mainPid > 0 ? Math.trunc(mainPid) : null,
    tickettype_id,
  };
}

/** Logs full Halo payload once per batch (server logs). */
export function logFullRawTicket(first: unknown): void {
  console.log("FULL RAW TICKET:", JSON.stringify(first, null, 2));
  if (first && typeof first === "object") {
    console.log("Available fields:", Object.keys(first as object));
  }
  if (process.env.NODE_ENV === "development" && first && typeof first === "object") {
    const t = first as Record<string, unknown>;
    console.log("Ticket fields:", Object.keys(t));
    console.log(
      "Status value:",
      t.status,
      t.statusname,
      t.status_name,
      t.ticketstatus,
      (t as { "status.name"?: unknown })["status.name"],
    );
    console.log(
      "Client value:",
      t.client,
      t.clientname,
      t.client_name,
      t.site,
      t.sitename,
      (t as { "client.name"?: unknown })["client.name"],
      t.account,
      t.accountname,
    );
  }
}

function haloNoteNumericId(note: HaloNote): number {
  const n = note as Record<string, unknown>;
  const idRaw = note.id ?? n.action_id ?? n.actionid;
  if (typeof idRaw === "number" && Number.isFinite(idRaw)) return idRaw;
  if (typeof idRaw === "string") return Number.parseInt(idRaw, 10) || 0;
  return 0;
}

function haloNoteTimeMs(note: HaloNote): number {
  const n = note as Record<string, unknown>;
  const candidates = [
    note.posted,
    note.date,
    note.created_at,
    note.created,
    n.date_occurred,
    n.dateoccurred,
    n.datetime,
    n.dateemailed,
    n.actiondatecreated,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) {
      const t = new Date(c).getTime();
      if (!Number.isNaN(t)) return t;
    }
  }
  return 0;
}

/**
 * HaloPSA often returns actions/notes newest-first. Prompts expect oldest-first so the
 * latest note is last in the block (matches "weight recent notes" instructions).
 */
export function sortHaloNotesOldestFirst(notes: HaloNote[]): HaloNote[] {
  if (notes.length <= 1) return notes.slice();
  return [...notes].sort((a, b) => {
    const d = haloNoteTimeMs(a) - haloNoteTimeMs(b);
    if (d !== 0) return d;
    return haloNoteNumericId(a) - haloNoteNumericId(b);
  });
}

/** Merged ticket actions (all types): sort by action id ascending. */
function sortHaloNotesByIdAsc(notes: HaloNote[]): HaloNote[] {
  if (notes.length <= 1) return notes.slice();
  return [...notes].sort((a, b) => {
    const ia = haloNoteNumericId(a);
    const ib = haloNoteNumericId(b);
    if (ia !== ib) return ia - ib;
    return haloNoteTimeMs(a) - haloNoteTimeMs(b);
  });
}

function parseHaloActionsResponseJson(json: unknown): HaloNote[] {
  if (json == null) return [];
  if (Array.isArray(json)) return json as HaloNote[];
  if (typeof json !== "object") return [];
  const o = json as Record<string, unknown>;
  const result: HaloNote[] = [];
  for (const key of ["actions", "actionsdetails", "notes"]) {
    const v = o[key];
    if (Array.isArray(v)) result.push(...(v as HaloNote[]));
  }
  return result;
}

/** Dedupe by action id, sort by id ascending; entries without id follow, ordered by time. */
function mergeHaloActionNoteLists(lists: HaloNote[][]): HaloNote[] {
  const byId = new Map<number, HaloNote>();
  const noId: HaloNote[] = [];
  for (const list of lists) {
    for (const note of list) {
      const id = haloNoteNumericId(note);
      if (id > 0) byId.set(id, note);
      else noId.push(note);
    }
  }
  const merged = sortHaloNotesByIdAsc([...byId.values()]);
  noId.sort((a, b) => haloNoteTimeMs(a) - haloNoteTimeMs(b));
  return [...merged, ...noId];
}

/** Normalizes HaloPSA API ticket payloads (flat or nested) into our HaloTicket shape. */
export function mapTicket(
  ticket: Record<string, unknown>,
  ticketTypes?: Record<number, HaloTicketTypeEntry> | null,
): HaloTicket {
  const rawId = ticket.id ?? ticket.ticket_id;
  const id =
    typeof rawId === "number"
      ? rawId
      : typeof rawId === "string"
        ? Number.parseInt(rawId, 10) || 0
        : 0;

  const clientId = parseTicketClientId(ticket);

  const explicitStatus = pickExplicitStatusName(ticket);
  const fromStatusId = haloStatusLabelFromId(ticket.status_id);
  const statusName = explicitStatus ?? fromStatusId ?? pickStatusName(ticket);

  const rawSid = ticket.status_id ?? ticket.StatusID ?? (ticket.status as Record<string, unknown> | null)?.id;
  let statusIdNum: number | null = null;
  if (typeof rawSid === "number" && Number.isFinite(rawSid)) statusIdNum = rawSid;
  else if (typeof rawSid === "string") {
    const n = Number.parseInt(rawSid, 10);
    if (Number.isFinite(n)) statusIdNum = n;
  }

  const flatClient =
    strField(ticket.client_name) ??
    strField(ticket.clientname) ??
    strField(ticket.customername) ??
    strField(ticket.customer_name) ??
    strField(ticket.oppcompanyname);
  const clientName = flatClient ?? pickClientName(ticket);

  const clientContactName = pickClientContactName(ticket);

  const flatPriority = haloPriorityLabelFromId(ticket.priority_id);
  const priorityName = flatPriority ?? pickPriorityName(ticket);

  const summary =
    strField(ticket.summary) ??
    strField(ticket.idsummary) ??
    strField(ticket.title) ??
    strField(ticket.subject) ??
    strField(ticket.name) ??
    "";

  const details =
    strField(ticket.details) ??
    strField(ticket.description) ??
    strField(ticket.detail) ??
    strField(ticket.note) ??
    null;

  const dateoccurred =
    strField(ticket.dateoccurred) ??
    strField(ticket.last_update) ??
    strField(ticket.date_occurred) ??
    strField(ticket.dateopened) ??
    strField(ticket.created_at) ??
    strField(ticket.opendate) ??
    null;

  const targetdate = pickTargetDateSkippingHaloNullSentinels(ticket);

  const timetaken = numField(
    ticket.projecttimeactual ?? ticket.act_time ?? ticket.timetaken ?? ticket.time_taken ?? ticket.time_logged ?? ticket.totaltime,
  );

  const notesRaw = ticket.notes ?? ticket.actions;
  const notes = sortHaloNotesOldestFirst(
    Array.isArray(notesRaw) ? (notesRaw as HaloNote[]) : [],
  );

  const siteDisplay =
    strField(ticket.site_name) ?? nestedName(ticket.site);

  const team =
    strField(ticket.team) ??
    (ticket.team && typeof ticket.team === "object"
      ? nestedName(ticket.team)
      : null);

  const classification = classifyHaloTicketType(ticket, ticketTypes);

  const actionByRaw =
    ticket.actionby_agent_id ??
    ticket.actionbyagentid ??
    ticket.actionbyagent_id ??
    ticket.action_by_agent_id;
  const actionByAgentId =
    typeof actionByRaw === "number"
      ? actionByRaw
      : typeof actionByRaw === "string"
        ? Number.parseInt(actionByRaw, 10)
        : NaN;

  const assignedPassthrough = ticket.assignedto ?? ticket.assigned_to;
  const technicianPassthrough = ticket.technician;
  const whoPassthrough = ticket.who_agentid ?? ticket.who_agent_id;

  return {
    id,
    clientId,
    status_id: statusIdNum,
    summary,
    details,
    status: { name: statusName },
    priority: { name: priorityName },
    client: clientName ? { name: clientName } : null,
    site: siteDisplay ? { name: siteDisplay } : null,
    agent: pickPrimaryAgentName(ticket) ? { name: pickPrimaryAgentName(ticket)! } : null,
    manager: pickManagerName(ticket) ? { name: pickManagerName(ticket)! } : null,
    clientContact: clientContactName ? { name: clientContactName } : null,
    actionby_agent_id: Number.isFinite(actionByAgentId) ? actionByAgentId : null,
    ...(assignedPassthrough !== undefined && assignedPassthrough !== null
      ? { assignedto: assignedPassthrough }
      : {}),
    ...(technicianPassthrough !== undefined && technicianPassthrough !== null
      ? { technician: technicianPassthrough }
      : {}),
    ...(whoPassthrough !== undefined && whoPassthrough !== null
      ? {
          who_agentid:
            typeof whoPassthrough === "number" || typeof whoPassthrough === "string"
              ? whoPassthrough
              : null,
        }
      : {}),
    ...(ticket.who !== undefined && ticket.who !== null ? { who: ticket.who } : {}),
    dateoccurred,
    targetdate,
    timetaken,
    flagged: Boolean(ticket.flagged ?? false),
    onhold: Boolean(ticket.onhold ?? false),
    team: team ?? undefined,
    category_1:
      strField(ticket.category_1) ??
      strField(ticket.category1) ??
      null,
    category_2:
      strField(ticket.category_2) ??
      strField(ticket.category2) ??
      null,
    tickettype: nestedName(ticket.tickettype)
      ? { name: nestedName(ticket.tickettype)! }
      : null,
    ticket_type: classification.ticket_type,
    is_project: classification.is_project,
    ticket_type_name: classification.ticket_type_name || undefined,
    is_project_task: classification.is_project_task,
    parent_project_id: classification.parent_project_id,
    tickettype_id: classification.tickettype_id,
    actions: Array.isArray(ticket.actions) ? (ticket.actions as HaloTicket["actions"]) : null,
    latestnote: strField(ticket.latestnote) ?? null,
    notes,
  };
}

/** Normalizes HaloPSA API project payloads into our HaloProject shape. */
export function mapProject(project: Record<string, unknown>): HaloProject {
  const rawId =
    project.id ??
    project.project_id ??
    project.projectid ??
    project.projectId ??
    project.ProjectID;
  const id =
    typeof rawId === "number"
      ? rawId
      : typeof rawId === "string"
        ? Number.parseInt(rawId, 10) || 0
        : 0;

  const rawClientId =
    project.client_id ??
    project.clientid ??
    project.clientId ??
    project.clientID ??
    (typeof project.client === "object" && project.client != null
      ? (project.client as Record<string, unknown>).id
      : undefined);
  const clientId =
    typeof rawClientId === "number"
      ? rawClientId
      : typeof rawClientId === "string"
        ? Number.parseInt(rawClientId, 10)
        : null;

  const str = (v: unknown): string | null =>
    typeof v === "string" && v.trim() ? v.trim() : null;
  const nestedName = (v: unknown): string | null => {
    if (v == null) return null;
    if (typeof v === "string") return v || null;
    if (typeof v === "object" && v !== null && "name" in v) {
      const n = (v as { name?: unknown }).name;
      return typeof n === "string" ? n : null;
    }
    return null;
  };

  const name =
    str(project.name as unknown) ?? str(project.title as unknown) ?? "";

  const statusName =
    nestedName(project.status) ??
    str(project.statusname as unknown) ??
    str(project.status as unknown) ??
    "Unknown";

  const clientName =
    nestedName(project.client) ??
    str(project.clientname as unknown) ??
    str(project.client as unknown) ??
    null;

  const managerName =
    nestedName(project.agent) ??
    nestedName(project.manager) ??
    str(project.agentname as unknown);

  const targetdate =
    str(project.targetdate as unknown) ?? str(project.target_date as unknown) ?? null;

  const description =
    str(project.description as unknown) ?? str(project.details as unknown) ?? null;

  const completionpercentRaw = project.completionpercent ?? project.completion_percent;
  const completionpercent =
    typeof completionpercentRaw === "number"
      ? completionpercentRaw
      : typeof completionpercentRaw === "string"
        ? Number.parseFloat(completionpercentRaw)
        : undefined;

  const notesRaw = project.notes;
  const notes = sortHaloNotesOldestFirst(
    Array.isArray(notesRaw) ? (notesRaw as HaloNote[]) : [],
  );

  return {
    id,
    name,
    status: { name: statusName },
    clientId: Number.isFinite(clientId as number) ? (clientId as number) : null,
    client: clientName ? { name: clientName } : null,
    description,
    projectmanager: managerName ? { name: managerName } : null,
    startdate: str(project.startdate as unknown) ?? str(project.start_date as unknown) ?? null,
    targetdate,
    completionpercent: Number.isFinite(completionpercent as number)
      ? (completionpercent as number)
      : undefined,
    tasks: Array.isArray(project.tasks) ? (project.tasks as HaloProject["tasks"]) : null,
    notes,
  };
}

export { TICKET_SECTION_RULE };

/** Cached row from Halo `/api/TicketType` (id → name + use). */
export type HaloTicketTypeEntry = { name: string; use: string };

const TICKET_TYPES_CACHE_TTL_MS = 30 * 60 * 1000;
let ticketTypesCache: Record<number, HaloTicketTypeEntry> | null = null;
let ticketTypesCacheTime = 0;

async function getTicketTypes(
  baseUrl: string,
  token: string,
): Promise<Record<number, HaloTicketTypeEntry>> {
  if (
    ticketTypesCache != null &&
    Date.now() - ticketTypesCacheTime < TICKET_TYPES_CACHE_TTL_MS
  ) {
    return ticketTypesCache;
  }
  ticketTypesCache = null;

  try {
    const res = await fetch(`${baseUrl}/api/TicketType`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) {
      console.log("[ticketTypes] response not ok:", res.status);
      return {};
    }
    const data: unknown = await res.json();
    const types: unknown[] = (() => {
      if (Array.isArray(data)) return data;
      if (data && typeof data === "object") {
        const o = data as Record<string, unknown>;
        if (Array.isArray(o.tickettypes)) return o.tickettypes;
        if (Array.isArray(o.result)) return o.result;
      }
      return [];
    })();

    console.log("[ticketTypes] fetched:", types.length, "types");
    if (types[0] != null) {
      console.log("[ticketTypes] sample:", JSON.stringify(types[0], null, 2));
    }

    const typeMap: Record<number, HaloTicketTypeEntry> = {};
    for (const row of types) {
      if (!row || typeof row !== "object") continue;
      const t = row as Record<string, unknown>;
      const idRaw = t.id;
      const id =
        typeof idRaw === "number" && Number.isFinite(idRaw)
          ? idRaw
          : typeof idRaw === "string"
            ? Number.parseInt(idRaw, 10)
            : NaN;
      if (!Number.isFinite(id)) continue;
      const useRaw = t.use ?? t.usedfor ?? t.type ?? "tickets";
      typeMap[id] = {
        name: typeof t.name === "string" ? t.name : "",
        use: typeof useRaw === "string" ? useRaw : String(useRaw),
      };
    }

    ticketTypesCache = typeMap;
    ticketTypesCacheTime = Date.now();
    return typeMap;
  } catch (err) {
    console.error("[ticketTypes] error:", err);
    return {};
  }
}

/** Row from Halo ticket status list endpoints (used for QBR resolved matching by id + name). */
export type HaloTicketStatusRow = { id: number; name: string };

/**
 * Fetches all ticket statuses from HaloPSA. Tries common API paths; returns [] if unavailable.
 */
export async function getHaloTicketStatuses(
  haloUrl: string,
  token: string,
): Promise<HaloTicketStatusRow[]> {
  const base = normalizeHaloUrl(haloUrl);
  const endpoints = [`${base}/api/TicketStatus`, `${base}/api/ticketstatus`];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) continue;
      const data: unknown = await res.json();
      const rows: unknown[] = (() => {
        if (Array.isArray(data)) return data;
        if (data && typeof data === "object") {
          const o = data as Record<string, unknown>;
          if (Array.isArray(o.ticketstatus)) return o.ticketstatus;
          if (Array.isArray(o.TicketStatus)) return o.TicketStatus;
          if (Array.isArray(o.result)) return o.result;
          if (Array.isArray(o.record)) return o.record;
          if (Array.isArray(o.data)) return o.data;
        }
        return [];
      })();
      const out: HaloTicketStatusRow[] = [];
      for (const row of rows) {
        if (!row || typeof row !== "object") continue;
        const t = row as Record<string, unknown>;
        const idRaw = t.id ?? t.status_id ?? t.StatusID;
        const id =
          typeof idRaw === "number" && Number.isFinite(idRaw)
            ? idRaw
            : typeof idRaw === "string"
              ? Number.parseInt(idRaw, 10)
              : NaN;
        if (!Number.isFinite(id)) continue;
        const name =
          strField(t.name) ??
          strField(t.statusname) ??
          strField(t.label) ??
          "";
        out.push({ id, name: name.trim() || `Status ${id}` });
      }
      if (out.length > 0) {
        console.log("[ticketStatuses] fetched:", out.length, "from", url);
        return out;
      }
    } catch (e) {
      console.error("[ticketStatuses]", url, e);
    }
  }
  return [];
}

export interface HaloTicket {
  id: number;
  /** Flat Halo `client_id` / `clientid` when present (for filtering). */
  clientId?: number | null;
  /** Halo ticket status id when the API exposes `status_id` / `StatusID`. */
  status_id?: number | null;
  summary: string;
  details: string | null;
  status: { name: string };
  priority: { name: string } | null;
  client: { name: string } | null;
  site: { name: string } | null;
  /** Internal engineer / technician (agent), not the client reporter. */
  agent: { name: string } | null;
  /** Project manager / owner on project-type records when Halo exposes `manager`. */
  manager: { name: string } | null;
  /** Client-side contact or person who raised the ticket (reporter). */
  clientContact: { name: string } | null;
  /** Halo "action by" agent id when present in ticket payload. */
  actionby_agent_id?: number | null;
  /** Raw Halo assignee payloads when present (owner resolution). */
  assignedto?: unknown;
  technician?: unknown;
  /** Halo `who` (assignee / user) object or string on some ticket payloads. */
  who?: unknown;
  who_agentid?: number | string | null;
  dateoccurred: string | null;
  targetdate?: string | null;
  timetaken?: number | null;
  flagged?: boolean | null;
  onhold?: boolean | null;
  team?: string | null;
  /** Primary / secondary category labels when exposed by Halo list/detail. */
  category_1?: string | null;
  category_2?: string | null;
  tickettype: { name: string } | null;
  /** Derived from Halo `use`, `projectinternaltask`, `main_project_id`. */
  ticket_type?: string;
  /** True for project-type tickets (TicketType use), project tasks, or raw `use` project. */
  is_project?: boolean;
  /** Display name from `/api/TicketType` when available. */
  ticket_type_name?: string;
  is_project_task?: boolean;
  parent_project_id?: number | null;
  tickettype_id?: number | null;
  actions?: Array<{ description?: string | null; name?: string | null }> | null;
  latestnote?: string | null;
  notes?: HaloNote[];
}

export interface HaloClient {
  id: number;
  name: string;
}

export interface HaloAgent {
  id: number;
  name: string;
}

export interface HaloProject {
  id: number;
  name: string;
  status: { name: string } | null;
  /** Halo numeric client id when available (used for in-memory filtering/counts). */
  clientId?: number | null;
  client: { name: string } | null;
  description: string | null;
  projectmanager: { name: string } | null;
  startdate: string | null;
  targetdate: string | null;
  completionpercent?: number | null;
  tasks?: Array<{ name?: string | null; summary?: string | null }> | null;
  notes?: HaloNote[];
}

export interface HaloNote {
  id?: number | string;
  note?: string | null;
  details?: string | null;
  description?: string | null;
  body?: string | null;
  posted?: string | null;
  date?: string | null;
  created_at?: string | null;
  created?: string | null;
  who?: string | null;
  /** Some Halo payloads use who_type to distinguish agent vs client. */
  who_type?: string | null;
  author?: string | null;
  agent?: { name?: string | null; firstname?: string | null; lastname?: string | null } | null;
  agentname?: string | null;
  agent_name?: string | null;
  actionby?: string | null;
  action_by?: string | null;
  createdby?: string | null;
  created_by?: string | null;
  username?: string | null;
  user_name?: string | null;
  /** Email action fields (HaloPSA Actions API). */
  emaildirection?: string | null;
  emailsubject?: string | null;
  emailbody?: string | null;
  emailbody_html?: string | null;
  emailfrom?: string | null;
  emailto?: string | null;
  outcome?: string | null;
  datetime?: string | null;
  dateemailed?: string | null;
}

function normalizeHaloUrl(url: string): string {
  const normalized = url.trim().replace(/\/+$/, "");
  if (!/^https:\/\/[^/]+$/i.test(normalized)) {
    throw new Error(
      "HaloPSA URL should be in the format https://yourcompany.halopsa.com",
    );
  }
  return normalized;
}

export async function getHaloToken(credentials: HaloCredentials): Promise<string> {
  const haloUrl = normalizeHaloUrl(credentials.haloUrl);
  const token = await getCachedHaloAccessToken({
    haloUrl,
    tenant: credentials.tenant,
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
  });
  if (!token) {
    throw new Error(
      "Could not authenticate with HaloPSA. Check your Client ID and Secret.",
    );
  }
  return token;
}

function parseTicketsPayload(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.tickets)) return o.tickets;
    if (Array.isArray(o.result)) return o.result;
    if (Array.isArray(o.data)) return o.data;
  }
  return [];
}

function utcDayFromYmd(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return NaN;
  return Date.UTC(y, m - 1, d);
}

function projectDayTs(isoOrYmd: string | null | undefined): number | null {
  if (!isoOrYmd || !String(isoOrYmd).trim()) return null;
  const t = Date.parse(isoOrYmd);
  if (Number.isNaN(t)) return null;
  const dt = new Date(t);
  return Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
}

/**
 * Keeps projects that overlap UTC day window [dateFrom, dateTo] (when start/target known),
 * or all projects with no schedule fields (API did not expose dates).
 */
export function filterHaloProjectsByActivePeriod(
  projects: HaloProject[],
  dateFromYmd: string,
  dateToYmd: string,
): HaloProject[] {
  const ws = utcDayFromYmd(dateFromYmd);
  const we = utcDayFromYmd(dateToYmd);
  if (!Number.isFinite(ws) || !Number.isFinite(we)) return projects;

  return projects.filter((p) => {
    const s = projectDayTs(p.startdate);
    const e = projectDayTs(p.targetdate);
    if (s === null && e === null) return true;

    let effStart: number;
    let effEnd: number;
    if (s !== null && e !== null) {
      effStart = Math.min(s, e);
      effEnd = Math.max(s, e);
    } else if (s !== null) {
      effStart = s;
      effEnd = we;
    } else {
      effStart = ws;
      effEnd = e as number;
    }

    return effStart <= we && effEnd >= ws;
  });
}

function extractProjectsBatch(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;

  // Common wrappers across Halo deployments.
  if (Array.isArray(o.projects)) return o.projects;
  if (Array.isArray(o.Projects)) return o.Projects;
  if (Array.isArray(o.result)) return o.result;
  if (Array.isArray(o.data)) return o.data;
  if (Array.isArray(o.Records)) return o.Records;
  if (Array.isArray(o.records)) return o.records;

  // Nested wrappers: { result: { projects: [...] } } etc.
  const r = o.result;
  if (r && typeof r === "object" && !Array.isArray(r)) {
    const ro = r as Record<string, unknown>;
    if (Array.isArray(ro.projects)) return ro.projects;
    if (Array.isArray(ro.Projects)) return ro.Projects;
    if (Array.isArray(ro.data)) return ro.data;
    if (Array.isArray(ro.result)) return ro.result;
  }
  const d = o.data;
  if (d && typeof d === "object" && !Array.isArray(d)) {
    const do_ = d as Record<string, unknown>;
    if (Array.isArray(do_.projects)) return do_.projects;
    if (Array.isArray(do_.Projects)) return do_.Projects;
    if (Array.isArray(do_.records)) return do_.records;
    if (Array.isArray(do_.Records)) return do_.Records;
  }

  return [];
}

export async function getAllHaloProjects(
  haloUrl: string,
  token: string,
  filters: { clientId?: number; dateFrom?: string; dateTo?: string },
): Promise<HaloProject[]> {
  const projects = (await getHaloProjects(haloUrl, token, {
    clientIds:
      typeof filters.clientId === "number" ? [filters.clientId] : undefined,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  })) as HaloProject[];
  return projects;
}

/**
 * Fetches all HaloPSA clients across paginated API pages (default API only returns first page).
 */
export async function getAllHaloClients(
  haloUrl: string,
  token: string,
): Promise<HaloClient[]> {
  const base = normalizeHaloUrl(haloUrl);
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  let allClients: unknown[] = [];
  let page = 1;
  const pageSize = 100;
  let hasMore = true;

  while (hasMore) {
    const url = `${base}/api/Clients?pageinate=true&page_size=${pageSize}&page_no=${page}&includeinactive=false`;
    console.log(`[clients] Fetching page ${page}:`, url);

    const res = await fetch(url, { headers, cache: "no-store" });

    if (!res.ok) {
      console.error("[clients] Failed:", res.status);
      if (page === 1 && res.status === 404) {
        const fallback = await fetch(`${base}/api/Client`, {
          headers,
          cache: "no-store",
        });
        if (!fallback.ok) {
          throw new Error("Could not fetch HaloPSA clients.");
        }
        const data = (await fallback.json()) as { clients?: HaloClient[] } | HaloClient[];
        const arr = Array.isArray(data) ? data : Array.isArray(data.clients) ? data.clients : [];
        return arr.map((c) => ({
          id: typeof c.id === "number" ? c.id : Number(c.id),
          name:
            typeof (c as { name?: string }).name === "string"
              ? (c as { name: string }).name
              : String((c as { clientname?: string }).clientname ?? ""),
        }));
      }
      break;
    }

    const data = (await res.json()) as Record<string, unknown>;
    const clients =
      (Array.isArray(data.clients) ? data.clients : null) ??
      (Array.isArray(data.result) ? data.result : null) ??
      (Array.isArray(data.data) ? data.data : null) ??
      (Array.isArray(data) ? data : []);

    const batch = Array.isArray(clients) ? clients : [];
    console.log(`[clients] Page ${page}: ${batch.length} clients`);

    if (batch.length === 0) {
      hasMore = false;
    } else {
      allClients = [...allClients, ...batch];
      page += 1;
      if (batch.length < pageSize) hasMore = false;
      if (page > 20) hasMore = false;
    }
  }

  console.log(
    `[clients] Total fetched: ${allClients.length} clients across ${Math.max(0, page - 1)} pages`,
  );

  return allClients.map((c) => mapHaloApiRowToClient(c as Record<string, unknown>));
}

/** Normalizes one Halo `/api/Clients` row into `HaloClient`. */
export function mapHaloApiRowToClient(row: Record<string, unknown>): HaloClient {
  const id = row.id;
  const nid = typeof id === "number" ? id : Number(id);
  return {
    id: Number.isFinite(nid) ? nid : 0,
    name:
      (typeof row.name === "string" ? row.name : null) ??
      (typeof row.clientname === "string" ? row.clientname : "") ??
      "",
  };
}

function mapHaloApiRowToAgent(row: Record<string, unknown>): HaloAgent {
  const idRaw = row.id ?? row.agentid ?? row.agent_id;
  const id =
    typeof idRaw === "number"
      ? idRaw
      : typeof idRaw === "string"
        ? Number.parseInt(idRaw, 10)
        : 0;
  const name =
    (typeof row.name === "string" && row.name.trim() ? row.name.trim() : null) ??
    (typeof row.agentname === "string" && row.agentname.trim() ? row.agentname.trim() : null) ??
    (typeof row.fullname === "string" && row.fullname.trim() ? row.fullname.trim() : null) ??
    "";
  return { id: Number.isFinite(id) ? id : 0, name };
}

export async function getHaloAgents(
  haloUrl: string,
  token: string,
): Promise<HaloAgent[]> {
  const base = normalizeHaloUrl(haloUrl);
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const endpoints = [`${base}/api/Agents`, `${base}/api/Agent`];
  for (const url of endpoints) {
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) continue;
    const data = (await res.json()) as unknown;
    const rows =
      Array.isArray(data)
        ? data
        : data && typeof data === "object"
          ? (Array.isArray((data as Record<string, unknown>).agents)
              ? (data as Record<string, unknown>).agents
              : Array.isArray((data as Record<string, unknown>).result)
                ? (data as Record<string, unknown>).result
                : Array.isArray((data as Record<string, unknown>).data)
                  ? (data as Record<string, unknown>).data
                  : [])
          : [];
    if (!Array.isArray(rows)) return [];
    return rows
      .map((r) => mapHaloApiRowToAgent(r as Record<string, unknown>))
      .filter((a) => a.id > 0 && a.name.trim().length > 0);
  }
  return [];
}

/** Display names from GET /api/agent/{id} (process lifetime, avoids repeat fetches). */
const haloAgentNameByIdCache = new Map<number, string | null>();
const haloAgentNameByIdInflight = new Map<number, Promise<string | null>>();

function parseAgentDetailJson(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    const first = raw[0];
    return first && typeof first === "object" ? (first as Record<string, unknown>) : null;
  }
  if (typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const nested =
    (o.agent && typeof o.agent === "object" ? (o.agent as Record<string, unknown>) : null) ??
    (o.Agent && typeof o.Agent === "object" ? (o.Agent as Record<string, unknown>) : null) ??
    (o.result && typeof o.result === "object" && !Array.isArray(o.result)
      ? (o.result as Record<string, unknown>)
      : null);
  return nested ?? o;
}

async function getCachedHaloAgentNameById(
  baseUrl: string,
  token: string,
  agentId: number,
): Promise<string | null> {
  if (!Number.isFinite(agentId) || agentId <= 0) return null;
  if (haloAgentNameByIdCache.has(agentId)) return haloAgentNameByIdCache.get(agentId) ?? null;

  let pending = haloAgentNameByIdInflight.get(agentId);
  if (!pending) {
    pending = (async () => {
      const headers = { Authorization: `Bearer ${token}` };
      const urls = [`${baseUrl}/api/agent/${agentId}`, `${baseUrl}/api/Agent/${agentId}`];
      for (const url of urls) {
        try {
          const res = await fetch(url, { headers, cache: "no-store" });
          if (!res.ok) continue;
          const row = parseAgentDetailJson(await res.json());
          if (!row) continue;
          const a = mapHaloApiRowToAgent(row);
          if (a.name.trim()) {
            haloAgentNameByIdCache.set(agentId, a.name);
            return a.name;
          }
        } catch {
          /* ignore */
        }
      }
      haloAgentNameByIdCache.set(agentId, null);
      return null;
    })().finally(() => {
      haloAgentNameByIdInflight.delete(agentId);
    });
    haloAgentNameByIdInflight.set(agentId, pending);
  }
  return pending;
}

/** Latest note wins: walk newest-first for a non-zero `actionby_agent_id`. */
function pickLatestActionByAgentIdFromNotes(notes: HaloNote[]): number | null {
  for (let i = notes.length - 1; i >= 0; i--) {
    const n = notes[i] as Record<string, unknown>;
    const raw =
      n.actionby_agent_id ??
      n.actionbyagentid ??
      n.actionbyagent_id ??
      n.action_by_agent_id;
    const parsed =
      typeof raw === "number" && Number.isFinite(raw)
        ? raw
        : typeof raw === "string"
          ? Number.parseInt(raw, 10)
          : NaN;
    if (Number.isFinite(parsed) && parsed > 0) return Math.trunc(parsed);
  }
  return null;
}

/**
 * Single page of HaloPSA clients (for API routes that paginate in the browser).
 */
export async function getHaloClientsPage(
  token: string,
  haloUrl: string,
  pageNo: number,
  pageSize: number,
): Promise<{ clients: HaloClient[]; recordCount: number | null }> {
  const base = normalizeHaloUrl(haloUrl);
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const safePage = Number.isFinite(pageNo) && pageNo >= 1 ? Math.floor(pageNo) : 1;
  const safeSize =
    Number.isFinite(pageSize) && pageSize >= 1 ? Math.min(200, Math.floor(pageSize)) : 100;

  const url = `${base}/api/Clients?pageinate=true&page_size=${safeSize}&page_no=${safePage}&includeinactive=false`;
  const res = await fetch(url, { headers, cache: "no-store" });

  if (!res.ok) {
    throw new Error("Could not fetch HaloPSA clients.");
  }

  const data = (await res.json()) as Record<string, unknown>;
  const raw =
    (Array.isArray(data.clients) ? data.clients : null) ??
    (Array.isArray(data.result) ? data.result : null) ??
    (Array.isArray(data.data) ? data.data : null) ??
    (Array.isArray(data) ? data : []);

  const batch = Array.isArray(raw) ? raw : [];

  const rcPick =
    data.record_count ?? data.recordCount ?? data.total ?? data.TotalRecordCount;
  let recordCount: number | null = null;
  if (typeof rcPick === "number" && Number.isFinite(rcPick)) {
    recordCount = rcPick;
  } else if (typeof rcPick === "string") {
    const n = Number.parseInt(rcPick, 10);
    if (Number.isFinite(n)) recordCount = n;
  }

  const clients = batch.map((c) => mapHaloApiRowToClient(c as Record<string, unknown>));

  return { clients, recordCount };
}

type HaloTicketsClientUrlStyle = "client_id_dates" | "clientid_dates" | "client_id_only";

function buildPaginatedTicketsSearchUrl(
  baseUrl: string,
  page: number,
  pageSize: number,
  filters: {
    clientId?: number;
    projectId?: number;
    statusId?: number;
    dateFrom?: string;
    dateTo?: string;
    minimalTicketPayload?: boolean;
  },
  clientStyle: HaloTicketsClientUrlStyle | "none",
): string {
  const url = new URL(`${baseUrl}/api/Tickets`);
  url.searchParams.set("pageinate", "true");
  url.searchParams.set("page_size", String(pageSize));
  url.searchParams.set("page_no", String(page));
  url.searchParams.set("open_only", "true");

  if (typeof filters.projectId === "number") {
    url.searchParams.set("project_id", String(filters.projectId));
  }
  if (typeof filters.statusId === "number") {
    url.searchParams.set("status_id", String(filters.statusId));
  }
  if (filters.minimalTicketPayload) {
    url.searchParams.set("fields", "id,client_id,clientid");
  } else {
    applyHaloTicketsListEnrichment(url, filters);
  }

  const cid = filters.clientId;
  if (clientStyle === "none" || typeof cid !== "number") {
    if (filters.dateFrom) {
      url.searchParams.set("dateFrom", filters.dateFrom);
      url.searchParams.set("dateopen", filters.dateFrom);
    }
    if (filters.dateTo) {
      url.searchParams.set("dateTo", filters.dateTo);
    }
  } else if (clientStyle === "client_id_dates") {
    url.searchParams.set("client_id", String(cid));
    if (filters.dateFrom) {
      url.searchParams.set("dateopen", filters.dateFrom);
    }
    if (filters.dateTo) {
      url.searchParams.set("dateTo", filters.dateTo);
    }
  } else if (clientStyle === "clientid_dates") {
    url.searchParams.set("clientid", String(cid));
    if (filters.dateFrom) {
      url.searchParams.set("dateopen", filters.dateFrom);
    }
    if (filters.dateTo) {
      url.searchParams.set("dateTo", filters.dateTo);
    }
  } else {
    url.searchParams.set("client_id", String(cid));
  }

  return url.toString();
}

async function discoverHaloTicketsClientFilterStyle(
  baseUrl: string,
  pageSize: number,
  filters: {
    clientId: number;
    projectId?: number;
    statusId?: number;
    dateFrom?: string;
    dateTo?: string;
    minimalTicketPayload?: boolean;
  },
  headers: HeadersInit,
): Promise<
  | { mode: "paginated"; style: HaloTicketsClientUrlStyle; firstBatch: unknown[] }
  | { mode: "legacy" }
> {
  const attempts: HaloTicketsClientUrlStyle[] = [
    "client_id_dates",
    "clientid_dates",
    "client_id_only",
  ];
  for (const style of attempts) {
    const url = buildPaginatedTicketsSearchUrl(baseUrl, 1, pageSize, filters, style);
    console.log("[getHaloTickets] trying url:", url);
    const res = await fetch(url, { headers, cache: "no-store" });
    console.log("[getHaloTickets] response:", res.status);
    if (!res.ok) continue;
    const batch = parseTicketsPayload(await res.json());
    if (batch.length > 0) {
      return { mode: "paginated", style, firstBatch: batch };
    }
    if (style === "client_id_only") {
      return { mode: "paginated", style, firstBatch: [] };
    }
  }
  return { mode: "legacy" };
}

export async function getHaloTickets(
  token: string,
  haloUrl: string,
  filters: {
    clientId?: number;
    projectId?: number;
    statusId?: number;
    dateFrom?: string;
    dateTo?: string;
    count?: number;
    /** Request only id + client fields from Halo (smaller payloads for counts). */
    minimalTicketPayload?: boolean;
  } & { includeDetails?: boolean },
): Promise<HaloTicket[]> {
  const baseUrl = normalizeHaloUrl(haloUrl);
  const ticketTypes = await getTicketTypes(baseUrl, token);
  const maxTickets = filters.count && filters.count > 0 ? filters.count : 50;
  const pageSize = 50;
  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const runLegacyPath = async (): Promise<HaloTicket[]> => {
    const legacy = new URL(`${baseUrl}/api/Tickets`);
    if (typeof filters.clientId === "number") {
      legacy.searchParams.set("client_id", String(filters.clientId));
    }
    if (typeof filters.projectId === "number") {
      legacy.searchParams.set("project_id", String(filters.projectId));
    }
    if (typeof filters.statusId === "number") {
      legacy.searchParams.set("status_id", String(filters.statusId));
    }
    if (filters.dateFrom) {
      legacy.searchParams.set("dateFrom", filters.dateFrom);
      legacy.searchParams.set("dateopen", filters.dateFrom);
    }
    if (filters.dateTo) legacy.searchParams.set("dateTo", filters.dateTo);
    if (filters.minimalTicketPayload) {
      legacy.searchParams.set("fields", "id,client_id,clientid");
    } else {
      applyHaloTicketsListEnrichment(legacy, filters);
    }
    legacy.searchParams.set(
      "count",
      String(filters.count && filters.count > 0 ? filters.count : 50),
    );
    const legacyRes = await fetch(legacy.toString(), { headers, cache: "no-store" });
    if (!legacyRes.ok) {
      throw new Error("Could not fetch HaloPSA tickets.");
    }
    const legacyData = (await legacyRes.json()) as { tickets?: unknown[] } | unknown[];
    const rawTickets = parseTicketsPayload(legacyData);
    if (rawTickets.length > 0) {
      logFullRawTicket(rawTickets[0]);
    }
    const tickets = rawTickets.map((t) =>
      mapTicket(t as unknown as Record<string, unknown>, ticketTypes),
    );
    if (rawTickets.length > 0 && !filters.minimalTicketPayload) {
      const r0 = rawTickets[0] as Record<string, unknown>;
      console.log("[HaloPSA] list (legacy) first ticket raw agent:", r0.agent ?? null);
    }
    if (tickets.length === 0) {
      throw new Error(
        "No tickets found with the current filters. Try expanding the date range or changing the status filters.",
      );
    }
    if (filters.includeDetails) {
      return Promise.all(
        tickets.map((t) => getTicketDetails(baseUrl, token, t.id)),
      );
    }
    return tickets;
  };

  let allRaw: unknown[] = [];
  let page = 1;
  let hasMore = true;
  let clientStyle: HaloTicketsClientUrlStyle | "none" = "none";

  if (typeof filters.clientId === "number") {
    const disc = await discoverHaloTicketsClientFilterStyle(
      baseUrl,
      pageSize,
      {
        clientId: filters.clientId,
        projectId: filters.projectId,
        statusId: filters.statusId,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        minimalTicketPayload: filters.minimalTicketPayload,
      },
      headers,
    );
    if (disc.mode === "legacy") {
      return runLegacyPath();
    }
    clientStyle = disc.style;
    allRaw = [...disc.firstBatch];
    if (disc.firstBatch.length > 0) {
      logFullRawTicket(disc.firstBatch[0]);
      page = 2;
      hasMore = disc.firstBatch.length >= pageSize && allRaw.length < maxTickets;
    } else {
      hasMore = false;
    }
  }

  while (hasMore && allRaw.length < maxTickets && page <= 20) {
    const url = buildPaginatedTicketsSearchUrl(baseUrl, page, pageSize, filters, clientStyle);

    const res = await fetch(url, { headers, cache: "no-store" });

    if (!res.ok) {
      if (page === 1 && clientStyle === "none") {
        return runLegacyPath();
      }
      throw new Error("Could not fetch HaloPSA tickets.");
    }

    const data = (await res.json()) as unknown;
    const batch = parseTicketsPayload(data);
    if (page === 1 && batch.length > 0 && clientStyle === "none") {
      logFullRawTicket(batch[0]);
    }

    if (batch.length === 0) {
      hasMore = false;
    } else {
      allRaw = [...allRaw, ...batch];
      page += 1;
      if (batch.length < pageSize) hasMore = false;
    }
  }

  const sliced = allRaw.slice(0, maxTickets);
  const tickets = sliced.map((t) =>
    mapTicket(t as unknown as Record<string, unknown>, ticketTypes),
  );
  if (sliced.length > 0 && !filters.minimalTicketPayload) {
    const r0 = sliced[0] as Record<string, unknown>;
    console.log("[HaloPSA] list first ticket raw agent:", r0.agent ?? null);
  }
  if (tickets.length === 0) {
    throw new Error(
      "No tickets found with the current filters. Try expanding the date range or changing the status filters.",
    );
  }
  if (filters.includeDetails) {
    const details = await Promise.all(
      tickets.map((t) => getTicketDetails(baseUrl, token, t.id)),
    );
    return details;
  }
  return tickets;
}

export async function getHaloClients(token: string, haloUrl: string): Promise<HaloClient[]> {
  return getAllHaloClients(haloUrl, token);
}

function parseHaloProjectsPayload(data: unknown): HaloProject[] {
  const raw: unknown[] = [];

  const pushIfArray = (v: unknown): void => {
    if (Array.isArray(v)) raw.push(...v);
  };

  if (Array.isArray(data)) {
    raw.push(...data);
  } else if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;

    pushIfArray(o.projects);
    pushIfArray(o.Projects);
    pushIfArray(o.project);
    pushIfArray(o.Project);
    pushIfArray(o.result);
    pushIfArray(o.data);
    pushIfArray(o.Records);
    pushIfArray(o.records);

    const r = o.result;
    if (r && typeof r === "object" && !Array.isArray(r)) {
      const ro = r as Record<string, unknown>;
      pushIfArray(ro.projects);
      pushIfArray(ro.Projects);
      pushIfArray(ro.data);
      pushIfArray(ro.result);
      pushIfArray(ro.records);
      pushIfArray(ro.Records);
    }

    const d = o.data;
    if (d && typeof d === "object" && !Array.isArray(d)) {
      const do_ = d as Record<string, unknown>;
      pushIfArray(do_.projects);
      pushIfArray(do_.Projects);
      pushIfArray(do_.records);
      pushIfArray(do_.Records);
    }
  }

  return raw.map((p) => mapProject(p as Record<string, unknown>));
}

type ProjectsCache = {
  projects: unknown[];
  fetchedAt: number;
} | null;

let projectsCache: ProjectsCache = null;

/**
 * Projects in Halo are ticket records with project-type ticket types.
 * Fetches tickets once, then filters to project-only and client/date criteria in memory.
 * - Cache the full list for 5 minutes so time period switches don't re-fetch everything.
 */
export async function getHaloProjects(
  haloUrl: string,
  token: string,
  filters?: {
    clientIds?: number[];
    clientId?: number;
    dateFrom?: string;
    dateTo?: string;
    count?: number;
  },
): Promise<any[]> {
  normalizeHaloUrl(haloUrl);

  const clientIds =
    filters?.clientIds && filters.clientIds.length > 0
      ? filters.clientIds
      : typeof filters?.clientId === "number"
        ? [filters.clientId]
        : undefined;

  const fetchAllProjects = async (): Promise<HaloProject[]> => {
    // Fetch all tickets and keep only project-type records.
    const allTickets = await getHaloTickets(token, haloUrl, {
      dateFrom: filters?.dateFrom,
      dateTo: filters?.dateTo,
      count: Math.max(filters?.count ?? 0, 3000),
    });
    const projectTickets = allTickets.filter((t) => t.is_project === true);
    console.log("[projects] Total ticket records fetched:", allTickets.length);
    console.log("[projects] Project-type ticket records:", projectTickets.length);

    return projectTickets.map((t) => ({
      id: t.id,
      name: t.summary ?? `Ticket ${t.id}`,
      status: { name: t.status?.name ?? "Unknown" },
      clientId: t.clientId ?? null,
      client: t.client ?? null,
      description: t.details ?? null,
      projectmanager: t.agent ?? null,
      startdate: t.dateoccurred ?? null,
      targetdate: t.targetdate ?? null,
      completionpercent: undefined,
      tasks: null,
      notes: t.notes ?? [],
    }));
  };

  const now = Date.now();
  if (
    !projectsCache ||
    now - projectsCache.fetchedAt > 5 * 60 * 1000
  ) {
    const projects = await fetchAllProjects();
    projectsCache = { projects, fetchedAt: now };
  } else {
    console.log("[projects] Cache hit:", {
      ageMs: now - projectsCache.fetchedAt,
      cachedCount: projectsCache.projects.length,
    });
  }

  const allRaw = (projectsCache?.projects ?? []) as HaloProject[];

  // Filter by client IDs in memory when requested.
  let filtered = allRaw;
  if (clientIds && clientIds.length > 0) {
    filtered = allRaw.filter((p) => {
      const cid = p.clientId;
      return typeof cid === "number" && clientIds.includes(cid);
    });

    console.log("[projects] After client filter:", {
      count: filtered.length,
      clientIds,
    });
  }

  if (filters?.dateFrom && filters?.dateTo) {
    console.log("[projects] Applying date filter:", {
      before: filtered.length,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    });
    filtered = filterHaloProjectsByActivePeriod(
      filtered,
      filters.dateFrom,
      filters.dateTo,
    );
    console.log("[projects] After date filter:", filtered.length);
  }

  if (typeof filters?.count === "number" && filters.count > 0) {
    filtered = filtered.slice(0, filters.count);
  }

  return filtered;
}

export async function postNoteToHalo(
  haloUrl: string,
  token: string,
  ticketId: number,
  noteHtml: string,
  excelBuffer?: Buffer | null,
  filename?: string,
): Promise<void> {
  const payload = {
    ticket_id: ticketId,
    note: noteHtml,
    hdencodedhtml: noteHtml,
    who_type: "agent",
    actiontype_id: 14,
    sendemail: false,
    outcome: "Updated by Handover",
  };

  if (excelBuffer) {
    const form = new FormData();
    form.append("action", JSON.stringify(payload));
    form.append(
      "file",
      new Blob([new Uint8Array(excelBuffer)], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      filename ?? "handover-report.xlsx",
    );
    const res = await fetch(`${haloUrl}/api/Actions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });
    if (!res.ok) {
      throw new Error(await res.text());
    }
    return;
  }

  const res = await fetch(`${haloUrl}/api/Actions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([payload]),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
}

export async function getTicketDetails(
  haloUrl: string,
  token: string,
  ticketId: number,
): Promise<HaloTicket> {
  const baseUrl = normalizeHaloUrl(haloUrl);
  const headers = { Authorization: `Bearer ${token}` };
  const actionParams = new URLSearchParams({
    ticket_id: String(ticketId),
    includenotes: "true",
    includeagent: "true",
    include_agent: "true",
    includehtmlemail: "true",
    includehtmlnote: "true",
  });
  const actionsUrlAll = `${baseUrl}/api/Actions?${actionParams.toString()}`;
  const actionParamsConv = new URLSearchParams(actionParams);
  actionParamsConv.set("conversationonly", "true");
  const actionsUrlConversation = `${baseUrl}/api/Actions?${actionParamsConv.toString()}`;

  const ticketUrl = new URL(`${baseUrl}/api/Tickets/${ticketId}`);
  ticketUrl.searchParams.set("includedetails", "true");
  ticketUrl.searchParams.set("fields", HALO_TICKETS_LIST_FIELDS);

  const [ticketRes, actionsAllRes, actionsConversationRes] = await Promise.all([
    fetch(ticketUrl.toString(), {
      headers,
      cache: "no-store",
    }),
    fetch(actionsUrlAll, { headers, cache: "no-store" }),
    fetch(actionsUrlConversation, { headers, cache: "no-store" }),
  ]);

  if (!ticketRes.ok) {
    throw new Error("Could not fetch HaloPSA ticket details.");
  }
  const rawTicket = (await ticketRes.json()) as Record<string, unknown>;
  console.log(
    "[HaloPSA] ticket detail raw agent field:",
    ticketId,
    rawTicket.agent ?? null,
  );
  const ticketTypes = await getTicketTypes(baseUrl, token);
  const ownerPreviewClass = classifyHaloTicketType(rawTicket, ticketTypes);
  if (!ownerPreviewClass.is_project) {
    const r = rawTicket as Record<string, unknown>;
    console.log("TICKET OWNER FIELDS:", {
      agent: r.agent,
      assignedto: r.assignedto,
      technician: r.technician,
      team: r.team,
      who: r.who,
      actionby_agent_id: r.actionby_agent_id,
    });
  }

  const noteLists: HaloNote[][] = [];
  if (actionsAllRes.ok) {
    noteLists.push(parseHaloActionsResponseJson(await actionsAllRes.json()));
  }
  if (actionsConversationRes.ok) {
    noteLists.push(parseHaloActionsResponseJson(await actionsConversationRes.json()));
  }

  const notes =
    noteLists.length > 0 ? mergeHaloActionNoteLists(noteLists) : [];

  if (notes.length > 0) {
    console.log(
      "[notes] Raw note (Actions, merged sample):",
      JSON.stringify(notes[0], null, 2),
    );
  }
  logHaloNoteTypeCountsForTicket(ticketId, notes);

  let mapped = mapTicket({ ...rawTicket, notes: [] }, ticketTypes);
  const hasAgentName = Boolean(mapped.agent?.name?.trim());
  if (!hasAgentName) {
    const actionByFromNotes = pickLatestActionByAgentIdFromNotes(notes);
    if (actionByFromNotes != null) {
      const resolvedName = await getCachedHaloAgentNameById(baseUrl, token, actionByFromNotes);
      if (resolvedName) {
        mapped = {
          ...mapped,
          agent: { name: resolvedName },
          actionby_agent_id: mapped.actionby_agent_id ?? actionByFromNotes,
        };
      }
    }
  }
  return { ...mapped, notes };
}

function stripHtmlLite(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function noteText(note: HaloNote): string {
  const n = note as Record<string, unknown>;
  const fromNote = (
    note.note ??
    note.details ??
    note.description ??
    note.body ??
    ""
  ).trim();
  if (fromNote) return fromNote;

  const emailPlain =
    typeof n.emailbody === "string" && n.emailbody.trim() ? n.emailbody.trim() : "";
  if (emailPlain) {
    const subj =
      typeof n.emailsubject === "string" && n.emailsubject.trim()
        ? n.emailsubject.trim()
        : "";
    return subj ? `${subj}\n${emailPlain}` : emailPlain;
  }
  if (typeof n.emailbody_html === "string" && n.emailbody_html.trim()) {
    const stripped = stripHtmlLite(n.emailbody_html);
    if (stripped) {
      const subj =
        typeof n.emailsubject === "string" && n.emailsubject.trim()
          ? n.emailsubject.trim()
          : "";
      return subj ? `${subj}\n${stripped}` : stripped;
    }
  }
  if (typeof n.emailsubject === "string" && n.emailsubject.trim()) {
    return n.emailsubject.trim();
  }
  return "";
}

function strish(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

/** Prefix for AI prompt lines: standard note vs outbound vs inbound email. */
function noteTypePrefixForAi(note: HaloNote): string {
  const n = note as Record<string, unknown>;
  const subj = strish(n.emailsubject);
  const bodyPlain = strish(n.emailbody);
  const bodyHtml = typeof n.emailbody_html === "string" && n.emailbody_html.trim() ? n.emailbody_html : null;
  const hasEmailSignal = Boolean(
    subj || bodyPlain || bodyHtml || strish(n.emailfrom) || strish(n.emailto),
  );

  const dir = strish(n.emaildirection)?.toLowerCase() ?? "";
  if (dir.includes("inbound") || dir === "in") return "[Email Received]";
  if (dir.includes("outbound") || dir === "out") return "[Email Sent]";

  const outcome = strish(n.outcome)?.toLowerCase() ?? "";
  if (outcome.includes("email received") || outcome.includes("incoming email") || outcome.includes("inbound"))
    return "[Email Received]";
  if (outcome.includes("email sent") || outcome.includes("outgoing email") || outcome.includes("outbound"))
    return "[Email Sent]";

  if (hasEmailSignal) {
    const wt = n.who_type;
    if (wt === 1 || wt === "1") return "[Email Received]";
    if (wt === 0 || wt === "0") return "[Email Sent]";
    return "[Email Sent]";
  }

  return "[Note]";
}

/** User-facing label for delivery health / detail panels (maps action prefixes). */
export function haloNoteDisplayType(note: HaloNote): string {
  const p = noteTypePrefixForAi(note);
  if (p === "[Email Received]") return "Email from user";
  if (p === "[Email Sent]") return "Email to user";
  return "Internal note";
}

function logHaloNoteTypeCountsForTicket(ticketId: number, notes: HaloNote[]): void {
  const counts: Record<string, number> = {};
  for (const note of notes) {
    const label = noteTypePrefixForAi(note);
    counts[label] = (counts[label] ?? 0) + 1;
  }
  console.log(`[notes] ticket ${ticketId} fetched note type counts:`, counts);
}

function agentObjectDisplayName(agent: unknown): string | null {
  if (!agent || typeof agent !== "object") return null;
  const o = agent as Record<string, unknown>;
  const name = strish(o.name);
  if (name) return name;
  const first = strish(o.firstname) ?? strish(o.first_name);
  const last = strish(o.lastname) ?? strish(o.last_name);
  if (first && last) return `${first} ${last}`;
  return first ?? last ?? null;
}

function noteAuthor(note: HaloNote): string {
  const n = note as Record<string, unknown>;

  const fromNestedAgent =
    agentObjectDisplayName(note.agent) ??
    strish(note.agentname) ??
    strish(note.agent_name);

  const who = strish(note.who);
  const whoTypeRaw = strish(n.who_type)?.toLowerCase();
  const whoWhenAgent =
    who &&
    (whoTypeRaw === "agent" ||
      whoTypeRaw === "user" ||
      whoTypeRaw === "engineer" ||
      whoTypeRaw === "technician")
      ? who
      : null;

  const author =
    strish(note.author) ??
    whoWhenAgent ??
    who ??
    fromNestedAgent ??
    strish(n.agentname) ??
    strish(n.agent_name) ??
    strish(n.actionby) ??
    strish(n.action_by) ??
    strish(n.createdby) ??
    strish(n.created_by) ??
    strish(n.username) ??
    strish(n.user_name) ??
    strish(n.emailfrom) ??
    strish(n.emailto);

  return author ?? "Unknown";
}

function noteDateIso(note: HaloNote): string | null {
  const n = note as Record<string, unknown>;
  return (
    note.posted ??
    note.date ??
    note.created_at ??
    note.created ??
    strish(n.datetime) ??
    strish(n.dateemailed) ??
    strish(n.actiondatecreated) ??
    null
  );
}

function smartFilterNotes(
  notes: HaloNote[] | null | undefined,
  compareTitle: string,
): HaloNote[] {
  if (!Array.isArray(notes)) return [];
  const now = Date.now();
  const title = compareTitle.trim().toLowerCase();
  const keywordRx =
    /(update|progress|completed|blocked|waiting|client|issue|resolved|escalat)/i;
  const unique = new Set<string>();

  return notes
    .map((n) => ({ n, text: noteText(n), author: noteAuthor(n), date: noteDateIso(n) }))
    .filter(({ text, author }) => {
      if (!text || text.length < 10) return false;
      if (author.toLowerCase().includes("system") || author.toLowerCase().includes("auto")) return false;
      if (text.toLowerCase() === title) return false;
      const key = `${author.toLowerCase()}::${text.toLowerCase()}`;
      if (unique.has(key)) return false;
      unique.add(key);
      return true;
    })
    .filter(({ text, date }) => {
      if (!date) return keywordRx.test(text);
      const ts = new Date(date).getTime();
      if (Number.isNaN(ts)) return keywordRx.test(text);
      const ageDays = (now - ts) / (1000 * 60 * 60 * 24);
      return ageDays <= 30 || keywordRx.test(text);
    })
    .sort((a, b) => {
      const ad = a.date ? new Date(a.date).getTime() : 0;
      const bd = b.date ? new Date(b.date).getTime() : 0;
      return ad - bd;
    })
    .map(({ n }) => n);
}

function mapAiNotePrefixToNormalisedNoteType(
  prefix: string,
): NormalisedNote["type"] {
  if (prefix === "[Email Received]") return "email_received";
  if (prefix === "[Email Sent]") return "email_sent";
  return "note";
}

export function mapHaloNoteToNormalised(note: HaloNote): NormalisedNote {
  return {
    id: String(haloNoteNumericId(note)),
    date: noteDateIso(note),
    author: noteAuthor(note),
    type: mapAiNotePrefixToNormalisedNoteType(noteTypePrefixForAi(note)),
    content: stripHtmlToPlainText(noteText(note)),
  };
}

export function haloTicketToNormalised(
  t: HaloTicket,
  mask?: {
    promptShowAssignee?: boolean;
    promptShowDescription?: boolean;
    promptShowNotes?: boolean;
  },
): NormalisedTicket {
  return {
    id: String(t.id),
    title: t.summary,
    type: t.is_project ? "project" : "ticket",
    status: t.status?.name ?? "Unknown",
    client: t.client?.name ?? "Unknown",
    clientContact: t.clientContact?.name ?? null,
    assignedEngineer: t.agent?.name ?? null,
    priority: t.priority?.name ?? null,
    targetDate: t.targetdate ?? null,
    timeLogged: t.timetaken != null ? Number(t.timetaken) : 0,
    description: t.details ?? null,
    notes: (t.notes ?? []).map(mapHaloNoteToNormalised),
    source: "halopsa",
    ticketTypeName:
      (t.ticket_type_name && t.ticket_type_name.trim()) ||
      t.tickettype?.name?.trim() ||
      null,
    isProjectTask: t.is_project_task,
    parentProjectId: t.parent_project_id ?? null,
    promptShowAssignee: mask?.promptShowAssignee,
    promptShowDescription: mask?.promptShowDescription,
    promptShowNotes: mask?.promptShowNotes,
  } as NormalisedTicket;
}

export function formatTicketsForHandover(
  tickets: HaloTicket[],
  selectedFields: Array<{
    summary: boolean;
    description: boolean;
    actions: boolean;
    notes: boolean;
    assignee: boolean;
  }>,
): string {
  const normalised = tickets.map((t, i) =>
    haloTicketToNormalised(t, {
      promptShowAssignee: selectedFields[i].assignee,
      promptShowDescription: selectedFields[i].description,
      promptShowNotes: selectedFields[i].notes,
    }),
  );
  return formatTicketsForPrompt(normalised);
}

export function formatProjectsForHandover(
  projects: HaloProject[],
  selectedFields: Array<{
    name: boolean;
    description: boolean;
    tasks: boolean;
    notes: boolean;
  }>,
): string {
  const header = `HaloPSA Project Export - ${projects.length} projects\n\n`;
  const body = projects
    .map((p, index) => {
      const fields = selectedFields[index];
      const notes = smartFilterNotes(p.notes, p.name);
      const notesBlock =
        notes.length > 0
          ? notes
              .map((n) => {
                const date = noteDateIso(n) ?? "Unknown";
                const author = noteAuthor(n);
                const text = noteText(n);
                return `  - [${date}] ${noteTypePrefixForAi(n)} ${author}: ${text}`;
              })
              .join("\n")
          : "  - None";
      const parts: string[] = [];
      parts.push(`${TICKET_SECTION_RULE}`);
      parts.push(`PROJECT ${index + 1} of ${projects.length}`);
      parts.push(`${TICKET_SECTION_RULE}`);
      parts.push(`Project: ${p.name}`);
      parts.push(`Status: ${fields.name ? (p.status?.name ?? "Unknown") : "Unknown"}`);
      parts.push(`Client: ${p.client?.name ?? "Unknown"}`);
      parts.push(`Manager: ${p.projectmanager?.name ?? "Unassigned"}`);
      parts.push(`Target date: ${p.targetdate ?? "Not set"}`);
      parts.push(`Description: ${fields.description ? (p.description ?? "None") : "None"}`);
      parts.push("Recent notes:");
      parts.push(fields.notes ? notesBlock : "  - None");
      return parts.join("\n");
    })
    .join("\n\n");
  return `${header}${body}`;
}
