import { type NextRequest, NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim();
  const failUrl = new URL("/auth?tab=signin", request.nextUrl.origin);
  failUrl.searchParams.set("verify_error", "1");

  if (!token || token.length > 200) {
    return NextResponse.redirect(failUrl);
  }

  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch {
    return NextResponse.redirect(failUrl);
  }

  const { data: row, error: selErr } = await admin
    .from("email_verifications")
    .select("id, user_id, verified_at, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (selErr || !row) {
    return NextResponse.redirect(failUrl);
  }

  const expires = row.expires_at ? new Date(row.expires_at as string) : null;
  const { data: authLookup } = await admin.auth.admin.getUserById(row.user_id as string);
  const emailHint = authLookup.user?.email?.trim() ?? "";

  if (!expires || Number.isNaN(expires.getTime()) || expires.getTime() <= Date.now()) {
    const expiredUrl = new URL("/auth?tab=signin", request.nextUrl.origin);
    expiredUrl.searchParams.set("confirmation_expired", "1");
    if (emailHint) expiredUrl.searchParams.set("expired_email", emailHint);
    return NextResponse.redirect(expiredUrl);
  }

  if (row.verified_at) {
    const okUrl = new URL("/auth?tab=signin", request.nextUrl.origin);
    okUrl.searchParams.set("email_verified", "1");
    if (emailHint) okUrl.searchParams.set("email_hint", emailHint);
    return NextResponse.redirect(okUrl);
  }

  const nowIso = new Date().toISOString();
  const { error: upErr } = await admin
    .from("email_verifications")
    .update({ verified_at: nowIso })
    .eq("id", row.id);

  if (upErr) {
    console.error("[auth/verify] update:", upErr);
    return NextResponse.redirect(failUrl);
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id === row.user_id) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const signInUrl = new URL("/auth?tab=signin", request.nextUrl.origin);
  signInUrl.searchParams.set("email_verified", "1");
  if (emailHint) signInUrl.searchParams.set("email_hint", emailHint);
  return NextResponse.redirect(signInUrl);
}
