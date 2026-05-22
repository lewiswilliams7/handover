import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BUCKET = "brand-logos";
const MAX_BYTES = 2 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

function bufferLooksLikeImage(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  const head6 = buf.subarray(0, 6).toString("ascii");
  if (head6 === "GIF87a" || head6 === "GIF89a") return true;
  if (
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return true;
  }
  return false;
}

function isAllowedImage(file: File, bytes: Buffer): boolean {
  const t = (file.type || "").trim().toLowerCase();
  if (t.startsWith("image/")) {
    if (ALLOWED_TYPES.has(t)) return true;
    if (t === "image/pjpeg" || t === "image/x-png") return true;
  }
  return bufferLooksLikeImage(bytes);
}

export async function POST(request: Request) {
  try {
    const authClient = await createServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    if (!isAllowedImage(entry, bytes)) {
      return NextResponse.json({ error: "File must be an image (PNG, JPEG, WebP, or GIF)" }, { status: 400 });
    }

    const contentType =
      entry.type && ALLOWED_TYPES.has(entry.type.trim().toLowerCase())
        ? entry.type.trim().toLowerCase()
        : "image/png";

    const admin = createServiceRoleClient();
    const path = `${user.id}/logo.png`;
    const { error: uploadErr } = await admin.storage.from(BUCKET).upload(path, bytes, {
      upsert: true,
      contentType,
    });

    if (uploadErr) {
      console.error("[upload-logo] storage upload:", uploadErr.message);
      console.error("[brand/upload-logo]", uploadErr.message);
      return NextResponse.json(
        { error: "Upload failed. Please try again." },
        { status: 500 },
      );
    }

    const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
    if (!base) {
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }
    const url = `${base}/storage/v1/object/public/${BUCKET}/${user.id}/logo.png`;

    return NextResponse.json({ url });
  } catch (e) {
    console.error("[upload-logo]", e);
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
