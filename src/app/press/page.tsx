import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Download, Mail } from "lucide-react";

import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { PRESS_BOILERPLATE, PRESS_CONTACT, PRESS_RELEASES } from "@/lib/press-releases";

const PAGE_URL = "https://gethandover.uk/press";

export const metadata: Metadata = {
  title: "Press | Handover",
  description:
    "Press releases, company background, brand assets and media contact for Handover, client retention software for MSPs.",
  alternates: { canonical: PAGE_URL },
};

const ASSETS = [
  { label: "Logo, for light backgrounds", href: "/logo.png" },
  { label: "Logo, for dark backgrounds", href: "/logo-white.png" },
  { label: "App icon", href: "/icon2.png" },
  { label: "Founder photo, Lewis Williams", href: "/lewiswilliams.png" },
] as const;

export default function PressPage() {
  const releases = [...PRESS_RELEASES].sort((a, b) => b.dateISO.localeCompare(a.dateISO));
  return (
    <MarketingPageLayout>
      <section className="relative overflow-hidden px-6 pt-16 pb-10 md:px-8 md:pt-24">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto max-w-[1000px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#38bdf8]">Press</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white md:text-5xl">News from Handover</h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-white/70">
            Press releases, background on the company and everything you need to write about Handover. For anything
            else, email{" "}
            <a href={`mailto:${PRESS_CONTACT.email}`} className="text-[#38bdf8] hover:underline">
              {PRESS_CONTACT.email}
            </a>
            .
          </p>
        </div>
      </section>

      <section className="px-6 pb-12 md:px-8" aria-labelledby="releases">
        <div className="mx-auto max-w-[1000px]">
          <h2 id="releases" className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
            Press releases
          </h2>
          <ul className="mt-4 divide-y divide-white/10 border-y border-white/10">
            {releases.map((release) => (
              <li key={release.slug}>
                <Link href={`/press/${release.slug}`} className="group block py-6">
                  <p className="text-xs text-white/45">{release.dateDisplay}</p>
                  <h3 className="mt-1.5 text-xl font-semibold leading-snug text-white group-hover:text-[#7dd3fc]">
                    {release.title}
                  </h3>
                  <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-white/60">{release.summary}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#38bdf8]">
                    Read the release <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-6 pb-24 md:px-8">
        <div className="mx-auto grid max-w-[1000px] gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold text-white">About Handover</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-white/65">{PRESS_BOILERPLATE}</p>
            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-white/45">Founded by</dt>
                <dd className="mt-0.5 text-white">Lewis Williams</dd>
              </div>
              <div>
                <dt className="text-white/45">Based in</dt>
                <dd className="mt-0.5 text-white">Birmingham, UK</dd>
              </div>
              <div>
                <dt className="text-white/45">Works with</dt>
                <dd className="mt-0.5 text-white">HaloPSA, ConnectWise Manage</dd>
              </div>
              <div>
                <dt className="text-white/45">Price</dt>
                <dd className="mt-0.5 text-white">£499 a month, one plan</dd>
              </div>
            </dl>
            <Link href="/about" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[#38bdf8] hover:underline">
              More about the company <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="flex flex-col gap-5">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-lg font-semibold text-white">Media contact</h2>
              <p className="mt-3 text-[15px] text-white/80">
                {PRESS_CONTACT.name}, {PRESS_CONTACT.role}
              </p>
              <a
                href={`mailto:${PRESS_CONTACT.email}?subject=Press%20enquiry`}
                className="mt-2 inline-flex items-center gap-2 text-[15px] font-semibold text-[#38bdf8] hover:underline"
              >
                <Mail className="size-4" aria-hidden /> {PRESS_CONTACT.email}
              </a>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-lg font-semibold text-white">Brand assets</h2>
              <ul className="mt-3 space-y-2">
                {ASSETS.map((asset) => (
                  <li key={asset.href}>
                    <a
                      href={asset.href}
                      download
                      className="inline-flex items-center gap-2 text-[15px] text-white/75 hover:text-white"
                    >
                      <Download className="size-4 text-[#38bdf8]" aria-hidden /> {asset.label}
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs leading-5 text-white/45">
                Please write the name as &ldquo;Handover&rdquo;, with a capital H and no space.
              </p>
            </div>
          </div>
        </div>
      </section>
    </MarketingPageLayout>
  );
}
