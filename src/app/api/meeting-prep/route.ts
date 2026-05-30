import OpenAI from "openai";
import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_PROMPT_CHARS = 12_000;

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { prompt?: unknown };
    try {
      body = (await req.json()) as { prompt?: unknown };
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) {
      return NextResponse.json({ error: "No prompt" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: "AI is not configured." }, { status: 503 });
    }

    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt.slice(0, MAX_PROMPT_CHARS) }],
      max_tokens: 600,
      temperature: 0.4,
    });

    const content = response.choices[0]?.message?.content?.trim() ?? "";
    if (!content) {
      return NextResponse.json({ error: "No content returned." }, { status: 502 });
    }

    return NextResponse.json({ content });
  } catch (e) {
    console.error("[meeting-prep]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to generate meeting brief." },
      { status: 500 },
    );
  }
}
