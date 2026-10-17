import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import PageTransition from "@/components/PageTransition";
import { BriefMock, RiskMock, WeekListMock } from "@/components/marketing/product-mocks";

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
    ],
  },
  {
    id: "by-use",
    title: "By job to be done",
    links: [
      {
        href: "/solutions/project-managers",
        title: "Project updates",
        body: "Keep clients informed on project progress without writing every update by hand.",
      },
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
        title: "Quarterly reviews",
        body: "A quarterly Value Receipt with next quarter's plan, for the people who renew.",
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

const ROLES = [
  {
    href: "/solutions/msp-directors",
    title: "MSP owners and directors",
    body: "Your book in one email every Monday: what is at risk, what renews, and the five things worth doing.",
    visual: "brief" as const,
  },
  {
    href: "/solutions/account-managers",
    title: "Account managers",
    body: "Know which of your clients need a call this week, walk in with the evidence, and send the email already written.",
    visual: "week" as const,
  },
  {
    href: "/solutions/service-desk-managers",
    title: "Service desk managers",
    body: "See when a client's response times or backlog move outside their normal, before it becomes an escalation.",
    visual: "risk" as const,
  },
];

export default function SolutionsIndexPage() {
  const more = GROUPS.filter((group) => group.id !== "by-role");
  return (
    <PageTransition>
      <MarketingPageLayout>
        <section className="relative overflow-hidden px-4 pb-10 pt-28 sm:px-6 md:pt-32 lg:px-8">
          <MarketingHeroAmbient />
          <div className="relative z-[1] mx-auto w-full max-w-6xl">
            <h1 className="max-w-3xl text-[2.4rem] font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:text-5xl lg:text-[3.4rem]">
              One product. Everyone who looks after a client.
            </h1>
            <p className="mt-5 max-w-2xl text-[17px] leading-8 text-white/70">
              Owners see the money. Account managers see who to call. Service leads see what is slipping. All from the
              same weekly read of your PSA.
            </p>
          </div>
        </section>

        <section className="px-4 pb-16 sm:px-6 lg:px-8" aria-label="By role">
          <ul className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-3">
            {ROLES.map((role) => (
              <li key={role.href}>
                <Link
                  href={role.href}
                  className="group flex h-full flex-col overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.03] transition-all duration-200 hover:-translate-y-1 hover:border-cyan-300/40"
                >
                  <div className="relative h-56 overflow-hidden border-b border-white/[0.07] bg-[#0b1322]">
                    <div className="pointer-events-none origin-top-left scale-[0.82] [width:122%]" aria-hidden>
                      {role.visual === "brief" ? <BriefMock /> : role.visual === "week" ? <WeekListMock compact autoplay={false} /> : <RiskMock />}
                    </div>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0b1322] to-transparent" />
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h2 className="text-lg font-semibold text-white">{role.title}</h2>
                    <p className="mt-2 flex-1 text-sm leading-6 text-white/60">{role.body}</p>
                    <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-cyan-300">
                      See how it works
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="px-4 pb-20 sm:px-6 lg:px-8" aria-label="More ways to use Handover">
          <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2">
            {more.map((group) => (
              <div key={group.id}>
                <h2 id={group.id} className="text-lg font-semibold text-white">
                  {group.title}
                </h2>
                <ul className="mt-3 divide-y divide-white/[0.07] border-y border-white/[0.07]">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="group flex items-start justify-between gap-4 py-3.5">
                        <span>
                          <span className="block text-[15px] font-medium text-white group-hover:text-cyan-200">{link.title}</span>
                          <span className="mt-0.5 block text-[13px] leading-5 text-white/50">{link.body}</span>
                        </span>
                        <ArrowRight className="mt-1 size-4 shrink-0 text-white/30 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-300" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </MarketingPageLayout>
    </PageTransition>
  );
}
