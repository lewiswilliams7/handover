import { NextResponse } from "next/server";

import { decrypt } from "@/lib/encryption";
import { getHaloProjects } from "@/lib/halo";
import { getPlanTierServer, verifyUserPlan } from "@/lib/server/verifyUserPlan";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    try {
      const planFields = await verifyUserPlan(user.id);
      if (getPlanTierServer(planFields) < 1) {
        return NextResponse.json({ error: "pro_required" }, { status: 403 });
      }
    } catch (e) {
      console.error("[halo/projects] verifyUserPlan:", e);
      return NextResponse.json({ error: "Could not verify subscription." }, { status: 500 });
    }

    const { data: connection, error: connErr } = await supabase
      .from("halo_connections")
      .select("halo_url, tenant, client_id, client_secret_encrypted")
      .eq("user_id", user.id)
      .maybeSingle();

    if (connErr || !connection) {
      return NextResponse.json(
        { error: connection ? "No connection" : "No connection", details: connErr?.message },
        { status: 404 },
      );
    }

    const clientSecret = decrypt(connection.client_secret_encrypted);
    const payload = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: connection.client_id,
      client_secret: clientSecret,
      scope: "all",
    });

    const tokenRes = await fetch(`${connection.halo_url}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: payload,
    });

    const tokenData: unknown = await tokenRes.json();
    const token =
      tokenData && typeof tokenData === "object"
        ? (tokenData as Record<string, unknown>).access_token
        : undefined;

    console.log("[projects route] token:", token ? "obtained" : "missing");
    console.log("[projects route] status:", tokenRes.status);

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Could not authenticate with HaloPSA.", details: tokenRes.status },
        { status: 400 },
      );
    }

    // Use the same backend `getHaloProjects` logic as the import modal.
    const result = await getHaloProjects(connection.halo_url, token, {
      count: 100,
    });

    console.log("[projects route] fetched:", result.length, "projects");
    if (result[0]) {
      console.log(
        "[projects route] sample:",
        JSON.stringify(result[0]).substring(0, 300),
      );
    }

    return NextResponse.json({ projects: result, total: result.length });
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error(String(err));
    console.error("[projects route] error:", e.message, e);
    return NextResponse.json(
      { error: "Could not load projects. Please try again." },
      { status: 500 },
    );
  }
}

