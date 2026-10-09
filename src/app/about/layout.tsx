import type { Metadata } from "next";
import type { ReactNode } from "react";

const ABOUT_PAGE_TITLE = "Lewis Williams - Founder of Handover | AI Reporting for MSPs";
const ABOUT_PAGE_DESCRIPTION =
  "Lewis Williams is the 18-year-old founder of Handover, an AI-powered client reporting tool for MSPs built on HaloPSA and ConnectWise. Accepted into PitchIT 2026.";

const PERSON_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Lewis Williams",
  jobTitle: "Founder",
  worksFor: {
    "@type": "Organization",
    name: "Handover",
    url: "https://gethandover.uk",
  },
  description:
    "18-year-old founder of Handover, AI-powered client reporting for MSPs. Technical Project Manager, HaloITSM Certified, PitchIT 2026.",
  url: "https://gethandover.uk/about",
};

export const metadata: Metadata = {
  title: ABOUT_PAGE_TITLE,
  description: ABOUT_PAGE_DESCRIPTION,
  alternates: {
    canonical: "https://gethandover.uk/about",
  },
};

export default function AboutLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(PERSON_JSON_LD) }}
      />
      {children}
    </>
  );
}
