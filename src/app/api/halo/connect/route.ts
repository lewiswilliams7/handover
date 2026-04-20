import { NextResponse } from "next/server";

import { encrypt } from "@/lib/encryption";
import { getHaloToken } from "@/lib/halo";
import { isProUser } from "@/lib/plans";
import { createServerClient } from "@/lib/supabase/server";

type ConnectBody = {
  haloUrl?: string;
  tenant?: string | null;
  clientId?: string;
  clientSecret?: string;
};

function logHaloConnectGetErr(context: string, err: unknown) {
  const e = err as { message?: string; code?: string; details?: string; hint?: string };
  console.error("[halo/connect GET]", context, {
    message: e?.message,
    code: e?.code,
    details: e?.details,
    hint: e?.hint,
    stack: err instanceof Error ? err.stack : undefined,
  });
}

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ connected: false }, { status: 200 });

    let pro = false;
    try {
      pro = await isProUser(supabase, user.id);
    } catch (planErr) {
      logHaloConnectGetErr("isProUser threw", planErr);
      return NextResponse.json(
        { connected: false, reconnectRecommended: true, connectionCheckFailed: true },
        { status: 200 },
      );
    }

    if (!pro) {
      return NextResponse.json({ connected: false, proRequired: true }, { status: 200 });
    }

    let data: {
      halo_url?: string | null;
      updated_at?: string | null;
      auto_closure_summary_enabled?: boolean | null;
      auto_closure_summary?: boolean | null;
    } | null = null;

    const full = await supabase
      .from("halo_connections")
      .select("halo_url, updated_at, auto_closure_summary_enabled, auto_closure_summary")
      .eq("user_id", user.id)
      .maybeSingle();

    if (full.error) {
      logHaloConnectGetErr("halo_connections select (full) failed", full.error);
      const minimal = await supabase
        .from("halo_connections")
        .select("halo_url, updated_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (minimal.error) {
        logHaloConnectGetErr("halo_connections select (minimal) failed", minimal.error);
        return NextResponse.json(
          {
            connected: false,
            reconnectRecommended: true,
            connectionCheckFailed: true,
          },
          { status: 200 },
        );
      }
      data = minimal.data ?? null;
      if (data) {
        return NextResponse.json({
          connected: true,
          haloUrl: data.halo_url ?? "",
          updatedAt: data.updated_at ?? null,
          autoClosureSummaryEnabled: false,
        });
      }
      return NextResponse.json({ connected: false }, { status: 200 });
    }

    data = full.data ?? null;
    if (!data) return NextResponse.json({ connected: false }, { status: 200 });

    const closureOn =
      data.auto_closure_summary === true || data.auto_closure_summary_enabled === true;
    return NextResponse.json({
      connected: true,
      haloUrl: data.halo_url,
      updatedAt: data.updated_at,
      autoClosureSummaryEnabled: closureOn,
    });
  } catch (err) {
    logHaloConnectGetErr("unhandled exception", err);
    return NextResponse.json(
      { connected: false, reconnectRecommended: true, connectionCheckFailed: true },
      { status: 200 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pro = await isProUser(supabase, user.id);
    if (!pro) {
      return NextResponse.json({ error: "pro_required" }, { status: 403 });
    }

    const body = (await req.json()) as ConnectBody;
    const haloUrl = body.haloUrl?.trim();
    const tenant = body.tenant?.trim() || null;
    const clientId = body.clientId?.trim();
    const clientSecret = body.clientSecret?.trim();

    if (!haloUrl || !clientId || !clientSecret) {
      return NextResponse.json(
        { error: "haloUrl, clientId, and clientSecret are required." },
        { status: 400 },
      );
    }

    let token = "";
    try {
      token = await getHaloToken({ haloUrl, tenant, clientId, clientSecret });
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Could not authenticate with HaloPSA. Check your Client ID and Secret.";
      return NextResponse.json(
        { error: message },
        { status: 400 },
      );
    }

    const encryptedClientSecret = encrypt(clientSecret);

    const { error } = await supabase.from("halo_connections").upsert(
      {
        user_id: user.id,
        halo_url: haloUrl,
        tenant,
        client_id: clientId,
        client_secret_encrypted: encryptedClientSecret,
      },
      { onConflict: "user_id" },
    );

    if (error) {
      return NextResponse.json({ error: "Failed to save HaloPSA connection." }, { status: 500 });
    }

    const warnings: string[] = [];
    try {
      const ticketTypesRes = await fetch(
        `${haloUrl.replace(/\/+$/, "")}/api/TicketType?page_size=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        },
      );
      if (!ticketTypesRes.ok) {
        warnings.push(
          "read:tickettype permission not detected - Project tickets tab may not work",
        );
      } else {
        const ticketTypesData = (await ticketTypesRes.json()) as
          | { tickettypes?: unknown[]; result?: unknown[] }
          | unknown[];
        const hasAnyTypes = Array.isArray(ticketTypesData)
          ? ticketTypesData.length > 0
          : (Array.isArray(ticketTypesData.tickettypes) &&
              ticketTypesData.tickettypes.length > 0) ||
            (Array.isArray(ticketTypesData.result) &&
              ticketTypesData.result.length > 0);
        if (!hasAnyTypes) {
          warnings.push(
            "read:tickettype permission not detected - Project tickets tab may not work",
          );
        }
      }
    } catch {
      warnings.push(
        "read:tickettype permission not detected - Project tickets tab may not work",
      );
    }

    return NextResponse.json({ success: true, warnings });
  } catch {
    return NextResponse.json({ error: "Failed to connect HaloPSA." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pro = await isProUser(supabase, user.id);
    if (!pro) {
      return NextResponse.json({ error: "pro_required" }, { status: 403 });
    }

    const body = (await req.json()) as { autoClosureSummaryEnabled?: boolean };
    if (typeof body.autoClosureSummaryEnabled !== "boolean") {
      return NextResponse.json(
        { error: "autoClosureSummaryEnabled (boolean) is required." },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("halo_connections")
      .update({
        auto_closure_summary_enabled: body.autoClosureSummaryEnabled,
        auto_closure_summary: body.autoClosureSummaryEnabled,
      })
      .eq("user_id", user.id);

    if (error) {
      console.error("[halo/connect PATCH]", error);
      return NextResponse.json({ error: "Failed to update HaloPSA preferences." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update HaloPSA preferences." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase.from("halo_connections").delete().eq("user_id", user.id);
    if (error) {
      return NextResponse.json({ error: "Failed to disconnect HaloPSA." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to disconnect HaloPSA." }, { status: 500 });
  }
}
