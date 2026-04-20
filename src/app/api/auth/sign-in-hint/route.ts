import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/admin";

const EMAIL_MAX = 254;
const BASIC_EMAIL =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ hint: "invalid" }, { status: 400 });
    }
    const raw =
      typeof body === "object" &&
      body !== null &&
      "email" in body &&
      typeof (body as { email: unknown }).email === "string"
        ? (body as { email: string }).email
        : "";
    const email = raw.trim();
    if (!email || email.length > EMAIL_MAX || !BASIC_EMAIL.test(email)) {
      return NextResponse.json({ hint: "invalid" }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    const lower = email.toLowerCase();

    let profileId: string | null = null;
    const { data: rowExact, error: errExact } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (errExact) {
      console.warn("[auth/sign-in-hint] profiles (exact):", errExact.message);
    }
    if (typeof rowExact?.id === "string") {
      profileId = rowExact.id;
    }

    if (!profileId) {
      const { data: rowLower, error: errLower } = await admin
        .from("profiles")
        .select("id")
        .eq("email", lower)
        .maybeSingle();
      if (errLower) {
        console.warn("[auth/sign-in-hint] profiles (lower):", errLower.message);
        return NextResponse.json({ hint: "unknown" });
      }
      if (typeof rowLower?.id === "string") {
        profileId = rowLower.id;
      }
    }

    if (!profileId) {
      return NextResponse.json({ hint: "unknown" });
    }

    const { data: userData, error: userErr } = await admin.auth.admin.getUserById(profileId);
    if (userErr || !userData?.user) {
      return NextResponse.json({ hint: "unknown" });
    }

    const identities = userData.user.identities ?? [];
    const providers = new Set(
      identities
        .map((i) => (typeof i.provider === "string" ? i.provider.toLowerCase() : ""))
        .filter(Boolean),
    );

    const hasEmailPasswordIdentity = providers.has("email");
    const hasGoogle = providers.has("google");

    if (!hasEmailPasswordIdentity && hasGoogle) {
      return NextResponse.json({ hint: "google_oauth" });
    }

    return NextResponse.json({ hint: "unknown" });
  } catch (e) {
    console.error("[auth/sign-in-hint]", e);
    return NextResponse.json({ hint: "unknown" });
  }
}
