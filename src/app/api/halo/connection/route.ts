import { NextResponse } from "next/server";

import { isProUser } from "@/lib/plans";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

type PatchBody = {
  auto_closure_summary?: boolean;
  /** Legacy camelCase from older clients */
  autoClosureSummaryEnabled?: boolean;
};

export async function PATCH(req: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pro = await isProUser(supabase, user.id);
    if (!pro) {
      return NextResponse.json({ error: "pro_required" }, { status: 403 });
    }

    const body = (await req.json()) as PatchBody;
    const enabled =
      typeof body.auto_closure_summary === "boolean"
        ? body.auto_closure_summary
        : typeof body.autoClosureSummaryEnabled === "boolean"
          ? body.autoClosureSummaryEnabled
          : undefined;

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "auto_closure_summary (boolean) is required." },
        { status: 400 },
      );
    }

    const admin = createServiceRoleClient();
    const { error } = await admin
      .from("halo_connections")
      .update({
        auto_closure_summary: enabled,
        auto_closure_summary_enabled: enabled,
      })
      .eq("user_id", user.id);

    if (error) {
      console.error("[halo/connection PATCH]", error);
      return NextResponse.json({ error: "Failed to update HaloPSA preferences." }, { status: 500 });
    }

    return NextResponse.json({ success: true, auto_closure_summary: enabled });
  } catch (e) {
    console.error("[halo/connection PATCH] unhandled", e);
    return NextResponse.json({ error: "Failed to update HaloPSA preferences." }, { status: 500 });
  }
}
