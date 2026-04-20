"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { getPrefersReducedMotion } from "@/lib/prefers-reduced-motion";
import { cn } from "@/lib/utils";

type ScrollRevealItemProps = {
  children: ReactNode;
  className?: string;
  /** Stagger delay in ms (100ms per sibling typical). */
  index?: number;
  /** When true, skip scroll-driven opacity (avoids blank layout above the fold on marketing pages). */
  disableAnimation?: boolean;
};

export function ScrollRevealItem({
  children,
  className,
  index = 0,
  disableAnimation = false,
}: ScrollRevealItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(disableAnimation);

  useLayoutEffect(() => {
    if (disableAnimation || getPrefersReducedMotion()) setVisible(true);
  }, [disableAnimation]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (disableAnimation || getPrefersReducedMotion()) {
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -32px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [disableAnimation]);

  const delay =
    typeof window !== "undefined" && getPrefersReducedMotion() ? 0 : index * 100;

  return (
    <div
      ref={ref}
      className={cn(className)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 400ms ease-out ${delay}ms, transform 400ms ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
