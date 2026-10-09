import type { Metadata } from "next";
import PageTransition from "@/components/PageTransition";
import { HomeClientLoader } from "@/components/home-client-loader";

export const metadata: Metadata = {
  title: "Handover - See Which Clients Are Slipping, in Pounds",
  description:
    "Handover connects to HaloPSA or ConnectWise, puts a pound value on every client whose service or relationship has changed, and replays the clients you have lost to show it would have warned you. Built for MSPs.",
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
