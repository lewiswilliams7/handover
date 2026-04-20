import { NextResponse } from "next/server";

import { decrypt } from "@/lib/encryption";
import { normalizeConnectWiseSiteUrl, testCWConnection } from "@/lib/psa/connectwise";
import { createServerClient } from "@/lib/supabase/server";

export type { NormalisedNote, NormalisedTicket } from "@/lib/psa/types";

type TryBody = {
  siteUrl?: string;
  companyId?: string;
  publicKey?: string;
  privateKey?: string;
  clientId?: string;
};

/** Test credentials from the setup form before they are saved (GET still tests stored connection only). */
export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    let body: TryBody;
    try {
      body = (await req.json()) as TryBody;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const siteUrlRaw = body.siteUrl?.trim();
    const companyId = body.companyId?.trim();
    const publicKey = body.publicKey?.trim();
    const privateKey = body.privateKey?.trim();
    const clientId = body.clientId?.trim();

    if (!siteUrlRaw || !companyId || !publicKey || !privateKey || !clientId) {
      return NextResponse.json(
        { ok: false, error: "All credential fields are required to test." },
        { status: 400 },
      );
    }
    const siteUrl = normalizeConnectWiseSiteUrl(siteUrlRaw);

    const result = await testCWConnection({
      siteUrl,
      companyId,
      publicKey,
      privateKey,
      clientId,
    });

    if (!result.ok) {
      return NextResponse.json({
        ok: false,
        error: result.error ?? "ConnectWise connection test failed",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "ConnectWise test failed.",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: row, error } = await supabase
      .from("cw_connections")
      .select(
        "site_url, company_id, client_id, public_key_encrypted, private_key_encrypted",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !row) {
      return NextResponse.json(
        { ok: false, error: "ConnectWise is not connected yet." },
        { status: 400 },
      );
    }

    let publicKey: string;
    let privateKey: string;
    try {
      publicKey = decrypt(row.public_key_encrypted as string);
      privateKey = decrypt(row.private_key_encrypted as string);
    } catch (e) {
      return NextResponse.json(
        {
          ok: false,
          error: e instanceof Error ? e.message : "Could not decrypt credentials.",
        },
        { status: 500 },
      );
    }

    const result = await testCWConnection({
      siteUrl: normalizeConnectWiseSiteUrl(row.site_url as string),
      companyId: row.company_id as string,
      publicKey,
      privateKey,
      clientId: row.client_id as string,
    });

    if (!result.ok) {
      return NextResponse.json({
        ok: false,
        error: result.error ?? "ConnectWise connection test failed",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "ConnectWise test failed.",
      },
      { status: 500 },
    );
  }
}
