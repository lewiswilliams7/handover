"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ChevronRight, ExternalLink, Sparkles, X } from "lucide-react";

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
  mapHaloNoteToNormalised,
  sortHaloNotesOldestFirst,
  type HaloNote,
  type HaloTicket,
} from "@/lib/halo";
import { formatLoggedHours } from "@/lib/format-logged-hours";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { usePSAConnections } from "@/hooks/use-psa-connections";

const DETAIL_CACHE_MS = 2 * 60 * 1000;
const detailCache = new Map<string, { fetchedAt: number; ticket: HaloTicket }>();

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

type Props = {
  open: boolean;
  row: DeliveryHealthRow | null;
  onClose: () => void;
  focusRing: string;
  /** When false, hide generate actions (team dashboard read-only). */
  allowGenerateFromDashboard?: boolean;
  onGenerateReport: (payload: { text: string; clientName: string | null }) => void;
};

export function DeliveryHealthDetailPanel({
  open,
  row,
  onClose,
  focusRing,
  allowGenerateFromDashboard = true,
  onGenerateReport,
}: Props) {
  const psaConnections = usePSAConnections();
  const cwEnabled = psaConnections.connectwise;
  const [ticket, setTicket] = useState<HaloTicket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTicket = useCallback(async (id: number, source: "halopsa" | "connectwise") => {
    const cacheKey = `${source}-${id}`;
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
          ? `/api/cw/ticket-detail?id=${id}`
          : `/api/delivery-health/ticket-detail?id=${id}`;
      const res = await fetch(endpoint, { credentials: "same-origin", cache: "no-store" });
      const json = (await res.json()) as {
        ticket?: HaloTicket | CwDetailTicket;
        notes?: CwDetailNote[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.error ?? "Could not load ticket.");
      }
      if (!json.ticket) throw new Error("Invalid response");
      const normalisedTicket =
        source === "connectwise" && cwEnabled
          ? mapCwDetailToHaloShape(id, json.ticket as CwDetailTicket, json.notes ?? [])
          : (json.ticket as HaloTicket);
      detailCache.set(cacheKey, { fetchedAt: Date.now(), ticket: normalisedTicket });
      setTicket(normalisedTicket);
    } catch (e) {
      setTicket(null);
      setError(e instanceof Error ? e.message : "Could not load ticket.");
    } finally {
      setLoading(false);
    }
  }, [cwEnabled]);

  useEffect(() => {
    if (!open || !row) {
      setTicket(null);
      setError(null);
      setLoading(false);
      return;
    }
    const detailSource = row.source === "connectwise" && cwEnabled ? "connectwise" : "halopsa";
    void loadTicket(row.id, detailSource);
  }, [open, row, loadTicket, cwEnabled]);

  useEffect(() => {
    if (!open || !row) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, row, onClose]);

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
  const haloNotes = ticket ? notesOldestFirst(ticket) : [];
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

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center max-md:p-0 md:p-[5vh]",
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
          "md:h-[90vh] md:w-[min(92vw,1000px)] md:max-h-[90vh] md:max-w-[1000px] md:rounded-[var(--radius-lg)] md:border md:border-[var(--border)]",
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
                          <p className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-[var(--text-secondary)]">
                            {norm.content || " - "}
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
            </div>
          </div>
        </div>
      </div>
    </div>
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
