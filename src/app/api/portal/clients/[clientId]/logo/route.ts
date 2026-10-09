import { NextResponse } from "next/server";

import { getPortalAccountForMspUser, requireEnterprisePlan, requireHandoverUserId } from "@/lib/server/portal-msp";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const BUCKET = "brand-logos";
const MAX_BYTES = 2 * 1024 * 1024;

const ALLOWED = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]);

type Ctx = { params: Promise<{ clientId: string }> };

export async function POST(request: Request, ctx: Ctx) {
  try {
    const userId = await requireHandoverUserId();
    await requireEnterprisePlan(userId);
    const account = await getPortalAccountForMspUser(userId);
    if (!account?.id) return NextResponse.json({ error: "No portal account." }, { status: 400 });
    const { clientId } = await ctx.params;

    const admin = createServiceRoleClient();
    const { data: client } = await admin
      .from("portal_clients")
      .select("id")
      .eq("id", clientId)
      .eq("portal_account_id", account.id)
      .maybeSingle();
    if (!client) return NextResponse.json({ error: "Not found." }, { status: 404 });

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
    }
    const entry = formData.get("logo") ?? formData.get("file");
    if (!(entry instanceof File)) {
      return NextResponse.json({ error: "Missing logo file" }, { status: 400 });
    }
    if (entry.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image must be under 2MB" }, { status: 400 });
    }
    const bytes = Buffer.from(await entry.arrayBuffer());
    const contentType =
      entry.type && ALLOWED.has(entry.type.trim().toLowerCase())
        ? entry.type.trim().toLowerCase()
        : "image/png";

    const ext =
      contentType === "image/png"
        ? "png"
        : contentType === "image/jpeg" || contentType === "image/jpg"
          ? "jpg"
          : contentType === "image/webp"
            ? "webp"
            : "gif";
    const path = `${userId}/portal-clients/${clientId}.${ext}`;
    const { error: uploadErr } = await admin.storage.from(BUCKET).upload(path, bytes, {
      upsert: true,
      contentType,
    });
    if (uploadErr) {
      console.error("[portal/client logo]", uploadErr.message);
      console.error("[portal/clients/.../logo POST]", uploadErr.message);
      return NextResponse.json(
        { error: "Could not upload logo. Please try again." },
        { status: 500 },
      );
    }

    const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
    const url = `${base}/storage/v1/object/public/${BUCKET}/${path}`;
    await admin.from("portal_clients").update({ logo_url: url }).eq("id", clientId).eq("portal_account_id", account.id);

    return NextResponse.json({ url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg === "unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "growth_required" || msg === "enterprise_required") {
      return NextResponse.json({ error: "Growth plan or above required." }, { status: 403 });
    }
    console.error("[portal/client logo]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
