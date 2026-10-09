import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Pricing - Handover | One plan, everything included",
  description:
    "Handover is £499/month or £4,990 annually, with every feature included. Run the free PSA scan before you buy.",
  alternates: {
    canonical: "https://gethandover.uk/pricing",
  },
};

export default function PricingLayout({ children }: { children: ReactNode }) {
  return children;
}
