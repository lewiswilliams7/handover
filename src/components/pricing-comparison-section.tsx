"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Check, X } from "lucide-react";

import { ScrollRevealItem } from "@/components/scroll-reveal-item";

function CellNo() {
  return <X className="mx-auto size-5 text-red-500" strokeWidth={2.5} aria-label="No" />;
}

function CellYes() {
  return <Check className="mx-auto size-5 text-emerald-500" strokeWidth={2.5} aria-label="Yes" />;
}

function CellWarn() {
  return (
    <span className="inline-flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400">
      <AlertTriangle className="size-5 shrink-0" aria-hidden />
      <span className="sr-only">Partial</span>
    </span>
  );
}

const rows: {
  feature: string;
  manual: ReactNode;
  genericAi: ReactNode;
  handover: ReactNode;
}[] = [
  {
    feature: "HaloPSA + ConnectWise integration",
    manual: <CellNo />,
    genericAi: <CellNo />,
    handover: <CellYes />,
  },
  {
    feature: "Push outputs to tickets",
    manual: <CellNo />,
    genericAi: <CellNo />,
    handover: <CellYes />,
  },
  {
    feature: "Scheduled weekly reports",
    manual: <CellNo />,
    genericAi: <CellNo />,
    handover: <CellYes />,
  },
  {
    feature: "Sounds like a real PM wrote it",
    manual: <CellNo />,
    genericAi: <CellWarn />,
    handover: <CellYes />,
  },
  {
    feature: "Time to generate",
    manual: <span className="text-sm font-medium text-[var(--text-primary)]">45+ mins</span>,
    genericAi: <span className="text-sm font-medium text-[var(--text-primary)]">10 mins</span>,
    handover: <span className="text-sm font-semibold text-[var(--accent)]">30 secs</span>,
  },
  {
    feature: "Works from your existing data",
    manual: <CellYes />,
    genericAi: <CellNo />,
    handover: <CellYes />,
  },
  {
    feature: "No copy-pasting required",
    manual: <CellNo />,
    genericAi: <CellNo />,
    handover: <CellYes />,
  },
];

export function PricingComparisonSection() {
  return (
    <section
      className="relative z-[1] bg-[var(--bg-secondary)] px-6 py-12 md:px-8 md:py-20"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <div className="mx-auto w-full max-w-[1100px]">
        <ScrollRevealItem index={0}>
          <h2 className="border-l-4 border-[var(--accent)] pl-4 text-2xl font-bold tracking-tight text-[var(--text-primary)] md:text-[28px]">
            Why Handover?
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)] md:text-base">
            How Handover compares
          </p>
        </ScrollRevealItem>

        <ScrollRevealItem index={1} className="mt-8 block">
          <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] shadow-md marketing-card-interactive">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="bg-[var(--bg-secondary)]">
                <th className="border-b border-[var(--border)] px-4 py-3 text-left font-semibold text-[var(--text-primary)]">
                  Feature
                </th>
                <th className="border-b border-[var(--border)] px-4 py-3 text-center font-medium text-[var(--text-muted)]">
                  Manual
                </th>
                <th className="border-b border-[var(--border)] px-4 py-3 text-center font-medium text-[var(--text-muted)]">
                  Generic AI
                </th>
                <th
                  className="border-b border-[var(--border)] px-4 py-3 text-center font-bold text-[var(--accent)]"
                  style={{
                    background: "color-mix(in srgb, var(--accent) 12%, var(--bg-secondary))",
                  }}
                >
                  Handover
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.feature}
                  className={i % 2 === 1 ? "bg-[var(--bg-secondary)]/40" : ""}
                >
                  <td className="border-b border-[var(--border-subtle)] px-4 py-3 font-medium text-[var(--text-primary)]">
                    {row.feature}
                  </td>
                  <td className="border-b border-[var(--border-subtle)] px-4 py-3 text-center text-[var(--text-secondary)]">
                    {row.manual}
                  </td>
                  <td className="border-b border-[var(--border-subtle)] px-4 py-3 text-center text-[var(--text-secondary)]">
                    {row.genericAi}
                  </td>
                  <td
                    className="border-b border-[var(--border-subtle)] px-4 py-3 text-center"
                    style={{
                      background: "color-mix(in srgb, var(--accent) 7%, transparent)",
                    }}
                  >
                    {row.handover}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </ScrollRevealItem>
      </div>
    </section>
  );
}
