import { NextResponse } from "next/server";

import {
  fetchCwServiceTicketUserDefinedFields,
  findCwUserDefinedFieldMatch,
} from "@/lib/cw-user-defined-fields";
import { getCWAuthHeaders, getCWConnectionForUser } from "@/lib/cw-auth";
import { getPlanTierServer, verifyUserPlan } from "@/lib/server/verifyUserPlan";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fieldName = searchParams.get("field")?.trim();
    if (!fieldName) {
      return NextResponse.json({ exists: false, message: "field query parameter is required." });
    }

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
      console.error("[cw/customfields/test] verifyUserPlan:", e);
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
          exists: false,
          message:
            lastError ??
            "Could not load ConnectWise user-defined field definitions. Check API permissions for GET system/userDefinedFields.",
        });
      }

      const match = findCwUserDefinedFieldMatch(fields, fieldName);
      if (match) {
        return NextResponse.json({
          exists: true,
          message: `Field found: "${match.name}" (id ${match.id})`,
        });
      }

      return NextResponse.json({
        exists: false,
        message: `Field "${fieldName}" not found. Use the field caption as shown in ConnectWise Setup Tables, or the numeric id from the picker.`,
      });
    } catch (e) {
      console.error("[cw/customfields/test]", e);
      return NextResponse.json({
        exists: false,
        message: e instanceof Error ? e.message : "ConnectWise connection error.",
      });
    }
  } catch (e) {
    console.error("[cw/customfields/test] unexpected:", e);
    return NextResponse.json({ exists: false, message: "Unexpected error" });
  }
}
