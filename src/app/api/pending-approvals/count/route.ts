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

    const { count, error } = await supabase
      .from("pending_approvals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "pending");

    if (error) {
      if (error.message.includes("pending_approvals") || error.code === "42P01") {
        return NextResponse.json({ count: 0 });
      }
      console.error("[pending-approvals/count GET]", error.message);
      return NextResponse.json(
        { error: "Could not load approval count. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ count: count ?? 0 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
