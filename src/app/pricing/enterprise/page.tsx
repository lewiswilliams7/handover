import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";

import { PricingEnquiryForm } from "../pricing-enquiry-form";

export const metadata: Metadata = {
  title: "Enterprise pricing | Handover",
  description:
    "Talk to Handover about a portfolio-priced deployment for more than 150 managed clients.",
  alternates: {
    canonical: "https://gethandover.uk/pricing/enterprise",
  },
};

const COVERAGE = [
  "Pricing shaped around your managed client portfolio",
  "Onboarding support for delivery and account teams",
  "Full Handover client intelligence, reporting, portal and PSA integrations",
];

export default function EnterprisePricingPage() {
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
              Enterprise
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              Your portfolio sets the shape.
            </h1>
            <p className="mt-5 text-base leading-7 text-white/65">
              Above 150 managed clients, the portfolio — not the plan — determines the shape.
              We&apos;ll work with you to make Handover fit how your team actually operates.
            </p>
            <div className="mt-8 border-y border-white/10 py-6">
              <p className="text-3xl font-bold">Bespoke pricing</p>
              <p className="mt-2 text-sm leading-6 text-white/55">
                We&apos;ll price it around your portfolio and the support you need to put it to work.
              </p>
            </div>
            <ul className="mt-8 space-y-3">
              {COVERAGE.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-white/75">
                  <Check className="mt-1 size-4 shrink-0 text-cyan-300" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              Talk to us about Enterprise
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/55">
              Tell us about your portfolio, delivery model, and what you need from Handover.
            </p>
            <PricingEnquiryForm type="enterprise" />
          </section>
        </div>
      </div>
    </main>
  );
}
