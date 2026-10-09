import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";

import PageTransition from "@/components/PageTransition";
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  CalendarClock,
  Clock,
  EyeOff,
  FileText,
  LayoutTemplate,
  Lock,
  Mail,
  MessageSquare,
  Paintbrush,
  Plug,
  PanelRight,
  RefreshCw,
  Share2,
  Shield,
  Sparkles,
  Star,
  Webhook,
} from "lucide-react";

import { CardMouseSpotlight } from "@/components/card-mouse-spotlight";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { ScrollRevealItem } from "@/components/scroll-reveal-item";
import { TestimonialMarquee } from "@/components/testimonial-marquee";
import { Button } from "@/components/ui/button";

const FEATURE_CARD_ICON_CLASS = "size-[22px] shrink-0 text-[#0EA5E9]";

export const metadata: Metadata = {
  title: "Features - Handover | AI-Powered MSP Project Reporting",
  description:
    "Connect HaloPSA or ConnectWise to generate client updates, action and risk logs, Excel report packs, and scheduled delivery with PSA push-back to tickets. Run the free PSA scan before you buy.",
  alternates: {
    canonical: "https://gethandover.uk/features",
  },
};

function PainIcon({ children }: { children: ReactNode }) {
  return (
    <div className="flex size-12 items-center justify-center rounded-[var(--radius)] bg-[var(--bg-secondary)] text-[var(--accent)]">
      {children}
    </div>
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
      {/* Hero */}
      <section
        className="relative overflow-hidden bg-transparent px-6 py-12 md:px-8 md:py-20"
      >
        <MarketingHeroAmbient />
        <div
          className="relative z-[1] mx-auto w-full max-w-[1100px]"
        >
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div
            className="mx-auto max-w-4xl rounded-[var(--radius-lg)] p-[2px] text-center shadow-xl"
            style={{
              position: "relative",
              zIndex: 1,
              background:
                "linear-gradient(135deg, rgba(56,189,248,0.55) 0%, rgba(14,165,233,0.35) 50%, rgba(56,189,248,0.25) 100%)",
              boxShadow:
                "0 24px 56px -18px rgba(56, 189, 248, 0.28), 0 0 0 1px rgba(56, 189, 248, 0.15)",
            }}
          >
            <div className="rounded-[calc(var(--radius-lg)-2px)] bg-[var(--bg-primary)] px-6 py-10 md:px-10 md:py-12">
          <h1 className="text-[48px] font-bold leading-tight text-[var(--text-primary)]">
            The reporting tool built for MSP delivery teams
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[20px] text-[var(--text-secondary)]">
            Native integrations with HaloPSA and ConnectWise. Connect your PSA and
            generate professional client updates in seconds.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3.5 py-1.5 text-[12px] text-[var(--text-secondary)]">
              <Plug className="size-3.5" aria-hidden />
              Native HaloPSA + ConnectWise API
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3.5 py-1.5 text-[12px] text-[var(--text-secondary)]">
              <Shield className="size-3.5" aria-hidden />
              GDPR compliant
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3.5 py-1.5 text-[12px] text-[var(--text-secondary)]">
              <Star className="size-3.5" aria-hidden />
              Built by an MSP PM
            </span>
          </div>
          <div
            className="mx-auto mt-6 max-w-[640px] rounded-[var(--radius-lg)] px-5 py-4 text-left"
            style={{
              backgroundColor: "rgba(56,189,248,0.05)",
              border: "1px solid rgba(56,189,248,0.2)",
            }}
          >
            <div className="flex items-start gap-3">
              <span className="inline-flex rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">
                vs
              </span>
              <div>
                <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                  Why not just use ChatGPT or Copilot?
                </p>
                <p className="mt-1 text-[13px] leading-[1.6] text-[var(--text-secondary)]">
                  General AI tools don&apos;t understand PSA delivery context.
                  They don&apos;t understand MSP delivery workflows, client
                  escalation patterns, or how a senior SDM writes a status
                  report. Handover connects directly to HaloPSA and ConnectWise -
                  pulling live ticket data, pushing outputs back as notes, and
                  triggering automatically on your schedule. No prompt engineering. No
                  copy-pasting. Just connect and generate.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/onboarding/connect">
              <Button
                size="lg"
                className="rounded-[var(--radius)] bg-[var(--accent)] px-8 text-white hover:bg-[var(--accent-hover)]"
              >
                Run the free PSA scan
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                size="lg"
                variant="outline"
                className="rounded-[var(--radius)] border-[var(--border)] px-8"
              >
                Compare plans & pricing
              </Button>
            </Link>
          </div>
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* Pain points */}
      <section
        className="relative z-[1] bg-transparent px-6 py-12 md:px-8 md:py-20"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="mx-auto w-full max-w-[1100px]">
          <ScrollRevealItem index={0} className="block">
          <h2 className="text-center text-3xl font-semibold text-[var(--text-primary)]">
            Sound <span className="text-gradient-brand">familiar</span>?
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <ScrollRevealItem index={0} className="min-w-0">
            <CardMouseSpotlight className="feature-page-card rounded-[var(--radius-lg)] bg-white/[0.03] backdrop-blur-md border border-white/[0.07] p-6 shadow-sm">
              <PainIcon>
                <Clock className="size-6" strokeWidth={1.75} aria-hidden />
              </PainIcon>
              <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
                Friday afternoon. Again.
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                You have updates due for Skyline IT Solutions, Fernwood Academy, and Greystone Group, plus a risk log
                for Elmwood Manufacturing that hasn&apos;t moved since last sprint. Sound familiar? That&apos;s your
                weekend gone.
              </p>
            </CardMouseSpotlight>
            </ScrollRevealItem>
            <ScrollRevealItem index={1} className="min-w-0">
            <CardMouseSpotlight className="feature-page-card rounded-[var(--radius-lg)] bg-white/[0.03] backdrop-blur-md border border-white/[0.07] p-6 shadow-sm">
              <PainIcon>
                <FileText className="size-6" strokeWidth={1.75} aria-hidden />
              </PainIcon>
              <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
                Copy. Paste. Repeat.
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                Meeting notes into a Word doc, Word doc into an email, email into a ticket. The same
                information, reformatted five times. Every single week.
              </p>
            </CardMouseSpotlight>
            </ScrollRevealItem>
            <ScrollRevealItem index={2} className="min-w-0">
            <CardMouseSpotlight className="feature-page-card rounded-[var(--radius-lg)] bg-white/[0.03] backdrop-blur-md border border-white/[0.07] p-6 shadow-sm">
              <PainIcon>
                <AlertTriangle className="size-6" strokeWidth={1.75} aria-hidden />
              </PainIcon>
              <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
                The update that never got sent
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                A client chases for an update. You know the work is being done - you just haven&apos;t
                had time to write it up. It happens more than it should.
              </p>
            </CardMouseSpotlight>
            </ScrollRevealItem>
          </div>
          </ScrollRevealItem>
        </div>
      </section>

      {/* Features grid */}
      <section
        className="relative z-[1] bg-transparent px-6 py-12 md:px-8 md:py-20"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="mx-auto w-full max-w-[1100px]">
          <ScrollRevealItem index={0} className="block">
          <h2 className="text-center text-3xl font-semibold text-[var(--text-primary)]">
            One tool. Every <span className="text-gradient-brand">output</span>.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[var(--text-secondary)]">
            Paste your notes or connect your PSA. Get everything you need in seconds.
          </p>
          </ScrollRevealItem>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                {
                  badge: "Integration",
                  Icon: Plug,
                  title: "HaloPSA and ConnectWise integration",
                  body: "Pull tickets and projects live from HaloPSA or ConnectWise. Choose your client, set a date range, and import in one click - no exports or copy-paste.",
                  href: "/features/psa-integration",
                },
                {
                  badge: "Core",
                  Icon: Sparkles,
                  title: "One-click report generation",
                  body: "Generate actions, risks, summary, client-ready email, and status report from the same run - structured outputs in seconds.",
                  href: "/features/automated-reports",
                },
                {
                  badge: "Pro",
                  Icon: ArrowLeftRight,
                  title: "Push back to HaloPSA or ConnectWise as ticket notes",
                  body: "Post generated content straight into HaloPSA or ConnectWise as ticket notes automatically - keep the ticket record current without tab-switching.",
                  href: "/features/psa-push",
                },
                {
                  badge: "Pro",
                  Icon: CalendarClock,
                  title: "Scheduled reports with automatic PSA push-back",
                  body: "Pick a day and time, choose clients, and Handover runs on a schedule. Reports land in your inbox and push back into HaloPSA or ConnectWise.",
                  href: "/features/scheduled-reports",
                },
                {
                  badge: "Pro",
                  Icon: Activity,
                  title: "Delivery health dashboard (RAG)",
                  body: "Live RAG-style delivery status across active work on Starter and above - spot risk and drift before the client does.",
                  href: "/features/health-dashboard",
                },
                {
                  badge: "Pro",
                  Icon: PanelRight,
                  title: "Expandable ticket detail panel",
                  body: "Open any row for a full progress feed from Halo notes, pipeline context, and one-click “generate report” from that ticket.",
                  href: "/features/qbr-generator",
                },
                {
                  badge: "Pro",
                  Icon: LayoutTemplate,
                  title: "Excel report pack (17 sheets)",
                  body: "Download a full workbook including RAID log, stakeholder update, lessons learned, and the rest of your delivery pack in one click.",
                  href: "/features/exports",
                },
                {
                  badge: "Team+",
                  Icon: Paintbrush,
                  title: "Custom branding & white label",
                  body: "Custom branding on all outputs is available on Starter, Growth, and Enterprise. White-label mode (no Handover branding in footers) is available on Team and Enterprise.",
                  href: "/features/white-label",
                },
                {
                  badge: "Professional+",
                  Icon: MessageSquare,
                  title: "Slack & Microsoft Teams",
                  body: "Notify channels when reports generate - so the team sees updates without digging through email.",
                },
                {
                  badge: "Pro",
                  Icon: Mail,
                  title: "One-click client email (Resend)",
                  body: "Send polished client updates from Handover in one click via Resend, with your tone and signature applied.",
                  href: "/features/ai-insights",
                },
                {
                  badge: "Roadmap",
                  Icon: Webhook,
                  title: "Zapier webhooks",
                  body: "Trigger Handover from the rest of your stack - coming soon.",
                },
                {
                  badge: "Integration",
                  Icon: Plug,
                  title: "ConnectWise integration",
                  body: "Native ConnectWise Manage integration with the same end-to-end workflow as HaloPSA.",
                  href: "/features/psa-integration",
                },
                {
                  badge: "Team",
                  Icon: Share2,
                  title: "Growth plans & pooled generations",
                  body: "Team seats share a pooled monthly generation allowance so busy weeks don’t strand one PM without capacity.",
                },
                {
                  badge: "Pro",
                  Icon: AlertTriangle,
                  title: "SLA risk on the dashboard",
                  body: "Target-date awareness on the delivery health dashboard: SLA At Risk / SLA Warning badges, filters, and prompts to generate an update before breach.",
                },
                {
                  badge: "Pro",
                  Icon: RefreshCw,
                  title: "Automatic closure summary (opt-in)",
                  body: "Optional PSA setting: when a ticket moves to resolved, Handover can draft a closure summary, push it back to HaloPSA or ConnectWise, notify Slack/Teams, and save it to history.",
                },
              ] satisfies { badge: string; Icon: LucideIcon; title: string; body: string; href?: string }[]
            ).map((card, i) => (
              <ScrollRevealItem key={card.title} index={i} className="min-w-0">
              <CardMouseSpotlight
                className="feature-page-card flex flex-col rounded-[var(--radius-lg)] bg-white/[0.03] backdrop-blur-md border border-white/[0.07] p-6"
              >
                <span className="inline-flex w-fit rounded-full border border-[var(--border)] bg-[var(--bg-primary)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
                  {card.badge}
                </span>
                <div className="mt-4 flex size-10 items-center justify-center rounded-[var(--radius)] bg-[var(--bg-primary)]">
                  <card.Icon className={FEATURE_CARD_ICON_CLASS} strokeWidth={1.75} aria-hidden />
                </div>
                <h3 className="mt-3 text-lg font-semibold text-[var(--text-primary)]">{card.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {card.body}
                </p>
                {card.href ? (
                  <Link href={card.href} className="mt-4 text-sm font-medium text-[var(--accent)] hover:underline">
                    Learn more →
                  </Link>
                ) : null}
              </CardMouseSpotlight>
              </ScrollRevealItem>
            ))}
          </div>
        </div>
      </section>

      {/* Time saving - dark */}
      <section
        className="relative z-[1] w-full bg-[var(--sidebar-bg)] px-6 py-12 md:px-8 md:py-20"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="mx-auto w-full max-w-[1100px]">
          <ScrollRevealItem index={0} className="block">
          <h2 className="text-center text-3xl font-semibold text-white">
            Get your <span className="text-gradient-brand">Fridays</span> back
          </h2>
          <p className="mt-2 text-center text-sm text-[var(--sidebar-text)]">
            Based on typical MSP delivery team workflows
          </p>
          </ScrollRevealItem>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                stat: "£45",
                line: "saved per client update",
                sub: "Based on 45 mins at £60/hr - every week, per client",
              },
              {
                stat: "£1,300",
                line: "saved per PM per month",
                sub: "5 hours weekly reporting time at average MSP billing rates",
              },
              {
                stat: "30 sec",
                line: "from notes to 5 outputs",
                sub: "vs 45 minutes manually. Every time.",
              },
              {
                stat: "8x",
                line: "faster than manual reporting",
                sub: "Consistently. Without sacrificing quality.",
              },
            ].map((s, i) => (
              <ScrollRevealItem key={s.stat} index={i} className="min-w-0">
              <CardMouseSpotlight
                className="feature-page-card rounded-[var(--radius-lg)] border border-[var(--sidebar-border)] bg-white/5 p-6"
              >
                <p className="text-4xl font-bold text-[var(--accent)]">{s.stat}</p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--sidebar-text-active)]">{s.line}</p>
                <p className="mt-3 text-xs text-[var(--sidebar-text)]">{s.sub}</p>
              </CardMouseSpotlight>
              </ScrollRevealItem>
            ))}
          </div>
        </div>
      </section>

      <section
        className="relative z-[1] bg-transparent px-6 py-12 md:px-8 md:py-20"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="mx-auto w-full max-w-[1100px]">
          <ScrollRevealItem index={0} className="block">
          <h2
            className="text-center font-bold text-[var(--text-primary)]"
            style={{ fontSize: "24px", marginBottom: "0.5rem" }}
          >
            What delivery <span className="text-gradient-brand">professionals</span> say
          </h2>
          <p
            className="text-center text-[var(--text-secondary)]"
            style={{ fontSize: "15px", marginBottom: "2rem" }}
          >
            From PMs and SDMs at leading IT organisations
          </p>
          </ScrollRevealItem>
          <ScrollRevealItem index={1} className="block">
            <TestimonialMarquee />
          </ScrollRevealItem>
        </div>
      </section>

      {/* Integrations */}
      <section
        className="relative z-[1] bg-transparent px-6 py-12 md:px-8 md:py-20"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="mx-auto w-full max-w-[1100px]">
          <ScrollRevealItem index={0} className="block">
          <h2 className="text-center text-3xl font-semibold text-[var(--text-primary)]">
            Works with your <span className="text-gradient-brand">stack</span>
          </h2>
          </ScrollRevealItem>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <ScrollRevealItem index={0} className="min-w-0">
            <CardMouseSpotlight className="feature-page-card flex flex-col rounded-[var(--radius-lg)] bg-white/[0.03] backdrop-blur-md border border-white/[0.07] p-6 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <img
                    src="/halopsa.png"
                    alt="HaloPSA"
                    style={{
                      width: "48px",
                      height: "48px",
                      objectFit: "contain",
                      borderRadius: "8px",
                    }}
                  />
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">HaloPSA</h3>
                </div>
                <span className="rounded-full bg-emerald-600/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  Available
                </span>
              </div>
              <p className="mt-3 flex-1 text-sm text-[var(--text-secondary)]">
                Pull tickets and projects directly from HaloPSA with one-click import and push-back.
              </p>
              <Link href="/integrations/halopsa" className="mt-4">
                <Button variant="outline" className="w-full border-[var(--border)]">
                  See setup guide
                </Button>
              </Link>
            </CardMouseSpotlight>
            </ScrollRevealItem>
            <ScrollRevealItem index={1} className="min-w-0">
            <CardMouseSpotlight className="feature-page-card flex flex-col rounded-[var(--radius-lg)] bg-white/[0.03] backdrop-blur-md border border-white/[0.07] p-6 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <img
                    src="/connectwise.jpeg"
                    alt="ConnectWise"
                    style={{
                      width: "48px",
                      height: "48px",
                      objectFit: "contain",
                      borderRadius: "8px",
                    }}
                  />
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">ConnectWise</h3>
                </div>
                <span className="rounded-full bg-emerald-600/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  Available
                </span>
              </div>
              <p className="mt-3 text-sm text-[var(--text-secondary)]">
                Native ConnectWise Manage integration for tickets, projects, and push-back workflows.
              </p>
              <Link href="/integrations/connectwise" className="mt-4">
                <Button variant="outline" className="w-full border-[var(--border)]">
                  See setup guide
                </Button>
              </Link>
            </CardMouseSpotlight>
            </ScrollRevealItem>
            <ScrollRevealItem index={2} className="min-w-0">
            <CardMouseSpotlight className="feature-page-card flex flex-col rounded-[var(--radius-lg)] bg-white/[0.03] backdrop-blur-md border border-white/[0.07] p-6 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Zapier</h3>
                <span className="rounded-full bg-[var(--bg-secondary)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-muted)]">
                  Coming soon
                </span>
              </div>
              <p className="mt-3 flex-1 text-sm text-[var(--text-secondary)]">
                Webhook automation to trigger Handover from your wider MSP toolchain.
              </p>
              <Link href="/integrations/zapier" className="mt-4">
                <Button variant="outline" className="w-full border-[var(--border)]">
                  Learn more
                </Button>
              </Link>
            </CardMouseSpotlight>
            </ScrollRevealItem>
            <ScrollRevealItem index={3} className="min-w-0">
            <CardMouseSpotlight className="feature-page-card flex flex-col rounded-[var(--radius-lg)] bg-white/[0.03] backdrop-blur-md border border-white/[0.07] p-6 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">CSV / Excel</h3>
                <span className="rounded-full bg-emerald-600/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  Available
                </span>
              </div>
              <p className="mt-3 flex-1 text-sm text-[var(--text-secondary)]">
                Export from any PSA and paste directly. Works with any ticketing system.
              </p>
              <Link href="/integrations/csv" className="mt-4">
                <Button variant="outline" className="w-full border-[var(--border)]">
                  Learn more
                </Button>
              </Link>
            </CardMouseSpotlight>
            </ScrollRevealItem>
          </div>
        </div>
      </section>

      <section
        className="relative z-[1] bg-transparent px-6 py-12 md:px-8 md:py-20"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="mx-auto w-full max-w-[1100px]">
          <ScrollRevealItem index={0} className="block">
          <h2 className="text-center text-3xl font-semibold text-[var(--text-primary)]">
            Built with <span className="text-gradient-brand">privacy</span> in mind
          </h2>
          </ScrollRevealItem>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <ScrollRevealItem index={0} className="min-w-0">
            <CardMouseSpotlight className="feature-page-card rounded-[var(--radius-lg)] bg-white/[0.03] backdrop-blur-md border border-white/[0.07] p-6">
              <div className="flex size-10 items-center justify-center rounded-[var(--radius)] bg-[var(--bg-primary)] text-[var(--accent)]">
                <Shield className="size-5" aria-hidden />
              </div>
              <h3 className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
                Data not stored
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                Your notes and ticket data are processed to generate outputs and
                never stored on our servers after generation.
              </p>
            </CardMouseSpotlight>
            </ScrollRevealItem>
            <ScrollRevealItem index={1} className="min-w-0">
            <CardMouseSpotlight className="feature-page-card rounded-[var(--radius-lg)] bg-white/[0.03] backdrop-blur-md border border-white/[0.07] p-6">
              <div className="flex size-10 items-center justify-center rounded-[var(--radius)] bg-[var(--bg-primary)] text-[var(--accent)]">
                <Lock className="size-5" aria-hidden />
              </div>
              <h3 className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
                OpenAI API only
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                We use OpenAI&apos;s API under enterprise terms. OpenAI does not
                use API data to train their models.
              </p>
            </CardMouseSpotlight>
            </ScrollRevealItem>
            <ScrollRevealItem index={2} className="min-w-0">
            <CardMouseSpotlight className="feature-page-card rounded-[var(--radius-lg)] bg-white/[0.03] backdrop-blur-md border border-white/[0.07] p-6">
              <div className="flex size-10 items-center justify-center rounded-[var(--radius)] bg-[var(--bg-primary)] text-[var(--accent)]">
                <EyeOff className="size-5" aria-hidden />
              </div>
              <h3 className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
                Your outputs, your data
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                Everything you generate belongs to you. We never share your data
                with third parties.
              </p>
            </CardMouseSpotlight>
            </ScrollRevealItem>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        className="relative z-[1] bg-transparent px-6 py-12 md:px-8 md:py-20"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="mx-auto w-full max-w-[1100px]">
          <ScrollRevealItem index={0} className="block">
          <h2 className="text-center text-3xl font-semibold text-[var(--text-primary)]">
            From notes to <span className="text-gradient-brand">outputs</span> in 3 steps
          </h2>
          </ScrollRevealItem>
          <div className="relative mt-12 md:px-8">
            <div
              className="pointer-events-none absolute top-6 left-[12%] right-[12%] hidden h-px bg-[var(--border)] md:block"
              aria-hidden
            />
            <div className="relative grid gap-10 md:grid-cols-3 md:gap-6">
              {[
                {
                  n: 1,
                  title: "Add your notes",
                  body: "Paste meeting notes, ticket updates or project data. Or connect HaloPSA or ConnectWise and import directly.",
                },
                {
                  n: 2,
                  title: "Choose your outputs",
                  body: "Select what you need - action list, client email, risk log, status report or all five. Add the client name and contact for a personalised email.",
                },
                {
                  n: 3,
                  title: "Generate and send",
                  body: "Your outputs are ready in seconds. Copy, export to CSV or Excel, or open directly in your email client. Done.",
                },
              ].map((step) => (
                <ScrollRevealItem key={step.n} index={step.n - 1} className="min-w-0">
                <div className="flex flex-col items-center text-center">
                  <div className="relative z-[1] flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-lg font-bold text-white ring-4 ring-[var(--bg-primary)]">
                    {step.n}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{step.title}</h3>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-[var(--text-secondary)]">
                    {step.body}
                  </p>
                </div>
                </ScrollRevealItem>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section
        className="relative z-[1] bg-[var(--sidebar-bg)] px-6 py-12 text-center md:px-8 md:py-20"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="mx-auto w-full max-w-[1100px]">
          <ScrollRevealItem index={0} className="block">
          <div className="mx-auto max-w-2xl">
          <h2 className="text-[36px] font-bold text-white">
            Stop writing. <span className="text-gradient-brand">Start delivering.</span>
          </h2>
          <p className="mt-4 text-[var(--sidebar-text)]">
            Join MSP teams saving hours every week on reporting and client communications.
          </p>
          <Link href="/onboarding/connect" className="mt-8 inline-block">
            <Button
              size="lg"
              className="rounded-[var(--radius)] bg-[var(--accent)] px-8 text-white hover:bg-[var(--accent-hover)]"
            >
              Run the free PSA scan
            </Button>
          </Link>
          <p className="mt-4 text-sm text-[var(--sidebar-text)]">
            Run the free PSA scan before you buy.
          </p>
          <Link
            href="/case-studies"
            className="mt-5 inline-block text-sm font-medium text-[var(--accent)] underline-offset-4 hover:underline"
          >
            Customer stories →
          </Link>
        </div>
          </ScrollRevealItem>
        </div>
      </section>

      <section
        className="relative z-[1] bg-transparent px-6 py-8 text-center md:px-8"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="mx-auto w-full max-w-[1100px]">
          <ScrollRevealItem index={0} className="block">
          <Link
            href="/"
            className="text-sm text-[var(--text-secondary)] underline-offset-4 hover:text-[var(--text-primary)] hover:underline"
          >
            ← Back to app
          </Link>
          </ScrollRevealItem>
        </div>
      </section>
    </div>
    </PageTransition>
  );
}
