import { NextResponse } from "next/server";

import {
  aggregateGenerationsByClient,
  buildSummaryHealthMap,
  resolveHealthFromAggregate,
  type GenerationHealthRow,
  type SummaryHealthRow,
} from "@/lib/server/client-health-resolve";
import { parseCachedHealth } from "@/lib/server/client-health";
import { computeRelationshipScore } from "@/lib/server/client-relationship-score";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function computeTrend(
  recentCount: number,
  previousCount: number,
): "up" | "down" | "stable" {
  if (previousCount === 0) return "stable";
  const change = (recentCount - previousCount) / previousCount;
  if (change > 0.2) return "up";
  if (change < -0.2) return "down";
  return "stable";
}

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: generationsRaw, error } = await supabase
      .from("generations")
      .select(
        "id, project_name, client_name_extracted, created_at, report_type, source, output_json",
      )
      .eq("user_id", user.id)
      .not("project_name", "is", null)
      .neq("project_name", "")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const generations = (generationsRaw ?? []) as GenerationHealthRow[];

    const { data: summariesRaw } = await supabase
      .from("client_intelligence_summaries")
      .select("client_name, summary_json, updated_at, summary_type")
      .eq("user_id", user.id)
      .eq("summary_type", "summary");

    const summaries = (summariesRaw ?? []) as SummaryHealthRow[];
    const summaryMap = buildSummaryHealthMap(summaries);
    const clientMap = aggregateGenerationsByClient(generations);

    const clients = Array.from(clientMap.values())
      .map((c) => {
        const existingSummary = summaryMap.get(c.name);
        const { relationship_health: health } = resolveHealthFromAggregate(
          c,
          existingSummary,
        );

        const latestRiskCount = Array.isArray(c.latestOutputJson?.risks)
          ? (c.latestOutputJson.risks as unknown[]).length
          : 0;

        const latestActionCount = Array.isArray(c.latestOutputJson?.actions)
          ? (c.latestOutputJson.actions as unknown[]).length
          : 0;

        const daysSinceLastReport = Math.floor(
          (Date.now() - new Date(c.lastGeneratedAt).getTime()) /
            (1000 * 60 * 60 * 24),
        );

        const trend = computeTrend(
          c.recentGenerationCount,
          c.previousGenerationCount,
        );

        const recurringIssueCount = existingSummary?.recurringIssueCount ?? 0;
        const relationship = computeRelationshipScore({
          daysSinceLastReport,
          openRiskCount: latestRiskCount,
          recurringIssueCount,
          generationCount: c.generationCount,
          hasScheduled: c.sources.has("scheduled"),
          cachedSummaryHealth: parseCachedHealth(existingSummary?.health ?? null),
          cachedSummaryUpdatedAt: existingSummary?.updatedAt ?? null,
        });

        return {
          name: c.name,
          generationCount: c.generationCount,
          lastGeneratedAt: c.lastGeneratedAt,
          daysSinceLastReport,
          reportTypes: Array.from(c.reportTypes),
          hasQbr: c.reportTypes.has("qbr"),
          hasScheduled: c.sources.has("scheduled"),
          health,
          trend,
          recentGenerationCount: c.recentGenerationCount,
          recentRiskCount: latestRiskCount,
          recentActionCount: latestActionCount,
          hasSummary: summaryMap.has(c.name),
          relationshipScore: relationship.score,
          relationshipScoreLabel: relationship.label,
          relationshipScoreBreakdown: relationship.breakdown,
        };
      })
      .sort((a, b) => {
        const healthOrder = { red: 0, amber: 1, green: 2 };
        const healthDiff =
          healthOrder[a.health] - healthOrder[b.health];
        if (healthDiff !== 0) return healthDiff;
        return (
          new Date(b.lastGeneratedAt).getTime() -
          new Date(a.lastGeneratedAt).getTime()
        );
      });

    return NextResponse.json({ clients });
  } catch (e) {
    console.error("[ci/clients]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
