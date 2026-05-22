const CSS_RULE_BLOCK_RE = /[a-z.#\s,*][a-z0-9\s\-_.*#,:()[\]"'=>{]+\{[^}]*\}/gi;
const HTML_TAG_RE = /<[^>]*>/g;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const URL_RE = /\b(?:https?:\/\/|www\.)\S+/i;
const UK_POSTCODE_RE = /\b[A-Z]{1,2}[0-9]{1,2}\s[0-9][A-Z]{2}\b/i;
const PHONE_RE = /\b(?:\+44|0\d{2,4})[\s\-]?\d{3,4}[\s\-]?\d{3,4}\b/i;

const CAUTION_LINE_RE =
  /(CAUTION:\s*This message was sent from outside the company|Please do not click links or open attachments|if you're ever unsure)/i;

const AUTOREPLY_LINE_RE =
  /(Your ticket has been logged with ID|Thank you for contacting|Should you wish to provide any more information|please reply direct to this e-mail)/i;

const ENV_FOOTER_RE = /Please consider the environment before printing this email\./i;

const THREAD_SEPARATOR_RE = /^\s*(?:-{2,}|_{3,}|From:|Sent:|To:|Subject:|Cc:)\s*.*$/i;

const LEGAL_DISCLAIMER_LINE_RES: RegExp[] = [
  /This email and any attachments are confidential/i,
  /legal privilege/i,
  /disclosure[\s\S]{0,120}unauthorised|unauthorised[\s\S]{0,120}disclosure/i,
  /registered in England and Wales/i,
  /authorised and regulated by the Solicitors Regulation Authority/i,
  /Telecommunications \(Lawful Business Practice\)/i,
  /Registration Number\s*[:#]?\s*\d/i,
  /registered office is at/i,
  /reserves the right to monitor emails/i,
  /^[^\S\n]*-{10,}[^\S\n]*$/,
  /^_{10,}\s*$/,
];

const VIRUS_FREE_DISCLAIMER_RE =
  /virus\s*free[\s\S]{0,80}(?:confidential|intended recipient|attachments|disclaimer)|(?:confidential|intended recipient|attachments|disclaimer)[\s\S]{0,80}virus\s*free/i;

/** Quoted reply chain markers — content after the first match is dropped. */
const QUOTED_THREAD_START_LINE_RES: RegExp[] = [
  /^From:\s+.+$/i,
  /^Sent:\s+.+$/i,
  /^-{2,}\s*Original Message\s*-{2,}$/i,
  /^-----Original Message-----$/i,
  /^_{10,}\s*$/,
];

function collapseWhitespacePreservingLines(input: string): string {
  return input
    .split("\n")
    .map((line) => line.replace(/[ \t]{2,}/g, " ").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function lineLooksSignatureLike(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return (
    /(?:Tel:|Mobile:|Office:|Direct:|E-mail|Web:|Registered Company|Limited)/i.test(trimmed) ||
    trimmed.includes("@") ||
    trimmed.includes("+44") ||
    /\bwww\./i.test(trimmed) ||
    PHONE_RE.test(trimmed) ||
    EMAIL_RE.test(trimmed) ||
    URL_RE.test(trimmed) ||
    UK_POSTCODE_RE.test(trimmed)
  );
}

function stripSignatureBlocks(lines: string[]): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    let j = i;
    while (j < lines.length && lineLooksSignatureLike(lines[j] ?? "")) {
      j++;
    }
    const runLength = j - i;
    if (runLength >= 3) {
      i = j;
      continue;
    }
    out.push(lines[i] ?? "");
    i++;
  }
  return out;
}

function lineIsLegalDisclaimer(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (LEGAL_DISCLAIMER_LINE_RES.some((re) => re.test(trimmed))) return true;
  if (VIRUS_FREE_DISCLAIMER_RE.test(trimmed)) return true;
  if (/-{10,}/.test(trimmed)) return true;
  return false;
}

function truncateAtQuotedEmailThread(lines: string[]): string[] {
  for (let i = 0; i < lines.length; i++) {
    const trimmed = (lines[i] ?? "").trim();
    if (!trimmed) continue;
    if (QUOTED_THREAD_START_LINE_RES.some((re) => re.test(trimmed))) {
      return lines.slice(0, i);
    }
  }
  return lines;
}

function lineIsCautionRelated(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return CAUTION_LINE_RE.test(trimmed) || /^CAUTION:/i.test(trimmed);
}

/** Keep the first CAUTION banner block; drop duplicate copies of the same text. */
function dedupeRepeatedCautionBanners(lines: string[]): string[] {
  const seenBannerKeys = new Set<string>();
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    if (!lineIsCautionRelated(lines[i] ?? "")) {
      out.push(lines[i] ?? "");
      i++;
      continue;
    }

    const blockStart = i;
    let blockEnd = i + 1;
    while (blockEnd < lines.length) {
      const next = lines[blockEnd] ?? "";
      if (!next.trim()) {
        if (blockEnd + 1 < lines.length && lineIsCautionRelated(lines[blockEnd + 1] ?? "")) {
          blockEnd++;
          continue;
        }
        break;
      }
      if (lineIsCautionRelated(next)) {
        blockEnd++;
        continue;
      }
      break;
    }

    const bannerKey = lines
      .slice(blockStart, blockEnd)
      .map((l) => l.trim())
      .filter(Boolean)
      .join("\n")
      .toLowerCase();

    if (!seenBannerKeys.has(bannerKey)) {
      seenBannerKeys.add(bannerKey);
      for (let k = blockStart; k < blockEnd; k++) {
        out.push(lines[k] ?? "");
      }
    }

    i = blockEnd;
  }

  return out;
}

function stripKindRegardsSignature(lines: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (/^\s*Kind Regards,?\s*$/i.test(line.trim())) {
      let j = i + 1;
      let sigHits = 0;
      while (j < lines.length && j <= i + 8) {
        const probe = (lines[j] ?? "").trim();
        if (!probe) {
          j++;
          continue;
        }
        if (lineLooksSignatureLike(probe) || /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}$/.test(probe)) {
          sigHits++;
          j++;
          continue;
        }
        break;
      }
      if (sigHits > 0) {
        i = j - 1;
        continue;
      }
    }
    out.push(line);
  }
  return out;
}

export function cleanTicketNoteContent(raw: string): string {
  const original = typeof raw === "string" ? raw : String(raw ?? "");
  let cleaned = original;

  // 1) Remove CSS-like style blocks.
  cleaned = cleaned.replace(CSS_RULE_BLOCK_RE, " ");

  // 2) Remove HTML tags and collapse obvious whitespace.
  cleaned = cleaned.replace(HTML_TAG_RE, " ");
  cleaned = cleaned.replace(/\r\n?/g, "\n");
  cleaned = cleaned.replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n");
  cleaned = cleaned.replace(/[ \t]{2,}/g, " ");

  let lines = cleaned.split("\n").map((l) => l.trimEnd());

  // 3) Drop quoted reply chains (everything after the first thread marker).
  lines = truncateAtQuotedEmailThread(lines);

  // 4) Keep only the first instance of each repeated CAUTION banner.
  lines = dedupeRepeatedCautionBanners(lines);

  // 5) Remove legal disclaimer / boilerplate lines.
  lines = lines.filter((line) => !lineIsLegalDisclaimer(line));

  // 6) Remove auto-reply boilerplate lines and trailing signature chunks after Kind Regards.
  lines = lines.filter((line) => !AUTOREPLY_LINE_RE.test(line));
  lines = stripKindRegardsSignature(lines);

  // 7) Remove signature-like blocks with 3+ consecutive signature lines.
  lines = stripSignatureBlocks(lines);

  // 8) Remove email thread separators/headers on standalone lines.
  lines = lines.filter((line) => !THREAD_SEPARATOR_RE.test(line));

  // 9) Remove environmental footer line.
  lines = lines.filter((line) => !ENV_FOOTER_RE.test(line));

  // 10) Final cleanup.
  cleaned = collapseWhitespacePreservingLines(lines.join("\n"));

  if (!cleaned || cleaned.length < 10) {
    return original;
  }
  return cleaned;
}

const CAUTION_ONLY_RE =
  /^caution:\s*(?:this message was sent from outside|external email|please do not click)/i;

/** True when note content is too sparse or only a warning banner after cleaning. */
export function isSkippableTicketNoteDisplay(raw: string): boolean {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return true;
  const cleaned = cleanTicketNoteContent(trimmed).trim();
  if (cleaned.length < 10) return true;
  if (!/[a-zA-Z0-9]/.test(cleaned)) return true;
  if (CAUTION_ONLY_RE.test(cleaned) && cleaned.replace(/caution:[\s\S]*/gi, "").trim().length < 10) {
    return true;
  }
  return false;
}

/** Cleaned note body for UI, or null when the note should be hidden. */
export function ticketNoteDisplayContent(raw: string): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed || isSkippableTicketNoteDisplay(trimmed)) return null;
  return cleanTicketNoteContent(trimmed).trim();
}
