import { NextRequest, NextResponse } from "next/server";

import {
  londonWallScheduleTimeToUtcStored,
  utcStoredScheduleTimeToLondonWall,
} from "@/lib/scheduled-report-schedule-time";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function normalizeTime(t: unknown): string {
  if (typeof t !== "string") return "08:00";
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return "08:00";
  const hh = Math.min(23, Math.max(0, Number.parseInt(m[1], 10)));
  const mm = Math.min(59, Math.max(0, Number.parseInt(m[2], 10)));
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** DB keeps send_time as UTC HH:mm; API returns Europe/London for display. */
function mapDigestSettingsForDisplay(
  row: Record<string, unknown> | null,
  referenceUtc: Date,
): Record<string, unknown> | null {
  if (!row) return null;
  const raw =
    typeof row.send_time === "string" && row.send_time.trim()
      ? row.send_time.trim()
      : "08:00";
  return {
    ...row,
    send_time: utcStoredScheduleTimeToLondonWall(raw, referenceUtc),
  };
}

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data } = await supabase
      .from("digest_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const ref = new Date();
    return NextResponse.json({
      settings: mapDigestSettingsForDisplay(
        data as Record<string, unknown> | null,
        ref,
      ),
    });
  } catch (e) {
    console.error("[digest/settings GET]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      enabled?: boolean;
      frequency?: string;
      send_day?: string;
      send_time?: string;
      delivery_email?: boolean;
      delivery_slack?: boolean;
      delivery_teams?: boolean;
      email_to?: string;
    };

    const now = new Date();
    const sendTimeLondon = normalizeTime(body.send_time ?? "08:00");
    const send_time = londonWallScheduleTimeToUtcStored(sendTimeLondon, now);

    const nextSend = computeNextSend(
      body.frequency ?? "weekly",
      body.send_day ?? "monday",
      send_time,
    );

    const { data, error } = await supabase
      .from("digest_settings")
      .upsert(
        {
          user_id: user.id,
          enabled: body.enabled,
          frequency: body.frequency,
          send_day: body.send_day,
          send_time,
          delivery_email: body.delivery_email,
          delivery_slack: body.delivery_slack,
          delivery_teams: body.delivery_teams,
          email_to: body.email_to,
          next_send_at: nextSend,
          updated_at: now.toISOString(),
        },
        {
          onConflict: "user_id",
        },
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      settings: mapDigestSettingsForDisplay(
        data as Record<string, unknown>,
        now,
      ),
    });
  } catch (e) {
    console.error("[digest/settings POST]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

function computeNextSend(
  frequency: string,
  sendDay: string,
  sendTimeUtc: string,
): string {
  const DOW: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const dayKey = sendDay.trim().toLowerCase();
  const dow = DOW[dayKey] ?? 1;
  const parts = sendTimeUtc.split(":");
  const hours = Number.parseInt(parts[0] ?? "8", 10);
  const minutes = Number.parseInt(parts[1] ?? "0", 10);

  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(
    Number.isFinite(hours) ? hours : 8,
    Number.isFinite(minutes) ? minutes : 0,
    0,
    0,
  );

  const addDays = (dow - next.getUTCDay() + 7) % 7;
  next.setUTCDate(next.getUTCDate() + addDays);

  if (next.getTime() <= now.getTime()) {
    const interval =
      frequency === "fortnightly" ? 14 : frequency === "monthly" ? 28 : 7;
    next.setUTCDate(next.getUTCDate() + interval);
  }

  return next.toISOString();
}
