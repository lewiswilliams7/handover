"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Brain,
  Calendar,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  Presentation,
  RefreshCw,
} from "lucide-react";

import {
  exportCiQbrExcel,
  exportCiQbrPdf,
  exportCiQbrPptx,
} from "@/lib/ci-qbr-export";
import { cn } from "@/lib/utils";

type Client = {
  name: string;
  generationCount: number;
  lastGeneratedAt: string;
  health: string;
  hasSummary: boolean;
};

type QbrOutput = {
  clientName: string;
  periodLabel: string;
  relationshipHealth: string;
  executiveSummary: string;
  keyAchievements: string[];
  recurringIssues: string[];
  openRisks: string[];
  resolvedRisks: string[];
  recommendedActions: string[];
  qbrTalkingPoints: string[];
  strategicPriorities: string[];
  generatedAt: string;
};

type Props = {
  userId: string;
  hasProAccess: boolean;
  defaultBrandName: string;
  defaultBrandColor: string;
  brandLogoUrl?: string | null;
  onNavigateToCI: () => void;
};

const PERIOD_OPTIONS = [
  { label: "Last quarter (3 months)", months: 3 },
  { label: "Last 6 months", months: 6 },
  { label: "Last year", months: 12 },
];

function listSection(title: string, items: string[]) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li
            key={i}
            className="text-[13px] leading-relaxed text-[var(--text-secondary)]"
          >
            · {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CiQbrBuilder({
  hasProAccess,
  defaultBrandName,
  defaultBrandColor,
  brandLogoUrl,
  onNavigateToCI,
}: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(PERIOD_OPTIONS[0]);
  const [generating, setGenerating] = useState(false);
  const [exportingPptx, setExportingPptx] = useState(false);
  const [output, setOutput] = useState<QbrOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/client-intelligence/clients", {
          credentials: "same-origin",
        });
        const data = (await res.json()) as { clients: Client[] };
        setClients(data.clients ?? []);
      } catch (e) {
        console.error("[ci-qbr] clients:", e);
      } finally {
        setClientsLoading(false);
      }
    };
    void load();
  }, []);

  const generateQbr = useCallback(async () => {
    if (!selectedClient) return;
    setGenerating(true);
    setError(null);
    setOutput(null);

    try {
      const res = await fetch("/api/client-intelligence/qbr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          clientName: selectedClient.name,
          months: selectedPeriod.months,
        }),
      });
      const data = (await res.json()) as {
        qbr?: QbrOutput;
        error?: string;
      };
      if (!res.ok || data.error) {
        setError(data.error ?? "Failed to generate QBR");
      } else if (data.qbr) {
        setOutput(data.qbr);
      }
    } catch (e) {
      console.error("[ci-qbr] generate:", e);
      setError("Failed to generate QBR");
    } finally {
      setGenerating(false);
    }
  }, [selectedClient, selectedPeriod]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const healthColour = (h: string) =>
    h === "red" ? "bg-red-500" : h === "amber" ? "bg-yellow-500" : "bg-green-500";

  const handleExportPptx = useCallback(async () => {
    if (!output) return;
    setExportingPptx(true);
    try {
      await exportCiQbrPptx({
        clientName: output.clientName,
        periodLabel: output.periodLabel,
        relationshipHealth: output.relationshipHealth as "green" | "amber" | "red",
        executiveSummary: output.executiveSummary,
        keyAchievements: output.keyAchievements,
        recurringIssues: output.recurringIssues,
        openRisks: output.openRisks,
        resolvedRisks: output.resolvedRisks ?? [],
        recommendedActions: output.recommendedActions,
        qbrTalkingPoints: output.qbrTalkingPoints,
        strategicPriorities: output.strategicPriorities,
        generatedAt: output.generatedAt,
        brandName: defaultBrandName,
        brandColor: defaultBrandColor,
        brandLogoUrl: brandLogoUrl,
      });
    } finally {
      setExportingPptx(false);
    }
  }, [output, defaultBrandName, defaultBrandColor, brandLogoUrl]);

  const handleExportPdf = useCallback(() => {
    if (!output) return;
    exportCiQbrPdf({
      clientName: output.clientName,
      periodLabel: output.periodLabel,
      relationshipHealth: output.relationshipHealth as "green" | "amber" | "red",
      executiveSummary: output.executiveSummary,
      keyAchievements: output.keyAchievements,
      recurringIssues: output.recurringIssues,
      openRisks: output.openRisks,
      resolvedRisks: output.resolvedRisks ?? [],
      recommendedActions: output.recommendedActions,
      qbrTalkingPoints: output.qbrTalkingPoints,
      strategicPriorities: output.strategicPriorities,
      generatedAt: output.generatedAt,
      brandName: defaultBrandName,
      brandColor: defaultBrandColor,
      brandLogoUrl: brandLogoUrl,
    });
  }, [output, defaultBrandName, defaultBrandColor, brandLogoUrl]);

  const handleExportExcel = useCallback(() => {
    if (!output) return;
    exportCiQbrExcel({
      clientName: output.clientName,
      periodLabel: output.periodLabel,
      relationshipHealth: output.relationshipHealth as "green" | "amber" | "red",
      executiveSummary: output.executiveSummary,
      keyAchievements: output.keyAchievements,
      recurringIssues: output.recurringIssues,
      openRisks: output.openRisks,
      resolvedRisks: output.resolvedRisks ?? [],
      recommendedActions: output.recommendedActions,
      qbrTalkingPoints: output.qbrTalkingPoints,
      strategicPriorities: output.strategicPriorities,
      generatedAt: output.generatedAt,
      brandName: defaultBrandName,
      brandColor: defaultBrandColor,
      brandLogoUrl: brandLogoUrl,
    });
  }, [output, defaultBrandName, defaultBrandColor, brandLogoUrl]);

  if (!hasProAccess) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <Brain className="size-10 text-[var(--accent)] opacity-40" />
        <p className="max-w-xs text-[13px] text-[var(--text-muted)]">
          Intelligence-powered QBR packs need an active Handover plan.
        </p>
        <button
          type="button"
          onClick={onNavigateToCI}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-[12px] font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
        >
          View Client Intelligence →
        </button>
      </div>
    );
  }

  if (clientsLoading) {
    return (
      <div className="flex items-center justify-center gap-3 py-16">
        <Loader2 className="size-5 animate-spin text-[var(--accent)]" />
        <p className="text-[13px] text-[var(--text-muted)]">Loading clients...</p>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <FileText className="size-10 text-[var(--accent)] opacity-40" />
        <p className="max-w-sm text-[13px] text-[var(--text-muted)]">
          Generate at least two reports for a client to build an intelligence-powered QBR. Client
          Intelligence needs history to synthesise achievements, risks, and talking points.
        </p>
        <button
          type="button"
          onClick={onNavigateToCI}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-[12px] font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
        >
          Go to Client Intelligence →
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {!output ? (
        <>
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Select client
            </p>
            <div className="space-y-2">
              {clients.map((client) => (
                <button
                  key={client.name}
                  type="button"
                  onClick={() => {
                    setSelectedClient(client);
                    setError(null);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all duration-150",
                    selectedClient?.name === client.name
                      ? "border-[var(--accent)]/20 bg-[var(--accent)]/10"
                      : "border-[var(--border)] bg-[var(--bg-primary)] hover:bg-white/[0.02]",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={cn("size-2 flex-shrink-0 rounded-full", healthColour(client.health))} />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
                        {client.name}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {client.generationCount} reports · Last {formatDate(client.lastGeneratedAt)}
                        {client.hasSummary ? " · Intelligence ready" : ""}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 flex-shrink-0 text-[var(--text-muted)]" />
                </button>
              ))}
            </div>
          </div>

          {selectedClient ? (
            <div>
              <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                <Calendar className="size-3.5" />
                Reporting period
              </p>
              <div className="flex flex-wrap gap-2">
                {PERIOD_OPTIONS.map((period) => (
                  <button
                    key={period.months}
                    type="button"
                    onClick={() => setSelectedPeriod(period)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-[12px] font-medium transition-colors",
                      selectedPeriod.months === period.months
                        ? "border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                    )}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-[12px] text-red-400">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            disabled={!selectedClient || generating}
            onClick={() => void generateQbr()}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-semibold transition-all",
              selectedClient && !generating
                ? "bg-[var(--accent)] text-[#06091a] hover:opacity-90"
                : "cursor-not-allowed bg-white/[0.06] text-[var(--text-muted)]",
            )}
          >
            {generating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Generating QBR from intelligence...
              </>
            ) : (
              <>
                <Brain className="size-4" />
                Generate intelligence QBR
              </>
            )}
          </button>
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <div
                  className={cn(
                    "size-2 rounded-full",
                    healthColour(output.relationshipHealth),
                  )}
                />
                <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
                  {output.clientName}
                </h3>
              </div>
              <p className="text-[12px] text-[var(--text-muted)]">
                {output.periodLabel} · Generated {formatDate(output.generatedAt)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setOutput(null);
                  setError(null);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
              >
                <RefreshCw className="size-3.5" />
                New QBR
              </button>
              <button
                type="button"
                onClick={() => void handleExportPptx()}
                disabled={exportingPptx}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[12px] font-semibold text-[#06091a] transition-all hover:scale-[1.02] disabled:opacity-60"
              >
                {exportingPptx ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Presentation className="size-3.5" />
                )}
                {exportingPptx ? "Building..." : "Export PowerPoint"}
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
              >
                <FileText className="size-3.5" />
                Export PDF
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
              >
                <Download className="size-3.5" />
                Export Excel
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Executive summary
            </p>
            <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
              {output.executiveSummary}
            </p>
          </div>

          {listSection("Key achievements", output.keyAchievements)}
          {listSection("Recurring issues", output.recurringIssues)}
          {listSection("Open risks", output.openRisks)}
          {listSection("Resolved risks", output.resolvedRisks)}
          {listSection("Recommended actions", output.recommendedActions)}
          {listSection("QBR talking points", output.qbrTalkingPoints)}
          {listSection("Strategic priorities", output.strategicPriorities)}
        </div>
      )}
    </div>
  );
}
