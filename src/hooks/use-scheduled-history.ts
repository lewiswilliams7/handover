import { useCallback, useEffect, useState } from "react";

export type ScheduledHistoryType = "psa" | "ci" | "digest";

export type ScheduledHistoryEntry = {
  id: string;
  sent_at: string;
  email_to: string | null;
  tickets_processed: number | null;
  clients_covered: string[] | null;
  status: string | null;
  error_message: string | null;
};

export function useScheduledHistory(type: ScheduledHistoryType, active: boolean) {
  const [history, setHistory] = useState<ScheduledHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/scheduled-report-history?type=${type}`);
      const data = (await res.json()) as { history?: ScheduledHistoryEntry[] };
      setHistory(Array.isArray(data.history) ? data.history : []);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [type, active]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/scheduled-report-history?type=${type}`);
        const data = (await res.json()) as { history?: ScheduledHistoryEntry[] };
        if (!cancelled) {
          setHistory(Array.isArray(data.history) ? data.history : []);
        }
      } catch {
        if (!cancelled) setHistory([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [type, active]);

  return { history, loading, refetch };
}
