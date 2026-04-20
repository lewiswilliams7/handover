/** Default subject line for dashboard “Send Email” (not used by scheduled reports). */

export function buildDefaultClientEmailSubject(projectName: string, date = new Date()): string {
  const name = (projectName ?? "").trim() || "Client update";
  const formatted = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `Project Update - ${name} · ${formatted}`;
}
