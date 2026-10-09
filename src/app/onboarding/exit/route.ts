import { NextResponse } from "next/server";

import { userCanViewScanDetails } from "@/lib/scan-entitlement";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const destination = (await userCanViewScanDetails(user.id))
    ? "/"
    : "/onboarding/results";
  return NextResponse.redirect(new URL(destination, request.url));
}
