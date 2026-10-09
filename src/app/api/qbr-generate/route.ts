import { NextResponse } from "next/server";
import OpenAI from "openai";

import { getPlanTierServer, verifyUserPlan } from "@/lib/server/verifyUserPlan";
import { createServerClient } from "@/lib/supabase/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
      const planFields = await verifyUserPlan(user.id);
      if (getPlanTierServer(planFields) < 1) {
        return NextResponse.json({ error: "pro_required" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Could not verify subscription." }, { status: 500 });
    }

    const body = (await req.json()) as { input?: string; tone?: string };
    const cappedInput =
      typeof body.input === "string" ? body.input.trim().slice(0, 50_000) : "";
    if (!cappedInput) return NextResponse.json({ error: "No input provided" }, { status: 400 });

    const systemPrompt = `You are a senior MSP delivery consultant writing a Quarterly Business Review for a client.
Your output must be a single valid JSON object with exactly these fields:

{
  "summary": "3-5 sentence executive summary paragraph - strategic themes, not ticket lists",
  "exec_pull_quote": "Single sentence max 25 words - the single most important insight from this quarter for a director. Be specific, not generic.",
  "recommendation_items": [
    {
      "action": "Specific verb-led action referencing named projects or ticket patterns from the data",
      "owner": "Job title (e.g. Service Delivery Manager, Project Lead, Account Manager)",
      "target": "Date string - use actual dates from PSA data if available, otherwise stagger realistically: first item +14 days, second +30 days, third +45 days, fourth +60 days, fifth +75 days from today",
      "riskAddressed": "One sentence explaining the specific risk or issue this addresses, referencing the data"
    }
  ],
  "status_report": "5-8 bullet points as a single string separated by newlines"
}

Rules for recommendation_items:
- Output exactly 3-5 items
- Each action MUST reference specific named projects, ticket IDs, clients, or patterns from the data provided
- NEVER produce generic advice like "review processes" or "improve communication" - every item must be traceable to something in the data
- Target dates must be staggered - never the same date for multiple items
- If the data is sparse (fewer than 10 tickets), still reference the specific data that exists
- Owners should be role titles, not names (unless assignee names are in the data)

Rules for exec_pull_quote:
- Maximum 25 words
- Must name the most critical theme, not summarise everything
- Should create mild urgency or highlight a specific pattern
- Example good: "Three cloud migrations stalled on client sign-off while support volume held steady across the estate."
- Example bad: "This quarter saw a mix of project and support activity across the portfolio."

Tone: ${body.tone || "professional"}, client-facing, MSP context.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: cappedInput },
      ],
      max_tokens: 2000,
      temperature: 0.2,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      parsed = {};
    }

    return NextResponse.json({
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      exec_pull_quote: typeof parsed.exec_pull_quote === "string" ? parsed.exec_pull_quote : "",
      recommendation_items: Array.isArray(parsed.recommendation_items) ? parsed.recommendation_items : [],
      status_report: typeof parsed.status_report === "string" ? parsed.status_report : "",
    });
  } catch (err) {
    console.error("[qbr-generate]", err);
    return NextResponse.json({ error: "QBR generation failed" }, { status: 500 });
  }
}
