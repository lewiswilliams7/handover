import Link from "next/link";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { parseTrialQueryParam } from "@/lib/auth/trial-query";

import { AuthForm } from "./auth-form";

type AuthPageProps = {
  searchParams: Promise<{
    error?: string;
    tab?: string;
    next?: string;
    returnTo?: string;
    trial?: string;
    auth_callback_error?: string;
    reason?: string;
    confirmation_expired?: string;
    expired_email?: string;
  }>;
};

function sanitizeExpiredEmailPrefill(raw: string | undefined): string | undefined {
  if (!raw || typeof raw !== "string") return undefined;
  const t = raw.trim().slice(0, 254);
  if (!/^[^\s@]+@[^\s@]+$/.test(t)) return undefined;
  return t;
}

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const initialAuthError = params.error === "true";
  const initialAuthCallbackError = params.auth_callback_error === "1";
  const initialConfirmationExpired = params.confirmation_expired === "1";
  const expiredEmailPrefill = sanitizeExpiredEmailPrefill(params.expired_email);
  const callbackFailureReason =
    typeof params.reason === "string" && params.reason.trim()
      ? params.reason.trim()
      : null;
  const initialTab = params.tab === "signup" ? "signup" : "signin";
  const nextParam =
    typeof params.next === "string" && params.next.trim().startsWith("/portal/")
      ? params.next.trim()
      : undefined;
  const returnTo =
    typeof params.returnTo === "string" && params.returnTo.trim().startsWith("/")
      ? params.returnTo.trim()
      : nextParam;
  const trialPlan = parseTrialQueryParam(params.trial);

  return (
    <div
      className="relative min-h-screen animate-in fade-in duration-300 overflow-hidden bg-[#0f172a]"
      style={{ background: "var(--bg-primary, #0f172a)" }}
    >
      <div className="absolute inset-0 z-0 bg-[#0f172a]">
        <MarketingHeroAmbient />
      </div>
      <div className="relative z-[1] mb-4 flex w-full flex-col items-center px-4 pt-10">
        <Link
          href="/"
          style={{
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            flexShrink: 0,
          }}
        >
          <img
            src="/icon2.png"
            alt=""
            style={{
              width: "28px",
              height: "28px",
              objectFit: "contain",
              display: "block",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontWeight: 700,
              fontSize: "15px",
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
            }}
          >
            Handover
          </span>
        </Link>
        <p className="mt-3 max-w-[320px] text-center text-[15px] font-semibold leading-snug text-[var(--text-primary)]">
          Stop writing reports.{" "}
          <span className="text-gradient-brand">Start delivering.</span>
        </p>
      </div>
      <AuthForm
        key={`${initialConfirmationExpired}-${initialAuthCallbackError}-${initialTab}-${trialPlan ?? ""}`}
        initialAuthError={initialAuthError}
        initialAuthCallbackError={initialAuthCallbackError}
        initialConfirmationExpired={initialConfirmationExpired}
        expiredEmailPrefill={expiredEmailPrefill}
        callbackFailureReason={callbackFailureReason}
        initialTab={initialTab}
        returnTo={returnTo}
        trialPlan={trialPlan}
      />
      <p className="relative z-[1] pb-8 text-center text-[12px] text-[var(--text-muted)]">
        Join MSP teams saving hours every week on reporting
      </p>
    </div>
  );
}
