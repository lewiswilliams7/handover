import type { Metadata } from "next";
import Link from "next/link";

import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { Nav as MarketingNav } from "@/components/nav";
import { ScrollRevealItem } from "@/components/scroll-reveal-item";

export const metadata: Metadata = {
  title:
    "Automated Service Review Packs for MSPs - From PSA to Client-Ready in 30 Seconds | Handover",
  description:
    "Generate complete branded Service Review packs from HaloPSA or ConnectWise in under 30 seconds. Action logs, risk registers, executive summaries, client emails, and PowerPoint exports - all from your live PSA data.",
  alternates: {
    canonical: "https://gethandover.uk/solutions/service-review",
  },
  openGraph: {
    title: "Automated Service Review Packs for MSPs | Handover",
    description:
      "From HaloPSA or ConnectWise tickets to a complete client Service Review pack in 30 seconds. Actions, risks, executive summary, client email, PowerPoint - all generated automatically.",
    url: "https://gethandover.uk/solutions/service-review",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Service Review Packs for MSPs | Handover",
    description: "PSA tickets to client-ready Service Review in 30 seconds.",
  },
};

export default function ServiceReviewPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Handover Service Review",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "Automated Service Review pack generator for MSPs. Connects to HaloPSA or ConnectWise, reads live ticket and project data, and generates complete client-ready Service Review packs in under 30 seconds.",
      offers: {
        "@type": "Offer",
        price: "49",
        priceCurrency: "GBP",
      },
      featureList: [
        "Action log with owners and due dates",
        "Risk register with mitigations",
        "Executive summary",
        "Client-ready email draft",
        "PowerPoint export",
        "Excel export (17 sheets)",
        "PDF export",
        "Push back to PSA tickets",
        "White label branding",
        "Scheduled automation",
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is a Service Review pack for MSPs?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "A Service Review pack is a structured client communication document that summarises delivery activity for a specific period. It typically includes an action log, risk register, executive summary, and client email. MSPs use Service Reviews in monthly or weekly client meetings to demonstrate the value they deliver.",
          },
        },
        {
          "@type": "Question",
          name: "How does Handover generate Service Review packs?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Handover connects to HaloPSA or ConnectWise and reads your live ticket and project data. GPT-4 analyses the data and generates a complete Service Review pack - action log, risk register, executive summary, and client email - in under 30 seconds. No copy-paste, no templates, no manual writing.",
          },
        },
        {
          "@type": "Question",
          name: "Can I white label the Service Review packs?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Handover supports full white labelling on Growth and Enterprise plans. Your brand name, logo, and colours appear on all outputs including the PowerPoint and Excel exports. The Handover branding is removed completely.",
          },
        },
        {
          "@type": "Question",
          name: "What exports does the Service Review support?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Handover Service Reviews export to PowerPoint (branded presentation), Excel (17-sheet workbook with actions, risks, and metrics), and PDF. You can also push the generated notes back to your PSA tickets directly from Handover.",
          },
        },
      ],
    },
  ];

  return (
    <>
      <MarketingNav />
      <div className="marketing-aurora min-h-screen">
        {jsonLd.map((schema, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}

        {/* Hero */}
        <section className="marketing-page-hero relative overflow-hidden bg-transparent px-6 py-12 md:px-8 md:py-20">
          <MarketingHeroAmbient />
          <div className="relative z-[1] mx-auto w-full max-w-[1000px]">
            <ScrollRevealItem index={0} disableAnimation className="block">
              <div className="rounded-[var(--radius-lg)] border border-[rgba(56,189,248,0.28)] bg-[rgba(15,23,42,0.68)] px-6 py-8 shadow-[0_20px_60px_-22px_rgba(56,189,248,0.35)] md:px-10 md:py-10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#38bdf8]">
                  Solutions · Service Review
                </p>
                <h1 className="mt-2 text-3xl font-semibold leading-tight text-white md:text-5xl">
                  Your MSP Delivers Great Work. Handover Makes Sure Clients See It.
                </h1>
                <p className="mt-4 max-w-[620px] text-[15px] leading-relaxed text-white/60">
                  Connect HaloPSA or ConnectWise once. Handover reads your live ticket and project
                  data and generates a complete Service Review pack in under 30 seconds - action
                  log, risk register, executive summary, client email, and PowerPoint. Ready to
                  send.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-[12px] text-white/40">
                  {[
                    "Works with HaloPSA",
                    "Works with ConnectWise",
                    "No manual writing",
                    "PowerPoint + Excel + PDF",
                    "White label ready",
                  ].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/[0.1] px-3 py-1"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/onboarding/connect"
                    className="rounded-lg bg-[#38bdf8] px-5 py-2.5 text-[13px] font-semibold text-[#06091a] transition-all hover:scale-[1.02]"
                  >
                    Generate your first Service Review →
                  </Link>
                </div>
              </div>
            </ScrollRevealItem>
          </div>
        </section>

        {/* What's included */}
        <section className="px-6 py-16 md:px-8">
          <div className="mx-auto max-w-[1000px]">
            <ScrollRevealItem index={1}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#38bdf8]">
                What you get
              </p>
              <h2 className="mb-12 text-2xl font-semibold text-white md:text-3xl">
                Five professional outputs. One click.
              </h2>
            </ScrollRevealItem>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Action log",
                  body: "Every open action with an owner, due date, and priority. Pulled directly from your PSA tickets. Never miss a commitment.",
                },
                {
                  title: "Risk register",
                  body: "Risks identified from ticket patterns and project status, with mitigations. Written in client-facing language not engineer-speak.",
                },
                {
                  title: "Executive summary",
                  body: "A board-level narrative covering the most significant delivery items for the period. Leads with the most time-critical item.",
                },
                {
                  title: "Client email",
                  body: "A ready-to-send client email summarising the week's delivery. One click to send via your email client or automate with Scheduled Reports.",
                },
                {
                  title: "PowerPoint export",
                  body: "A branded presentation with your logo and colours. Ready to present in a client meeting. Exported in seconds.",
                },
                {
                  title: "Excel export",
                  body: "17-sheet workbook covering actions, risks, projects, and ticket data. White labelled with your branding on Growth and above.",
                },
              ].map((item, i) => (
                <ScrollRevealItem key={i} index={i + 2}>
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
                    <h3 className="mb-2 text-[13px] font-semibold text-white">{item.title}</h3>
                    <p className="text-[12px] leading-relaxed text-white/50">{item.body}</p>
                  </div>
                </ScrollRevealItem>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="px-6 py-16 md:px-8">
          <div className="mx-auto max-w-[700px]">
            <ScrollRevealItem index={8}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#38bdf8]">
                How it works
              </p>
              <h2 className="mb-10 text-2xl font-semibold text-white md:text-3xl">
                30 seconds from PSA to client-ready
              </h2>
            </ScrollRevealItem>
            <div className="space-y-6">
              {[
                {
                  step: "1",
                  title: "Connect your PSA",
                  body: "One-time setup. Enter your HaloPSA or ConnectWise API credentials. Handover connects and reads your live data.",
                },
                {
                  step: "2",
                  title: "Select the period and client",
                  body: "Choose which client and date range. Handover imports the relevant tickets and projects automatically.",
                },
                {
                  step: "3",
                  title: "Click Generate",
                  body: "GPT-4 analyses your PSA data and generates all five outputs simultaneously. Done in under 30 seconds.",
                },
                {
                  step: "4",
                  title: "Review and send",
                  body: "Review the outputs in the tab view. Make any edits. Send the client email, export the PowerPoint, or push the notes back to your PSA.",
                },
              ].map((item, i) => (
                <ScrollRevealItem key={i} index={i + 9}>
                  <div className="flex gap-4">
                    <div className="flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-[#38bdf8]/10 text-[12px] font-bold text-[#38bdf8]">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="mb-1 text-[14px] font-semibold text-white">{item.title}</h3>
                      <p className="text-[13px] leading-relaxed text-white/50">{item.body}</p>
                    </div>
                  </div>
                </ScrollRevealItem>
              ))}
            </div>
            <ScrollRevealItem index={12}>
              <div className="relative mt-10 overflow-hidden rounded-2xl border border-white/[0.08] shadow-[0_0_60px_-10px_rgba(56,189,248,0.2)]">
                <video
                  controls
                  playsInline
                  preload="metadata"
                  poster="/demo/handover-demo-thumb.jpg"
                  className="block w-full rounded-2xl"
                  style={{
                    aspectRatio: "16/9",
                    backgroundColor: "#06091a",
                  }}
                >
                  <source
                    src="/demo/handover-demo.mp4"
                    type="video/mp4"
                  />
                </video>
              </div>
              <p className="mt-3 text-center text-[11px] text-white/25">
                Watch the full demo - PSA import to client-ready report in 30 seconds
              </p>
            </ScrollRevealItem>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-6 py-16 md:px-8">
          <div className="mx-auto max-w-[700px]">
            <ScrollRevealItem index={13}>
              <h2 className="mb-10 text-2xl font-semibold text-white md:text-3xl">
                Frequently asked questions
              </h2>
            </ScrollRevealItem>
            <div className="space-y-6">
              {[
                {
                  q: "How is a Service Review different from a QBR?",
                  a: "A Service Review is an operational summary - what happened, what actions are open, what risks exist. It's typically monthly or weekly. A Quarterly Business Review is a strategic conversation covering budget, ROI, and forward planning. Handover generates both - Service Reviews from your PSA data, QBRs from accumulated Client Intelligence history.",
                },
                {
                  q: "Can I automate Service Reviews?",
                  a: "Yes. Handover's Scheduled Reports feature generates and delivers Service Reviews automatically on your chosen cadence - weekly, fortnightly, or monthly. Set it up once and your clients receive professional Service Reviews every cycle without any manual work.",
                },
                {
                  q: "Does it work with HaloPSA and ConnectWise?",
                  a: "Yes - Handover has native integrations with both HaloPSA and ConnectWise Manage. It reads tickets, projects, and time entries, and can push generated notes back to your PSA tickets.",
                },
              ].map((item, i) => (
                <ScrollRevealItem key={i} index={i + 14}>
                  <div className="border-b border-white/[0.08] pb-6">
                    <h3 className="mb-3 text-[14px] font-semibold text-white">{item.q}</h3>
                    <p className="text-[13px] leading-relaxed text-white/50">{item.a}</p>
                  </div>
                </ScrollRevealItem>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-[700px] text-center">
            <ScrollRevealItem index={17}>
              <h2 className="mb-4 text-2xl font-semibold text-white md:text-3xl">
                Your first Service Review in 30 seconds
              </h2>
              <p className="mb-8 text-[14px] leading-relaxed text-white/50">
                Connect your PSA, generate your first report, and see exactly what your clients
                would receive - before you spend a penny. Run the free PSA scan before you buy.
              </p>
              <Link
                href="/onboarding/connect"
                className="inline-block rounded-lg bg-[#38bdf8] px-6 py-3 text-[14px] font-semibold text-[#06091a] transition-all hover:scale-[1.02]"
              >
                Run the free PSA scan →
              </Link>
            </ScrollRevealItem>
          </div>
        </section>

        <MarketingFooter />
      </div>
    </>
  );
}
