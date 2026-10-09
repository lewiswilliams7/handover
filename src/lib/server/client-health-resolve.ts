import type { SupabaseClient } from "@supabase/supabase-js";

import {
  computeClientHealth,
  HEALTH_JUSTIFICATIONS,
  parseCachedHealth,
  type HealthSignal,
} from "@/lib/server/client-health";

export type GenerationHealthRow = {
  project_name: string | null;
  client_name_extracted: string | null;
  created_at: string;
  report_type: string | null;
  source: string | null;
  output_json: Record<string, unknown> | null;
};

export type SummaryHealthRow = {
  client_name: string;
  summary_json: Record<string, unknown> | null;
  updated_at: string;
  summary_type?: string | null;
};

export type ClientGenerationAggregate = {
  name: string;
  generationCount: number;
  lastGeneratedAt: string;
  reportTypes: Set<string>;
  sources: Set<string>;
  latestOutputJson: Record<string, unknown> | null;
  recentGenerationCount: number;
  previousGenerationCount: number;
};

export type SummaryHealthCache = {
  health: string | null;
  updatedAt: string;
  recurringIssueCount: number;
};

export function isSkippedClientName(clientName: string): boolean {
  if (/^weekly report$/i.test(clientName)) return true;
  if (/^monthly report$/i.test(clientName)) return true;
  if (/^unknown$/i.test(clientName)) return true;
  return false;
}

export function getGenerationClientName(gen: GenerationHealthRow): string | null {
  const clientName =
    gen.client_name_extracted?.trim() || gen.project_name?.trim() || "";
  if (!clientName || isSkippedClientName(clientName)) return null;
  return clientName;
}

export function aggregateGenerationsByClient(
  generations: GenerationHealthRow[],
  now: Date = new Date(),
): Map<string, ClientGenerationAggregate> {
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const clientMap = new Map<string, ClientGenerationAggregate>();

  for (const gen of generations) {
    const clientName = getGenerationClientName(gen);
    if (!clientName) continue;

    if (!clientMap.has(clientName)) {
      clientMap.set(clientName, {
        name: clientName,
        generationCount: 0,
        lastGeneratedAt: gen.created_at,
        reportTypes: new Set(),
        sources: new Set(),
        latestOutputJson: null,
        recentGenerationCount: 0,
        previousGenerationCount: 0,
      });
    }

    const client = clientMap.get(clientName)!;
    client.generationCount++;

    if (gen.report_type) {
      client.reportTypes.add(gen.report_type);
    }
    if (gen.source) {
      client.sources.add(gen.source);
    }

    const genDate = new Date(gen.created_at);

    if (genDate >= thirtyDaysAgo) {
      client.recentGenerationCount++;
      if (client.latestOutputJson === null) {
        client.latestOutputJson = gen.output_json;
      }
    } else if (genDate >= sixtyDaysAgo) {
      client.previousGenerationCount++;
    }
  }

  return clientMap;
}

/** Most recent summary row per client (summary_type = summary only). */
export function buildSummaryHealthMap(
  summaries: SummaryHealthRow[],
): Map<string, SummaryHealthCache> {
  const sorted = [...summaries]
    .filter((s) => (s.summary_type ?? "summary") === "summary")
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );

  const map = new Map<string, SummaryHealthCache>();

  for (const s of sorted) {
    if (map.has(s.client_name)) continue;

    const summaryJson = s.summary_json;
    map.set(s.client_name, {
      health: (summaryJson?.relationship_health as string | null) ?? null,
      updatedAt: s.updated_at,
      recurringIssueCount: Array.isArray(summaryJson?.recurring_issues)
        ? summaryJson.recurring_issues.length
        : 0,
    });
  }

  return map;
}

export function resolveHealthFromAggregate(
  aggregate: ClientGenerationAggregate,
  summary: SummaryHealthCache | undefined,
  narrativeSuffix?: string,
): { relationship_health: HealthSignal; health_justification: string } {
  const now = Date.now();
  const daysSinceLastReport = Math.floor(
    (now - new Date(aggregate.lastGeneratedAt).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  const openRiskCount = Array.isArray(aggregate.latestOutputJson?.risks)
    ? (aggregate.latestOutputJson.risks as unknown[]).length
    : 0;

  const relationship_health = computeClientHealth({
    daysSinceLastReport,
    openRiskCount,
    recurringIssueCount: summary?.recurringIssueCount ?? 0,
    generationCount: aggregate.generationCount,
    hasScheduled: aggregate.sources.has("scheduled"),
    cachedSummaryHealth: parseCachedHealth(summary?.health),
    cachedSummaryUpdatedAt: summary?.updatedAt ?? null,
  });

  const base = HEALTH_JUSTIFICATIONS[relationship_health];
  const health_justification = narrativeSuffix?.trim()
    ? `${base} ${narrativeSuffix.trim()}`.trim()
    : base;

  return { relationship_health, health_justification };
}

export async function fetchSummaryHealthCache(
  supabase: SupabaseClient,
  userId: string,
  clientName: string,
): Promise<SummaryHealthCache | undefined> {
  const { data } = await supabase
    .from("client_intelligence_summaries")
    .select("client_name, summary_json, updated_at, summary_type")
    .eq("user_id", userId)
    .eq("client_name", clientName)
    .eq("summary_type", "summary")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return undefined;

  const row = data as SummaryHealthRow;
  const summaryJson = row.summary_json;
  return {
    health: (summaryJson?.relationship_health as string | null) ?? null,
    updatedAt: row.updated_at,
    recurringIssueCount: Array.isArray(summaryJson?.recurring_issues)
      ? summaryJson.recurring_issues.length
      : 0,
  };
}

export async function resolveClientHealthForClient(
  supabase: SupabaseClient,
  userId: string,
  clientName: string,
  options?: { narrativeSuffix?: string },
): Promise<{ relationship_health: HealthSignal; health_justification: string }> {
  const { data: generationsRaw, error } = await supabase
    .from("generations")
    .select(
      "project_name, client_name_extracted, created_at, report_type, source, output_json",
    )
    .eq("user_id", userId)
    .not("project_name", "is", null)
    .neq("project_name", "")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const generations = (generationsRaw ?? []) as GenerationHealthRow[];
  const clientMap = aggregateGenerationsByClient(generations);
  const aggregate = clientMap.get(clientName);

  const summary = await fetchSummaryHealthCache(supabase, userId, clientName);

  if (!aggregate) {
    const relationship_health = computeClientHealth({
      daysSinceLastReport: 999,
      openRiskCount: 0,
      recurringIssueCount: summary?.recurringIssueCount ?? 0,
      generationCount: 0,
      hasScheduled: false,
      cachedSummaryHealth: parseCachedHealth(summary?.health),
      cachedSummaryUpdatedAt: summary?.updatedAt ?? null,
    });
    const base = HEALTH_JUSTIFICATIONS[relationship_health];
    const health_justification = options?.narrativeSuffix?.trim()
      ? `${base} ${options.narrativeSuffix.trim()}`.trim()
      : base;
    return { relationship_health, health_justification };
  }

  return resolveHealthFromAggregate(aggregate, summary, options?.narrativeSuffix);
}
