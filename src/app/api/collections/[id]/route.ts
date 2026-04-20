import { NextResponse } from "next/server";

import { isCollectionColorKey } from "@/lib/collection-colors";
import { createServerClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

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

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.name === "string") {
      const n = body.name.trim().slice(0, 200);
      if (!n) {
        return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
      }
      patch.name = n;
    }
    if (typeof body.color === "string") {
      patch.color = isCollectionColorKey(body.color) ? body.color : "accent";
    }
    if (typeof body.pinned === "boolean") {
      patch.pinned = body.pinned;
    }

    const { data: row, error } = await supabase
      .from("collections")
      .update(patch)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, name, color, pinned, created_at, updated_at")
      .maybeSingle();

    if (error) {
      console.error("[collections PATCH]", error.message);
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ collection: row });
  } catch (e) {
    console.error("[collections PATCH]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("collections")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("[collections DELETE]", error.message);
      return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[collections DELETE]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
