import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { Nav as MarketingNav } from "@/components/nav";
import { ReportingDemo } from "./reporting-demo";

export const metadata: Metadata = {
  title: "QBR and Reporting | Handover",
  description:
    "See the QBR packs, Excel exports and client-ready reporting Handover produces from your PSA data.",
  alternates: {
    canonical: "https://gethandover.uk/solutions/qbr-and-reporting",
  },
};

const REPORTING_SCREENSHOTS = [
  { src: "/dashboard2.png", alt: "Delivery dashboard" },
  { src: "/exceldoc.png", alt: "Excel export" },
  { src: "/scheduled2.png", alt: "Scheduled reports" },
  { src: "/qbrpowerpoint.png", alt: "QBR pack" },
  { src: "/generate2.png", alt: "Report generation" },
] as const;

export default function QbrAndReportingPage() {
  return (
    <>
      <MarketingNav />
      <main className="marketing-aurora min-h-screen text-white">
        <section className="marketing-page-hero relative overflow-hidden px-6 py-12 md:px-8 md:py-20">
          <MarketingHeroAmbient />
          <div className="relative z-[1] mx-auto w-full max-w-[1000px]">
            <div className="rounded-[var(--radius-lg)] border border-[rgba(56,189,248,0.28)] bg-[rgba(15,23,42,0.68)] px-6 py-8 shadow-[0_20px_60px_-22px_rgba(56,189,248,0.35)] md:px-10 md:py-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#38bdf8]">
                Solutions · Reporting
              </p>
              <h1 className="mt-2 text-3xl font-semibold leading-tight text-white md:text-5xl">
                The reporting you send when you know what needs attention.
              </h1>
              <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--text-secondary)] md:text-base">
                QBR packs, Excel exports, client emails and scheduled reports generated from the
                PSA data you already have.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/onboarding/connect"
                  className="inline-flex items-center rounded-[var(--radius)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
                >
                  Run the free PSA scan
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center rounded-[var(--radius)] border border-white/20 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.08]"
                >
                  See pricing
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-10 md:px-8 md:pb-16">
          <div className="mx-auto grid w-full max-w-[1100px] gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {REPORTING_SCREENSHOTS.map((screenshot) => (
              <div
                key={screenshot.src}
                className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]"
              >
                <Image
                  src={screenshot.src}
                  alt={screenshot.alt}
                  width={960}
                  height={600}
                  className="block h-auto w-full"
                />
              </div>
            ))}
          </div>
        </section>

        <ReportingDemo />

        <section className="mx-auto w-full max-w-[1100px] px-4 py-10 md:px-8 md:py-16">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 md:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
              Reporting outputs
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              When you&apos;re ready to show the work.
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--text-secondary)]">
              These are sample files showing the QBR and Excel outputs Handover can produce.
              They are example outputs, not a live scan of your PSA.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/demo/Example_QBR_Q2-2026.pptx"
                download
                className="inline-flex items-center rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-[var(--accent)] hover:bg-white/[0.05]"
              >
                Download sample QBR pack
              </a>
              <a
                href="/demo/Excel Report.xlsx"
                download
                className="inline-flex items-center rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-[var(--accent)] hover:bg-white/[0.05]"
              >
                Download sample Excel report
              </a>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
