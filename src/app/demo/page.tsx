"use client";

import Script from "next/script";
import Link from "next/link";
import { useEffect, useState } from "react";

import PageTransition from "@/components/PageTransition";

export default function DemoPage() {
  const [calendlyLoaded, setCalendlyLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setCalendlyLoaded(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <PageTransition>
      <div className="relative min-h-full overflow-hidden animate-in fade-in duration-300 bg-transparent">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-20 left-1/2 h-[400px] w-[700px] -translate-x-1/2 rounded-full opacity-10"
          style={{
            background: "radial-gradient(circle, #0EA5E9 0%, transparent 70%)",
            animation: "pulse 8s ease-in-out infinite",
          }}
        />
      </div>
      <section className="relative z-10 px-4 py-6 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div
            className="mx-auto inline-flex w-fit items-center gap-2 rounded-full px-3 py-0.5 text-[11px] font-medium"
            style={{
              backgroundColor: "rgba(56, 189, 248, 0.1)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              color: "var(--accent)",
            }}
          >
            See Handover in action
          </div>
          <h1 className="mt-2 text-xl font-bold leading-tight tracking-tight text-white sm:text-2xl">
            Book your 15-minute demo
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-[13px] leading-snug text-[var(--text-secondary)] sm:text-sm">
            See how Handover connects to your PSA and generates client-ready reports in under 30
            seconds. No slides, no fluff - just a live walkthrough built around your workflow.
          </p>
          <p className="mt-4 text-xs text-[var(--text-muted)] sm:text-sm">
            Every customer gets a{" "}
            <Link
              href="/onboarding-programme"
              className="font-semibold text-cyan-200 underline decoration-cyan-200/30 underline-offset-4 hover:text-cyan-100"
            >
              30-day launch
            </Link>
            , run by me personally.
          </p>
        </div>
      </section>

      <section className="relative z-10 px-4 pb-12 pt-2 md:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <Script
            src="https://assets.calendly.com/assets/external/widget.js"
            strategy="afterInteractive"
          />
          <div
            className="relative w-full rounded-xl overflow-hidden shadow-2xl shadow-black/40 border border-white/10"
            style={{ minWidth: "320px", height: "800px" }}
          >
            {!calendlyLoaded && (
              <div className="absolute inset-0 bg-[#1E293B] flex flex-col items-center justify-center gap-4 z-10">
                <div className="w-10 h-10 border-2 border-white/10 border-t-[#0EA5E9] rounded-full animate-spin" />
                <p className="text-slate-400 text-sm">Loading booking calendar...</p>
              </div>
            )}

            <div
              className="calendly-inline-widget w-full h-full"
              data-url="https://calendly.com/gethandover/30min?hide_event_type_details=1&hide_gdpr_banner=1&primary_color=0ea5e9"
              style={{ minWidth: "320px", height: "800px" }}
            />
          </div>
        </div>
      </section>

      <section
        className="relative z-10 bg-transparent px-4 py-6 md:px-6"
        aria-label="Trusted organisations"
      >
        <div className="mx-auto flex max-w-[1100px] flex-col items-center justify-center gap-2 text-center md:flex-row md:flex-wrap md:gap-x-3 md:gap-y-0 md:text-[13px]">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Trusted by delivery teams at
          </span>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="rounded border border-[var(--border)] bg-[var(--bg-secondary)] px-2.5 py-1 text-[13px] font-medium text-[var(--text-secondary)]">
              IBM
            </span>
            <span className="rounded border border-[var(--border)] bg-[var(--bg-secondary)] px-2.5 py-1 text-[13px] font-medium text-[var(--text-secondary)]">
              Computacenter
            </span>
          </div>
        </div>
      </section>
      </div>
    </PageTransition>
  );
}
