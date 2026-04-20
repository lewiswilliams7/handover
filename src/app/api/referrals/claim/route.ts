import { NextResponse } from "next/server";

import { applyReferralAttribution } from "@/lib/referral-server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Attach referral code to the signed-in user (e.g. localStorage ref before email confirm). */
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { code?: string } = {};
    try {
      body = (await request.json()) as { code?: string };
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const code = typeof body.code === "string" ? body.code : "";
    if (!code.trim()) {
      return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    const result = await applyReferralAttribution(
      admin,
      user.id,
      user.email ?? null,
      code,
    );

    if (!result.ok) {
      if (result.reason === "already") {
        return NextResponse.json({ ok: true, already: true });
      }
      return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[referrals/claim]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
