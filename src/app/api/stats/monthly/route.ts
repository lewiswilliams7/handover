import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
    );
    const lastMonthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0),
    );

    const [thisMonthRes, lastMonthRes] = await Promise.all([
      supabase
        .from("generations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", monthStart.toISOString()),
      supabase
        .from("generations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", lastMonthStart.toISOString())
        .lt("created_at", monthStart.toISOString()),
    ]);

    if (thisMonthRes.error) {
      console.error("[stats/monthly] this month", thisMonthRes.error.message);
      return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
    }
    if (lastMonthRes.error) {
      console.error("[stats/monthly] last month", lastMonthRes.error.message);
      return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
    }

    return NextResponse.json({
      this_month: thisMonthRes.count ?? 0,
      last_month: lastMonthRes.count ?? 0,
    });
  } catch (e) {
    console.error("[stats/monthly]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
