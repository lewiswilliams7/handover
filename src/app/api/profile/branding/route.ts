import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getPlanTierServer, verifyUserPlan } from "@/lib/server/verifyUserPlan";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const sessionSupabase = await createServerClient();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const {
      data: { user },
    } = await sessionSupabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const brandName = typeof body.brand_name === "string" ? body.brand_name.trim() : "";
    const brandColourRaw =
      typeof body.brand_colour === "string" ? body.brand_colour.trim() : "";
    const brandSecondaryRaw =
      typeof body.brand_secondary_colour === "string" ? body.brand_secondary_colour.trim() : "";
    const brandLogoUrl = typeof body.brand_logo_url === "string" ? body.brand_logo_url.trim() : "";
    const wantsWhiteLabel = body.white_label_mode === true;

    let pf;
    try {
      pf = await verifyUserPlan(user.id);
    } catch (e) {
      console.error("[profile/branding] verifyUserPlan:", e);
      return NextResponse.json({ error: "Could not verify subscription." }, { status: 500 });
    }
    const tier = getPlanTierServer(pf);

    if (tier < 1) {
      return NextResponse.json(
        { error: "Custom branding is available on paid plans. Upgrade to unlock." },
        { status: 403 },
      );
    }

    if (wantsWhiteLabel && tier < 2) {
      return NextResponse.json(
        {
          error: "White label mode requires Team or Enterprise.",
        },
        { status: 403 },
      );
    }

    const normalizedColour = /^#?[0-9a-fA-F]{6}$/.test(brandColourRaw)
      ? brandColourRaw.replace(/^#?/, "#")
      : "#2563eb";
    const normalizedSecondary = /^#?[0-9a-fA-F]{6}$/.test(brandSecondaryRaw)
      ? brandSecondaryRaw.replace(/^#?/, "#")
      : "#1E40AF";

    const whiteLabelStored = wantsWhiteLabel && tier >= 2;

    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        brand_name: brandName || null,
        brand_colour: normalizedColour,
        brand_secondary_colour: normalizedSecondary,
        brand_logo_url: brandLogoUrl || null,
        white_label_mode: whiteLabelStored,
      },
      { onConflict: "id" },
    );

    if (error) {
      console.error("[profile/branding]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("[profile/branding] saved", {
      userId: user.id,
      white_label_mode: whiteLabelStored,
      tier,
    });

    return NextResponse.json({ ok: true, white_label_mode: whiteLabelStored });
  } catch (e) {
    console.error("[profile/branding]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
