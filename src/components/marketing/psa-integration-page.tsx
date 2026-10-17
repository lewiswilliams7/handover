import { ArrowRight, Check, Lock, ShieldCheck, Undo2 } from "lucide-react";
import Link from "next/link";

import { ProductHero } from "@/components/marketing/product-hero";
import { AppFrame, WeekListMock } from "@/components/marketing/product-mocks";
import { ProductTour } from "@/components/marketing/product-tour";

export type PsaPageConfig = {
  name: string;
  logo: string;
  marketplace: { label: string; href: string };
  title: string;
  body: string;
  setupTitle: string;
  steps: string[];
  reads: Array<{ item: string; why: string }>;
  setupNote: string;
};

/**
 * One template for every PSA integration page: what it does with that PSA,
 * the product on its data, the exact setup steps and what is read.
 */
export function PsaIntegrationPage({ config }: { config: PsaPageConfig }) {
  return (
    <div className="min-h-screen">
      <ProductHero
        eyebrow={`${config.name} integration`}
        title={config.title}
        body={config.body}
        primary={{ href: "/onboarding/connect", label: `Connect ${config.name}` }}
        visual={
          <div className="relative">
            <div className="absolute -right-3 -top-5 z-10 flex items-center gap-2 rounded-xl border border-white/[0.12] bg-[#0d1830]/95 px-3 py-2 shadow-2xl backdrop-blur">
              <img src={config.logo} alt="" className="size-6 rounded-md bg-white object-contain p-0.5" />
              <span className="text-[12px] font-medium text-white">Connected, read-only</span>
              <span className="size-1.5 rounded-full bg-emerald-400" />
            </div>
            <AppFrame path="/week" label={`The This week list, built from ${config.name} data`}>
              <WeekListMock />
            </AppFrame>
          </div>
        }
      />

      <section className="px-4 pb-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/55">
          <a
            href={config.marketplace.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 transition-colors hover:border-white/25 hover:text-white"
          >
            <img src={config.logo} alt="" className="size-4 rounded-sm bg-white object-contain" />
            {config.marketplace.label}
          </a>
          {["Cloud and hosted instances", "Nothing to install", "Disconnect any time"].map((item) => (
            <span key={item} className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-cyan-300" aria-hidden /> {item}
            </span>
          ))}
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 md:py-20 lg:px-8" aria-labelledby="what-heading">
        <div className="mx-auto max-w-6xl">
          <h2 id="what-heading" className="max-w-2xl text-3xl font-semibold tracking-[-0.025em] text-white sm:text-[2.4rem] sm:leading-[1.1]">
            What your {config.name} data becomes
          </h2>
          <div className="mt-12">
            <ProductTour />
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8" aria-labelledby="setup-heading">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div>
            <h2 id="setup-heading" className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {config.setupTitle}
            </h2>
            <ol className="mt-6 space-y-4">
              {config.steps.map((step, index) => (
                <li key={step} className="flex gap-4">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/[0.08] text-xs font-semibold text-cyan-200">
                    {index + 1}
                  </span>
                  <p className="pt-0.5 text-[15px] leading-7 text-white/70">{step}</p>
                </li>
              ))}
            </ol>
            <p className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white/60">{config.setupNote}</p>
          </div>
          <div className="h-fit rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="font-semibold text-white">What Handover reads, and why</h3>
            <ul className="mt-4 divide-y divide-white/[0.07]">
              {config.reads.map((row) => (
                <li key={row.item} className="py-3">
                  <p className="flex items-center gap-2 text-sm font-medium text-white">
                    <Check className="size-4 text-cyan-300" aria-hidden /> {row.item}
                  </p>
                  <p className="mt-0.5 pl-6 text-[13px] leading-5 text-white/55">{row.why}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8" aria-labelledby="trust-heading">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-6 sm:p-10">
          <h2 id="trust-heading" className="text-2xl font-semibold tracking-tight text-white">
            Your {config.name} stays yours
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              { Icon: Lock, title: "Read-only", body: `Handover reads ${config.name}. Nothing in it changes.` },
              { Icon: ShieldCheck, title: "Encrypted keys", body: "Credentials are encrypted with AES-256 before they are stored, in the EU." },
              { Icon: Undo2, title: "Disconnect any time", body: `Revoke the key in ${config.name} and access stops at once.` },
            ].map(({ Icon, title, body }) => (
              <div key={title}>
                <Icon className="size-5 text-cyan-300" aria-hidden />
                <h3 className="mt-3 font-semibold text-white">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-white/60">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.05] p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <p className="text-xl font-semibold text-white">See your {config.name} clients ranked by risk, in a minute.</p>
            <p className="mt-1 text-sm text-white/60">Free scan. No card. Nothing to cancel.</p>
          </div>
          <Link href="/onboarding/connect" className="cta cta-primary">
            Run your free scan
            <ArrowRight className="cta-arrow size-4" aria-hidden />
          </Link>
        </div>
      </section>
    </div>
  );
}
