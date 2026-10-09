"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, Cog, Copy, EyeOff, Loader2, Lock, Plus, Shield, X } from "lucide-react";

import { CardMouseSpotlight } from "@/components/card-mouse-spotlight";
import { HaloCredentialsFields } from "@/components/halo-credentials-fields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/** Hub + inline detail keys — never used for routing. */
export type ActiveIntegrationId = "halopsa" | "connectwise" | "slack" | "teams";

type DisconnectConfirmId = "halo" | "connectwise" | "slack" | "teams";

const INTEGRATION_DETAIL_TITLES: Record<ActiveIntegrationId, string> = {
  halopsa: "HaloPSA",
  connectwise: "ConnectWise Manage",
  slack: "Slack",
  teams: "Microsoft Teams",
};

const INTEGRATION_DETAIL_LOGOS: Record<ActiveIntegrationId, string> = {
  halopsa: "/halopsa.png",
  connectwise: "/images/connectwise.png",
  slack: "/slack.png",
  teams: "/teams.png",
};

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
  haloClientIdMasked: string;
  haloClientIdLength: number | null;
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
  onDisconnectSlackNotifications?: () => void | Promise<void>;
  onDisconnectTeamsNotifications?: () => void | Promise<void>;
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

function StatusConnectionPill({
  connected,
  unknown = false,
}: {
  connected: boolean;
  unknown?: boolean;
}) {
  if (unknown) {
    return (
      <span className="rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">
        Unknown
      </span>
    );
  }
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

/** Group headers (PSA, Automation, Notifications, etc.) */
const INTEGRATION_SECTION_HDR =
  "text-[11px] font-semibold uppercase tracking-widest text-[var(--text-secondary)] mb-3";

function formatConnectionDate(value: string | null): string {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleString();
}

export function IntegrationsPanel({
  hasProFeatures,
  userTeamId,
  integrationsBootstrapping,
  initialOpenDetail = null,
  onConsumedInitialOpenDetail,
  haloConnected,
  haloUrl,
  haloClientIdMasked,
  haloClientIdLength,
  haloUpdatedAt,
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
  onDisconnectSlackNotifications,
  onDisconnectTeamsNotifications,
}: IntegrationsPanelProps) {
  const isPro = hasProFeatures;
  const connectedCount = isPro ? (haloConnected ? 1 : 0) + (cwConnected ? 1 : 0) : 0;

  const [activeIntegration, setActiveIntegration] = useState<ActiveIntegrationId | null>(null);
  const [disconnectConfirm, setDisconnectConfirm] = useState<DisconnectConfirmId | null>(null);
  const [haloDetailTab, setHaloDetailTab] = useState<"connection" | "settings">("connection");
  const [haloCredentialsEntryMode, setHaloCredentialsEntryMode] = useState(false);
  const wasHaloLoading = useRef(false);
  const [cwDetailTab, setCwDetailTab] = useState<"connection" | "settings">("connection");

  useEffect(() => {
    if (wasHaloLoading.current && !haloLoading && haloConnected && !haloError) {
      setHaloCredentialsEntryMode(false);
    }
    wasHaloLoading.current = haloLoading;
  }, [haloConnected, haloError, haloLoading]);

  const openIntegration = useCallback(
    (id: ActiveIntegrationId) => {
      setActiveIntegration(id);
      if (id === "halopsa") {
        setHaloDetailTab("connection");
        if (!haloConnected) setHaloConfigOpen(true);
      }
      if (id === "connectwise") {
        setCwDetailTab("connection");
        if (!cwConnected) setCwConfigOpen(true);
      }
    },
    [haloConnected, cwConnected, setHaloConfigOpen, setCwConfigOpen],
  );

  const closeIntegration = useCallback(() => {
    setActiveIntegration(null);
    setHaloConfigOpen(false);
    setCwConfigOpen(false);
    setDisconnectConfirm(null);
    setHaloDetailTab("connection");
    setCwDetailTab("connection");
  }, [setHaloConfigOpen, setCwConfigOpen]);

  useEffect(() => {
    if (!initialOpenDetail) return;
    if (initialOpenDetail === "halo") openIntegration("halopsa");
    else openIntegration("connectwise");
    queueMicrotask(() => onConsumedInitialOpenDetail?.());
  }, [initialOpenDetail, openIntegration, onConsumedInitialOpenDetail]);

  const slackChatConnected =
    isPro &&
    slackNotificationsEnabled &&
    Boolean(slackWebhookUrl.trim());
  const teamsChatConnected =
    isPro &&
    teamsNotificationsEnabled &&
    Boolean(teamsWebhookUrl.trim());

  async function runConfirmedDisconnect() {
    if (!disconnectConfirm) return;
    try {
      if (disconnectConfirm === "halo") await onDisconnect();
      else if (disconnectConfirm === "connectwise") await onCwDisconnect();
      else if (disconnectConfirm === "slack") await onDisconnectSlackNotifications?.();
      else if (disconnectConfirm === "teams") await onDisconnectTeamsNotifications?.();
    } finally {
      setDisconnectConfirm(null);
    }
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
        Upgrade to Starter
      </Button>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col animate-in fade-in duration-300 bg-[var(--bg-secondary)]">
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          activeIntegration ? "w-full min-w-0 px-0 py-0" : "mx-auto w-full max-w-[1100px] overflow-y-auto px-4 py-6 sm:px-6",
        )}
      >
        {activeIntegration ? (
          <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col bg-[var(--bg-primary)]">
            <div className="shrink-0 px-4 pt-3">
              <button
                type="button"
                onClick={closeIntegration}
                className="inline-flex w-fit items-center gap-1.5 border-0 bg-transparent p-0 text-left text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                aria-label="Back to Integrations hub"
              >
                <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
                <span>Back to Integrations</span>
              </button>
            </div>
            {activeIntegration === "halopsa" && isPro && haloConnected ? (
              <div className="flex shrink-0 gap-8 border-b border-[var(--border)] px-4">
                <button
                  type="button"
                  onClick={() => setHaloDetailTab("connection")}
                  className={cn(
                    "-mb-px border-b-2 pb-2.5 text-[13px] font-medium transition-colors",
                    haloDetailTab === "connection"
                      ? "border-[var(--accent)] text-white"
                      : "border-transparent text-[var(--text-secondary)] hover:text-white",
                  )}
                >
                  Connection
                </button>
                <button
                  type="button"
                  onClick={() => setHaloDetailTab("settings")}
                  className={cn(
                    "-mb-px border-b-2 pb-2.5 text-[13px] font-medium transition-colors",
                    haloDetailTab === "settings"
                      ? "border-[var(--accent)] text-white"
                      : "border-transparent text-[var(--text-secondary)] hover:text-white",
                  )}
                >
                  Settings
                </button>
              </div>
            ) : null}
            {activeIntegration === "connectwise" && isPro && cwConnected ? (
              <div className="flex shrink-0 gap-8 border-b border-[var(--border)] px-4">
                <button
                  type="button"
                  onClick={() => setCwDetailTab("connection")}
                  className={cn(
                    "-mb-px border-b-2 pb-2.5 text-[13px] font-medium transition-colors",
                    cwDetailTab === "connection"
                      ? "border-[var(--accent)] text-white"
                      : "border-transparent text-[var(--text-secondary)] hover:text-white",
                  )}
                >
                  Connection
                </button>
                <button
                  type="button"
                  onClick={() => setCwDetailTab("settings")}
                  className={cn(
                    "-mb-px border-b-2 pb-2.5 text-[13px] font-medium transition-colors",
                    cwDetailTab === "settings"
                      ? "border-[var(--accent)] text-white"
                      : "border-transparent text-[var(--text-secondary)] hover:text-white",
                  )}
                >
                  Settings
                </button>
              </div>
            ) : null}
            <div className="min-h-0 w-full flex-1 overflow-y-auto">

            {activeIntegration === "halopsa" ? (
              <div className="w-full min-w-0 px-4 pb-8 pt-6 sm:px-8">
                <div className="mb-6 flex items-center gap-4">
                  <img
                    src={INTEGRATION_DETAIL_LOGOS.halopsa}
                    alt=""
                    className="h-12 w-12 shrink-0 object-contain"
                    width={48}
                    height={48}
                  />
                  <h2 className="text-xl font-semibold text-[var(--text-primary)]">{INTEGRATION_DETAIL_TITLES.halopsa}</h2>
                </div>
                {(!haloConnected || haloCredentialsEntryMode) ? (
                  <>
                    <DialogHeader className="space-y-1 pb-4 text-left">
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
                  </>
                ) : null}
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
                    {!haloConnected || haloDetailTab === "connection" ? (
                      <>
                        <div className="mb-4 flex items-center justify-between gap-2 text-[12px] text-[var(--text-muted)]">
                          <span>Status</span>
                          <StatusConnectionPill
                            connected={haloConnected}
                            unknown={integrationsBootstrapping}
                          />
                        </div>
                        {haloConnected ? (
                          <div className="mb-4 space-y-2 rounded-[var(--radius)] border border-emerald-500/20 bg-emerald-500/5 p-4 text-[12px]">
                            <p className="font-medium text-[var(--text-primary)]">Connected</p>
                            <p className="text-[var(--text-muted)]">
                              Instance: <span className="text-[var(--text-secondary)]">{haloUrl || "Unknown"}</span>
                            </p>
                            <p className="text-[var(--text-muted)]">
                              Last used successfully:{" "}
                              <span className="text-[var(--text-secondary)]">
                                {formatConnectionDate(haloUpdatedAt)}
                              </span>
                            </p>
                            <p className="text-[var(--text-muted)]">
                              Client ID:{" "}
                              <span className="font-mono text-[var(--text-secondary)]">
                                {haloClientIdMasked || "••••"}{" "}
                                {haloClientIdLength != null ? `(${haloClientIdLength} characters)` : ""}
                              </span>
                            </p>
                            <p className="text-[var(--text-muted)]">
                              Client secret:{" "}
                              <span className="font-mono text-[var(--text-secondary)]">••••••••••••</span>
                            </p>
                          </div>
                        ) : null}
                        {!haloConnected || haloCredentialsEntryMode ? (
                          <div className="space-y-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                            <HaloCredentialsFields
                              url={haloUrlInput}
                              onUrlChange={setHaloUrlInput}
                              tenant={haloTenant}
                              onTenantChange={setHaloTenant}
                              clientId={haloClientId}
                              onClientIdChange={setHaloClientId}
                              clientSecret={haloClientSecret}
                              onClientSecretChange={setHaloClientSecret}
                              variant="configuration"
                              idPrefix="configuration-halo"
                            />
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
                            {haloError ? (
                              <div>
                                <p className="text-sm text-[var(--danger)]">{haloError}</p>
                                <p className="mt-1 text-[12px] text-white/40">
                                  Double-check your Client ID and Secret in HaloPSA →
                                  Configuration → Integrations.
                                </p>
                              </div>
                            ) : null}
                            <Button
                              type="button"
                              className="w-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                              onClick={() => void onConnect()}
                              disabled={haloLoading}
                            >
                              {haloLoading
                                ? "Saving..."
                                : haloCredentialsEntryMode
                                  ? "Save and test connection"
                                  : "Connect HaloPSA"}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            <Button
                              type="button"
                              className="w-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                              onClick={() => void onTest()}
                              disabled={haloTestLoading}
                            >
                              {haloTestLoading ? "Testing..." : "Test connection"}
                            </Button>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onImportTickets}
                              >
                                Import tickets →
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setHaloCredentialsEntryMode(true);
                                  setHaloUrlInput("");
                                  setHaloTenant("");
                                  setHaloClientId("");
                                  setHaloClientSecret("");
                                  setHaloHelpOpen(false);
                                }}
                              >
                                Replace credentials
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
                            {haloError ? (
                              <div>
                                <p className="text-sm text-[var(--danger)]">{haloError}</p>
                                <p className="mt-1 text-[12px] text-white/40">
                                  Double-check your Client ID and Secret in HaloPSA →
                                  Configuration → Integrations.
                                </p>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </>
                    ) : null}
                    {haloConnected && haloDetailTab === "settings" ? (
                      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)]/70 p-4">
                        <p className="text-[13px] font-semibold text-[var(--text-primary)]">Auto closure summary</p>
                        <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-muted)]">
                          Automatically generate and push a summary note when a ticket is closed in HaloPSA.
                        </p>
                        <div className="mt-3 flex justify-end">
                          <Switch
                            checked={haloAutoClosureSummary}
                            disabled={haloAutoClosureSummaryBusy}
                            onCheckedChange={(next) => {
                              void onHaloAutoClosureSummaryChange(next);
                            }}
                            aria-label="Auto closure summary for HaloPSA"
                          />
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}

            {activeIntegration === "connectwise" ? (
              <div className="w-full min-w-0 px-4 pb-8 pt-6 sm:px-8">
                <div className="mb-6 flex items-center gap-4">
                  <img
                    src={INTEGRATION_DETAIL_LOGOS.connectwise}
                    alt=""
                    className="h-12 w-12 shrink-0 object-contain"
                    width={48}
                    height={48}
                  />
                  <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                    {INTEGRATION_DETAIL_TITLES.connectwise}
                  </h2>
                </div>
                {(!cwConnected || cwDetailTab === "connection") ? (
                  <>
                    <DialogHeader className="space-y-1 pb-4 text-left">
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
                  </>
                ) : null}
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
                    {!cwConnected || cwDetailTab === "connection" ? (
                      <>
                        <div className="mb-4 flex items-center justify-between gap-2 text-[12px] text-[var(--text-muted)]">
                          <span>Status</span>
                          <StatusConnectionPill
                            connected={cwConnected}
                            unknown={integrationsBootstrapping}
                          />
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
                            {cwError ? (
                              <div>
                                <p className="text-sm text-[var(--danger)]">{cwError}</p>
                                <p className="mt-1 text-[12px] text-white/40">
                                  Check your Company ID and API keys in ConnectWise → System →
                                  Members → API Members.
                                </p>
                              </div>
                            ) : null}
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
                            {cwError ? (
                              <div>
                                <p className="text-sm text-[var(--danger)]">{cwError}</p>
                                <p className="mt-1 text-[12px] text-white/40">
                                  Check your Company ID and API keys in ConnectWise → System →
                                  Members → API Members.
                                </p>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </>
                    ) : null}
                    {cwConnected && cwDetailTab === "settings" ? (
                      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)]/70 p-4">
                        <p className="text-[13px] font-semibold text-[var(--text-primary)]">Auto closure summary</p>
                        <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-muted)]">
                          Automatically generate and push a summary note when a ticket is closed in ConnectWise.
                          Today the background job only posts closure summaries for HaloPSA; ConnectWise support is on
                          the roadmap.
                        </p>
                        <div className="mt-3 flex justify-end">
                          <Switch
                            checked={false}
                            disabled
                            aria-label="Auto closure summary for ConnectWise (not available yet)"
                          />
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}

            {activeIntegration === "slack" ? (
              <div className="w-full min-w-0 px-4 pb-8 pt-6 sm:px-8">
                <div className="mb-6 flex items-center gap-4">
                  <img
                    src={INTEGRATION_DETAIL_LOGOS.slack}
                    alt=""
                    className="h-12 w-12 shrink-0 object-contain"
                    width={48}
                    height={48}
                  />
                  <h2 className="text-xl font-semibold text-[var(--text-primary)]">{INTEGRATION_DETAIL_TITLES.slack}</h2>
                </div>
                <DialogHeader className="space-y-1 pb-4 text-left">
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

            {activeIntegration === "teams" ? (
              <div className="w-full min-w-0 px-4 pb-8 pt-6 sm:px-8">
                <div className="mb-6 flex items-center gap-4">
                  <img
                    src={INTEGRATION_DETAIL_LOGOS.teams}
                    alt=""
                    className="h-12 w-12 shrink-0 object-contain"
                    width={48}
                    height={48}
                  />
                  <h2 className="text-xl font-semibold text-[var(--text-primary)]">{INTEGRATION_DETAIL_TITLES.teams}</h2>
                </div>
                <DialogHeader className="space-y-1 pb-4 text-left">
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

            </div>
          </div>
        ) : null}

        {!activeIntegration ? (
        <>
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Integrations</h1>
          <p className="mt-1 text-[13px] text-[var(--text-secondary)]">Connect and configure your tools</p>
        </div>

        <section aria-labelledby="psa-integrations-heading" className="mb-10">
          <h2 id="psa-integrations-heading" className={INTEGRATION_SECTION_HDR}>
            PSA integrations
          </h2>
          <div className="flex flex-wrap gap-4">
            <div className="group relative flex w-32 flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] p-4 transition-colors transition-transform duration-150 hover:scale-105 hover:bg-white/[0.02]">
              {!isPro ? proLockCard : null}
              <button
                type="button"
                className="absolute right-2 top-2 z-[11] border-0 bg-transparent p-0 opacity-0 shadow-none outline-none transition-opacity duration-150 focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
                aria-label={haloConnected ? "Disconnect HaloPSA" : "Connect HaloPSA"}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isPro) {
                    onUpgrade();
                    return;
                  }
                  if (haloConnected) setDisconnectConfirm("halo");
                  else openIntegration("halopsa");
                }}
              >
                {haloConnected ? (
                  <X className="h-4 w-4 text-red-400 hover:text-red-300" aria-hidden />
                ) : (
                  <Plus className="h-4 w-4 text-[var(--accent)] hover:text-white" aria-hidden />
                )}
              </button>
              <button
                type="button"
                disabled={!isPro}
                onClick={(e) => {
                  e.preventDefault();
                  if (!isPro) {
                    onUpgrade();
                    return;
                  }
                  openIntegration("halopsa");
                }}
                className={cn("flex flex-col items-center gap-2", isPro ? "cursor-pointer" : "cursor-default")}
              >
                <div
                  className={cn(
                    "relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full",
                    haloConnected
                      ? "border-2 border-[#0EA5E9] bg-[#0c1f3f]"
                      : "border border-[var(--border)] bg-[var(--bg-secondary)]",
                  )}
                >
                  <img src="/halopsa.png" alt="" className="h-10 w-10 object-contain" />
                </div>
                <span className="text-center text-[12px] font-medium text-[var(--text-primary)]">HaloPSA</span>
              </button>
            </div>

            <div className="group relative flex w-32 flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] p-4 transition-colors transition-transform duration-150 hover:scale-105 hover:bg-white/[0.02]">
              {!isPro ? proLockCard : null}
              <button
                type="button"
                className="absolute right-2 top-2 z-[11] border-0 bg-transparent p-0 opacity-0 shadow-none outline-none transition-opacity duration-150 focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
                aria-label={cwConnected ? "Disconnect ConnectWise" : "Connect ConnectWise"}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isPro) {
                    onUpgrade();
                    return;
                  }
                  if (cwConnected) setDisconnectConfirm("connectwise");
                  else openIntegration("connectwise");
                }}
              >
                {cwConnected ? (
                  <X className="h-4 w-4 text-red-400 hover:text-red-300" aria-hidden />
                ) : (
                  <Plus className="h-4 w-4 text-[var(--accent)] hover:text-white" aria-hidden />
                )}
              </button>
              <button
                type="button"
                disabled={!isPro}
                onClick={(e) => {
                  e.preventDefault();
                  if (!isPro) {
                    onUpgrade();
                    return;
                  }
                  openIntegration("connectwise");
                }}
                className={cn("flex flex-col items-center gap-2", isPro ? "cursor-pointer" : "cursor-default")}
              >
                <div
                  className={cn(
                    "relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full",
                    cwConnected
                      ? "border-2 border-[#0EA5E9] bg-[#0c1f3f]"
                      : "border border-[var(--border)] bg-[var(--bg-secondary)]",
                  )}
                >
                  <div className="rounded-lg overflow-hidden bg-white p-1">
                    <img
                      src="/images/connectwise.png"
                      alt=""
                      className="h-8 w-8 object-contain"
                    />
                  </div>
                </div>
                <span className="text-center text-[12px] font-medium text-[var(--text-primary)]">ConnectWise</span>
              </button>
            </div>
          </div>
        </section>

        <section aria-labelledby="notifications-heading" className="mb-10">
          <h2 id="notifications-heading" className={INTEGRATION_SECTION_HDR}>
            Notifications
          </h2>
          <div className="flex flex-wrap gap-4">
            <div className="group relative flex w-32 flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] p-4 transition-colors transition-transform duration-150 hover:scale-105 hover:bg-white/[0.02]">
              {!isPro ? proLockCard : null}
              <button
                type="button"
                className="absolute right-2 top-2 z-[11] border-0 bg-transparent p-0 opacity-0 shadow-none outline-none transition-opacity duration-150 focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
                aria-label={slackChatConnected ? "Disconnect Slack" : "Connect Slack"}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isPro) {
                    onUpgrade();
                    return;
                  }
                  if (slackChatConnected) setDisconnectConfirm("slack");
                  else openIntegration("slack");
                }}
              >
                {slackChatConnected ? (
                  <X className="h-4 w-4 text-red-400 hover:text-red-300" aria-hidden />
                ) : (
                  <Plus className="h-4 w-4 text-[var(--accent)] hover:text-white" aria-hidden />
                )}
              </button>
              <button
                type="button"
                disabled={!isPro}
                onClick={(e) => {
                  e.preventDefault();
                  if (!isPro) {
                    onUpgrade();
                    return;
                  }
                  openIntegration("slack");
                }}
                className={cn("flex flex-col items-center gap-2", isPro ? "cursor-pointer" : "cursor-default")}
              >
                <div
                  className={cn(
                    "relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full",
                    slackChatConnected
                      ? "border-2 border-[#0EA5E9] bg-[#0c1f3f]"
                      : "border border-[var(--border)] bg-[var(--bg-secondary)]",
                  )}
                >
                  <img src="/slack.png" alt="" className="h-10 w-10 object-contain" />
                </div>
                <span className="text-center text-[12px] font-medium text-[var(--text-primary)]">Slack</span>
              </button>
            </div>

            <div className="group relative flex w-32 flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] p-4 transition-colors transition-transform duration-150 hover:scale-105 hover:bg-white/[0.02]">
              {!isPro ? proLockCard : null}
              <button
                type="button"
                className="absolute right-2 top-2 z-[11] border-0 bg-transparent p-0 opacity-0 shadow-none outline-none transition-opacity duration-150 focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
                aria-label={teamsChatConnected ? "Disconnect Teams" : "Connect Teams"}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isPro) {
                    onUpgrade();
                    return;
                  }
                  if (teamsChatConnected) setDisconnectConfirm("teams");
                  else openIntegration("teams");
                }}
              >
                {teamsChatConnected ? (
                  <X className="h-4 w-4 text-red-400 hover:text-red-300" aria-hidden />
                ) : (
                  <Plus className="h-4 w-4 text-[var(--accent)] hover:text-white" aria-hidden />
                )}
              </button>
              <button
                type="button"
                disabled={!isPro}
                onClick={(e) => {
                  e.preventDefault();
                  if (!isPro) {
                    onUpgrade();
                    return;
                  }
                  openIntegration("teams");
                }}
                className={cn("flex flex-col items-center gap-2", isPro ? "cursor-pointer" : "cursor-default")}
              >
                <div
                  className={cn(
                    "relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full",
                    teamsChatConnected
                      ? "border-2 border-[#0EA5E9] bg-[#0c1f3f]"
                      : "border border-[var(--border)] bg-[var(--bg-secondary)]",
                  )}
                >
                  <img src="/teams.png" alt="" className="h-10 w-10 object-contain" />
                </div>
                <span className="text-center text-[12px] font-medium text-[var(--text-primary)]">Microsoft Teams</span>
              </button>
            </div>
          </div>
        </section>
        <section className="mt-14" aria-labelledby="planned-heading">
          <h2 id="planned-heading" className={INTEGRATION_SECTION_HDR}>
            Coming soon
          </h2>
          <p className="mb-6 max-w-2xl text-[13px] leading-relaxed text-[var(--text-secondary)]">
            Roadmap PSA connectors and productivity surfaces. Join a waitlist to register interest.
          </p>
          <div
            className="grid gap-5"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
          >
            <div className="integration-card-glow opacity-50">
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
            <div className="integration-card-glow opacity-50">
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
          </div>
        </section>
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
        </>
        ) : null}

        <Dialog
          open={disconnectConfirm !== null}
          onOpenChange={(open) => {
            if (!open) setDisconnectConfirm(null);
          }}
        >
          <DialogContent
            className="w-[min(100vw-1.5rem,400px)] border-[var(--border)] bg-[var(--bg-primary)] p-6 sm:max-w-[400px]"
            showCloseButton
          >
            <DialogHeader>
              <DialogTitle className="text-[var(--text-primary)]">Disconnect?</DialogTitle>
              <p className="text-[13px] text-[var(--text-secondary)]">
                {disconnectConfirm === "halo"
                  ? "HaloPSA will be disconnected from Handover."
                  : disconnectConfirm === "connectwise"
                    ? "ConnectWise will be disconnected from Handover."
                    : disconnectConfirm === "slack"
                      ? "Slack notifications will be turned off and the webhook URL cleared."
                      : disconnectConfirm === "teams"
                        ? "Teams notifications will be turned off and the webhook URL cleared."
                        : ""}
              </p>
            </DialogHeader>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDisconnectConfirm(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-[var(--danger)] text-white hover:opacity-90"
                onClick={() => void runConfirmedDisconnect()}
              >
                Disconnect
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
