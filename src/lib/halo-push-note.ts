import { exportFullReportToBuffer } from "@/lib/export";
import { partnerReportFileSlug } from "@/lib/white-label";

export type HaloPushNoteTicketResult = {
  ticketId: number | string;
  success: boolean;
  error?: string;
};

async function uploadAttachmentToHalo(
  haloUrl: string,
  token: string,
  ticketId: number,
  buffer: Buffer,
  filename: string,
): Promise<number | null> {
  try {
    const formData = new FormData();

    formData.append(
      "file",
      new Blob([new Uint8Array(buffer)], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      filename,
    );
    formData.append("ticket_id", String(ticketId));

    const res = await fetch(`${haloUrl}/api/Attachment`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const resText = await res.text();
    console.log("[halo-push-note] Attachment upload response:", {
      status: res.status,
      body: resText.substring(0, 300),
    });

    if (!res.ok) {
      console.error("[halo-push-note] Attachment upload failed:", resText);
      return null;
    }

    let data: unknown = null;
    try {
      data = JSON.parse(resText);
    } catch {
      data = null;
    }
    const obj = data as
      | { id?: number; attachment_id?: number }
      | Array<{ id?: number }>
      | null;
    const attachmentId =
      (obj && !Array.isArray(obj) ? obj.id ?? obj.attachment_id : null) ??
      (Array.isArray(obj) ? obj[0]?.id ?? null : null);

    console.log("[halo-push-note] Attachment ID:", attachmentId);
    return typeof attachmentId === "number" ? attachmentId : null;
  } catch (err) {
    console.error("[halo-push-note] Attachment error:", err);
    return null;
  }
}

function buildNoteHtml(
  outputs: Record<string, unknown>,
  selectedOutputs: string[],
  projectName: string,
  brandName?: string | null,
  partnerWhiteLabel?: boolean,
): string {
  const esc = (v: unknown) =>
    String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");

  const date = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const actionsRaw = outputs?.actions ?? outputs?.action_log ?? outputs?.actionLog ?? [];
  const risksRaw = outputs?.risks ?? outputs?.risk_log ?? outputs?.riskLog ?? [];
  const actions = Array.isArray(actionsRaw)
    ? (actionsRaw as Array<Record<string, unknown>>)
    : [];
  const risks = Array.isArray(risksRaw) ? (risksRaw as Array<Record<string, unknown>>) : [];

  const parts: string[] = [];

  parts.push(
    `<div style="font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;margin:0;padding:0;"><div style="border-bottom:2px solid #38bdf8;margin-bottom:8px;padding-bottom:6px;"><span style="font-size:15px;font-weight:700;color:#0f172a;">Handover Report</span>${projectName ? `<span style="font-size:12px;color:#64748b;margin-left:8px;">&middot; ${esc(projectName)}</span>` : ""}<span style="font-size:11px;color:#94a3b8;float:right;">${esc(date)} &middot; Handover AI</span></div>`,
  );

  if (selectedOutputs?.includes("summary") && outputs?.summary) {
    parts.push(
      `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:6px 10px;margin-bottom:8px;"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin-bottom:4px;">Summary</div><div style="font-size:13px;color:#1e293b;">${esc(outputs.summary)}</div></div>`,
    );
  }

  if (selectedOutputs?.includes("client_email") && outputs?.client_email) {
    parts.push(
      `<div style="margin-bottom:8px;"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin-bottom:4px;">Client Email Draft</div><div style="border-left:3px solid #38bdf8;padding:6px 10px;background:#f8fafc;font-size:12px;white-space:pre-wrap;">${esc(String(outputs.client_email))}</div></div>`,
    );
  }

  if (selectedOutputs?.includes("actions") && actions.length) {
    const rows = actions
      .map((a, i) => {
        const priority = String(a.priority || "Medium");
        const p = priority.toLowerCase();
        const bg = p === "high" ? "#fee2e2" : p === "low" ? "#dcfce7" : "#fef3c7";
        const fg = p === "high" ? "#dc2626" : p === "low" ? "#16a34a" : "#d97706";
        return `<tr style="background:${i % 2 === 0 ? "#fff" : "#f8fafc"};"><td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#1e293b;">${esc(String(a.task || ""))}</td><td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#475569;width:120px;">${esc(String(a.suggested_owner || "Unassigned"))}</td><td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;width:70px;"><span style="display:inline-block;padding:1px 7px;border-radius:999px;font-size:11px;font-weight:500;background:${bg};color:${fg};">${esc(priority)}</span></td></tr>`;
      })
      .join("");
    parts.push(
      `<div style="margin-bottom:8px;"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin-bottom:4px;">Action Log</div><table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#0f172a;"><th style="padding:5px 8px;text-align:left;color:#fff;font-size:11px;font-weight:600;">Action</th><th style="padding:5px 8px;text-align:left;color:#fff;font-size:11px;font-weight:600;width:120px;">Owner</th><th style="padding:5px 8px;text-align:left;color:#fff;font-size:11px;font-weight:600;width:70px;">Priority</th></tr></thead><tbody>${rows}</tbody></table></div>`,
    );
  }

  if (selectedOutputs?.includes("risks") && risks.length) {
    const riskRows = risks
      .map(
        (r) =>
          `<div style="border-left:3px solid #ef4444;padding:5px 8px;margin-bottom:4px;background:#fff5f5;border-radius:0 3px 3px 0;"><div style="font-weight:600;font-size:12px;color:#1e293b;">${esc(String(r.risk || ""))}</div><div style="font-size:11px;color:#64748b;">Impact: ${esc(String(r.impact || ""))}</div><div style="font-size:11px;color:#94a3b8;font-style:italic;">Mitigation: ${esc(String(r.mitigation || ""))}</div></div>`,
      )
      .join("");
    parts.push(
      `<div style="margin-bottom:8px;"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin-bottom:4px;">Risk Log</div>${riskRows}</div>`,
    );
  }

  if (selectedOutputs?.includes("status_report") && outputs?.status_report) {
    parts.push(
      `<div style="margin-bottom:8px;"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin-bottom:4px;">Status Report</div><div style="font-size:12px;background:#f8fafc;padding:6px 10px;border-radius:4px;white-space:pre-wrap;">${esc(String(outputs.status_report))}</div></div>`,
    );
  }

  const brandTrim = typeof brandName === "string" && brandName.trim() ? brandName.trim() : "";
  const brand = brandTrim || "Handover";
  const wlFooter = partnerWhiteLabel === true && brandTrim.length > 0;
  parts.push(
    wlFooter
      ? `<div style="margin-top:8px;padding-top:6px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;">Generated by <strong style="color:#38bdf8;">${esc(brandTrim)}</strong></div></div>`
      : `<div style="margin-top:8px;padding-top:6px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;">Generated by <strong style="color:#38bdf8;">${esc(brand)}</strong> &middot; gethandover.uk &middot; ${esc(date)}</div></div>`,
  );

  return parts.join("");
}

/**
 * Same implementation as POST /api/halo/push-note - post Handover HTML + optional Excel to Halo tickets.
 */
export async function pushHandoverOutputsToHaloTickets(params: {
  haloUrl: string;
  token: string;
  ticketIds: Array<number | string>;
  outputs: Record<string, unknown>;
  selectedOutputs: string[];
  projectName: string;
  attachExcel: boolean;
  excelTabs: string[];
  brandName?: string | null;
  brandColor?: string | null;
  brandSecondaryColor?: string | null;
  brandLogoUrl?: string | null;
  /** Enterprise white label: Halo note footer + Excel footer omit Handover / URL. */
  partnerWhiteLabel?: boolean;
  logTag?: string;
}): Promise<{
  results: HaloPushNoteTicketResult[];
  posted: number;
  failed: number;
  success: boolean;
}> {
  const {
    haloUrl,
    token,
    ticketIds,
    outputs,
    selectedOutputs,
    projectName,
    attachExcel,
    excelTabs,
    brandName,
    brandColor,
    brandSecondaryColor,
    brandLogoUrl,
    partnerWhiteLabel = false,
    logTag = "[halo-push-note]",
  } = params;

  console.log(`${logTag} Starting push:`, {
    ticketIds,
    selectedOutputs,
    projectName,
  });

  let excelBuffer: Buffer | null = null;
  let excelFilename = "";

  if (attachExcel && excelTabs?.length) {
    try {
      excelBuffer = await exportFullReportToBuffer(outputs ?? {}, projectName || "Handover Report", {
        selectedTabs: excelTabs,
        actionColumns: [
          "task",
          "owner",
          "priority",
          "status",
          "due_date",
          "notes",
          "project_name",
          "client_name",
        ],
        riskColumns: [
          "risk",
          "impact",
          "mitigation",
          "status",
          "owner",
          "priority",
          "rag",
          "project_name",
          "client_name",
        ],
        brandName: brandName ?? null,
        brandColor: brandColor ?? null,
        brandSecondaryColor: brandSecondaryColor ?? null,
        brandLogoUrl: brandLogoUrl ?? null,
        whiteLabelMode: partnerWhiteLabel,
      });

      const fileLead =
        partnerWhiteLabel && typeof brandName === "string" && brandName.trim()
          ? partnerReportFileSlug(brandName)
          : "Handover";
      excelFilename = `${fileLead}-${(projectName || "Report").replace(/[^a-zA-Z0-9]/g, "-")}-${
        new Date().toISOString().split("T")[0]
      }.xlsx`;

      console.log(`${logTag} Excel buffer generated:`, excelBuffer?.length, "bytes");
    } catch (excelErr) {
      console.error(`${logTag} Excel generation failed:`, excelErr);
      excelBuffer = null;
    }
  }

  const noteHtml = buildNoteHtml(
    outputs ?? {},
    selectedOutputs ?? [],
    projectName ?? "",
    brandName ?? null,
    partnerWhiteLabel,
  );
  console.log(`${logTag} Note HTML length:`, noteHtml.length);

  const results: HaloPushNoteTicketResult[] = [];

  for (const ticketId of ticketIds ?? []) {
    try {
      let attachmentId: number | null = null;
      if (excelBuffer && excelFilename) {
        attachmentId = await uploadAttachmentToHalo(
          haloUrl,
          token,
          Number(ticketId),
          excelBuffer,
          excelFilename,
        );
      }

      const payload = [
        {
          ticket_id: Number(ticketId),
          note: noteHtml,
          actiontype_id: 14,
          sendemail: false,
          outcome: "Updated by Handover",
          hdencodedhtml: noteHtml,
          ...(attachmentId
            ? {
                attachment_ids: [attachmentId],
                attachments: [{ id: attachmentId }],
              }
            : {}),
        },
      ];

      console.log(
        `${logTag} Posting to ticket:`,
        ticketId,
        "payload:",
        JSON.stringify(payload),
      );

      const res = await fetch(`${haloUrl}/api/Actions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const resText = await res.text();
      console.log(`${logTag} HaloPSA response:`, {
        ticketId,
        status: res.status,
        body: resText.substring(0, 500),
      });

      if (!res.ok) {
        throw new Error(`HaloPSA ${res.status}: ${resText}`);
      }

      results.push({ ticketId, success: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`${logTag} Ticket failed:`, ticketId, message);
      results.push({ ticketId, success: false, error: message });
    }
  }

  const posted = results.filter((r) => r.success).length;
  const failed = results.length - posted;

  return {
    results,
    posted,
    failed,
    success: posted === results.length,
  };
}
