import { NextResponse } from "next/server";

import { decrypt } from "@/lib/encryption";
import { getHaloToken, getTicketDetails } from "@/lib/halo";
import { isProUser } from "@/lib/plans";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = Number.parseInt(url.searchParams.get("id") ?? "", 10);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Ticket id is required." }, { status: 400 });
    }

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await isProUser(supabase, user.id))) {
      return NextResponse.json({ error: "pro_required" }, { status: 403 });
    }

    const { data: conn, error } = await supabase
      .from("halo_connections")
      .select("halo_url, tenant, client_id, client_secret_encrypted")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error || !conn) {
      return NextResponse.json({ error: "HaloPSA is not connected yet." }, { status: 400 });
    }

    const token = await getHaloToken({
      haloUrl: conn.halo_url,
      tenant: conn.tenant,
      clientId: conn.client_id,
      clientSecret: decrypt(conn.client_secret_encrypted),
    });
    const ticket = await getTicketDetails(conn.halo_url, token, id);
    return NextResponse.json({ ticket });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch HaloPSA ticket details.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
