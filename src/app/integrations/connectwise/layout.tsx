import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "ConnectWise Manage Integration for Client Retention | Handover",
  description:
    "Connect ConnectWise Manage read-only and see which clients are slipping, what they are worth, and what to do this week. On the ConnectWise Marketplace.",
  alternates: {
    canonical: "https://gethandover.uk/integrations/connectwise",
  },
};

export default function ConnectWiseIntegrationLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
