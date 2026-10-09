"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, Brain, Clock, X } from "lucide-react";

import { cn } from "@/lib/utils";

type Alert = {
  id: string;
  type: "overdue" | "risks" | "qbr_due" | "no_intel";
  clientName: string;
  message: string;
  severity: "high" | "medium";
  actionLabel: string;
  actionType: "generate" | "client_intelligence" | "qbr";
};

type ClientSummary = {
  name: string;
  daysSinceLastReport: number;
  recentRiskCount: number;
  hasQbr: boolean;
  hasSummary: boolean;
  health: string;
};

type ClientIntelligenceAlertContext = {
  type: Alert["type"];
  message: string;
};

type Props = {
  onGoToGenerate: (clientName: string) => void;
  onGoToClientIntelligence: (
    clientName: string,
    context: ClientIntelligenceAlertContext,
  ) => void;
  onGoToReports: () => void;
};

function buildAlertsFromClients(clients: ClientSummary[]): Alert[] {
  const newAlerts: Alert[] = [];

  for (const client of clients) {
    if (client.daysSinceLastReport > 21) {
      newAlerts.push({
        id: `overdue-${client.name}`,
        type: "overdue",
        clientName: client.name,
        message: `No report in ${client.daysSinceLastReport} days`,
        severity: client.daysSinceLastReport > 35 ? "high" : "medium",
        actionLabel: "Generate now",
        actionType: "client_intelligence",
      });
    }

    if (client.recentRiskCount >= 4) {
      newAlerts.push({
        id: `risks-${client.name}`,
        type: "risks",
        clientName: client.name,
        message: `${client.recentRiskCount} risks in latest report`,
        severity: client.recentRiskCount >= 6 ? "high" : "medium",
        actionLabel: "View intelligence",
        actionType: "client_intelligence",
      });
    }

    if (client.health === "red" && !client.hasSummary) {
      newAlerts.push({
        id: `intel-${client.name}`,
        type: "no_intel",
        clientName: client.name,
        message: "Account intelligence not generated",
        severity: "medium",
        actionLabel: "Generate intelligence",
        actionType: "client_intelligence",
      });
    }
  }

  newAlerts.sort((a, b) =>
    a.severity === "high" && b.severity !== "high" ? -1 : 1,
  );

  return newAlerts.slice(0, 5);
}

export function ClientIntelligenceAlerts({
  onGoToGenerate,
  onGoToClientIntelligence,
  onGoToReports,
}: Props) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/client-intelligence/clients", {
        credentials: "same-origin",
      });
      const data = (await res.json()) as { clients: ClientSummary[] };
      setAlerts(buildAlertsFromClients(data.clients ?? []));
    } catch (e) {
      console.error("[ci-alerts]", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAlerts();
    const timer = window.setInterval(() => {
      void fetchAlerts();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [fetchAlerts]);

  const visibleAlerts = alerts.filter((a) => !dismissed.has(a.id));

  if (loading || visibleAlerts.length === 0) {
    return null;
  }

  const getIcon = (type: Alert["type"]) => {
    switch (type) {
      case "overdue":
        return Clock;
      case "risks":
        return AlertTriangle;
      default:
        return Brain;
    }
  };

  const handleAction = (alert: Alert) => {
    switch (alert.actionType) {
      case "generate":
        onGoToGenerate(alert.clientName);
        break;
      case "client_intelligence":
        onGoToClientIntelligence(alert.clientName, {
          type: alert.type,
          message: alert.message,
        });
        break;
      case "qbr":
        onGoToReports();
        break;
    }
  };

  return (
    <div className="mb-4 space-y-2">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        Needs attention
      </p>
      {visibleAlerts.map((alert) => {
        const Icon = getIcon(alert.type);
        return (
          <div
            key={alert.id}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-4 py-3",
              alert.severity === "high"
                ? "border-red-500/20 bg-red-500/[0.06]"
                : "border-amber-500/20 bg-amber-500/[0.06]",
            )}
          >
            <Icon
              className={cn(
                "size-3.5 flex-shrink-0",
                alert.severity === "high" ? "text-red-400" : "text-amber-400",
              )}
            />
            <div className="min-w-0 flex-1">
              <span className="mr-2 text-[12px] font-medium text-[var(--text-primary)]">
                {alert.clientName}
              </span>
              <span className="text-[12px] text-[var(--text-muted)]">{alert.message}</span>
            </div>
            <button
              type="button"
              onClick={() => handleAction(alert)}
              className={cn(
                "flex flex-shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                alert.severity === "high"
                  ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                  : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20",
              )}
            >
              {alert.actionLabel}
              <ArrowRight className="size-3" />
            </button>
            <button
              type="button"
              onClick={() =>
                setDismissed((prev) => new Set([...prev, alert.id]))
              }
              className="flex-shrink-0 text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
            >
              <X className="size-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
