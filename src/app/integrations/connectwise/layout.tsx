import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "ConnectWise Manage integration | Handover",
  description:
    "Connect Handover to ConnectWise Manage - pull service tickets and projects, generate client outputs, and push notes back.",
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
