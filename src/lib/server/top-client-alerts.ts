/**
 * Instant alert when one of a customer's ten most valuable clients raises a
 * new warning sign after a scan. Rare by design: it only fires for new risk
 * signals (not housekeeping or renewals) on the clients that matter most.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";

import { getAppOrigin } from "@/lib/app-url";
import { applyManualValues, isMissingTableError, loadManualValues } from "@/lib/manual-client-values";
import { compareScanFindings } from "@/lib/psa/scan-comparison";
import { getFindingCopy } from "@/lib/psa/scan-finding-copy";
import { getClaimedScanForUser, getPreviousClaimedScanForUser } from "@/lib/psa/scan-session";
import { getNoreplyMailbox } from "@/lib/resend-from-header";
import { isRiskFinding } from "@/lib/revenue/revenue-signals";

const TOP_CLIENTS = 10;

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function sendTopClientAlerts(admin: SupabaseClient, userId: string): Promise<"sent" | "none" | "skipped"> {
  if (!process.env.RESEND_API_KEY) return "skipped";
  const scan = await getClaimedScanForUser(userId);
  if (!scan?.results) return "none";
  const previous = await getPreviousClaimedScanForUser(userId, scan.sessionId);
  if (!previous?.results) return "none";

  const { data: setting, error: settingError } = await admin
    .from("monday_brief_settings")
    .select("enabled, last_alert_scan_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!isMissingTableError(settingError)) {
    if (setting?.enabled === false) return "skipped";
    if (setting?.last_alert_scan_id === scan.sessionId) return "none";
  }

  const results = applyManualValues(scan.results, await loadManualValues(admin, userId));
  const values = results.clientValues ?? {};
  const top = new Set(
    Object.entries(values)
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_CLIENTS)
      .map(([id]) => Number(id)),
  );
  const comparison = compareScanFindings(scan.results, previous.results, scan.createdAt, previous.createdAt);
  if (!comparison) return "none";
  const byKey = new Map((results.findings ?? []).map((finding) => [`${finding.clientId}:${finding.type}`, finding]));
  const fresh = comparison.newFindingKeys
    .map((key) => byKey.get(key))
    .filter((finding): finding is NonNullable<typeof finding> => Boolean(finding))
    .filter((finding) => isRiskFinding(finding.type) && top.has(finding.clientId));
  if (fresh.length === 0) return "none";

  const byClient = new Map<number, string[]>();
  for (const finding of fresh) {
    const list = byClient.get(finding.clientId) ?? [];
    list.push(getFindingCopy(finding.type).label);
    byClient.set(finding.clientId, list);
  }
  const rows = [...byClient.entries()]
    .map(([clientId, labels]) => ({
      name: results.clientNames?.[String(clientId)]?.trim() || `Client #${clientId}`,
      annual: Math.round((values[String(clientId)] ?? 0) * 12),
      labels,
    }))
    .sort((a, b) => b.annual - a.annual);

  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const to = authUser.user?.email?.trim();
  if (!to) return "skipped";
  const origin = getAppOrigin();
  const lead = rows[0]!;
  const subject =
    rows.length === 1
      ? `Heads up: ${lead.name} (£${lead.annual.toLocaleString("en-GB")} a year) has changed`
      : `Heads up: ${rows.length} of your biggest clients have changed`;
  const list = rows
    .map(
      (row) =>
        `<li style="margin:6px 0"><strong>${esc(row.name)}</strong> · £${row.annual.toLocaleString("en-GB")} a year<br><span style="color:#3d4b61">${esc(row.labels.join(", "))}</span></li>`,
    )
    .join("");
  const html = `<!doctype html><html><body style="margin:0;background:#eef2f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:14px;padding:26px">
<tr><td style="font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#0284c7">Revenue at Risk alert</td></tr>
<tr><td style="padding-top:10px;font-size:15px;line-height:22px;color:#0b1730">This week's scan found a new warning sign on ${rows.length === 1 ? "one of your ten most valuable clients" : `${rows.length} of your ten most valuable clients`}:</td></tr>
<tr><td><ul style="margin:10px 0 0;padding-left:18px;font-size:14px;line-height:21px;color:#0b1730">${list}</ul></td></tr>
<tr><td style="padding-top:18px"><a href="${origin}/attention" style="display:inline-block;background:#0ea5e9;color:#fff;font-weight:600;font-size:14px;padding:11px 18px;border-radius:8px;text-decoration:none">Open the Save Play</a></td></tr>
<tr><td style="padding-top:18px;font-size:12px;color:#8a97ab">You get these only for new signals on your top ten clients by value. Turn them off with the Monday Brief on the This week page.</td></tr>
</table></td></tr></table></body></html>`;
  const text = `This week's scan found a new warning sign on your biggest clients:\n\n${rows
    .map((row) => `- ${row.name} (£${row.annual.toLocaleString("en-GB")} a year): ${row.labels.join(", ")}`)
    .join("\n")}\n\nOpen the Save Play: ${origin}/attention`;

  const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: `Handover <${getNoreplyMailbox()}>`,
    to,
    subject,
    html,
    text,
  });
  if (error) return "skipped";
  if (!isMissingTableError(settingError)) {
    await admin
      .from("monday_brief_settings")
      .upsert({ user_id: userId, last_alert_scan_id: scan.sessionId }, { onConflict: "user_id" });
  }
  return "sent";
}
