import type { Metadata } from "next";
import Link from "next/link";

import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import PageTransition from "@/components/PageTransition";

export const metadata: Metadata = {
  title: "Solutions | Handover",
  description:
    "How Handover helps MSP owners, account managers and service teams protect recurring revenue and prove value, on HaloPSA or ConnectWise.",
  alternates: {
    canonical: "https://gethandover.uk/solutions",
  },
};

type SolutionLink = { href: string; title: string; body: string };

const GROUPS: Array<{ id: string; title: string; links: SolutionLink[] }> = [
  {
    id: "by-role",
    title: "By role",
    links: [
      {
        href: "/solutions/msp-directors",
        title: "MSP owners and directors",
        body: "See which clients are slipping and what they are worth, and count the revenue you keep.",
      },
      {
        href: "/solutions/account-managers",
        title: "Account managers",
        body: "Know which of your clients need a call this week, and walk in with the evidence.",
      },
      {
        href: "/solutions/service-desk-managers",
        title: "Service desk managers",
        body: "Spot service slipping for a client before it turns into an escalation.",
      },
      {
        href: "/solutions/project-managers",
        title: "Project managers",
        body: "Keep clients informed on project progress without writing every update by hand.",
      },
    ],
  },
  {
    id: "by-use",
    title: "By job to be done",
    links: [
      {
        href: "/solutions/client-intelligence",
        title: "Client intelligence",
        body: "The signals behind every flag, client by client, against their own history.",
      },
      {
        href: "/solutions/service-review",
        title: "Service reviews",
        body: "Show each client what you delivered and prevented, built from live PSA data.",
      },
      {
        href: "/solutions/qbr",
        title: "Quarterly business reviews",
        body: "Branded QBR packs for the people who decide whether to renew.",
      },
      {
        href: "/solutions/weekly-client-reporting",
        title: "Weekly client updates",
        body: "Regular, consistent updates sent on a schedule.",
      },
      {
        href: "/solutions/sla-reporting",
        title: "SLA reporting",
        body: "Service level performance per client, ready to share.",
      },
      {
        href: "/solutions/project-delivery",
        title: "Project delivery",
        body: "Status, risks and next steps for client projects.",
      },
    ],
  },
  {
    id: "by-psa",
    title: "By PSA",
    links: [
      {
        href: "/solutions/halopsa",
        title: "HaloPSA",
        body: "Native, read-only connection. Listed on the HaloPSA marketplace.",
      },
      {
        href: "/solutions/connectwise",
        title: "ConnectWise Manage",
        body: "Native, read-only connection. Listed on the ConnectWise marketplace.",
      },
    ],
  },
];

export default function SolutionsIndexPage() {
  return (
    <PageTransition>
      <MarketingPageLayout>
        <section className="relative overflow-hidden px-6 py-12 md:px-8 md:py-20">
          <MarketingHeroAmbient />
          <div className="relative z-[1] mx-auto w-full max-w-[1100px]">
            <h1 className="max-w-3xl text-3xl font-semibold text-[var(--text-primary)] md:text-5xl">
              Handover for your team
            </h1>
            <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-[var(--text-secondary)]">
              Everyone at an MSP sees a different part of a client relationship. Here is how Handover helps
              each of them keep clients and prove value.
            </p>
          </div>
        </section>
        {GROUPS.map((group) => (
          <section
            key={group.id}
            className="px-6 py-10 md:px-8"
            style={{ borderTop: "1px solid var(--border)" }}
            aria-labelledby={group.id}
          >
            <div className="mx-auto w-full max-w-[1100px]">
              <h2 id={group.id} className="text-2xl font-semibold text-[var(--text-primary)]">
                {group.title}
              </h2>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group block h-full rounded-[var(--radius-lg)] border border-[var(--border)] p-5 transition-colors hover:border-[rgba(56,189,248,0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0EA5E9]"
                    >
                      <span className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                        {link.title}
                      </span>
                      <span className="mt-2 block text-sm leading-6 text-[var(--text-secondary)]">{link.body}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}
      </MarketingPageLayout>
    </PageTransition>
  );
}
