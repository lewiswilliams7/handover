"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase";

const MIN_PASSWORD_LEN = 8;

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessionReady, setSessionReady] = useState(false);
  const [linkError, setLinkError] = useState(false);
  const [checking, setChecking] = useState(true);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const supabase = createClient();
      const code = searchParams.get("code");

      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (initialSession) {
        setSessionReady(true);
        setChecking(false);
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          if (!cancelled) {
            setLinkError(true);
            setChecking(false);
          }
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (session) {
        setSessionReady(true);
      } else {
        setLinkError(true);
      }
      setChecking(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (password.length < MIN_PASSWORD_LEN) {
      setFormError(`Password must be at least ${MIN_PASSWORD_LEN} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords must match.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password,
    });
    setSubmitting(false);

    if (error) {
      setFormError(error.message || "Could not update password.");
      return;
    }

    setSuccess(true);
    window.setTimeout(() => {
      router.push("/auth?tab=signin");
      router.refresh();
    }, 2000);
  };

  const fieldClass = "flex flex-col gap-2";
  const labelClass = "text-[13px] font-medium text-[var(--text-secondary)]";

  if (checking) {
    return (
      <div className="relative z-[1] mx-auto flex min-h-[40vh] w-full max-w-[440px] items-center justify-center px-4 text-[var(--text-muted)]">
        Loading…
      </div>
    );
  }

  if (linkError || !sessionReady) {
    return (
      <div className="relative z-[1] mx-auto w-full max-w-[440px] px-4 py-8 sm:py-10">
        <div className="auth-card-shell w-full rounded-2xl border border-white/[0.10] bg-white/[0.05] p-4 backdrop-blur-xl sm:p-8 animate-in fade-in zoom-in-95 duration-200">
          <p className="text-[15px] leading-relaxed text-[var(--text-secondary)]">
            This reset link is invalid or has expired. Please request a new one from the sign-in
            page.
          </p>
          <Button
            type="button"
            className="mt-6 w-full rounded-[var(--radius)] bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
            onClick={() => router.push("/auth?tab=signin")}
          >
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="relative z-[1] mx-auto w-full max-w-[440px] px-4 py-8 sm:py-10">
        <div className="auth-card-shell w-full rounded-2xl border border-white/[0.10] bg-white/[0.05] p-4 backdrop-blur-xl sm:p-8 animate-in fade-in zoom-in-95 duration-200">
          <p className="text-[15px] leading-relaxed text-[var(--text-primary)]" role="status">
            Password updated successfully.
          </p>
          <p className="mt-2 text-[13px] text-[var(--text-muted)]">Redirecting to sign in…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-[1] mx-auto w-full max-w-[440px] px-4 py-8 sm:py-10">
      <div className="auth-card-shell w-full rounded-2xl border border-white/[0.10] bg-white/[0.05] p-4 backdrop-blur-xl sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            New password
          </h2>

          <div className={fieldClass}>
            <label htmlFor="reset-password" className={labelClass}>
              New password
            </label>
            <div className="relative">
              <Input
                id="reset-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder={`At least ${MIN_PASSWORD_LEN} characters`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                required
                minLength={MIN_PASSWORD_LEN}
                className="auth-input-focus-glow h-10 rounded-[var(--radius)] border-[var(--border)] bg-[var(--bg-primary)] pr-10 transition-shadow duration-200"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden />
                ) : (
                  <Eye className="size-4" aria-hidden />
                )}
              </button>
            </div>
          </div>

          <div className={fieldClass}>
            <label htmlFor="reset-confirm" className={labelClass}>
              Confirm new password
            </label>
            <div className="relative">
              <Input
                id="reset-confirm"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={submitting}
                required
                minLength={MIN_PASSWORD_LEN}
                className="auth-input-focus-glow h-10 rounded-[var(--radius)] border-[var(--border)] bg-[var(--bg-primary)] pr-10 transition-shadow duration-200"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="size-4" aria-hidden />
                ) : (
                  <Eye className="size-4" aria-hidden />
                )}
              </button>
            </div>
          </div>

          {formError ? (
            <p className="text-sm font-medium text-[var(--danger)]" role="alert">
              {formError}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="auth-primary-btn-premium w-full gap-2 rounded-[var(--radius)] bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
            disabled={
              submitting || password.length < MIN_PASSWORD_LEN || !confirmPassword
            }
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Updating…
              </>
            ) : (
              "Update password →"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
