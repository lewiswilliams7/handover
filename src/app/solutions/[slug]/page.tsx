import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart3, LayoutTemplate, Plug } from "lucide-react";

import { MarketingRelatedPages } from "@/components/marketing-related-pages";
import { MarketingPageLayout } from "@/components/marketing-page-layout";

const TITLES: Record<string, string> = {
  "project-managers": "For Project Managers",
  "account-managers": "For Account Managers",
  "service-desk-managers": "For Service Desk Managers",
  "msp-directors": "For MSP Directors",
  "weekly-client-reporting": "Weekly Client Reporting",
  qbr: "Quarterly Business Reviews",
  "project-delivery": "Project Delivery Updates",
  "sla-reporting": "SLA & Performance Reporting",
  halopsa: "HaloPSA Users",
  connectwise: "ConnectWise Users",
};

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const title = TITLES[slug];
  if (!title) return {};
  return {
    title: `${title} | Handover Solutions`,
    description: `${title} solution page. Full page content is coming soon.`,
    alternates: { canonical: `https://gethandover.uk/solutions/${slug}` },
  };
}

export default async function SolutionSlugPage({ params }: Props) {
  const { slug } = await params;
  const title = TITLES[slug];
  if (!title) return notFound();

  return (
    <MarketingPageLayout>
      <section className="marketing-page-hero px-6 py-14 md:px-8 md:py-20">
        <div className="mx-auto w-full max-w-[900px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
            Solutions
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">{title}</h1>
          <p className="mt-3 text-[14px] text-[var(--text-secondary)]">
            Coming soon. This page has been scaffolded and will be populated with full role/use-case copy.
          </p>

          <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--border)] border-l-[3px] border-l-[#0EA5E9] bg-[var(--bg-primary)] p-5">
            <h2 className="text-lg font-medium text-[var(--text-primary)]">Placeholder Structure</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--text-secondary)]">
              <li>Problem context for this audience/use case</li>
              <li>How Handover solves it (workflow + outcomes)</li>
              <li>Example outputs and ROI</li>
              <li>Call-to-action + integration path</li>
            </ul>
          </div>

          <div className="mt-6">
            <Link
              href="/solutions"
              className="text-sm font-medium text-[var(--accent)] underline-offset-4 hover:underline"
            >
              ← Back to solutions index
            </Link>
          </div>
        </div>
      </section>

      <MarketingRelatedPages
        links={[
          { href: "/solutions", title: "All solutions", Icon: LayoutTemplate },
          { href: "/solutions/project-managers", title: "Project managers", Icon: Plug },
          { href: "/pricing", title: "Plans and pricing", Icon: BarChart3 },
        ]}
      />
    </MarketingPageLayout>
  );
}

