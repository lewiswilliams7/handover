import type { Metadata } from "next";

import { LegalPageShell } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Security | Handover",
  description:
    "How Handover protects your MSP's data and PSA credentials. AES encryption, row-level security, and GDPR compliance.",
  alternates: {
    canonical: "https://gethandover.uk/security",
  },
};

export default function SecurityPage() {
  return (
    <LegalPageShell title="Security">
      <section>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Data isolation</h2>
        <p className="mt-2">
          Every Handover customer&apos;s data is completely isolated using PostgreSQL row-level security. It is
          technically impossible for one customer&apos;s data to be read by another customer or by any Handover employee
          without direct database access.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">PSA credential security</h2>
        <p className="mt-2">
          Your HaloPSA and ConnectWise API credentials are encrypted using AES-256 before being stored. The encryption
          key is stored separately in our infrastructure and never in the database. Credentials are only decrypted in
          memory at the moment they are needed to fetch your PSA data.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Data storage</h2>
        <p className="mt-2">
          All data is stored in Supabase (PostgreSQL) hosted in the EU. We do not transfer your data outside the
          EU/UK.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">What we store</h2>
        <p className="mt-2">
          Handover stores the reports you generate, the PSA data used to generate them, and your account preferences.
          We never store your clients&apos; personal data beyond what appears in your PSA ticket and project names.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">GDPR</h2>
        <p className="mt-2">
          Handover is GDPR compliant. We are registered with the ICO. You can request deletion of all your data at any
          time by emailing hello@gethandover.uk.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Deletion</h2>
        <p className="mt-2">
          Deleting your Handover account permanently deletes all stored data including reports, PSA connection
          credentials, and account intelligence history. This cannot be undone.
        </p>
      </section>
    </LegalPageShell>
  );
}
