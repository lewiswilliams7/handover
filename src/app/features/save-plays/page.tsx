import type { Metadata } from "next";
import Link from "next/link";
import { PoundSterling, Rewind, Tag } from "lucide-react";

import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { MarketingRelatedPages } from "@/components/marketing-related-pages";
import { getSavePlay } from "@/lib/save-plays";

const PAGE_URL = "https://gethandover.uk/features/save-plays";

export const metadata: Metadata = {
  title: "Save Plays™ | What To Do When a Client Starts Slipping | Handover",
  description:
    "Every Handover flag comes with a Save Play: the steps to take and a ready-to-send email to the client's decision-maker. Mark it done and Handover tracks whether the client recovered.",
  alternates: { canonical: PAGE_URL },
};

const EXAMPLE_TYPES = ["response_drift", "contact_gap", "contract_expiring", "contact_concentration"] as const;

export default function SavePlaysFeaturePage() {
  const example = getSavePlay("response_drift");
  const others = EXAMPLE_TYPES.slice(1)
    .map((type) => getSavePlay(type))
    .filter((play): play is NonNullable<typeof play> => play != null);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Handover Save Plays",
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#38bdf8]">Save Plays™</p>
          <h1 className="mt-3 text-3xl font-semibold text-white md:text-5xl">
            A flag is only useful if someone acts on it.
          </h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-white/70">
            Every Handover flag comes with a Save Play: the steps to take, written by people who have
            run MSP accounts, and an email to the client&apos;s decision-maker ready to send. Mark it
            done and Handover checks whether the client recovered.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/onboarding/connect"
              className="inline-flex rounded-[var(--radius)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
            >
              Run your free scan
            </Link>
            <Link
              href="/demo"
              className="inline-flex rounded-[var(--radius)] border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.06]"
            >
              Book a walkthrough
            </Link>
          </div>
        </div>
      </section>

      {example ? (
        <section className="px-6 pb-4 md:px-8" aria-labelledby="example-heading">
          <div className="mx-auto max-w-[1000px]">
            <h2 id="example-heading" className="text-2xl font-semibold text-[var(--text-primary)]">
              What a Save Play looks like
            </h2>
            <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[var(--text-secondary)]">
              The play for a client whose first response times have slipped, as it appears on the flag.
            </p>
            <div className="mt-6 rounded-[calc(var(--radius-lg)+4px)] bg-[#0b1629] p-6 text-white shadow-2xl shadow-black/30 sm:p-8">
              <p className="text-sm font-semibold text-cyan-200">Save Play</p>
              <p className="mt-1 text-xl font-semibold">{example.title}</p>
              <p className="mt-1 text-sm text-white/60">{example.why}</p>
              <ol className="mt-5 space-y-2">
                {example.steps.map((step, index) => (
                  <li key={step} className="flex gap-3 text-sm leading-6">
                    <span
                      className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-cyan-300/40 text-[11px] font-semibold text-cyan-200"
                      aria-hidden
                    >
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-6 rounded-lg border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-semibold text-white/55">Email to the client&apos;s decision-maker</p>
                <p className="mt-2 text-sm font-semibold">
                  {example.email.subject.replaceAll("{client}", "Westfield Manufacturing")}
                </p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-white/75">
                  {example.email.body.replaceAll("{client}", "Westfield Manufacturing")}
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="px-6 py-12 md:px-8">
        <div className="mx-auto max-w-[900px] space-y-4 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">One play for every kind of signal</h2>
          <p>
            Slower responses, a growing backlog, a client gone quiet, a renewal coming up, one contact
            raising everything: each signal has its own play. A few more examples:
          </p>
          <ul className="space-y-3">
            {others.map((play) => (
              <li key={play.title} className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4">
                <p className="font-semibold text-[var(--text-primary)]">{play.title}</p>
                <p className="mt-1 text-[15px] leading-7">{play.why}</p>
              </li>
            ))}
          </ul>

          <h2 className="pt-6 text-2xl font-semibold text-[var(--text-primary)]">Built for the person who renews</h2>
          <p>
            The email goes to the client&apos;s decision-maker, under your company name, and replies come
            straight back to you. It never mentions Handover, the scan or your internal numbers. You can
            edit every word before it goes, copy it into your own email app instead, or skip the email
            and just follow the steps.
          </p>

          <h2 className="pt-6 text-2xl font-semibold text-[var(--text-primary)]">Then it counts the result</h2>
          <p>
            Marking a play done records who acted and when. If a later scan shows the signal has cleared
            and the client is still with you, their annual value is added to your{" "}
            <Link href="/features/revenue-at-risk#saved-revenue" className="text-[var(--accent)] hover:underline">
              Saved Revenue
            </Link>
            . That is the number to bring to your next board meeting.
          </p>
        </div>
      </section>

      <MarketingRelatedPages
        links={[
          { href: "/features/revenue-at-risk", title: "Revenue at Risk™", Icon: PoundSterling },
          { href: "/features/churn-replay", title: "Churn Replay™", Icon: Rewind },
          { href: "/pricing", title: "Pricing", Icon: Tag },
        ]}
      />
    </MarketingPageLayout>
  );
}
