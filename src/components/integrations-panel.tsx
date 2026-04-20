"use client";

import { useEffect, useState, type RefObject } from "react";
import Link from "next/link";
import { Check, Cog, Copy, EyeOff, Loader2, Lock, Shield } from "lucide-react";

import { CardMouseSpotlight } from "@/components/card-mouse-spotlight";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export type IntegrationDetailId = "halo" | "connectwise" | "slack" | "teams" | "zapier";

type IntegrationsPanelProps = {
  /** Effective paid/trial access (DB plan + trial expiry); drives PSA and notification locks. */
  hasProFeatures: boolean;
  userTeamId: string | null;
  /** First load: Halo + ConnectWise status fetching. */
  integrationsBootstrapping: boolean;
  /** Open a PSA detail panel once (e.g. deep link ?cw=1). */
  initialOpenDetail?: "halo" | "connectwise" | null;
  onConsumedInitialOpenDetail?: () => void;
  haloConnected: boolean;
  haloUrl: string;
  haloUpdatedAt: string | null;
  haloImportedCount: number;
  haloConfigOpen: boolean;
  setHaloConfigOpen: (open: boolean) => void;
  haloUrlInput: string;
  setHaloUrlInput: (v: string) => void;
  haloTenant: string;
  setHaloTenant: (v: string) => void;
  haloClientId: string;
  setHaloClientId: (v: string) => void;
  haloClientSecret: string;
  setHaloClientSecret: (v: string) => void;
  haloHelpOpen: boolean;
  setHaloHelpOpen: (open: boolean) => void;
  haloError: string | null;
  /** True when GET /api/halo/connect reported a recoverable connection check failure. */
  haloReconnectRecommended?: boolean;
  onOpenHaloReconnectConfig?: () => void;
  haloPermissionWarning: string | null;
  haloLoading: boolean;
  haloTestLoading: boolean;
  haloAutoClosureSummary: boolean;
  haloAutoClosureSummaryBusy: boolean;
  onHaloAutoClosureSummaryChange: (enabled: boolean) => void | Promise<void>;
  onConnect: () => void | Promise<void>;
  onTest: () => void | Promise<void>;
  onDisconnect: () => void | Promise<void>;
  onImportTickets: () => void;
  onUpgrade: () => void;
  upgradeDisabled: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  cwConnected: boolean;
  cwSiteUrl: string;
  cwImportedCount: number;
  cwSiteUrlInput: string;
  setCwSiteUrlInput: (v: string) => void;
  cwCompanyIdInput: string;
  setCwCompanyIdInput: (v: string) => void;
  cwPublicKeyInput: string;
  setCwPublicKeyInput: (v: string) => void;
  cwPrivateKeyInput: string;
  setCwPrivateKeyInput: (v: string) => void;
  cwClientIdInput: string;
  setCwClientIdInput: (v: string) => void;
  cwConfigOpen: boolean;
  setCwConfigOpen: (open: boolean) => void;
  cwError: string | null;
  cwSaveLoading: boolean;
  cwTestLoading: boolean;
  cwTestOk: boolean | null;
  cwTestMessage: string | null;
  onCwSave: () => void | Promise<void>;
  onCwTest: () => void | Promise<void>;
  onCwDisconnect: () => void | Promise<void>;
  slackWebhookUrl: string;
  setSlackWebhookUrl: (v: string) => void;
  slackNotificationsEnabled: boolean;
  onSlackNotificationsToggle: (enabled: boolean) => void | Promise<void>;
  teamsWebhookUrl: string;
  setTeamsWebhookUrl: (v: string) => void;
  teamsNotificationsEnabled: boolean;
  onTeamsNotificationsToggle: (enabled: boolean) => void | Promise<void>;
  slackWebhookSaveLoading: boolean;
  teamsWebhookSaveLoading: boolean;
  slackWebhookTestLoading: boolean;
  teamsWebhookTestLoading: boolean;
  onSaveSlackWebhook: () => void | Promise<void>;
  onSaveTeamsWebhook: () => void | Promise<void>;
  onTestSlackWebhook: () => void | Promise<void>;
  onTestTeamsWebhook: () => void | Promise<void>;
};

function BadgeConnected() {
  return (
    <span
      className="rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
      style={{
        background: "color-mix(in srgb, var(--success) 12%, transparent)",
        color: "var(--success)",
        borderColor: "color-mix(in srgb, var(--success) 28%, var(--border))",
      }}
    >
      Connected
    </span>
  );
}

function BadgeConnectedCheck() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
      style={{
        background: "color-mix(in srgb, var(--success) 12%, transparent)",
        color: "var(--success)",
        borderColor: "color-mix(in srgb, var(--success) 35%, var(--border))",
      }}
    >
      <Check className="size-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
      Connected ✓
    </span>
  );
}

function BadgeAvailable() {
  return (
    <span
      className="rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
      style={{
        background: "color-mix(in srgb, var(--accent) 12%, transparent)",
        color: "var(--accent)",
        borderColor: "color-mix(in srgb, var(--accent) 28%, var(--border))",
      }}
    >
      Available
    </span>
  );
}

function BadgeComingSoon() {
  return (
    <span className="rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">
      Coming Soon
    </span>
  );
}

function BadgeInProgress() {
  return (
    <span className="rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">
      In Progress
    </span>
  );
}

function BadgeProRequired() {
  return (
    <span
      className="rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
      style={{
        background: "color-mix(in srgb, var(--accent) 14%, var(--bg-secondary))",
        color: "var(--accent)",
        borderColor: "color-mix(in srgb, var(--accent) 30%, var(--border))",
      }}
    >
      Pro required
    </span>
  );
}

function BadgeDisconnected() {
  return (
    <span className="rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">
      Disconnected
    </span>
  );
}

function StatusConnectionPill({ connected }: { connected: boolean }) {
  if (connected) {
    return (
      <span
        className="rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
        style={{
          background: "color-mix(in srgb, var(--success) 12%, transparent)",
          color: "var(--success)",
          borderColor: "color-mix(in srgb, var(--success) 28%, var(--border))",
        }}
      >
        Connected
      </span>
    );
  }
  return (
    <span className="rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">
      Not Connected
    </span>
  );
}

const cardBase =
  "relative flex flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-6 transition-all duration-200 ease-in-out";

const cardHover =
  "cursor-default hover:border-[rgba(56,189,248,0.4)] hover:shadow-[0_4px_20px_rgba(56,189,248,0.08)] hover:-translate-y-0.5";

const HANDOVER_ZAPIER_WEBHOOK_URL = "https://gethandover.uk/api/webhooks/zapier";

const ZAPIER_SAMPLE_PAYLOAD = `{
  "api_key": "hzp_your_key_here",
  "tickets": [
    {
      "id": "1234",
      "title": "BitDefender issue at King James Academy",
      "status": "In Progress",
      "client": "King James Academy",
      "priority": "High",
      "notes": [
        {
          "author": "Support",
          "date": "2026-04-13",
          "content": "Endpoints showing expired anti-malware modules. Engineer investigating GravityZone licensing."
        }
      ]
    }
  ]
}`;

function maskZapierKeyDisplay(key: string): string {
  if (!key) return "";
  const u = key.indexOf("_");
  if (u >= 0) return `${key.slice(0, u + 1)}${"•".repeat(16)}`;
  return `${key.slice(0, 4)}${"•".repeat(16)}`;
}

export function IntegrationsPanel({
  hasProFeatures,
  userTeamId,
  integrationsBootstrapping,
  initialOpenDetail = null,
  onConsumedInitialOpenDetail,
  haloConnected,
  haloUrl,
  haloUpdatedAt: _haloUpdatedAt,
  haloImportedCount,
  haloConfigOpen,
  setHaloConfigOpen,
  haloUrlInput,
  setHaloUrlInput,
  haloTenant,
  setHaloTenant,
  haloClientId,
  setHaloClientId,
  haloClientSecret,
  setHaloClientSecret,
  haloHelpOpen,
  setHaloHelpOpen,
  haloError,
  haloReconnectRecommended = false,
  onOpenHaloReconnectConfig,
  haloPermissionWarning,
  haloLoading,
  haloTestLoading,
  haloAutoClosureSummary,
  haloAutoClosureSummaryBusy,
  onHaloAutoClosureSummaryChange,
  onConnect,
  onImportTickets,
  onUpgrade,
  upgradeDisabled,
  fileInputRef,
  onTest,
  onDisconnect,
  cwConnected,
  cwSiteUrl,
  cwImportedCount,
  cwSiteUrlInput,
  setCwSiteUrlInput,
  cwCompanyIdInput,
  setCwCompanyIdInput,
  cwPublicKeyInput,
  setCwPublicKeyInput,
  cwPrivateKeyInput,
  setCwPrivateKeyInput,
  cwClientIdInput,
  setCwClientIdInput,
  cwConfigOpen,
  setCwConfigOpen,
  cwError,
  cwSaveLoading,
  cwTestLoading,
  cwTestOk,
  cwTestMessage,
  onCwSave,
  onCwTest,
  onCwDisconnect,
  slackWebhookUrl,
  setSlackWebhookUrl,
  slackNotificationsEnabled,
  onSlackNotificationsToggle,
  teamsWebhookUrl,
  setTeamsWebhookUrl,
  teamsNotificationsEnabled,
  onTeamsNotificationsToggle,
  slackWebhookSaveLoading,
  teamsWebhookSaveLoading,
  slackWebhookTestLoading,
  teamsWebhookTestLoading,
  onSaveSlackWebhook,
  onSaveTeamsWebhook,
  onTestSlackWebhook,
  onTestTeamsWebhook,
}: IntegrationsPanelProps) {
  const isPro = hasProFeatures;
  const zapierComingSoon = true;
  const connectedCount = isPro ? (haloConnected ? 1 : 0) + (cwConnected ? 1 : 0) : 0;

  const [zapierKey, setZapierKey] = useState<string | null>(null);
  const [zapierCanConfigure, setZapierCanConfigure] = useState(false);
  const [zapierLoadError, setZapierLoadError] = useState<string | null>(null);
  const [zapierBusy, setZapierBusy] = useState(false);
  const [zapierCopied, setZapierCopied] = useState(false);
  const [zapierWebhookCopied, setZapierWebhookCopied] = useState(false);
  const [zapierSampleCopied, setZapierSampleCopied] = useState(false);
  const [zapierRevealKey, setZapierRevealKey] = useState(false);
  const [zapierKeyLoading, setZapierKeyLoading] = useState(false);

  const [activeDetail, setActiveDetail] = useState<IntegrationDetailId | null>(null);

  const openDetail = (id: IntegrationDetailId) => {
    setActiveDetail(id);
    if (id === "halo" && !haloConnected) setHaloConfigOpen(true);
    if (id === "connectwise" && !cwConnected) setCwConfigOpen(true);
  };

  const closeDetail = () => {
    setActiveDetail(null);
    setHaloConfigOpen(false);
    setCwConfigOpen(false);
  };

  useEffect(() => {
    if (!initialOpenDetail) return;
    openDetail(initialOpenDetail);
    queueMicrotask(() => onConsumedInitialOpenDetail?.());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot deep link from URL
  }, [initialOpenDetail]);

  useEffect(() => {
    if (!isPro || integrationsBootstrapping) return;
    let cancelled = false;
    (async () => {
      setZapierKeyLoading(true);
      setZapierLoadError(null);
      try {
        const res = await fetch("/api/profile/zapier-key");
        const data = (await res.json()) as {
          error?: string;
          canConfigure?: boolean;
          zapier_api_key?: string | null;
        };
        if (cancelled) return;
        if (!res.ok) {
          setZapierLoadError(typeof data.error === "string" ? data.error : "Failed to load Zapier key");
          setZapierKey(null);
          setZapierCanConfigure(false);
          return;
        }
        setZapierCanConfigure(data.canConfigure === true);
        setZapierKey(typeof data.zapier_api_key === "string" ? data.zapier_api_key : null);
      } catch {
        if (!cancelled) setZapierLoadError("Network error");
      } finally {
        if (!cancelled) setZapierKeyLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPro, integrationsBootstrapping]);

  async function handleZapierGenerateOrRegenerate() {
    setZapierBusy(true);
    setZapierLoadError(null);
    try {
      const res = await fetch("/api/profile/zapier-key", { method: "POST" });
      const data = (await res.json()) as { error?: string; zapier_api_key?: string };
      if (!res.ok) {
        setZapierLoadError(typeof data.error === "string" ? data.error : "Could not create key");
        return;
      }
      if (typeof data.zapier_api_key === "string") {
        setZapierKey(data.zapier_api_key);
        setZapierRevealKey(false);
        setZapierCanConfigure(true);
      }
    } catch {
      setZapierLoadError("Network error");
    } finally {
      setZapierBusy(false);
    }
  }

  async function copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  const slackChatConnected =
    isPro &&
    slackNotificationsEnabled &&
    Boolean(slackWebhookUrl.trim());
  const teamsChatConnected =
    isPro &&
    teamsNotificationsEnabled &&
    Boolean(teamsWebhookUrl.trim());

  if (integrationsBootstrapping) {
    return (
      <div className="min-h-full animate-in fade-in duration-300 bg-[var(--bg-secondary)]">
        <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6">
          <div className="mb-8 flex items-center gap-3">
            <Loader2 className="size-6 shrink-0 animate-spin text-[var(--accent)]" aria-hidden />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-5 w-48 max-w-full animate-pulse rounded bg-[var(--border)]/50" />
              <div className="h-3 w-72 max-w-full animate-pulse rounded bg-[var(--border)]/35" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-56 rounded-[var(--radius-lg)] border border-[var(--border)]/60 bg-[var(--bg-primary)] p-4">
              <div className="h-4 w-32 animate-pulse rounded bg-[var(--border)]/45" />
              <div className="mt-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-3 animate-pulse rounded bg-[var(--border)]/35" />
                ))}
              </div>
            </div>
            <div className="h-56 rounded-[var(--radius-lg)] border border-[var(--border)]/60 bg-[var(--bg-primary)] p-4">
              <div className="h-4 w-36 animate-pulse rounded bg-[var(--border)]/45" />
              <div className="mt-6 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-3 animate-pulse rounded bg-[var(--border)]/35" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const proLockCard = (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] px-4 text-center"
      style={{ background: "color-mix(in srgb, var(--bg-primary) 75%, transparent)" }}
    >
      <Lock className="size-6 text-[var(--text-muted)]" aria-hidden />
      <p className="text-[13px] font-medium text-[var(--text-secondary)]">Available on Pro</p>
      <Button
        type="button"
        className="w-full max-w-[220px] bg-[var(--accent)] text-white shadow-sm hover:bg-[var(--accent-hover)]"
        onClick={onUpgrade}
        disabled={upgradeDisabled}
      >
        Upgrade to Pro
      </Button>
    </div>
  );

  return (
    <div className="min-h-full animate-in fade-in duration-300 bg-[var(--bg-secondary)]">
      <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6">
        <div
          className="mb-6 flex flex-col gap-6 rounded-[var(--radius-lg)] px-8 py-10 sm:flex-row sm:items-start sm:justify-between"
          style={{
            background:
              "linear-gradient(135deg, rgba(15,23,42,0.97) 0%, rgba(15,23,42,0.95) 100%)",
            padding: "2.5rem 2rem",
          }}
        >
          <div>
            <p
              className="text-[11px] font-semibold uppercase text-[var(--accent)]"
              style={{ letterSpacing: "0.1em" }}
            >
              Integrations
            </p>
            <h1 className="mt-1 text-[28px] font-bold text-white">Connect your tools</h1>
            <p className="mt-1.5 max-w-xl text-[14px] leading-relaxed text-white/60">
              Pull live data directly into Handover. No copy pasting, no spreadsheet exports.
            </p>
          </div>
          <div className="shrink-0">
            <p
              className="text-[13px] font-medium"
              style={{
                color: connectedCount > 0 ? "var(--success)" : "var(--text-muted)",
              }}
            >
              {connectedCount} connected
            </p>
          </div>
        </div>

        <section aria-labelledby="psa-integrations-heading">
          <header className="mb-5">
            <p
              className="text-[11px] font-semibold uppercase text-[var(--accent)]"
              style={{ letterSpacing: "0.1em" }}
            >
              PSA integrations
            </p>
            <h2
              id="psa-integrations-heading"
              className="mt-1 text-[20px] font-bold text-[var(--text-primary)]"
            >
              HaloPSA & ConnectWise Manage
            </h2>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-[var(--text-secondary)]">
              Connect HaloPSA or ConnectWise Manage to pull tickets and projects into Handover. Use{" "}
              <span className="font-medium text-[var(--text-primary)]">Configure</span> or{" "}
              <span className="font-medium text-[var(--text-primary)]">Manage</span> to set up credentials on a
              dedicated panel.
            </p>
          </header>

          <div
            className="grid items-stretch gap-5"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            }}
          >
            <div className="pro-card-wrapper min-w-0 rounded-[var(--radius-lg)] shadow-[0_8px_32px_rgba(56,189,248,0.1)]">
              <CardMouseSpotlight className="pro-card-content integration-card-glass relative flex min-h-full flex-col rounded-[calc(var(--radius-lg)-2px)] border border-[var(--border)]/80 bg-[var(--bg-primary)] p-6 transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-[rgba(56,189,248,0.35)] hover:shadow-[0_4px_20px_rgba(56,189,248,0.08)]">
                {!isPro ? proLockCard : null}
                <div className="mb-4 flex items-start justify-between gap-3">
                  <img
                    src="/halopsa.png"
                    alt=""
                    className="shrink-0"
                    style={{ width: "48px", height: "48px", objectFit: "contain", borderRadius: "8px" }}
                  />
                  {isPro ? (
                    <StatusConnectionPill connected={haloConnected} />
                  ) : (
                    <BadgeProRequired />
                  )}
                </div>
                <p className="mb-1 text-[16px] font-semibold text-[var(--text-primary)]">HaloPSA</p>
                <p className="mb-6 min-h-[40px] flex-1 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                  Import tickets and projects from HaloPSA for one-click reporting and push-back.
                </p>
                <Button
                  type="button"
                  className="mt-auto h-11 w-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                  disabled={!isPro}
                  onClick={() => openDetail("halo")}
                >
                  {isPro ? (haloConnected ? "Manage" : "Configure") : "Pro required"}
                </Button>
              </CardMouseSpotlight>
            </div>

            <div className="pro-card-wrapper min-w-0 rounded-[var(--radius-lg)] shadow-[0_8px_32px_rgba(56,189,248,0.1)]">
              <CardMouseSpotlight className="pro-card-content integration-card-glass relative flex min-h-full flex-col rounded-[calc(var(--radius-lg)-2px)] border border-[var(--border)]/80 bg-[var(--bg-primary)] p-6 transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-[rgba(56,189,248,0.35)] hover:shadow-[0_4px_20px_rgba(56,189,248,0.08)]">
                {!isPro ? proLockCard : null}
                <div className="mb-4 flex items-start justify-between gap-3">
                  <img
                    src="/connectwise.jpeg"
                    alt=""
                    className="shrink-0"
                    style={{ width: "48px", height: "48px", objectFit: "contain", borderRadius: "8px" }}
                  />
                  {isPro ? (
                    <StatusConnectionPill connected={cwConnected} />
                  ) : (
                    <BadgeProRequired />
                  )}
                </div>
                <p className="mb-1 text-[16px] font-semibold text-[var(--text-primary)]">ConnectWise Manage</p>
                <p className="mb-6 min-h-[40px] flex-1 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                  Connect to Manage API to pull service tickets and sync notes back to tickets.
                </p>
                <Button
                  type="button"
                  className="mt-auto h-11 w-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                  disabled={!isPro}
                  onClick={() => openDetail("connectwise")}
                >
                  {isPro ? (cwConnected ? "Manage" : "Configure") : "Pro required"}
                </Button>
              </CardMouseSpotlight>
            </div>
          </div>
        </section>

        <section className="mt-14" aria-labelledby="notifications-heading">
          <header className="mb-6">
            <p
              className="text-[11px] font-semibold uppercase text-[var(--accent)]"
              style={{ letterSpacing: "0.1em" }}
            >
              Notifications
            </p>
            <h2
              id="notifications-heading"
              className="mt-1 text-[20px] font-bold text-[var(--text-primary)]"
            >
              Slack & Microsoft Teams
            </h2>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-[var(--text-secondary)]">
              Send a short summary to a channel whenever a report is generated—manual runs or scheduled sends.
            </p>
          </header>
          <div
            className="grid gap-5"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
          >
            <div className="pro-card-wrapper min-w-0 rounded-[var(--radius-lg)] shadow-[0_8px_32px_rgba(56,189,248,0.1)]">
              <CardMouseSpotlight className="pro-card-content integration-card-glass relative flex min-h-full flex-col rounded-[calc(var(--radius-lg)-2px)] border border-[var(--border)]/80 bg-[var(--bg-primary)] p-6 transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-[rgba(56,189,248,0.35)] hover:shadow-[0_4px_20px_rgba(56,189,248,0.08)]">
                {!isPro ? proLockCard : null}
                <div className="mb-4 flex items-start justify-between gap-3">
                  <img
                    src="/slack.png"
                    alt=""
                    className="shrink-0"
                    style={{ width: "48px", height: "48px", objectFit: "contain", borderRadius: "8px" }}
                  />
                  {isPro ? (
                    <StatusConnectionPill connected={slackChatConnected} />
                  ) : (
                    <BadgeProRequired />
                  )}
                </div>
                <p className="mb-1 text-[16px] font-semibold text-[var(--text-primary)]">Slack</p>
                <p className="mb-6 min-h-[40px] flex-1 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                  Post report-ready digests to a Slack channel using an incoming webhook.
                </p>
                <Button
                  type="button"
                  className="mt-auto h-11 w-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                  disabled={!isPro}
                  onClick={() => openDetail("slack")}
                >
                  {isPro ? (slackChatConnected ? "Manage" : "Configure") : "Pro required"}
                </Button>
              </CardMouseSpotlight>
            </div>
            <div className="pro-card-wrapper min-w-0 rounded-[var(--radius-lg)] shadow-[0_8px_32px_rgba(56,189,248,0.1)]">
              <CardMouseSpotlight className="pro-card-content integration-card-glass relative flex min-h-full flex-col rounded-[calc(var(--radius-lg)-2px)] border border-[var(--border)]/80 bg-[var(--bg-primary)] p-6 transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-[rgba(56,189,248,0.35)] hover:shadow-[0_4px_20px_rgba(56,189,248,0.08)]">
                {!isPro ? proLockCard : null}
                <div className="mb-4 flex items-start justify-between gap-3">
                  <img
                    src="/teams.png"
                    alt=""
                    className="shrink-0"
                    style={{ width: "48px", height: "48px", objectFit: "contain", borderRadius: "8px" }}
                  />
                  {isPro ? (
                    <StatusConnectionPill connected={teamsChatConnected} />
                  ) : (
                    <BadgeProRequired />
                  )}
                </div>
                <p className="mb-1 text-[16px] font-semibold text-[var(--text-primary)]">Microsoft Teams</p>
                <p className="mb-6 min-h-[40px] flex-1 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                  Push the same summaries to Teams with a channel incoming webhook.
                </p>
                <Button
                  type="button"
                  className="mt-auto h-11 w-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                  disabled={!isPro}
                  onClick={() => openDetail("teams")}
                >
                  {isPro ? (teamsChatConnected ? "Manage" : "Configure") : "Pro required"}
                </Button>
              </CardMouseSpotlight>
            </div>
          </div>
        </section>

        <section className="mt-14" aria-labelledby="automation-heading">
          <header className="mb-6">
            <p
              className="text-[11px] font-semibold uppercase text-[var(--accent)]"
              style={{ letterSpacing: "0.1em" }}
            >
              Automation
            </p>
            <h2 id="automation-heading" className="mt-1 text-[20px] font-bold text-[var(--text-primary)]">
              Zapier
            </h2>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-[var(--text-secondary)]">
              Trigger Handover from other tools. Full configuration opens in a dedicated panel.
            </p>
          </header>
          <div
            className="grid gap-5"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
          >
            <div className="pro-card-wrapper min-w-0 rounded-[var(--radius-lg)] opacity-90 shadow-[0_8px_32px_rgba(56,189,248,0.1)]">
              <CardMouseSpotlight className="pro-card-content integration-card-glass relative flex min-h-full flex-col rounded-[calc(var(--radius-lg)-2px)] border border-[var(--border)]/80 bg-[var(--bg-primary)] p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <img
                    src="/zapier.svg"
                    alt=""
                    className="size-12 shrink-0 rounded-[10px] bg-white object-contain p-1.5"
                    width={48}
                    height={48}
                  />
                  <BadgeComingSoon />
                </div>
                <p className="mb-1 text-[16px] font-semibold text-[var(--text-primary)]">Zapier</p>
                <p className="mb-6 min-h-[40px] flex-1 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                  Automate ticket-to-report flows from hundreds of apps. API keys and webhooks ship in a future
                  release.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-auto h-11 w-full border-[var(--border)]"
                  onClick={() => openDetail("zapier")}
                >
                  Coming soon
                </Button>
              </CardMouseSpotlight>
            </div>
          </div>
        </section>

        <section className="mt-14" aria-labelledby="planned-heading">
          <header className="mb-6">
            <p
              className="text-[11px] font-semibold uppercase text-[var(--text-muted)]"
              style={{ letterSpacing: "0.1em" }}
            >
              Coming soon
            </p>
            <h2 id="planned-heading" className="mt-1 text-[20px] font-bold text-[var(--text-primary)]">
              More integrations
            </h2>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-[var(--text-secondary)]">
              Roadmap PSA connectors and productivity surfaces. Join a waitlist or use file import today.
            </p>
          </header>
          <div
            className="grid gap-5"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
          >
            <div className="pro-card-wrapper min-w-0 rounded-[var(--radius-lg)] opacity-[0.72] shadow-[0_8px_32px_rgba(56,189,248,0.06)]">
              <CardMouseSpotlight className="pro-card-content integration-card-glass relative flex min-h-full flex-col rounded-[calc(var(--radius-lg)-2px)] border border-[var(--border)]/80 bg-[var(--bg-primary)] p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <img
                    src="/autotask.svg"
                    alt=""
                    className="size-12 shrink-0 rounded-[10px] bg-white object-contain p-1"
                    width={48}
                    height={48}
                  />
                  <BadgeComingSoon />
                </div>
                <p className="mb-1 text-[16px] font-semibold text-[var(--text-primary)]">Autotask PSA</p>
                <p className="mb-6 min-h-[40px] flex-1 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                  Native Autotask reads for tickets and time entries.
                </p>
                <a
                  href="mailto:hello@gethandover.uk?subject=Autotask%20waitlist"
                  className="mt-auto inline-flex h-11 w-full items-center justify-center rounded-[var(--radius)] border border-[var(--border)] px-4 text-[13px] font-medium text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"
                >
                  Join waitlist →
                </a>
              </CardMouseSpotlight>
            </div>
            <div className="pro-card-wrapper min-w-0 rounded-[var(--radius-lg)] opacity-[0.72] shadow-[0_8px_32px_rgba(56,189,248,0.06)]">
              <CardMouseSpotlight className="pro-card-content integration-card-glass relative flex min-h-full flex-col rounded-[calc(var(--radius-lg)-2px)] border border-[var(--border)]/80 bg-[var(--bg-primary)] p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <img
                    src="/outlook.png"
                    alt=""
                    className="shrink-0"
                    style={{ width: "48px", height: "48px", objectFit: "contain", borderRadius: "8px" }}
                  />
                  <BadgeComingSoon />
                </div>
                <p className="mb-1 text-[16px] font-semibold text-[var(--text-primary)]">Outlook add-in</p>
                <p className="mb-6 min-h-[40px] flex-1 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                  Generate client-ready email from your compose window.
                </p>
                <a
                  href="mailto:hello@gethandover.uk?subject=Outlook%20waitlist"
                  className="mt-auto inline-flex h-11 w-full items-center justify-center rounded-[var(--radius)] border border-[var(--border)] px-4 text-[13px] font-medium text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"
                >
                  Join waitlist →
                </a>
              </CardMouseSpotlight>
            </div>
            <div className="pro-card-wrapper min-w-0 rounded-[var(--radius-lg)] shadow-[0_8px_32px_rgba(56,189,248,0.1)]">
              <CardMouseSpotlight className="pro-card-content integration-card-glass relative flex min-h-full flex-col rounded-[calc(var(--radius-lg)-2px)] border border-[var(--border)]/80 bg-[var(--bg-primary)] p-6 transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-[rgba(56,189,248,0.35)] hover:shadow-[0_4px_20px_rgba(56,189,248,0.08)]">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div
                    className="flex size-12 shrink-0 items-center justify-center rounded-[10px] text-white"
                    style={{ background: "#1D6F42" }}
                    aria-hidden
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z"
                        fill="currentColor"
                        opacity="0.95"
                      />
                    </svg>
                  </div>
                  <BadgeAvailable />
                </div>
                <p className="mb-1 text-[16px] font-semibold text-[var(--text-primary)]">CSV / Excel</p>
                <p className="mb-6 min-h-[40px] flex-1 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                  Import spreadsheets from any PSA when a native connector is not available.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-auto h-11 w-full border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Import file
                </Button>
              </CardMouseSpotlight>
            </div>
          </div>
        </section>

        <Dialog
          open={activeDetail !== null}
          onOpenChange={(open) => {
            if (!open) closeDetail();
          }}
        >
          <DialogContent className="max-h-[min(92dvh,880px)] w-[min(100vw-1.5rem,560px)] gap-0 overflow-y-auto border-[var(--border)] bg-[var(--bg-primary)] p-0 sm:max-w-[560px]">
            {activeDetail === "halo" ? (
              <div className="p-6">
                <DialogHeader className="space-y-1 pb-4 text-left">
                  <DialogTitle className="text-xl font-semibold text-[var(--text-primary)]">HaloPSA</DialogTitle>
                  <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
                    Connect Handover read-only to your Halo tenant so you can import tickets, run delivery health
                    summaries, and push notes back without copy-paste.
                  </p>
                </DialogHeader>
                <ol className="mb-6 list-decimal space-y-2 pl-5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                  <li>Create a Halo API application (Client ID + Secret) with ticket read access.</li>
                  <li>Paste your Halo URL and credentials below.</li>
                  <li>Run Test connection, then use Import from PSA inside Reports.</li>
                </ol>
                {!isPro ? (
                  <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-[13px] text-[var(--text-secondary)]">
                    PSA connections require Pro.{" "}
                    <button
                      type="button"
                      className="font-medium text-[var(--accent)] underline-offset-4 hover:underline"
                      onClick={onUpgrade}
                    >
                      Upgrade
                    </button>
                  </div>
                ) : (
                  <>
                    {haloReconnectRecommended ? (
                      <div
                        className="mb-4 flex flex-col gap-3 rounded-[var(--radius)] border border-amber-500/35 bg-amber-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                        role="status"
                      >
                        <p className="text-[13px] leading-snug text-[var(--text-primary)]">
                          Connection error - please reconnect HaloPSA.
                        </p>
                        <Button
                          type="button"
                          className="h-9 shrink-0 bg-[var(--accent)] px-4 text-white hover:bg-[var(--accent-hover)]"
                          onClick={() => onOpenHaloReconnectConfig?.()}
                        >
                          Reconnect
                        </Button>
                      </div>
                    ) : null}
                    <div className="mb-4 flex items-center justify-between gap-2 text-[12px] text-[var(--text-muted)]">
                      <span>Status</span>
                      <StatusConnectionPill connected={haloConnected} />
                    </div>
                    {haloConnected && haloUrl ? (
                      <p className="mb-4 text-[12px] text-[var(--text-muted)]">Connected to {haloUrl}</p>
                    ) : null}
                    {haloConnected ? (
                      <div className="mb-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)]/70 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                            Auto-generate closure summary
                          </p>
                          <Switch
                            checked={haloAutoClosureSummary}
                            disabled={haloAutoClosureSummaryBusy}
                            onCheckedChange={(next) => {
                              void onHaloAutoClosureSummaryChange(next);
                            }}
                            aria-label="Auto-generate closure summary"
                          />
                        </div>
                        <p className="mt-2 text-[12px] leading-relaxed text-[var(--text-muted)]">
                          When enabled, Handover can push a closure summary when a ticket resolves in HaloPSA.
                        </p>
                      </div>
                    ) : null}
                    {!haloConnected ? (
                      <div className="space-y-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                        <div className="space-y-2">
                          <label className="text-[13px] font-medium text-[var(--text-secondary)]">HaloPSA URL</label>
                          <input
                            className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)]"
                            placeholder="https://yourcompany.halopsa.com"
                            value={haloUrlInput}
                            onChange={(e) => setHaloUrlInput(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[13px] font-medium text-[var(--text-secondary)]">
                            Tenant (optional)
                          </label>
                          <input
                            className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)]"
                            placeholder="yourcompany"
                            value={haloTenant}
                            onChange={(e) => setHaloTenant(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[13px] font-medium text-[var(--text-secondary)]">Client ID</label>
                          <input
                            className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)]"
                            value={haloClientId}
                            onChange={(e) => setHaloClientId(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[13px] font-medium text-[var(--text-secondary)]">Client Secret</label>
                          <input
                            type="password"
                            className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)]"
                            value={haloClientSecret}
                            onChange={(e) => setHaloClientSecret(e.target.value)}
                          />
                        </div>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm font-medium text-[var(--text-primary)]"
                          onClick={() => setHaloHelpOpen(!haloHelpOpen)}
                        >
                          How to get these credentials
                        </button>
                        {haloHelpOpen ? (
                          <ol className="list-decimal space-y-1 pl-5 text-sm text-[var(--text-secondary)]">
                            <li>In HaloPSA go to Configuration → Integrations → Halo API</li>
                            <li>Click View Applications then New</li>
                            <li>Name it Handover, set Authentication Method to Client ID and Secret (Services)</li>
                            <li>In Permissions tab select read:tickets and read:customers</li>
                            <li>Copy the Client ID and Client Secret</li>
                          </ol>
                        ) : null}
                        {haloError ? <p className="text-sm text-[var(--danger)]">{haloError}</p> : null}
                        <Button
                          type="button"
                          className="w-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                          onClick={() => void onConnect()}
                          disabled={haloLoading}
                        >
                          {haloLoading ? "Connecting..." : "Connect HaloPSA"}
                        </Button>
                        <Link
                          href="/integrations/halopsa"
                          className="block text-center text-[13px] text-[var(--accent)] hover:underline"
                        >
                          View the setup guide →
                        </Link>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <Button
                          type="button"
                          className="w-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                          onClick={onImportTickets}
                        >
                          Import tickets →
                        </Button>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void onTest()}
                            disabled={haloTestLoading}
                          >
                            {haloTestLoading ? "Testing..." : "Test connection"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-[var(--danger)]"
                            onClick={() => void onDisconnect()}
                            disabled={haloLoading}
                          >
                            Disconnect
                          </Button>
                        </div>
                        {haloPermissionWarning ? (
                          <p className="text-xs text-[var(--warning)]">{haloPermissionWarning}</p>
                        ) : null}
                        {haloError ? <p className="text-sm text-[var(--danger)]">{haloError}</p> : null}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : null}

            {activeDetail === "connectwise" ? (
              <div className="p-6">
                <DialogHeader className="space-y-1 pb-4 text-left">
                  <DialogTitle className="text-xl font-semibold text-[var(--text-primary)]">
                    ConnectWise Manage
                  </DialogTitle>
                  <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
                    Use the ConnectWise Manage REST API to pull service tickets into Handover and validate your
                    integration with a one-click test.
                  </p>
                </DialogHeader>
                <ol className="mb-6 list-decimal space-y-2 pl-5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                  <li>Generate API keys from your ConnectWise member profile.</li>
                  <li>Enter your cloud site URL and company identifier.</li>
                  <li>Save &amp; connect, then run Test connection.</li>
                </ol>
                {!isPro ? (
                  <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-[13px] text-[var(--text-secondary)]">
                    PSA connections require Pro.{" "}
                    <button
                      type="button"
                      className="font-medium text-[var(--accent)] underline-offset-4 hover:underline"
                      onClick={onUpgrade}
                    >
                      Upgrade
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex items-center justify-between gap-2 text-[12px] text-[var(--text-muted)]">
                      <span>Status</span>
                      <StatusConnectionPill connected={cwConnected} />
                    </div>
                    {cwConnected && cwSiteUrl ? (
                      <p className="mb-4 text-[12px] text-[var(--text-muted)]">Connected to {cwSiteUrl}</p>
                    ) : null}
                    {!cwConnected ? (
                      <div className="space-y-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                        <div className="space-y-2">
                          <label className="text-[13px] font-medium text-[var(--text-secondary)]">Site URL</label>
                          <input
                            className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)]"
                            placeholder="https://yourcompany.connectwise.com"
                            value={cwSiteUrlInput}
                            onChange={(e) => setCwSiteUrlInput(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[13px] font-medium text-[var(--text-secondary)]">Company ID</label>
                          <input
                            className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)]"
                            value={cwCompanyIdInput}
                            onChange={(e) => setCwCompanyIdInput(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[13px] font-medium text-[var(--text-secondary)]">Public Key</label>
                          <input
                            className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)]"
                            value={cwPublicKeyInput}
                            onChange={(e) => setCwPublicKeyInput(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[13px] font-medium text-[var(--text-secondary)]">Private Key</label>
                          <input
                            type="password"
                            className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)]"
                            value={cwPrivateKeyInput}
                            onChange={(e) => setCwPrivateKeyInput(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[13px] font-medium text-[var(--text-secondary)]">Client ID</label>
                          <input
                            className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)]"
                            value={cwClientIdInput}
                            onChange={(e) => setCwClientIdInput(e.target.value)}
                          />
                        </div>
                        {cwError ? <p className="text-sm text-[var(--danger)]">{cwError}</p> : null}
                        {cwTestMessage ? (
                          <p
                            className={cn(
                              "text-sm",
                              cwTestOk === true
                                ? "text-[var(--success)]"
                                : cwTestOk === false
                                  ? "text-[var(--danger)]"
                                  : "text-[var(--text-secondary)]",
                            )}
                          >
                            {cwTestMessage}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                            onClick={() => void onCwSave()}
                            disabled={cwSaveLoading}
                          >
                            {cwSaveLoading ? "Saving..." : "Save & connect"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => void onCwTest()}
                            disabled={cwTestLoading}
                          >
                            {cwTestLoading ? "Testing..." : "Test connection"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void onCwTest()}
                            disabled={cwTestLoading}
                          >
                            {cwTestLoading ? "Testing..." : "Test connection"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-[var(--danger)]"
                            onClick={() => void onCwDisconnect()}
                            disabled={cwSaveLoading}
                          >
                            Disconnect
                          </Button>
                        </div>
                        {cwTestMessage ? (
                          <p
                            className={cn(
                              "text-sm",
                              cwTestOk === true
                                ? "text-[var(--success)]"
                                : cwTestOk === false
                                  ? "text-[var(--danger)]"
                                  : "text-[var(--text-secondary)]",
                            )}
                          >
                            {cwTestMessage}
                          </p>
                        ) : null}
                        {cwError ? <p className="text-sm text-[var(--danger)]">{cwError}</p> : null}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : null}

            {activeDetail === "slack" ? (
              <div className="p-6">
                <DialogHeader className="space-y-1 pb-4 text-left">
                  <DialogTitle className="text-xl font-semibold text-[var(--text-primary)]">Slack</DialogTitle>
                  <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
                    Route a concise “report ready” message to a channel so your team sees every client send without
                    checking email.
                  </p>
                </DialogHeader>
                <ol className="mb-6 list-decimal space-y-2 pl-5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                  <li>In Slack, create an Incoming Webhook for the destination channel.</li>
                  <li>Paste the webhook URL below and enable notifications.</li>
                  <li>Use Send test message to confirm the channel receives Handover.</li>
                </ol>
                {!isPro ? (
                  <p className="text-[13px] text-[var(--text-secondary)]">Slack alerts are available on Pro.</p>
                ) : (
                  <>
                    <div className="mb-4 flex items-center justify-between gap-2 text-[12px] text-[var(--text-muted)]">
                      <span>Status</span>
                      <StatusConnectionPill connected={slackChatConnected} />
                    </div>
                    <div className="space-y-3">
                      <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[var(--text-secondary)]">
                        <input
                          type="checkbox"
                          className="size-4 shrink-0 rounded border-[var(--border)] accent-[var(--accent)]"
                          checked={slackNotificationsEnabled}
                          onChange={(e) => void onSlackNotificationsToggle(e.target.checked)}
                        />
                        Enable Slack notifications
                      </label>
                      <div className="space-y-2">
                        <label className="text-[13px] font-medium text-[var(--text-secondary)]">
                          Incoming webhook URL
                        </label>
                        <input
                          className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)]"
                          placeholder="https://hooks.slack.com/services/…"
                          value={slackWebhookUrl}
                          onChange={(e) => setSlackWebhookUrl(e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                          onClick={() => void onSaveSlackWebhook()}
                          disabled={slackWebhookSaveLoading}
                        >
                          {slackWebhookSaveLoading ? "Saving…" : "Save"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void onTestSlackWebhook()}
                          disabled={slackWebhookTestLoading}
                        >
                          {slackWebhookTestLoading ? "Sending…" : "Test connection"}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : null}

            {activeDetail === "teams" ? (
              <div className="p-6">
                <DialogHeader className="space-y-1 pb-4 text-left">
                  <DialogTitle className="text-xl font-semibold text-[var(--text-primary)]">
                    Microsoft Teams
                  </DialogTitle>
                  <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
                    Mirror the same alerts into Teams for delivery leads who live in chat instead of email.
                  </p>
                </DialogHeader>
                <ol className="mb-6 list-decimal space-y-2 pl-5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                  <li>In Teams, add an Incoming Webhook connector to your channel.</li>
                  <li>Copy the webhook URL into Handover and enable notifications.</li>
                  <li>Send a test message to validate delivery.</li>
                </ol>
                {!isPro ? (
                  <p className="text-[13px] text-[var(--text-secondary)]">Teams alerts are available on Pro.</p>
                ) : (
                  <>
                    <div className="mb-4 flex items-center justify-between gap-2 text-[12px] text-[var(--text-muted)]">
                      <span>Status</span>
                      <StatusConnectionPill connected={teamsChatConnected} />
                    </div>
                    <div className="space-y-3">
                      <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[var(--text-secondary)]">
                        <input
                          type="checkbox"
                          className="size-4 shrink-0 rounded border-[var(--border)] accent-[var(--accent)]"
                          checked={teamsNotificationsEnabled}
                          onChange={(e) => void onTeamsNotificationsToggle(e.target.checked)}
                        />
                        Enable Teams notifications
                      </label>
                      <div className="space-y-2">
                        <label className="text-[13px] font-medium text-[var(--text-secondary)]">
                          Incoming webhook URL
                        </label>
                        <input
                          className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)]"
                          placeholder="https://…"
                          value={teamsWebhookUrl}
                          onChange={(e) => setTeamsWebhookUrl(e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                          onClick={() => void onSaveTeamsWebhook()}
                          disabled={teamsWebhookSaveLoading}
                        >
                          {teamsWebhookSaveLoading ? "Saving…" : "Save"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void onTestTeamsWebhook()}
                          disabled={teamsWebhookTestLoading}
                        >
                          {teamsWebhookTestLoading ? "Sending…" : "Test connection"}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : null}

            {activeDetail === "zapier" ? (
              <div className="p-6">
                <DialogHeader className="space-y-1 pb-4 text-left">
                  <DialogTitle className="text-xl font-semibold text-[var(--text-primary)]">Zapier</DialogTitle>
                  <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
                    Zapier will let you trigger Handover when tickets change in other tools. We are finishing the
                    hosted webhook and API key experience—preview the planned workflow below.
                  </p>
                </DialogHeader>
                <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-[13px] text-[var(--text-secondary)]">
                  <p className="font-medium text-[var(--text-primary)]">Coming soon</p>
                  <p className="mt-1">
                    You will generate an API key, copy the Handover webhook URL into a Zap action, and map ticket JSON
                    into the request body—same flow you see on our public Zapier overview page.
                  </p>
                  <Link
                    href="/integrations/zapier"
                    className="mt-3 inline-block font-medium text-[var(--accent)] underline-offset-4 hover:underline"
                  >
                    Read the marketing overview →
                  </Link>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <div className="mt-6 flex flex-wrap items-center gap-8 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] px-6 py-4">
          <div className="flex min-w-[200px] items-start gap-2">
            <Shield className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" aria-hidden />
            <div>
              <p className="text-[13px] font-medium text-[var(--text-primary)]">Read-only API access</p>
              <p className="text-[12px] text-[var(--text-muted)]">Handover never modifies your data</p>
            </div>
          </div>
          <div className="flex min-w-[200px] items-start gap-2">
            <Lock className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" aria-hidden />
            <div>
              <p className="text-[13px] font-medium text-[var(--text-primary)]">Encrypted credentials</p>
              <p className="text-[12px] text-[var(--text-muted)]">API keys encrypted before storage</p>
            </div>
          </div>
          <div className="flex min-w-[200px] items-start gap-2">
            <EyeOff className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" aria-hidden />
            <div>
              <p className="text-[13px] font-medium text-[var(--text-primary)]">Data not retained</p>
              <p className="text-[12px] text-[var(--text-muted)]">Ticket data processed, never stored</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
