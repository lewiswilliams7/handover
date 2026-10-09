import type { Metadata } from "next";
import Link from "next/link";
import { Brain, PoundSterling, Tag } from "lucide-react";

import { ChurnReplayPanel } from "@/components/churn-replay-panel";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { MarketingRelatedPages } from "@/components/marketing-related-pages";
import { CHURN_REPLAY_EXAMPLE } from "@/lib/marketing/churn-replay-example";

const PAGE_URL = "https://gethandover.uk/features/churn-replay";

export const metadata: Metadata = {
  title: "Churn Replay™ | Would You Have Seen It Coming? | Handover",
  description:
    "Churn Replay rewinds your HaloPSA or ConnectWise history to the months before each client left and shows which losses were visible in your own data, and how early.",
  alternates: { canonical: PAGE_URL },
};

const STEPS = [
  {
    title: "Find the clients you lost",
    body: "Handover reads 12 months of your PSA. A client counts as lost when every contract or recurring invoice ended and they stopped raising tickets. Where there is no commercial record, a busy client that went quiet for 90 days counts instead.",
  },
  {
    title: "Rewind to before they left",
    body: "For each lost client, the clock goes back to 150, 120, 90, 60 and 30 days before the loss. Only what your PSA held on that day is visible. A ticket closed later counts as open, a reply sent later counts as unanswered.",
  },
  {
    title: "Run the same checks Handover runs today",
    body: "Response times, resolution times, backlog, ageing tickets, ticket volume and contact patterns are compared against that client's own history, exactly as the live scan does it.",
  },
  {
    title: "Show the earliest warning and what it was worth",
    body: "You see which losses were visible, how many days of warning there were, what changed, and the annual value that walked out of the door.",
  },
] as const;

export default function ChurnReplayFeaturePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Handover Churn Replay",
    applicationCategory: "BusinessApplication",
    description: metadata.description,
    url: PAGE_URL,
  };

  return (
    <MarketingPageLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="marketing-page-hero relative overflow-hidden bg-transparent px-6 py-12 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto max-w-[1000px] rounded-[var(--radius-lg)] border border-[rgba(56,189,248,0.25)] bg-[rgba(15,23,42,0.68)] p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#38bdf8]">
            Churn Replay™
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white md:text-5xl">
            Would you have seen it coming?
          </h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-white/70">
            Churn Replay rewinds your PSA to the months before each client left and re-runs
            Handover&apos;s checks on what you knew at the time. It shows which losses were visible in
            your own data, how early, and what they were worth.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/onboarding/connect"
              className="inline-flex rounded-[var(--radius)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
            >
              Replay your lost clients free
            </Link>
            <Link
              href="/demo"
              className="inline-flex rounded-[var(--radius)] border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.06]"
            >
              Book a walkthrough
            </Link>
          </div>
          <p className="mt-4 text-sm text-white/50">
            Runs as part of the free PSA scan. Read-only, no card, results in about a minute.
          </p>
        </div>
      </section>

      <section className="px-6 pb-4 md:px-8" aria-labelledby="example-heading">
        <div className="mx-auto max-w-[1000px]">
          <h2 id="example-heading" className="text-2xl font-semibold text-[var(--text-primary)]">
            What a replay looks like
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[var(--text-secondary)]">
            An example with invented clients. Each line runs up to the day the client left; the lit
            part is how long the warning was visible in the PSA.
          </p>
          <div className="mt-6 rounded-[calc(var(--radius-lg)+4px)] bg-[#0b1629] p-2 shadow-2xl shadow-black/30 sm:p-3">
            <ChurnReplayPanel replay={CHURN_REPLAY_EXAMPLE} className="border-white/[0.08]" />
          </div>
        </div>
      </section>

      <section className="px-6 py-12 md:px-8" aria-labelledby="how-heading">
        <div className="mx-auto max-w-[900px]">
          <h2 id="how-heading" className="text-2xl font-semibold text-[var(--text-primary)]">
            How it works
          </h2>
          <ol className="mt-6 space-y-6">
            {STEPS.map((step, index) => (
              <li key={step.title} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-4">
                <span
                  className="flex size-8 items-center justify-center rounded-full border border-[#38bdf8]/40 text-sm font-semibold text-[#38bdf8]"
                  aria-hidden
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">{step.title}</h3>
                  <p className="mt-1 text-[15px] leading-7 text-[var(--text-secondary)]">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-6 pb-12 md:px-8" aria-labelledby="honest-heading">
        <div className="mx-auto max-w-[900px] space-y-4 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
          <h2 id="honest-heading" className="text-2xl font-semibold text-[var(--text-primary)]">
            Built so the result can be trusted
          </h2>
          <p>
            A backtest that flags everything is worthless, so the replay is deliberately strict.
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong className="text-[var(--text-primary)]">Each client is judged on its own history.</strong>{" "}
              Other clients&apos; data never decides whether one client was at risk.
            </li>
            <li>
              <strong className="text-[var(--text-primary)]">Renewal dates never count.</strong> A contract
              ending is how a loss is found, so &ldquo;contract ends soon&rdquo; would be a circular catch.
            </li>
            <li>
              <strong className="text-[var(--text-primary)]">Account structure never counts.</strong> One
              contact raising everything, or no named owner, is true for plenty of clients who stay.
            </li>
            <li>
              <strong className="text-[var(--text-primary)]">Clients who stayed are replayed too.</strong>{" "}
              You see how often a flag turned out to be a false alarm, next to how often it caught a
              real loss.
            </li>
          </ul>
          <p>
            Where the data could not have warned you, the replay says so. Those clients are the most
            useful result of all: they show where your PSA is blind.
          </p>
        </div>
      </section>

      <section className="px-6 pb-14 md:px-8" aria-labelledby="needs-heading">
        <div className="mx-auto max-w-[900px] rounded-[var(--radius-lg)] border border-[var(--border)] border-l-[3px] border-l-[#0EA5E9] p-6">
          <h2 id="needs-heading" className="text-lg font-semibold text-[var(--text-primary)]">
            What it needs from your PSA
          </h2>
          <div className="mt-3 space-y-2 text-[15px] leading-7 text-[var(--text-secondary)]">
            <p>
              Read access to tickets is enough to replay clients whose activity stopped. Read access to
              contracts and recurring invoices lets the replay find clients that left on paper and put
              a value on each one.
            </p>
            <p>
              On{" "}
              <Link href="/integrations/halopsa" className="text-[var(--accent)] hover:underline">
                HaloPSA
              </Link>{" "}
              that is the ClientContract and RecurringInvoice permissions. On{" "}
              <Link href="/integrations/connectwise" className="text-[var(--accent)] hover:underline">
                ConnectWise Manage
              </Link>{" "}
              it is Finance, Agreements, read only. Handover never writes to your PSA during a scan.
            </p>
          </div>
        </div>
      </section>

      <MarketingRelatedPages
        links={[
          { href: "/features/revenue-at-risk", title: "Revenue at Risk™", Icon: PoundSterling },
          { href: "/features/client-intelligence", title: "Handover Client Intelligence™", Icon: Brain },
          { href: "/pricing", title: "Pricing", Icon: Tag },
        ]}
      />
    </MarketingPageLayout>
  );
}
