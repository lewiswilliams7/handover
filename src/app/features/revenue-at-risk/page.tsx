import type { Metadata } from "next";
import Link from "next/link";
import { Brain, Rewind, Tag } from "lucide-react";

import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { MarketingRelatedPages } from "@/components/marketing-related-pages";
import { ProductHero } from "@/components/marketing/product-hero";
import { AppFrame, RiskMock } from "@/components/marketing/product-mocks";

const PAGE_URL = "https://gethandover.uk/features/revenue-at-risk";

export const metadata: Metadata = {
  title: "Revenue at Risk™ for MSPs | Handover",
  description:
    "Revenue at Risk puts a pound value on every client whose service or relationship has changed, straight from your HaloPSA or ConnectWise data. One number for the week, and a list of who to call.",
  alternates: { canonical: PAGE_URL },
};

const COUNTED = [
  "First response or resolution times drifting from the client's usual pattern",
  "Open backlog growing, or tickets staying open far longer than usual",
  "Ticket volume rising sharply, or a busy client going quiet",
  "More tickets arriving out of hours than before",
  "A contract due to end in the next 90 days",
  "Nobody assigned to the account's tickets",
] as const;

export default function RevenueAtRiskFeaturePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Handover Revenue at Risk",
    applicationCategory: "BusinessApplication",
    description: metadata.description,
    url: PAGE_URL,
  };

  return (
    <MarketingPageLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ProductHero
        eyebrow="Revenue at Risk™"
        title="Every client that has changed, in pounds."
        body="Revenue at Risk is the annual recurring value of the clients whose service or relationship has changed against their own history. One number for the Monday meeting, and a ranked list of who to call first."
        primary={{ href: "/onboarding/connect", label: "See your Revenue at Risk free" }}
        visual={<AppFrame path="/attention" label="Revenue at Risk™ in Handover"><RiskMock /></AppFrame>}
      />


      <section className="px-6 py-12 md:px-8">
        <div className="mx-auto max-w-[900px] space-y-4 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">What counts as at risk</h2>
          <p>
            A client is counted when at least one of these has changed against its own baseline, and the
            flag has not yet been dealt with or marked as normal for that client:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            {COUNTED.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>
            Quotes, orders and usage are shown separately as opportunities, not risk. Gaps in your PSA
            data are reported as coverage, not counted against a client.
          </p>

          <h2 className="pt-6 text-2xl font-semibold text-[var(--text-primary)]">How the value is worked out</h2>
          <p>
            Handover reads each client&apos;s monthly recurring value from your PSA: recurring invoices or
            contract values in HaloPSA, agreement values in ConnectWise Manage. It multiplies by 12 and
            counts each client once, however many signals it has. Clients with no value in the PSA are
            still listed, and the total tells you how many it could not price.
          </p>

          <h2 id="saved-revenue" className="scroll-mt-24 pt-6 text-2xl font-semibold text-[var(--text-primary)]">
            Saved Revenue
          </h2>
          <p>
            Revenue at Risk shows where to act. Saved Revenue shows what acting was worth. When someone
            acts on a flag, a later scan shows the signal has cleared, and the client is still with you,
            that client&apos;s annual value is added to your Saved Revenue. Flags you mark as normal for
            the client are never counted.
          </p>
          <p>
            Pair it with{" "}
            <Link href="/features/churn-replay" className="text-[var(--accent)] hover:underline">
              Churn Replay™
            </Link>{" "}
            to see how many of the clients you have already lost would have shown up here first.
          </p>
        </div>
      </section>

      <MarketingRelatedPages
        links={[
          { href: "/features/churn-replay", title: "Churn Replay™", Icon: Rewind },
          { href: "/features/client-intelligence", title: "Handover Client Intelligence™", Icon: Brain },
          { href: "/pricing", title: "Pricing", Icon: Tag },
        ]}
      />
    </MarketingPageLayout>
  );
}
