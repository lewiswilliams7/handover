import { formatLoggedHours } from "@/lib/format-logged-hours";
import type { NormalisedNote, NormalisedTicket } from "@/lib/psa/types";

/** HaloPSA export parity fields (optional on the wire). */
type PromptTicketRow = NormalisedTicket & {
  ticketTypeName?: string | null;
  isProjectTask?: boolean;
  parentProjectId?: number | null;
  promptShowAssignee?: boolean;
  promptShowDescription?: boolean;
  promptShowNotes?: boolean;
};

export const TICKET_SECTION_RULE = "═══════════════════════════════";

function prefixForNoteType(t: NormalisedNote["type"]): string {
  switch (t) {
    case "email_received":
      return "[Email Received]";
    case "email_sent":
      return "[Email Sent]";
    default:
      return "[Note]";
  }
}

function smartFilterNormalisedNotes(
  notes: NormalisedNote[] | null | undefined,
  compareTitle: string,
): NormalisedNote[] {
  if (!Array.isArray(notes)) return [];
  const now = Date.now();
  const title = compareTitle.trim().toLowerCase();
  const keywordRx =
    /(update|progress|completed|blocked|waiting|client|issue|resolved|escalat)/i;
  const unique = new Set<string>();

  return notes
    .map((n) => ({
      n,
      text: n.content,
      author: n.author,
      date: n.date,
    }))
    .filter(({ text, author }) => {
      if (!text || text.length < 10) return false;
      if (author.toLowerCase().includes("system") || author.toLowerCase().includes("auto"))
        return false;
      if (text.toLowerCase() === title) return false;
      const key = `${author.toLowerCase()}::${text.toLowerCase()}`;
      if (unique.has(key)) return false;
      unique.add(key);
      return true;
    })
    .filter(({ text, date }) => {
      if (!date) return keywordRx.test(text);
      const ts = new Date(date).getTime();
      if (Number.isNaN(ts)) return keywordRx.test(text);
      const ageDays = (now - ts) / (1000 * 60 * 60 * 24);
      return ageDays <= 30 || keywordRx.test(text);
    })
    .sort((a, b) => {
      const ad = a.date ? new Date(a.date).getTime() : 0;
      const bd = b.date ? new Date(b.date).getTime() : 0;
      return ad - bd;
    })
    .map(({ n }) => n);
}

/**
 * Builds the HaloPSA ticket export string passed to the model (same shape as legacy formatTicketsForHandover).
 */
export function formatTicketsForPrompt(tickets: NormalisedTicket[]): string {
  const rows = tickets as PromptTicketRow[];
  const header = `HaloPSA Ticket Export - ${rows.length} tickets\n\n`;
  let loggedFirstNoteSample = false;
  const body = rows
    .map((t, index) => {
      const showAssignee = t.promptShowAssignee !== false;
      const showDescription = t.promptShowDescription !== false;
      const showNotes = t.promptShowNotes !== false;

      const rawNotesList = t.notes;
      if (
        showNotes &&
        Array.isArray(rawNotesList) &&
        rawNotesList.length > 0 &&
        !loggedFirstNoteSample
      ) {
        console.log(
          "[notes] First note raw:",
          JSON.stringify(rawNotesList[0], null, 2),
        );
        loggedFirstNoteSample = true;
      }
      const notes = smartFilterNormalisedNotes(t.notes, t.title);
      const notesBlock =
        notes.length > 0
          ? notes
              .map((n) => {
                const date = n.date ?? "Unknown";
                const author = n.author;
                const text = n.content;
                return `  - [${date}] ${prefixForNoteType(n.type)} ${author}: ${text}`;
              })
              .join("\n")
          : "  - None";
      const parts: string[] = [];
      const isProject = t.type === "project";
      parts.push(`${TICKET_SECTION_RULE}`);
      parts.push(
        `TICKET ${index + 1} of ${rows.length} [${isProject ? "PROJECT" : "TICKET"}]`,
      );
      parts.push(`${TICKET_SECTION_RULE}`);
      parts.push(`Type: ${isProject ? "Project" : "Ticket"}`);
      const ttName = (t.ticketTypeName && t.ticketTypeName.trim()) || "";
      if (ttName) {
        parts.push(`Ticket Type: ${ttName}`);
      }
      if (t.isProjectTask && t.parentProjectId != null && t.parentProjectId > 0) {
        parts.push(`Project task context: part of project #${t.parentProjectId}`);
      }
      parts.push(`Title: ${t.title}`);
      parts.push(`Status: ${t.status || "Unknown"}`);
      parts.push(`Client: ${t.client ?? "Unknown"}`);
      parts.push(`Client Contact: ${t.clientContact ?? "Not specified"}`);
      parts.push(
        `Assigned Engineer: ${showAssignee ? (t.assignedEngineer ?? "Unassigned") : "Unassigned"}`,
      );
      parts.push(`Priority: ${t.priority ?? "None"}`);
      parts.push(`Target date: ${t.targetDate ?? "Not set"}`);
      parts.push(`Time logged: ${formatLoggedHours(t.timeLogged)}`);
      parts.push(
        `Description: ${showDescription ? (t.description ?? "None") : "None"}`,
      );
      parts.push("Notes:");
      parts.push(showNotes ? notesBlock : "  - None");
      return parts.join("\n");
    })
    .join("\n\n");
  return `${header}${body}`;
}
