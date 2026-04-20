import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Slack integration | Handover",
  description:
    "Send automatic Handover report notifications to your Slack channels after manual or scheduled generation.",
  alternates: {
    canonical: "https://gethandover.uk/integrations/slack",
  },
};

export default function SlackIntegrationLayout({ children }: { children: ReactNode }) {
  return children;
}
