import { NextResponse } from "next/server";

import { getSignupReferralUrl } from "@/lib/referral";
import { ensureReferralCodeForUser } from "@/lib/referral-server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createServiceRoleClient();
    const code = await ensureReferralCodeForUser(admin, user.id);
    if (!code) {
      return NextResponse.json({ error: "Could not create referral link." }, { status: 500 });
    }

    return NextResponse.json({
      code,
      url: getSignupReferralUrl(code),
    });
  } catch (e) {
    console.error("[referrals/signup-link]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
