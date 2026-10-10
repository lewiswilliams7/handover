import type { Metadata } from "next";
import type { ReactNode } from "react";

const ABOUT_PAGE_TITLE = "Lewis Williams - Founder of Handover | Revenue protection for MSPs";
const ABOUT_PAGE_DESCRIPTION =
  "Lewis Williams, 19, is the founder of Handover, which shows MSP owners which clients are slipping and what they're worth, straight from HaloPSA or ConnectWise.";

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
    "Founder of Handover, revenue protection for MSPs on HaloPSA and ConnectWise. ESM Consultant, HaloITSM Certified.",
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
