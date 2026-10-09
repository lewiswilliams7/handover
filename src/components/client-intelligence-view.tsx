"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  BarChart2,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Copy,
  FileText,
  History,
  LayoutTemplate,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  X,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  computeRelationshipScore,
  relationshipScoreLabelColour,
  type RelationshipScoreBreakdown,
  type RelationshipScoreLabel,
} from "@/lib/server/client-relationship-score";

type Client = {
  name: string;
  generationCount: number;
  lastGeneratedAt: string;
  daysSinceLastReport: number;
  reportTypes: string[];
  hasQbr: boolean;
  hasScheduled: boolean;
  health: "green" | "amber" | "red";
  trend: "up" | "down" | "stable";
  recentGenerationCount: number;
  recentRiskCount: number;
  recentActionCount: number;
  hasSummary: boolean;
  relationshipScore?: number;
  relationshipScoreLabel?: RelationshipScoreLabel;
  relationshipScoreBreakdown?: RelationshipScoreBreakdown;
};

type ClientBrief = {
  currentStatus: string;
  whatChanged: string | null;
  openRisks: string[];
  talkingPoints: string[];
};

type Generation = {
  id: string;
  title: string | null;
  clientName?: string | null;
  createdAt: string;
  reportType: string;
  source: string;
  summaryPreview: string;
  actionCount: number;
  riskCount: number;
  outputJson: Record<string, unknown>;
};

type IntelligenceSummary = {
  account_narrative: string;
  recurring_issues: string[];
  key_achievements: string[];
  open_risks: string[];
  relationship_health: "green" | "amber" | "red";
  health_justification: string;
  recommended_actions: string[];
  qbr_talking_points: string[];
};

type Tab = "history" | "summary";

type PeriodOption = {
  label: string;
  days: number | null;
};

const DEMO_CLIENTS: Client[] = [
  {
    name: "Northwood Manufacturing",
    generationCount: 8,
    lastGeneratedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    daysSinceLastReport: 2,
    reportTypes: ["report", "qbr"],
    hasQbr: true,
    hasScheduled: true,
    health: "amber",
    trend: "up",
    recentGenerationCount: 4,
    recentRiskCount: 1,
    recentActionCount: 6,
    hasSummary: true,
  },
  {
    name: "Acme Legal LLP",
    generationCount: 6,
    lastGeneratedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    daysSinceLastReport: 5,
    reportTypes: ["report"],
    hasQbr: false,
    hasScheduled: true,
    health: "red",
    trend: "stable",
    recentGenerationCount: 3,
    recentRiskCount: 4,
    recentActionCount: 8,
    hasSummary: true,
  },
  {
    name: "Bridgewater Council",
    generationCount: 10,
    lastGeneratedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    daysSinceLastReport: 7,
    reportTypes: ["report", "qbr"],
    hasQbr: true,
    hasScheduled: true,
    health: "amber",
    trend: "stable",
    recentGenerationCount: 3,
    recentRiskCount: 2,
    recentActionCount: 5,
    hasSummary: false,
  },
  {
    name: "Osprey Financial",
    generationCount: 4,
    lastGeneratedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    daysSinceLastReport: 3,
    reportTypes: ["report"],
    hasQbr: false,
    hasScheduled: false,
    health: "green",
    trend: "up",
    recentGenerationCount: 3,
    recentRiskCount: 0,
    recentActionCount: 4,
    hasSummary: false,
  },
];

const DEMO_GENERATIONS: Record<string, Generation[]> = {
  "Northwood Manufacturing": [
    {
      id: "demo-nm-1",
      title: "Northwood Manufacturing - Weekly Update",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      reportType: "report",
      source: "scheduled",
      summaryPreview:
        "The Microsoft 365 migration phase 2 is progressing well with mailbox migrations 80% complete. MFA rollout remains the most time-critical item with 3 remote users pending hardware token delivery.",
      actionCount: 4,
      riskCount: 1,
      outputJson: {
        summary:
          "The Microsoft 365 migration phase 2 is progressing well with mailbox migrations 80% complete. MFA rollout remains the most time-critical item with 3 remote users pending hardware token delivery. Network infrastructure review is scheduled for next week.",
        actions: [
          {
            task: "Complete MFA rollout for 3 remote users pending hardware token delivery",
            suggested_owner: "J. Davies",
            priority: "High",
          },
          {
            task: "Complete mailbox migration for remaining 20% of users",
            suggested_owner: "S. Patel",
            priority: "Medium",
          },
          {
            task: "Schedule network infrastructure review for w/c 16 June",
            suggested_owner: "Lewis Williams",
            priority: "Medium",
          },
          {
            task: "Send updated project timeline to client stakeholders",
            suggested_owner: "Lewis Williams",
            priority: "Low",
          },
        ],
        risks: [
          {
            title: "MFA coverage gap on remote user accounts creates security exposure",
            description:
              "3 remote users remain without MFA pending hardware token delivery. Estimated resolution 10 June.",
            mitigation: "Temporary access restrictions applied. Tokens ordered.",
          },
        ],
        client_email:
          "Hi [Contact],\n\nHope you're well. Here's your weekly update from the Handover team.\n\nThis week we've made strong progress on the M365 migration — 80% of mailboxes are now complete. The remaining 20% are scheduled for completion by end of next week.\n\nThe one open item requiring your attention is the MFA rollout for 3 remote users. Hardware tokens are on order and should arrive this week.\n\nKind regards,\nLewis Williams\nHandover",
      },
    },
    {
      id: "demo-nm-2",
      title: "Northwood Manufacturing - Weekly Update",
      createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      reportType: "report",
      source: "scheduled",
      summaryPreview:
        "M365 migration phase 2 kicked off this week with initial mailbox migrations underway. Security audit completed with no critical findings.",
      actionCount: 3,
      riskCount: 1,
      outputJson: {
        summary:
          "M365 migration phase 2 kicked off this week with initial mailbox migrations underway. Security audit completed with no critical findings. MFA rollout planning initiated.",
        actions: [
          {
            task: "Begin mailbox migrations for pilot group of 15 users",
            suggested_owner: "S. Patel",
            priority: "High",
          },
          {
            task: "Order hardware tokens for remote users",
            suggested_owner: "Lewis Williams",
            priority: "High",
          },
          {
            task: "Document migration rollback procedure",
            suggested_owner: "J. Davies",
            priority: "Medium",
          },
        ],
        risks: [
          {
            title: "Remote users will lack MFA during migration window",
            mitigation: "Hardware tokens ordered. Temporary restrictions to be applied.",
          },
        ],
        client_email:
          "Hi [Contact],\n\nGreat news — phase 2 of the M365 migration is underway. Pilot group migrations are progressing smoothly.\n\nKind regards,\nLewis Williams",
      },
    },
  ],
  "Acme Legal LLP": [
    {
      id: "demo-al-1",
      title: "Acme Legal LLP - Weekly Update",
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      reportType: "report",
      source: "scheduled",
      summaryPreview:
        "The Osprey case management SQL migration remains blocked pending partner sign-off. This is the third consecutive week the migration has been held at this stage.",
      actionCount: 3,
      riskCount: 2,
      outputJson: {
        summary:
          "The Osprey case management SQL migration remains blocked pending partner sign-off. This is the third consecutive week the migration has been held at this stage, creating escalating delivery risk. Mimecast deployment is on track with pilot group identified.",
        actions: [
          {
            task: "Escalate Osprey sign-off to senior partner — deadline end of week",
            suggested_owner: "Lewis Williams",
            priority: "High",
          },
          {
            task: "Complete Mimecast pilot deployment for identified group",
            suggested_owner: "J. Davies",
            priority: "Medium",
          },
          {
            task: "Prepare iManage discovery report for client stakeholders",
            suggested_owner: "S. Patel",
            priority: "Medium",
          },
        ],
        risks: [
          {
            title: "Osprey migration blocked by partner sign-off for 3rd consecutive week",
            mitigation: "Escalating to senior partner. Hard deadline being set.",
          },
          {
            title: "iManage Cloud migration discovery delays may impact Q3 deadline",
            mitigation: "Discovery report being expedited.",
          },
        ],
        client_email:
          "Hi [Contact],\n\nThis week's update — the Osprey migration remains on hold pending formal sign-off from your senior partner. We've now been waiting three weeks and this is creating downstream risk.\n\nWe'd like to escalate this — could you facilitate a direct conversation?\n\nKind regards,\nLewis Williams",
      },
    },
  ],
  "Bridgewater Council": [
    {
      id: "demo-bc-1",
      title: "Bridgewater Council - Monthly Service Review",
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      reportType: "report",
      source: "scheduled",
      summaryPreview:
        "Strong delivery month for Bridgewater Council. The Cyber Essentials renewal is on track with MFA completion the only remaining action.",
      actionCount: 2,
      riskCount: 1,
      outputJson: {
        summary:
          "Strong delivery month for Bridgewater Council. The Cyber Essentials renewal is on track with MFA completion on admin accounts the only remaining action. Network monitoring upgrade completed ahead of schedule.",
        actions: [
          {
            task: "Complete MFA on remaining 4 admin accounts for Cyber Essentials compliance",
            suggested_owner: "J. Davies",
            priority: "High",
          },
          {
            task: "Submit Cyber Essentials renewal application",
            suggested_owner: "Lewis Williams",
            priority: "Medium",
          },
        ],
        risks: [
          {
            title: "4 admin accounts without MFA creates Cyber Essentials compliance gap",
            mitigation: "Scheduled for completion this week prior to renewal submission.",
          },
        ],
        client_email:
          "Hi [Contact],\n\nYour monthly service review is attached. Highlights this month: network monitoring upgrade completed 3 days ahead of schedule, and Cyber Essentials renewal is on track.\n\nKind regards,\nLewis Williams",
      },
    },
  ],
};

const DEMO_INTELLIGENCE: Record<string, IntelligenceSummary> = {
  "Northwood Manufacturing": {
    account_narrative:
      "Northwood Manufacturing has been a consistently well-managed account over the past quarter, with the M365 migration progressing steadily through planned phases. The only persistent concern has been the MFA coverage gap for remote users, which has appeared in three consecutive reports but has a clear resolution path via hardware token delivery.",
    recurring_issues: [
      "MFA rollout for remote users blocked by hardware token delivery timeline",
      "Documentation lag on migration rollback procedures",
    ],
    key_achievements: [
      "M365 mailbox migration 80% complete ahead of schedule",
      "Security audit completed with no critical findings",
      "Network infrastructure review scheduled and resourced",
    ],
    open_risks: ["3 remote users without MFA pending hardware token delivery"],
    relationship_health: "amber",
    health_justification:
      "Delivery is generally strong with consistent reporting, but one open risk and two recurring issues prevent a green rating.",
    recommended_actions: [
      "Confirm hardware token delivery date with supplier and communicate to client",
      "Schedule post-migration security review for July",
    ],
    qbr_talking_points: [
      "M365 migration on track — completion expected end of June",
      "MFA gap resolution — tokens arriving this week",
      "No security incidents across the quarter",
      "Propose network infrastructure review as Q3 priority",
    ],
  },
  "Acme Legal LLP": {
    account_narrative:
      "Acme Legal LLP is the account most in need of attention right now. The Osprey case management SQL migration has been blocked by partner sign-off delays for three consecutive reporting periods, creating escalating delivery risk and reputational exposure. While Mimecast deployment is progressing well, the sign-off bottleneck is beginning to affect the wider delivery relationship.",
    recurring_issues: [
      "Partner sign-off delays blocking Osprey case management SQL migration",
      "Formal written confirmation not received after verbal approvals",
    ],
    key_achievements: [
      "Mimecast email encryption licences secured and pilot group identified",
      "iManage Cloud discovery phase completed",
    ],
    open_risks: [
      "Osprey migration blocked for 3 weeks — delivery timeline at risk",
      "Pattern of informal approvals without written confirmation creates governance risk",
    ],
    relationship_health: "red",
    health_justification:
      "Recurring sign-off delays and 3-week migration blockage indicate relationship friction that needs direct intervention.",
    recommended_actions: [
      "Escalate Osprey sign-off to senior partner this week with hard deadline",
      "Establish formal sign-off process with client for all future migrations",
      "Schedule account review call with client MD within 2 weeks",
    ],
    qbr_talking_points: [
      "Osprey migration delay — root cause and resolution plan",
      "Sign-off process improvement — proposed formal approval workflow",
      "Mimecast deployment progress and timeline",
      "iManage Cloud migration next steps",
    ],
  },
};

const DEMO_ATTENTION = {
  summary:
    "Your portfolio has one account requiring urgent attention and two on track. Acme Legal LLP has a 3-week delivery blockage that needs direct intervention this week.",
  items: [
    {
      clientName: "Acme Legal LLP",
      priority: "high",
      issue:
        "Osprey SQL migration blocked by partner sign-off for 3 consecutive weeks — delivery timeline at risk",
      action: "Escalate to senior partner with hard deadline by end of this week",
      type: "risk",
    },
    {
      clientName: "Bridgewater Council",
      priority: "medium",
      issue:
        "4 admin accounts without MFA creates Cyber Essentials compliance gap before renewal",
      action: "Complete MFA on remaining admin accounts before renewal submission",
      type: "risk",
    },
    {
      clientName: "Northwood Manufacturing",
      priority: "low",
      issue: "MFA hardware tokens not yet delivered — remote users remain uncovered",
      action: "Confirm delivery date with supplier today",
      type: "overdue",
    },
  ],
};

const PERIOD_OPTIONS: PeriodOption[] = [
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 6 months", days: 180 },
  { label: "Last year", days: 365 },
  { label: "All time", days: null },
];

const HEALTH_COLOURS = {
  green: {
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    text: "text-green-400",
    dot: "bg-green-500",
  },
  amber: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    text: "text-yellow-400",
    dot: "bg-yellow-500",
  },
  red: {
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    text: "text-red-400",
    dot: "bg-red-500",
  },
};

const SCORE_RING_COLOURS: Record<string, string> = {
  green: "#22c55e",
  amber: "#eab308",
  orange: "#f97316",
  red: "#ef4444",
};

function scoreRingStroke(score: number): string {
  return SCORE_RING_COLOURS[relationshipScoreLabelColour(score)] ?? "#94a3b8";
}

function enrichClientWithRelationshipScore(client: Client): Client {
  if (
    typeof client.relationshipScore === "number" &&
    client.relationshipScoreBreakdown
  ) {
    return client;
  }
  const relationship = computeRelationshipScore({
    daysSinceLastReport: client.daysSinceLastReport,
    openRiskCount: client.recentRiskCount,
    recurringIssueCount: 0,
    generationCount: client.generationCount,
    hasScheduled: client.hasScheduled,
    cachedSummaryHealth: client.health,
    cachedSummaryUpdatedAt: client.hasSummary ? client.lastGeneratedAt : null,
  });
  return {
    ...client,
    relationshipScore: relationship.score,
    relationshipScoreLabel: relationship.label,
    relationshipScoreBreakdown: relationship.breakdown,
  };
}

function formatScoreBreakdownTooltip(breakdown: RelationshipScoreBreakdown): string {
  const lines = breakdown.components.map(
    (c) => `${c.label}: ${c.score}/100 — ${c.detail}`,
  );
  if (breakdown.aiHealthSignal?.fresh) {
    lines.push(breakdown.aiHealthSignal.detail);
  }
  return lines.join("\n");
}

function RelationshipScoreCompact({
  score,
  label,
  breakdown,
}: {
  score: number;
  label?: RelationshipScoreLabel;
  breakdown?: RelationshipScoreBreakdown;
}) {
  const colour = scoreRingStroke(score);
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
      style={{
        backgroundColor: `${colour}22`,
        color: colour,
      }}
      title={breakdown ? formatScoreBreakdownTooltip(breakdown) : label}
    >
      {score}
    </span>
  );
}

function RelationshipScoreRing({
  score,
  label,
  breakdown,
  size = 96,
}: {
  score: number;
  label: RelationshipScoreLabel;
  breakdown?: RelationshipScoreBreakdown;
  size?: number;
}) {
  const stroke = scoreRingStroke(score);
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div
      className="relative flex flex-shrink-0 flex-col items-center"
      title={breakdown ? formatScoreBreakdownTooltip(breakdown) : undefined}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={6}
          className="text-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
        aria-label={`Relationship score ${score} out of 100, ${label}`}
      >
        <span className="text-[22px] font-bold tabular-nums text-[var(--text-primary)]">
          {score}
        </span>
        <span className="text-[9px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
          / 100
        </span>
      </div>
      <p
        className="mt-2 text-center text-[11px] font-semibold"
        style={{ color: stroke }}
      >
        {label}
      </p>
    </div>
  );
}

function ClientBriefModal({
  clientName,
  brief,
  loading,
  onClose,
  onRegenerate,
}: {
  clientName: string;
  brief: ClientBrief | null;
  loading: boolean;
  onClose: () => void;
  onRegenerate: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyText = brief
    ? [
        `Client brief — ${clientName}`,
        "",
        "Current status",
        brief.currentStatus,
        "",
        brief.whatChanged ? `What changed\n${brief.whatChanged}` : null,
        brief.openRisks.length
          ? `Open risks\n${brief.openRisks.map((r) => `• ${r}`).join("\n")}`
          : null,
        brief.talkingPoints.length
          ? `Talking points\n${brief.talkingPoints.map((p) => `• ${p}`).join("\n")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  const onCopy = async () => {
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 flex max-h-[min(85vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-violet-500/25 bg-[var(--bg-primary)] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-violet-500/20 bg-violet-500/10 px-5 py-4">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <MessageSquare className="size-4 text-violet-400" aria-hidden />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-violet-300">
                Client brief
              </span>
            </div>
            <h2 className="truncate text-[15px] font-semibold text-[var(--text-primary)]">
              {clientName}
            </h2>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
              Account-level prep for your next conversation
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1 text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 md:overscroll-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-[13px] text-[var(--text-muted)]">
              <Loader2 className="size-6 animate-spin text-violet-400" />
              Building client brief…
            </div>
          ) : !brief ? (
            <p className="py-8 text-center text-[13px] text-[var(--text-muted)]">
              Could not generate a brief. Try again.
            </p>
          ) : (
            <div className="space-y-4">
              <section>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-violet-300/80">
                  Current status
                </p>
                <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
                  {brief.currentStatus}
                </p>
              </section>
              {brief.whatChanged ? (
                <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    What changed since last report
                  </p>
                  <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
                    {brief.whatChanged}
                  </p>
                </section>
              ) : null}
              {brief.openRisks.length > 0 ? (
                <section>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Open risks
                  </p>
                  <ul className="space-y-1.5">
                    {brief.openRisks.map((risk) => (
                      <li
                        key={risk}
                        className="flex items-start gap-2 text-[12px] text-[var(--text-secondary)]"
                      >
                        <AlertTriangle className="mt-0.5 size-3 shrink-0 text-amber-400" />
                        {risk}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {brief.talkingPoints.length > 0 ? (
                <section>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Suggested talking points
                  </p>
                  <ol className="list-decimal space-y-1.5 pl-5 text-[12px] text-[var(--text-secondary)]">
                    {brief.talkingPoints.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ol>
                </section>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[var(--border)] px-5 py-3">
          <button
            type="button"
            onClick={() => void onRegenerate()}
            disabled={loading}
            className="text-[12px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] disabled:opacity-50"
          >
            Regenerate
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void onCopy()}
              disabled={!brief || loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              <Copy className="size-3.5" />
              {copied ? "Copied!" : "Copy to clipboard"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-violet-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-violet-500"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OpenRisksList({ risks }: { risks: string[] }) {
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? risks : risks.slice(0, 2);
  const hasMore = risks.length > 2;
  console.log(
    "[OpenRisksList] risks count:",
    risks.length,
    "hasMore:",
    hasMore,
  );

  return (
    <div>
      <ul className="space-y-2">
        {visible.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-[12px] text-[var(--text-secondary)]"
          >
            <span className="mt-0.5 flex-shrink-0 text-red-400">·</span>
            {item.replace(/^[·•\-\*]\s*/, "").replace(/^\d+[\.\)]\s*/, "")}
          </li>
        ))}
      </ul>
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-2 flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
        >
          {expanded ? (
            <>
              <ChevronUp className="size-3" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="size-3" />
              {risks.length - 2} more {risks.length - 2 === 1 ? "risk" : "risks"}
            </>
          )}
        </button>
      )}
    </div>
  );
}

function RecurringIssuesList({ issues }: { issues: string[] }) {
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? issues : issues.slice(0, 3);
  const hasMore = issues.length > 3;

  return (
    <div>
      <ul className="space-y-2">
        {visible.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-[12px] text-[var(--text-secondary)]"
          >
            <span className="mt-0.5 flex-shrink-0 text-yellow-400">·</span>
            {item.replace(/^[·•\-\*]\s*/, "").replace(/^\d+[\.\)]\s*/, "")}
          </li>
        ))}
      </ul>
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-2 flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
        >
          {expanded ? (
            <>
              <ChevronUp className="size-3" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="size-3" />
              {issues.length - 3} more
            </>
          )}
        </button>
      )}
    </div>
  );
}

export function ClientIntelligenceView({
  userId,
  userEmail,
  onGenerateQbr,
  initialClientName,
  initialTab,
  initialHighlightRisks,
  demoMode,
  onNavigateToGenerate,
}: {
  userId: string;
  userEmail?: string | null;
  onGenerateQbr?: (
    clientName: string,
    summary: IntelligenceSummary,
  ) => void;
  initialClientName?: string | null;
  initialTab?: Tab;
  initialHighlightRisks?: boolean;
  demoMode?: boolean;
  onNavigateToGenerate?: () => void;
}) {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("history");
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [summary, setSummary] = useState<IntelligenceSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryPersistFailed, setSummaryPersistFailed] = useState(false);
  const [summaryEmptyReason, setSummaryEmptyReason] = useState<string | null>(null);
  const [qbrNavigating, setQbrNavigating] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>(
    PERIOD_OPTIONS[2],
  );
  const [selectedGen, setSelectedGen] = useState<Generation | null>(null);
  const [showAllReports, setShowAllReports] = useState(false);
  const [allReports, setAllReports] = useState<Generation[]>([]);
  const [allReportsLoading, setAllReportsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [attentionResult, setAttentionResult] = useState<{
    summary: string;
    items: Array<{
      clientName: string;
      priority: string;
      issue: string;
      action: string;
      type: string;
    }>;
  } | null>(null);
  const [attentionLoading, setAttentionLoading] = useState(false);
  const [showAttention, setShowAttention] = useState(false);
  const [actionEmailOpen, setActionEmailOpen] = useState(false);
  const [actionEmailItem, setActionEmailItem] = useState<{
    clientName: string;
    issue: string;
    action: string;
    priority: string;
  } | null>(null);
  const [actionEmailTo, setActionEmailTo] = useState("");
  const [actionEmailSubject, setActionEmailSubject] = useState("");
  const [actionEmailBody, setActionEmailBody] = useState("");
  const [actionEmailFrom, setActionEmailFrom] = useState(userEmail ?? "");
  const [actionEmailSending, setActionEmailSending] = useState(false);
  const [actionEmailSent, setActionEmailSent] = useState(false);
  const [actionEmailGenerating, setActionEmailGenerating] = useState(false);
  const [userSignature, setUserSignature] = useState("");
  const [openRisksHighlight, setOpenRisksHighlight] = useState(false);
  const [highlightRisksPending, setHighlightRisksPending] = useState(
    initialHighlightRisks ?? false,
  );
  const [clientBriefOpen, setClientBriefOpen] = useState(false);
  const [clientBrief, setClientBrief] = useState<ClientBrief | null>(null);
  const [clientBriefLoading, setClientBriefLoading] = useState(false);

  useEffect(() => {
    if (initialHighlightRisks) {
      setHighlightRisksPending(true);
    }
  }, [initialHighlightRisks]);

  useEffect(() => {
    if (!openRisksHighlight) return;
    const t = window.setTimeout(() => setOpenRisksHighlight(false), 3000);
    return () => window.clearTimeout(t);
  }, [openRisksHighlight]);

  useEffect(() => {
    if (!highlightRisksPending || activeTab !== "summary" || summaryLoading) {
      return;
    }

    if (!summary) {
      return;
    }

    if (!summary.open_risks?.length) {
      setHighlightRisksPending(false);
      return;
    }

    const runHighlight = () => {
      document
        .getElementById("ci-open-risks-section")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      setOpenRisksHighlight(true);
      setHighlightRisksPending(false);
    };

    let attempts = 0;
    const tryHighlight = () => {
      const el = document.getElementById("ci-open-risks-section");
      if (el) {
        runHighlight();
        return;
      }
      attempts += 1;
      if (attempts >= 10) {
        setHighlightRisksPending(false);
        return;
      }
      window.setTimeout(tryHighlight, 50);
    };

    tryHighlight();
  }, [
    highlightRisksPending,
    activeTab,
    summaryLoading,
    summary,
  ]);

  useEffect(() => {
    if (!userId) return;
    const fetchSignature = async () => {
      try {
        const { createClient } = await import("@/lib/supabase");
        const supabase = createClient();
        const { data } = await supabase
          .from("profiles")
          .select("display_name, job_title, company_name")
          .eq("id", userId)
          .maybeSingle();

        if (data) {
          const name = (data as Record<string, unknown>).display_name as
            | string
            | null;
          const title = (data as Record<string, unknown>).job_title as
            | string
            | null;
          const company = (data as Record<string, unknown>).company_name as
            | string
            | null;

          const parts = [name, title, company].filter(Boolean);

          setUserSignature(parts.join("\n"));
        }
      } catch (e) {
        console.error("[ci] signature fetch:", e);
      }
    };
    void fetchSignature();
  }, [userId]);

  useEffect(() => {
    const loadClients = async () => {
      setClientsLoading(true);
      try {
        if (demoMode) {
          const realRes = await fetch("/api/client-intelligence/clients", {
            credentials: "same-origin",
          });
          const realData = (await realRes.json()) as { clients?: Client[] };
          if (realData.clients && realData.clients.length > 0) {
            setClients(realData.clients);
            return;
          }
          setClients(DEMO_CLIENTS.map(enrichClientWithRelationshipScore));
          return;
        }
        const res = await fetch("/api/client-intelligence/clients", {
          credentials: "same-origin",
        });
        const data = (await res.json()) as { clients: Client[] };
        setClients(data.clients ?? []);
      } catch (e) {
        console.error("[ci] load clients:", e);
      } finally {
        setClientsLoading(false);
      }
    };
    void loadClients();
  }, [userId, demoMode]);

  const loadHistory = useCallback(
    async (client: Client, period: PeriodOption) => {
      setHistoryLoading(true);
      setGenerations([]);
      try {
        if (demoMode) {
          const demoGens = DEMO_GENERATIONS[client.name] ?? [];
          setGenerations(demoGens);
          setHistoryLoading(false);
          return;
        }
        const params = new URLSearchParams({
          client: client.name,
        });
        if (period.days !== null) {
          const from = new Date();
          from.setDate(from.getDate() - period.days);
          params.set("from", from.toISOString());
        }
        const res = await fetch(
          `/api/client-intelligence/history?${params.toString()}`,
          { credentials: "same-origin" },
        );
        const data = (await res.json()) as { generations: Generation[] };
        setGenerations(data.generations ?? []);
      } catch (e) {
        console.error("[ci] load history:", e);
      } finally {
        setHistoryLoading(false);
      }
    },
    [demoMode],
  );

  const loadSummary = useCallback(
    async (
      client: Client,
      period: PeriodOption,
      forceRefresh = false,
    ) => {
      setSummaryLoading(true);
      setSummaryPersistFailed(false);
      if (forceRefresh) {
        setSummary(null);
      }
      try {
        const body: Record<string, unknown> = {
          clientName: client.name,
        };
        if (period.days !== null) {
          const from = new Date();
          from.setDate(from.getDate() - period.days);
          body.periodFrom = from.toISOString().split("T")[0];
          body.periodTo = new Date().toISOString().split("T")[0];
        }
        if (forceRefresh) {
          body.forceRefresh = true;
        }

        const res = await fetch("/api/client-intelligence/summarise", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as {
          summary?: IntelligenceSummary;
          empty?: boolean;
          error?: string;
          cached?: boolean;
          _persistFailed?: boolean;
        };

        if (!res.ok) {
          console.error("[ci] load summary error:", data.error);
          if (demoMode) {
            const demoSummary = DEMO_INTELLIGENCE[client.name] ?? null;
            setSummary(demoSummary);
            setSummaryEmptyReason(null);
          } else {
            setSummary(null);
            setSummaryEmptyReason(
              "Something went wrong generating this summary. Please try again.",
            );
          }
          setSummaryLoading(false);
          return;
        }

        if (data.empty) {
          if (demoMode) {
            const demoSummary = DEMO_INTELLIGENCE[client.name] ?? null;
            setSummary(demoSummary);
            setSummaryEmptyReason(null);
          } else {
            setSummary(null);
            setSummaryEmptyReason(
              `No reports found for ${client.name} in this period yet. Generate a report for this client first, then Account Intelligence will have data to work with.`,
            );
          }
          setSummaryLoading(false);
          return;
        }

        if (data.summary == null) {
          setSummary(null);
          setSummaryEmptyReason(
            "We couldn't generate a summary for this period - try a different date range or generate a new report for this client.",
          );
          setSummaryLoading(false);
          return;
        }

        setSummaryEmptyReason(null);
        setSummary(data.summary);
        setSummaryPersistFailed(!!data._persistFailed);
        setSummaryLoading(false);
      } catch (e) {
        console.error("[ci] load summary:", e);
        if (demoMode) {
          const demoSummary = DEMO_INTELLIGENCE[client.name] ?? null;
          setSummary(demoSummary);
          setSummaryEmptyReason(null);
        } else {
          setSummary(null);
          setSummaryEmptyReason(
            "Something went wrong generating this summary. Please try again.",
          );
        }
        setSummaryLoading(false);
      }
    },
    [demoMode],
  );

  const loadAllReports = useCallback(async () => {
    setAllReportsLoading(true);
    setAllReports([]);
    try {
      const res = await fetch(
        "/api/client-intelligence/history?limit=200",
        { credentials: "same-origin" },
      );
      const data = (await res.json()) as { generations: Generation[] };
      setAllReports(data.generations ?? []);
    } catch (e) {
      console.error("[ci] load all reports:", e);
    } finally {
      setAllReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showAllReports) {
      void loadAllReports();
    }
  }, [showAllReports, loadAllReports]);

  const handleSelectClient = useCallback(
    (client: Client) => {
      setShowAllReports(false);
      setShowAttention(false);
      setSelectedClient(client);
      setSummary(null);
      setSummaryEmptyReason(null);
      setSelectedGen(null);
      setActiveTab("history");
      void loadHistory(client, selectedPeriod);
    },
    [loadHistory, selectedPeriod],
  );

  useEffect(() => {
    if (!initialClientName || clients.length === 0) return;

    const match = clients.find((c) => c.name === initialClientName);
    if (match) {
      handleSelectClient(match);
      if (initialTab === "summary") {
        setActiveTab("summary");
        void loadSummary(match, selectedPeriod);
      }
    }
  }, [
    initialClientName,
    initialTab,
    clients,
    handleSelectClient,
    loadSummary,
    selectedPeriod,
  ]);

  const loadAttention = useCallback(async () => {
    setAttentionLoading(true);
    try {
      if (demoMode) {
        setAttentionResult(DEMO_ATTENTION);
        setAttentionLoading(false);
        return;
      }
      const res = await fetch("/api/client-intelligence/attention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setAttentionResult(data);
    } catch (e) {
      console.error("[ci] attention:", e);
    } finally {
      setAttentionLoading(false);
    }
  }, [demoMode]);

  const openActionEmail = useCallback(
    async (item: {
      clientName: string;
      issue: string;
      action: string;
      priority: string;
    }) => {
      setActionEmailItem(item);
      setActionEmailTo("");
      setActionEmailSent(false);
      setActionEmailFrom(userEmail ?? "");

      setActionEmailGenerating(true);
      setActionEmailOpen(true);

      try {
        const response = await fetch("/api/anthropic/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1000,
            messages: [
              {
                role: "user",
                content: `You are helping an MSP delivery manager write a professional follow-up email.

Client: ${item.clientName}
Issue: ${item.issue}
Recommended action: ${item.action}
Priority: ${item.priority}

Write a professional, concise email that:
- Opens with just "Hi," (no name, no placeholder)
- References the specific issue directly
- Communicates the urgency appropriate to ${item.priority} priority
- Requests the specific action clearly
- Ends with "Kind regards," on its own line. Do not add any name, role, or signature placeholder — leave it as just "Kind regards," and nothing after it
- Is 3-4 short paragraphs maximum
- Sounds like a delivery manager wrote it, not a robot

Also write a subject line.

Respond in this exact JSON format:
{
  "subject": "subject line here",
  "body": "email body here"
}

No markdown, no preamble, valid JSON only.`,
              },
            ],
          }),
        });

        const data = (await response.json()) as {
          content?: Array<{
            type: string;
            text: string;
          }>;
        };

        const text =
          data.content?.find((b) => b.type === "text")?.text ?? "{}";

        const parsed = JSON.parse(text) as {
          subject?: string;
          body?: string;
        };

        setActionEmailSubject(
          parsed.subject ?? `${item.clientName} — action required`,
        );

        const aiBody =
          parsed.body ??
          `Hi,\n\n` +
            `I wanted to follow up regarding ${item.issue}.\n\n` +
            `${item.action}.\n\n` +
            `Kind regards,`;

        setActionEmailBody(
          userSignature
            ? aiBody.replace(
                /Kind regards,[\s\S]*$/i,
                `Kind regards,\n${userSignature}`,
              )
            : aiBody,
        );
      } catch (e) {
        console.error("[action email]", e);
        setActionEmailSubject(`${item.clientName} — action required`);
        setActionEmailBody(
          `Hi,\n\n` +
            `I wanted to follow up regarding the following:\n\n` +
            `${item.issue}\n\n` +
            `To resolve this: ${item.action}\n\n` +
            `Kind regards,\n` +
            (userSignature || ""),
        );
      } finally {
        setActionEmailGenerating(false);
      }
    },
    [userEmail, userSignature],
  );

  const sendActionEmail = useCallback(async () => {
    if (!actionEmailTo || !actionEmailSubject || !actionEmailBody) return;

    setActionEmailSending(true);
    try {
      const res = await fetch("/api/action-email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          to: actionEmailTo,
          from: actionEmailFrom,
          subject: actionEmailSubject,
          body: actionEmailBody,
          clientName: actionEmailItem?.clientName,
        }),
      });

      if (res.ok) {
        setActionEmailSent(true);
        window.setTimeout(() => {
          setActionEmailOpen(false);
          setActionEmailSent(false);
          setActionEmailItem(null);
        }, 2000);
      }
    } catch (e) {
      console.error("[send action email]", e);
    } finally {
      setActionEmailSending(false);
    }
  }, [
    actionEmailTo,
    actionEmailFrom,
    actionEmailSubject,
    actionEmailBody,
    actionEmailItem,
  ]);

  const handlePeriodChange = useCallback(
    (period: PeriodOption) => {
      setSelectedPeriod(period);
      setSummaryEmptyReason(null);
      if (selectedClient) {
        void loadHistory(selectedClient, period);
        if (activeTab === "summary") {
          void loadSummary(selectedClient, period);
        }
      }
    },
    [selectedClient, activeTab, loadHistory, loadSummary],
  );

  const handleTabChange = useCallback(
    (tab: Tab) => {
      setActiveTab(tab);
      if (tab === "summary" && !summary && selectedClient) {
        void loadSummary(selectedClient, selectedPeriod);
      }
    },
    [summary, selectedClient, selectedPeriod, loadSummary],
  );

  const handleGenerateQbr = useCallback(() => {
    if (!summary || !selectedClient || qbrNavigating) return;
    setQbrNavigating(true);
    onGenerateQbr?.(selectedClient.name, summary);
    window.setTimeout(() => setQbrNavigating(false), 250);
  }, [summary, selectedClient, qbrNavigating, onGenerateQbr]);

  const loadClientBrief = useCallback(
    async (client: Client, forceRefresh = false) => {
      setClientBriefLoading(true);
      setClientBrief(null);
      setClientBriefOpen(true);
      try {
        const res = await fetch("/api/client-intelligence/brief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            clientName: client.name,
            forceRefresh,
          }),
        });
        const data = (await res.json()) as {
          brief?: ClientBrief;
          error?: string;
        };
        if (data.brief) {
          setClientBrief(data.brief);
        }
      } catch (e) {
        console.error("[ci] client brief:", e);
      } finally {
        setClientBriefLoading(false);
      }
    },
    [],
  );

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const getReportTypeLabel = (type: string) => {
    switch (type) {
      case "qbr":
        return "QBR Pack";
      case "internal":
        return "Internal";
      case "note_to_self":
        return "Note";
      default:
        return "Report";
    }
  };

  return (
    <div className="flex h-auto min-h-0 overflow-visible md:h-full md:overflow-hidden">
      <div className="flex w-64 flex-shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="border-b border-[var(--border)] p-4">
          <div className="mb-3 flex items-center gap-2">
            <Brain className="size-4 text-[var(--accent)]" />
            <h2 className="text-[13px] font-semibold text-[var(--text-primary)]">
              Client Intelligence
            </h2>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] py-1.5 pl-7 pr-3 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedClient(null);
              setSummaryEmptyReason(null);
              setShowAllReports(false);
              setShowAttention(true);
              if (!attentionResult && !attentionLoading) {
                void loadAttention();
              }
            }}
            className={cn(
              "mt-2 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-[12px] font-medium transition-all duration-150",
              showAttention
                ? "border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
            )}
          >
            {attentionLoading ? (
              <div className="size-3 flex-shrink-0 animate-spin rounded-full border border-current border-t-transparent" />
            ) : (
              <Brain className="size-3.5 flex-shrink-0" />
            )}
            {attentionLoading ? "Analysing..." : "What needs attention?"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAllReports(!showAllReports);
              setSelectedClient(null);
              setSummaryEmptyReason(null);
              setShowAttention(false);
            }}
            className={cn(
              "mt-2 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-[12px] font-medium transition-all duration-150",
              showAllReports
                ? "border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
            )}
          >
            <History className="size-3.5" />
            All reports
          </button>
          {!clientsLoading && clients.length > 0 && (
            <div className="mt-2 border-b border-[var(--border)] px-3 py-2">
              <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                <span>
                  {clients.filter((c) => c.health === "red").length > 0 && (
                    <span className="mr-2 font-medium text-red-400">
                      {clients.filter((c) => c.health === "red").length} needs
                      attention
                    </span>
                  )}
                  {clients.filter((c) => c.health === "green").length} healthy
                </span>
                <span>
                  {clients.filter((c) => c.daysSinceLastReport > 21).length >
                    0 && (
                    <span className="text-amber-400">
                      {
                        clients.filter((c) => c.daysSinceLastReport > 21)
                          .length
                      }{" "}
                      overdue
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-visible ci-scrollbar md:overflow-y-auto">
          {clientsLoading ? (
            <div className="space-y-2 p-3">
              <p className="px-1 py-2 text-[13px] text-[var(--text-muted)]">
                Loading clients...
              </p>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-lg bg-white/[0.04]"
                />
              ))}
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-[12px] text-[var(--text-muted)]">
                {searchQuery
                  ? "No clients match your search"
                  : "No client history yet. Generate reports to build intelligence."}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5 p-2">
              {filteredClients.map((client) => (
                <button
                  key={client.name}
                  type="button"
                  onClick={() => handleSelectClient(client)}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition-all duration-150",
                    selectedClient?.name === client.name
                      ? "border-[var(--accent)]/20 bg-[var(--accent)]/10"
                      : "border-transparent hover:bg-white/[0.04]",
                  )}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div
                        className={cn(
                          "size-2 flex-shrink-0 rounded-full",
                          client.health === "red"
                            ? "bg-red-500"
                            : client.health === "amber"
                              ? "bg-yellow-500"
                              : "bg-green-500",
                        )}
                      />
                      <span
                        className={cn(
                          "truncate text-[12px] font-medium",
                          selectedClient?.name === client.name
                            ? "text-[var(--accent)]"
                            : "text-[var(--text-primary)]",
                        )}
                      >
                        {client.name}
                      </span>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1.5">
                      {typeof client.relationshipScore === "number" && (
                        <RelationshipScoreCompact
                          score={client.relationshipScore}
                          label={client.relationshipScoreLabel}
                          breakdown={client.relationshipScoreBreakdown}
                        />
                      )}
                      {client.trend === "up" && (
                        <span
                          className="text-[10px] text-amber-400"
                          title="Activity increasing"
                        >
                          ↑
                        </span>
                      )}
                      {client.trend === "down" && (
                        <span
                          className="text-[10px] text-green-400"
                          title="Activity decreasing"
                        >
                          ↓
                        </span>
                      )}
                      <ChevronRight className="size-3 text-[var(--text-muted)]" />
                    </div>
                  </div>

                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {client.generationCount}
                      {client.generationCount === 1 ? " report" : " reports"}
                    </span>
                    {client.recentRiskCount > 0 && (
                      <span className="text-[10px] text-red-400/80">
                        {client.recentRiskCount} in latest report
                      </span>
                    )}
                    {client.hasQbr && (
                      <span className="rounded-full bg-[var(--accent)]/10 px-1.5 py-0.5 text-[9px] font-medium text-[var(--accent)]">
                        QBR
                      </span>
                    )}
                    {client.hasSummary && (
                      <span className="rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[9px] font-medium text-purple-400">
                        Intel
                      </span>
                    )}
                  </div>

                  <div className="text-[10px] text-[var(--text-muted)]">
                    {client.daysSinceLastReport === 0
                      ? "Last report: today"
                      : client.daysSinceLastReport === 1
                        ? "Last report: yesterday"
                        : `Last report: ${client.daysSinceLastReport}d ago`}
                    {client.daysSinceLastReport > 21 && (
                      <span className="ml-1 text-amber-400">· overdue</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {!clientsLoading && (
          <div className="border-t border-[var(--border)] p-3">
            <p className="text-center text-[11px] text-[var(--text-muted)]">
              {clients.length} client{clients.length !== 1 ? "s" : ""} tracked
            </p>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {showAttention ? (
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <div className="flex items-center gap-2">
                <Brain className="size-4 text-[var(--accent)]" />
                <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
                  What needs attention
                </h2>
              </div>
              <button
                type="button"
                onClick={() => void loadAttention()}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[11px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
              >
                <RefreshCw className="size-3" />
                Refresh
              </button>
            </div>

            <div className="flex-1 overflow-visible p-6 md:overflow-y-auto">
              {attentionLoading ? (
                <div className="flex items-center justify-center gap-3 py-16">
                  <div className="size-6 animate-spin rounded-full border-2 border-white/20 border-t-[var(--accent)]" />
                  <p className="text-[13px] text-[var(--text-muted)]">
                    Reviewing your client portfolio...
                  </p>
                </div>
              ) : attentionResult ? (
                <div className="space-y-6">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 [box-shadow:var(--shadow-sm),var(--shadow-inset)]">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Portfolio overview
                    </p>
                    <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
                      {attentionResult.summary}
                    </p>
                  </div>

                  {(attentionResult.items?.length ?? 0) > 0 ? (
                    <div className="space-y-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                        Action items ({attentionResult.items?.length ?? 0})
                      </p>
                      {(() => {
                        const groupedItems = (attentionResult.items ?? []).reduce(
                          (acc, item) => {
                            if (!acc[item.clientName]) {
                              acc[item.clientName] = [];
                            }
                            acc[item.clientName].push(item);
                            return acc;
                          },
                          {} as Record<
                            string,
                            NonNullable<typeof attentionResult.items>
                          >,
                        );

                        return Object.entries(groupedItems).map(([clientName, items]) => {
                          const highestPriority = items.some((i) => i.priority === "high")
                            ? "high"
                            : items.some((i) => i.priority === "medium")
                              ? "medium"
                              : "low";

                          return (
                            <div
                              key={clientName}
                              className={cn(
                                "cursor-pointer rounded-xl border p-4 transition-all duration-150 hover:scale-[1.01]",
                                highestPriority === "high"
                                  ? "border-red-500/20 bg-red-500/[0.06] hover:bg-red-500/10"
                                  : highestPriority === "medium"
                                    ? "border-amber-500/20 bg-amber-500/[0.05] hover:bg-amber-500/10"
                                    : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]",
                              )}
                              onClick={() => {
                                const client = clients.find((c) => c.name === clientName);
                                if (client) {
                                  handleSelectClient(client);
                                }
                              }}
                            >
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={cn(
                                      "size-2 flex-shrink-0 rounded-full",
                                      highestPriority === "high"
                                        ? "bg-red-500"
                                        : highestPriority === "medium"
                                          ? "bg-yellow-500"
                                          : "bg-white/30",
                                    )}
                                  />
                                  <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                                    {clientName}
                                  </span>
                                  <span
                                    className={cn(
                                      "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                                      highestPriority === "high"
                                        ? "bg-red-500/15 text-red-400"
                                        : highestPriority === "medium"
                                          ? "bg-yellow-500/15 text-yellow-400"
                                          : "bg-white/10 text-white/40",
                                    )}
                                  >
                                    {highestPriority}
                                  </span>
                                </div>
                                <ChevronRight className="size-4 flex-shrink-0 text-[var(--text-muted)]" />
                              </div>

                              <div className="space-y-2.5">
                                {items.map((item, i) => (
                                  <div
                                    key={i}
                                    className={cn(
                                      items.length > 1 && "border-l-2 pl-3",
                                      item.priority === "high"
                                        ? "border-red-500/30"
                                        : item.priority === "medium"
                                          ? "border-amber-500/30"
                                          : "border-white/10",
                                    )}
                                  >
                                    <p className="mb-1.5 text-[12px] leading-relaxed text-[var(--text-secondary)]">
                                      {item.issue}
                                    </p>
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="text-[12px] font-medium text-[var(--accent)]">
                                        → {item.action}
                                      </p>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          void openActionEmail({
                                            clientName: item.clientName,
                                            issue: item.issue,
                                            action: item.action,
                                            priority: item.priority,
                                          });
                                        }}
                                        className="flex-shrink-0 flex items-center gap-1 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-2.5 py-1 text-[10px] font-semibold text-[var(--accent)] transition-all hover:bg-[var(--accent)]/20 hover:scale-[1.02]"
                                      >
                                        <Mail className="size-3" />
                                        Take action
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-green-500/10">
                        <CheckCircle2 className="size-5 text-green-400" />
                      </div>
                      <p className="mb-1 text-[14px] font-semibold text-[var(--text-primary)]">
                        All clear
                      </p>
                      <p className="text-[13px] text-[var(--text-muted)]">
                        No urgent action items across your client portfolio
                        right now.
                      </p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        ) : selectedClient ? (
          <>
            <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <div>
                <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
                  {selectedClient.name}
                </h2>
                <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                  {selectedClient.generationCount} reports
                  {selectedClient.hasScheduled
                    ? " · Automated reporting active"
                    : ""}
                </p>
              </div>

              <div className="flex flex-shrink-0 items-center gap-2">
                <button
                  type="button"
                  disabled={clientBriefLoading}
                  onClick={() => {
                    if (selectedClient) void loadClientBrief(selectedClient);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-[11px] font-medium text-violet-300 transition-colors hover:bg-violet-500/15 disabled:opacity-60"
                >
                  {clientBriefLoading ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <MessageSquare className="size-3" />
                  )}
                  Generate client brief
                </button>
                <select
                value={selectedPeriod.label}
                onChange={(e) => {
                  const period =
                    PERIOD_OPTIONS.find((p) => p.label === e.target.value) ??
                    PERIOD_OPTIONS[2];
                  handlePeriodChange(period);
                }}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-[12px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30"
              >
                {PERIOD_OPTIONS.map((p) => (
                  <option key={p.label} value={p.label}>
                    {p.label}
                  </option>
                ))}
              </select>
              </div>
            </div>

            <div className="flex flex-shrink-0 border-b border-[var(--border)] px-6">
              {(["history", "summary"] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleTabChange(tab)}
                  className={cn(
                    "relative mr-6 px-1 py-3 text-[13px] font-medium transition-colors duration-150",
                    activeTab === tab
                      ? "text-[var(--accent)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                  )}
                >
                  {tab === "history" ? "Report History" : "Account Intelligence"}
                  {activeTab === tab && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[var(--accent)]" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-visible md:overflow-y-auto">
              {activeTab === "history" && (
                <div className="p-6">
                  {historyLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-20 animate-pulse rounded-xl bg-white/[0.04]"
                        />
                      ))}
                    </div>
                  ) : generations.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-[13px] text-[var(--text-muted)]">
                        No reports found for this period.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {generations.map((gen) => (
                        <button
                          key={gen.id}
                          type="button"
                          onClick={() => setSelectedGen(gen)}
                          className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-left transition-colors hover:bg-white/[0.02]"
                        >
                          <div className="flex min-w-0 items-start gap-3">
                            <FileText className="mt-0.5 size-4 flex-shrink-0 text-[var(--accent)]" />
                            <div className="min-w-0">
                              <div className="mb-1 flex items-center gap-2">
                                <span className="text-[12px] font-medium text-[var(--text-primary)]">
                                  {formatDate(gen.createdAt)}
                                </span>
                                <span className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                                  {getReportTypeLabel(gen.reportType)}
                                </span>
                                {gen.source === "scheduled" && (
                                  <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">
                                    Automated
                                  </span>
                                )}
                              </div>
                              {gen.summaryPreview && (
                                <p className="line-clamp-2 text-[12px] text-[var(--text-muted)]">
                                  {gen.summaryPreview}
                                  {gen.summaryPreview.length >= 150
                                    ? "..."
                                    : ""}
                                </p>
                              )}
                              <div className="mt-1.5 flex items-center gap-3">
                                {gen.actionCount > 0 && (
                                  <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                                    <Zap className="size-2.5" />
                                    {gen.actionCount}{" "}
                                    {gen.actionCount === 1
                                      ? "action"
                                      : "actions"}
                                  </span>
                                )}
                                {gen.riskCount > 0 && (
                                  <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                                    <AlertTriangle className="size-2.5" />
                                    {gen.riskCount}{" "}
                                    {gen.riskCount === 1 ? "risk" : "risks"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="ml-2 size-4 flex-shrink-0 text-[var(--text-muted)]" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "summary" && (
                <div className="p-6">
                  {typeof selectedClient.relationshipScore === "number" &&
                    selectedClient.relationshipScoreLabel && (
                      <div className="mb-5 flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 sm:flex-row sm:items-center sm:justify-between [box-shadow:var(--shadow-sm),var(--shadow-inset)]">
                        <div className="min-w-0">
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                            Relationship score
                          </p>
                          <p className="max-w-md text-[12px] leading-relaxed text-[var(--text-secondary)]">
                            Composite health from report cadence, open risks,
                            recurring patterns, and reporting infrastructure.
                            Hover the score for a breakdown.
                          </p>
                        </div>
                        <RelationshipScoreRing
                          score={selectedClient.relationshipScore}
                          label={selectedClient.relationshipScoreLabel}
                          breakdown={selectedClient.relationshipScoreBreakdown}
                        />
                      </div>
                    )}
                  {summaryLoading ? (
                    <div className="space-y-4">
                      <p className="text-[13px] text-[var(--text-muted)]">
                        Loading account intelligence...
                      </p>
                      <div className="h-6 w-48 animate-pulse rounded bg-white/[0.06]" />
                      <div className="h-24 animate-pulse rounded-xl bg-white/[0.04]" />
                      <div className="h-32 animate-pulse rounded-xl bg-white/[0.04]" />
                    </div>
                  ) : !summary ? (
                    summaryEmptyReason ? (
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-6 py-10 text-center">
                        <AlertTriangle className="mx-auto mb-4 size-10 text-amber-400/80" />
                        <h3 className="mb-2 text-[14px] font-semibold text-[var(--text-primary)]">
                          Nothing to summarise yet
                        </h3>
                        <p className="mx-auto mb-5 max-w-md text-[12px] leading-relaxed text-amber-100/80">
                          {summaryEmptyReason}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          {onNavigateToGenerate ? (
                            <button
                              type="button"
                              onClick={onNavigateToGenerate}
                              className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-[#06091a] transition-all hover:scale-[1.02]"
                            >
                              <FileText className="size-4" />
                              Generate a report
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() =>
                              void loadSummary(selectedClient, selectedPeriod, true)
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                          >
                            <RefreshCw className="size-4" />
                            Try again
                          </button>
                        </div>
                      </div>
                    ) : (
                    <div className="py-12 text-center">
                      <Brain className="mx-auto mb-4 size-10 text-[var(--accent)] opacity-40" />
                      <h3 className="mb-2 text-[14px] font-semibold text-[var(--text-primary)]">
                        Generate account intelligence
                      </h3>
                      <p className="mx-auto mb-4 max-w-xs text-[12px] text-[var(--text-muted)]">
                        Handover will analyse all reports for{" "}
                        {selectedClient.name} and generate an account summary,
                        recurring issues, key achievements, and QBR talking
                        points.
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          void loadSummary(selectedClient, selectedPeriod)
                        }
                        className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-[#06091a] transition-all hover:scale-[1.02]"
                      >
                        <Brain className="size-4" />
                        Generate intelligence
                      </button>
                    </div>
                    )
                  ) : (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
                          Account Intelligence
                        </h3>
                        <div className="flex items-center gap-2">
                          {summary && (
                            <button
                              type="button"
                              disabled={qbrNavigating}
                              onClick={handleGenerateQbr}
                              className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[11px] font-semibold text-[#06091a] transition-all hover:scale-[1.02] disabled:cursor-wait disabled:opacity-70"
                            >
                              {qbrNavigating ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <LayoutTemplate className="size-3" />
                              )}
                              Generate QBR
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              void loadSummary(
                                selectedClient,
                                selectedPeriod,
                                true,
                              )
                            }
                            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[11px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
                          >
                            <RefreshCw className="size-3" />
                            Regenerate
                          </button>
                        </div>
                      </div>

                      {summaryPersistFailed && (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                          <p className="text-[12px] leading-relaxed text-amber-100/80">
                            This summary couldn&apos;t be saved - it may not appear
                            in your overview until you try again.
                          </p>
                        </div>
                      )}

                      {summary.relationship_health && (
                        <div
                          className={cn(
                            "flex items-start gap-3 rounded-xl border p-4",
                            HEALTH_COLOURS[summary.relationship_health].bg,
                            HEALTH_COLOURS[summary.relationship_health].border,
                          )}
                        >
                          <div
                            className={cn(
                              "mt-1 size-2.5 flex-shrink-0 rounded-full",
                              HEALTH_COLOURS[summary.relationship_health].dot,
                            )}
                          />
                          <div>
                            <p
                              className={cn(
                                "mb-1 text-[12px] font-semibold uppercase tracking-wide",
                                HEALTH_COLOURS[summary.relationship_health]
                                  .text,
                              )}
                            >
                              {summary.relationship_health
                                .charAt(0)
                                .toUpperCase() +
                                summary.relationship_health.slice(1)}{" "}
                              — Relationship Health
                            </p>
                            <p className="text-[12px] text-[var(--text-secondary)]">
                              {summary.health_justification}
                            </p>
                          </div>
                        </div>
                      )}

                      {summary.account_narrative && (
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 [box-shadow:var(--shadow-sm),var(--shadow-inset)]">
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                            Account summary
                          </p>
                          <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
                            {summary.account_narrative}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {summary.key_achievements?.length > 0 && (
                          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                            <div className="mb-3 flex items-center gap-2">
                              <CheckCircle2 className="size-3.5 text-green-400" />
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                Key achievements
                              </p>
                            </div>
                            <ul className="space-y-2">
                              {summary.key_achievements.map((item, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 text-[12px] text-[var(--text-secondary)]"
                                >
                                  <span className="flex-shrink-0 text-green-400">
                                    ·
                                  </span>
                                  {item
                                    .replace(/^[·•\-\*]\s*/, "")
                                    .replace(/^\d+[\.\)]\s*/, "")}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {summary.recurring_issues?.length > 0 && (
                          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                            <div className="mb-3 flex items-center gap-2">
                              <Clock className="size-3.5 text-yellow-400" />
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                Recurring issues
                              </p>
                            </div>
                            <RecurringIssuesList issues={summary.recurring_issues} />
                          </div>
                        )}

                        {summary.open_risks?.length > 0 && (
                          <div className="relative">
                            {openRisksHighlight ? (
                              <div
                                className="absolute bottom-full left-0 right-0 z-10 mb-2"
                                role="status"
                              >
                                <div className="relative rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 shadow-[var(--shadow-sm)]">
                                  <p className="text-[12px] leading-snug text-[var(--text-secondary)]">
                                    These risks were identified from your recent reports
                                    and haven&apos;t been resolved yet — review them below
                                    before they affect delivery.
                                  </p>
                                  <span
                                    aria-hidden
                                    className="absolute -bottom-1.5 left-6 size-2.5 rotate-45 border border-[var(--border)] border-t-0 border-l-0 bg-[var(--surface-1)]"
                                  />
                                </div>
                              </div>
                            ) : null}
                            <div
                              id="ci-open-risks-section"
                              className={cn(
                                "rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4",
                                openRisksHighlight &&
                                  "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-primary)] animate-pulse",
                              )}
                            >
                              <div className="mb-3 flex items-center gap-2">
                                <AlertTriangle className="size-3.5 text-red-400" />
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                  Open risks · AI analysis, {selectedPeriod.label}
                                </p>
                              </div>
                              <OpenRisksList risks={summary.open_risks} />
                            </div>
                          </div>
                        )}

                        {summary.recommended_actions?.length > 0 && (
                          <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-4">
                            <div className="mb-3 flex items-center gap-2">
                              <Zap className="size-3.5 text-[var(--accent)]" />
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                                Recommended actions
                              </p>
                            </div>
                            <ul className="space-y-2">
                              {summary.recommended_actions.map((item, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 text-[12px] text-[var(--text-secondary)]"
                                >
                                  <span className="flex-shrink-0 text-[var(--accent)]">
                                    ·
                                  </span>
                                  {item
                                    .replace(/^[·•\-\*]\s*/, "")
                                    .replace(/^\d+[\.\)]\s*/, "")}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {summary.qbr_talking_points?.length > 0 && (
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <BarChart2 className="size-3.5 text-[var(--accent)]" />
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                              QBR talking points
                            </p>
                          </div>
                          <ol className="space-y-2">
                            {summary.qbr_talking_points.map((item, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-3 text-[12px] text-[var(--text-secondary)]"
                              >
                                <span className="flex size-4 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[10px] font-bold text-[var(--accent)]">
                                  {i + 1}
                                </span>
                                {item
                                  .replace(/^[·•\-\*]\s*/, "")
                                  .replace(/^\d+[\.\)]\s*/, "")}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : showAllReports ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <div>
                <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
                  All reports
                </h2>
                <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                  Chronological history across all clients
                </p>
              </div>
            </div>
            <div className="flex-1 overflow-visible p-6 md:overflow-y-auto">
              {allReportsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-20 animate-pulse rounded-xl bg-white/[0.04]"
                    />
                  ))}
                </div>
              ) : allReports.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-[13px] text-[var(--text-muted)]">
                    No reports found yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {allReports.map((gen) => (
                    <button
                      key={gen.id}
                      type="button"
                      onClick={() => setSelectedGen(gen)}
                      className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-left transition-colors hover:bg-white/[0.02]"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <FileText className="mt-0.5 size-4 flex-shrink-0 text-[var(--accent)]" />
                        <div className="min-w-0">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="text-[12px] font-medium text-[var(--text-primary)]">
                              {formatDate(gen.createdAt)}
                            </span>
                            {gen.clientName ? (
                              <span className="truncate text-[11px] text-[var(--text-muted)]">
                                {gen.clientName}
                              </span>
                            ) : null}
                            <span className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                              {getReportTypeLabel(gen.reportType)}
                            </span>
                          </div>
                          {gen.summaryPreview ? (
                            <p className="line-clamp-2 text-[12px] text-[var(--text-muted)]">
                              {gen.summaryPreview}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <ChevronRight className="ml-2 size-4 flex-shrink-0 text-[var(--text-muted)]" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="max-w-sm text-center">
              <Brain className="mx-auto mb-4 size-12 text-[var(--accent)] opacity-40" />
              <h3 className="mb-2 text-[15px] font-semibold text-[var(--text-primary)]">
                {clients.length > 0 ? "Select a client" : "No client history yet"}
              </h3>
              <p className="mb-4 text-[13px] text-[var(--text-muted)]">
                {clients.length > 0
                  ? "Select a client from the left to see their full report history, account intelligence, and what needs attention."
                  : "Generate your first report for a client and their history will appear here automatically."}
              </p>
              {clients.length === 0 && onNavigateToGenerate ? (
                <button
                  type="button"
                  onClick={onNavigateToGenerate}
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[12px] font-semibold text-[#06091a] transition-all hover:scale-[1.02]"
                >
                  Generate first report →
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {selectedGen ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/60 p-4 backdrop-blur-sm md:overscroll-auto md:p-8"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedGen(null);
          }}
        >
          <div className="relative my-4 w-full max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <div>
                <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                  {formatDate(selectedGen.createdAt)}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                  {getReportTypeLabel(selectedGen.reportType)}
                  {selectedGen.clientName || selectedClient?.name
                    ? ` · ${selectedGen.clientName ?? selectedClient?.name}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGen(null)}
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              {typeof selectedGen.outputJson.summary === "string" &&
                selectedGen.outputJson.summary.length > 0 && (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Summary
                    </p>
                    <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
                      {String(selectedGen.outputJson.summary)}
                    </p>
                  </div>
                )}

              {Array.isArray(selectedGen.outputJson?.actions) &&
                (selectedGen.outputJson.actions as unknown[]).length > 0 && (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Actions (
                      {(selectedGen.outputJson.actions as unknown[]).length})
                    </p>
                    <ul className="space-y-2">
                      {(
                        selectedGen.outputJson.actions as Record<
                          string,
                          unknown
                        >[]
                      ).map((a, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-[12px] text-[var(--text-secondary)]"
                        >
                          <span className="mt-0.5 flex-shrink-0 font-medium text-[var(--accent)]">
                            {i + 1}.
                          </span>
                          <span>
                            {String(a.task ?? "")}
                            {a.suggested_owner ? (
                              <span className="ml-2 text-[var(--text-muted)]">
                                — {String(a.suggested_owner)}
                              </span>
                            ) : null}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {Array.isArray(selectedGen.outputJson?.risks) &&
                (selectedGen.outputJson.risks as unknown[]).length > 0 && (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Risks (
                      {(selectedGen.outputJson.risks as unknown[]).length})
                    </p>
                    <ul className="space-y-2">
                      {(
                        selectedGen.outputJson.risks as Record<string, unknown>[]
                      ).map((r, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-[12px] text-[var(--text-secondary)]"
                        >
                          <AlertTriangle className="mt-0.5 size-3.5 flex-shrink-0 text-yellow-400" />
                          <span>
                            {String(r.title ?? r.description ?? "")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          </div>
        </div>
      ) : null}

      {clientBriefOpen && selectedClient ? (
        <ClientBriefModal
          clientName={selectedClient.name}
          brief={clientBrief}
          loading={clientBriefLoading}
          onClose={() => {
            setClientBriefOpen(false);
            setClientBrief(null);
          }}
          onRegenerate={() => void loadClientBrief(selectedClient, true)}
        />
      ) : null}

      {actionEmailOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setActionEmailOpen(false);
            }
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <div>
                <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
                  Send email
                </h3>
                {actionEmailItem && (
                  <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                    Re: {actionEmailItem.clientName}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActionEmailOpen(false)}
                className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3 p-5">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-[var(--text-muted)]">
                  From
                </label>
                <input
                  type="email"
                  value={actionEmailFrom}
                  onChange={(e) => setActionEmailFrom(e.target.value)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-[12px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-[var(--text-muted)]">
                  To
                </label>
                <input
                  type="email"
                  value={actionEmailTo}
                  onChange={(e) => setActionEmailTo(e.target.value)}
                  placeholder="contact@client.com"
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-[var(--text-muted)]">
                  Subject
                </label>
                {actionEmailGenerating ? (
                  <div className="flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3">
                    <Loader2 className="size-3 animate-spin text-[var(--accent)]" />
                    <span className="text-[12px] text-[var(--text-muted)]">
                      Generating...
                    </span>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={actionEmailSubject}
                    onChange={(e) => setActionEmailSubject(e.target.value)}
                    className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-[12px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30"
                  />
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-[var(--text-muted)]">
                  Message
                </label>
                {actionEmailGenerating ? (
                  <div className="flex h-32 items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
                    <Loader2 className="size-4 animate-spin text-[var(--accent)]" />
                    <span className="text-[12px] text-[var(--text-muted)]">
                      Writing email...
                    </span>
                  </div>
                ) : (
                  <textarea
                    value={actionEmailBody}
                    onChange={(e) => setActionEmailBody(e.target.value)}
                    rows={8}
                    className="resize-none rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-[12px] text-[var(--text-primary)] leading-relaxed focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-4">
              <button
                type="button"
                onClick={() => setActionEmailOpen(false)}
                className="text-[12px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                Cancel
              </button>

              {actionEmailSent ? (
                <div className="flex items-center gap-2 text-[12px] font-medium text-green-400">
                  <Check className="size-4" />
                  Sent
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => void sendActionEmail()}
                  disabled={
                    !actionEmailTo ||
                    !actionEmailSubject ||
                    !actionEmailBody ||
                    actionEmailSending ||
                    actionEmailGenerating
                  }
                  className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-[12px] font-semibold text-[#06091a] transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100"
                >
                  {actionEmailSending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Send className="size-3.5" />
                  )}
                  {actionEmailSending ? "Sending..." : "Send email →"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
