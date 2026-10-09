"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import type {
  ChurnLossSignal,
  ChurnReplayOutcome,
  ChurnReplayPreview,
  ChurnReplayResult,
} from "@/lib/psa/churn-replay";
import { getFindingCopy } from "@/lib/psa/scan-finding-copy";

/**
 * Churn Replay™ panel. Renders either the full result (entitled viewers) or the
 * redacted preview (anonymous scan results). Shared by the onboarding results
 * page and the Attention page so the replay reads the same everywhere.
 */

type ReplayRow = {
  key: string;
  name: string;
  lossSignal: ChurnLossSignal;
  lossLabel: string;
  monthlyValue: number | null;
  outcome: ChurnReplayOutcome;
  daysWarning: number | null;
  findings: Array<{ type: string; fact: string | null }>;
};

type Props = {
  replay: ChurnReplayResult | ChurnReplayPreview | null | undefined;
  /** True when names and driver detail are hidden from this viewer. */
  redacted?: boolean;
  /** Shown under a redacted list: why names are hidden and how to see them. */
  redactionNote?: ReactNode;
  className?: string;
};

const LOSS_SIGNAL_COPY: Record<ChurnLossSignal, string> = {
  contract_ended: "Contract ended",
  billing_ended: "Recurring billing ended",
  activity_stopped: "Tickets stopped",
};

function formatCurrency(value: number): string {
  return `£${Math.round(value).toLocaleString("en-GB")}`;
}

function formatDay(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  return new Date(ms).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatMonth(yearMonth: string): string {
  const ms = Date.parse(`${yearMonth}-01T00:00:00Z`);
  if (Number.isNaN(ms)) return yearMonth;
  return new Date(ms).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function isFullResult(
  replay: ChurnReplayResult | ChurnReplayPreview,
): replay is ChurnReplayResult {
  return replay.clients.length === 0 || "clientName" in replay.clients[0]!;
}

function toRows(replay: ChurnReplayResult | ChurnReplayPreview): ReplayRow[] {
  if (isFullResult(replay)) {
    return replay.clients.map((client) => ({
      key: `${client.clientId}`,
      name: client.clientName,
      lossSignal: client.lossSignal,
      lossLabel: formatDay(client.lossDate),
      monthlyValue: client.monthlyValue,
      outcome: client.outcome,
      daysWarning: client.daysWarning,
      findings: client.findings.map((finding) => ({
        type: finding.type,
        fact: finding.drivers[0]?.fact ?? null,
      })),
    }));
  }
  return replay.clients.map((client, index) => ({
    key: `lost-${index}`,
    name: `Lost client ${index + 1}`,
    lossSignal: client.lossSignal,
    lossLabel: formatMonth(client.lossMonth),
    monthlyValue: client.monthlyValue,
    outcome: client.outcome,
    daysWarning: client.daysWarning,
    findings: client.findingTypes.map((type) => ({ type, fact: null })),
  }));
}

export function ChurnReplayPanel({ replay, redacted = false, redactionNote, className }: Props) {
  if (replay === undefined) {
    return (
      <section className={`rounded-2xl border border-white/10 bg-white/[0.025] p-6 ${className ?? ""}`}>
        <h2 className="text-xl font-semibold text-white">Churn Replay</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
          This scan ran before Churn Replay existed. Refresh the scan to replay the clients you
          lost in the last 12 months.
        </p>
      </section>
    );
  }
  if (replay === null) {
    return (
      <section className={`rounded-2xl border border-white/10 bg-white/[0.025] p-6 ${className ?? ""}`}>
        <h2 className="text-xl font-semibold text-white">Churn Replay</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
          The replay could not be completed for this scan. Your other results are unaffected.
          Refresh the scan to try again.
        </p>
      </section>
    );
  }

  const rows = toRows(replay);
  const { summary } = replay;
  const hasCommercialSource = replay.sources.contracts || replay.sources.billing;

  return (
    <section
      className={`rounded-2xl border border-white/10 bg-white/[0.025] p-6 sm:p-8 ${className ?? ""}`}
      aria-labelledby="churn-replay-heading"
    >
      <div className="max-w-3xl">
        <h2 id="churn-replay-heading" className="text-2xl font-semibold tracking-tight text-white">
          Churn Replay
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          We rewound your PSA to the months before each client left and re-ran the same checks,
          using only what your PSA held on those dates.
        </p>
      </div>

      {summary.lostClients === 0 ? (
        <EmptyReplay hasCommercialSource={hasCommercialSource} />
      ) : (
        <>
          <ReplayHeadline summary={summary} />
          <ol className="mt-8 divide-y divide-white/10 border-y border-white/10">
            {rows.map((row) => (
              <ReplayClientRow
                key={row.key}
                row={row}
                checkpoints={replay.checkpointDays}
                redacted={redacted}
              />
            ))}
          </ol>
          {summary.detected > summary.lostClients ? (
            <p className="mt-3 text-xs text-[var(--text-muted)]">
              {summary.detected} lost clients were found. The {summary.lostClients} with the
              highest value were replayed.
            </p>
          ) : null}
          {redacted && redactionNote ? (
            <p className="mt-5 text-sm text-[var(--text-secondary)]">{redactionNote}</p>
          ) : null}
        </>
      )}

      <ReplayMethod />
    </section>
  );
}

function ReplayHeadline({ summary }: { summary: ChurnReplayResult["summary"] }) {
  const falseAlarmPct =
    summary.retainedChecked > 0
      ? Math.round((summary.retainedFlagged / summary.retainedChecked) * 100)
      : null;
  return (
    <div className="mt-6">
      <p className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        {summary.replayable === 0
          ? `${summary.lostClients} lost ${summary.lostClients === 1 ? "client" : "clients"}, not enough history to replay`
          : `Handover would have warned you about ${summary.flagged} of ${summary.replayable}.`}
      </p>
      <dl className="mt-5 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-[var(--text-secondary)]">Typical warning</dt>
          <dd className="mt-1 text-lg font-semibold text-white">
            {summary.medianDaysWarning != null ? `${summary.medianDaysWarning} days before they left` : "None"}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--text-secondary)]">Revenue that walked</dt>
          <dd className="mt-1 text-lg font-semibold text-white">
            {summary.lostAnnualValue != null
              ? `${formatCurrency(summary.lostAnnualValue)} a year`
              : "Not recorded in the PSA"}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--text-secondary)]">Of that, flagged in time</dt>
          <dd className="mt-1 text-lg font-semibold text-cyan-200">
            {summary.flaggedAnnualValue != null
              ? `${formatCurrency(summary.flaggedAnnualValue)} a year`
              : summary.lostAnnualValue != null
                ? "£0"
                : "Not recorded in the PSA"}
          </dd>
        </div>
      </dl>
      {falseAlarmPct != null ? (
        <p className="mt-5 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
          For comparison, {summary.retainedFlagged} of the {summary.retainedChecked} clients who
          stayed were flagged at the same points ({falseAlarmPct}%). A flag is a reason to look,
          not a prediction that they will leave.
        </p>
      ) : null}
    </div>
  );
}

function ReplayClientRow({
  row,
  checkpoints,
  redacted,
}: {
  row: ReplayRow;
  checkpoints: number[];
  redacted: boolean;
}) {
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const canExpand = row.findings.length > 0;
  const outcomeText =
    row.outcome === "flagged"
      ? `Flagged ${row.daysWarning} days before`
      : row.outcome === "missed"
        ? "No warning in the data"
        : "Not enough history to replay";

  return (
    <li className="py-5">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:items-center md:gap-8">
        <div className="min-w-0">
          <p className={`truncate text-base font-semibold ${redacted ? "text-white/80" : "text-white"}`}>
            {row.name}
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {LOSS_SIGNAL_COPY[row.lossSignal]} {redacted ? "in" : "on"} {row.lossLabel}
            {row.monthlyValue != null ? `, ${formatCurrency(row.monthlyValue)} a month` : ""}
          </p>
        </div>
        <div className="min-w-0">
          <ReplayStrip row={row} checkpoints={checkpoints} />
          <div className="mt-2 flex items-center justify-between gap-3">
            <p
              className={`text-sm font-medium ${
                row.outcome === "flagged" ? "text-cyan-200" : "text-[var(--text-secondary)]"
              }`}
            >
              {outcomeText}
            </p>
            {canExpand ? (
              <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-controls={detailId}
                className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
              >
                What fired
                <ChevronDown
                  className={`size-3.5 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>
            ) : null}
          </div>
        </div>
      </div>
      {canExpand && open ? (
        <ul id={detailId} className="mt-4 space-y-2 border-l border-cyan-300/30 pl-4 md:ml-[calc(41.6%+2rem)]">
          {row.findings.map((finding, index) => (
            <li key={`${finding.type}-${index}`} className="text-sm leading-6">
              <span className="font-medium text-white">{getFindingCopy(finding.type).label}</span>
              {finding.fact ? (
                <span className="block text-[var(--text-secondary)]">{finding.fact}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/**
 * The checkpoints as a timeline running up to the day the client left. Every
 * checkpoint from the first warning onwards is lit, so the length of the lit
 * run is the length of the warning.
 */
function ReplayStrip({ row, checkpoints }: { row: ReplayRow; checkpoints: number[] }) {
  const maxDays = Math.max(...checkpoints, 1);
  const position = (days: number) => 100 - (days / maxDays) * 92;
  const flagged = row.outcome === "flagged" && row.daysWarning != null;
  const insufficient = row.outcome === "insufficient_history";
  const litFrom = flagged ? position(row.daysWarning!) : 100;
  const label = flagged
    ? `Warning from ${row.daysWarning} days before the client left`
    : insufficient
      ? "Not enough history before the client left to replay"
      : "No checkpoint raised a warning before the client left";

  return (
    <div className="relative h-8" role="img" aria-label={label}>
      <div
        className={`absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t ${
          insufficient ? "border-dashed border-white/20" : "border-white/15"
        }`}
      />
      {flagged ? (
        <div
          className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-cyan-300/70"
          style={{ left: `${litFrom}%`, right: 0 }}
        />
      ) : null}
      {checkpoints.map((days) => {
        const left = position(days);
        const lit = flagged && days <= row.daysWarning!;
        const first = flagged && days === row.daysWarning;
        return (
          <span
            key={days}
            className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
              first
                ? "size-3.5 bg-cyan-300 ring-4 ring-cyan-300/20"
                : lit
                  ? "size-2 bg-cyan-300"
                  : insufficient
                    ? "size-1.5 bg-white/20"
                    : "size-2 bg-white/30"
            }`}
            style={{ left: `${left}%` }}
          />
        );
      })}
      <span
        className="absolute right-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-white/70"
        aria-hidden
      />
      <span className="absolute -bottom-1 left-0 text-[10.5px] leading-none text-[var(--text-muted)]" aria-hidden>
        {maxDays} days before
      </span>
      <span className="absolute -bottom-1 right-0 text-[10.5px] leading-none text-[var(--text-muted)]" aria-hidden>
        Left
      </span>
    </div>
  );
}

function EmptyReplay({ hasCommercialSource }: { hasCommercialSource: boolean }) {
  return (
    <div className="mt-6 max-w-3xl rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm leading-6 text-[var(--text-secondary)]">
      <p className="font-medium text-white">No lost clients were found in the last 12 months.</p>
      <p className="mt-1">
        {hasCommercialSource
          ? "No client had every contract or recurring invoice end in the window, and no busy client went quiet."
          : "Your PSA connection could not read contracts or recurring invoices, so the replay could only look for clients whose tickets stopped. Granting read access to contracts lets it find clients that left on paper."}
      </p>
    </div>
  );
}

function ReplayMethod() {
  return (
    <details className="group mt-8 max-w-3xl text-sm text-[var(--text-secondary)]">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 font-semibold text-[var(--text-secondary)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 [&::-webkit-details-marker]:hidden">
        How the replay works
        <ChevronDown className="size-3.5 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
      </summary>
      <div className="mt-3 space-y-2 leading-6">
        <p>
          A client counts as lost when every contract or recurring invoice ended in the window and
          they stopped raising tickets. Where your PSA holds no commercial record, a busy client
          that went quiet for 90 days counts instead.
        </p>
        <p>
          Each lost client is checked at 150, 120, 90, 60 and 30 days before they left, against
          their own history only. Tickets closed after a checkpoint count as open on that day.
        </p>
        <p>
          Contract renewal dates, missing data and account structure (one contact raising
          everything, no named owner) never count as a warning, because they would be true for
          many clients who stay. Clients who stayed are replayed the same way, so you can see how
          often a flag is a false alarm.
        </p>
      </div>
    </details>
  );
}
