import { getAppOrigin } from "@/lib/app-url";
import type { NormalizedEmailContentPrefs } from "@/lib/scheduled-email-prefs";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type ActionRow = { task?: string; suggested_owner?: string | null; priority?: string | null };

/** Appended to scheduled /api/generate user message (system prompt already includes global style rules). */
export const SCHEDULED_CRITICAL_LANGUAGE_RULES = `CRITICAL LANGUAGE RULES (scheduled template):
- No phrases: 'it is worth noting', 'it should be highlighted', 'it is important to note', 'moving forward', 'going forward', 'at this juncture', 'leverage', 'utilise' (use 'use' instead)
- Write like a senior PM, not AI
- Short sentences under 20 words
- Active voice not passive
- Specific not vague:
  Wrong: 'work is progressing'
  Right: 'migration is 60% complete'
- Numbers where possible`;

/** Passed to /api/generate for scheduled reports (cron send + live preview). Must stay in sync with send. */
export const SCHEDULED_CRON_TEMPLATE_CONTEXT = `${SCHEDULED_CRITICAL_LANGUAGE_RULES}

NOTE READING RULES:
Ignore any notes that are how-to guides, reference documents, or instructional content. Focus only on notes that describe project progress, outstanding tasks, decisions, or status updates. If a note reads as a reference guide or training document rather than a project update, exclude it entirely from your analysis.
Ticket notes are listed chronologically, oldest first.
The most recent notes are the most important because they reflect current state.
Always prioritise recent notes when summarising status.
If a recent note says work is scheduled or completed, it overrides older notes saying pending.
Read all notes, but weight recent notes more heavily for current status.

Write in plain professional English. Short sentences. Direct language.`;

/** External reports use clean professional HTML; internal and note-to-self use branded digest. */
export function scheduledEmailFormatFromReportType(
  reportType: "external" | "internal" | "note_to_self" | "qbr",
): "professional" | "digest" {
  return reportType === "external" ? "professional" : "digest";
}

/** Static HTML for preview when no schedule is selected (no Halo / generate). */
export function buildSampleEmailHtml(): string {
  const sampleOutputs: Record<string, unknown> = {
    summary:
      "Here is a short sample of how your weekly update will read. Key work completed on backups and patching. Two items need a decision by Friday.",
    actions: [
      { task: "Approve firewall change window for Client A", suggested_owner: "Sam", priority: "High" },
      { task: "Confirm licence renewal for backup product", suggested_owner: "Unassigned", priority: "Medium" },
    ],
    risks: [
      { risk: "VPN concentrator at end of support", impact: "Outage risk if hardware fails" },
    ],
    status_report:
      "PROJECT STATUS: Contoso migration - On track for cutover next week.\n\n3. Confirm DNS cutover with the client.\n\nOverall delivery remains stable with no blockers on our side.",
  };
  return buildScheduledReportEmailHtml(sampleOutputs, {
    weekEnding: "1 April 2026",
    ticketCount: 12,
    clientCount: 4,
    prefs: {
      include_actions: true,
      include_risks: true,
      include_client_emails: false,
      include_status: true,
    },
    attachExcel: true,
    reportType: "external",
    recipientName: "Alex",
    brandName: "Handover",
    appUrl: getAppOrigin(),
    excelTabCount: 6,
  });
}

/** Split client_email into per-client sections when marked with --- Name --- */
export function parseClientEmailSections(raw: string): { heading: string; body: string }[] {
  const t = raw.trim();
  if (!t) return [];
  const re = /---\s*([^-\n]+?)\s*---/g;
  const markers: { start: number; end: number; title: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) !== null) {
    markers.push({ start: m.index, end: re.lastIndex, title: m[1].trim() });
  }
  if (markers.length === 0) {
    return [{ heading: "Client email draft", body: t }];
  }
  const out: { heading: string; body: string }[] = [];
  const pre = t.slice(0, markers[0].start).trim();
  if (pre) {
    out.push({ heading: "Overview", body: pre });
  }
  for (let i = 0; i < markers.length; i++) {
    const bodyStart = markers[i].end;
    const bodyEnd = i + 1 < markers.length ? markers[i + 1].start : t.length;
    const body = t.slice(bodyStart, bodyEnd).trim();
    out.push({
      heading: markers[i].title,
      body: body || "(No body)",
    });
  }
  return out;
}

function parseStatusPipeTable(text: string): { project: string; status: string; rag: string }[] | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const rows: { project: string; status: string; rag: string }[] = [];
  for (const line of lines.slice(0, 40)) {
    if (!line.includes("|")) continue;
    const parts = line.split("|").map((c) => c.trim());
    if (parts.length < 3) continue;
    const lower = parts[0]?.toLowerCase() ?? "";
    if (
      lower === "project" &&
      (parts[1]?.toLowerCase().includes("status") || parts[2]?.toLowerCase().includes("rag"))
    )
      continue;
    rows.push({
      project: parts[0] ?? "",
      status: parts[1] ?? "",
      rag: parts[2] ?? "",
    });
  }
  return rows.length > 0 ? rows : null;
}

function renderInternalStatusSections(statusReport: string): string {
  if (!statusReport.trim()) return "";
  const lines = statusReport.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const sections: Record<"PROJECT STATUS" | "PROGRESS" | "RISKS AND ISSUES" | "NEXT STEPS", string[]> = {
    "PROJECT STATUS": [],
    PROGRESS: [],
    "RISKS AND ISSUES": [],
    "NEXT STEPS": [],
  };
  const sectionsToSkip = ["ACTIONS:", "ACTIONS"];
  let current: "PROJECT STATUS" | "PROGRESS" | "RISKS AND ISSUES" | "NEXT STEPS" | null = null;
  for (const line of lines) {
    const upper = line.toUpperCase();
    if (sectionsToSkip.includes(upper)) {
      current = null;
      continue;
    }
    if (upper.startsWith("PROJECT STATUS:")) {
      current = "PROJECT STATUS";
      const value = line.slice(line.indexOf(":") + 1).trim();
      if (value) sections[current].push(value);
      continue;
    }
    if (upper.startsWith("PROGRESS:")) {
      current = "PROGRESS";
      const value = line.slice(line.indexOf(":") + 1).trim();
      if (value) sections[current].push(value);
      continue;
    }
    if (upper.startsWith("RISKS AND ISSUES:") || upper.startsWith("RISKS:")) {
      current = "RISKS AND ISSUES";
      continue;
    }
    if (upper.startsWith("NEXT STEPS:")) {
      current = "NEXT STEPS";
      continue;
    }
    if (current) sections[current].push(line);
  }

  const headingStyle =
    "font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#888;margin:16px 0 8px;";

  const projectStatusHtml = sections["PROJECT STATUS"]
    .map((row) => `<p style="margin:0 0 8px;color:#1a1a1a;">${escapeHtml(row)}</p>`)
    .join("");

  const progressHtml = sections.PROGRESS
    .map((row) => `<p style="margin:0 0 8px;color:#1a1a1a;">${escapeHtml(row.replace(/^\d+\.\s*/, "").trim())}</p>`)
    .join("");

  const risksRows = sections["RISKS AND ISSUES"].map((row) => {
    const clean = row.replace(/^\d+\.\s*/, "").trim();
    const parts = clean.split(/\s*-\s*/);
    const risk = parts[0] ?? "";
    const impact = parts[1] ?? "";
    const mitigation = parts.slice(2).join(" - ");
    return `<li style="margin-bottom:10px;">
      <div style="color:#1a1a1a;">${escapeHtml(risk)}</div>
      ${impact ? `<div style="color:#666;font-size:12px;margin-top:2px;">Impact: ${escapeHtml(impact)}</div>` : ""}
      ${mitigation ? `<div style="color:#666;font-size:12px;">Mitigation: ${escapeHtml(mitigation)}</div>` : ""}
    </li>`;
  }).join("");

  const nextStepsRows = sections["NEXT STEPS"]
    .map((row) => `<li style="margin-bottom:8px;">${escapeHtml(row.replace(/^\d+\.\s*/, "").trim())}</li>`)
    .join("");

  return `
    ${projectStatusHtml ? `<div style="${headingStyle}">Project status</div>${projectStatusHtml}` : ""}
    ${progressHtml ? `<div style="${headingStyle}">Progress</div>${progressHtml}` : ""}
    ${risksRows ? `<div style="${headingStyle}">Risks and issues</div><ul style="margin:0 0 10px 18px;padding:0;">${risksRows}</ul>` : ""}
    ${nextStepsRows ? `<div style="${headingStyle}">Next steps</div><ol style="margin:0 0 10px 18px;padding:0;">${nextStepsRows}</ol>` : ""}
  `;
}

export type BuildScheduledEmailOptions = {
  weekEnding: string;
  ticketCount: number;
  clientCount: number;
  prefs: NormalizedEmailContentPrefs;
  attachExcel: boolean;
  reportType: "external" | "internal" | "note_to_self" | "qbr";
  recipientName?: string;
  brandName?: string;
  /** Enterprise white label: strip Handover / gethandover.uk from HTML and plain text. */
  whiteLabelActive?: boolean;
  appUrl?: string;
  excelTabCount?: number;
};

type RiskRow = { risk?: string | null; impact?: string | null };

function priorityClass(priority: string): string {
  const p = priority.trim().toLowerCase();
  if (p === "high" || p === "critical") return "high";
  if (p === "low") return "low";
  return "medium";
}

function buildActionsHtmlDigest(actions: ActionRow[]): string {
  if (!actions?.length) return "";
  return `
  <div class="section">
    <div class="section-title">Actions</div>
    ${actions
      .map((a) => {
        const task =
          typeof a.task === "string" && a.task.trim() ? escapeHtml(a.task.trim()) : "Untitled action";
        const owner =
          typeof a.suggested_owner === "string" && a.suggested_owner.trim()
            ? escapeHtml(a.suggested_owner.trim())
            : "Unassigned";
        const priority =
          typeof a.priority === "string" && a.priority.trim() ? a.priority.trim() : "Medium";
        return `
      <div class="action-item">
        <div class="action-title">${task}</div>
        <div class="action-meta">
          ${owner}
          <span class="priority-badge ${priorityClass(priority)}">${escapeHtml(priority)}</span>
        </div>
      </div>`;
      })
      .join("")}
  </div>
  `;
}

function buildRisksHtmlDigest(risks: RiskRow[]): string {
  if (!risks?.length) return "";
  return `
  <div class="section">
    <div class="section-title">Risks</div>
    ${risks
      .map((r) => {
        const risk =
          typeof r.risk === "string" && r.risk.trim() ? escapeHtml(r.risk.trim()) : "Unspecified risk";
        const impact =
          typeof r.impact === "string" && r.impact.trim() ? escapeHtml(r.impact.trim()) : "";
        return `
      <div class="risk-item">
        <div class="risk-title">${risk}</div>
        <div class="risk-impact">${impact}</div>
      </div>`;
      })
      .join("")}
  </div>
  `;
}

function buildClientEmailsHtmlDigest(raw: string): string {
  const sections = parseClientEmailSections(raw);
  if (!sections.length) return "";
  return `
  <div class="section">
    <div class="section-title">Client Updates</div>
    ${sections
      .map(
        (section) => `
      <div class="client-section">
        <div class="client-name">${escapeHtml(section.heading)}</div>
        <div class="client-email-text">${escapeHtml(section.body)}</div>
      </div>`,
      )
      .join("")}
  </div>`;
}

/** Parse status_report text into readable HTML (skips raw ALL CAPS section headers). */
export function buildStatusHtml(statusReport: string): string {
  if (!statusReport?.trim()) return "";

  const table = parseStatusPipeTable(statusReport);
  if (table && table.length > 0) {
    const rows = table
      .map(
        (r) =>
          `<tr><td style="padding:8px 10px;border:1px solid #e5e5e5;font-size:14px;">${escapeHtml(r.project)}</td>
        <td style="padding:8px 10px;border:1px solid #e5e5e5;font-size:14px;">${escapeHtml(r.status)}</td>
        <td style="padding:8px 10px;border:1px solid #e5e5e5;font-size:14px;">${escapeHtml(r.rag)}</td></tr>`,
      )
      .join("");
    return `
  <div class="section">
    <div class="section-title">Status report</div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-top:8px;">
      <thead><tr style="background:#fafafa;">
        <th align="left" style="padding:8px 10px;border:1px solid #e5e5e5;font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.06em;">Project</th>
        <th align="left" style="padding:8px 10px;border:1px solid #e5e5e5;font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.06em;">Status</th>
        <th align="left" style="padding:8px 10px;border:1px solid #e5e5e5;font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.06em;">RAG</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
  }

  const lines = statusReport.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let html = `
  <div class="section">
    <div class="section-title">Status report</div>
`;

  const skipHeader =
    /^(STATUS REPORT|ACTIONS|RISKS AND ISSUES|NEXT STEPS|PROGRESS)\s*:/i;

  for (const line of lines) {
    if (skipHeader.test(line)) continue;

    const projectLine = line.match(/^PROJECT STATUS:\s*(.*)$/i);
    if (projectLine) {
      const rest = (projectLine[1] ?? "").trim();
      const parts = rest.split(/\s-\s/).map((s) => s.trim());
      const title = parts[0] ?? rest;
      html += `
      <div style="font-weight:500;font-size:14px;margin-bottom:8px;color:#1a1a1a;">
        ${escapeHtml(title)}
      </div>
      `;
      if (parts.length > 1) {
        const detail = parts.slice(1).join(" - ");
        if (detail) {
          html += `<p style="font-size:13px;color:#666;margin-bottom:12px;line-height:1.6;">${escapeHtml(detail)}</p>`;
        }
      }
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const body = line.replace(/^\d+\.\s*/, "").trim();
      html += `
      <div class="action-item" style="border-bottom:1px solid #f5f5f5;padding:10px 0;">
        <div class="action-title" style="font-size:14px;font-weight:500;color:#1a1a1a;">${escapeHtml(body)}</div>
      </div>
      `;
      continue;
    }

    if (line.length > 20) {
      html += `
      <p style="font-size:14px;color:#444;margin-bottom:10px;line-height:1.6;">
        ${escapeHtml(line)}
      </p>
      `;
    }
  }

  html += "</div>";
  return html;
}

function digestStylesBlock(): string {
  return `<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 15px;
    line-height: 1.6;
    color: #1a1a1a;
    background: #f5f5f5;
  }
  .wrapper {
    max-width: 600px;
    margin: 32px auto;
    background: white;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid #e5e5e5;
  }
  .top-bar { background: #0f172a; padding: 12px 32px; display: flex; align-items: center; justify-content: space-between; }
  .brand { font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #38bdf8; }
  .date-label { font-size: 11px; color: rgba(255,255,255,0.4); }
  .body { padding: 36px 32px; }
  .greeting { font-size: 17px; font-weight: 400; color: #1a1a1a; margin-bottom: 20px; line-height: 1.5; }
  .section { margin: 28px 0; padding-top: 24px; border-top: 1px solid #f0f0f0; }
  .section-title { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #888; margin-bottom: 14px; }
  .action-item { padding: 12px 0; border-bottom: 1px solid #f5f5f5; }
  .action-item:last-child { border: none; }
  .action-title { font-size: 14px; font-weight: 500; color: #1a1a1a; margin-bottom: 4px; }
  .action-meta { font-size: 12px; color: #888; }
  .priority-badge { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 500; margin-left: 6px; }
  .high { background: #fee2e2; color: #dc2626; }
  .medium { background: #fef3c7; color: #d97706; }
  .low { background: #dcfce7; color: #16a34a; }
  .risk-item { padding: 10px 0; border-bottom: 1px solid #f5f5f5; font-size: 14px; }
  .risk-item:last-child { border: none; }
  .risk-title { font-weight: 500; color: #1a1a1a; margin-bottom: 2px; }
  .risk-impact { font-size: 12px; color: #888; }
  .client-section { margin: 16px 0; padding: 16px; background: #fafafa; border-radius: 4px; border-left: 3px solid #e5e5e5; }
  .client-name { font-size: 12px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; }
  .client-email-text { font-size: 14px; color: #1a1a1a; line-height: 1.7; white-space: pre-line; }
  .footer { padding: 20px 32px; background: #fafafa; border-top: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center; }
  .footer-brand { font-size: 12px; color: #bbb; }
  .footer-links { font-size: 12px; }
  .footer-links a { color: #888; text-decoration: none; margin-left: 16px; }
  .excel-note { margin-top: 20px; padding: 10px 14px; background: #f0f7ff; border-radius: 3px; border-left: 3px solid #38bdf8; font-size: 13px; color: #444; }
</style>`;
}

export function buildDigestEmailHtml(
  outputs: Record<string, unknown>,
  opts: BuildScheduledEmailOptions,
): string {
  const {
    weekEnding,
    ticketCount,
    clientCount,
    prefs,
    attachExcel,
    reportType,
    recipientName,
    brandName,
    whiteLabelActive,
    appUrl,
    excelTabCount,
  } = opts;
  const actions = Array.isArray(outputs.actions) ? (outputs.actions as ActionRow[]) : [];
  const risks = Array.isArray(outputs.risks) ? (outputs.risks as RiskRow[]) : [];
  const statusRaw =
    typeof outputs.status_report === "string"
      ? outputs.status_report
      : String(outputs.status_report ?? "");
  const clientEmailRaw =
    typeof outputs.client_email === "string"
      ? outputs.client_email
      : String(outputs.client_email ?? "");
  const summaryRaw =
    typeof outputs.summary === "string" ? outputs.summary.trim() : String(outputs.summary ?? "").trim();
  const origin = appUrl || getAppOrigin();
  const trimmedBrand = brandName?.trim() ?? "";
  const effectiveBrand = trimmedBrand || "Handover";
  const partnerFooter = whiteLabelActive === true && trimmedBrand.length > 0;
  const greetingName = recipientName?.trim() || "";

  const summaryParagraph =
    summaryRaw ||
    `This weekly update covers ${ticketCount} items across ${clientCount} clients for the period ending ${weekEnding}.`;
  const actionsHtml = prefs.include_actions ? buildActionsHtmlDigest(actions) : "";
  const risksHtml = prefs.include_risks ? buildRisksHtmlDigest(risks) : "";
  const clientEmailsHtml =
    reportType === "external" && prefs.include_client_emails
      ? buildClientEmailsHtmlDigest(clientEmailRaw)
      : "";
  const statusHtml = prefs.include_status
    ? `<div class="section">
    <div class="section-title">Status report</div>
    ${renderInternalStatusSections(statusRaw)}
  </div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
${digestStylesBlock()}
</head>
<body>
<div class="wrapper">
  <div class="top-bar">
    <span class="brand">${escapeHtml(effectiveBrand || "Handover")}</span>
    <span class="date-label">${escapeHtml(weekEnding)}</span>
  </div>
  <div class="body">
    <p class="greeting">
      ${greetingName ? `Hi ${escapeHtml(greetingName)},` : "Hi,"}
      <br><br>
      ${escapeHtml(summaryParagraph)}
    </p>
    ${actionsHtml}
    ${risksHtml}
    ${clientEmailsHtml}
    ${statusHtml}
    ${
      attachExcel
        ? `<div class="excel-note">
      📎 Report pack attached (${Math.max(1, Number(excelTabCount ?? 0))} sheets)
    </div>`
        : ""
    }
  </div>
  <div class="footer">
    ${
      partnerFooter
        ? `<span class="footer-brand">Powered by ${escapeHtml(trimmedBrand)}</span>`
        : `<span class="footer-brand">${escapeHtml(effectiveBrand)} · Automated report</span>
    <div class="footer-links">
      <a href="${escapeHtml(`${origin}/scheduled`)}">Manage schedule</a>
      <a href="${escapeHtml(origin)}">Open Handover</a>
    </div>`
    }
  </div>
</div>
</body>
</html>`;
}

export function buildProfessionalEmailHtml(
  outputs: Record<string, unknown>,
  opts: BuildScheduledEmailOptions,
): string {
  const { prefs, recipientName, weekEnding, brandName, whiteLabelActive } = opts;
  const actions = Array.isArray(outputs.actions) ? (outputs.actions as ActionRow[]) : [];
  const summaryRaw =
    typeof outputs.summary === "string" ? outputs.summary.trim() : String(outputs.summary ?? "").trim();
  const greetingName = recipientName?.trim() || "";
  const summaryText = summaryRaw || `Here is your weekly update for the period ending ${weekEnding}.`;
  const trimmedBrand = brandName?.trim() ?? "";
  const partnerFooter = whiteLabelActive === true && trimmedBrand.length > 0;

  const actionsBlock =
    prefs.include_actions && actions.length > 0
      ? `<p><strong>Progress this week:</strong></p>
<ul style="margin:0 0 16px;padding-left:20px;">
${actions
  .map((a) => {
    const task = typeof a.task === "string" ? escapeHtml(a.task.trim()) : "";
    if (!task) return "";
    return `<li style="margin-bottom:6px;">${task}</li>`;
  })
  .join("\n")}
</ul>`
      : "";

  return `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.7;color:#1a1a1a;max-width:560px;margin:40px auto;padding:0 20px;">

${greetingName ? `<p>Hi ${escapeHtml(greetingName)},</p>` : "<p>Hi,</p>"}

<p>${escapeHtml(summaryText)}</p>

${actionsBlock}

<p>I will be in touch next week with a further update on progress.</p>

<p>Kind regards</p>

${
  partnerFooter
    ? `<p style="margin-top:40px;font-size:12px;color:#999;border-top:1px solid #eee;padding-top:16px;">
  Powered by ${escapeHtml(trimmedBrand)}
</p>`
    : `<p style="margin-top:40px;font-size:12px;color:#999;border-top:1px solid #eee;padding-top:16px;">
  Sent via
  <a href="https://gethandover.uk" style="color:#999;">Handover</a>
</p>`
}

</body>
</html>`;
}

/** Minimal HTML preview / send body: the drafted email only, no extra greeting or sign-off. */
export function buildRawClientEmailBodyHtml(clientEmailPlain: string): string {
  const content = (clientEmailPlain ?? "").trim();
  return `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.7;color:#1a1a1a;max-width:560px;margin:40px auto;padding:0 20px;">
<div>${escapeHtml(content).replace(/\n/g, "<br/>")}</div>
</body>
</html>`;
}

/**
 * Same HTML structure, styling, and layout as external scheduled reports
 * (`buildProfessionalEmailHtml`). The drafted client email body replaces the summary
 * paragraph and the optional actions list.
 */
export function buildProfessionalClientEmailSendHtml(
  clientEmailPlain: string,
  recipientName?: string | null,
  opts?: { whiteLabelActive?: boolean; brandName?: string | null },
): string {
  const content = (clientEmailPlain ?? "").trim();
  const greetingName = recipientName?.trim() || "";
  const trimmedBrand = typeof opts?.brandName === "string" ? opts.brandName.trim() : "";
  const partnerFooter = opts?.whiteLabelActive === true && trimmedBrand.length > 0;
  return `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.7;color:#1a1a1a;max-width:560px;margin:40px auto;padding:0 20px;">

${greetingName ? `<p>Hi ${escapeHtml(greetingName)},</p>` : "<p>Hi,</p>"}

<p>${escapeHtml(content).replace(/\n/g, "<br/>")}</p>

<p>I will be in touch next week with a further update on progress.</p>

<p>Kind regards</p>

${
  partnerFooter
    ? `<p style="margin-top:40px;font-size:12px;color:#999;border-top:1px solid #eee;padding-top:16px;">
  Powered by ${escapeHtml(trimmedBrand)}
</p>`
    : `<p style="margin-top:40px;font-size:12px;color:#999;border-top:1px solid #eee;padding-top:16px;">
  Sent via
  <a href="https://gethandover.uk" style="color:#999;">Handover</a>
</p>`
}

</body>
</html>`;
}

/** Plain-text body for multipart/alternative (and plain format HTML wrapper). */
export function buildPlainTextEmailString(
  outputs: Record<string, unknown>,
  opts: BuildScheduledEmailOptions,
): string {
  const { prefs, recipientName, weekEnding, reportType, brandName, whiteLabelActive } = opts;
  const trimmedBrand = brandName?.trim() ?? "";
  const partnerFooter = whiteLabelActive === true && trimmedBrand.length > 0;
  const greetingName = recipientName?.trim() || "";
  const summaryRaw =
    typeof outputs.summary === "string" ? outputs.summary.trim() : String(outputs.summary ?? "").trim();
  const lines: string[] = [];
  lines.push(greetingName ? `Hi ${greetingName},` : "Hi,");
  lines.push("");
  lines.push(summaryRaw || `Weekly report for ${weekEnding}.`);
  lines.push("");

  const actions = Array.isArray(outputs.actions) ? (outputs.actions as ActionRow[]) : [];
  if (prefs.include_actions && actions.length > 0) {
    lines.push("Actions this week:");
    for (const a of actions) {
      const task = typeof a.task === "string" ? a.task.trim() : "";
      const owner =
        typeof a.suggested_owner === "string" && a.suggested_owner.trim()
          ? a.suggested_owner.trim()
          : "TBC";
      if (reportType === "external") {
        lines.push(`- ${task}`);
      } else {
        lines.push(`- ${task} (${owner})`);
      }
    }
    lines.push("");
  }

  const risks = Array.isArray(outputs.risks) ? (outputs.risks as RiskRow[]) : [];
  if (reportType !== "external" && prefs.include_risks && risks.length > 0) {
    lines.push("Risks to note:");
    for (const r of risks) {
      const risk = typeof r.risk === "string" ? r.risk.trim() : "";
      const impact = typeof r.impact === "string" ? r.impact.trim() : "";
      lines.push(`- ${risk}${impact ? ` - ${impact}` : ""}`);
    }
    lines.push("");
  }

  const statusRaw =
    typeof outputs.status_report === "string"
      ? outputs.status_report.trim()
      : String(outputs.status_report ?? "").trim();
  if (reportType !== "external" && prefs.include_status && statusRaw) {
    lines.push("Status:");
    lines.push(statusRaw);
    lines.push("");
  }

  lines.push("I will be in touch with a further update next week.");
  lines.push("");
  lines.push("Kind regards");
  lines.push("");
  lines.push(
    partnerFooter ? `Powered by ${trimmedBrand}` : "Sent via Handover https://gethandover.uk",
  );

  return lines.join("\n");
}

export function buildScheduledReportPlainText(
  outputs: Record<string, unknown>,
  opts: BuildScheduledEmailOptions,
): string {
  const format = scheduledEmailFormatFromReportType(opts.reportType);
  if (format === "professional") {
    return buildPlainTextEmailString(outputs, opts);
  }
  const { weekEnding, ticketCount, clientCount, brandName, whiteLabelActive } = opts;
  const trimmedBrand = brandName?.trim() ?? "";
  const partnerFooter = whiteLabelActive === true && trimmedBrand.length > 0;
  const summary =
    typeof outputs.summary === "string" ? outputs.summary.trim() : String(outputs.summary ?? "");
  const statusRaw =
    typeof outputs.status_report === "string" ? outputs.status_report.trim() : String(outputs.status_report ?? "").trim();
  const actions = Array.isArray(outputs.actions)
    ? outputs.actions
        .map((a) => {
          const row = a as Record<string, unknown>;
          const task = typeof row.task === "string" ? row.task : "";
          const owner =
            typeof row.suggested_owner === "string" && row.suggested_owner.trim()
              ? row.suggested_owner.trim()
              : "Unassigned";
          const pri =
            typeof row.priority === "string" && row.priority.trim()
              ? row.priority.trim()
              : "Medium";
          return `- ${task} | ${owner} (${pri})`;
        })
        .join("\n")
    : "";
  return [
    `Weekly Report - ${weekEnding}`,
    `${clientCount} clients · ${ticketCount} tickets`,
    "",
    "SUMMARY",
    summary,
    "",
    "ACTIONS",
    actions,
    ...(statusRaw ? ["", "STATUS", statusRaw] : []),
    "",
    "---",
    ...(partnerFooter
      ? [`Powered by ${trimmedBrand}`]
      : [`Generated by ${trimmedBrand || "Handover"}`, "gethandover.uk"]),
  ].join("\n");
}

export function buildScheduledReportEmailHtml(
  outputs: Record<string, unknown>,
  opts: BuildScheduledEmailOptions,
): string {
  const format = scheduledEmailFormatFromReportType(opts.reportType);
  if (format === "professional") {
    return buildProfessionalEmailHtml(outputs, opts);
  }
  return buildDigestEmailHtml(outputs, opts);
}