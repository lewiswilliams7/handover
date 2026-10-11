import { NextResponse } from "next/server";
import { Resend } from "resend";

import { getAppOrigin } from "@/lib/app-url";
import { isMissingTableError } from "@/lib/manual-client-values";
import { briefUnsubscribeToken, isoWeekKey, mondayBriefEmail } from "@/lib/monday-brief";
import { getNoreplyMailbox } from "@/lib/resend-from-header";
import { loadPortfolioSummary } from "@/lib/server/portfolio-summary";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { hasHandoverEntitlement, planFieldsFromProfileRow } from "@/lib/utils/getPlan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TIME_BUDGET_MS = 240_000;
const RECENT_SCAN_MS = 8 * 24 * 60 * 60 * 1000;

/** Monday in the UK, whatever the server's time zone. */
function isMondayInLondon(now: Date): boolean {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "Europe/London" }).format(now) === "Monday";
}

/**
 * Sends the Monday Brief to every owner with an active plan and a scan from
 * the last eight days. Safe to call more than once: each user gets one brief
 * per ISO week. Outside Mondays it does nothing unless ?force=1.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const startedAt = Date.now();
  const now = new Date();
  const force = new URL(req.url).searchParams.get("force") === "1";
  if (!force && !isMondayInLondon(now)) {
    return NextResponse.json({ ok: true, skipped: "not_monday" });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ ok: false, error: "resend_not_configured" }, { status: 503 });
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const admin = createServiceRoleClient();
  const week = isoWeekKey(now);

  const { data: scans } = await admin
    .from("scan_sessions")
    .select("claimed_by_user_id")
    .eq("status", "claimed")
    .gt("created_at", new Date(now.getTime() - RECENT_SCAN_MS).toISOString());
  const userIds = [...new Set((scans ?? []).map((row) => String(row.claimed_by_user_id)).filter(Boolean))];
  if (userIds.length === 0) return NextResponse.json({ ok: true, week, sent: 0 });

  const [{ data: profiles }, settingsResult] = await Promise.all([
    admin
      .from("profiles")
      .select("id, first_name, plan, team_id, trial_ends_at, trial_plan, subscription_status")
      .in("id", userIds),
    admin.from("monday_brief_settings").select("user_id, enabled, last_sent_week").in("user_id", userIds),
  ]);
  const settingsAvailable = !isMissingTableError(settingsResult.error);
  const settings = new Map((settingsResult.data ?? []).map((row) => [String(row.user_id), row]));

  const results: Array<{ userId: string; status: string }> = [];
  for (const profile of profiles ?? []) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) break;
    const userId = String(profile.id);
    const setting = settings.get(userId);
    if (setting?.enabled === false) continue;
    if (setting?.last_sent_week === week) continue;
    if (!hasHandoverEntitlement(planFieldsFromProfileRow(profile))) continue;

    try {
      const { data: authUser } = await admin.auth.admin.getUserById(userId);
      const to = authUser.user?.email?.trim();
      if (!to) {
        results.push({ userId, status: "no_email" });
        continue;
      }
      const summary = await loadPortfolioSummary(admin, userId);
      if (!summary) {
        results.push({ userId, status: "no_scan" });
        continue;
      }
      const origin = getAppOrigin();
      const email = mondayBriefEmail(summary, {
        firstName: typeof profile.first_name === "string" ? profile.first_name.trim() : "",
        appOrigin: origin,
        unsubscribeUrl: `${origin}/api/monday-brief/unsubscribe?u=${encodeURIComponent(userId)}&t=${briefUnsubscribeToken(userId)}`,
      });
      const { error } = await resend.emails.send({
        from: `Handover <${getNoreplyMailbox()}>`,
        to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        headers: {
          "List-Unsubscribe": `<${origin}/api/monday-brief/unsubscribe?u=${encodeURIComponent(userId)}&t=${briefUnsubscribeToken(userId)}>`,
        },
      });
      if (error) {
        results.push({ userId, status: "send_failed" });
        continue;
      }
      if (settingsAvailable) {
        await admin.from("monday_brief_settings").upsert(
          { user_id: userId, enabled: true, last_sent_week: week, last_sent_at: new Date().toISOString() },
          { onConflict: "user_id" },
        );
      }
      results.push({ userId, status: "sent" });
    } catch (error) {
      console.error("[monday-brief]", userId, error);
      results.push({ userId, status: "failed" });
    }
  }

  return NextResponse.json({
    ok: true,
    week,
    sent: results.filter((row) => row.status === "sent").length,
    results,
  });
}
