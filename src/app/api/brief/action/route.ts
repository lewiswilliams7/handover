import { NextResponse } from "next/server";

import { getAppOrigin } from "@/lib/app-url";
import { verifyBriefActionToken } from "@/lib/monday-brief";
import { getFindingCopy } from "@/lib/psa/scan-finding-copy";
import { recordFindingAction } from "@/lib/server/finding-actions";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function page(title: string, body: string, extra = "", status = 200) {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;background:#0b1220;color:#e6edf7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:16px">
<div style="max-width:440px;width:100%;padding:28px;border:1px solid rgba(255,255,255,.1);border-radius:16px;background:rgba(255,255,255,.03)">
<h1 style="font-size:20px;margin:0 0 8px">${esc(title)}</h1><p style="color:#9fb0c7;line-height:1.6;margin:0 0 20px">${body}</p>${extra}</div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

function parse(req: Request) {
  const params = new URL(req.url).searchParams;
  const userId = params.get("u") ?? "";
  const sessionId = params.get("s") ?? "";
  const clientId = Number(params.get("c"));
  const findingType = params.get("f") ?? "";
  const token = params.get("t") ?? "";
  const valid =
    /^[0-9a-f-]{36}$/i.test(userId) &&
    /^[0-9a-f-]{36}$/i.test(sessionId) &&
    Number.isSafeInteger(clientId) &&
    clientId > 0 &&
    /^[a-z_]{2,40}$/.test(findingType) &&
    verifyBriefActionToken(userId, sessionId, clientId, findingType, token);
  return { valid, userId, sessionId, clientId, findingType };
}

/**
 * Opening the link shows a confirm button rather than acting straight away:
 * mail security scanners open links automatically, and they must never mark
 * a client as handled on the owner's behalf.
 */
export async function GET(req: Request) {
  const input = parse(req);
  if (!input.valid) {
    return page("That link has expired", "Open Revenue at Risk in Handover to record what you did.", "", 400);
  }
  const label = getFindingCopy(input.findingType).label;
  return page(
    "Mark as handled?",
    `This records that someone has dealt with <strong style="color:#e6edf7">${esc(label.toLowerCase())}</strong>. Handover will check on the next weekly scan whether it cleared, and count it in Saved Revenue if it did.`,
    `<form method="post"><button type="submit" style="background:#0ea5e9;color:#fff;border:0;border-radius:8px;padding:11px 18px;font-weight:600;font-size:14px;cursor:pointer">Yes, mark it handled</button>
     <a href="${getAppOrigin()}/attention?finding=${input.clientId}:${encodeURIComponent(input.findingType)}" style="margin-left:14px;color:#38bdf8;font-weight:600;text-decoration:none">Open it in Handover</a></form>`,
  );
}

export async function POST(req: Request) {
  const input = parse(req);
  if (!input.valid) {
    return page("That link has expired", "Open Revenue at Risk in Handover to record what you did.", "", 400);
  }
  const result = await recordFindingAction(createServiceRoleClient(), {
    userId: input.userId,
    scanSessionId: input.sessionId,
    clientId: input.clientId,
    findingType: input.findingType,
    action: "handled",
    note: "Marked handled from the Monday Brief",
  });
  const origin = getAppOrigin();
  if (!result.ok) {
    return page(
      "That could not be saved",
      result.error === "scan_session_unavailable" || result.error === "finding_not_found"
        ? "A newer scan has replaced this one. Open Revenue at Risk to record it against the latest result."
        : "Something went wrong saving it. Try again from Revenue at Risk.",
      `<a href="${origin}/attention" style="color:#38bdf8;font-weight:600;text-decoration:none">Open Revenue at Risk →</a>`,
      result.ok ? 200 : 409,
    );
  }
  return page(
    "Marked as handled",
    "Thanks. Handover will check on the next weekly scan whether the warning cleared.",
    `<a href="${origin}/week" style="color:#38bdf8;font-weight:600;text-decoration:none">Open your week →</a>`,
  );
}
