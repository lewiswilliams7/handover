import OpenAI from "openai";
import { NextResponse } from "next/server";

import { GLOBAL_GENERATION_VOICE_AND_PUNCTUATION } from "@/lib/generation-global-style-rules";
import { createServerClient } from "@/lib/supabase/server";
import {
  parseSmartActionType,
  smartActionDisplayTitle,
  type SmartActionSuggestion,
} from "@/lib/smart-actions";

export const runtime = "nodejs";

const SYSTEM = `You are a delivery assistant for an MSP project manager. Based on the generated report below, suggest 3-5 specific, actionable next steps the PM should take right now. Each suggestion must be specific to the actual content — use real names, ticket titles, and actions from the report. Do not suggest generic steps.

Each object must have:
- "action": a SHORT imperative phrase for the UI (maximum 6 words), e.g. "Push update to HaloPSA", "Email Andy about firewall change", "Schedule weekly client report". NEVER put the type enum or snake_case here — do not use "email", "push_to_halo", "schedule", "slack", or "manual" as the action text.
- "description": exactly one clear sentence explaining what to do and why (muted helper text in the UI).
- "type": one of: email, push_to_halo, schedule, slack, manual (machine-only; never repeat this string in "action").

${GLOBAL_GENERATION_VOICE_AND_PUNCTUATION}

Return ONLY valid JSON (no markdown, no code fences) with this exact shape:
{"suggestions":[...array of those objects...]}`;

const MAX_CONTEXT = 28_000;

function coerceSuggestion(entry: unknown): SmartActionSuggestion | null {
  if (!entry || typeof entry !== "object") return null;
  const o = entry as Record<string, unknown>;
  let action = typeof o.action === "string" ? o.action.trim() : "";
  const description = typeof o.description === "string" ? o.description.trim() : "";
  if (!description) return null;
  const type = parseSmartActionType(o.type);
  action = smartActionDisplayTitle({ action, description });
  if (!action) return null;
  return { action: action.slice(0, 200), description: description.slice(0, 500), type };
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { reportContext?: unknown };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const reportContext =
      typeof body.reportContext === "string" ? body.reportContext.trim() : "";
    if (reportContext.length < 80) {
      return NextResponse.json({ error: "reportContext is required." }, { status: 400 });
    }

    const clipped = reportContext.slice(0, MAX_CONTEXT);
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: "AI is not configured." }, { status: 503 });
    }

    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Generated report:\n\n${clipped}` },
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
    const arr = root && Array.isArray(root.suggestions) ? root.suggestions : null;
    if (!arr) {
      return NextResponse.json({ error: "Invalid suggestions shape." }, { status: 502 });
    }

    const suggestions: SmartActionSuggestion[] = [];
    for (const item of arr) {
      const s = coerceSuggestion(item);
      if (s) suggestions.push(s);
    }

    if (suggestions.length === 0) {
      return NextResponse.json({ error: "No suggestions returned." }, { status: 502 });
    }

    return NextResponse.json({ suggestions });
  } catch (e) {
    console.error("[smart-actions-suggestions]", e);
    return NextResponse.json({ error: "Failed to generate suggestions." }, { status: 500 });
  }
}
