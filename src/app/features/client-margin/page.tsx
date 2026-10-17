import type { Metadata } from "next";
import Link from "next/link";
import { PoundSterling, ReceiptText, Tag } from "lucide-react";

import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { MarketingRelatedPages } from "@/components/marketing-related-pages";
import { ProductHero } from "@/components/marketing/product-hero";
import { AppFrame, MarginMock } from "@/components/marketing/product-mocks";

const PAGE_URL = "https://gethandover.uk/features/client-margin";

export const metadata: Metadata = {
  title: "Client Margin for MSPs | Which Clients Pay for Their Work | Handover",
  description:
    "See which clients pay for the work they create. Handover compares what each client pays with the hours logged or tickets raised, and groups them with Revenue at Risk: save, fix, reprice or protect.",
  alternates: { canonical: PAGE_URL },
};

const GROUPS = [
  { title: "Save these first", body: "Profitable, but their service or relationship has changed. Losing one of these hurts most." },
  { title: "Fix or reprice", body: "Changing behaviour and thin margin. Fix the service problem, then look at the contract." },
  { title: "Reprice at renewal", body: "A steady relationship, but they take far more time than they pay for." },
  { title: "Protect and grow", body: "Healthy and profitable. Keep them happy and look for room to expand." },
] as const;

export default function ClientMarginFeaturePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Handover Client Margin",
    applicationCategory: "BusinessApplication",
    description: metadata.description,
    url: PAGE_URL,
  };

  return (
    <MarketingPageLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ProductHero
        eyebrow="Client Margin"
        title="Which clients pay for the work they create?"
        body="Every MSP has clients that quietly cost more to support than they pay. Client Margin puts what each client pays against the work they create, straight from your PSA, and tells you which ones to save, fix, reprice or protect. It works even if your team doesn't log time."
        primary={{ href: "/onboarding/connect", label: "Run your free scan" }}
        visual={<AppFrame path="/margin" label="Client Margin in Handover"><MarginMock /></AppFrame>}
      />

      <section className="px-6 pb-4 md:px-8" aria-labelledby="groups-heading">
        <div className="mx-auto max-w-[1000px]">
          <h2 id="groups-heading" className="text-2xl font-semibold text-[var(--text-primary)]">
            Four groups, four decisions
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[var(--text-secondary)]">
            Margin on one axis, Revenue at Risk on the other.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {GROUPS.map((group) => (
              <div key={group.title} className="rounded-2xl border border-[var(--border)] p-5">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{group.title}</h3>
                <p className="mt-2 text-[15px] leading-7 text-[var(--text-secondary)]">{group.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-12 md:px-8">
        <div className="mx-auto max-w-[900px] space-y-4 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">How it is worked out</h2>
          <p>
            Handover takes each client&apos;s current monthly contract or recurring invoice value and
            divides it by the average monthly hours your team logged on that client&apos;s tickets over
            the last three complete months. Each client is compared with your typical client, so you do
            not need to enter salaries or overheads.
          </p>
          <p>
            If your team doesn&apos;t log time on most tickets, Handover measures revenue per ticket
            instead, using the tickets each client raises. It is less precise, because a password reset
            counts the same as a server rebuild, but it still shows who creates far more work than they
            pay for. It switches to hours by itself once time is logged.
          </p>
          <p>
            A client is only measured when it has a monthly value and enough tickets to compare. If your
            PSA has no value for a client, you can type one in, and you can hide your own company or test
            clients. Anything that cannot be measured is listed with the reason.
          </p>
          <p>
            Margin sits next to{" "}
            <Link href="/features/revenue-at-risk" className="text-[var(--accent)] hover:underline">
              Revenue at Risk
            </Link>{" "}
            because the two answer different questions: one tells you who might leave, the other tells
            you who is worth keeping on today&apos;s terms.
          </p>
        </div>
      </section>

      <MarketingRelatedPages
        links={[
          { href: "/features/revenue-at-risk", title: "Revenue at Risk™", Icon: PoundSterling },
          { href: "/features/value-receipts", title: "Value Receipts™", Icon: ReceiptText },
          { href: "/pricing", title: "Pricing", Icon: Tag },
        ]}
      />
    </MarketingPageLayout>
  );
}
