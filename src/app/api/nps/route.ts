import { NextResponse } from "next/server";

import { sendNpsDetractorAlert } from "@/lib/emails";
import { buildHandoverResendFromHeader } from "@/lib/resend-from-header";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { score?: unknown; comment?: unknown; userId?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (typeof body.userId !== "string" || body.userId !== user.id) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    const score = typeof body.score === "number" ? body.score : Number(body.score);
    if (!Number.isInteger(score) || score < 0 || score > 10) {
      return NextResponse.json({ error: "score must be an integer 0-10" }, { status: 400 });
    }

    let comment: string | null = null;
    if (body.comment != null) {
      if (typeof body.comment !== "string") {
        return NextResponse.json({ error: "comment must be a string or null" }, { status: 400 });
      }
      const t = body.comment.trim();
      comment = t.length > 0 ? t.slice(0, 8000) : null;
    }

    const { error: insertError } = await supabase.from("nps_responses").insert({
      user_id: user.id,
      score,
      comment,
    });

    if (insertError) {
      console.error("[api/nps] insert:", insertError);
      return NextResponse.json({ error: "Failed to save response." }, { status: 500 });
    }

    if (score <= 6) {
      const email = user.email ?? "";
      const { data: npsProfile } = await supabase
        .from("profiles")
        .select("display_name, first_name, last_name, company_name, brand_name")
        .eq("id", user.id)
        .maybeSingle();

      try {
        await sendNpsDetractorAlert({
          score,
          comment,
          userEmail: email || "(no email on account)",
          userId: user.id,
          from: buildHandoverResendFromHeader(npsProfile),
        });
      } catch (e) {
        console.error("[api/nps] detractor alert email:", e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[api/nps]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
