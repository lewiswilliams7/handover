import type { Metadata } from "next";
import Link from "next/link";

import { MarketingPageLayout } from "@/components/marketing-page-layout";

export const metadata: Metadata = {
  title: "Solutions | Handover",
  description:
    "Handover solutions for MSP roles, use cases, and PSA stacks including HaloPSA and ConnectWise.",
  alternates: {
    canonical: "https://gethandover.uk/solutions",
  },
};

const links = [
  "/solutions/project-managers",
  "/solutions/account-managers",
  "/solutions/service-desk-managers",
  "/solutions/msp-directors",
  "/solutions/weekly-client-reporting",
  "/solutions/qbr",
  "/solutions/project-delivery",
  "/solutions/sla-reporting",
  "/solutions/halopsa",
  "/solutions/connectwise",
];

export default function SolutionsIndexPage() {
  return (
    <MarketingPageLayout>
      <section className="px-6 py-14 md:px-8 md:py-20">
        <div className="mx-auto w-full max-w-[1100px]">
          <h1 className="text-3xl font-semibold text-[var(--text-primary)]">Solutions</h1>
          <p className="mt-2 max-w-2xl text-[14px] text-[var(--text-secondary)]">
            Solution pages are being expanded. Use the links below for placeholder routes.
          </p>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {links.map((href) => (
              <Link
                key={href}
                href={href}
                className="rounded-[var(--radius)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
              >
                {href}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </MarketingPageLayout>
  );
}

