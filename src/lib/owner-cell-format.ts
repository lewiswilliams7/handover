/** Delivery dashboard / table owner display  -  align with action export “Unassigned” rules. */

export function isUnassignedOwnerCell(raw: string | null | undefined): boolean {
  if (raw == null) return true;
  const t = raw.trim();
  if (t === "") return true;
  const lower = t.toLowerCase();
  if (lower === "null" || lower === "unassigned") return true;
  if (t === "\u2014" || t === "-" || t === "\u2013") return true;
  return false;
}

export function ownerCellLabel(raw: string | null | undefined): string {
  if (isUnassignedOwnerCell(raw)) return "Unassigned";
  return (raw ?? "").trim();
}

/** Shorten at a space before maxLen when possible so ellipsis rarely splits a word. */
export function ellipsizeOwnerAtWord(text: string, maxLen: number): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  const cut = t.slice(0, maxLen);
  const sp = cut.lastIndexOf(" ");
  if (sp >= Math.min(6, maxLen - 4)) {
    return `${cut.slice(0, sp).trimEnd()}…`;
  }
  return `${cut.trimEnd()}…`;
}
