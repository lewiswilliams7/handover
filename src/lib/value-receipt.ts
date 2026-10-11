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
  /** Data gaps for the MSP to fix in their PSA. Shown in the app, never on the receipt. */
  dataWarnings: string[];
  /** Whether this receipt covers a month or a quarter. */
  period: "month" | "quarter";
  /** Requests resolved per month, up to and including this period (oldest first). */
  trend: Array<{ month: string; label: string; resolved: number; current: boolean }>;
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
function speedNote(
  current: number | null,
  baseline: number | null,
  noun: "month" | "quarter" = "month",
): string | undefined {
  if (current == null || baseline == null || baseline <= 0) return undefined;
  const against = noun === "quarter" ? "last quarter" : "recent months";
  const change = (current - baseline) / baseline;
  if (change <= -0.15) return `Faster than ${against}, down from ${formatDuration(baseline)}`;
  if (change >= 0.15) return `Slower than ${against}, up from ${formatDuration(baseline)}`;
  return `In line with ${against}`;
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
  /** Overrides for quarterly receipts. */
  periodLabel?: string;
  periodNoun?: "month" | "quarter";
  /** Real monthly history for the trend chart, and which months are "this period". */
  trendSource?: { client: ClientMonthly; currentMonths: string[] };
}): ValueReceipt | null {
  const { client, clientName, month } = input;
  const noun = input.periodNoun ?? "month";
  const index = client.months.findIndex((m) => m.month === month);
  if (index < 0) return null;
  const stats: ClientMonthStats = client.months[index]!;
  const previous = client.months.slice(Math.max(0, index - 3), index);
  const periodLabel = input.periodLabel ?? monthLabel(month);

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
  // Timing stats only appear when enough of the month's tickets were measured
  // (see client-monthly.ts); a receipt never shows a number it cannot back up.
  if (stats.firstResponseHours != null) {
    receiptStats.push({
      key: "response",
      label: "Typical first response",
      value: formatDuration(stats.firstResponseHours),
      note: speedNote(stats.firstResponseHours, baselineResponse, noun),
    });
  }
  if (stats.resolutionHours != null) {
    receiptStats.push({
      key: "resolution",
      label: "Typical time to resolve",
      value: formatDuration(stats.resolutionHours),
      note: speedNote(stats.resolutionHours, baselineResolution, noun),
    });
  }
  if (stats.peopleHelped > 0) {
    receiptStats.push({
      key: "people",
      label: "People who asked us for help",
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
  const responseNote = speedNote(stats.firstResponseHours, baselineResponse, noun);
  if (stats.firstResponseHours != null) {
    summary.push(
      `Your team usually heard back from us within ${formatDuration(stats.firstResponseHours)}${
        responseNote?.startsWith("Faster")
          ? `, quicker than ${noun === "quarter" ? "last quarter" : "in recent months"}`
          : responseNote?.startsWith("Slower")
            ? `, a little slower than ${noun === "quarter" ? "last quarter" : "in recent months"}`
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
      `${plural(stats.openAtEnd, "request was", "requests were")} still in progress at the end of the ${noun}. We will keep you updated on ${stats.openAtEnd === 1 ? "it" : "each one"}.`,
    );
  } else if (stats.closed > 0) {
    summary.push(`Nothing was left outstanding at the end of the ${noun}.`);
  }

  return {
    clientId: client.clientId,
    clientName,
    month,
    periodLabel,
    headline,
    stats: receiptStats,
    summary,
    // Older scans stored Halo type ids ("1"); never show a bare number as a kind of work.
    workTypes: stats.topTypes.filter((entry) => !/^\d+$/.test(entry.type.trim())),
    inProgress: stats.openAtEnd,
    sendable,
    unsendableReason,
    hoursTracked,
    dataWarnings: receiptDataWarnings(stats, noun),
    period: noun,
    trend: receiptTrend(input.trendSource ?? { client, currentMonths: [month] }),
  };
}

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Up to six months ending with the period shown, so the client sees the pattern, not one number. */
function receiptTrend(source: { client: ClientMonthly; currentMonths: string[] }): ValueReceipt["trend"] {
  const last = [...source.currentMonths].sort().at(-1);
  if (!last || !/^\d{4}-\d{2}$/.test(last)) return [];
  return source.client.months
    .filter((m) => m.month <= last)
    .slice(-6)
    .map((m) => ({
      month: m.month,
      label: MONTH_ABBR[Number(m.month.slice(5, 7)) - 1] ?? m.month,
      resolved: m.closed,
      current: source.currentMonths.includes(m.month),
    }));
}

function receiptDataWarnings(stats: ClientMonthStats, noun: "month" | "quarter" = "month"): string[] {
  const warnings: string[] = [];
  const undated = stats.closedUndated ?? 0;
  if (undated > 0) {
    warnings.push(
      `${plural(undated, "request", "requests")} raised this ${noun} ${undated === 1 ? "is" : "are"} closed in your PSA but ${undated === 1 ? "has" : "have"} no close date, so ${undated === 1 ? "it is" : "they are"} not counted as resolved. Make sure tickets get a close date when they are closed, then refresh.`,
    );
  }
  return warnings;
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
      `Most of the work this ${receipt.period}: ${receipt.workTypes
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
  opts: { mspName: string; senderName: string; accent?: string | null; logoUrl?: string | null },
): string {
  const accent = opts.accent && /^#[0-9a-f]{6}$/i.test(opts.accent) ? opts.accent : "#0f1c3f";
  const msp = escapeHtml(opts.mspName.trim() || "Your IT partner");
  const font = "-apple-system,Segoe UI,Arial,sans-serif";
  const logo =
    opts.logoUrl && /^https:\/\//.test(opts.logoUrl.trim())
      ? `<img src="${escapeHtml(opts.logoUrl.trim())}" alt="${msp}" height="32" style="display:block;max-height:32px;width:auto;border:0;">`
      : `<span style="font:700 15px ${font};color:#0f172a;">${msp}</span>`;

  // Two stats per row: label, big value, note.
  const tiles = receipt.stats.map(
    (stat) => `<td width="50%" valign="top" style="padding:6px;">
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;">
        <div style="font:12px ${font};color:#64748b;">${escapeHtml(stat.label)}</div>
        <div style="font:700 24px/1.2 ${font};color:#0f172a;margin-top:4px;">${escapeHtml(stat.value)}</div>
        ${stat.note ? `<div style="font:12px/1.4 ${font};color:#64748b;margin-top:4px;">${escapeHtml(stat.note)}</div>` : ""}
      </div></td>`,
  );
  const tileRows: string[] = [];
  for (let i = 0; i < tiles.length; i += 2) tileRows.push(`<tr>${tiles[i]}${tiles[i + 1] ?? '<td width="50%"></td>'}</tr>`);

  // Bar chart of requests resolved per month, built from table cells so it renders in every inbox.
  const max = Math.max(1, ...receipt.trend.map((point) => point.resolved));
  const trend =
    receipt.trend.length >= 2
      ? `<tr><td style="padding:20px 32px 0;">
      <div style="font:600 14px ${font};color:#0f172a;margin-bottom:10px;">Requests resolved, month by month</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${receipt.trend
        .map((point) => {
          const height = Math.max(4, Math.round((point.resolved / max) * 72));
          return `<td valign="bottom" align="center" style="padding:0 4px;">
            <div style="font:600 12px ${font};color:${point.current ? "#0f172a" : "#94a3b8"};margin-bottom:4px;">${point.resolved}</div>
            <div style="height:${height}px;background:${point.current ? accent : "#cbd5e1"};border-radius:4px 4px 0 0;"></div>
            <div style="font:11px ${font};color:#64748b;margin-top:6px;">${escapeHtml(point.label)}</div>
          </td>`;
        })
        .join("")}</tr></table></td></tr>`
      : "";

  const totalTypes = receipt.workTypes.reduce((sum, type) => sum + type.count, 0);
  const types =
    receipt.workTypes.length > 0
      ? `<tr><td style="padding:20px 32px 0;">
      <div style="font:600 14px ${font};color:#0f172a;margin-bottom:10px;">Where the work went</div>
      ${receipt.workTypes
        .map((type) => {
          const pct = totalTypes > 0 ? Math.round((type.count / totalTypes) * 100) : 0;
          return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;"><tr>
            <td style="font:13px ${font};color:#334155;width:40%;">${escapeHtml(type.type)}</td>
            <td style="width:45%;"><div style="background:#e2e8f0;border-radius:4px;height:8px;"><div style="width:${pct}%;background:${accent};height:8px;border-radius:4px;"></div></div></td>
            <td style="font:600 13px ${font};color:#0f172a;text-align:right;width:15%;">${type.count}</td>
          </tr></table>`;
        })
        .join("")}</td></tr>`
      : "";

  const summary = receipt.summary
    .map((line) => `<li style="margin:0 0 6px;font:14px/1.6 ${font};color:#334155;">${escapeHtml(line)}</li>`)
    .join("");
  const signature = escapeHtml(opts.senderName.trim() || opts.mspName.trim() || "The team");
  const nextPeriod = receipt.period === "quarter" ? "next quarter" : "next month";

  return `<!doctype html><html><body style="margin:0;padding:24px 12px;background:#f1f5f9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;">
    <tr><td style="height:6px;background:${accent};"></td></tr>
    <tr><td style="padding:24px 32px 0;">
      <table role="presentation" width="100%"><tr>
        <td valign="middle">${logo}</td>
        <td valign="middle" style="font:12px ${font};color:#64748b;text-align:right;text-transform:uppercase;letter-spacing:.08em;">Service summary<br><span style="font:600 13px ${font};color:#0f172a;text-transform:none;letter-spacing:0;">${escapeHtml(receipt.periodLabel)}</span></td>
      </tr></table>
      <div style="font:700 26px/1.25 ${font};color:#0f172a;margin:26px 0 6px;">${escapeHtml(receipt.clientName)}</div>
      <div style="font:16px/1.55 ${font};color:#334155;">${escapeHtml(receipt.headline)}</div>
    </td></tr>
    <tr><td style="padding:16px 26px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${tileRows.join("")}</table></td></tr>
    ${trend}
    ${types}
    ${summary ? `<tr><td style="padding:20px 32px 0;"><div style="font:600 14px ${font};color:#0f172a;margin-bottom:8px;">In summary</div><ul style="margin:0;padding-left:18px;">${summary}</ul></td></tr>` : ""}
    <tr><td style="padding:22px 32px 28px;">
      <p style="margin:0 0 12px;font:14px/1.6 ${font};color:#475569;">If anything here does not match your experience, or there is something you would like us to focus on ${nextPeriod}, just reply to this email.</p>
      <p style="margin:0;font:14px/1.6 ${font};color:#0f172a;">Best regards,<br>${signature}${
        opts.senderName.trim() && opts.mspName.trim() ? `<br><span style="color:#64748b;">${msp}</span>` : ""
      }</p>
    </td></tr>
    <tr><td style="padding:12px 32px;background:#f8fafc;font:11px ${font};color:#94a3b8;">Prepared by ${msp} from the service records for ${escapeHtml(receipt.clientName)}.</td></tr>
  </table>
</body></html>`;
}

export type ReceiptQuarter = { key: string; label: string; months: string[] };

const MONTH_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Calendar quarters fully covered by complete months, newest first. */
export function receiptQuarters(client: ClientMonthly, currentMonth: string): ReceiptQuarter[] {
  const complete = new Set(client.months.map((m) => m.month).filter((m) => m < currentMonth));
  const quarters = new Map<string, string[]>();
  for (const key of complete) {
    const [y, m] = key.split("-").map(Number);
    const q = Math.floor((m! - 1) / 3);
    const quarterMonths = [0, 1, 2].map((offset) => `${y}-${String(q * 3 + offset + 1).padStart(2, "0")}`);
    if (quarterMonths.every((month) => complete.has(month))) quarters.set(`Q:${quarterMonths.join(",")}`, quarterMonths);
  }
  return [...quarters.entries()]
    .sort((a, b) => b[1][0]!.localeCompare(a[1][0]!))
    .map(([key, months]) => {
      const [y, first] = months[0]!.split("-").map(Number);
      const last = Number(months[2]!.split("-")[1]);
      return { key, months, label: `${MONTH_FULL[first! - 1]} to ${MONTH_FULL[last - 1]} ${y}` };
    });
}

function weighted(values: Array<{ value: number | null; weight: number }>): number | null {
  const usable = values.filter((entry) => entry.value != null && entry.weight > 0);
  const total = usable.reduce((sum, entry) => sum + entry.weight, 0);
  if (usable.length === 0 || total === 0) return null;
  return Math.round((usable.reduce((sum, entry) => sum + entry.value! * entry.weight, 0) / total) * 10) / 10;
}

/** Several months as one: counts add up, typical times are weighted by volume. */
function mergeMonths(months: ClientMonthStats[], key: string): ClientMonthStats {
  const types = new Map<string, number>();
  for (const month of months) for (const t of month.topTypes) types.set(t.type, (types.get(t.type) ?? 0) + t.count);
  return {
    month: key,
    opened: months.reduce((sum, m) => sum + m.opened, 0),
    closed: months.reduce((sum, m) => sum + m.closed, 0),
    urgentClosed: months.reduce((sum, m) => sum + m.urgentClosed, 0),
    firstResponseHours: weighted(months.map((m) => ({ value: m.firstResponseHours, weight: m.opened }))),
    resolutionHours: weighted(months.map((m) => ({ value: m.resolutionHours, weight: m.closed }))),
    outOfHours: months.reduce((sum, m) => sum + m.outOfHours, 0),
    // People cannot be added across months without double counting, so leave it out.
    peopleHelped: 0,
    hours: Math.round(months.reduce((sum, m) => sum + m.hours, 0) * 10) / 10,
    closedWithHours: months.reduce((sum, m) => sum + m.closedWithHours, 0),
    openAtEnd: months.at(-1)?.openAtEnd ?? 0,
    closedUndated: months.reduce((sum, m) => sum + (m.closedUndated ?? 0), 0),
    topTypes: [...types.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 3)
      .map(([type, count]) => ({ type, count })),
  };
}

/**
 * A quarterly receipt: three complete months as one page, compared with the
 * quarter before when the scan holds it. Ready to use as the opening page of a
 * quarterly business review.
 */
export function buildQuarterReceipt(input: {
  client: ClientMonthly;
  clientName: string;
  quarter: ReceiptQuarter;
}): ValueReceipt | null {
  const byMonth = new Map(input.client.months.map((m) => [m.month, m]));
  const current = input.quarter.months.map((m) => byMonth.get(m)).filter((m): m is ClientMonthStats => Boolean(m));
  if (current.length !== 3) return null;
  const previousKeys = input.quarter.months.map((m) => {
    const [y, mo] = m.split("-").map(Number);
    const d = new Date(Date.UTC(y!, mo! - 1 - 3, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
  const previous = previousKeys.map((m) => byMonth.get(m)).filter((m): m is ClientMonthStats => Boolean(m));
  const months = [
    ...(previous.length === 3 ? [mergeMonths(previous, "previous")] : []),
    mergeMonths(current, "quarter"),
  ];
  return buildValueReceipt({
    client: { clientId: input.client.clientId, months },
    clientName: input.clientName,
    month: "quarter",
    periodLabel: input.quarter.label,
    periodNoun: "quarter",
    trendSource: { client: input.client, currentMonths: input.quarter.months },
  });
}
