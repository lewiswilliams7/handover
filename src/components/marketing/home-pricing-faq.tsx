import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { HOME_FAQS } from "@/lib/marketing-faqs";

/** Homepage: the price in one glance, next to the questions buyers ask first. */
export function HomePricingFaq() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-20" aria-labelledby="home-faq">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14">
        <div className="h-fit rounded-3xl border border-cyan-300/30 bg-[#0b1629]/85 p-7 shadow-2xl shadow-cyan-950/30 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">One plan</p>
          <p className="mt-4 font-bold tracking-tight text-white">
            <span className="text-5xl leading-none">£499</span>
            <span className="ml-1 text-lg font-semibold text-white/60">/month</span>
          </p>
          <p className="mt-2 text-sm text-white/55">Or £4,990 a year, two months free.</p>
          <ul className="mt-6 space-y-2.5 text-sm text-white/75">
            {["Every product, nothing held back", "Unlimited users", "A 30-day launch, run by the founder", "No minimum term"].map(
              (item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <Check className="size-4 shrink-0 text-cyan-300" aria-hidden />
                  {item}
                </li>
              ),
            )}
          </ul>
          <p className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white/65">
            Keep one £1,500-a-month client and Handover pays for itself three times over.
          </p>
          <Link
            href="/pricing"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          >
            See pricing <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        <div>
          <h2 id="home-faq" className="text-3xl font-semibold tracking-tight text-white">
            Questions MSP owners ask first
          </h2>
          <div className="mt-6 divide-y divide-white/10 border-y border-white/10">
            {HOME_FAQS.map((faq) => (
              <details key={faq.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-white [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <span className="text-xl leading-none text-white/40 transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-2 pr-8 text-sm leading-6 text-white/60">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
