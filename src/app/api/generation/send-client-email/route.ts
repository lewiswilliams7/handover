import { NextResponse } from "next/server";
import { Resend } from "resend";

import { parseCommaSeparatedEmails, resendRecipientList } from "@/lib/email-recipients";
import { buildRawClientEmailBodyHtml } from "@/lib/scheduled-report-email";
import { buildReportEmailResendFromHeader } from "@/lib/resend-from-header";
import { getUserPlan } from "@/lib/utils/getPlan";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_BODY_CHARS = 400_000;

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const toRaw = typeof body.to === "string" ? body.to.trim() : "";
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const textBody = typeof body.textBody === "string" ? body.textBody : "";
    const ccRaw = typeof body.cc === "string" ? body.cc.trim() : "";
    const bccRaw = typeof body.bcc === "string" ? body.bcc.trim() : "";

    const toList = parseCommaSeparatedEmails(toRaw);
    if (toList.length === 0) {
      return NextResponse.json(
        { error: "Enter at least one valid recipient email (comma-separated allowed)." },
        { status: 400 },
      );
    }
    const ccList = parseCommaSeparatedEmails(ccRaw);
    const bccList = parseCommaSeparatedEmails(bccRaw);

    if (!subject || subject.length > 998) {
      return NextResponse.json({ error: "A valid subject is required." }, { status: 400 });
    }
    const trimmedBody = textBody.trim();
    if (!trimmedBody) {
      return NextResponse.json({ error: "Email body cannot be empty." }, { status: 400 });
    }
    if (trimmedBody.length > MAX_BODY_CHARS) {
      return NextResponse.json({ error: "Email body is too long." }, { status: 400 });
    }

    const resend = getResend();
    if (!resend) {
      return NextResponse.json(
        { error: "Email could not be sent. Please try again later." },
        { status: 500 },
      );
    }

    const replyTo = user.email?.trim() || undefined;

    const pf = await getUserPlan(supabase, user.id);
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("display_name, first_name, last_name, company_name, brand_name, white_label_mode")
      .eq("id", user.id)
      .maybeSingle();

    const profileForEmail = { ...profileRow, plan: pf.plan };
    const html = buildRawClientEmailBodyHtml(trimmedBody);

    const toField = resendRecipientList(toList)!;
    const ccField = resendRecipientList(ccList);
    const bccField = resendRecipientList(bccList);

    const { error } = await resend.emails.send({
      from: buildReportEmailResendFromHeader(profileForEmail),
      to: toField,
      subject,
      html,
      text: trimmedBody,
      ...(replyTo ? { replyTo } : {}),
      ...(ccField ? { cc: ccField } : {}),
      ...(bccField ? { bcc: bccField } : {}),
    });

    if (error) {
      console.error("[generation/send-client-email] Resend:", error);
      return NextResponse.json(
        { error: error.message || "Failed to send email." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[generation/send-client-email]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
