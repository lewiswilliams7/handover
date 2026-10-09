import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

import { buildExactClientFilter } from "@/lib/server/ci-generation-filter";
import { resolveClientHealthForClient } from "@/lib/server/client-health-resolve";
import { requireScanDetailsEntitlement } from "@/lib/scan-entitlement";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type ClientBriefPayload = {
  currentStatus: string;
  whatChanged: string | null;
  openRisks: string[];
  talkingPoints: string[];
};

type CompareCacheEntry = {
  comparison?: { what_changed?: string };
  previousDate?: string;
  currentDate?: string;
};

function extractWhatChangedFromCompareCache(
  compareCache: Record<string, unknown> | null | undefined,
): string | null {
  if (!compareCache || typeof compareCache !== "object") return null;
  const entries = Object.values(compareCache) as CompareCacheEntry[];
  for (const entry of entries) {
    const text = entry?.comparison?.what_changed;
    if (typeof text === "string" && text.trim()) {
      return text.trim();
    }
  }
  return null;
}

function parseBriefJson(raw: Record<string, unknown>): ClientBriefPayload {
  const currentStatus =
    typeof raw.currentStatus === "string"
      ? raw.currentStatus.trim()
      : typeof raw.current_status === "string"
        ? raw.current_status.trim()
        : "";
  const whatChanged =
    typeof raw.whatChanged === "string"
      ? raw.whatChanged.trim()
      : typeof raw.what_changed === "string"
        ? raw.what_changed.trim()
        : null;
  const openRisks = Array.isArray(raw.openRisks)
    ? raw.openRisks.filter((r): r is string => typeof r === "string" && r.trim().length > 0)
    : Array.isArray(raw.open_risks)
      ? raw.open_risks.filter((r): r is string => typeof r === "string" && r.trim().length > 0)
      : [];
  const talkingPoints = (
    Array.isArray(raw.talkingPoints)
      ? raw.talkingPoints
      : Array.isArray(raw.talking_points)
        ? raw.talking_points
        : []
  )
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    .slice(0, 3);

  return {
    currentStatus,
    whatChanged: whatChanged || null,
    openRisks,
    talkingPoints,
  };
}

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
      clientName?: string;
      forceRefresh?: boolean;
    };
    const clientName = body.clientName?.trim() ?? "";
    const forceRefresh = body.forceRefresh === true;

    if (!clientName) {
      return NextResponse.json({ error: "clientName required" }, { status: 400 });
    }

    const adminClient = createServiceRoleClient();

    const { data: cached } = await adminClient
      .from("client_intelligence_summaries")
      .select("summary_json, created_at")
      .eq("user_id", user.id)
      .eq("client_name", clientName)
      .eq("summary_type", "brief")
      .is("period_from", null)
      .is("period_to", null)
      .maybeSingle();

    const cachedRow = cached as {
      summary_json: ClientBriefPayload;
      created_at: string;
    } | null;

    if (!forceRefresh && cachedRow?.summary_json) {
      const age = Date.now() - new Date(cachedRow.created_at).getTime();
      if (age < 24 * 60 * 60 * 1000) {
        return NextResponse.json({
          brief: cachedRow.summary_json,
          cached: true,
        });
      }
    }

    const { data: accountSummaryRow } = await adminClient
      .from("client_intelligence_summaries")
      .select("summary_json")
      .eq("user_id", user.id)
      .eq("client_name", clientName)
      .eq("summary_type", "summary")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const accountSummary =
      (accountSummaryRow?.summary_json as Record<string, unknown> | null) ?? null;

    const resolvedHealth = await resolveClientHealthForClient(
      adminClient,
      user.id,
      clientName,
    );

    const { data: latestGen } = await adminClient
      .from("generations")
      .select("id, compare_cache, created_at, output_json")
      .eq("user_id", user.id)
      .or(buildExactClientFilter(clientName))
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const compareWhatChanged = extractWhatChangedFromCompareCache(
      (latestGen?.compare_cache as Record<string, unknown> | null) ?? null,
    );

    const summaryOpenRisks = Array.isArray(accountSummary?.open_risks)
      ? (accountSummary.open_risks as unknown[]).filter(
          (r): r is string => typeof r === "string" && r.trim().length > 0,
        )
      : [];

    const latestOutput = (latestGen?.output_json as Record<string, unknown> | null) ?? null;
    const latestRisks = Array.isArray(latestOutput?.risks)
      ? (latestOutput.risks as Record<string, unknown>[])
          .map((r) => String(r.risk ?? r.title ?? "").trim())
          .filter(Boolean)
      : [];

    const openRisksSeed = summaryOpenRisks.length > 0 ? summaryOpenRisks : latestRisks;

    const accountNarrative =
      typeof accountSummary?.account_narrative === "string"
        ? accountSummary.account_narrative
        : "";
    const recurringIssues = Array.isArray(accountSummary?.recurring_issues)
      ? (accountSummary.recurring_issues as string[]).slice(0, 5).join("; ")
      : "";

    const prompt = `
You are preparing an MSP account manager for their next conversation with ${clientName}.

This is a CLIENT BRIEF (account-level), not a ticket update or QBR deck. Focus on relationship context and what to discuss next.

Return JSON only:
{
  "currentStatus": string,
  "whatChanged": string | null,
  "openRisks": string[],
  "talkingPoints": string[]
}

RULES:
currentStatus: 1-2 sentences on relationship and delivery posture right now. Plain language for internal use before a call.

whatChanged: If COMPARE DATA is provided below, summarise the most important shift since the last report in 1-2 sentences. If no compare data, return null.

openRisks: Unresolved risks to be aware of on the call. Use OPEN RISKS seed below. Max 6 items. Empty array if none.

talkingPoints: Exactly 2-3 practical conversation starters for the next client interaction. Specific to this account. Not generic coaching.

RELATIONSHIP HEALTH: ${resolvedHealth.relationship_health}
${resolvedHealth.health_justification}

ACCOUNT NARRATIVE:
${accountNarrative || "Not available — infer from risks and compare data."}

RECURRING ISSUES:
${recurringIssues || "None flagged."}

OPEN RISKS SEED:
${openRisksSeed.length ? openRisksSeed.join("\n") : "None in latest data."}

COMPARE DATA (report-to-report):
${compareWhatChanged ?? "No comparison available yet."}

Return only valid JSON. No markdown.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 1200,
      response_format: { type: "json_object" },
    });

    const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as Record<
      string,
      unknown
    >;
    const brief = parseBriefJson(raw);

    if (!brief.whatChanged && compareWhatChanged) {
      brief.whatChanged = compareWhatChanged;
    }
    if (brief.openRisks.length === 0 && openRisksSeed.length > 0) {
      brief.openRisks = openRisksSeed.slice(0, 6);
    }
    if (!brief.currentStatus) {
      brief.currentStatus = resolvedHealth.health_justification;
    }

    const { error: upsertError } = await adminClient
      .from("client_intelligence_summaries")
      .upsert(
        {
          user_id: user.id,
          client_name: clientName,
          summary_type: "brief",
          period_from: null,
          period_to: null,
          summary_json: brief,
          generation_ids: latestGen?.id ? [latestGen.id] : [],
          updated_at: new Date().toISOString(),
        },
        {
          onConflict:
            "user_id,client_name,summary_type,period_from,period_to,qbr_months",
        },
      );

    if (upsertError) {
      console.error("[ci/brief] upsert failed", upsertError.message);
      return NextResponse.json({
        brief,
        cached: false,
        _persistFailed: true,
      });
    }

    return NextResponse.json({ brief, cached: false });
  } catch (e) {
    console.error("[ci/brief]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
