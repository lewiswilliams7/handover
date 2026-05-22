import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/admin";

const SLUG_RE = /^[a-z0-9-]{3,30}$/;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = (searchParams.get("slug") ?? "").trim().toLowerCase();
    if (!SLUG_RE.test(slug)) {
      return NextResponse.json({ available: false }, { status: 200 });
    }

    const admin = createServiceRoleClient();
    const { data } = await admin
      .from("portal_accounts")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    return NextResponse.json({ available: !data });
  } catch (e) {
    console.error("[portal/check-slug]", e);
    return NextResponse.json({ available: false }, { status: 500 });
  }
}
