import { NextResponse } from "next/server";
import { Resend } from "resend";

import { buildHandoverResendFromHeader } from "@/lib/resend-from-header";
import { recentMonthKeys } from "@/lib/psa/client-monthly";
import { getClaimedScanForUser } from "@/lib/psa/scan-session";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { hasHandoverEntitlement, planFieldsFromProfileRow } from "@/lib/utils/getPlan";
import { buildValueReceipt, valueReceiptHtml, valueReceiptText } from "@/lib/value-receipt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends last month's Value Receipt for every enabled schedule that has not had
 * it yet. Safe to run daily: each schedule is sent at most once per month.
 *
 * A receipt only goes out once the customer has a scan from this month, so the
 * whole of last month is in the data. The weekly scan normally provides that
 * within the first week; until then the schedule simply waits.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const [lastMonth, thisMonth] = recentMonthKeys(now, 2) as [string, string];
  const thisMonthStart = Date.parse(`${thisMonth}-01T00:00:00Z`);
  const admin = createServiceRoleClient();

  const { data: schedules, error } = await admin
    .from("value_receipt_schedules")
    .select("id, user_id, client_id, client_name, email_to, last_sent_month")
    .eq("enabled", true)
    .or(`last_sent_month.is.null,last_sent_month.neq.${lastMonth}`)
    .limit(500);
  if (error) {
    console.error("[cron/send-value-receipts] read failed", error.message);
    return NextResponse.json({ ok: false, error: "read_failed" }, { status: 500 });
  }

  const byUser = new Map<string, NonNullable<typeof schedules>>();
  for (const row of schedules ?? []) {
    const list = byUser.get(row.user_id) ?? [];
    list.push(row);
    byUser.set(row.user_id, list);
  }

  let sent = 0;
  let waiting = 0;
  let skipped = 0;
  let failed = 0;

  for (const [userId, rows] of byUser) {
    const { data: profile } = await admin
      .from("profiles")
      .select(
        "plan, team_id, trial_ends_at, trial_plan, subscription_status, first_name, last_name, display_name, company_name, brand_name, brand_colour, white_label_mode",
      )
      .eq("id", userId)
      .maybeSingle();
    if (!profile || !hasHandoverEntitlement(planFieldsFromProfileRow(profile))) {
      skipped += rows.length;
      continue;
    }

    const scan = await getClaimedScanForUser(userId);
    const monthly = scan?.results?.clientMonthly;
    if (!scan || !monthly || Date.parse(scan.createdAt) < thisMonthStart) {
      waiting += rows.length;
      continue;
    }

    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    const replyTo = authUser.user?.email ?? undefined;
    const mspName =
      (typeof profile.company_name === "string" && profile.company_name.trim()) ||
      (typeof profile.brand_name === "string" && profile.brand_name.trim()) ||
      "";
    const senderName =
      (typeof profile.first_name === "string" && profile.first_name.trim()) ||
      (typeof profile.display_name === "string" && profile.display_name.trim()) ||
      "";

    for (const row of rows) {
      const client = monthly.clients.find((c) => c.clientId === Number(row.client_id));
      const receipt = client
        ? buildValueReceipt({ client, clientName: row.client_name, month: lastMonth })
        : null;
      if (!receipt || !receipt.sendable) {
        await admin
          .from("value_receipt_schedules")
          .update({
            last_sent_month: lastMonth,
            last_error: receipt ? "No activity last month, so no receipt was sent." : "Client not found in the latest scan.",
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        skipped += 1;
        continue;
      }
      const text = valueReceiptText(receipt, { mspName, senderName });
      try {
        await resend.emails.send({
          from: buildHandoverResendFromHeader(profile),
          to: row.email_to,
          ...(replyTo ? { replyTo } : {}),
          subject: text.subject,
          text: text.body,
          html: valueReceiptHtml(receipt, {
            mspName,
            senderName,
            accent: typeof profile.brand_colour === "string" ? profile.brand_colour : null,
          }),
        });
        await admin
          .from("value_receipt_schedules")
          .update({
            last_sent_month: lastMonth,
            last_sent_at: new Date().toISOString(),
            last_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        sent += 1;
      } catch (sendError) {
        console.error("[cron/send-value-receipts] send failed", row.id, sendError);
        await admin
          .from("value_receipt_schedules")
          .update({ last_error: "The email could not be sent. It will be retried tomorrow.", updated_at: new Date().toISOString() })
          .eq("id", row.id);
        failed += 1;
      }
    }
  }

  const summary = { month: lastMonth, sent, waiting, skipped, failed };
  console.log("[cron/send-value-receipts]", JSON.stringify(summary));
  return NextResponse.json({ ok: true, ...summary });
}
