import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Microsoft Teams integration | Handover",
  description:
    "Send automatic Handover report notifications to your Microsoft Teams channels after manual or scheduled generation.",
  alternates: {
    canonical: "https://gethandover.uk/integrations/teams",
  },
};

export default function TeamsIntegrationLayout({ children }: { children: ReactNode }) {
  return children;
}
