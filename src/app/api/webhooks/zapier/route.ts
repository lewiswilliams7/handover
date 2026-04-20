import { NextResponse } from "next/server";

import { POST as generatePost } from "@/app/api/generate/route";
import { formatTicketsForPrompt } from "@/lib/psa/format";
import type { NormalisedTicket } from "@/lib/psa/types";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { planFieldsFromProfileRow, userPlanHasProAccess } from "@/lib/utils/getPlan";

type ZapierNote = {
  author: string;
  date: string;
  content: string;
};

type ZapierTicket = {
  id: string;
  title: string;
  status: string;
  client: string;
  assigned_to: string;
  priority: string;
  description: string;
  notes: ZapierNote[];
  time_logged: number;
  target_date: string;
};

type ZapierWebhookBody = {
  api_key: string;
  tickets: ZapierTicket[];
};

async function logWebhookCall(args: {
  userId: string | null;
  status: string;
  error: string | null;
  ticketCount: number;
}) {
  try {
    const admin = createServiceRoleClient();
    await admin.from("zapier_webhook_logs").insert({
      user_id: args.userId,
      status: args.status,
      error: args.error,
      ticket_count: args.ticketCount,
    });
  } catch {
    // ignore logging failures
  }
}

function badRequest(message: string) {
  return NextResponse.json({ success: false, error: message }, { status: 400 });
}

function validateTicketsArray(rawTickets: unknown): ZapierTicket[] | { error: string } {
  if (!Array.isArray(rawTickets)) return { error: "Missing required field: tickets (array)" };
  if (rawTickets.length === 0) return { error: "tickets must contain at least one item" };
  for (let i = 0; i < rawTickets.length; i++) {
    const t = rawTickets[i];
    if (!t || typeof t !== "object") return { error: `tickets[${i}] must be an object` };
    const row = t as Record<string, unknown>;
    const required = ["id", "title", "status", "client"] as const;
    for (const k of required) {
      if (typeof row[k] !== "string" || !String(row[k]).trim()) {
        return { error: `tickets[${i}].${k} is required` };
      }
    }
    if (row.notes !== undefined && !Array.isArray(row.notes)) {
      return { error: `tickets[${i}].notes must be an array` };
    }
  }
  return rawTickets as ZapierTicket[];
}

function validateBody(raw: unknown): ZapierWebhookBody | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "Invalid JSON body." };
  const o = raw as Record<string, unknown>;
  const apiKey = typeof o.api_key === "string" ? o.api_key.trim() : "";
  if (!apiKey) return { error: "Missing required field: api_key" };

  const hasTicketsArray = Array.isArray(o.tickets);
  const hasFlatTicketHint =
    (typeof o.id === "string" && o.id.trim().length > 0) ||
    (typeof o.title === "string" && o.title.trim().length > 0);

  const ticketsCandidate: unknown = hasTicketsArray
    ? o.tickets
    : hasFlatTicketHint
      ? [
          {
            id: o.id,
            title: o.title,
            status: o.status,
            client: o.client,
            assigned_to: o.assigned_to,
            priority: o.priority,
            description: o.description,
            notes: o.notes,
            time_logged: o.time_logged,
            target_date: o.target_date,
          },
        ]
      : null;

  const validatedTickets = validateTicketsArray(ticketsCandidate);
  if ("error" in validatedTickets) return validatedTickets;

  return {
    api_key: apiKey,
    tickets: validatedTickets,
  };
}

function toPromptTickets(tickets: ZapierTicket[]): NormalisedTicket[] {
  return tickets.map((t) => ({
    id: String(t.id),
    title: String(t.title ?? "").trim(),
    type: "ticket",
    status: String(t.status ?? "").trim() || "Open",
    client: String(t.client ?? "").trim() || "Unknown",
    clientContact: null,
    assignedEngineer:
      typeof t.assigned_to === "string" && t.assigned_to.trim() ? t.assigned_to.trim() : null,
    priority: typeof t.priority === "string" && t.priority.trim() ? t.priority.trim() : null,
    targetDate:
      typeof t.target_date === "string" && t.target_date.trim() ? t.target_date.trim() : null,
    timeLogged: typeof t.time_logged === "number" && Number.isFinite(t.time_logged) ? t.time_logged : 0,
    description: typeof t.description === "string" && t.description.trim() ? t.description.trim() : null,
    notes: Array.isArray(t.notes)
      ? t.notes.map((n, idx) => ({
          id: `${t.id}-${idx + 1}`,
          date: typeof n.date === "string" ? n.date : null,
          author:
            typeof n.author === "string" && n.author.trim() ? n.author.trim() : "Unknown",
          type: "note",
          content: typeof n.content === "string" ? n.content : "",
        }))
      : [],
    source: "manual",
  }));
}

export async function POST(req: Request) {
  let parsedBody: ZapierWebhookBody | null = null;
  try {
    const bodyUnknown = (await req.json()) as unknown;
    const validated = validateBody(bodyUnknown);
    if ("error" in validated) {
      await logWebhookCall({
        userId: null,
        status: "bad_request",
        error: validated.error,
        ticketCount: 0,
      });
      return badRequest(validated.error);
    }
    parsedBody = validated;
    const api_key = parsedBody.api_key;
    console.log("Received api_key:", api_key);

    const supabase = createServiceRoleClient();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, plan, team_id, trial_ends_at")
      .eq("zapier_api_key", api_key)
      .single();
    console.log("Profile query result:", JSON.stringify({ data: profile, error: error?.message }));

    if (error || !profile) {
      await logWebhookCall({
        userId: null,
        status: "invalid_auth",
        error: "auth_required",
        ticketCount: parsedBody.tickets.length,
      });
      return NextResponse.json({ success: false, error: "auth_required" }, { status: 401 });
    }

    const pf = planFieldsFromProfileRow(profile);
    if (!userPlanHasProAccess(pf)) {
      await logWebhookCall({
        userId: profile.id,
        status: "forbidden",
        error: "Upgrade to a paid plan to use Zapier integration",
        ticketCount: parsedBody.tickets.length,
      });
      return NextResponse.json(
        { success: false, error: "Upgrade to a paid plan to use Zapier integration" },
        { status: 403 },
      );
    }

    const promptInput = formatTicketsForPrompt(toPromptTickets(parsedBody.tickets));
    const cronSecret = process.env.CRON_SECRET ?? "";
    const internalReq = new Request("http://local/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${cronSecret}`,
      },
      body: JSON.stringify({
        input: promptInput,
        projectName:
          (parsedBody.tickets[0] && parsedBody.tickets[0].client) || "Zapier webhook",
        scheduledCron: true,
        cronUserId: profile.id,
      }),
    });
    const generationRes = await generatePost(internalReq);
    const generationJson = (await generationRes.json()) as Record<string, unknown>;
    if (!generationRes.ok) {
      const msg =
        (typeof generationJson.error === "string" && generationJson.error) ||
        "Generation failed";
      await logWebhookCall({
        userId: profile.id,
        status: "generation_failed",
        error: msg,
        ticketCount: parsedBody.tickets.length,
      });
      return NextResponse.json({ success: false, error: msg }, { status: generationRes.status });
    }

    await logWebhookCall({
      userId: profile.id,
      status: "ok",
      error: null,
      ticketCount: parsedBody.tickets.length,
    });

    return NextResponse.json({
      success: true,
      outputs: {
        summary:
          typeof generationJson.summary === "string" ? generationJson.summary : "",
        actions: Array.isArray(generationJson.actions) ? generationJson.actions : [],
        risks: Array.isArray(generationJson.risks) ? generationJson.risks : [],
        client_email:
          typeof generationJson.client_email === "string"
            ? generationJson.client_email
            : "",
        status_report:
          typeof generationJson.status_report === "string"
            ? generationJson.status_report
            : "",
      },
    });
  } catch (e) {
    await logWebhookCall({
      userId: null,
      status: "error",
      error: e instanceof Error ? e.message : "Unexpected error",
      ticketCount: parsedBody?.tickets.length ?? 0,
    });
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "Unexpected error",
      },
      { status: 500 },
    );
  }
}
