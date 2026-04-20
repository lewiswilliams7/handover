import { NextResponse } from "next/server";
import { Resend } from "resend";

import { buildHandoverResendFromHeader } from "@/lib/resend-from-header";

export const runtime = "nodejs";

const TO = "hello@gethandover.uk";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    console.error("[contact/sales] RESEND_API_KEY is not set");
    return null;
  }
  return new Resend(key);
}

const HELP_OPTIONS = new Set([
  "I want to discuss Enterprise pricing",
  "I need a custom integration",
  "I want to onboard my whole team",
  "I have a question about the product",
  "Something else",
]);

/** Optional "Plan you're interested in"  -  empty string = not specified. */
const PLAN_INTEREST_VALUES = new Set(["", "pro", "team", "enterprise", "partner", "unsure"]);
const TEAM_SIZE_VALUES = new Set(["1-5", "6-15", "16-30", "30-50", "50+"]);
const PSA_VALUES = new Set(["HaloPSA", "ConnectWise", "Autotask", "Other"]);

const JOB_TITLE_VALUES = new Set([
  "C-Suite / Director",
  "VP / Head of",
  "Manager",
  "Team Lead",
  "Engineer / Consultant",
  "Other",
]);

function needsPsaOnly(planInterest: string): boolean {
  return planInterest === "enterprise" || planInterest === "partner";
}

function buildSalesSubject(
  planInterest: string,
  firstName: string,
  lastName: string,
  companyName: string,
): string {
  const who = `${firstName} ${lastName}`.trim();
  const tail = `${who}, ${companyName}`;
  switch (planInterest) {
    case "enterprise":
      return `Enterprise Enquiry  -  ${tail}`;
    case "partner":
      return `Partnership Enquiry  -  ${tail}`;
    case "pro":
      return `Pro Enquiry  -  ${tail}`;
    case "team":
      return `Team Enquiry  -  ${tail}`;
    case "unsure":
      return `Sales Enquiry (plan TBC)  -  ${tail}`;
    default:
      return `Sales Enquiry  -  ${tail}`;
  }
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    const firstName = str(body.firstName);
    const lastName = str(body.lastName);
    const email = str(body.email);
    const phone = str(body.phone);
    const jobTitle = str(body.jobTitle);
    const companyName = str(body.companyName);
    const howCanWeHelp = str(body.howCanWeHelp);
    const additionalNotes = str(body.additionalNotes);
    const planInterest = str(body.planInterest);
    const teamSize = str(body.teamSize);
    const psa = str(body.psa);

    if (!PLAN_INTEREST_VALUES.has(planInterest)) {
      return NextResponse.json(
        { ok: false, error: "Please select a valid plan option, or leave it unset." },
        { status: 400 },
      );
    }
    if (!teamSize || !TEAM_SIZE_VALUES.has(teamSize)) {
      return NextResponse.json(
        { ok: false, error: "Please select your team size." },
        { status: 400 },
      );
    }
    if (needsPsaOnly(planInterest)) {
      if (!psa || !PSA_VALUES.has(psa)) {
        return NextResponse.json(
          { ok: false, error: "Please select the PSA you use." },
          { status: 400 },
        );
      }
    }

    if (!firstName || !lastName) {
      return NextResponse.json(
        { ok: false, error: "First name and last name are required." },
        { status: 400 },
      );
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { ok: false, error: "A valid work email address is required." },
        { status: 400 },
      );
    }
    if (jobTitle && !JOB_TITLE_VALUES.has(jobTitle)) {
      return NextResponse.json(
        { ok: false, error: "Please select a valid job title, or leave it unset." },
        { status: 400 },
      );
    }
    if (!companyName) {
      return NextResponse.json(
        { ok: false, error: "Company name is required." },
        { status: 400 },
      );
    }
    if (!howCanWeHelp || !HELP_OPTIONS.has(howCanWeHelp)) {
      return NextResponse.json(
        { ok: false, error: "Please select how our sales team can help." },
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

    const planLabel =
      planInterest === "pro"
        ? "Pro"
        : planInterest === "team"
          ? "Team"
          : planInterest === "enterprise"
            ? "Enterprise"
            : planInterest === "partner"
              ? "Partnership/Reseller"
              : planInterest === "unsure"
                ? "Not sure yet"
                : "(not specified)";

    const lines = [
      "New sales enquiry",
      "",
      `Name: ${firstName} ${lastName}`,
      `Work email: ${email}`,
      phone ? `Phone: ${phone}` : "Phone: (not provided)",
      jobTitle ? `Job title / role: ${jobTitle}` : "Job title / role: (not provided)",
      `Company: ${companyName}`,
      `Team size: ${teamSize}`,
      `Plan you're interested in: ${planLabel}`,
      ...(needsPsaOnly(planInterest) ? [`PSA: ${psa}`] : []),
      `How can our sales team help?: ${howCanWeHelp}`,
      "",
      additionalNotes
        ? `Additional notes:\n${additionalNotes}`
        : "Additional notes: (none)",
    ];

    const text = lines.join("\n");

    const { error } = await resend.emails.send({
      from: buildHandoverResendFromHeader(null),
      to: TO,
      replyTo: email,
      subject: buildSalesSubject(planInterest, firstName, lastName, companyName),
      text,
    });

    if (error) {
      console.error("[contact/sales] Resend error:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to send your enquiry. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[contact/sales]", e);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
