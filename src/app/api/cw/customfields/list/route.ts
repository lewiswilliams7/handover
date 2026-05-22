import { NextResponse } from "next/server";

import { fetchCwServiceTicketUserDefinedFields } from "@/lib/cw-user-defined-fields";
import { getCWAuthHeaders, getCWConnectionForUser } from "@/lib/cw-auth";
import { getPlanTierServer, verifyUserPlan } from "@/lib/server/verifyUserPlan";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const planFields = await verifyUserPlan(user.id);
      if (getPlanTierServer(planFields) < 1) {
        return NextResponse.json({ error: "pro_required" }, { status: 403 });
      }
    } catch (e) {
      console.error("[cw/customfields/list] verifyUserPlan:", e);
      return NextResponse.json({ error: "Could not verify subscription." }, { status: 500 });
    }

    try {
      const [conn, headers] = await Promise.all([
        getCWConnectionForUser(user.id),
        getCWAuthHeaders(user.id),
      ]);
      const { fields, lastError } = await fetchCwServiceTicketUserDefinedFields({
        siteUrl: conn.siteUrl,
        headers,
      });

      if (fields.length === 0) {
        return NextResponse.json({
          fields: [],
          message:
            lastError ??
            "No ConnectWise service-ticket user-defined fields were returned. Your API member may need access to GET system/userDefinedFields, or your site may use a different pod identifier for ticket fields.",
        });
      }

      return NextResponse.json({
        fields: fields.map((f) => ({ name: f.name, label: f.label })),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "ConnectWise is not connected or credentials failed.";
      console.error("[cw/customfields/list]", e);
      return NextResponse.json({
        fields: [],
        message: msg,
      });
    }
  } catch (e) {
    console.error("[cw/customfields/list] unexpected:", e);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
