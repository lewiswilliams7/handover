import { cn } from "@/lib/utils";

export type PricingPlanTickVariant = "professional" | "team" | "enterprise";

/**
 * Unified stroked check for pricing cards — cyan on all plans.
 */
export function PricingPlanTick({
  variant: _variant,
  className,
}: {
  variant?: PricingPlanTickVariant;
  className?: string;
}) {
  return (
    <svg
      className={cn("mt-0.5 size-[18px] shrink-0 text-cyan-400", className)}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
    >
      <path
        d="M5 10l3.5 3.5L15 7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
