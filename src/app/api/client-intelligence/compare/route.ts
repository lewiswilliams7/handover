import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

import {
  buildExactClientFilter,
  rowMatchesClient,
  shouldIncludeSummary,
} from "@/lib/server/ci-generation-filter";
import { requireScanDetailsEntitlement } from "@/lib/scan-entitlement";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type GenerationRow = {
  id: string;
  output_json: Record<string, unknown>;
  created_at: string;
  report_type: string;
  compare_cache: Record<string, unknown> | null;
};

type CompareCacheEntry = {
  comparison: Record<string, unknown>;
  previousDate: string;
  currentDate: string;
};

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
      currentGenerationId: string;
      clientName: string;
      checkOnly?: boolean;
    };

    const { currentGenerationId, clientName } = body;

    if (!currentGenerationId || !clientName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const adminClient = createServiceRoleClient();

    const { data: currentRaw } = await adminClient
      .from("generations")
      .select("id, output_json, created_at, report_type, compare_cache")
      .eq("id", currentGenerationId)
      .eq("user_id", user.id)
      .maybeSingle();

    const current = currentRaw as GenerationRow | null;

    if (!current) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 });
    }

    const { data: previousRaw } = await adminClient
      .from("generations")
      .select("id, output_json, created_at, report_type")
      .eq("user_id", user.id)
      .or(buildExactClientFilter(clientName))
      .lt("created_at", current.created_at)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const previousGen = previousRaw as GenerationRow | null;

    if (!previousGen) {
      return NextResponse.json(
        {
          comparison: null,
          noPrevious: true,
        },
        { status: 200 },
      );
    }

    if (body.checkOnly) {
      return NextResponse.json({
        noPrevious: false,
        previousId: previousGen.id,
      });
    }

    const existingCache = current.compare_cache ?? {};
    const cachedEntry = existingCache[previousGen.id] as CompareCacheEntry | undefined;
    if (cachedEntry?.comparison && typeof cachedEntry.comparison === "object") {
      return NextResponse.json({
        comparison: cachedEntry.comparison,
        previousDate: cachedEntry.previousDate,
        currentDate: cachedEntry.currentDate,
        previousId: previousGen.id,
        cached: true,
      });
    }

    const currentOutput = current.output_json;
    const previousOutput = previousGen.output_json;

    const currentDate = new Date(current.created_at).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const previousDate = new Date(previousGen.created_at).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const filteredCurrentActions = Array.isArray(currentOutput.actions)
      ? (currentOutput.actions as Record<string, unknown>[]).filter((a) =>
          rowMatchesClient(a, clientName),
        )
      : [];

    const filteredPreviousActions = Array.isArray(previousOutput.actions)
      ? (previousOutput.actions as Record<string, unknown>[]).filter((a) =>
          rowMatchesClient(a, clientName),
        )
      : [];

    const filteredCurrentRisks = Array.isArray(currentOutput.risks)
      ? (currentOutput.risks as Record<string, unknown>[]).filter((r) =>
          rowMatchesClient(r, clientName),
        )
      : [];

    const filteredPreviousRisks = Array.isArray(previousOutput.risks)
      ? (previousOutput.risks as Record<string, unknown>[]).filter((r) =>
          rowMatchesClient(r, clientName),
        )
      : [];

    const currentActions = filteredCurrentActions.map((a) =>
      String(a.task ?? ""),
    );

    const previousActions = filteredPreviousActions.map((a) =>
      String(a.task ?? ""),
    );

    const formatRiskTitles = (risks: Record<string, unknown>[]): string =>
      risks
        .map((r) => String(r.title ?? r.risk ?? ""))
        .filter(Boolean)
        .join(", ") || "none recorded";

    const previousRiskTitles = formatRiskTitles(filteredPreviousRisks);
    const currentRiskTitles = formatRiskTitles(filteredCurrentRisks);

    const previousSummaryText =
      typeof previousOutput.summary === "string"
        ? previousOutput.summary
        : undefined;
    const previousClientEmail =
      typeof previousOutput.client_email === "string"
        ? previousOutput.client_email
        : undefined;
    const currentSummaryText =
      typeof currentOutput.summary === "string"
        ? currentOutput.summary
        : undefined;
    const currentClientEmail =
      typeof currentOutput.client_email === "string"
        ? currentOutput.client_email
        : undefined;

    const previousSummaryBlock = shouldIncludeSummary(
      previousSummaryText,
      previousClientEmail,
      clientName,
    )
      ? `Summary: ${String(previousSummaryText).slice(0, 400)}`
      : "";

    const currentSummaryBlock = shouldIncludeSummary(
      currentSummaryText,
      currentClientEmail,
      clientName,
    )
      ? `Summary: ${String(currentSummaryText).slice(0, 400)}`
      : "";

    const prompt = `
Comparing generation ${current.id} (current, ${currentDate}) against ${previousGen.id} (previous, ${previousDate}).

You are a senior MSP account manager 
comparing two delivery reports for 
${clientName}.

PREVIOUS REPORT (${previousDate}):
${previousSummaryBlock}

Actions (${previousActions.length}):
${previousActions
  .slice(0, 8)
  .map((a, i) => `${i + 1}. ${a}`)
  .join("\n")}

Previous risks:
${previousRiskTitles}

CURRENT REPORT (${currentDate}):
${currentSummaryBlock}

Actions (${currentActions.length}):
${currentActions
  .slice(0, 8)
  .map((a, i) => `${i + 1}. ${a}`)
  .join("\n")}

Current risks:
${currentRiskTitles}

Generate a comparison as JSON:
{
  "what_changed": string,
  "resolved": string[],
  "new_items": string[],
  "still_open": string[],
  "trend": "improving" | "stable" | "worsening",
  "trend_justification": string
}

RULES:
what_changed: 2-3 sentences. Lead 
  with the most significant change. 
  Specific — name actual tickets 
  and projects. Written for a PM 
  reviewing their own accounts. 
  Never generic. NEVER write 
  "unspecified" — if a risk or 
  action has no title, describe it 
  from its impact or mitigation 
  field instead. Always name things 
  specifically.

RESOLVED: An item is resolved only 
  if it appears clearly in the 
  previous report's actions or risks 
  AND is completely absent from the 
  current report. Do not infer 
  resolution — only mark as resolved 
  if the specific task or risk 
  description is present in previous 
  and absent in current. Max 4.

NEW: An item is new only if it 
  appears in the current report's 
  actions or risks AND has no 
  equivalent in the previous report. 
  Do not mark minor wording variants 
  as new — if the underlying task is 
  the same it is STILL_OPEN not NEW. 
  Max 4.

STILL_OPEN: Any item that appears 
  in both reports, even with slightly 
  different wording. When in doubt 
  classify as still_open rather than 
  resolved or new. Max 3.

CRITICAL: Base your comparison only 
  on the exact data provided. Do not 
  infer, assume, or add context not 
  present in the reports. Return only 
  what the data shows.

trend: Overall direction based on 
  comparing risk count, action count, 
  and summary sentiment.

trend_justification: One sentence 
  explaining the trend rating.

Return only valid JSON.
No markdown, no preamble.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 1000,
      response_format: {
        type: "json_object",
      },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";

    const comparison = JSON.parse(raw) as Record<string, unknown>;

    const cachePayload: CompareCacheEntry = {
      comparison,
      previousDate,
      currentDate,
    };

    const updatedCache = {
      ...existingCache,
      [previousGen.id]: cachePayload,
    };

    await adminClient
      .from("generations")
      .update({ compare_cache: updatedCache })
      .eq("id", currentGenerationId)
      .eq("user_id", user.id);

    return NextResponse.json({
      comparison,
      previousDate,
      currentDate,
      previousId: previousGen.id,
      cached: false,
    });
  } catch (e) {
    console.error("[ci/compare]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
