import { NextResponse } from "next/server";

import {
  ACHIEVEMENT_COPY,
  isAchievementId,
  type AchievementId,
} from "@/lib/achievements";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

function parseShown(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const idsRaw =
      typeof body === "object" &&
      body !== null &&
      "ids" in body &&
      Array.isArray((body as { ids: unknown }).ids)
        ? (body as { ids: unknown[] }).ids
        : null;
    if (!idsRaw) {
      return NextResponse.json({ error: "Expected { ids: string[] }" }, { status: 400 });
    }

    const requested = [
      ...new Set(
        idsRaw
          .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
          .map((x) => x.trim()),
      ),
    ].slice(0, 24);

    const admin = createServiceRoleClient();
    const { data: profile, error: profErr } = await admin
      .from("profiles")
      .select("achievements_shown, total_generations, current_streak")
      .eq("id", user.id)
      .maybeSingle();

    if (profErr || !profile) {
      console.warn("[achievements/try] profile:", profErr?.message);
      return NextResponse.json({ unlocked: [] });
    }

    const shown = new Set(parseShown(profile.achievements_shown));
    const totalGens =
      typeof profile.total_generations === "number" && Number.isFinite(profile.total_generations)
        ? profile.total_generations
        : 0;
    const streak =
      typeof profile.current_streak === "number" && Number.isFinite(profile.current_streak)
        ? profile.current_streak
        : 0;

    const { count: haloPushCount, error: haloErr } = await admin
      .from("halo_push_history")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("success", true);

    if (haloErr) {
      console.warn("[achievements/try] halo_push_history:", haloErr.message);
    }

    const { count: schedSentCount, error: schedErr } = await admin
      .from("scheduled_report_history")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "sent");

    if (schedErr) {
      console.warn("[achievements/try] scheduled_report_history:", schedErr.message);
    }

    const hasHaloPush = (haloPushCount ?? 0) >= 1;
    const hasScheduledSent = (schedSentCount ?? 0) >= 1;

    const eligible = (id: AchievementId): boolean => {
      switch (id) {
        case "first_generation":
          return totalGens >= 1;
        case "total_generations_10":
          return totalGens >= 10;
        case "total_generations_50":
          return totalGens >= 50;
        case "streak_3":
          return streak >= 3;
        case "streak_7":
          return streak >= 7;
        case "streak_14":
          return streak >= 14;
        case "streak_30":
          return streak >= 30;
        case "streak_100":
          return streak >= 100;
        case "first_halo_pushback":
          return hasHaloPush;
        case "first_scheduled_report_sent":
          return hasScheduledSent;
        default:
          return false;
      }
    };

    const toAdd: AchievementId[] = [];
    for (const rawId of requested) {
      if (!isAchievementId(rawId)) continue;
      if (shown.has(rawId)) continue;
      if (!eligible(rawId)) continue;
      toAdd.push(rawId);
    }

    if (toAdd.length === 0) {
      return NextResponse.json({ unlocked: [] });
    }

    const nextShown = [...shown, ...toAdd];
    const { error: upErr } = await admin
      .from("profiles")
      .update({ achievements_shown: nextShown })
      .eq("id", user.id);

    if (upErr) {
      console.error("[achievements/try] update:", upErr.message);
      return NextResponse.json({ error: "Could not save achievements" }, { status: 500 });
    }

    return NextResponse.json({
      unlocked: toAdd.map((id) => ({
        id,
        subtitle: ACHIEVEMENT_COPY[id].subtitle,
      })),
    });
  } catch (e) {
    console.error("[achievements/try]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
