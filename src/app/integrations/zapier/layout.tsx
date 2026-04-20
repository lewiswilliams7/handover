import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  alternates: {
    canonical: "https://gethandover.uk/integrations/zapier",
  },
};

export default function ZapierIntegrationLayout({ children }: { children: ReactNode }) {
  return children;
}
