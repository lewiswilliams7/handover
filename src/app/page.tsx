import type { Metadata } from "next";
import PageTransition from "@/components/PageTransition";
import { HomeClientLoader } from "@/components/home-client-loader";

export const metadata: Metadata = {
  title: "Handover - The Reporting Tool Built for MSP Delivery Teams",
  description:
    "Handover — AI-powered client reporting for MSPs. Native HaloPSA and ConnectWise integration. Generate reports, push back to tickets, automate weekly updates.",
  alternates: {
    canonical: "https://gethandover.uk",
  },
};

export default function HomePage() {
  return (
    <PageTransition>
      <main className="marketing-aurora overflow-x-hidden">
        <HomeClientLoader />
      </main>
    </PageTransition>
  );
}
