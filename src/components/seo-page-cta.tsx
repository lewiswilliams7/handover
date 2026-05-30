import Link from "next/link";

import { Button } from "@/components/ui/button";

export function SeoPageCta({ headline }: { headline: string }) {
  return (
    <section className="border-t border-[var(--border)] bg-[var(--sidebar-bg)] px-6 py-16 text-center md:px-8 md:py-24">
      <div className="mx-auto max-w-[720px]">
        <h2 className="text-2xl font-bold text-white md:text-3xl">{headline}</h2>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href="/auth?tab=signup&returnTo=/welcome">
            <Button
              size="lg"
              className="rounded-[var(--radius)] bg-[var(--accent)] px-8 text-white hover:bg-[var(--accent-hover)]"
            >
              Start 14-day free trial
            </Button>
          </Link>
          <Link href="/demo">
            <Button
              size="lg"
              variant="outline"
              className="rounded-[var(--radius)] border-white/20 px-8 text-white hover:bg-white/10"
            >
              Book a demo
            </Button>
          </Link>
          <Link href="/pricing">
            <Button size="lg" variant="outline" className="rounded-[var(--radius)] border-[var(--border)] px-8">
              View pricing
            </Button>
          </Link>
        </div>
        <p className="mt-4 text-sm text-[var(--sidebar-text)]">14-day free trial — cancel anytime.</p>
      </div>
    </section>
  );
}
