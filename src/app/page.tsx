import type { Metadata } from "next";
import dynamic from "next/dynamic";

const HomeClient = dynamic(() => import("./home-client"), { ssr: true });

export const metadata: Metadata = {
  title: "Handover - The Reporting Tool Built for MSP Delivery Teams",
  description:
    "Handover — AI-powered client reporting for MSPs. Native HaloPSA and ConnectWise integration. Generate reports, push back to tickets, automate weekly updates.",
  alternates: {
    canonical: "https://gethandover.uk",
  },
};

export default function HomePage() {
  return <HomeClient />;
}
