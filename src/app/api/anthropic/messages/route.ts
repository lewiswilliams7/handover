import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

import { requireScanDetailsEntitlement } from "@/lib/scan-entitlement";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_MESSAGE =
  "You are a helpful assistant for MSP delivery managers. Write concise, professional responses. Keep outputs under 300 words unless the task specifically requires more.";

export async function POST(req: NextRequest) {
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

    const body = (await req.json()) as {
      max_tokens?: number;
      messages?: Array<{ role: string; content: string }>;
    };

    const cappedContent = String(
      body.messages?.find((m) => m.role === "user")?.content ?? "",
    ).slice(0, 8_000);

    if (!cappedContent) {
      return NextResponse.json(
        { error: "Missing messages" },
        { status: 400 },
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_MESSAGE },
        { role: "user", content: cappedContent },
      ],
      temperature: 0.3,
      max_tokens: body.max_tokens ?? 1000,
    });

    const text = completion.choices[0]?.message?.content ?? "{}";

    return NextResponse.json({
      content: [{ type: "text", text }],
    });
  } catch (e) {
    console.error("[anthropic/messages]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
