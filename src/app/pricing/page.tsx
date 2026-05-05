import { Suspense } from "react";

import PageTransition from "@/components/PageTransition";
import { PricingPageClient } from "./pricing-page-client";

export default function PricingPage() {
  return (
    <PageTransition>
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
    </PageTransition>
  );
}
