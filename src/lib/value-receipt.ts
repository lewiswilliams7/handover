/**
 * Value Receipts™
 *
 * A one-page monthly summary for a client's decision-maker: what we handled,
 * how quickly, and what is still in progress. Built only from the PSA figures
 * in the scan's monthly summary, so every number can be traced and nothing is
 * invented. Wording is plain, client-facing and never mentions Handover, the
 * scan, contract values or internal targets.
 */
import type { ClientMonthStats, ClientMonthly } from "@/lib/psa/client-monthly";

export type ReceiptStat = {
  key: string;
  label: string;
  value: string;
  /** Plain-English comparison with the previous three months, when meaningful. */
  note?: string;
};

export type ValueReceipt = {
  clientId: number;
  clientName: string;
  /** YYYY-MM. */
  month: string;
  /** e.g. "September 2026". */
  periodLabel: string;
  /** One sentence that sums up the month for the client. */
  headline: string;
  stats: ReceiptStat[];
  /** Short paragraphs, in order. */
  summary: string[];
  /** Most common kinds of work this month. */
  workTypes: Array<{ type: string; count: number }>;
  /** Requests still open at the end of the month. */
  inProgress: number;
  /** False when there is too little activity to be worth sending. */
  sendable: boolean;
  unsendableReason: string | null;
  /** True when hours are recorded on most closed tickets, so the hours stat is shown. */
  hoursTracked: boolean;
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function monthLabel(month: string): string {
  const year = month.slice(0, 4);
  const index = Number(month.slice(5, 7)) - 1;
  return `${MONTH_NAMES[index] ?? month} ${year}`;
}

function plural(n: number, one: string, many: string): string {
  return `${n.toLocaleString("en-GB")} ${n === 1 ? one : many}`;
}

export function formatDuration(hours: number | null): string {
  if (hours == null) return "Not recorded";
  if (hours < 1) {
    const minutes = Math.max(1, Math.round(hours * 60));
    return `${minutes} min`;
  }
  if (hours < 48) {
    const rounded = Math.round(hours * 10) / 10;
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} hr`;
  }
  const days = Math.round((hours / 24) * 10) / 10;
  return `${days % 1 === 0 ? days.toFixed(0) : days.toFixed(1)} days`;
}

function formatHoursWorked(hours: number): string {
  const rounded = Math.round(hours * 2) / 2;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} hours`;
}

function average(values: Array<number | null>): number | null {
  const present = values.filter((value): value is number => value != null);
  if (present.length === 0) return null;
  return present.reduce((sum, value) => sum + value, 0) / present.length;
}

/**
 * Compare this month's time with the recent average. Only says "faster" or
 * "slower" when the change is at least 15%, so normal noise reads as steady.
 */
function speedNote(current: number | null, baseline: number | null): string | undefined {
  if (current == null || baseline == null || baseline <= 0) return undefined;
  const change = (current - baseline) / baseline;
  if (change <= -0.15) return `Faster than recent months, down from ${formatDuration(baseline)}`;
  if (change >= 0.15) return `Slower than recent months, up from ${formatDuration(baseline)}`;
  return "In line with recent months";
}

/** Complete months available for a receipt, newest first. */
export function receiptMonths(client: ClientMonthly, currentMonth: string): string[] {
  return client.months
    .map((month) => month.month)
    .filter((month) => month < currentMonth)
    .reverse();
}

export function buildValueReceipt(input: {
  client: ClientMonthly;
  clientName: string;
  month: string;
}): ValueReceipt | null {
  const { client, clientName, month } = input;
  const index = client.months.findIndex((m) => m.month === month);
  if (index < 0) return null;
  const stats: ClientMonthStats = client.months[index]!;
  const previous = client.months.slice(Math.max(0, index - 3), index);
  const periodLabel = monthLabel(month);

  const baselineResponse = average(previous.map((m) => m.firstResponseHours));
  const baselineResolution = average(previous.map((m) => m.resolutionHours));
  const hoursTracked = stats.closed > 0 && stats.closedWithHours / stats.closed >= 0.6 && stats.hours > 0;

  const activity = stats.opened + stats.closed;
  const sendable = activity >= 1;
  const unsendableReason = sendable
    ? null
    : `No requests were raised or resolved for ${clientName} in ${periodLabel}. A receipt with no activity is better replaced by a short check-in.`;

  const receiptStats: ReceiptStat[] = [
    {
      key: "resolved",
      label: "Requests resolved",
      value: stats.closed.toLocaleString("en-GB"),
      note:
        stats.urgentClosed > 0
          ? `Including ${plural(stats.urgentClosed, "urgent issue", "urgent issues")}`
          : undefined,
    },
  ];
  if (hoursTracked) {
    receiptStats.push({
      key: "hours",
      label: "Time spent on your requests",
      value: formatHoursWorked(stats.hours),
    });
  }
  receiptStats.push({
    key: "response",
    label: "Typical first response",
    value: formatDuration(stats.firstResponseHours),
    note: speedNote(stats.firstResponseHours, baselineResponse),
  });
  receiptStats.push({
    key: "resolution",
    label: "Typical time to resolve",
    value: formatDuration(stats.resolutionHours),
    note: speedNote(stats.resolutionHours, baselineResolution),
  });
  if (stats.peopleHelped > 0) {
    receiptStats.push({
      key: "people",
      label: "People in your team we helped",
      value: stats.peopleHelped.toLocaleString("en-GB"),
    });
  }
  if (stats.outOfHours > 0) {
    receiptStats.push({
      key: "outOfHours",
      label: "Raised outside office hours",
      value: stats.outOfHours.toLocaleString("en-GB"),
    });
  }

  const headlineParts = [`We resolved ${plural(stats.closed, "request", "requests")} for ${clientName} in ${periodLabel}`];
  if (stats.urgentClosed > 0) {
    headlineParts.push(`including ${plural(stats.urgentClosed, "urgent issue", "urgent issues")}`);
  }
  const headline = `${headlineParts.join(", ")}.`;

  const summary: string[] = [];
  const responseNote = speedNote(stats.firstResponseHours, baselineResponse);
  if (stats.firstResponseHours != null) {
    summary.push(
      `Your team usually heard back from us within ${formatDuration(stats.firstResponseHours)}${
        responseNote?.startsWith("Faster")
          ? ", quicker than in recent months"
          : responseNote?.startsWith("Slower")
            ? ". That is slower than in recent months, and we are looking at why"
            : ""
      }.`,
    );
  }
  if (stats.resolutionHours != null) {
    summary.push(`Most issues were fully resolved within ${formatDuration(stats.resolutionHours)}.`);
  }
  if (stats.outOfHours > 0) {
    summary.push(
      `${plural(stats.outOfHours, "request was", "requests were")} raised outside office hours.`,
    );
  }
  if (stats.openAtEnd > 0) {
    summary.push(
      `${plural(stats.openAtEnd, "request was", "requests were")} still in progress at the end of the month. We will keep you updated on ${stats.openAtEnd === 1 ? "it" : "each one"}.`,
    );
  } else if (stats.closed > 0) {
    summary.push("Nothing was left outstanding at the end of the month.");
  }

  return {
    clientId: client.clientId,
    clientName,
    month,
    periodLabel,
    headline,
    stats: receiptStats,
    summary,
    workTypes: stats.topTypes,
    inProgress: stats.openAtEnd,
    sendable,
    unsendableReason,
    hoursTracked,
  };
}

/** Plain-text version for email and copying. */
export function valueReceiptText(
  receipt: ValueReceipt,
  opts: { mspName: string; senderName: string },
): { subject: string; body: string } {
  const lines: string[] = [];
  lines.push("Hi,");
  lines.push("");
  lines.push(`Here is a short summary of the support we provided to ${receipt.clientName} in ${receipt.periodLabel}.`);
  lines.push("");
  lines.push(receipt.headline);
  lines.push("");
  for (const stat of receipt.stats) {
    lines.push(`${stat.label}: ${stat.value}${stat.note ? `. ${stat.note}.` : ""}`);
  }
  if (receipt.workTypes.length > 0) {
    lines.push("");
    lines.push(
      `Most of the work this month: ${receipt.workTypes
        .map((type) => `${type.type} (${type.count})`)
        .join(", ")}.`,
    );
  }
  if (receipt.summary.length > 0) {
    lines.push("");
    lines.push(...receipt.summary);
  }
  lines.push("");
  lines.push("If anything here does not match your experience, or there is something you would like us to focus on next month, just reply to this email.");
  lines.push("");
  lines.push("Best regards,");
  lines.push(opts.senderName.trim() || opts.mspName);
  if (opts.senderName.trim() && opts.mspName.trim()) lines.push(opts.mspName.trim());
  return {
    subject: `Your ${receipt.periodLabel} service summary${opts.mspName.trim() ? ` from ${opts.mspName.trim()}` : ""}`,
    body: lines.join("\n"),
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Email-safe HTML version (tables and inline styles only) for the monthly send.
 * `accent` must be a #rrggbb colour; anything else falls back to navy.
 */
export function valueReceiptHtml(
  receipt: ValueReceipt,
  opts: { mspName: string; senderName: string; accent?: string | null },
): string {
  const accent = opts.accent && /^#[0-9a-f]{6}$/i.test(opts.accent) ? opts.accent : "#0f1c3f";
  const msp = escapeHtml(opts.mspName.trim() || "Your IT partner");
  const statRows = receipt.stats
    .map(
      (stat) => `<tr>
        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;font:14px/1.4 -apple-system,Segoe UI,Arial,sans-serif;color:#475569;">${escapeHtml(stat.label)}${
          stat.note
            ? `<div style="font-size:12px;color:#94a3b8;margin-top:2px;">${escapeHtml(stat.note)}</div>`
            : ""
        }</td>
        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;font:600 18px/1.4 -apple-system,Segoe UI,Arial,sans-serif;color:#0f172a;text-align:right;white-space:nowrap;">${escapeHtml(stat.value)}</td>
      </tr>`,
    )
    .join("");
  const summary = receipt.summary
    .map(
      (line) =>
        `<p style="margin:0 0 8px;font:15px/1.6 -apple-system,Segoe UI,Arial,sans-serif;color:#334155;">${escapeHtml(line)}</p>`,
    )
    .join("");
  const types =
    receipt.workTypes.length > 0
      ? `<p style="margin:16px 0 0;font:14px/1.6 -apple-system,Segoe UI,Arial,sans-serif;color:#475569;"><strong style="color:#0f172a;">Where the work went:</strong> ${receipt.workTypes
          .map((type) => `${escapeHtml(type.type)} (${type.count})`)
          .join(", ")}</p>`
      : "";
  const signature = escapeHtml(opts.senderName.trim() || opts.mspName.trim() || "The team");

  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f1f5f9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
    <tr><td style="height:6px;background:${accent};"></td></tr>
    <tr><td style="padding:28px 32px 8px;">
      <table role="presentation" width="100%"><tr>
        <td style="font:600 14px -apple-system,Segoe UI,Arial,sans-serif;color:#0f172a;">${msp}</td>
        <td style="font:13px -apple-system,Segoe UI,Arial,sans-serif;color:#64748b;text-align:right;">Service summary, ${escapeHtml(receipt.periodLabel)}</td>
      </tr></table>
      <h1 style="margin:24px 0 8px;font:600 26px/1.25 -apple-system,Segoe UI,Arial,sans-serif;color:#0f172a;">${escapeHtml(receipt.clientName)}</h1>
      <p style="margin:0 0 16px;font:17px/1.5 -apple-system,Segoe UI,Arial,sans-serif;color:#334155;">${escapeHtml(receipt.headline)}</p>
    </td></tr>
    <tr><td style="padding:0 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${statRows}</table></td></tr>
    <tr><td style="padding:20px 32px 8px;">${summary}${types}</td></tr>
    <tr><td style="padding:16px 32px 28px;">
      <p style="margin:0 0 12px;font:14px/1.6 -apple-system,Segoe UI,Arial,sans-serif;color:#475569;">If anything here does not match your experience, or there is something you would like us to focus on next month, just reply to this email.</p>
      <p style="margin:0;font:14px/1.6 -apple-system,Segoe UI,Arial,sans-serif;color:#0f172a;">Best regards,<br>${signature}${
        opts.senderName.trim() && opts.mspName.trim() ? `<br><span style="color:#64748b;">${msp}</span>` : ""
      }</p>
    </td></tr>
  </table>
</body></html>`;
}
