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

    const { data, error } = await supabase
      .from("generations")
      .select("created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[stats/activity]", error.message);
      return NextResponse.json({ error: "Failed to load activity" }, { status: 500 });
    }

    const dates = (data ?? [])
      .map((row) => row.created_at)
      .filter((iso): iso is string => typeof iso === "string" && iso.length > 0);

    return NextResponse.json({ dates });
  } catch (e) {
    console.error("[stats/activity]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
