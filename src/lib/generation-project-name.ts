function formatReportDateLabel(d = new Date()): string {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isMeaningfulProjectName(name: string | null | undefined): boolean {
  const t = (name ?? "").trim();
  if (!t) return false;
  if (/^unknown$/i.test(t)) return false;
  if (/^HaloPSA\s+Export/i.test(t)) return false;
  if (/^ConnectWise\s+Export/i.test(t)) return false;
  return true;
}

function isPsaExportInput(input: string): boolean {
  const firstLine = input.trim().split(/\r?\n/)[0] ?? "";
  if (/^(?:HaloPSA|ConnectWise)\s+(?:Ticket\s+)?Export\b/i.test(firstLine)) return true;
  return /Source:\s*(?:HaloPSA|ConnectWise)/i.test(input);
}

function extractFirstClientFromGenerationInput(input: string): string | null {
  const m = input.match(/^Client:\s*(.+)$/im);
  if (!m?.[1]) return null;
  const name = m[1].trim();
  if (!name || /^unknown$/i.test(name)) return null;
  return name;
}

/** Resolves the project_name stored on generations (PSA import titles, client + date, etc.). */
export function resolveSavedGenerationProjectName(
  projectName: string | null | undefined,
  input: string,
): string | null {
  if (isMeaningfulProjectName(projectName)) {
    return (projectName ?? "").trim();
  }

  const trimmedInput = input.trim();
  if (!trimmedInput) {
    return projectName?.trim() || null;
  }

  if (isPsaExportInput(trimmedInput)) {
    const client = extractFirstClientFromGenerationInput(trimmedInput);
    const dateLabel = formatReportDateLabel();
    if (client) return `${client} — ${dateLabel}`;
    return `Weekly report — ${dateLabel}`;
  }

  const trimmed = (projectName ?? "").trim();
  return trimmed || null;
}
