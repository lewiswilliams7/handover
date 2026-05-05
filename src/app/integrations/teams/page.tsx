"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CardMouseSpotlight } from "@/components/card-mouse-spotlight";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { ScrollRevealItem } from "@/components/scroll-reveal-item";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";

export default function TeamsIntegrationPage() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setSignedIn(Boolean(user));
    })();
  }, []);

  return (
    <MarketingPageLayout>
      <section className="relative z-[1] overflow-hidden bg-transparent px-6 py-12 md:px-8 md:py-20">
        <MarketingHeroAmbient />
        <div className="relative z-[1] mx-auto w-full max-w-[1100px]">
          <ScrollRevealItem index={0} className="block">
            <section className="integration-card-glass animate-in fade-in slide-in-from-bottom-4 duration-300 relative overflow-hidden rounded-[var(--radius-lg)] border border-white/[0.07] bg-white/[0.03] p-8 backdrop-blur-md">
              <Link
                href="/integrations"
                className="text-sm text-[var(--text-secondary)] transition-colors duration-200 hover:text-[var(--text-primary)]"
              >
                ← Integrations
              </Link>
              <div className="mt-4 flex items-start gap-4">
                <img
                  src="/teams.png"
                  alt="Microsoft Teams"
                  className="shrink-0 rounded-[10px]"
                  style={{ width: "56px", height: "56px", objectFit: "contain" }}
                />
                <div className="min-w-0 flex-1">
                  <h1 className="text-3xl font-semibold sm:text-4xl">Microsoft Teams Notifications</h1>
                  <p className="mt-2 max-w-3xl text-[var(--text-secondary)]">
                    Send generated report summaries to your chosen Microsoft Teams channel automatically.
                  </p>
                </div>
              </div>
            </section>
          </ScrollRevealItem>
        </div>
      </section>

      <section className="relative z-[1] bg-transparent px-6 py-12 md:px-8 md:py-20">
        <div className="mx-auto grid w-full max-w-[1100px] gap-4">
          <ScrollRevealItem index={1} className="min-w-0">
            <CardMouseSpotlight className="integration-card-glass rounded-[var(--radius-lg)] border border-[var(--border)]/80 p-8">
              <h2 className="text-2xl font-semibold">What it does</h2>
              <p className="mt-2 text-[var(--text-secondary)]">
                After every manual or scheduled generation, Handover posts a summary notification to
                your chosen Teams channel automatically.
              </p>
            </CardMouseSpotlight>
          </ScrollRevealItem>

          <ScrollRevealItem index={2} className="min-w-0">
            <CardMouseSpotlight className="integration-card-glass rounded-[var(--radius-lg)] border border-[var(--border)]/80 p-8">
              <h2 className="text-2xl font-semibold">How to set it up</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-[var(--text-secondary)]">
                <li>Go to your Teams workspace and create an Incoming Webhook.</li>
                <li>Copy the webhook URL.</li>
                <li>Go to Handover Settings → Integrations → Notifications.</li>
                <li>Paste the URL and enable notifications.</li>
                <li>Send a test message to confirm.</li>
              </ol>
            </CardMouseSpotlight>
          </ScrollRevealItem>
        </div>
      </section>

      <section className="relative z-[1] bg-transparent px-6 py-12 text-center md:px-8 md:py-20">
        <div className="mx-auto w-full max-w-[1100px]">
          <ScrollRevealItem index={3} className="block">
            <section className="rounded-[var(--radius-lg)] border border-white/[0.07] bg-white/[0.03] p-8 text-center backdrop-blur-md">
              <Link href={signedIn ? "/?openSettings=integrations" : "/auth?tab=signup&returnTo=/welcome"}>
                <Button className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]">
                  Start free trial
                </Button>
              </Link>
            </section>
          </ScrollRevealItem>
        </div>
      </section>
    </MarketingPageLayout>
  );
}
