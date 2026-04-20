import { Suspense } from "react";

import { PricingPageClient } from "./pricing-page-client";

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-[50vh] items-center justify-center text-[var(--text-secondary)]"
          aria-busy="true"
        >
          Loading…
        </div>
      }
    >
      <PricingPageClient />
    </Suspense>
  );
}
