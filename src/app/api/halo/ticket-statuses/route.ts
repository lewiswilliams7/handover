import { NextResponse } from "next/server";

import { decrypt } from "@/lib/encryption";
import { getHaloTicketStatuses, getHaloToken } from "@/lib/halo";
import { isProUser } from "@/lib/plans";
import { createServerClient } from "@/lib/supabase/server";

/** Lists all HaloPSA ticket statuses (id + name) for QBR resolved-state matching. */
export async function GET() {
  try {
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

    let clientSecret: string;
    try {
      clientSecret = decrypt(conn.client_secret_encrypted);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Could not read HaloPSA credentials." },
        { status: 400 },
      );
    }

    const token = await getHaloToken({
      haloUrl: conn.halo_url,
      tenant: conn.tenant,
      clientId: conn.client_id,
      clientSecret,
    });
    const statuses = await getHaloTicketStatuses(conn.halo_url, token);
    return NextResponse.json({ statuses });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch ticket statuses." },
      { status: 500 },
    );
  }
}
