"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type HeroProductMockupVariant = "compact" | "full";

type DemoTab = "actions" | "risks" | "summary" | "client_email" | "status_report" | "qbr";

const TAB_LABELS: { id: DemoTab; label: string }[] = [
  { id: "actions", label: "Actions" },
  { id: "risks", label: "Risks" },
  { id: "summary", label: "Summary" },
  { id: "client_email", label: "Client Email" },
  { id: "status_report", label: "Status Report" },
  { id: "qbr", label: "QBR" },
];

function PriorityBadge({ level }: { level: "high" | "medium" }) {
  const cls =
    level === "high"
      ? "border-transparent bg-red-100 text-red-900 hover:bg-red-100 dark:bg-red-950/80 dark:text-red-100"
      : "border-transparent bg-amber-100 text-amber-950 hover:bg-amber-100 dark:bg-amber-950/80 dark:text-amber-50";
  return <Badge className={cls}>{level === "high" ? "High" : "Medium"}</Badge>;
}

const MOCK_ROWS: { task: string; owner: string; unassigned?: boolean; pri: "high" | "medium" }[] =
  [
    {
      task: "Chase Skyline IT Solutions - firewall licence delivery",
      owner: "Dave",
      pri: "high",
    },
    {
      task: "Complete Fernwood Academy 3CX configuration",
      owner: "Luke",
      pri: "medium",
    },
    {
      task: "Progress Greystone Group Cloud Migration phase 2",
      owner: "Luke",
      pri: "medium",
    },
    {
      task: "Assign engineer to Thornfield Solutions - network replacement",
      owner: "Unassigned",
      unassigned: true,
      pri: "high",
    },
  ];

const MOCK_RISKS: { risk: string; impact: string; mitigation: string; pri: "high" | "medium" }[] =
  [
    {
      risk: "Firewall vendor lead time may slip past client go-live",
      impact: "High - blocks cutover window",
      mitigation: "Expedite order; interim rules on existing appliance",
      pri: "high",
    },
    {
      risk: "3CX handover documentation incomplete",
      impact: "Medium - support load post-handover",
      mitigation: "Schedule knowledge transfer session this week",
      pri: "medium",
    },
    {
      risk: "Migration phase 2 scope creep on storage tiering",
      impact: "Medium - budget and timeline",
      mitigation: "Freeze scope; raise CR if client expands requirements",
      pri: "medium",
    },
  ];

export function HeroProductMockup({
  variant = "full",
  className,
}: {
  variant?: HeroProductMockupVariant;
  className?: string;
}) {
  const isCompact = variant === "compact";
  const [tab, setTab] = useState<DemoTab>("actions");

  const maxW = isCompact ? "max-w-[760px]" : "max-w-[960px]";

  return (
    <div
      className={cn("mx-auto w-full min-w-0 max-w-full", maxW, className)}
      style={{
        filter: "drop-shadow(0 28px 48px rgba(15, 23, 42, 0.12))",
      }}
    >
      <div
        className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)]"
        style={{
          boxShadow:
            "0 0 0 1px color-mix(in srgb, var(--accent) 18%, transparent), 0 24px 64px -16px color-mix(in srgb, var(--accent) 22%, transparent), 0 12px 32px rgba(0,0,0,0.08)",
        }}
      >
        <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2.5">
          <div className="flex gap-1.5" aria-hidden>
            <span className="size-2 rounded-full bg-[#ef4444]" />
            <span className="size-2 rounded-full bg-[#f59e0b]" />
            <span className="size-2 rounded-full bg-[#22c55e]" />
          </div>
          <div className="min-w-0 flex-1 rounded-md bg-[var(--bg-primary)] px-3 py-1.5 text-center text-xs text-[var(--text-muted)]">
            gethandover.uk
          </div>
        </div>

        <div className="border-b border-[var(--border)] bg-[var(--bg-primary)] p-2">
          <div
            className="flex h-auto w-full flex-nowrap items-center gap-x-0.5 gap-y-1 overflow-x-auto overflow-y-hidden rounded-t-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] px-1.5 py-1.5 sm:flex-wrap sm:px-2"
            role="tablist"
            aria-label="Output preview tabs"
          >
            {TAB_LABELS.map(({ id, label }, i) => (
              <span key={id} className="flex items-center gap-0.5">
                {i > 0 ? (
                  <span className="select-none px-0.5 text-[var(--text-muted)]" aria-hidden>
                    |
                  </span>
                ) : null}
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={cn(
                    "shrink-0 rounded-md px-2 py-1 text-left text-sm transition-colors",
                    tab === id
                      ? "border-b-2 border-[var(--accent)] font-medium text-[var(--text-primary)]"
                      : "font-normal text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                  )}
                >
                  {label}
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className={isCompact ? "bg-[var(--bg-primary)] p-2 md:p-3" : "bg-[var(--bg-primary)] p-2 md:p-4"}>
          {tab === "actions" ? (
            <div className="-mx-1 min-w-0 overflow-x-auto md:mx-0 md:overflow-visible">
            <Table className="min-w-[520px] md:min-w-0">
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(isCompact ? MOCK_ROWS.slice(0, 3) : MOCK_ROWS).map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell
                      className={cn(
                        "max-w-[220px] whitespace-normal font-medium text-[var(--text-primary)] md:max-w-none",
                        isCompact ? "text-sm" : "",
                      )}
                    >
                      {row.task}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "whitespace-normal text-[var(--text-primary)]",
                        isCompact ? "text-sm" : "",
                      )}
                    >
                      {row.unassigned ? (
                        <span className="text-muted-foreground">Unassigned</span>
                      ) : (
                        row.owner
                      )}
                    </TableCell>
                    <TableCell>
                      <PriorityBadge level={row.pri} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          ) : null}

          {tab === "risks" ? (
            <div className="-mx-1 min-w-0 overflow-x-auto md:mx-0 md:overflow-visible">
            <Table className="min-w-[640px] md:min-w-0">
              <TableHeader>
                <TableRow>
                  <TableHead>Risk</TableHead>
                  <TableHead>Impact</TableHead>
                  <TableHead>Mitigation</TableHead>
                  <TableHead>Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(isCompact ? MOCK_RISKS.slice(0, 2) : MOCK_RISKS).map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="max-w-[200px] whitespace-normal text-sm font-medium text-[var(--text-primary)]">
                      {row.risk}
                    </TableCell>
                    <TableCell className="whitespace-normal text-sm text-[var(--text-secondary)]">
                      {row.impact}
                    </TableCell>
                    <TableCell className="whitespace-normal text-sm text-[var(--text-secondary)]">
                      {row.mitigation}
                    </TableCell>
                    <TableCell>
                      <PriorityBadge level={row.pri} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          ) : null}

          {tab === "summary" ? (
            <div className="space-y-3 text-sm leading-relaxed text-[var(--text-secondary)]">
              <p className="text-[var(--text-primary)]">
                <strong className="text-[var(--text-primary)]">Week summary:</strong> Delivery stayed on
                track across Skyline, Fernwood, and Greystone. The main focus was chasing licence
                paperwork and progressing the cloud migration design.
              </p>
              <p>
                Skyline firewall renewal is the critical path - vendor has confirmed dispatch this week.
                Fernwood 3CX is in UAT with two minor handset config items left. Greystone phase 2
                storage sizing is agreed; implementation window proposed for next sprint.
              </p>
              <p>
                Thornfield network replacement still needs engineer assignment; escalated internally for
                resource matching.
              </p>
            </div>
          ) : null}

          {tab === "client_email" ? (
            <div className="rounded-md border border-[var(--border)] bg-[var(--bg-secondary)]/40 p-4 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Subject
              </p>
              <p className="mt-1 font-medium text-[var(--text-primary)]">
                Weekly update - Skyline, Fernwood &amp; Greystone
              </p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Body
              </p>
              <div className="mt-2 space-y-3 whitespace-pre-line text-[var(--text-secondary)]">
                {`Hi,

Here's a concise update on this week's delivery activity:

• Skyline - firewall licence is ordered; we're tracking delivery to protect the agreed go-live.
• Fernwood - 3CX UAT is progressing; two minor handset items remain before handover.
• Greystone - phase 2 scope is locked; we're ready to schedule implementation.

Please let me know if you'd like a call to walk through any of the above.

Best regards`}
              </div>
            </div>
          ) : null}

          {tab === "status_report" ? (
            <div className="space-y-3 text-sm text-[var(--text-secondary)]">
              <p className="font-semibold text-[var(--text-primary)]">Status report</p>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  <strong className="text-[var(--text-primary)]">Overall RAG:</strong> Amber - one vendor
                  dependency on Skyline.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Milestones:</strong> Fernwood UAT exit
                  on track for end of week; Greystone design sign-off complete.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Blockers:</strong> Thornfield engineer
                  assignment - internal resourcing in progress.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Next week:</strong> Execute Skyline
                  cutover prep, close Fernwood handset items, begin Greystone phase 2 build window.
                </li>
              </ul>
            </div>
          ) : null}

          {tab === "qbr" ? (
            <div className="space-y-4 text-sm text-[var(--text-secondary)]">
              <div className="rounded-md border border-[var(--border)] bg-[var(--bg-secondary)]/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Executive summary
                </p>
                <p className="mt-1 text-[var(--text-primary)]">
                  This quarter delivered stable service performance and improved delivery cadence across key client projects.
                </p>
              </div>
              <div className="rounded-md border border-[var(--border)] p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Delivery trend
                </p>
                <div className="mt-2 h-20 w-full rounded bg-[var(--bg-secondary)] p-2">
                  <div className="flex h-full items-end gap-2">
                    <span className="w-1/5 rounded-t bg-[var(--accent)]/45" style={{ height: "38%" }} />
                    <span className="w-1/5 rounded-t bg-[var(--accent)]/55" style={{ height: "48%" }} />
                    <span className="w-1/5 rounded-t bg-[var(--accent)]/65" style={{ height: "56%" }} />
                    <span className="w-1/5 rounded-t bg-[var(--accent)]/75" style={{ height: "66%" }} />
                    <span className="w-1/5 rounded-t bg-[var(--accent)]/90" style={{ height: "78%" }} />
                  </div>
                </div>
              </div>
              <div className="rounded-md border border-[var(--border)] p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Project status
                </p>
                <div className="mt-2 flex items-center justify-between rounded bg-[var(--bg-secondary)] px-3 py-2">
                  <span className="text-[var(--text-primary)]">Greystone Cloud Migration - Phase 2</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                    Amber
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
