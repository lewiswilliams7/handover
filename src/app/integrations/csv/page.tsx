import type { Metadata } from "next";
import Link from "next/link";

import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  alternates: {
    canonical: "https://gethandover.uk/integrations/csv",
  },
};

export default function CsvGuidePage() {
  return (
    <MarketingPageLayout>
      <section className="relative z-[1] bg-transparent px-6 py-12 md:px-8 md:py-20">
        <div className="mx-auto w-full max-w-[1100px]">
        <div className="mx-auto max-w-4xl rounded-[var(--radius-lg)] border border-white/[0.07] bg-white/[0.03] p-8 backdrop-blur-md">
          <Link href="/integrations" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            ← Integrations
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">CSV Import Guide</h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Export from any PSA tool as CSV and paste the data directly into Handover.
          </p>

          <ol className="mt-6 list-decimal space-y-2 pl-5 text-[var(--text-secondary)]">
            <li>Open your PSA and run a tickets report or filtered ticket list.</li>
            <li>Export the report as CSV.</li>
            <li>Open the CSV file and copy all rows including headers.</li>
            <li>Paste the content into Handover&apos;s notes area.</li>
            <li>Click Generate Outputs to produce actions, risks, summary, and updates.</li>
          </ol>

          <p className="mt-6 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 text-sm text-[var(--text-secondary)] backdrop-blur-md">
            Handover automatically detects ticket CSV format and extracts structured insights.
          </p>

          <div className="mt-6">
            <Link href="/create-rule">
              <Button className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]">
                Open Handover
              </Button>
            </Link>
          </div>
        </div>
        </div>
      </section>
    </MarketingPageLayout>
  );
}
