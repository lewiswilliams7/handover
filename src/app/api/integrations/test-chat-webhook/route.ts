import { NextResponse } from "next/server";

import { getUserPlan, userPlanHasProAccess } from "@/lib/utils/getPlan";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function isHttpsWebhookUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    return (
      h === "hooks.slack.com" ||
      h === "webhook.office.com" ||
      h.endsWith(".webhook.office.com") ||
      h.endsWith(".office.com") ||
      h.endsWith("office365.com") ||
      h.endsWith("outlook.com") ||
      h === "outlook.office.com" ||
      h.endsWith(".teams.microsoft.com")
    );
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pf = await getUserPlan(supabase, user.id);
    if (!userPlanHasProAccess(pf)) {
      return NextResponse.json({ error: "pro_required" }, { status: 403 });
    }

    let body: { channel?: unknown; webhookUrl?: unknown };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const channel = body.channel === "teams" ? "teams" : body.channel === "slack" ? "slack" : null;
    const webhookUrl =
      typeof body.webhookUrl === "string" ? body.webhookUrl.trim() : "";

    if (!channel || !webhookUrl || !isHttpsWebhookUrl(webhookUrl)) {
      return NextResponse.json(
        { error: "channel (slack|teams) and a valid https webhook URL are required." },
        { status: 400 },
      );
    }

    if (channel === "slack" && !webhookUrl.includes("hooks.slack.com")) {
      return NextResponse.json({ error: "Slack test requires a hooks.slack.com URL." }, { status: 400 });
    }

    const slackPayload = {
      text: "Handover test  -  your Slack webhook is connected.",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "✅ *Handover*  -  test notification. You will receive a message here whenever a report is generated.",
          },
        },
      ],
    };

    const teamsPayload = {
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
                text: "Handover test  -  your Teams webhook is connected.",
                weight: "Bolder",
                wrap: true,
              },
              {
                type: "TextBlock",
                text: "You will receive a message here whenever a report is generated.",
                wrap: true,
              },
            ],
          },
        },
      ],
    };

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(channel === "slack" ? slackPayload : teamsPayload),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return NextResponse.json(
        {
          error: "Webhook returned an error.",
          detail: t.slice(0, 300) || `HTTP ${res.status}`,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
