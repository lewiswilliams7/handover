import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  ArrowLeftRight,
  Brain,
  CalendarClock,
  FileSpreadsheet,
  LayoutTemplate,
  Paintbrush,
  PiggyBank,
  ReceiptText,
  Scale,
  LifeBuoy,
  Plug,
  PoundSterling,
  Rewind,
} from "lucide-react";

import PageTransition from "@/components/PageTransition";
import { CardMouseSpotlight } from "@/components/card-mouse-spotlight";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { ScrollRevealItem } from "@/components/scroll-reveal-item";
import { TestimonialMarquee } from "@/components/testimonial-marquee";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Features - Handover | Protect MSP Recurring Revenue",
  description:
    "Revenue at Risk, Churn Replay, Client Intelligence and Saved Revenue, plus service reviews, QBR packs and a client portal. Everything connects to HaloPSA or ConnectWise. Run the free PSA scan before you buy.",
  alternates: {
    canonical: "https://gethandover.uk/features",
  },
};

type FeatureCard = {
  title: string;
  body: string;
  href: string;
  Icon: LucideIcon;
};

const PROTECT: FeatureCard[] = [
  {
    title: "Revenue at Risk™",
    body: "Every client whose service or relationship has changed against its own history, ranked by the annual revenue it holds.",
    href: "/features/revenue-at-risk",
    Icon: PoundSterling,
  },
  {
    title: "Churn Replay™",
    body: "Rewinds your PSA to before each client you lost and shows whether Handover would have warned you, and how early.",
    href: "/features/churn-replay",
    Icon: Rewind,
  },
  {
    title: "Save Plays™",
    body: "Every flag comes with the steps to take and an email to the client's decision-maker, ready to send.",
    href: "/features/save-plays",
    Icon: LifeBuoy,
  },
  {
    title: "Handover Client Intelligence™",
    body: "The evidence behind every flag: what moved, by how much, against that client's own baseline, with links to the tickets.",
    href: "/features/client-intelligence",
    Icon: Brain,
  },
  {
    title: "Saved Revenue",
    body: "When a flagged client recovers after you act, its annual value is counted. The return on Handover, in your own numbers.",
    href: "/features/revenue-at-risk#saved-revenue",
    Icon: PiggyBank,
  },
  {
    title: "Client Margin",
    body: "Revenue per hour for every client, so you know who to save, who to fix and who to reprice at renewal.",
    href: "/features/client-margin",
    Icon: Scale,
  },
];

const PROVE: FeatureCard[] = [
  {
    title: "Value Receipts™",
    body: "A one-page monthly summary for each client's decision-maker: what you resolved, how quickly, what's in progress.",
    href: "/features/value-receipts",
    Icon: ReceiptText,
  },
  {
    title: "Service reviews and QBR packs",
    body: "Branded packs built from live PSA data, exported to PowerPoint, PDF or Excel, ready for the person who signs the renewal.",
    href: "/features/qbr-generator",
    Icon: LayoutTemplate,
  },
  {
    title: "Scheduled reports",
    body: "Set a client, a day and a time. Reports run on schedule, with an optional approval step before anything is sent.",
    href: "/features/scheduled-reports",
    Icon: CalendarClock,
  },
  {
    title: "White-labelled client portal",
    body: "Each client gets their own branded view of service levels, tickets and reports, under your name.",
    href: "/features/white-label",
    Icon: Paintbrush,
  },
  {
    title: "Exports",
    body: "PowerPoint decks, PDFs and multi-sheet Excel workbooks in your branding, from the same run.",
    href: "/features/exports",
    Icon: FileSpreadsheet,
  },
];

const CONNECT: FeatureCard[] = [
  {
    title: "HaloPSA and ConnectWise Manage",
    body: "Native, read-only API connections. Listed on both marketplaces.",
    href: "/features/psa-integration",
    Icon: Plug,
  },
  {
    title: "Notes pushed back to the PSA",
    body: "Post updates to tickets as notes, so the PSA record stays current without switching tabs.",
    href: "/features/psa-push",
    Icon: ArrowLeftRight,
  },
];

function FeatureGrid({ cards, columns }: { cards: FeatureCard[]; columns: 2 | 3 | 4 }) {
  return (
    <div
      className={`mt-8 grid gap-5 sm:grid-cols-2 ${columns === 4 ? "lg:grid-cols-4" : columns === 3 ? "lg:grid-cols-3" : ""}`}
    >
      {cards.map((card, index) => (
        <ScrollRevealItem key={card.href} index={index} className="min-w-0">
          <Link
            href={card.href}
            className="group block h-full rounded-[var(--radius-lg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0EA5E9]"
          >
            <CardMouseSpotlight className="feature-page-card flex h-full flex-col rounded-[var(--radius-lg)] border border-white/[0.07] bg-white/[0.03] p-6 shadow-sm backdrop-blur-md transition-colors group-hover:border-[rgba(56,189,248,0.35)]">
              <card.Icon className="size-[22px] shrink-0 text-[#0EA5E9]" aria-hidden />
              <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{card.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                {card.body}
              </p>
              <span className="mt-4 text-sm font-semibold text-[var(--accent)] underline-offset-4 group-hover:underline">
                Learn how it works
              </span>
            </CardMouseSpotlight>
          </Link>
        </ScrollRevealItem>
      ))}
    </div>
  );
}

function Section({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="relative z-[1] bg-transparent px-6 py-12 md:px-8 md:py-16"
      style={{ borderTop: "1px solid var(--border)" }}
      aria-labelledby={id}
    >
      <div className="mx-auto w-full max-w-[1100px]">
        <h2 id={id} className="text-3xl font-semibold text-[var(--text-primary)]">
          {title}
        </h2>
        <p className="mt-3 max-w-2xl text-[var(--text-secondary)]">{intro}</p>
        {children}
      </div>
    </section>
  );
}

export default function FeaturesPage() {
  return (
    <PageTransition>
      <div
        className="animate-in fade-in duration-300"
        style={{
          background:
            "linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 60%, var(--bg-primary) 100%)",
          minHeight: "100vh",
        }}
      >
        <section className="relative overflow-hidden bg-transparent px-6 py-12 md:px-8 md:py-20">
          <MarketingHeroAmbient />
          <div className="relative z-[1] mx-auto max-w-[1100px]">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-bold leading-tight text-[var(--text-primary)] md:text-[52px]">
                Keep the clients you already have.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--text-secondary)]">
                Handover connects to HaloPSA or ConnectWise and works in one loop: spot the clients
                that are drifting, see what they are worth, show your value to the people who renew,
                and count the revenue you keep.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/onboarding/connect">
                  <Button
                    size="lg"
                    className="rounded-[var(--radius)] bg-[var(--accent)] px-8 text-white hover:bg-[var(--accent-hover)]"
                  >
                    Run your free scan
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-[var(--radius)] border-[var(--border)] px-8"
                  >
                    See pricing
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <Section
          id="protect-heading"
          title="Protect revenue"
          intro="Find the clients that are slipping while there is still time, and prove the warnings are real on your own history."
        >
          <FeatureGrid cards={PROTECT} columns={3} />
        </Section>

        <Section
          id="prove-heading"
          title="Prove your value"
          intro="Put the work your team does in front of the people who decide whether to renew."
        >
          <FeatureGrid cards={PROVE} columns={4} />
        </Section>

        <Section
          id="connect-heading"
          title="Connect your PSA"
          intro="Everything runs on the data you already keep. Nothing to install, nothing to re-key."
        >
          <FeatureGrid cards={CONNECT} columns={2} />
          <p className="mt-6 text-sm text-[var(--text-secondary)]">
            See every connection on the{" "}
            <Link href="/integrations" className="font-semibold text-[var(--accent)] underline-offset-4 hover:underline">
              integrations page
            </Link>
            .
          </p>
        </Section>

        <section
          className="relative z-[1] bg-transparent py-12 md:py-16"
          style={{ borderTop: "1px solid var(--border)" }}
          aria-label="Testimonials"
        >
          <TestimonialMarquee />
        </section>

        <section
          className="relative z-[1] bg-[var(--sidebar-bg)] px-6 py-12 text-center md:px-8 md:py-20"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <div className="mx-auto max-w-2xl">
            <h2 className="text-[36px] font-bold text-white">Start with the clients you lost.</h2>
            <p className="mt-4 text-[var(--sidebar-text)]">
              The free scan shows your Revenue at Risk and replays the last 12 months of lost clients
              on your own PSA data. Read-only, no card.
            </p>
            <Link href="/onboarding/connect" className="mt-8 inline-block">
              <Button
                size="lg"
                className="rounded-[var(--radius)] bg-[var(--accent)] px-8 text-white hover:bg-[var(--accent-hover)]"
              >
                Run your free scan
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </PageTransition>
  );
}
