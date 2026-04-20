import { NextResponse } from "next/server";

import { normalizeReferralCode } from "@/lib/referral";
import { applyReferralAttribution } from "@/lib/referral-server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Attach referral after signup. Requires an authenticated session; body.userId must match the session user.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    let body: { code?: string; userId?: string } = {};
    try {
      body = (await request.json()) as { code?: string; userId?: string };
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }

    if (typeof body.userId === "string" && body.userId !== user.id) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const code = normalizeReferralCode(typeof body.code === "string" ? body.code : "");
    if (!code) {
      return NextResponse.json({ ok: false, error: "Missing code" }, { status: 400 });
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
    console.error("[referrals/apply]", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
