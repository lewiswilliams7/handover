import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Lightweight team roster for read-only UI (e.g. Organisation panel).
 * `solo: true` when the profile has no `team_id` (solo workspace).
 */
export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = createServiceRoleClient();
    const { data: profile, error: pe } = await admin
      .from("profiles")
      .select("team_id")
      .eq("id", user.id)
      .maybeSingle();
    if (pe) {
      console.error("[team/members GET] profile:", pe.message);
      return NextResponse.json({ error: "Could not load profile." }, { status: 500 });
    }

    const teamId =
      profile?.team_id && typeof profile.team_id === "string" ? profile.team_id : null;
    if (!teamId) {
      return NextResponse.json({ solo: true, members: [] });
    }

    const { data: membership, error: memErr } = await admin
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (memErr) {
      console.error("[team/members GET] membership:", memErr.message);
      return NextResponse.json({ error: "Could not verify membership." }, { status: 500 });
    }
    if (!membership?.role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: members, error: mErr } = await admin
      .from("team_members")
      .select("id, user_id, role, joined_at")
      .eq("team_id", teamId)
      .order("joined_at", { ascending: true });
    if (mErr) {
      console.error("[team/members GET] list:", mErr.message);
      return NextResponse.json({ error: "Could not load members." }, { status: 500 });
    }

    const memberRows = members ?? [];
    const memberUserIds = memberRows.map((m) => m.user_id as string);

    const emails = new Map<string, string>();
    const lastSignIn = new Map<string, string | null>();
    for (const uid of memberUserIds) {
      const { data: u, error: ue } = await admin.auth.admin.getUserById(uid);
      if (ue) {
        console.error("[team/members GET] getUserById:", uid, ue.message);
        continue;
      }
      if (u.user?.email) emails.set(uid, u.user.email);
      lastSignIn.set(uid, u.user?.last_sign_in_at ?? null);
    }

    let profs: { id: string; first_name: string | null; last_name: string | null }[] = [];
    if (memberUserIds.length > 0) {
      const { data: profRows, error: profErr } = await admin
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", memberUserIds);
      if (profErr) {
        console.error("[team/members GET] profiles:", profErr.message);
        return NextResponse.json({ error: "Could not load member profiles." }, { status: 500 });
      }
      profs = profRows ?? [];
    }

    const profileNames = new Map<string, string>();
    for (const p of profs) {
      const fn = typeof p.first_name === "string" ? p.first_name : "";
      const ln = typeof p.last_name === "string" ? p.last_name : "";
      const label = `${fn} ${ln}`.trim();
      if (label) profileNames.set(p.id as string, label);
    }

    const out = memberRows.map((m) => {
      const uid = m.user_id as string;
      const displayName = profileNames.get(uid) || emails.get(uid) || null;
      const email = emails.get(uid) ?? null;
      const role = typeof m.role === "string" ? m.role : "member";
      return {
        id: m.id,
        user_id: uid,
        role,
        joined_at: m.joined_at,
        display_name: displayName,
        email,
        last_sign_in_at: lastSignIn.get(uid) ?? null,
      };
    });

    return NextResponse.json({ solo: false, members: out });
  } catch (e) {
    console.error("[team/members GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
