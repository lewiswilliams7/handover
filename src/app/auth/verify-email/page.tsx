import Link from "next/link";
import { Suspense } from "react";

import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";

import { VerifyEmailForm } from "./verify-email-form";

export default function VerifyEmailPage() {
  return (
    <div
      className="relative min-h-screen animate-in fade-in duration-300 overflow-hidden"
      style={{ background: "var(--bg-primary, #0f172a)" }}
    >
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{ background: "var(--bg-primary, #0f172a)" }}
      >
        <MarketingHeroAmbient />
      </div>
      <div className="relative z-[1] mb-4 flex w-full flex-col items-center px-4 pt-10">
        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-2"
          style={{ textDecoration: "none" }}
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
          Verify your email
        </p>
      </div>
      <Suspense
        fallback={
          <div className="relative z-[1] mx-auto flex min-h-[40vh] w-full max-w-[440px] items-center justify-center px-4 text-[var(--text-muted)]">
            Loading…
          </div>
        }
      >
        <VerifyEmailForm />
      </Suspense>
      <p className="relative z-[1] pb-8 text-center text-[12px] text-[var(--text-muted)]">
        Join MSP teams saving hours every week on reporting
      </p>
    </div>
  );
}
