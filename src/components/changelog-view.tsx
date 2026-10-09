"use client";

const ENTRIES = [
  {
    period: "May 2026",
    title: "May 2026",
    items: [
      "Collapsible sidebar with hover-to-expand",
      "Overview home screen with activity feed and weekly stats",
      "ConnectWise RAG status and owner mapping fixed",
      "Delivery health pagination - 25 clients per page",
      "Card-upfront 14-day trial",
      "Excel export sheet selector restored",
      "Push to PSA PSA-source detection",
      "Extended PM tabs in Excel export",
    ],
  },
  {
    period: "April 2026",
    title: "April 2026",
    items: [
      "ConnectWise Manage integration launched",
      "Live on ConnectWise Marketplace",
      "Scheduled reports (campaigns) system",
      "HaloPSA push-back feature",
      "One-click email send from output",
      "Delivery health dashboard with RAG status",
      "Slack and Teams webhook notifications",
      "Custom Excel branding",
      "White-label Enterprise mode",
      "Client portal (beta)",
    ],
  },
  {
    period: "March 2026",
    title: "March 2026",
    items: [
      "HaloPSA native integration launched",
      "Live on HaloPSA Marketplace",
      "Action log, risk register, status report, client email generation",
      "Full Excel report pack (17 sheets)",
      "Generation history",
      "Team accounts",
      "Pro and Enterprise plans",
    ],
  },
] as const;

export function ChangelogView() {
  return (
    <div className="w-full bg-[var(--bg-primary)] px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-[22px] font-semibold text-white">What&apos;s new</h1>
        <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
          Product updates and improvements
        </p>

        <div className="relative mt-8 pl-6">
          <div
            className="absolute left-0 top-0 bottom-0 w-px bg-[var(--accent)]"
            aria-hidden
          />
          <ul className="space-y-10">
            {ENTRIES.map((entry) => (
              <li key={entry.period} className="relative">
                <span
                  className="absolute -left-6 top-1.5 size-2 -translate-x-1/2 rounded-full bg-[var(--accent)]"
                  aria-hidden
                />
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                  {entry.period}
                </p>
                <h2 className="mt-1 text-[16px] font-bold text-white">
                  {entry.title}
                </h2>
                <ul className="mt-3 list-disc space-y-1.5 pl-4 marker:text-[var(--text-muted)]">
                  {entry.items.map((item) => (
                    <li
                      key={item}
                      className="text-[13px] text-[var(--text-secondary)]"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
