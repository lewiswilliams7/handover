import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "HaloPSA Integration for Client Retention | Handover",
  description:
    "Connect HaloPSA read-only and see which clients are slipping, what they are worth, and what to do this week. On the HaloPSA Marketplace.",
  alternates: {
    canonical: "https://gethandover.uk/integrations/halopsa",
  },
};

export default function HaloPsaIntegrationLayout({ children }: { children: ReactNode }) {
  return children;
}
