/** Derive a display title after generation completes (no API coupling). */

export type TitleAction = {
  task?: string | null;
  client_name?: string | null;
};

export function deriveAutoTitle(opts: {
  actions?: TitleAction[] | null;
  projectName?: string | null;
  createdAt?: Date;
}): string {
  const actions = opts.actions ?? [];
  for (const a of actions) {
    const c = (a.client_name ?? "").trim();
    if (c) return c;
  }
  for (const a of actions) {
    const t = (a.task ?? "").trim();
    if (t) return t.length > 88 ? `${t.slice(0, 88)}…` : t;
  }
  const pn = (opts.projectName ?? "").trim();
  if (pn) return pn;
  const d = opts.createdAt ?? new Date();
  return `Generation ${d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}`;
}

export function countTicketsInInput(input: string): number {
  const m = input.match(/TICKET \d+ of \d+/gi);
  return m ? m.length : 0;
}

export function historyGenerationLabel(p: {
  title?: string | null;
  project_name?: string | null;
  output_json?: unknown;
}): string {
  const tr = (p.title ?? "").trim();
  if (tr) return tr;
  const oj = p.output_json;
  if (oj && typeof oj === "object") {
    const rec = oj as Record<string, unknown>;
    const actionsRaw = rec.actions ?? rec.action_log;
    if (Array.isArray(actionsRaw)) {
      for (const a of actionsRaw) {
        if (!a || typeof a !== "object") continue;
        const cn = String((a as Record<string, unknown>).client_name ?? "").trim();
        if (cn) return cn;
      }
    }
  }
  const pn = (p.project_name ?? "").trim();
  if (pn) return pn;
  return "Untitled generation";
}
