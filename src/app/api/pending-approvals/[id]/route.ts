import { NextResponse } from "next/server";
import { Resend } from "resend";

import { decrypt } from "@/lib/encryption";
import { filterOutputsForSchedulePushItem } from "@/lib/filter-outputs-for-schedule-push";
import { getHaloToken, type HaloProject, type HaloTicket } from "@/lib/halo";
import { pushHandoverOutputsToHaloTickets } from "@/lib/halo-push-note";
import type { HaloPushOutputKey } from "@/lib/halo-push";
import { computeCiServiceReviewNextRunAt } from "@/lib/server/process-ci-service-review-schedule";
import { computeNextRunFromLastRunUtc } from "@/lib/scheduled-reports";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

type ApprovalAction = "approve" | "reject" | "approve_and_stop";

type HoldPayload = {
  subject?: string;
  html?: string;
  text?: string;
  to?: string | string[];
  cc?: string | string[] | null;
  bcc?: string | string[] | null;
  replyTo?: string | null;
  fromHeader?: string;
  excelAttachment?: {
    filename: string;
    content: string;
    contentType?: string;
  } | null;
  pushToHalo?: boolean;
  haloPushConfig?: Record<string, unknown> | null;
  clientsCovered?: string[];
  scheduleName?: string;
};

function parseAction(raw: unknown): ApprovalAction | null {
  if (raw === "approve" || raw === "reject" || raw === "approve_and_stop") {
    return raw;
  }
  return null;
}

function emailToFromPayload(to: HoldPayload["to"]): string | null {
  if (typeof to === "string" && to.trim()) return to.trim();
  if (Array.isArray(to) && to.length > 0) {
    const first = to[0];
    return typeof first === "string" && first.trim() ? first.trim() : null;
  }
  return null;
}

async function runStoredHaloPush(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  haloPushConfig: Record<string, unknown>,
): Promise<void> {
  const haloUrl =
    typeof haloPushConfig.haloUrl === "string" ? haloPushConfig.haloUrl : null;
  const orderedPushIds = Array.isArray(haloPushConfig.orderedPushIds)
    ? haloPushConfig.orderedPushIds.filter(
        (x): x is number => typeof x === "number" && Number.isFinite(x),
      )
    : [];
  if (!haloUrl || orderedPushIds.length === 0) return;

  const { data: connection, error: connErr } = await supabase
    .from("halo_connections")
    .select("halo_url, tenant, client_id, client_secret_encrypted, client_id_encrypted, client_secret")
    .eq("user_id", userId)
    .maybeSingle();

  if (connErr || !connection) {
    console.error("[pending-approvals PATCH] No Halo connection for push", connErr?.message);
    return;
  }

  let clientId: string;
  let clientSecret: string;
  try {
    clientId =
      connection.client_id_encrypted != null
        ? decrypt(connection.client_id_encrypted)
        : String(connection.client_id ?? "");
    clientSecret =
      connection.client_secret_encrypted != null
        ? decrypt(connection.client_secret_encrypted)
        : String(connection.client_secret ?? "");
  } catch (e) {
    console.error("[pending-approvals PATCH] Halo decrypt failed", e);
    return;
  }

  let token: string;
  try {
    token = await getHaloToken({
      haloUrl: connection.halo_url,
      tenant: typeof connection.tenant === "string" ? connection.tenant : null,
      clientId,
      clientSecret,
    });
  } catch (e) {
    console.error("[pending-approvals PATCH] Halo token failed", e);
    return;
  }

  const postConsolidated = haloPushConfig.postConsolidated === true;
  const haloPushOutputs = Array.isArray(haloPushConfig.haloPushOutputs)
    ? haloPushConfig.haloPushOutputs.filter((x): x is string => typeof x === "string")
    : ["client_email", "actions", "risks"];
  const haloPushExcel = haloPushConfig.haloPushExcel === true;
  const haloPushExcelTabs = Array.isArray(haloPushConfig.haloPushExcelTabs)
    ? haloPushConfig.haloPushExcelTabs.filter((x): x is string => typeof x === "string")
    : [];
  const projectName =
    typeof haloPushConfig.projectName === "string" ? haloPushConfig.projectName : "Report";
  const brandName =
    typeof haloPushConfig.brandName === "string" ? haloPushConfig.brandName : null;
  const brandColor =
    typeof haloPushConfig.brandColor === "string" ? haloPushConfig.brandColor : null;
  const brandSecondaryColor =
    typeof haloPushConfig.brandSecondaryColor === "string"
      ? haloPushConfig.brandSecondaryColor
      : null;
  const brandLogoUrl =
    typeof haloPushConfig.brandLogoUrl === "string" ? haloPushConfig.brandLogoUrl : null;
  const partnerWhiteLabel = haloPushConfig.partnerWhiteLabel === true;
  const fullOutputs =
    haloPushConfig.generated != null && typeof haloPushConfig.generated === "object"
      ? (haloPushConfig.generated as Record<string, unknown>)
      : {};
  const tickets = Array.isArray(haloPushConfig.tickets)
    ? (haloPushConfig.tickets as HaloTicket[])
    : [];
  const projects = Array.isArray(haloPushConfig.projects)
    ? (haloPushConfig.projects as HaloProject[])
    : [];

  if (postConsolidated) {
    await pushHandoverOutputsToHaloTickets({
      haloUrl,
      token,
      ticketIds: [orderedPushIds[0]!],
      outputs: fullOutputs,
      selectedOutputs: haloPushOutputs as HaloPushOutputKey[],
      projectName,
      attachExcel: haloPushExcel,
      excelTabs: haloPushExcelTabs,
      brandName,
      brandColor,
      brandSecondaryColor,
      brandLogoUrl,
      partnerWhiteLabel,
      logTag: "[pending-approvals]",
    });
    return;
  }

  for (const id of orderedPushIds) {
    const ticket = tickets.find((t) => Number(t.id) === id);
    const project = projects.find((p) => Number(p.id) === id);
    const outputs =
      ticket != null
        ? filterOutputsForSchedulePushItem(fullOutputs, { kind: "support", ticket })
        : project != null
          ? filterOutputsForSchedulePushItem(fullOutputs, { kind: "project", project })
          : fullOutputs;
    await pushHandoverOutputsToHaloTickets({
      haloUrl,
      token,
      ticketIds: [id],
      outputs,
      selectedOutputs: haloPushOutputs as HaloPushOutputKey[],
      projectName,
      attachExcel: haloPushExcel,
      excelTabs: haloPushExcelTabs,
      brandName,
      brandColor,
      brandSecondaryColor,
      brandLogoUrl,
      partnerWhiteLabel,
      logTag: "[pending-approvals]",
    });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Missing approval id" }, { status: 400 });
    }

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = parseAction(body.action);
    if (!action) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { data: row, error: fetchErr } = await supabase
      .from("pending_approvals")
      .select("id, user_id, schedule_id, source, status, payload")
      .eq("id", id.trim())
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchErr) {
      console.error("[pending-approvals PATCH] fetch failed", fetchErr.message);
      return NextResponse.json(
        { error: "Could not load approval. Please try again." },
        { status: 500 },
      );
    }
    if (!row || row.status !== "pending") {
      return NextResponse.json({ error: "Approval not found" }, { status: 404 });
    }

    const nowIso = new Date().toISOString();

    if (action === "reject") {
      const { error: rejectErr } = await supabase
        .from("pending_approvals")
        .update({ status: "rejected", resolved_at: nowIso })
        .eq("id", id.trim())
        .eq("user_id", user.id)
        .eq("status", "pending");

      if (rejectErr) {
        console.error("[pending-approvals PATCH] reject failed", rejectErr.message);
        return NextResponse.json(
          { error: "Could not reject approval. Please try again." },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true, action: "reject" });
    }

    const payload = (row.payload ?? {}) as HoldPayload;
    const resendKey = process.env.RESEND_API_KEY?.trim();
    if (!resendKey) {
      return NextResponse.json({ error: "Email not configured" }, { status: 500 });
    }
    if (
      typeof payload.subject !== "string" ||
      typeof payload.html !== "string" ||
      typeof payload.text !== "string" ||
      typeof payload.fromHeader !== "string" ||
      !payload.to
    ) {
      return NextResponse.json(
        { error: "Stored approval payload is incomplete" },
        { status: 500 },
      );
    }

    const resend = new Resend(resendKey);
    const { error: sendErr } = await resend.emails.send({
      from: payload.fromHeader,
      ...(payload.replyTo ? { replyTo: payload.replyTo } : {}),
      to: payload.to,
      ...(payload.cc ? { cc: payload.cc } : {}),
      ...(payload.bcc ? { bcc: payload.bcc } : {}),
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      attachments: payload.excelAttachment
        ? [
            {
              filename: payload.excelAttachment.filename,
              content: payload.excelAttachment.content,
              contentType:
                payload.excelAttachment.contentType ??
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            },
          ]
        : undefined,
    });

    if (sendErr) {
      console.error("[pending-approvals PATCH] Resend error", sendErr);
      return NextResponse.json(
        { error: sendErr.message ?? "Email send failed" },
        { status: 500 },
      );
    }

    if (payload.pushToHalo === true && payload.haloPushConfig) {
      try {
        const pushUserId =
          typeof payload.haloPushConfig.userId === "string"
            ? payload.haloPushConfig.userId
            : user.id;
        await runStoredHaloPush(supabase, pushUserId, payload.haloPushConfig);
      } catch (e) {
        console.error("[pending-approvals PATCH] Halo push failed", e);
      }
    }

    const { error: approveErr } = await supabase
      .from("pending_approvals")
      .update({ status: "approved", resolved_at: nowIso })
      .eq("id", id.trim())
      .eq("user_id", user.id)
      .eq("status", "pending");

    if (approveErr) {
      console.error("[pending-approvals PATCH] approve status update failed", approveErr.message);
      return NextResponse.json(
        { error: "Report was sent but approval status could not be updated" },
        { status: 500 },
      );
    }

    const admin = createServiceRoleClient();
    const clientsCovered = Array.isArray(payload.clientsCovered)
      ? payload.clientsCovered.filter((x): x is string => typeof x === "string")
      : [];
    const historySource =
      row.source === "digest" || row.source === "ci" ? row.source : "psa";

    const { error: historyErr } = await admin.from("scheduled_report_history").insert({
      user_id: user.id,
      schedule_id: row.schedule_id ?? null,
      email_to: emailToFromPayload(payload.to),
      tickets_processed: 0,
      clients_covered:
        clientsCovered.length > 0
          ? clientsCovered
          : payload.scheduleName
            ? [payload.scheduleName]
            : [],
      status: "sent",
      error_message: null,
      source: historySource,
    });
    if (historyErr) {
      console.error("[pending-approvals PATCH] history insert failed", historyErr.message);
    }

    if (row.schedule_id) {
      const { data: scheduleRow } = await supabase
        .from("scheduled_reports")
        .select("schedule_time, enabled, report_type, date_range")
        .eq("id", row.schedule_id)
        .eq("user_id", user.id)
        .maybeSingle();

      const scheduleTime =
        typeof scheduleRow?.schedule_time === "string"
          ? scheduleRow.schedule_time
          : "07:00";
      const lastRunAt = new Date(nowIso);
      const reportType =
        typeof scheduleRow?.report_type === "string"
          ? scheduleRow.report_type.trim()
          : "";
      const dateRange =
        typeof scheduleRow?.date_range === "string"
          ? scheduleRow.date_range
          : null;

      let nextRun: Date;
      if (row.source === "ci" && reportType === "ci_qbr") {
        nextRun = new Date(lastRunAt.getTime() + 90 * 24 * 60 * 60 * 1000);
      } else if (row.source === "ci") {
        nextRun = computeCiServiceReviewNextRunAt(
          dateRange,
          scheduleTime,
          lastRunAt,
        );
      } else {
        nextRun = computeNextRunFromLastRunUtc(scheduleTime, lastRunAt);
      }

      const scheduleUpdate: Record<string, unknown> = {
        last_run_at: nowIso,
        next_run_at: scheduleRow?.enabled !== false ? nextRun.toISOString() : null,
        updated_at: nowIso,
      };
      if (action === "approve_and_stop") {
        scheduleUpdate.hold_for_review = false;
      }

      const { error: scheduleErr } = await supabase
        .from("scheduled_reports")
        .update(scheduleUpdate)
        .eq("id", row.schedule_id)
        .eq("user_id", user.id);

      if (scheduleErr) {
        console.error("[pending-approvals PATCH] schedule update failed", scheduleErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      action,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    console.error("[pending-approvals PATCH]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
