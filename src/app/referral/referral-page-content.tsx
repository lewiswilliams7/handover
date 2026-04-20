"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail, Share2 } from "lucide-react";

import { CardMouseSpotlight } from "@/components/card-mouse-spotlight";
import { MarketingHeroAmbient } from "@/components/marketing-hero-ambient";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { ScrollRevealItem } from "@/components/scroll-reveal-item";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const steps = [
  {
    title: "Share your link",
    body: "Send your unique referral link to a colleague or connection who runs delivery in an MSP.",
  },
  {
    title: "They subscribe",
    body: "They sign up and subscribe to any paid Handover plan when they’re ready.",
  },
  {
    title: "You both benefit",
    body: "You receive 3 months free (£57 value) added to your account automatically - they receive their first month free.",
  },
] as const;

const termsLines = [
  "Reward applies when the referred user subscribes to a paid plan and remains subscribed for 30 days.",
  "Both the referrer and referee must have active Handover accounts.",
  "Referral rewards are applied as account credit, not cash.",
  "No limit on referrals - refer as many people as you like.",
] as const;

export function ReferralPageContent() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [referralUrl, setReferralUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSignedIn(false);
        return;
      }
      setSignedIn(true);
      try {
        const res = await fetch("/api/referrals/signup-link", { credentials: "same-origin" });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok) {
          setLoadError(data.error ?? "Could not load your referral link.");
          return;
        }
        if (typeof data.url === "string") setReferralUrl(data.url);
      } catch {
        setLoadError("Could not load your referral link.");
      }
    })();
  }, []);

  const copyLink = useCallback(async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setLoadError("Could not copy to clipboard.");
    }
  }, [referralUrl]);

  const linkedInShare = useCallback(() => {
    if (!referralUrl) return;
    const text = encodeURIComponent(
      "I'm using Handover for MSP delivery reporting - thought you might want to try it.",
    );
    const url = encodeURIComponent(referralUrl);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}&summary=${text}`,
      "_blank",
      "noopener,noreferrer",
    );
  }, [referralUrl]);

  const emailShare = useCallback(() => {
    if (!referralUrl) return;
    const subject = encodeURIComponent("Handover - MSP reporting you might like");
    const body = encodeURIComponent(
      `Hi,\n\nI've been using Handover for client updates and HaloPSA reporting. Here's my referral link if you want to try it (we both get a reward):\n\n${referralUrl}\n\n`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }, [referralUrl]);

  return (
    <MarketingPageLayout>
      <div className="relative min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <MarketingHeroAmbient />
        <section className="relative z-[1] overflow-hidden px-6 py-14 md:px-8 md:py-20">
          <div className="mx-auto max-w-[900px] text-center">
            <ScrollRevealItem index={0} className="block">
              <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-[var(--accent)]">
                Referral programme
              </p>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-[var(--text-primary)] md:text-5xl">
                Refer a friend. Get <span className="text-gradient-brand">3 months</span> free.
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-[var(--text-secondary)]">
                Know an MSP project manager who&apos;d benefit from Handover? Refer them and you both
                win.
              </p>
            </ScrollRevealItem>
          </div>
        </section>

        <section
          className="relative z-[1] border-t border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-12 md:px-8 md:py-16"
        >
          <div className="mx-auto max-w-[1100px]">
            <ScrollRevealItem index={0} className="block">
              <h2 className="text-center text-2xl font-semibold text-[var(--text-primary)] md:text-3xl">
                How it <span className="text-gradient-brand">works</span>
              </h2>
            </ScrollRevealItem>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {steps.map((s, i) => (
                <ScrollRevealItem key={s.title} index={i} className="min-w-0">
                  <CardMouseSpotlight className="flex h-full flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-6">
                    <span className="inline-flex size-8 items-center justify-center rounded-full bg-[var(--accent)]/15 text-sm font-bold text-[var(--accent)]">
                      {i + 1}
                    </span>
                    <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{s.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                      {s.body}
                    </p>
                  </CardMouseSpotlight>
                </ScrollRevealItem>
              ))}
            </div>
          </div>
        </section>

        {signedIn === true ? (
          <section className="relative z-[1] border-t border-[var(--border)] bg-[var(--bg-primary)] px-6 py-12 md:px-8 md:py-16">
            <div className="mx-auto max-w-[640px]">
              <ScrollRevealItem index={0} className="block">
                <h2 className="text-center text-xl font-semibold text-[var(--text-primary)]">
                  Your referral link
                </h2>
                <p className="mt-2 text-center text-sm text-[var(--text-secondary)]">
                  Share this URL - attribution is applied automatically when they sign up.
                </p>
              </ScrollRevealItem>
              <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
                {referralUrl ? (
                  <>
                    <p className="break-all rounded-[var(--radius)] bg-[var(--bg-primary)] px-3 py-2.5 font-mono text-[13px] text-[var(--text-primary)]">
                      {referralUrl}
                    </p>
                    {loadError ? (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">{loadError}</p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                        onClick={() => void copyLink()}
                      >
                        {copied ? "Copied" : "Copy link"}
                      </Button>
                      <Button type="button" variant="outline" onClick={linkedInShare}>
                        <Share2 className="mr-2 size-4" aria-hidden />
                        Share on LinkedIn
                      </Button>
                      <Button type="button" variant="outline" onClick={emailShare}>
                        <Mail className="mr-2 size-4" aria-hidden />
                        Share via email
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center gap-2 py-8 text-[var(--text-muted)]">
                    <Loader2 className="size-5 animate-spin" aria-hidden />
                    Loading your link…
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : signedIn === false ? (
          <section className="relative z-[1] border-t border-[var(--border)] bg-[var(--bg-primary)] px-6 py-12 md:px-8 md:py-16">
            <div className="mx-auto max-w-[480px] text-center">
              <Link href="/auth?tab=signup">
                <Button
                  type="button"
                  size="lg"
                  className="w-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] md:w-auto"
                >
                  Sign up to get your referral link
                </Button>
              </Link>
              <p className="mt-4 text-sm text-[var(--text-muted)]">
                Already have an account?{" "}
                <Link href="/auth?tab=login" className="font-medium text-[var(--accent)] hover:underline">
                  Log in
                </Link>
              </p>
            </div>
          </section>
        ) : (
          <section className="relative z-[1] flex justify-center border-t border-[var(--border)] py-12">
            <Loader2 className="size-6 animate-spin text-[var(--text-muted)]" aria-hidden />
          </section>
        )}

        <section
          className={cn(
            "relative z-[1] border-t border-[var(--border)] px-6 py-10 md:px-8 md:py-12",
            "bg-[var(--bg-secondary)]",
          )}
        >
          <div className="mx-auto max-w-[720px] text-center">
            <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
              {termsLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>
            <p className="mt-8">
              <Link href="/" className="text-sm text-[var(--accent)] hover:underline">
                ← Back to Handover
              </Link>
            </p>
          </div>
        </section>
      </div>
    </MarketingPageLayout>
  );
}
