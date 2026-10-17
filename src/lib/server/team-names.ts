import type { SupabaseClient } from "@supabase/supabase-js";

function fullName(row: { first_name?: unknown; last_name?: unknown; display_name?: unknown }): string {
  const name = [row.first_name, row.last_name]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .map((part) => part.trim())
    .join(" ");
  return name || (typeof row.display_name === "string" ? row.display_name.trim() : "");
}

/** Names of everyone in this user's workspace, the user first. One name means a solo workspace. */
export async function loadTeamNames(admin: SupabaseClient, userId: string): Promise<string[]> {
  const { data: me } = await admin
    .from("profiles")
    .select("team_id, first_name, last_name, display_name")
    .eq("id", userId)
    .maybeSingle();
  const own = me ? fullName(me) : "";
  if (!me?.team_id) return own ? [own] : [];
  const { data: members } = await admin
    .from("profiles")
    .select("id, first_name, last_name, display_name")
    .eq("team_id", me.team_id)
    .limit(100);
  const names = (members ?? [])
    .filter((row) => row.id !== userId)
    .map(fullName)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
  return [...new Set([own, ...names].filter(Boolean))];
}
