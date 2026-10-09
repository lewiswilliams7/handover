import { NextResponse } from "next/server";

import {
  hasVerifiedEmailInTable,
  insertPendingVerificationAndSendEmail,
} from "@/lib/auth/custom-email-verification";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id || !user.email?.trim()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const provider = typeof user.app_metadata?.provider === "string" ? user.app_metadata.provider : "";
    if (provider !== "email") {
      return NextResponse.json({ ok: true, skipped: true, reason: "not_email_provider" });
    }

    let admin: ReturnType<typeof createServiceRoleClient>;
    try {
      admin = createServiceRoleClient();
    } catch {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const pendingScanVerification = user.user_metadata?.scan_verification_pending === true;
    if (
      (!pendingScanVerification && user.email_confirmed_at) ||
      (await hasVerifiedEmailInTable(admin, user.id))
    ) {
      return NextResponse.json({ ok: true, sent: false, reason: "already_verified" });
    }

    const result = await insertPendingVerificationAndSendEmail(admin, user.id, user.email.trim());
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true, sent: true });
  } catch (e) {
    console.error("[api/auth/email-verification/send]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
