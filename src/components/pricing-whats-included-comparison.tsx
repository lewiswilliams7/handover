"use client";

import type { ReactNode } from "react";
import { Clock } from "lucide-react";

import { cn } from "@/lib/utils";

type PlanKey = "professional" | "team" | "enterprise";

const PLAN_HEADER_CLASS: Record<PlanKey, string> = {
  professional: "text-[11px] font-medium uppercase tracking-[0.12em] text-white/55",
  team: "text-[11px] font-medium uppercase tracking-[0.12em] text-cyan-300",
  enterprise: "text-[11px] font-medium uppercase tracking-[0.12em] text-white/55",
};

const TEAM_CELL_CLASS =
  "border-b border-[var(--border-subtle)] bg-white/[0.025] px-3 py-3.5 text-center align-middle border-l border-r border-white/[0.06]";

type Cell =
  | { kind: "tick" }
  | { kind: "cross" }
  | { kind: "text"; value: string }
  | { kind: "tickSub"; sub: string }
  | { kind: "comingSoon" };

type RowDef = {
  id: string;
  label: ReactNode;
  professional: Cell;
  team: Cell;
  enterprise: Cell;
};

/**
 * Rows ordered for scanability: all plans first, then Team+Enterprise, then Enterprise-only.
 * Within each band, order matches the previous product list order.
 */
const ROWS: RowDef[] = [
  {
    id: "psa",
    label: "HaloPSA + ConnectWise Integration",
    professional: { kind: "tickSub", sub: "One PSA" },
    team: { kind: "tickSub", sub: "Both PSAs" },
    enterprise: { kind: "tickSub", sub: "Both PSAs" },
  },
  {
    id: "custom-field-mapping",
    label: (
      <span title="Map PSA custom fields to specific report outputs">
        Custom Field Mapping
      </span>
    ),
    professional: { kind: "tick" },
    team: { kind: "tick" },
    enterprise: { kind: "tick" },
  },
  {
    id: "push",
    label: "Push Report Notes Back to PSA",
    professional: { kind: "text", value: "Unlimited" },
    team: { kind: "text", value: "Unlimited" },
    enterprise: { kind: "text", value: "Unlimited" },
  },
  {
    id: "generations",
    label: "Generations Per Month",
    professional: { kind: "text", value: "200" },
    team: { kind: "text", value: "200/seat pooled" },
    enterprise: { kind: "text", value: "Unlimited" },
  },
  {
    id: "scheduled",
    label: "Automated Scheduled Report Emails",
    professional: { kind: "text", value: "3/month" },
    team: { kind: "text", value: "Unlimited" },
    enterprise: { kind: "text", value: "Unlimited" },
  },
  {
    id: "export",
    label: "Export All Report Outputs",
    professional: { kind: "tick" },
    team: { kind: "tick" },
    enterprise: { kind: "tick" },
  },
  {
    id: "excel-pack",
    label: "Excel Report Pack (17 sheets)",
    professional: { kind: "tick" },
    team: { kind: "tick" },
    enterprise: { kind: "tick" },
  },
  {
    id: "ppt-pdf-export",
    label: "PowerPoint and PDF Export",
    professional: { kind: "cross" },
    team: { kind: "tick" },
    enterprise: { kind: "tick" },
  },
  {
    id: "qbr-pack",
    label: "QBR Pack Generator",
    professional: { kind: "text", value: "1 per month" },
    team: { kind: "text", value: "3 per month" },
    enterprise: { kind: "text", value: "Unlimited" },
  },
  {
    id: "scheduled-qbr",
    label: "Scheduled QBR Packs",
    professional: { kind: "cross" },
    team: { kind: "tick" },
    enterprise: { kind: "tick" },
  },
  {
    id: "delivery-health",
    label: "Delivery Health Dashboard",
    professional: { kind: "text", value: "Full" },
    team: { kind: "text", value: "Full" },
    enterprise: { kind: "text", value: "Full" },
  },
  {
    id: "report-history",
    label: "Report History",
    professional: { kind: "tick" },
    team: { kind: "tick" },
    enterprise: { kind: "tick" },
  },
  {
    id: "ticket-panel",
    label: "Expandable Ticket and Project Detail View",
    professional: { kind: "tick" },
    team: { kind: "tick" },
    enterprise: { kind: "tick" },
  },
  {
    id: "email-send",
    label: "One-Click Email Send to Client",
    professional: { kind: "tick" },
    team: { kind: "tick" },
    enterprise: { kind: "tick" },
  },
  {
    id: "overdue-ticket-chaser",
    label: (
      <span title="Automatically generate internal chase notes for overdue tickets, @mentioning the assigned engineer directly in your PSA.">
        Overdue Ticket Chaser
      </span>
    ),
    professional: { kind: "tick" },
    team: { kind: "tick" },
    enterprise: { kind: "tick" },
  },
  {
    id: "branding",
    label: "Custom Branding on All Outputs",
    professional: { kind: "tick" },
    team: { kind: "tick" },
    enterprise: { kind: "tick" },
  },
  {
    id: "white-label",
    label: "White Label Mode",
    professional: { kind: "cross" },
    team: { kind: "tick" },
    enterprise: { kind: "tick" },
  },
  {
    id: "slack-teams",
    label: "Slack and Teams Notifications",
    professional: { kind: "tick" },
    team: { kind: "tick" },
    enterprise: { kind: "tick" },
  },
  {
    id: "shared-psa",
    label: "Shared PSA Connection (Admin Managed)",
    professional: { kind: "cross" },
    team: { kind: "tick" },
    enterprise: { kind: "tick" },
  },
  {
    id: "zapier",
    label: "Zapier Integration",
    professional: { kind: "comingSoon" },
    team: { kind: "comingSoon" },
    enterprise: { kind: "comingSoon" },
  },
  {
    id: "writing-style",
    label: (
      <span className="inline-flex flex-wrap items-center gap-2">
        <span>Custom Writing Style Per Member</span>
        <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
          Team+
        </span>
      </span>
    ),
    professional: { kind: "cross" },
    team: { kind: "tick" },
    enterprise: { kind: "tick" },
  },
  {
    id: "team-mgmt",
    label: "Team Management and Invites",
    professional: { kind: "cross" },
    team: { kind: "tick" },
    enterprise: { kind: "tick" },
  },
  {
    id: "team-seat-overage",
    label: "Extra Seats",
    professional: { kind: "cross" },
    team: { kind: "text", value: "£20/mo or £192/yr each" },
    enterprise: { kind: "tick" },
  },
  {
    id: "client-portal",
    label: "Client Portal with Branded Login",
    professional: { kind: "cross" },
    team: { kind: "cross" },
    enterprise: { kind: "text", value: "Beta" },
  },
  {
    id: "custom-domain",
    label: "Custom Domain",
    professional: { kind: "cross" },
    team: { kind: "cross" },
    enterprise: { kind: "comingSoon" },
  },
  {
    id: "partner-multi",
    label: "Partner and Reseller Multi-Tenancy",
    professional: { kind: "cross" },
    team: { kind: "cross" },
    enterprise: { kind: "comingSoon" },
  },
  {
    id: "dedicated-am",
    label: "Dedicated Account Manager",
    professional: { kind: "cross" },
    team: { kind: "cross" },
    enterprise: { kind: "tick" },
  },
  {
    id: "onboarding",
    label: "Onboarding Call Included",
    professional: { kind: "cross" },
    team: { kind: "cross" },
    enterprise: { kind: "tick" },
  },
  {
    id: "sla",
    label: "SLA Guarantee",
    professional: { kind: "cross" },
    team: { kind: "cross" },
    enterprise: { kind: "tick" },
  },
  {
    id: "custom-contract",
    label: "Custom Contract",
    professional: { kind: "cross" },
    team: { kind: "cross" },
    enterprise: { kind: "tick" },
  },
];

function CyanCheck({ label }: { label?: string }) {
  return (
    <svg
      className="mx-auto size-[18px] shrink-0 text-cyan-400"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden={!label}
      aria-label={label}
    >
      <path
        d="M5 10l3.5 3.5L15 7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlanCell({ cell }: { plan: PlanKey; cell: Cell }) {
  if (cell.kind === "tick") {
    return <CyanCheck label="Yes" />;
  }
  if (cell.kind === "tickSub") {
    return (
      <span className="mx-auto flex flex-col items-center justify-center gap-0.5 text-center">
        <CyanCheck label="Included" />
        <span className="max-w-[5.5rem] text-[14px] leading-tight text-white/85 tabular-nums">
          {cell.sub}
        </span>
      </span>
    );
  }
  if (cell.kind === "cross") {
    return <span className="text-white/25">—</span>;
  }
  if (cell.kind === "comingSoon") {
    return (
      <span className="mx-auto inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-white/60">
        <Clock className="size-3 shrink-0" strokeWidth={2.5} aria-hidden />
        Coming Soon
      </span>
    );
  }
  return (
    <span className="block text-center text-[14px] text-white/85 tabular-nums">{cell.value}</span>
  );
}

export function PricingWhatsIncludedComparison({
  headingId = "pricing-whats-included",
  className,
}: {
  headingId?: string;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      <h2
        id={headingId}
        className="border-l-4 border-[var(--accent)] pl-4 text-xl font-bold text-[var(--text-primary)] md:text-2xl"
      >
        What&apos;s included
      </h2>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Compare plans at a glance. Limits apply per billing workspace unless noted.
      </p>
      <p className="mb-2 text-[12px] text-white/40 sm:hidden">← Scroll to see all plans</p>
      <div className="mt-6 w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:overflow-x-clip sm:px-0">
        <div className="rounded-[var(--radius)] border border-[var(--border)] shadow-sm">
        <table className="w-full min-w-[600px] border-separate border-spacing-0 text-sm">
          <colgroup>
            <col style={{ width: "40%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "20%" }} />
          </colgroup>
          <thead>
            <tr className="bg-[var(--bg-secondary)] pb-4">
              <th className="sticky top-16 z-30 min-h-[3.25rem] border-b border-[var(--border)] bg-[var(--bg-secondary)] px-3 pt-4 pb-4 text-left align-middle text-[13px] font-bold text-[var(--text-primary)] shadow-[inset_0_-1px_0_0_var(--border)]">
                Feature
              </th>
              <th
                className={cn(
                  "sticky top-16 z-30 min-h-[3.25rem] border-b border-[var(--border)] bg-[var(--bg-secondary)] px-3 pt-4 pb-4 text-center align-middle shadow-[inset_0_-1px_0_0_var(--border)]",
                  PLAN_HEADER_CLASS.professional,
                )}
              >
                Professional
              </th>
              <th
                className={cn(
                  "sticky top-16 z-30 min-h-[3.25rem] border-b border-[var(--border)] bg-white/[0.025] px-3 pt-4 pb-4 text-center align-middle shadow-[inset_0_-1px_0_0_var(--border)] border-l border-r border-white/[0.06]",
                  PLAN_HEADER_CLASS.team,
                )}
              >
                Team
              </th>
              <th
                className={cn(
                  "sticky top-16 z-30 min-h-[3.25rem] border-b border-[var(--border)] bg-[var(--bg-secondary)] px-3 pt-4 pb-4 text-center align-middle shadow-[inset_0_-1px_0_0_var(--border)]",
                  PLAN_HEADER_CLASS.enterprise,
                )}
              >
                Enterprise
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Spacer row to clear sticky header */}
            <tr aria-hidden className="pointer-events-none select-none">
              <td className="h-4 border-none p-0" colSpan={4} />
            </tr>
            {ROWS.map((row, rowIndex) => (
              <tr
                key={row.id}
                className={
                  rowIndex % 2 === 1
                    ? "bg-[var(--bg-secondary)]/45 hover:bg-[var(--bg-secondary)]/70"
                    : "bg-[var(--bg-primary)] hover:bg-slate-50/90 dark:hover:bg-slate-800/40"
                }
              >
                <td
                  className="border-b border-[var(--border-subtle)] px-3 py-3.5 text-left align-middle text-[13px] font-medium leading-relaxed text-[var(--text-primary)]"
                >
                  {row.label}
                </td>
                <td className="border-b border-[var(--border-subtle)] px-3 py-3.5 text-center align-middle">
                  <PlanCell plan="professional" cell={row.professional} />
                </td>
                <td className={TEAM_CELL_CLASS}>
                  <PlanCell plan="team" cell={row.team} />
                </td>
                <td className="border-b border-[var(--border-subtle)] px-3 py-3.5 text-center align-middle">
                  <PlanCell plan="enterprise" cell={row.enterprise} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
