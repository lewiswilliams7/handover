import type { HaloProject, HaloTicket } from "@/lib/halo";

export type SchedulePushItem =
  | { kind: "support"; ticket: HaloTicket }
  | { kind: "project"; project: HaloProject };

function rowMatchesItem(
  row: Record<string, unknown>,
  titleLc: string,
  clientLc: string,
): boolean {
  const task = String(row.task ?? "").toLowerCase();
  const risk = String(row.risk ?? "").toLowerCase();
  const pc = String(row.client_name ?? "").toLowerCase();
  const pn = String(row.project_name ?? "").toLowerCase();
  if (clientLc && pc && pc === clientLc) return true;
  const slice = titleLc.length >= 4 ? titleLc.slice(0, Math.min(72, titleLc.length)) : titleLc;
  if (slice && (task.includes(slice) || risk.includes(slice) || pn.includes(slice))) {
    return true;
  }
  return false;
}

type PushRowWithSourceTicket = { source_ticket?: string | null };

/** Narrow generated JSON to rows that likely belong to this ticket/project. */
export function filterOutputsForSchedulePushItem(
  outputs: Record<string, unknown>,
  item: SchedulePushItem,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...outputs };
  const itemIdStr = String(
    item.kind === "support" ? item.ticket.id : item.project.id ?? "",
  );
  const title =
    item.kind === "support"
      ? (item.ticket.summary ?? "").trim()
      : (item.project.name ?? "").trim();
  const clientName =
    item.kind === "support"
      ? (item.ticket.client?.name ?? "").trim()
      : (item.project.client?.name ?? "").trim();

  const titleLc = title.toLowerCase();
  const clientLc = clientName.toLowerCase();

  const actions = Array.isArray(outputs.actions) ? outputs.actions : [];
  const risks = Array.isArray(outputs.risks) ? outputs.risks : [];

  out.actions = actions.filter((a) => {
    const row = a as PushRowWithSourceTicket;
    if (row.source_ticket && itemIdStr) {
      return String(row.source_ticket) === itemIdStr;
    }
    return rowMatchesItem(a as Record<string, unknown>, titleLc, clientLc);
  });
  out.risks = risks.filter((r) => {
    const row = r as PushRowWithSourceTicket;
    if (row.source_ticket && itemIdStr) {
      return String(row.source_ticket) === itemIdStr;
    }
    return rowMatchesItem(r as Record<string, unknown>, titleLc, clientLc);
  });

  const ac = out.actions as unknown[];
  const label = title || (item.kind === "support" ? "This ticket" : "This project");
  if (ac.length === 0) {
    out.summary = `No matching items in this run for ${label}.`;
  } else {
    out.summary = `${label}: ${ac.length} item(s) from this report - see action log below.`;
  }
  out.status_report = "";
  out.client_email = "";
  return out;
}
