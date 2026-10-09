"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ChevronRight, ExternalLink, FileText, Loader2, RotateCw, Sparkles, X } from "lucide-react";

import type { DeliveryHealthRag, DeliveryHealthRow } from "@/lib/delivery-health";
import {
  computeSlaRiskFromTargetIso,
  daysToTargetDate,
  formatDeliveryHealthRowForGeneration,
  mergeDeliveryRowWithFreshHaloTicket,
  resolveDashboardOwnerFromHaloTicket,
} from "@/lib/delivery-health";
import {
  haloNoteDisplayType,
  haloNoteRawText,
  mapHaloNoteToNormalised,
  sortHaloNotesOldestFirst,
  type HaloNote,
  type HaloTicket,
} from "@/lib/halo";
import type { NormalisedNote } from "@/lib/psa/types";
import { formatLoggedHours } from "@/lib/format-logged-hours";
import { stripHtmlToPlainText } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toasts";
import { usePSAConnections } from "@/hooks/use-psa-connections";
import { usePSAStatus } from "@/hooks/usePSAStatus";
import { DEMO_TICKETS } from "@/lib/demo-data";
import { setCachedMeetingPrep } from "@/lib/meeting-prep-cache";

const DETAIL_CACHE_MS = 2 * 60 * 1000;
const detailCache = new Map<string, { fetchedAt: number; ticket: HaloTicket }>();

function panelNoteContent(raw: string, type: NormalisedNote["type"]): string {
  if (!raw || raw.trim().length === 0) return "";

  const rawHasEmailContent =
    raw.includes("philip@") ||
    raw.includes("@hogans") ||
    (raw.includes("From:") && raw.includes("To:")) ||
    raw.includes("thank you for contacting");
  const isLikelyEmail =
    type === "email_sent" || type === "email_received" || rawHasEmailContent;

  if (isLikelyEmail) {
    const stripped = stripHtmlToPlainText(raw);
    return stripped.trim().length >= 5 ? stripped.trim() : "";
  }

  let cleaned = raw
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/[a-zA-Z][a-zA-Z0-9\s\-_.,#:*[\]()>~+]+\{[^}]*\}/g, "");

  cleaned = stripHtmlToPlainText(cleaned);

  cleaned = cleaned
    .split(/\r?\n/)
    .filter((line) => {
      const t = line.trim();
      if (!t) return false;
      if (/^[-=─━]{5,}$/.test(t)) return false;
      if (/^CAUTION:/i.test(t)) return false;
      if (/This message was sent from outside/i.test(t)) return false;
      if (/Do not click links or open attachments/i.test(t)) return false;
      if (/legal privilege/i.test(t)) return false;
      if (/unauthorised/i.test(t) && /intended recipient/i.test(t)) return false;
      if (/registered in England/i.test(t)) return false;
      if (/Solicitors Regulation Authority/i.test(t)) return false;
      if (/virus free/i.test(t)) return false;
      if (/^\s*p\s*\{/.test(t)) return false;
      if (/^span\.fr-/.test(t)) return false;
      return true;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned;
}

type CwDetailNote = {
  id?: string;
  author?: string | null;
  date?: string | null;
  content?: string | null;
};

type CwDetailTicket = {
  id?: number;
  summary?: string | null;
  status?: { name?: string | null } | null;
  company?: { name?: string | null } | null;
  priority?: { name?: string | null } | null;
  owner?: { name?: string | null } | null;
  dateEntered?: string | null;
  requiredDate?: string | null;
  actualHours?: number | null;
};

function mapCwDetailToHaloShape(
  id: number,
  cwTicket: CwDetailTicket | null | undefined,
  cwNotes: CwDetailNote[] | null | undefined,
): HaloTicket {
  const notes = (cwNotes ?? []).map((note) => ({
    id: note.id ?? "",
    who: note.author ?? "Unknown",
    posted: note.date ?? "",
    note: note.content ?? "",
  }));
  return {
    id,
    summary: String(cwTicket?.summary ?? `Ticket ${id}`),
    details: null,
    status: { name: String(cwTicket?.status?.name ?? "Open") },
    priority: cwTicket?.priority?.name ? { name: String(cwTicket.priority.name) } : null,
    client: { name: String(cwTicket?.company?.name ?? "Unknown") },
    agent: cwTicket?.owner?.name ? { name: String(cwTicket.owner.name) } : null,
    dateoccurred: cwTicket?.dateEntered ?? null,
    targetdate: cwTicket?.requiredDate ?? null,
    timetaken:
      typeof cwTicket?.actualHours === "number" && Number.isFinite(cwTicket.actualHours)
        ? cwTicket.actualHours
        : 0,
    notes,
  } as HaloTicket;
}

const TICKET_PIPELINE = ["New", "Triage", "In Progress", "Resolved"] as const;
const PROJECT_PIPELINE = ["New", "Planning", "In Progress", "Completed"] as const;

function pipelineActiveIndex(status: string, stages: readonly string[]): number {
  const s = status.trim().toLowerCase();
  for (let i = stages.length - 1; i >= 0; i--) {
    if (s.includes(stages[i]!.toLowerCase())) return i;
  }
  if (/resolved|closed|completed|cancelled/.test(s)) return stages.length - 1;
  if (/hold|pending|awaiting|triage/.test(s)) return Math.min(1, stages.length - 2);
  if (/progress|active|working|scheduled/.test(s)) return 2;
  if (/new|open/.test(s)) return 0;
  return 0;
}

function formatPanelDateTime(iso: string | null | undefined): string {
  if (!iso) return " - ";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSlaBannerTargetDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatNoteTimeTaken(note: HaloNote): string | null {
  const n = note as Record<string, unknown>;
  const raw = n.timetaken ?? n.time_taken ?? n.act_time ?? n.timespent;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return formatLoggedHours(raw);
  }
  if (typeof raw === "string" && raw.trim()) {
    const p = Number.parseFloat(raw);
    if (Number.isFinite(p) && p > 0) return formatLoggedHours(p);
  }
  return null;
}

function authorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function notesOldestFirst(ticket: HaloTicket): HaloNote[] {
  return sortHaloNotesOldestFirst(ticket.notes ?? []);
}

function RagPill({ rag }: { rag: DeliveryHealthRag }) {
  const label =
    rag === "red"
      ? "Red"
      : rag === "amber"
        ? "Amber"
        : rag === "green"
          ? "Green"
          : "No data";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        rag === "red" && "bg-red-500/25 text-red-200",
        rag === "amber" && "bg-amber-500/20 text-amber-200",
        rag === "green" && "bg-emerald-500/20 text-emerald-200",
        rag === "grey" && "bg-slate-500/20 text-slate-300",
      )}
    >
      {label}
    </span>
  );
}

function StatusPipelineBar({
  currentStatus,
  isProject,
}: {
  currentStatus: string;
  isProject: boolean;
}) {
  const stages = isProject ? PROJECT_PIPELINE : TICKET_PIPELINE;
  const activeIdx = pipelineActiveIndex(currentStatus, stages);

  return (
    <div className="flex flex-wrap items-center gap-0.5">
      {stages.map((stage, i) => {
        const doneOrActive = i <= activeIdx;
        return (
          <div key={stage} className="flex items-center">
            <span
              className={cn(
                "rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-200",
                doneOrActive
                  ? "bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] text-[var(--accent)]"
                  : "bg-[var(--bg-primary)] text-[var(--text-muted)]",
              )}
            >
              {stage}
            </span>
            {i < stages.length - 1 ? (
              <ChevronRight
                className={cn(
                  "mx-0.5 size-3.5 shrink-0",
                  i < activeIdx ? "text-[var(--accent)]" : "text-[var(--text-muted)]/50",
                )}
                aria-hidden
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function renderMeetingPrep(content: string): ReactNode {
  return content.split("\n").map((line, i) => {
    if (line.startsWith("#### "))
      return (
        <h4 key={i} className="mb-1 mt-4 text-[13px] font-semibold text-white">
          {line.replace("#### ", "")}
        </h4>
      );
    if (line.startsWith("### "))
      return (
        <h3 key={i} className="mb-2 mt-4 text-[14px] font-semibold text-white">
          {line.replace("### ", "")}
        </h3>
      );
    if (line.startsWith("**") && line.endsWith("**"))
      return (
        <p key={i} className="text-[12px] font-medium text-[var(--text-secondary)]">
          {line.replace(/\*\*/g, "")}
        </p>
      );
    if (line.startsWith("- "))
      return (
        <li key={i} className="ml-3 list-disc text-[12px] text-[var(--text-secondary)]">
          {line.replace("- ", "")}
        </li>
      );
    if (line.startsWith("---")) return <hr key={i} className="my-3 border-[var(--border)]" />;
    if (line.trim() === "") return <div key={i} className="h-2" />;
    const boldParts = line.split(/\*\*([^*]+)\*\*/g);
    if (boldParts.length > 1) {
      return (
        <p key={i} className="text-[12px] text-[var(--text-secondary)]">
          {boldParts.map((part, j) =>
            j % 2 === 1 ? (
              <strong key={j} className="font-medium text-white">
                {part}
              </strong>
            ) : (
              part
            ),
          )}
        </p>
      );
    }
    return (
      <p key={i} className="text-[12px] text-[var(--text-secondary)]">
        {line}
      </p>
    );
  });
}

const MEETING_PREP_ACTION_CLASS =
  "inline-flex items-center text-[12px] border border-[var(--border)] px-3 py-1.5 rounded-[var(--radius)] text-[var(--text-secondary)] transition-colors hover:bg-white/5 disabled:opacity-50";

type Props = {
  open: boolean;
  row: DeliveryHealthRow | null;
  onClose: () => void;
  focusRing: string;
  demoMode?: boolean;
  /** When false, hide generate actions (team dashboard read-only). */
  allowGenerateFromDashboard?: boolean;
  onGenerateReport: (payload: { text: string; clientName: string | null }) => void;
};

export function DeliveryHealthDetailPanel({
  open,
  row,
  onClose,
  focusRing,
  demoMode = false,
  allowGenerateFromDashboard = true,
  onGenerateReport,
}: Props) {
  const psaConnections = usePSAConnections();
  const psaStatus = usePSAStatus();
  const cwEnabled = psaConnections.connectwise;
  const [ticket, setTicket] = useState<HaloTicket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meetingPrepModalOpen, setMeetingPrepModalOpen] = useState(false);
  const [meetingPrepContent, setMeetingPrepContent] = useState<string | null>(null);
  const [meetingPrepLoading, setMeetingPrepLoading] = useState(false);
  const [meetingPrepPushing, setMeetingPrepPushing] = useState(false);
  const toast = useToast();

  const loadTicket = useCallback(async (
    id: number,
    source: "halopsa" | "connectwise",
    kind: "ticket" | "project" = "ticket",
  ) => {
    if (demoMode) {
      const idx = id >= 10000 ? id - 10000 : -1;
      const demoTicket = idx >= 0 ? DEMO_TICKETS[idx] : undefined;
      if (!demoTicket) {
        setTicket(null);
        setError("Could not load ticket.");
        setLoading(false);
        return;
      }
      const nowIso = new Date().toISOString();
      const demoNotes: HaloNote[] = [
        {
          id: "demo-note-1",
          who: demoTicket.agent.name,
          posted: demoTicket.dateoccurred,
          note: "Initial investigation complete - awaiting vendor response.",
        },
        {
          id: "demo-note-2",
          who: "Senior Engineer",
          posted: nowIso,
          note: "Escalated to senior engineer for deeper network trace analysis.",
        },
        {
          id: "demo-note-3",
          who: demoTicket.agent.name,
          posted: nowIso,
          note: "Client updated via email - awaiting confirmation to proceed with change window.",
        },
      ];
      const demoActions: HaloNote[] = [
        {
          id: "demo-action-1",
          who: demoTicket.agent.name,
          posted: nowIso,
          note: "Action: Confirm maintenance window and complete pending remediation steps.",
        },
      ];
      setTicket({
        id,
        summary: demoTicket.summary,
        details: demoTicket.details,
        status: { name: demoTicket.status.name },
        priority: { name: demoTicket.priority.name },
        client: { name: demoTicket.client.name },
        agent: { name: demoTicket.agent.name },
        dateoccurred: demoTicket.dateoccurred,
        targetdate: demoTicket.targetdate,
        timetaken: demoTicket.timetaken / 60,
        notes: demoNotes,
        actions: demoActions,
      } as HaloTicket);
      setError(null);
      setLoading(false);
      return;
    }
    const cacheKey = `${source}-${kind}-${id}`;
    const hit = detailCache.get(cacheKey);
    if (hit && Date.now() - hit.fetchedAt < DETAIL_CACHE_MS) {
      setTicket(hit.ticket);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const endpoint =
        source === "connectwise" && cwEnabled
          ? `/api/delivery-health/ticket-detail?id=${id}&kind=${kind}&source=connectwise`
          : `/api/delivery-health/ticket-detail?id=${id}`;
      const res = await fetch(endpoint, { credentials: "same-origin", cache: "no-store" });
      const json = (await res.json()) as {
        ticket?: HaloTicket;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.error ?? "Could not load ticket.");
      }
      if (!json.ticket) throw new Error("Invalid response");
      const normalisedTicket = json.ticket as HaloTicket;
      detailCache.set(cacheKey, { fetchedAt: Date.now(), ticket: normalisedTicket });
      console.log("[panel-ticket-raw]", {
        hasTicket: !!normalisedTicket,
        notesCount: normalisedTicket?.notes?.length,
        notesSample: normalisedTicket?.notes?.slice(0, 3).map((n: any) => ({
          id: n.id,
          who: n.who,
          outcome: n.outcome,
          noteLen: (n.note || "").length,
          emailbodyLen: (n.emailbody || "").length,
        })),
      });
      setTicket(normalisedTicket);
    } catch (e) {
      setTicket(null);
      setError(e instanceof Error ? e.message : "Could not load ticket.");
    } finally {
      setLoading(false);
    }
  }, [cwEnabled, demoMode]);

  useEffect(() => {
    if (!open || !row) {
      setTicket(null);
      setError(null);
      setLoading(false);
      setMeetingPrepModalOpen(false);
      setMeetingPrepContent(null);
      setMeetingPrepLoading(false);
      return;
    }
    setMeetingPrepModalOpen(false);
    setMeetingPrepContent(null);
    setMeetingPrepLoading(false);
    const detailSource = row.source === "connectwise" && cwEnabled ? "connectwise" : "halopsa";
    void loadTicket(row.id, detailSource, row.kind);
  }, [open, row, loadTicket, cwEnabled]);

  useEffect(() => {
    if (!open || !row) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, row, onClose]);

  const haloNotes = ticket ? notesOldestFirst(ticket) : [];

  const generateMeetingPrep = useCallback(async () => {
    if (!row) return;
    setMeetingPrepLoading(true);
    setMeetingPrepContent(null);
    try {
      const notes = ticket ? notesOldestFirst(ticket) : [];
      const recentNotesSummary = notes
        .slice(-3)
        .map((n) => {
          const norm = mapHaloNoteToNormalised(n);
          return panelNoteContent(haloNoteRawText(n), norm.type);
        })
        .filter(Boolean)
        .join("\n\n");

      const openActionsText =
        (row.latestOpenActions ?? [])
          .map((a) => `- ${a.task} (${a.owner || "Unassigned"})`)
          .join("\n") || "None recorded";

      const openRisksText =
        (row.latestOpenRisks ?? [])
          .map((r) => `- ${r.risk}${r.impact && r.impact !== " - " ? ` (${r.impact})` : ""}`)
          .join("\n") || "None recorded";

      const prompt = `Generate a meeting preparation brief for a client service review.

Client: ${row.clientName}
Ticket/Project: ${row.name}
RAG Status: ${row.rag}
Open Actions: ${row.openActions || 0}
Open Risks: ${row.openRisks || 0}
Days to target: ${row.daysToTarget ?? "Not set"}
Time logged: ${formatLoggedHours(row.timeLogged) || "Unknown"}
SLA status: ${row.slaRisk || "No risk"}

Recent notes summary:
${recentNotesSummary || "No recent notes available."}

Open actions from last report:
${openActionsText}

Open risks from last report:
${openRisksText}

Generate a structured meeting brief with these sections:
1. Quick summary (2 sentences on current status)
2. Key wins to mention (what's going well)
3. Risks and blockers to discuss (be specific)
4. Suggested talking points (3-4 bullet points)
5. Recommended actions to agree on the call

Keep it concise and professional. This is for the engineer or account manager to read before the call.`;

      const res = await fetch("/api/meeting-prep", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = (await res.json().catch(() => ({}))) as { content?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Could not generate meeting brief.");
      }
      const content = (data.content ?? "").trim();
      if (!content) {
        throw new Error("No meeting brief returned.");
      }
      setMeetingPrepContent(content);
      setCachedMeetingPrep(row.clientName, content, row.name);
      setMeetingPrepModalOpen(true);
    } catch (e) {
      setMeetingPrepContent(
        e instanceof Error ? e.message : "Could not generate meeting brief.",
      );
      setMeetingPrepModalOpen(true);
    } finally {
      setMeetingPrepLoading(false);
    }
  }, [row, ticket]);

  const handleMeetingPrepClick = useCallback(() => {
    if (meetingPrepLoading) return;
    if (meetingPrepContent?.trim()) {
      setMeetingPrepModalOpen(true);
      return;
    }
    void generateMeetingPrep();
  }, [meetingPrepLoading, meetingPrepContent, generateMeetingPrep]);

  const pushMeetingPrepToPsa = useCallback(async () => {
    if (!row || !meetingPrepContent?.trim() || demoMode) return;
    const source = row.source === "connectwise" ? "connectwise" : "halopsa";
    setMeetingPrepPushing(true);
    try {
      const res = await fetch("/api/psa/chase-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          ticketId: row.id,
          note: meetingPrepContent.trim(),
          source,
        }),
      });
      if (!res.ok) throw new Error("Failed to push meeting brief");
      toast({
        message: "Meeting brief pushed to PSA",
        variant: "success",
        durationMs: 4000,
      });
    } catch {
      toast({
        message: "Failed to push meeting brief",
        variant: "error",
        durationMs: 3000,
      });
    } finally {
      setMeetingPrepPushing(false);
    }
  }, [row, meetingPrepContent, demoMode, toast]);

  const downloadMeetingPrep = useCallback(() => {
    if (!meetingPrepContent?.trim()) return;
    const safeName = (row?.clientName ?? "client").replace(/[^\w\s-]/g, "").trim() || "client";
    const blob = new Blob([meetingPrepContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `meeting-brief-${safeName.replace(/\s+/g, "-").toLowerCase()}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [meetingPrepContent, row?.clientName]);

  const ragBorderClass = (rag: DeliveryHealthRag) => {
    switch (rag) {
      case "red":
        return "border-l-red-500/80";
      case "amber":
        return "border-l-amber-400/80";
      case "green":
        return "border-l-emerald-400/80";
      default:
        return "border-l-slate-500/50";
    }
  };

  if (!row) return null;

  const displayStatus = ticket?.status?.name ?? row.statusName;
  const isProject = row.kind === "project";
  const viewInPsaLabel =
    row.source === "connectwise"
      ? "View in ConnectWise"
      : row.source === "halopsa"
        ? "View in HaloPSA"
        : psaConnections.primary === "connectwise"
          ? "View in ConnectWise"
          : psaConnections.primary === "halopsa"
            ? "View in HaloPSA"
            : "View in PSA";

  console.log("[panel-notes-raw]", {
    totalNotes: haloNotes.length,
    notes: haloNotes.map((n) => ({
      id: (n as any).id,
      who: (n as any).who,
      outcome: (n as any).outcome,
      noteLength: ((n as any).note || "").length,
      emailbodyLength: ((n as any).emailbody || "").length,
      emailbody_htmlLength: ((n as any).emailbody_html || "").length,
      detailsLength: ((n as any).details || "").length,
    })),
  });
  const headerTitle = (ticket?.summary?.trim() || row.name).trim();
  const targetIsoForSla = ticket?.targetdate ?? row.targetDateIso;
  const effectiveSlaRisk =
    !loading && ticket
      ? computeSlaRiskFromTargetIso(targetIsoForSla)
      : row.slaRisk;
  const slaBannerDays = targetIsoForSla ? daysToTargetDate(targetIsoForSla) : null;
  const slaBannerDateLabel = targetIsoForSla ? formatSlaBannerTargetDate(targetIsoForSla) : "";
  const slaKindNoun = isProject ? "project" : "ticket";

  const runGenerate = () => {
    const payloadRow = ticket != null ? mergeDeliveryRowWithFreshHaloTicket(row, ticket) : row;
    onGenerateReport({
      text: formatDeliveryHealthRowForGeneration(payloadRow),
      clientName: payloadRow.clientName,
    });
    onClose();
  };
  const canShowViewInPsa =
    (row.source === "halopsa" && psaStatus.halo) ||
    (row.source === "connectwise" && psaStatus.connectwise);

  return (
    <>
    <div
      className={cn(
        "fixed inset-0 isolate z-[100] flex items-center justify-center max-md:p-0 md:p-[5vh]",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        className={cn(
          "absolute inset-0 bg-black/55 transition-opacity duration-200 ease-out",
          open ? "opacity-100" : "opacity-0",
        )}
        aria-label="Close"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-detail-title"
        className={cn(
          "relative z-10 flex max-h-full w-full flex-col overflow-hidden bg-[var(--bg-primary)] shadow-[0_0_80px_rgba(0,0,0,0.5)] transition-opacity duration-200 ease-out",
          "max-md:h-full max-md:max-h-full max-md:rounded-none",
          "md:h-[95vh] md:w-[min(96vw,1200px)] md:max-h-[95vh] md:max-w-[1200px] md:rounded-[var(--radius-lg)] md:border md:border-[var(--border)]",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-20 flex shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-primary)] px-3 py-3 sm:px-4">
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius)] px-2 py-1.5 text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-secondary)]",
              focusRing,
            )}
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back
          </button>
          <h2
            id="delivery-detail-title"
            className="min-w-0 flex-1 truncate text-center text-[15px] font-semibold text-[var(--text-primary)] sm:text-left sm:text-[16px]"
          >
            {headerTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-[var(--radius)] text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]",
              focusRing,
            )}
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {!loading && effectiveSlaRisk === "overdue" && targetIsoForSla ? (
          <div className="shrink-0 border-b border-red-500/50 bg-red-950/45 px-4 py-3">
            <p className="text-[13px] font-medium leading-snug text-red-100">
              This {slaKindNoun} has breached its SLA - target date was {slaBannerDateLabel}
              {slaBannerDays != null && slaBannerDays < 0
                ? `, ${slaBannerDays === -1 ? "1 day" : `${-slaBannerDays} days`} ago`
                : ""}
              . Immediate action required.
            </p>
            {allowGenerateFromDashboard ? (
              <Button
                type="button"
                className={cn(
                  "mt-3 h-9 w-full bg-red-600 text-white hover:bg-red-500 sm:w-auto",
                  focusRing,
                )}
                onClick={runGenerate}
              >
                <Sparkles className="mr-2 size-4" aria-hidden />
                Generate update now
              </Button>
            ) : null}
          </div>
        ) : null}
        {!loading && effectiveSlaRisk === "at_risk" && targetIsoForSla ? (
          <div className="shrink-0 border-b border-amber-600/45 bg-amber-950/40 px-4 py-3">
            <p className="text-[13px] font-medium leading-snug text-amber-50">
              This {slaKindNoun} is at risk of breaching its SLA - target date is {slaBannerDateLabel}
              {slaBannerDays === 0
                ? ", due today"
                : slaBannerDays != null && slaBannerDays > 0
                  ? `, ${slaBannerDays === 1 ? "1 day" : `${slaBannerDays} days`} remaining`
                  : ""}
              .
            </p>
            {allowGenerateFromDashboard ? (
              <Button
                type="button"
                className={cn(
                  "mt-3 h-9 w-full text-amber-950 sm:w-auto",
                  "bg-[#F59E0B] hover:bg-[#D97706]",
                  focusRing,
                )}
                onClick={runGenerate}
              >
                <Sparkles className="mr-2 size-4" aria-hidden />
                Generate update now
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
          {/* Progress feed - 65% desktop */}
          <div className="flex min-h-0 min-w-0 flex-[0.65] flex-col overflow-y-auto border-b border-[var(--border)] md:border-b-0 md:border-r md:border-[var(--border)]">
            <div className="shrink-0 border-b border-[var(--border)]/80 px-4 py-3">
              <p
                className="text-[10px] font-semibold tracking-[0.12em] text-[var(--text-muted)] [font-variant:small-caps]"
              >
                Progress Feed
              </p>
              <div className="mt-3">
                {loading ? (
                  <div className="h-8 animate-pulse rounded-md bg-[var(--border)]/40" />
                ) : (
                  <StatusPipelineBar currentStatus={displayStatus} isProject={isProject} />
                )}
              </div>
            </div>

            <div className="flex-1 space-y-2 px-3 py-3">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-24 animate-pulse rounded-lg bg-[var(--border)]/35"
                      style={{ animationDelay: `${i * 80}ms` }}
                    />
                  ))}
                </div>
              ) : error ? (
                <p className="text-[13px] text-red-400">{error}</p>
              ) : haloNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-[13px] font-medium text-[var(--text-primary)]">No notes yet</p>
                  <p className="mt-1 max-w-xs text-[11px] text-[var(--text-muted)]">
                    There are no notes on this record in HaloPSA.
                  </p>
                </div>
              ) : (
                haloNotes.map((note, idx) => {
                  const norm = mapHaloNoteToNormalised(note);
                  console.log("[panel-note-debug]", {
                    idx,
                    author: norm.author,
                    type: norm.type,
                    rawLength: haloNoteRawText(note).length,
                    rawPreview: haloNoteRawText(note).substring(0, 200),
                    noteKeys: Object.keys(note),
                    noteField: (note as any).note?.substring?.(0, 100),
                    emailbody: (note as any).emailbody?.substring?.(0, 100),
                    emailbody_html: (note as any).emailbody_html?.substring?.(0, 100),
                  });
                  const cleaned = panelNoteContent(haloNoteRawText(note), norm.type);
                  const hasContent = cleaned.trim().length >= 5;
                  const typeLabel = haloNoteDisplayType(note);
                  const timeTaken = formatNoteTimeTaken(note);
                  const author = norm.author || "Unknown";
                  return (
                    <div
                      key={String(note.id ?? idx)}
                      className={cn(
                        "rounded-lg border border-[var(--border)]/60 px-3 py-2.5",
                        idx % 2 === 0 ? "bg-[var(--bg-secondary)]/40" : "bg-[var(--bg-secondary)]/65",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className="flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                          style={{
                            background:
                              "color-mix(in srgb, var(--accent) 75%, var(--bg-primary))",
                          }}
                        >
                          {authorInitials(author)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] font-semibold text-[var(--text-primary)]">
                                {author}
                              </span>
                              <span className="rounded bg-[var(--bg-primary)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--text-muted)] ring-1 ring-[var(--border)]">
                                {typeLabel}
                              </span>
                            </div>
                            <span className="text-[10px] tabular-nums text-[var(--text-muted)]">
                              {formatPanelDateTime(norm.date)}
                            </span>
                          </div>
                          {timeTaken ? (
                            <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                              Time: {timeTaken}
                            </p>
                          ) : null}
                          <p
                            className={cn(
                              "mt-2 whitespace-pre-wrap text-[11px] leading-relaxed",
                              hasContent
                                ? "text-[var(--text-secondary)]"
                                : "text-[var(--text-muted)] italic",
                            )}
                          >
                            {hasContent ? cleaned : "No content"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Details - 35% */}
          <div
            className={cn(
              "flex min-h-0 min-w-0 flex-[0.35] flex-col overflow-y-auto border-l-4 bg-[var(--bg-secondary)]/30",
              ragBorderClass(row.rag),
            )}
          >
            <div className="border-b border-[var(--border)]/70 px-4 py-4">
              {loading ? (
                <>
                  <div className="h-7 w-4/5 animate-pulse rounded bg-[var(--border)]/50" />
                  <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-[var(--border)]/40" />
                </>
              ) : (
                <>
                  <p className="text-[18px] font-bold leading-snug text-[var(--text-primary)]">
                    {ticket?.summary?.trim() || row.name}
                  </p>
                  <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                    {ticket?.client?.name ?? row.clientName}
                  </p>
                </>
              )}
            </div>

            <div className="space-y-0 px-4 py-3 text-[11px]">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-4 animate-pulse rounded bg-[var(--border)]/35" />
                  ))}
                </div>
              ) : (
                <>
                  <MetaRow
                    label="Status"
                    value={ticket?.status?.name ?? row.statusName}
                  />
                  <MetaRow
                    label="Source"
                    value={row.source === "connectwise" ? "ConnectWise" : "HaloPSA"}
                  />
                  <MetaRow
                    label="Owner"
                    value={
                      ticket
                        ? resolveDashboardOwnerFromHaloTicket(ticket) ?? "Unassigned"
                        : row.owner ?? "Unassigned"
                    }
                  />
                  <MetaRow
                    label="Priority"
                    value={ticket?.priority?.name ?? row.priorityName ?? " - "}
                  />
                  <MetaRow
                    label="Target date"
                    value={
                      (() => {
                        const iso = ticket?.targetdate ?? row.targetDateIso;
                        if (!iso) return " - ";
                        const overdue =
                          row.daysToTarget != null && row.daysToTarget < 0;
                        return (
                          <span className={overdue ? "font-medium text-red-400" : undefined}>
                            {formatPanelDateTime(iso)}
                            {overdue
                              ? ` (${Math.abs(row.daysToTarget!)}d overdue)`
                              : row.daysToTarget != null && row.daysToTarget >= 0
                                ? ` (${row.daysToTarget}d left)`
                                : ""}
                          </span>
                        );
                      })()
                    }
                  />
                  <MetaRow
                    label="Time logged"
                    value={formatLoggedHours(
                      ticket?.timetaken != null && Number.isFinite(Number(ticket.timetaken))
                        ? Number(ticket.timetaken)
                        : row.timeLogged,
                    )}
                  />
                  <div className="flex items-center justify-between gap-2 border-b border-[var(--border)]/50 py-2">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                      RAG
                    </span>
                    <RagPill rag={row.rag} />
                  </div>
                  <MetaRow label="Open actions" value={String(row.openActions)} />
                  <MetaRow label="Open risks" value={String(row.openRisks)} />
                  <MetaRow
                    label="Ticket age"
                    value={
                      row.ticketAgeDays == null ? " - " : `${row.ticketAgeDays} days`
                    }
                  />
                  <MetaRow
                    label="Last note"
                    value={formatPanelDateTime(row.lastNoteAt)}
                  />
                </>
              )}
            </div>

            <div className="mt-auto space-y-2 border-t border-[var(--border)] p-4">
              {allowGenerateFromDashboard ? (
                <Button
                  type="button"
                  className={cn(
                    "h-10 w-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]",
                    focusRing,
                  )}
                  onClick={runGenerate}
                >
                  <Sparkles className="mr-2 size-4" aria-hidden />
                  Generate report
                </Button>
              ) : null}
              <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className={cn("h-10 min-w-0 flex-1", focusRing)}
                onClick={() => handleMeetingPrepClick()}
                disabled={meetingPrepLoading}
              >
                {meetingPrepLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                    Preparing...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 size-4" aria-hidden />
                    Meeting Prep
                  </>
                )}
              </Button>
              {meetingPrepContent?.trim() && !meetingPrepLoading ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={cn("h-10 w-10 shrink-0", focusRing)}
                  title="Refresh meeting brief"
                  aria-label="Refresh meeting brief"
                  onClick={() => void generateMeetingPrep()}
                >
                  <RotateCw className="size-4" aria-hidden />
                </Button>
              ) : null}
              </div>
              {canShowViewInPsa ? (
                <a
                  href={row.haloTicketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    focusRing,
                    "flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-transparent text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-secondary)]",
                  )}
                >
                  <ExternalLink className="size-4" aria-hidden />
                  {viewInPsaLabel}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>

    {meetingPrepModalOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMeetingPrepModalOpen(false);
          }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative z-10 flex flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] shadow-2xl"
            style={{ width: "900px", maxWidth: "90vw", maxHeight: "85vh", overflow: "hidden" }}
          >
            <div className="flex shrink-0 items-start justify-between border-b border-[var(--border)] px-6 py-4">
              <div>
                <h2 className="flex items-center gap-2 text-[15px] font-semibold text-white">
                  <FileText className="size-4 text-[var(--accent)]" aria-hidden />
                  Meeting Brief - {row.clientName}
                </h2>
                <p className="mt-1 text-[12px] text-[var(--text-secondary)]">{row.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setMeetingPrepModalOpen(false)}
                className="ml-4 shrink-0 text-[var(--text-secondary)] transition-colors hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4 md:overscroll-auto">
              <div className="space-y-1">
                {meetingPrepContent ? renderMeetingPrep(meetingPrepContent) : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2 border-t border-[var(--border)] px-6 py-4">
              <button
                type="button"
                className={cn(MEETING_PREP_ACTION_CLASS, focusRing)}
                disabled={!meetingPrepContent?.trim()}
                onClick={() => {
                  if (meetingPrepContent) void navigator.clipboard.writeText(meetingPrepContent);
                }}
              >
                Copy brief
              </button>
              <button
                type="button"
                className={cn(MEETING_PREP_ACTION_CLASS, focusRing)}
                disabled={meetingPrepPushing || demoMode || !meetingPrepContent?.trim()}
                onClick={() => void pushMeetingPrepToPsa()}
              >
                {meetingPrepPushing ? "Pushing..." : "Push to PSA"}
              </button>
              <button
                type="button"
                className={cn(MEETING_PREP_ACTION_CLASS, focusRing)}
                disabled={!meetingPrepContent?.trim()}
                onClick={downloadMeetingPrep}
              >
                Download
              </button>
              <button
                type="button"
                className={cn(MEETING_PREP_ACTION_CLASS, focusRing)}
                onClick={() => setMeetingPrepModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--border)]/50 py-2">
      <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </span>
      <span className="text-right text-[11px] text-[var(--text-primary)]">{value}</span>
    </div>
  );
}
