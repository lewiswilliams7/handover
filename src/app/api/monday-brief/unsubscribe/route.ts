import { NextResponse } from "next/server";

import { getAppOrigin } from "@/lib/app-url";
import { verifyBriefUnsubscribeToken } from "@/lib/monday-brief";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function page(title: string, body: string, status = 200) {
  const origin = getAppOrigin();
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#0b1220;color:#e6edf7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center">
<div style="max-width:420px;padding:32px;border:1px solid rgba(255,255,255,.1);border-radius:16px;background:rgba(255,255,255,.03)">
<h1 style="font-size:20px;margin:0 0 8px">${title}</h1><p style="color:#9fb0c7;line-height:1.6;margin:0 0 20px">${body}</p>
<a href="${origin}/week" style="color:#38bdf8;font-weight:600;text-decoration:none">Open Handover →</a></div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

async function unsubscribe(req: Request) {
  const params = new URL(req.url).searchParams;
  const userId = params.get("u") ?? "";
  const token = params.get("t") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !verifyBriefUnsubscribeToken(userId, token)) {
    return page("That link has expired", "Turn the Monday Brief off from the This week page in Handover instead.", 400);
  }
  const { error } = await createServiceRoleClient()
    .from("monday_brief_settings")
    .upsert({ user_id: userId, enabled: false, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) {
    return page("Something went wrong", "We could not update your settings. Turn the brief off from the This week page instead.", 500);
  }
  return page("You're unsubscribed", "You will not get the Monday Brief any more. You can turn it back on from the This week page at any time.");
}

export const GET = unsubscribe;
/** One-click unsubscribe from mail clients (RFC 8058). */
export const POST = unsubscribe;
