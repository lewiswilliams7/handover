"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MarketingPageLayout } from "@/components/marketing-page-layout";
import { BOOK_DEMO_CALENDLY_URL } from "@/lib/book-demo";
import { cn } from "@/lib/utils";

const HELP_OPTIONS = [
  "I want to discuss Enterprise pricing",
  "I need a custom integration",
  "I want to onboard my whole team",
  "I have a question about the product",
  "Something else",
] as const;

const PLAN_INTEREST_OPTIONS = [
  { value: "", label: "Select…" },
  { value: "pro", label: "Pro" },
  { value: "team", label: "Team" },
  { value: "enterprise", label: "Enterprise" },
  { value: "partner", label: "Partnership/Reseller" },
  { value: "unsure", label: "Not sure yet" },
] as const;

const ENQUIRY_TEAM_SIZES = ["1-5", "6-15", "16-30", "30-50", "50+"] as const;
const PSA_OPTIONS = ["HaloPSA", "ConnectWise", "Autotask", "Other"] as const;

const JOB_TITLE_OPTIONS = [
  { value: "", label: "Select…" },
  { value: "C-Suite / Director", label: "C-Suite / Director" },
  { value: "VP / Head of", label: "VP / Head of" },
  { value: "Manager", label: "Manager" },
  { value: "Team Lead", label: "Team Lead" },
  { value: "Engineer / Consultant", label: "Engineer / Consultant" },
  { value: "Other", label: "Other" },
] as const;

/** Uniform field surface on the dark enquiry card (#1E293B). */
const fieldClassName = cn(
  "h-[48px] w-full min-h-[48px] rounded-[var(--radius)] border border-[var(--border)] bg-[#1E293B]",
  "px-4 py-3 text-[15px] leading-normal text-[#F1F5F9]",
  "placeholder:text-[#94A3B8]",
  "transition-all duration-150 ease-in-out outline-none",
  "focus-visible:border-[var(--accent)] focus-visible:ring-0",
  "focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_15%,transparent)]",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

const selectFieldClassName = cn(
  fieldClassName,
  "h-[48px] min-h-[48px] cursor-pointer appearance-none py-0 pr-11",
);

const labelClass = "mb-2 block text-[13px] font-medium text-[var(--text-secondary)]";

const sectionLabelClass =
  "mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]";

const dividerClass = "my-1 border-0 border-t border-solid border-[var(--border)] pt-6";

function Req() {
  return <span className="text-[var(--accent)]"> *</span>;
}

function SelectWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--accent)] opacity-90"
        aria-hidden
        strokeWidth={2.5}
      />
    </div>
  );
}

type UrlPlanHint = "enterprise" | "partner" | null;

export function ContactSalesForm({ urlPlanHint = null }: { urlPlanHint?: UrlPlanHint }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [planInterest, setPlanInterest] = useState<string>(() =>
    urlPlanHint === "enterprise" || urlPlanHint === "partner" ? urlPlanHint : "",
  );
  const [teamSize, setTeamSize] = useState("");
  const [psa, setPsa] = useState("");
  const [howCanWeHelp, setHowCanWeHelp] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const showEnterprisePartnerFields =
    planInterest === "enterprise" || planInterest === "partner";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/contact/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          jobTitle,
          companyName,
          planInterest,
          teamSize,
          psa: showEnterprisePartnerFields ? psa : "",
          howCanWeHelp,
          additionalNotes,
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

  const pageBackdrop = (
    <>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.2] dark:opacity-[0.14]"
        aria-hidden
      >
        <defs>
          <pattern id="contact-sales-dot-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="var(--border)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#contact-sales-dot-grid)" />
      </svg>
      <div
        className="pointer-events-none absolute -right-[20%] -top-[10%] h-[min(90vw,520px)] w-[min(90vw,520px)] rounded-full bg-[var(--accent)] opacity-[0.045] blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-[15%] -left-[15%] h-[min(85vw,480px)] w-[min(85vw,480px)] rounded-full bg-[var(--accent)] opacity-[0.04] blur-[110px]"
        aria-hidden
      />
    </>
  );

  if (success) {
    const greet = firstName.trim() || "there";
    return (
      <MarketingPageLayout>
        <div className="relative min-h-screen overflow-hidden">
          {pageBackdrop}
          <div className="relative z-[1] mx-auto flex min-h-screen max-w-[1100px] flex-col items-center justify-center px-6 py-16 md:px-8">
            <div
              className="w-full max-w-lg rounded-2xl border bg-[var(--bg-secondary)] p-10 text-center"
              style={{
                borderColor: "color-mix(in srgb, var(--accent) 20%, var(--border))",
                boxShadow:
                  "0 0 40px color-mix(in srgb, var(--accent) 8%, transparent), 0 1px 3px rgba(0,0,0,0.3)",
              }}
            >
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)]">
                <Check className="size-6" aria-hidden />
              </div>
              <h1 className="text-xl font-semibold text-[var(--text-primary)] md:text-2xl">
                Thanks, {greet}. We&apos;ll be in touch within one business day.
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                In the meantime, you can explore the product at{" "}
                <a
                  href="https://gethandover.uk"
                  className="font-medium text-[var(--accent)] underline-offset-2 hover:underline"
                >
                  gethandover.uk
                </a>
              </p>
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
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes contact-sales-orb-pulse {
            0%, 100% { opacity: 0.035; transform: scale(1); }
            50% { opacity: 0.055; transform: scale(1.06); }
          }
          .contact-sales-orb {
            animation: contact-sales-orb-pulse 7s ease-in-out infinite;
          }
        `,
        }}
      />
      <div className="relative min-h-screen overflow-hidden">
        {pageBackdrop}
        <div className="relative z-[1] mx-auto max-w-[1200px] px-6 py-14 md:px-8 md:py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-start">
            <div className="relative max-w-xl">
              <div
                className="contact-sales-orb pointer-events-none absolute -left-[20%] top-[-8%] h-[min(100vw,420px)] w-[min(100vw,420px)] rounded-full bg-[var(--accent)] blur-[90px]"
                aria-hidden
              />
              <div className="relative z-[1]">
                <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.15em] text-[var(--accent)]">
                  <span className="inline-block size-1.5 rotate-45 bg-[var(--accent)]" aria-hidden />
                  Enterprise Sales
                </p>
                <h1 className="mt-4 text-[clamp(2rem,6vw,3rem)] font-extrabold leading-[1.08] tracking-tight text-[var(--text-primary)]">
                  Let&apos;s talk about your team
                </h1>
                <div
                  className="mt-4 h-0.5 w-10 rounded-full bg-[var(--accent)]"
                  aria-hidden
                />
                <p className="mt-5 text-base leading-relaxed text-[var(--text-secondary)] md:text-lg">
                  Our team will be in touch within one business day.
                </p>
                <ul className="mt-10 flex flex-col gap-3.5 text-sm text-[var(--text-primary)]">
                  {[
                    "Dedicated onboarding call included",
                    "Custom integrations available",
                    "Priority support and SLA",
                    "Flexible seat count - no arbitrary limits",
                  ].map((line) => (
                    <li key={line} className="flex gap-3">
                      <span
                        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-sm"
                        aria-hidden
                      >
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-10">
                  <p className="text-[13px] text-[var(--text-muted)]">Prefer to talk first?</p>
                  <a
                    href={BOOK_DEMO_CALENDLY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-[13px] text-[var(--text-muted)] underline-offset-4 transition-colors hover:text-[var(--accent)] hover:underline"
                  >
                    Book a 15-minute call →
                  </a>
                </div>
                <blockquote className="mt-12 border-l-2 border-[var(--accent)] pl-4">
                  <p className="text-sm italic leading-relaxed text-[var(--text-secondary)]">
                    &ldquo;Handover has transformed how our delivery team handles weekly
                    reporting.&rdquo;
                  </p>
                  <footer className="mt-3 text-[10px] text-[var(--text-muted)]">
                    {" - MSP Delivery Manager, UK"}
                  </footer>
                </blockquote>
              </div>
            </div>

            <div
              className="relative rounded-2xl border bg-[var(--bg-secondary)] px-6 py-6 md:px-10 md:py-10"
              style={{
                borderColor: "color-mix(in srgb, var(--accent) 20%, var(--border))",
                boxShadow:
                  "0 0 40px color-mix(in srgb, var(--accent) 8%, transparent), 0 1px 3px rgba(0,0,0,0.3)",
              }}
            >
              {error ? (
                <div
                  role="alert"
                  className="mb-4 rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--danger)_40%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] px-3 py-2.5 text-sm text-[var(--text-primary)]"
                >
                  {error}
                </div>
              ) : null}
              {urlPlanHint === "enterprise" ? (
                <p className="mb-4 rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--accent)_22%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_6%,transparent)] px-4 py-3 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                  Tell us about your team and we&apos;ll put together a custom plan. We&apos;ll be in touch
                  within 1 business day.
                </p>
              ) : null}
              {urlPlanHint === "partner" ? (
                <p className="mb-4 rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--accent)_22%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_6%,transparent)] px-4 py-3 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                  Interested in reselling or white labelling Handover? Tell us about your business and
                  we&apos;ll be in touch within 1 business day.
                </p>
              ) : null}
              <form onSubmit={onSubmit} className="flex flex-col gap-4">
                <p className={sectionLabelClass}>Your details</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="sales-first" className={labelClass}>
                      First name
                      <Req />
                    </label>
                    <Input
                      id="sales-first"
                      name="firstName"
                      autoComplete="given-name"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className={fieldClassName}
                    />
                  </div>
                  <div>
                    <label htmlFor="sales-last" className={labelClass}>
                      Last name
                      <Req />
                    </label>
                    <Input
                      id="sales-last"
                      name="lastName"
                      autoComplete="family-name"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className={fieldClassName}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="sales-email" className={labelClass}>
                    Work email address
                    <Req />
                  </label>
                  <Input
                    id="sales-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={fieldClassName}
                  />
                </div>
                <div>
                  <label htmlFor="sales-phone" className={labelClass}>
                    Phone number <span className="text-[var(--text-muted)]">(optional)</span>
                  </label>
                  <Input
                    id="sales-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={fieldClassName}
                  />
                </div>
                <div>
                  <label htmlFor="sales-role" className={labelClass}>
                    Job title / Role{" "}
                    <span className="font-normal text-[var(--text-muted)]">(optional)</span>
                  </label>
                  <SelectWrap>
                    <select
                      id="sales-role"
                      name="jobTitle"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      className={selectFieldClassName}
                    >
                      {JOB_TITLE_OPTIONS.map((o) => (
                        <option key={o.value || "unset"} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </SelectWrap>
                </div>

                <div className={dividerClass}>
                  <p className={sectionLabelClass}>Your company</p>
                </div>
                <div>
                  <label htmlFor="sales-company" className={labelClass}>
                    Company name
                    <Req />
                  </label>
                  <Input
                    id="sales-company"
                    name="companyName"
                    autoComplete="organization"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className={fieldClassName}
                  />
                </div>
                <div>
                  <label htmlFor="sales-team-size-main" className={labelClass}>
                    Team size
                    <Req />
                  </label>
                  <SelectWrap>
                    <select
                      id="sales-team-size-main"
                      name="teamSize"
                      required
                      value={teamSize}
                      onChange={(e) => setTeamSize(e.target.value)}
                      className={selectFieldClassName}
                    >
                      <option value="">Select…</option>
                      {ENQUIRY_TEAM_SIZES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </SelectWrap>
                </div>

                <div className={dividerClass}>
                  <p className={sectionLabelClass}>Your enquiry</p>
                </div>
                <div>
                  <label htmlFor="sales-plan-interest" className={labelClass}>
                    Plan you&apos;re interested in{" "}
                    <span className="font-normal text-[var(--text-muted)]">(optional)</span>
                  </label>
                  <SelectWrap>
                    <select
                      id="sales-plan-interest"
                      name="planInterest"
                      value={planInterest}
                      onChange={(e) => {
                        const v = e.target.value;
                        setPlanInterest(v);
                        if (v !== "enterprise" && v !== "partner") {
                          setPsa("");
                        }
                      }}
                      className={selectFieldClassName}
                    >
                      {PLAN_INTEREST_OPTIONS.map((o) => (
                        <option key={o.value || "unset"} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </SelectWrap>
                </div>
                {showEnterprisePartnerFields ? (
                  <div>
                    <label htmlFor="sales-psa" className={labelClass}>
                      PSA they use
                      <Req />
                    </label>
                    <SelectWrap>
                      <select
                        id="sales-psa"
                        name="psa"
                        required
                        value={psa}
                        onChange={(e) => setPsa(e.target.value)}
                        className={selectFieldClassName}
                      >
                        <option value="">Select…</option>
                        {PSA_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </SelectWrap>
                  </div>
                ) : null}
                <div>
                  <label htmlFor="sales-help" className={labelClass}>
                    How can our sales team help you?
                    <Req />
                  </label>
                  <SelectWrap>
                    <select
                      id="sales-help"
                      name="howCanWeHelp"
                      required
                      value={howCanWeHelp}
                      onChange={(e) => setHowCanWeHelp(e.target.value)}
                      className={selectFieldClassName}
                    >
                      <option value="">Select…</option>
                      {HELP_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </SelectWrap>
                </div>
                <div>
                  <label htmlFor="sales-notes" className={labelClass}>
                    Anything else you&apos;d like to tell us?{" "}
                    <span className="text-[var(--text-muted)]">(optional)</span>
                  </label>
                  <Textarea
                    id="sales-notes"
                    name="additionalNotes"
                    rows={4}
                    placeholder="Tell us about your team, current workflow, or any specific requirements."
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    className={cn(
                      fieldClassName,
                      "h-auto min-h-[120px] resize-y py-3 leading-relaxed",
                      "field-sizing-content",
                    )}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className={cn(
                    "group mt-2 flex w-full items-center justify-center gap-1 rounded-[var(--radius)]",
                    "bg-[var(--accent)] px-[14px] py-[14px] text-[15px] font-semibold text-white",
                    "transition-all duration-150 ease-in-out",
                    "hover:-translate-y-px hover:bg-[var(--accent-hover)] hover:shadow-md",
                    "active:translate-y-0 active:shadow-sm",
                    "disabled:pointer-events-none disabled:opacity-50",
                  )}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Sending…
                    </>
                  ) : (
                    <>
                      <span>Send enquiry</span>
                      <span
                        className="inline-block transition-transform duration-150 ease-in-out group-hover:translate-x-1"
                        aria-hidden
                      >
                        →
                      </span>
                    </>
                  )}
                </button>
              </form>
              <div className={dividerClass}>
                <p className="text-center text-[13px] text-[var(--text-muted)]">Prefer to book directly?</p>
                <a
                  href={BOOK_DEMO_CALENDLY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "mt-3 flex w-full items-center justify-center rounded-[var(--radius)]",
                    "border border-[var(--border)] bg-transparent px-[14px] py-[14px] text-[15px] font-semibold text-[var(--text-primary)]",
                    "transition-colors duration-150 hover:border-[var(--accent)] hover:bg-[var(--bg-tertiary)]",
                  )}
                >
                  Book a 30-minute demo
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MarketingPageLayout>
  );
}
