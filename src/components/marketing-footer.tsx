"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function MarketingFooter() {
  const pathname = usePathname();
  if (pathname === "/") {
    return null;
  }

  const linkClass =
    "footer-site-link text-sm text-[var(--sidebar-text)] transition-colors hover:text-white";

  return (
    <footer className="border-t border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] text-[var(--sidebar-text)]">
      <div className="mx-auto w-full max-w-6xl px-4 pt-12 pb-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-6 lg:gap-8">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 no-underline transition-opacity duration-150 hover:opacity-[0.85]"
            >
              <img
                src="/icon2.png"
                alt=""
                width={28}
                height={28}
                style={{
                  objectFit: "contain",
                  display: "block",
                  flexShrink: 0,
                }}
              />
              <span className="text-[18px] font-bold text-white">Handover</span>
            </Link>
            <p className="mt-2 text-sm leading-relaxed text-[var(--sidebar-text)]">
              Know which clients need your attention, and why.
            </p>
            <a
              href="mailto:hello@gethandover.uk"
              className="footer-site-link mt-3 inline-block text-sm text-[var(--sidebar-text)] transition-colors hover:text-white"
            >
              hello@gethandover.uk
            </a>
          </div>

          <div>
            <p className="mb-3 text-[13px] font-medium tracking-wider text-white uppercase">
              Product
            </p>
            <ul className="flex flex-col gap-2">
              <li>
                <Link href="/blog" className={linkClass}>
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/features" className={linkClass}>
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className={linkClass}>
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/contact" className={linkClass}>
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/integrations" className={linkClass}>
                  Integrations
                </Link>
              </li>
              <li>
                <a
                  href="https://handover.canny.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  Roadmap
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-3 text-[13px] font-medium tracking-wider text-white uppercase">
              Company
            </p>
            <ul className="flex flex-col gap-2">
              <li>
                <Link href="/about" className={linkClass}>
                  About
                </Link>
              </li>
              <li>
                <Link href="/partners" className={linkClass}>
                  Partners
                </Link>
              </li>
              <li>
                <Link href="/partners/halopsa" className={linkClass}>
                  HaloPSA Partner Programme
                </Link>
              </li>
              <li>
                <Link href="/partners/connectwise" className={linkClass}>
                  ConnectWise Marketplace Partner
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-3 text-[13px] font-medium tracking-wider text-white uppercase">
              Resources
            </p>
            <ul className="flex flex-col gap-2">
              <li>
                <Link href="/compare" className={linkClass}>
                  Compare
                </Link>
              </li>
              <li>
                <Link href="/case-studies" className={linkClass}>
                  Case studies
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-3 text-[13px] font-medium tracking-wider text-white uppercase">
              Integrations
            </p>
            <ul className="flex flex-col gap-2">
              <li>
                <Link href="/integrations/halopsa" className={linkClass}>
                  HaloPSA
                </Link>
              </li>
              <li>
                <Link href="/integrations" className={linkClass}>
                  ConnectWise
                </Link>
              </li>
              <li>
                <Link href="/integrations/csv" className={linkClass}>
                  CSV Import
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-3 text-[13px] font-medium tracking-wider text-white uppercase">Legal</p>
            <ul className="flex flex-col gap-2">
              <li>
                <Link href="/privacy" className={linkClass}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className={linkClass}>
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/roadmap" className={linkClass}>
                  Roadmap
                </Link>
              </li>
              <li>
                <Link href="/contact" className={linkClass}>
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-[var(--sidebar-border)] pt-6">
          <div className="mb-4 flex justify-start sm:justify-end">
            <div className="flex items-center gap-2 opacity-50 grayscale transition-all duration-200 hover:opacity-100 hover:grayscale-0">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-white/10">
                <span className="text-[10px] font-bold text-white">H</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold leading-tight text-white">HaloPSA</span>
                <span className="text-[10px] leading-tight text-slate-400">Technology Alliance Partner</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-3 text-[13px] text-[var(--sidebar-text)] sm:flex-row sm:items-center">
            <p>© 2026 Handover. All rights reserved.</p>
            <p>Built for MSP delivery teams</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
