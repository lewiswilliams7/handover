import { NextResponse } from "next/server";
import { Resend } from "resend";

import { buildHandoverResendFromHeader } from "@/lib/resend-from-header";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const TO = "hello@gethandover.uk";
const ENQUIRY_TYPES = new Set(["starter", "enterprise"]);
const PSA_OPTIONS = new Set(["HaloPSA", "ConnectWise", "Other"]);

function text(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const enquiryType = text(body.type, 20);
    const name = text(body.name, 120);
    const company = text(body.company, 160);
    const email = text(body.email, 320);
    const managedClients = text(body.managedClients, 100);
    const psa = text(body.psa, 40);
    const message = text(body.message, 4000);

    if (!ENQUIRY_TYPES.has(enquiryType)) {
      return NextResponse.json({ ok: false, error: "Invalid enquiry type." }, { status: 400 });
    }
    if (!name || !company || !managedClients || !message) {
      return NextResponse.json(
        { ok: false, error: "Please complete all required fields." },
        { status: 400 },
      );
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid work email address." },
        { status: 400 },
      );
    }
    if (!PSA_OPTIONS.has(psa)) {
      return NextResponse.json({ ok: false, error: "Please select your PSA." }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    const { error: insertError } = await admin.from("pricing_enquiries").insert({
      enquiry_type: enquiryType,
      name,
      company,
      email,
      managed_clients: managedClients,
      psa,
      message,
    });

    if (insertError) {
      console.error("[pricing/enquiry] Supabase insert failed:", insertError.message);
      return NextResponse.json(
        { ok: false, error: "We could not save your enquiry. Please try again." },
        { status: 500 },
      );
    }

    const resendKey = process.env.RESEND_API_KEY?.trim();
    if (!resendKey) {
      console.error("[pricing/enquiry] RESEND_API_KEY is not set; enquiry was saved.");
      return NextResponse.json({ ok: true, emailSent: false });
    }

    const resend = new Resend(resendKey);
    const label = enquiryType === "starter" ? "Starter Programme" : "Enterprise";
    const { error: emailError } = await resend.emails.send({
      from: buildHandoverResendFromHeader(null),
      to: TO,
      replyTo: email,
      subject: `${label} enquiry — ${name}, ${company}`,
      text: [
        `New ${label} enquiry`,
        "",
        `Name: ${name}`,
        `Company: ${company}`,
        `Work email: ${email}`,
        `Approximate managed clients: ${managedClients}`,
        `PSA: ${psa}`,
        "",
        message,
      ].join("\n"),
    });

    if (emailError) {
      console.error("[pricing/enquiry] Resend failed; enquiry was saved:", emailError);
      return NextResponse.json({ ok: true, emailSent: false });
    }

    return NextResponse.json({ ok: true, emailSent: true });
  } catch (error) {
    console.error("[pricing/enquiry] Unexpected error:", error);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
