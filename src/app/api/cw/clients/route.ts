import { NextResponse } from "next/server";

import { getCWConnectionForUser } from "@/lib/cw-auth";
import { fetchAllCWCompanies } from "@/lib/psa/connectwise";
import { isProUser } from "@/lib/plans";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const qRaw = searchParams.get("q") ?? "";
    const q = qRaw.trim().toLowerCase();

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!(await isProUser(supabase, user.id))) {
      return NextResponse.json({ error: "pro_required" }, { status: 403 });
    }

    let conn;
    try {
      conn = await getCWConnectionForUser(user.id);
    } catch {
      return NextResponse.json({ error: "ConnectWise not connected" }, { status: 400 });
    }

    const companies = await fetchAllCWCompanies(conn);

    const filtered =
      q.length > 0
        ? companies.filter(
            (c) => c.name.toLowerCase().includes(q) || String(c.id).includes(q),
          )
        : companies;

    return NextResponse.json({ clients: filtered });
  } catch (e) {
    console.error("[cw/clients]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
