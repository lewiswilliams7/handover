export function postgrestQuoted(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function rowMatchesClient(
  item: Record<string, unknown>,
  clientName: string,
): boolean {
  if (!item.client_name) return true;
  return (
    String(item.client_name).toLowerCase().trim() ===
    clientName.toLowerCase().trim()
  );
}

export function shouldIncludeSummary(
  summary: string | null | undefined,
  clientEmail: string | null | undefined,
  clientName: string,
): boolean {
  if (!summary) return false;
  if (clientEmail) {
    const emailLower = clientEmail.toLowerCase();
    const nameLower = clientName.toLowerCase();
    if (!emailLower.includes(nameLower)) {
      return false;
    }
  }
  return true;
}

export function buildExactClientFilter(clientName: string): string {
  const q = postgrestQuoted(clientName);
  return `client_name_extracted.eq.${q},` + `project_name.eq.${q}`;
}

/** Expand YYYY-MM-DD cache keys to full-day ISO bounds for created_at filters. */
export function periodBoundStartIso(periodFrom: string): string {
  return periodFrom.includes("T") ? periodFrom : `${periodFrom}T00:00:00.000Z`;
}

export function periodBoundEndIso(periodTo: string): string {
  return periodTo.includes("T") ? periodTo : `${periodTo}T23:59:59.999Z`;
}
