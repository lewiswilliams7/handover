import { Suspense } from "react";
import { redirect } from "next/navigation";

import { ReferralPageContent } from "./referral-page-content";

type ReferralIndexProps = {
  searchParams: Promise<{ ref?: string }>;
};

export default async function ReferralPage({ searchParams }: ReferralIndexProps) {
  const p = await searchParams;
  const ref = typeof p.ref === "string" ? p.ref.trim() : "";
  if (ref) {
    redirect(`/referral/${encodeURIComponent(ref)}`);
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] text-[var(--text-muted)]">
          Loading…
        </div>
      }
    >
      <ReferralPageContent />
    </Suspense>
  );
}
