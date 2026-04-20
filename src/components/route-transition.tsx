"use client";

import { usePathname } from "next/navigation";

/**
 * Remounts on pathname change so CSS can run a 300ms fade + drift-in per route.
 * prefers-reduced-motion disables the animation in globals.css.
 */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-route-fade flex min-h-0 w-full flex-1 flex-col">
      {children}
    </div>
  );
}
