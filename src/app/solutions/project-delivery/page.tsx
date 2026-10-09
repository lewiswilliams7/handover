import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, FolderKanban, Plug } from "lucide-react";

import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingRelatedPages } from "@/components/marketing-related-pages";
import { MarketingPageLayout } from "@/components/marketing-page-layout";

export const metadata: Metadata = {
  title: "MSP Project Delivery Reporting | Automated Project Updates From Your PSA | Handover",
  description:
    "Handover generates automated project delivery reports from HaloPSA and ConnectWise project data. Keep clients informed on every active project without writing a single update manually.",
  alternates: {
    canonical: "https://gethandover.uk/solutions/project-delivery",
  },
};

export default function ProjectDeliveryPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "MSP Project Delivery Reporting | Automated Project Updates From Your PSA | Handover",
    description: metadata.description,
    url: "https://gethandover.uk/solutions/project-delivery",
  };

  return (
    <MarketingPageLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="marketing-page-hero relative overflow-hidden bg-transparent px-6 py-12 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto w-full max-w-[1000px]">
          <div className="rounded-[var(--radius-lg)] border border-[rgba(56,189,248,0.28)] bg-[rgba(15,23,42,0.68)] px-6 py-8 shadow-[0_20px_60px_-22px_rgba(56,189,248,0.35)] md:px-10 md:py-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#38bdf8]">Solutions · Use Case</p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight text-white md:text-5xl">
              Your Projects Are Progressing. Your Clients Should Know That.
            </h1>
            <div className="mt-6">
              <Link
                href="/onboarding/connect"
                className="inline-flex items-center rounded-[var(--radius)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
              >
                Start delivering better project communication today
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-10 md:px-8 md:py-14">
        <div className="mx-auto w-full max-w-[900px] space-y-10 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
          <p>
            Project delivery is where MSPs earn their reputation. Not just by completing the work, but by keeping
            clients informed and confident throughout. A project delivered on time with poor communication leaves a
            client less satisfied than a project that runs slightly over with excellent communication.
          </p>
          <p>The communication is part of the delivery. And right now, most MSPs are doing it manually.</p>
          <p>
            Handover automates every client-facing project update so your project managers can focus entirely on
            delivery.
          </p>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">The Gap Between Delivery and Perception</h2>
            <p className="mt-3">
              Your project managers know exactly what is happening on every active project. They know which tasks are
              complete, which are in progress, which are blocked, and what the critical path looks like for the next
              two weeks.
            </p>
            <p className="mt-3">
              Your clients know almost none of this. They know the project started. They know it should finish by a
              certain date. In between, they are largely in the dark unless someone takes time out of delivery to
              write them an update.
            </p>
            <p className="mt-3">
              That gap creates anxiety. Clients who are not regularly updated assume the worst. They start questioning
              whether the project is on track. They raise concerns that require senior time to address. They lose
              confidence in the MSP even when the delivery itself is going well.
            </p>
            <p className="mt-3">Handover closes that gap automatically.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Automated Weekly Project Updates</h2>
            <p className="mt-3">
              Connect Handover to your PSA, select your active projects, and set a weekly schedule. Every week your
              client receives a professional project update covering completed tasks, current progress, upcoming
              milestones, open risks, and required actions.
            </p>
            <p className="mt-3">Written in plain English. Formatted professionally. Sent automatically.</p>
            <p className="mt-3">
              Your project manager does not write it. Your account manager does not chase for it. It goes out on
              schedule regardless of how busy the week was.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Every Project Metric Your Client Needs</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                <strong className="text-[var(--text-primary)]">Completion Percentage</strong>
                <br />
                Visual progress indicator showing how far through the project you are, based on completed versus total
                tasks in your PSA.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Milestone Summary</strong>
                <br />
                What was completed this week. What is coming up next. Clients see forward momentum without needing to
                understand the underlying task structure.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">RAG Status</strong>
                <br />
                Green, amber, or red project health indicator calculated from task completion rates, overdue items, and
                open risks. Clients understand immediately whether the project is on track.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Open Risks and Actions</strong>
                <br />
                AI-identified risks from current project data, and a clear list of any actions required from the client
                side. Nothing gets missed. Nothing gets buried in a ticket note.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Push Updates Back to Your PSA</h2>
            <p className="mt-3">
              When Handover generates a project report, it can automatically push a summary note back to the relevant
              project in HaloPSA or ConnectWise. Your PSA stays current without any additional manual entries from your
              team.
            </p>
          </section>

          <section className="rounded-[var(--radius-lg)] border border-white/[0.08] border-l-[3px] border-l-[#0EA5E9] bg-white/[0.04] backdrop-blur-sm p-6">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              Consistent Delivery Communication Across Every Project Manager
            </h2>
            <p className="mt-3">
              Every project manager has a different communication style. Some write detailed updates, some write brief
              ones. Some send them on Monday, some on Friday. Some are client-friendly, some are technical.
            </p>
            <p className="mt-3">
              Handover standardises the output. Every project update from every project manager on your team looks
              professional, reads consistently, and goes out on time. Your clients experience a level of delivery
              communication consistency that most MSPs cannot achieve manually at scale.
            </p>
            <Link href="/onboarding/connect" className="marketing-page-bottom-cta mt-5 inline-flex items-center">
              Start delivering better project communication today
            </Link>
          </section>
          <section className="rounded-[var(--radius-lg)] border border-white/[0.08] border-l-[3px] border-l-[#0EA5E9] bg-white/[0.04] backdrop-blur-sm p-6">
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">Features that power this</h3>
            <p className="mt-2 text-sm">
              <a href="/features/automated-reports" className="text-[var(--accent)] hover:underline">Automated Reports</a>
              {" · "}
              <a href="/features/psa-push" className="text-[var(--accent)] hover:underline">Push Notes to PSA</a>
            </p>
          </section>
        </div>
      </section>

      <MarketingRelatedPages
        links={[
          { href: "/solutions/project-managers", title: "Project managers", Icon: FolderKanban },
          { href: "/features/psa-push", title: "Push notes to PSA", Icon: Plug },
          { href: "/pricing", title: "Plans and pricing", Icon: BarChart3 },
        ]}
      />
    </MarketingPageLayout>
  );
}

