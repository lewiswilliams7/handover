import type { Metadata } from "next";

import { LegalPageShell } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  alternates: {
    canonical: "https://gethandover.uk/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy">
      <p className="section-label">Last updated: March 2026</p>

      <section>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">What we collect</h2>
        <p className="mt-2">
          We collect your email address, name, job title and company name when you create an account. We store the
          notes and project data you paste into Handover to generate your outputs and to save your generation history.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">How we use your data</h2>
        <p className="mt-2">
          Your notes are sent to OpenAI to generate outputs. OpenAI does not use your data to train their models under
          our API agreement. We do not sell your data to third parties. We do not share your data with anyone except the
          services required to operate Handover (OpenAI, Supabase, Stripe).
        </p>
        <p className="mt-2">
          Input data processing: The notes, ticket data, and project information you paste into Handover are sent to
          OpenAI via their API for processing. This data is not stored on our servers after your outputs are generated.
          Under OpenAI&apos;s API terms, data submitted via the API is not used to train OpenAI models.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Data retention</h2>
        <p className="mt-2">
          Generated outputs are saved to your account history to allow you to retrieve previous reports. If you enable
          Privacy Mode in your account settings, no generation data is stored. You can delete your account and all
          associated data at any time by emailing hello@gethandover.uk
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Data storage</h2>
        <p className="mt-2">
          Your data is stored securely using Supabase, hosted in the EU. Your HaloPSA credentials are encrypted before
          storage. Payment information is handled by Stripe and never stored on our servers.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Your rights</h2>
        <p className="mt-2">
          You can request deletion of your account and all associated data at any time by emailing hello@gethandover.uk.
          Under UK GDPR you have the right to access, correct and delete your personal data.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Cookies</h2>
        <p className="mt-2">
          We use only essential cookies required to keep you signed in. We do not use advertising or tracking cookies.
        </p>
        <p className="mt-2">
          We use Calendly on our demo booking page to facilitate meeting scheduling. Calendly may set its own cookies and
          processes personal data including your name and email address when you book a demo. Calendly&apos;s data
          processing is governed by their privacy policy, available at calendly.com/legal/privacy-notice.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Contact</h2>
        <p className="mt-2">For any privacy questions email hello@gethandover.uk</p>
      </section>
    </LegalPageShell>
  );
}
