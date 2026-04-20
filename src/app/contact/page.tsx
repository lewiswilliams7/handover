import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ContactGeneralForm } from "./contact-general-form";

export const metadata: Metadata = {
  title: "Contact | Handover",
  description: "Get in touch with the Handover team for general enquiries, support, billing, and more.",
  alternates: {
    canonical: "https://gethandover.uk/contact",
  },
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const p = await searchParams;
  if (typeof p.plan === "string" && p.plan.trim().toLowerCase() === "enterprise") {
    redirect("/contact/sales?plan=enterprise");
  }
  return <ContactGeneralForm />;
}
