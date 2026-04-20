import type { SupabaseClient } from "@supabase/supabase-js";

import { getAppOrigin } from "@/lib/app-url";
import { getUserPlan, userPlanHasProAccess } from "@/lib/utils/getPlan";

export type ChatNotifyProfileRow = {
  slack_webhook_url?: string | null;
  slack_notifications_enabled?: boolean | null;
  teams_webhook_url?: string | null;
  teams_notifications_enabled?: boolean | null;
};

function countOpenLikeItems(items: unknown[]): number {
  if (!Array.isArray(items) || items.length === 0) return 0;
  const closed = /^(closed|complete|completed|done|resolved|cancelled|canceled|duplicate)\b/i;
  let n = 0;
  for (const raw of items) {
    if (!raw || typeof raw !== "object") {
      n += 1;
      continue;
    }
    const o = raw as Record<string, unknown>;
    const status =
      typeof o.status === "string"
        ? o.status
        : typeof o.State === "string"
          ? o.State
          : typeof o.state === "string"
            ? o.state
            : "";
    if (status && closed.test(status.trim())) continue;
    n += 1;
  }
  return n;
}

function inferRagEmoji(parsed: Record<string, unknown>): string {
  const blob = [
    typeof parsed.status_report === "string" ? parsed.status_report : "",
    typeof parsed.summary === "string" ? parsed.summary : "",
  ]
    .join("\n")
    .toLowerCase();

  if (/\bred\b|🔴|amber.*red|risk.*high|critical/.test(blob)) return "🔴";
  if (/\bgreen\b|🟢|on track|on-track|good shape/.test(blob)) return "🟢";
  if (/\bamber\b|🟡|yellow|at risk|watch/.test(blob)) return "🟡";
  return "🟡";
}

function clientLabelFromParsed(
  parsed: Record<string, unknown>,
  fallbackProject: string | null,
): string {
  const sr = typeof parsed.status_report === "string" ? parsed.status_report : "";
  const m = sr.match(/(?:client|for)\s*[:\s]+([^\n]+)/i);
  if (m?.[1]?.trim()) return m[1].trim().slice(0, 120);
  if (fallbackProject?.trim()) return fallbackProject.trim().slice(0, 120);
  return " - ";
}

function buildSlackPayload(args: {
  titleLine: string;
  clientName: string;
  generatedLabel: string;
  actionsOpen: number;
  risksOpen: number;
  rag: string;
  historyUrl: string;
}): Record<string, unknown> {
  return {
    text: "📋 Handover Report Generated",
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: args.titleLine.slice(0, 150),
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Client:*\n${args.clientName}` },
          { type: "mrkdwn", text: `*Generated:*\n${args.generatedLabel}` },
          { type: "mrkdwn", text: `*Actions:*\n${args.actionsOpen} open` },
          { type: "mrkdwn", text: `*Risks:*\n${args.risksOpen} open` },
          { type: "mrkdwn", text: `*RAG Status:*\n${args.rag}` },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `View in Handover → <${args.historyUrl}|Open generation history>`,
        },
      },
    ],
  };
}

function buildTeamsAdaptiveAttachment(args: {
  titleLine: string;
  clientName: string;
  generatedLabel: string;
  actionsOpen: number;
  risksOpen: number;
  rag: string;
  historyUrl: string;
}): Record<string, unknown> {
  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        contentUrl: null,
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.4",
          body: [
            {
              type: "TextBlock",
              text: args.titleLine,
              weight: "Bolder",
              size: "Large",
              wrap: true,
            },
            {
              type: "FactSet",
              facts: [
                { title: "Client", value: args.clientName },
                { title: "Generated", value: args.generatedLabel },
                { title: "Actions (open)", value: String(args.actionsOpen) },
                { title: "Risks (open)", value: String(args.risksOpen) },
                { title: "RAG Status", value: args.rag },
              ],
            },
            {
              type: "TextBlock",
              text: `[View in Handover](${args.historyUrl})`,
              wrap: true,
            },
          ],
        },
      },
    ],
  };
}

async function postJson(url: string, body: unknown): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Webhook HTTP ${res.status}${t ? `: ${t.slice(0, 200)}` : ""}`);
  }
}

/**
 * After a successful generation, notify Slack/Teams if enabled (Pro/Team/Enterprise only).
 */
export async function notifyHandoverGenerationWebhooks(opts: {
  supabase: SupabaseClient;
  userId: string;
  parsed: Record<string, unknown>;
  projectName: string | null;
  savedGenerationId: string | null;
}): Promise<void> {
  const { supabase, userId, parsed, projectName, savedGenerationId } = opts;

  const fields = await getUserPlan(supabase, userId);
  if (!userPlanHasProAccess(fields)) {
    return;
  }

  const { data: row, error } = await supabase
    .from("profiles")
    .select(
      "slack_webhook_url, slack_notifications_enabled, teams_webhook_url, teams_notifications_enabled",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error || !row) {
    if (error) console.error("[chat-notify] profile read:", error.message);
    return;
  }

  const prof = row as ChatNotifyProfileRow;

  const slackUrl =
    typeof prof.slack_webhook_url === "string" ? prof.slack_webhook_url.trim() : "";
  const teamsUrl =
    typeof prof.teams_webhook_url === "string" ? prof.teams_webhook_url.trim() : "";
  const slackOn = prof.slack_notifications_enabled === true && slackUrl.length > 0;
  const teamsOn = prof.teams_notifications_enabled === true && teamsUrl.length > 0;

  if (!slackOn && !teamsOn) return;

  const actions = Array.isArray(parsed.actions) ? parsed.actions : [];
  const risks = Array.isArray(parsed.risks) ? parsed.risks : [];
  const actionsOpen = countOpenLikeItems(actions);
  const risksOpen = countOpenLikeItems(risks);
  const rag = inferRagEmoji(parsed);
  const clientName = clientLabelFromParsed(parsed, projectName);
  const base = getAppOrigin().replace(/\/$/, "");
  const historyUrl = savedGenerationId
    ? `${base}/home?generation=${encodeURIComponent(savedGenerationId)}`
    : `${base}/home`;

  const title =
    (projectName?.trim() && `📋 New Handover Report - ${projectName.trim()}`) ||
    "📋 New Handover Report";
  const generatedLabel = new Date().toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }) + " UTC";

  const slackBody = buildSlackPayload({
    titleLine: title,
    clientName,
    generatedLabel,
    actionsOpen,
    risksOpen,
    rag,
    historyUrl,
  });
  const teamsBody = buildTeamsAdaptiveAttachment({
    titleLine: title,
    clientName,
    generatedLabel,
    actionsOpen,
    risksOpen,
    rag,
    historyUrl,
  });

  await Promise.all([
    slackOn ? postJson(slackUrl, slackBody).catch((e) => console.error("[chat-notify] Slack:", e)) : Promise.resolve(),
    teamsOn ? postJson(teamsUrl, teamsBody).catch((e) => console.error("[chat-notify] Teams:", e)) : Promise.resolve(),
  ]);
}

/** Slack/Teams ping when an automatic Halo closure summary is posted. */
export async function notifyTicketClosureSummaryWebhooks(opts: {
  supabase: SupabaseClient;
  userId: string;
  ticketName: string;
}): Promise<void> {
  const { supabase, userId, ticketName } = opts;

  const fields = await getUserPlan(supabase, userId);
  if (!userPlanHasProAccess(fields)) return;

  const { data: row, error } = await supabase
    .from("profiles")
    .select(
      "slack_webhook_url, slack_notifications_enabled, teams_webhook_url, teams_notifications_enabled",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error || !row) {
    if (error) console.error("[closure-notify] profile read:", error.message);
    return;
  }

  const prof = row as ChatNotifyProfileRow;
  const slackUrl =
    typeof prof.slack_webhook_url === "string" ? prof.slack_webhook_url.trim() : "";
  const teamsUrl =
    typeof prof.teams_webhook_url === "string" ? prof.teams_webhook_url.trim() : "";
  const slackOn = prof.slack_notifications_enabled === true && slackUrl.length > 0;
  const teamsOn = prof.teams_notifications_enabled === true && teamsUrl.length > 0;
  if (!slackOn && !teamsOn) return;

  const line = `Ticket ${ticketName.trim()} closed - closure summary pushed to HaloPSA`;

  await Promise.all([
    slackOn
      ? postJson(slackUrl, { text: line }).catch((e) => console.error("[closure-notify] Slack:", e))
      : Promise.resolve(),
    teamsOn
      ? postJson(teamsUrl, {
          type: "message",
          attachments: [
            {
              contentType: "application/vnd.microsoft.card.adaptive",
              contentUrl: null,
              content: {
                $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
                type: "AdaptiveCard",
                version: "1.4",
                body: [{ type: "TextBlock", text: line, wrap: true }],
              },
            },
          ],
        }).catch((e) => console.error("[closure-notify] Teams:", e))
      : Promise.resolve(),
  ]);
}
