import { NextResponse } from "next/server";
import { Resend } from "resend";

import { buildHandoverResendFromHeader } from "@/lib/resend-from-header";
import { requireScanDetailsEntitlement } from "@/lib/scan-entitlement";
import { createServerClient } from "@/lib/supabase/server";
import { valueReceiptHtml, valueReceiptText, type ValueReceipt } from "@/lib/value-receipt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(value: unknown, max: number): string | null {
  return typeof value === "string" && value.trim() && value.length <= max ? value : null;
}

/**
 * Rebuild a receipt from the posted data, keeping only plain strings and
 * numbers within sensible limits. The email HTML is always rendered here, so
 * nothing the browser sends is ever passed through as markup.
 */
function parseReceipt(raw: unknown): ValueReceipt | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const clientName = str(r.clientName, 200);
  const periodLabel = str(r.periodLabel, 80);
  const headline = str(r.headline, 400);
  if (!clientName || !periodLabel || !headline) return null;
  const stats = Array.isArray(r.stats)
    ? r.stats.slice(0, 8).flatMap((stat) => {
        const s = stat as Record<string, unknown>;
        const label = str(s?.label, 80);
        const value = str(s?.value, 40);
        return label && value ? [{ key: String(s.key ?? label).slice(0, 40), label, value, note: str(s.note, 160) ?? undefined }] : [];
      })
    : [];
  const summary = Array.isArray(r.summary) ? r.summary.slice(0, 8).flatMap((line) => (str(line, 400) ? [line as string] : [])) : [];
  const workTypes = Array.isArray(r.workTypes)
    ? r.workTypes.slice(0, 5).flatMap((t) => {
        const w = t as Record<string, unknown>;
        const type = str(w?.type, 80);
        const count = Number(w?.count);
        return type && Number.isFinite(count) && count >= 0 ? [{ type, count: Math.round(count) }] : [];
      })
    : [];
  const trend = Array.isArray(r.trend)
    ? r.trend.slice(0, 12).flatMap((p) => {
        const t = p as Record<string, unknown>;
        const label = str(t?.label, 12);
        const resolved = Number(t?.resolved);
        return label && Number.isFinite(resolved) && resolved >= 0
          ? [{ month: String(t.month ?? "").slice(0, 7), label, resolved: Math.round(resolved), current: t.current === true }]
          : [];
      })
    : [];
  return {
    clientId: Number(r.clientId) || 0,
    clientName,
    month: String(r.month ?? "").slice(0, 40),
    periodLabel,
    headline,
    stats,
    summary,
    workTypes,
    inProgress: Number(r.inProgress) || 0,
    sendable: true,
    unsendableReason: null,
    hoursTracked: r.hoursTracked === true,
    dataWarnings: [],
    period: r.period === "quarter" ? "quarter" : "month",
    trend,
  };
}

/** Send a Value Receipt to a client as a branded email, replies to the sender. */
export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const entitlement = await requireScanDetailsEntitlement(user.id, supabase);
  if (entitlement) return entitlement;
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ ok: false, error: "email_not_configured" }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { to?: unknown; receipt?: unknown } | null;
  const to = typeof body?.to === "string" ? body.to.trim() : "";
  if (!EMAIL_PATTERN.test(to)) return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  const receipt = parseReceipt(body?.receipt);
  if (!receipt) return NextResponse.json({ ok: false, error: "invalid_receipt" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, display_name, company_name, brand_name, brand_colour, brand_logo_url")
    .eq("id", user.id)
    .maybeSingle();
  const mspName =
    (typeof profile?.company_name === "string" && profile.company_name.trim()) ||
    (typeof profile?.brand_name === "string" && profile.brand_name.trim()) ||
    "";
  const senderName =
    [profile?.first_name, profile?.last_name].filter((part) => typeof part === "string" && part.trim()).join(" ") ||
    (typeof profile?.display_name === "string" ? profile.display_name : "");
  const text = valueReceiptText(receipt, { mspName, senderName });

  const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: buildHandoverResendFromHeader(profile),
    to,
    ...(user.email ? { replyTo: user.email } : {}),
    subject: text.subject,
    text: text.body,
    html: valueReceiptHtml(receipt, {
      mspName,
      senderName,
      accent: typeof profile?.brand_colour === "string" ? profile.brand_colour : null,
      logoUrl: typeof profile?.brand_logo_url === "string" ? profile.brand_logo_url : null,
    }),
  });
  if (error) return NextResponse.json({ ok: false, error: "send_failed" }, { status: 502 });
  return NextResponse.json({ ok: true });
}
