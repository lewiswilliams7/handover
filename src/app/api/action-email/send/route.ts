import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      to: string;
      from?: string;
      subject: string;
      body: string;
      clientName?: string;
    };

    const { to, subject, body: emailBody } = body;

    if (!to || !subject || !emailBody) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }
    if (
      typeof to !== "string" ||
      !EMAIL_PATTERN.test(to.trim()) ||
      subject.length > 300 ||
      emailBody.length > 20_000
    ) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_name, display_name")
      .eq("id", user.id)
      .maybeSingle();

    const fromName =
      (profile?.company_name as string | null) ||
      (profile?.display_name as string | null) ||
      "Handover";

    await resend.emails.send({
      from: `${fromName} <reports@gethandover.uk>`,
      to: to.trim(),
      // Replies go to the person who sent it, not the shared sending address.
      ...(user.email ? { replyTo: user.email } : {}),
      subject,
      text: emailBody,
      html: emailBody
        .split("\n")
        .map((line) =>
          line
            ? `<p style="margin:0 0 8px;font-family:-apple-system,sans-serif;font-size:14px;color:#374151;line-height:1.6;">${escapeHtml(line)}</p>`
            : "<br/>",
        )
        .join(""),
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[action-email/send]", e);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
