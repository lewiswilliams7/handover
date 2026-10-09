import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";

import { fetchBrandLogoBytesForExcel } from "@/lib/excel-brand-logo-fetch";
import { patchXlsxBufferWithExecutiveSummaryLogo } from "@/lib/xlsx-patch-executive-logo";
import { patchXlsxBufferWithSheetTabColor } from "@/lib/xlsx-patch-tab-color";

import { isProOrTeam } from "@/lib/plans";
import {
  EXTENDED_PM_TAB_KEYS,
  EXTENDED_PM_TAB_LABELS,
  type ExtendedPmTabKey,
} from "./pm-output-tabs";
import {
  type ActionExportRow,
  type RiskExportRow,
  type FullReportOutputs,
  type FullReportExportConfig,
  type ExportMeta,
  normalizeFullReportInputs,
  safeText,
  fileBaseName,
  fileDateStamp,
  filterActionColumns,
  filterRiskColumns,
  actionCellValue,
  riskCellValue,
  inferRagFromRiskText,
  ACTION_HEADERS,
  RISK_HEADERS,
  toCsvRow,
} from "./export-parsers";

const EXTENDED_TAB_ID_SET = new Set<string>(EXTENDED_PM_TAB_KEYS);



const ACTION_COL_WCH: Record<string, number> = {
  task: 50,
  owner: 20,
  priority: 12,
  status: 15,
  due_date: 15,
  notes: 40,
  project_name: 25,
  client_name: 25,
  date_generated: 15,
};

const RISK_COL_WCH: Record<string, number> = {
  risk: 40,
  impact: 28,
  mitigation: 36,
  status: 15,
  owner: 15,
  priority: 12,
  rag: 10,
  project_name: 25,
  client_name: 25,
  date_generated: 15,
  review_date: 15,
};

type ParsedStatusReport = {
  projectStatus: string;
  progress: string;
  actions: string[];
  risks: string[];
  nextSteps: string[];
};

type ParsedTicketStatus = {
  title: string;
  client: string;
  status: string;
  owner: string;
  rag: string;
  progress: string;
  actions: Array<{ task: string; owner: string; priority: string }>;
  risks: Array<{ description: string; impact: string; mitigation: string }>;
  nextSteps: string[];
};

type XlsxStyle = {
  font?: { bold?: boolean; italic?: boolean; color?: { rgb: string }; sz?: number };
  fill?: { fgColor?: { rgb: string }; patternType?: string };
  border?: {
    top?: { style: string; color: { rgb: string } };
    bottom?: { style: string; color: { rgb: string } };
    left?: { style: string; color: { rgb: string } };
    right?: { style: string; color: { rgb: string } };
  };
  alignment?: {
    wrapText?: boolean;
    vertical?: "top" | "center" | "bottom";
    horizontal?: "left" | "center" | "right";
  };
};

/** Sentinel fills in the workbook before {@link applyExcelBranding} maps them to profile colours. */
const PRIMARY_SENTINEL = "2563EB";
const SECONDARY_SENTINEL = "1E40AF";
const TITLE_NAVY = "0F172A";

const NAVY = TITLE_NAVY;
const WHITE = "FFFFFF";
const ROW_EVEN = "F8FAFC";
const ROW_ODD = "FFFFFF";
const FOOTER_GREY = "94A3B8";

/** @deprecated use PRIMARY_SENTINEL - kept for readability in older comments */
const HANDOVER_NAVY = PRIMARY_SENTINEL;

function normalizeBrandColor(raw: string | null | undefined): string {
  if (typeof raw !== "string") return PRIMARY_SENTINEL;
  const trimmed = raw.trim();
  const m = /^#?([0-9a-fA-F]{6})$/.exec(trimmed);
  if (!m) return PRIMARY_SENTINEL;
  return m[1].toUpperCase();
}

function normalizeBrandSecondaryColor(raw: string | null | undefined): string {
  if (typeof raw !== "string") return SECONDARY_SENTINEL;
  const trimmed = raw.trim();
  const m = /^#?([0-9a-fA-F]{6})$/.exec(trimmed);
  if (!m) return SECONDARY_SENTINEL;
  return m[1].toUpperCase();
}

function shiftRowsDown(ws: XLSX.WorkSheet, rowCount: number): void {
  if (rowCount <= 0) return;
  const ref = ws["!ref"];
  if (!ref) return;
  const range = XLSX.utils.decode_range(ref);
  const next: XLSX.WorkSheet = {};
  for (let r = range.s.r; r <= range.e.r; r += 1) {
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const from = XLSX.utils.encode_cell({ r, c });
      const cell = ws[from];
      if (!cell) continue;
      const to = XLSX.utils.encode_cell({ r: r + rowCount, c });
      next[to] = cell;
    }
  }
  Object.keys(ws).forEach((k) => {
    if (!k.startsWith("!")) delete ws[k];
  });
  Object.assign(ws, next);
  ws["!ref"] = XLSX.utils.encode_range({
    s: { r: range.s.r, c: range.s.c },
    e: { r: range.e.r + rowCount, c: range.e.c },
  });
  if (ws["!rows"] && ws["!rows"]!.length > 0) {
    const prevRows = ws["!rows"]!;
    const shifted: NonNullable<XLSX.WorkSheet["!rows"]> = Array.from(
      { length: rowCount },
      () => ({}),
    );
    for (let i = 0; i < prevRows.length; i += 1) shifted.push(prevRows[i] ?? {});
    ws["!rows"] = shifted;
  }
  if (ws["!merges"] && ws["!merges"]!.length > 0) {
    ws["!merges"] = ws["!merges"]!.map((m) => ({
      s: { r: m.s.r + rowCount, c: m.s.c },
      e: { r: m.e.r + rowCount, c: m.e.c },
    }));
  }
}

function getCellFillRgbUpper(cell: XLSX.CellObject | undefined): string | null {
  const rgb = (cell as { s?: XlsxStyle })?.s?.fill?.fgColor?.rgb;
  if (typeof rgb !== "string") return null;
  return rgb.replace(/^#/, "").toUpperCase();
}

function applyPrimaryTableHeaderCellStyle(cell: XLSX.CellObject | undefined, fillRgb: string): void {
  setCellStyle(cell, {
    font: { bold: true, color: { rgb: WHITE }, sz: 11 },
    fill: { patternType: "solid", fgColor: { rgb: fillRgb } },
    alignment: { wrapText: true, vertical: "center", horizontal: "center" },
    border: {
      bottom: { style: "medium", color: { rgb: WHITE } },
    },
  });
}

function applySecondarySubheaderCellStyle(cell: XLSX.CellObject | undefined, fillRgb: string): void {
  setCellStyle(cell, {
    font: { bold: true, color: { rgb: WHITE }, sz: 11 },
    fill: { patternType: "solid", fgColor: { rgb: fillRgb } },
    alignment: { wrapText: true, vertical: "center", horizontal: "center" },
    border: {
      bottom: { style: "thin", color: { rgb: fillRgb } },
    },
  });
}

function remapSentinelFillsOnSheet(
  ws: XLSX.WorkSheet,
  primaryRgb: string,
  secondaryRgb: string,
): Set<number> {
  const styledHeaderRows = new Set<number>();
  const ref = ws["!ref"];
  if (!ref) return styledHeaderRows;
  const range = XLSX.utils.decode_range(ref);
  for (let r = range.s.r; r <= range.e.r; r += 1) {
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      const u = getCellFillRgbUpper(cell);
      if (u === PRIMARY_SENTINEL) {
        applyPrimaryTableHeaderCellStyle(cell, primaryRgb);
        styledHeaderRows.add(r);
      } else if (u === SECONDARY_SENTINEL) {
        applySecondarySubheaderCellStyle(cell, secondaryRgb);
        styledHeaderRows.add(r);
      } else if (u === TITLE_NAVY) {
        applyPrimaryTableHeaderCellStyle(cell, primaryRgb);
        styledHeaderRows.add(r);
      }
    }
  }
  for (const r of styledHeaderRows) setRowHeight(ws, r, 28);
  return styledHeaderRows;
}

function estimateCellDisplayLength(cell: XLSX.CellObject | undefined): number {
  if (!cell) return 0;
  if (cell.w != null && String(cell.w).length > 0) return String(cell.w).length;
  const v = cell.v;
  if (v == null) return 0;
  return Math.min(String(v).length + 2, 220);
}

function applyAutoColumnWidths(ws: XLSX.WorkSheet, minWch: number, maxWch: number): void {
  const ref = ws["!ref"];
  if (!ref) return;
  const range = XLSX.utils.decode_range(ref);
  const wchs: number[] = [];
  for (let c = range.s.c; c <= range.e.c; c += 1) {
    let maxLen = minWch;
    for (let r = range.s.r; r <= range.e.r; r += 1) {
      const addr = XLSX.utils.encode_cell({ r, c });
      maxLen = Math.max(maxLen, Math.min(maxWch, estimateCellDisplayLength(ws[addr])));
    }
    wchs.push(maxLen);
  }
  ws["!cols"] = wchs.map((wch) => ({ wch }));
}

function isLikelyTableHeaderRow(ws: XLSX.WorkSheet, row: number): boolean {
  const ref = ws["!ref"];
  if (!ref) return false;
  const range = XLSX.utils.decode_range(ref);
  let hits = 0;
  for (let c = range.s.c; c <= range.e.c; c += 1) {
    const v = getCellString(ws, row, c).trim();
    if (
      /^(Priority|Status|RAG|Task|Owner|Risk|Impact|Mitigation|Metric|Value|Step|Date|Channel)$/i.test(
        v,
      )
    )
      hits += 1;
  }
  return hits >= 2;
}

function applyPriorityColumnFormatting(ws: XLSX.WorkSheet, col: number, r0: number, r1: number): void {
  for (let r = r0; r <= r1; r += 1) {
    const raw = getCellString(ws, r, col).trim().toLowerCase();
    let fill: string | null = null;
    if (raw === "high" || raw === "critical") fill = "FEE2E2";
    else if (raw === "medium") fill = "FEF3C7";
    else if (raw === "low") fill = "DCFCE7";
    if (!fill) continue;
    const addr = XLSX.utils.encode_cell({ r, c: col });
    setCellStyle(ws[addr], {
      fill: { patternType: "solid", fgColor: { rgb: fill } },
      font: { sz: 10 },
      alignment: { wrapText: true, vertical: "top" },
    });
  }
}

function applyStatusColumnFormatting(ws: XLSX.WorkSheet, col: number, r0: number, r1: number): void {
  for (let r = r0; r <= r1; r += 1) {
    const raw = getCellString(ws, r, col).trim();
    const s = raw.toLowerCase().replace(/\s+/g, " ");
    let fill: string | null = null;
    if (/\boverdue\b/.test(s)) fill = "FEE2E2";
    else if (/\bin progress\b/.test(s)) fill = "DBEAFE";
    else if (/\bon hold\b/.test(s)) fill = "F3F4F6";
    else if (/\b(complete|done|closed|resolved)\b/.test(s)) fill = "DCFCE7";
    if (!fill) continue;
    const addr = XLSX.utils.encode_cell({ r, c: col });
    setCellStyle(ws[addr], {
      fill: { patternType: "solid", fgColor: { rgb: fill } },
      font: { sz: 10 },
      alignment: { wrapText: true, vertical: "top" },
    });
  }
}

function applyRagColumnFormatting(ws: XLSX.WorkSheet, col: number, r0: number, r1: number): void {
  for (let r = r0; r <= r1; r += 1) {
    const raw = getCellString(ws, r, col).trim().toLowerCase();
    let fill: string | null = null;
    if (raw === "red") fill = "EF4444";
    else if (raw === "amber") fill = "F59E0B";
    else if (raw === "green") fill = "22C55E";
    if (!fill) continue;
    const addr = XLSX.utils.encode_cell({ r, c: col });
    setCellStyle(ws[addr], {
      fill: { patternType: "solid", fgColor: { rgb: fill } },
      font: { bold: true, color: { rgb: WHITE }, sz: 10 },
      alignment: { wrapText: true, vertical: "center", horizontal: "center" },
    });
  }
}

function sweepPriorityStatusRagFormatting(ws: XLSX.WorkSheet): void {
  const ref = ws["!ref"];
  if (!ref) return;
  const range = XLSX.utils.decode_range(ref);
  const lastR = range.e.r;
  for (let r = range.s.r; r < lastR; r += 1) {
    const pCol = findHeaderColumn(ws, r, "Priority");
    const sCol = findHeaderColumn(ws, r, "Status");
    const ragCol = findHeaderColumn(ws, r, "RAG");
    if (pCol < 0 && sCol < 0 && ragCol < 0) continue;
    let endR = lastR;
    for (let nr = r + 1; nr <= lastR; nr += 1) {
      if (isLikelyTableHeaderRow(ws, nr)) {
        endR = nr - 1;
        break;
      }
    }
    if (pCol >= 0) applyPriorityColumnFormatting(ws, pCol, r + 1, endR);
    if (sCol >= 0) applyStatusColumnFormatting(ws, sCol, r + 1, endR);
    if (ragCol >= 0) applyRagColumnFormatting(ws, ragCol, r + 1, endR);
  }
}

function appendFooterRow(ws: XLSX.WorkSheet, text: string): number {
  if (!ws["!ref"]) {
    ws["A1"] = { t: "str", v: "" };
    ws["!ref"] = "A1:A1";
  }
  const ref = ws["!ref"]!;
  const range = XLSX.utils.decode_range(ref);
  const footerRow = range.e.r + 1;
  const footerAddr = XLSX.utils.encode_cell({ r: footerRow, c: 0 });
  ws[footerAddr] = { t: "str", v: text };
  setCellStyle(ws[footerAddr], {
    font: { sz: 8, color: { rgb: FOOTER_GREY } },
    alignment: { wrapText: true, vertical: "top", horizontal: "left" },
  });
  ws["!ref"] = XLSX.utils.encode_range({
    s: { r: range.s.r, c: range.s.c },
    e: { r: footerRow, c: range.e.c },
  });
  return footerRow;
}

function applyDataTypography(
  ws: XLSX.WorkSheet,
  headerRows: Set<number>,
  footerRow: number,
  coverRows: Set<number>,
): void {
  const ref = ws["!ref"];
  if (!ref) return;
  const range = XLSX.utils.decode_range(ref);
  for (let r = range.s.r; r <= range.e.r; r += 1) {
    if (r === footerRow) continue;
    if (headerRows.has(r) || coverRows.has(r)) continue;
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (!cell || cell.t === "z") continue;
      setCellStyle(cell, {
        font: { sz: 10 },
        alignment: { wrapText: true, vertical: "top" },
      });
    }
  }
}

function applyExecutiveSummaryCover(
  ws: XLSX.WorkSheet,
  opts: {
    brandName: string;
    brandRgb: string;
    secondaryRgb: string;
    reportDate: string;
    /** Extra top row for brand logo (OOXML); coloured header moves to row 2. */
    reserveLogoRow?: boolean;
  },
): void {
  const ref = ws["!ref"];
  if (!ref) return;
  const range = XLSX.utils.decode_range(ref);
  const maxC = Math.max(range.e.c, 4);
  const brand = opts.brandName.trim() || "Handover";
  const subtitle = `Report generated: ${opts.reportDate} · ${brand}`;
  const reserve = opts.reserveLogoRow === true;

  if (reserve) {
    const logoR = 0;
    const titleR = 1;
    const subR = 2;
    for (let c = 0; c <= maxC; c += 1) {
      ws[XLSX.utils.encode_cell({ r: logoR, c })] = { t: "str", v: "" };
    }
    for (let c = 0; c <= maxC; c += 1) {
      const addr = XLSX.utils.encode_cell({ r: titleR, c });
      ws[addr] = c === 0 ? { t: "str", v: brand } : { t: "str", v: "" };
    }
    ws[XLSX.utils.encode_cell({ r: subR, c: 0 })] = { t: "str", v: subtitle };
    for (let c = 1; c <= maxC; c += 1) {
      ws[XLSX.utils.encode_cell({ r: subR, c })] = { t: "str", v: "" };
    }
    ws["!merges"] = [
      { s: { r: logoR, c: 0 }, e: { r: logoR, c: maxC } },
      { s: { r: titleR, c: 0 }, e: { r: titleR, c: maxC } },
      { s: { r: subR, c: 0 }, e: { r: subR, c: maxC } },
    ];
    const titleCell = ws[XLSX.utils.encode_cell({ r: titleR, c: 0 })];
    setCellStyle(titleCell, {
      font: { bold: true, color: { rgb: WHITE }, sz: 16 },
      fill: { patternType: "solid", fgColor: { rgb: opts.brandRgb } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
    });
    const sub = ws[XLSX.utils.encode_cell({ r: subR, c: 0 })];
    setCellStyle(sub, {
      font: { sz: 10, color: { rgb: opts.secondaryRgb } },
      alignment: { horizontal: "left", vertical: "center", wrapText: true },
      fill: { patternType: "none" },
    });
    // ~60 CSS px row height → Excel points (96dpi): 60 * 72/96
    setRowHeight(ws, logoR, 45);
    setRowHeight(ws, titleR, 50);
    setRowHeight(ws, subR, 24);
  } else {
    for (let c = 0; c <= 4; c += 1) {
      const addr = XLSX.utils.encode_cell({ r: 0, c });
      ws[addr] = c === 0 ? { t: "str", v: brand } : { t: "str", v: "" };
    }
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    ];

    ws[XLSX.utils.encode_cell({ r: 1, c: 0 })] = { t: "str", v: subtitle };
    for (let c = 1; c <= 4; c += 1) {
      ws[XLSX.utils.encode_cell({ r: 1, c })] = { t: "str", v: "" };
    }

    const titleCell = ws[XLSX.utils.encode_cell({ r: 0, c: 0 })];
    setCellStyle(titleCell, {
      font: { bold: true, color: { rgb: WHITE }, sz: 16 },
      fill: { patternType: "solid", fgColor: { rgb: opts.brandRgb } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
    });

    const sub = ws[XLSX.utils.encode_cell({ r: 1, c: 0 })];
    setCellStyle(sub, {
      font: { sz: 10, color: { rgb: opts.secondaryRgb } },
      alignment: { horizontal: "left", vertical: "center", wrapText: true },
      fill: { patternType: "none" },
    });

    setRowHeight(ws, 0, 50);
    setRowHeight(ws, 1, 24);
  }

  ws["!ref"] = XLSX.utils.encode_range({
    s: { r: range.s.r, c: 0 },
    e: { r: Math.max(range.e.r, reserve ? 2 : 1), c: maxC },
  });
}

/** Client Email sheet: plain layout - alternating row fills only (no branded header cells). */
function stripeClientEmailPlainRows(ws: XLSX.WorkSheet): void {
  const ref = ws["!ref"];
  if (!ref) return;
  const range = XLSX.utils.decode_range(ref);
  for (let r = range.s.r; r <= range.e.r; r += 1) {
    const stripe = (r - range.s.r) % 2 === 0 ? ROW_EVEN : ROW_ODD;
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (!cell || cell.t === "z") continue;
      setCellStyle(cell, {
        fill: { patternType: "solid", fgColor: { rgb: stripe } },
        alignment: { wrapText: true, vertical: "top" },
      });
    }
  }
}

export function applyExcelBranding(
  wb: XLSX.WorkBook,
  options: {
    brandColor: string | null | undefined;
    brandSecondaryColor?: string | null | undefined;
    brandLogoUrl?: string | null | undefined;
    brandName?: string | null | undefined;
    reportDate?: string | null | undefined;
    coverClientName?: string | null | undefined;
    coverProjectName?: string | null | undefined;
    /** When true with a brand name, footer is partner-only (no Handover / URL). */
    whiteLabelMode?: boolean;
  },
): void {
  if (wb.SheetNames.length === 0) return;
  const primaryRgb = normalizeBrandColor(options.brandColor);
  const secondaryRgb = normalizeBrandSecondaryColor(options.brandSecondaryColor);
  const brandLabel = safeText(options.brandName).trim() || "Handover";
  const reportDate = safeText(options.reportDate).trim() || fileDateStamp();
  const partnerFooter =
    options.whiteLabelMode === true && safeText(options.brandName).trim().length > 0;
  const footerText = partnerFooter
    ? `Generated by ${brandLabel} · ${reportDate}`
    : `Generated by ${brandLabel} · gethandover.uk · ${reportDate}`;

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    if (sheetName === "Executive Summary") {
      const reserveLogoRow = Boolean(safeText(options.brandLogoUrl).trim());
      applyExecutiveSummaryCover(ws, {
        brandName: brandLabel,
        brandRgb: primaryRgb,
        secondaryRgb,
        reportDate,
        reserveLogoRow,
      });
    }
    if (sheetName === "Client Email") {
      stripeClientEmailPlainRows(ws);
    }

    applyAutoColumnWidths(ws, 15, 45);
    const headerRows = remapSentinelFillsOnSheet(ws, primaryRgb, secondaryRgb);
    const coverRows =
      sheetName === "Executive Summary"
        ? Boolean(safeText(options.brandLogoUrl).trim())
          ? new Set([0, 1, 2])
          : new Set([0, 1])
        : new Set<number>();

    sweepPriorityStatusRagFormatting(ws);

    const footerRow = appendFooterRow(ws, footerText);
    applyDataTypography(ws, headerRows, footerRow, coverRows);
  }
}


function downloadBlob(blob: Blob, filename: string): void {
  saveAs(blob, filename);
}

function setCellStyle(cell: XLSX.CellObject | undefined, style: XlsxStyle): void {
  if (!cell) return;
  const prev = (cell as XLSX.CellObject & { s?: XlsxStyle }).s;
  (cell as XLSX.CellObject & { s?: XlsxStyle }).s = {
    ...prev,
    ...style,
    font: { ...prev?.font, ...style.font },
    fill: style.fill ?? prev?.fill,
    border: style.border ? { ...prev?.border, ...style.border } : prev?.border,
    alignment: { ...prev?.alignment, ...style.alignment },
  };
}

function setRowHeight(ws: XLSX.WorkSheet, rowIndex: number, hpt: number): void {
  if (!ws["!rows"]) ws["!rows"] = [];
  const rows = ws["!rows"]!;
  while (rows.length <= rowIndex) rows.push({});
  rows[rowIndex] = { ...rows[rowIndex], hpt };
}

function applyWrapToRange(
  ws: XLSX.WorkSheet,
  r0: number,
  r1: number,
  c0: number,
  c1: number,
): void {
  for (let R = r0; R <= r1; R += 1) {
    for (let C = c0; C <= c1; C += 1) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr];
      if (!cell || cell.t === "z") continue;
      setCellStyle(cell, { alignment: { wrapText: true, vertical: "top" } });
    }
  }
}

function applyWrapToAllCells(ws: XLSX.WorkSheet): void {
  const ref = ws["!ref"];
  if (!ref) return;
  const range = XLSX.utils.decode_range(ref);
  applyWrapToRange(ws, range.s.r, range.e.r, range.s.c, range.e.c);
}

function styleHeaderBand(
  ws: XLSX.WorkSheet,
  rowIndex: number,
  colCount: number,
  variant: "primary" | "secondary",
): void {
  const rgb = variant === "primary" ? PRIMARY_SENTINEL : SECONDARY_SENTINEL;
  for (let c = 0; c < colCount; c += 1) {
    const addr = XLSX.utils.encode_cell({ r: rowIndex, c });
    const cell = ws[addr];
    if (!cell) continue;
    setCellStyle(cell, {
      font: { bold: true, color: { rgb: WHITE }, sz: 11 },
      fill: { patternType: "solid", fgColor: { rgb } },
      alignment: { wrapText: true, vertical: "center", horizontal: "center" },
      border: {
        bottom: {
          style: variant === "primary" ? "medium" : "thin",
          color: { rgb: WHITE },
        },
      },
    });
  }
  setRowHeight(ws, rowIndex, 28);
}

function styleNavyHeaderRow(ws: XLSX.WorkSheet, rowIndex: number, colCount: number): void {
  styleHeaderBand(ws, rowIndex, colCount, "primary");
}

function styleSubheaderRow(ws: XLSX.WorkSheet, rowIndex: number, colCount: number): void {
  styleHeaderBand(ws, rowIndex, colCount, "secondary");
}

function styleTitleMergedRow(ws: XLSX.WorkSheet, rowIndex: number, colCount: number): void {
  for (let c = 0; c < Math.min(colCount, 3); c += 1) {
    const addr = XLSX.utils.encode_cell({ r: rowIndex, c });
    const cell = ws[addr];
    if (!cell) continue;
    setCellStyle(cell, {
      font: { bold: true, color: { rgb: WHITE }, sz: 14 },
      fill: { patternType: "solid", fgColor: { rgb: NAVY } },
      alignment: { wrapText: true, vertical: "center" },
    });
  }
  setRowHeight(ws, rowIndex, 26);
}

function setColWidths(ws: XLSX.WorkSheet, wchs: number[]): void {
  ws["!cols"] = wchs.map((wch) => ({ wch }));
}

function trimTopRows(ws: XLSX.WorkSheet, rowCount: number): void {
  const ref = ws["!ref"];
  if (!ref || rowCount <= 0) return;
  const range = XLSX.utils.decode_range(ref);
  if (range.e.r < rowCount) return;
  const next: XLSX.WorkSheet = {};
  for (let r = rowCount; r <= range.e.r; r += 1) {
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const from = XLSX.utils.encode_cell({ r, c });
      const cell = ws[from];
      if (!cell) continue;
      const to = XLSX.utils.encode_cell({ r: r - rowCount, c });
      next[to] = cell;
    }
  }
  next["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: range.s.c },
    e: { r: Math.max(0, range.e.r - rowCount), c: range.e.c },
  });
  if (ws["!cols"]) next["!cols"] = ws["!cols"];
  Object.keys(ws).forEach((k) => {
    if (!k.startsWith("!")) delete ws[k];
  });
  Object.assign(ws, next);
}

function styleAlternatingRows(
  ws: XLSX.WorkSheet,
  startRow: number,
  endRow: number,
  colCount: number,
): void {
  for (let r = startRow; r <= endRow; r += 1) {
    const fill = {
      patternType: "solid" as const,
      fgColor: { rgb: (r - startRow) % 2 === 0 ? ROW_EVEN : ROW_ODD },
    };
    for (let c = 0; c < colCount; c += 1) {
      const addr = XLSX.utils.encode_cell({ r, c });
      setCellStyle(ws[addr], {
        fill,
        font: { sz: 10 },
        alignment: { wrapText: true, vertical: "top" },
      });
    }
    setRowHeight(ws, r, 16);
  }
}

function getCellString(ws: XLSX.WorkSheet, r: number, c: number): string {
  try {
    if (c === undefined || c === null) return "";
    const addr = XLSX.utils.encode_cell({ r, c });
    if (!addr) return "";
    const v = ws[addr]?.v;
    return v == null ? "" : String(v);
  } catch {
    return "";
  }
}

function findHeaderColumn(ws: XLSX.WorkSheet, headerRow: number, headerText: string): number {
  try {
    const ref = ws["!ref"];
    if (!ref) return -1;
    const range = XLSX.utils.decode_range(ref);
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      try {
        const addr = XLSX.utils.encode_cell({ r: headerRow, c: col });
        const cell = ws[addr];
        if (!cell) continue;
        const val = cell.v == null ? "" : String(cell.v);
        if (val.trim().toLowerCase() === headerText.trim().toLowerCase()) {
          return col;
        }
      } catch {
        continue;
      }
    }
    return -1;
  } catch {
    return -1;
  }
}

function applyFillAt(ws: XLSX.WorkSheet, r: number, c: number, rgb: string): void {
  const addr = XLSX.utils.encode_cell({ r, c });
  setCellStyle(ws[addr], {
    fill: { patternType: "solid", fgColor: { rgb } },
    alignment: { wrapText: true, vertical: "top" },
  });
}

function applyTableConditionalFormatting(
  ws: XLSX.WorkSheet,
  headerRow: number,
  rules: Array<{ column: string; resolver: (value: string) => string | null }>,
): void {
  try {
    const ref = ws["!ref"];
    if (!ref) return;
    const range = XLSX.utils.decode_range(ref);

    for (const rule of rules) {
      try {
        const col = findHeaderColumn(ws, headerRow, rule.column);
        if (col < 0 || col === undefined) continue;

        for (let r = headerRow + 1; r <= range.e.r; r += 1) {
          try {
            const addr = XLSX.utils.encode_cell({ r, c: col });
            const cell = ws[addr];
            if (!cell || cell.t === "z") continue;
            const val = cell.v == null ? "" : String(cell.v);
            if (!val.trim()) continue;

            const fill = rule.resolver(val);
            if (fill) {
              applyFillAt(ws, r, col, fill);
            }
          } catch {
            continue;
          }
        }
      } catch {
        continue;
      }
    }
  } catch (err) {
    console.error("[excel] conditional formatting error:", err);
  }
}


export function exportActionsCSV(
  actions: ActionExportRow[],
  projectName: string,
  columns: string[],
  meta?: ExportMeta,
): void {
  const order = filterActionColumns(columns);
  if (order.length === 0) return;

  const base = fileBaseName(projectName);
  const date = fileDateStamp();
  const genDate = meta?.generatedDate ?? date;
  const header = toCsvRow(order.map((k) => ACTION_HEADERS[k] ?? k));
  const lines = actions.map((a) =>
    toCsvRow(order.map((k) => actionCellValue(k, a, projectName, meta, genDate))),
  );
  const csv = [header, ...lines].join("\r\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${base}-action-log-${date}.csv`);
}

export function exportRisksCSV(
  risks: RiskExportRow[],
  projectName: string,
  columns: string[],
  meta?: ExportMeta,
): void {
  const order = filterRiskColumns(columns);
  if (order.length === 0) return;

  const base = fileBaseName(projectName);
  const date = fileDateStamp();
  const genDate = meta?.generatedDate ?? date;
  const header = toCsvRow(order.map((k) => RISK_HEADERS[k] ?? k));
  const lines = risks.map((r) =>
    toCsvRow(order.map((k) => riskCellValue(k, r, projectName, meta, genDate))),
  );
  const csv = [header, ...lines].join("\r\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${base}-risk-log-${date}.csv`);
}

export function exportStatusReportTXT(statusReport: string, projectName: string): void {
  const base = fileBaseName(projectName);
  const date = fileDateStamp();
  downloadBlob(
    new Blob([safeText(statusReport)], { type: "text/plain;charset=utf-8" }),
    `${base}-status-report-${date}.txt`,
  );
}

export function exportClientEmailTXT(subject: string, email: string, projectName: string): void {
  const base = fileBaseName(projectName);
  const date = fileDateStamp();
  const body = `${safeText(subject)}\r\n\r\n${safeText(email)}`.trimEnd() + "\r\n";
  downloadBlob(new Blob([body], { type: "text/plain;charset=utf-8" }), `${base}-client-email-${date}.txt`);
}

function widthForActionKey(key: string): number {
  return ACTION_COL_WCH[key] ?? 18;
}

function widthForRiskKey(key: string): number {
  return RISK_COL_WCH[key] ?? 18;
}

function buildActionSheet(
  outputs: ActionExportRow[],
  columns: string[],
  projectName: string,
  meta: ExportMeta | undefined,
  genDate: string,
  sourceColumn?: string[] | null,
): XLSX.WorkSheet {
  const order = filterActionColumns(columns);
  const withTicketProject = [...order];
  const clientIdx = withTicketProject.indexOf("client_name");
  if (!withTicketProject.includes("ticket_project")) {
    if (clientIdx >= 0) withTicketProject.splice(clientIdx + 1, 0, "ticket_project");
    else withTicketProject.push("ticket_project");
  }
  const finalOrder = withTicketProject;
  if (finalOrder.length === 0) {
    return XLSX.utils.aoa_to_sheet([["No columns selected"]]);
  }
  const includeSource =
    Array.isArray(sourceColumn) &&
    sourceColumn.length === outputs.length &&
    outputs.length > 0;
  let header = finalOrder.map((k) =>
    k === "ticket_project" ? "Ticket/Project" : (ACTION_HEADERS[k] ?? k),
  );
  let rows = outputs.map((a) =>
    finalOrder.map((k) => actionCellValue(k, a, projectName, meta, genDate)),
  );
  if (includeSource) {
    header = [...header, "Source"];
    rows = rows.map((row, i) => [...row, sourceColumn![i] ?? ""]);
  }
  const colCount = header.length;
  const titleText = `Handover Report - ${genDate}`;
  const titlePad = Array.from({ length: colCount - 1 }, () => "");
  const aoa: string[][] = [[titleText, ...titlePad], Array.from({ length: colCount }, () => ""), header, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const lastRow = Math.max(2 + rows.length, 2);
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow, c: colCount - 1 } });
  const widths = finalOrder.map((k) => (k === "ticket_project" ? 38 : widthForActionKey(k)));
  if (includeSource) widths.push(22);
  setColWidths(ws, widths);

  styleTitleMergedRow(ws, 0, colCount);
  styleNavyHeaderRow(ws, 2, colCount);

  for (let i = 0; i < rows.length; i += 1) {
    const sheetRow = 3 + i;
    const isEven = i % 2 === 0;
    const baseFill = { patternType: "solid" as const, fgColor: { rgb: isEven ? ROW_EVEN : ROW_ODD } };
    for (let c = 0; c < colCount; c += 1) {
      const addr = XLSX.utils.encode_cell({ r: sheetRow, c });
      const cell = ws[addr];
      if (!cell) continue;
      setCellStyle(cell, {
        fill: baseFill,
        alignment: { wrapText: true, vertical: "top" },
      });
    }
  }

  applyWrapToRange(ws, 0, lastRow, 0, colCount - 1);
  return ws;
}

const RISK_LOG_SHEET_COLUMNS = [
  "risk",
  "impact",
  "mitigation",
  "owner",
  "rag",
] as const;

function buildRiskSheet(
  outputs: RiskExportRow[],
  columns: string[],
  projectName: string,
  meta: ExportMeta | undefined,
  genDate: string,
  sourceColumn?: string[] | null,
): XLSX.WorkSheet {
  const filtered = filterRiskColumns(columns);
  const order =
    filtered.length > 0
      ? [
          ...filtered,
          ...RISK_LOG_SHEET_COLUMNS.filter((k) => !filtered.includes(k)),
        ]
      : [...RISK_LOG_SHEET_COLUMNS];
  const includeSource =
    Array.isArray(sourceColumn) &&
    sourceColumn.length === outputs.length &&
    outputs.length > 0;
  let header = order.map((k) => RISK_HEADERS[k] ?? k);
  let rows = outputs.map((r) => order.map((k) => riskCellValue(k, r, projectName, meta, genDate)));
  if (includeSource) {
    header = [...header, "Source"];
    rows = rows.map((row, i) => [...row, sourceColumn![i] ?? ""]);
  }
  const colCount = header.length;
  const titleText = `Handover Report - ${genDate}`;
  const titlePad = Array.from({ length: colCount - 1 }, () => "");
  const aoa: string[][] = [[titleText, ...titlePad], Array.from({ length: colCount }, () => ""), header, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const lastRow = Math.max(2 + rows.length, 2);
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow, c: colCount - 1 } });
  const widths = order.map(widthForRiskKey);
  if (includeSource) widths.push(22);
  setColWidths(ws, widths);
  styleTitleMergedRow(ws, 0, colCount);
  styleNavyHeaderRow(ws, 2, colCount);

  for (let i = 0; i < rows.length; i += 1) {
    const sheetRow = 3 + i;
    const isEven = i % 2 === 0;
    const baseFill = { patternType: "solid" as const, fgColor: { rgb: isEven ? ROW_EVEN : ROW_ODD } };
    for (let c = 0; c < colCount; c += 1) {
      const addr = XLSX.utils.encode_cell({ r: sheetRow, c });
      const cell = ws[addr];
      if (!cell) continue;
      setCellStyle(cell, {
        fill: baseFill,
        alignment: { wrapText: true, vertical: "top" },
      });
    }
  }

  applyWrapToRange(ws, 0, lastRow, 0, colCount - 1);
  return ws;
}

function parseStatusReportSections(text: string): ParsedStatusReport {
  return {
    projectStatus: sectionBody(text, "PROJECT STATUS"),
    progress: sectionBody(text, "PROGRESS"),
    actions: splitNumberedItems(sectionBody(text, "ACTIONS")),
    risks: splitNumberedItems(sectionBody(text, "RISKS AND ISSUES")),
    nextSteps: splitNumberedItems(sectionBody(text, "NEXT STEPS")),
  };
}

function parseStatusReportMultiTicket(text: string): ParsedTicketStatus[] {
  const tickets: ParsedTicketStatus[] = [];
  const blocks = text.split(/\n\s*---\s*\n/).filter((s) => s.trim());

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    const titleLine = lines[0].replace(/\*\*/g, "").trim();
    const titleMatch = titleLine.match(/^(.*?)\s*[—–]\s*(.*)$/);
    const title = titleMatch ? titleMatch[1].trim() : titleLine;
    const client = titleMatch ? titleMatch[2].trim() : "";

    const metaLine = lines.find((l) => l.includes("Status:") && l.includes("RAG:")) || "";
    const statusMatch = metaLine.match(/Status:\s*([^|]+)/i);
    const ownerMatch = metaLine.match(/Owner:\s*([^|]+)/i);
    const ragMatch = metaLine.match(/RAG:\s*([^|]+)/i);

    const progressMatch = block.match(/Progress:\s*([\s\S]*?)(?=\nActions:|$)/i);
    const actionsMatch = block.match(/Actions:\s*([\s\S]*?)(?=\nRisks:|$)/i);
    const risksMatch = block.match(/Risks:\s*([\s\S]*?)(?=\nNext Steps:|$)/i);
    const nextStepsMatch = block.match(/Next Steps:\s*([\s\S]*?)(?=$)/i);
    let progress = progressMatch?.[1]?.trim() || "";

    const actionLines = (actionsMatch?.[1] || "")
      .split("\n")
      .filter((l) => /^\d+\./.test(l.trim()));
    let parsedActions = actionLines.map((line) => {
      const clean = line.replace(/^\d+\.\s*/, "").trim();
      const m = clean.match(/^(.*?)\s*[—–-]\s*(.*?)\s*[—–-]\s*(.*)$/);
      return {
        task: m?.[1]?.trim() || clean,
        owner: m?.[2]?.trim() || "TBC",
        priority: m?.[3]?.trim() || "",
      };
    });
    if (!progress) {
      const progressFallback = block.match(/Progress:\s*([\s\S]*?)(?=\nActions:|$)/i);
      progress = progressFallback?.[1]?.trim() || "";
    }
    if (!parsedActions.length) {
      const actionsFallback = block.match(/Actions:\s*([\s\S]*?)(?=\nRisks:|$)/i);
      const actionText = actionsFallback?.[1] || "";
      const actionLines = actionText.split("\n").filter((l) => /^\d+\./.test(l.trim()));
      parsedActions = actionLines.map((line) => {
        const clean = line.replace(/^\d+\.\s*/, "").trim();
        const m = clean.match(/^(.*?)\s*[—–-]\s*(.*?)\s*[—–-]\s*(.*)$/);
        return {
          task: m?.[1]?.trim() || clean,
          owner: m?.[2]?.trim() || "TBC",
          priority: m?.[3]?.trim() || "",
        };
      });
    }

    const riskBody = risksMatch?.[1] || "";
    const riskBlocks = riskBody
      .split(/(?=^\s*\d+\.\s)/m)
      .map((r) => r.trim())
      .filter(Boolean);
    const parsedRisks = riskBlocks.map((riskBlock) => {
      const firstLine = riskBlock.split("\n")[0] || "";
      const description = firstLine.replace(/^\d+\.\s*/, "").trim();
      const impactMatch = riskBlock.match(/Impact:\s*([^\n]+)/i);
      const mitigationMatch = riskBlock.match(/Mitigation:\s*([^\n]+)/i);
      return {
        description,
        impact: impactMatch?.[1]?.trim() || "",
        mitigation: mitigationMatch?.[1]?.trim() || "",
      };
    });

    const nextStepLines = (nextStepsMatch?.[1] || "")
      .split("\n")
      .filter((l) => /^\d+\./.test(l.trim()))
      .map((l) => l.replace(/^\d+\.\s*/, "").trim());

    tickets.push({
      title,
      client,
      status: statusMatch?.[1]?.trim() || "",
      owner: ownerMatch?.[1]?.trim() || "TBC",
      rag: ragMatch?.[1]?.trim() || "",
      progress,
      actions: parsedActions,
      risks: parsedRisks,
      nextSteps: nextStepLines,
    });
  }

  if (!tickets.length) {
    tickets.push({
      title: "Status Report",
      client: "",
      status: "",
      owner: "TBC",
      rag: "",
      progress: text,
      actions: [],
      risks: [],
      nextSteps: [],
    });
  }

  return tickets;
}

/** Split status report text into per-ticket blocks (UI / PSA push). */

function buildMeetingNotesTemplateSheet(): XLSX.WorkSheet {
  const template = [
    ["Date", ""],
    ["Attendees", ""],
    ["", ""],
    ["Discussion", ""],
    ["", ""],
    ["Actions", ""],
    ["", ""],
    ["Next meeting", ""],
    ["", ""],
  ];
  const ws = XLSX.utils.aoa_to_sheet(template);
  ws["!cols"] = [{ wch: 22 }, { wch: 70 }];
  applyWrapToAllCells(ws);
  return ws;
}

function buildProseDeliverableSheet(sheetTitle: string, body: string, genDate: string): XLSX.WorkSheet {
  const lines = safeText(body).split(/\r?\n/);
  const colCount = 1;
  const title = `${sheetTitle} - ${genDate}`;
  const aoa: string[][] = [[title], ...lines.map((line) => [line])];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const lastRow = Math.max(aoa.length - 1, 0);
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow, c: 0 } });
  ws["!cols"] = [{ wch: 100 }];
  styleTitleMergedRow(ws, 0, 1);
  applyWrapToAllCells(ws);
  return ws;
}

function stripMarkdownForExcel(content: string): string {
  return content
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^---$/gm, "")
    .replace(/^- /gm, "• ")
    .trim();
}

function parseMeetingPrepSectionBuckets(body: string): Record<string, string> {
  const buckets: Record<string, string> = {};
  const headingRe = /(?:^|\n)#{1,4}\s+(?:\d+\.\s+)?(.+?)(?:\s+to\s+\w+|\s+and\s+\w+)?\s*\n([\s\S]*?)(?=\n#{1,4}\s|\s*$)/gi;
  let match: RegExpExecArray | null;
  while ((match = headingRe.exec(body)) !== null) {
    const heading = (match[1] ?? "").trim().toLowerCase()
      .replace(/^(quick|key|suggested|recommended)\s+/, "")
      .replace(/\s+to\s+\w+.*$/, "")
      .replace(/\s+and\s+blockers.*$/, "")
      .replace(/\s+to\s+mention.*$/, "")
      .trim();
    const content = (match[2] ?? "").trim()
      .replace(/^[-•*]\s+/gm, "")
      .replace(/\*\*/g, "")
      .replace(/\n[-•*]\s+/g, "\n")
      .trim();
    buckets[heading] = content;
  }
  return buckets;
}

function meetingPrepSectionBody(buckets: Record<string, string>, section: string): string {
  const target = section.toLowerCase();
  if (buckets[target]) return buckets[target];
  const found = Object.keys(buckets).find((k) =>
    k.includes(target) || target.includes(k.split(" ")[0] ?? ""),
  );
  if (found) return buckets[found];
  const aliases: Record<string, string[]> = {
    "quick summary": ["summary"],
    "key wins": ["wins"],
    "risks": ["risks", "blockers", "risk"],
    "talking points": ["talking", "points"],
    "actions": ["actions", "recommended", "agree"],
  };
  const variants = aliases[target] || [];
  for (const v of variants) {
    const match = Object.keys(buckets).find((k) => k.includes(v));
    if (match) return buckets[match];
  }
  return "";
}

function parseMeetingPrepTicketBlocks(
  body: string,
  defaultTitle: string,
  defaultClient: string,
): Array<{ title: string; client: string; body: string }> {
  const blocks = body.split(/\n\s*---\s*\n/).map((b) => b.trim()).filter(Boolean);

  return blocks.map((block) => {
    const clientMatch = block.match(/\*?\*?Client:\*?\*?\s*(.+)/i);
    const client = clientMatch?.[1]?.trim() || "";

    const ticketMatch = block.match(/\*?\*?Ticket\s*\/\s*Project:\*?\*?\s*(.+)/i);
    const title = ticketMatch?.[1]?.trim() || defaultTitle;

    return { title, client, body: block };
  });
}

function findActionForRiskRow(
  risk: RiskExportRow,
  actionItems: ActionExportRow[],
): ActionExportRow | undefined {
  const projectKey =
    safeText(risk.project_name) || safeText(risk.source_ticket);
  const clientKey = safeText(risk.client_name);
  if (projectKey) {
    const byProject = actionItems.find(
      (a) =>
        safeText(a.project_name) === projectKey ||
        safeText(a.source_ticket) === projectKey,
    );
    if (byProject) return byProject;
  }
  if (clientKey) {
    return actionItems.find((a) => safeText(a.client_name) === clientKey);
  }
  return undefined;
}

function buildMeetingPrepNotesSheet(
  body: string,
  genDate: string,
  clientName: string,
  projectName: string,
  ticketTitle: string,
  actionItems: ActionExportRow[] = [],
  riskItems: RiskExportRow[] = [],
): XLSX.WorkSheet {
  const defaultTitle = safeText(ticketTitle) || safeText(projectName) || "Ticket / Project";
  const tickets = parseMeetingPrepTicketBlocks(body, defaultTitle, clientName);
  const colCount = 7;

  const aoa: string[][] = [
    ["Meeting Notes", ...Array(colCount - 1).fill("")],
    Array(colCount).fill(""),
    [
      "Ticket / Project",
      "Client",
      "Quick Summary",
      "Key Wins",
      "Risks",
      "Talking Points",
      "Actions",
    ],
  ];

  for (const ticket of tickets) {
    const buckets = parseMeetingPrepSectionBuckets(ticket.body);
    aoa.push([
      ticket.title,
      ticket.client,
      meetingPrepSectionBody(buckets, "Quick Summary"),
      meetingPrepSectionBody(buckets, "Key Wins"),
      meetingPrepSectionBody(buckets, "Risks"),
      meetingPrepSectionBody(buckets, "Talking Points"),
      meetingPrepSectionBody(buckets, "Actions"),
    ]);
  }

  if (aoa.length === 3 && actionItems && actionItems.length > 0) {
    const clientGroups = new Map<string, { actions: typeof actionItems; risks: typeof riskItems }>();
    for (const a of actionItems) {
      const cn = safeText(a.client_name) || clientName;
      const existing = clientGroups.get(cn) ?? { actions: [], risks: [] };
      existing.actions.push(a);
      clientGroups.set(cn, existing);
    }
    for (const r of riskItems) {
      const cn = safeText(r.client_name) || clientName;
      const existing = clientGroups.get(cn) ?? { actions: [], risks: [] };
      existing.risks.push(r);
      clientGroups.set(cn, existing);
    }
    for (const [cn, { actions, risks }] of clientGroups) {
      const ticketTitle = safeText(actions[0]?.project_name) || cn;
      const openActions = actions.filter((a) => safeText(a.status) !== "completed");
      const quickSummary = `${openActions.length} open action(s) for ${cn}. ${risks.length > 0 ? `${risks.length} risk(s) identified.` : "No risks identified."} Review progress and agree next steps.`;
      const keyWins = actions.filter((a) => safeText(a.status) === "completed").map((a) => `• ${safeText(a.task)}`).join("\n") || "No completed actions this period — review progress on open items.";
      const risksText = risks.length > 0
        ? risks.map((r) => `• ${safeText(r.risk)}\n  Impact: ${safeText(r.impact)}\n  Mitigation: ${safeText(r.mitigation)}`).join("\n\n")
        : "No risks identified for this client.";
      const talkingPoints = [
        ...openActions.slice(0, 3).map((a) => `• Review status of: ${safeText(a.task)}`),
        risks.length > 0 ? `• Discuss risk mitigation for ${risks.length} open risk(s)` : "",
        "• Confirm next steps and ownership for outstanding items",
        "• Agree timeline for resolution",
      ].filter(Boolean).join("\n");
      const actionsText = openActions.map((a) => `• ${safeText(a.task)} — Owner: ${safeText(a.suggested_owner) || "TBC"} — ${safeText(a.priority) || "Medium"} priority`).join("\n") || "No open actions.";
      aoa.push([
        ticketTitle,
        cn,
        quickSummary,
        keyWins,
        risksText,
        talkingPoints,
        actionsText,
      ]);
    }
  }

  if (aoa.length === 3) {
    const buckets = parseMeetingPrepSectionBuckets(body);
    aoa.push([
      defaultTitle,
      clientName,
      meetingPrepSectionBody(buckets, "Quick Summary"),
      meetingPrepSectionBody(buckets, "Key Wins"),
      meetingPrepSectionBody(buckets, "Risks"),
      meetingPrepSectionBody(buckets, "Talking Points"),
      meetingPrepSectionBody(buckets, "Actions"),
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const lastRow = Math.max(aoa.length - 1, 0);
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow, c: colCount - 1 } });
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }];
  ws["!cols"] = [
    { wch: 35 },
    { wch: 20 },
    { wch: 40 },
    { wch: 40 },
    { wch: 40 },
    { wch: 40 },
    { wch: 40 },
  ];
  styleTitleMergedRow(ws, 0, colCount);
  styleSubheaderRow(ws, 2, colCount);
  applyWrapToAllCells(ws);
  return ws;
}

function sectionBody(text: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const all = ["PROJECT STATUS", "PROGRESS", "ACTIONS", "RISKS AND ISSUES", "NEXT STEPS"];
  const others = all.filter((h) => h !== heading).map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const re = new RegExp(`(?:^|\\n)\\s*${escaped}\\s*:?\\s*([\\s\\S]*?)(?=\\n\\s*(?:${others})\\s*:|$)`, "i");
  const m = text.match(re);
  return m ? m[1].trim() : "";
}

function splitNumberedItems(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.map((l) => l.replace(/^\d+\.\s*/, "").trim()).filter(Boolean);
}

function buildStatusReportSheet(body: string, genDate: string): XLSX.WorkSheet {
  const parsedTickets = parseStatusReportMultiTicket(body);
  const colCount = 8;
  const pad = (row: string[]): string[] => {
    const out = [...row];
    while (out.length < colCount) out.push("");
    return out.slice(0, colCount);
  };

  const aoa: string[][] = [
    pad([`Status Report - ${genDate}`]),
    Array(colCount).fill(""),
    pad(["Ticket / Project", "Client", "Status", "Owner", "RAG", "Progress", "Actions", "Next Steps"]),
  ];

  for (const ticket of parsedTickets) {
    const actionsText = ticket.actions.length
      ? ticket.actions.map((a) => `• ${a.task} (${a.owner || "TBC"}, ${a.priority})`).join("\n")
      : "";
    const nextStepsText = ticket.nextSteps.length
      ? ticket.nextSteps.map((s) => `• ${s}`).join("\n")
      : "";
    const cleanClient =
      (ticket.client || "").split("|")[0].trim() ||
      (ticket.title.includes(" - ") ? ticket.title.split(" - ").pop()?.trim() : "") ||
      "";
    aoa.push(pad([
      ticket.title.replace(/ - [^-]+$/, "").trim() || ticket.title,
      cleanClient,
      ticket.status || "",
      ticket.owner || "TBC",
      ticket.rag || "",
      ticket.progress || "",
      actionsText,
      nextStepsText,
    ]));
  }

  if (aoa.length === 3) {
    aoa.push(pad(["No status report data", "", "", "", "", "", "", ""]));
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: aoa.length - 1, c: colCount - 1 } });
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }];
  ws["!cols"] = [
    { wch: 35 },
    { wch: 20 },
    { wch: 14 },
    { wch: 18 },
    { wch: 10 },
    { wch: 45 },
    { wch: 45 },
    { wch: 35 },
  ];
  styleTitleMergedRow(ws, 0, colCount);
  styleNavyHeaderRow(ws, 2, colCount);
  applyWrapToAllCells(ws);
  return ws;
}

function buildExecutiveSummarySheet(
  normalized: FullReportOutputs,
  projectName: string,
  meta: ExportMeta,
  genDate: string,
  reserveLogoRow = false,
): XLSX.WorkSheet {
  const parsed = parseStatusReportSections(safeText(normalized.status_report));
  const riskItems = normalized.risks ?? [];
  const actionItems = normalized.actions ?? [];
  const rag = inferRagFromRiskText(riskItems[0] ?? { risk: "", impact: "", mitigation: "" });
  const distinctProjects = [
    ...new Set(actionItems.map((a) => safeText(a.project_name)).filter(Boolean)),
  ];
  const distinctClients = [
    ...new Set(actionItems.map((a) => safeText(a.client_name)).filter(Boolean)),
  ];
  const projectDisplay =
    distinctProjects.length > 1
      ? distinctProjects.join(", ")
      : distinctProjects[0] || safeText(meta.projectName) || safeText(projectName);
  const clientDisplay =
    distinctClients.length > 1
      ? distinctClients.join(", ")
      : distinctClients[0] || safeText(meta.clientName);
  const rows: string[][] = [];
  if (reserveLogoRow) {
    rows.push(["", "", ""]);
  }
  rows.push([`Executive Summary - ${genDate}`, "", ""]);
  rows.push(["", "", ""]);
  rows.push(["Project:", projectDisplay, ""]);
  rows.push(["Client:", clientDisplay, ""]);
  rows.push(["Date:", genDate, ""]);
  rows.push(["Status:", rag || "Amber", ""]);
  rows.push(["", "", ""]);
  rows.push(["Summary", "", ""]);
  rows.push([safeText(normalized.summary), "", ""]);
  rows.push(["", "", ""]);
  rows.push(["Key Actions", "", ""]);
  const actions = actionItems.length > 0 ? actionItems : [{ task: "No actions identified", suggested_owner: "TBC", priority: null }];
  for (const a of actions) rows.push([`• ${safeText(a.task)} - ${safeText(a.suggested_owner) || "TBC"}`, "", ""]);
  rows.push(["", "", ""]);
  rows.push(["Key Risks", "", ""]);
  const risks = riskItems.length > 0 ? riskItems : [{ risk: "No major risks identified", impact: "Low", mitigation: "Continue monitoring" }];
  for (const r of risks) rows.push([`• ${safeText(r.risk)} - ${safeText(r.impact)}`, "", ""]);
  rows.push(["", "", ""]);
  rows.push(["Next Steps", "", ""]);
  const next = parsed.nextSteps.length > 0 ? parsed.nextSteps : actions.slice(0, 3).map((a) => safeText(a.task));
  for (const n of next) rows.push([`• ${n}`, "", ""]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 34 }, { wch: 88 }, { wch: 20 }];
  const top = reserveLogoRow ? 1 : 0;
  styleTitleMergedRow(ws, top, 3);
  const sh = reserveLogoRow ? 1 : 0;
  for (const r of [7 + sh, 10 + sh, 13 + sh + actions.length, 16 + sh + actions.length + risks.length]) {
    styleSubheaderRow(ws, r, 3);
  }
  applyWrapToAllCells(ws);
  return ws;
}

function buildSimpleStructuredSheet(
  title: string,
  genDate: string,
  headers: string[],
  rows: string[][],
  widths?: number[],
): XLSX.WorkSheet {
  const safeRows = rows ?? [];
  const aoa: string[][] = [[`${title} - ${genDate}`, ...Array.from({ length: Math.max(headers.length - 1, 0) }, () => "")], [], headers, ...safeRows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = (widths ?? headers.map(() => 24)).map((wch) => ({ wch }));
  styleTitleMergedRow(ws, 0, headers.length);
  styleNavyHeaderRow(ws, 2, headers.length);
  if (safeRows.length > 0) styleAlternatingRows(ws, 3, 3 + safeRows.length - 1, headers.length);
  applyWrapToAllCells(ws);
  return ws;
}

function extractOwners(actions: ActionExportRow[]): string[] {
  const s = new Set<string>();
  for (const a of actions) {
    const owner = safeText(a.suggested_owner).trim();
    if (owner) s.add(owner);
  }
  return [...s];
}

function safeAppendSheet(
  workbook: XLSX.WorkBook,
  sheet: XLSX.WorkSheet,
  name: string,
): string {
  const base = name.slice(0, 31).replace(/[:\\/?*[\]]/g, "-") || "Sheet";
  let finalName = base;
  let counter = 1;
  while (workbook.SheetNames.includes(finalName)) {
    finalName = `${base.slice(0, 28)} ${counter}`;
    counter += 1;
  }
  XLSX.utils.book_append_sheet(workbook, sheet, finalName);
  return finalName;
}

function executiveSummaryParagraph(summary: string): string {
  const t = safeText(summary).trim();
  if (!t) return "";
  const firstBlock = t.split(/\n\s*\n/)[0] ?? t;
  return firstBlock.slice(0, 2000);
}


/**
 * Pro full workbook - same as {@link exportFullReport}; kept for clearer naming in logs / callers.
 */
export async function exportToExcel(
  outputs: FullReportOutputs | Record<string, unknown>,
  projectName: string,
  config: FullReportExportConfig,
): Promise<void> {
  await exportFullReport(outputs, projectName, "pro", config);
}

export async function exportFullReport(
  outputs: FullReportOutputs | Record<string, unknown>,
  projectName: string,
  plan: string,
  config: FullReportExportConfig,
): Promise<void | Buffer> {
  const safeConfig: FullReportExportConfig = {
    selectedTabs: config?.selectedTabs ?? [],
    actionColumns: config?.actionColumns ?? [],
    riskColumns: config?.riskColumns ?? [],
    clientName: config?.clientName ?? null,
    projectName: config?.projectName ?? null,
    returnBuffer: config?.returnBuffer === true,
    brandName: config?.brandName ?? "Handover",
    brandColor: config?.brandColor ?? "#2563eb",
    brandSecondaryColor: config?.brandSecondaryColor ?? "#1E40AF",
    brandLogoUrl: config?.brandLogoUrl ?? null,
    whiteLabelMode: config?.whiteLabelMode === true,
    actionSourceColumn: config?.actionSourceColumn ?? null,
    riskSourceColumn: config?.riskSourceColumn ?? null,
    meetingPrepContent: config?.meetingPrepContent ?? null,
    meetingPrepTicketTitle: config?.meetingPrepTicketTitle ?? null,
  };
  try {
    if (!isProOrTeam(plan)) {
      throw new Error("Pro plan required");
    }

    const normalized = normalizeFullReportInputs(outputs);

    const tabs = [...new Set(safeConfig.selectedTabs.filter(Boolean))];
    if (tabs.length === 0) {
      throw new Error("Select at least one tab to export.");
    }
    const selectedTabSet = new Set(tabs);
    const shouldInclude = (tabId: string): boolean => selectedTabSet.has(tabId);

    const base = fileBaseName(projectName);
    const date = fileDateStamp();
    const genDate = date;
    const meta: ExportMeta = {
      clientName: safeConfig.clientName,
      projectName: safeConfig.projectName ?? projectName,
      generatedDate: genDate,
    };
    const wb = XLSX.utils.book_new();
    const actionItems = normalized.actions ?? [];
    const riskItems = normalized.risks ?? [];
    const firstAction = actionItems[0];
    const projName =
      safeText(safeConfig.projectName) ||
      safeText(projectName) ||
      safeText(firstAction?.project_name) ||
      "Project";
    const clientName =
      safeText(safeConfig.clientName) ||
      safeText(safeConfig.projectName) ||
      safeText(firstAction?.client_name) ||
      "Client";
    // Enrich risk rows with client/project from matching actions when missing
    const enrichedRiskItems = riskItems.map((r) => {
      if (safeText(r.client_name) && safeText(r.project_name)) return r;
      const match = actionItems.find((a) =>
        (safeText(r.source_ticket) && safeText(a.project_name) &&
          safeText(a.project_name).toLowerCase().includes(safeText(r.source_ticket).toLowerCase().substring(0, 15))) ||
        (safeText(r.client_name) === "" && safeText(a.client_name) &&
          safeText(r.risk).toLowerCase().includes(safeText(a.client_name).toLowerCase().substring(0, 8))),
      );
      return {
        ...r,
        client_name: safeText(r.client_name) || safeText(match?.client_name) || safeText(meta?.clientName) || clientName,
        project_name: safeText(r.project_name) || safeText(match?.project_name) || safeText(r.source_ticket) || projName,
      };
    });
    const parsedStatus = parseStatusReportSections(safeText(normalized.status_report));
    const owners =
      ((actionItems
        .map((a) => safeText(a.suggested_owner).trim())
        .filter(Boolean) as string[]) ?? []);
    const append = (name: string, ws: XLSX.WorkSheet, o?: { skipTrim?: boolean }) => {
      if (!o?.skipTrim) {
        delete ws["!merges"];
        trimTopRows(ws, 2);
      }
      safeAppendSheet(wb, ws, name);
    };

    // 1 Action Log
    if (shouldInclude("actions")) {
      append(
        "Action Log",
        buildActionSheet(
          actionItems,
          safeConfig.actionColumns,
          projectName,
          meta,
          genDate,
          safeConfig.actionSourceColumn,
        ),
      );
    }
    // 2 Risk Log
    if (shouldInclude("risks")) {
      append(
        "Risk Log",
        buildRiskSheet(
          enrichedRiskItems,
          safeConfig.riskColumns,
          projectName,
          meta,
          genDate,
          safeConfig.riskSourceColumn,
        ),
      );
    }
    // 3 Executive Summary (single sheet only)
    if (shouldInclude("summary")) {
      const execReserveLogoRow = Boolean(safeText(safeConfig.brandLogoUrl).trim());
      append(
        "Executive Summary",
        buildExecutiveSummarySheet({ ...normalized, risks: enrichedRiskItems }, projectName, meta, genDate, execReserveLogoRow),
        {
          skipTrim: true,
        },
      );
    }
    // 4 Client Email
    if (shouldInclude("client_email")) {
      const emailLines = safeText(normalized.client_email).split(/\r?\n/);
      const emailAoA: string[][] = [
        [`Client Email - ${genDate}`, "", ""],
        ["", "", ""],
        ["Subject", safeText(normalized.email_subject), ""],
        ["Body", "", ""],
        ...emailLines.map((line) => [line, "", ""]),
      ];
      const wsEmail = XLSX.utils.aoa_to_sheet(emailAoA);
      wsEmail["!cols"] = [{ wch: 20 }, { wch: 90 }, { wch: 10 }];
      applyWrapToAllCells(wsEmail);
      append("Client Email", wsEmail);
    }
    // 5 Status Report
    if (shouldInclude("status_report")) {
      append("Status Report", buildStatusReportSheet(safeText(normalized.status_report), genDate));
    }

    if (shouldInclude("raid_log")) {
      // 6 RAID Log
      const raidRows: string[][] = [];
      enrichedRiskItems.forEach((r, i) => {
        const matchedAction = actionItems.find(
          (a) =>
            (safeText(r.source_ticket) &&
              safeText(a.project_name) &&
              safeText(a.project_name) === safeText(r.project_name)) ||
            (safeText(r.client_name) &&
              safeText(a.client_name) &&
              safeText(a.client_name) === safeText(r.client_name)),
        );
        const raidOwner =
          safeText(r.owner) ||
          safeText((r as { suggested_owner?: string }).suggested_owner) ||
          safeText(matchedAction?.suggested_owner) ||
          safeText((matchedAction as { owner?: string } | undefined)?.owner) ||
          (actionItems.find((a) => safeText(a.client_name) === safeText(r.client_name))?.suggested_owner ??
            owners[0] ??
            "TBC");
        const raidClient =
          safeText(r.client_name) || safeText(meta?.clientName) || "See PSA";
        raidRows.push([
          `RSK-${String(i + 1).padStart(3, "0")}`,
          "Risk",
          safeText(r.risk),
          raidOwner,
          safeText(r.impact),
          "Medium",
          "Open",
          safeText(r.mitigation),
          genDate,
          raidClient,
          genDate,
        ]);
      });
      if (raidRows.length === 0) raidRows.push(["RSK-001", "Risk", "No major risks identified", owners[0] ?? "Unassigned", "Low", "Low", "Open", "Monitor", genDate, clientName, genDate]);
      {
        const wsRaid = buildSimpleStructuredSheet("RAID Log", genDate, ["ID", "Type", "Description", "Owner", "Impact", "Probability", "Status", "Action Required", "Due Date", "Client", "Date Added"], raidRows, [12, 12, 44, 20, 24, 14, 12, 36, 14, 24, 14]);
        applyTableConditionalFormatting(wsRaid, 2, [
          {
            column: "Type",
            resolver: (v) => {
              const t = v.trim().toLowerCase();
              if (t === "risk" || t === "issue") return "FEE2E2";
              if (t === "assumption") return "FEF3C7";
              if (t === "dependency") return "DBEAFE";
              return null;
            },
          },
        ]);
        try {
          append("RAID Log", wsRaid);
        } catch (err) {
          console.error("[excel] RAID Log sheet failed:", err);
        }
      }
    }

    if (shouldInclude("change_log")) {
      // 7 Change Log
      const changeRows = actionItems.map((a, i) => [
        `CHG-${String(i + 1).padStart(3, "0")}`,
        genDate,
        safeText(a.task),
        safeText(a.client_name) || clientName,
        safeText(a.priority) || "Medium",
        "Proposed",
        safeText(a.suggested_owner) || "Unassigned",
        safeText(a.notes),
      ]);
      {
        const wsChange = buildSimpleStructuredSheet("Change Log", genDate, ["Change ID", "Date", "Description", "Requested By", "Impact", "Status", "Owner", "Notes"], changeRows.length ? changeRows : [["CHG-001", genDate, "Initial project baseline", clientName, "Medium", "Proposed", owners[0] ?? "Unassigned", "Auto-generated"]], [12, 12, 50, 22, 12, 14, 18, 30]);
        applyTableConditionalFormatting(wsChange, 2, [
          {
            column: "Status",
            resolver: (v) => {
              const s = v.trim().toLowerCase();
              if (s === "proposed") return "DBEAFE";
              if (s === "approved") return "DCFCE7";
              if (s === "implemented") return "86EFAC";
              if (s === "rejected") return "FEE2E2";
              return null;
            },
          },
        ]);
        try {
          append("Change Log", wsChange);
        } catch (err) {
          console.error("[excel] Change Log sheet failed:", err);
        }
      }
    }

    // 8 Stakeholder Update
    const stakeholderLines = (safeText(normalized.summary) || "")
      .split(/\.\s+/)
      .filter(Boolean)
      .map((s: string) => `• ${s.trim()}`);
    if (shouldInclude("stakeholder_update")) {
    const stakeholderProjects = [
      ...new Set(actionItems.map((a) => safeText(a.project_name)).filter(Boolean)),
    ];
    const stakeholderClients = [
      ...new Set(actionItems.map((a) => safeText(a.client_name)).filter(Boolean)),
    ];
    const stakeholderProjectDisplay =
      stakeholderProjects.length > 0 ? stakeholderProjects.join(", ") : projName;
    const stakeholderClientDisplay =
      stakeholderClients.length > 0 ? stakeholderClients.join(", ") : clientName;
    const stakeholderRows: string[][] = [
      ["Overall Status:", inferRagFromRiskText(riskItems[0] ?? { risk: "", impact: "", mitigation: "" }) || "Amber", "", ""],
      ["Project:", stakeholderProjectDisplay, "", ""],
      ["Client:", stakeholderClientDisplay, "", ""],
      ["Period:", genDate, "", ""],
      ["", "", "", ""],
      ["Highlights This Period", "", "", ""],
      ...((stakeholderLines.length ? stakeholderLines : ["• Progress update generated from current ticket set"]).map((x) => [x, "", "", ""])),
      ["", "", "", ""],
      ["Items Requiring Attention", "", "", ""],
      ...((riskItems.length ? riskItems.map((r) => `• ${safeText(r.risk)}`) : ["• No critical risks identified"]).map((x) => [x, "", "", ""])),
      ["", "", "", ""],
      ["Upcoming Actions", "", "", ""],
      ...((actionItems.length ? actionItems.map((a) => `• ${safeText(a.task)} - ${safeText(a.suggested_owner) || "Unassigned"}`) : ["• Continue monitoring progress"]).map((x) => [x, "", "", ""])),
      ["", "", "", ""],
      ["For Information Only", "", "", ""],
      [`This update was auto-generated by ${safeText(safeConfig.brandName).trim() || "Handover"}. Please direct any queries to your account manager.`, "", "", ""],
    ];
    const wsStake = XLSX.utils.aoa_to_sheet([[`Stakeholder Update - ${genDate}`, "", "", ""], ["", "", "", ""], ...stakeholderRows]);
    wsStake["!cols"] = [{ wch: 28 }, { wch: 80 }, { wch: 10 }, { wch: 10 }];
    styleTitleMergedRow(wsStake, 0, 4);
    [7, 10 + stakeholderLines.length, 13 + stakeholderLines.length + Math.max(riskItems.length, 1), 16 + stakeholderLines.length + Math.max(riskItems.length, 1) + Math.max(actionItems.length, 1), 19 + stakeholderLines.length + Math.max(riskItems.length, 1) + Math.max(actionItems.length, 1)].forEach((r) => styleSubheaderRow(wsStake, r, 4));
    applyWrapToAllCells(wsStake);
    try {
      append("Stakeholder Update", wsStake);
    } catch (err) {
      console.error("[excel] Stakeholder Update sheet failed:", err);
    }
    }

    // 9 Meeting Notes
    if (shouldInclude("meeting_notes")) {
      const meetingPrepBody = safeText(safeConfig.meetingPrepContent).trim();
      console.log("[export-debug] meetingPrepBody:", meetingPrepBody?.substring(0, 100));
      try {
        append(
          "Meeting Notes",
          buildMeetingPrepNotesSheet(
            meetingPrepBody,
            genDate,
            clientName,
            projName,
            safeText(safeConfig.meetingPrepTicketTitle),
            actionItems,
            enrichedRiskItems,
          ),
        );
      } catch (err) {
        console.error("[excel] Meeting Notes sheet failed:", err);
      }
    }

    // 10 Invoice / Time Summary
    if (shouldInclude("invoice_time_summary")) {
      const invoiceRows = actionItems.map((a) => [safeText(a.project_name) || safeText(a.task), safeText(a.client_name) || clientName, safeText(a.suggested_owner) || "Unassigned", "0.00", genDate, safeText(a.task), "", ""]);
      invoiceRows.push(["TOTAL", "", "", "", "", "", "", ""]);
      try {
        append("Invoice Time Summary", buildSimpleStructuredSheet("Invoice / Time Summary", genDate, ["Ticket/Project", "Client", "Engineer", "Hours", "Date", "Description of Work", "Rate (£)", "Total (£)"], invoiceRows, [34, 22, 20, 10, 12, 44, 12, 12]));
      } catch (err) {
        console.error("[excel] Invoice Time Summary sheet failed:", err);
      }
    }

    // 11 Communication Log
    const commRows = actionItems.map((a) => [genDate, safeText(a.suggested_owner) || "Internal", "Client", "HaloPSA / Email", safeText(a.task).slice(0, 100), /\?|please|can you/i.test(safeText(a.task)) ? "Yes" : "No", "Pending"]);
    if (shouldInclude("communication_log")) {
      const wsComm = buildSimpleStructuredSheet("Communication Log", genDate, ["Date", "From", "To", "Channel", "Summary", "Follow Up Required", "Status"], commRows.length ? commRows : [[genDate, "Internal", "Client", "HaloPSA / Email", "Initial update prepared.", "No", "Complete"]], [12, 20, 14, 18, 52, 18, 12]);
      applyTableConditionalFormatting(wsComm, 2, [
        {
          column: "Follow Up Required",
          resolver: (v) => (v.trim().toLowerCase() === "yes" ? "FEF3C7" : null),
        },
      ]);
      try {
        append("Communication Log", wsComm);
      } catch (err) {
        console.error("[excel] Communication Log sheet failed:", err);
      }
    }

    // 12 Project Health Dashboard
    const riskCount = riskItems.length;
    const actionCount = actionItems.length;
    if (shouldInclude("project_health_dashboard")) {
    const wsHealth = XLSX.utils.aoa_to_sheet([
      [`Project Health Dashboard - ${genDate}`, "", ""],
      ["", "", ""],
      ["OVERALL STATUS", "", ""],
      [inferRagFromRiskText(riskItems[0] ?? { risk: "", impact: "", mitigation: "" }) || "Amber", "", ""],
      ["", "", ""],
      ["Metric", "Value", "Status"],
      ["Open Actions", String(actionCount), actionCount > 5 ? "Amber" : "Green"],
      ["Risks Identified", String(riskCount), riskCount > 3 ? "Amber" : riskCount > 0 ? "Red" : "Green"],
      ["Hours Logged", "0.00", "Neutral"],
      ["Tickets in Scope", String(actionCount), "Neutral"],
      ["Clients Covered", String(new Set(actionItems.map((a) => safeText(a.client_name) || clientName)).size), "Neutral"],
      ["Project Status", parsedStatus.projectStatus || "In Progress", "Neutral"],
      ["Target Date", actionItems.find((a) => safeText(a.due_date))?.due_date ?? "Not set", "Neutral"],
      ["Days Since Last Update", "0", "Neutral"],
    ]);
    wsHealth["!cols"] = [{ wch: 30 }, { wch: 20 }, { wch: 16 }];
    styleTitleMergedRow(wsHealth, 0, 3);
    styleSubheaderRow(wsHealth, 2, 3);
    styleNavyHeaderRow(wsHealth, 5, 3);
    applyWrapToAllCells(wsHealth);
    try {
      append("Project Health Dashboard", wsHealth);
    } catch (err) {
      console.error("[excel] Project Health Dashboard sheet failed:", err);
    }
    }

    // 13 Detailed Risk Register
    const detailedRiskRows = (riskItems.length ? riskItems : [{ risk: "No explicit risks", impact: "Low", mitigation: "Monitor" }]).map((r, i) => {
      const score = 3 * (safeText(r.priority).toLowerCase() === "high" ? 4 : safeText(r.priority).toLowerCase() === "low" ? 2 : 3);
      const rag = score >= 10 ? "Red" : score >= 5 ? "Amber" : "Green";
      return [`RSK-${String(i + 1).padStart(3, "0")}`, /\b(azure|firewall|microsoft|3cx|network)\b/i.test(safeText(r.risk)) ? "Technical" : "General", safeText(r.risk), "3", score >= 10 ? "4" : "3", String(score), rag, safeText(r.owner) || (owners[0] ?? "TBC"), safeText(r.mitigation), "To be defined", genDate, safeText(r.status) || "Open"];
    });
    if (shouldInclude("risk_register_detailed")) {
      const wsDetailed = buildSimpleStructuredSheet("Detailed Risk Register", genDate, ["Risk ID", "Category", "Description", "Likelihood (1-5)", "Impact (1-5)", "Risk Score", "RAG", "Owner", "Mitigation", "Contingency", "Review Date", "Status"], detailedRiskRows, [12, 16, 34, 14, 12, 10, 8, 18, 30, 18, 14, 12]);
      applyTableConditionalFormatting(wsDetailed, 2, [
        {
          column: "Risk Score",
          resolver: (v) => {
            const n = Number.parseInt(v, 10);
            if (!Number.isFinite(n)) return null;
            if (n >= 10) return "FEE2E2";
            if (n >= 5) return "FEF3C7";
            return "DCFCE7";
          },
        },
      ]);
      try {
        append("Detailed Risk Register", wsDetailed);
      } catch (err) {
        console.error("[excel] Detailed Risk Register sheet failed:", err);
      }
    }

    // 14 PESTLE Analysis
    const pestleRows: string[][] = [
      ["Political", "Data Protection Regulations", "GDPR compliance requirements for data handling", "High if not compliant", "Medium", "Ensure all data processing follows GDPR guidelines", "H"],
      ["Economic", "IT Budget Constraints", "Budget limitations may affect scope or timeline", "Schedule delay if budget insufficient", "Medium", "Regular budget reviews and scope management", "M"],
      ["Social", "Staff Adoption", "End users may resist changes to systems and workflows", "Reduced effectiveness of implemented solutions", "Medium", "Training and change management plan", "M"],
      ["Technological", "System Compatibility", "New systems must integrate with existing infrastructure", "Technical failures if incompatible", "Low", "Compatibility testing before deployment", "H"],
      ["Legal", "Software Licensing", "All software must be properly licensed", "Legal liability if unlicensed software used", "Low", "Regular licence audits", "M"],
      ["Environmental", "Energy Consumption", "IT infrastructure energy usage and sustainability", "Reputational risk if not managed", "Low", "Consider energy efficient solutions", "L"],
    ];
    if (shouldInclude("pestle_analysis")) {
      const wsPestle = buildSimpleStructuredSheet("PESTLE Analysis", genDate, ["Category", "Factor", "Description", "Impact", "Likelihood", "Mitigation", "Relevance (H/M/L)"], pestleRows, [14, 24, 36, 24, 12, 30, 12]);
      applyTableConditionalFormatting(wsPestle, 2, [
        {
          column: "Category",
          resolver: (v) => {
            const category = v.trim().toLowerCase();
            if (category === "political") return "DBEAFE";
            if (category === "economic") return "DCFCE7";
            if (category === "social") return "FEF3C7";
            if (category === "technological") return "E0E7FF";
            if (category === "legal") return "FEE2E2";
            if (category === "environmental") return "D1FAE5";
            return null;
          },
        },
      ]);
      try {
        append("PESTLE Analysis", wsPestle);
      } catch (err) {
        console.error("[excel] PESTLE Analysis sheet failed:", err);
      }
    }

    // 15 Issue Log
    const issueRows = (enrichedRiskItems.length ? enrichedRiskItems : [{ risk: "Follow-up required", impact: "Medium", mitigation: "Review next cycle", priority: "Medium" }]).map((r, i) => [
      `ISS-${String(i + 1).padStart(3, "0")}`,
      genDate,
      safeText(r.risk),
      safeText(r.client_name) || safeText(meta?.clientName) || "See PSA",
      safeText(r.priority) || "Medium",
      "Open",
      safeText(r.owner) || (owners[0] ?? "Unassigned"),
      "",
      "",
      safeText(r.client_name) || safeText(meta?.clientName) || "See PSA",
    ]);
    if (shouldInclude("issue_log")) {
      const wsIssue = buildSimpleStructuredSheet("Issue Log", genDate, ["Issue ID", "Date Raised", "Description", "Raised By", "Priority", "Status", "Owner", "Resolution", "Date Resolved", "Client"], issueRows, [12, 12, 40, 18, 10, 10, 18, 20, 14, 20]);
      applyTableConditionalFormatting(wsIssue, 2, [
        {
          column: "Priority",
          resolver: (v) => {
            const p = v.trim().toLowerCase();
            if (p === "critical") return "FEE2E2";
            if (p === "high") return "FEE2E2";
            if (p === "medium") return "FEF3C7";
            if (p === "low") return "DCFCE7";
            return null;
          },
        },
      ]);
      try {
        append("Issue Log", wsIssue);
      } catch (err) {
        console.error("[excel] Issue Log sheet failed:", err);
      }
    }

    // 16 Decisions Log
    if (shouldInclude("decisions_log")) {
      const decisionText = safeText(normalized.decisions_log).trim();
      const decisionRows = decisionText
        ? decisionText
          .split(/\r?\n/)
          .filter((line) => !line.startsWith("Decision ID") && !line.startsWith("ID") && line.trim())
          .map((line) => {
            const parts = line.split(/\s*\|\s*/).map((p) => p.trim());
            if (parts.length >= 6) {
              return [
                parts[0] || "",
                parts[1] || genDate,
                parts[2] || "",
                parts[3] || owners[0] || "Team",
                parts[4] || "",
                parts[5] || "",
                parts[6] || "N/A",
                parts[7] || "Open",
              ];
            }
            return ["", genDate, line, owners[0] || "Team", "", "", "N/A", "Open"];
          })
        : [[`DEC-001`, genDate, `Proceed with ${projName || "project"} delivery`, owners[0] ?? "Team", "As per client requirements", "Medium", "N/A", "Open"]];
      try {
        append("Decisions Log", buildSimpleStructuredSheet("Decisions Log", genDate, ["Decision ID", "Date", "Decision", "Decision Maker", "Rationale", "Impact", "Alternatives Considered", "Status"], decisionRows, [12, 12, 40, 22, 30, 12, 28, 12]));
      } catch (err) {
        console.error("[excel] Decisions Log sheet failed:", err);
      }
    }

    // 17 Lessons Learned
    const lessonsRows: string[][] = [
      ["Risk Management", "Risks identified early in the process", "Earlier mitigation planning", "Reactive risk identification", "Implement risk register from project start", owners[0] ?? "Unassigned", "Identified"],
      ["Planning", "Clear action items defined", "Earlier assignment of owners", "Ownership assigned later than ideal", "Assign owners during initial triage", owners[0] ?? "Unassigned", "Identified"],
      ["Communication", "Regular updates provided to stakeholders", "More structured meeting cadence", "Ad hoc update rhythm", "Schedule regular project standups", owners[0] ?? "Unassigned", "Identified"],
    ];
    if (shouldInclude("lessons_learned")) {
      try {
        append("Lessons Learned", buildSimpleStructuredSheet("Lessons Learned", genDate, ["Category", "What Went Well", "What Could Improve", "Root Cause", "Recommendation", "Owner", "Status"], lessonsRows, [18, 30, 30, 24, 30, 18, 12]));
      } catch (err) {
        console.error("[excel] Lessons Learned sheet failed:", err);
      }
    }

    applyExcelBranding(wb, {
      brandColor: safeConfig.brandColor,
      brandSecondaryColor: safeConfig.brandSecondaryColor,
      brandLogoUrl: safeConfig.brandLogoUrl,
      brandName: safeConfig.brandName,
      reportDate: genDate,
      coverClientName: clientName,
      coverProjectName: projName,
      whiteLabelMode: safeConfig.whiteLabelMode,
    });

    let out: Uint8Array;
    try {
      out = XLSX.write(wb, {
        bookType: "xlsx",
        type: "array",
        cellStyles: true,
      });
    } catch (styleErr: unknown) {
      console.warn("[excel] write with cellStyles failed, retrying without:", styleErr);
      out = XLSX.write(wb, {
        bookType: "xlsx",
        type: "array",
        cellStyles: false,
      });
    }
    out = patchXlsxBufferWithSheetTabColor(out, normalizeBrandColor(safeConfig.brandColor));
    const logoUrlForSheet = safeText(safeConfig.brandLogoUrl).trim();
    if (logoUrlForSheet) {
      const img = await fetchBrandLogoBytesForExcel(logoUrlForSheet);
      if (img) {
        out = patchXlsxBufferWithExecutiveSummaryLogo(out, img.bytes, img.ext);
      }
    }
    if (safeConfig.returnBuffer) {
      return Buffer.from(out);
    }
    downloadBlob(
      new Blob([out as BlobPart], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `${base}-full-report-${date}.xlsx`,
    );
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error(String(err));
    console.error("[excel] Build error:", e.message, e.stack);
    throw e;
  }
}

/** Server-side: build the same Pro full workbook as exportToExcel, return XLSX bytes. */
export async function exportFullReportToBuffer(
  outputs: FullReportOutputs | Record<string, unknown>,
  projectName: string,
  config: FullReportExportConfig,
): Promise<Buffer> {
  const buf = await exportFullReport(outputs, projectName, "pro", {
    ...config,
    returnBuffer: true,
  });
  if (!Buffer.isBuffer(buf)) {
    throw new Error("exportFullReport did not return a buffer");
  }
  return buf;
}

