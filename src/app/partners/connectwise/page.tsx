import Link from "next/link";
import { ArrowLeftRight, Database, Plug, Store } from "lucide-react";

import PageTransition from "@/components/PageTransition";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";

export const metadata = {
  title: "ConnectWise Marketplace Partner | Handover",
  description:
    "Handover is listed on the ConnectWise Marketplace. Native ConnectWise Manage integration for automated client reporting, QBR packs, and delivery updates built for MSP teams.",
};

const connectwiseCards = [
  {
    title: "Native ConnectWise Manage integration",
    body: "Handover connects directly to ConnectWise Manage. Service tickets, project tickets, time entries, and SLA data are pulled live with no middleware and no manual exports.",
    Icon: Plug,
  },
  {
    title: "Listed on the ConnectWise Marketplace",
    body: "Handover is available directly from the ConnectWise Marketplace, making it easy for any ConnectWise customer to find, connect, and start generating client-ready reports in minutes.",
    Icon: Store,
  },
  {
    title: "Two-way ConnectWise sync",
    body: "Handover pushes generated report notes and actions back directly into ConnectWise ticket records, keeping your PSA as the single source of truth.",
    Icon: ArrowLeftRight,
  },
  {
    title: "Full PSA data coverage",
    body: "Service tickets, project tickets, time entries, SLA performance, and client records — Handover pulls the complete picture from ConnectWise Manage to generate accurate, data-driven client reports.",
    Icon: Database,
  },
] as const;

export default function ConnectWisePartnerPage() {
  return (
    <MarketingPageLayout>
      <PageTransition>
      <section className="relative overflow-hidden bg-transparent px-6 py-16 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-0 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full opacity-10"
            style={{
              background: "radial-gradient(circle, #0EA5E9 0%, transparent 70%)",
              animation: "pulse 8s ease-in-out infinite",
            }}
          />
        </div>
        <div className="relative z-[1] mx-auto max-w-5xl text-center">
          <span className="inline-flex items-center rounded-full border border-[#0EA5E9]/40 bg-[#0EA5E9]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#38BDF8]">
            ConnectWise Marketplace
          </span>
          <div className="my-8 flex items-center justify-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-[#0EA5E9]/30 bg-[#0EA5E9]/10">
              <img src="/icon2.png" alt="Handover" className="h-8 w-8 object-contain" />
            </div>

            <div className="flex items-center gap-1">
              <div className="h-px w-8 bg-gradient-to-r from-[#0EA5E9] to-transparent" />
              <div
                className="h-2 w-2 rounded-full bg-[#0EA5E9]"
                style={{ animation: "handover-pulse 2s ease-in-out infinite" }}
              />
              <div className="h-px w-8 bg-gradient-to-l from-[#0EA5E9] to-transparent" />
            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2">
              <img src="/connectwise.png" alt="ConnectWise" className="h-8 object-contain" />
            </div>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
            Handover is listed on the ConnectWise Marketplace
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--text-muted)] md:text-[17px]">
            Our native ConnectWise Manage integration pulls your live ticket data, project status, SLA
            performance, and time entries to generate client-ready reports in under 30 seconds.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://marketplace.connectwise.com/handover"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-[var(--radius)] bg-[#0EA5E9] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0284C7]"
            >
              View on ConnectWise Marketplace →
            </a>
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center rounded-[var(--radius)] border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-10 md:px-8">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-2">
          {connectwiseCards.map(({ title, body, Icon }) => (
            <article
              key={title}
              className="group relative rounded-xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:border-[#0EA5E9]/50 hover:bg-[#0EA5E9]/5 hover:shadow-lg hover:shadow-[#0EA5E9]/10"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#0EA5E9]/10 transition-all duration-300 group-hover:bg-[#0EA5E9]/20">
                <Icon className="text-[#0EA5E9]" size={20} aria-hidden />
              </div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-6 py-2 md:px-8">
        <div className="mx-auto my-16 grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
          {[
            {
              title: "Connect",
              body: "Install Handover from the ConnectWise Marketplace and connect your instance in one click",
            },
            {
              title: "Pull data",
              body: "Handover pulls your live service tickets, project tickets, SLA performance, and client records",
            },
            {
              title: "Generate",
              body: "AI generates client-ready reports, QBR packs, and delivery updates in under 30 seconds",
            },
            {
              title: "Push back",
              body: "Send reports to clients and push notes directly back into ConnectWise ticket records",
            },
          ].map((step, index) => (
            <article key={step.title} className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4">
              <span className="pointer-events-none absolute right-3 top-2 text-5xl font-bold text-white/10">
                {index + 1}
              </span>
              <h3 className="relative z-[1] text-base font-semibold text-white">{step.title}</h3>
              <p className="relative z-[1] mt-2 text-sm leading-relaxed text-slate-400">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-6 py-8 md:px-8 md:py-10">
        <div
          className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl p-6 md:p-8"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(14,165,233,0.15) 0%, rgba(15,28,63,0.8) 70%)",
            border: "1px solid rgba(14,165,233,0.2)",
          }}
        >
          <h2 className="text-2xl font-semibold text-white md:text-3xl">
            Find Handover on the ConnectWise Marketplace
          </h2>
          <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-slate-300">
            ConnectWise customers can connect Handover directly from the marketplace in minutes.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="https://marketplace.connectwise.com/handover"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-[var(--radius)] bg-[#0EA5E9] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0284C7]"
            >
              View on ConnectWise Marketplace →
            </a>
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center rounded-[var(--radius)] border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 pb-14 pt-4 md:px-8">
        <div className="mx-auto max-w-6xl rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)]/35 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Also available for HaloPSA
          </h3>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-secondary)]">
            Handover is an official HaloPSA Technology Alliance Partner with a native integration and
            marketplace listing.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
              Available
            </span>
            <a
              href="https://usehalo.com/integration/handover-integration/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-[#38BDF8] hover:underline"
            >
              HaloPSA Marketplace
            </a>
          </div>
        </div>
      </section>
      </PageTransition>
    </MarketingPageLayout>
  );
}
