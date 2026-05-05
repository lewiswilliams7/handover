import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";
import { getHaloToken } from "@/lib/halo";
import { isProUser } from "@/lib/plans";
import { getCWAuthHeaders, getCWConnectionForUser } from "@/lib/cw-auth";

type ChaseBody = {
  ticketId: number | string;
  note: string;
  source: "halopsa" | "connectwise";
};

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!(await isProUser(supabase, user.id))) {
      return NextResponse.json({ error: "pro_required" }, { status: 403 });
    }

    const { ticketId, note, source } = (await request.json()) as ChaseBody;
    if (!ticketId || !note?.trim() || (source !== "halopsa" && source !== "connectwise")) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    if (source === "halopsa") {
      const admin = createServiceRoleClient();
      const { data: conn } = await admin
        .from("halo_connections")
        .select("halo_url, tenant, client_id, client_secret_encrypted")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!conn) return NextResponse.json({ error: "HaloPSA not connected" }, { status: 400 });

      const clientSecret = decrypt(conn.client_secret_encrypted);
      const token = await getHaloToken({
        haloUrl: conn.halo_url,
        tenant: conn.tenant,
        clientId: conn.client_id,
        clientSecret,
      });

      const res = await fetch(`${conn.halo_url}/api/Actions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          {
            ticket_id: ticketId,
            note: note.trim(),
            hiddenfromuser: true,
            outcome: "Internal Note",
          },
        ]),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("[chase-ticket] Halo push failed:", err);
        return NextResponse.json({ error: "Failed to push note to HaloPSA" }, { status: 500 });
      }
    }

    if (source === "connectwise") {
      const [conn, headers] = await Promise.all([
        getCWConnectionForUser(user.id),
        getCWAuthHeaders(user.id),
      ]);

      const res = await fetch(
        `${conn.siteUrl}/v4_6_release/apis/3.0/service/tickets/${ticketId}/notes`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            text: note.trim(),
            internalAnalysisFlag: true,
            detailDescriptionFlag: false,
            resolutionFlag: false,
          }),
        },
      );

      if (!res.ok) {
        const err = await res.text();
        console.error("[chase-ticket] CW push failed:", err);
        return NextResponse.json({ error: "Failed to push note to ConnectWise" }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[chase-ticket] unexpected:", e);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
