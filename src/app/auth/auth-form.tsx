"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authCallbackUrlWithNext } from "@/lib/auth-email-redirect";
import type { TrialPlanQuery } from "@/lib/auth/trial-query";
import { appendTrialQueryToPath, PENDING_TRIAL_STORAGE_KEY } from "@/lib/auth/trial-query";
import { createClient } from "@/lib/supabase";

type AuthFormProps = {
  initialAuthError: boolean;
  initialAuthCallbackError: boolean;
  initialConfirmationExpired: boolean;
  expiredEmailPrefill?: string;
  callbackFailureReason: string | null;
  initialTab: "signin" | "signup";
  returnTo?: string;
  /** From `?trial=` on `/auth` — appended to post-login redirects and email/OAuth callback `next`. */
  trialPlan?: TrialPlanQuery;
};

function isObfuscatedDuplicateSignupUser(user: User | null): boolean {
  if (!user) return false;
  return Array.isArray(user.identities) && user.identities.length === 0;
}

function isLikelyUnconfirmedDuplicateSignup(
  err: { code?: string; message?: string } | null,
  data: { user: User | null },
): boolean {
  if (isObfuscatedDuplicateSignupUser(data.user)) return true;
  if (!err) return false;
  const code = typeof err.code === "string" ? err.code : "";
  const msg = (err.message || "").toLowerCase();
  if (code === "email_exists") return true;
  if (msg.includes("email not confirmed") || msg.includes("not confirmed")) return true;
  if (msg.includes("already been registered")) return true;
  return false;
}

const CALLBACK_REASON_COPY: Record<string, { title: string; detail: string }> = {
  missing_code: {
    title: "Confirmation link incomplete",
    detail:
      "The link did not include a valid sign-in code. Request a new confirmation email and use the latest link only once.",
  },
  pkce_verifier_missing: {
    title: "Open the link in the same browser you signed up in",
    detail:
      "For security, confirmation must finish in the same browser session where you created your account. Corporate email scanners can also break the link - request a new email and open it on the same device, or paste the URL into the browser where you registered.",
  },
  link_expired_or_invalid: {
    title: "Link expired or already used",
    detail:
      "Confirmation links only work for a limited time and once per sign-up. Request a new confirmation email below.",
  },
  exchange_failed: {
    title: "We could not confirm your email from that link",
    detail:
      "Something went wrong while completing sign-in. Request a new confirmation email below.",
  },
};

function callbackReasonCopy(reason: string | null): { title: string; detail: string } {
  if (reason && CALLBACK_REASON_COPY[reason]) {
    return CALLBACK_REASON_COPY[reason];
  }
  return CALLBACK_REASON_COPY.exchange_failed;
}

const MIN_PASSWORD_LEN = 8;

function normalizeStoredRef(raw: string): string {
  return raw.trim().toUpperCase();
}

function readHandoverRefCookie(): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|;\s*)handover_ref=([^;]*)/);
  if (!m?.[1]) return "";
  try {
    return decodeURIComponent(m[1].trim());
  } catch {
    return m[1].trim();
  }
}

function getStoredReferralCode(): string | undefined {
  try {
    const ls = localStorage.getItem("handover_ref")?.trim();
    if (ls) return normalizeStoredRef(ls);
  } catch {
    /* ignore */
  }
  const c = readHandoverRefCookie().trim();
  if (c) return normalizeStoredRef(c);
  return undefined;
}

function safeInternalPath(raw: string | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return null;
  return t;
}

const GOOGLE_LOGO_SRC =
  "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg";

function GoogleAuthSection(props: {
  disabled: boolean;
  error: string | null;
  onContinueGoogle: () => void | Promise<void>;
}) {
  return (
    <>
      <div className="relative my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--border)]" aria-hidden />
        <span className="shrink-0 text-[12px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
          or continue with
        </span>
        <div className="h-px flex-1 bg-[var(--border)]" aria-hidden />
      </div>
      {props.error ? (
        <p className="mb-2 text-sm font-medium text-[var(--danger)]" role="alert">
          {props.error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={props.disabled}
        onClick={() => void props.onContinueGoogle()}
        className="flex h-10 w-full items-center justify-center gap-3 rounded-[var(--radius)] border border-white/20 bg-[#121212] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[#1a1a1a] disabled:pointer-events-none disabled:opacity-50 dark:border-white/15 dark:bg-[#0c0c0c] dark:hover:bg-[#141414]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- external Google brand asset */}
        <img src={GOOGLE_LOGO_SRC} alt="" width={18} height={18} className="shrink-0" />
        Continue with Google
      </button>
    </>
  );
}

type AuthPanel = "tabs" | "forgot-password";

export function AuthForm({
  initialAuthError,
  initialAuthCallbackError,
  initialConfirmationExpired,
  expiredEmailPrefill,
  callbackFailureReason,
  initialTab,
  returnTo,
  trialPlan,
}: AuthFormProps) {
  const router = useRouter();
  const destinationAfterAuth = useMemo(() => {
    const base = safeInternalPath(returnTo) ?? "/";
    return appendTrialQueryToPath(base, trialPlan);
  }, [returnTo, trialPlan]);

  useEffect(() => {
    if (!trialPlan) return;
    try {
      localStorage.setItem(PENDING_TRIAL_STORAGE_KEY, trialPlan);
    } catch {
      /* ignore */
    }
  }, [trialPlan]);

  const [activeTab, setActiveTab] = useState<AuthFormProps["initialTab"]>(() =>
    initialConfirmationExpired || initialAuthCallbackError ? "signin" : initialTab,
  );
  const [authPanel, setAuthPanel] = useState<AuthPanel>("tabs");

  // Sign in
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signInNeedsConfirmation, setSignInNeedsConfirmation] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendFeedback, setResendFeedback] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Sign up
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState("");
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [signUpSuccessIsResend, setSignUpSuccessIsResend] = useState(false);

  const [expiredEmailInput, setExpiredEmailInput] = useState(() => expiredEmailPrefill ?? "");
  const [expiredResendBusy, setExpiredResendBusy] = useState(false);
  const [expiredResendStatus, setExpiredResendStatus] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  const [oauthBusy, setOauthBusy] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref?.trim()) {
        const normalized = normalizeStoredRef(ref);
        localStorage.setItem("handover_ref", normalized);
        const maxAge = 30 * 24 * 60 * 60;
        document.cookie = `handover_ref=${encodeURIComponent(normalized)}; max-age=${maxAge}; path=/; SameSite=Lax`;
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!signUpSuccess) return;

    const supabase = createClient();
    let cancelled = false;

    const redirectIfSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session?.user) {
        router.push(destinationAfterAuth);
        router.refresh();
      }
    };

    void redirectIfSession();
    const intervalId = window.setInterval(() => {
      void redirectIfSession();
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [signUpSuccess, destinationAfterAuth, router]);

  const fieldClass = "flex flex-col gap-2";
  const labelClass = "text-[13px] font-medium text-[var(--text-secondary)]";

  const handleContinueWithGoogle = async () => {
    setOauthError(null);
    setOauthBusy(true);
    if (trialPlan) {
      try {
        localStorage.setItem(PENDING_TRIAL_STORAGE_KEY, trialPlan);
      } catch {
        /* ignore */
      }
    }
    const supabase = createClient();
    const redirectTo = authCallbackUrlWithNext(destinationAfterAuth);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    setOauthBusy(false);
    if (error) {
      setOauthError(error.message || "Could not start Google sign-in. Please try again.");
      return;
    }
    if (data.url) {
      window.location.href = data.url;
    } else {
      setOauthError("Could not start Google sign-in. Please try again.");
    }
  };

  const handleResendConfirmation = async () => {
    const email = signInEmail.trim();
    if (!email || resendBusy) return;
    setResendBusy(true);
    setResendFeedback(null);
    const res = await fetch("/api/auth/email-verification/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setResendBusy(false);
    if (!res.ok) {
      setResendFeedback({
        kind: "err",
        text: "Could not send the email. Please try again.",
      });
      return;
    }
    setResendFeedback({
      kind: "ok",
      text: "Confirmation email sent - check your inbox.",
    });
  };

  const handleExpiredSendNewLink = async () => {
    const email = expiredEmailInput.trim();
    if (!email || expiredResendBusy) return;
    setExpiredResendBusy(true);
    setExpiredResendStatus(null);
    const res = await fetch("/api/auth/email-verification/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setExpiredResendBusy(false);
    if (!res.ok) {
      setExpiredResendStatus({
        kind: "err",
        text: "We could not send that email. Check the address and try again.",
      });
      return;
    }
    setExpiredResendStatus({
      kind: "ok",
      text: "Confirmation email sent - check your inbox.",
    });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = signInEmail.trim();
    if (!email || !signInPassword || isSigningIn) return;

    setIsSigningIn(true);
    setSignInError(null);
    setSignInNeedsConfirmation(false);
    setResendFeedback(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: signInPassword,
    });

    setIsSigningIn(false);

    if (error) {
      const code =
        typeof (error as { code?: string }).code === "string"
          ? (error as { code: string }).code
          : "";
      const msg = (error.message || "").toLowerCase();
      if (code === "email_not_confirmed" || msg.includes("email not confirmed")) {
        setSignInNeedsConfirmation(true);
        setSignInError(
          "Your email hasn't been confirmed yet. Check your inbox for the confirmation link.",
        );
        return;
      }

      const isInvalidCredentials =
        code === "invalid_credentials" ||
        msg.includes("invalid login credentials") ||
        msg.includes("invalid credentials");

      if (isInvalidCredentials) {
        try {
          const hintRes = await fetch("/api/auth/sign-in-hint", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          if (hintRes.ok) {
            const hintBody = (await hintRes.json()) as { hint?: string };
            if (hintBody.hint === "google_oauth") {
              setSignInError(
                "This account uses Google sign-in. Click 'Continue with Google' to sign in, or use 'Forgot password' to set a password.",
              );
              return;
            }
          }
        } catch {
          /* fall through to generic message */
        }
      }

      setSignInError("Invalid email or password.");
      return;
    }

    router.push(destinationAfterAuth);
    router.refresh();
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = forgotEmail.trim();
    if (!email || forgotSending) return;

    setForgotSending(true);
    setForgotError(null);

    try {
      const supabase = createClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/reset-password`,
      });
    } catch {
      setForgotError("Could not send email. Please try again.");
      setForgotSending(false);
      return;
    }

    setForgotSending(false);
    setForgotSuccess(true);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError(null);
    setSignUpSuccessIsResend(false);

    if (signUpPassword.length < MIN_PASSWORD_LEN) {
      setSignUpError(`Password must be at least ${MIN_PASSWORD_LEN} characters.`);
      return;
    }
    if (signUpPassword !== signUpConfirmPassword) {
      setSignUpError("Passwords must match.");
      return;
    }
    if (!termsAccepted) {
      setSignUpError("Please accept the Terms of Service and Privacy Policy.");
      return;
    }

    const email = signUpEmail.trim();
    if (!email || isSigningUp) return;

    setIsSigningUp(true);

    const supabase = createClient();
    const referralCode = getStoredReferralCode();

    const { data, error: signUpErr } = await supabase.auth.signUp({
      email,
      password: signUpPassword,
      options: {
        emailRedirectTo: authCallbackUrlWithNext(destinationAfterAuth),
        data: referralCode ? { referral_code: referralCode } : undefined,
      },
    });

    if (isLikelyUnconfirmedDuplicateSignup(signUpErr, data)) {
      const res = await fetch("/api/auth/email-verification/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setIsSigningUp(false);
      if (!res.ok) {
        setSignUpError(
          "We could not send a confirmation email just now. Please try again in a moment.",
        );
        return;
      }
      setSignUpError(null);
      setSignUpSuccess(true);
      setSignUpSuccessIsResend(true);
      return;
    }

    if (signUpErr) {
      setIsSigningUp(false);
      setSignUpError(signUpErr.message || "Could not create account.");
      return;
    }

    if (data.user && referralCode) {
      const { data: sessionWrap } = await supabase.auth.getSession();
      if (sessionWrap.session) {
        void fetch("/api/referrals/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ code: referralCode, userId: data.user.id }),
        }).catch(() => {});
      }
    }

    setIsSigningUp(false);
    setSignUpSuccess(true);
    setSignUpSuccessIsResend(false);

    void fetch("/api/auth/email-verification/send", {
      method: "POST",
      credentials: "same-origin",
    }).catch(() => {});
  };

  return (
    <div className="relative z-[1] mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-[440px] items-center px-4 py-8 sm:py-10">
      <div className="auth-card-shell w-full rounded-2xl border border-white/[0.10] bg-white/[0.05] p-4 backdrop-blur-xl sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        {initialConfirmationExpired ? (
          <div className="space-y-4 text-[var(--text-primary)]">
            <p className="text-[16px] font-semibold leading-snug">This confirmation link has expired.</p>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              Enter the email you used to sign up and we&apos;ll send a new confirmation link.
            </p>
            <div className={fieldClass}>
              <label htmlFor="expired-confirm-email" className={labelClass}>
                Email address
              </label>
              <Input
                id="expired-confirm-email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={expiredEmailInput}
                onChange={(e) => setExpiredEmailInput(e.target.value)}
                disabled={expiredResendBusy}
                className="auth-input-focus-glow h-10 rounded-[var(--radius)] border-[var(--border)] bg-[var(--bg-primary)] transition-shadow duration-200"
              />
            </div>
            <Button
              type="button"
              size="lg"
              className="w-full gap-2 rounded-[var(--radius)] bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
              disabled={expiredResendBusy || !expiredEmailInput.trim()}
              onClick={() => void handleExpiredSendNewLink()}
            >
              {expiredResendBusy ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Sending…
                </>
              ) : (
                "Send new confirmation link"
              )}
            </Button>
            {expiredResendStatus ? (
              <p
                className={`text-sm font-medium ${expiredResendStatus.kind === "ok" ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--danger)]"}`}
                role="status"
              >
                {expiredResendStatus.text}
              </p>
            ) : null}
            <button
              type="button"
              className="text-[13px] font-medium text-[var(--accent)] hover:underline"
              onClick={() => {
                router.replace("/auth?tab=signin");
              }}
            >
              ← Back to sign in
            </button>
          </div>
        ) : initialAuthCallbackError ? (
          <div
            className="mb-4 space-y-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-4 text-[var(--text-primary)] shadow-sm"
            role="alert"
          >
            {(() => {
              const { title, detail } = callbackReasonCopy(callbackFailureReason);
              return (
                <>
                  <p className="text-[15px] font-semibold leading-snug">{title}</p>
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                    {detail}
                  </p>
                </>
              );
            })()}
            <div className={fieldClass}>
              <label htmlFor="callback-resend-email" className={labelClass}>
                Account email
              </label>
              <Input
                id="callback-resend-email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={signInEmail}
                onChange={(e) => setSignInEmail(e.target.value)}
                disabled={resendBusy}
                className="auth-input-focus-glow h-10 rounded-[var(--radius)] border-[var(--border)] bg-[var(--bg-primary)] transition-shadow duration-200"
              />
            </div>
            <Button
              type="button"
              size="lg"
              className="w-full gap-2 rounded-[var(--radius)] bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
              disabled={resendBusy || !signInEmail.trim()}
              onClick={() => void handleResendConfirmation()}
            >
              {resendBusy ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Sending…
                </>
              ) : (
                "Resend confirmation email"
              )}
            </Button>
            {resendFeedback ? (
              <p
                className={`text-sm font-medium ${resendFeedback.kind === "ok" ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--danger)]"}`}
                role="status"
              >
                {resendFeedback.text}
              </p>
            ) : null}
          </div>
        ) : initialAuthError ? (
          <div
            className="mb-4 space-y-3 rounded-[var(--radius)] border px-4 py-3 text-sm text-[var(--danger)]"
            style={{
              borderColor: "color-mix(in srgb, var(--danger) 25%, transparent)",
              backgroundColor: "color-mix(in srgb, var(--danger) 8%, transparent)",
            }}
            role="alert"
          >
            <p className="font-semibold">Sign-in from your link did not finish</p>
            <p className="text-[13px] leading-relaxed opacity-95">
              If you were confirming your email, the link may have expired, been used already, or
              opened on a different browser than where you signed up. Enter your email on the Sign
              in tab and use &quot;Resend confirmation email&quot; below the form.
            </p>
          </div>
        ) : null}

        {signUpSuccess ? (
          <div
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] p-6 text-[var(--text-primary)] shadow-sm"
            role="status"
          >
            <p className="text-[15px] leading-relaxed text-[var(--text-secondary)]">
              {signUpSuccessIsResend
                ? "We've sent a new confirmation link to your email. Please check your inbox and spam folder."
                : "Check your email to confirm your account before signing in."}
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-[var(--text-muted)]">
              After you open the confirmation link, this page will send you to the app automatically
              (you can keep this tab open).
            </p>
          </div>
        ) : authPanel === "forgot-password" ? (
          <div className="w-full space-y-6">
            {forgotSuccess ? (
              <div
                className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] p-6 text-[var(--text-primary)] shadow-sm"
                role="status"
              >
                <p className="text-[15px] leading-relaxed text-[var(--text-secondary)]">
                  If an account exists for that email, you&apos;ll receive a reset link shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                  Reset password
                </h2>
                <div className={fieldClass}>
                  <label htmlFor="forgot-email" className={labelClass}>
                    Email address
                  </label>
                  <Input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    disabled={forgotSending}
                    required
                    className="auth-input-focus-glow h-10 rounded-[var(--radius)] border-[var(--border)] bg-[var(--bg-primary)] transition-shadow duration-200"
                  />
                </div>
                {forgotError ? (
                  <p className="text-sm font-medium text-[var(--danger)]" role="alert">
                    {forgotError}
                  </p>
                ) : null}
                <Button
                  type="submit"
                  size="lg"
                  className="auth-primary-btn-premium w-full gap-2 rounded-[var(--radius)] bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                  disabled={forgotSending || !forgotEmail.trim()}
                >
                  {forgotSending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Sending…
                    </>
                  ) : (
                    "Send reset link →"
                  )}
                </Button>
              </form>
            )}
            <button
              type="button"
              className="text-[13px] font-medium text-[var(--accent)] hover:underline"
              onClick={() => {
                setAuthPanel("tabs");
                setForgotSuccess(false);
                setForgotError(null);
                setForgotEmail("");
              }}
            >
              ← Back to sign in
            </button>
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "signin" | "signup")}
            className="w-full gap-6"
          >
            <TabsList
              variant="line"
              className="h-auto w-full justify-start gap-1 border-b border-[var(--border)] bg-transparent p-0"
            >
              <TabsTrigger
                value="signin"
                className="shrink-0 text-[var(--text-secondary)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--accent)] data-[state=active]:text-[var(--text-primary)]"
              >
                Sign in
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="shrink-0 text-[var(--text-secondary)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--accent)] data-[state=active]:text-[var(--text-primary)]"
              >
                Create account
              </TabsTrigger>
            </TabsList>

            {activeTab === "signup" ? (
              <div className="mt-3 text-center text-[13px] text-[var(--text-secondary)]">
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-medium text-[var(--accent)] hover:underline"
                  onClick={() => setActiveTab("signin")}
                >
                  Sign in →
                </button>
              </div>
            ) : (
              <div className="mt-3 text-center text-[13px] text-[var(--text-secondary)]">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  className="font-medium text-[var(--accent)] hover:underline"
                  onClick={() => setActiveTab("signup")}
                >
                  Start free trial →
                </button>
              </div>
            )}

            <TabsContent value="signin" className="mt-0">
              <form onSubmit={handleSignIn} className="flex flex-col gap-4">
                <div className={fieldClass}>
                  <label htmlFor="signin-email" className={labelClass}>
                    Email address
                  </label>
                  <Input
                    id="signin-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    disabled={isSigningIn}
                    required
                    className="auth-input-focus-glow h-10 rounded-[var(--radius)] border-[var(--border)] bg-[var(--bg-primary)] transition-shadow duration-200"
                  />
                </div>

                <div className={fieldClass}>
                  <label htmlFor="signin-password" className={labelClass}>
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={showSignInPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      disabled={isSigningIn}
                      required
                      className="auth-input-focus-glow h-10 rounded-[var(--radius)] border-[var(--border)] bg-[var(--bg-primary)] pr-10 transition-shadow duration-200"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      onClick={() => setShowSignInPassword((v) => !v)}
                      aria-label={showSignInPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showSignInPassword ? (
                        <EyeOff className="size-4" aria-hidden />
                      ) : (
                        <Eye className="size-4" aria-hidden />
                      )}
                    </button>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="text-xs text-[var(--accent)] hover:underline"
                      onClick={() => {
                        setAuthPanel("forgot-password");
                        setForgotEmail(signInEmail.trim());
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                {signInError ? (
                  <p className="text-sm font-medium text-[var(--danger)]" role="alert">
                    {signInError}
                  </p>
                ) : null}

                {signInNeedsConfirmation ? (
                  <div
                    className="space-y-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-4 shadow-sm"
                    role="region"
                    aria-label="Resend confirmation email"
                  >
                    <p className="text-[13px] font-medium text-[var(--text-primary)]">
                      Resend confirmation email
                    </p>
                    <Button
                      type="button"
                      size="lg"
                      variant="outline"
                      className="w-full gap-2 rounded-[var(--radius)] border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)]/10"
                      disabled={resendBusy || !signInEmail.trim()}
                      onClick={() => void handleResendConfirmation()}
                    >
                      {resendBusy ? (
                        <>
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                          Sending…
                        </>
                      ) : (
                        "Resend confirmation email"
                      )}
                    </Button>
                    {resendFeedback ? (
                      <p
                        className={`text-sm font-medium ${resendFeedback.kind === "ok" ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--danger)]"}`}
                        role="status"
                      >
                        {resendFeedback.text}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  size="lg"
                  className="auth-primary-btn-premium w-full gap-2 rounded-[var(--radius)] bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                  disabled={isSigningIn || !signInEmail.trim() || !signInPassword}
                >
                  {isSigningIn ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Signing in…
                    </>
                  ) : (
                    "Sign in →"
                  )}
                </Button>
              </form>
              <GoogleAuthSection
                disabled={oauthBusy || isSigningIn}
                error={oauthError}
                onContinueGoogle={handleContinueWithGoogle}
              />
            </TabsContent>

            <TabsContent value="signup" className="mt-0">
              <form onSubmit={handleSignUp} className="flex flex-col gap-4">
                <div className={fieldClass}>
                  <label htmlFor="su-email" className={labelClass}>
                    Email address
                  </label>
                  <Input
                    id="su-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    disabled={isSigningUp}
                    required
                    className="auth-input-focus-glow h-10 rounded-[var(--radius)] border-[var(--border)] bg-[var(--bg-primary)] transition-shadow duration-200"
                  />
                </div>

                <div className={fieldClass}>
                  <label htmlFor="su-password" className={labelClass}>
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="su-password"
                      type={showSignUpPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder={`At least ${MIN_PASSWORD_LEN} characters`}
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      disabled={isSigningUp}
                      required
                      minLength={MIN_PASSWORD_LEN}
                      className="auth-input-focus-glow h-10 rounded-[var(--radius)] border-[var(--border)] bg-[var(--bg-primary)] pr-10 transition-shadow duration-200"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      onClick={() => setShowSignUpPassword((v) => !v)}
                      aria-label={showSignUpPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showSignUpPassword ? (
                        <EyeOff className="size-4" aria-hidden />
                      ) : (
                        <Eye className="size-4" aria-hidden />
                      )}
                    </button>
                  </div>
                </div>

                <div className={fieldClass}>
                  <label htmlFor="su-confirm" className={labelClass}>
                    Confirm password
                  </label>
                  <div className="relative">
                    <Input
                      id="su-confirm"
                      type={showSignUpConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Re-enter password"
                      value={signUpConfirmPassword}
                      onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                      disabled={isSigningUp}
                      required
                      minLength={MIN_PASSWORD_LEN}
                      className="auth-input-focus-glow h-10 rounded-[var(--radius)] border-[var(--border)] bg-[var(--bg-primary)] pr-10 transition-shadow duration-200"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      onClick={() => setShowSignUpConfirmPassword((v) => !v)}
                      aria-label={
                        showSignUpConfirmPassword ? "Hide password" : "Show password"
                      }
                      tabIndex={-1}
                    >
                      {showSignUpConfirmPassword ? (
                        <EyeOff className="size-4" aria-hidden />
                      ) : (
                        <Eye className="size-4" aria-hidden />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <Checkbox
                    id="terms-accept"
                    checked={termsAccepted}
                    onCheckedChange={(v) => setTermsAccepted(v === true)}
                    disabled={isSigningUp}
                    className="mt-0.5"
                  />
                  <label
                    htmlFor="terms-accept"
                    className="text-[13px] leading-snug text-[var(--text-secondary)]"
                  >
                    I agree to the{" "}
                    <Link href="/terms" className="font-medium text-[var(--accent)] hover:underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/privacy"
                      className="font-medium text-[var(--accent)] hover:underline"
                    >
                      Privacy Policy
                    </Link>
                  </label>
                </div>

                {signUpError ? (
                  <p className="text-sm font-medium text-[var(--danger)]" role="alert">
                    {signUpError}
                  </p>
                ) : null}

                <Button
                  type="submit"
                  size="lg"
                  className="auth-primary-btn-premium w-full gap-2 rounded-[var(--radius)] bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                  disabled={
                    isSigningUp ||
                    !signUpEmail.trim() ||
                    !signUpPassword ||
                    !signUpConfirmPassword ||
                    !termsAccepted
                  }
                >
                  {isSigningUp ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Creating account…
                    </>
                  ) : (
                    "Create account →"
                  )}
                </Button>
              </form>
              <GoogleAuthSection
                disabled={oauthBusy || isSigningUp}
                error={oauthError}
                onContinueGoogle={handleContinueWithGoogle}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
