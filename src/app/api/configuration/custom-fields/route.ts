import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createServiceRoleClient();
    const { data: mappings } = await admin
      .from("custom_field_mappings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    return NextResponse.json({ mappings: mappings ?? [] });
  } catch (e) {
    console.error("[custom-fields GET]", e);
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
      psa: string;
      field_name: string;
      display_name: string;
      outputs: string[];
    };

    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from("custom_field_mappings")
      .insert({ user_id: user.id, ...body })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ mapping: data });
  } catch (e) {
    console.error("[custom-fields POST]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = (await request.json()) as { id: string };
    const admin = createServiceRoleClient();
    await admin
      .from("custom_field_mappings")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[custom-fields DELETE]", e);
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

    const body = (await request.json()) as {
      id: string;
      field_name: string;
      display_name: string;
      outputs: string[];
    };

    const admin = createServiceRoleClient();
    const { error } = await admin
      .from("custom_field_mappings")
      .update({
        field_name: body.field_name,
        display_name: body.display_name,
        outputs: body.outputs,
      })
      .eq("id", body.id)
      .eq("user_id", user.id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[custom-fields PATCH]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
