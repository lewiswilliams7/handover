export type TeamDashboardPermission = "none" | "read" | "full";

export function normalizeTeamDashboardPermission(raw: unknown): TeamDashboardPermission {
  if (raw === "none" || raw === "read" || raw === "full") return raw;
  return "full";
}
