import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { collection_id?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    let collectionId: string | null;
    if (body.collection_id === null || body.collection_id === "") {
      collectionId = null;
    } else if (typeof body.collection_id === "string") {
      collectionId = body.collection_id;
    } else {
      return NextResponse.json({ error: "collection_id invalid" }, { status: 400 });
    }

    if (collectionId) {
      const { data: coll, error: cErr } = await supabase
        .from("collections")
        .select("id")
        .eq("id", collectionId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (cErr || !coll) {
        return NextResponse.json({ error: "Collection not found" }, { status: 404 });
      }
    }

    const { data: row, error } = await supabase
      .from("generations")
      .update({ collection_id: collectionId })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, collection_id")
      .maybeSingle();

    if (error) {
      console.error("[generations/collection PATCH]", error.message);
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ generation: row });
  } catch (e) {
    console.error("[generations/collection PATCH]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
