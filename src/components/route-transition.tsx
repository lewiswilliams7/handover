"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function MarketingBackgroundLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (window.innerWidth < 768) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#172035";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const grad = ctx.createRadialGradient(
          canvas.width * 0.8,
          canvas.height * 0.1,
          0,
          canvas.width * 0.8,
          canvas.height * 0.1,
          canvas.width * 0.9,
        );
        grad.addColorStop(0, "rgba(14, 165, 233, 0.18)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // The orbs are soft gradients, so they are drawn at an eighth of the
    // screen's resolution and stretched by CSS: it looks identical and costs a
    // fraction of the paint, which keeps scrolling smooth. Drawn ~24 times a
    // second rather than every frame, paused when the tab is hidden, and drawn
    // once for people who prefer reduced motion.
    const SCALE = 0.125;
    const FRAME_MS = 42;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let animationId = 0;
    let time = 0;
    let last = 0;

    const resize = () => {
      canvas.width = Math.max(1, Math.round(window.innerWidth * SCALE));
      canvas.height = Math.max(1, Math.round(window.innerHeight * SCALE));
    };

    resize();
    window.addEventListener("resize", resize);

    const orbs = [
      { x: 0.15, y: 0.15, vx: 0.00018, vy: 0.00012, size: 0.85, opacity: 0.38, color: "14, 165, 233" },
      { x: 0.85, y: 0.75, vx: -0.00014, vy: -0.00018, size: 0.75, opacity: 0.28, color: "99, 102, 241" },
      { x: 0.5, y: 0.35, vx: 0.00012, vy: -0.00014, size: 0.65, opacity: 0.2, color: "14, 165, 233" },
      { x: 0.2, y: 0.75, vx: 0.00016, vy: -0.0001, size: 0.55, opacity: 0.18, color: "56, 189, 248" },
      { x: 0.8, y: 0.25, vx: -0.0001, vy: 0.00016, size: 0.6, opacity: 0.16, color: "99, 102, 241" },
    ];

    const paint = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#172035";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      orbs.forEach((orb) => {
        const x = (orb.x + Math.sin(time * orb.vx * 100) * 0.45) * canvas.width;
        const y = (orb.y + Math.cos(time * orb.vy * 100) * 0.45) * canvas.height;
        const radius = Math.max(canvas.width, canvas.height) * orb.size;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgba(${orb.color}, ${orb.opacity})`);
        gradient.addColorStop(0.3, `rgba(${orb.color}, ${orb.opacity * 0.5})`);
        gradient.addColorStop(0.6, `rgba(${orb.color}, ${orb.opacity * 0.15})`);
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });
    };

    const draw = (now: number) => {
      animationId = requestAnimationFrame(draw);
      if (document.hidden || now - last < FRAME_MS) return;
      // Advance by elapsed time, so the drift speed matches the old 60fps loop.
      time += last === 0 ? 1 : (now - last) / 16.67;
      last = now;
      paint();
    };

    if (reduceMotion) {
      paint();
    } else {
      animationId = requestAnimationFrame(draw);
    }

    const onResize = () => {
      resize();
      if (reduceMotion) paint();
    };
    window.removeEventListener("resize", resize);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      aria-hidden="true"
      style={{ zIndex: -1, display: "block", width: "100vw", height: "100vh" }}
    />
  );
}

/**
 * Remounts on pathname change so CSS can run a 300ms fade + drift-in per route.
 * prefers-reduced-motion disables the animation in globals.css.
 */
function isPortalCustomerPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  /** `/portal/{msp}/{client}` and deeper (e.g. invite) — no marketing nav; skip top padding reserved for Nav. */
  return segments[0] === "portal" && segments.length >= 3;
}

export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isAuthenticatedAppRoute =
    pathname === "/" ||
    pathname === "/attention" ||
    pathname === "/receipts" ||
    pathname === "/margin" ||
    pathname === "/renewals" ||
    pathname === "/week" ||
    pathname.startsWith("/clients");
  const isWelcomeRoute = pathname === "/welcome";
  const isAuthRoute = pathname === "/auth" || pathname.startsWith("/auth/");
  const isOnboardingRoute = pathname === "/onboarding" || pathname.startsWith("/onboarding/");
  const skipNavTopPad =
    isDashboardRoute ||
    isAuthenticatedAppRoute ||
    isWelcomeRoute ||
    isAuthRoute ||
    isOnboardingRoute ||
    isPortalCustomerPath(pathname);
  return (
    <div
      key={pathname}
      className={`page-route-fade relative flex min-h-0 w-full flex-1 flex-col ${
        skipNavTopPad ? "" : "md:pt-20"
      } ${isAuthRoute ? "bg-[#0f172a]" : ""}`}
    >
      {children}
    </div>
  );
}
