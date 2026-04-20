import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "HaloPSA Reporting Tool for MSP Teams - Handover",
  description:
    "Handover connects to HaloPSA and generates client emails, action logs, risk logs and status reports from your live ticket data in under 30 seconds. The only reporting tool built natively for HaloPSA.",
  alternates: {
    canonical: "https://gethandover.uk/halopsa-reporting",
  },
};

export default function HalopsaReportingLayout({ children }: { children: ReactNode }) {
  return children;
}
