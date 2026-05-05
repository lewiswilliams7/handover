import { NextResponse } from "next/server";

import { decrypt } from "@/lib/encryption";
import { getHaloToken } from "@/lib/halo";
import { createServerClient } from "@/lib/supabase/server";

type ProbeResult =
  | { ok: true; status: number; body: unknown }
  | { ok: false; status?: number; error: string; body?: unknown };

async function probeEndpoint(
  url: string,
  token: string,
  label: string,
): Promise<ProbeResult> {
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const rawText = await res.text();
    console.log(`[halo/reports/test] ${label} raw response body:`, rawText);

    let parsed: unknown = rawText;
    try {
      parsed = rawText ? (JSON.parse(rawText) as unknown) : null;
    } catch {
      // Keep raw text when response is not JSON.
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: `Halo API error ${res.status} on ${label}`,
        body: parsed,
      };
    }

    return { ok: true, status: res.status, body: parsed };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: conn, error: connErr } = await supabase
      .from("halo_connections")
      .select("halo_url, tenant, client_id, client_secret_encrypted")
      .eq("user_id", user.id)
      .maybeSingle();

    if (connErr || !conn) {
      return NextResponse.json({ error: "HaloPSA is not connected yet." }, { status: 400 });
    }

    let clientSecret: string;
    try {
      clientSecret = decrypt(conn.client_secret_encrypted);
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Could not authenticate with HaloPSA. Check your Client ID and Secret.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    let token = "";
    try {
      token = await getHaloToken({
        haloUrl: conn.halo_url,
        tenant: conn.tenant,
        clientId: conn.client_id,
        clientSecret,
      });
    } catch {
      return NextResponse.json(
        { error: "HaloPSA credentials are invalid. Please reconnect." },
        { status: 400 },
      );
    }

    const haloBaseUrl = conn.halo_url.replace(/\/+$/, "");

    const [reportRoot, apiReports, reportDataList, statistic, statistics] = await Promise.all([
      probeEndpoint(`${haloBaseUrl}/Report`, token, "reportRoot"),
      probeEndpoint(`${haloBaseUrl}/api/reports`, token, "apiReports"),
      probeEndpoint(`${haloBaseUrl}/api/ReportData/list`, token, "reportDataList"),
      probeEndpoint(`${haloBaseUrl}/api/statistic`, token, "statistic"),
      probeEndpoint(`${haloBaseUrl}/api/Statistics`, token, "statistics"),
    ]);

    return NextResponse.json({
      reportRoot,
      apiReports,
      reportDataList,
      statistic,
      statistics,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to probe Halo report APIs.";
    console.error("[halo/reports/test] exception:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
