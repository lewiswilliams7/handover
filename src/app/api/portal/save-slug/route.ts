import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/server";

const SLUG_RE = /^[a-z0-9-]{3,30}$/;

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { slug?: string };
    const slug = String(body.slug ?? "").trim().toLowerCase();
    if (!SLUG_RE.test(slug)) {
      return NextResponse.json({ error: "Invalid slug format." }, { status: 400 });
    }

    const { data: takenByOther } = await supabase
      .from("portal_accounts")
      .select("id, user_id")
      .eq("slug", slug)
      .neq("user_id", user.id)
      .maybeSingle();
    if (takenByOther?.id) {
      return NextResponse.json({ error: "Slug already taken." }, { status: 409 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_name, display_name")
      .eq("id", user.id)
      .maybeSingle();
    const displayName =
      (typeof profile?.company_name === "string" && profile.company_name.trim()) ||
      (typeof profile?.display_name === "string" && profile.display_name.trim()) ||
      null;

    const { data: existing } = await supabase
      .from("portal_accounts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const query = existing?.id
      ? supabase
          .from("portal_accounts")
          .update({ slug, display_name: displayName, enabled: true })
          .eq("id", existing.id)
      : supabase
          .from("portal_accounts")
          .insert({ user_id: user.id, slug, display_name: displayName, enabled: true });

    const { error } = await query;
    if (error) {
      const msg = String(error.message ?? "");
      if (msg.toLowerCase().includes("duplicate key") || msg.toLowerCase().includes("unique")) {
        return NextResponse.json({ error: "Slug already taken." }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, slug });
  } catch (e) {
    console.error("[portal/save-slug POST]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

