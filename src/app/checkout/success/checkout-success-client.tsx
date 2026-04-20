"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useToast } from "@/components/toasts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authCallbackUrl } from "@/lib/auth-email-redirect";
import { createClient } from "@/lib/supabase";

type SessionPayload = {
  email: string | null;
  customer_id: string | null;
  status: string;
  account_exists?: boolean;
};

type CheckoutSuccessClientProps = {
  sessionId: string;
};

export function CheckoutSuccessClient({ sessionId }: CheckoutSuccessClientProps) {
  const router = useRouter();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [existingAccount, setExistingAccount] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setError("Missing checkout session id.");
      setLoading(false);
      return;
    }

    let active = true;
    void (async () => {
      try {
        const res = await fetch(`/api/checkout/session?id=${encodeURIComponent(sessionId)}`);
        const data = (await res.json()) as SessionPayload & { error?: string };
        if (!res.ok) {
          setError(data.error ?? "Could not verify payment.");
          setLoading(false);
          return;
        }
        if (!active) return;

        setEmail(data.email ?? "");
        setExistingAccount(Boolean(data.account_exists));
        setLoading(false);
      } catch (e) {
        console.error(e);
        if (!active) return;
        setError("Could not verify payment.");
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!existingAccount) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    void (async () => {
      try {
        await fetch("/api/profile/reconcile-stripe-plan", { method: "POST", credentials: "same-origin" });
      } catch {
        /* non-fatal; webhook may already have synced */
      }
      if (cancelled) return;
      timer = setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 2000);
    })();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [existingAccount, router]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!email || !firstName.trim() || !lastName.trim() || password.length < 8) return;

    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: authCallbackUrl(),
        },
      });

      if (signUpError) {
        setError(signUpError.message || "Could not create account.");
        setSubmitting(false);
        return;
      }

      if (!data.user) {
        setError("Account creation did not return a user.");
        setSubmitting(false);
        return;
      }

      const { error: upsertError } = await supabase.from("profiles").upsert(
        {
          id: data.user.id,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          job_title: jobTitle.trim() || null,
          company_name: companyName.trim() || null,
        },
        { onConflict: "id" },
      );

      if (upsertError) {
        setError(upsertError.message || "Could not finalise your account.");
        setSubmitting(false);
        return;
      }

      const linkRes = await fetch("/api/checkout/attach-session", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (!linkRes.ok) {
        const payload = (await linkRes.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? "Could not link your subscription. Contact support.");
        setSubmitting(false);
        return;
      }

      void fetch("/api/auth/email-verification/send", {
        method: "POST",
        credentials: "same-origin",
      }).catch(() => {});

      toast({
        message: "Welcome to Handover Pro",
        subtitle: "Your account is active.",
        durationMs: 3000,
      });
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Could not finalise your account.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen animate-in fade-in duration-300 bg-[var(--bg-secondary)] px-4 py-12">
      <div className="mx-auto w-full max-w-[480px] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-8 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-5 flex justify-center">
          <CheckCircle2 className="size-10 text-emerald-500" aria-hidden />
        </div>
        <p className="text-center text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          Payment successful
        </p>
        <p className="mt-3 text-center text-xs text-[var(--text-muted)]">
          Step 1 of 2 complete - Payment
        </p>
        <p className="text-center text-xs text-[var(--text-secondary)]">
          Step 2 of 2 - Create account
        </p>

        {loading ? (
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-[var(--text-secondary)]">
            <Loader2 className="size-4 animate-spin" />
            Verifying your payment...
          </div>
        ) : error ? (
          <p className="mt-6 rounded-[var(--radius)] border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : existingAccount ? (
          <div className="mt-8 text-center">
            <h1 className="text-[22px] font-bold text-[var(--text-primary)]">
              You&apos;re all set
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Your Pro subscription is active. Redirecting you to the app...
            </p>
          </div>
        ) : (
          <>
            <h1 className="mt-6 text-center text-[22px] font-bold text-[var(--text-primary)]">
              You&apos;re in. Set up your account.
            </h1>
            <p className="mt-2 text-center text-[15px] text-[var(--text-secondary)]">
              Your Pro subscription is active. Create your account to start using
              Handover.
            </p>

            <form onSubmit={handleActivate} className="mt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-[var(--text-secondary)]">Email</label>
                <Input value={email} disabled className="h-10 border-[var(--border)]" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-[var(--text-secondary)]">First name</label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="h-10 border-[var(--border)]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-[var(--text-secondary)]">Last name</label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="h-10 border-[var(--border)]"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-[var(--text-secondary)]">
                  Create a password
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                  placeholder="At least 8 characters"
                  className="h-10 border-[var(--border)]"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-[var(--text-secondary)]">Job title</label>
                  <Input
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Optional"
                    className="h-10 border-[var(--border)]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-[var(--text-secondary)]">Company name</label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Optional"
                    className="h-10 border-[var(--border)]"
                  />
                </div>
              </div>

              {error ? (
                <p className="text-sm text-[var(--danger)]">{error}</p>
              ) : null}

              <Button
                type="submit"
                className="w-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                disabled={submitting || !firstName.trim() || !lastName.trim() || password.length < 8}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Activating...
                  </>
                ) : (
                  "Activate my account"
                )}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
