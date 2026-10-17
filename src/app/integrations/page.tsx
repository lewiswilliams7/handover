import type { Metadata } from "next";
import { ArrowRight, Check, Lock, ShieldCheck, Undo2 } from "lucide-react";
import Link from "next/link";

import { ProductHero } from "@/components/marketing/product-hero";
import { PsaFlowVisual } from "@/components/marketing/psa-flow-visual";

export const metadata: Metadata = {
  title: "HaloPSA and ConnectWise Integrations | Handover",
  description:
    "Connect HaloPSA or ConnectWise Manage with a read-only API key. Handover reads tickets, time, contracts and billing to show which clients are slipping and what they are worth.",
  alternates: { canonical: "https://gethandover.uk/integrations" },
};

const PSAS = [
  {
    name: "HaloPSA",
    logo: "/halopsa.png",
    href: "/integrations/halopsa",
    body: "Tickets, time, client contracts and recurring invoices. Listed on the HaloPSA Marketplace.",
    status: "available" as const,
  },
  {
    name: "ConnectWise Manage",
    logo: "/connectwise.jpeg",
    href: "/integrations/connectwise",
    body: "Service tickets, time entries, agreements and additions. Listed on the ConnectWise Marketplace.",
    status: "available" as const,
  },
  {
    name: "Autotask PSA",
    logo: "/autotask.svg",
    href: "mailto:hello@gethandover.uk?subject=Autotask%20waitlist",
    body: "In the works. Join the list and we will tell you the day it opens.",
    status: "soon" as const,
  },
];

const TRUST = [
  { Icon: Lock, title: "Read-only", body: "Handover reads your PSA. Nothing in it changes unless you choose to push a note back." },
  { Icon: ShieldCheck, title: "Encrypted keys", body: "API credentials are encrypted with AES-256 before they are stored, in the EU." },
  { Icon: Undo2, title: "Disconnect any time", body: "Remove the key in your PSA and access stops at once. Nothing to uninstall." },
];

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen">
      <ProductHero
        eyebrow="Integrations"
        title="Connect your PSA. Read-only, in two minutes."
        body="Handover works from the data your team already records. One API key from HaloPSA or ConnectWise, and every client is checked against its own history every week."
        visual={<PsaFlowVisual />}
      />

      <section className="px-4 pb-16 sm:px-6 lg:px-8" aria-labelledby="psa-heading">
        <div className="mx-auto max-w-6xl">
          <h2 id="psa-heading" className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Supported PSAs
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {PSAS.map((psa) => {
              const soon = psa.status === "soon";
              const Wrapper = soon ? "a" : Link;
              return (
                <Wrapper
                  key={psa.name}
                  href={psa.href}
                  className={`group relative flex flex-col rounded-2xl border p-6 transition-all duration-200 ${
                    soon
                      ? "border-white/[0.07] bg-white/[0.015] hover:border-white/15"
                      : "border-white/10 bg-white/[0.03] hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <img
                      src={psa.logo}
                      alt=""
                      className={`size-12 rounded-xl bg-white object-contain p-1.5 ${soon ? "opacity-60" : ""}`}
                    />
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                        soon ? "border-white/10 text-white/45" : "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
                      }`}
                    >
                      {soon ? "Coming soon" : "Live"}
                    </span>
                  </div>
                  <h3 className={`mt-5 text-lg font-semibold ${soon ? "text-white/70" : "text-white"}`}>{psa.name}</h3>
                  <p className="mt-1.5 flex-1 text-sm leading-6 text-white/55">{psa.body}</p>
                  <span className={`mt-5 inline-flex items-center gap-1 text-sm font-semibold ${soon ? "text-white/50" : "text-cyan-300"}`}>
                    {soon ? "Join the waitlist" : "Setup guide and what we read"}
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </Wrapper>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8" aria-labelledby="trust-heading">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-6 sm:p-10">
          <h2 id="trust-heading" className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Your PSA stays yours
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {TRUST.map(({ Icon, title, body }) => (
              <div key={title}>
                <Icon className="size-5 text-cyan-300" aria-hidden />
                <h3 className="mt-3 font-semibold text-white">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-white/60">{body}</p>
              </div>
            ))}
          </div>
          <Link href="/security" className="mt-8 inline-flex items-center gap-1 text-sm font-semibold text-cyan-300 hover:text-cyan-200">
            Read the security details <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-8" aria-labelledby="also-heading">
        <div className="mx-auto max-w-6xl">
          <h2 id="also-heading" className="text-lg font-semibold text-white">
            Also works with
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2.5">
            {[
              { name: "Slack", logo: "/slack.png", href: "/integrations/slack", note: "Report alerts" },
              { name: "Microsoft Teams", logo: "/teams.png", href: "/integrations/teams", note: "Report alerts" },
              { name: "CSV and Excel", logo: "/excel.png", href: "/integrations/csv", note: "Import from any PSA" },
            ].map((item) => (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white transition-colors hover:border-white/25"
                >
                  <img src={item.logo} alt="" className="size-5 object-contain" />
                  {item.name}
                  <span className="text-xs text-white/45">{item.note}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-14 flex flex-col items-start justify-between gap-6 rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.05] p-6 sm:flex-row sm:items-center sm:p-8">
            <div>
              <p className="text-xl font-semibold text-white">Ready when your API key is.</p>
              <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/60">
                {["Free scan", "No card", "Results in about a minute"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <Check className="size-3.5 text-cyan-300" aria-hidden /> {item}
                  </span>
                ))}
              </p>
            </div>
            <Link href="/onboarding/connect" className="cta cta-primary">
              Connect your PSA
              <ArrowRight className="cta-arrow size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
