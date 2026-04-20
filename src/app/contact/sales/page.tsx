import type { Metadata } from "next";

import { ContactSalesForm } from "./contact-sales-form";

export const metadata: Metadata = {
  title: "Enterprise sales | Handover",
  description:
    "Talk to our team about Enterprise pricing, onboarding, and custom integrations. We respond within one business day.",
  alternates: {
    canonical: "https://gethandover.uk/contact/sales",
  },
};

export default async function ContactSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const p = await searchParams;
  const raw = typeof p.plan === "string" ? p.plan.trim().toLowerCase() : "";
  const urlPlanHint = raw === "enterprise" || raw === "partner" ? raw : null;

  return <ContactSalesForm urlPlanHint={urlPlanHint} />;
}
