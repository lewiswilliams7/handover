import { cn } from "@/lib/utils";

export type ScheduledRecentSendEntry = {
  id: string;
  sent_at: string;
  tickets_processed: number | null;
  clients_covered: string[] | null;
  status: string | null;
};

function formatScheduleHistorySent(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Europe/London",
    });
  } catch {
    return "-";
  }
}

type ScheduledRecentSendsProps = {
  title?: string;
  history: ScheduledRecentSendEntry[];
  loading: boolean;
  maxItems?: number;
};

export function ScheduledRecentSends({
  title = "Recent sends",
  history,
  loading,
  maxItems = 3,
}: ScheduledRecentSendsProps) {
  return (
    <div className="mt-4 border-t border-white/[0.06] pt-4">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <h3 className="min-w-0 truncate text-[12px] font-semibold text-[var(--text-primary)]">
          {title}
        </h3>
        <span className="shrink-0 rounded-full bg-[var(--bg-secondary)] px-2 py-0.5 text-[10px] tabular-nums text-[var(--text-muted)]">
          {history.length}
        </span>
      </div>
      {loading ? (
        <ul className="mt-3 space-y-2" aria-busy>
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="animate-pulse rounded-[var(--radius)] border border-[var(--border)] p-2"
            >
              <div className="h-3 w-36 rounded bg-[var(--bg-secondary)]" />
              <div className="mt-1.5 h-2.5 w-24 rounded bg-[var(--bg-secondary)]" />
            </li>
          ))}
        </ul>
      ) : history.length === 0 ? (
        <p className="mt-3 text-[11px] text-[var(--text-secondary)]">No sends yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {history.slice(0, maxItems).map((h, idx) => (
            <li
              key={h.id}
              className={cn(
                "rounded-[var(--radius)] border border-[var(--border)] p-2",
                idx % 2 ? "bg-[var(--bg-secondary)]/30" : "",
              )}
            >
              <p className="text-[11px] font-semibold text-[var(--text-primary)]">
                {formatScheduleHistorySent(h.sent_at)}
              </p>
              <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">
                {(h.tickets_processed ?? 0) > 0 ? (
                  <>
                    {h.tickets_processed ?? 0} tickets
                    {(h.clients_covered?.length ?? 0) > 0
                      ? ` · ${h.clients_covered!.length} client${
                          h.clients_covered!.length === 1 ? "" : "s"
                        }`
                      : " · all clients"}
                  </>
                ) : (h.clients_covered?.length ?? 0) > 0 ? (
                  <>
                    {h.clients_covered!.length} client
                    {h.clients_covered!.length === 1 ? "" : "s"}
                  </>
                ) : null}
              </p>
              <span
                className={cn(
                  "mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                  h.status === "failed"
                    ? "bg-red-500/10 text-red-500"
                    : "bg-emerald-500/10 text-emerald-500",
                )}
              >
                {h.status === "failed" ? "Failed" : "Sent"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
