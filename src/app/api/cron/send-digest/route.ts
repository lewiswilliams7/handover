import { NextResponse } from "next/server";
import OpenAI from "openai";
import { Resend } from "resend";

import {
  aggregateGenerationsByClient,
  buildSummaryHealthMap,
  resolveHealthFromAggregate,
  type ClientGenerationAggregate,
  type GenerationHealthRow,
  type SummaryHealthCache,
  type SummaryHealthRow,
} from "@/lib/server/client-health-resolve";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const HEALTH_RANK: Record<string, number> = { red: 0, amber: 1, green: 2 };

/** Users with at least one qualifying generation in this window get a daily snapshot. */
const SNAPSHOT_ACTIVITY_LOOKBACK_DAYS = 90;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const resend = new Resend(process.env.RESEND_API_KEY);

type AdminClient = ReturnType<typeof createServiceRoleClient>;

type ClientHealthMetrics = {
  name: string;
  health: string;
  daysSince: number;
  riskCount: number;
  recurringIssueCount: number;
  generationCount: number;
  hasScheduled: boolean;
};

type PreviousSnapshotRow = {
  client_name: string;
  snapshot_date: string;
  relationship_health: string;
  days_since_last_report: number | null;
  open_risk_count: number;
};

function snapshotDateUtc(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function formatSignedDelta(current: number, previous: number): string {
  const delta = current - previous;
  if (delta === 0) return "(+0)";
  return delta > 0 ? `(+${delta})` : `(${delta})`;
}

function metricsFromAggregate(
  aggregate: ClientGenerationAggregate,
  summary: SummaryHealthCache | undefined,
  now: Date,
): ClientHealthMetrics {
  const { relationship_health: health } = resolveHealthFromAggregate(
    aggregate,
    summary,
  );

  const riskCount = Array.isArray(aggregate.latestOutputJson?.risks)
    ? (aggregate.latestOutputJson.risks as unknown[]).length
    : 0;

  const daysSince = Math.floor(
    (now.getTime() - new Date(aggregate.lastGeneratedAt).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  return {
    name: aggregate.name,
    health,
    daysSince,
    riskCount,
    recurringIssueCount: summary?.recurringIssueCount ?? 0,
    generationCount: aggregate.generationCount,
    hasScheduled: aggregate.sources.has("scheduled"),
  };
}

async function loadUserClientHealthMetrics(
  adminClient: AdminClient,
  userId: string,
  now: Date,
): Promise<ClientHealthMetrics[]> {
  const { data: generationsRaw, error: genError } = await adminClient
    .from("generations")
    .select(
      "id, project_name, client_name_extracted, created_at, source, report_type, output_json",
    )
    .eq("user_id", userId)
    .not("project_name", "is", null)
    .neq("project_name", "")
    .order("created_at", { ascending: false })
    .limit(500);

  if (genError) throw genError;

  const generations = (generationsRaw ?? []) as GenerationHealthRow[];
  const clientMap = aggregateGenerationsByClient(generations, now);

  const { data: summariesRaw, error: summaryError } = await adminClient
    .from("client_intelligence_summaries")
    .select("client_name, summary_json, updated_at, summary_type")
    .eq("user_id", userId)
    .eq("summary_type", "summary");

  if (summaryError) throw summaryError;

  const summaries = (summariesRaw ?? []) as SummaryHealthRow[];
  const summaryMap = buildSummaryHealthMap(summaries);

  return Array.from(clientMap.values()).map((aggregate) =>
    metricsFromAggregate(aggregate, summaryMap.get(aggregate.name), now),
  );
}

async function listUserIdsWithRecentGenerations(
  adminClient: AdminClient,
  sinceIso: string,
): Promise<string[]> {
  const { data, error } = await adminClient
    .from("generations")
    .select("user_id")
    .not("project_name", "is", null)
    .neq("project_name", "")
    .gte("created_at", sinceIso);

  if (error) throw error;

  const userIds = new Set<string>();
  for (const row of data ?? []) {
    if (typeof row.user_id === "string" && row.user_id.trim()) {
      userIds.add(row.user_id);
    }
  }
  return [...userIds];
}

/** Phase 1: daily snapshots for all users with recent client activity. */
async function writeDailyHealthSnapshotsPhase(
  adminClient: AdminClient,
  now: Date,
): Promise<{ usersProcessed: number; usersFailed: number; clientsWritten: number }> {
  const snapshotDate = snapshotDateUtc(now);
  const sinceIso = new Date(
    now.getTime() - SNAPSHOT_ACTIVITY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  let userIds: string[];
  try {
    userIds = await listUserIdsWithRecentGenerations(adminClient, sinceIso);
  } catch (e) {
    console.error("[send-digest] Phase 1: failed to list active users", e);
    return { usersProcessed: 0, usersFailed: 0, clientsWritten: 0 };
  }

  console.log(`[send-digest] Phase 1: ${userIds.length} users with recent activity`);

  let usersProcessed = 0;
  let usersFailed = 0;
  let clientsWritten = 0;

  for (const userId of userIds) {
    try {
      const metrics = await loadUserClientHealthMetrics(adminClient, userId, now);
      if (metrics.length === 0) {
        usersProcessed++;
        continue;
      }

      const rows = metrics.map((m) => ({
        user_id: userId,
        client_name: m.name,
        snapshot_date: snapshotDate,
        relationship_health: m.health,
        days_since_last_report: m.daysSince,
        open_risk_count: m.riskCount,
        recurring_issue_count: m.recurringIssueCount,
        generation_count: m.generationCount,
        has_scheduled: m.hasScheduled,
      }));

      const { error: upsertErr } = await adminClient
        .from("client_health_snapshots")
        .upsert(rows, {
          onConflict: "user_id,client_name,snapshot_date",
        });

      if (upsertErr) {
        throw upsertErr;
      }

      clientsWritten += rows.length;
      usersProcessed++;
    } catch (e) {
      usersFailed++;
      console.error(`[send-digest] Phase 1: snapshot failed for user ${userId}:`, e);
    }
  }

  console.log(
    `[send-digest] Phase 1 complete: ${usersProcessed} users ok, ${usersFailed} failed, ${clientsWritten} client rows`,
  );

  return { usersProcessed, usersFailed, clientsWritten };
}

async function fetchPreviousSnapshotsByClient(
  adminClient: AdminClient,
  userId: string,
  clientNames: string[],
  beforeDate: string,
): Promise<Map<string, PreviousSnapshotRow>> {
  const map = new Map<string, PreviousSnapshotRow>();
  if (clientNames.length === 0) return map;

  const { data, error } = await adminClient
    .from("client_health_snapshots")
    .select(
      "client_name, snapshot_date, relationship_health, days_since_last_report, open_risk_count",
    )
    .eq("user_id", userId)
    .in("client_name", clientNames)
    .lt("snapshot_date", beforeDate)
    .order("snapshot_date", { ascending: false });

  if (error) {
    console.error("[send-digest] previous snapshot fetch failed", error.message);
    return map;
  }

  for (const row of (data ?? []) as PreviousSnapshotRow[]) {
    if (!map.has(row.client_name)) {
      map.set(row.client_name, row);
    }
  }

  return map;
}

function buildClientContextLine(
  client: ClientHealthMetrics,
  previous: PreviousSnapshotRow | undefined,
): string {
  const prevHealth = previous?.relationship_health ?? "first report";
  let daysPart = `days since report=${client.daysSince}`;
  if (previous && typeof previous.days_since_last_report === "number") {
    daysPart += ` ${formatSignedDelta(client.daysSince, previous.days_since_last_report)}`;
  }

  let risksPart = `risks=${client.riskCount}`;
  if (previous) {
    risksPart += ` ${formatSignedDelta(client.riskCount, previous.open_risk_count)}`;
  }

  return `${client.name}: health=${client.health} (prev: ${prevHealth}), ${daysPart}, ${risksPart}`;
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET ?? ""}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createServiceRoleClient();
  const now = new Date();

  try {
    const snapshotStats = await writeDailyHealthSnapshotsPhase(adminClient, now);

    const { data: digests } = await adminClient
      .from("digest_settings")
      .select("*, profiles(email)")
      .eq("enabled", true)
      .lte("next_send_at", now.toISOString());

    console.log(`[send-digest] Phase 2: Found ${digests?.length ?? 0} digests due`);

    for (const digest of digests ?? []) {
      try {
        await sendDigestForUser(adminClient, openai, resend, digest, now);
      } catch (e) {
        console.error(`[send-digest] Failed for user ${digest.user_id}:`, e);
      }
    }

    return NextResponse.json({
      sent: digests?.length ?? 0,
      snapshots: snapshotStats,
    });
  } catch (e) {
    console.error("[send-digest]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** Phase 2: send digest email for users due today. */
async function sendDigestForUser(
  adminClient: AdminClient,
  openai: OpenAI,
  resend: Resend,
  digest: Record<string, unknown>,
  now: Date,
) {
  const userId = digest.user_id as string;
  const snapshotDate = snapshotDateUtc(now);

  const allClients = await loadUserClientHealthMetrics(adminClient, userId, now);

  const clients = [...allClients]
    .sort((a, b) => {
      const healthDiff =
        (HEALTH_RANK[a.health] ?? 3) - (HEALTH_RANK[b.health] ?? 3);
      if (healthDiff !== 0) return healthDiff;
      if (b.riskCount !== a.riskCount) {
        return b.riskCount - a.riskCount;
      }
      return b.daysSince - a.daysSince;
    })
    .slice(0, 30);

  if (clients.length === 0) return;

  const previousByClient = await fetchPreviousSnapshotsByClient(
    adminClient,
    userId,
    clients.map((c) => c.name),
    snapshotDate,
  );

  const clientContext = clients
    .map((c) => buildClientContextLine(c, previousByClient.get(c.name)))
    .join("\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: `
You are an AI service delivery manager. Based on this client portfolio data, write a brief weekly digest for the MSP PM.

Format as JSON:
{
  "subject": string,
  "headline": string,
  "items": [
    {
      "clientName": string,
      "priority": "high"|"medium"|"low",
      "issue": string,
      "action": string
    }
  ],
  "closing": string
}

subject: Email subject line. Specific — mention the most urgent client if any.

headline: 1-2 sentences. Overall portfolio status. Honest.

items: Only clients needing action. Max 5. Ordered by priority. Empty array if all is well.

closing: 1 sentence. Positive but honest.

Deltas show change since the previous snapshot. Mention significant negative changes in your issue/priority reasoning when present.

CLIENT DATA:
${clientContext}

Return only valid JSON.`,
      },
    ],
    temperature: 0,
    max_tokens: 1000,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const content = JSON.parse(raw) as {
    subject: string;
    headline: string;
    items: Array<{
      clientName: string;
      priority: string;
      issue: string;
      action: string;
    }>;
    closing: string;
  };

  const itemsHtml =
    content.items.length > 0
      ? content.items
          .map(
            (item) => `
<div style="margin-bottom:12px;padding:12px 16px;border-radius:8px;border:1px solid ${
              item.priority === "high" ? "#fee2e2" : "#fef3c7"
            };background:${item.priority === "high" ? "#fff5f5" : "#fffbeb"};">
  <div style="font-size:12px;font-weight:600;color:#1a1a2e;margin-bottom:4px;">
    ${item.clientName}
    <span style="margin-left:8px;font-size:10px;font-weight:700;text-transform:uppercase;color:${
      item.priority === "high" ? "#dc2626" : "#d97706"
    };">
      ${item.priority}
    </span>
  </div>
  <div style="font-size:12px;color:#4b5563;margin-bottom:6px;">
    ${item.issue}
  </div>
  <div style="font-size:12px;font-weight:500;color:#0ea5e9;">
    → ${item.action}
  </div>
</div>`,
          )
          .join("")
      : `<div style="padding:16px;text-align:center;color:#6b7280;font-size:13px;">
         ✓ No urgent items this week
         </div>`;

  const emailHtml = `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:0;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
  <div style="background:#06091a;border-radius:12px;padding:24px;margin-bottom:16px;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
      <span style="color:#38bdf8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">
        Handover · Weekly Digest
      </span>
    </div>
    <h1 style="color:#ffffff;font-size:18px;font-weight:600;margin:0 0 8px;">
      ${content.headline}
    </h1>
  </div>

  <div style="background:#ffffff;border-radius:12px;padding:20px;margin-bottom:16px;border:1px solid #e5e7eb;">
    <h2 style="font-size:12px;font-weight:700;text-transform:uppercase;color:#9ca3af;letter-spacing:0.08em;margin:0 0 12px;">
      Needs attention
    </h2>
    ${itemsHtml}
  </div>

  <div style="text-align:center;padding:16px;color:#9ca3af;font-size:11px;">
    ${content.closing}<br/>
    <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color:#38bdf8;text-decoration:none;margin-top:8px;display:inline-block;">
      Open Handover →
    </a>
  </div>
</div>
</body>
</html>`;

  const emailTo =
    (digest.email_to as string | null) ||
    ((digest.profiles as Record<string, unknown>)?.email as string | null);

  if (!emailTo) return;

  const clientsCovered = clients.map((c) => c.name);
  const attentionItemCount = content.items.length;

  const { error: sendErr } = await resend.emails.send({
    from: "Handover Digest <digest@gethandover.uk>",
    to: emailTo,
    subject: content.subject,
    html: emailHtml,
  });

  if (sendErr) {
    const { error: historyErr } = await adminClient
      .from("scheduled_report_history")
      .insert({
        user_id: userId,
        schedule_id: null,
        email_to: emailTo,
        tickets_processed: attentionItemCount,
        clients_covered: clientsCovered,
        status: "failed",
        error_message: sendErr.message ?? "Email send failed",
        source: "digest",
      });
    if (historyErr) {
      console.error("[send-digest] history insert (failed send):", historyErr.message);
    }
    return;
  }

  const { error: historyErr } = await adminClient
    .from("scheduled_report_history")
    .insert({
      user_id: userId,
      schedule_id: null,
      email_to: emailTo,
      tickets_processed: attentionItemCount,
      clients_covered: clientsCovered,
      status: "sent",
      source: "digest",
    });
  if (historyErr) {
    console.error("[send-digest] history insert:", historyErr.message);
  }

  const nextFrequency = (digest.frequency as string) ?? "weekly";
  const daysUntilNext =
    nextFrequency === "weekly" ? 7 : nextFrequency === "fortnightly" ? 14 : 28;

  const nextSend = new Date(now.getTime() + daysUntilNext * 24 * 60 * 60 * 1000);

  await adminClient
    .from("digest_settings")
    .update({
      last_sent_at: now.toISOString(),
      next_send_at: nextSend.toISOString(),
    })
    .eq("user_id", userId);
}
