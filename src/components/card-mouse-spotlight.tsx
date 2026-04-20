"use client";

import { useRef } from "react";

import { useCardMouseSpotlight } from "@/hooks/use-card-mouse-spotlight";
import { cn } from "@/lib/utils";

type CardMouseSpotlightProps = React.ComponentPropsWithoutRef<"div"> & {
  variant?: "default" | "subtle";
};

export function CardMouseSpotlight({
  className,
  variant = "default",
  ...props
}: CardMouseSpotlightProps) {
  const ref = useRef<HTMLDivElement>(null);
  useCardMouseSpotlight(ref);

  return (
    <div
      ref={ref}
      className={cn(
        "card-mouse-spotlight",
        variant === "subtle" && "card-mouse-spotlight--subtle",
        className,
      )}
      {...props}
    />
  );
}
