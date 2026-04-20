import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/server";
import { getUserPlan, userPlanHasProAccess } from "@/lib/utils/getPlan";

export const dynamic = "force-dynamic";

function newZapierApiKey(): string {
  return `hzp_${randomBytes(24).toString("hex")}`;
}

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pf = await getUserPlan(supabase, user.id);
  const canConfigure = userPlanHasProAccess(pf);

  const { data, error } = await supabase
    .from("profiles")
    .select("zapier_api_key")
    .eq("id", user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    canConfigure,
    zapier_api_key: (data?.zapier_api_key as string | null) ?? null,
  });
}

export async function POST() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pf = await getUserPlan(supabase, user.id);
  if (!userPlanHasProAccess(pf)) {
    return NextResponse.json({ error: "pro_required" }, { status: 403 });
  }

  const key = newZapierApiKey();
  const { data, error } = await supabase
    .from("profiles")
    .update({ zapier_api_key: key })
    .eq("id", user.id)
    .select("zapier_api_key")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ zapier_api_key: data?.zapier_api_key ?? key });
}
