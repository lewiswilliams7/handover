import Link from "next/link";

import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";

export const metadata = {
  title: "Partners | Handover",
  description:
    "Handover integrates natively with leading PSA platforms. View our technology partnership programmes.",
};

export default function PartnersPage() {
  return (
    <MarketingPageLayout>
      <section className="relative overflow-hidden bg-transparent px-6 py-16 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center rounded-full border border-[#0EA5E9]/40 bg-[#0EA5E9]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#38BDF8]">
            Partnership Programmes
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-5xl">
            Built on the platforms MSPs already use
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--text-muted)] md:text-[17px]">
            Handover is an official technology partner of HaloPSA and integrates natively with
            ConnectWise Manage.
          </p>

          <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
            <Link
              href="/partners/halopsa"
              className="group block rounded-xl border border-white/10 bg-white/5 p-6 text-left transition duration-300 hover:border-[#0EA5E9]"
            >
              <img src="/halopsa.png" alt="HaloPSA" className="h-10 object-contain" />
              <h2 className="mt-4 text-lg font-semibold text-white">HaloPSA Technology Alliance Partner</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Official marketplace listing, native API integration, and two-way PSA sync.
              </p>
              <span className="mt-4 inline-flex rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                Active
              </span>
              <p className="mt-4 text-sm font-medium text-[#38BDF8]">Learn more →</p>
            </Link>

            <Link
              href="/partners/connectwise"
              className="group block rounded-xl border border-white/10 bg-white/5 p-6 text-left transition duration-300 hover:border-[#0EA5E9]"
            >
              <img src="/connectwise.jpeg" alt="ConnectWise" className="h-10 object-contain" />
              <h2 className="mt-4 text-lg font-semibold text-white">ConnectWise Marketplace Partner</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Native ConnectWise Manage integration with full marketplace listing. Connect and generate
                reports in under 30 seconds.
              </p>
              <span className="mt-4 inline-flex rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                Live
              </span>
              <p className="mt-4 text-sm font-medium text-[#38BDF8]">Learn more →</p>
            </Link>
          </div>
        </div>
      </section>
    </MarketingPageLayout>
  );
}
