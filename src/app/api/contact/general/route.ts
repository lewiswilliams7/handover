import { NextResponse } from "next/server";
import { Resend } from "resend";

import { buildHandoverResendFromHeader } from "@/lib/resend-from-header";

export const runtime = "nodejs";

const TO = "hello@gethandover.uk";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    console.error("[contact/general] RESEND_API_KEY is not set");
    return null;
  }
  return new Resend(key);
}

const SUBJECTS = new Set([
  "General enquiry",
  "Technical support",
  "Billing question",
  "Feature request",
  "Partnership",
  "Other",
]);

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    const firstName = str(body.firstName);
    const lastName = str(body.lastName);
    const email = str(body.email);
    const subject = str(body.subject);
    const message = str(body.message);

    if (!firstName || !lastName) {
      return NextResponse.json(
        { ok: false, error: "First name and last name are required." },
        { status: 400 },
      );
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { ok: false, error: "A valid email address is required." },
        { status: 400 },
      );
    }
    if (!subject || !SUBJECTS.has(subject)) {
      return NextResponse.json(
        { ok: false, error: "Please select a subject." },
        { status: 400 },
      );
    }
    if (!message || message.length < 3) {
      return NextResponse.json(
        { ok: false, error: "Please enter a message." },
        { status: 400 },
      );
    }

    const resend = getResend();
    if (!resend) {
      return NextResponse.json(
        { ok: false, error: "Email could not be sent. Please try again later." },
        { status: 500 },
      );
    }

    const fullName = `${firstName} ${lastName}`.trim();
    const text = [
      "Handover contact form",
      "",
      `Name: ${fullName}`,
      `Email: ${email}`,
      `Subject: ${subject}`,
      "",
      "Message:",
      message,
    ].join("\n");

    const { error } = await resend.emails.send({
      from: buildHandoverResendFromHeader(null),
      to: TO,
      replyTo: email,
      subject: `Handover Contact: ${subject}  -  ${fullName}`,
      text,
    });

    if (error) {
      console.error("[contact/general] Resend error:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to send your message. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[contact/general]", e);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
