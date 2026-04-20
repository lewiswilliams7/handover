import { TICKET_SECTION_RULE } from "@/lib/halo";

/** Halo export / formatTicketsForHandover note lines: `  - [date] Author: body` */
const NOTE_LINE_RE = /^  - (\[[^\]]+\])\s+(.+?): (.*)$/gm;

type NoteLineMatch = {
  start: number;
  end: number;
  dateBracket: string;
  author: string;
  body: string;
};

function findNoteLineMatches(s: string): NoteLineMatch[] {
  const out: NoteLineMatch[] = [];
  NOTE_LINE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = NOTE_LINE_RE.exec(s)) !== null) {
    out.push({
      start: m.index,
      end: m.index + m[0].length,
      dateBracket: m[1],
      author: m[2],
      body: m[3],
    });
  }
  return out;
}

/** First sentence or word-bounded prefix - avoids ending mid-word. */
function excerptForPrompt(body: string, maxLen: number): string {
  const t = body.trim().replace(/\s+/g, " ");
  const sent = t.match(/^.{1,800}?[.!?](?:\s|$)/);
  let excerpt = sent ? sent[0].trim() : t;
  if (excerpt.length > maxLen) {
    excerpt = excerpt.slice(0, maxLen);
    const sp = excerpt.lastIndexOf(" ");
    if (sp > maxLen * 0.55) excerpt = excerpt.slice(0, sp);
    excerpt += "…";
  }
  return excerpt;
}

function replaceNoteBody(
  s: string,
  victim: NoteLineMatch,
  newBody: string,
): string {
  const line = `  - ${victim.dateBracket} ${victim.author}: ${newBody}`;
  return s.slice(0, victim.start) + line + s.slice(victim.end);
}

function dropOldestTicketBlock(s: string): string | null {
  const rule = TICKET_SECTION_RULE;
  const first = s.indexOf(rule);
  if (first === -1) return null;
  const second = s.indexOf(rule, first + rule.length);
  if (second === -1) return null;
  const preamble = s.slice(0, first).trimEnd();
  const notice = `${preamble}\n\n[Earlier ticket block(s) omitted for prompt length - see HaloPSA.]\n\n`;
  return notice + s.slice(second);
}

function truncateAtParagraphBoundary(s: string, maxChars: number): string {
  if (s.length <= maxChars) return s;
  let cut = s.slice(0, maxChars);
  const lastPara = cut.lastIndexOf("\n\n");
  if (lastPara > maxChars * 0.45) {
    return (
      cut.slice(0, lastPara).trimEnd() +
      "\n\n[System: Input truncated at a paragraph boundary for length.]"
    );
  }
  const lastNl = cut.lastIndexOf("\n");
  if (lastNl > maxChars * 0.45) {
    return (
      cut.slice(0, lastNl).trimEnd() +
      "\n\n[System: Input truncated at a line boundary for length.]"
    );
  }
  return (
    cut.trimEnd() +
    "\n[System: Input truncated for length.]"
  );
}

/**
 * Shrinks handover text to fit `maxChars` without per-note mid-sentence slicing:
 * condenses oldest matching note lines first (sentence/word-bounded excerpt), then
 * omits whole older note lines, then drops leading ticket blocks, then paragraph trim.
 */
export function fitHandoverInputToMaxLength(
  input: string,
  maxChars: number,
): string {
  if (input.length <= maxChars) return input;

  let s = input;
  const maxIterations = 2000;
  let iter = 0;

  while (s.length > maxChars && iter++ < maxIterations) {
    const matches = findNoteLineMatches(s);
    const victim = matches.find(
      (m) => m.body.length > 120 && !m.body.startsWith("[Earlier note"),
    );
    if (!victim) break;
    const preview = excerptForPrompt(victim.body, 220);
    const newBody = `[Earlier note shortened for prompt length - ${preview}]`;
    s = replaceNoteBody(s, victim, newBody);
  }

  iter = 0;
  while (s.length > maxChars && iter++ < maxIterations) {
    const matches = findNoteLineMatches(s);
    const victim = matches.find(
      (m) =>
        m.body.length > 40 &&
        !m.body.startsWith("[Omitted for length") &&
        !m.body.startsWith("[Earlier note shortened"),
    );
    if (!victim) break;
    s = replaceNoteBody(
      s,
      victim,
      "[Omitted for length - see HaloPSA for full text]",
    );
  }

  iter = 0;
  while (s.length > maxChars && iter++ < 50) {
    const next = dropOldestTicketBlock(s);
    if (!next || next.length >= s.length) break;
    s = next;
  }

  if (s.length > maxChars) {
    s = truncateAtParagraphBoundary(s, maxChars);
  }

  return s;
}
