/** Client-scoped meeting prep brief for Excel meeting_notes pre-fill. */
let cachedMeetingPrep: { clientName: string; content: string; ticketTitle: string | null } | null = null;

export function setCachedMeetingPrep(
  clientName: string,
  content: string,
  ticketTitle?: string | null,
): void {
  const name = clientName.trim();
  const text = content.trim();
  if (!name || !text) return;
  cachedMeetingPrep = { clientName: name, content: text, ticketTitle: ticketTitle?.trim() || null };
}

export function getCachedMeetingPrepContent(clientName: string | null | undefined): string | null {
  if (!cachedMeetingPrep?.content || !clientName?.trim()) return null;
  const a = clientName.trim().toLowerCase();
  const b = cachedMeetingPrep.clientName.toLowerCase();
  if (a === b || a.includes(b) || b.includes(a)) return cachedMeetingPrep.content;
  return null;
}

export function getCachedMeetingPrepTicketTitle(
  clientName: string | null | undefined,
): string | null {
  if (!cachedMeetingPrep?.ticketTitle || !clientName?.trim()) return null;
  const a = clientName.trim().toLowerCase();
  const b = cachedMeetingPrep.clientName.toLowerCase();
  if (a === b || a.includes(b) || b.includes(a)) return cachedMeetingPrep.ticketTitle;
  return null;
}

/** Try multiple cache keys (e.g. first action client vs project label). */
export function getCachedMeetingPrepContentFromKeys(
  keys: (string | null | undefined)[],
): string | null {
  for (const key of keys) {
    const hit = getCachedMeetingPrepContent(key);
    if (hit) return hit;
  }
  return null;
}

export function getCachedMeetingPrepTicketTitleFromKeys(
  keys: (string | null | undefined)[],
): string | null {
  for (const key of keys) {
    const hit = getCachedMeetingPrepTicketTitle(key);
    if (hit) return hit;
  }
  return cachedMeetingPrep?.ticketTitle ?? null;
}
