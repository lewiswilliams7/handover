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

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pf = await getUserPlan(supabase, user.id);
    const canConfigure = userPlanHasProAccess(pf);

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "slack_webhook_url, slack_notifications_enabled, teams_webhook_url, teams_notifications_enabled",
      )
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("[notification-webhooks GET]", error.message);
      return NextResponse.json(
        { error: "Could not load notification webhooks. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      slack_webhook_url: data?.slack_webhook_url ?? null,
      slack_notifications_enabled: data?.slack_notifications_enabled === true,
      teams_webhook_url: data?.teams_webhook_url ?? null,
      teams_notifications_enabled: data?.teams_notifications_enabled === true,
      canConfigure,
    });
  } catch (e) {
    console.error("[notification-webhooks GET]", e);
    return NextResponse.json(
      { error: "Could not load notification webhooks. Please try again." },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
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

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};

    if ("slack_webhook_url" in body) {
      const v = typeof body.slack_webhook_url === "string" ? body.slack_webhook_url.trim() : "";
      if (v && !isHttpsWebhookUrl(v)) {
        return NextResponse.json(
          { error: "Slack webhook URL must be a valid https://hooks.slack.com/ URL." },
          { status: 400 },
        );
      }
      patch.slack_webhook_url = v || null;
    }
    if ("teams_webhook_url" in body) {
      const v = typeof body.teams_webhook_url === "string" ? body.teams_webhook_url.trim() : "";
      if (v && !isHttpsWebhookUrl(v)) {
        return NextResponse.json(
          { error: "Teams webhook URL must be a valid https incoming webhook URL." },
          { status: 400 },
        );
      }
      patch.teams_webhook_url = v || null;
    }
    if ("slack_notifications_enabled" in body) {
      patch.slack_notifications_enabled = body.slack_notifications_enabled === true;
    }
    if ("teams_notifications_enabled" in body) {
      patch.teams_notifications_enabled = body.teams_notifications_enabled === true;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", user.id)
      .select(
        "slack_webhook_url, slack_notifications_enabled, teams_webhook_url, teams_notifications_enabled",
      )
      .maybeSingle();

    if (error) {
      console.error("[notification-webhooks PATCH]", error.message);
      return NextResponse.json(
        { error: "Could not save notification webhooks. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ profile: data });
  } catch (e) {
    console.error("[notification-webhooks PATCH]", e);
    return NextResponse.json(
      { error: "Could not save notification webhooks. Please try again." },
      { status: 500 },
    );
  }
}
