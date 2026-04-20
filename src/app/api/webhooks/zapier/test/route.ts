import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { api_key?: string };
    const { api_key } = body;

    if (!api_key) {
      return NextResponse.json(
        { success: false, error: "api_key required" },
        { status: 401 },
      );
    }

    const supabase = createServiceRoleClient();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, plan")
      .eq("zapier_api_key", api_key)
      .single();

    if (error || !profile) {
      return NextResponse.json(
        { success: false, error: "auth_required" },
        { status: 401 },
      );
    }

    return NextResponse.json({ success: true, user_id: profile.id });
  } catch {
    return NextResponse.json(
      { success: false, error: "invalid_request" },
      { status: 400 },
    );
  }
}
