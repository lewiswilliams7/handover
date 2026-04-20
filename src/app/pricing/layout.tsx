import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Pricing - Handover | Free Trial, Pro & Team Plans for MSPs",
  description:
    "Compare Handover plans: 14-day free trial, then unlock PSA push-back for HaloPSA and ConnectWise, scheduling, and Excel packs on Pro and Team.",
  alternates: {
    canonical: "https://gethandover.uk/pricing",
  },
};

export default function PricingLayout({ children }: { children: ReactNode }) {
  return children;
}
