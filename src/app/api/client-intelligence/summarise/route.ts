import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

import {
  buildExactClientFilter,
  periodBoundEndIso,
  periodBoundStartIso,
  rowMatchesClient,
  shouldIncludeSummary,
} from "@/lib/server/ci-generation-filter";
import { resolveClientHealthForClient } from "@/lib/server/client-health-resolve";
import { requireScanDetailsEntitlement } from "@/lib/scan-entitlement";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET?.trim();
    const cronUserId = req.headers.get("x-user-id")?.trim() ?? "";

    let userId: string | null = null;
    if (cronSecret && authHeader === `Bearer ${cronSecret}` && cronUserId) {
      userId = cronUserId;
    } else {
      const supabase = await createServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const entitlementError = await requireScanDetailsEntitlement(
      userId,
      createServiceRoleClient(),
    );
    if (entitlementError) return entitlementError;

    const body = (await req.json()) as {
      clientName: string;
      periodFrom?: string;
      periodTo?: string;
      generationIds?: string[];
      forceRefresh?: boolean;
    };

    const { clientName, periodFrom, periodTo, forceRefresh } = body;

    if (!clientName) {
      return NextResponse.json({ error: "clientName required" }, { status: 400 });
    }

    const cachePeriodFrom = periodFrom?.includes("T")
      ? periodFrom.split("T")[0]
      : periodFrom;
    const cachePeriodTo = periodTo?.includes("T")
      ? periodTo.split("T")[0]
      : periodTo;

    // Check cache first
    const adminClient = createServiceRoleClient();

    const { data: cached } = await adminClient
      .from("client_intelligence_summaries")
      .select("summary_json, created_at")
      .eq("user_id", userId)
      .eq("client_name", clientName)
      .eq("summary_type", "summary")
      .eq("period_from", cachePeriodFrom ?? null)
      .eq("period_to", cachePeriodTo ?? null)
      .maybeSingle();

    const cachedData = cached as {
      summary_json: Record<string, unknown>;
      created_at: string;
    } | null;

    // Return cache if less than 24 hours old (unless force refresh)
    if (
      !forceRefresh &&
      cachedData?.summary_json
    ) {
      const age = Date.now() - new Date(cachedData.created_at).getTime();
      if (age < 24 * 60 * 60 * 1000) {
        const summaryJson = {
          ...cachedData.summary_json,
        };
        const resolvedHealth = await resolveClientHealthForClient(
          adminClient,
          userId,
          clientName,
        );
        summaryJson.relationship_health = resolvedHealth.relationship_health;
        summaryJson.health_justification = resolvedHealth.health_justification;
        return NextResponse.json({
          summary: summaryJson,
          cached: true,
        });
      }
    }

    // Fetch generations for this client
    let query = adminClient
      .from("generations")
      .select("id, output_json, created_at, report_type, source")
      .eq("user_id", userId)
      .or(buildExactClientFilter(clientName))
      .order("created_at", { ascending: false })
      .limit(50);

    if (periodFrom) {
      query = query.gte("created_at", periodBoundStartIso(periodFrom));
    }
    if (periodTo) {
      query = query.lte("created_at", periodBoundEndIso(periodTo));
    }

    const { data: rawData, error: genError } = await query;

    if (genError) throw genError;

    const genData = (rawData ?? []) as Array<{
      id: string;
      output_json: Record<string, unknown>;
      created_at: string;
      report_type: string;
      source: string | null;
    }>;

    if (!genData.length) {
      return NextResponse.json(
        {
          error: "No generations found for this client",
          empty: true,
        },
        { status: 200 },
      );
    }

    // Build context from generations
    const contextParts: string[] = [];

    for (const gen of genData) {
      const output = gen.output_json as Record<string, unknown>;
      const date = new Date(gen.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      const parts: string[] = [`--- ${date} ` + `(${gen.report_type}) ---`];

      const summaryText =
        typeof output?.summary === "string" ? output.summary : undefined;
      const clientEmailText =
        typeof output?.client_email === "string" ? output.client_email : undefined;

      if (shouldIncludeSummary(summaryText, clientEmailText, clientName)) {
        parts.push(`Summary: ${String(summaryText).slice(0, 500)}`);
      }

      const actions = output?.actions;
      if (Array.isArray(actions) && actions.length > 0) {
        const clientActions = actions
          .filter(
            (a): a is Record<string, unknown> =>
              typeof a === "object" && a !== null && rowMatchesClient(a, clientName),
          )
          .slice(0, 5);

        if (clientActions.length > 0) {
          parts.push(
            `Actions (${clientActions.length}): ` +
              clientActions
                .map((a) => {
                  if ("task" in a) {
                    return String(a.task ?? "").slice(0, 100);
                  }
                  return "";
                })
                .filter(Boolean)
                .join("; "),
          );
        }
      }

      const risks = output?.risks;
      if (Array.isArray(risks) && risks.length > 0) {
        const clientRisks = risks
          .filter(
            (r): r is Record<string, unknown> =>
              typeof r === "object" && r !== null && rowMatchesClient(r, clientName),
          )
          .slice(0, 3);

        if (clientRisks.length > 0) {
          parts.push(
            `Risks (${clientRisks.length}): ` +
              clientRisks
                .map((r) => {
                  const text =
                    typeof r.risk === "string"
                      ? r.risk
                      : typeof r.title === "string"
                        ? r.title
                        : "";
                  return text.slice(0, 80);
                })
                .filter(Boolean)
                .join("; "),
          );
        }
      }

      if (parts.length > 1) {
        contextParts.push(parts.join("\n"));
      }
    }

    if (!contextParts.length) {
      return NextResponse.json(
        {
          error: "No client-specific content found for this period",
          empty: true,
        },
        { status: 200 },
      );
    }

    const historicalContext = contextParts.join("\n\n");

    const periodLabel =
      cachePeriodFrom && cachePeriodTo
        ? `${cachePeriodFrom} to ${cachePeriodTo}`
        : `the last ${genData.length} reports`;

    // Generate intelligence summary
    const prompt = `
##########  HANDOVER CLIENT 
INTELLIGENCE  ##########

You are a senior account manager 
reviewing accumulated delivery 
history for ${clientName} over 
${periodLabel}.

Generate a client intelligence 
briefing as JSON matching this 
schema exactly:

{
  "account_narrative": string,
  "recurring_issues": string[],
  "key_achievements": string[],
  "open_risks": string[],
  "relationship_health": 
    "green" | "amber" | "red",
  "health_justification": string,
  "recommended_actions": string[],
  "qbr_talking_points": string[]
}

RULES:
account_narrative: 3-4 sentences. 
  Lead with most significant thing. 
  Honest about problems. Reads like 
  a senior AM briefing a colleague. 
  Never generic.

recurring_issues: Issues appearing 
  more than once. Specific. 
  Max 5. Empty array if none.

key_achievements: Completed work 
  demonstrating value. Specific. 
  Max 5.

open_risks: ALL unresolved risks 
  and concerning patterns from 
  the reporting period. Return 
  every risk found. No maximum 
  limit. If the data contains 
  5 risks return all 5. If it 
  contains 8 return all 8.
  Minimum 1 if any risk exists.

relationship_health:
  green: Delivery is consistent,
    most actions are being resolved
    week to week, no recurring
    unresolved risks, and client
    communication is regular.
    The account is well-managed.
    Use green freely when the data
    supports it — do not default
    to amber.
  amber: There are some delivery
    delays, recurring issues that
    have not been resolved across
    multiple reports, or gaps in
    communication. Something needs
    attention but the relationship
    is not at serious risk.
  red: Significant delivery failures,
    multiple high-priority unresolved
    risks, escalations present, or
    a clear pattern of deteriorating
    service. The relationship may
    be at risk.
  IMPORTANT: Do not default to amber.
    If the account is well-managed
    and issues are being resolved,
    use green. Amber should mean
    something specific is wrong,
    not just that work is in progress.

health_justification: One sentence
  explaining the RAG rating.

recommended_actions: Specific 
  things to do before next client 
  interaction. Max 3. Start with 
  a verb. Time-bound where possible.

qbr_talking_points: 3-5 points 
  for a quarterly review. Talking 
  points not report language. 
  Include both positives and 
  honest challenges.

CRITICAL: You are generating 
a service review ONLY for 
${clientName}. If the historical 
data below contains references 
to other client organisations, 
ignore them entirely. Never 
mention any organisation by 
name other than ${clientName} 
in your output. If you are 
uncertain whether content 
relates to ${clientName}, 
exclude it.

HISTORICAL DATA:
${historicalContext}

Return only valid JSON. 
No markdown, no preamble.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: {
        type: "json_object",
      },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";

    const summaryJson = JSON.parse(raw) as Record<string, unknown>;

    const aiHealthJustification =
      typeof summaryJson.health_justification === "string"
        ? summaryJson.health_justification
        : undefined;

    const resolvedHealth = await resolveClientHealthForClient(
      adminClient,
      userId,
      clientName,
      { narrativeSuffix: aiHealthJustification },
    );

    summaryJson.relationship_health = resolvedHealth.relationship_health;
    summaryJson.health_justification = resolvedHealth.health_justification;

    // Cache the result
    const { error: upsertError } = await adminClient
      .from("client_intelligence_summaries")
      .upsert(
        {
          user_id: userId,
          client_name: clientName,
          summary_type: "summary",
          period_from: cachePeriodFrom ?? null,
          period_to: cachePeriodTo ?? null,
          summary_json: summaryJson,
          generation_ids: genData.map((g) => g.id),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict:
            "user_id,client_name,summary_type,period_from,period_to,qbr_months",
        },
      );

    if (upsertError) {
      console.error("[ci/summarise] upsert failed", {
        user_id: userId,
        client_name: clientName,
        error: upsertError.message,
      });
      return NextResponse.json({
        summary: summaryJson,
        cached: false,
        generationCount: genData.length,
        _persistFailed: true,
      });
    }

    return NextResponse.json({
      summary: summaryJson,
      cached: false,
      generationCount: genData.length,
    });
  } catch (e) {
    console.error("[ci/summarise]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
