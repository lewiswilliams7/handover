import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getHaloToken } from "@/lib/halo";
import { decrypt } from "@/lib/encryption";
import {
  pushHandoverOutputsToHaloTickets,
  type PushNarrativeScope,
} from "@/lib/halo-push-note";
import { resolveBrandLogoUrlForExcel } from "@/lib/branding-logo";
import {
  assertFreeHaloPushAllowed,
  incrementFreeHaloPushCount,
} from "@/lib/free-tier-monthly-usage";
import { getUserPlan, userPlanHasProAccess } from "@/lib/utils/getPlan";
import { partnerWhiteLabelActive } from "@/lib/white-label";

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      ticketIds?: Array<number | string>;
      outputs?: Record<string, unknown>;
      selectedOutputs?: string[];
      projectName?: string;
      attachExcel?: boolean;
      excelTabs?: string[];
      pushSummaryScope?: PushNarrativeScope;
      pushStatusScope?: PushNarrativeScope;
    };
    const {
      ticketIds,
      outputs,
      selectedOutputs,
      projectName,
      attachExcel,
      excelTabs,
      pushSummaryScope,
      pushStatusScope,
    } = body;
    const pf = await getUserPlan(supabase, user.id);
    const paid = userPlanHasProAccess(pf);
    if (!paid) {
      const ok = await assertFreeHaloPushAllowed(supabase, user.id);
      if (!ok) {
        return NextResponse.json(
          {
            error: "free_monthly_halo_push_limit",
            message:
              "Your plan includes one HaloPSA push-back per calendar month (UTC). Upgrade for unlimited push-back.",
          },
          { status: 403 },
        );
      }
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("brand_name, brand_colour, brand_secondary_colour, brand_logo_url, white_label_mode")
      .eq("id", user.id)
      .maybeSingle();
    const profileForWl = { ...profile, plan: pf.plan };
    const resolvedBrandLogoUrl = await resolveBrandLogoUrlForExcel(
      supabase,
      typeof profile?.brand_logo_url === "string" ? profile.brand_logo_url : null,
    );

    const { data: connection, error: connErr } = await supabase
      .from("halo_connections")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (connErr || !connection) {
      console.error("[push-note] No connection:", connErr);
      return NextResponse.json({ error: "No HaloPSA connection found" }, { status: 400 });
    }

    let clientId: string;
    let clientSecret: string;

    try {
      clientId = connection.client_id_encrypted
        ? decrypt(connection.client_id_encrypted)
        : connection.client_id;
      clientSecret = connection.client_secret_encrypted
        ? decrypt(connection.client_secret_encrypted)
        : connection.client_secret;
    } catch (decryptErr) {
      console.error("[push-note] Decrypt error:", decryptErr);
      return NextResponse.json({ error: "Failed to decrypt credentials" }, { status: 500 });
    }

    const token = await getHaloToken({
      haloUrl: connection.halo_url,
      tenant: typeof connection.tenant === "string" ? connection.tenant : null,
      clientId,
      clientSecret,
    });

    const partnerWl = partnerWhiteLabelActive(profileForWl);

    const { results, posted, failed, success } = await pushHandoverOutputsToHaloTickets({
      haloUrl: connection.halo_url,
      token,
      ticketIds: ticketIds ?? [],
      outputs: outputs ?? {},
      selectedOutputs: selectedOutputs ?? [],
      projectName: projectName ?? "",
      attachExcel: attachExcel === true,
      excelTabs: excelTabs ?? [],
      brandName: typeof profile?.brand_name === "string" ? profile.brand_name : null,
      brandColor: typeof profile?.brand_colour === "string" ? profile.brand_colour : null,
      brandSecondaryColor:
        typeof profile?.brand_secondary_colour === "string" ? profile.brand_secondary_colour : null,
      brandLogoUrl: resolvedBrandLogoUrl,
      partnerWhiteLabel: partnerWl,
      logTag: "[push-note]",
      pushSummaryScope:
        pushSummaryScope === "per_ticket" || pushSummaryScope === "combined_all"
          ? pushSummaryScope
          : "combined_all",
      pushStatusScope:
        pushStatusScope === "per_ticket" || pushStatusScope === "combined_all"
          ? pushStatusScope
          : "combined_all",
    });

    if (!paid && success && posted > 0) {
      await incrementFreeHaloPushCount(supabase, user.id);
    }

    return NextResponse.json({
      success,
      posted,
      failed,
      results,
    });
  } catch (err: unknown) {
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[push-note] Fatal error:", err, stack);
    return NextResponse.json(
      { error: "Push failed. Please try again." },
      { status: 500 },
    );
  }
}
