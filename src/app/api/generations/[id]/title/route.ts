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

    let body: { title?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const title =
      typeof body.title === "string" ? body.title.trim().slice(0, 500) : "";
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const { data: row, error } = await supabase
      .from("generations")
      .update({ title })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, title")
      .maybeSingle();

    if (error) {
      console.error("[generations/title PATCH]", error.message);
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ generation: row });
  } catch (e) {
    console.error("[generations/title PATCH]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
