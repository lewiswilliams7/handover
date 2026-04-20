/**
 * Derives per-row ticket source labels for multi-ticket generations using Halo export
 * `Title:` lines (no prompt / API changes). Optional `source_ticket` on rows overrides.
 */

export function extractTicketTitlesFromGenerationInput(text: string): string[] {
  if (!text || typeof text !== "string") return [];
  const seen = new Set<string>();
  const out: string[] = [];
  const re = /^Title:\s*(.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const t = (m[1] ?? "").trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

export function truncateTicketSourceTitle(title: string, maxLen = 25): string {
  const t = title.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

export function actionSourceFullTitleForTooltip(
  row: {
    task?: string | null;
    notes?: string | null;
    project_name?: string | null;
    source_ticket?: string | null;
  },
  ticketTitles: string[],
): string | undefined {
  if (ticketTitles.length < 2) return undefined;
  const explicit = (row.source_ticket ?? "").trim();
  if (explicit) return explicit;
  return (
    resolveTicketSourceFromHaystack([row.task, row.notes, row.project_name], ticketTitles) ??
    ticketTitles[0] ??
    undefined
  );
}

export function riskSourceFullTitleForTooltip(
  row: {
    risk?: string | null;
    impact?: string | null;
    mitigation?: string | null;
    project_name?: string | null;
    client_name?: string | null;
    source_ticket?: string | null;
  },
  ticketTitles: string[],
): string | undefined {
  if (ticketTitles.length < 2) return undefined;
  const explicit = (row.source_ticket ?? "").trim();
  if (explicit) return explicit;
  return (
    resolveTicketSourceFromHaystack(
      [row.risk, row.impact, row.mitigation, row.project_name, row.client_name],
      ticketTitles,
    ) ??
    ticketTitles[0] ??
    undefined
  );
}

export function resolveTicketSourceFromHaystack(
  parts: (string | null | undefined)[],
  ticketTitles: string[],
): string | null {
  if (ticketTitles.length < 2) return null;
  const hay = parts
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    .join(" ")
    .toLowerCase();
  if (!hay.trim()) return null;
  const sorted = [...ticketTitles].sort((a, b) => b.length - a.length);
  for (const title of sorted) {
    const tl = title.trim().toLowerCase();
    if (tl.length >= 3 && hay.includes(tl)) return title.trim();
  }
  return null;
}

export function actionSourceDisplayLabel(
  row: {
    task?: string | null;
    notes?: string | null;
    project_name?: string | null;
    source_ticket?: string | null;
  },
  ticketTitles: string[],
): string {
  if (ticketTitles.length < 2) return "";
  const explicit = (row.source_ticket ?? "").trim();
  if (explicit) return truncateTicketSourceTitle(explicit);
  const resolved = resolveTicketSourceFromHaystack(
    [row.task, row.notes, row.project_name],
    ticketTitles,
  );
  return truncateTicketSourceTitle(resolved ?? ticketTitles[0] ?? " - ");
}

export function riskSourceDisplayLabel(
  row: {
    risk?: string | null;
    impact?: string | null;
    mitigation?: string | null;
    project_name?: string | null;
    client_name?: string | null;
    source_ticket?: string | null;
  },
  ticketTitles: string[],
): string {
  if (ticketTitles.length < 2) return "";
  const explicit = (row.source_ticket ?? "").trim();
  if (explicit) return truncateTicketSourceTitle(explicit);
  const resolved = resolveTicketSourceFromHaystack(
    [row.risk, row.impact, row.mitigation, row.project_name, row.client_name],
    ticketTitles,
  );
  return truncateTicketSourceTitle(resolved ?? ticketTitles[0] ?? " - ");
}

export function buildActionSourceColumnForExport(
  actions: {
    task?: string | null;
    notes?: string | null;
    project_name?: string | null;
    source_ticket?: string | null;
  }[],
  ticketTitles: string[],
): string[] | null {
  if (ticketTitles.length < 2) return null;
  return actions.map((a) => actionSourceDisplayLabel(a, ticketTitles));
}

export function buildRiskSourceColumnForExport(
  risks: {
    risk?: string | null;
    impact?: string | null;
    mitigation?: string | null;
    project_name?: string | null;
    client_name?: string | null;
    source_ticket?: string | null;
  }[],
  ticketTitles: string[],
): string[] | null {
  if (ticketTitles.length < 2) return null;
  return risks.map((r) => riskSourceDisplayLabel(r, ticketTitles));
}
