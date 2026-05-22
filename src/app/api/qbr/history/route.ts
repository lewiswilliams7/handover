import { NextResponse } from "next/server";

import { getPlanTierServer, verifyUserPlan } from "@/lib/server/verifyUserPlan";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
      const pf = await verifyUserPlan(user.id);
      if (getPlanTierServer(pf) < 1) {
        return NextResponse.json({ error: "upgrade_required" }, { status: 403 });
      }
    } catch (e) {
      console.error("[qbr/history] verifyUserPlan:", e);
      return NextResponse.json({ error: "Could not verify subscription." }, { status: 500 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      dateRange?: string;
      ticketsProcessed?: number;
      clientsCovered?: string[];
    };

    const row = {
      user_id: user.id,
      schedule_id: null,
      email_to: "",
      tickets_processed: Number(body.ticketsProcessed ?? 0) || 0,
      clients_covered: Array.isArray(body.clientsCovered) ? body.clientsCovered : [],
      status: "sent",
      error_message: null,
      report_type: "qbr",
      metadata: {
        date_range: typeof body.dateRange === "string" ? body.dateRange : null,
        source: "dashboard_qbr",
      },
    };

    const { error } = await supabase.from("scheduled_report_history").insert(row);
    if (error) {
      // Backwards-compatible fallback for older schemas without report_type/metadata.
      const { error: fallbackErr } = await supabase.from("scheduled_report_history").insert({
        user_id: user.id,
        schedule_id: null,
        email_to: "",
        tickets_processed: Number(body.ticketsProcessed ?? 0) || 0,
        clients_covered: Array.isArray(body.clientsCovered) ? body.clientsCovered : [],
        status: "sent",
        error_message: null,
      });
      if (fallbackErr) {
        console.error("[qbr/history]", fallbackErr.message);
        return NextResponse.json(
          { error: "Could not load QBR history. Please try again." },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to save QBR history" },
      { status: 500 },
    );
  }
}

