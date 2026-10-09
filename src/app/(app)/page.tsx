import type { Metadata } from "next";
import PageTransition from "@/components/PageTransition";
import { HomeClientLoader } from "@/components/home-client-loader";

export const metadata: Metadata = {
  title: "Handover - Know Which Clients Need Your Attention",
  description:
    "Handover connects to HaloPSA or ConnectWise and surfaces the client accounts where commercial, service or relationship behaviour has materially changed. Built for MSPs.",
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
