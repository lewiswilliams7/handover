import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { Nav as MarketingNav } from "@/components/nav";
import { ScrollRevealItem } from "@/components/scroll-reveal-item";

export const metadata: Metadata = {
  title: "Automated QBR Pack Generator for MSPs | Handover",
  description:
    "Generate complete branded QBR packs from your HaloPSA or ConnectWise data in under a minute. Executive summary, charts, SLA performance, project status, and recommendations. Ready to present.",
  alternates: {
    canonical: "https://gethandover.uk/solutions/qbr",
  },
};

export default function QbrSolutionPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Automated QBR Pack Generator for MSPs | Handover",
    description: metadata.description,
    url: "https://gethandover.uk/solutions/qbr",
  };

  return (
    <>
      <MarketingNav />
      <div className="marketing-aurora min-h-screen">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

        <section className="marketing-page-hero relative overflow-hidden bg-transparent px-6 py-12 md:px-8 md:py-20">
          <MarketingHeroAmbient />
          <div className="relative z-[1] mx-auto w-full max-w-[1000px]">
            <ScrollRevealItem index={0} disableAnimation className="block">
              <div className="rounded-[var(--radius-lg)] border border-[rgba(56,189,248,0.28)] bg-[rgba(15,23,42,0.68)] px-6 py-8 shadow-[0_20px_60px_-22px_rgba(56,189,248,0.35)] md:px-10 md:py-10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#38bdf8]">
                  Solutions · Use Case
                </p>
                <h1 className="mt-2 text-3xl font-semibold leading-tight text-white md:text-5xl">
                  A Complete QBR Pack. Generated From Your PSA. In Under a Minute.
                </h1>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/onboarding/connect"
                    className="inline-flex items-center rounded-[var(--radius)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
                  >
                    Run the free PSA scan
                  </Link>
                  <Link
                    href="/demo/Example_QBR_Q2-2026.pptx"
                    download
                    className="inline-flex items-center rounded-[var(--radius)] border border-white/20 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.08]"
                  >
                    Download example QBR pack (.pptx)
                  </Link>
                </div>
              </div>
            </ScrollRevealItem>
          </div>
        </section>

        <section className="px-6 py-10 md:px-8 md:py-14">
          <div className="mx-auto w-full max-w-[900px] space-y-12 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
            <ScrollRevealItem index={0} className="block space-y-4">
              <p>
                The Quarterly Business Review is the most important client meeting in the MSP calendar. It is where you
                justify the relationship, demonstrate value, and set the agenda for the next three months.
              </p>
              <p>It is also the one that costs your team the most time to prepare.</p>
              <p>
                Two to four hours per client. Senior time. Reformatting the same data that already exists in your PSA
                into a presentation that looks different every quarter and varies in quality depending on who prepared
                it and how much time they had.
              </p>
              <p>Handover ends that cycle.</p>
            </ScrollRevealItem>

            <ScrollRevealItem index={1} className="block">
              <h2 className="text-2xl font-semibold text-[var(--text-primary)]">What a Handover QBR Pack Contains</h2>
              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>
                  <strong className="text-[var(--text-primary)]">Executive Summary</strong>
                  <br />
                  AI-generated in plain business English. Summarises the quarter, calls out key achievements,
                  acknowledges challenges honestly, and frames the conversation ahead. Written for a board-level
                  audience, not a service desk audience.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Ticket Volume and Trend Analysis</strong>
                  <br />
                  Visual bar charts showing ticket volume week by week across the quarter. Your client sees the
                  pattern. They understand the workload. They appreciate the transparency.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">SLA Performance</strong>
                  <br />
                  Visual SLA compliance data presented as a percentage, as a trend over time, and in context alongside
                  ticket volume. Clear, honest, and professional.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Project Status Overview</strong>
                  <br />
                  Every active project with a visual progress bar, RAG status indicator, and plain-English summary of
                  where things stand. Clients understand project health at a glance without needing to understand what
                  any of the underlying data means.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Risk Register</strong>
                  <br />
                  AI-identified risks from your live ticket and project data, formatted for a business audience. Not a
                  list of technical issues. A clear picture of what needs attention, why it matters, and what is being
                  done about it.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Recommendations and Next Steps</strong>
                  <br />
                  Forward-looking and specific. What should happen in the next quarter, what decisions need to be made,
                  and what your MSP recommends. Makes you look proactive, strategic, and genuinely invested in the
                  client&apos;s outcomes.
                </li>
              </ul>
            </ScrollRevealItem>

            <ScrollRevealItem index={2} className="block">
              <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
                Export Formats Built For How QBRs Actually Work
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>
                  <strong className="text-[var(--text-primary)]">PowerPoint</strong>
                  <br />A fully branded, presentation-ready deck. Each section becomes a slide. Your logo and brand
                  colours throughout. Open it, review it, present it. Nothing to reformat.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">PDF</strong>
                  <br />A polished, professional document ready to send by email before the meeting or leave with the
                  client afterwards.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Excel</strong>
                  <br />Full data workbook with charts and supporting data for clients who want to dig into the numbers.
                </li>
              </ul>
              <div className="mt-8 grid gap-6 rounded-[var(--radius-lg)] border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-sm md:grid-cols-2 md:items-center">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">See a real example pack</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Download our sample Q2 2026 QBR deck - the same branded PowerPoint export Handover generates from
                    live PSA data.
                  </p>
                  <Link
                    href="/demo/Example_QBR_Q2-2026.pptx"
                    download
                    className="mt-4 inline-flex items-center rounded-[var(--radius)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
                  >
                    Download example QBR pack (.pptx)
                  </Link>
                </div>
                <Image
                  src="/qbrpowerpoint.png"
                  alt="Example QBR PowerPoint export from Handover"
                  width={960}
                  height={600}
                  className="w-full rounded-lg border border-white/10 shadow-lg"
                />
              </div>
            </ScrollRevealItem>

            <ScrollRevealItem index={3} className="block">
              <h2 className="text-2xl font-semibold text-[var(--text-primary)]">The QBR Preparation Problem at Scale</h2>
              <p className="mt-3">
                One QBR per quarter per client sounds manageable until you have fifteen clients. At that point you are
                looking at somewhere between 30 and 60 hours of senior time every quarter spent on preparation alone.
                That is a week and a half of someone&apos;s time, every quarter, producing documents.
              </p>
              <p className="mt-3">
                With Handover, the same fifteen QBR packs take under fifteen minutes to generate. The time savings
                compound every quarter. The quality is consistent across every client. And your team spends that
                recovered time on work that actually moves the business forward.
              </p>
            </ScrollRevealItem>

            <ScrollRevealItem index={4} className="block">
              <section className="rounded-[var(--radius-lg)] border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-sm">
                <h2 className="text-2xl font-semibold text-[var(--text-primary)]">QBR packs with Handover</h2>
                <p className="mt-4 text-[var(--text-secondary)]">
                  QBR packs are included in the Handover workspace at £499/month or £4,990 annually.
                </p>
                <p className="mt-4 text-sm text-[var(--text-secondary)]">
                  <Link href="/pricing" className="text-[var(--accent)] hover:underline">
                    See full pricing
                  </Link>
                </p>
              </section>
            </ScrollRevealItem>

            <ScrollRevealItem index={5} className="block">
              <section className="rounded-[var(--radius-lg)] border border-white/[0.08] border-l-[3px] border-l-[#0EA5E9] bg-white/[0.04] p-6 backdrop-blur-sm">
                <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
                  See what your PSA can tell you before you buy.
                </h2>
                <p className="mt-3">
                  Connect HaloPSA or ConnectWise Manage, select your client, choose your date range, and generate your
                  first QBR pack today.
                </p>
                <Link
                  href="/onboarding/connect"
                  className="marketing-page-bottom-cta mt-5 inline-flex items-center rounded-[var(--radius)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
                >
                  Run the free PSA scan
                </Link>
              </section>
            </ScrollRevealItem>

            <ScrollRevealItem index={6} className="block">
              <section className="rounded-[var(--radius-lg)] border border-white/[0.08] border-l-[3px] border-l-[#0EA5E9] bg-white/[0.04] p-6 backdrop-blur-sm">
                <h3 className="text-xl font-semibold text-[var(--text-primary)]">Features that power this</h3>
                <p className="mt-2 text-sm">
                  <Link href="/features/qbr-generator" className="text-[var(--accent)] hover:underline">
                    QBR Pack Generator
                  </Link>
                  {" · "}
                  <Link href="/features/exports" className="text-[var(--accent)] hover:underline">
                    Exports
                  </Link>
                  {" · "}
                  <Link href="/solutions/account-managers" className="text-[var(--accent)] hover:underline">
                    Account managers
                  </Link>
                </p>
              </section>
            </ScrollRevealItem>
          </div>
        </section>
      </div>
      <MarketingFooter />
    </>
  );
}
