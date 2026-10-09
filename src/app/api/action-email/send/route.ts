import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

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
      to,
      subject,
      text: emailBody,
      html: emailBody
        .split("\n")
        .map((line) =>
          line
            ? `<p style="margin:0 0 8px;font-family:-apple-system,sans-serif;font-size:14px;color:#374151;line-height:1.6;">${line}</p>`
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
