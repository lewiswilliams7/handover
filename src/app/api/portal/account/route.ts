import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/server";

const SLUG_RE = /^[a-z0-9-]{3,30}$/;

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data } = await supabase
      .from("portal_accounts")
      .select("id, slug, display_name, enabled, created_at, allowed_domain, self_service_url")
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json({ portal: data ?? null });
  } catch (e) {
    console.error("[portal/account GET]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as {
      slug?: string;
      display_name?: string | null;
    };
    const slug = (body.slug ?? "").trim().toLowerCase();
    if (!SLUG_RE.test(slug)) {
      return NextResponse.json({ error: "Invalid slug format." }, { status: 400 });
    }

    const displayName = (body.display_name ?? "").trim() || null;
    const { data: existing } = await supabase
      .from("portal_accounts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const query = existing?.id
      ? supabase
          .from("portal_accounts")
          .update({
            slug,
            display_name: displayName,
            enabled: true,
          })
          .eq("id", existing.id)
      : supabase.from("portal_accounts").insert({
          user_id: user.id,
          slug,
          display_name: displayName,
          enabled: true,
        });

    const { data, error } = await query
      .select("id, slug, display_name, enabled, created_at, self_service_url")
      .single();

    if (error) {
      const msg = String(error.message ?? "");
      if (msg.toLowerCase().includes("duplicate key") || msg.toLowerCase().includes("unique")) {
        return NextResponse.json({ error: "Slug already taken." }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ portal: data });
  } catch (e) {
    console.error("[portal/account POST]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as {
      self_service_url?: string | null;
    };
    const selfServiceUrl = (body.self_service_url ?? "").trim() || null;

    const { data, error } = await supabase
      .from("portal_accounts")
      .update({ self_service_url: selfServiceUrl })
      .eq("user_id", user.id)
      .select("id, slug, display_name, enabled, created_at, allowed_domain, self_service_url")
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Portal account not found" }, { status: 404 });

    return NextResponse.json({ portal: data });
  } catch (e) {
    console.error("[portal/account PATCH]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
