import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "About | Handover",
  description:
    "Handover was built by a Technical Project Manager inside an MSP - to eliminate the weekly reporting burden and give delivery teams their time back.",
  alternates: {
    canonical: "https://gethandover.uk/about",
  },
};

export default function AboutLayout({ children }: { children: ReactNode }) {
  return children;
}
