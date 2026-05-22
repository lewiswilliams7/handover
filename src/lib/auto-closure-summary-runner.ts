import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";

import { notifyTicketClosureSummaryWebhooks } from "@/lib/chat-generation-notify";
import { GLOBAL_GENERATION_VOICE_AND_PUNCTUATION } from "@/lib/generation-global-style-rules";
import { haloNotesChronological, isHaloTicketActive } from "@/lib/delivery-health";
import { getTicketDetails, postNoteToHalo, type HaloTicket } from "@/lib/halo";
import { formatLoggedHours } from "@/lib/format-logged-hours";
import { stripHtmlToPlainText } from "@/lib/utils";

function ticketToClosurePrompt(t: HaloTicket): string {
  const notes = haloNotesChronological(t)
    .slice(-40)
    .map((n) => `- [${n.at}] ${n.author}: ${stripHtmlToPlainText(n.body).slice(0, 800)}`)
    .join("\n");
  return [
    `Title: ${t.summary ?? ""}`,
    `Status: ${t.status?.name ?? ""}`,
    `Client: ${t.client?.name ?? ""}`,
    `Target date: ${t.targetdate ?? " - "}`,
    `Time logged: ${formatLoggedHours(t.timetaken ?? 0)}`,
    `Description:\n${stripHtmlToPlainText(t.details ?? "").slice(0, 4000)}`,
    "Notes:",
    notes.length > 0 ? notes : "  - None",
  ].join("\n");
}

/**
 * On delivery-health refresh: for resolved Halo tickets not yet processed, generate a short
 * closure summary, push to Halo as a note, save to generations (no quota RPC), notify webhooks.
 */
export async function runAutoClosureSummaryCheck(opts: {
  admin: SupabaseClient;
  userId: string;
  haloUrl: string;
  token: string;
  listTickets: HaloTicket[];
}): Promise<void> {
  const { admin, userId, haloUrl, token, listTickets } = opts;

  const { data: conn, error: cErr } = await admin
    .from("halo_connections")
    .select("auto_closure_summary_enabled, auto_closure_summary")
    .eq("user_id", userId)
    .maybeSingle();

  const closureOn =
    conn &&
    (conn.auto_closure_summary === true || conn.auto_closure_summary_enabled === true);
  if (cErr) {
    console.error("[auto-closure] halo_connections load error:", cErr);
    return;
  }
  if (!closureOn) return;

  const { data: processedRows, error: processedErr } = await admin
    .from("halo_closure_processed")
    .select("ticket_id")
    .eq("user_id", userId);

  if (processedErr) {
    console.error("[auto-closure] halo_closure_processed load error:", processedErr);
    return;
  }

  const processed = new Set(
    (processedRows ?? [])
      .map((r) => (typeof (r as { ticket_id?: unknown }).ticket_id === "number" ? (r as { ticket_id: number }).ticket_id : null))
      .filter((n): n is number => typeof n === "number" && Number.isFinite(n)),
  );

  const resolved = listTickets.filter(
    (t) => !t.is_project && !isHaloTicketActive(t.status?.name ?? "Open"),
  );

  const candidates = resolved.filter((t) => !processed.has(t.id)).slice(0, 5);

  if (candidates.length === 0) return;
  if (!process.env.OPENAI_API_KEY) {
    console.warn("[auto-closure] OPENAI_API_KEY missing; skipping");
    return;
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  for (const t of candidates) {
    let detailed: HaloTicket;
    try {
      detailed = await getTicketDetails(haloUrl, token, t.id);
    } catch (e) {
      console.error("[auto-closure] ticket details:", t.id, e);
      continue;
    }

    const input = ticketToClosurePrompt(detailed);

    let closureBody: string;
    try {
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 1200,
        messages: [
          {
            role: "system",
            content: `You write a concise MSP ticket closure summary for internal HaloPSA notes.
Output plain text only (no markdown). Sections:
- What was resolved
- Time taken (use Halo time logged if present in input)
- Actions completed (bullet list, or "None noted")
- Risks resolved / residual (bullet list)

${GLOBAL_GENERATION_VOICE_AND_PUNCTUATION}`,
          },
          {
            role: "user",
            content: `Ticket is RESOLVED/CLOSED. Produce the closure summary from this export:\n\n${input.slice(0, 28000)}`,
          },
        ],
      });
      closureBody =
        completion.choices[0]?.message?.content?.trim() ||
        "Closure summary: ticket resolved - see ticket history in HaloPSA.";
    } catch (e) {
      console.error("[auto-closure] OpenAI:", t.id, e);
      continue;
    }

    const title = detailed.summary?.trim() || `Ticket ${detailed.id}`;
    const noteHtml = `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5">
<p><strong>Handover - automatic closure summary</strong></p>
<pre style="white-space:pre-wrap;font-family:inherit;margin:0">${closureBody
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")}</pre>
</div>`;

    try {
      await postNoteToHalo(haloUrl, token, detailed.id, noteHtml);
    } catch (e) {
      console.error("[auto-closure] Halo note:", t.id, e);
      continue;
    }

    const outputJson = {
      summary: closureBody,
      actions: [] as unknown[],
      risks: [] as unknown[],
      client_email: "",
      status_report: "",
    };

    const { data: inserted, error: insErr } = await admin
      .from("generations")
      .insert({
        user_id: userId,
        input_text: `AUTO_CLOSURE:${detailed.id}\n${input.slice(0, 12000)}`,
        project_name: title,
        tone: "internal",
        output_json: outputJson,
        source: "auto_closure",
        report_type: "report",
      })
      .select("id")
      .maybeSingle();

    if (insErr) {
      console.error("[auto-closure] generations insert:", insErr);
    }

    const { error: procErr } = await admin
      .from("halo_closure_processed")
      .insert({ user_id: userId, ticket_id: detailed.id });
    if (procErr && (procErr as { code?: string }).code !== "23505") {
      console.error("[auto-closure] processed insert:", procErr);
    }

    await notifyTicketClosureSummaryWebhooks({
      supabase: admin,
      userId,
      ticketName: title,
    }).catch((e) => console.error("[auto-closure] notify:", e));

    void inserted;
  }
}
