import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

import { CardMouseSpotlight } from "@/components/card-mouse-spotlight";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { ScrollRevealItem } from "@/components/scroll-reveal-item";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Product Roadmap | Handover",
  description:
    "See what's coming to Handover - new PSA integrations, report types, and delivery features.",
  alternates: {
    canonical: "https://gethandover.uk/roadmap",
  },
};

const cannyUrl = "https://handover.canny.io";

type RoadmapItem = {
  title: string;
  desc: string;
  badge: "Integration" | "Core" | "Pro" | "Export";
};

const shipped: RoadmapItem[] = [
  { title: "HaloPSA integration", desc: "Connect and import tickets in one click.", badge: "Integration" },
  { title: "Excel export pack", desc: "Full report workbook export for Pro.", badge: "Export" },
  { title: "Custom writing style", desc: "Match your preferred email/report style.", badge: "Pro" },
  { title: "Email client integration", desc: "Open ready-to-send outputs quickly.", badge: "Core" },
  { title: "Configurable export columns", desc: "Choose what appears in CSV/Excel exports.", badge: "Export" },
  {
    title: "Scheduled weekly reports",
    desc: "Set your schedule and clients; reports generate, email, and push to HaloPSA automatically.",
    badge: "Core",
  },
  {
    title: "Push outputs back to HaloPSA",
    desc: "Post generated handover content to tickets and projects as notes - no copy-paste.",
    badge: "Pro",
  },
];

const inProgress: RoadmapItem[] = [
  { title: "ConnectWise integration", desc: "Native import from ConnectWise Manage.", badge: "Integration" },
  { title: "Growth plans", desc: "Shared workspaces and admin controls.", badge: "Pro" },
  { title: "NPS and feedback system", desc: "Lightweight in-app feedback loop.", badge: "Core" },
];

const comingSoon: RoadmapItem[] = [
  { title: "Autotask integration", desc: "Native import from Autotask PSA.", badge: "Integration" },
  { title: "Client portal", desc: "Share updates securely with clients.", badge: "Pro" },
  { title: "Mobile app", desc: "Quick capture and generation on the go.", badge: "Core" },
  { title: "QBR generator", desc: "Quarterly business review packs in minutes.", badge: "Pro" },
];

function Badge({ label }: { label: RoadmapItem["badge"] }) {
  return (
    <span
      className="rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
      style={{
        background: "rgba(56,189,248,0.08)",
        color: "var(--accent)",
        borderColor: "rgba(56,189,248,0.2)",
      }}
    >
      {label}
    </span>
  );
}

type RoadmapColumnVariant = "shipped" | "progress" | "soon";

function RoadmapCard({ item, variant }: { item: RoadmapItem; variant: RoadmapColumnVariant }) {
  return (
    <CardMouseSpotlight
      className={cn(
        "relative flex flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-primary)_92%,transparent)] p-5 backdrop-blur-md transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-[rgba(56,189,248,0.35)] hover:shadow-[0_4px_20px_rgba(56,189,248,0.08)]",
        variant === "shipped" && "roadmap-item-card--shipped",
        variant === "progress" && "roadmap-item-card--progress",
        variant === "soon" && "roadmap-item-card--soon",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-[15px] font-semibold leading-snug text-[var(--text-primary)]">{item.title}</p>
        <Badge label={item.badge} />
      </div>
      <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">{item.desc}</p>
    </CardMouseSpotlight>
  );
}

function Section({
  title,
  dotColor,
  items,
  sectionIndex,
  variant,
  legend,
}: {
  title: string;
  dotColor: string;
  items: RoadmapItem[];
  sectionIndex: number;
  variant: RoadmapColumnVariant;
  legend?: ReactNode;
}) {
  const dotPulse = variant === "progress";
  return (
    <ScrollRevealItem index={sectionIndex} className="block">
      <div className="roadmap-column-shell flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span
            className={cn("size-2.5 shrink-0 rounded-full", dotPulse && "roadmap-section-dot--pulse")}
            style={{ backgroundColor: dotColor }}
            aria-hidden
          />
          <h2 className="text-[17px] font-semibold text-[var(--text-primary)]">{title}</h2>
        </div>
        {legend ? (
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)]/80 px-3 py-2.5 text-[11px] leading-relaxed text-[var(--text-secondary)]">
            {legend}
          </div>
        ) : null}
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          }}
        >
          {items.map((it, i) => (
            <ScrollRevealItem key={it.title} index={i} className="block min-w-0">
              <RoadmapCard item={it} variant={variant} />
            </ScrollRevealItem>
          ))}
        </div>
      </div>
    </ScrollRevealItem>
  );
}

export default function RoadmapPage() {
  return (
    <div
      className="animate-in fade-in duration-300"
      style={{
        background:
          "linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 60%, var(--bg-primary) 100%)",
        minHeight: "100vh",
      }}
    >
      <section className="relative overflow-hidden bg-[var(--bg-primary)] px-6 py-12 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto w-full max-w-[1100px]">
          <div
            className="relative z-[1] animate-in fade-in slide-in-from-bottom-4 duration-300 rounded-[var(--radius-lg)] px-8 py-10"
            style={{
              background:
                "linear-gradient(135deg, rgba(15,23,42,0.97) 0%, rgba(15,23,42,0.95) 100%)",
              padding: "2.5rem 2rem",
            }}
          >
            <p
              className="text-[11px] font-semibold uppercase text-[var(--accent)]"
              style={{ letterSpacing: "0.1em" }}
            >
              Roadmap
            </p>
            <h1 className="mt-2 text-[28px] font-bold text-white md:text-[32px]">What we are building</h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-white/60">
              See what is coming next and what we have recently shipped. Have a feature request? Let us know.
            </p>
            <Link
              href={cannyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-[15px] font-medium text-[var(--accent)] underline-offset-4 hover:underline"
            >
              Vote on features →
            </Link>
          </div>
        </div>
      </section>

      <section
        className="relative z-[1] bg-[var(--bg-secondary)] px-6 py-12 md:px-8 md:py-20"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-12">
          <Section
            title="Recently shipped"
            dotColor="var(--success)"
            items={shipped}
            sectionIndex={0}
            variant="shipped"
            legend={
              <>
                <span className="font-semibold text-[var(--text-primary)]">Badge legend: </span>
                <span className="font-medium text-[var(--text-primary)]">Integration</span>
                {" = PSA/tool integration feature · "}
                <span className="font-medium text-[var(--text-primary)]">Export</span>
                {" = report or file export feature · "}
                <span className="font-medium text-[var(--text-primary)]">Pro</span>
                {" = Pro plan feature · "}
                <span className="font-medium text-[var(--text-primary)]">Core</span>
                {" = available on all plans."}
              </>
            }
          />
          <Section
            title="In progress"
            dotColor="var(--accent)"
            items={inProgress}
            sectionIndex={1}
            variant="progress"
          />
          <Section
            title="Coming soon"
            dotColor="var(--text-muted)"
            items={comingSoon}
            sectionIndex={2}
            variant="soon"
          />
        </div>
      </section>

      <section
        className="relative z-[1] bg-[var(--sidebar-bg)] px-6 py-12 text-center md:px-8 md:py-20"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="mx-auto w-full max-w-[1100px]">
        <ScrollRevealItem index={0} className="block">
        <div className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] px-6 py-8">
          <p className="text-[15px] text-[var(--text-secondary)]">Have an idea that would save you time?</p>
          <a href={cannyUrl} target="_blank" rel="noopener noreferrer">
            <Button className="rounded-[var(--radius)] bg-[var(--accent)] px-5 text-white hover:bg-[var(--accent-hover)]">
              Suggest a feature
            </Button>
          </a>
        </div>
        </ScrollRevealItem>
        </div>
      </section>
    </div>
  );
}
