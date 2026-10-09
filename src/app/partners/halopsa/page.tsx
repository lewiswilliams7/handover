import Link from "next/link";
import {
  ArrowLeftRight,
  BadgeCheck,
  Megaphone,
  Plug,
  Store,
  Tag,
  Users,
} from "lucide-react";

import PageTransition from "@/components/PageTransition";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";

export const metadata = {
  title: "HaloPSA Technology Alliance Partner | Handover",
  description:
    "Handover is an official HaloPSA Technology Alliance Partner. Native HaloPSA integration for automated client reporting, QBR packs, and delivery updates built for MSP teams.",
};

const partnershipCards = [
  {
    title: "Native HaloPSA integration",
    body: "Handover connects directly to HaloPSA using the official API. Ticket data, project data, client records, and time entries are pulled live with no middleware and no manual exports.",
    Icon: Plug,
  },
  {
    title: "Listed on the HaloPSA marketplace",
    body: "Handover is available directly from the HaloPSA marketplace, making it easy for any HaloPSA customer to find, connect, and start generating client-ready reports in minutes.",
    Icon: Store,
  },
  {
    title: "Two-way PSA sync",
    body: "Handover pushes generated report notes and actions back directly into HaloPSA ticket records using the HaloPSA Actions API, keeping your PSA as the single source of truth.",
    Icon: ArrowLeftRight,
  },
  {
    title: "Dedicated partner support",
    body: "As a Technology Alliance Partner, Handover benefits from HaloPSA's dedicated partner team including channel managers, customer success managers, and marketing associates.",
    Icon: Users,
  },
] as const;

export default function HaloPsaPartnerPage() {
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
          <div className="inline-flex items-center gap-2 rounded-full border border-[#0EA5E9]/30 bg-[#0EA5E9]/10 px-3 py-1.5 text-xs font-semibold">
            <BadgeCheck className="text-[#0EA5E9]" size={16} aria-hidden />
            <span
              style={{
                background: "linear-gradient(90deg, #94A3B8 0%, #ffffff 50%, #94A3B8 100%)",
                backgroundSize: "200% center",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                animation: "shimmer 3s linear infinite",
              }}
            >
              HaloPSA Technology Alliance Partner - Verified
            </span>
          </div>

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
              <img src="/halopsa.png" alt="HaloPSA" className="h-8 object-contain" />
            </div>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
            The reporting platform built for HaloPSA delivery teams
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--text-muted)] md:text-[17px]">
            Handover is an official HaloPSA Technology Alliance Partner. Connect your HaloPSA instance
            and generate client-ready reports, QBR packs, and scheduled delivery updates in under 30
            seconds.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://usehalo.com/integration/handover-integration/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-[var(--radius)] bg-[#0EA5E9] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0284C7]"
            >
              View on HaloPSA Marketplace →
            </a>
            <Link
              href="/onboarding/connect"
              className="inline-flex items-center justify-center rounded-[var(--radius)] border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Run the free PSA scan
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-10 md:px-8">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-2">
          {partnershipCards.map(({ title, body, Icon }) => (
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
              body: "Install Handover from the HaloPSA marketplace and connect your instance in one click",
            },
            {
              title: "Pull data",
              body: "Handover pulls your live ticket data, project status, SLA performance, and client records",
            },
            {
              title: "Generate",
              body: "AI generates client-ready reports, QBR packs, and delivery updates in under 30 seconds",
            },
            {
              title: "Push back",
              body: "Send reports to clients and push notes directly back into HaloPSA ticket records",
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

      <section className="px-6 py-6 md:px-8">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-start gap-3">
              <BadgeCheck className="mt-0.5 text-[#0EA5E9]" size={20} aria-hidden />
              <div>
                <h3 className="text-base font-semibold text-white">Zero cost partnership</h3>
                <p className="mt-1.5 text-sm text-slate-400">
                  No fees to join. Enablement, certification, demo account, and partner support all
                  included at no cost.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-start gap-3">
              <Megaphone className="mt-0.5 text-[#0EA5E9]" size={20} aria-hidden />
              <div>
                <h3 className="text-base font-semibold text-white">Marketing opportunities</h3>
                <p className="mt-1.5 text-sm text-slate-400">
                  Social media promotion, webinars, referrals, and access to HaloPSA&apos;s customer
                  base.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-start gap-3">
              <Tag className="mt-0.5 text-[#0EA5E9]" size={20} aria-hidden />
              <div>
                <h3 className="text-base font-semibold text-white">Partner discounts</h3>
                <p className="mt-1.5 text-sm text-slate-400">
                  Technology Alliance Partners are entitled to discounts on HaloPSA products.
                </p>
              </div>
            </div>
          </div>
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
            Find Handover on the HaloPSA Marketplace
          </h2>
          <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-slate-300">
            HaloPSA customers can connect Handover directly from the marketplace in minutes.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="https://usehalo.com/integration/handover-integration/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-[var(--radius)] bg-[#0EA5E9] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0284C7]"
            >
              View on HaloPSA Marketplace →
            </a>
            <Link
              href="/onboarding/connect"
              className="inline-flex items-center justify-center rounded-[var(--radius)] border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Run the free PSA scan
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 pb-14 pt-4 md:px-8">
        <div className="mx-auto max-w-6xl rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)]/35 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Also available for ConnectWise Manage
          </h3>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-secondary)]">
            Handover&apos;s native ConnectWise Manage integration is live with marketplace listing.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
              Available now
            </span>
            <a
              href="https://marketplace.connectwise.com/handover"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-[#38BDF8] hover:underline"
            >
              ConnectWise Marketplace
            </a>
          </div>
        </div>
      </section>
      </PageTransition>
    </MarketingPageLayout>
  );
}
