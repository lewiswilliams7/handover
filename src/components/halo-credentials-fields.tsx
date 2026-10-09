"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type ReactNode } from "react";

import { haloHostnameInputValue } from "@/lib/halo-url";

type HaloCredentialsFieldsProps = {
  url: string;
  onUrlChange: (value: string) => void;
  tenant: string;
  onTenantChange: (value: string) => void;
  clientId: string;
  onClientIdChange: (value: string) => void;
  clientSecret: string;
  onClientSecretChange: (value: string) => void;
  variant?: "onboarding" | "configuration";
  idPrefix?: string;
  children?: ReactNode;
};

function hostedTenantFromHostname(value: string): string {
  const hostname = haloHostnameInputValue(value).split("/")[0]?.split(":")[0]?.toLowerCase() ?? "";
  for (const suffix of [".usehalo.com", ".halopsa.com"]) {
    if (hostname.endsWith(suffix)) return hostname.slice(0, -suffix.length).split(".")[0] ?? "";
  }
  return "";
}

export function HaloCredentialsFields({
  url,
  onUrlChange,
  tenant,
  onTenantChange,
  clientId,
  onClientIdChange,
  clientSecret,
  onClientSecretChange,
  variant = "configuration",
  idPrefix = "halo",
  children,
}: HaloCredentialsFieldsProps) {
  const [tenantManuallyEdited, setTenantManuallyEdited] = useState(() => Boolean(tenant.trim()));
  const [urlInput, setUrlInput] = useState(() => haloHostnameInputValue(url));
  const lastEmittedUrl = useRef(url);
  const onboarding = variant === "onboarding";
  const labelClass = onboarding
    ? "text-xs font-semibold uppercase tracking-[0.12em] text-white/55"
    : "text-[13px] font-medium text-[var(--text-secondary)]";
  const inputClass = onboarding
    ? "mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/10"
    : "mt-2 h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)]";
  const urlInputClass = onboarding
    ? "h-full min-w-0 flex-1 bg-transparent px-1 pr-3 text-sm text-white outline-none placeholder:text-white/30"
    : "h-full min-w-0 flex-1 bg-transparent px-1 pr-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]";
  const urlShellClass = onboarding
    ? "mt-2 flex h-11 w-full items-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.06] transition focus-within:border-cyan-300/60 focus-within:ring-2 focus-within:ring-cyan-300/10"
    : "mt-2 flex h-10 w-full items-center overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)]";
  const helpClass = onboarding
    ? "mt-1.5 block text-xs leading-5 text-white/45"
    : "mt-1.5 text-[11px] leading-relaxed text-[var(--text-muted)]";
  const prefixClass = onboarding ? "pl-3 text-sm text-white/45" : "pl-3 text-sm text-[var(--text-muted)]";
  useEffect(() => {
    if (url !== lastEmittedUrl.current) {
      setUrlInput(haloHostnameInputValue(url));
      lastEmittedUrl.current = url;
    }
  }, [url]);

  const updateUrl = (value: string) => {
    setUrlInput(value);
    lastEmittedUrl.current = value;
    onUrlChange(value);
    if (!tenantManuallyEdited) onTenantChange(hostedTenantFromHostname(value));
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text");
    if (!/^https?:\/\//i.test(pasted.trim())) return;
    event.preventDefault();
    const input = event.currentTarget;
    const start = input.selectionStart ?? urlInput.length;
    const end = input.selectionEnd ?? start;
    const nextValue = `${urlInput.slice(0, start)}${haloHostnameInputValue(pasted)}${urlInput.slice(end)}`;
    updateUrl(nextValue);
  };

  return (
    <>
      <label htmlFor={`${idPrefix}-url`} className="block">
        <span className={labelClass}>HaloPSA URL</span>
        <span className={urlShellClass}>
          <span className={prefixClass}>https://</span>
          <input
            id={`${idPrefix}-url`}
            name={`${idPrefix}-url`}
            value={urlInput}
            onChange={(event) => updateUrl(event.target.value)}
            onPaste={handlePaste}
            placeholder="yourcompany.halopsa.com"
            required
            className={urlInputClass}
          />
        </span>
      </label>

      <label htmlFor={`${idPrefix}-tenant`} className="block">
        <span className={labelClass}>Tenant</span>
        <span className={helpClass}>
          Required for hosted Halo instances. If your URL is{" "}
          <code className={onboarding ? "text-cyan-200/80" : "text-[var(--text-secondary)]"}>
            handoveruk.trial.usehalo.com
          </code>
          , your tenant is{" "}
          <code className={onboarding ? "text-cyan-200/80" : "text-[var(--text-secondary)]"}>handoveruk</code>.
          Self-hosted instances usually leave this blank.
        </span>
        <input
          id={`${idPrefix}-tenant`}
          name={`${idPrefix}-tenant`}
          value={tenant}
          onChange={(event) => {
            setTenantManuallyEdited(true);
            onTenantChange(event.target.value);
          }}
          placeholder="e.g. handoveruk"
          className={inputClass}
        />
      </label>

      <label htmlFor={`${idPrefix}-client-id`} className="block">
        <span className={labelClass}>Client ID</span>
        <input
          id={`${idPrefix}-client-id`}
          name={`${idPrefix}-client-id`}
          value={clientId}
          onChange={(event) => onClientIdChange(event.target.value)}
          required
          className={inputClass}
        />
      </label>

      <label htmlFor={`${idPrefix}-client-secret`} className="block">
        <span className={labelClass}>Client Secret</span>
        <input
          id={`${idPrefix}-client-secret`}
          name={`${idPrefix}-client-secret`}
          type="password"
          value={clientSecret}
          onChange={(event) => onClientSecretChange(event.target.value)}
          autoComplete="new-password"
          required
          className={inputClass}
        />
      </label>

      {children}
    </>
  );
}
