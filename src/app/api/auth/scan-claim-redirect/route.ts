import { NextResponse } from "next/server";

import { userCanViewScanDetails } from "@/lib/scan-entitlement";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getUser() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("profiles")
    .select("scan_claim_redirect_pending")
    .eq("id", user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ ok: false }, { status: 500 });

  return NextResponse.json({
    ok: true,
    detailsEntitled: await userCanViewScanDetails(user.id),
    redirectPending: data?.scan_claim_redirect_pending === true,
  });
}

export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("profiles")
    .update({ scan_claim_redirect_pending: false })
    .eq("id", user.id)
    .eq("scan_claim_redirect_pending", true)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ ok: false }, { status: 500 });

  return NextResponse.json({
    ok: true,
    redirectToResults: Boolean(data?.id),
  });
}
