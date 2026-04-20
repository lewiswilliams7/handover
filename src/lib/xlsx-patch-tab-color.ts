import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

/**
 * xlsx-js-style does not emit worksheet tab colours; inject OOXML `<sheetPr><tabColor/>` per sheet.
 * `rgb6` is six hex digits without '#', e.g. 2563EB → ARGB FF2563EB.
 */
export function patchXlsxBufferWithSheetTabColor(
  buffer: Uint8Array,
  rgb6: string,
): Uint8Array {
  const hex = rgb6.replace(/^#/, "").toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(hex)) return buffer;
  const argb = `FF${hex}`;
  try {
    const files = unzipSync(buffer);
    const out: Record<string, Uint8Array> = {};
    for (const path of Object.keys(files)) {
      let data = files[path];
      if (
        path.startsWith("xl/worksheets/sheet") &&
        path.endsWith(".xml") &&
        !path.includes("_rels")
      ) {
        const xml = strFromU8(data);
        if (
          xml.includes("<worksheet") &&
          !/<(?:\w:)?tabColor\b/i.test(xml)
        ) {
          const patched = xml.replace(
            /<worksheet([^>]*)>/,
            `<worksheet$1><sheetPr><tabColor rgb="${argb}"/></sheetPr>`,
          );
          data = strToU8(patched);
        }
      }
      out[path] = data;
    }
    return zipSync(out, { level: 1 });
  } catch (err) {
    console.warn("[excel] Sheet tab colour patch failed:", err);
    return buffer;
  }
}
