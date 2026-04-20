import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

const EXEC_SUMMARY = "Executive Summary";
const DRAWING_REL_TYPE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing";
const IMAGE_REL_TYPE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";
const DRAWING_CT =
  "application/vnd.openxmlformats-officedocument.drawing+xml";

export type ExecutiveLogoExt = "png" | "jpeg";

function nextNumericSuffix(keys: string[], re: RegExp, group: number): number {
  let max = 0;
  for (const k of keys) {
    const m = k.match(re);
    if (m?.[group]) {
      const n = parseInt(m[group], 10);
      if (Number.isFinite(n)) max = Math.max(max, n);
    }
  }
  return max + 1;
}

function sheetFileBase(sheetPath: string): string {
  const m = sheetPath.match(/\/([^/]+)\.xml$/);
  return m?.[1] ?? "sheet1";
}

function parseWorkbookRels(
  relsXml: string,
): Map<string, { target: string; type: string }> {
  const map = new Map<string, { target: string; type: string }>();
  const relRe = /<Relationship\b([^/>]+)\/>/gi;
  let m: RegExpExecArray | null;
  while ((m = relRe.exec(relsXml)) !== null) {
    const frag = m[1];
    const id = /\bId="([^"]+)"/i.exec(frag)?.[1];
    const type = /\bType="([^"]+)"/i.exec(frag)?.[1];
    const target = /\bTarget="([^"]+)"/i.exec(frag)?.[1];
    if (id && type && target) {
      map.set(id, { type, target });
    }
  }
  return map;
}

function findExecutiveSummaryWorksheetPath(
  workbookXml: string,
  relsById: Map<string, { target: string; type: string }>,
): string | null {
  const sheetRe = /<sheet\b[^>]*>/g;
  let sm: RegExpExecArray | null;
  while ((sm = sheetRe.exec(workbookXml)) !== null) {
    const tag = sm[0];
    const nameMatch = tag.match(/\bname="([^"]*)"/);
    if (!nameMatch || nameMatch[1] !== EXEC_SUMMARY) continue;
    const idMatch = tag.match(/\br:id="([^"]+)"/);
    if (!idMatch) continue;
    const rel = relsById.get(idMatch[1]);
    if (!rel?.target) continue;
    const t = rel.target.replace(/^\//, "");
    return t.startsWith("xl/") ? t : `xl/${t}`;
  }
  return null;
}

function nextSheetRelId(relsXml: string): string {
  let max = 0;
  const re = /Id="rId(\d+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(relsXml)) !== null) {
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return `rId${max + 1}`;
}

function appendContentTypeOverride(typesXml: string, partName: string, ct: string): string {
  if (typesXml.includes(`PartName="${partName}"`)) return typesXml;
  return typesXml.replace(
    /<\/Types>\s*$/,
    `<Override PartName="${partName}" ContentType="${ct}"/></Types>`,
  );
}

/**
 * Injects a bitmap into the "Executive Summary" sheet (top-left) via OOXML drawing parts.
 * Safe no-op if the sheet is missing, already has a drawing, or unzip fails.
 */
export function patchXlsxBufferWithExecutiveSummaryLogo(
  buffer: Uint8Array,
  imageBytes: Uint8Array,
  ext: ExecutiveLogoExt,
): Uint8Array {
  if (imageBytes.length === 0) return buffer;
  try {
    const files = unzipSync(buffer);
    const keys = Object.keys(files);
    const wbXml = files["xl/workbook.xml"];
    const wbRels = files["xl/_rels/workbook.xml.rels"];
    if (!wbXml || !wbRels) return buffer;

    const workbookStr = strFromU8(wbXml);
    const relsById = parseWorkbookRels(strFromU8(wbRels));
    const sheetPath = findExecutiveSummaryWorksheetPath(workbookStr, relsById);
    if (!sheetPath || !files[sheetPath]) return buffer;

    let sheetXml = strFromU8(files[sheetPath]);
    if (/\bdrawing\b/i.test(sheetXml) && /<drawing\s/i.test(sheetXml)) {
      return buffer;
    }

    const sheetBase = sheetFileBase(sheetPath);
    const sheetRelsPath = `xl/worksheets/_rels/${sheetBase}.xml.rels`;

    const drawingN = nextNumericSuffix(keys, /xl\/drawings\/drawing(\d+)\.xml$/, 1);
    const drawingFile = `xl/drawings/drawing${drawingN}.xml`;
    const drawingRelsFile = `xl/drawings/_rels/drawing${drawingN}.xml.rels`;

    const mediaN = nextNumericSuffix(keys, /xl\/media\/image(\d+)\./, 1);
    const mediaExt = ext === "jpeg" ? "jpeg" : "png";
    const mediaFile = `xl/media/image${mediaN}.${mediaExt}`;

    const drawingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <xdr:oneCellAnchor>
    <xdr:from>
      <xdr:col>0</xdr:col>
      <xdr:colOff>0</xdr:colOff>
      <xdr:row>0</xdr:row>
      <xdr:rowOff>0</xdr:rowOff>
    </xdr:from>
    <xdr:ext cx="1905000" cy="476250"/>
    <xdr:pic>
      <xdr:nvPicPr>
        <xdr:cNvPr id="2" name="Brand logo"/>
        <xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr>
      </xdr:nvPicPr>
      <xdr:blipFill>
        <a:blip r:embed="rId1"/>
        <a:stretch><a:fillRect/></a:stretch>
      </xdr:blipFill>
      <xdr:spPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="1905000" cy="476250"/>
        </a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
      </xdr:spPr>
    </xdr:pic>
    <xdr:clientData/>
  </xdr:oneCellAnchor>
</xdr:wsDr>`;

    const drawingRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="${IMAGE_REL_TYPE}" Target="../media/image${mediaN}.${mediaExt}"/>
</Relationships>`;

    let sheetRelId: string;
    if (files[sheetRelsPath]) {
      const prev = strFromU8(files[sheetRelsPath]);
      sheetRelId = nextSheetRelId(prev);
      const insert = `<Relationship Id="${sheetRelId}" Type="${DRAWING_REL_TYPE}" Target="../drawings/drawing${drawingN}.xml"/>`;
      const updated = prev.replace(
        /<\/Relationships>\s*$/,
        `${insert}</Relationships>`,
      );
      files[sheetRelsPath] = strToU8(updated);
    } else {
      sheetRelId = "rId1";
      files[sheetRelsPath] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="${sheetRelId}" Type="${DRAWING_REL_TYPE}" Target="../drawings/drawing${drawingN}.xml"/>
</Relationships>`);
    }

    sheetXml = sheetXml.replace(
      /<\/worksheet>\s*$/,
      `<drawing r:id="${sheetRelId}"/></worksheet>`,
    );
    files[sheetPath] = strToU8(sheetXml);

    files[drawingFile] = strToU8(drawingXml);
    files[drawingRelsFile] = strToU8(drawingRelsXml);
    files[mediaFile] = imageBytes;

    const ctPath = "[Content_Types].xml";
    if (files[ctPath]) {
      let ct = strFromU8(files[ctPath]);
      ct = appendContentTypeOverride(
        ct,
        `/${drawingFile}`,
        DRAWING_CT,
      );
      files[ctPath] = strToU8(ct);
    }

    return zipSync(files, { level: 1 });
  } catch (e) {
    console.warn("[excel] Executive Summary logo patch failed:", e);
    return buffer;
  }
}
