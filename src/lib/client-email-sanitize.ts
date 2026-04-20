/** Lines that are only decorative separators (dashes, underscores, equals). */
const SEPARATOR_ONLY_LINE = /^[-_=]{2,}\s*$/;

/**
 * Remove stray "---" / "___" style lines from client email bodies (AI often echoes
 * prompt delimiters). Collapses excessive blank lines after removal.
 */
export function stripClientEmailSeparatorLines(body: string): string {
  if (!body) return body;
  const lines = body.split(/\r?\n/);
  const kept = lines.filter((line) => !SEPARATOR_ONLY_LINE.test(line.trim()));
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
}
