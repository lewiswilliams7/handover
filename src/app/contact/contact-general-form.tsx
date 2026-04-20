"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { cn } from "@/lib/utils";

const SUBJECTS = [
  "General enquiry",
  "Technical support",
  "Billing question",
  "Feature request",
  "Partnership",
  "Other",
] as const;

const selectClassName = cn(
  "h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm transition-[color,box-shadow,border-color] duration-150 outline-none",
  "text-[var(--text-primary)] focus-visible:border-ring focus-visible:shadow-[0_0_0_2px_var(--accent-alpha)] focus-visible:ring-0",
  "disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
);

const labelClass = "mb-1.5 block text-[13px] text-[var(--text-secondary)]";

function Req() {
  return <span className="text-[var(--accent)]"> *</span>;
}

export function ContactGeneralForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/contact/general", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          subject,
          message,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      setSuccess(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const dotGridStyle = {
    backgroundImage: `radial-gradient(circle at center, color-mix(in srgb, var(--text-muted) 18%, transparent) 1px, transparent 1px)`,
    backgroundSize: "26px 26px",
  } as const;

  if (success) {
    return (
      <MarketingPageLayout>
        <div className="relative min-h-screen overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.4] dark:opacity-[0.3]"
            aria-hidden
            style={dotGridStyle}
          />
          <div className="relative z-[1] mx-auto flex min-h-screen max-w-[560px] flex-col items-center justify-center px-6 py-16">
            <div className="w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] p-10 text-center shadow-lg">
              <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)]">
                <Check className="size-5" aria-hidden />
              </div>
              <h1 className="text-lg font-semibold text-[var(--text-primary)] md:text-xl">
                Message sent. We&apos;ll get back to you as soon as possible.
              </h1>
              <Link
                href="/"
                className="mt-8 inline-block text-sm font-medium text-[var(--text-secondary)] underline-offset-2 hover:text-[var(--text-primary)] hover:underline"
              >
                ← Back to home
              </Link>
            </div>
          </div>
        </div>
      </MarketingPageLayout>
    );
  }

  return (
    <MarketingPageLayout>
      <div className="relative min-h-screen overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.4] dark:opacity-[0.3]"
          aria-hidden
          style={dotGridStyle}
        />
        <div className="relative z-[1] mx-auto max-w-[560px] px-6 py-14 md:px-8 md:py-20">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] md:text-3xl">
              Contact us
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)] md:text-[15px]">
              Send a message and we&apos;ll respond as soon as we can.
            </p>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] p-6 shadow-md md:p-8">
            {error ? (
              <div
                role="alert"
                className="mb-4 rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--danger)_40%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] px-3 py-2.5 text-sm text-[var(--text-primary)]"
              >
                {error}
              </div>
            ) : null}
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="gen-first" className={labelClass}>
                    First name
                    <Req />
                  </label>
                  <Input
                    id="gen-first"
                    name="firstName"
                    autoComplete="given-name"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div>
                  <label htmlFor="gen-last" className={labelClass}>
                    Last name
                    <Req />
                  </label>
                  <Input
                    id="gen-last"
                    name="lastName"
                    autoComplete="family-name"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="gen-email" className={labelClass}>
                  Email address
                  <Req />
                </label>
                <Input
                  id="gen-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10"
                />
              </div>
              <div>
                <label htmlFor="gen-subject" className={labelClass}>
                  Subject
                  <Req />
                </label>
                <select
                  id="gen-subject"
                  name="subject"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className={selectClassName}
                >
                  <option value="">Select…</option>
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="gen-message" className={labelClass}>
                  Message
                  <Req />
                </label>
                <Textarea
                  id="gen-message"
                  name="message"
                  required
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[140px] resize-y"
                />
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="mt-1 h-11 w-full rounded-[var(--radius)] bg-[var(--accent)] text-sm font-semibold text-white shadow-md hover:bg-[var(--accent-hover)]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                    Sending…
                  </>
                ) : (
                  "Send message →"
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </MarketingPageLayout>
  );
}
