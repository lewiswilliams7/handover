import { NextResponse } from "next/server";

import { isCollectionColorKey } from "@/lib/collection-colors";
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

    const { data: collections, error: cErr } = await supabase
      .from("collections")
      .select("id, name, color, pinned, created_at, updated_at")
      .eq("user_id", user.id)
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false });

    if (cErr) {
      console.error("[collections GET]", cErr.message);
      return NextResponse.json({ error: "Failed to load collections" }, { status: 500 });
    }

    const { data: gens, error: gErr } = await supabase
      .from("generations")
      .select("collection_id")
      .eq("user_id", user.id);

    if (gErr) {
      console.error("[collections GET] gens", gErr.message);
      return NextResponse.json({ error: "Failed to load counts" }, { status: 500 });
    }

    const countByColl = new Map<string, number>();
    for (const row of gens ?? []) {
      const cid = row.collection_id as string | null;
      if (!cid) continue;
      countByColl.set(cid, (countByColl.get(cid) ?? 0) + 1);
    }

    const rows = (collections ?? []).map((c) => ({
      id: c.id as string,
      name: c.name as string,
      color: c.color as string,
      pinned: Boolean(c.pinned),
      created_at: c.created_at as string,
      updated_at: c.updated_at as string,
      generation_count: countByColl.get(c.id as string) ?? 0,
    }));

    return NextResponse.json({ collections: rows });
  } catch (e) {
    console.error("[collections GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { name?: unknown; color?: unknown; pinned?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const name =
      typeof body.name === "string" ? body.name.trim().slice(0, 200) : "";
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const colorRaw = typeof body.color === "string" ? body.color : "accent";
    const color = isCollectionColorKey(colorRaw) ? colorRaw : "accent";
    const pinned = body.pinned === true;

    const { data: row, error } = await supabase
      .from("collections")
      .insert({
        user_id: user.id,
        name,
        color,
        pinned,
      })
      .select("id, name, color, pinned, created_at, updated_at")
      .maybeSingle();

    if (error || !row) {
      console.error("[collections POST]", error?.message);
      return NextResponse.json({ error: "Failed to create collection" }, { status: 500 });
    }

    return NextResponse.json({
      collection: {
        ...row,
        generation_count: 0,
      },
    });
  } catch (e) {
    console.error("[collections POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
