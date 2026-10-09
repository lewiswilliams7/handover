import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Body = {
  first_name?: unknown;
  last_name?: unknown;
  job_title?: unknown;
  company_name?: unknown;
  custom_signoff?: unknown;
  signature_extra?: unknown;
  signature_override?: unknown;
  display_name?: unknown;
  output_language?: unknown;
};

function toNullableTrimmed(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let body: Body = {};
    try {
      body = (await request.json()) as Body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const updates: Record<string, string | null> = {};
    const firstName = toNullableTrimmed(body.first_name);
    const lastName = toNullableTrimmed(body.last_name);
    const jobTitle = toNullableTrimmed(body.job_title);
    const companyName = toNullableTrimmed(body.company_name);
    const customSignoff = toNullableTrimmed(body.custom_signoff);
    const signatureOverride = toNullableTrimmed(body.signature_override);
    const displayName = toNullableTrimmed(body.display_name);
    const outputLanguage = toNullableTrimmed(body.output_language);

    if (firstName !== undefined) updates.first_name = firstName;
    if (lastName !== undefined) updates.last_name = lastName;
    if (jobTitle !== undefined) updates.job_title = jobTitle;
    if (companyName !== undefined) updates.company_name = companyName;
    if (customSignoff !== undefined) updates.custom_signoff = customSignoff;
    if (signatureOverride !== undefined) updates.signature_override = signatureOverride;
    if (displayName !== undefined) updates.display_name = displayName;
    if (outputLanguage !== undefined) updates.output_language = outputLanguage;

    const signatureExtra = toNullableTrimmed(body.signature_extra);
    if (signatureExtra !== undefined) {
      updates.custom_signoff = signatureExtra;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: true });
    }

    const admin = createServiceRoleClient();
    const { error } = await admin.from("profiles").update(updates).eq("id", user.id);
    if (error) {
      console.error("[profile/update PATCH]", error.message);
      return NextResponse.json({ error: "Could not update profile." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[profile/update PATCH]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

