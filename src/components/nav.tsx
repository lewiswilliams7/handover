"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Brain,
  CalendarClock,
  ChevronDown,
  ClipboardCheck,
  Menu,
  Moon,
  PoundSterling,
  Presentation,
  ReceiptText,
  RefreshCw,
  Rewind,
  LifeBuoy,
  Scale,
  Settings,
  Sun,
  X,
} from "lucide-react";
import { startTransition, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useProfileBrandingNav } from "@/hooks/use-profile-branding-nav";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const THEME_KEY = "handover-theme";

const MEGA_ICON_CLASS = "mt-0.5 size-[18px] shrink-0 text-[#0EA5E9]";
const MEGA_TITLE_CLASS = "font-bold leading-snug text-[#0F1C3F] dark:text-slate-100";
const MEGA_DESC_CLASS = "mt-0.5 text-[12px] font-medium leading-snug text-[#6B7280] dark:text-slate-400";
const MEGA_HOVER_CLASS =
  "rounded-[6px] px-2.5 py-2.5 transition-colors duration-150 ease-in-out hover:bg-[#F0F9FF] dark:hover:bg-[rgba(14,165,233,0.12)]";

type MegaNavItem = {
  label: string;
  href: string;
  description: string;
  Icon: LucideIcon;
  comingSoon?: boolean;
};

const CLIENT_INTELLIGENCE_NAV: MegaNavItem[] = [
  {
    label: "Revenue at Risk™",
    href: "/features/revenue-at-risk",
    description: "Every client that has changed, ranked by the revenue it holds.",
    Icon: PoundSterling,
  },
  {
    label: "Churn Replay™",
    href: "/features/churn-replay",
    description: "See whether Handover would have warned you about clients you lost.",
    Icon: Rewind,
  },
  {
    label: "Save Plays™",
    href: "/features/save-plays",
    description: "The steps to take on every flag, with an email ready to send.",
    Icon: LifeBuoy,
  },
  {
    label: "Client Margin",
    href: "/features/client-margin",
    description: "Revenue per hour for every client: who to save, fix or reprice.",
    Icon: Scale,
  },
  {
    label: "Renewal Radar",
    href: "/features/renewal-radar",
    description: "Every renewal in the next year, with the move to make.",
    Icon: CalendarClock,
  },
  {
    label: "Client Intelligence™",
    href: "/features/client-intelligence",
    description: "The signals behind every flag, against each client's own history.",
    Icon: Brain,
  },
];

const REPORTING_NAV: MegaNavItem[] = [
  {
    label: "Value Receipts™",
    href: "/features/value-receipts",
    description: "A monthly one-page summary for each client's decision-maker.",
    Icon: ReceiptText,
  },
  {
    label: "Service reviews",
    href: "/solutions/service-review",
    description: "Structured service review packs from live PSA data.",
    Icon: ClipboardCheck,
  },
  {
    label: "QBR packs",
    href: "/solutions/qbr",
    description: "Complete quarterly business review exports in minutes.",
    Icon: Presentation,
  },
  {
    label: "Weekly client reporting",
    href: "/solutions/weekly-client-reporting",
    description: "Professional updates sent automatically every week.",
    Icon: CalendarClock,
  },
  {
    label: "Scheduled reports",
    href: "/features/scheduled-reports",
    description: "Set once. Runs on schedule. Optional approval before send.",
    Icon: RefreshCw,
  },
];

function MegaMenuItemDesktop({ item }: { item: MegaNavItem }) {
  const inner = (
    <div className="flex gap-3">
      <item.Icon className={MEGA_ICON_CLASS} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className={MEGA_TITLE_CLASS}>{item.label}</span>
          {item.comingSoon ? (
            <span className="rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
              Coming soon
            </span>
          ) : null}
        </div>
        <p className={MEGA_DESC_CLASS}>{item.description}</p>
      </div>
    </div>
  );

  if (item.comingSoon) {
    return <div className={cn(MEGA_HOVER_CLASS, "cursor-default")}>{inner}</div>;
  }

  return (
    <Link href={item.href} className={cn(MEGA_HOVER_CLASS, "block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5E9]/40")}>
      {inner}
    </Link>
  );
}

function MegaMenuItemMobile({
  item,
  onNavigate,
}: {
  item: MegaNavItem;
  onNavigate: () => void;
}) {
  const inner = (
    <div className="flex gap-3">
      <item.Icon className={MEGA_ICON_CLASS} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className={MEGA_TITLE_CLASS}>{item.label}</span>
          {item.comingSoon ? (
            <span className="rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
              Coming soon
            </span>
          ) : null}
        </div>
        <p className={MEGA_DESC_CLASS}>{item.description}</p>
      </div>
    </div>
  );

  if (item.comingSoon) {
    return <div className={cn(MEGA_HOVER_CLASS, "cursor-default")}>{inner}</div>;
  }

  return (
    <Link
      href={item.href}
      className={cn(MEGA_HOVER_CLASS, "block")}
      onClick={onNavigate}
    >
      {inner}
    </Link>
  );
}

function navTargetPath(href: string) {
  const q = href.indexOf("?");
  return q === -1 ? href : href.slice(0, q);
}

function isNavLinkActive(pathname: string, href: string) {
  const path = navTargetPath(href);
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function Nav() {
  const pathname = usePathname();
  const navBranding = useProfileBrandingNav();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [userInitials, setUserInitials] = useState("U");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark";
    const saved = window.localStorage.getItem(THEME_KEY);
    return saved === "light" ? "light" : "dark";
  });
  const [navScrolled, setNavScrolled] = useState(false);
  const [guestMenuOpen, setGuestMenuOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [mobileSolutionsOpen, setMobileSolutionsOpen] = useState(false);
  const solutionsCloseTimerRef = useRef<number | null>(null);

  const openSolutionsMenu = () => {
    if (solutionsCloseTimerRef.current != null) {
      window.clearTimeout(solutionsCloseTimerRef.current);
      solutionsCloseTimerRef.current = null;
    }
    setSolutionsOpen(true);
  };

  const closeSolutionsMenuSoon = () => {
    if (solutionsCloseTimerRef.current != null) {
      window.clearTimeout(solutionsCloseTimerRef.current);
    }
    solutionsCloseTimerRef.current = window.setTimeout(() => {
      setSolutionsOpen(false);
      solutionsCloseTimerRef.current = null;
    }, 60);
  };

  useEffect(() => {
    startTransition(() => {
      setGuestMenuOpen(false);
      setSolutionsOpen(false);
      setMobileSolutionsOpen(false);
    });
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (solutionsCloseTimerRef.current != null) {
        window.clearTimeout(solutionsCloseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const sync = () => {
      void supabase.auth.getUser().then(({ data: { user } }) => {
        setIsSignedIn(Boolean(user));
        const emailInitial = user?.email?.[0]?.toUpperCase() || "U";
        setUserInitials(emailInitial);
        setAuthChecked(true);
      });
    };

    sync();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      sync();
    });

    return () => subscription.unsubscribe();
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    window.localStorage.setItem(THEME_KEY, next);
  };

  const solutionsNavActive =
    pathname.startsWith("/features/client-intelligence") ||
    pathname.startsWith("/features/health-dashboard") ||
    pathname.startsWith("/solutions/client-intelligence") ||
    pathname.startsWith("/solutions/msp-directors") ||
    pathname.startsWith("/solutions/service-review") ||
    pathname.startsWith("/solutions/qbr") ||
    pathname.startsWith("/solutions/weekly-client-reporting") ||
    pathname.startsWith("/features/scheduled-reports");

  const wlNav =
    isSignedIn &&
    navBranding.loaded &&
    navBranding.whiteLabelMode &&
    navBranding.brandName.trim().length > 0;
  const navTitle = wlNav ? navBranding.brandName.trim() : "Handover";

  /** App shell (`home-client`) renders the brand in the sidebar; hide duplicate nav logo on desktop. */
  const hideNavBrandForAppShell = isSignedIn && authChecked && pathname === "/";
  /** Main app: nav must not cover the fixed sidebar (z-40); sit nav in the main column only. */
  const appDashboardShell = pathname === "/" && isSignedIn && authChecked;
  if (appDashboardShell) return null;

  const isAppRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/settings");

  const navInner = (
    <nav
      className={cn(
        "h-14 w-full px-4 transition-[background-color,box-shadow,border-color,backdrop-filter] duration-300 md:px-6",
        appDashboardShell && "md:ml-[280px] md:w-[calc(100%-280px)]",
        isSignedIn && isAppRoute
          ? "rounded-none border-b border-white/[0.08] bg-[#0A0F1E] shadow-none backdrop-blur-none"
          : isSignedIn
            ? navScrolled
              ? theme === "dark"
                ? "border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-primary)_96%,transparent)] shadow-[0_4px_24px_rgba(15,28,63,0.12)] backdrop-blur-md"
                : "border-b border-[var(--border)] bg-white/95 shadow-[0_4px_24px_rgba(15,28,63,0.08)] backdrop-blur-md"
              : "border-b border-transparent bg-transparent"
            : navScrolled
              ? "bg-[#0A0F1E]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-xl transition-all duration-300"
              : "bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] rounded-2xl shadow-lg transition-all duration-300",
      )}
    >
      <div
        className={cn(
          "mx-auto flex h-full min-w-0 w-full max-w-6xl items-center gap-2",
          hideNavBrandForAppShell ? "md:justify-end" : "justify-between",
        )}
      >
        <Link
          href="/"
          className={cn(
            "inline-flex min-w-0 shrink-0 items-center gap-2 no-underline transition-opacity duration-150 hover:opacity-[0.85]",
            hideNavBrandForAppShell && "md:hidden",
          )}
        >
          <img
            src="/icon2.png"
            alt=""
            style={{
              width: "28px",
              height: "28px",
              objectFit: "contain",
              display: "block",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontWeight: 700,
              fontSize: "15px",
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
            }}
          >
            {navTitle}
          </span>
        </Link>
        <div className="flex min-w-0 shrink-0 items-center justify-end gap-2 text-sm">
          {!authChecked ? (
            <>
              <div
                className="h-9 w-10 shrink-0 animate-pulse rounded-md bg-[var(--bg-secondary)] md:hidden"
                aria-hidden
              />
              <div
                className="hidden h-9 w-[200px] animate-pulse rounded-md bg-[var(--bg-secondary)] md:block"
                aria-hidden
              />
            </>
          ) : !isSignedIn ? (
            <>
              <div className="hidden items-center md:flex">
                <div className="flex items-center gap-6 lg:gap-8">
                  <Link
                    href="/integrations"
                    className="nav-site-link text-[var(--text-secondary)]"
                    data-active={isNavLinkActive(pathname, "/integrations") ? "true" : undefined}
                  >
                    Integrations
                  </Link>
                  <div className="relative" onMouseEnter={openSolutionsMenu} onMouseLeave={closeSolutionsMenuSoon}>
                    <button
                      type="button"
                      className={cn(
                        "nav-site-link inline-flex items-center gap-1 text-[var(--text-secondary)]",
                        solutionsOpen && "text-[var(--text-primary)]",
                      )}
                      data-active={solutionsNavActive ? "true" : undefined}
                      aria-expanded={solutionsOpen}
                    >
                      Solutions
                      <ChevronDown
                        className={cn(
                          "size-3.5 transition-transform duration-150 ease-in-out",
                          solutionsOpen && "rotate-180",
                        )}
                      />
                    </button>
                    <div
                      className={cn(
                        "absolute left-1/2 top-[calc(100%+10px)] z-[60] w-[min(680px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-xl border border-[var(--border)]/80 p-3 shadow-2xl backdrop-blur-xl transition-all duration-150 ease-in-out",
                        solutionsOpen
                          ? "pointer-events-auto translate-y-0 opacity-100"
                          : "pointer-events-none -translate-y-1.5 opacity-0",
                      )}
                      onMouseEnter={openSolutionsMenu}
                      onMouseLeave={closeSolutionsMenuSoon}
                      style={{
                        background:
                          theme === "dark"
                            ? "linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(15,23,42,0.94) 100%)"
                            : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.96) 100%)",
                      }}
                    >
                      <div className="grid grid-cols-2 gap-x-3">
                        <div>
                          <p className="px-2.5 pb-1 pt-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] dark:text-slate-400">
                            Revenue protection
                          </p>
                          <div className="space-y-1">
                            {CLIENT_INTELLIGENCE_NAV.map((item) => (
                              <MegaMenuItemDesktop key={item.href + item.label} item={item} />
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="px-2.5 pb-1 pt-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] dark:text-slate-400">
                            Proof for clients
                          </p>
                          <div className="space-y-1">
                            {REPORTING_NAV.map((item) => (
                              <MegaMenuItemDesktop key={item.href + item.label} item={item} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Link
                    href="/pricing"
                    className="nav-site-link text-[var(--text-secondary)]"
                    data-active={isNavLinkActive(pathname, "/pricing") ? "true" : undefined}
                  >
                    Pricing
                  </Link>
                </div>
                <div className="ml-6 flex items-center gap-3 border-l border-[var(--border)] pl-6 lg:ml-8 lg:gap-4 lg:pl-8">
                  <Link
                    href="/auth?tab=signin"
                    className="nav-site-link text-[var(--text-secondary)]"
                    data-active={isNavLinkActive(pathname, "/auth") ? "true" : undefined}
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/demo"
                    className={cn(
                      "inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-[var(--radius)] border border-[var(--border)]",
                      "bg-transparent px-3 text-[13px] font-medium text-[var(--text-secondary)]",
                      "transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]",
                    )}
                    data-active={isNavLinkActive(pathname, "/demo") ? "true" : undefined}
                  >
                    Book a walkthrough
                  </Link>
                  <Link href="/onboarding/connect">
                    <Button className="h-8 whitespace-nowrap bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] hover:from-[var(--accent-hover)] hover:to-[var(--accent)] px-3.5 text-[13px] font-semibold text-white shadow-md shadow-[#0EA5E9]/20 transition-all duration-300 hover:scale-[1.02]">
                      Run your free scan
                    </Button>
                  </Link>
                </div>
              </div>

              <button
                type="button"
                className="inline-flex size-10 items-center justify-center rounded-[var(--radius)] border border-[var(--border)] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-secondary)] md:hidden"
                aria-expanded={guestMenuOpen}
                aria-controls="guest-nav-menu"
                aria-label={guestMenuOpen ? "Close menu" : "Open menu"}
                onClick={() => setGuestMenuOpen((o) => !o)}
              >
                {guestMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>

              {guestMenuOpen ? (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 top-14 z-40 bg-black/50 md:hidden"
                    aria-label="Close menu"
                    onClick={() => setGuestMenuOpen(false)}
                  />
                  <div
                    id="guest-nav-menu"
                    className="fixed inset-x-0 top-14 z-50 max-h-[min(70vh,calc(100dvh-3.5rem))] overflow-y-auto border-b border-[var(--border)] bg-[var(--bg-primary)] px-4 py-4 shadow-lg md:hidden"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Site menu"
                  >
                    <div className="mx-auto flex w-full max-w-6xl flex-col gap-1">
                      <Link
                        href="/integrations"
                        className="nav-site-link rounded-[var(--radius)] px-3 py-3 text-[15px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                        data-active={isNavLinkActive(pathname, "/integrations") ? "true" : undefined}
                        onClick={() => setGuestMenuOpen(false)}
                      >
                        Integrations
                      </Link>
                      <div className="rounded-[var(--radius)] border border-[var(--border)]">
                        <button
                          type="button"
                          className={cn(
                            "nav-site-link flex w-full items-center justify-between rounded-[var(--radius)] px-3 py-3 text-left text-[15px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]",
                          )}
                          data-active={solutionsNavActive ? "true" : undefined}
                          aria-expanded={mobileSolutionsOpen}
                          onClick={() => setMobileSolutionsOpen((v) => !v)}
                        >
                          <span>Solutions</span>
                          <ChevronDown className={cn("size-4 transition-transform", mobileSolutionsOpen && "rotate-180")} />
                        </button>
                        {mobileSolutionsOpen ? (
                          <div className="space-y-3 border-t border-[var(--border)] px-3 pb-3 pt-2">
                            <div>
                              <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] dark:text-slate-400">
                                Revenue protection
                              </p>
                              <div className="space-y-1">
                                {CLIENT_INTELLIGENCE_NAV.map((item) => (
                                  <MegaMenuItemMobile
                                    key={item.href + item.label}
                                    item={item}
                                    onNavigate={() => setGuestMenuOpen(false)}
                                  />
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] dark:text-slate-400">
                                Proof for clients
                              </p>
                              <div className="space-y-1">
                                {REPORTING_NAV.map((item) => (
                                  <MegaMenuItemMobile
                                    key={item.href + item.label}
                                    item={item}
                                    onNavigate={() => setGuestMenuOpen(false)}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <Link
                        href="/pricing"
                        className="nav-site-link rounded-[var(--radius)] px-3 py-3 text-[15px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                        data-active={isNavLinkActive(pathname, "/pricing") ? "true" : undefined}
                        onClick={() => setGuestMenuOpen(false)}
                      >
                        Pricing
                      </Link>
                      <Link
                        href="/auth?tab=signin"
                        className="nav-site-link rounded-[var(--radius)] px-3 py-3 text-[15px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                        data-active={isNavLinkActive(pathname, "/auth") ? "true" : undefined}
                        onClick={() => setGuestMenuOpen(false)}
                      >
                        Sign in
                      </Link>
                      <Link
                        href="/demo"
                        className="rounded-[var(--radius)] px-3 py-3 text-[15px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                        data-active={isNavLinkActive(pathname, "/demo") ? "true" : undefined}
                        onClick={() => setGuestMenuOpen(false)}
                      >
                        Book a walkthrough
                      </Link>
                      <Link
                        href="/onboarding/connect"
                        className="mt-2 block"
                        onClick={() => setGuestMenuOpen(false)}
                      >
                        <Button className="h-10 w-full whitespace-nowrap bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] hover:from-[var(--accent-hover)] hover:to-[var(--accent)] px-4 text-[13px] font-semibold text-white shadow-md shadow-[#0EA5E9]/20 transition-all duration-300">
                          Run your free scan
                        </Button>
                      </Link>
                    </div>
                  </div>
                </>
              ) : null}
            </>
          ) : (
            <>
              <Link
                href="/"
                className="nav-site-link text-[var(--text-secondary)]"
                data-active={isNavLinkActive(pathname, "/") ? "true" : undefined}
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={toggleTheme}
                className="min-h-0 rounded-md p-1.5 transition-transform duration-100 active:scale-95"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </button>
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-semibold text-white"
                onClick={() => {
                  window.location.href = "/?openSettings=1";
                }}
                aria-label="Open settings"
              >
                {userInitials}
              </button>
              <button
                type="button"
                className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                onClick={() => {
                  window.location.href = "/?openSettings=1";
                }}
                aria-label="Open settings"
              >
                <Settings className="size-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );

  if (!isSignedIn) {
    return (
      <div className="relative z-50 w-full px-4 pt-4 md:fixed md:left-1/2 md:top-4 md:w-[90%] md:max-w-5xl md:-translate-x-1/2 md:px-0 md:pt-0">
        {navInner}
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-50">
      {navInner}
    </div>
  );
}
