import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = createServiceRoleClient();
    const { error } = await admin
      .from("profiles")
      .update({ has_completed_loop: true })
      .eq("id", user.id);
    if (error) {
      console.error("[profile/complete-loop POST]", error.message);
      return NextResponse.json({ error: "Could not update profile." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[profile/complete-loop POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
