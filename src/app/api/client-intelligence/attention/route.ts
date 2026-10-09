import { NextResponse } from "next/server";
import OpenAI from "openai";

import {
  aggregateGenerationsByClient,
  buildSummaryHealthMap,
  resolveHealthFromAggregate,
  type GenerationHealthRow,
  type SummaryHealthRow,
} from "@/lib/server/client-health-resolve";
import { requireScanDetailsEntitlement } from "@/lib/scan-entitlement";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const HEALTH_RANK: Record<string, number> = { red: 0, amber: 1, green: 2 };

function buildSummaryPromptMap(
  summaries: SummaryHealthRow[],
): Map<string, { narrative: string | null; openRisks: string[] }> {
  const sorted = [...summaries]
    .filter((s) => (s.summary_type ?? "summary") === "summary")
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );

  const map = new Map<string, { narrative: string | null; openRisks: string[] }>();

  for (const s of sorted) {
    if (map.has(s.client_name)) continue;

    const sj = s.summary_json;
    map.set(s.client_name, {
      narrative: (sj?.account_narrative as string | null) ?? null,
      openRisks: Array.isArray(sj?.open_risks)
        ? (sj.open_risks as string[])
        : [],
    });
  }

  return map;
}

export async function POST() {
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

    const adminClient = createServiceRoleClient();

    const { data: generationsRaw } = await adminClient
      .from("generations")
      .select(
        "id, project_name, client_name_extracted, created_at, source, report_type, output_json",
      )
      .eq("user_id", user.id)
      .not("project_name", "is", null)
      .neq("project_name", "")
      .order("created_at", { ascending: false })
      .limit(200);

    const generations = (generationsRaw ?? []) as GenerationHealthRow[];
    const clientMap = aggregateGenerationsByClient(generations);

    const { data: summariesRaw } = await adminClient
      .from("client_intelligence_summaries")
      .select("client_name, summary_json, updated_at, summary_type")
      .eq("user_id", user.id)
      .eq("summary_type", "summary");

    const summaries = (summariesRaw ?? []) as SummaryHealthRow[];
    const summaryMap = buildSummaryHealthMap(summaries);
    const summaryPromptMap = buildSummaryPromptMap(summaries);

    const clients = Array.from(clientMap.values()).map((c) => {
      const existingSummary = summaryMap.get(c.name);
      const { relationship_health: health } = resolveHealthFromAggregate(
        c,
        existingSummary,
      );

      const recentRiskCount = Array.isArray(c.latestOutputJson?.risks)
        ? (c.latestOutputJson.risks as unknown[]).length
        : 0;

      const recentActionCount = Array.isArray(c.latestOutputJson?.actions)
        ? (c.latestOutputJson.actions as unknown[]).length
        : 0;

      const daysSinceLastReport = Math.floor(
        (Date.now() - new Date(c.lastGeneratedAt).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      const trend =
        c.previousGenerationCount === 0
          ? "stable"
          : c.recentGenerationCount > c.previousGenerationCount * 1.2
            ? "up"
            : c.recentGenerationCount < c.previousGenerationCount * 0.8
              ? "down"
              : "stable";

      const promptSummary = summaryPromptMap.get(c.name);

      return {
        name: c.name,
        health,
        daysSinceLastReport,
        recentRiskCount,
        recentActionCount,
        hasScheduled: c.sources.has("scheduled"),
        hasSummary: summaryMap.has(c.name),
        generationCount: c.generationCount,
        trend,
        summaryNarrative: promptSummary?.narrative ?? null,
        openRisks: promptSummary?.openRisks ?? [],
      };
    });

    if (clients.length === 0) {
      return NextResponse.json({
        answer:
          "You don't have any client history yet. Generate your first report to start building client intelligence.",
        items: [],
      });
    }

    // Capped at 20 clients; attention is a triage tool not an exhaustive audit
    const topClients = [...clients]
      .sort((a, b) => {
        const healthDiff =
          (HEALTH_RANK[a.health] ?? 3) - (HEALTH_RANK[b.health] ?? 3);
        if (healthDiff !== 0) return healthDiff;
        if (b.recentRiskCount !== a.recentRiskCount) {
          return b.recentRiskCount - a.recentRiskCount;
        }
        return b.daysSinceLastReport - a.daysSinceLastReport;
      })
      .slice(0, 20);

    const clientContext = topClients
      .map(
        (c) => `${c.name}:
  Health: ${c.health}
  Days since last report: ${c.daysSinceLastReport}
  Recent risks: ${c.recentRiskCount}
  Trend: ${c.trend}
  Automated: ${c.hasScheduled ? "yes" : "no"}
  Has intel: ${c.hasSummary ? "yes" : "no"}${
          c.summaryNarrative
            ? `\n  Context: ${c.summaryNarrative.slice(0, 200)}`
            : ""
        }${
          c.openRisks.length > 0
            ? `\n  Open risks: ${c.openRisks.slice(0, 2).join("; ")}`
            : ""
        }`,
      )
      .join("\n\n");

    const prompt = `
You are an AI service delivery manager for an MSP. Based on the client data below, identify what needs attention right now.

Return JSON:
{
  "summary": string,
  "items": [
    {
      "clientName": string,
      "priority": "high" | "medium" | "low",
      "issue": string,
      "action": string,
      "type": "overdue" | "risk" | "trend" | "qbr" | "intel"
    }
  ]
}

RULES:
summary: 1-2 sentences. What is the overall state of your client portfolio right now? Be specific and honest.

items: Prioritised list of things that need action. Maximum 6 items.

  issue: What is wrong or needs attention. Specific — name the client and the actual problem.

  action: What the PM should do. Specific and time-bound. Starts with a verb.

  Only include items that genuinely need attention. Don't pad with low-priority noise. If everything is fine, say so in summary and return empty items array.

CLIENT DATA:
${clientContext}

Return only valid JSON.
No markdown, no preamble.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";

    const result = JSON.parse(raw) as {
      summary: string;
      items: Array<{
        clientName: string;
        priority: string;
        issue: string;
        action: string;
        type: string;
      }>;
    };

    return NextResponse.json(result);
  } catch (e) {
    console.error("[ci/attention]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
