import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, LifeBuoy, PoundSterling } from "lucide-react";

import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { MarketingRelatedPages } from "@/components/marketing-related-pages";
import { ProductHero } from "@/components/marketing/product-hero";
import { AppFrame, BriefMock } from "@/components/marketing/product-mocks";

const PAGE_URL = "https://gethandover.uk/features/monday-brief";

export const metadata: Metadata = {
  title: "The Monday Brief | Your MSP's Week, Every Monday Morning | Handover",
  description:
    "Every Monday, after the weekly scan, Handover emails the owner what is at risk, what changed, what renews soon and the three moves to make this week. Plus an instant alert when a top-ten client changes.",
  alternates: { canonical: PAGE_URL },
};

const MOVES = [
  {
    title: "What is at risk, and which way it moved",
    body: "Revenue at Risk in pounds, up or down since last week, and how many clients are behind it.",
  },
  {
    title: "Your three moves for the week",
    body: "The most valuable clients that changed, and renewals inside 30 days, each with the Save Play to run.",
  },
  {
    title: "What changed and what cleared",
    body: "New warning signs, and the ones that went away after someone acted. Saved Revenue keeps the score.",
  },
  {
    title: "Instant alerts for your biggest clients",
    body: "If one of your ten most valuable clients raises a new warning sign, you hear the same day, not next Monday.",
  },
] as const;

export default function MondayBriefFeaturePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Handover Monday Brief",
    applicationCategory: "BusinessApplication",
    description: metadata.description,
    url: PAGE_URL,
  };

  return (
    <MarketingPageLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ProductHero
        eyebrow="The Monday Brief"
        title="Your client base, in one email, every Monday morning."
        body="You should not have to remember to log in to find out a client is slipping. Every Monday, after the weekly scan, the Monday Brief tells you what is at risk, what changed and exactly what to do this week. Two minutes with your coffee."
        primary={{ href: "/onboarding/connect", label: "Run your free scan" }}
        visual={<AppFrame path="" label="The Monday Brief email"><BriefMock /></AppFrame>}
      />

      <section className="px-6 pb-4 md:px-8" aria-labelledby="moves-heading">
        <div className="mx-auto max-w-[1000px]">
          <h2 id="moves-heading" className="text-2xl font-semibold text-[var(--text-primary)]">
            What is in it
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[var(--text-secondary)]">
            The same numbers as the This week screen in Handover, so the email and the app never disagree.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {MOVES.map((move) => (
              <div key={move.title} className="rounded-2xl border border-[var(--border)] p-5">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{move.title}</h3>
                <p className="mt-2 text-[15px] leading-7 text-[var(--text-secondary)]">{move.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-12 md:px-8">
        <div className="mx-auto max-w-[900px] space-y-4 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Built on the weekly scan</h2>
          <p>
            Handover re-reads your HaloPSA or ConnectWise data every week, so the brief always reflects
            the latest picture. Each move links straight to its{" "}
            <Link href="/features/save-plays" className="text-[var(--accent)] hover:underline">
              Save Play
            </Link>
            , and renewals link to{" "}
            <Link href="/features/renewal-radar" className="text-[var(--accent)] hover:underline">
              Renewal Radar
            </Link>
            .
          </p>
          <p>
            It also tells you the one data fix that would make your numbers sharper, such as recording
            time on closed tickets, so Handover gets more useful every week you use it. One click turns
            the brief off.
          </p>
        </div>
      </section>

      <MarketingRelatedPages
        links={[
          { href: "/features/revenue-at-risk", title: "Revenue at Risk™", Icon: PoundSterling },
          { href: "/features/save-plays", title: "Save Plays™", Icon: LifeBuoy },
          { href: "/features/renewal-radar", title: "Renewal Radar", Icon: CalendarClock },
        ]}
      />
    </MarketingPageLayout>
  );
}
