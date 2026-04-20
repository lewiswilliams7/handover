import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

import { getCWAuthHeaders, getCWConnectionForUser } from "@/lib/cw-auth";
import { createServerClient } from "@/lib/supabase/server";

type PushBody = {
  ticketIds?: Array<number | string>;
  itemTypes?: Record<string, "ticket" | "project">;
  outputs?: Record<string, unknown>;
  selectedOutputs?: string[];
};
const RECENT_PUSH_TTL_MS = 10_000;
const recentPushSignatures = new Map<string, number>();
const IDEMPOTENCY_WINDOW_MS = 5 * 60 * 1000;

type CwNote = {
  text?: string | null;
  note?: string | null;
  dateCreated?: string | null;
};

function normaliseNoteText(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

async function hasRecentIdenticalNote(params: {
  siteUrl: string;
  headers: HeadersInit;
  ticketId: number;
  itemType: "ticket" | "project";
  text: string;
}): Promise<boolean> {
  const { siteUrl, headers, ticketId, itemType, text } = params;
  const base = siteUrl.replace(/\/+$/, "");
  const listUrl =
    itemType === "project"
      ? `${base}/v4_6_release/apis/3.0/project/projects/${ticketId}/notes?pageSize=25`
      : `${base}/v4_6_release/apis/3.0/service/tickets/${ticketId}/notes?pageSize=25`;
  const res = await fetch(listUrl, { headers, cache: "no-store" });
  if (!res.ok) return false;
  const raw = (await res.json().catch(() => [])) as unknown;
  const rows = (Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { items?: unknown[] })?.items)
      ? (raw as { items: unknown[] }).items
      : []) as CwNote[];
  const wanted = normaliseNoteText(text);
  const now = Date.now();
  return rows.some((row) => {
    const content = normaliseNoteText(String(row.text ?? row.note ?? ""));
    if (!content || content !== wanted) return false;
    if (!row.dateCreated) return false;
    const createdAtMs = new Date(row.dateCreated).getTime();
    if (!Number.isFinite(createdAtMs)) return false;
    return now - createdAtMs <= IDEMPOTENCY_WINDOW_MS;
  });
}

function buildPushText(outputs: Record<string, unknown>, selectedOutputs: string[]): string {
  const dateLabel = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const lines: string[] = [`HANDOVER REPORT - ${dateLabel}`];

  if (selectedOutputs.includes("summary") && outputs.summary) {
    lines.push("", "SUMMARY", String(outputs.summary).trim());
  }

  if (selectedOutputs.includes("actions") && Array.isArray(outputs.actions)) {
    lines.push("", "ACTIONS");
    for (const row of outputs.actions as Array<Record<string, unknown>>) {
      lines.push(
        `- ${String(row.task ?? "").trim()} | Owner: ${String(row.suggested_owner ?? "Unassigned").trim()} | Priority: ${String(row.priority ?? "Medium").trim()}`,
      );
    }
  }

  if (selectedOutputs.includes("risks") && Array.isArray(outputs.risks)) {
    lines.push("", "RISKS");
    for (const row of outputs.risks as Array<Record<string, unknown>>) {
      lines.push(
        `- ${String(row.risk ?? "").trim()} | Impact: ${String(row.impact ?? "").trim()} | Mitigation: ${String(row.mitigation ?? "").trim()}`,
      );
    }
  }

  if (selectedOutputs.includes("client_email") && outputs.client_email) {
    lines.push("", "CLIENT EMAIL", String(outputs.client_email).trim());
  }

  return lines.join("\n").trim();
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as PushBody;
    const ticketIds = Array.from(new Set((body.ticketIds ?? [])
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0)));
    const outputs = body.outputs ?? {};
    const itemTypes = body.itemTypes ?? {};
    const selectedOutputs = body.selectedOutputs ?? [];
    if (ticketIds.length === 0 || selectedOutputs.length === 0) {
      return NextResponse.json({ error: "No ticket ids or outputs selected." }, { status: 400 });
    }
    const now = Date.now();
    for (const [key, at] of recentPushSignatures.entries()) {
      if (now - at > RECENT_PUSH_TTL_MS) recentPushSignatures.delete(key);
    }
    const signature = createHash("sha256")
      .update(
        JSON.stringify({
          userId: user.id,
          ticketIds: [...ticketIds].sort((a, b) => a - b),
          selectedOutputs: [...selectedOutputs].sort(),
          outputs,
        }),
      )
      .digest("hex");
    if (recentPushSignatures.has(signature)) {
      return NextResponse.json(
        {
          success: true,
          posted: 0,
          skipped: ticketIds.length,
          failed: 0,
          results: ticketIds.map((ticketId) => ({
            ticketId,
            success: true,
            skipped: true,
            reason: "Duplicate request blocked by server idempotency window.",
          })),
        },
      );
    }
    recentPushSignatures.set(signature, now);

    const [conn, headers] = await Promise.all([
      getCWConnectionForUser(user.id),
      getCWAuthHeaders(user.id),
    ]);
    const text = buildPushText(outputs, selectedOutputs);

    const results = await Promise.all(
      ticketIds.map(async (ticketId) => {
        const itemType = itemTypes[String(ticketId)] === "project" ? "project" : "ticket";
        const alreadyExists = await hasRecentIdenticalNote({
          siteUrl: conn.siteUrl,
          headers,
          ticketId,
          itemType,
          text,
        });
        if (alreadyExists) {
          return {
            ticketId,
            success: true,
            skipped: true,
            reason: "Identical note already exists within last 5 minutes.",
          };
        }
        const url =
          itemType === "project"
            ? `${conn.siteUrl}/v4_6_release/apis/3.0/project/projects/${ticketId}/notes`
            : `${conn.siteUrl}/v4_6_release/apis/3.0/service/tickets/${ticketId}/notes`;
        const payload =
          itemType === "project"
            ? { text, noteType: "General" }
            : {
                text,
                detailDescriptionFlag: true,
                internalAnalysisFlag: false,
                resolutionFlag: false,
              };
        const res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          cache: "no-store",
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          return { ticketId, success: false, error: errText || `HTTP ${res.status}` };
        }
        return { ticketId, success: true, skipped: false };
      }),
    );

    const posted = results.filter((r) => r.success && !("skipped" in r && r.skipped)).length;
    const skipped = results.filter((r) => "skipped" in r && r.skipped).length;
    const failed = results.filter((r) => !r.success).length;
    return NextResponse.json({
      success: posted > 0 || skipped > 0,
      posted,
      skipped,
      failed,
      results,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to push note to ConnectWise." },
      { status: 500 },
    );
  }
}

