"use client";

import type { ReactNode } from "react";
import { Check, Clock, X } from "lucide-react";

import { cn } from "@/lib/utils";

const PLAN_COL = {
  professional: "text-[#2563EB]",
  team: "text-[#7C3AED]",
  enterprise: "text-[#C9A84C]",
} as const;

type PlanKey = keyof typeof PLAN_COL;

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
    professional: { kind: "cross" },
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
        <span
          className="rounded-full border border-[#7C3AED]/45 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#5b21b6] dark:border-violet-400/40 dark:text-violet-200"
          style={{ background: "rgba(124, 58, 237, 0.14)" }}
        >
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
    enterprise: { kind: "comingSoon" },
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

function PlanCell({ plan, cell }: { plan: PlanKey; cell: Cell }) {
  const colour = PLAN_COL[plan];
  if (cell.kind === "tick") {
    return (
      <span className={cn("mx-auto flex size-5 items-center justify-center", colour)}>
        <Check className="size-4" strokeWidth={2.5} aria-label="Yes" />
      </span>
    );
  }
  if (cell.kind === "tickSub") {
    return (
      <span className={cn("mx-auto flex flex-col items-center justify-center gap-0.5 text-center", colour)}>
        <Check className="size-4 shrink-0" strokeWidth={2.5} aria-label="Included" />
        <span className="max-w-[5.5rem] text-[11px] font-semibold leading-tight">{cell.sub}</span>
      </span>
    );
  }
  if (cell.kind === "cross") {
    return (
      <span className="mx-auto flex size-5 items-center justify-center text-[var(--text-muted)]">
        <X className="size-4" strokeWidth={2.25} aria-label="No" />
      </span>
    );
  }
  if (cell.kind === "comingSoon") {
    return (
      <span className="mx-auto inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-950 dark:bg-amber-950/45 dark:text-amber-50">
        <Clock className="size-3 shrink-0" strokeWidth={2.5} aria-hidden />
        Coming Soon
      </span>
    );
  }
  return (
    <span className={cn("block text-center text-[13px] font-semibold", colour)}>{cell.value}</span>
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
      <div className="mt-6 space-y-3 overflow-x-clip rounded-[var(--radius)] border border-[var(--border)] shadow-sm">
        <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
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
                className="sticky top-16 z-30 min-h-[3.25rem] border-b border-[var(--border)] px-3 pt-4 pb-4 text-center align-middle text-xs font-bold uppercase tracking-wide text-white shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.08)]"
                style={{ background: "#2563EB" }}
              >
                Professional
              </th>
              <th
                className="sticky top-16 z-30 min-h-[3.25rem] border-b border-[var(--border)] px-3 pt-4 pb-4 text-center align-middle text-xs font-bold uppercase tracking-wide text-white shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.08)]"
                style={{ background: "#7C3AED" }}
              >
                Team
              </th>
              <th
                className="sticky top-16 z-30 min-h-[3.25rem] border-b border-[var(--border)] px-3 pt-4 pb-4 text-center align-middle text-xs font-bold uppercase tracking-wide text-[#1a1508] shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)]"
                style={{ background: "#C9A84C" }}
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
                <td
                  className="border-b border-[var(--border-subtle)] px-3 py-3.5 text-center align-middle"
                  style={{ background: "rgba(37, 99, 235, 0.07)" }}
                >
                  <PlanCell plan="professional" cell={row.professional} />
                </td>
                <td
                  className="border-b border-[var(--border-subtle)] px-3 py-3.5 text-center align-middle"
                  style={{ background: "rgba(124, 58, 237, 0.08)" }}
                >
                  <PlanCell plan="team" cell={row.team} />
                </td>
                <td
                  className="border-b border-[var(--border-subtle)] px-3 py-3.5 text-center align-middle"
                  style={{ background: "rgba(201, 168, 76, 0.12)" }}
                >
                  <PlanCell plan="enterprise" cell={row.enterprise} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
