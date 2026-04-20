import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/** Plan accent colours — hex only (no CSS variables) for consistent rendering. */
const VARIANT = {
  professional: "#0EA5E9",
  team: "#7C3AED",
  enterprise: "#C9A84C",
} as const;

export type PricingPlanTickVariant = keyof typeof VARIANT;

/**
 * Unified tick for pricing cards: filled circle + checkmark, same size/weight on every plan.
 */
export function PricingPlanTick({
  variant,
  className,
}: {
  variant: PricingPlanTickVariant;
  className?: string;
}) {
  const bg = VARIANT[variant];
  return (
    <span
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-full",
        className,
      )}
      style={{ backgroundColor: bg, color: "#ffffff" }}
      aria-hidden
    >
      <Check className="size-[0.65rem]" strokeWidth={3} />
    </span>
  );
}
