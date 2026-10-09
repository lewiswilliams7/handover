import { Resend } from "resend";

import { getAppOrigin } from "@/lib/app-url";
import { buildHandoverResendFromHeader } from "@/lib/resend-from-header";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { stripHtmlToPlainText } from "@/lib/utils";

export type CiQbrScheduleRow = {
  id: string;
  user_id: string;
  name: string | null;
  ci_qbr_client_name: string | null;
  email_to: string | null;
  email_cc: string | null;
  date_range: string | null;
  brand_name: string | null;
  hold_for_review?: boolean | null;
};

export type ProcessCiQbrResult = {
  scheduleId: string;
  success: boolean;
  held?: boolean;
  reason?: string;
  error?: string;
};

type AdminClient = ReturnType<typeof createServiceRoleClient>;

const resend = new Resend(process.env.RESEND_API_KEY);

async function fetchProfileEmail(
  adminClient: AdminClient,
  userId: string,
): Promise<string | null> {
  const { data: profile } = await adminClient
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();
  return profile?.email?.trim() ?? null;
}

export async function processCiQbrSchedule(
  adminClient: AdminClient,
  schedule: CiQbrScheduleRow,
  now: Date = new Date(),
): Promise<ProcessCiQbrResult> {
  try {
    const clientName = schedule.ci_qbr_client_name?.trim() ?? "";
    if (!clientName) {
      return { scheduleId: schedule.id, success: false, error: "No client name" };
    }

    const months =
      schedule.date_range === "last_90_days"
        ? 3
        : schedule.date_range === "last_180_days"
          ? 6
          : 3;

    const baseUrl = getAppOrigin();
    const cronSecret = process.env.CRON_SECRET ?? "";

    const qbrRes = await fetch(`${baseUrl}/api/client-intelligence/qbr`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cronSecret}`,
        "x-user-id": schedule.user_id,
      },
      body: JSON.stringify({
        clientName,
        months,
      }),
    });

    if (!qbrRes.ok) {
      return {
        scheduleId: schedule.id,
        success: false,
        error: `QBR generation failed (${qbrRes.status})`,
      };
    }

    const qbrData = (await qbrRes.json()) as {
      qbr?: {
        clientName: string;
        periodLabel: string;
        executiveSummary: string;
        keyAchievements: string[];
        recurringIssues: string[];
        openRisks: string[];
        recommendedActions: string[];
        qbrTalkingPoints: string[];
        strategicPriorities: string[];
        relationshipHealth: string;
      };
    };

    if (!qbrData.qbr) {
      return { scheduleId: schedule.id, success: false, error: "QBR data missing" };
    }

    const qbr = qbrData.qbr;
    const brandName = schedule.brand_name?.trim() || "Handover";

    const healthColour =
      qbr.relationshipHealth === "red"
        ? "#ef4444"
        : qbr.relationshipHealth === "amber"
          ? "#f59e0b"
          : "#22c55e";

    const achievementsHtml = qbr.keyAchievements
      .map(
        (a) => `
<li style="margin-bottom:6px;font-size:12px;color:#374151;">
  ✓ ${a}
</li>`,
      )
      .join("");

    const risksHtml = qbr.openRisks
      .map(
        (r) => `
<li style="margin-bottom:6px;font-size:12px;color:#374151;">
  ↑ ${r}
</li>`,
      )
      .join("");

    const actionsHtml = qbr.recommendedActions
      .map(
        (a) => `
<li style="margin-bottom:6px;font-size:12px;color:#374151;">
  → ${a}
</li>`,
      )
      .join("");

    const emailHtml = `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:0;">
<div style="max-width:640px;margin:0 auto;padding:24px 16px;">

  <div style="background:#06091a;border-radius:12px;padding:24px;margin-bottom:16px;">
    <p style="color:#38bdf8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;">
      ${brandName} · Quarterly Business Review
    </p>
    <h1 style="color:#fff;font-size:20px;font-weight:600;margin:0 0 6px;">
      ${qbr.clientName}
    </h1>
    <p style="color:#94a3b8;font-size:13px;margin:0;">
      ${qbr.periodLabel}
    </p>
  </div>

  <div style="background:#fff;border-radius:12px;padding:20px;margin-bottom:12px;border:1px solid #e5e7eb;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
      <div style="width:10px;height:10px;border-radius:50%;background:${healthColour};flex-shrink:0;"></div>
      <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${healthColour};">
        ${qbr.relationshipHealth.charAt(0).toUpperCase() + qbr.relationshipHealth.slice(1)} — Relationship Health
      </span>
    </div>
    <p style="font-size:13px;color:#374151;line-height:1.6;margin:0;">
      ${qbr.executiveSummary}
    </p>
  </div>

  ${
    qbr.keyAchievements.length > 0
      ? `<div style="background:#fff;border-radius:12px;padding:20px;margin-bottom:12px;border:1px solid #e5e7eb;">
    <h3 style="font-size:11px;font-weight:700;text-transform:uppercase;color:#9ca3af;letter-spacing:0.08em;margin:0 0 12px;">
      Key achievements
    </h3>
    <ul style="margin:0;padding:0;list-style:none;">
      ${achievementsHtml}
    </ul>
  </div>`
      : ""
  }

  ${
    qbr.openRisks.length > 0
      ? `<div style="background:#fff;border-radius:12px;padding:20px;margin-bottom:12px;border:1px solid #fee2e2;">
    <h3 style="font-size:11px;font-weight:700;text-transform:uppercase;color:#ef4444;letter-spacing:0.08em;margin:0 0 12px;">
      Open risks
    </h3>
    <ul style="margin:0;padding:0;list-style:none;">
      ${risksHtml}
    </ul>
  </div>`
      : ""
  }

  ${
    qbr.recommendedActions.length > 0
      ? `<div style="background:#fff;border-radius:12px;padding:20px;margin-bottom:12px;border:1px solid #e5e7eb;">
    <h3 style="font-size:11px;font-weight:700;text-transform:uppercase;color:#9ca3af;letter-spacing:0.08em;margin:0 0 12px;">
      Recommended actions
    </h3>
    <ul style="margin:0;padding:0;list-style:none;">
      ${actionsHtml}
    </ul>
  </div>`
      : ""
  }

  <div style="text-align:center;padding:16px;color:#9ca3af;font-size:11px;">
    Generated by ${brandName} · Powered by Handover
    <br/>
    <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color:#38bdf8;text-decoration:none;margin-top:8px;display:inline-block;">
      Open Handover →
    </a>
  </div>
</div>
</body>
</html>`;

    const profileEmail = await fetchProfileEmail(adminClient, schedule.user_id);
    const emailTo = schedule.email_to?.trim() || profileEmail || "";
    if (!emailTo) {
      return { scheduleId: schedule.id, success: false, error: "No email_to" };
    }

    const subject = `${qbr.clientName} — QBR · ${qbr.periodLabel}`;
    const fromHeader = `${brandName} <reports@gethandover.uk>`;
    const emailText =
      stripHtmlToPlainText(emailHtml) ||
      [qbr.clientName, qbr.executiveSummary].filter(Boolean).join(" — ");

    if (schedule.hold_for_review === true) {
      const nowIso = now.toISOString();
      const effectiveScheduleName =
        schedule.name?.trim() ||
        `${qbr.clientName} — QBR · ${qbr.periodLabel}`;

      const { error: supersedeErr } = await adminClient
        .from("pending_approvals")
        .update({ status: "superseded", resolved_at: nowIso })
        .eq("schedule_id", schedule.id)
        .eq("status", "pending");
      if (supersedeErr) {
        console.error("[process-ci-qbr] supersede pending failed", supersedeErr.message);
      }

      const holdPayload = {
        subject,
        html: emailHtml,
        text: emailText,
        to: emailTo,
        cc: schedule.email_cc?.trim() || undefined,
        fromHeader,
        clientsCovered: [qbr.clientName],
        scheduleName: effectiveScheduleName,
      };

      const { error: pendingInsertErr } = await adminClient
        .from("pending_approvals")
        .insert({
          user_id: schedule.user_id,
          schedule_id: schedule.id,
          source: "ci",
          status: "pending",
          payload: holdPayload,
        });
      if (pendingInsertErr) {
        console.error(
          "[process-ci-qbr] pending_approvals insert failed",
          pendingInsertErr.message,
        );
        return {
          scheduleId: schedule.id,
          success: false,
          error: "Could not store report for approval",
        };
      }

      const approvalsUrl = `${getAppOrigin()}/approvals`;
      const ownerEmail = profileEmail?.trim() ?? "";
      if (ownerEmail) {
        const { error: notifyErr } = await resend.emails.send({
          from: buildHandoverResendFromHeader(null),
          to: ownerEmail,
          subject: "Report awaiting your approval",
          text: `A scheduled report for ${qbr.clientName} is ready and waiting in Approvals.\n\nReview it here: ${approvalsUrl}`,
          html: `<p>A scheduled report for <strong>${qbr.clientName}</strong> is ready and waiting in Approvals.</p><p><a href="${approvalsUrl}">Review in Approvals</a></p>`,
        });
        if (notifyErr) {
          console.error(
            "[process-ci-qbr] hold notification email failed",
            notifyErr.message,
          );
        }
      } else {
        console.warn(
          "[process-ci-qbr] hold_for_review: no owner email for notification",
        );
      }

      console.log("[process-ci-qbr] Report held for approval", schedule.id);

      return {
        scheduleId: schedule.id,
        success: false,
        held: true,
        reason: "hold_for_review",
      };
    }

    await resend.emails.send({
      from: fromHeader,
      to: emailTo,
      cc: schedule.email_cc?.trim() || undefined,
      subject,
      html: emailHtml,
    });

    const nextRun = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const nowIso = now.toISOString();

    await adminClient
      .from("scheduled_reports")
      .update({
        last_run_at: nowIso,
        next_run_at: nextRun.toISOString(),
      })
      .eq("id", schedule.id);

    await adminClient.from("scheduled_report_history").insert({
      schedule_id: schedule.id,
      user_id: schedule.user_id,
      email_to: emailTo,
      status: "sent",
      clients_covered: [qbr.clientName],
      tickets_processed: 0,
      source: "ci",
    });

    return { scheduleId: schedule.id, success: true };
  } catch (e) {
    console.error(`[process-ci-qbr] Failed for schedule ${schedule.id}:`, e);
    return {
      scheduleId: schedule.id,
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
