import type { Metadata } from "next";
import Link from "next/link";

import { MarketingFooter } from "@/components/marketing-footer";
import { Nav as MarketingNav } from "@/components/nav";

export const metadata: Metadata = {
  title: "Introducing Handover Client Intelligence™ - AI Account Memory for MSPs | Handover Blog",
  description:
    "Handover Client Intelligence™ is now live. Every report, every risk, every client relationship - remembered automatically. Here's what it does and why we built it.",
  alternates: {
    canonical: "https://gethandover.uk/blog/introducing-handover-client-intelligence",
  },
  openGraph: {
    title: "Introducing Handover Client Intelligence™",
    description:
      "AI account memory for MSPs is now live. Every client relationship remembered automatically.",
    type: "article",
    publishedTime: new Date().toISOString(),
    images: [
      {
        url: "https://gethandover.uk/opengraph-image",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Introducing Handover Client Intelligence™",
    description:
      "AI account memory for MSPs is now live. Every client relationship remembered automatically.",
    images: ["https://gethandover.uk/opengraph-image"],
  },
};

export default function ClientIntelligenceLaunchPost() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: "Introducing Handover Client Intelligence™ - AI Account Memory for MSPs",
    description: metadata.description,
    datePublished: new Date().toISOString(),
    author: {
      "@type": "Person",
      name: "Lewis Williams",
      jobTitle: "Founder, Handover",
    },
    publisher: {
      "@type": "Organization",
      name: "Handover",
      url: "https://gethandover.uk",
    },
    url: "https://gethandover.uk/blog/introducing-handover-client-intelligence",
    keywords: [
      "MSP client intelligence",
      "MSP account memory",
      "HaloPSA reporting",
      "ConnectWise reporting",
      "MSP client management",
      "AI MSP tools",
    ],
  };

  return (
    <>
      <MarketingNav />
      <div className="marketing-aurora min-h-screen">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <article className="mx-auto max-w-[700px] px-6 py-16 md:py-24">
          {/* Eyebrow */}
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#38bdf8]">
            Product · Announcement
          </p>

          {/* Title */}
          <h1 className="mb-6 text-3xl font-semibold leading-tight text-white md:text-4xl">
            Introducing Handover Client Intelligence™
          </h1>

          {/* Meta */}
          <div className="mb-10 flex items-center gap-3 text-[12px] text-white/30">
            <span>Lewis Williams</span>
            <span>·</span>
            <span>
              {new Date().toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            <span>·</span>
            <span>6 min read</span>
          </div>

          {/* Lead */}
          <p className="mb-8 text-[16px] font-medium leading-relaxed text-white/70">
            Every MSP has a memory problem. When your best account manager leaves, three years of
            client knowledge walks out with them. We built something to fix that.
          </p>

          {/* Body */}
          <div className="prose-ci space-y-6 text-[14px] leading-relaxed text-white/55">
            <p>
              Today we&apos;re launching Handover Client Intelligence™ - the first AI account memory
              system built specifically for MSPs.
            </p>

            <p>
              Here&apos;s what it does, why we built it, and why it matters more than any other
              feature we&apos;ve shipped.
            </p>

            <h2 className="mb-4 mt-10 text-[18px] font-semibold text-white">
              The problem nobody talks about
            </h2>

            <p>
              MSPs are obsessed with operational efficiency - ticket resolution times, SLA
              compliance, first contact resolution. All important.
            </p>

            <p>
              But there&apos;s a different kind of inefficiency that costs MSPs clients every year
              and nobody measures it: the loss of institutional knowledge.
            </p>

            <p>
              Every account manager and delivery engineer who leaves takes years of context with
              them. Which stakeholder to call. What was promised in the last QBR. Which risks have
              been quietly building across the last six months. What the client said in passing
              about their budget situation.
            </p>

            <p>That knowledge doesn&apos;t live in your PSA. It lives in people&apos;s heads.</p>

            <h2 className="mb-4 mt-10 text-[18px] font-semibold text-white">What we built</h2>

            <p>
              Handover Client Intelligence™ builds automatically as you use Handover. Every report
              you generate adds to a growing picture of each client relationship.
            </p>

            <p>
              After a few reports per client, you can open the Client Intelligence view and see:
            </p>

            <ul className="space-y-2 pl-4">
              <li className="flex gap-2">
                <span className="flex-shrink-0 text-[#38bdf8]">·</span>
                <span>The full history of every report generated for that client</span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 text-[#38bdf8]">·</span>
                <span>
                  An AI-generated account summary covering relationship health, key achievements,
                  recurring issues, open risks, and QBR talking points
                </span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 text-[#38bdf8]">·</span>
                <span>
                  A &ldquo;What changed?&rdquo; comparison showing exactly what was resolved, what
                  is new, and what is still ongoing since the last report
                </span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 text-[#38bdf8]">·</span>
                <span>
                  A &ldquo;What needs my attention?&rdquo; query that surfaces everything that needs
                  action across your entire portfolio in one view
                </span>
              </li>
            </ul>

            <p>None of this requires any manual data entry. It builds as you work.</p>

            <h2 className="mb-4 mt-10 text-[18px] font-semibold text-white">The demo moment</h2>

            <p>
              I&apos;ve been showing this to MSP directors and delivery leads over the past few
              weeks. The reaction is consistent.
            </p>

            <p>
              When I select a client, click &ldquo;Generate intelligence,&rdquo; and show an account
              narrative that says - from real data - &ldquo;the Osprey migration has been blocked by
              partner sign-off delays for three consecutive reporting periods, creating an escalating
              delivery risk,&rdquo; the room changes.
            </p>

            <p>
              That&apos;s not a report. That&apos;s institutional memory. That&apos;s knowing your
              client.
            </p>

            <h2 className="mb-4 mt-10 text-[18px] font-semibold text-white">
              Why this matters strategically
            </h2>

            <p>
              Every MSP tool that exists today is stateless. BrightGauge shows you dashboards.
              ConnectWise shows you tickets. Neither remembers anything across time.
            </p>

            <p>
              Handover Client Intelligence™ is the first MSP system with genuine account memory. And
              account memory compounds - the longer you use it, the more valuable it becomes, and the
              more switching to another tool would cost you.
            </p>

            <p>That&apos;s not an accident. That&apos;s the product strategy.</p>

            <h2 className="mb-4 mt-10 text-[18px] font-semibold text-white">
              What&apos;s coming next
            </h2>

            <p>
              Client Intelligence is the foundation. What gets built on top of it is what I&apos;m
              most excited about.
            </p>

            <p>
              We&apos;re working on financial QBR generation - pulling time entries and billing data
              from ConnectWise to generate a proper quarterly business review with budget tracking
              and ROI analysis. Not a service review dressed up as a QBR. An actual financial
              conversation.
            </p>

            <p>
              And beyond that: proactive delivery management. The system that tells you a
              relationship is deteriorating before your client feels it. The AI service delivery
              manager.
            </p>

            <p>
              We&apos;re not there yet. But today&apos;s launch is the foundation everything else is
              built on.
            </p>

            <h2 className="mb-4 mt-10 text-[18px] font-semibold text-white">Available now</h2>

            <p>
              Handover Client Intelligence™ is available today on Growth (£99/month) and Enterprise
              plans. Every plan includes a 14-day free trial.
            </p>

            <p>
              If you&apos;re running HaloPSA or ConnectWise and you&apos;re still writing reports
              manually - or losing client context every time someone leaves - this is for you.
            </p>
          </div>

          {/* CTA */}
          <div className="mt-12 rounded-xl border border-[rgba(56,189,248,0.2)] bg-[rgba(56,189,248,0.05)] p-6">
            <p className="mb-4 text-[14px] font-semibold text-white">
              Try Handover Client Intelligence™ free for 14 days
            </p>
            <p className="mb-5 text-[13px] text-white/50">
              Connect your PSA, generate your first report, and see what Handover knows about your
              clients after just a few generations. No credit card required to start.
            </p>
            <Link
              href="/auth?tab=signup"
              className="inline-block rounded-lg bg-[#38bdf8] px-5 py-2.5 text-[13px] font-semibold text-[#06091a] transition-all hover:scale-[1.02]"
            >
              Start free trial →
            </Link>
          </div>

          {/* Related */}
          <div className="mt-12 border-t border-white/[0.08] pt-8">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-white/30">
              Related
            </p>
            <div className="space-y-3">
              {[
                {
                  href: "/solutions/client-intelligence",
                  label: "Handover Client Intelligence™ - full feature overview",
                },
                {
                  href: "/solutions/service-review",
                  label: "Service Review packs - PSA to client-ready in 30 seconds",
                },
                {
                  href: "/compare/handover-vs-brightgauge",
                  label: "Handover vs BrightGauge - how they compare",
                },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-[13px] text-[#38bdf8] hover:underline"
                >
                  {link.label} →
                </Link>
              ))}
            </div>
          </div>
        </article>

        <MarketingFooter />
      </div>
    </>
  );
}
