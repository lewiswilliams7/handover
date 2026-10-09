"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";

type EnquiryType = "starter" | "enterprise";

type Props = {
  type: EnquiryType;
};

const PSA_OPTIONS = ["HaloPSA", "ConnectWise", "Other"] as const;

const fieldClassName =
  "h-12 w-full rounded-xl border border-white/15 bg-[#0b1629] px-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-300/60";

export function PricingEnquiryForm({ type }: Props) {
  const isStarter = type === "starter";
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [managedClients, setManagedClients] = useState("");
  const [psa, setPsa] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/pricing/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          name,
          company,
          email,
          managedClients,
          psa,
          message,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "We could not send your application. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("We could not reach Handover. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.08] p-6 text-sm leading-7 text-emerald-50">
        <p className="flex items-center gap-2 font-semibold">
          <Check className="size-4" aria-hidden />
          Thanks, we&apos;ve received your enquiry.
        </p>
        <p className="mt-2 text-emerald-50/75">
          We&apos;ll review the details and get back to you within one business day.
        </p>
        <Link
          href="/pricing"
          className="mt-4 inline-block font-semibold text-emerald-100 underline-offset-2 hover:underline"
        >
          Back to pricing
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-[2rem] border border-cyan-300/25 bg-[#0b1629]/85 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur-sm sm:p-8">
      {error ? (
        <p className="mb-5 rounded-xl border border-red-300/25 bg-red-300/[0.08] px-4 py-3 text-sm text-red-100" role="alert">
          {error}
        </p>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" id={`${type}-name`}>
          <input
            id={`${type}-name`}
            name="name"
            autoComplete="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={fieldClassName}
          />
        </Field>
        <Field label="Company" id={`${type}-company`}>
          <input
            id={`${type}-company`}
            name="company"
            autoComplete="organization"
            required
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            className={fieldClassName}
          />
        </Field>
        <Field label="Work email" id={`${type}-email`}>
          <input
            id={`${type}-email`}
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={fieldClassName}
          />
        </Field>
        <Field label="Approximate managed clients" id={`${type}-managed-clients`}>
          <input
            id={`${type}-managed-clients`}
            name="managedClients"
            required
            inputMode="numeric"
            placeholder={isStarter ? "e.g. 10" : "e.g. 180"}
            value={managedClients}
            onChange={(event) => setManagedClients(event.target.value)}
            className={fieldClassName}
          />
        </Field>
        <Field label="PSA" id={`${type}-psa`}>
          <select
            id={`${type}-psa`}
            name="psa"
            required
            value={psa}
            onChange={(event) => setPsa(event.target.value)}
            className={`${fieldClassName} appearance-none`}
          >
            <option value="">Select…</option>
            {PSA_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Message" id={`${type}-message`} className="mt-5">
        <textarea
          id={`${type}-message`}
          name="message"
          rows={5}
          placeholder={
            isStarter
              ? "Tell us a little about your MSP and what you want to improve."
              : "Tell us about your portfolio, delivery model, or anything you need to discuss."
          }
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className={`${fieldClassName} h-auto resize-y py-3 leading-6`}
        />
      </Field>
      <button
        type="submit"
        disabled={submitting}
        className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60"
      >
        {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {submitting ? "Sending…" : isStarter ? "Apply for the Starter Programme" : "Talk to us about Enterprise"}
      </button>
      <p className="mt-4 text-center text-xs leading-5 text-white/40">
        We&apos;ll only use these details to respond to your enquiry.
      </p>
    </form>
  );
}

function Field({
  label,
  id,
  children,
  className = "",
}: {
  label: string;
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-white/70">
        {label}
      </label>
      {children}
    </div>
  );
}
