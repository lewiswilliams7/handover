import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/server";

const DOMAIN_RE = /^(?=.{3,255}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;

export async function PATCH(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { domain?: string };
    const rawDomain = String(body.domain ?? "").trim();

    if (rawDomain.includes("@")) {
      return NextResponse.json({ error: "Domain must not include '@'." }, { status: 400 });
    }

    const domain = rawDomain.toLowerCase();
    if (domain && !DOMAIN_RE.test(domain)) {
      return NextResponse.json({ error: "Invalid domain format." }, { status: 400 });
    }

    const { error } = await supabase
      .from("portal_accounts")
      .update({ allowed_domain: domain || null })
      .eq("user_id", user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[portal/update-domain PATCH]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

