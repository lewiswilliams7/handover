/**
 * Builds the sign-off block for generated client emails from profile fields only.
 * Does not use ticket data. When signature_override is set, it wins entirely.
 */
export function buildClientEmailSignOffBlock(
  signatureOverride: string | null | undefined,
  displayName: string | null | undefined,
  jobTitle: string | null | undefined,
  companyName: string | null | undefined,
): string {
  const sig =
    typeof signatureOverride === "string" ? signatureOverride.trim() : "";
  if (sig) return sig;

  const name = (displayName ?? "").trim();
  const job = (jobTitle ?? "").trim();
  const company = (companyName ?? "").trim();

  const lines: string[] = ["Kind regards,"];
  if (name) {
    lines.push(name);
    if (job) lines.push(job);
    if (company) lines.push(company);
    return lines.join("\n");
  }
  return "Kind regards,";
}
