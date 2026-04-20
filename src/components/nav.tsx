"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  CalendarClock,
  ChevronDown,
  ClipboardList,
  Clock,
  FileDown,
  FolderKanban,
  Gauge,
  Handshake,
  Headphones,
  LayoutTemplate,
  Menu,
  Moon,
  Paintbrush,
  Plug,
  Presentation,
  RefreshCw,
  Settings,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { startTransition, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useProfileBrandingNav } from "@/hooks/use-profile-branding-nav";
import { BOOK_DEMO_CALENDLY_URL } from "@/lib/book-demo";
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

const SOLUTIONS_BY_ROLE: MegaNavItem[] = [
  {
    label: "For Project Managers",
    href: "/solutions/project-managers",
    description: "Automate every client project update.",
    Icon: ClipboardList,
  },
  {
    label: "For Account Managers",
    href: "/solutions/account-managers",
    description: "QBR packs and account reports in seconds.",
    Icon: Handshake,
  },
  {
    label: "For Service Desk Managers",
    href: "/solutions/service-desk-managers",
    description: "Turn your ticket queue into client communication.",
    Icon: Headphones,
  },
  {
    label: "For MSP Directors",
    href: "/solutions/msp-directors",
    description: "Prove value. Retain clients. Scale reporting.",
    Icon: BarChart3,
  },
];

const SOLUTIONS_BY_USE_CASE: MegaNavItem[] = [
  {
    label: "Weekly Client Reporting",
    href: "/solutions/weekly-client-reporting",
    description: "Professional updates sent automatically every week.",
    Icon: CalendarClock,
  },
  {
    label: "Quarterly Business Reviews",
    href: "/solutions/qbr",
    description: "A complete QBR pack from your PSA in 60 seconds.",
    Icon: Presentation,
  },
  {
    label: "Project Delivery Updates",
    href: "/solutions/project-delivery",
    description: "Keep clients informed without writing a word.",
    Icon: FolderKanban,
  },
  {
    label: "SLA and Performance Reporting",
    href: "/solutions/sla-reporting",
    description: "Show clients exactly how you are performing.",
    Icon: Gauge,
  },
];

const SOLUTIONS_BY_PSA: MegaNavItem[] = [
  {
    label: "HaloPSA Users",
    href: "/solutions/halopsa",
    description: "Native integration. Works out of the box.",
    Icon: Plug,
  },
  {
    label: "ConnectWise Users",
    href: "/solutions/connectwise",
    description: "Full ConnectWise Manage support. Live now.",
    Icon: Plug,
  },
  {
    label: "Coming Soon: Autotask",
    href: "#",
    description: "Autotask integration in development.",
    Icon: Clock,
    comingSoon: true,
  },
];

const FEATURES_REPORTS_INSIGHTS: MegaNavItem[] = [
  {
    label: "Automated Weekly Reports",
    href: "/features/automated-reports",
    description: "Reports that write and send themselves.",
    Icon: RefreshCw,
  },
  {
    label: "QBR Pack Generator",
    href: "/features/qbr-generator",
    description: "Charts, summaries, and exports in under a minute.",
    Icon: LayoutTemplate,
  },
  {
    label: "Scheduled Reporting",
    href: "/features/scheduled-reports",
    description: "Set once. Runs forever. Zero manual effort.",
    Icon: CalendarClock,
  },
  {
    label: "AI-Powered Insights",
    href: "/features/ai-insights",
    description: "MSP-trained AI that understands your data.",
    Icon: Sparkles,
  },
  {
    label: "Delivery Health Dashboard",
    href: "/features/health-dashboard",
    description: "RAG status across every client account, live.",
    Icon: Activity,
  },
];

const FEATURES_INTEGRATIONS_EXPORTS: MegaNavItem[] = [
  {
    label: "HaloPSA Integration",
    href: "/features/psa-integration#halopsa",
    description: "Native API connection. Full ticket and project data.",
    Icon: Plug,
  },
  {
    label: "ConnectWise Integration",
    href: "/features/psa-integration#connectwise",
    description: "Direct ConnectWise Manage REST API integration.",
    Icon: Plug,
  },
  {
    label: "Excel and PowerPoint Export",
    href: "/features/exports",
    description: "Branded exports ready to send or present.",
    Icon: FileDown,
  },
  {
    label: "Push Notes to PSA",
    href: "/features/psa-push",
    description: "Reports that update your PSA automatically.",
    Icon: ArrowLeftRight,
  },
  {
    label: "White Label and Branding",
    href: "/features/white-label",
    description: "Your logo. Your colours. Your identity throughout.",
    Icon: Paintbrush,
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
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [mobileSolutionsOpen, setMobileSolutionsOpen] = useState(false);
  const [mobileFeaturesOpen, setMobileFeaturesOpen] = useState(false);
  const solutionsCloseTimerRef = useRef<number | null>(null);
  const featuresCloseTimerRef = useRef<number | null>(null);

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

  const openFeaturesMenu = () => {
    if (featuresCloseTimerRef.current != null) {
      window.clearTimeout(featuresCloseTimerRef.current);
      featuresCloseTimerRef.current = null;
    }
    setFeaturesOpen(true);
  };

  const closeFeaturesMenuSoon = () => {
    if (featuresCloseTimerRef.current != null) {
      window.clearTimeout(featuresCloseTimerRef.current);
    }
    featuresCloseTimerRef.current = window.setTimeout(() => {
      setFeaturesOpen(false);
      featuresCloseTimerRef.current = null;
    }, 60);
  };

  useEffect(() => {
    startTransition(() => {
      setGuestMenuOpen(false);
      setSolutionsOpen(false);
      setFeaturesOpen(false);
      setMobileSolutionsOpen(false);
      setMobileFeaturesOpen(false);
    });
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (solutionsCloseTimerRef.current != null) {
        window.clearTimeout(solutionsCloseTimerRef.current);
      }
      if (featuresCloseTimerRef.current != null) {
        window.clearTimeout(featuresCloseTimerRef.current);
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

  const solutionsNavActive = pathname.startsWith("/solutions");
  const featuresNavActive = pathname.startsWith("/features");

  const wlNav =
    isSignedIn &&
    navBranding.loaded &&
    navBranding.whiteLabelMode &&
    navBranding.brandName.trim().length > 0;
  const navTitle = wlNav ? navBranding.brandName.trim() : "Handover";

  /** App shell (`home-client`) renders the brand in the sidebar; hide duplicate nav logo on desktop. */
  const hideNavBrandForAppShell = isSignedIn && authChecked && pathname === "/";
  /** Main app: nav must not cover the fixed sidebar (z-40); sit nav in the main column only. */
  const appDashboardShell = isSignedIn && authChecked && pathname === "/";

  return (
    <nav
      className={cn(
        "sticky top-0 z-50 h-14 w-full px-4 transition-[background-color,box-shadow,border-color,backdrop-filter] duration-300 md:px-6",
        appDashboardShell && "md:ml-[280px] md:w-[calc(100%-280px)]",
        navScrolled
          ? theme === "dark"
            ? "border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-primary)_96%,transparent)] shadow-[0_4px_24px_rgba(15,28,63,0.12)] backdrop-blur-md"
            : "border-b border-[var(--border)] bg-white/95 shadow-[0_4px_24px_rgba(15,28,63,0.08)] backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
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
        <div className="flex min-w-0 shrink-0 items-center justify-end gap-2 text-sm md:gap-4">
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
              <div className="hidden items-center gap-3 lg:gap-4 md:flex">
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
                      "absolute left-1/2 top-[calc(100%+10px)] z-[60] w-[min(920px,calc(100vw-1.5rem))] max-w-[calc(100vw-1rem)] -translate-x-1/2 overflow-x-auto rounded-2xl border border-[var(--border)]/80 p-4 shadow-2xl backdrop-blur-xl transition-all duration-150 ease-in-out",
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
                    <div
                      className="grid min-w-[872px] gap-4"
                      style={{ gridTemplateColumns: "repeat(3, minmax(280px, 1fr))" }}
                    >
                      <div className="min-w-[280px] rounded-xl border border-[var(--border)]/60 bg-[var(--bg-primary)]/50 p-3">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#38bdf8]">By role</p>
                        <div className="space-y-1">
                          {SOLUTIONS_BY_ROLE.map((item) => (
                            <MegaMenuItemDesktop key={item.href + item.label} item={item} />
                          ))}
                        </div>
                      </div>
                      <div className="min-w-[280px] rounded-xl border border-[var(--border)]/60 bg-[var(--bg-primary)]/50 p-3">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#38bdf8]">By use case</p>
                        <div className="space-y-1">
                          {SOLUTIONS_BY_USE_CASE.map((item) => (
                            <MegaMenuItemDesktop key={item.href + item.label} item={item} />
                          ))}
                        </div>
                      </div>
                      <div className="min-w-[280px] rounded-xl border border-[var(--border)]/60 bg-[var(--bg-primary)]/50 p-3">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#38bdf8]">By PSA</p>
                        <div className="space-y-1">
                          {SOLUTIONS_BY_PSA.map((item) => (
                            <MegaMenuItemDesktop key={item.label} item={item} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative" onMouseEnter={openFeaturesMenu} onMouseLeave={closeFeaturesMenuSoon}>
                  <button
                    type="button"
                    className={cn(
                      "nav-site-link inline-flex items-center gap-1 text-[var(--text-secondary)]",
                      featuresOpen && "text-[var(--text-primary)]",
                    )}
                    data-active={featuresNavActive ? "true" : undefined}
                    aria-expanded={featuresOpen}
                  >
                    Features
                    <ChevronDown
                      className={cn(
                        "size-3.5 transition-transform duration-150 ease-in-out",
                        featuresOpen && "rotate-180",
                      )}
                    />
                  </button>
                  <div
                    className={cn(
                      "absolute left-1/2 top-[calc(100%+10px)] z-[60] w-[min(720px,calc(100vw-1.5rem))] max-w-[calc(100vw-1rem)] -translate-x-1/2 overflow-x-auto rounded-2xl border border-[var(--border)]/80 p-4 shadow-2xl backdrop-blur-xl transition-all duration-150 ease-in-out",
                      featuresOpen
                        ? "pointer-events-auto translate-y-0 opacity-100"
                        : "pointer-events-none -translate-y-1.5 opacity-0",
                    )}
                    onMouseEnter={openFeaturesMenu}
                    onMouseLeave={closeFeaturesMenuSoon}
                    style={{
                      background:
                        theme === "dark"
                          ? "linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(15,23,42,0.94) 100%)"
                          : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.96) 100%)",
                    }}
                  >
                    <div
                      className="grid min-w-[592px] gap-4"
                      style={{ gridTemplateColumns: "repeat(2, minmax(280px, 1fr))" }}
                    >
                      <div className="min-w-[280px] rounded-xl border border-[var(--border)]/60 bg-[var(--bg-primary)]/50 p-3">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#38bdf8]">
                          Reports and Insights
                        </p>
                        <div className="space-y-1">
                          {FEATURES_REPORTS_INSIGHTS.map((item) => (
                            <MegaMenuItemDesktop key={item.href + item.label} item={item} />
                          ))}
                        </div>
                      </div>
                      <div className="min-w-[280px] rounded-xl border border-[var(--border)]/60 bg-[var(--bg-primary)]/50 p-3">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#38bdf8]">
                          Integrations and Exports
                        </p>
                        <div className="space-y-1">
                          {FEATURES_INTEGRATIONS_EXPORTS.map((item) => (
                            <MegaMenuItemDesktop key={item.href + item.label} item={item} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <Link
                  href="/roadmap"
                  className="nav-site-link text-[var(--text-secondary)]"
                  data-active={isNavLinkActive(pathname, "/roadmap") ? "true" : undefined}
                >
                  Roadmap
                </Link>
                <Link
                  href="/pricing"
                  className="nav-site-link text-[var(--text-secondary)]"
                  data-active={isNavLinkActive(pathname, "/pricing") ? "true" : undefined}
                >
                  Pricing
                </Link>
                <a
                  href={BOOK_DEMO_CALENDLY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center justify-center rounded-[var(--radius)] border border-[var(--border)]",
                    "bg-transparent px-3.5 text-sm font-medium text-[var(--text-secondary)]",
                    "transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]",
                  )}
                >
                  Book a demo
                </a>
                <Link
                  href="/auth?tab=signin"
                  className="nav-site-link text-[var(--text-secondary)]"
                  data-active={isNavLinkActive(pathname, "/auth") ? "true" : undefined}
                >
                  Sign in
                </Link>
                <Link href="/signup">
                  <Button className="rounded-[var(--radius)] bg-[var(--accent)] px-3 text-[13px] text-white hover:bg-[var(--accent-hover)] md:px-4 md:text-sm">
                    Start free trial
                  </Button>
                </Link>
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
                              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#38bdf8]">By role</p>
                              <div className="space-y-1">
                                {SOLUTIONS_BY_ROLE.map((item) => (
                                  <MegaMenuItemMobile
                                    key={item.href + item.label}
                                    item={item}
                                    onNavigate={() => setGuestMenuOpen(false)}
                                  />
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#38bdf8]">By use case</p>
                              <div className="space-y-1">
                                {SOLUTIONS_BY_USE_CASE.map((item) => (
                                  <MegaMenuItemMobile
                                    key={item.href + item.label}
                                    item={item}
                                    onNavigate={() => setGuestMenuOpen(false)}
                                  />
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#38bdf8]">By PSA</p>
                              <div className="space-y-1">
                                {SOLUTIONS_BY_PSA.map((item) => (
                                  <MegaMenuItemMobile
                                    key={item.label}
                                    item={item}
                                    onNavigate={() => setGuestMenuOpen(false)}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <div className="rounded-[var(--radius)] border border-[var(--border)]">
                        <button
                          type="button"
                          className="nav-site-link flex w-full items-center justify-between rounded-[var(--radius)] px-3 py-3 text-left text-[15px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                          data-active={featuresNavActive ? "true" : undefined}
                          aria-expanded={mobileFeaturesOpen}
                          onClick={() => setMobileFeaturesOpen((v) => !v)}
                        >
                          <span>Features</span>
                          <ChevronDown className={cn("size-4 transition-transform", mobileFeaturesOpen && "rotate-180")} />
                        </button>
                        {mobileFeaturesOpen ? (
                          <div className="space-y-3 border-t border-[var(--border)] px-3 pb-3 pt-2">
                            <div>
                              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#38bdf8]">Reports and insights</p>
                              <div className="space-y-1">
                                {FEATURES_REPORTS_INSIGHTS.map((item) => (
                                  <MegaMenuItemMobile
                                    key={item.href + item.label}
                                    item={item}
                                    onNavigate={() => setGuestMenuOpen(false)}
                                  />
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#38bdf8]">Integrations and exports</p>
                              <div className="space-y-1">
                                {FEATURES_INTEGRATIONS_EXPORTS.map((item) => (
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
                        href="/roadmap"
                        className="nav-site-link rounded-[var(--radius)] px-3 py-3 text-[15px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                        data-active={isNavLinkActive(pathname, "/roadmap") ? "true" : undefined}
                        onClick={() => setGuestMenuOpen(false)}
                      >
                        Roadmap
                      </Link>
                      <Link
                        href="/pricing"
                        className="nav-site-link rounded-[var(--radius)] px-3 py-3 text-[15px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                        data-active={isNavLinkActive(pathname, "/pricing") ? "true" : undefined}
                        onClick={() => setGuestMenuOpen(false)}
                      >
                        Pricing
                      </Link>
                      <a
                        href={BOOK_DEMO_CALENDLY_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-[var(--radius)] px-3 py-3 text-[15px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                        onClick={() => setGuestMenuOpen(false)}
                      >
                        Book a demo
                      </a>
                      <Link
                        href="/auth?tab=signin"
                        className="nav-site-link rounded-[var(--radius)] px-3 py-3 text-[15px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                        data-active={isNavLinkActive(pathname, "/auth") ? "true" : undefined}
                        onClick={() => setGuestMenuOpen(false)}
                      >
                        Sign in
                      </Link>
                      <Link
                        href="/signup"
                        className="mt-2 block"
                        onClick={() => setGuestMenuOpen(false)}
                      >
                        <Button className="h-11 w-full rounded-[var(--radius)] bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]">
                          Start free trial
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
                onClick={() => (window.location.href = "/?openSettings=1")}
                aria-label="Open settings"
              >
                {userInitials}
              </button>
              <button
                type="button"
                className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                onClick={() => (window.location.href = "/?openSettings=1")}
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
}
