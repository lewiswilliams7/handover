"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { usePortalBootstrap } from "@/components/portal-customer/portal-bootstrap-context";
import { mspBrandAccentColour, mspBrandLogoUrl } from "@/lib/portal-customer-brand-display";
import { cn } from "@/lib/utils";

export function PortalInvitePage() {
  const { account, client, profile } = usePortalBootstrap();
  const accent = mspBrandAccentColour(profile?.brand_colour);
  const mspLogo = mspBrandLogoUrl(profile?.brand_logo_url);
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);
  const isReset = searchParams.get("reset") === "1";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div
          className={cn(
            "w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] p-6 text-center",
          )}
        >
          <div className="mb-4 flex justify-center">
            {mspLogo ? (
              // eslint-disable-next-line @next/next/no-img-element -- remote MSP branding URLs
              <img src={mspLogo} alt="" className="h-9 w-auto max-w-[180px] object-contain" />
            ) : (
              <Image src="/icon2.png" alt="" width={36} height={36} className="rounded-md" />
            )}
          </div>
          <h1 className="text-lg font-semibold">Invalid link</h1>
          <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
            This invite link is missing a token. Contact your MSP for a new invite.
          </p>
        </div>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const url = isReset ? "/api/portal/auth/reset-password" : "/api/portal/auth/accept-invite";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        msp_slug?: string;
        client_slug?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      const ms = data.msp_slug ?? account.slug;
      const cs = data.client_slug ?? client.slug;
      router.replace(`/portal/${encodeURIComponent(ms)}/${encodeURIComponent(cs)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div
        className={cn(
          "w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] p-6 md:p-8",
        )}
      >
        <div className="mb-5 flex justify-center">
          {mspLogo ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote MSP branding URLs
            <img src={mspLogo} alt="" className="h-10 w-auto max-w-[200px] object-contain" />
          ) : (
            <Image src="/icon2.png" alt="" width={40} height={40} className="rounded-md" />
          )}
        </div>
        <h1 className="text-xl font-semibold">
          {isReset ? "Set a new password" : "Accept your invite"}
        </h1>
        <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
          {isReset
            ? "Choose a strong password for your client portal."
            : `Create a password to access the portal for ${client.client_name}.`}
        </p>
        <form className="mt-6 space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">Password</label>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[13px] outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">
              Confirm password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[13px] outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          {error ? <p className="text-[13px] text-red-400">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-[var(--radius)] py-2.5 text-[13px] font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: accent }}
          >
            {loading ? "Saving…" : isReset ? "Update password" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
