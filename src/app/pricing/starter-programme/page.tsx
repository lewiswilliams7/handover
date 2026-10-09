import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";

import { PricingEnquiryForm } from "../pricing-enquiry-form";

export const metadata: Metadata = {
  title: "Starter Programme | Handover",
  description:
    "The Handover Starter Programme gives smaller MSPs the complete workspace at £149/month for one year.",
  alternates: {
    canonical: "https://gethandover.uk/pricing/starter-programme",
  },
};

const INCLUDED = [
  "Portfolio scan and Client Intelligence",
  "Service reviews, QBR packs and scheduled reports",
  "PPTX, PDF and Excel export, plus PSA push-back",
  "White-labelled client portal and unlimited users",
];

export default function StarterProgrammePage() {
  return (
    <main className="marketing-aurora min-h-screen px-4 py-12 text-white sm:px-6 md:pb-20">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-white"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to pricing
        </Link>
        <div className="mt-12 grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start lg:gap-16">
          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              Starter Programme
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              The whole product, at a smaller starting point.
            </h1>
            <p className="mt-5 text-base leading-7 text-white/65">
              Smaller MSPs feel the same problems and have the same client relationships to
              protect, with less headroom to spend.
            </p>
            <div className="mt-8 border-y border-white/10 py-6">
              <p className="text-3xl font-bold">£149/month</p>
              <p className="mt-2 text-sm leading-6 text-white/55">
                Everything in Handover included for one year. After that, the programme transitions
                to the standard plan.
              </p>
            </div>
            <p className="mt-6 text-sm font-medium text-cyan-100">
              For MSPs with under 15 managed clients. Application only.
            </p>
            <ul className="mt-8 space-y-3">
              {INCLUDED.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-white/75">
                  <Check className="mt-1 size-4 shrink-0 text-cyan-300" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              Apply for the Starter Programme
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/55">
              Tell us about your MSP and we&apos;ll confirm whether the programme is the right fit.
            </p>
            <PricingEnquiryForm type="starter" />
          </section>
        </div>
      </div>
    </main>
  );
}
