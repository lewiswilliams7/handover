import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("templates")
    .select("id, name, content, template_type, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Templates GET error:", error);
    return NextResponse.json({ error: "Failed to fetch templates." }, { status: 500 });
  }

  return NextResponse.json({ templates: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    name?: string;
    content?: string;
    templateType?: string;
  };

  const name = body?.name?.trim();
  const content = body?.content?.trim();
  const templateType = body?.templateType?.trim().toLowerCase();

  if (!name || !content || !templateType) {
    return NextResponse.json(
      { error: "name, content, and templateType are required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("templates")
    .insert({
      user_id: user.id,
      name,
      content,
      template_type: templateType,
    })
    .select("id, name, content, template_type, created_at")
    .single();

  if (error) {
    console.error("Templates POST error:", error);
    return NextResponse.json({ error: "Failed to save template." }, { status: 500 });
  }

  return NextResponse.json({ template: data }, { status: 201 });
}

export async function DELETE(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { id?: string };
  if (!body?.id) {
    return NextResponse.json({ error: "Template id is required." }, { status: 400 });
  }

  const { error } = await supabase
    .from("templates")
    .delete()
    .eq("id", body.id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Templates DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete template." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
