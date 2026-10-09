import { NextResponse } from "next/server";

import { encrypt } from "@/lib/encryption";
import { trackEvent } from "@/lib/logsnag";
import {
  normalizeConnectWiseSiteUrl,
  testCWConnection,
  type ConnectWiseConnection,
} from "@/lib/psa/connectwise";
import { createServerClient } from "@/lib/supabase/server";

export type { NormalisedNote, NormalisedTicket } from "@/lib/psa/types";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ connected: false }, { status: 200 });
    }

    const { data, error } = await supabase
      .from("cw_connections")
      .select("site_url, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      siteUrl: normalizeConnectWiseSiteUrl(data.site_url as string),
      updatedAt: data.updated_at,
    });
  } catch {
    return NextResponse.json({ connected: false });
  }
}

export async function DELETE() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase.from("cw_connections").delete().eq("user_id", user.id);
    if (error) {
      return NextResponse.json(
        { ok: false, error: "Failed to disconnect ConnectWise." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to disconnect ConnectWise." },
      { status: 500 },
    );
  }
}

type ConnectBody = {
  siteUrl?: string;
  companyId?: string;
  publicKey?: string;
  privateKey?: string;
  clientId?: string;
};

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    let body: ConnectBody;
    try {
      body = (await req.json()) as ConnectBody;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }
    console.log("[cw/connect] Request body:", body);

    const siteUrlRaw = body.siteUrl?.trim();
    const companyId = body.companyId?.trim();
    const publicKey = body.publicKey?.trim();
    const privateKey = body.privateKey?.trim();
    const clientId = body.clientId?.trim();

    if (!siteUrlRaw || !companyId || !publicKey || !privateKey || !clientId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "siteUrl, companyId, publicKey, privateKey, and clientId are required.",
        },
        { status: 400 },
      );
    }
    const siteUrl = normalizeConnectWiseSiteUrl(siteUrlRaw);
    const infoUrl = `${siteUrl}/v4_6_release/apis/3.0/system/info`;
    console.log("[cw/connect] Attempting connection to:", infoUrl);

    const conn: ConnectWiseConnection = {
      siteUrl,
      companyId,
      publicKey,
      privateKey,
      clientId,
    };

    const testResult = await testCWConnection(conn);
    if (!testResult.ok) {
      return NextResponse.json(
        { ok: false, error: testResult.error ?? "Connection test failed" },
        { status: 400 },
      );
    }

    const publicKeyEncrypted = encrypt(publicKey);
    const privateKeyEncrypted = encrypt(privateKey);

    const { error } = await supabase.from("cw_connections").upsert(
      {
        user_id: user.id,
        site_url: siteUrl,
        company_id: companyId,
        public_key_encrypted: publicKeyEncrypted,
        private_key_encrypted: privateKeyEncrypted,
        client_id: clientId,
      },
      { onConflict: "user_id" },
    );

    if (error) {
      console.error("[cw/connect] Error:", error);
      return NextResponse.json(
        {
          ok: false,
          error: "Failed to save ConnectWise connection.",
          details: typeof error.message === "string" ? error.message : String(error),
        },
        { status: 500 },
      );
    }

    void trackEvent({
      channel: "activations",
      event: "PSA Connected",
      icon: "🔌",
      description: `${user.email} connected ConnectWise`,
      tags: {
        email: user.email ?? "unknown",
        psa: "connectwise",
      },
      notify: true,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to connect ConnectWise.";
    const stack = e instanceof Error ? e.stack ?? null : null;
    console.error("[cw/connect] Error:", e);
    if (stack) {
      console.error("[cw/connect] Stack:", stack);
    }
    return NextResponse.json(
      { ok: false, error: message, stack },
      { status: 500 },
    );
  }
}
