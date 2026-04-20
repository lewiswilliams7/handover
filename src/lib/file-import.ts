import mammoth from "mammoth";
import Papa from "papaparse";
import * as XLSX from "xlsx";

export async function parseCSVFile(file: File): Promise<string> {
  const csvText = await file.text();
  if (!csvText.trim()) {
    throw new Error("The file appears to be empty");
  }

  const parsed = Papa.parse<string[]>(csvText, {
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0 || !Array.isArray(parsed.data) || parsed.data.length === 0) {
    throw new Error("Could not read this file - try saving as CSV");
  }

  const rows = parsed.data.map((row) => row.map((cell) => String(cell ?? "").trim()));
  if (rows.length === 0) {
    throw new Error("The file appears to be empty");
  }

  return rows.map((row) => row.join(" | ")).join("\n");
}

export async function parseTxtFile(file: File): Promise<string> {
  const text = await file.text();
  if (!text.trim()) {
    throw new Error("The file appears to be empty");
  }
  return text;
}

/** Shown when Excel / Word import parsing fails (CSV keeps its own error strings). */
export const IMPORT_FILE_PARSE_ERROR_MESSAGE =
  "Could not read this file. Please try CSV, Excel, or Word format.";

export type ImportFileFormat = "csv" | "excel" | "docx";

export function detectImportFileFormat(fileName: string): ImportFileFormat | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return "excel";
  if (lower.endsWith(".docx")) return "docx";
  return null;
}

/** Short label for UI after a successful import. */
export function formatImportedFileTypeLabel(
  fileName: string,
  kind: ImportFileFormat,
): string {
  const lower = fileName.toLowerCase();
  if (kind === "csv") return "CSV";
  if (kind === "docx") return "Word (.docx)";
  if (lower.endsWith(".xlsx")) return "Excel (.xlsx)";
  if (lower.endsWith(".xls")) return "Excel (.xls)";
  return "Excel";
}

function sheetToStructuredText(sheetName: string, ws: XLSX.WorkSheet): string {
  if (!ws["!ref"]) return "";
  const aoa = XLSX.utils.sheet_to_json<(string | number | boolean | null | undefined)[]>(ws, {
    header: 1,
    raw: false,
    defval: "",
  });
  if (!aoa.length) return "";

  const rawRows = aoa.map((row) =>
    (Array.isArray(row) ? row : []).map((cell) => String(cell ?? "").trim()),
  );
  while (rawRows.length > 0 && rawRows[rawRows.length - 1]!.every((c) => !c)) {
    rawRows.pop();
  }
  if (rawRows.length === 0) return "";

  const lines: string[] = [`Sheet: ${sheetName}`];
  const [headerRow, ...dataRows] = rawRows;
  lines.push(`Headers: ${headerRow!.join(" | ")}`);
  for (let i = 0; i < dataRows.length; i++) {
    lines.push(`Row ${i + 1}: ${dataRows[i]!.join(" | ")}`);
  }
  return lines.join("\n");
}

/** Reads all sheets from an .xlsx / .xls file into one text block for the model. */
export async function parseExcelFileToImportText(file: File): Promise<string> {
  let wb: XLSX.WorkBook;
  try {
    const buf = await file.arrayBuffer();
    wb = XLSX.read(buf, { type: "array", cellDates: true });
  } catch {
    throw new Error(IMPORT_FILE_PARSE_ERROR_MESSAGE);
  }

  const names = (wb.SheetNames ?? []).filter((n) => typeof n === "string" && n.trim().length > 0);
  if (names.length === 0) {
    throw new Error(IMPORT_FILE_PARSE_ERROR_MESSAGE);
  }

  const parts: string[] = [];
  for (const name of names) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    const block = sheetToStructuredText(name, ws);
    if (block.trim()) parts.push(block);
  }

  const out = parts.join("\n\n").trim();
  if (!out) {
    throw new Error(IMPORT_FILE_PARSE_ERROR_MESSAGE);
  }
  return out;
}

/** Plain text from a .docx file for the model. */
export async function parseDocxFileToImportText(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer });
    const text = value.replace(/\r\n/g, "\n").trim();
    if (!text) {
      throw new Error(IMPORT_FILE_PARSE_ERROR_MESSAGE);
    }
    return text;
  } catch (e) {
    if (e instanceof Error && e.message === IMPORT_FILE_PARSE_ERROR_MESSAGE) {
      throw e;
    }
    throw new Error(IMPORT_FILE_PARSE_ERROR_MESSAGE);
  }
}
