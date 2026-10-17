import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";

/**
 * The hero for product, solution and integration pages: the claim on the
 * left, the real screen on the right. Stacks on mobile with the screen below,
 * so the picture is never lost on a phone.
 */
export function ProductHero({
  eyebrow,
  title,
  body,
  primary = { href: "/onboarding/connect", label: "Run your free scan" },
  secondary = { href: "/demo", label: "Book a walkthrough" },
  note = "Read-only. Results in about a minute.",
  visual,
}: {
  eyebrow?: string;
  title: string;
  body: string;
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string } | null;
  note?: string | null;
  visual: React.ReactNode;
}) {
  return (
    <section className="marketing-page-hero relative overflow-hidden px-4 pb-14 pt-28 sm:px-6 md:pb-20 md:pt-32 lg:px-8">
      <MarketingHeroAmbient />
      <div className="relative z-[1] mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14">
        <div>
          {eyebrow ? <p className="text-sm font-medium text-cyan-300">{eyebrow}</p> : null}
          <h1 className="mt-3 text-[2.4rem] font-semibold leading-[1.04] tracking-[-0.03em] text-white sm:text-5xl lg:text-[3.4rem]">
            {title}
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-8 text-white/70">{body}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={primary.href} className="cta cta-primary">
              {primary.label}
              <ArrowRight className="cta-arrow size-4" aria-hidden />
            </Link>
            {secondary ? (
              <Link href={secondary.href} className="cta cta-secondary">
                {secondary.label}
              </Link>
            ) : null}
          </div>
          {note ? <p className="mt-4 text-[13px] text-white/45">{note}</p> : null}
        </div>
        <div className="relative">
          <div aria-hidden className="pointer-events-none absolute -inset-10 bg-[radial-gradient(closest-side,rgba(56,189,248,0.2),transparent)]" />
          <div className="relative">{visual}</div>
        </div>
      </div>
    </section>
  );
}
