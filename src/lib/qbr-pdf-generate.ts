/**
 * Programmatic QBR PDF export (jsPDF text/vector — no html2canvas).
 * Data shape mirrors `GeneratedQbr` from the QBR pack builder.
 */

import { jsPDF } from "jspdf";

import type { QbrSectionsLike } from "@/lib/qbr-validation";

/** Mirrors GeneratedQbr fields used for PDF export. */
export type QbrPdfPackData = {
  brandName: string;
  brandColor: string;
  dateRangeLabel: string;
  executiveSummary: string;
  weeklyCounts: Array<{ week: string; count: number }>;
  resolutionByPriority: Array<{ key: "P1" | "P2" | "P3"; priority: string; avgHours: number; ticketCount: number }>;
  ticketBreakdown: Array<{ name: string; value: number }>;
  ticketBreakdownMode: "type_category" | "status";
  ticketBreakdownNote: string | null;
  openVsClosed: { raised: number; resolved: number; open: number; resolvedPct: number };
  projectRows: Array<{ name: string; percent: number; rag: "Red" | "Amber" | "Green" }>;
  slaCompliancePct: number | null;
  risks: Array<{ risk: string; impact: string; mitigation: string }>;
  actions: Array<{ task: string; suggested_owner?: string | null; priority?: string | null }>;
  recommendations: string;
  recurringIssues: {
    rows: Array<{ name: string; count: number; pct: number }>;
    topInsight: string;
  };
  periodComparison: {
    current: { volume: number; resolutionPct: number; avgResolutionHrs: number };
    previous: { volume: number; resolutionPct: number; avgResolutionHrs: number };
    trendLine: string;
  };
  firstContactResolution: {
    pct: number;
    resolvedEvaluated: number;
    fcrCount: number;
    benchmarkNote: string;
  };
  autoExcludedSectionLabels?: string[];
};

const navy: [number, number, number] = [15, 28, 63];
const teal: [number, number, number] = [14, 165, 233];
const darkGrey: [number, number, number] = [31, 41, 55];
const midGrey: [number, number, number] = [107, 114, 128];
const lightGrey: [number, number, number] = [243, 244, 246];
const white: [number, number, number] = [255, 255, 255];

function hexToRgb(hex: string): [number, number, number] {
  const v = String(hex ?? "").trim();
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(v);
  if (m) {
    return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
  }
  const m3 = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(v);
  if (m3) {
    return [
      parseInt(m3[1] + m3[1], 16),
      parseInt(m3[2] + m3[2], 16),
      parseInt(m3[3] + m3[3], 16),
    ];
  }
  return teal;
}

function normaliseText(text: string): string {
  return text
    .replace(/\u00A0/g, " ")
    .replace(/\u200B/g, "")
    .replace(/[\u200C\u200D\uFEFF]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

export function generateQbrPdf(qbr: QbrPdfPackData, sections: QbrSectionsLike): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  const accent = hexToRgb(qbr.brandColor || "#0EA5E9");
  const company = normaliseText(qbr.brandName || "Client").trim() || "Client";

  const drawRunningHeader = () => {
    doc.setFillColor(...navy);
    doc.rect(0, 0, pageWidth, 14, "F");
    doc.setTextColor(...white);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(company, margin, 9);
    doc.setFont("helvetica", "normal");
    const pn = doc.getCurrentPageInfo().pageNumber;
    doc.text(`Page ${pn}`, pageWidth - margin, 9, { align: "right" });
    yPos = 22;
  };

  const checkPageBreak = (requiredHeight: number) => {
    if (yPos + requiredHeight > pageHeight - margin) {
      doc.addPage();
      drawRunningHeader();
    }
  };

  const addSectionHeading = (title: string) => {
    checkPageBreak(18);
    doc.setFillColor(...accent);
    doc.rect(margin, yPos, 3, 8, "F");
    doc.setTextColor(...navy);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin + 6, yPos + 6);
    yPos += 14;
  };

  const addBodyText = (text: string, fontSize = 10) => {
    const raw = normaliseText(text);
    if (!raw.trim()) return;
    doc.setTextColor(...darkGrey);
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(raw, contentWidth);
    const lineH = fontSize * 0.45 + 1.2;
    lines.forEach((line: string) => {
      checkPageBreak(lineH);
      doc.text(line, margin, yPos);
      yPos += lineH;
    });
    yPos += 3;
  };

  const addBulletList = (items: string[], fontSize = 10) => {
    items.forEach((item) => {
      const normalised = normaliseText(item).trim();
      if (!normalised) return;
      checkPageBreak(10);
      doc.setFillColor(...accent);
      doc.circle(margin + 2, yPos - 1.2, 0.9, "F");
      doc.setTextColor(...darkGrey);
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(normalised, contentWidth - 8);
      const lineH = fontSize * 0.45 + 1.2;
      lines.forEach((line: string, i: number) => {
        if (i > 0) checkPageBreak(lineH);
        doc.text(line, margin + 6, yPos);
        yPos += lineH;
      });
      yPos += 2;
    });
    yPos += 2;
  };

  const addMetricRow = (metrics: Array<{ label: string; value: string }>) => {
    if (metrics.length === 0) return;
    checkPageBreak(28);
    const gap = 4;
    const cardWidth = (contentWidth - (metrics.length - 1) * gap) / metrics.length;
    metrics.forEach((metric, i) => {
      const x = margin + i * (cardWidth + gap);
      doc.setFillColor(...lightGrey);
      doc.roundedRect(x, yPos, cardWidth, 18, 2, 2, "F");
      doc.setTextColor(...navy);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(metric.value, x + cardWidth / 2, yPos + 10, { align: "center" });
      doc.setTextColor(...midGrey);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const labelLines = doc.splitTextToSize(metric.label, cardWidth - 4);
      labelLines.slice(0, 2).forEach((ln: string, li: number) => {
        doc.text(ln, x + cardWidth / 2, yPos + 15 + li * 3.5, { align: "center" });
      });
    });
    yPos += 24;
  };

  const addBarChart = (
    data: Array<{ label: string; value: number }>,
    subtitle: string,
    valueSuffix = "",
  ) => {
    if (!data.length) return;
    checkPageBreak(58);
    doc.setTextColor(...midGrey);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, margin, yPos);
    yPos += 6;

    const maxValue = Math.max(...data.map((d) => d.value), 1);
    const chartHeight = 36;
    const barW = Math.min((contentWidth / data.length) * 0.65, 16);
    const colours: [number, number, number][] = [
      accent,
      navy,
      teal,
      [245, 158, 11],
      [34, 197, 94],
      [139, 92, 246],
      [249, 115, 22],
    ];

    data.forEach((item, i) => {
      const slot = contentWidth / data.length;
      const x = margin + i * slot + (slot - barW) / 2;
      const barHeight = maxValue > 0 ? (item.value / maxValue) * chartHeight : 0;
      const barY = yPos + chartHeight - barHeight;
      doc.setFillColor(...colours[i % colours.length]);
      doc.rect(x, barY, barW, Math.max(barHeight, 0.5), "F");
      doc.setTextColor(...darkGrey);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text(`${item.value}${valueSuffix}`, x + barW / 2, barY - 2, { align: "center" });
      doc.setTextColor(...midGrey);
      doc.setFont("helvetica", "normal");
      const labelLines = doc.splitTextToSize(normaliseText(item.label), slot - 2);
      labelLines.slice(0, 2).forEach((line: string, li: number) => {
        doc.text(line, x + barW / 2, yPos + chartHeight + 5 + li * 3.5, { align: "center" });
      });
    });
    yPos += chartHeight + 18;
  };

  const addProjectTable = (projects: QbrPdfPackData["projectRows"]) => {
    if (!projects.length) return;
    const rowH = 9;
    const colProject = 95;
    const colProg = 45;
    const colRag = 20;

    checkPageBreak(rowH + 8);
    doc.setFillColor(...navy);
    doc.rect(margin, yPos, contentWidth, rowH, "F");
    doc.setTextColor(...white);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    let x0 = margin + 2;
    doc.text("Project", x0, yPos + 6);
    x0 += colProject;
    doc.text("Progress", x0, yPos + 6);
    x0 += colProg;
    doc.text("RAG", x0 + 5, yPos + 6);
    yPos += rowH;

    const ragColours: Record<string, [number, number, number]> = {
      green: [34, 197, 94],
      amber: [245, 158, 11],
      red: [239, 68, 68],
    };

    projects.forEach((project, i) => {
      if (i > 0 && i % 10 === 0) {
        doc.addPage();
        drawRunningHeader();
        addSectionHeading("Project Status (continued)");
      }
      checkPageBreak(rowH + 2);
      if (i % 2 === 0) {
        doc.setFillColor(...lightGrey);
        doc.rect(margin, yPos, contentWidth, rowH, "F");
      }
      const ragKey = project.rag.toLowerCase() as "green" | "amber" | "red";
      const ragColour = ragColours[ragKey] ?? [156, 163, 175];
      x0 = margin + 2;
      doc.setTextColor(...darkGrey);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const nameLines = doc.splitTextToSize(normaliseText(project.name || "Project"), colProject - 4);
      doc.text(nameLines[0] ?? "", x0, yPos + 6);
      x0 += colProject;
      const progress = Math.min(100, Math.max(0, project.percent));
      doc.setFillColor(220, 220, 220);
      doc.rect(x0, yPos + 2.5, 28, 4, "F");
      doc.setFillColor(...accent);
      doc.rect(x0, yPos + 2.5, (28 * progress) / 100, 4, "F");
      doc.setTextColor(...midGrey);
      doc.setFontSize(7);
      doc.text(`${progress}%`, x0 + 30, yPos + 6);
      x0 += colProg;
      doc.setFillColor(...ragColour);
      doc.circle(x0 + 6, yPos + 4.5, 2.5, "F");
      yPos += rowH;
    });
    yPos += 6;
  };

  // —— Cover (page 1, no running header) ——
  doc.setFillColor(...navy);
  doc.rect(0, yPos, pageWidth, 32, "F");
  doc.setTextColor(...white);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Quarterly Business Review", pageWidth / 2, yPos + 14, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(company, pageWidth / 2, yPos + 24, { align: "center" });
  yPos += 42;

  if (sections.executiveSummary && qbr.executiveSummary.trim()) {
    addSectionHeading("Executive Summary");
    addBodyText(qbr.executiveSummary, 10);
  }

  const wantsKeyMetrics =
    sections.ticketVolume ||
    sections.openVsClosed ||
    sections.slaPerformance ||
    sections.resolutionPerformance ||
    sections.ticketBreakdown;
  if (wantsKeyMetrics) {
    checkPageBreak(30);
    addSectionHeading("Key metrics");
    const metrics: Array<{ label: string; value: string }> = [
      { label: "Total tickets", value: String(qbr.openVsClosed.raised) },
      { label: "Resolved", value: String(qbr.openVsClosed.resolved) },
      { label: "Open", value: String(qbr.openVsClosed.open) },
    ];
    if (sections.slaPerformance && qbr.slaCompliancePct != null) {
      metrics.push({ label: "SLA compliance", value: `${qbr.slaCompliancePct}%` });
    }
    const perRow = 4;
    for (let i = 0; i < metrics.length; i += perRow) {
      addMetricRow(metrics.slice(i, i + perRow));
    }
  }

  if (sections.ticketVolume && qbr.weeklyCounts.length > 0) {
    addSectionHeading("Ticket volume");
    addBarChart(
      qbr.weeklyCounts.map((w) => ({ label: w.week, value: w.count })),
      "Tickets raised per week",
    );
  }

  if (sections.resolutionPerformance && qbr.resolutionByPriority.length > 0) {
    addSectionHeading("Resolution performance");
    addBarChart(
      qbr.resolutionByPriority.map((p) => ({
        label: p.priority,
        value: Number(p.avgHours.toFixed(1)),
      })),
      "Average resolution time (hours) by priority",
      "h",
    );
  }

  if (sections.ticketBreakdown && qbr.ticketBreakdown.length > 0) {
    addSectionHeading(qbr.ticketBreakdownMode === "status" ? "Ticket breakdown (status)" : "Ticket breakdown (category)");
    const top = [...qbr.ticketBreakdown].sort((a, b) => b.value - a.value).slice(0, 12);
    addBarChart(
      top.map((t) => ({ label: t.name, value: t.value })),
      "Ticket count by bucket (top categories)",
    );
  }

  if (sections.openVsClosed) {
    addSectionHeading("Open vs resolved");
    addBodyText(
      `Total tickets: ${qbr.openVsClosed.raised}. Open: ${qbr.openVsClosed.open}. Resolved: ${qbr.openVsClosed.resolved}. Resolved ${qbr.openVsClosed.resolvedPct}% of raised.`,
      10,
    );
  }

  if (sections.projectStatus && qbr.projectRows.length > 0) {
    checkPageBreak(40);
    addSectionHeading("Project status overview");
    addProjectTable(qbr.projectRows);
  }

  if (sections.slaPerformance) {
    addSectionHeading("SLA performance");
    if (qbr.slaCompliancePct == null) {
      addBodyText("SLA data unavailable for this period.", 10);
    } else {
      addMetricRow([{ label: "SLA compliance (resolved as % of total raised)", value: `${qbr.slaCompliancePct}%` }]);
    }
  }

  if (sections.risksActions && qbr.risks.length > 0) {
    addSectionHeading("Risks");
    addBulletList(
      qbr.risks.map((r) => {
        const parts = [
          normaliseText(r.risk),
          r.impact ? `Impact: ${normaliseText(r.impact)}` : "",
          r.mitigation ? `Mitigation: ${normaliseText(r.mitigation)}` : "",
        ].filter(Boolean);
        return parts.join(" — ");
      }),
    );
  }

  if (sections.risksActions && qbr.actions.length > 0) {
    addSectionHeading("Actions");
    addBulletList(
      qbr.actions.map((a) => {
        let s = normaliseText(a.task);
        if (a.suggested_owner) s += ` (Owner: ${normaliseText(a.suggested_owner)})`;
        if (a.priority) s += ` [${normaliseText(a.priority)}]`;
        return s;
      }),
    );
  }

  if (sections.nextSteps && qbr.recommendations.trim()) {
    addSectionHeading("Next steps and recommendations");
    addBodyText(qbr.recommendations, 10);
  }

  if (sections.recurringIssues && qbr.recurringIssues.rows.length > 0) {
    addSectionHeading("Recurring issues");
    qbr.recurringIssues.rows.forEach((r) => {
      addBodyText(`• ${r.name} — ${r.count} tickets (${r.pct}% of total)`, 10);
    });
    if (qbr.recurringIssues.topInsight.trim()) {
      addBodyText(qbr.recurringIssues.topInsight, 9);
    }
  }

  if (sections.periodComparison) {
    addSectionHeading("Period comparison");
    addBodyText(qbr.periodComparison.trendLine, 10);
    addMetricRow([
      { label: "This period — volume", value: String(qbr.periodComparison.current.volume) },
      { label: "Previous — volume", value: String(qbr.periodComparison.previous.volume) },
    ]);
    addMetricRow([
      { label: "This period — resolution %", value: `${qbr.periodComparison.current.resolutionPct}%` },
      { label: "Previous — resolution %", value: `${qbr.periodComparison.previous.resolutionPct}%` },
    ]);
    addMetricRow([
      { label: "This period — avg resolution (hrs)", value: String(qbr.periodComparison.current.avgResolutionHrs) },
      { label: "Previous — avg resolution (hrs)", value: String(qbr.periodComparison.previous.avgResolutionHrs) },
    ]);
  }

  if (sections.firstContactResolution) {
    addSectionHeading("First contact resolution");
    if (qbr.firstContactResolution.resolvedEvaluated === 0) {
      addBodyText("No resolved tickets in this period — FCR cannot be calculated.", 10);
    } else {
      addBodyText(
        `${qbr.firstContactResolution.pct}% first contact resolution (${qbr.firstContactResolution.fcrCount} of ${qbr.firstContactResolution.resolvedEvaluated} resolved tickets, no reassignment/escalation signals).`,
        10,
      );
      addBodyText(qbr.firstContactResolution.benchmarkNote, 9);
    }
  }

  // Footer on last page
  const last = doc.getNumberOfPages();
  doc.setPage(last);
  doc.setFillColor(...lightGrey);
  doc.rect(0, pageHeight - 11, pageWidth, 11, "F");
  doc.setTextColor(...midGrey);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated — ${new Date().toLocaleDateString("en-GB")}`, pageWidth / 2, pageHeight - 4, { align: "center" });

  const _pdfDate = new Date();
  const _pdfQuarter = `Q${Math.ceil((_pdfDate.getMonth() + 1) / 3)}-${_pdfDate.getFullYear()}`;
  const _pdfSafeName = company
    .replace(/[^a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  doc.save(`${_pdfSafeName}_QBR_${_pdfQuarter}.pdf`);
}
