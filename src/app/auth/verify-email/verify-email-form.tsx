"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { shouldRedirectToVerifyEmailPage } from "@/lib/auth/email-verification-gate";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";

export function VerifyEmailForm() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [resendBusy, setResendBusy] = useState(false);
  const [banner, setBanner] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const sb = createClient();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (cancelled) return;
      if (!user?.email) {
        router.replace("/auth?tab=signin");
        return;
      }
      const mustVerify = await shouldRedirectToVerifyEmailPage(sb, user);
      if (cancelled) return;
      if (!mustVerify) {
        router.replace("/");
        return;
      }
      setEmail(user.email);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const resend = useCallback(async () => {
    if (!email || resendBusy) return;
    setResendBusy(true);
    setBanner(null);
    try {
      const res = await fetch("/api/auth/email-verification/send", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setBanner({
          kind: "error",
          text: body.error ?? "Could not send email.",
        });
      } else {
        setBanner({ kind: "ok", text: "We sent another verification email." });
      }
    } finally {
      setResendBusy(false);
    }
  }, [email, resendBusy]);

  const onAlreadyVerifiedClick = useCallback(async () => {
    const sb = createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      router.push("/auth?tab=signin");
      return;
    }
    const mustVerify = await shouldRedirectToVerifyEmailPage(sb, user);
    if (!mustVerify) {
      router.replace("/");
      return;
    }
    router.push("/auth?tab=signin");
  }, [router]);

  if (loading) {
    return (
      <div className="relative z-[1] mx-auto flex min-h-[40vh] w-full max-w-[440px] items-center justify-center px-4 text-[var(--text-muted)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="relative z-[1] mx-auto w-full max-w-[440px] px-4 pb-8">
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)]/40 p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Check your email</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-[var(--text-secondary)]">
          We sent a verification link to{" "}
          <span className="font-medium text-[var(--text-primary)]">{email}</span>. Click the link to
          activate your account.
        </p>
        {banner ? (
          <p
            className={`mt-4 text-[13px] ${banner.kind === "ok" ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--danger)]"}`}
            role="status"
          >
            {banner.text}
          </p>
        ) : null}
        <Button
          type="button"
          className="mt-5 w-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
          disabled={resendBusy}
          onClick={() => void resend()}
        >
          {resendBusy ? "Sending…" : "Resend verification email"}
        </Button>
        <p className="mt-5 text-center text-[13px] text-[var(--text-muted)]">
          Already verified?{" "}
          <button
            type="button"
            className="font-medium text-[var(--accent)] underline-offset-4 hover:underline"
            onClick={() => void onAlreadyVerifiedClick()}
          >
            Click here to sign in
          </button>
        </p>
      </div>
    </div>
  );
}
