import Link from "next/link";
import { Suspense } from "react";

import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";

import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div className="relative min-h-screen animate-in fade-in duration-300 overflow-hidden bg-transparent">
      <MarketingHeroAmbient />
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
          {/* eslint-disable-next-line @next/next/no-img-element -- matches auth page branding */}
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
          Set a new password
        </p>
      </div>
      <Suspense
        fallback={
          <div className="relative z-[1] mx-auto flex min-h-[40vh] w-full max-w-[440px] items-center justify-center px-4 text-[var(--text-muted)]">
            Loading…
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
      <p className="relative z-[1] pb-8 text-center text-[12px] text-[var(--text-muted)]">
        Join MSP teams saving hours every week on reporting
      </p>
    </div>
  );
}
