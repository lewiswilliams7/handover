import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  alternates: {
    canonical: "https://gethandover.uk/integrations/halopsa",
  },
};

export default function HaloPsaIntegrationLayout({ children }: { children: ReactNode }) {
  return children;
}
