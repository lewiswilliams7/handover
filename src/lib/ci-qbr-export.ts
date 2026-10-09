import { jsPDF } from "jspdf";
import JSZip from "jszip";
import * as XLSX from "xlsx";

export type CiQbrData = {
  clientName: string;
  periodLabel: string;
  relationshipHealth: "green" | "amber" | "red";
  executiveSummary: string;
  keyAchievements: string[];
  recurringIssues: string[];
  openRisks: string[];
  resolvedRisks: string[];
  recommendedActions: string[];
  qbrTalkingPoints: string[];
  strategicPriorities: string[];
  generatedAt: string;
  brandName: string;
  brandColor: string;
  brandLogoUrl?: string | null;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POWERPOINT EXPORT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function exportCiQbrPptx(data: CiQbrData): Promise<void> {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.theme = {
    headFontFace: "Inter",
    bodyFontFace: "Inter",
  };
  pptx.layout = "LAYOUT_WIDE";

  const accent = safeHex(data.brandColor);
  const NAVY = "0F1C3F";
  const SLIDE_BG = "0A0E1F";
  const WHITE = "FFFFFF";
  const MUTED = "94A3B8";

  const W = 13.33;
  const H = 7.5;
  const MARGIN = 0.5;

  const healthColor =
    data.relationshipHealth === "red"
      ? "EF4444"
      : data.relationshipHealth === "amber"
        ? "F59E0B"
        : "22C55E";

  const healthLabel =
    data.relationshipHealth === "red"
      ? "Red — Needs Attention"
      : data.relationshipHealth === "amber"
        ? "Amber — Monitor Closely"
        : "Green — Healthy";

  let logoDataUrl: string | null = null;
  if (data.brandLogoUrl) {
    try {
      const r = await fetch(data.brandLogoUrl, { mode: "cors" });
      if (r.ok) {
        const blob = await r.blob();
        logoDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } catch {
      logoDataUrl = null;
    }
  }

  function addChrome(slide: ReturnType<typeof pptx.addSlide>, title: string, page: number) {
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: W,
      h: 0.06,
      fill: { color: accent },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0.06,
      w: W,
      h: 0.55,
      fill: { color: NAVY },
    });
    slide.addText(title, {
      x: MARGIN,
      y: 0.1,
      w: W - 2,
      h: 0.45,
      fontSize: 13,
      bold: true,
      color: WHITE,
      fontFace: "Inter",
    });
    slide.addText(data.brandName, {
      x: W - 2,
      y: 0.1,
      w: 1.5,
      h: 0.45,
      fontSize: 10,
      color: MUTED,
      align: "right",
      fontFace: "Inter",
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: H - 0.3,
      w: W,
      h: 0.3,
      fill: { color: NAVY },
    });
    slide.addText(`${data.clientName} · ${data.periodLabel}`, {
      x: MARGIN,
      y: H - 0.28,
      w: W - 2,
      h: 0.25,
      fontSize: 8,
      color: MUTED,
      fontFace: "Inter",
    });
    slide.addText(String(page), {
      x: W - 1,
      y: H - 0.28,
      w: 0.5,
      h: 0.25,
      fontSize: 8,
      color: MUTED,
      align: "right",
      fontFace: "Inter",
    });
  }

  function addDivider(title: string) {
    const s = pptx.addSlide();
    s.background = { color: SLIDE_BG };
    s.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 0.08,
      h: H,
      fill: { color: accent },
    });
    s.addText(title, {
      x: 1,
      y: H / 2 - 0.4,
      w: W - 2,
      h: 0.8,
      fontSize: 32,
      bold: true,
      color: WHITE,
      fontFace: "Inter",
    });
  }

  let page = 1;

  const cover = pptx.addSlide();
  cover.background = { color: SLIDE_BG };
  cover.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 0.08,
    h: H,
    fill: { color: accent },
  });
  if (logoDataUrl) {
    cover.addImage({
      data: logoDataUrl,
      x: W - 2.5,
      y: 0.4,
      w: 2,
      h: 0.6,
    });
  }
  cover.addText("QUARTERLY BUSINESS REVIEW", {
    x: 0.6,
    y: 2.2,
    w: W - 1.2,
    h: 0.4,
    fontSize: 10,
    bold: true,
    color: accent,
    charSpacing: 3,
    fontFace: "Inter",
  });
  cover.addText(data.clientName, {
    x: 0.6,
    y: 2.7,
    w: W - 1.2,
    h: 0.9,
    fontSize: 36,
    bold: true,
    color: WHITE,
    fontFace: "Inter",
  });
  cover.addText(data.periodLabel, {
    x: 0.6,
    y: 3.65,
    w: W - 1.2,
    h: 0.4,
    fontSize: 14,
    color: MUTED,
    fontFace: "Inter",
  });
  cover.addText(`Prepared by ${data.brandName}`, {
    x: 0.6,
    y: 4.15,
    w: W - 1.2,
    h: 0.3,
    fontSize: 10,
    color: MUTED,
    fontFace: "Inter",
  });
  cover.addText(`Relationship Health: ${healthLabel}`, {
    x: 0.6,
    y: 4.55,
    w: W - 1.2,
    h: 0.3,
    fontSize: 10,
    color: healthColor,
    fontFace: "Inter",
  });

  addDivider("Executive Summary");
  const exec = pptx.addSlide();
  exec.background = { color: SLIDE_BG };
  addChrome(exec, "Executive Summary", page++);

  exec.addShape(pptx.ShapeType.roundRect, {
    x: MARGIN,
    y: 0.75,
    w: 2.2,
    h: 0.35,
    fill: {
      color: healthColor,
      transparency: 80,
    },
    line: {
      color: healthColor,
      width: 1,
    },
    rectRadius: 0.05,
  });
  exec.addText(healthLabel, {
    x: MARGIN + 0.1,
    y: 0.77,
    w: 2,
    h: 0.3,
    fontSize: 9,
    bold: true,
    color: healthColor,
    fontFace: "Inter",
  });

  exec.addText(data.executiveSummary, {
    x: MARGIN,
    y: 1.2,
    w: W - MARGIN * 2,
    h: 2.2,
    fontSize: 13,
    color: "CBD5E1",
    lineSpacingMultiple: 1.4,
    fontFace: "Inter",
  });

  const metrics = [
    { label: "Achievements", value: String(data.keyAchievements.length) },
    { label: "Open Risks", value: String(data.openRisks.length) },
    { label: "Resolved", value: String(data.resolvedRisks.length) },
    { label: "Actions", value: String(data.recommendedActions.length) },
  ];
  const mW = (W - MARGIN * 2) / 4;
  metrics.forEach((m, i) => {
    const mx = MARGIN + i * mW;
    exec.addShape(pptx.ShapeType.roundRect, {
      x: mx + 0.05,
      y: 3.6,
      w: mW - 0.1,
      h: 0.9,
      fill: { color: NAVY },
      rectRadius: 0.08,
    });
    exec.addText(m.value, {
      x: mx + 0.05,
      y: 3.65,
      w: mW - 0.1,
      h: 0.45,
      fontSize: 22,
      bold: true,
      color: WHITE,
      align: "center",
      fontFace: "Inter",
    });
    exec.addText(m.label, {
      x: mx + 0.05,
      y: 4.05,
      w: mW - 0.1,
      h: 0.3,
      fontSize: 9,
      color: MUTED,
      align: "center",
      fontFace: "Inter",
    });
  });

  addDivider("Delivery Performance");
  const perf = pptx.addSlide();
  perf.background = { color: SLIDE_BG };
  addChrome(perf, "Delivery Performance", page++);

  perf.addText("Key Achievements", {
    x: MARGIN,
    y: 0.7,
    w: (W - MARGIN * 2) / 2 - 0.2,
    h: 0.3,
    fontSize: 10,
    bold: true,
    color: "22C55E",
    fontFace: "Inter",
  });
  data.keyAchievements.slice(0, 5).forEach((a, i) => {
    perf.addShape(pptx.ShapeType.rect, {
      x: MARGIN,
      y: 1.1 + i * 0.75,
      w: 0.03,
      h: 0.5,
      fill: { color: "22C55E" },
    });
    perf.addText(a, {
      x: MARGIN + 0.12,
      y: 1.1 + i * 0.75,
      w: (W - MARGIN * 2) / 2 - 0.4,
      h: 0.55,
      fontSize: 10,
      color: "CBD5E1",
      lineSpacingMultiple: 1.3,
      fontFace: "Inter",
    });
  });

  const RX = W / 2 + 0.1;
  const RW = W / 2 - MARGIN - 0.1;
  perf.addText("Recurring Issues", {
    x: RX,
    y: 0.7,
    w: RW,
    h: 0.3,
    fontSize: 10,
    bold: true,
    color: "F59E0B",
    fontFace: "Inter",
  });
  data.recurringIssues.slice(0, 5).forEach((r, i) => {
    perf.addShape(pptx.ShapeType.rect, {
      x: RX,
      y: 1.1 + i * 0.75,
      w: 0.03,
      h: 0.5,
      fill: { color: "F59E0B" },
    });
    perf.addText(r, {
      x: RX + 0.12,
      y: 1.1 + i * 0.75,
      w: RW - 0.12,
      h: 0.55,
      fontSize: 10,
      color: "CBD5E1",
      lineSpacingMultiple: 1.3,
      fontFace: "Inter",
    });
  });

  if (data.openRisks.length > 0) {
    addDivider("Risks & Actions");
    const risks = pptx.addSlide();
    risks.background = { color: SLIDE_BG };
    addChrome(risks, "Risks & Actions", page++);

    risks.addText("Open Risks", {
      x: MARGIN,
      y: 0.7,
      w: (W - MARGIN * 2) / 2 - 0.2,
      h: 0.3,
      fontSize: 10,
      bold: true,
      color: "EF4444",
      fontFace: "Inter",
    });
    data.openRisks.slice(0, 5).forEach((r, i) => {
      risks.addShape(pptx.ShapeType.roundRect, {
        x: MARGIN,
        y: 1.1 + i * 0.85,
        w: (W - MARGIN * 2) / 2 - 0.3,
        h: 0.7,
        fill: {
          color: "EF4444",
          transparency: 85,
        },
        line: {
          color: "EF4444",
          width: 0.5,
        },
        rectRadius: 0.06,
      });
      risks.addText(r, {
        x: MARGIN + 0.1,
        y: 1.15 + i * 0.85,
        w: (W - MARGIN * 2) / 2 - 0.5,
        h: 0.6,
        fontSize: 9.5,
        color: "CBD5E1",
        lineSpacingMultiple: 1.3,
        fontFace: "Inter",
      });
    });

    const AX = W / 2 + 0.1;
    const AW = W / 2 - MARGIN - 0.1;
    risks.addText("Recommended Actions", {
      x: AX,
      y: 0.7,
      w: AW,
      h: 0.3,
      fontSize: 10,
      bold: true,
      color: accent,
      fontFace: "Inter",
    });
    data.recommendedActions.slice(0, 5).forEach((a, i) => {
      risks.addShape(pptx.ShapeType.roundRect, {
        x: AX,
        y: 1.1 + i * 0.85,
        w: AW,
        h: 0.7,
        fill: {
          color: accent,
          transparency: 85,
        },
        line: {
          color: accent,
          width: 0.5,
        },
        rectRadius: 0.06,
      });
      risks.addText(a, {
        x: AX + 0.1,
        y: 1.15 + i * 0.85,
        w: AW - 0.2,
        h: 0.6,
        fontSize: 9.5,
        color: "CBD5E1",
        lineSpacingMultiple: 1.3,
        fontFace: "Inter",
      });
    });
  }

  addDivider("Looking Ahead");
  const strat = pptx.addSlide();
  strat.background = { color: SLIDE_BG };
  addChrome(strat, "Strategic Priorities", page++);

  data.strategicPriorities.slice(0, 3).forEach((p, i) => {
    const cardW = (W - MARGIN * 2 - 0.2) / 3;
    const cardX = MARGIN + i * (cardW + 0.1);
    strat.addShape(pptx.ShapeType.roundRect, {
      x: cardX,
      y: 0.9,
      w: cardW,
      h: 3.5,
      fill: { color: NAVY },
      line: {
        color: accent,
        width: 1,
      },
      rectRadius: 0.1,
    });
    strat.addText(String(i + 1), {
      x: cardX + 0.2,
      y: 1.1,
      w: 0.5,
      h: 0.5,
      fontSize: 22,
      bold: true,
      color: accent,
      fontFace: "Inter",
    });
    strat.addText(p, {
      x: cardX + 0.15,
      y: 1.7,
      w: cardW - 0.3,
      h: 2.4,
      fontSize: 11,
      color: "CBD5E1",
      lineSpacingMultiple: 1.4,
      fontFace: "Inter",
    });
  });

  strat.addText("Talking Points for this Review:", {
    x: MARGIN,
    y: 4.6,
    w: W - MARGIN * 2,
    h: 0.3,
    fontSize: 10,
    bold: true,
    color: MUTED,
    fontFace: "Inter",
  });
  const tpText = data.qbrTalkingPoints
    .slice(0, 4)
    .map((t, i) => `${i + 1}. ${t}`)
    .join("   ·   ");
  strat.addText(tpText, {
    x: MARGIN,
    y: 4.95,
    w: W - MARGIN * 2,
    h: 0.6,
    fontSize: 9,
    color: "64748B",
    lineSpacingMultiple: 1.3,
    fontFace: "Inter",
  });

  const safeName = data.clientName.replace(/[^a-zA-Z0-9]/g, "_");
  const now = new Date();
  const quarter = `Q${Math.ceil((now.getMonth() + 1) / 3)}-${now.getFullYear()}`;
  const fileName = `${safeName}_QBR_${quarter}.pptx`;

  const buf = await pptx.write({ outputType: "arraybuffer" });

  const zip = await JSZip.loadAsync(buf);
  const themePath = "ppt/theme/theme1.xml";
  const themeXml = await zip.file(themePath)?.async("string");
  if (themeXml) {
    const patched = themeXml.replace(
      /<a:accent1>\s*<a:srgbClr val="[^"]*"\/?>\s*<\/a:accent1>/,
      `<a:accent1><a:srgbClr val="${accent}"/></a:accent1>`,
    );
    zip.file(themePath, patched);
  }
  const themedBuf = await zip.generateAsync({ type: "uint8array" });
  const blob = new Blob([themedBuf.buffer as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PDF EXPORT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function exportCiQbrPdf(data: CiQbrData): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
  const pw = 210;
  const margin = 20;
  const cw = pw - margin * 2;
  let y = margin;

  const navy = "#0F1C3F";

  function checkPage(needed = 15) {
    if (y + needed > 270) {
      doc.addPage();
      y = margin;
    }
  }

  function heading(text: string, color = navy) {
    checkPage(12);
    doc.setFontSize(16);
    doc.setTextColor(color);
    doc.setFont("helvetica", "bold");
    doc.text(text, margin, y);
    y += 8;
    doc.setDrawColor(color);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + cw, y);
    y += 5;
  }

  function body(text: string, color = "#374151") {
    checkPage(8);
    doc.setFontSize(10);
    doc.setTextColor(color);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(text, cw);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 2;
  }

  function bullet(text: string, prefix = "•", color = "#374151") {
    checkPage(8);
    doc.setFontSize(10);
    doc.setTextColor(color);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(text, cw - 6);
    doc.text(`${prefix}`, margin, y);
    doc.text(lines, margin + 6, y);
    y += lines.length * 5 + 1;
  }

  doc.setFillColor(
    parseInt(navy.slice(1, 3), 16),
    parseInt(navy.slice(3, 5), 16),
    parseInt(navy.slice(5, 7), 16),
  );
  doc.rect(0, 0, pw, 60, "F");
  doc.setFontSize(10);
  doc.setTextColor("#38BDF8");
  doc.setFont("helvetica", "bold");
  doc.text("QUARTERLY BUSINESS REVIEW", margin, 25);
  doc.setFontSize(24);
  doc.setTextColor("#FFFFFF");
  doc.text(data.clientName, margin, 38);
  doc.setFontSize(11);
  doc.setTextColor("#94A3B8");
  doc.setFont("helvetica", "normal");
  doc.text(data.periodLabel, margin, 48);
  doc.text(data.brandName, margin, 55);
  y = 75;

  heading("Executive Summary", navy);
  body(data.executiveSummary);
  y += 5;

  const healthHex =
    data.relationshipHealth === "red"
      ? "#EF4444"
      : data.relationshipHealth === "amber"
        ? "#F59E0B"
        : "#22C55E";
  doc.setFontSize(10);
  doc.setTextColor(healthHex);
  doc.setFont("helvetica", "bold");
  doc.text(
    `Relationship Health: ${
      data.relationshipHealth.charAt(0).toUpperCase() + data.relationshipHealth.slice(1)
    }`,
    margin,
    y,
  );
  y += 10;

  if (data.keyAchievements.length > 0) {
    heading("Key Achievements", "#22C55E");
    data.keyAchievements.forEach((a) => bullet(a, "✓", "#374151"));
    y += 5;
  }

  if (data.recurringIssues.length > 0) {
    heading("Recurring Issues", "#F59E0B");
    data.recurringIssues.forEach((r) => bullet(r, "·"));
    y += 5;
  }

  if (data.openRisks.length > 0) {
    heading("Open Risks", "#EF4444");
    data.openRisks.forEach((r) => bullet(r, "↑", "#374151"));
    y += 5;
  }

  if (data.recommendedActions.length > 0) {
    heading("Recommended Actions");
    data.recommendedActions.forEach((a) => bullet(a, "→", "#374151"));
    y += 5;
  }

  if (data.strategicPriorities.length > 0) {
    heading("Strategic Priorities");
    data.strategicPriorities.forEach((p, i) => bullet(`${i + 1}. ${p}`, " "));
    y += 5;
  }

  if (data.qbrTalkingPoints.length > 0) {
    heading("QBR Talking Points");
    data.qbrTalkingPoints.forEach((t) => bullet(t));
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor("#9CA3AF");
    doc.text(
      `${data.clientName} · ${data.periodLabel} · Page ${i} of ${pageCount}`,
      margin,
      290,
    );
  }

  const safeName = data.clientName.replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`${safeName}_QBR.pdf`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXCEL EXPORT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function exportCiQbrExcel(data: CiQbrData): void {
  const wb = XLSX.utils.book_new();

  const summaryData = [
    ["QBR Summary", ""],
    ["Client", data.clientName],
    ["Period", data.periodLabel],
    ["Health", data.relationshipHealth],
    ["Generated", new Date(data.generatedAt).toLocaleDateString("en-GB")],
    ["", ""],
    ["Executive Summary", data.executiveSummary],
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWs["!cols"] = [{ wch: 25 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

  if (data.keyAchievements.length > 0) {
    const achData = [["Key Achievements"], ...data.keyAchievements.map((a) => [a])];
    const achWs = XLSX.utils.aoa_to_sheet(achData);
    achWs["!cols"] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(wb, achWs, "Achievements");
  }

  if (data.openRisks.length > 0) {
    const riskData = [
      ["Open Risks", "Status"],
      ...data.openRisks.map((r) => [r, "Open"]),
      ...(data.resolvedRisks ?? []).map((r) => [r, "Resolved"]),
    ];
    const riskWs = XLSX.utils.aoa_to_sheet(riskData);
    riskWs["!cols"] = [{ wch: 70 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, riskWs, "Risks");
  }

  if (data.recommendedActions.length > 0) {
    const actionData = [["Recommended Actions"], ...data.recommendedActions.map((a) => [a])];
    const actionWs = XLSX.utils.aoa_to_sheet(actionData);
    actionWs["!cols"] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(wb, actionWs, "Actions");
  }

  const stratData = [
    ["Strategic Priorities", ""],
    ...data.strategicPriorities.map((p, i) => [`Priority ${i + 1}`, p]),
    ["", ""],
    ["QBR Talking Points", ""],
    ...data.qbrTalkingPoints.map((t, i) => [`Point ${i + 1}`, t]),
  ];
  const stratWs = XLSX.utils.aoa_to_sheet(stratData);
  stratWs["!cols"] = [{ wch: 20 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, stratWs, "Strategic");

  const safeName = data.clientName.replace(/[^a-zA-Z0-9]/g, "_");
  XLSX.writeFile(wb, `${safeName}_QBR.xlsx`);
}

function safeHex(color: string): string {
  if (!color) return "38BDF8";
  const hex = color.replace("#", "");
  return /^[0-9A-Fa-f]{6}$/.test(hex) ? hex.toUpperCase() : "38BDF8";
}
