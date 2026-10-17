import { createServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 1x1 transparent GIF. */
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

/**
 * Value Receipt open pixel. Records the first open time and a count. Always
 * returns the image, so a failed write never shows a broken picture to the
 * client. Opens are approximate: some inboxes fetch images for privacy, others
 * block them.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (/^[0-9a-f-]{36}$/i.test(id)) {
    try {
      const admin = createServiceRoleClient();
      const { data } = await admin.from("value_receipt_sends").select("opened_at,open_count").eq("id", id).maybeSingle();
      if (data) {
        await admin
          .from("value_receipt_sends")
          .update({ opened_at: data.opened_at ?? new Date().toISOString(), open_count: (Number(data.open_count) || 0) + 1 })
          .eq("id", id);
      }
    } catch {
      // Never let tracking break the email.
    }
  }
  return new Response(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(PIXEL.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
    },
  });
}
