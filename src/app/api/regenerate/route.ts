import OpenAI from "openai";
import { NextResponse } from "next/server";

import { GLOBAL_GENERATION_VOICE_AND_PUNCTUATION } from "@/lib/generation-global-style-rules";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      original_output?: string;
      output_type?: string;
      instruction?: string;
      tone?: string;
      context?: string;
    };

    const originalOutput = body?.original_output?.trim();
    const outputType = body?.output_type?.trim();
    const instruction = body?.instruction?.trim();
    const tone = body?.tone?.trim() || "professional";
    const context = body?.context?.trim() || "";

    if (!originalOutput || !outputType || !instruction) {
      return NextResponse.json(
        { error: "original_output, output_type, and instruction are required." },
        { status: 400 },
      );
    }

    const prompt = `${GLOBAL_GENERATION_VOICE_AND_PUNCTUATION}

You are a Senior SDM at a UK MSP. The user has
generated the following ${outputType} from their
project notes. They want to tweak it with this
instruction: ${instruction}. Rewrite only the
${outputType} following the instruction. Keep the
same factual content unless the instruction says
otherwise. Apply ${tone} tone. Return only the
rewritten text, no JSON wrapper, no explanation.`;

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        { role: "system", content: prompt },
        {
          role: "user",
          content: `Original project context:\n${context}\n\nOriginal output:\n${originalOutput}`,
        },
      ],
    });

    const result = response.choices[0]?.message?.content?.trim();
    if (!result) {
      throw new Error("Empty regeneration response.");
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Regenerate error:", error);
    return NextResponse.json({ error: "Failed to regenerate output." }, { status: 500 });
  }
}
