"use client";

import Image from "next/image";
import { useState } from "react";

import { mspBrandAccentColour, mspBrandLogoUrl } from "@/lib/portal-customer-brand-display";
import { cn } from "@/lib/utils";

type PortalMspCustomerLoginProps = {
  mspSlug: string;
  mspDisplayName: string;
  brandLogoUrl?: string | null;
  brandColour?: string | null;
};

export function PortalMspCustomerLogin({
  mspSlug,
  mspDisplayName,
  brandLogoUrl,
  brandColour,
}: PortalMspCustomerLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const mspLogo = mspBrandLogoUrl(brandLogoUrl);
  const accent = mspBrandAccentColour(brandColour);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/portal/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          msp_slug: mspSlug,
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        client_slug?: string;
      };
      if (!res.ok || !j.ok) {
        setLoginError(j.error ?? "Sign in failed.");
        return;
      }
      const cs = typeof j.client_slug === "string" ? j.client_slug.trim() : "";
      if (!cs) {
        setLoginError("Sign in succeeded but could not determine your portal. Contact your MSP.");
        return;
      }
      window.location.href = `/portal/${encodeURIComponent(mspSlug)}/${encodeURIComponent(cs)}`;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div
        className={cn(
          "w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] p-6 md:p-8",
        )}
      >
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          {mspLogo ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote MSP branding URLs
            <img src={mspLogo} alt="" className="h-10 w-auto max-w-[200px] object-contain" />
          ) : (
            <Image src="/icon2.png" alt="Handover" width={40} height={40} className="rounded-md" />
          )}
          <div>
            <h1 className="text-lg font-semibold text-[var(--text-primary)]">{mspDisplayName}</h1>
            <p className="mt-1 text-[13px] text-[var(--text-secondary)]">Client portal sign in</p>
          </div>
        </div>
        <form className="space-y-4" onSubmit={(e) => void onLogin(e)}>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">Email</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          {loginError ? <p className="text-[13px] text-red-400">{loginError}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-[var(--radius)] py-2.5 text-[13px] font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: accent }}
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
