import OpenAI from "openai";
import { NextResponse } from "next/server";

import { GLOBAL_GENERATION_VOICE_AND_PUNCTUATION } from "@/lib/generation-global-style-rules";
import { requireScanDetailsEntitlement } from "@/lib/scan-entitlement";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SYSTEM = `You write a short, professional email body for an MSP project manager following up on ONE specific action item.

Rules:
- Plain text only, no subject line in the body.
- 3-6 short paragraphs or a compact block; total under 900 characters unless the context demands slightly more.
- Professional, warm, concise. UK spelling where it differs.
- Do not invent ticket numbers or client names not implied by the context.
- If the context is internal-only, write as an internal note-style email to a colleague (still professional).

${GLOBAL_GENERATION_VOICE_AND_PUNCTUATION}

Return ONLY valid JSON: {"body":"...email text..."}`;

const MAX_IN = 18_000;

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const entitlementError = await requireScanDetailsEntitlement(user.id, supabase);
    if (entitlementError) return entitlementError;

    let body: {
      actionTitle?: unknown;
      description?: unknown;
      context?: unknown;
      summary?: unknown;
    };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const description =
      typeof body.description === "string" ? body.description.trim().slice(0, 2000) : "";
    const actionTitle =
      typeof body.actionTitle === "string" ? body.actionTitle.trim().slice(0, 200) : "";
    const context = typeof body.context === "string" ? body.context.trim().slice(0, MAX_IN) : "";
    const summary = typeof body.summary === "string" ? body.summary.trim().slice(0, 6000) : "";

    if (description.length < 8 && actionTitle.length < 8) {
      return NextResponse.json({ error: "Action context is required." }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: "AI is not configured." }, { status: 503 });
    }

    const userContent = [
      `Action to address: ${actionTitle || "(see description)"}`,
      "",
      "Description:",
      description || "-",
      "",
      "Report summary (excerpt):",
      summary || "-",
      "",
      "Source / ticket notes (excerpt):",
      context || "-",
    ].join("\n");

    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 1000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userContent },
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim();
    if (!raw) {
      return NextResponse.json({ error: "Empty model response." }, { status: 502 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      return NextResponse.json({ error: "Model returned invalid JSON." }, { status: 502 });
    }

    const root = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    const bodyText = typeof root?.body === "string" ? root.body.trim() : "";
    if (bodyText.length < 20) {
      return NextResponse.json({ error: "Email body too short." }, { status: 502 });
    }

    return NextResponse.json({ body: bodyText.slice(0, 12_000) });
  } catch (e) {
    console.error("[smart-action-email]", e);
    return NextResponse.json({ error: "Failed to generate email." }, { status: 500 });
  }
}
