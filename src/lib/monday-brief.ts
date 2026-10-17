/**
 * The Monday Brief: the This week screen as an email, sent after the weekly
 * scan. Plain, scannable, email-client safe (tables and inline styles only),
 * and every number matches the app because both come from the same summary.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

import type { PortfolioSummary } from "@/lib/server/portfolio-summary";
import { WEEK_LIST_TOP, type WeekRow } from "@/lib/week-list";

/** The rows the brief sends: the top of the This week list. */
function briefRows(summary: PortfolioSummary): WeekRow[] {
  return summary.list.rows.slice(0, WEEK_LIST_TOP);
}

function urgentCount(summary: PortfolioSummary): number {
  return briefRows(summary).filter((row) => !row.proactive).length;
}

function money(value: number): string {
  return `£${Math.round(value).toLocaleString("en-GB")}`;
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** ISO week key such as "2026-W42", in UTC. */
export function isoWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function signingKey(): string {
  return process.env.CRON_SECRET?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
}

/** Token for the one-click unsubscribe link; only valid for this user. */
export function briefUnsubscribeToken(userId: string): string {
  return createHmac("sha256", signingKey()).update(`monday-brief:${userId}`).digest("hex").slice(0, 32);
}

/** Token for a one-click action on one finding in one scan, for this user only. */
export function briefActionToken(userId: string, sessionId: string, clientId: number, findingType: string): string {
  return createHmac("sha256", signingKey())
    .update(`brief-action:${userId}:${sessionId}:${clientId}:${findingType}`)
    .digest("hex")
    .slice(0, 32);
}

export function verifyBriefActionToken(
  userId: string,
  sessionId: string,
  clientId: number,
  findingType: string,
  token: string,
): boolean {
  if (!signingKey() || !/^[0-9a-f]{32}$/.test(token)) return false;
  const expected = Buffer.from(briefActionToken(userId, sessionId, clientId, findingType));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function verifyBriefUnsubscribeToken(userId: string, token: string): boolean {
  if (!signingKey() || !/^[0-9a-f]{32}$/.test(token)) return false;
  const expected = Buffer.from(briefUnsubscribeToken(userId));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function mondayBriefSubject(summary: PortfolioSummary): string {
  const count = urgentCount(summary);
  const things = `${count} thing${count === 1 ? "" : "s"} to do this week`;
  if (summary.revenueAtRisk.annual > 0 && count > 0) {
    return `Your Monday Brief: ${money(summary.revenueAtRisk.annual)} a year at risk, ${things}`;
  }
  if (count > 0) return `Your Monday Brief: ${things}`;
  return "Your Monday Brief: nothing urgent this week";
}

export function mondayBriefEmail(
  summary: PortfolioSummary,
  opts: { firstName: string; appOrigin: string; unsubscribeUrl: string; userId?: string },
): { subject: string; html: string; text: string } {
  const s = summary;
  const subject = mondayBriefSubject(s);
  const change =
    s.revenueAtRiskChange == null || Math.round(s.revenueAtRiskChange) === 0
      ? null
      : s.revenueAtRiskChange > 0
        ? `up ${money(s.revenueAtRiskChange)} since last week`
        : `down ${money(Math.abs(s.revenueAtRiskChange))} since last week`;
  const greeting = opts.firstName ? `Morning ${opts.firstName},` : "Morning,";
  const rows = briefRows(s);
  const count = urgentCount(s);
  const intro =
    count === 0
      ? "Nothing urgent this week. Here is what is worth doing while it is quiet."
      : `Here is your week, most valuable first. ${count === 1 ? "One thing needs" : `${count} things need`} you.`;

  const kpis: Array<{ label: string; value: string; note: string }> = [
    {
      label: "Revenue at Risk",
      value: s.revenueAtRisk.annual > 0 ? `${money(s.revenueAtRisk.annual)}/yr` : `${s.revenueAtRisk.clients} clients`,
      note: change ?? `${s.revenueAtRisk.clients} client${s.revenueAtRisk.clients === 1 ? "" : "s"} changed`,
    },
    {
      label: "Renewing in 90 days",
      value: s.renewals90.annual > 0 ? `${money(s.renewals90.annual)}/yr` : `${s.renewals90.count}`,
      note: s.renewals90.atRiskAnnual > 0 ? `${money(s.renewals90.atRiskAnnual)} with warning signs` : "No warning signs",
    },
    {
      label: "Saved Revenue",
      value: `${money(s.savedRevenue.annual)}/yr`,
      note: s.savedRevenue.clients > 0 ? `${s.savedRevenue.clients} client${s.savedRevenue.clients === 1 ? "" : "s"} recovered` : "Grows as clients recover",
    },
  ];

  const link = (path: string) => `${opts.appOrigin}${path}`;
  const handledUrl = (move: WeekRow): string | null =>
    opts.userId && move.kind === "risk" && move.findingType && move.clientId != null
      ? link(
          `/api/brief/action?u=${encodeURIComponent(opts.userId)}&s=${encodeURIComponent(s.scanSessionId)}&c=${move.clientId}&f=${encodeURIComponent(move.findingType)}&t=${briefActionToken(opts.userId, s.scanSessionId, move.clientId!, move.findingType!)}`,
        )
      : null;
  const kpiCells = kpis
    .map(
      (kpi) => `<td style="padding:14px 16px;background:#f5f8fc;border-radius:10px;vertical-align:top;width:33%">
        <div style="font-size:12px;color:#5b6b82">${esc(kpi.label)}</div>
        <div style="font-size:20px;font-weight:700;color:#0b1730;margin-top:4px">${esc(kpi.value)}</div>
        <div style="font-size:12px;color:#5b6b82;margin-top:2px">${esc(kpi.note)}</div>
      </td>`,
    )
    .join('<td style="width:8px"></td>');

  const moveRows = rows
    .map(
      (move, index) => `<tr><td style="padding:12px 0;border-top:1px solid #e6ebf2">
        <div style="font-size:15px;font-weight:600;color:#0b1730">${index + 1}. ${esc(move.clientName)}${
          move.annualValue != null && move.annualValue > 0
            ? ` <span style="font-weight:400;color:#5b6b82">· ${money(move.annualValue)} ${esc(move.valueNote ?? "a year")}</span>`
            : ""
        }</div>
        <div style="font-size:14px;color:#3d4b61;margin-top:2px">${esc(move.why)}${
          move.strength === "strong" ? ' <span style="color:#b45309;font-weight:600">· Strong sign</span>' : ""
        }${move.renewsInDays != null && move.kind === "risk" ? ` · renews in ${move.renewsInDays} days` : ""}</div>
        <a href="${esc(link(move.action.href))}" style="display:inline-block;margin-top:6px;font-size:14px;font-weight:600;color:#0284c7;text-decoration:none">${esc(move.action.label)} →</a>${
          handledUrl(move)
            ? `<a href="${esc(handledUrl(move)!)}" style="display:inline-block;margin:6px 0 0 16px;font-size:13px;color:#5b6b82;text-decoration:none">Already handled ✓</a>`
            : ""
        }
      </td></tr>`,
    )
    .join("");

  const changeLines = [
    ...s.newFlags.slice(0, 4).map((item) => `<li style="margin:2px 0">New: <strong>${esc(item.clientName)}</strong> · ${esc(item.label)}</li>`),
    ...s.clearedFlags.slice(0, 4).map((item) => `<li style="margin:2px 0">Cleared: <strong>${esc(item.clientName)}</strong> · ${esc(item.label)}</li>`),
  ].join("");

  const readinessGap = s.readiness.items.find((item) => item.level !== "ready" && item.fix);

  const html = `<!doctype html><html><body style="margin:0;background:#eef2f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:24px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;padding:28px">
    <tr><td style="font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#0284c7">The Monday Brief</td></tr>
    <tr><td style="padding-top:10px;font-size:16px;color:#0b1730">${esc(greeting)}</td></tr>
    <tr><td style="padding-top:6px;font-size:15px;line-height:22px;color:#3d4b61">${esc(intro)}</td></tr>
    <tr><td style="padding-top:18px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${kpiCells}</tr></table></td></tr>
    ${
      rows.length > 0
        ? `<tr><td style="padding-top:22px;font-size:16px;font-weight:700;color:#0b1730">This week</td></tr>
    <tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${moveRows}</table></td></tr>`
        : ""
    }
    ${
      changeLines
        ? `<tr><td style="padding-top:18px;font-size:16px;font-weight:700;color:#0b1730">Since last week</td></tr>
    <tr><td><ul style="margin:6px 0 0;padding-left:18px;font-size:14px;line-height:21px;color:#3d4b61">${changeLines}</ul></td></tr>`
        : ""
    }
    ${
      readinessGap
        ? `<tr><td style="padding-top:18px;font-size:13px;line-height:20px;color:#5b6b82"><strong style="color:#3d4b61">One data fix worth doing:</strong> ${esc(readinessGap.fix ?? "")}</td></tr>`
        : ""
    }
    <tr><td style="padding-top:22px"><a href="${esc(link("/week"))}" style="display:inline-block;background:#0ea5e9;color:#ffffff;font-weight:600;font-size:14px;padding:11px 18px;border-radius:8px;text-decoration:none">Open your week in Handover</a></td></tr>
    <tr><td style="padding-top:22px;font-size:12px;line-height:18px;color:#8a97ab">Built from your PSA scan on ${esc(
      new Date(s.scannedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" }),
    )}. Every number links back to the records behind it in Handover.<br><a href="${esc(opts.unsubscribeUrl)}" style="color:#8a97ab">Stop these emails</a></td></tr>
  </table></td></tr></table></body></html>`;

  const text = [
    greeting,
    "",
    intro,
    "",
    ...kpis.map((kpi) => `${kpi.label}: ${kpi.value} (${kpi.note})`),
    "",
    ...(rows.length > 0
      ? [
          "This week:",
          ...rows.map(
            (move, index) =>
              `${index + 1}. ${move.clientName}${move.annualValue ? ` (${money(move.annualValue)} ${move.valueNote ?? "a year"})` : ""}: ${move.why}. ${move.action.label}: ${link(move.action.href)}`,
          ),
          "",
        ]
      : []),
    ...(s.newFlags.length + s.clearedFlags.length > 0
      ? [
          "Since last week:",
          ...s.newFlags.slice(0, 4).map((item) => `New: ${item.clientName}, ${item.label}`),
          ...s.clearedFlags.slice(0, 4).map((item) => `Cleared: ${item.clientName}, ${item.label}`),
          "",
        ]
      : []),
    `Open your week: ${link("/week")}`,
    "",
    `Stop these emails: ${opts.unsubscribeUrl}`,
  ].join("\n");

  return { subject, html, text };
}
