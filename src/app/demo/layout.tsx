import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Book a walkthrough | Handover",
  description:
    "Book a 15-minute walkthrough of Handover. See how it connects to HaloPSA or ConnectWise and surfaces the client accounts that need your attention.",
  alternates: {
    canonical: "https://gethandover.uk/demo",
  },
};

export default function DemoLayout({ children }: { children: ReactNode }) {
  return children;
}
