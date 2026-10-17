"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const GROUPS: Array<{ title: string; links: Array<{ href: string; label: string; external?: boolean }> }> = [
  {
    title: "Product",
    links: [
      { href: "/features/revenue-at-risk", label: "Revenue at Risk™" },
      { href: "/features/monday-brief", label: "The Monday Brief" },
      { href: "/features/churn-replay", label: "Churn Replay™" },
      { href: "/features/save-plays", label: "Save Plays™" },
      { href: "/features/renewal-radar", label: "Renewal Radar" },
      { href: "/features/client-margin", label: "Client Margin" },
      { href: "/features/value-receipts", label: "Value Receipts™" },
      { href: "/features", label: "All features" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { href: "/solutions/msp-directors", label: "MSP owners" },
      { href: "/solutions/account-managers", label: "Account managers" },
      { href: "/solutions/service-desk-managers", label: "Service desk managers" },
      { href: "/solutions/qbr", label: "Quarterly reviews" },
      { href: "/solutions", label: "All solutions" },
    ],
  },
  {
    title: "Integrations",
    links: [
      { href: "/integrations/halopsa", label: "HaloPSA" },
      { href: "/integrations/connectwise", label: "ConnectWise" },
      { href: "/integrations", label: "All integrations" },
      { href: "/security", label: "Security" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/blog", label: "Blog" },
      { href: "/press", label: "Press" },
      { href: "/partners", label: "Partners" },
      { href: "/case-studies", label: "Case studies" },
      { href: "/compare", label: "Compare" },
      { href: "/roadmap", label: "Roadmap" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

export function MarketingFooter({ showOnHome = false }: { showOnHome?: boolean }) {
  const pathname = usePathname();
  if (pathname === "/" && !showOnHome) {
    return null;
  }

  const linkClass =
    "footer-site-link text-sm text-[var(--sidebar-text)] transition-colors hover:text-white";

  return (
    <footer className="border-t border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] text-[var(--sidebar-text)]">
      <div className="mx-auto w-full max-w-6xl px-4 pt-12 pb-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1fr] lg:gap-8">
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
              See which clients are slipping, and what they&apos;re worth.
            </p>
            <a
              href="mailto:hello@gethandover.uk"
              className="footer-site-link mt-3 inline-block text-sm text-[var(--sidebar-text)] transition-colors hover:text-white"
            >
              hello@gethandover.uk
            </a>
          </div>

          {GROUPS.map((group) => (
            <div key={group.title}>
              <p className="mb-3 text-[13px] font-semibold text-white">{group.title}</p>
              <ul className="flex flex-col gap-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={linkClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
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
            <p>
              © 2026 Handover.{" "}
              <Link href="/privacy" className="hover:text-white">Privacy</Link>
              {" · "}
              <Link href="/terms" className="hover:text-white">Terms</Link>
            </p>
            <p>Built for MSPs, on HaloPSA and ConnectWise</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
