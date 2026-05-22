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
      .from("scheduled_report_history")
      .select(
        "id, sent_at, email_to, tickets_processed, clients_covered, status, error_message",
      )
      .eq("user_id", user.id)
      .order("sent_at", { ascending: false })
      .limit(10);

    if (error) {
      if (error.message.includes("scheduled_report_history") || error.code === "42P01") {
        return NextResponse.json({ history: [] });
      }
      console.error("[scheduled-report-history GET]", error.message);
      return NextResponse.json(
        { error: "Could not load report history. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ history: data ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
