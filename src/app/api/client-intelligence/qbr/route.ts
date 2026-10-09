import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

import {
  buildExactClientFilter,
  shouldIncludeSummary,
} from "@/lib/server/ci-generation-filter";
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
      months?: number;
    };

    const { clientName, months = 3 } = body;

    if (!clientName) {
      return NextResponse.json({ error: "clientName required" }, { status: 400 });
    }

    const adminClient = createServiceRoleClient();

    const QBR_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

    const { data: cachedQbrRaw } = await adminClient
      .from("client_intelligence_summaries")
      .select("summary_json, updated_at")
      .eq("user_id", userId)
      .eq("client_name", clientName)
      .eq("summary_type", "qbr")
      .eq("qbr_months", months)
      .maybeSingle();

    const cachedQbr = cachedQbrRaw as {
      summary_json: Record<string, unknown> | null;
      updated_at: string;
    } | null;

    if (cachedQbr?.summary_json) {
      const age = Date.now() - new Date(cachedQbr.updated_at).getTime();
      if (age < QBR_CACHE_TTL_MS) {
        return NextResponse.json({
          qbr: cachedQbr.summary_json,
          cached: true,
        });
      }
    }

    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - months);

    const { data: generationsRaw } = await adminClient
      .from("generations")
      .select("id, output_json, created_at, report_type")
      .eq("user_id", userId)
      .or(buildExactClientFilter(clientName))
      .gte("created_at", fromDate.toISOString())
      .order("created_at", { ascending: false })
      .limit(50);

    const generations = (generationsRaw ?? []) as Array<{
      id: string;
      output_json: Record<string, unknown> | null;
      created_at: string;
      report_type: string | null;
    }>;

    if (!generations.length) {
      return NextResponse.json(
        {
          error: "No reports found for this client in the selected period",
        },
        { status: 404 },
      );
    }

    const { data: cachedSummaryRaw } = await adminClient
      .from("client_intelligence_summaries")
      .select("summary_json")
      .eq("user_id", userId)
      .eq("client_name", clientName)
      .eq("summary_type", "summary")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const cachedSummary = cachedSummaryRaw as {
      summary_json: Record<string, unknown> | null;
    } | null;

    const summaryJson = cachedSummary?.summary_json ?? null;

    const contextParts: string[] = [];

    for (const gen of generations) {
      const output = gen.output_json as Record<string, unknown>;
      const date = new Date(gen.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      const parts = [`--- ${date} ---`];

      const summaryText =
        typeof output?.summary === "string" ? output.summary : undefined;
      const clientEmailText =
        typeof output?.client_email === "string" ? output.client_email : undefined;

      if (shouldIncludeSummary(summaryText, clientEmailText, clientName)) {
        parts.push(`Summary: ${String(summaryText).slice(0, 400)}`);
      }
      // Do not include individual ticket actions or risks — QBR is executive level only.
      // Patterns are derived from summaries not individual items.

      contextParts.push(parts.join("\n"));
    }

    const periodFrom = fromDate.toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });
    const periodTo = new Date().toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });
    const periodLabel = `${periodFrom} to ${periodTo}`;

    const ciContext = summaryJson
      ? `
EXISTING ACCOUNT INTELLIGENCE:
Health: ${summaryJson.relationship_health ?? "unknown"}
Narrative: ${String(summaryJson.account_narrative ?? "").slice(0, 400)}
Recurring issues: ${
          Array.isArray(summaryJson.recurring_issues)
            ? (summaryJson.recurring_issues as string[]).join("; ")
            : "none"
        }
Open risks: ${
          Array.isArray(summaryJson.open_risks)
            ? (summaryJson.open_risks as string[]).join("; ")
            : "none"
        }
Key achievements: ${
          Array.isArray(summaryJson.key_achievements)
            ? (summaryJson.key_achievements as string[]).join("; ")
            : "none"
        }
`
      : "";

    const prompt = `
You are preparing a Quarterly Business Review for ${clientName} covering ${periodLabel}.

This is a strategic review document for an MSP presenting to their client's leadership team. It should be honest, specific, and forward-looking.

AUDIENCE: This QBR is presented to the client's senior leadership — MD, IT Director, CFO. Every sentence must be appropriate for that audience.
Never include: ticket numbers, engineer names, support queue details, or operational minutiae.
Focus on: business outcomes, relationship health, strategic direction, and investment priorities.

${ciContext}

CRITICAL: This QBR is for 
${clientName} ONLY. If any 
historical data below references 
other client organisations, 
ignore those references entirely. 
Never mention any organisation 
by name other than ${clientName}.

REPORT HISTORY (${generations.length} reports):
${contextParts.join("\n\n")}

Generate a QBR as JSON:
{
  "executiveSummary": string,
  "relationshipHealth": "green" | "amber" | "red",
  "keyAchievements": string[],
  "recurringIssues": string[],
  "openRisks": string[],
  "resolvedRisks": string[],
  "recommendedActions": string[],
  "qbrTalkingPoints": string[],
  "strategicPriorities": string[]
}

RULES:
executiveSummary: 3-4 sentences. Board-level language. Leads with most significant delivery outcome. Honest about challenges. Never generic.

relationshipHealth: Based on delivery consistency, risk levels, and overall trajectory.

keyAchievements: High-level business outcomes and strategic deliverables completed this period. Written for a client executive not a technical team. Max 5. Never reference individual ticket numbers or support request details.

recurringIssues: Strategic patterns and themes observed across the period — written at board level. "Microsoft 365 stability issues across multiple users" not "Ticket #4521 - Outlook crash". Max 4.

openRisks: Business and relationship risks only. Strategic level. Never operational ticket detail. Max 4.

resolvedRisks: Risks that were raised and resolved. Max 3.

recommendedActions: Strategic recommendations for next quarter. Written for a client MD or IT director. Investment and direction decisions, not support tasks. Max 4.

qbrTalkingPoints: 4-5 points for the meeting agenda. Written as talking points not report language.

strategicPriorities: What should the client prioritise investing in next quarter based on this period's patterns. Board-ready language. Max 3.

CRITICAL: Base everything on the actual report data. No generic filler. Every item must reference something real from the history.

Return only valid JSON.
No markdown, no preamble.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";

    const qbrData = JSON.parse(raw) as Record<string, unknown>;

    const qbrPayload = {
      ...qbrData,
      clientName,
      periodLabel,
      generatedAt: new Date().toISOString(),
    };

    await adminClient.from("client_intelligence_summaries").upsert(
      {
        user_id: userId,
        client_name: clientName,
        summary_type: "qbr",
        qbr_months: months,
        period_from: null,
        period_to: null,
        summary_json: qbrPayload,
        generation_ids: generations.map((g) => g.id),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,client_name,summary_type,period_from,period_to,qbr_months",
      },
    );

    return NextResponse.json({
      qbr: qbrPayload,
      cached: false,
    });
  } catch (e) {
    console.error("[ci/qbr]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
